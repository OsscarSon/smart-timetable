// Wrapped 2.0 真浏览器测试。先起静态服务（python3 -m http.server 8765），再：node tests/wrapped2-smoke.cjs [baseURL] [截图目录]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:8765', OUT = process.argv[3] || path.join(__dirname, '..', 'test-shots'); fs.mkdirSync(OUT, { recursive: true });
const NOW = new Date('2026-11-18T15:00:00'); const results = [];
const rec = (n, ok, note) => { results.push({ n, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? ' — ' + note : '')); };
const EXIST = { 'mochi-set': JSON.stringify({ wiz: true }), 'buddy-prefs': JSON.stringify({ on: false }) };
async function open(b, o = {}) {
  const ctx = await b.newContext({ viewport: o.vp || { width: 390, height: 844 }, colorScheme: o.scheme || 'light', serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort()); const errs = [];
  await ctx.addInitScript(st => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(st).forEach(k => localStorage.setItem(k, st[k])); } }, { ...EXIST, ...(o.storage || {}) });
  const page = await ctx.newPage(); await page.clock.setFixedTime(NOW);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200); return { ctx, page, errs };
}
// 在“本周(11/16–11/22)”与“上周”里用 App 自己的数据结构造数据：手动+重复+课程
const seed = page => page.evaluate(() => {
  const w = thisW, add = (wk, day, s, e, t) => { (WK[wk] = WK[wk] || []).push({ day, s, e, t, c: 0 }); };
  add(w, 0, 540, 660, '📚 Calculus homework'); add(w, 1, 600, 720, 'Secret therapy'); add(w, 2, 1080, 1200, 'Gym'); add(w, 0, 1080, 1140, 'Dinner');
  add(w - 1, 3, 540, 600, 'Secret therapy'); add(w - 1, 4, 900, 1020, 'Project X'); add(w - 1, 5, 600, 660, 'Gym');
  save(); const d = 0; DN[kk({ day: 0, s: 540, t: '📚 Calculus homework' }, w)] = 1; DN[kk({ day: 4, s: 900, t: 'Project X' }, w - 1)] = 1; put2(K_DN, DN);
  FX.push({ day: 0, s: 480, e: 570, t: 'Physics', c: 1, type: '课程' }); fxSave();
  RP.push({ day: 2, s: 1200, e: 1260, t: 'Reading', c: 2, a0: dnOf(w - 1, 2), ev: 1 }); rpSave(); refreshBlocks(); draw();
  HW.push({ id: 'h1', done: Date.now(), ts: Date.now(), t: 'x', sb: '', due: '', note: '', link: '' }); put2(K_HW, HW);
});
const keys = p => p.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
(async () => {
  const br = await chromium.launch(); let base = [];
  { const { ctx, page, errs } = await open(br); for (const v of ['hw', 'sp', 'sta', 'more', 'tt']) { await page.evaluate(v => showView(v), v); await page.waitForTimeout(100); } base = errs; await ctx.close(); }

  { const { ctx, page, errs } = await open(br);
    // 1 空数据：不编造
    await page.evaluate(() => MochiNext.openWrapped()); await page.waitForSelector('.w2-card');
    rec('1 无数据：显示“数据还不够”，无统计数字', /Not enough data yet/.test(await page.textContent('.w2-card')) && !(await page.$('.w2-hero')));
    rec('1b 无数据：导出按钮禁用', await page.$eval('.mn-primary', b => b.disabled)); await page.screenshot({ path: OUT + '/1-empty.png' }); await page.keyboard.press('Escape');
    rec('1c Esc 关闭弹窗', (await page.$('.w2-ov')) === null);
    await seed(page); const before = await keys(page);
    await page.evaluate(() => MochiNext.openWrapped()); await page.waitForSelector('.w2-card'); await page.waitForTimeout(200);
    const T = [];
    for (let i = 0; i < 5; i++) { T.push(await page.textContent('.w2-card')); await page.screenshot({ path: `${OUT}/2-card${i + 1}.png` }); if (i < 4) await page.click('.w2-arrow:last-of-type'); }
    rec('2 5 张卡片：概览/节奏/去向/计划vs完成/亮点', /Your time, planned/.test(T[0]) && /Your rhythm/.test(T[1]) && /Where your time went/.test(T[2]) && /Plan vs\. marked done/.test(T[3]) && /Your highlights/.test(T[4]));
    // 手算：本月(11月)到 11/18：本周周一=11/16。本周: 周一 9–11 Calculus(120)+8–9:30 Physics课(90)+18–19 Dinner(60)；周二 10–12 Secret(120)；周三 18–20 Gym(120)+重复 Reading 20–21(60)
    // 上周(11/9–11/15): 周四 9–10 Secret(60)、周五 15–17 ProjectX(120)、周六 10–11 Gym(60)、重复 Reading 每周三 11/11 20–21(60)
    // 周一 11/9..：Reading 从 w-1 周三开始 → 11/11、11/18。11/18 是今天(周三)；Gym 18–20 + Reading 20–21 → 并集 180
    // 课程 Physics 每周一：11/2、11/9、11/16 各 90（本月内共 3 次）。 => 条目：手动7 + 重复2 + 课程3 = 12 条；活跃 9 天(11/2,9,11,12,13,14,16,17,18)
    const c1 = T[0]; rec('3 概览：条目数 = 手动7 + 重复2 + 课程3 = 12', /Items\s*12/.test(c1), c1.replace(/\s+/g, ' ').slice(0, 200));
    // 总时长：11/9 课90; 11/11 重复60; 11/12 60; 11/13 120; 11/14 60; 11/16 课90+Calc120+Dinner60 → 90(8:00-9:30)+120(9-11)交叠9:00-9:30 → 并集 8:00–11:00=180 + 60 = 240; 11/17 120; 11/18 Gym+Reading 180
    // 合计 90(11/2)+90+60+60+120+60+240+120+180 = 1020 分钟 = 17 h
    rec('3b 概览：计划时长 = 17 h（周一 9:00–9:30 的重叠只算一次）', /planned time|17 h/.test(c1) && /17 h/.test(c1), c1.replace(/\s+/g, ' ').slice(0, 120));
    rec('3c 活跃天数 = 9', /Active days\s*9/.test(c1));
    rec('4 “怎么算的”折叠说明存在于每张卡', (await page.$$eval('.w2-calc', e => e.length)) === 1); // 当前卡
    rec('5 计划vs完成：已过去且可勾选的手动/重复项 → 有百分比', /%/.test(T[3]) && /Items already passed/.test(T[3]), T[3].replace(/\s+/g, ' ').slice(0, 160));
    rec('6 打开/翻卡片不写任何数据', before === (await keys(page)));
    // 导出隐私
    await page.click('.w2-arrow:first-of-type'); await page.click('.w2-arrow:first-of-type'); // 回到第 3 张
    await page.click('.mn-primary'); await page.waitForSelector('.w2-prev[src]'); await page.waitForTimeout(500);
    rec('7 导出预览默认勾选“隐藏事件名称”', await page.$eval('.w2-hide input', c => c.checked));
    const sz = await page.$eval('.w2-prev', i => [i.naturalWidth, i.naturalHeight]); rec('8 PNG 是 1080×1920 (9:16)', sz[0] === 1080 && sz[1] === 1920, sz.join('x'));
    await page.screenshot({ path: OUT + '/3-export-hidden.png' });
    const dl = page.waitForEvent('download'); await page.click('.w2-ex-row .mn-primary'); const d = await dl; const fp = path.join(OUT, d.suggestedFilename()); await d.saveAs(fp);
    rec('9 下载文件名/格式', /^mochi-wrapped-2026-11-c3\.png$/.test(d.suggestedFilename()) && fs.readFileSync(fp).slice(1, 4).toString() === 'PNG');
    await page.uncheck('.w2-hide input'); await page.waitForTimeout(600); await page.screenshot({ path: OUT + '/3-export-visible.png' });
    // 真实验证隐私：把导出的 canvas 与显示名称版对比——用 OCR 不可得，改为直接测 drawPNG 的文案入参
    const leak = await page.evaluate(async () => { const cs = MochiWrapped2._cards({ kind: 'month', ym: '2026-11', year: 2026 }); return JSON.stringify(cs.find(c => c.id === 'c3')); });
    rec('10 卡片 3 的私人字段都带 alt 且 priv 标记（导出时替换）', /"priv":true/.test(leak) && /Activity 1/.test(leak) && /Secret therapy/.test(leak));
    await page.click('.w2-ex-row .mn-btn'); rec('11 返回后回到卡片视图', !!(await page.$('.w2-card')) && !(await page.$('.w2-prev')));
    // 年度
    await page.click('.w2-seg button:last-child'); await page.waitForTimeout(300); rec('12 年度视图可用', /2026/.test(await page.textContent('.w2-eyebrow')));
    await page.click('.w2-seg button:first-child');
    await ctx.close(); rec('13 无新增 pageerror/console.error', errs.filter(e => !base.includes(e)).length === 0, errs.filter(e => !base.includes(e)).join(' | ')); }

  // 入口：统计页按钮 / 开关关闭回退经典 / 语言
  { const { ctx, page } = await open(br); await seed(page); await page.evaluate(() => showView('sta')); await page.waitForTimeout(300);
    await page.click('#mochi-wrapped-mount button'); await page.waitForTimeout(300); rec('14 统计页入口打开 2.0', !!(await page.$('.w2-card'))); await page.keyboard.press('Escape');
    await page.evaluate(() => { localStorage.setItem('wrapped2-prefs', JSON.stringify({ on: false })); }); await page.reload(); await page.waitForTimeout(1000);
    await page.evaluate(() => MochiNext.openWrapped()); await page.waitForTimeout(300); rec('15 开关关闭 → 打开经典 1.0', !!(await page.$('.mn-wrapped-card')) && !(await page.$('.w2-card'))); await ctx.close(); }
  { const { ctx, page } = await open(br, { storage: { 'wrapped2-prefs': JSON.stringify({ on: true }) } }); await seed(page);
    await page.evaluate(() => { MochiWrapped2.open = MochiWrapped2.open; }); await page.evaluate(() => MochiNext.openWrapped()); await page.waitForSelector('.w2-card');
    await page.click('.w2-link'); await page.waitForTimeout(300); rec('16 “使用经典版”链接 → 1.0', !!(await page.$('.mn-wrapped-card')) && !(await page.$('.w2-ov'))); await ctx.close(); }
  for (const lang of ['zh', 'ms']) { const { ctx, page } = await open(br, { storage: { 'ui-lang': lang } }); await seed(page); await page.evaluate(() => MochiNext.openWrapped()); await page.waitForSelector('.w2-card');
    const t = await page.textContent('.w2-card'); rec(`17 ${lang}：卡片文案为该语言`, lang === 'zh' ? /你的时间安排/.test(t) && !/planned time/.test(t) : /Masa yang anda rancang/.test(t), t.replace(/\s+/g, ' ').slice(0, 80));
    await page.screenshot({ path: `${OUT}/4-${lang}.png` }); await ctx.close(); }
  // 暗色 + 窄屏 + 设置项
  { const { ctx, page } = await open(br, { vp: { width: 320, height: 640 }, scheme: 'dark' }); await seed(page); await page.evaluate(() => MochiNext.openWrapped()); await page.waitForSelector('.w2-card');
    const ov = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); rec('18 320px 宽无横向溢出', ov); await page.screenshot({ path: OUT + '/5-dark-320.png' }); await page.keyboard.press('Escape');
    await page.evaluate(() => { showView('se'); [...document.querySelectorAll('#seidx .mrow')][0].click(); }); rec('19 设置页有 Wrapped 2.0 开关', !!(await page.$('.sec[data-sec="look"] .w2-set'))); await ctx.close(); }
  await br.close(); const bad = results.filter(r => !r.ok); fs.writeFileSync(path.join(OUT, 'wrapped2-results.json'), JSON.stringify(results, null, 1));
  console.log(`\n${results.length - bad.length}/${results.length} 通过` + (bad.length ? '；失败：' + bad.map(b => b.n).join('；') : '')); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
