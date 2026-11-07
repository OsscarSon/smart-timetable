// 两个 AI 接口共用：CORS 白名单、Supabase 登录校验、限流、请求大小限制。
// 文件名以下划线开头，Vercel 不会把它当成接口暴露出去。
//
// 环境变量（都可选，但上线前请按 README 配好）：
//   SUPABASE_URL / SUPABASE_ANON_KEY   用来校验前端带来的登录令牌（和 js/config.js 里的是同一组）
//   REQUIRE_AUTH                       1=必须登录 0=允许匿名（只按 IP 限流）；不填 = 配了上面两项就必须登录
//   AI_RATE_PER_MIN / AI_RATE_PER_DAY  每个账号每分钟 / 每天的额度（默认 6 / 60；匿名 IP 为 3 / 20；拍照识别按 3 次计）
//   AI_GLOBAL_PER_DAY                  全站每天总额度（不填 = 不限）；防止被刷爆账单
//   UPSTASH_REDIS_REST_URL / _TOKEN    填了就用 Upstash Redis 做跨实例的限流计数；不填则用单实例内存（尽力而为）
//   ALLOWED_ORIGINS                    允许调用的网页来源，逗号分隔（如 https://your-app.vercel.app）；不填 = 不限制
const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };

function cors(req, res) {
  const o = req.headers.origin;
  let allow = '*', ok = true;
  if (ORIGINS.length) {
    ok = !o || ORIGINS.includes(o) || NATIVE_ORIGINS.includes(o);
    allow = o && ok ? o : ORIGINS[0];
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Key');
  res.setHeader('Access-Control-Max-Age', '600');
  return ok;
}

const tokCache = new Map();
async function userOf(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i);
  let url = String(process.env.SUPABASE_URL || '').trim(); try { url = new URL(url).origin; } catch (e) {}
  const anon = String(process.env.SUPABASE_ANON_KEY || '').trim();
  if (!m || !url || !anon) return null;
  const tok = m[1], c = tokCache.get(tok);
  if (c && c.exp > Date.now()) return c.id;
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/auth/v1/user', { headers: { Authorization: 'Bearer ' + tok, apikey: anon } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || !u.id) return null;
    if (tokCache.size > 500) tokCache.clear();
    tokCache.set(tok, { id: u.id, exp: Date.now() + 60000 });
    return u.id;
  } catch (e) { return null; }
}
function authRequired() {
  if (process.env.REQUIRE_AUTH === '0') return false;
  if (process.env.REQUIRE_AUTH === '1') return true;
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}
const clientIp = req => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

// ---- 计数：Upstash（跨实例）优先，失败 / 没配就用内存 ----
const mem = new Map();
async function count(key, inc, ttl) {
  const U = process.env.UPSTASH_REDIS_REST_URL, T = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (U && T) {
    try {
      const r = await fetch(U.replace(/\/$/, '') + '/pipeline', {
        method: 'POST', headers: { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCRBY', key, inc], ['EXPIRE', key, ttl, 'NX']]),
      });
      if (r.ok) { const j = await r.json(); const n = Number(j?.[0]?.result); if (Number.isFinite(n)) return n; }
    } catch (e) { /* 退回内存 */ }
  }
  const now = Date.now();
  if (mem.size > 5000) for (const [k, v] of mem) if (v.exp < now) mem.delete(k);
  let e = mem.get(key);
  if (!e || e.exp < now) e = { n: 0, exp: now + ttl * 1000 };
  e.n += inc; mem.set(key, e);
  return e.n;
}

// 入口：处理 CORS / 方法 / 大小 / 登录 / 限流。返回用户标识；已经回复过错误的话返回 null。
const userKey = req => { const k = String(req.headers['x-user-key'] || '').trim(); return /^[\w-]{20,80}$/.test(k) ? k : ''; };
async function guard(req, res, { cost = 1, maxBytes = 5_000_000 } = {}) {
  const originOk = cors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return null; }
  if (!originOk) { res.status(403).json({ error: '来源不被允许' }); return null; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return null; }
  if (Number(req.headers['content-length'] || 0) > maxBytes) { res.status(413).json({ error: '请求太大' }); return null; }

  if (userKey(req)) return 'own';          // 用户自带 Gemini key：花的是他自己的额度，不需要登录、不计站长的限流
  const uid = await userOf(req);
  if (!uid && authRequired()) { res.status(401).json({ error: '请先登录账号，再使用云端 AI', code: 'auth' }); return null; }
  const id = uid ? 'u:' + uid : 'ip:' + clientIp(req);
  const perMin = uid ? num(process.env.AI_RATE_PER_MIN, 6) : 3, perDay = uid ? num(process.env.AI_RATE_PER_DAY, 60) : 20;
  const day = new Date().toISOString().slice(0, 10), minute = Math.floor(Date.now() / 60000);

  const gMax = num(process.env.AI_GLOBAL_PER_DAY, 0);
  if (gMax && await count('rl:g:' + day, cost, 90000) > gMax) { res.status(429).setHeader('Retry-After', '3600').json({ error: '今天的 AI 总额度用完了，明天再来吧 🐱', code: 'quota' }); return null; }
  if (await count(`rl:${id}:m:${minute}`, cost, 60) > perMin) { res.setHeader('Retry-After', '30'); res.status(429).json({ error: '请求太频繁了，等半分钟再试 🐱', code: 'rate' }); return null; }
  if (await count(`rl:${id}:d:${day}`, cost, 90000) > perDay) { res.setHeader('Retry-After', '3600'); res.status(429).json({ error: '今天的 AI 次数用完了，明天再来吧（手动添加不受影响）', code: 'quota' }); return null; }
  return id;
}

// 严格版：超出范围 / 不是数字就返回 d（不会夹到边界上）
const inr = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : d; };
const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const iso = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '');
const COLS = ['pink', 'mint', 'sky', 'lemon', 'peach'];
module.exports = { guard, userKey, int, inr, str, iso, COLS };
