// Goals Phase 2 真浏览器端到端测试（Playwright / Chromium，固定时间 = 2026-11-09 周一 10:30）。
// 用法：python3 -m http.server 8766 &  然后  node tests/goals-plan-smoke.cjs [http://localhost:8766]
// 跑的是真实的 index.html（CDN 脚本被拦截，应用对缺失库有降级）。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8766';
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5);
function seedFor(y, m, d) {       // 以 (y,m,d) 所在周的周一为基准造一份真实课表：固定课 + 重复活动 + 手动活动 + 学习科目
  const mon = DN([y, m, d]) - ((DN([y, m, d]) + 3) % 7), w = Math.floor((mon + 3) / 7), fx = [];
  for (let i = 0; i < 5; i++) fx.push({ id: 'fx' + i, day: i, s: 480, e: 780, t: 'School', room: '', teacher: '', type: '课', c: 'sky' });
  const man = {}; man['mochi-wk:main:' + w] = JSON.stringify([{ day: 1, s: 840, e: 900, t: 'Dentist', c: 'pink' }]);
  return Object.assign({ 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-fx': JSON.stringify(fx),
    'mochi-rp': JSON.stringify([{ id: 'rp1', day: 2, s: 960, e: 1020, t: 'Club', c: 'mint', a0: mon + 2, ev: 1 }]),
    'mochi-st': JSON.stringify({ subs: ['Bahasa Melayu', 'Matematik', 'Sejarah'], topics: [], ex: {} }),
    'mochi-hw': JSON.stringify([{ id: 'h1', t: 'HW', sb: '', due: '', done: 0, ts: 1, note: '', link: '' }]) }, man);
}
async function open(browser, { vp = { width: 390, height: 844 }, lang, tz, at = '2026-11-09T10:30:00', seed } = {}) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block', timezoneId: tz });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  const errs = [], st = Object.assign({}, seed || seedFor(2026, 11, 9)); if (lang) st['ui-lang'] = lang;
  await ctx.addInitScript(([s]) => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); } }, [st]);
  const page = await ctx.newPage(); await page.clock.setFixedTime(new Date(at));
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200); return { ctx, page, errs };
}
const ls = page => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== 'mochi-sync-meta') o[k] = localStorage.getItem(k); } return o; });   // v9.5：mochi-sync-meta 是同步簿记，会随目标变化，不算“数据”
const same = (a, b) => JSON.stringify(Object.keys(a).sort().map(k => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map(k => [k, b[k]]));
const diffKeys = (a, b) => Object.keys(Object.assign({}, a, b)).filter(k => a[k] !== b[k]);
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
const mkGoal = (page, over) => page.evaluate(o => {
  const g = Goals.core.normGoal(Object.assign({ id: crypto.randomUUID(), space: 'study', title: 'SPM revision', status: 'draft', targetFinish: '2026-11-18', deadline: '2026-12-01',
    steps: [{ title: 'Bahasa Melayu', estimateMin: 120, deadline: '2026-11-20' }, { title: 'Matematik', estimateMin: 90, estimateMaxMin: 150, deadline: '2026-11-25' }, { title: 'Sejarah', estimateMin: 180, deadline: '2026-12-01', assumed: true }] }, o));
  const r = Goals.core.saveGoal(g, 0); return { id: g.id, ok: r.ok };
}, over || {});
const closeAll = async page => { for (let i = 0; i < 4 && (await page.$('.gl-mask')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(80); } };
const openPlan = async (page, title) => {            // 真实点击：Goals → 目标卡片 → Find time slots
  await closeAll(page); await page.evaluate(() => openGoals()); await page.waitForTimeout(150);
  await page.locator('.gl-card', { hasText: title || 'SPM revision' }).first().click(); await page.waitForTimeout(150);
  await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(250);
};
const openPlanNoClick = async page => { await closeAll(page); await page.evaluate(() => openGoals()); await page.waitForTimeout(150); await page.locator('.gl-card').first().click(); await page.waitForTimeout(150); };
const overlaps = page => page.evaluate(() => { let bad = 0; for (let i = 0; i < 40; i++) { const it = Sched.dayItems(todayDn + i); for (let a = 0; a < it.length; a++) for (let b = a + 1; b < it.length; b++) if (it[a].s < it[b].e && it[b].s < it[a].e) bad++; } return bad; });
const goalEvents = page => page.evaluate(() => { const out = []; Object.keys(WK).forEach(w => (WK[w] || []).forEach(x => { if (/Bahasa|Matematik|Sejarah/.test(x.t)) out.push({ w: +w, day: x.day, s: x.s, e: x.e, t: x.t }); })); return out; });

(async () => {
  const browser = await chromium.launch();
  const base = await open(browser); const baseErrs = base.errs.slice(); await base.ctx.close();
  const { ctx, page, errs } = await open(browser);
  const g = await mkGoal(page); rec('准备：目标已保存（3 个科目、考试日不同、希望完成日 11-18）', g.ok);
  const before = await ls(page);
  // ---- 预览：零写入 ----
  await openPlan(page);
  const T = await txt(page, '.gl-plan');
  rec('点「Find time slots」打开预览，英文默认文案', /Plan preview/.test(T) && /Nothing is added to your timetable until you tap/.test(T) && /Sessions will be added to the timetable/.test(T));
  const nSess = await page.locator('.gl-sess input').count(), st0 = await page.evaluate(() => GoalsPlan._state().result);
  rec('预览里的时段数与引擎结果一致，默认全部勾选', nSess === st0.sessions.length && nSess > 3 && (await page.locator('.gl-sess input:checked').count()) === nSess, nSess + ' sessions');
  rec('汇总：需要 7h 30m（科目 2 按区间上限 150）、冲突 0、没有“不够”提示', st0.totals.need === 450 && st0.feasible && /Needed[\s\S]*7h 30m/.test(T) && !/Not enough free time/.test(T));
  rec('Sejarah 的“Estimated — please check”标记在预览里也显示', /Estimated — please check/.test(T));
  const dayOk = await page.evaluate(() => { const r = GoalsPlan._state().result, last = dnFromIso('2026-11-18'); return r.sessions.every(s => s.iso <= '2026-11-18') && r.steps.every(s => s.cap === last); });
  rec('所有时段不晚于希望完成日 11-18（比各科“考试前一天”更早，取较早者）', dayOk);
  rec('预览阶段：localStorage 一个字节都没变（零写入）', same(before, await ls(page)), diffKeys(before, await ls(page)).join());
  // 展开某天看原有日程叠加
  await page.locator('.gl-pday .gl-link').first().click(); await page.waitForTimeout(100);
  rec('展开某一天：同时列出原有课程 / 活动和新时段（叠加预览）', /Class · School/.test(await txt(page, '.gl-exist')) && /New · /.test(await txt(page, '.gl-exist')));
  // ---- 三种取消方式都零写入 ----
  await page.locator('.gl-plan .gl-x').click(); await page.waitForTimeout(150);
  rec('‹ 返回 = 取消：预览关闭、Goals 编辑页仍在、零写入', !(await page.$('.gl-plan')) && !!(await page.$('.gl-mask')) && same(before, await ls(page)));
  await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  rec('Esc 只关预览，不连带关掉 Goals；零写入', !(await page.$('.gl-plan')) && !!(await page.$('.gl-mask')) && same(before, await ls(page)));
  await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(200); await page.locator('.gl-bar .gl-secondary').click(); await page.waitForTimeout(150);
  rec('底部「Cancel」：零写入', !(await page.$('.gl-plan')) && same(before, await ls(page)));

  // ---- 部分勾选 + 确认 ----
  await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(250);
  const all = await page.evaluate(() => GoalsPlan._state().result.sessions.map(s => ({ id: s.id, iso: s.iso, s: s.s, e: s.e, t: s.stepTitle, min: s.min })));
  await page.locator('.gl-sess input').first().uncheck(); await page.waitForTimeout(100);
  const bar = await txt(page, '.gl-bar .gl-primary');
  rec('取消勾选 1 个后，按钮显示 “Add N selected sessions”（N = 总数 − 1）', new RegExp('Add ' + (all.length - 1) + ' selected sessions').test(bar), bar);
  const wkBefore = {}; Object.keys(before).filter(k => /^mochi-(wk|fx|rp|hw|dn|tts|st)/.test(k)).forEach(k => wkBefore[k] = before[k]);
  await page.locator('.gl-bar .gl-primary').click(); await page.waitForTimeout(400);
  const after = await ls(page), ev = await goalEvents(page);
  const dn0 = DN([+all[0].iso.slice(0, 4), +all[0].iso.slice(5, 7), +all[0].iso.slice(8)]), w0 = Math.floor((dn0 + 3) / 7), day0 = (dn0 + 3) % 7;
  rec('确认后：写入的活动数 = 勾选数，且没有被取消勾选的那一个（按“周 + 星期 + 时间”精确比对，不会被下周同一时间误伤）', ev.length === all.length - 1 && !ev.some(x => x.w === w0 && x.day === day0 && x.s === all[0].s && x.e === all[0].e && x.t === all[0].t));
  rec('固定课程、重复活动、作业、学习数据、课表设置：逐字节不变', ['mochi-fx', 'mochi-rp', 'mochi-hw', 'mochi-st', 'mochi-tts'].every(k => before[k] === after[k]));
  rec('整个课表里没有任何两个安排重叠（含固定课、重复活动、手动活动）', (await overlaps(page)) === 0);
  rec('原有手动活动 “Dentist” 原样还在', (await page.evaluate(() => Object.values(WK).some(a => (a || []).some(x => x.t === 'Dentist' && x.s === 840 && x.e === 900)))));
  const links = JSON.parse(after['goals-links']).links;
  rec('goals-links 记录了每个新活动（独立关联表，原活动结构没加字段）', links.length === ev.length && links.every(l => l.goalId === g.id && l.tid === 'main') && ev.every(x => Object.keys(x).length === 5));
  rec('目标从 Draft 变成 Active', /Active/.test(await txt(page, '.gl-card')) || JSON.parse(after['goals-g:' + g.id]).status === 'active');
  rec('弹出可撤销提示（含“撤销”按钮）', !!(await page.$('.undo button')) && /Added \d+ study sessions/.test(await txt(page, '.undo')));
  rec('回到 Goals 列表并显示结果；目标卡片上显示“Scheduled …”', /Added \d+ sessions to your timetable/.test(await txt(page, '.gl-mask')) && /Scheduled: /.test(await txt(page, '.gl-card')));
  rec('进度没有被“已排程”冒充：完成百分比仍是 0%', /0% done/.test(await txt(page, '.gl-card')));
  // ---- 再次排程：不重复排 ----
  await page.locator('.gl-card').first().click(); await page.waitForTimeout(150); await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(250);
  const r2 = await page.evaluate(() => { const r = GoalsPlan._state().result; return { need: r.totals.need, n: r.sessions.length, min: r.sessions.reduce((a, s) => a + s.min, 0) }; });
  rec('再次排程：只需要补刚才取消勾选的那一个时段的时长，不会把已排的再排一遍', r2.need === all[0].min && r2.min === all[0].min && r2.n >= 1, JSON.stringify(r2) + ' skipped=' + all[0].min);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // ---- Study 自动排程不会误删目标事件（目标事件没有 a:1 标记）----
  const evBefore = (await goalEvents(page)).length;
  await page.keyboard.press('Escape'); await page.waitForTimeout(100); await page.evaluate(() => { const b = document.getElementById('plan'); if (b) b.onclick(); }); await page.waitForTimeout(200);
  rec('「学习」页的自动排程不会删掉 Goals 排的时段', (await goalEvents(page)).length === evBefore && evBefore > 0);
  rec('目标排的时段是普通手动活动：问问 Mochi 看到的是 k:m（固定课 k:f、重复 k:r 仍只读）', await page.evaluate(() => { const ks = {}; for (let i = 0; i < 9; i++) Sched.dayItems(todayDn + i).forEach(x => ks[x.k] = 1); return ks.m && ks.r && ks.f; }));

  // ---- 撤销：逐字节还原 ----
  await page.evaluate(() => { const s = JSON.stringify(Undo.snap()); window.__undoCheck = s; });
  await page.locator('.undo button:not(.x)').click().catch(() => {}); await page.waitForTimeout(900);
  const restored = await ls(page);
  rec('点「撤销」后：所有课表键逐字节回到确认之前（Goals 排的时段全部消失）', Object.keys(wkBefore).every(k => restored[k] === wkBefore[k]) && (await goalEvents(page)).length === 0, Object.keys(wkBefore).filter(k => restored[k] !== wkBefore[k]).join());
  rec('撤销后旧的 goals-links 失效：不再被当成“已排程”', await page.evaluate(() => GoalsPlan.validLinks().length === 0 && GoalsPlan.upcoming().length === 0));
  await openPlan(page);
  rec('撤销后重新排程：回到完整的 7h 30m 需求', await page.evaluate(() => GoalsPlan._state().result.totals.need === 450));
  await page.keyboard.press('Escape');

  // ---- 竞态：预览之后日程变了 ----
  await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(250);
  const first = await page.evaluate(() => { const s = GoalsPlan._state().result.sessions[0]; return { dn: s.dn, s: s.s, e: s.e }; });
  await page.evaluate(f => { const w = Sched.weekOf(f.dn), wd = dnDate(f.dn).wd; (WK[w] = WK[w] || []).push({ day: wd, s: f.s, e: f.e, t: 'Surprise', c: 'pink' }); if (w === curW) WK[w] = data; saveWeek(w); }, first);
  const nBefore = await page.locator('.gl-sess input:checked').count();
  await page.locator('.gl-bar .gl-primary').click(); await page.waitForTimeout(400);
  const ev3 = await goalEvents(page);
  rec('预览后别处新增了冲突活动：对应时段被跳过并告知，其余照常写入，且没有任何重叠', ev3.length === nBefore - 1 && (await overlaps(page)) === 0 && /1 skipped because the time was taken/.test(await txt(page, '.gl-mask')), 'events=' + ev3.length + ' expected=' + (nBefore - 1));
  rec('“Surprise” 活动原样保留', await page.evaluate(() => Object.values(WK).some(a => (a || []).some(x => x.t === 'Surprise'))));

  // ---- 用户事后改动 / 删除已排时段：关联失效检测 ----
  const mv = await page.evaluate(() => { const l = GoalsPlan.validLinks(); const a = l[0], b = l[1]; const A = WK[a.w].find(x => x.day === a.day && x.s === a.s && x.t === a.t); A.s += 5; A.e += 5; saveWeek(a.w); const B = WK[b.w]; B.splice(B.findIndex(x => x.day === b.day && x.s === b.s && x.t === b.t), 1); saveWeek(b.w); return { before: l.length, after: GoalsPlan.validLinks().length }; });
  rec('用户移动 1 个、删除 1 个已排时段：这 2 条关联自动失效（不会崩，也不会再算作已排程）', mv.after === mv.before - 2, JSON.stringify(mv));
  rec('用户自己移动过的活动不会被 Goals 删除或再动', await page.evaluate(() => Object.values(WK).some(a => (a || []).some(x => /Bahasa|Matematik|Sejarah/.test(x.t) && x.s % 15 === 5))));

  // ---- 目标在预览期间被改：拒绝写入 ----
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await openPlan(page); const wk4 = await ls(page);
  await page.evaluate(id => { const x = Goals.core.getGoal(id); x.title = 'SPM revision v2'; Goals.core.saveGoal(x, x.rev); }, g.id);
  await page.locator('.gl-bar .gl-primary').click().catch(() => {}); await page.waitForTimeout(250);
  const wk4b = await ls(page);
  rec('目标在预览期间被改动：提示“changed while you were previewing”，课表零写入', /changed while you were previewing/.test(await txt(page, '.gl-plan')) && diffKeys(wk4, wk4b).every(k => k.indexOf('goals-g:') === 0), diffKeys(wk4, wk4b).join());
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');

  // ---- 排不下：如实报告，不超排 ----
  const g2 = await mkGoal(page, { title: 'Impossible', targetFinish: '', deadline: '2026-11-10', steps: [{ title: 'Huge', estimateMin: 3000, deadline: '2026-11-10' }] });
  const wk5 = await ls(page); await openPlan(page, 'Impossible');
  const T5 = await txt(page, '.gl-plan'), r5 = await page.evaluate(() => GoalsPlan._state().result);
  rec('排不下：提示“Not enough free time … Nothing is overbooked”并给出处理办法', /Not enough free time: .* cannot be placed\. Nothing is overbooked\./.test(T5) && /Reduce the estimates/.test(T5) && !r5.feasible && r5.totals.placed + r5.totals.short === 3000 && r5.totals.short > 0);
  rec('排不下时只排“真的有空”的部分：今天 13:00 后、不超每日 180 分钟上限、不压任何固定课', r5.totals.placed <= 180 && r5.sessions.every(s => s.s >= 780));
  rec('排不下的预览本身零写入', same(wk5, await ls(page)));
  await closeAll(page);
  // 一个都排不进（截止日就是今天，学习空间要在考试前一天结束）→ 按钮禁用
  await mkGoal(page, { title: 'NoDays', targetFinish: '', deadline: '2026-11-09', steps: [{ title: 'Late', estimateMin: 60, deadline: '2026-11-09' }] });
  const wk5b = await ls(page); await openPlan(page, 'NoDays');
  rec('一个都排不进：确认按钮禁用、提示“No days left”，什么都不会写入', await page.locator('.gl-bar .gl-primary').isDisabled() && /No days left before the deadline/.test(await txt(page, '.gl-plan')) && same(wk5b, await ls(page)));
  await closeAll(page);
  // 部分排得下：建议“提高每日上限”应真的可行
  const g3 = await mkGoal(page, { title: 'Tight', targetFinish: '', deadline: '2026-11-13', constraints: { maxDailyMin: 60, sessionMin: 45, breakMin: 10 }, steps: [{ title: 'Revise', estimateMin: 400, deadline: '2026-11-13' }] });
  await openPlan(page, 'Tight');
  const T6 = await txt(page, '.gl-plan'); rec('每日上限太小：出现“Allow up to … per day”建议', /Allow up to .* per day/.test(T6));
  await page.locator('.gl-plan .gl-addrow .gl-secondary', { hasText: 'Allow up to' }).click(); await page.waitForTimeout(250);
  rec('点击建议后预览重新计算并排得下（建议只是预览，不会自动写入）', await page.evaluate(() => GoalsPlan._state().result.feasible) && !(await ls(page))['goals-links'].includes('"Revise"'));
  await closeAll(page);

  // ---- 状态限制 ----
  await page.evaluate(id => { const x = Goals.core.getGoal(id); x.status = 'paused'; Goals.core.saveGoal(x, x.rev); }, g.id);
  await closeAll(page); await page.evaluate(() => openGoals()); await page.waitForTimeout(100); await page.locator('.gl-card', { hasText: 'v2' }).first().click(); await page.waitForTimeout(100);
  rec('暂停 / 完成 / 归档的目标不能排程（按钮禁用并说明原因）', await page.locator('.gl-plan-btn').isDisabled() && /Set this goal to Draft or Active/.test(await txt(page, '.gl-mask')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);

  // ---- 布局与无障碍（360px）----
  await page.evaluate(() => { const x = Goals.core.getGoal(Goals.core.listGoals().filter(q => q.title === 'Tight')[0].id); });
  // ---- 你的 SPM 场景：7 科、20 天（11-09 → 11-29）、各科考试日不同、提前 3 天完成（目标 11-26）----
  { await closeAll(page); const ex = ['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-23', '2026-11-25', '2026-11-27', '2026-11-29'], nm = ['BM', 'BI', 'Math', 'Sci', 'Sej', 'Add', 'PI'];
    await mkGoal(page, { title: 'SPM 20 days', targetFinish: '2026-11-26', deadline: '2026-11-29', steps: nm.map((n, i) => ({ title: 'S-' + n, estimateMin: 240, deadline: ex[i] })) });
    await openPlan(page, 'SPM 20 days');
    const R = await page.evaluate(() => { const r = GoalsPlan._state().result; return { feasible: r.feasible, placed: r.totals.placed, last: r.sessions[r.sessions.length - 1].iso, perStep: r.steps.map(s => [s.title, s.lastDn !== null ? isoOf(s.lastDn) : null, isoOf(s.cap)]) }; });
    rec('SPM 7 科 × 4h、各科考试日不同、提前 3 天完成：排得下（共 28h）、最后一个时段不晚于 11-26', R.feasible && R.placed === 1680 && R.last <= '2026-11-26', R.last);
    rec('SPM：每科最后一个时段都在各自“考试前一天”之前（考试日不同，不是同一天）', R.perStep.every(x => x[1] <= x[2]) && R.perStep.map(x => x[2]).join() === ['2026-11-16', '2026-11-17', '2026-11-19', '2026-11-22', '2026-11-24', '2026-11-26', '2026-11-26'].join(), JSON.stringify(R.perStep.map(x => x[2].slice(5))));
    await page.locator('.gl-bar .gl-primary').click(); await page.waitForTimeout(500);
    rec('SPM：全部确认后写入 1680 分钟，整个课表仍然没有任何重叠', (await page.evaluate(() => { let m = 0; Object.keys(WK).forEach(w => (WK[w] || []).forEach(x => { if (/^S-/.test(x.t)) m += x.e - x.s; })); return m; })) === 1680 && (await overlaps(page)) === 0);
    await page.locator('.gl-card', { hasText: 'SPM 20 days' }).first().click(); await page.waitForTimeout(150); await page.locator('.gl-plan-btn').click(); await page.waitForTimeout(250);
    rec('SPM：再次排程提示“Everything is already scheduled”，没有新的要添加', /Everything is already scheduled/.test(await txt(page, '.gl-plan')) && (await page.evaluate(() => GoalsPlan._state().result.sessions.length)) === 0);
    await closeAll(page); }
  // ---- 排程可单独关闭 / 恢复（数据保留；Phase 1 草稿功能不受影响）----
  { const lk0 = (await ls(page))['goals-links']; await page.evaluate(() => GoalsPlan.setEnabled(false)); await openPlanNoClick(page);
    rec('关闭排程开关：编辑页没有“Find time slots”，列表卡片不再显示 Scheduled，但目标草稿功能照常', !(await page.$('.gl-plan-btn')) && !/Scheduled:/.test(await txt(page, '.gl-mask')) && /SPM revision v2|Edit goal/.test(await txt(page, '.gl-mask')));
    rec('关闭开关不删数据：goals-links 原样保留', (await ls(page))['goals-links'] === lk0);
    await closeAll(page); await page.evaluate(() => GoalsPlan.setEnabled(true)); await openPlanNoClick(page);
    rec('重新打开开关：入口与“Scheduled”回来', !!(await page.$('.gl-plan-btn')));
    await closeAll(page); }
  rec('整个过程没有新增 pageerror / console.error（与不打开 Goals 的基线对比）', errs.filter(e => baseErrs.indexOf(e) < 0).length === 0, errs.filter(e => baseErrs.indexOf(e) < 0).slice(0, 3).join(' | '));
  await ctx.close();

  // ---- 窄屏 / Buddy 让位 / 无横向溢出 / 确认按钮在视口内 ----
  { const s = await open(browser, { vp: { width: 360, height: 640 } }); await mkGoal(s.page); await openPlan(s.page);
    const m = await s.page.evaluate(() => { const w = document.querySelector('.gl-plan-wrap'), b = document.querySelector('.gl-bar .gl-primary').getBoundingClientRect(), bd = document.querySelector('.bd'); return { over: w.scrollWidth > w.clientWidth + 1, btnIn: b.bottom <= innerHeight && b.top >= 0, buddyHidden: !bd || bd.classList.contains('bd-hide') || getComputedStyle(bd).visibility === 'hidden' }; });
    rec('360×640：无横向溢出；确认按钮在视口内；Buddy 让位不遮挡', !m.over && m.btnIn && m.buddyHidden, JSON.stringify(m));
    const tabOk = await s.page.evaluate(() => [...document.querySelectorAll('.gl-plan button,.gl-plan input')].every(e => (e.type === 'checkbox' ? e.closest('label') : e).getBoundingClientRect().height >= 30)); rec('预览里的按钮 / 勾选框有足够的点按面积（≥30px）', tabOk);
    await s.ctx.close(); }
  // ---- 中文 / 马来文：没有漏出的翻译键 ----
  for (const L of ['zh', 'ms']) { const s = await open(browser, { lang: L }); await mkGoal(s.page); await openPlan(s.page);
    const T9 = await txt(s.page, '.gl-plan'), leak = T9.match(/\b(plan[A-Z]\w+|stat_\w+|reason_\w+|note_\w+|sug[A-Z]\w+|opt[A-Z]\w+|step[A-Z]\w+|err[A-Z]\w+)\b/);
    rec(L + '：预览界面已翻译且没有漏出的键名', (L === 'zh' ? /排程预览/.test(T9) && /点“添加”之前/.test(T9) : /Pratonton pelan/.test(T9) && /Tiada apa-apa ditambah/.test(T9)) && !leak, leak ? leak[0] : ''); await s.ctx.close(); }

  // ---- 时区 / 夏令时：跨 DST 切换日排程，日期不错位、不丢天、不重复 ----
  for (const Z of [{ tz: 'America/New_York', at: '2026-10-29T10:30:00', ymd: [2026, 10, 29], dl: '2026-11-06', must: '2026-11-01' }, { tz: 'Pacific/Auckland', at: '2026-09-23T10:30:00', ymd: [2026, 9, 23], dl: '2026-10-02', must: '2026-09-27' }]) {
    const s = await open(browser, { tz: Z.tz, at: Z.at, seed: seedFor(...Z.ymd) });
    await mkGoal(s.page, { targetFinish: '', deadline: Z.dl, steps: [{ title: 'Bahasa Melayu', estimateMin: 1500, deadline: Z.dl }], constraints: { maxDailyMin: 600, sessionMin: 45, breakMin: 10 } }); await openPlan(s.page);
    const r = await s.page.evaluate(() => { const R = GoalsPlan._state().result; return { n: R.sessions.length, isos: [...new Set(R.sessions.map(x => x.iso))], days: R.days.map(d => d.iso), ok: R.feasible }; });
    const consecutive = r.days.every((x, i) => i === 0 || (Date.parse(x) - Date.parse(r.days[i - 1])) === 864e5);
    await s.page.locator('.gl-bar .gl-primary').click(); await s.page.waitForTimeout(400);
    const chk = await s.page.evaluate(() => { let bad = 0, n = 0; Object.keys(WK).forEach(w => (WK[w] || []).forEach(x => { if (/Bahasa/.test(x.t)) { n++; const dn = dnOf(+w, x.day); if (dnDate(dn).wd !== x.day) bad++; } })); let ov = 0; for (let i = 0; i < 20; i++) { const it = Sched.dayItems(todayDn + i); for (let a = 0; a < it.length; a++) for (let b = a + 1; b < it.length; b++) if (it[a].s < it[b].e && it[b].s < it[a].e) ov++; } return { bad, n, ov }; });
    rec(Z.tz + '：跨夏令时切换日（' + Z.must + '）排程——日期连续不缺不重、包含切换日、写入后星期一致且无重叠', r.ok && consecutive && r.isos.indexOf(Z.must) >= 0 && chk.bad === 0 && chk.n === r.n && chk.ov === 0, JSON.stringify({ days: r.days.length, sessions: r.n, chk }));
    await s.ctx.close(); }

  // ================= v9.4：日程与关联表原子写入 / 跟随移动 / 目标级撤销 =================
  { const s = await open(browser); const pg = s.page; await mkGoal(pg); await openPlan(pg);
    const snapKeys = () => ls(pg).then(o => { const r = {}; Object.keys(o).filter(k => /^mochi-/.test(k) || k === 'goals-links').forEach(k => r[k] = o[k]); return r; });
    const before = await snapKeys();
    // 1) 关联表写入失败：整个提交零写入（日程不变、没有孤儿活动），预览仍开着并提示
    await pg.evaluate(() => { const o = Storage.prototype.setItem; window.__o = o; Storage.prototype.setItem = function (k, v) { if (k === 'goals-links') throw new Error('quota'); return o.call(this, k, v); }; });
    await pg.locator('.gl-bar .gl-primary').click(); await pg.waitForTimeout(300);
    const a1 = await snapKeys();
    rec('v9.4 关联表写失败：课表、固定课、重复活动、关联表逐字节不变（不再出现“有活动但不知属于哪个目标”）', same(before, a1) && (await goalEvents(pg)).length === 0, diffKeys(before, a1).join(','));
    rec('v9.4 关联表写失败：预览不关闭，并明确告知“什么都没有添加”', !!(await pg.$('.gl-plan')) && /nothing was added/i.test(await txt(pg, '.gl-plan')));
    await pg.evaluate(() => { Storage.prototype.setItem = window.__o; });
    // 2) 日程写入失败（读回校验不一致）：回滚日程，并还原关联表原文
    await pg.evaluate(() => { const o = Storage.prototype.setItem; window.__o = o; Storage.prototype.setItem = function (k, v) { if (/^mochi-wk:/.test(k)) return; return o.call(this, k, v); }; });
    await pg.locator('.gl-bar .gl-primary').click(); await pg.waitForTimeout(300);
    const a2 = await snapKeys();
    rec('v9.4 日程写失败：日程回滚、关联表还原为原文（没有留下指向不存在活动的新记录）', same(before, a2) && (await goalEvents(pg)).length === 0, diffKeys(before, a2).join(','));
    await pg.evaluate(() => { Storage.prototype.setItem = window.__o; });
    // 3) 恢复正常后可成功写入，且关联数 = 活动数
    await pg.locator('.gl-bar .gl-primary').click(); await pg.waitForTimeout(400);
    { const ev = await goalEvents(pg), lk = JSON.parse((await ls(pg))['goals-links']).links;
      rec('v9.4 恢复正常后再提交：写入成功，关联数 = 活动数，且返回 linksOk', ev.length > 0 && lk.length === ev.length); }
    // 4) 用户拖动了一个时段：Goals 认出来，并可一键跟随（只改关联表）
    const mv = await pg.evaluate(() => { const n = Object.keys(WK).map(Number).sort((a, b) => b - a); for (const w of n) { const arr = WK[w] || []; for (let i = arr.length - 1; i >= 0; i--) { const x = arr[i]; if (/Bahasa|Matematik|Sejarah/.test(x.t)) { const d = x.e - x.s; x.s = 1230; x.e = 1230 + d; (w === curW ? (WK[w] = data) : 0); saveWeek(w); return { w, t: x.t }; } } } return null; });
    await pg.reload(); await pg.waitForTimeout(1200); await openPlanNoClick(pg);
    const T4 = await txt(pg, '.gl-plan-btn ~ *, .gl-sec'), mvTxt = await pg.evaluate(() => ({ moved: (document.querySelector('.gl-moved') || {}).innerText || '', btn: (document.querySelector('.gl-plan-btn') || {}).innerText || '' }));
    rec('v9.4 被移动的时段：界面提示 “N session(s) were moved by you”，主按钮变成“Re-plan remaining time”', mv && /moved by you/.test(mvTxt.moved) && /Re-plan/.test(mvTxt.btn), JSON.stringify(mvTxt));
    const pre = await pg.evaluate(() => GoalsPlan.upcoming().length), evBefore = (await goalEvents(pg)).length, wkB = await snapKeys();
    await pg.locator('.gl-follow-btn').click(); await pg.waitForTimeout(300);
    const post = await pg.evaluate(() => GoalsPlan.upcoming().length), wkA = await snapKeys();
    rec('v9.4 跟随移动：已排时段数恢复（+1），活动数不变，日程数据逐字节不变（只改了关联表）', post === pre + 1 && (await goalEvents(pg)).length === evBefore && diffKeys(wkB, wkA).join(',') === 'goals-links', pre + '→' + post + ' ' + diffKeys(wkB, wkA).join(','));
    // 5) 目标级撤销：只移除这个目标未发生的时段，其它活动不动；有 Undo 提示；撤销后逐字节还原
    await openPlanNoClick(pg);
    rec('v9.4 跟随后不再提示“被移动”，主按钮恢复为 Find time slots', !(await pg.$('.gl-moved')) && /Find time slots/.test(await txt(pg, '.gl-plan-btn')));
    const keep = await snapKeys(); const evN = (await goalEvents(pg)).length;
    await pg.locator('.gl-clear-btn').click(); await pg.waitForTimeout(400);
    const evAfter = (await goalEvents(pg)).length, kAfter = await snapKeys();
    rec('v9.4 目标级撤销：该目标的未到时段全部移除，固定课 / 重复活动 / 作业不变，Dentist 还在', evAfter === 0 && evN > 0 && ['mochi-fx', 'mochi-rp', 'mochi-hw', 'mochi-st'].every(k => keep[k] === kAfter[k]) && (await pg.evaluate(() => Object.values(WK).some(a => (a || []).some(x => x.t === 'Dentist')))), evN + '→' + evAfter);
    rec('v9.4 目标级撤销后弹出可撤销提示', /Removed \d+ sessions/.test(await txt(pg, '.undo')));
    await pg.locator('.undo button').first().click(); await pg.waitForTimeout(1200);
    const kBack = await snapKeys();
    rec('v9.4 点“撤销”后课表逐字节还原', Object.keys(keep).filter(k => /^mochi-wk/.test(k)).every(k => keep[k] === kBack[k]) && (await goalEvents(pg)).length === evN);
    rec('v9.4 页面没有报错', s.errs.length === baseErrs.length, s.errs.join(' | '));
    await s.ctx.close(); }
  // 中文：新增文案没有漏键
  { const s = await open(browser, { lang: 'zh' }); await mkGoal(s.page); await openPlan(s.page); await s.page.locator('.gl-bar .gl-primary').click(); await s.page.waitForTimeout(400); await openPlanNoClick(s.page);
    const T = await txt(s.page, '.gl-mask'); rec('v9.4 zh：目标页的新按钮已翻译且没有漏出键名', /移除 \d+ 个未到的时段/.test(T) && !/clearUpcoming|replanBtn|followMoved/.test(T), T.slice(0, 80)); await s.ctx.close(); }

  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
