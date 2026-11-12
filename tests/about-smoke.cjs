// v9.0 测试：菜单“关于”分组（评分 / 分享 / 常见问题 / 功能介绍）、版本号、评分对话框（含统计与失败回退）、FAQ（展开 / 搜索）。
// 用法：python3 -m http.server 8765 &  然后  node tests/about-smoke.cjs [http://localhost:8765]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8765';
const PKG = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')).version;
const results = []; const rec = (n, ok, note) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const SEED = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'buddy-prefs': JSON.stringify({ on: false }) };
const CFG = "window.MOCHI_CFG={supabaseUrl:'https://fake.supabase.co',supabaseKey:'eyJfake',apiBase:''};";
const STATS = { total: 40, avg: 4.25, d: [1, 2, 2, 12, 23] };
const NAMES = { en: { rate: 'Rate Us', faq: 'FAQ & Help', abt: 'Features & open source' }, zh: { rate: '给 Mochi 评分', faq: '常见问题与帮助', abt: '功能介绍与开源' }, ms: { rate: 'Nilaikan Mochi', faq: 'Soalan lazim & bantuan', abt: 'Ciri & sumber terbuka' } };
async function open(browser, lang, mode, theme) {   // mode: cfg（假 Supabase，函数可用）| down（函数请求失败）| none（没配置）
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  const calls = [], errs = [];
  if (mode !== 'none') await ctx.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript', body: CFG }));
  await ctx.route('https://fake.supabase.co/**', async r => {
    const u = r.request().url(), body = r.request().postData();
    calls.push({ u, body, h: r.request().headers() });
    if (mode === 'down') return r.abort();
    if (/rating_stats/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(STATS) });
    if (/submit_rating/.test(u)) { const s = JSON.parse(body); const d = STATS.d.slice(); d[s.p_stars - 1]++; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: 41, avg: 4.27, d }) }); }
    return r.fulfill({ status: 404, body: '{}' });
  });
  await ctx.addInitScript(([s, l, th]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); localStorage.setItem('ui-lang', l); if (th) localStorage.setItem('mochi-theme-test', th); } }, [SEED, lang, theme || '']);
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|fake\.supabase/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1000);
  return { ctx, page, calls, errs };
}
const rows = page => page.evaluate(() => { const g = [...document.querySelectorAll('#dwr .dw-g')].pop(); return [...g.querySelectorAll('.dw-r')].map(b => b.querySelector('b').textContent.trim()); });
(async () => {
  const browser = await chromium.launch();
  for (const lang of ['en', 'zh', 'ms']) {
    const tag = '[' + lang + '] ', N = NAMES[lang];
    { const { ctx, page, errs } = await open(browser, lang, 'none');
      await page.evaluate(() => openMenu()); await page.waitForTimeout(300);
      const r = await rows(page);
      rec(tag + '“关于”分组顺序：评分 → 分享 → 常见问题 → 功能介绍', r[0] === N.rate && r[2] === N.faq && r[3] === N.abt && r.length >= 4, JSON.stringify(r));
      const ft = await page.evaluate(() => document.querySelector('#dwr .dw-ft').textContent);
      rec(tag + '菜单底部版本号 = package.json（' + PKG + '），不再是 v8.8.1', ft.includes('v' + PKG) && !/8\.8\.1/.test(ft), ft);
      await page.evaluate(() => { closeMenu(); showView('more'); }); await page.waitForTimeout(300);
      const mf = await page.evaluate(() => { const f = document.querySelector('#v-more .dw-ft'); return f && f.textContent });
      rec(tag + '“更多”页底部也显示版本号', !!mf && mf.includes('v' + PKG), mf);
      const ic = await page.evaluate(() => { const g = [...document.querySelectorAll('#v-more .dw-g')].pop(); return [...g.querySelectorAll('.dw-r i')].map(i => i.textContent.trim()) });
      const iconsSrc = fs.readFileSync(__dirname + '/../js/icons.js', 'utf8');   // 测试里 Lucide（CDN）加载不了，所以只检查：用的是 ⭐ / ❓，并且 icons.js 里有对应的线条图标映射
      rec(tag + '新入口用 ⭐ / ❓，icons.js 里有 star / circle-help 映射', ic[0] === '⭐' && ic[2] === '❓' && /\['⭐',\['star'\]\]/.test(iconsSrc) && /\['❓',\['circle-help'/.test(iconsSrc), JSON.stringify(ic));
      // FAQ
      await page.evaluate(() => openFaq()); await page.waitForTimeout(200);
      const f1 = await page.evaluate(() => ({ n: document.querySelectorAll('#mask-faq .fq-i').length, shown: document.getElementById('mask-faq').classList.contains('show'), ver: document.querySelector('#mask-faq .fq-v').textContent }));
      rec(tag + 'FAQ 打开，39 条问答，显示版本号', f1.shown && f1.n === 39 && f1.ver.includes(PKG), JSON.stringify(f1));
      await page.click('#mask-faq .fq-q'); 
      const ex = await page.evaluate(() => { const a = document.querySelector('#mask-faq .fq-a'); const b = document.querySelector('#mask-faq .fq-q'); return { vis: !a.hidden, exp: b.getAttribute('aria-expanded'), left: /\{\w+\}/.test(a.textContent), txt: a.textContent.slice(0, 60) } });
      rec(tag + '点问题展开答案，占位符都被替换', ex.vis && ex.exp === 'true' && !ex.left, ex.txt);
      const key = { en: 'alarm', zh: '闹钟', ms: 'penggera' }[lang];
      await page.fill('#mask-faq input', key);
      const fl = await page.evaluate(() => [...document.querySelectorAll('#mask-faq .fq-i')].filter(x => !x.hidden).length);
      rec(tag + '搜索「' + key + '」只剩提醒那条', fl === 1, 'visible=' + fl);
      await page.fill('#mask-faq input', 'zzzzqq');
      const nm = await page.evaluate(() => ({ none: !document.querySelector('#mask-faq .msg').hidden, vis: [...document.querySelectorAll('#mask-faq .fq-i')].filter(x => !x.hidden).length }));
      rec(tag + '搜不到时显示提示', nm.none && nm.vis === 0);
      await page.screenshot({ path: '/tmp/shots/faq-' + lang + '.png' });
      await page.keyboard.press('Escape');
      rec(tag + 'Esc 关闭 FAQ', await page.evaluate(() => !document.getElementById('mask-faq').classList.contains('show')));
      rec(tag + 'FAQ 页面无报错', errs.length === 0, errs.join(' | ')); await ctx.close(); }
    // 评分：云端可用
    { const { ctx, page, calls, errs } = await open(browser, lang, 'cfg');
      await page.evaluate(() => openRate()); await page.waitForTimeout(600);
      const s0 = await page.evaluate(() => ({ stars: document.querySelectorAll('#mask-rate .rt-s').length, avg: (document.querySelector('#mask-rate .rt-big b') || {}).textContent, bars: document.querySelectorAll('#mask-rate .rt-b').length, cnt: (document.querySelector('#mask-rate .rt-big small') || {}).textContent, fg: (document.querySelector('#mask-rate .rt-fg') || { style: {} }).style.width, go: document.querySelector('#mask-rate .acts .ok').textContent }));
      rec(tag + '评分：5 颗星 + 平均分 4.4 + 5 行分布 + 总数', s0.stars === 5 && s0.avg === '4.4' && s0.bars === 5 && /40/.test(s0.cnt), JSON.stringify(s0));
      rec(tag + '平均分星星填充 = 平均分 / 5（4.35 → 87%）', Math.abs(parseFloat(s0.fg) - 87) < 0.5, s0.fg);
      const rc = calls.find(c => /rating_stats/.test(c.u));
      rec(tag + '统计请求带 apikey', !!rc && rc.h.apikey === 'eyJfake');
      await page.click('#mask-rate .rt-s:nth-child(4)');
      const lb = await page.evaluate(() => ({ lbl: document.querySelector('#mask-rate .rt-lbl').textContent, on: document.querySelectorAll('#mask-rate .rt-s.on').length, chk: document.querySelector('#mask-rate .rt-s[aria-checked=true]') && document.querySelector('#mask-rate .rt-s[aria-checked=true]').getAttribute('aria-label') }));
      rec(tag + '点第 4 颗：4 颗亮、有文字提示', lb.on === 4 && !!lb.lbl && /^4/.test(lb.chk), JSON.stringify(lb));
      await page.click('#mask-rate .acts .ok'); await page.waitForTimeout(600);
      const sc = calls.find(c => /submit_rating/.test(c.u)), body = sc && JSON.parse(sc.body);
      rec(tag + '提交：stars=4、设备 ID 是 32 位十六进制、带版本号', !!body && body.p_stars === 4 && /^[0-9a-f]{32}$/.test(body.p_device) && body.p_version === PKG && body.p_platform === 'web', JSON.stringify(body));
      const af = await page.evaluate(() => ({ cnt: document.querySelector('#mask-rate .rt-big small').textContent, mine: !document.querySelector('#mask-rate .rt-mine').hidden, go: document.querySelector('#mask-rate .acts .ok').textContent, ls: Object.keys(localStorage).filter(k => /^app-rate/.test(k)), bad: Object.keys(localStorage).filter(k => /^mochi-.*rate/.test(k)), rec: JSON.parse(localStorage.getItem('app-rate')) }));
      rec(tag + '提交后统计刷新为 41、显示“你的评分”、按钮变“更新”', /41/.test(af.cnt) && af.mine && af.go !== s0.go && af.rec.stars === 4 && af.rec.synced === true, JSON.stringify(af));
      rec(tag + '评分只写 app-rate*，不碰 mochi-（不进云同步 / 备份）', af.ls.length >= 2 && af.bad.length === 0, af.ls.join(','));
      await page.screenshot({ path: '/tmp/shots/rate-' + lang + '.png' });
      await page.keyboard.press('Escape'); await page.evaluate(() => openRate()); await page.waitForTimeout(300);
      const re = await page.evaluate(() => document.querySelectorAll('#mask-rate .rt-s.on').length);
      rec(tag + '再次打开记得上次的 4 星', re === 4, 'on=' + re);
      rec(tag + '评分页面无报错', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  }
  // 评分：云端函数失败（没建函数 / 没网）
  { const { ctx, page, calls, errs } = await open(browser, 'en', 'down');
    await page.evaluate(() => openRate()); await page.waitForTimeout(900);
    const o = await page.evaluate(() => ({ txt: document.querySelector('#mask-rate .rt-stats').textContent, retry: !!document.querySelector('#mask-rate .rt-stats button') }));
    rec('[down] 统计失败：显示“暂时看不到” + 重试按钮', /aren.t available/.test(o.txt) && o.retry, o.txt);
    await page.click('#mask-rate .rt-s:nth-child(5)'); await page.click('#mask-rate .acts .ok'); await page.waitForTimeout(700);
    const d = await page.evaluate(() => ({ msg: document.querySelector('#mask-rate .rt-msg').textContent, rec: JSON.parse(localStorage.getItem('app-rate')), dis: document.querySelector('#mask-rate .acts .ok').disabled }));
    rec('[down] 提交失败：先存本机（synced=false），提示联网后补发，按钮可再点', /Saved on this device/.test(d.msg) && d.rec.stars === 5 && d.rec.synced === false && !d.dis, JSON.stringify(d));
    rec('[down] 失败时没有未捕获的报错', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  { const { ctx, page, errs } = await open(browser, 'en', 'none');
    await page.evaluate(() => openRate()); await page.waitForTimeout(500);
    const o = await page.evaluate(() => document.querySelector('#mask-rate .rt-stats').textContent);
    rec('[none] 没配置云端：不崩，显示“暂时看不到”', /aren.t available/.test(o), o);
    await page.click('#mask-rate .acts .ok'); const m = await page.evaluate(() => document.querySelector('#mask-rate .rt-msg').textContent);
    rec('[none] 没点星星直接提交：提示先点星星', /Tap a star first/.test(m), m);
    rec('[none] 无报错', errs.length === 0, errs.join(' | ')); await ctx.close(); }
  await browser.close();
  const bad = results.filter(x => !x).length; console.log('\n' + (results.length - bad) + '/' + results.length + ' passed'); process.exit(bad ? 1 : 0);
})();
