// 空状态测试：①整个课表空时只有一只大猫（没文字没按钮，不挡点击）②今天没安排时不再说“都完成啦”③空课表时 ＋ 会提示几下。
// 用法：python3 -m http.server 8765 &  然后  node tests/empty-smoke.cjs [http://localhost:8765]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8765', MON = new Date('2026-11-09T10:30:00');
const results = []; const rec = (n, ok, note) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const SEED = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'buddy-prefs': JSON.stringify({ on: false }) };
const LABEL = { en: 'Nothing scheduled yet', zh: '还没有任何安排', ms: 'Belum ada jadual' };
async function open(browser, lang, view, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  const errs = [];
  await ctx.addInitScript(([s, l]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); localStorage.setItem('ui-lang', l); } }, [Object.assign({}, SEED, extra), lang]);
  const page = await ctx.newPage(); await page.clock.setFixedTime(MON);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(v => { const re = v === 'day' ? /^(Day|日|Hari)$/ : /^(Week|周|Minggu)$/; const b = [...document.querySelectorAll('button')].find(x => re.test(x.textContent.trim())); b && b.click(); }, view);
  await page.waitForTimeout(500);
  return { ctx, page, errs };
}
const cta = page => page.evaluate(() => { const c = [...document.querySelectorAll('.cta')].find(x => x.offsetParent !== null); if (!c) return null; const sv = c.querySelector('svg'), s = sv ? sv.getBoundingClientRect() : { width: 0, left: 0, top: 0, height: 0 }; return { txt: c.innerText.trim(), btn: c.querySelectorAll('button').length, label: c.getAttribute('aria-label'), role: c.getAttribute('role'), w: Math.round(s.width), cx: s.left + s.width / 2, cy: s.top + s.height / 2 }; });
(async () => {
  const browser = await chromium.launch();
  for (const lang of ['en', 'zh', 'ms']) for (const view of ['day', 'week']) {
    const { ctx, page, errs } = await open(browser, lang, view), c = await cta(page), tag = '[' + lang + '/' + view + '] ';
    rec(tag + '空课表只显示一只大猫（无文字、无按钮、够大）', !!c && c.txt === '' && c.btn === 0 && c.w >= 150, JSON.stringify(c));
    rec(tag + '读屏标签正确', !!c && c.role === 'img' && c.label === LABEL[lang], c && c.label);
    const gone = await page.evaluate(() => !/no plan yet|Add your timetable first|还没有任何安排 |先把课表放进来|Import timetable from a photo|拍照导入课表/i.test(document.getElementById('v-tt').innerText));
    rec(tag + '旧的标题 / 说明 / 三个按钮都没有了', gone);
    if (view === 'week' && c) { const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('.cta')); }, [c.cx, c.cy]); rec(tag + '猫不挡点击（点击会穿透到课表格子）', !hit); }
    rec(tag + '无 pageerror / console.error', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close();
  }
  { // ＋ 菜单确实能做被删掉的按钮做的事：手动添加 / 一句话 / 拍照导入
    const { ctx, page, errs } = await open(browser, 'en', 'day');
    await page.click('#fab'); await page.waitForTimeout(250);
    const items = await page.$$eval('#fabm button', b => b.map(x => x.textContent.trim()));
    rec('＋ 菜单至少有 3 个入口（手动添加 / 一句话 / 拍照导入）', items.length >= 3 && items.some(t => /photo|camera/i.test(t)), items.join(' | '));
    rec('＋ 菜单无报错', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  { // 加了内容后猫消失，删掉后又回来
    const { ctx, page, errs } = await open(browser, 'en', 'day');
    await page.evaluate(() => { data.push({ day: todayIdx, s: 9 * 60, e: 10 * 60, t: 'Maths', c: 0 }); save(); draw(); }); await page.waitForTimeout(300);
    rec('有日程后猫消失、日程显示', (await cta(page)) === null && await page.evaluate(() => /Maths/.test(document.getElementById('dlist').innerText)));
    await page.evaluate(() => { data.splice(0, data.length); save(); draw(); }); await page.waitForTimeout(300);
    rec('日程删光后猫回来', (await cta(page)) !== null);
    rec('增删无报错', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }

  { // 横幅：今天没有任何安排 → 不说“都完成啦”（下面的「今天没有安排」已经说了）
    const { ctx, page, errs } = await open(browser, 'en', 'day'), bn = () => page.evaluate(() => { const b = document.getElementById('bn'); return { t: b.textContent.trim(), shown: getComputedStyle(b).display !== 'none' }; });
    let b = await bn(); rec('横幅：今天没有任何安排 → 横幅不显示（没有“Everything done”）', b.t === '' && !b.shown, JSON.stringify(b));
    await page.evaluate(() => { data.push({ day: todayIdx, s: 11 * 60, e: 12 * 60, t: 'Maths', c: 0 }); save(); draw(); }); await page.waitForTimeout(200);
    b = await bn(); rec('横幅：有一件没做 → 提醒还有事（不是“都完成”）', b.shown && b.t !== '' && !/done!|完成啦/.test(b.t), b.t);
    await page.evaluate(() => { DN[kk(data[0])] = 1; put2(K_DN, DN); draw(); }); await page.waitForTimeout(200);
    b = await bn(); rec('横幅：做完了 → 显示“Everything for today is done!”', b.shown && /done/i.test(b.t), b.t);
    await page.evaluate(() => { data.splice(0, data.length); save(); draw(); }); await page.waitForTimeout(200);
    b = await bn(); rec('横幅：删光后又不显示', b.t === '' && !b.shown, JSON.stringify(b));
    rec('横幅测试无报错', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  { // 横幅：今天没安排但有考试倒计时 → 只显示考试，不带“都完成啦”
    const { ctx, page, errs } = await open(browser, 'en', 'day', { 'mochi-st': JSON.stringify({ subs: ['Matematik'], topics: [], ex: { 'Matematik': '2026-11-30' } }) });
    const b = await page.evaluate(() => { const e = document.getElementById('bn'); return { t: e.textContent.trim(), shown: getComputedStyle(e).display !== 'none' }; });
    rec('横幅：没安排但有考试倒计时 → 只显示考试信息', b.shown && b.t !== '' && !/done!|完成啦/.test(b.t) && !/^[\s\u3000]/.test(b.t), b.t);
    rec('考试横幅无报错', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  { // ＋ 提示：空课表有 hint 类，有内容就没有；有菜单展开时不闪
    const { ctx, page } = await open(browser, 'en', 'day'), has = () => page.evaluate(() => document.getElementById('fab').classList.contains('hint'));
    rec('＋ 提示：空课表时有“呼吸”提示', await has());
    const anim = await page.evaluate(() => getComputedStyle(document.getElementById('fab')).animationName);
    rec('＋ 提示：动画只跑有限次（4 次）', await page.evaluate(() => getComputedStyle(document.getElementById('fab')).animationIterationCount) === '4' || anim === 'none', anim);
    await page.evaluate(() => { data.push({ day: todayIdx, s: 9 * 60, e: 10 * 60, t: 'Maths', c: 0 }); save(); draw(); }); await page.waitForTimeout(150);
    rec('＋ 提示：有日程后停止', !(await has()));
    await page.evaluate(() => { data.splice(0, data.length); save(); draw(); }); await page.waitForTimeout(150);
    rec('＋ 提示：删光后又出现', await has());
    await ctx.close(); }
  { // 减少动态效果：不闪
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
    await ctx.addInitScript(([s]) => { Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); }, [SEED]);
    const page = await ctx.newPage(); await page.goto(BASE + '/index.html'); await page.waitForTimeout(1000);
    rec('＋ 提示：系统开了“减少动态效果”时不播放动画', await page.evaluate(() => getComputedStyle(document.getElementById('fab')).animationName) === 'none'); await ctx.close(); }
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' 通过'); process.exit(ok === results.length ? 0 : 1);
})();
