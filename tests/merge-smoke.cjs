// v9.8 合并回归（Phase 3 Study Space + main 的 Starter Kits / 插画横幅 / 菜单润色）：两条线放在一起互不破坏。
// 用法：python3 -m http.server 8765 &  然后  node tests/merge-smoke.cjs [http://localhost:8765]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8765', MON = new Date('2026-11-09T10:30:00');
const results = []; const rec = (n, ok, note) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const SEED = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'buddy-prefs': JSON.stringify({ on: false }) };
async function open(browser, lang, vp = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  const errs = [];
  await ctx.addInitScript(([s, l]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); localStorage.setItem('ui-lang', l); } }, [SEED, lang]);
  const page = await ctx.newPage(); await page.clock.setFixedTime(MON);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200);
  return { ctx, page, errs };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const wkCount = page => page.evaluate(() => (WK[curW] || []).length);
(async () => {
  const browser = await chromium.launch();
  // 1. 版本号：三处一致
  { const { ctx, page } = await open(browser, 'en'); const v = await page.evaluate(() => window.MOCHI_VERSION);
    const fs = require('fs'), path = require('path'), pk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version, sw = (fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8').match(/const VER = 'mochi-v([^']+)'/) || [])[1];
    rec('1 版本号：version.js = package.json = sw.js 缓存名', v === pk && sw === pk.replace(/\./g, '-'), `${v} / ${pk} / ${sw}`); await ctx.close(); }

  // 2. 三种语言：Study Space + main 的菜单润色同时在，没有报错
  for (const lang of ['en', 'zh', 'ms']) {
    const { ctx, page, errs } = await open(browser, lang), tag = '[' + lang + '] ';
    await page.click('.tabbar [data-v="hw"]'); await page.waitForTimeout(400);
    rec(tag + '点“学习”标签 → 学习工作台', await page.evaluate(() => getComputedStyle(document.getElementById('v-ss')).display !== 'none' && !!document.querySelector('#v-ss .study-space-h')));
    await page.evaluate(() => openMenu()); await page.waitForTimeout(250);
    const m = await page.evaluate(() => ({ intro: !!document.querySelector('.mochi-menu-intro'), head: (document.querySelector('#dwr h2') || {}).textContent, rows: document.querySelectorAll('#dwr .dw-r').length }));
    rec(tag + '菜单：main 的插画介绍条在，入口没丢', m.intro && m.rows >= 10, JSON.stringify(m));
    await page.evaluate(() => closeMenu()); await page.evaluate(() => showView('more')); await page.waitForTimeout(250);
    rec(tag + '“更多”页：main 的横幅标题在', await page.evaluate(() => !!document.querySelector('#v-more .mochi-more-heading')));
    await page.evaluate(() => showView('se')); await page.waitForTimeout(250);
    const se = await page.evaluate(() => ({ head: !!document.querySelector('.mochi-settings-head'), study: [...document.querySelectorAll('#seidx .mrow')].some(r => /Study Space|学习空间|Ruang Belajar/.test(r.textContent)) }));
    rec(tag + '设置页：main 的页头在，Phase 3 的“学习空间”分类也在', se.head && se.study, JSON.stringify(se));
    rec(tag + '无页面报错', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }

  // 3. 横幅图片资源真的能加载（menu-polish.css 引用了 webp）
  { const { ctx, page } = await open(browser, 'en');
    const r = await page.evaluate(async () => { const out = {}; for (const f of ['assets/mochi-banner-space.webp', 'assets/mochi-banner-more.webp']) { const x = await fetch(f); out[f] = x.status + ' ' + (await x.blob()).size; } return out; });
    rec('3 两张插画横幅文件可访问', Object.values(r).every(s => /^200 \d{4,}/.test(s)), JSON.stringify(r));
    const css = await page.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(x => /mochi-banner/.test(x.cssText)); } catch (e) { return false; } }));
    rec('3b 菜单润色样式表已加载，且引用了横幅图', css); await ctx.close(); }

  // 4. Starter Kits：能打开、四套模板、导入 / 撤销，和 Study Space 互不影响
  { const { ctx, page, errs } = await open(browser, 'en');
    rec('4 课表页有“模板”入口按钮', await page.evaluate(() => !!document.querySelector('#v-tt #mk-open')));
    const n0 = await wkCount(page);
    await page.click('#mk-open'); await page.waitForTimeout(250);
    const kits = await page.$$eval('#mk-dialog .mk-choice', b => b.length);
    rec('4b 对话框打开，有 4 套模板', kits === 4 && await page.evaluate(() => document.getElementById('mk-dialog').getAttribute('role') === 'dialog'), 'kits=' + kits);
    const names = await page.evaluate(() => Object.keys(MochiStarterKits.kits)), bad = [], counts = {};
    for (let i = 0; i < names.length; i++) { await page.click(`#mk-dialog .mk-choice:nth-of-type(${i + 1})`); const rows = await page.$$eval('#mk-dialog .mk-row', r => r.length), want = await page.evaluate(k => MochiStarterKits.kits[k].items.length, names[i]); counts[names[i]] = rows; if (rows !== want || !rows) bad.push(names[i] + ':' + rows + '/' + want); }
    rec('4c 每套模板预览的条数 = 模板定义的条数（实际 ' + JSON.stringify(counts) + '；main 的说明文档写的是每套 35 条）', !bad.length, bad.join(','));
    await page.click('#mk-dialog .mk-choice:nth-of-type(1)');
    const valid = await page.$$eval('#mk-dialog .mk-row:not(.mk-conflict) input[type=checkbox]', c => c.filter(x => x.checked).length);
    await page.click('#mk-dialog .mk-actions .mk-btn:not(.mk-undo):not(.mk-secondary)'); await page.waitForTimeout(250);
    const n1 = await wkCount(page);
    rec('4d 导入：只写入勾选且无冲突的那些（只写当前周）', valid > 0 && n1 - n0 === valid, `valid=${valid} added=${n1 - n0}`);
    // 撤销：在同一个对话框里点“Undo this import”→ 数量回到导入前；之后可以再导入一次
    await page.click('#mk-dialog .mk-undo'); await page.waitForTimeout(200);
    rec('4e 撤销这次导入：数量回到导入前', (await wkCount(page)) === n0, `${n0} → ${n1} → ${await wkCount(page)}`);
    await page.click('#mk-dialog .mk-actions .mk-btn:not(.mk-undo):not(.mk-secondary)'); await page.waitForTimeout(200);
    rec('4f 撤销后可以再导入（数量又变回导入后）', (await wkCount(page)) === n1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    rec('4g Esc 关闭对话框', await page.evaluate(() => document.getElementById('mk-layer').hidden === true));
    const ss = await page.evaluate(() => { showView('ss'); return { shown: getComputedStyle(document.getElementById('v-ss')).display !== 'none', txt: document.getElementById('v-ss').innerText.replace(/\n/g, ' ') }; });
    rec('4i 导入模板后 Study Space 照常显示，且模板活动不会被算成“学习时段”', ss.shown && !/[1-9]\s*Study sessions/.test(ss.txt), ss.txt.slice(0, 90));
    await page.evaluate(() => showView('tt')); await page.waitForTimeout(200); await page.click('#mk-open'); await page.waitForTimeout(200);
    const dupValid = await page.$$eval('#mk-dialog .mk-row:not(.mk-conflict) input[type=checkbox]', c => c.filter(x => x.checked).length), nBefore = await wkCount(page);
    await page.click('#mk-dialog .mk-actions .mk-btn:not(.mk-undo):not(.mk-secondary)'); await page.waitForTimeout(200);
    rec('4j 同一套模板再导入一次：全部被标为冲突，不会产生重复活动', dupValid === 0 && (await wkCount(page)) === nBefore, `valid=${dupValid} before=${nBefore} after=${await wkCount(page)}`);
    await page.keyboard.press('Escape');
    rec('4h 无页面报错', errs.length === 0, errs.slice(0, 2).join(' | ')); await ctx.close(); }

  // 5. 窄屏 / 宽屏：新旧页面都没有横向滚动
  for (const vp of [{ width: 360, height: 700 }, { width: 1280, height: 800 }]) {
    const { ctx, page } = await open(browser, 'en', vp), bad = [];
    for (const v of ['tt', 'ss', 'hw', 'st', 'more', 'se']) { await page.evaluate(v => showView(v), v); await page.waitForTimeout(200); if (await overflow(page) > 1) bad.push(v); }
    await page.evaluate(() => showView('tt')); await page.click('#mk-open'); await page.waitForTimeout(200); if (await overflow(page) > 1) bad.push('mk-dialog');
    rec(`5 ${vp.width}px：各页面和模板对话框无横向滚动`, !bad.length, bad.join(',')); await ctx.close(); }
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' 通过'); process.exit(ok === results.length ? 0 : 1);
})();
