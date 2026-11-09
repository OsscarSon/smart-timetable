// Focus Revision 新手空状态（v9.8.1）浏览器测试：真 index.html + 真数据路径。
// 用法：python3 -m http.server 8766 &  然后  PLAYWRIGHT_PATH=<playwright 路径> node tests/focus-empty-smoke.cjs [http://localhost:8766]
// 截图输出到 SHOTS（默认 docs/focus-empty-screenshots）。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path'), fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8766', SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'focus-empty-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5), TODAY = DN([2026, 11, 9]), iso = n => new Date((TODAY + n) * 864e5).toISOString().slice(0, 10);
const base = (st, hw) => Object.assign({ 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-st': JSON.stringify(st) }, hw ? { 'mochi-hw': JSON.stringify(hw) } : {});
const zeroSubj = () => base({ subs: [], topics: [], ex: {} }, [{ id: 'h1', t: 'Read novel', sb: '', due: iso(2), done: 0, ts: 1 }]);   // 没有科目也没有章节，但有作业：工作台不是整页空状态，专注复习入口在
const oneSubj = () => base({ subs: ['History'], topics: [], ex: {} });
const twoSubj = () => base({ subs: ['Chemistry', 'English'], topics: [], ex: {} });
const noneDue = () => base({ subs: ['Chemistry'], topics: [{ s: 'Chemistry', n: 'Acids', iv: 4, nx: TODAY + 4 }], ex: {} });
const ready = () => base({ subs: ['Mathematics', 'Physics'], topics: [{ s: 'Mathematics', n: 'Algebra', iv: 2, nx: TODAY - 1 }, { s: 'Physics', n: 'Optics', iv: 3, nx: TODAY }], ex: {} });
async function open(browser, seed, o) {
  o = o || {}; const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, serviceWorkers: 'block', reducedMotion: o.rm ? 'reduce' : 'no-preference', colorScheme: o.dark ? 'dark' : 'light' });
  await ctx.route(/cdn\.jsdelivr|googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.addInitScript(([s, lang, dark]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); if (lang) localStorage.setItem('ui-lang', lang); } }, [seed, o.lang || '', !!o.dark]);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-09T10:30:00')); await page.goto(BASE + '/index.html'); await page.waitForTimeout(1100);
  if (o.dark) await page.evaluate(() => { SET.theme = 'dark'; applyTheme(); });
  await page.click('.tabbar [data-v="hw"]'); await page.waitForTimeout(250); return { ctx, page, errs };
}
const $ = (p, s) => p.locator(s).first();
const ls = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const st = p => p.evaluate(() => JSON.parse(localStorage.getItem('mochi-st')));
const text = p => p.evaluate(() => document.querySelector('#v-ss').innerText);
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const openSetup = async p => { await $(p, '.study-space-focus-tile').click(); await p.waitForTimeout(200); };
const cta = p => $(p, '.study-space-fprimary');
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true });
const activeIs = (p, sel) => p.evaluate(s => !!document.activeElement && document.activeElement.matches(s), sel);
const type = async (p, v) => { await $(p, '.study-space-input').fill(v); await p.keyboard.press('Enter'); await p.waitForTimeout(250); };
const keysLeaked = t => /\b(fEmpty\w+|fPoint\d|fAdd(First|Another|SubjectFirst)|fChooseSubject\w*|fNewSubject|fBackFocus|fReadyHint|fOpenFocus|fNoChapters|fNoneDue)\b/.test(t);

(async () => {
  const browser = await chromium.launch();
  // ===== 1 没有章节：零科目 → 添加科目 → 章节页 → 添加章节 → 回到专注复习 =====
  {
    const { ctx, page, errs } = await open(browser, zeroSubj()), before = await ls(page);
    await openSetup(page); const t0 = await text(page);
    rec('1 “没有章节”状态：鼓励性标题 + 三条说明 + 主按钮“Add your first chapter”，没有开始按钮、没有科目开关', /Your first step/.test(t0) && /Every great study journey starts with one chapter/.test(t0) && /Rate how well you remember/.test(t0) && /Add your first chapter/.test(t0) && !(await page.$('.study-space-ftog')) && (await page.locator('.study-space-btn:has-text("Start focusing")').count()) === 0);
    rec('1b 说明文字是 role=status，并且仍以“No chapters yet.”开头（读屏用户 / 旧文案兼容）；不会说“All caught up”', (await $(page, '.study-space-fempty-t [role="status"]').innerText()).startsWith('No chapters yet.') && !/All caught up/.test(t0));
    rec('1c 只是看这个页面：零写入', JSON.stringify(before) === JSON.stringify(await ls(page)));
    await shot(page, 'no-chapters-390');
    await cta(page).click(); await page.waitForTimeout(250);
    rec('1d 没有任何科目：点主按钮 → 回到工作台的“添加科目”输入框（现有流程），光标在输入框里，并有提示“先添加一个科目”', !!(await page.$('.study-space-input')) && await activeIs(page, '.study-space-input') && /First add a subject/.test(await text(page)));
    rec('1e 到这一步还没写入任何东西', JSON.stringify(before) === JSON.stringify(await ls(page)));
    await type(page, 'Biology'); const s1 = await st(page);
    rec('1f 添加科目走现有 addSubject：ST.subs 多了 Biology，随即自动进入 Biology 的“章节”页，并打开了“添加章节”输入框（光标在里面）', s1.subs.join() === 'Biology' && /Chapters/.test(await $(page, '.study-space-tab.study-space-on').innerText()) && await activeIs(page, '.study-space-input') && /Biology/.test(await $(page, '.study-space-h').innerText()));
    rec('1g 此时页面左上角的返回按钮是“‹ Focus Revision”', /Focus Revision/.test(await $(page, '.study-space-back').innerText()));
    await type(page, 'Cells'); const s2 = await st(page), tp = s2.topics.find(x => x.n === 'Cells');
    rec('1h 添加章节走现有 addChapter：写入的是和以前完全一样的 {s,n,iv:0,nx:今天}', tp && tp.s === 'Biology' && tp.iv === 0 && tp.nx === TODAY && s2.topics.length === 1);
    rec('1i 加好之后出现“Chapter added…”提示和“Back to Focus Revision →”按钮', /Chapter added/.test(await text(page)) && (await page.locator('.study-space-btn:has-text("Back to Focus Revision")').count()) === 1);
    await $(page, '.study-space-btn:has-text("Back to Focus Revision")').click(); await page.waitForTimeout(250);
    rec('1j 回到专注复习：不再是空状态，新章节可以直接开始（“1 chapter”可开始）', !(await page.$('.study-space-fempty')) && !(await $(page, '.study-space-btn:has-text("Start focusing")').isDisabled()) && /1 chapter in this session/.test(await text(page)));
    const keys = Object.keys(await ls(page)), bk = Object.keys(before);
    rec('1k 整个流程只改了 mochi-st（科目 + 章节）；没有新增本机存储键，没有 studyspace-prefs', keys.filter(k => !bk.includes(k)).length === 0 && !('studyspace-prefs' in (await ls(page))), keys.filter(k => !bk.includes(k)).join());
    rec('1l 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 2 有科目但没有章节：1 个科目直达；多个科目必须自己选 =====
  {
    const { ctx, page, errs } = await open(browser, oneSubj()); await openSetup(page); await cta(page).click(); await page.waitForTimeout(250);
    rec('2 只有 1 个科目：直接进入 History 的章节页并打开“添加章节”输入框（不多问一步）', /History/.test(await $(page, '.study-space-h').innerText()) && await activeIs(page, '.study-space-input') && (await page.locator('.study-space-fpick').count()) === 0);
    await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, twoSubj()), before = await ls(page); await openSetup(page); await cta(page).click(); await page.waitForTimeout(250);
    const picks = await page.locator('.study-space-fpick').allInnerTexts();
    rec('2b 有 2 个科目：不替用户选，先显示真实的科目列表（Chemistry、English），键盘焦点落在第一项上', picks.length === 2 && /Chemistry/.test(picks[0]) && /English/.test(picks[1]) && await activeIs(page, '.study-space-fpick') && /Which subject is this chapter for/.test(await text(page)));
    rec('2c 选择期间零写入，也没有出现章节输入框', JSON.stringify(before) === JSON.stringify(await ls(page)) && !(await page.$('.study-space-input')));
    await shot(page, 'subject-chooser-390');
    await $(page, '.study-space-fpick:has-text("English")').click(); await page.waitForTimeout(250);
    rec('2d 选第二个（English）：进入 English 的章节页，“添加章节”输入框已打开（没有悄悄选第一个）', /English/.test(await $(page, '.study-space-h').innerText()) && !/Chemistry/.test(await $(page, '.study-space-h').innerText()) && await activeIs(page, '.study-space-input'));
    await type(page, 'Verbs'); const s = await st(page);
    rec('2e 章节写到了 English 名下', s.topics.length === 1 && s.topics[0].s === 'English' && s.topics[0].n === 'Verbs' && s.topics[0].iv === 0);
    await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, twoSubj()); await openSetup(page); await cta(page).click(); await page.waitForTimeout(200);
    await $(page, '.study-space-btn:has-text("Cancel")').click(); await page.waitForTimeout(150);
    rec('2f 选择器里点“取消”：回到空状态，什么都没变', !!(await page.$('.study-space-fempty')) && (await page.locator('.study-space-fpick').count()) === 0 && (await st(page)).topics.length === 0);
    await cta(page).click(); await page.waitForTimeout(200); await $(page, '.study-space-link:has-text("Add a new subject instead")').click(); await page.waitForTimeout(200);
    rec('2g 选择器里点“改为新建一个科目”：进入“添加科目”输入框', await activeIs(page, '.study-space-input'));
    await type(page, 'Art'); const s = await st(page);
    rec('2h 新建 Art 后直接进入 Art 的章节页（添加章节输入框已开），ST.subs 里有 Art', s.subs.includes('Art') && /Art/.test(await $(page, '.study-space-h').innerText()) && await activeIs(page, '.study-space-input'));
    await ctx.close();
  }
  {   // 引导状态不会泄漏到普通操作里
    const { ctx, page, errs } = await open(browser, base({ subs: [], topics: [], ex: {} }, [{ id: 'h1', t: 'x', sb: '', due: iso(2), done: 0, ts: 1 }])); await openSetup(page); await cta(page).click(); await page.waitForTimeout(200);
    await $(page, '.study-space-btn:has-text("Cancel")').click(); await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(100);
    await $(page, '.study-space-link:has-text("Add subject")').dispatchEvent('click'); await page.waitForTimeout(150); await type(page, 'Maths');
    rec('2i 在“先加科目”引导里点取消，之后正常从工作台添加科目：不会被带去章节页（引导状态已清除），停留在工作台', !!(await page.$('.study-space-subj')) && !(await page.$('.study-space-tabs')) && (await st(page)).subs.join() === 'Maths');
    await ctx.close();
  }
  {   // 选择期间科目被删（同步 / 别处）
    const { ctx, page, errs } = await open(browser, twoSubj()); await openSetup(page); await cta(page).click(); await page.waitForTimeout(200);
    await page.evaluate(() => { ST.subs = ST.subs.filter(n => n !== 'English'); sv(); });
    await $(page, '.study-space-fpick:has-text("English")').click().catch(() => {}); await page.waitForTimeout(250);
    rec('2j 选择期间该科目被删：回到工作台，不报错、不会写到别的科目', errs.length === 0 && !!(await page.$('.study-space-hero')) && (await st(page)).topics.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 3 有章节但现在没有待复习 =====
  {
    const { ctx, page, errs } = await open(browser, noneDue()), s0 = await st(page); await openSetup(page); const t0 = await text(page);
    rec('3 “现在没有待复习”状态：标题“You’re all caught up”，文案明确说“有章节但暂时不用复习”，不会说“No chapters yet”；主按钮是“Add another chapter”', /All caught up/.test(t0) && /You’re all caught up/.test(t0) && /Add another chapter/.test(t0) && !/No chapters yet/.test(t0) && !/Add your first chapter/.test(t0));
    rec('3b 这个状态没有“三条说明”（它们是新手引导），也没有开始按钮；仍有“Back to Study”', (await page.locator('.study-space-fpoints').count()) === 0 && (await page.locator('.study-space-btn:has-text("Start focusing")').count()) === 0 && (await page.locator('.study-space-btn:has-text("Back to Study")').count()) === 1);
    await shot(page, 'all-caught-up-390');
    await cta(page).click(); await page.waitForTimeout(250);
    rec('3c “Add another chapter”：唯一的科目 Chemistry 直达章节页，输入框已打开', /Chemistry/.test(await $(page, '.study-space-h').innerText()) && await activeIs(page, '.study-space-input'));
    await type(page, 'Bases'); const s1 = await st(page);
    rec('3d 加章节后原有章节的复习数据一字未动（Acids 的 iv / nx 完全相同），新章节 Bases 是“还没学过”', JSON.stringify(s1.topics.find(x => x.n === 'Acids')) === JSON.stringify(s0.topics[0]) && s1.topics.find(x => x.n === 'Bases').iv === 0);
    await $(page, '.study-space-btn:has-text("Back to Focus Revision")').click(); await page.waitForTimeout(250);
    rec('3e 回到专注复习：现在有 1 个可复习的新章节，空状态消失，可以开始', !(await page.$('.study-space-fempty')) && /1 chapter in this session/.test(await text(page)) && !(await $(page, '.study-space-btn:has-text("Start focusing")').isDisabled()));
    await $(page, '.study-space-btn:has-text("Back to Study")').click(); await page.waitForTimeout(150);
    rec('3f 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 4 有待复习的章节：完全不出现空状态 =====
  {
    const { ctx, page, errs } = await open(browser, ready()); await openSetup(page);
    rec('4 有待复习的章节：显示原来的科目选择页，没有空状态元素', !(await page.$('.study-space-fempty')) && (await page.locator('.study-space-ftog').count()) === 2 && !(await $(page, '.study-space-btn:has-text("Start focusing")').isDisabled()));
    await ctx.close();
  }
  // ===== 5 输入校验沿用现有逻辑 =====
  {
    const { ctx, page, errs } = await open(browser, oneSubj()); await openSetup(page); await cta(page).click(); await page.waitForTimeout(250);
    await type(page, '   ');
    rec('5 空白名称：不保存，输入框还在、光标还在里面', (await st(page)).topics.length === 0 && await activeIs(page, '.study-space-input'));
    await type(page, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    rec('5b 超长名称：沿用现有规则，截成 20 个字', (await st(page)).topics[0].n === 'ABCDEFGHIJKLMNOPQRST');
    await type(page, 'ABCDEFGHIJKLMNOPQRST');       // 输入框在添加成功后仍保持打开（现有行为），可以连续添加
    rec('5c 重名章节：沿用现有逻辑（允许，不新增去重规则）', (await st(page)).topics.length === 2);
    await $(page, '.study-space-btn:has-text("Cancel")').click(); await page.waitForTimeout(100);
    rec('5d 取消添加：输入框关闭，没有写入', (await page.locator('.study-space-input').count()) === 0 && (await st(page)).topics.length === 2 && errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 6 三种语言（两种状态）=====
  for (const [lang, a, b, nocjk] of [['en', /Every great study journey/, /You’re all caught up/, true], ['zh', /每一段学习旅程/, /都复习完了，真棒/, false], ['ms', /Setiap perjalanan belajar/, /Semua sudah selesai\. Syabas/, true]]) {
    for (const [tag, seed, want] of [['没有章节', zeroSubj, a], ['没有待复习', noneDue, b]]) {
      const { ctx, page, errs } = await open(browser, seed(), { lang }); await openSetup(page); const t0 = await text(page);
      rec('6 语言 ' + lang + ' · ' + tag + '：标题 / 说明 / 按钮都有译文，没露出键名' + (nocjk ? '，也没有中文混入' : ''), want.test(t0) && !keysLeaked(t0) && (!nocjk || !/[\u4e00-\u9fff]/.test(t0)) && errs.length === 0, t0.slice(0, 120).replace(/\n/g, ' '));
      if (tag === '没有章节') await shot(page, 'no-chapters-' + lang); await ctx.close();
    }
  }
  // ===== 7 深色 / 减少动态 / 键盘 =====
  {
    const { ctx, page, errs } = await open(browser, zeroSubj(), { dark: true }); await openSetup(page);
    const c = await page.evaluate(() => { const h = document.querySelector('.study-space-fhead'), pill = document.querySelector('.study-space-fpill'), card = document.querySelector('#v-ss .study-space-card'); return { ink: getComputedStyle(h).color, pill: getComputedStyle(pill).color, bg: getComputedStyle(card).backgroundColor }; });
    const lum = s => { const m = s.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    rec('7 深色主题：标题是浅色、卡片是深色、标签文字清晰（跟随主题变量）', lum(c.ink) > 0.7 && lum(c.bg) < 0.25 && lum(c.pill) > 0.5, JSON.stringify(c)); await shot(page, 'no-chapters-dark-390'); await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, zeroSubj(), { rm: true }); await openSetup(page);
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.study-space-fprimary')).transitionDuration);
    rec('7b 系统“减少动态效果”：主按钮没有过渡动画', tr === '0s', tr);
    await page.locator('.study-space-back').focus(); let hit = false; for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); if (await activeIs(page, '.study-space-fprimary')) { hit = true; break; } }
    const ol = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
    rec('7c 键盘：Tab 能到主按钮，聚焦时有可见焦点环（≥2px）', hit && parseFloat(ol) >= 2, ol);
    await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    rec('7d 键盘 Enter 触发主按钮：进入“添加科目”输入框', await activeIs(page, '.study-space-input')); await ctx.close();
  }
  // ===== 8 响应式：5 个宽度 =====
  for (const [w, h] of [[320, 640], [360, 740], [390, 844], [768, 1024], [1280, 900]]) {
    const out = [];
    for (const [tag, seed] of [['none', zeroSubj], ['caught', noneDue]]) {
      const { ctx, page, errs } = await open(browser, seed(), { w, h }); await openSetup(page);
      const o = await overflow(page);
      const r = await page.evaluate(() => { const b = document.querySelector('.study-space-fprimary'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), tb = document.querySelector('.tabbar'), tbr = tb ? tb.getBoundingClientRect() : { top: innerHeight }, el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), art = document.querySelector('.study-space-fart'); return { vis: r.width > 0 && r.top >= 0 && r.bottom <= Math.min(innerHeight, tbr.top) + 0.5, hit: !!el && (el === b || b.contains(el)), min: Math.min(r.width, r.height), art: art ? getComputedStyle(art).display : 'none', artH: art && getComputedStyle(art).display !== 'none' ? art.getBoundingClientRect().height : 0 }; });
      out.push([tag, o <= 0, r.vis, r.hit, r.min >= 44, errs.length === 0, r.art, Math.round(r.artH)]);
      if (tag === 'none') await shot(page, 'no-chapters-' + w); await ctx.close();
    }
    const good = out.every(x => x[1] && x[2] && x[3] && x[4] && x[5]), artOk = w <= 700 ? out.every(x => x[6] === 'none') : out.every(x => x[7] > 0 && x[7] < h * 0.5);
    rec('8 宽度 ' + w + 'px：两种空状态都没有横向滚动，主按钮完整可见、不被底部导航遮挡、可点击、≥44px；插画' + (w <= 700 ? '在手机上收起（顶部横幅已有 Buddy）' : '显示且不超过半屏'), good && artOk, JSON.stringify(out));
  }
  // ===== 9 其它界面不受影响 =====
  {
    const { ctx, page, errs } = await open(browser, ready()); const b = await ls(page);
    await openSetup(page); await $(page, '.study-space-btn:has-text("Start focusing")').click(); await page.waitForTimeout(450); await page.locator('[data-rate="2"]').click(); await page.waitForTimeout(200);
    const s = await st(page), alg = s.topics.find(x => x.n === 'Algebra');
    rec('9 有章节时的专注复习流程不变：开始 → 评分 → 写入（Algebra 评“Got it”后 nx 在今天之后）', alg.iv >= 2 && alg.nx > TODAY && /Card 2 of 2/.test(await text(page)));
    for (const v of ['tt', 'hw', 'st', 'sp', 'ss']) { await page.evaluate(x => showView(x), v); await page.waitForTimeout(80); }
    rec('9b 时间表 / 作业 / 复习计划 / 工作台之间切换正常，无报错', errs.length === 0 && !!(await page.$('.study-space-hero')), errs.join('|')); await ctx.close();
  }
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
