// Work Space / Life Space（v9.8.8）浏览器冒烟测试：真 index.html + 真数据路径，不截图。
// 用法：python3 -m http.server 8766 &  然后  node tests/spaces-smoke.cjs [http://localhost:8766]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.argv[2] || 'http://localhost:8766';
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const DN = d => Math.floor(Date.UTC(d[0], d[1] - 1, d[2]) / 864e5), TODAY = DN([2026, 11, 9]), W = Math.floor((TODAY + 3) / 7), ISO = '2026-11-09';
const iso = n => new Date((TODAY + n) * 864e5).toISOString().slice(0, 10);
const WKKEY = 'mochi-wk:main:' + W;

// 一周课表：周一（今天）3 个真活动 + 1 个自动排的学习时段（不该出现）；周二 1 个；固定课程不算
const EVENTS = [
  { day: 0, s: 540, e: 600, t: 'Planning call', c: 'mint' },                    // 09:00–10:00（标记完成）
  { day: 0, s: 840, e: 870, t: 'Client sync', c: 'pink' },                      // 14:00–14:30（下一项）
  { day: 0, s: 1020, e: 1080, t: 'Evening walk', c: 'sky' },                    // 17:00–18:00
  { day: 0, s: 1140, e: 1200, t: 'Physics·做题', c: 'mint', a: 1 },              // 自动排的学习时段：学习空间的东西
  { day: 1, s: 600, e: 660, t: 'Tuesday errand', c: 'peach' }                   // 明天
];
function seed(o) {
  o = o || {};
  const s = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0' };
  s['mochi-profile'] = JSON.stringify({ modes: o.modes || ['study', 'work', 'life'] });
  if (!o.empty) {
    s[WKKEY] = JSON.stringify(EVENTS);
    s['mochi-dn'] = JSON.stringify({ __v: 2, [W + '-0-540-Planning call']: 1 });
    s['mochi-bt'] = JSON.stringify({ am: ['Cleanser', 'Moisturizer', 'Sunscreen'], pm: ['Remove makeup', 'Cleanser'], log: { [ISO]: { am: [0] } } });
    s['mochi-di'] = JSON.stringify({ kcal: 2000, water: 8, days: { [ISO]: { w: 3, m: [] } } });
    s['mochi-energy-v1'] = JSON.stringify({ [ISO]: { level: 'low', updated: 1 } });
    s['goals-g:abcd1234wxyz'] = JSON.stringify({ id: 'abcd1234wxyz', space: 'work', title: 'Portfolio launch', status: 'active', deadline: iso(5), steps: [{ id: 'step-0001', title: 'Draft', estimateMin: 120, doneMin: 60 }], rev: 1 });
    s['goals-g:efgh5678stuv'] = JSON.stringify({ id: 'efgh5678stuv', space: 'study', title: 'Exam prep', status: 'active', deadline: iso(9), steps: [{ id: 'step-0002', title: 'Read', estimateMin: 60, doneMin: 0 }], rev: 1 });
  } else {
    s['mochi-bt'] = JSON.stringify({ am: [], pm: [], log: {} });
  }
  return s;
}
async function open(browser, sd, o) {
  o = o || {};
  const ctx = await browser.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, serviceWorkers: 'block', reducedMotion: o.rm ? 'reduce' : 'no-preference', colorScheme: o.dark ? 'dark' : 'light' });
  await ctx.route(/cdn\.jsdelivr|googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.addInitScript(([s, lang]) => { if (!sessionStorage.getItem('__s')) { sessionStorage.setItem('__s', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); localStorage.setItem('ui-lang', lang || 'en'); } }, [sd, o.lang || 'en']);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(m.text()); });
  await page.clock.setFixedTime(new Date('2026-11-09T10:30:00')); await page.goto(BASE + '/index.html'); await page.waitForTimeout(1100);
  return { ctx, page, errs };
}
const view = p => p.evaluate(() => document.body.getAttribute('data-view'));
const tab = async (p, v) => { await p.click('.tabbar [data-v="' + v + '"]'); await p.waitForTimeout(250); };
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const text = (p, sel) => p.locator(sel).first().innerText();
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const switchTo = async (p, re) => { await p.locator('#v-ss .spc-swb, #v-wk .spc-swb, #v-lf .spc-swb').filter({ hasText: re }).locator('visible=true').first().click(); await p.waitForTimeout(250); };
const DEMO = /Portfolio refresh|Client proposal|Team check-in|Morning planning|Project deep work|Drink water|Move your body|Read something lovely|Unplug before bed|Afternoon walk|Make dinner|Evening journal|illustrative|Preview only|Design preview/i;

(async () => {
  const browser = await chromium.launch();

  // ===== 1 落点、切换条、Work 页真实数据 =====
  {
    const { ctx, page, errs } = await open(browser, seed());
    await tab(page, 'hw');
    rec('1.1 三个模式都选：底部“学习”仍落在学习空间，学习工作台还在', (await view(page)) === 'ss' && !!(await page.$('.study-space-hero')));
    const labels = await page.$$eval('#v-ss .spc-swb', b => b.map(x => x.textContent.trim()));
    rec('1.2 学习空间顶部有切换条（学习 / 工作 / 生活），当前是学习', labels.length === 3 && /Study/.test(labels[0]) && (await page.$eval('#v-ss .spc-swb.spc-on', b => b.textContent)).includes('Study'), labels.join('|'));
    rec('1.3 学习空间原有的分段按钮（工作台 / 作业 / 复习计划）还在', (await page.$$('#v-ss .seg button')).length === 3);
    await switchTo(page, /Work/);
    rec('1.4 切到 Work：data-view = wk，底部“学习”标签保持高亮', (await view(page)) === 'wk' && (await page.$eval('.tabbar [data-v="hw"]', b => b.classList.contains('on'))));
    rec('1.5 Work：hero 用现有 work-mode.webp，不是预览里的假图', (await page.$eval('#v-wk .spc-hero-img', i => /assets\/work-mode\.webp$/.test(i.getAttribute('src')))));
    const stats = await page.$$eval('#v-wk .spc-stat', s => s.map(x => ({ n: x.querySelector('.spc-num').textContent, l: x.querySelector('.spc-lbl').textContent, s: (x.querySelector('.spc-sub2') || {}).textContent || '' })));
    rec('1.6 今日安排 = 3（真活动；自动排的学习时段不算）', stats[0].n === '3' && /1 done/.test(stats[0].s), JSON.stringify(stats[0]));
    rec('1.7 下一项 = 14:00 的 Client sync', /2:00pm|14:00/.test(stats[1].n) && /Client sync/.test(stats[1].s), JSON.stringify(stats[1]));
    // 周一 60+30+60 = 150，周二 60 → 210 分钟 = 3.5h
    rec('1.8 本周已排时间 = 3.5h（并集，标明是“已排”）', stats[2].n === '3.5h' && /Scheduled/.test(stats[2].l), JSON.stringify(stats[2]));
    rec('1.9 页面写明“已排时间不是实际工作时长”', /not time actually worked/.test(await text(page, '#v-wk .spc-note')));
    const flow = await page.$$eval('#v-wk .spc-row', r => r.map(x => x.querySelector('.spc-row-n').textContent));
    rec('1.10 今日流程只列真实活动，且不含学习时段', flow.join('|') === 'Planning call|Client sync|Evening walk', flow.join('|'));
    const pills = await page.$$eval('#v-wk .spc-row', r => r.map(x => [...x.querySelectorAll('.spc-pill')].map(p => p.textContent).join('+')));
    rec('1.11 状态：Planning=Done ✓，Client sync=Next', /Done/.test(pills[0]) && /Next/.test(pills[1]) && pills[2] === '', pills.join('|'));
    const goal = await page.$$eval('#v-wk .spc-goal', g => g.map(x => ({ n: x.querySelector('.spc-row-n').textContent, v: x.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), m: x.querySelector('.spc-row-m').textContent })));
    rec('1.12 工作目标来自 Goals（只有 work 空间那条，进度 50%，5 天后截止）', goal.length === 1 && goal[0].n === 'Portfolio launch' && goal[0].v === '50' && /Due in 5 days/.test(goal[0].m), JSON.stringify(goal));
    rec('1.13 学习目标没有混进 Work', !/Exam prep/.test(await text(page, '#v-wk')));
    rec('1.14 没有预览里的假内容、没有未实现的“Focus timer / Daily reflection”', !DEMO.test(await text(page, '#v-wk')) && !/Focus session|Daily reflection/.test(await text(page, '#v-wk')));
    // 动作
    await page.click('#v-wk .spc-actions .spc-btn:not(.spc-ghost)'); await page.waitForTimeout(300);
    rec('1.15 “添加活动”打开现有的活动编辑器', await page.evaluate(() => document.getElementById('mask').classList.contains('show')));
    await page.click('#dx'); await page.waitForTimeout(150);
    await page.click('#v-wk .spc-btn.spc-ghost >> text=View timetable'); await page.waitForTimeout(200);
    rec('1.16 “查看课表”回到现有课表', (await view(page)) === 'tt');
    rec('1.17 Work 页没有写任何数据（课表、完成标记、目标、打卡都没变）', (await ls(page, WKKEY)) === JSON.stringify(EVENTS) && (await ls(page, 'mochi-dn')) === JSON.stringify({ __v: 2, [W + '-0-540-Planning call']: 1 }));
    rec('1.18 页面无报错', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // ===== 2 Life：打卡 / 饮水 / 精力 / 日程 =====
  {
    const { ctx, page, errs } = await open(browser, seed());
    await tab(page, 'hw'); await switchTo(page, /Life/);
    rec('2.1 切到 Life：data-view = lf，hero 用 life-mode.webp', (await view(page)) === 'lf' && (await page.$eval('#v-lf .spc-hero-img', i => /assets\/life-mode\.webp$/.test(i.getAttribute('src')))));
    const st = await page.$$eval('#v-lf .spc-stat', s => s.map(x => x.querySelector('.spc-num').textContent));
    rec('2.2 打卡 1/5、精力 🌧️、饮水 3/8（都来自现有记录）', st[0] === '1/5' && st[1] === '🌧️' && st[2] === '3/8', st.join('|'));
    const cks = await page.$$eval('#v-lf .spc-chk input', i => i.map(x => x.checked));
    rec('2.3 护肤步骤 5 个，只有第 1 个已勾', cks.length === 5 && cks.join() === 'true,false,false,false,false', cks.join());
    await page.locator('#v-lf .spc-chk input').nth(1).check(); await page.waitForTimeout(200);
    const bt = JSON.parse(await ls(page, 'mochi-bt'));
    rec('2.4 勾一个：写进现有护肤记录（和健康页同一份），统计变 2/5', bt.log[ISO].am.join() === '0,1' && (await text(page, '#v-lf .spc-stat')).includes('2/5'));
    rec('2.5 勾选后键盘焦点还在原来的复选框上', await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk') === 'step:am:1'));
    await page.locator('#v-lf .spc-chk input').nth(1).uncheck(); await page.waitForTimeout(200);
    rec('2.6 取消勾选：记录里对应项被移除', JSON.parse(await ls(page, 'mochi-bt')).log[ISO].am.join() === '0');
    await page.click('#v-lf [data-fk="cup:+"]'); await page.waitForTimeout(200);
    rec('2.7 ＋一杯水：现有饮水记录 3 → 4，统计 4/8', JSON.parse(await ls(page, 'mochi-di')).days[ISO].w === 4 && /4\/8/.test(await text(page, '#v-lf .spc-stats')));
    await page.click('#v-lf [data-fk="cup:-"]'); await page.waitForTimeout(200);
    rec('2.8 －一杯水：回到 3', JSON.parse(await ls(page, 'mochi-di')).days[ISO].w === 3);
    const ag = await page.$$eval('#v-lf .spc-row', r => r.map(x => x.querySelector('.spc-row-n').textContent + '@' + x.querySelector('.spc-pill').textContent));
    rec('2.9 温柔的日程：今天还没发生的（Client sync、Evening walk）+ 明天（Tuesday errand）；已完成的不出现，学习时段不出现', ag.join('|') === 'Client sync@Today|Evening walk@Today|Tuesday errand@Tomorrow', ag.join('|'));
    await page.click('#v-lf .spc-stat[data-fk="energy"]'); await page.waitForTimeout(250);
    rec('2.10 精力卡片打开现有 Mochi Energy 弹窗', !!(await page.$('.mn-overlay .mn-energy-grid')));
    await page.click('.mn-energy-option[data-energy="high"]'); await page.waitForTimeout(250);
    rec('2.11 在弹窗里选“很好”：现有精力记录更新，Life 页立刻显示 ☀️', JSON.parse(await ls(page, 'mochi-energy-v1'))[ISO].level === 'high' && (await page.$$eval('#v-lf .spc-num', n => n[1].textContent)) === '☀️');
    await page.evaluate(() => document.querySelector('.mn-overlay').remove());
    rec('2.12 Life 页没有预览里的假内容、没有自动改课表', !DEMO.test(await text(page, '#v-lf')) && (await ls(page, WKKEY)) === JSON.stringify(EVENTS));
    await page.click('#v-lf .spc-btn >> text=Plan some me-time'); await page.waitForTimeout(250);
    rec('2.13 “安排一点自己的时间”打开现有活动编辑器', await page.evaluate(() => document.getElementById('mask').classList.contains('show')));
    rec('2.14 页面无报错', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // ===== 3 模式切换：底部那格的名字 / 落点 / 切换条 =====
  {
    // [模式, 标签, 落点, 切换条]
    const cases = [[['study'], /Study/, 'ss', ''], [['work'], /Work/, 'wk', 'Study|Work'], [['life'], /Life/, 'lf', 'Study|Life'], [['work', 'life'], /Spaces/, 'wk', 'Study|Work|Life'], [['study', 'work'], /Spaces/, 'ss', 'Study|Work'], [['study', 'work', 'life'], /Spaces/, 'ss', 'Study|Work|Life']];
    for (const [modes, tabRe, land, names] of cases) {
      const { ctx, page, errs } = await open(browser, seed({ modes }));
      await tab(page, 'hw');
      const label = (await text(page, '.tabbar [data-v="hw"]')).trim(), v = await view(page), vid = v === 'ss' ? '#v-ss' : v === 'wk' ? '#v-wk' : '#v-lf';
      const bar = await page.$$eval(vid + ' .spc-swb', b => b.map(x => x.textContent.replace(/^\S+\s/, '').trim()).join('|'));
      rec('3 模式 [' + modes + ']：标签 “' + label + '”，落在 ' + v + '，切换条 ' + (names || '无'), v === land && tabRe.test(label) && bar === names && errs.length === 0, 'view=' + v + ' bar=' + bar + ' ' + errs.join('|'));
      await ctx.close();
    }
    const { ctx, page } = await open(browser, seed({ modes: ['study'] }));
    await tab(page, 'hw');
    rec('3.7 只选学习：标签、落点、没有切换条都和 v9.8.7 一样', /Study/.test(await text(page, '.tabbar [data-v="hw"]')) && (await view(page)) === 'ss' && (await page.$$('#v-ss .spc-swb')).length === 0);
    await page.evaluate(() => MochiNext.selectMode(['work']));
    rec('3.8 运行中改成只选 Work：标签立刻变 Work，学习空间顶部出现切换条', /Work/.test(await text(page, '.tabbar [data-v="hw"]')) && (await page.$$('#v-ss .spc-swb')).length === 2);
    await page.evaluate(() => MochiNext.selectMode(['work', 'life']));
    rec('3.9 改成选两个：标签变 Spaces', /Spaces/.test(await text(page, '.tabbar [data-v="hw"]')));
    await tab(page, 'tt'); await tab(page, 'hw'); await switchTo(page, /Life/);
    await tab(page, 'tt'); await tab(page, 'hw');
    rec('3.10 选了两个：点“Spaces”回到这次用过的空间（Life），不是固定的第一个', (await view(page)) === 'lf');
    await page.evaluate(() => MochiNext.selectMode(['study']));
    rec('3.11 改回只选学习：标签恢复为 Study（原样的图标和文字）', /Study/.test(await text(page, '.tabbar [data-v="hw"]')) && /📚/.test(await text(page, '.tabbar [data-v="hw"]')) && (await page.$$('#v-ss .spc-swb')).length === 0);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, seed({ modes: ['work', 'life'] }), { lang: 'zh' });
    rec('3.12 中文：两个模式的标签是“空间”', /空间/.test(await text(page, '.tabbar [data-v="hw"]')));
    await page.evaluate(() => MochiNext.selectMode(['life']));
    rec('3.13 中文：只选生活，标签“生活”', /生活/.test(await text(page, '.tabbar [data-v="hw"]')));
    await ctx.close();
    const m = await open(browser, seed({ modes: ['work'] }), { lang: 'ms' });
    rec('3.14 马来文：只选工作，标签“Kerja”', /Kerja/.test(await text(m.page, '.tabbar [data-v="hw"]')));
    await m.ctx.close();
  }

  // ===== 4 空数据：空状态都有去处 =====
  {
    const { ctx, page, errs } = await open(browser, seed({ empty: true }));
    await tab(page, 'hw'); await switchTo(page, /Work/);
    const st = await page.$$eval('#v-wk .spc-num', n => n.map(x => x.textContent));
    rec('4.1 Work 空数据：今日 0、下一项 —、本周 0 min（不编数字）', st[0] === '0' && st[1] === '—' && st[2] === '0 min', st.join('|'));
    rec('4.2 Work 空状态有“添加活动”入口，工作目标空状态指向 Goals', !!(await page.$('#v-wk .spc-empty .spc-btn')) && /No Work goals yet/.test(await text(page, '#v-wk')) && /Open Goals/.test(await text(page, '#v-wk')));
    await switchTo(page, /Life/);
    rec('4.3 Life 空数据：没有护肤步骤时显示空状态，并通向健康页', /No skincare steps yet/.test(await text(page, '#v-lf')));
    const lst = await page.$$eval('#v-lf .spc-num', n => n.map(x => x.textContent));
    rec('4.4 Life 空数据：打卡 —、精力 —（没有默认值）、饮水 3/8 之外不会编', lst[0] === '—' && lst[1] === '—', lst.join('|'));
    await page.click('#v-lf .spc-empty .spc-btn'); await page.waitForTimeout(200);
    rec('4.5 “Open Health”跳到现有健康页（美容）', (await view(page)) === 'bt');
    rec('4.6 空数据页面无报错', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // ===== 5 三语 =====
  for (const lang of ['zh', 'ms']) {
    const { ctx, page, errs } = await open(browser, seed(), { lang });
    await tab(page, 'hw'); await switchTo(page, lang === 'zh' ? /工作/ : /Kerja/);
    const w = await text(page, '#v-wk');
    await switchTo(page, lang === 'zh' ? /生活/ : /Hidup/);
    const l = await text(page, '#v-lf');
    const okW = lang === 'zh' ? /你的工作空间/.test(w) && /已排时间/.test(w) : /Ruang kerja anda/i.test(w) && /Dijadualkan minggu ini/i.test(w);
    const okL = lang === 'zh' ? /你的生活小角落/.test(l) && /小小的日常打卡/.test(l) : /Sudut kehidupan kecil anda/i.test(l) && /Rutin harian kecil/i.test(l);
    rec('5 ' + lang + '：Work / Life 文案都是该语言，无 undefined / 键名泄漏', okW && okL && !/undefined|null|NaN|\bflowTitle\b|\bwEyebrow\b/.test(w + l) && errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  // ===== 6 布局：4 种宽度无横向溢出；深浅色；减少动效 =====
  for (const w of [320, 360, 390, 768, 1280]) {
    const { ctx, page } = await open(browser, seed(), { w, h: w >= 768 ? 900 : 800 });
    await tab(page, 'hw'); await switchTo(page, /Work/);
    const o1 = await overflow(page), heroH = await page.$eval('#v-wk .spc-hero', e => Math.round(e.getBoundingClientRect().height));
    await switchTo(page, /Life/); const o2 = await overflow(page);
    const nav = await page.$eval('.tabbar', n => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vis: getComputedStyle(n).display !== 'none' }; });
    const fabHidden = await page.$eval('#fab', f => getComputedStyle(f).display === 'none');
    rec('6 宽度 ' + w + '：Work/Life 都没有横向溢出，底部导航还在，＋按钮不遮挡', o1 <= 0 && o2 <= 0 && nav.vis && fabHidden, 'overflow=' + o1 + '/' + o2 + ' hero=' + heroH);
    if (w <= 390) rec('6 宽度 ' + w + '：手机上 hero 紧凑（160–190px）', heroH >= 150 && heroH <= 200, 'hero=' + heroH);
    await ctx.close();
  }
  for (const dark of [false, true]) {
    const { ctx, page } = await open(browser, seed(), { dark });
    await tab(page, 'hw'); await switchTo(page, /Work/);
    const bg = await page.$eval('#v-wk .spc-card', c => getComputedStyle(c).backgroundColor), lum = (bg.match(/\d+/g) || [255, 255, 255]).slice(0, 3).reduce((a, b) => a + +b, 0) / 3;
    const fg = await page.$eval('#v-wk .spc-row-n', c => getComputedStyle(c).color), flum = (fg.match(/\d+/g) || [0, 0, 0]).slice(0, 3).reduce((a, b) => a + +b, 0) / 3;
    rec('6 ' + (dark ? '深色' : '浅色') + '主题：卡片底色与文字亮度相反（跟随主题变量）', dark ? lum < 110 && flum > 140 : lum > 180 && flum < 110, 'bg=' + bg + ' fg=' + fg);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, seed(), { rm: true });
    await tab(page, 'hw'); await switchTo(page, /Work/);
    rec('6 减少动效：没有 transition（hover 不位移）', await page.$eval('#v-wk .spc-btn', b => parseFloat(getComputedStyle(b).transitionDuration) === 0));
    await ctx.close();
  }

  // ===== 7 回归：学习空间 / 菜单 / 底部导航 / 数据不动 =====
  {
    const { ctx, page, errs } = await open(browser, seed());
    const before = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(mochi-|goals-)/.test(k)) o[k] = localStorage.getItem(k); } return o; });
    await tab(page, 'hw'); await switchTo(page, /Work/); await switchTo(page, /Life/); await switchTo(page, /Study/);
    rec('7.1 切回 Study：学习工作台正常渲染', (await view(page)) === 'ss' && !!(await page.$('.study-space-hero')));
    await page.locator('#v-ss .seg button', { hasText: /Homework/ }).first().click(); await page.waitForTimeout(200);
    rec('7.2 学习分组内的作业页仍可用', (await view(page)) === 'hw');
    await page.click('#burger'); await page.waitForTimeout(350);
    rec('7.3 侧边菜单可打开，菜单里仍有 Goals / 新手引导与模式', await page.evaluate(() => { const t = document.getElementById('dwr').textContent; return /Goals/.test(t) && /Getting started & modes/.test(t); }));
    await page.mouse.click(385, 500); await page.waitForTimeout(350);
    for (const v of ['sp', 'sta', 'more', 'tt']) { await tab(page, v); }
    rec('7.4 其它底部标签（健康 / 统计 / 更多 / 课表）都正常', (await view(page)) === 'tt');
    const after = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(mochi-|goals-)/.test(k)) o[k] = localStorage.getItem(k); } return o; });
    const changed = Object.keys(before).filter(k => before[k] !== after[k]).concat(Object.keys(after).filter(k => !(k in before)));
    rec('7.5 只是浏览 Study / Work / Life：所有 mochi-* / goals-* 数据一个字节都没变（没有写入、没有新增数据键）', changed.length === 0, changed.join(','));
    rec('7.6 回归页面无报错', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const bad = results.filter(x => !x).length; console.log('\n' + (results.length - bad) + '/' + results.length + ' passed'); process.exit(bad ? 1 : 0);
})();
