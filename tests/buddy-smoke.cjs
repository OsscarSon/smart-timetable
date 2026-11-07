// Mochi Buddy 真浏览器冒烟测试。用法：先在项目根目录起一个静态服务（python3 -m http.server 8765），再
//   node tests/buddy-smoke.cjs [http://localhost:8765] [截图目录]
// 需要 Playwright（开发依赖，不进入 App 包）。CDN 脚本在受限网络里会被拦截，应用本身对缺失的库有降级，所以这里把 CDN 请求直接中止，
// 并用“关闭 Buddy 的同一流程”作基线：Buddy 开着时不得比基线多出任何 pageerror / console.error。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://localhost:8765', OUT = process.argv[3] || path.join(__dirname, '..', 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const MON = new Date('2026-11-09T10:30:00'); // 周一，固定时间保证可复现
const results = []; const rec = (name, ok, note) => { results.push({ name, ok: !!ok, note: note || '' }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? '  — ' + note : '')); };

async function open(browser, { vp = { width: 390, height: 844 }, storage = {}, scheme = 'light', reduced = 'no-preference', time = MON } = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: reduced, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  const errs = [];
  await ctx.addInitScript(([st, t]) => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(st).forEach(k => localStorage.setItem(k, st[k])); } }, [storage, +time]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(time);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1500);
  return { ctx, page, errs };
}
const EXISTING = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0' };
const addEv = (page, s, e, t) => page.evaluate(([s, e, t]) => { data.push({ day: todayIdx, s, e, t, c: 0 }); save(); draw(); }, [s, e, t]);
const rect = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, vis: getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none' && r.width > 0 }; }, sel);
const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const mochiKeys = page => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf('mochi-') === 0) o[k] = localStorage.getItem(k); } return JSON.stringify(o); });
const bdHidden = page => page.evaluate(() => { const e = document.querySelector('.bd'); return !e || e.classList.contains('bd-hide'); });

(async () => {
  const browser = await chromium.launch();
  // 0. 基线：Buddy 关闭
  let base;
  { const { ctx, page, errs } = await open(browser, { storage: { ...EXISTING, 'buddy-prefs': JSON.stringify({ on: false }) } });
    for (const v of ['hw', 'sp', 'sta', 'more', 'tt']) { await page.evaluate(v => showView(v), v); await page.waitForTimeout(150); }
    base = errs.slice(); rec('基线(Buddy 关)：无 .bd 节点', (await page.$('.bd')) === null); await ctx.close(); }
  console.log('baseline errors:', base.length, base.slice(0, 3));

  // A. 全新用户
  { const { ctx, page, errs } = await open(browser, {});
    const wiz = await page.evaluate(() => { const m = document.getElementById('mask4'); return m && m.classList.contains('show'); });
    rec('A1 全新用户：向导出现', wiz);
    await page.waitForTimeout(300); rec('A2 全新用户：向导期间 Buddy 让位', await bdHidden(page));
    await page.screenshot({ path: OUT + '/A-fresh-wizard.png' }); await ctx.close(); }

  // B. 老用户，无日程
  { const { ctx, page, errs } = await open(browser, { storage: EXISTING });
    rec('B1 老用户：Buddy 出现且为 rest', !(await bdHidden(page)) && (await page.getAttribute('.bd', 'data-state')) === 'rest');
    const before = await mochiKeys(page);
    await page.click('.bd-btn'); await page.waitForTimeout(250);
    const txt = await page.textContent('.bd-bubble p'); rec('B2 点击：气泡为英文默认文案', /Nothing planned today/.test(txt), txt);
    rec('B3 气泡只有 1–2 句 + 一个主按钮', (txt.match(/[.!?]/g) || []).length <= 2 && (await page.$$('.bd-act')).length === 1);
    await page.screenshot({ path: OUT + '/B-bubble-mobile.png' });
    await page.click('.bd-act'); await page.waitForTimeout(250);
    rec('B4 “Add a plan” 只打开原有 ＋ 菜单', await page.evaluate(() => !document.getElementById('fabm').hidden));
    rec('B5 交互后数据未被改动', before === (await mochiKeys(page)));
    rec('B6 ＋ 菜单展开时 Buddy 让位', await bdHidden(page));
    rec('B7 偏好键不带 mochi- 前缀(不参与云同步)', await page.evaluate(() => { localStorage.getItem('buddy-prefs'); return Object.keys(localStorage).every(k => k.indexOf('mochi-') !== 0 || !/buddy/.test(k)); }));
    await ctx.close(); }

  // C. 进行中 / 冲突 / 冷却 / 让位
  { const { ctx, page, errs } = await open(browser, { storage: EXISTING });
    await addEv(page, 10 * 60, 11 * 60, 'Study'); await page.waitForTimeout(400); await page.evaluate(() => MochiBuddy.refresh());
    rec('C1 进行中 → focus', (await page.getAttribute('.bd', 'data-state')) === 'focus');
    await page.click('.bd-btn'); const t = await page.textContent('.bd-bubble p'); rec('C2 focus 文案含标题与结束时间', /Study/.test(t) && /11:00/.test(t), t); await page.click('.bd-x');
    await addEv(page, 10 * 60 + 30, 11 * 60 + 30, 'Gym'); await page.waitForTimeout(500);
    rec('C3 重叠 → warning', (await page.getAttribute('.bd', 'data-state')) === 'warning');
    const pro = await page.evaluate(() => !document.querySelector('.bd-bubble').hidden);
    rec('C4 冲突时主动提示一次', pro); await page.screenshot({ path: OUT + '/C-warning-mobile.png' });
    await page.click('.bd-x'); await page.evaluate(() => MochiBuddy.refresh()); await page.waitForTimeout(200);
    rec('C5 冷却：关掉后不再主动弹', await page.evaluate(() => document.querySelector('.bd-bubble').hidden));
    const before = await mochiKeys(page);
    await page.click('.bd-btn'); await page.click('.bd-act'); await page.waitForTimeout(200);
    rec('C6 “Open today” 不写数据', before === (await mochiKeys(page)));
    // 让位
    await page.click('#burger'); await page.waitForTimeout(350); rec('C7 菜单抽屉打开时让位', await bdHidden(page)); await page.mouse.click(385, 420); await page.waitForTimeout(350);
    await page.click('#fab'); await page.click('#fm0'); await page.waitForTimeout(400); rec('C8 编辑弹窗打开时让位', await bdHidden(page));
    await page.screenshot({ path: OUT + '/C-dialog-hidden.png' });
    await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelectorAll('.mask.show').forEach(m => m.classList.remove('show'))); await page.waitForTimeout(300);
    rec('C9 关闭弹窗后 Buddy 回来', !(await bdHidden(page)));
    await page.click('#srchb'); await page.waitForTimeout(300); const inp = await page.$('#mask7 input'); if (inp) { await inp.focus(); await page.waitForTimeout(200); }
    rec('C10 搜索弹窗/输入框聚焦时让位', await bdHidden(page));
    await ctx.close(); rec('C11 Buddy 开启时无新增 pageerror/console.error', errs.filter(e => !base.includes(e)).length === 0, errs.filter(e => !base.includes(e)).join(' | ')); }

  // D. 版面：不遮挡 ＋ 按钮和底栏（手机 + 桌面）
  for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    for (const side of ['right', 'left']) {
      const { ctx, page } = await open(browser, { vp, storage: { ...EXISTING, 'buddy-prefs': JSON.stringify({ side }) } });
      await addEv(page, 9 * 60, 10 * 60, 'x'); await page.waitForTimeout(300);
      const b = await rect(page, '.bd-btn'), f = await rect(page, '#fab'), tb = await rect(page, '.tabbar');
      rec(`D 版面 ${vp.width}x${vp.height} ${side}：不压住 ＋ 与底栏、在屏幕内`, b && b.vis && !hit(b, f) && !hit(b, tb) && b.x >= 0 && b.x + b.w <= vp.width && b.y >= 0, JSON.stringify({ b, f }));
      if (vp.width !== 360 || side === 'left') await page.screenshot({ path: `${OUT}/D-${vp.width}-${side}.png` });
      await page.click('.bd-btn'); const bb = await rect(page, '.bd-bubble'); rec(`D 气泡 ${vp.width} ${side}：在屏幕内`, bb && bb.x >= 0 && bb.x + bb.w <= vp.width + 0.5, JSON.stringify(bb));
      await ctx.close();
    }
  }

  // E. 其他页面：不空白、Buddy 不挡底栏
  { const { ctx, page, errs } = await open(browser, { storage: EXISTING });
    for (const v of ['hw', 'sp', 'sta', 'more', 'se']) { await page.evaluate(v => showView(v), v); await page.waitForTimeout(250);
      const ok = await page.evaluate(v => { const e = document.getElementById('v-' + v); return e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 40; }, v);
      const b = await rect(page, '.bd-btn'), tb = await rect(page, '.tabbar'); rec(`E 页面 ${v}：非空白且 Buddy 不压底栏`, ok && !hit(b, tb)); }
    await page.evaluate(() => showView('sta')); await page.screenshot({ path: OUT + '/E-stats.png' }); await ctx.close();
    rec('E 其他页面无新增错误', errs.filter(e => !base.includes(e)).length === 0, errs.filter(e => !base.includes(e)).join(' | ')); }

  // F. 设置开关 / 记忆 / 静音 / 平静
  { const { ctx, page } = await open(browser, { storage: EXISTING });
    await page.evaluate(() => showView('se')); await page.evaluate(() => { const b = [...document.querySelectorAll('#seidx .mrow')][0]; b && b.click(); }); await page.waitForTimeout(200);
    const rows = await page.$$('.sec[data-sec="look"] .bd-set ~ label.tp'); rec('F1 设置页出现 Buddy 的 4 项设置', rows.length === 4, String(rows.length));
    await page.screenshot({ path: OUT + '/F-settings.png', fullPage: false });
    const chk = await page.$$('.sec[data-sec="look"] .bd-set ~ label.tp input[type=checkbox]');
    await chk[2].click(); rec('F2 平静模式：data-calm=1', (await page.getAttribute('.bd', 'data-calm')) === '1');
    rec('F3 平静模式：动画已停', await page.evaluate(() => getComputedStyle(document.querySelector('.bd-body')).animationName === 'none'));
    await chk[1].click(); await page.reload(); await page.waitForTimeout(1500);
    rec('F4 静音/平静 刷新后保持', await page.evaluate(() => { const p = MochiBuddy.prefs(); return p.mute && p.calm; }));
    await page.evaluate(() => showView('se')); await page.evaluate(() => [...document.querySelectorAll('#seidx .mrow')][0].click());
    const chk2 = await page.$$('.sec[data-sec="look"] .bd-set ~ label.tp input[type=checkbox]'); await chk2[0].click();
    rec('F5 关闭开关：节点消失', (await page.$('.bd')) === null);
    await page.reload(); await page.waitForTimeout(1500); rec('F6 关闭状态刷新后仍然关闭', (await page.$('.bd')) === null);
    await ctx.close(); }

  // G. 减少动态（系统偏好）
  { const { ctx, page } = await open(browser, { storage: EXISTING, reduced: 'reduce' });
    rec('G1 系统 reduce-motion：动画全部停止', await page.evaluate(() => [...document.querySelectorAll('.bd-body,.bd-eyes')].every(e => getComputedStyle(e).animationName === 'none')));
    await ctx.close(); }

  // H. 多语言 + 暗色
  for (const lang of ['zh', 'ms']) {
    const { ctx, page } = await open(browser, { storage: { ...EXISTING, 'ui-lang': lang } });
    await page.click('.bd-btn'); const t = await page.textContent('.bd-bubble p'); const b = await page.textContent('.bd-act');
    rec(`H ${lang}：气泡与按钮为该语言`, lang === 'zh' ? /[一-鿿]/.test(t) && /[一-鿿]/.test(b) : /Tiada rancangan/.test(t) && /Tambah/.test(b), t + ' / ' + b);
    await page.screenshot({ path: `${OUT}/H-${lang}.png` }); await ctx.close();
  }
  { const { ctx, page } = await open(browser, { storage: { ...EXISTING, 'mochi-set': JSON.stringify({ wiz: true, theme: 'dark' }) }, scheme: 'dark' });
    await addEv(page, 10 * 60, 11 * 60, 'Study'); await addEv(page, 10 * 60 + 30, 11 * 60 + 30, 'Gym'); await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + '/H-dark-warning.png' }); await ctx.close(); }

  // I. 全部 8 种状态逐一渲染（回退图不依赖任何外部资源）
  { const { ctx, page } = await open(browser, { storage: EXISTING });
    const n = await page.evaluate(() => MochiBuddyArt.STATES.every(s => { const d = document.createElement('div'); d.innerHTML = MochiBuddyArt.svg(s); return d.querySelector('svg') && d.querySelectorAll('*').length > 8; }));
    rec('I 8 种状态 SVG 全部可生成', n); await ctx.close(); }

  await browser.close();
  const bad = results.filter(r => !r.ok); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  console.log(`\n${results.length - bad.length}/${results.length} 通过` + (bad.length ? '；失败：' + bad.map(b => b.name).join('；') : ''));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
