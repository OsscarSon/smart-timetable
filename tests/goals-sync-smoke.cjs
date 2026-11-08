// v9.5 Goals 跨设备同步测试：两个独立浏览器环境（设备 A / B）共用一个内存里的假云端（替代 Supabase），跑的是真 index.html + 真 sync.js。
// 用法：python3 -m http.server 8766 &  然后  node tests/goals-sync-smoke.cjs [http://localhost:8766]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8766';
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5);
function seed() {
  const [y, m, d] = [2026, 11, 9], mon = DN([y, m, d]) - ((DN([y, m, d]) + 3) % 7), fx = [];
  for (let i = 0; i < 5; i++) fx.push({ id: 'fx' + i, day: i, s: 480, e: 780, t: 'School', room: '', teacher: '', type: '课', c: 'sky' });
  return { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-fx': JSON.stringify(fx),
    'mochi-st': JSON.stringify({ subs: ['Bahasa Melayu', 'Matematik'], topics: [], ex: {} }) };
}
const cloud = { rows: {}, tick: 0 };       // 假云端：key → { value, deleted, updated_at }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function device(browser, at) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.route(/js\/config\.js/, r => r.fulfill({ contentType: 'application/javascript', body: "window.MOCHI_CFG={supabaseUrl:'https://x.supabase.co',supabaseKey:'k',apiBase:''};" }));
  const st = seed();
  await ctx.addInitScript(([s]) => {
    if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }
    window.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }), onAuthStateChange: () => {}, signOut: async () => ({}) },
      from: () => ({ select: async () => await window.__pull(), upsert: rows => ({ select: async () => await window.__push(rows) }) }), storage: { from: () => ({}) } }) };
  }, [st]);
  const page = await ctx.newPage(), dialogs = [], errs = [];
  await page.clock.setFixedTime(new Date(at));
  await page.exposeFunction('__pull', () => ({ data: Object.keys(cloud.rows).map(k => Object.assign({ key: k }, cloud.rows[k])), error: null }));
  await page.exposeFunction('__push', rows => { const out = []; rows.forEach(r => { cloud.tick++; const u = new Date(Date.now() + cloud.tick * 1000).toISOString(); cloud.rows[r.key] = { value: r.value, deleted: !!r.deleted, updated_at: u }; out.push({ key: r.key, updated_at: u }); }); return { data: out, error: null }; });
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1500);
  return { ctx, page, dialogs, errs };
}
const sync = async page => { try { await page.evaluate(() => cloud.syncNow()); } catch (e) {} await page.waitForTimeout(1800); };
const closeAll = async page => { for (let i = 0; i < 4 && (await page.$('.gl-mask')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(80); } };
const goal = (page, id) => page.evaluate(i => { const g = Goals.core.getGoal(i); return g && { title: g.title, rev: g.rev, planDevice: g.planDevice, deletedAt: g.deletedAt, status: g.status }; }, id);
const sessions = page => page.evaluate(() => { let n = 0; Object.keys(WK).forEach(w => (WK[w] || []).forEach(x => { if (/Bahasa|Matematik/.test(x.t)) n++; })); return n; });

(async () => {
  const browser = await chromium.launch();
  const A = await device(browser, '2026-11-09T10:30:00');
  const id = await A.page.evaluate(() => { const g = Goals.core.normGoal({ id: crypto.randomUUID(), space: 'study', title: 'SPM revision', status: 'draft', targetFinish: '2026-11-18', deadline: '2026-12-01', steps: [{ title: 'Bahasa Melayu', estimateMin: 120 }, { title: 'Matematik', estimateMin: 90 }] }); Goals.core.saveGoal(g, 0); return g.id; });
  await sync(A.page);
  const keys = Object.keys(cloud.rows);
  rec('v9.5 目标本体已推到云端（goals-g:<id>）', keys.includes('goals-g:' + id), keys.filter(k => /^goals-/.test(k)).join(','));
  rec('设备本地的键不上云：goals-meta（设备 id）/ goals-prefs / goals-plan-prefs', !keys.some(k => /^goals-(meta|prefs|plan-prefs)/.test(k)), keys.filter(k => /^goals-/.test(k)).join(','));

  const B = await device(browser, '2026-11-09T10:31:00'); await sync(B.page);
  const gb = await goal(B.page, id);
  rec('设备 B 登录同步后看到了 A 创建的目标（标题、状态一致）', gb && gb.title === 'SPM revision' && gb.status === 'draft', JSON.stringify(gb));
  rec('A 与 B 的设备 id 不同（goals-meta 没被同步覆盖）', (await A.page.evaluate(() => Goals.core.deviceId())) !== (await B.page.evaluate(() => Goals.core.deviceId())));

  // B 排程：认领 planDevice
  await closeAll(B.page); await B.page.evaluate(() => openGoals()); await B.page.waitForTimeout(150);
  await B.page.locator('.gl-card', { hasText: 'SPM revision' }).first().click(); await B.page.waitForTimeout(150);
  await B.page.locator('.gl-plan-btn').click(); await B.page.waitForTimeout(250);
  await B.page.locator('.gl-bar .gl-primary').click(); await B.page.waitForTimeout(500);
  const devB = await B.page.evaluate(() => Goals.core.deviceId()), gb2 = await goal(B.page, id), nB = await sessions(B.page);
  rec('B 提交排程后：状态变进行中，课表里有时段', gb2.status === 'active' && nB > 0, JSON.stringify(gb2) + ' sessions=' + nB);
  await sync(B.page); await closeAll(B.page);
  rec('v9.6 B 同步后：排程关联表上云了（goals-links 在云端）', !!cloud.rows['goals-links'] && JSON.parse(cloud.rows['goals-links'].value).links.length === nB);
  await sync(A.page);
  const ga = await goal(A.page, id), nA = await sessions(A.page);
  rec('A 同步后：看到 B 排的时段（课表同步）', ga.status === 'active' && nA === nB, JSON.stringify(ga) + ' A=' + nA + ' B=' + nB);
  const lkN = page => page.evaluate(() => GoalsPlan.validLinks().length);
  rec('v9.6 A 同步后：排程关联表也同步过来了，A 认得 B 排的每个时段（有效关联数 = 时段数）', (await lkN(A.page)) === nB, 'links=' + (await lkN(A.page)) + ' B=' + nB);
  await closeAll(A.page); await A.page.evaluate(() => openGoals()); await A.page.waitForTimeout(150);
  const card = await A.page.locator('.gl-card', { hasText: 'SPM revision' }).first().innerText();
  await A.page.locator('.gl-card', { hasText: 'SPM revision' }).first().click(); await A.page.waitForTimeout(150);
  rec('v9.6 A 的目标卡片显示“Scheduled …”；编辑页有排程 / 移除按钮（不再只读）', /Scheduled/.test(card) && !!(await A.page.$('.gl-plan-btn')) && !!(await A.page.$('.gl-clear-btn')));
  await A.page.locator('.gl-plan-btn').click(); await A.page.waitForTimeout(300);
  const again = await A.page.evaluate(() => { const r = GoalsPlan._state().result; return { need: r.totals.need, n: r.sessions.length }; });
  rec('v9.6 A 再点“寻找空档”：已被 B 排满的步骤不会重复排（需要 0 分钟、0 个新时段）', again.need === 0 && again.n === 0, JSON.stringify(again));
  await closeAll(A.page);
  // 两台设备各自、同时给不同的周加排程（互相都还没同步）：关联表按条合并，两边的新增都保留
  const crafted = (page, dn, id) => page.evaluate(([i, dn]) => { const g = Goals.core.getGoal(i); return GoalsPlan.commit({ goalId: i, rev: g.rev, result: { sessions: [{ id: 'z' + dn, dn, s: 840, e: 880, stepId: g.steps[0].id, stepTitle: 'Bahasa Melayu', min: 40 }] } }, { ['z' + dn]: true }); }, [id, dn]);
  const d1 = DN([2026, 12, 14]), d2 = DN([2026, 12, 21]);
  const before = await lkN(A.page);
  const ra = await crafted(A.page, d1, id), rb = await crafted(B.page, d2, id);
  await A.page.evaluate(() => cloud.syncNow()).catch(() => {}); await B.page.evaluate(() => cloud.syncNow()).catch(() => {});
  await A.page.waitForTimeout(1800); await sync(B.page); await sync(A.page);
  const lA = await A.page.evaluate(() => GoalsPlan.validLinks().map(l => l.dn).sort()), lB = await B.page.evaluate(() => GoalsPlan.validLinks().map(l => l.dn).sort());
  rec('v9.6 两台设备同时各加一个排程：关联表按条合并，两边最终都有 ' + (before + 2) + ' 条有效关联且完全一致', ra.ok && rb.ok && lA.length === before + 2 && JSON.stringify(lA) === JSON.stringify(lB) && lA.includes(d1) && lA.includes(d2), 'A=' + lA.length + ' B=' + lB.length + ' want ' + (before + 2) + ' ra=' + JSON.stringify(ra) + ' rb=' + JSON.stringify(rb));
  // 在 A 上移动一个 B 排的时段 → A 跟随；B 同步后也认得新位置
  const mv = await A.page.evaluate(() => { const l = GoalsPlan.validLinks()[0]; const arr = (l.w === curW ? data : WK[l.w]); const x = arr.find(e => e.day === l.day && e.s === l.s && e.t === l.t); x.s = 1230; x.e = 1230 + (l.e - l.s); saveWeek(l.w); return 1; });
  await A.page.reload(); await A.page.waitForTimeout(1200);
  await A.page.evaluate(() => { const sc = GoalsPlan.scanBroken(Goals.core.listGoals()[0].id); return GoalsPlan.followMoved(Goals.core.listGoals()[0].id); });
  await sync(A.page); await sync(B.page);
  rec('v9.6 A 移动了一个时段并“跟随”后，B 同步下来也认得新位置（有效关联数不变）', (await lkN(B.page)) === before + 2 && (await lkN(A.page)) === before + 2, 'A=' + (await lkN(A.page)) + ' B=' + (await lkN(B.page)));
  // 在 B 上做目标级撤销（移除 A、B 两边排的所有未到时段）→ A 同步后课表里也没有了
  await closeAll(B.page); await B.page.evaluate(() => openGoals()); await B.page.waitForTimeout(150);
  await B.page.locator('.gl-card', { hasText: 'SPM revision' }).first().click(); await B.page.waitForTimeout(150);
  await B.page.locator('.gl-clear-btn').click(); await B.page.waitForTimeout(500);
  await sync(B.page); await sync(A.page);
  rec('v9.6 在 B 上“移除未到的时段”（含 A 排的）：A 同步后课表里这些时段也消失', (await sessions(B.page)) === 0 && (await sessions(A.page)) === 0, 'A=' + (await sessions(A.page)) + ' B=' + (await sessions(B.page)));
  await closeAll(A.page); await closeAll(B.page);
  // 冲突：两台各改一次标题（同一基准版本）。B 的时间更晚 → B 赢；全程不弹“有冲突”的确认框
  const edit = (p, t) => p.evaluate(([i, t]) => { const g = Goals.core.getGoal(i); return Goals.core.saveGoal(Object.assign({}, g, { title: t }), g.rev).ok; }, [id, t]);
  A.dialogs.length = 0; B.dialogs.length = 0;
  await edit(A.page, 'Title from A'); await sync(A.page);
  await edit(B.page, 'Title from B'); await sync(B.page); await sync(B.page); await sync(A.page);
  const tA = (await goal(A.page, id)).title, tB = (await goal(B.page, id)).title;
  rec('同一目标两台同时改：自动按版本号 + 修改时间决定（较晚的 B 赢），两边收敛到同一份，没有弹冲突确认框', tA === tB && tA === 'Title from B' && !A.dialogs.some(d => /冲突|改过/.test(d)) && !B.dialogs.some(d => /冲突|改过/.test(d)), tA + ' | ' + tB + ' | ' + A.dialogs.concat(B.dialogs).join('/'));
  // 改不同目标不冲突
  const id2 = await A.page.evaluate(() => { const g = Goals.core.normGoal({ id: crypto.randomUUID(), space: 'study', title: 'Second', steps: [{ title: 'X', estimateMin: 30 }] }); Goals.core.saveGoal(g, 0); return g.id; });
  await sync(A.page); await sync(B.page);
  rec('A 新建的第二个目标同步到 B；两个目标互不影响', (await goal(B.page, id2)).title === 'Second' && (await goal(B.page, id)).title === 'Title from B');
  // 删除：墓碑同步
  await A.page.evaluate(i => Goals.core.deleteGoal(i), id2); await sync(A.page); await sync(B.page);
  const gd = await goal(B.page, id2);
  rec('A 删除目标后，B 同步到墓碑（目标从列表消失）', gd && gd.deletedAt && !(await B.page.evaluate(i => Goals.core.listGoals().some(g => g.id === i), id2)));
  rec('全程没有页面报错', A.errs.length === 0 && B.errs.length === 0, A.errs.concat(B.errs).join(' | '));
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
