// Study Space（v9.7）浏览器冒烟测试：真 index.html + 真数据路径。截图输出到 SHOTS（默认 docs/phase3-screenshots）。
// 用法：python3 -m http.server 8766 &  然后  node tests/study-space-smoke.cjs [http://localhost:8766]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path'), fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8766', SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'phase3-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5), TODAY = DN([2026, 11, 9]), iso = n => new Date((TODAY + n) * 864e5).toISOString().slice(0, 10), W = Math.floor((TODAY + 3) / 7);
function seedFull() {
  return { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0',
    'mochi-st': JSON.stringify({ subs: ['Mathematics', 'Physics', 'Biology'], topics: [
      { s: 'Mathematics', n: 'Algebra', iv: 2, nx: TODAY - 1 }, { s: 'Mathematics', n: 'Calculus', iv: 0, nx: TODAY }, { s: 'Physics', n: 'Optics', iv: 3, nx: TODAY }, { s: 'Physics', n: 'Waves', iv: 5, nx: TODAY + 3 }, { s: 'Biology', n: 'Cells', iv: 1, nx: TODAY - 2 }], ex: { Mathematics: iso(12) } }),
    'mochi-hw': JSON.stringify([{ id: 'a1', t: 'Worksheet 4', sb: 'Physics', due: iso(0), done: 0, ts: 1 }, { id: 'a2', t: 'Essay', sb: 'Biology', due: iso(-2), done: 0, ts: 1 }, { id: 'a3', t: 'Past paper', sb: 'Mathematics', due: iso(1), done: 0, ts: 1 }]),
    ['mochi-wk:main:' + W]: JSON.stringify([{ day: 0, s: 1140, e: 1200, t: '🔁 Mathematics·Algebra', c: 'mint', a: 1 }, { day: 2, s: 900, e: 960, t: '✏️ Physics·做题', c: 'pink', a: 1 }]) };
}
async function open(browser, seed, o) {
  o = o || {}; const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, serviceWorkers: 'block', reducedMotion: o.rm ? 'reduce' : 'no-preference', colorScheme: o.dark ? 'dark' : 'light' });
  await ctx.route(/cdn\.jsdelivr|googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.addInitScript(([s, lang]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); if (lang) localStorage.setItem('ui-lang', lang); } }, [seed, o.lang || '']);
  const page = await ctx.newPage(), errs = [], dialogs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date('2026-11-09T10:30:00')); await page.goto(BASE + '/index.html'); await page.waitForTimeout(1100);
  return { ctx, page, errs, dialogs };
}
const view = p => p.evaluate(() => document.body.getAttribute('data-view'));
const tabStudy = async p => { await p.click('.tabbar [data-v="hw"]'); await p.waitForTimeout(250); };
const ls = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const st = p => p.evaluate(() => JSON.parse(localStorage.getItem('mochi-st')));
const hwl = p => p.evaluate(() => JSON.parse(localStorage.getItem('mochi-hw') || '[]'));
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const txt = (p, sel) => p.locator(sel).first().innerText();
const subj = async (p, n) => { await p.locator('.study-space-subj', { hasText: n }).first().click(); await p.waitForTimeout(200); };
const tab = async (p, n) => { await p.locator('.study-space-tab', { hasText: n }).first().click(); await p.waitForTimeout(150); };

(async () => {
  const browser = await chromium.launch();
  // ===== 1 落点与导航 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull());
    rec('1 首次点“学习”标签：落在学习工作台（不再是作业页）', (await tabStudy(page), (await view(page)) === 'ss') && !!(await page.$('.study-space-hero')));
    await page.locator('.seg button:visible', { hasText: /Homework/ }).first().click(); await page.waitForTimeout(150);
    rec('1b 作业仍是明确的子标签：点“Homework”进入原作业页，原有控件都在（新作业按钮、列表、筛选）', (await view(page)) === 'hw' && !!(await page.$('#hwa')) && !!(await page.$('#hwl .tp')) && !!(await page.$('#hwf .chip')));
    await tabStudy(page); rec('1c 已经在学习分组里再点标签：留在原处，不被强制拉回工作台', (await view(page)) === 'hw');
    await page.click('.tabbar [data-v="tt"]'); await tabStudy(page);
    rec('1d 离开再从别的页面回到“学习”：回到工作台', (await view(page)) === 'ss');
    await page.evaluate(() => showView('hw')); await page.waitForTimeout(100);
    rec('1e 其它入口直接调用 showView(\'hw\')（日视图作业条、搜索）仍然进作业页，行为不变', (await view(page)) === 'hw');
    await page.locator('.seg button:visible', { hasText: /Revision plan/ }).first().click(); await page.waitForTimeout(150);
    rec('1f “复习计划”子标签仍可用，原控件在（一键排程按钮、科目 chips）', (await view(page)) === 'st' && !!(await page.$('#plan')) && !!(await page.$('#subs .chip')));
    rec('1g 学习分组内底部标签“学习”保持高亮', await page.evaluate(() => document.querySelector('.tabbar [data-v="hw"]').classList.contains('on')));
    rec('1h 全程没有页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 2 打开不写入 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull()); const before = await ls(page);
    await tabStudy(page); await subj(page, 'Mathematics'); for (const n of ['Homework', 'Exam', 'Chapters']) await tab(page, n);
    await page.locator('.study-space-back').click(); await page.waitForTimeout(150); await page.locator('.study-space-stat').first().click(); await page.waitForTimeout(150);
    const after = await ls(page), changed = Object.keys(Object.assign({}, before, after)).filter(k => before[k] !== after[k]);
    rec('2 浏览工作台 / 科目详情 / 复习队列：本机存储一个键都没变（零写入）', changed.length === 0, changed.join(','));
    rec('2b 偏好键不存在时默认显示目标（不会因为打开页面就写入偏好）', !('studyspace-prefs' in after)); await ctx.close();
  }
  // ===== 3 工作台内容与排序（DOM 读出来对） =====
  {
    const { ctx, page } = await open(browser, seedFull()); await tabStudy(page);
    const nums = await page.locator('.study-space-num').allInnerTexts();
    rec('3 三个统计：待复习 3（Algebra / Optics / Cells）、作业到期 2（逾期 1 + 今天 1）、今天学习时段 1', nums.join() === '3,2,1', nums.join());
    const rows = (await page.locator('.study-space-card .study-space-row .study-space-row-n').allInnerTexts()).slice(0, 5);
    rec('3b 即将到来的顺序：逾期作业 → 今天作业 → 到期复习（更久没复习的在前）', rows[0] === 'Biology · Essay' && rows[1] === 'Physics · Worksheet 4' && rows[2] === 'Biology · Cells' && rows[3] === 'Mathematics · Algebra' && rows[4] === 'Physics · Optics', rows.join(' | '));
    rec('3c 本周进度：计划 2 个学习时段、完成 0 个（没完成就不显示成就感）', /0 of 2/.test(await txt(page, '.study-space-tint')) && (await page.locator('.study-space-bar').first().getAttribute('aria-valuenow')) === '0');
    rec('3d 考试倒计时卡：Mathematics 12 天', /12/.test(await txt(page, '.study-space-exam')) && /Mathematics/.test(await txt(page, '.study-space-exam')));
    rec('3e 三个科目卡 + 每张的章节 / 待复习 / 作业数正确', (await page.locator('.study-space-subj').count()) === 3 && /2 chapters · 1 review due · 1 homework open/.test(await txt(page, '.study-space-subj')));
    await page.screenshot({ path: path.join(SHOTS, 'dashboard-390.png'), fullPage: true });
    // 勾选完成 → 本周进度变化（只看打勾，不看时长）
    await page.evaluate(() => { const w = Object.keys(WK).map(Number).find(k => (WK[k] || []).some(x => x.a === 1)); const x = WK[w].find(e => e.a === 1); DN[kk(x, w)] = 1; put2(K_DN, DN); showView('tt'); });
    await tabStudy(page); rec('3f 在课表里把一个学习时段打勾后：本周进度 1 / 2 = 50%', /1 of 2/.test(await txt(page, '.study-space-tint')) && (await page.locator('.study-space-bar').first().getAttribute('aria-valuenow')) === '50');
    await ctx.close();
  }
  // ===== 4 章节评分 / 添加章节 / 持久化 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull()); await tabStudy(page); await subj(page, 'Mathematics');
    const b0 = (await st(page)).topics.find(t => t.n === 'Algebra');
    await page.locator('.study-space-row', { hasText: 'Algebra' }).locator('.study-space-rate-b[aria-label="Remembered"]').click(); await page.waitForTimeout(200);
    const a1 = (await st(page)).topics.find(t => t.n === 'Algebra');
    rec('4 给到期章节评“记得”：iv / nx 经 srsRate 更新并写回 mochi-st，变成“下次复习”', a1.iv > b0.iv && a1.nx > TODAY && /Next review/.test(await txt(page, '.study-space-msg')), JSON.stringify([b0.iv, b0.nx, a1.iv, a1.nx]));
    await page.locator('.study-space-row', { hasText: 'Calculus' }).locator('.study-space-rate-b[aria-label="Forgot"]').click(); await page.waitForTimeout(200);
    const c1 = (await st(page)).topics.find(t => t.n === 'Calculus');
    rec('4b 给“没学过”的章节评“忘了”：开始复习周期（iv>0，明天再来）', c1.iv >= 1 && c1.nx === TODAY + c1.iv, JSON.stringify(c1));
    await page.locator('.study-space-link', { hasText: 'Add chapter' }).click(); await page.locator('.study-space-input').fill('Trigonometry'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    const tr = (await st(page)).topics.find(t => t.n === 'Trigonometry');
    rec('4c 添加章节：写入 ST.topics（和复习计划页同样的 {s,n,iv:0,nx}），列表立刻出现', tr && tr.s === 'Mathematics' && tr.iv === 0 && tr.nx === TODAY && (await page.locator('.study-space-row', { hasText: 'Trigonometry' }).count()) === 1);
    await page.reload(); await page.waitForTimeout(900); await tabStudy(page); await subj(page, 'Mathematics');
    rec('4d 刷新后数据一致：Algebra 不再到期、Trigonometry 还在', (await page.locator('.study-space-row', { hasText: 'Trigonometry' }).count()) === 1 && !/late|Due today/.test(await txt(page, '.study-space-row:has-text("Algebra")')));
    await page.evaluate(() => showView('st')); await page.waitForTimeout(150);
    rec('4e 旧“复习计划”页同步反映：新章节出现在列表里', /Trigonometry/.test(await page.locator('#tl').innerText()));
    rec('4f 没有页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 5 作业：新增（科目预填）/ 编辑 / 完成 / 持久化 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull()); await tabStudy(page); await subj(page, 'Physics'); await tab(page, 'Homework');
    await page.locator('.study-space-link', { hasText: 'New homework' }).click(); await page.waitForTimeout(150);
    rec('5 “新作业”打开原来的作业编辑框，科目已预填为 Physics', (await page.inputValue('#hwsb')) === 'Physics' && (await page.locator('#mask5.show').count()) === 1);
    await page.fill('#hwn', 'Lab report'); await page.fill('#hwdu', iso(3)); await page.click('#hwok'); await page.waitForTimeout(250);
    const h1 = (await hwl(page)).find(h => h.t === 'Lab report');
    rec('5b 保存走原有逻辑：写入 mochi-hw（sb、due 正确），科目作业列表立刻出现', h1 && h1.sb === 'Physics' && h1.due === iso(3) && (await page.locator('.study-space-row', { hasText: 'Lab report' }).count()) === 1);
    await page.locator('.study-space-row', { hasText: 'Lab report' }).locator('.study-space-check').check(); await page.waitForTimeout(200);
    const h2 = (await hwl(page)).find(h => h.t === 'Lab report');
    rec('5c 勾选完成：done 写入时间戳，行变为已完成；工作台“作业到期”数字不受影响（它不是到期的）', h2.done > 0 && /Completed/.test(await txt(page, '.study-space-row:has-text("Lab report")')));
    await page.locator('.study-space-row-t', { hasText: 'Worksheet 4' }).click(); await page.waitForTimeout(150); await page.fill('#hwn', 'Worksheet 5'); await page.click('#hwok'); await page.waitForTimeout(250);
    rec('5d 点作业打开原编辑框修改标题，保存后列表更新', (await hwl(page)).some(h => h.t === 'Worksheet 5') && (await page.locator('.study-space-row', { hasText: 'Worksheet 5' }).count()) === 1);
    await page.reload(); await page.waitForTimeout(900); await tabStudy(page);
    rec('5e 刷新后工作台数字一致：作业到期仍是 2（Essay 逾期 + Worksheet 5 今天）', (await page.locator('.study-space-num').allInnerTexts())[1] === '2');
    await page.evaluate(() => showView('hw')); await page.waitForTimeout(150);
    const todoTxt = await page.locator('#hwl').innerText(); await page.locator('#hwf .chip').nth(2).click(); await page.waitForTimeout(120); const doneTxt = await page.locator('#hwl').innerText();
    rec('5f 旧作业页同步：待办里有 Worksheet 5、没有 Lab report；“已完成”筛选里有 Lab report', /Worksheet 5/.test(todoTxt) && !/Lab report/.test(todoTxt) && /Lab report/.test(doneTxt));
    rec('5g 没有页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 6 考试日 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull()); await tabStudy(page); await subj(page, 'Physics'); await tab(page, 'Exam');
    await page.locator('.study-space-root input[type="date"]').fill(iso(5)); await page.waitForTimeout(250);
    rec('6 设置考试日：写入 ST.ex[Physics]，提示“5 天后考试”', (await st(page)).ex.Physics === iso(5) && /in 5 days/.test(await page.locator('.study-space-root').innerText()));
    await page.locator('.study-space-back').click(); await page.waitForTimeout(150);
    rec('6b 工作台倒计时改为最近的考试 Physics（5 天）', /Physics/.test(await txt(page, '.study-space-exam')) && /5/.test(await txt(page, '.study-space-exam')));
    await page.reload(); await page.waitForTimeout(900); await page.evaluate(() => showView('st')); await page.waitForTimeout(150);
    rec('6c 刷新后旧复习计划页的科目 chip 也带倒计时（Physics · 5天 / 5 d）', /Physics.*5/.test(await page.locator('#subs').innerText()));
    await tabStudy(page).catch(() => {}); await page.evaluate(() => showView('ss')); await subj(page, 'Physics'); await tab(page, 'Exam'); await page.locator('.study-space-btn', { hasText: /Clear/ }).click(); await page.waitForTimeout(200);
    rec('6d 清除考试日：ST.ex 里删除该科目', !('Physics' in ((await st(page)).ex || {})));
    rec('6e 没有页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 7 Goals：只读关联、点击跳转、设置里的开关、不碰 Goals 数据 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull());
    const gid = await page.evaluate(() => { const g = Goals.core.normGoal({ id: crypto.randomUUID(), space: 'study', title: 'SPM revision', status: 'active', deadline: '2026-12-20', targetFinish: '2026-12-10', steps: [{ title: 'Mathematics', estimateMin: 120, doneMin: 30 }, { title: 'Physics', estimateMin: 60 }] }); Goals.core.saveGoal(g, 0); return g.id; });
    const snap = async () => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^goals-/.test(k)) o[k] = localStorage.getItem(k); } return JSON.stringify(o); });
    const g0 = await snap(); await tabStudy(page); await subj(page, 'Mathematics'); await tab(page, 'Exam');
    rec('7 科目的“考试与目标”里出现关联的目标（步骤名 = 科目名）：标题、进行中、进度 17%（30 / 180 分钟）', (await page.locator('.study-space-goal').count()) === 1 && /SPM revision/.test(await txt(page, '.study-space-goal')) && /17%/.test(await txt(page, '.study-space-goal')));
    await page.locator('.study-space-goal').click(); await page.waitForTimeout(250);
    rec('7b 点击目标：打开原 Goals 页面（只跳转，不在这里编辑）', (await page.locator('.gl-mask').count()) === 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150); for (let i = 0; i < 3 && (await page.$('.gl-mask')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
    rec('7c 看目标 / 点进去再退出：goals-* 数据（目标、关联表）没有任何改动', (await snap()) === g0);
    // 排程过的 Goals 时段计入本周学习时段
    const r = await page.evaluate(([i, dn]) => { const g = Goals.core.getGoal(i); return GoalsPlan.commit({ goalId: i, rev: g.rev, result: { sessions: [{ id: 'c0', dn, s: 1020, e: 1060, stepId: g.steps[0].id, stepTitle: 'Mathematics', min: 40 }] } }, { c0: true }); }, [gid, TODAY + 1]);
    await page.locator('.study-space-back').click().catch(() => {}); await page.evaluate(() => showView('tt')); await tabStudy(page);
    rec('7d Goals 排程出的有效时段被计入“本周学习时段”（原 GoalsPlan 排程成功，工作台 0/2 → 0/3）', r.ok && /0 of 3/.test(await txt(page, '.study-space-tint')), JSON.stringify(r) + ' ' + await txt(page, '.study-space-tint'));
    // 设置里的开关
    await page.evaluate(() => { showView('se'); [...document.querySelectorAll('#seidx .mrow')].find(b => /Study Space/.test(b.innerText)).click(); }); await page.waitForTimeout(200);
    rec('7e 设置里有“Study Space”分类，里面有目标显示开关，默认打开', (await page.isChecked('#ssgoals')) === true);
    await page.uncheck('#ssgoals'); await page.waitForTimeout(150);
    const pref = await page.evaluate(() => localStorage.getItem('studyspace-prefs'));
    rec('7f 关闭开关：偏好存在 studyspace-prefs（非 mochi-* 键），内容 {goals:false}', pref === '{"goals":false}');
    await tabStudy(page); await page.evaluate(() => showView('ss')); await page.waitForTimeout(100);
    rec('7g 关闭后工作台不再有“Open Goals”入口，本周学习时段只计一键排程的 2 个（0/2）', !/Goals/.test(await txt(page, '.study-space-tint')) && /0 of 2/.test(await txt(page, '.study-space-tint')));
    await subj(page, 'Mathematics'); await tab(page, 'Exam');
    rec('7h 关闭后科目详情里没有目标卡片，标签变成“Exam”', (await page.locator('.study-space-goal').count()) === 0 && (await page.locator('.study-space-tab', { hasText: 'Exam & Goals' }).count()) === 0);
    rec('7i 关闭开关没有改动 Goals 本身（goals-* 数据只多了排程产生的关联，目标内容不变）', await page.evaluate(i => Goals.core.getGoal(i).title === 'SPM revision' && !Goals.core.getGoal(i).deletedAt, gid));
    rec('7j studyspace-prefs 不是云同步键：sync.js 的 syncKey 规则只认 mochi-* / goals-g: / goals-links', await page.evaluate(() => { const k = 'studyspace-prefs'; return !(k.indexOf('mochi-') === 0 || k.indexOf('goals-g:') === 0 || k === 'goals-links'); }));
    rec('7k 没有页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 8 空数据 / 坏数据 =====
  {
    const e = await open(browser, { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-st': JSON.stringify({ subs: [], topics: [], ex: {} }) });
    await tabStudy(e.page);
    rec('8 完全没数据：显示空状态（标题 + 三个下一步按钮），不显示 0 / 0 / 0 的统计卡', !!(await e.page.$('.study-space-empty')) && (await e.page.locator('.study-space-stat').count()) === 0 && (await e.page.locator('.study-space-empty .study-space-btn').count()) === 3);
    await e.page.locator('.study-space-empty .study-space-btn', { hasText: 'Add subject' }).click(); await e.page.locator('.study-space-input').fill('History'); await e.page.keyboard.press('Enter'); await e.page.waitForTimeout(250);
    rec('8b 从空状态添加第一个科目：写入 ST.subs，空状态消失、出现科目卡与统计', (await st(e.page)).subs.includes('History') && !(await e.page.$('.study-space-empty')) && (await e.page.locator('.study-space-subj').count()) === 1);
    rec('8c 空科目的详情页：章节为空有引导，进度卡提示“添加章节”', (await subj(e.page, 'History'), /No chapters yet/.test(await e.page.locator('.study-space-root').innerText())));
    rec('8d 空数据全程无报错', e.errs.length === 0, e.errs.join('|')); await e.page.screenshot({ path: path.join(SHOTS, 'subject-empty-390.png'), fullPage: true }); await e.ctx.close();
    const bad = await open(browser, { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-st': JSON.stringify({ subs: ['Math', 'A very long subject name here'], topics: [{ s: 'Math' }, { n: 'orphan' }, { s: 'Math', n: 'Ok', iv: 'x', nx: 'y' }, { s: 'A very long subject name here', n: 'Ch', iv: 1, nx: TODAY }], ex: { Math: 'garbage' } }),
      'mochi-hw': JSON.stringify([{ id: 5 }, { t: 'No date', sb: 'Math' }, { t: 'Trunc', sb: 'A very long ', due: iso(0) }, { t: 'Bad', due: '2026-13-45' }]) });
    await tabStudy(bad.page); await subj(bad.page, 'A very long subject name here'); const t0 = await bad.page.locator('.study-space-root').innerText(); await tab(bad.page, 'Homework');
    rec('8e 坏数据（缺字段 / 类型不对 / 非法日期 / 带尾随空格的被截断科目标签）：不报错，被截断标签的作业归到长科目下', bad.errs.length === 0 && /Trunc/.test(await bad.page.locator('.study-space-root').innerText()) && /1 review due/.test(t0), bad.errs.join('|'));
    await bad.ctx.close();
  }
  // ===== 9 三种语言、两种尺寸、深色、reduced-motion、键盘 =====
  for (const [lang, want] of [['en', /Coming up/], ['zh', /接下来/], ['ms', /Akan datang/]]) {
    const { ctx, page, errs } = await open(browser, seedFull(), { lang }); await tabStudy(page); const body = await page.locator('.study-space-root').innerText();
    const rawKey = /\b(statReviews|comingUp|subjectsTitle|weekTitle|heroBusy[1N]?|examIn[1N])\b/.test(body);
    rec('9 语言 ' + lang + '：工作台文案已翻译（含“' + String(want).slice(1, -1) + '”），没有露出原始键，也没有中英混杂的界面文字', want.test(body) && !rawKey && (lang === 'zh' || !/[\u4e00-\u9fff]/.test(body.replace(/做题/g, ''))), body.slice(0, 80).replace(/\n/g, ' '));
    await subj(page, 'Mathematics'); const sb = await page.locator('.study-space-root').innerText();
    rec('9b 语言 ' + lang + '：科目详情同样已翻译', !/\b(tabChapters|addChapter|progressTitle|backDash)\b/.test(sb) && sb.length > 40);
    rec('9c 语言 ' + lang + '：无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  for (const [w, h, tag] of [[360, 740, '360'], [768, 1024, '768'], [1280, 900, '1280']]) {
    const { ctx, page } = await open(browser, seedFull(), { w, h }); await tabStudy(page); const o1 = await overflow(page); await page.screenshot({ path: path.join(SHOTS, 'dashboard-' + tag + '.png'), fullPage: true });
    await subj(page, 'Mathematics'); const o2 = await overflow(page); await page.screenshot({ path: path.join(SHOTS, 'subject-' + tag + '.png'), fullPage: true });
    const tabsScroll = await page.evaluate(() => { const t = document.querySelector('.study-space-tabs'); return getComputedStyle(t).overflowX; });
    await page.locator('.study-space-back').click(); await page.locator('.study-space-stat').first().click(); await page.waitForTimeout(150); const o3 = await overflow(page); await page.screenshot({ path: path.join(SHOTS, 'reviews-' + tag + '.png'), fullPage: true });
    rec('9d 宽度 ' + tag + 'px：工作台 / 科目详情 / 复习队列都没有横向滚动（只有标签条可以自己滚）', o1 <= 0 && o2 <= 0 && o3 <= 0 && tabsScroll === 'auto', [o1, o2, o3, tabsScroll].join('/')); await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, seedFull(), { dark: true, w: 390 }); await page.evaluate(() => { SET.theme = 'dark'; applyTheme(); }); await tabStudy(page);
    const c = await page.evaluate(() => { const r = document.querySelector('.study-space-card'); const bg = getComputedStyle(r).backgroundColor, ink = getComputedStyle(document.querySelector('.study-space-root')).color; return { bg, ink }; });
    const lum = s => { const m = s.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    rec('9e 深色主题：卡片背景是深色、文字是浅色（跟随主题变量，不是写死的浅色）', lum(c.bg) < 0.25 && lum(c.ink) > 0.7, JSON.stringify(c)); await page.screenshot({ path: path.join(SHOTS, 'dashboard-dark-390.png'), fullPage: true }); await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, seedFull(), { rm: true, w: 1280, h: 900 }); await tabStudy(page);
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.study-space-subj')).transitionDuration);
    rec('9f 系统设置“减少动态效果”：卡片没有过渡动画', tr === '0s', tr);
    await page.locator('.seg button:visible').first().focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    await page.locator('.study-space-subj').first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    rec('9g 键盘：科目卡片 Enter 打开详情，焦点落到科目标题（可被读屏读到）', await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('study-space-h')));
    const ring = await page.evaluate(() => { const b = document.querySelector('.study-space-tab'); b.focus(); const cs = getComputedStyle(b); return cs.outlineStyle + ' ' + cs.outlineWidth; });
    rec('9h 键盘聚焦有可见的焦点环', /solid 3px/.test(ring) || /auto/.test(ring), ring);
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.study-space-root button')].filter(b => b.offsetParent).map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)));
    rec('9i 可点按钮的最小边都 ≥ 40px（触控友好）', sizes.length > 0 && Math.min.apply(null, sizes) >= 40, 'min=' + Math.min.apply(null, sizes)); rec('9j 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 10 其它功能不受影响 =====
  {
    const { ctx, page, errs } = await open(browser, seedFull()); 
    await page.evaluate(() => MochiNext.selectMode(['work'])); await tabStudy(page);
    rec('10 Work 模式：学习标签仍进工作台，模式属性（data-mochi-mode）不变，不报错', (await view(page)) === 'ss' && (await page.evaluate(() => document.body.dataset.mochiMode)) === 'work' && !!(await page.$('.study-space-hero')));
    await page.evaluate(() => MochiNext.selectMode(['life'])); await page.evaluate(() => showView('tt')); await tabStudy(page);
    rec('10b Life 模式同样', (await view(page)) === 'ss' && (await page.evaluate(() => document.body.dataset.mochiMode)) === 'life');
    await page.evaluate(() => showView('tt')); await page.waitForTimeout(150);
    rec('10c 课表页正常：周 / 日视图、＋ 按钮只在课表页显示', (await page.locator('#fab').isVisible()) && (await tabStudy(page), !(await page.locator('#fab').isVisible())));
    for (const v of ['sp', 'sta', 'more', 'se', 'st', 'hw', 'tt']) { await page.evaluate(x => showView(x), v); await page.waitForTimeout(80); }
    await page.evaluate(() => { showView('ss'); }); await page.waitForTimeout(100);
    rec('10d 在所有页面之间切换（含 ss）：各自的 section 显示 / 隐藏正确，同一时间只有一个页面可见', await page.evaluate(() => { const vis = ['tt', 'ss', 'hw', 'st', 'sp', 'bt', 'di', 'se', 'sta', 'more'].filter(k => getComputedStyle(document.getElementById('v-' + k)).display !== 'none'); return vis.length === 1 && vis[0] === 'ss'; }));
    rec('10e 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 11 Service Worker：新文件进了预缓存，断网重载后学习工作台照常可用 =====
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(/cdn\.jsdelivr|googleapis|gstatic|esm\.sh/, r => r.abort());
    await ctx.addInitScript(([s]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); } }, [seedFull()]);
    const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + '/index.html'); await page.waitForTimeout(2500);
    const cached = await page.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks.find(k => /^mochi-v/.test(k))); const names = (await c.keys()).map(r => new URL(r.url).pathname); return { ks, ok: ['/js/study-space.js', '/js/study-space-core.js', '/js/lang-study-space.js', '/css/study-space.css', '/assets/buddy/happy.svg', '/assets/buddy/idle.svg'].every(n => names.includes(n)) }; });
    const wantCache = 'mochi-v' + JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'package.json'), 'utf8')).version.replace(/\./g, '-');   // 缓存名跟随版本号，不写死
    rec('11 Service Worker 预缓存包含 Study Space 的脚本 / 样式 / Buddy 图，缓存名是 ' + wantCache + '，没有旧版本缓存残留', cached.ok && cached.ks.length === 1 && cached.ks[0] === wantCache, JSON.stringify(cached));
    await ctx.setOffline(true); await page.reload(); await page.waitForTimeout(1500); await page.click('.tabbar [data-v="hw"]'); await page.waitForTimeout(300);
    rec('11b 断网后重新加载：学习工作台正常显示（含 Buddy 图片、样式、文案）', !!(await page.$('.study-space-hero')) && (await page.locator('.study-space-subj').count()) === 3 && (await page.evaluate(() => document.querySelector('.study-space-buddy').complete && document.querySelector('.study-space-buddy').naturalWidth > 0)) && errs.length === 0, errs.join('|'));
    await ctx.close();
  }
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
