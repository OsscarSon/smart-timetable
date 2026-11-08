// Goals Phase 1 真浏览器测试（Playwright / Chromium）。用法：python3 -m http.server 8765 &  然后  node tests/goals-smoke.cjs [http://localhost:8765]
// CDN 脚本被拦截（应用对缺失库有降级）；以“不打开 Goals 的同一流程”作基线，Goals 不得增加 pageerror / console.error。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8765', MON = new Date('2026-11-09T10:30:00');
const results = []; const rec = (n, ok, note) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const SEED = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0',
  'mochi-st': JSON.stringify({ subs: ['Bahasa Melayu', 'Matematik', 'Sejarah'], topics: [], ex: { 'Bahasa Melayu': '2026-11-30', 'Matematik': '2026-12-05' } }),
  'mochi-hw': JSON.stringify([{ id: 'h1', t: 'HW', sb: '', due: '', done: 0, ts: 1, note: '', link: '' }]) };
async function open(browser, { vp = { width: 390, height: 844 }, storage = SEED, lang } = {}) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block' });
  await ctx.route(/cdn\.jsdelivr\.net|googleapis|gstatic|esm\.sh/, r => r.abort());
  const errs = [], st = Object.assign({}, storage); if (lang) st['ui-lang'] = lang;
  await ctx.addInitScript(([s]) => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); } }, [st]);
  const page = await ctx.newPage(); await page.clock.setFixedTime(MON);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1200); return { ctx, page, errs };
}
const keys = (page, pre) => page.evaluate(p => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf(p) === 0) o[k] = localStorage.getItem(k); } return o; }, pre);
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : null; }, sel);

(async () => {
  const browser = await chromium.launch();
  // ---- 基线：不打开 Goals ----
  const base = await open(browser); const baseErrs = base.errs.slice(); await base.ctx.close();

  const { ctx, page, errs } = await open(browser);
  const mochi0 = await keys(page, 'mochi-');
  // 1 菜单入口
  await page.evaluate(() => showView('more')); await page.waitForTimeout(200);
  rec('「更多」页里有 Goals 入口', /Goals/.test(await txt(page, '#v-more') || ''));
  // 2 打开 / 横幅 / Buddy 让位
  await page.evaluate(() => openGoals()); await page.waitForTimeout(200);
  rec('打开 Goals，标题与副标题（英文默认）', /Turn goals into time\./.test(await txt(page, '.gl-mask') || '') && /Tell Mochi what you want to achieve\./.test(await txt(page, '.gl-mask')));
  rec('列表页说明：保存在本设备，登录云同步后跟随到其他设备（v9.5 / v9.6）', /Saved on this device\. When you are signed in[\s\S]*time slots follow you/.test(await txt(page, '.gl-mask')));
  rec('Goals 打开时 Buddy 让位', await page.evaluate(() => { const e = document.querySelector('.bd'); return !e || e.classList.contains('bd-hide'); }));
  rec('空状态提示', /No goals yet/.test(await txt(page, '.gl-mask')));
  // 3 新建（模板）→ 编辑页也有横幅
  await page.click('.gl-primary'); await page.waitForTimeout(100);
  rec('模板页有 3 个模板 + 空白', (await page.$$('.gl-tpl')).length === 4);
  await page.click('text=Prepare for exams'); await page.waitForTimeout(150);
  rec('编辑页同样有同步说明', /Saved on this device\. When you are signed in/.test(await txt(page, '.gl-mask')));
  rec('模板带入 Study 空间与示例标题/步骤', await page.evaluate(() => document.querySelector('.gl-sec input').value === 'Exam revision' && document.querySelectorAll('.gl-step').length === 1));
  // 4 取消 = 零写入
  const goalsBefore = Object.keys(await keys(page, 'goals-')).length;
  await page.fill('.gl-sec input', 'Temp'); await page.click('.gl-x'); await page.waitForTimeout(150);
  rec('编辑后取消（确认放弃）→ 零写入，回到列表', Object.keys(await keys(page, 'goals-')).length === goalsBefore && /Turn goals into time/.test(await txt(page, '.gl-mask')));
  // 5 空标题校验
  await page.click('.gl-primary'); await page.click('text=Blank goal'); await page.waitForTimeout(100); await page.click('.gl-save'); await page.waitForTimeout(100);
  rec('空标题保存被拒绝并提示，且没有写入', /give your goal a name/.test(await txt(page, '.gl-mask')) && Object.keys(await keys(page, 'goals-')).length === 0);
  // 6 SPM：添加我的科目 + 估时 + 完成
  await page.fill('.gl-sec input', 'SPM revision'); await page.click('text=Add my subjects'); await page.waitForTimeout(150);
  rec('从「学习」读入 3 个科目，各科考试日不同', await page.evaluate(() => { const r = [...document.querySelectorAll('.gl-step')]; return r.length === 3 && r[0].querySelector('input[type=date]').value === '2026-11-30' && r[1].querySelector('input[type=date]').value === '2026-12-05' && r[2].querySelector('input[type=date]').value === ''; }));
  const est = page.locator('.gl-step').nth(0).locator('input[type=number]').nth(0);
  await est.fill('120'); await est.blur(); await page.waitForTimeout(100);
  await page.locator('.gl-step').nth(1).locator('input[type=number]').nth(0).fill('60'); await page.locator('.gl-step').nth(1).locator('input[type=number]').nth(1).fill('90'); await page.locator('.gl-step').nth(1).locator('input[type=number]').nth(1).blur(); await page.waitForTimeout(100);
  await page.locator('.gl-step').nth(1).locator('input[type=checkbox]').nth(0).check(); await page.waitForTimeout(100);  // “这是估计值”
  rec('估计值显示 “Estimated — please check”', /Estimated — please check/.test(await txt(page, '.gl-step:nth-child(2)') || ''));
  rec('没填估时的步骤不能标记完成', await page.locator('.gl-step').nth(2).locator('input[type=checkbox]').nth(1).isDisabled());
  await page.locator('.gl-step').nth(0).locator('input[type=checkbox]').nth(1).check(); await page.waitForTimeout(100);
  rec('合计与进度实时更新（120 / 180 分钟 → 67%）', /Total estimate: 3h/.test(await txt(page, '.gl-total')) && /67% done/.test(await txt(page, '.gl-total')));
  await page.click('.gl-save'); await page.waitForTimeout(200);
  const g1 = await keys(page, 'goals-g:'); const gk = Object.keys(g1);
  rec('保存后列表显示卡片 + 进度 + “Saved on this device”', /SPM revision/.test(await txt(page, '.gl-mask')) && /67% done/.test(await txt(page, '.gl-mask')) && /Saved on this device\./.test(await txt(page, '.gl-mask')));
  const saved = gk.length === 1 && JSON.parse(g1[gk[0]]);
  rec('存储：goals-g:<uuid>，含 uuid / rev=1 / updatedAt / schemaVersion / 3 步', saved && /^goals-g:[0-9a-f-]{36}$/.test(gk[0]) && saved.rev === 1 && !!saved.updatedAt && saved.schemaVersion === 1 && saved.steps.length === 3 && saved.steps[1].estimateMaxMin === 90 && saved.steps[1].assumed === true, saved ? JSON.stringify({ rev: saved.rev, n: saved.steps.length, s1: saved.steps[1], key: gk[0] }) : 'none');
  const mochi1 = await keys(page, 'mochi-');
  const noMeta = o => { const r = Object.assign({}, o); delete r['mochi-sync-meta']; return r; };
  rec('旧数据（mochi-*：学习、作业…）与使用 Goals 前逐字节一致（v9.5：同步簿记 mochi-sync-meta 除外）', JSON.stringify(noMeta(mochi0)) === JSON.stringify(noMeta(mochi1)));
  { const m = k => { try { return Object.keys(JSON.parse((k || {})['mochi-sync-meta'] || '{}')); } catch (e) { return ['?']; } };
    rec('v9.5：同步簿记里新增的条目只有 goals-g:*（没有别的旧键被牵连）', m(mochi1).filter(k => m(mochi0).indexOf(k) < 0).every(k => k.indexOf('goals-g:') === 0)); }
  rec('v9.5：只有目标本体（goals-g:*）进入同步范围；goals-meta / goals-links / goals-prefs 不会', await page.evaluate(() => { let ok = true; const bad = ['goals-meta', 'goals-links', 'goals-prefs', 'goals-plan-prefs']; try { const m = JSON.parse(localStorage.getItem('mochi-sync-meta') || '{}'); ok = !Object.keys(m).some(k => bad.indexOf(k) >= 0); } catch (e) {} return ok; }));
  // 7 刷新后仍在（离线可看已存草稿：数据全在 localStorage）
  await page.reload(); await page.waitForTimeout(1200); await page.evaluate(() => openGoals()); await page.waitForTimeout(200);
  rec('刷新后草稿仍在，进度仍为 67%', /SPM revision/.test(await txt(page, '.gl-mask')) && /67% done/.test(await txt(page, '.gl-mask')));
  // 8 筛选
  await page.click('.gl-chips .chip:nth-child(3)'); await page.waitForTimeout(100);
  rec('空间筛选：Work 下没有 Study 的目标', /No goals in this space/.test(await txt(page, '.gl-mask')));
  await page.click('.gl-chips .chip:nth-child(1)'); await page.waitForTimeout(100);
  // 9 编辑页：上移步骤、改状态、再保存 → rev=2
  await page.click('.gl-card'); await page.waitForTimeout(100);
  await page.locator('.gl-step').nth(1).locator('button[aria-label="Move step up"]').click(); await page.selectOption('.gl-mask select', 'active'); await page.click('.gl-save'); await page.waitForTimeout(200);
  const g2 = JSON.parse(Object.values(await keys(page, 'goals-g:'))[0]);
  rec('编辑再保存：rev=2、状态 active、步骤顺序已变', g2.rev === 2 && g2.status === 'active' && g2.steps[0].title === 'Matematik');
  // 10 备份导出 / 删除 / 另一个干净浏览器恢复
  await page.click('text=Back up or restore'); await page.waitForTimeout(100);
  const dump = await page.evaluate(() => document.querySelector('.gl-ta').value);
  rec('导出文本含 app 标记与目标', /"app": "mochi-goals"/.test(dump) && /SPM revision/.test(dump));
  const fresh = await open(browser);
  await fresh.page.evaluate(() => openGoals()); await fresh.page.click('text=Back up or restore'); await fresh.page.locator('\.gl-mask textarea:not([readonly])').fill(dump); await fresh.page.locator('.gl-mask .gl-secondary', { hasText: /^Restore$/ }).click(); await fresh.page.waitForTimeout(200);
  rec('在新环境粘贴备份可恢复 1 个目标', /Added 1/.test(await txt(fresh.page, '.gl-mask')) && Object.keys(await keys(fresh.page, 'goals-g:')).length === 1);
  await fresh.page.fill('\.gl-mask textarea:not([readonly])', 'garbage'); await fresh.page.locator('.gl-mask .gl-secondary', { hasText: /^Restore$/ }).click(); await fresh.page.waitForTimeout(100);
  rec('垃圾文本被拒绝', /not a valid Mochi Goals backup/.test(await txt(fresh.page, '.gl-mask')));
  await fresh.ctx.close();
  await page.click('.gl-x'); await page.waitForTimeout(100); await page.click('.gl-card'); await page.waitForTimeout(100); await page.click('.gl-danger'); await page.waitForTimeout(200);
  const tomb = JSON.parse(Object.values(await keys(page, 'goals-g:'))[0]);
  rec('删除：列表消失，存储保留墓碑（deletedAt, rev=3）', /No goals yet/.test(await txt(page, '.gl-mask')) && !!tomb.deletedAt && tomb.rev === 3);
  // 11 Esc 关闭
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  rec('Esc 关闭 Goals，恢复 Buddy / 页面', (await page.$('.gl-mask')) === null);
  // 12 原有页面仍能切换且无新增报错
  for (const v of ['tt', 'hw', 'st', 'sta', 'more']) { await page.evaluate(x => showView(x), v); await page.waitForTimeout(120); }
  rec('原有 5 个页面可切换', await page.evaluate(() => document.getElementById('v-more').style.display !== 'none'));
  rec('与“不打开 Goals”基线相比无新增 pageerror/console.error', errs.length <= baseErrs.length, errs.filter(e => baseErrs.indexOf(e) < 0).join(' | '));
  await ctx.close();

  // ---- 多语言 ----
  for (const [lang, re] of [['zh', /把目标变成时间。[\s\S]*保存在这台设备上。登录云同步后/], ['ms', /Jadikan matlamat masa\.[\s\S]*Disimpan pada peranti ini\. Apabila anda log masuk/]]) {
    const L = await open(browser, { lang }); await L.page.evaluate(() => openGoals()); await L.page.waitForTimeout(200);
    rec(lang + '：界面与“仅本设备”提示已本地化', re.test(await txt(L.page, '.gl-mask') || ''));
    await L.page.click('.gl-primary'); await L.page.click('.gl-tpl >> nth=0'); await L.page.waitForTimeout(100);
    rec(lang + '：编辑页已本地化（无英文回退键名）', !/\b(errTitle|goalLbl|stepsH)\b/.test(await txt(L.page, '.gl-mask')));
    await L.ctx.close();
  }
  // ---- 小屏 / 大屏：无横向溢出，保存键可见 ----
  for (const vp of [{ width: 360, height: 640 }, { width: 1280, height: 800 }]) {
    const V = await open(browser, { vp }); await V.page.evaluate(() => openGoals()); await V.page.click('.gl-primary'); await V.page.click('text=Prepare for exams'); await V.page.waitForTimeout(150);
    const m = await V.page.evaluate(() => { const w = document.querySelector('.gl-wrap'), s = document.querySelector('.gl-save').getBoundingClientRect(); return { over: w.scrollWidth > w.clientWidth + 1, save: s.x >= 0 && s.x + s.width <= innerWidth && s.height >= 40 }; });
    rec(`${vp.width}px：无横向溢出，Save 在屏内且 ≥40px 高`, !m.over && m.save); await V.ctx.close();
  }
  // ---- 关闭开关：入口消失，数据保留 ----
  const O = await open(browser, { storage: Object.assign({}, SEED, { 'goals-prefs': '{"on":false}', ['goals-g:aaaaaaaa-1111']: JSON.stringify({ id: 'aaaaaaaa-1111', title: 'keep', rev: 1 }) }) });
  await O.page.evaluate(() => showView('more')); await O.page.waitForTimeout(150);
  rec('Goals 关闭后「更多」里不再出现，已存数据仍在', !/Goals/.test(await txt(O.page, '#v-more') || '') && Object.keys(await keys(O.page, 'goals-g:')).length === 1); await O.ctx.close();
  await browser.close();
  const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 通过`); process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
