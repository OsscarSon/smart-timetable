// Vercel Serverless Function：AI 添加（一句话 → 活动 / 作业；课表照片 → 固定课程）
// 环境变量：GEMINI_API_KEY（必填）、GEMINI_MODEL（可选，需支持图片输入）
// 注意：这里只“解析”，不改任何数据；前端会先给用户预览，确认后才写入。

const QUICK = `你是“Mochi”的录入助手。把用户的一句话解析成要加入时间表的条目，只输出 JSON。
今天的日期和星期会在提示里给出，请据此把“明天、下周三、周五前”等换算成具体日期 YYYY-MM-DD。
条目有两种：
1. 活动：{"type":"event","date":"YYYY-MM-DD","h":15,"len":1,"t":"📚 数学补习","c":"pink","every":0,"until":""}
   h 是开始的整点(0–23，分钟请四舍五入到整点)；len 是持续整小时数(1–3)；
   every 是每几周重复一次(0=不重复，1=每周，2=每两周…最多 4)；until 是重复截止日期，没说就留空字符串；
   c 只能是 pink、mint、sky、lemon、peach；t 不超过 12 个字，开头加一个贴切的 emoji。
2. 作业：{"type":"homework","t":"英语作文","sb":"英语","due":"YYYY-MM-DD"}   sb 是科目(可空)，due 没说就留空字符串。
一句话里可以有多条；没有明确日期或时间的活动不要编造，放进 notes 说明缺什么。
输出格式：{"items":[...],"notes":["最多 3 条简短中文说明"]}`;

const PHOTO = `你是“Mochi”的课表识别助手。图片是一张学校 / 培训班的课表（可能是照片或截图）。把里面每一节课识别出来，只输出 JSON。
坐标：day 0=周一 … 6=周日；s、e 是开始和结束时间，用“当天 0 点起的分钟数”（如 8:00 = 480，9:45 = 585）。
一门课连续占几节，就合并成一条：s 取第一节开始，e 取最后一节结束。
如果图片里只有“第几节”而没有具体时间，按 8:00 开始、每节 45 分钟、课间 10 分钟推算，并在 notes 说明。
t 是科目名（不超过 12 个字，保持图片里的原文，不要加 emoji）；room 是教室，teacher 是老师，图片里没有就留空字符串。
看不清的格子不要猜，跳过，并在 notes 说明。单双周之类的特殊标记，在 notes 里说明即可，不要拆成多条。
输出格式：{"lessons":[{"day":0,"s":480,"e":525,"t":"数学","room":"A301","teacher":"王老师"}],"notes":["最多 4 条简短中文说明"]}`;

const int = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const iso = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '');
const COLS = ['pink', 'mint', 'sky', 'lemon', 'peach'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'missing GEMINI_API_KEY' });

  const { mode, text, today, wd, image, mime } = req.body || {};
  let system, parts;
  if (mode === 'photo') {
    if (typeof image !== 'string' || image.length < 100 || image.length > 4_000_000) return res.status(400).json({ error: '图片太大或为空（请压缩后再传）' });
    if (!/^image\/(jpeg|png|webp)$/.test(mime || '')) return res.status(400).json({ error: '只支持 jpg / png / webp' });
    system = PHOTO;
    parts = [{ inlineData: { mimeType: mime, data: image } }, { text: '请识别这张课表。' }];
  } else if (mode === 'quick') {
    if (typeof text !== 'string' || !text.trim() || text.length > 300) return res.status(400).json({ error: 'bad text' });
    if (!iso(today)) return res.status(400).json({ error: 'bad today' });
    system = QUICK;
    parts = [{ text: `今天是 ${today}，星期${'一二三四五六日'[int(wd, 0, 6, 0)]}。\n用户说：${text.trim()}` }];
  } else return res.status(400).json({ error: 'bad mode' });

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'gemini ' + r.status + ' ' + (await r.text()).slice(0, 200) });
    const j = await r.json();
    let out;
    try { out = JSON.parse((j.candidates?.[0]?.content?.parts?.[0]?.text || '{}').replace(/```json|```/g, '').trim()); }
    catch (e) { return res.status(502).json({ error: 'AI 回复不是有效 JSON' }); }
    const notes = (Array.isArray(out.notes) ? out.notes : []).slice(0, 4).map(n => str(n, 80));

    // 不信任模型输出：逐项校验、截断，坏的直接丢掉
    if (mode === 'photo') {
      const lessons = (Array.isArray(out.lessons) ? out.lessons : []).slice(0, 80).map(x => ({
        day: int(x.day, 0, 6, -1), s: int(x.s, 0, 1439, -1), e: int(x.e, 1, 1440, -1),
        t: str(x.t, 20), room: str(x.room, 20), teacher: str(x.teacher, 20),
      })).filter(x => x.day >= 0 && x.s >= 0 && x.e > x.s && x.t);
      return res.status(200).json({ lessons, notes });
    }
    const items = (Array.isArray(out.items) ? out.items : []).slice(0, 12).map(x => {
      if (x && x.type === 'homework') return { type: 'homework', t: str(x.t, 60), sb: str(x.sb, 12), due: iso(x.due) };
      if (x && x.type === 'event') return {
        type: 'event', date: iso(x.date), h: int(x.h, 0, 23, -1), len: int(x.len, 1, 3, 1), t: str(x.t, 20),
        c: COLS.includes(x.c) ? x.c : 'pink', every: int(x.every, 0, 4, 0), until: iso(x.until),
      };
      return null;
    }).filter(x => x && x.t && (x.type === 'homework' || (x.date && x.h >= 0)));
    return res.status(200).json({ items, notes });
  } catch (e) {
    return res.status(500).json({ error: 'server error: ' + String(e && e.message).slice(0, 120) });
  }
};
