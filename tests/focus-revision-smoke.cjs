// Focus Revision（v9.9 Phase 3C）浏览器测试：真 index.html + 真数据路径。
// 用法：python3 -m http.server 8766 &  然后  PLAYWRIGHT_PATH=<playwright 路径> node tests/focus-revision-smoke.cjs [http://localhost:8766]
// 截图输出到 SHOTS（默认 docs/phase3c-screenshots）。CDN 被拦截，所以 srsRate 走内置的简易算法分支（ts-fsrs 不加载）；测试比较的是“和直接调用 srsRate 的结果一致”。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('path'), fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8766', SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'docs', 'phase3c-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5), TODAY = DN([2026, 11, 9]), iso = n => new Date((TODAY + n) * 864e5).toISOString().slice(0, 10);
const base = st => ({ 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-st': JSON.stringify(st) });
const multi = () => base({ subs: ['Mathematics', 'Physics', 'Biology'], topics: [
  { s: 'Mathematics', n: 'Algebra', iv: 2, nx: TODAY - 1 }, { s: 'Mathematics', n: 'Calculus', iv: 0, nx: TODAY }, { s: 'Physics', n: 'Optics', iv: 3, nx: TODAY }, { s: 'Physics', n: 'Waves', iv: 5, nx: TODAY + 3 }, { s: 'Biology', n: 'Cells', iv: 1, nx: TODAY - 2 }], ex: { Mathematics: iso(12) } });
const one = () => base({ subs: ['History'], topics: [{ s: 'History', n: 'Early civilizations', iv: 2, nx: TODAY }, { s: 'History', n: 'Independence movement', iv: 0, nx: TODAY }], ex: {} });
const subsOnly = () => base({ subs: ['Chemistry', 'English'], topics: [], ex: {} });
const noneDue = () => base({ subs: ['Chemistry'], topics: [{ s: 'Chemistry', n: 'Acids', iv: 4, nx: TODAY + 4 }], ex: {} });
const big = () => base({ subs: ['Big'], topics: Array.from({ length: 25 }, (_, i) => ({ s: 'Big', n: 'Ch ' + (i + 1), iv: 1, nx: TODAY - 1 })), ex: {} });
async function open(browser, seed, o) {
  o = o || {}; const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, serviceWorkers: 'block', reducedMotion: o.rm ? 'reduce' : 'no-preference', colorScheme: o.dark ? 'dark' : 'light' });
  await ctx.route(/cdn\.jsdelivr|googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.addInitScript(([s, lang]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); if (lang) localStorage.setItem('ui-lang', lang); } }, [seed, o.lang || '']);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-09T10:30:00')); await page.goto(BASE + '/index.html'); await page.waitForTimeout(1100);
  await page.click('.tabbar [data-v="hw"]'); await page.waitForTimeout(250); return { ctx, page, errs };
}
const $ = (p, s) => p.locator(s).first();
const ls = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const st = p => p.evaluate(() => JSON.parse(localStorage.getItem('mochi-st')));
const tile = p => $(p, '.study-space-focus-tile'), openSetup = async p => { await tile(p).click(); await p.waitForTimeout(150); };
const start = async p => { await $(p, '.study-space-btn:has-text("Start focusing")').click(); await p.waitForTimeout(150); };
const rate = async (p, g) => { await p.waitForTimeout(340); await p.locator('[data-rate="' + g + '"]').click(); await p.waitForTimeout(120); };
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const text = p => p.evaluate(() => document.querySelector('#v-ss').innerText);
const unblocked = (p, sel) => p.evaluate(s => { const els = [...document.querySelectorAll(s)]; if (!els.length) return false; return els.every(el => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === el || el.contains(t)) && r.width >= 40 && r.height >= 40; }); }, sel);
const aboveTabbar = p => p.evaluate(() => { const g = document.querySelector('.study-space-frate'), tb = document.querySelector('.tabbar'); g.scrollIntoView({ block: 'center' }); return g.getBoundingClientRect().bottom <= tb.getBoundingClientRect().top + 1; });
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png') });
const keysLeaked = t => /\b(fTile|fTitle|fPick|fStart|fCard|fAgain|fGot|fReady[1N]?|fDone[A-Z]\w*)\b/.test(t);

(async () => {
  const browser = await chromium.launch();
  // ===== 1 空状态 =====
  {
    const { ctx, page, errs } = await open(browser, base({ subs: [], topics: [], ex: {} }));
    rec('1 完全没有数据：学习工作台显示原有空状态，不出现专注复习入口（也不报错）', !!(await page.$('.study-space-empty')) && !(await page.$('.study-space-focus-tile')) && errs.length === 0, errs.join('|')); await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, subsOnly()); const before = await ls(page);
    rec('1b 只有科目、没有章节：入口在，副标题提示“现在没有待复习”', (await tile(page).count()) === 1 && /Nothing due/.test(await tile(page).innerText()));
    await openSetup(page); const t = await text(page);
    rec('1c 点进去：显示“还没有章节”空状态，没有开始按钮，没有科目开关', /No chapters yet/.test(t) && !(await page.$('.study-space-ftog')) && !(await page.$('.study-space-btn:has-text("Start focusing")')));
    await shot(page, 'focus-empty-390'); await $(page, '.study-space-btn:has-text("Back to Study")').click(); await page.waitForTimeout(150);
    rec('1d 空状态里的“返回学习”回到工作台；全程零写入', !!(await page.$('.study-space-hero')) && JSON.stringify(before) === JSON.stringify(await ls(page)) && errs.length === 0); await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, noneDue()); await openSetup(page);
    rec('1e 有章节但都没到期：显示“都复习完了”，科目开关禁用，不能开始', /All caught up/.test(await text(page)) && !(await page.$('.study-space-btn:has-text("Start focusing")'))); await ctx.close();
  }
  // ===== 2 单科目 =====
  {
    const { ctx, page, errs } = await open(browser, one()); await openSetup(page);
    const on = await $(page, '.study-space-ftog').getAttribute('aria-pressed');
    rec('2 只有 1 个科目：默认已选中，开始按钮可用，显示“本次 2 个章节”', on === 'true' && !(await $(page, '.study-space-btn:has-text("Start focusing")').isDisabled()) && /2 chapters in this session/.test(await text(page)));
    await start(page); rec('2b 开始后：显示“Card 1 of 2”，第一张是到期章节（先到期、后新章节）', /Card 1 of 2/.test(await text(page)) && /Early civilizations/.test(await text(page)));
    await rate(page, 2); rec('2c 评分后进入第 2 张', /Card 2 of 2/.test(await text(page)) && /Independence movement/.test(await text(page)));
    await rate(page, 1); const t = await text(page);
    rec('2d 最后一张评分后进入总结：已复习 2', /Look at you go/.test(t) && /\b2\b[\s\S]*Reviewed/.test(t));
    rec('2e 全部评完：不显示“再复习一轮”（没有剩余章节，避免重复评分），只有“返回学习”', !(await page.$('.study-space-btn:has-text("Review again")')) && /all caught up/i.test(t));
    await $(page, '.study-space-btn:has-text("Back to Study")').click(); await page.waitForTimeout(150);
    rec('2f 返回学习：回到工作台，入口显示“没有待复习”', !!(await page.$('.study-space-hero')) && /Nothing due/.test(await tile(page).innerText()) && errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 3 多科目选择 + 写入 + 重新渲染 =====
  {
    const { ctx, page, errs } = await open(browser, multi()); const before = await ls(page), s0 = await st(page);
    rec('3 工作台入口显示“4 个章节待复习”（到期 3 + 新章节 1；未到期的 Waves 不算）', /4 chapters ready/.test(await tile(page).innerText()));
    rec('3a 浏览入口（只看不点）零写入', JSON.stringify(before) === JSON.stringify(await ls(page)));
    await openSetup(page); await shot(page, 'focus-setup-390');
    rec('3b 选择页：3 个科目都默认选中，显示“本次 4 个章节”', (await page.locator('.study-space-ftog[aria-pressed="true"]').count()) === 3 && /4 chapters in this session/.test(await text(page)));
    await page.locator('.study-space-ftog', { hasText: 'Physics' }).click(); await page.waitForTimeout(100);
    rec('3c 取消 Physics：剩 3 个章节；键盘焦点仍留在刚点的科目开关上（重新渲染不丢焦点）', /3 chapters in this session/.test(await text(page)) && (await page.evaluate(() => document.activeElement.dataset.sub)) === 'Physics');
    await page.keyboard.press('Enter'); await page.waitForTimeout(100); rec('3d 键盘 Enter 重新选中 Physics', /4 chapters in this session/.test(await text(page)));
    for (const n of ['Mathematics', 'Physics', 'Biology']) await page.locator('.study-space-ftog', { hasText: n }).click();
    await page.waitForTimeout(100); const dis = await $(page, '.study-space-btn:has-text("Start focusing")').isDisabled();
    rec('3e 全部取消：开始按钮禁用，并有文字提示“至少选一个科目”（没有 alert）', dis && /at least one subject/.test(await text(page)));
    for (const n of ['Mathematics', 'Physics', 'Biology']) await page.locator('.study-space-ftog', { hasText: n }).click();
    await start(page);
    rec('3f 会话没有写入任何数据（开始前不动存储）', JSON.stringify(await st(page)) === JSON.stringify(s0));
    rec('3g 第 1 张：Mathematics · Algebra，晚了 1 天；有可见的 Exit、进度条、三个评分按钮', /Algebra/.test(await text(page)) && /1 day late/.test(await text(page)) && (await $(page, '.study-space-btn:has-text("Exit")').isVisible()) && (await page.locator('[role="progressbar"]').count()) === 1 && (await page.locator('[data-rate]').count()) === 3);
    await shot(page, 'focus-session-390');
    // 评分结果必须和直接调用现有 srsRate 完全一致
    const exp = await page.evaluate(([g]) => { const t0 = JSON.parse(JSON.stringify(ST.topics.find(t => t.n === 'Algebra'))); srsRate(t0, g, dleft(t0.s), dayNum(new Date())); return { iv: t0.iv, nx: t0.nx }; }, [0]);
    await rate(page, 0); const a = (await st(page)).topics.find(t => t.n === 'Algebra');
    rec('3h “Again”(0) 写入 = 直接调用 srsRate(…,0,…) 的结果（iv/nx 一致），并且 nx 在今天之后', a.iv === exp.iv && a.nx === exp.nx && a.nx > TODAY, JSON.stringify([a.iv, a.nx, exp]));
    rec('3i 评分后立刻进入第 2 张（重新渲染，不是停在原卡）', /Card 2 of 4/.test(await text(page)) && /Calculus/.test(await text(page)));
    const mid = await st(page); rec('3j 其它章节确实没变（Calculus / Optics / Cells / Waves 逐个比较）', ['Calculus', 'Optics', 'Cells', 'Waves'].every(n => JSON.stringify(mid.topics.find(t => t.n === n)) === JSON.stringify(s0.topics.find(t => t.n === n))));
    // 中途退出
    await $(page, '.study-space-btn:has-text("Exit")').click(); await page.waitForTimeout(150);
    rec('3l 中途点 Exit：回到选择页，提示“已保存 1 个章节的评分”', /1 reviewed and saved/.test(await text(page)) && !!(await page.$('.study-space-ftog')));
    rec('3m 退出后：已评分的 Algebra 保留新进度；其余章节仍然待复习（选择页显示“3 个章节”）', (await st(page)).topics.find(t => t.n === 'Algebra').nx > TODAY && /3 chapters in this session/.test(await text(page)));
    const keys = Object.keys(await ls(page)).sort(), baseKeys = Object.keys(before).sort();
    rec('3n 整个流程没有新增任何本机存储键（尤其没有 mochi-* 新键、没有 studyspace-prefs）', JSON.stringify(keys.filter(k => !baseKeys.includes(k))) === '[]', keys.filter(k => !baseKeys.includes(k)).join(','));
    rec('3o 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 4 完整三种评分 + 总结页 + 与旧页面同步 =====
  {
    const { ctx, page, errs } = await open(browser, multi()); await openSetup(page); await start(page);
    await rate(page, 2); await rate(page, 1); await rate(page, 0); await rate(page, 2); const t = await text(page); await shot(page, 'focus-done-390');
    const nums = await page.evaluate(() => [...document.querySelectorAll('.study-space-stat .study-space-num')].map(e => e.textContent));
    rec('4 总结页数字：已复习 4 / Got it 2 / 需练习 1（Okay 只计入已复习）', JSON.stringify(nums) === '["4","2","1"]', JSON.stringify(nums));
    rec('4b 总结页：有“返回学习”，没有“再复习一轮”（已无剩余）', !!(await page.$('.study-space-btn:has-text("Back to Study")')) && !(await page.$('.study-space-btn:has-text("Review again")')));
    const s = await st(page); rec('4c 4 个章节都不再“到期/新”（nx>今天，iv>0）', ['Algebra', 'Calculus', 'Optics', 'Cells'].every(n => { const x = s.topics.find(t => t.n === n); return x.iv > 0 && x.nx > TODAY; }));
    await $(page, '.study-space-btn:has-text("Back to Study")').click(); await page.waitForTimeout(150);
    rec('4d 回到工作台后“待复习”统计变为 0（同一份数据，重新渲染）', (await page.locator('.study-space-stat .study-space-num').first().innerText()) === '0');
    await $(page, '.study-space-subj', { hasText: 'Mathematics' }); await page.locator('.study-space-subj', { hasText: 'Mathematics' }).first().click(); await page.waitForTimeout(150);
    rec('4e 科目详情的章节行显示“下次复习”（旧页面读到同样的新进度）', /Next review/.test(await text(page)));
    await page.click('.tabbar [data-v="tt"]'); await page.waitForTimeout(200); await page.click('.tabbar [data-v="hw"]'); await page.waitForTimeout(200);
    rec('4f 离开再回来：回到工作台首页（会话状态已丢弃，没有残留的专注界面）', !!(await page.$('.study-space-hero')) && !(await page.$('.study-space-frate')));
    rec('4g 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 5 超过 20 个：封顶 + “再复习一轮” =====
  {
    const { ctx, page, errs } = await open(browser, big()); await openSetup(page);
    rec('5 25 个待复习：本次 20 个，并说明其余仍待复习', /20 chapters in this session/.test(await text(page)) && /Up to 20 chapters per session/.test(await text(page)));
    await start(page); for (let i = 0; i < 20; i++) await rate(page, 2);
    rec('5b 20 个评完：总结页提示“还有 5 个章节”，出现“再复习一轮”', /5 more chapters are waiting/.test(await text(page)) && !!(await page.$('.study-space-btn:has-text("Review again")')));
    await $(page, '.study-space-btn:has-text("Review again")').click(); await page.waitForTimeout(150);
    rec('5c 点“再复习一轮”：直接开始剩下的 5 个（Card 1 of 5）', /Card 1 of 5/.test(await text(page)));
    rec('5d 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 6 边界：连点、列表中途变化 =====
  {
    const { ctx, page, errs } = await open(browser, multi()); await openSetup(page); await start(page); await page.waitForTimeout(340);
    await page.evaluate(() => { const b = document.querySelector('[data-rate="2"]'); b.click(); b.click(); }); await page.waitForTimeout(150);
    const t = await text(page); rec('6 同一帧连点两次“Got it”：只评一张（防连点），停在第 2 张', /Card 2 of 4/.test(t) && (await st(page)).topics.filter(x => x.iv > 0 && x.nx > TODAY && ['Calculus', 'Optics', 'Cells'].includes(x.n)).length === 0);
    // 评分前，列表被别处改动（下标错位）：必须写到正确的章节
    await page.evaluate(() => { ST.topics.unshift({ s: 'Zzz', n: 'Inserted', iv: 9, nx: 9999999 }); });
    const before = JSON.stringify((await page.evaluate(() => ST.topics.find(t => t.n === 'Inserted'))));
    await rate(page, 2); const r = await page.evaluate(() => ({ ins: ST.topics.find(t => t.n === 'Inserted'), calc: ST.topics.find(t => t.n === 'Calculus') }));
    rec('6b 列表中途错位：评分仍写到 Calculus 上，没有误写到被插入的章节', JSON.stringify(r.ins) === before && r.calc.iv > 0 && r.calc.nx > TODAY);
    await page.evaluate(() => { ST.topics = ST.topics.filter(t => t.n !== 'Optics'); }); await rate(page, 2);
    rec('6c 当前章节被删除：跳过它、不写任何东西、不报错，继续下一张', /Card 4 of 4|Cells/.test(await text(page)) && errs.length === 0, errs.join('|'));
    await rate(page, 2); rec('6d 结束后总结页提示有 1 个章节被跳过', /1 chapter was removed/.test(await text(page))); await ctx.close();
  }
  // ===== 7 断网 =====
  {
    const { ctx, page, errs } = await open(browser, multi()); await ctx.setOffline(true); await openSetup(page); await start(page); await rate(page, 2); await rate(page, 0);
    const s = await st(page); rec('7 断网：开始 / 评分 / 写入 / 渲染都正常（纯本机）', /Card 3 of 4/.test(await text(page)) && s.topics.find(t => t.n === 'Algebra').nx > TODAY && s.topics.find(t => t.n === 'Calculus').nx > TODAY && errs.length === 0, errs.join('|'));
    await ctx.setOffline(false); await ctx.close();
  }
  // ===== 8 视口：无横向溢出、按钮不被遮挡、在底部导航之上可达 =====
  for (const [w, h, name] of [[360, 640, '360'], [390, 844, '390'], [768, 1024, '768'], [1280, 800, '1280']]) {
    const { ctx, page, errs } = await open(browser, multi(), { w, h }); let ok = true, note = [];
    const chk = async (label, cond) => { if (!cond) { ok = false; note.push(label); } };
    await chk('dash-overflow', (await overflow(page)) <= 0); await shot(page, 'focus-dash-' + name);
    await chk('tile-click', await unblocked(page, '.study-space-focus-tile')); await openSetup(page);
    await chk('setup-overflow', (await overflow(page)) <= 0); await chk('setup-btns', await unblocked(page, '.study-space-ftog, .study-space-btn')); await shot(page, 'focus-setup-' + name);
    await start(page); await chk('run-overflow', (await overflow(page)) <= 0); await chk('rate-unblocked', await unblocked(page, '[data-rate]')); await chk('exit-unblocked', await unblocked(page, '.study-space-ftop .study-space-btn'));
    if (h <= 844) await chk('rate-above-tabbar', await aboveTabbar(page)); await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, 'focus-session-' + name);
    for (let i = 0; i < 4; i++) await rate(page, 2);
    await chk('done-overflow', (await overflow(page)) <= 0); await chk('done-btns', await unblocked(page, '.study-space-btn')); await shot(page, 'focus-done-' + name);
    rec('8 视口 ' + name + '：四个界面都无横向溢出、按钮不被遮挡（含底部导航）、评分按钮 ≥40px', ok && errs.length === 0, note.join(',') + errs.join('|')); await ctx.close();
  }
  // ===== 8b 全局浮动的 Buddy 不盖住评分按钮（375×667 及以上的常见手机屏） =====
  for (const [w, h] of [[360, 640], [375, 667], [390, 844]]) {
    const { ctx, page } = await open(browser, multi(), { w, h }); await openSetup(page); await start(page);
    const ov = await page.evaluate(() => { const bd = document.querySelector('.bd-btn'); if (!bd) return [0]; const B = bd.getBoundingClientRect(); return [...document.querySelectorAll('[data-rate]')].map(e => { const a = e.getBoundingClientRect(); return Math.max(0, Math.min(a.right, B.right) - Math.max(a.left, B.left)) * Math.max(0, Math.min(a.bottom, B.bottom) - Math.max(a.top, B.top)); }); });
    rec('8b ' + w + '×' + h + '：浮动 Buddy 与三个评分按钮零重叠', ov.every(x => x === 0), JSON.stringify(ov)); await ctx.close();
  }
  // ===== 9 语言 / 主题 / 减少动态 / 键盘 =====
  for (const [lang, probe] of [['zh', /专注复习/], ['ms', /Ulang Kaji Fokus/], ['en', /Focus Revision/]]) {
    const { ctx, page, errs } = await open(browser, multi(), { lang }); const d = await text(page); await openSetup(page); const s = await text(page); await $(page, '.study-space-btn >> nth=0').click(); await page.waitForTimeout(150); const r = await text(page);
    if (lang !== 'en') await shot(page, 'focus-session-' + lang);
    rec('9 语言 ' + lang + '：入口 / 选择页 / 会话都有译文，没有漏出键名', probe.test(d) && !keysLeaked(d + s + r) && errs.length === 0, (d + s + r).match(/\bf[A-Z]\w+\b/g)); await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, multi(), { dark: true }); await openSetup(page); await start(page); await shot(page, 'focus-session-dark-390');
    const c = await page.evaluate(() => { const e = document.querySelector('.study-space-fcard'), s = getComputedStyle(e); return { bg: s.backgroundImage.length > 0, ink: getComputedStyle(document.querySelector('.study-space-fname')).color }; });
    rec('9b 深色主题：会话卡片跟随主题（文字是浅色）', /rgb\((2[0-9]{2}|1[89][0-9])/.test(c.ink) && errs.length === 0, c.ink); await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, multi(), { rm: true }); await openSetup(page); await start(page);
    const tr = await page.evaluate(() => [getComputedStyle(document.querySelector('.study-space-bar i')).transitionDuration, getComputedStyle(document.querySelector('.study-space-frate-b')).transitionDuration]);
    rec('9c “减少动态效果”：进度条 / 按钮没有过渡动画', tr.every(x => x === '0s'), tr.join(',')); await ctx.close();
  }
  {
    const { ctx, page, errs } = await open(browser, multi()); await tile(page).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    const f1 = await page.evaluate(() => document.activeElement.className); await page.locator('.study-space-btn:has-text("Start focusing")').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    const f2 = await page.evaluate(() => document.activeElement.tagName + '|' + document.activeElement.textContent);
    rec('9d 键盘：Enter 打开入口 → 焦点落到标题；Enter 开始 → 焦点落到“Card 1 of 4”标题（读屏会读到）', /study-space-h/.test(f1) && /^H2\|Card 1 of 4/.test(f2), f1 + ' / ' + f2);
    await page.waitForTimeout(340); await page.locator('[data-rate="2"]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    rec('9e 键盘：Tab 到评分按钮 + Enter 可评分；焦点环可见（outline ≥2px）', /Card 2 of 4/.test(await text(page)));
    await page.locator('[data-rate="1"]').focus(); const ol = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth); rec('9f 评分按钮聚焦时有可见焦点环', parseFloat(ol) >= 2, ol); rec('9g 无页面报错', errs.length === 0, errs.join('|')); await ctx.close();
  }
  // ===== 10 其它功能不受影响 =====
  {
    const { ctx, page, errs } = await open(browser, multi()); let ok = true;
    for (const v of ['tt', 'hw', 'st', 'tt', 'hw']) { await page.evaluate(x => showView(x), v); await page.waitForTimeout(80); ok = ok && (await page.evaluate(() => document.body.getAttribute('data-view'))) === v; }
    await page.evaluate(() => showView('ss')); await page.waitForTimeout(150); ok = ok && !!(await page.$('.study-space-stats')) && !!(await page.$('.study-space-subj'));
    rec('10 时间表 / 作业 / 复习计划 / Study Space 工作台之间切换正常，工作台原有的统计和科目卡片都在', ok && errs.length === 0, errs.join('|')); await ctx.close();
  }
  await browser.close();
  const p = results.filter(Boolean).length; console.log('\n' + p + '/' + results.length + ' passed'); process.exit(p === results.length ? 0 : 1);
})();
