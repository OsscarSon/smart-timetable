// v9.7 Goals 跨设备同步回归测试（补充 goals-sync-smoke.cjs，不改动同步实现）。两个独立浏览器环境（设备 A / B）共用一个内存里的假云端，跑真 index.html + 真 sync.js。
//   场景 1：设备 A 移除 / 删除目标的排程，设备 B 持有旧关联（甚至自己也有未上传的关联改动）后重新同步 → 不会把已移除的关联“复活”成有效关联。
//   场景 2：设备 A、B 离线修改“同一周”里不同的日程，重新同步 → 明确验证：冲突提示、两种选择各自的结果、Goals 关联有效性、重新排程的恢复路径。
// 用法：python3 -m http.server 8766 &  然后  node tests/goals-sync-regress.cjs [http://localhost:8766]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8766';
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5);
const cloud = { rows: {}, tick: 0, offline: { A: false, B: false } };       // 假云端 + 每台设备的“离线”开关
const sleep = ms => new Promise(r => setTimeout(r, ms));
function seed() {
  const mon = DN([2026, 11, 9]) - ((DN([2026, 11, 9]) + 3) % 7), fx = [];
  for (let i = 0; i < 5; i++) fx.push({ id: 'fx' + i, day: i, s: 480, e: 780, t: 'School', room: '', teacher: '', type: '课', c: 'sky' });
  return { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-fx': JSON.stringify(fx),
    'mochi-st': JSON.stringify({ subs: ['Bahasa Melayu', 'Matematik', 'Sains'], topics: [], ex: {} }) };
}
async function device(browser, at, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.route(/js\/config\.js/, r => r.fulfill({ contentType: 'application/javascript', body: "window.MOCHI_CFG={supabaseUrl:'https://x.supabase.co',supabaseKey:'k',apiBase:''};" }));
  await ctx.addInitScript(([s]) => {
    if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }
    window.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }), onAuthStateChange: () => {}, signOut: async () => ({}) },
      from: () => ({ select: async () => await window.__pull(), upsert: rows => ({ select: async () => await window.__push(rows) }) }), storage: { from: () => ({}) } }) };
  }, [seed()]);
  const page = await ctx.newPage(), dev = { ctx, page, name, dialogs: [], errs: [], choice: 'accept' };
  await page.clock.setFixedTime(new Date(at));
  await page.exposeFunction('__pull', () => cloud.offline[name] ? { data: null, error: { message: 'offline' } } : ({ data: Object.keys(cloud.rows).map(k => Object.assign({ key: k }, cloud.rows[k])), error: null }));
  await page.exposeFunction('__push', rows => {
    if (cloud.offline[name]) return { data: null, error: { message: 'offline' } };
    const out = []; rows.forEach(r => { cloud.tick++; const u = new Date(Date.now() + cloud.tick * 1000).toISOString(); cloud.rows[r.key] = { value: r.value, deleted: !!r.deleted, updated_at: u }; out.push({ key: r.key, updated_at: u }); }); return { data: out, error: null }; });
  page.on('dialog', d => { dev.dialogs.push(d.message()); if (dev.choice === 'dismiss') d.dismiss(); else d.accept(); });
  page.on('pageerror', e => dev.errs.push(e.message));
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1500);
  return dev;
}
const sync = async d => { try { await d.page.evaluate(() => cloud.syncNow()); } catch (e) {} await d.page.waitForTimeout(1800); };
const reset = () => { cloud.rows = {}; cloud.tick = 0; cloud.offline.A = false; cloud.offline.B = false; };
// 页面里的小工具
const validN = (d, id) => d.page.evaluate(i => GoalsPlan.validLinks(i).length, id || null);
const rawLinks = d => d.page.evaluate(() => JSON.parse(localStorage.getItem('goals-links') || '{"links":[]}').links.length);
const sumN = (d, id) => d.page.evaluate(i => GoalsPlan.summary(Goals.core.getGoal(i)).n, id);
const goalVisible = (d, id) => d.page.evaluate(i => Goals.core.listGoals().some(g => g.id === i), id);
const weekRaw = (d, dn) => d.page.evaluate(x => { const w = Sched.weekOf(x); return localStorage.getItem(wkKeyOf(TT.id, w)); }, dn);
const goalSessions = d => d.page.evaluate(() => { const o = []; Object.keys(WK).forEach(w => (WK[w] || []).forEach(x => { if (/^(Bahasa|Matematik|Sains)/.test(x.t)) o.push(w + '|' + x.day + '|' + x.s + '|' + x.e + '|' + x.t); })); return o.sort(); });
const titles = (d, dn) => d.page.evaluate(x => { const w = Sched.weekOf(x); return ((w === curW ? data : WK[w]) || []).map(e => e.t).sort(); }, dn);
const commitCrafted = (d, id, list) => d.page.evaluate(([i, list]) => { const g = Goals.core.getGoal(i), sel = {};
  const sessions = list.map((x, k) => { sel['c' + k] = true; return { id: 'c' + k, dn: x.dn, s: x.s, e: x.e, stepId: g.steps[x.step].id, stepTitle: g.steps[x.step].title, min: x.e - x.s }; });
  return GoalsPlan.commit({ goalId: i, rev: g.rev, result: { sessions } }, sel); }, [id, list]);
const NOV16 = DN([2026, 11, 16]), NOV23 = DN([2026, 11, 23]), NOV30 = DN([2026, 11, 30]), DEC7 = DN([2026, 12, 7]);   // 三个不同周的星期一
const S = (dn, step) => ({ dn, s: 840, e: 880, step });                                         // 14:00–14:40（School 在 13:00 结束，空档）

// 公共准备：A 建目标并排程（W 周 3 个时段 + 下一周 2 个对照时段），B 同步到一模一样
async function setup(browser) {
  reset();
  const A = await device(browser, '2026-11-09T10:30:00', 'A');
  const id = await A.page.evaluate(() => { const g = Goals.core.normGoal({ id: crypto.randomUUID(), space: 'study', title: 'SPM revision', status: 'draft', targetFinish: '2026-12-10', deadline: '2026-12-20',
    steps: [{ title: 'Bahasa Melayu', estimateMin: 80 }, { title: 'Matematik', estimateMin: 80 }, { title: 'Sains', estimateMin: 40 }] }); Goals.core.saveGoal(g, 0); return g.id; });
  const r = await commitCrafted(A, id, [S(NOV16, 0), S(NOV16 + 1, 1), S(NOV16 + 2, 0), S(NOV23, 1), S(NOV23 + 1, 2)]);   // 三个步骤的预估分钟（80/80/40）刚好排满
  await sync(A);
  const B = await device(browser, '2026-11-09T10:31:00', 'B'); await sync(B); await B.page.waitForTimeout(600);
  A.dialogs.length = 0; B.dialogs.length = 0; A.errs.length = 0; B.errs.length = 0;      // B 首次登录时的“云端已有数据”确认框属于准备阶段，不计入各场景的断言
  return { A, B, id, ok: r.ok && r.added === 5 };
}
const close = async (...ds) => { for (const d of ds) { try { await d.ctx.close(); } catch (e) {} } };

(async () => {
  const browser = await chromium.launch();

  // ===================== 场景 1：A 移除，B 持有旧关联 =====================
  {
    const { A, B, id, ok } = await setup(browser);
    rec('S1 准备：A 排了 5 个时段，B 同步后也认得全部 5 条有效关联', ok && (await validN(A, id)) === 5 && (await validN(B, id)) === 5, 'A=' + await validN(A, id) + ' B=' + await validN(B, id));
    // 1a. A 目标级“移除未到的时段”；B 没改任何东西，只是拿着旧数据重新同步
    const rm = await A.page.evaluate(i => GoalsPlan.clearUpcoming(i), id);
    await sync(A); await sync(B); await sync(A);
    rec('S1a A 移除全部未到时段 → B 重新同步后：时段消失、有效关联 0（不复活）；A 再同步也没被 B 的旧数据盖回来',
      rm.ok && rm.n === 5 && (await validN(B, id)) === 0 && (await validN(A, id)) === 0 && (await goalSessions(B)).length === 0 && (await goalSessions(A)).length === 0 && (await sumN(B, id)) === 0,
      'rm=' + JSON.stringify(rm) + ' B valid=' + await validN(B, id) + ' B sessions=' + (await goalSessions(B)).length + ' A sessions=' + (await goalSessions(A)).length);
    rec('S1a 全程无冲突弹窗、无页面报错', !A.dialogs.length && !B.dialogs.length && !A.errs.length && !B.errs.length, A.dialogs.concat(B.dialogs).join('/') + A.errs.concat(B.errs).join('|'));
    await close(A, B);
  }
  {
    // 1b. B 离线，自己也有未上传的 goals-links 改动（给另一周加了 1 个时段）；A 同时移除了旧时段。B 上线后 goals-links 按条合并，旧关联会“回到表里”——但必须判为失效
    const { A, B, id } = await setup(browser);
    cloud.offline.B = true;
    const rb = await commitCrafted(B, id, [S(NOV30, 2)]);                       // B 离线：新周 + goals-links 的未上传改动
    const rm = await A.page.evaluate(i => GoalsPlan.clearUpcoming(i), id);       // A 在线：移除它所知道的 5 个时段
    const ra = await commitCrafted(A, id, [S(DEC7, 2)]);                          // A 再排一个新时段：commit 会把 A 关联表里已失效的旧条目清掉 → A 和 B 的 goals-links 都有未上传的改动，走“按条合并”这条路径
    await sync(A);
    cloud.offline.B = false; await sync(B); await sync(A); await sync(B);
    const vB = await B.page.evaluate(() => GoalsPlan.validLinks().map(l => l.dn).sort()), vA = await A.page.evaluate(() => GoalsPlan.validLinks().map(l => l.dn).sort());
    const raw = await rawLinks(B);
    rec('S1b B 带着未上传的关联改动重新同步：被 A 移除的 5 个旧关联即使因“并集合并”回到表里，也判为失效；只有两边各自新排的 2 个（B：11/30，A：12/7）有效',
      rb.ok && rm.ok && ra.ok && raw >= 7 && JSON.stringify(vB) === JSON.stringify([NOV30, DEC7]) && JSON.stringify(vA) === JSON.stringify(vB) && !B.dialogs.length && !A.dialogs.length,
      'raw=' + raw + ' B valid=' + JSON.stringify(vB) + ' A valid=' + JSON.stringify(vA));
    rec('S1b 旧时段没有被写回课表（周 16 / 23 的目标时段为 0），A、B 的课表一致、只剩两边新排的 2 个', (await goalSessions(A)).join() === (await goalSessions(B)).join() && (await goalSessions(B)).length === 2, JSON.stringify(await goalSessions(B)));
    rec('S1b 目标卡片统计一致：A、B 的“已排程”都是 2 个，不会把失效关联算进去', (await sumN(A, id)) === 2 && (await sumN(B, id)) === 2);
    rec('S1b 合并过程没有冲突弹窗、没有页面报错', !A.dialogs.length && !B.dialogs.length && !A.errs.length && !B.errs.length, A.dialogs.concat(B.dialogs).join('/') + A.errs.concat(B.errs).join('|'));
    await close(A, B);
  }
  {
    // 1c. A 删除整个目标（墓碑）；B 持有旧目标 + 旧关联 → B 同步后目标消失，不会因旧关联“复活”目标；课表里的活动沿用现有语义（保留，A/B 一致）
    const { A, B, id } = await setup(browser);
    const before = await goalSessions(A);
    await A.page.evaluate(i => Goals.core.deleteGoal(i), id); await sync(A); await sync(B); await sync(A);
    rec('S1c A 删除目标后 B 重新同步：目标从 B 的列表消失；A 再同步也不会被 B 的旧数据复活',
      !(await goalVisible(B, id)) && !(await goalVisible(A, id)) && (await B.page.evaluate(i => !!Goals.core.getGoal(i) && !!Goals.core.getGoal(i).deletedAt || !Goals.core.getGoal(i), id)));
    rec('S1c 已删除目标留下的课表活动：两台设备一致（现有语义：删除目标不动课表），没有出现重复或丢失', (await goalSessions(A)).join() === before.join() && (await goalSessions(B)).join() === before.join(), 'before=' + before.length + ' A=' + (await goalSessions(A)).length + ' B=' + (await goalSessions(B)).length);
    rec('S1c 没有弹窗、没有页面报错', !A.dialogs.length && !B.dialogs.length && !A.errs.length && !B.errs.length, A.dialogs.concat(B.dialogs).join('/') + A.errs.concat(B.errs).join('|'));
    await close(A, B);
  }

  // ===================== 场景 2：A、B 离线修改同一周的不同日程 =====================
  // A（离线）：在 W 周周四加一个个人活动 “A-Dentist”（新增一条）；B（离线）：把周一的目标时段挪到 16:00，并删掉周二的目标时段。二者改的是不同日程，但同属 mochi-wk:<课表>:<W> 这一个键。
  async function twoOffline(browser) {
    const ctx = await setup(browser), { A, B, id } = ctx;
    cloud.offline.A = true; cloud.offline.B = true;
    await A.page.evaluate(dn => { const w = Sched.weekOf(dn); WK[w] = WK[w] || []; const arr = (w === curW ? data : WK[w]); arr.push({ day: dnDate(dn).wd, s: 900, e: 960, t: 'A-Dentist', c: 'rose' }); saveWeek(w); }, NOV16 + 3);
    await B.page.evaluate(([dn1, dn2]) => { const w = Sched.weekOf(dn1), arr = (w === curW ? data : WK[w]);
      const m = arr.find(x => x.day === dnDate(dn1).wd && x.s === 840 && /^Bahasa/.test(x.t)); m.s = 960; m.e = 1000;
      const i = arr.findIndex(x => x.day === dnDate(dn2).wd && x.s === 840 && /^Matematik/.test(x.t)); arr.splice(i, 1); saveWeek(w); }, [NOV16, NOV16 + 1]);
    ctx.rawA = await weekRaw(A, NOV16); ctx.rawB = await weekRaw(B, NOV16);
    return ctx;
  }
  for (const choice of ['accept', 'dismiss']) {
    const { A, B, id, rawA, rawB } = await twoOffline(browser), tag = choice === 'accept' ? 'S2-云端' : 'S2-本机';
    rec(tag + ' 前提：离线期间两台设备的“同一周”确实各改了不同的日程，内容已经分叉', rawA !== rawB && /A-Dentist/.test(rawA) && !/A-Dentist/.test(rawB));
    B.choice = choice; B.dialogs.length = 0; A.dialogs.length = 0;
    cloud.offline.A = false; await sync(A);                       // A 先上线，推上去
    cloud.offline.B = false; await sync(B); await sync(B); await sync(A);
    const conflictB = B.dialogs.filter(d => /被改过了|冲突/.test(d));
    rec(tag + ' B 上线：同一周在两端都被改过 → 弹出一次明确的冲突提示，提示里点名了这一周（11/16 那一周的安排）；A 没有弹窗',
      conflictB.length === 1 && /11\/16/.test(conflictB[0]) && !A.dialogs.length, 'B dialogs=' + JSON.stringify(B.dialogs) + ' A dialogs=' + A.dialogs.length);
    const wa = await weekRaw(A, NOV16), wb = await weekRaw(B, NOV16);
    rec(tag + ' 同步后 A、B 的这一周完全一致（收敛到同一份，没有“各留一半”的混合数据）', wa === wb && !!wa, 'equal=' + (wa === wb));
    const tA = await titles(A, NOV16), tB = await titles(B, NOV16);
    const vA = await validN(A, id), vB = await validN(B, id), rawN = await rawLinks(B);
    if (choice === 'accept') {
      // 选“用云端”：B 本周的改动丢失（冲突提示里已写明），A 的 Dentist 保留；周一时段回到原位、周二时段回来 → 所有关联重新有效，不多不少
      rec(tag + ' 结果：A 的新增（A-Dentist）保留；B 的“挪动 + 删除”被云端版本取代，目标时段回到 A 排的位置', tA.includes('A-Dentist') && tB.includes('A-Dentist') && tA.join() === tB.join(), tB.join());
      rec(tag + ' Goals：5 条关联全部重新有效（W 周 3 条 + 下一周 2 条），A=B=5，没有多出来的“幽灵关联”，也没有重复时段', vA === 5 && vB === 5 && (await goalSessions(A)).length === 5 && (await goalSessions(B)).join() === (await goalSessions(A)).join(), 'valid A=' + vA + ' B=' + vB + ' raw=' + rawN + ' sessions=' + (await goalSessions(A)).length);
      const sc = await B.page.evaluate(i => { const s = GoalsPlan.scanBroken(i); return { moved: s.moved.length, gone: s.gone }; }, id);
      rec(tag + ' Goals：没有“被移动 / 已消失”的提示（卡片不会误报需要重新排程）', sc.moved === 0 && sc.gone === 0, JSON.stringify(sc));
    } else {
      // 选“保留本机”：B 的版本覆盖云端，A 同步后拿到 B 的版本——A 的 Dentist 丢失；周一时段被挪走 → “被移动”，周二时段被删 → “已消失”
      rec(tag + ' 结果：B 的“挪动 + 删除”覆盖云端，A 同步后也是 B 的版本（A-Dentist 丢失，这是选“保留本机”的预期代价）', !tA.includes('A-Dentist') && tA.join() === tB.join(), tB.join());
      const sc = await B.page.evaluate(i => { const s = GoalsPlan.scanBroken(i); return { moved: s.moved.length, gone: s.gone }; }, id);
      rec(tag + ' Goals：只有仍在原位的 3 条（周三 + 下一周 2 条）有效；被挪走的 1 条被识别为“被移动”，被删的 1 条识别为“已消失”，没有被当成已排程', vA === 3 && vB === 3 && sc.moved === 1 && sc.gone === 1, 'valid A=' + vA + ' B=' + vB + ' ' + JSON.stringify(sc));
      // 恢复路径 1：A 点“跟随移动”（只更新关联表位置，不动课表）
      const fm = await A.page.evaluate(i => GoalsPlan.followMoved(i), id);
      await sync(A); await sync(B);
      rec(tag + ' 恢复①：A「跟随移动」成功 → 有效关联 4；B 同步后也认得（A=B=4），课表未被改动', fm.ok && fm.n === 1 && (await validN(A, id)) === 4 && (await validN(B, id)) === 4 && (await weekRaw(A, NOV16)) === wb, 'fm=' + JSON.stringify(fm) + ' A=' + await validN(A, id) + ' B=' + await validN(B, id));
      // 恢复路径 2：B 点“重新排剩余时间”（走真实界面）→ 补回被删掉的 Matematik 那 40 分钟；提交后两边的有效时段 = 课表里的目标时段，没有重复
      await B.page.keyboard.press('Escape'); await B.page.evaluate(() => openGoals()); await B.page.waitForTimeout(200);
      await B.page.locator('.gl-card', { hasText: 'SPM revision' }).first().click(); await B.page.waitForTimeout(200);
      const lbl = await B.page.locator('.gl-plan-btn').innerText();
      await B.page.locator('.gl-plan-btn').click(); await B.page.waitForTimeout(300);
      const pv = await B.page.evaluate(() => { const r = GoalsPlan._state().result; return { need: r.totals.need, n: r.sessions.length }; });
      await B.page.locator('.gl-bar .gl-primary').click(); await B.page.waitForTimeout(500);
      await sync(B); await sync(A);
      const gA = await goalSessions(A), gB = await goalSessions(B);
      rec(tag + ' 恢复②：重新排程入口可用，只补缺口（需要 ' + pv.need + ' 分钟、' + pv.n + ' 个时段，不重排已有的）；提交后 A=B，有效关联数 = 课表里的目标时段数（无重复、无遗漏）',
        pv.need === 40 && pv.n >= 1 && gA.length === 4 + pv.n && (await validN(A, id)) === gA.length && (await validN(B, id)) === gB.length && gA.join() === gB.join(), 'btn=' + lbl + ' pv=' + JSON.stringify(pv) + ' A=' + await validN(A, id) + '/' + gA.length + ' B=' + await validN(B, id) + '/' + gB.length);
      await B.page.keyboard.press('Escape');
    }
    rec(tag + ' 全程无页面报错', !A.errs.length && !B.errs.length, A.errs.concat(B.errs).join(' | '));
    await close(A, B);
  }
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
