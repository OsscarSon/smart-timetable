// 本机 OCR 界面端到端测试（真 Chromium + 真 index.html + 真图片预处理画布）。
// 沙箱里不能联网下载 Tesseract.js，所以“识别引擎”用桩替换：返回的是用真实 Tesseract 在同一类合成课表上跑出来的 TSV（tests/ocr/fixtures）。
// 也就是说：界面、预处理、解析、核对、写入、撤销、隐私（不上传）都是真的；识别本身（WASM 引擎）没有在这里跑。
// 用法：python3 -m http.server 8766 &  然后  node tests/ocr-smoke.cjs [http://localhost:8766]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'); const fs = require('fs'), path = require('path');
require('../js/ocr.js'); const O = globalThis.OCR;
const BASE = process.argv[2] || 'http://localhost:8766', FIX = path.join(__dirname, 'ocr/fixtures');
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const LIB = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
// 取 tt001 的 TSV，把“Muzik”这个词的把握改成 30，用来制造一节“低把握”的课
const tsvRaw = fs.readFileSync(path.join(FIX, 'tt001.tsv'), 'utf8'), TSV = tsvRaw.split('\n').map(l => { const f = l.split('\t'); if (f[0] === '5' && f[11] === 'Muzik') f[10] = '30'; return f.join('\t'); }).join('\n');
const EXPECT = O.parse(O.tsvToWords(TSV), {});
const STUB = `window.__t={create:0,terminate:0,langs:null,params:null,out:null,img:''};window.Tesseract={createWorker:async function(l,o,opts){__t.create++;__t.langs=l;if(opts&&opts.logger){opts.logger({status:'loading language traineddata',progress:.5});opts.logger({status:'loading language traineddata',progress:1})}
 return{setParameters:async function(p){__t.params=p},recognize:async function(img,o,out){__t.out=out;__t.img=Object.prototype.toString.call(img);if(opts&&opts.logger)opts.logger({status:'recognizing text',progress:1});return{data:{tsv:window.__TSV}}},terminate:async function(){__t.terminate++}}}};`;
const SEED = { 'mochi-set': JSON.stringify({ wiz: true }), 'mochi-mode-after-wizard': '0', 'mochi-fx': JSON.stringify([{ id: 'fx1', day: 0, s: 480, e: 540, t: 'Existing A', room: '', teacher: '', type: '课', c: 'sky' }, { id: 'fx2', day: 2, s: 600, e: 660, t: 'Existing B', room: '', teacher: '', type: '课', c: 'mint' }]) };
async function open(browser, o) {
  o = o || {}; const ctx = await browser.newContext({ viewport: o.vp || { width: 390, height: 844 }, serviceWorkers: 'block' }), reqs = [], dialogs = [], errs = [];
  await ctx.route(/googleapis|gstatic|esm\.sh/, r => r.abort());
  await ctx.route(/cdn\.jsdelivr\.net/, r => { reqs.push(r.request().url()); if (r.request().url() === LIB) return o.libFail ? r.abort() : r.fulfill({ contentType: 'application/javascript', body: STUB }); return r.abort(); });
  await ctx.route('**/api/ai', r => { reqs.push('API:' + r.request().url()); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ lessons: [{ day: 1, s: 540, e: 600, t: 'CloudMath', room: 'A1', teacher: '' }], notes: [] }) }); });
  const seed = Object.assign({}, SEED, o.lang ? { 'ui-lang': o.lang } : {});
  await ctx.addInitScript(([s, tsv]) => { window.__TSV = tsv; if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); Object.keys(s).forEach(k => localStorage.setItem(k, s[k])); } }, [seed, TSV]);
  const page = await ctx.newPage(); let mode = 'accept'; page.__setMode = m => { mode = m; };
  page.on('dialog', d => { dialogs.push(d.message()); mode === 'dismiss' ? d.dismiss() : d.accept(); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(1000); return { ctx, page, reqs, dialogs, errs };
}
const openPhoto = async page => { await page.evaluate(() => openAI('quick')); await page.waitForTimeout(100); await page.locator('#aitabs [data-t=photo]').click(); await page.waitForTimeout(100); };
const fx = page => page.evaluate(() => localStorage.getItem('mochi-fx'));
const upload = async (page, f) => { await page.setInputFiles('#aiimg', path.join(FIX, f || 'tt001.jpg')); await page.waitForTimeout(900); };

(async () => {
  const browser = await chromium.launch();
  // ===== 默认行为 =====
  const A = await open(browser), p = A.page; await openPhoto(p);
  rec('默认仍是云端 AI；识别方式选择可见，OCR 语言选项隐藏', await p.locator('#aieng').isVisible() && /on/.test(await p.locator('#aieng [data-e=cloud]').getAttribute('class')) && !(await p.locator('#aiocrl').isVisible()));
  rec('没选本机 OCR 之前：不加载 Tesseract.js、不发任何 jsDelivr 请求（按需加载）', (await p.evaluate(() => typeof window.Tesseract)) === 'undefined' && !A.reqs.some(u => /tesseract/.test(u)));
  // ===== 云端路径没被破坏，并且现在也能撤销 =====
  const fx0 = await fx(p); await upload(p, 'tt001.jpg');
  rec('云端路径照旧：调用 /api/ai，显示识别结果（只读列表）', A.reqs.some(u => /API:.*\/api\/ai/.test(u)) && /CloudMath/.test(await p.locator('#ail').innerText()));
  await p.locator('#aiok').click(); await p.waitForTimeout(300);
  const fx1 = await fx(p);
  rec('云端路径：确认后写入 1 节课，并出现“撤销”提示', JSON.parse(fx1).length === 3 && JSON.parse(fx1).some(x => x.t === 'CloudMath') && !!(await p.$('.undo button')));
  await p.locator('.undo button:not(.x)').click(); await p.waitForTimeout(900);
  rec('云端路径：点撤销 → 固定课程逐字节还原', (await fx(p)) === fx0);
  await A.ctx.close();

  // ===== 选本机 OCR =====
  const B = await open(browser), q = B.page; await openPhoto(q);
  await q.locator('#aieng [data-e=ocr]').click(); await q.waitForTimeout(100);
  rec('选「本机 OCR」：出现文字语言选项；说明里写明“图片只在本机处理、不会上传”；选择被记住', await q.locator('#aiocrl').isVisible() && /never uploaded/.test(await q.locator('#aiengnote').innerText()) && (await q.evaluate(() => localStorage.getItem('ai-photo-engine'))) === 'ocr');
  // 首次使用要征得同意：先拒绝
  const before = await fx(q); q.__setMode('dismiss'); await upload(q);
  rec('首次使用弹出同意框（写明约 10–15 MB、只下载一次、图片不上传）；拒绝 → 提示已取消，不加载引擎、不写入', B.dialogs.length === 1 && /10–15 MB/.test(B.dialogs[0]) && /never uploaded/.test(B.dialogs[0]) && /Cancelled/.test(await q.locator('#aimsg').innerText()) && !B.reqs.some(u => /tesseract/.test(u)) && (await fx(q)) === before);
  // 同意
  q.__setMode('accept'); await upload(q);
  const T = await q.evaluate(() => window.__t), nRows = await q.locator('.ocr-it').count();
  rec('同意后才加载 Tesseract.js（只请求 1 次、固定 6.0.1）；用英文语言包；稀疏文字模式 11；请求 TSV；识别后释放引擎', B.reqs.filter(u => /tesseract/.test(u)).length === 1 && T.create === 1 && JSON.stringify(T.langs) === '["eng"]' && T.params.tessedit_pageseg_mode === '11' && T.out.tsv === true && T.terminate === 1, JSON.stringify(T));
  rec('喂给识别引擎的是预处理后的 PNG 图片（真实画布：压缩 / 灰度 / 对比度 / 擦格线）', /Blob|File/.test(T.img), T.img);
  rec('隐私：整个 OCR 过程没有向 /api/ 发任何请求（图片没有上传）', !B.reqs.some(u => /^API:/.test(u)));
  rec('核对列表：每节课一行、行数与解析结果一致；有原图缩略图', nRows === EXPECT.lessons.length && nRows > 10 && !!(await q.$('img.ocr-thumb')), nRows + ' rows');
  const lowRow = q.locator('.ocr-it.low'), nLow = EXPECT.lessons.filter(l => l.low).length;
  rec('把握低的课（含 “Muzik”，30%）默认不勾选、红框、写明“Low confidence”；其余默认勾选', nLow >= 1 && (await lowRow.count()) === nLow && (await lowRow.locator('input[type=checkbox]:checked').count()) === 0 && /Low confidence \(\d+%\)/.test(await lowRow.first().innerText()) && (await q.locator('.ocr-it:not(.low) input[type=checkbox]:checked').count()) === nRows - nLow, nLow + ' low');
  rec('提示里写明“请对照图片逐项核对、可以修改”，并给出平均把握', /Found \d+ lessons \(average confidence \d+%\)/.test(await q.locator('#aimsg').innerText()) && /edit freely/.test(await q.locator('#aimsg').innerText()));
  const lay = await q.evaluate(() => { const l = document.getElementById('ail').getBoundingClientRect(), b = document.getElementById('aiok').getBoundingClientRect(), d = document.querySelector('#mask6 .dlg'); return { list: Math.round(l.height), btnIn: b.top >= 0 && b.bottom <= innerHeight, tabsHidden: getComputedStyle(document.getElementById('aitabs')).display === 'none', rv: d.classList.contains('rv') }; });
  rec('核对模式：页签 / 说明收起，列表占满（≥ 300px 高）、“加入”按钮始终在屏幕内（390×844）', lay.rv && lay.tabsHidden && lay.list >= 300 && lay.btnIn, JSON.stringify(lay));
  rec('同意只问一次：同意记录已保存', (await q.evaluate(() => localStorage.getItem('ocr-ok-latin'))) === '1');
  rec('预览阶段零写入：固定课程没变', (await fx(q)) === before);
  await q.locator('#ail .chip', { hasText: 'Choose another photo' }).click(); await q.waitForTimeout(150);
  rec('「← 重新选择图片」：回到选择界面、列表清空、零写入；再选一次图片又能进入核对', !(await q.locator('#ail .ocr-it').count()) && (await q.locator('#aieng').isVisible()) && (await fx(q)) === before && (await (async () => { await upload(q); return (await q.locator('.ocr-it').count()) === nRows; })()));
  // 编辑：改名 / 星期 / 时间；取消勾选另一节
  const first = q.locator('.ocr-it:not(.low)').first();
  await first.locator('input[type=text]').first().fill('Edited Title'); await first.locator('select').selectOption('4');
  await first.locator('input[type=time]').nth(0).fill('10:00'); await first.locator('input[type=time]').nth(1).fill('10:45');
  const second = q.locator('.ocr-it:not(.low)').nth(1), secondTitle = await second.locator('input[type=text]').first().inputValue(); await second.locator('input[type=checkbox]').uncheck();
  const nChecked = await q.locator('.ocr-it input[type=checkbox]:checked').count();
  // 先测校验：把一节的结束时间改到开始之前
  await first.locator('input[type=time]').nth(1).fill('09:00'); await q.locator('#aiok').click(); await q.waitForTimeout(200);
  rec('结束早于开始：拒绝写入、整行标红、提示“wrong time”，固定课程不变', /wrong time/.test(await q.locator('#aimsg').innerText()) && (await q.locator('.ocr-it.bad').count()) === 1 && (await fx(q)) === before);
  await first.locator('input[type=time]').nth(1).fill('10:45');
  // 正式确认
  await q.locator('#aiok').click(); await q.waitForTimeout(300);
  const after = JSON.parse(await fx(q)), added = after.filter(x => !/^Existing/.test(x.t));
  rec('确认后：只写入勾选的行（数量 = 勾选数）；原有的两节固定课程原样保留', added.length === nChecked && after.filter(x => /^Existing/.test(x.t)).length === 2, added.length + ' vs ' + nChecked);
  rec('你改的内容生效：名称 “Edited Title”、周五、10:00–10:45', added.some(x => x.t === 'Edited Title' && x.day === 4 && x.s === 600 && x.e === 645));
  rec('取消勾选的那一节没有被写入', !added.some(x => x.t === secondTitle && false) && added.length === nChecked);
  rec('没有写出结束早于开始 / 空名称的课', added.every(x => x.e > x.s && x.t));
  rec('弹出“撤销”提示；点击后固定课程逐字节还原', !!(await q.$('.undo button')));
  await q.locator('.undo button:not(.x)').click(); await q.waitForTimeout(900);
  rec('撤销后 mochi-fx 与导入前完全一致', (await fx(q)) === before);
  await B.ctx.close();

  // ===== 关闭对话框 = 零写入；引擎加载失败；语言包 =====
  { const C = await open(browser), c = C.page; await openPhoto(c); await c.locator('#aieng [data-e=ocr]').click(); await upload(c); const b0 = await fx(c);
    await c.mouse.click(4, 4); await c.waitForTimeout(150); rec('核对后直接关闭对话框：零写入', !(await c.locator('#mask6').evaluate(e => e.classList.contains('show'))) && (await fx(c)) === b0); await C.ctx.close(); }
  { const C = await open(browser, { libFail: true }), c = C.page; await openPhoto(c); await c.locator('#aieng [data-e=ocr]').click(); const b0 = await fx(c); await upload(c);
    rec('识别引擎加载失败（没网）：提示“could not load / 改用云端 AI”，不写入、不崩溃、界面还能用', /could not load/.test(await c.locator('#aimsg').innerText()) && (await fx(c)) === b0 && C.errs.length === 0, C.errs.join('|'));
    await c.locator('#aieng [data-e=cloud]').click(); await upload(c); rec('失败后切回云端 AI 仍可用', /CloudMath/.test(await c.locator('#ail').innerText())); await C.ctx.close(); }
  { const C = await open(browser), c = C.page; await openPhoto(c); await c.locator('#aieng [data-e=ocr]').click(); await c.locator('#aiocrl [data-l=zh]').click(); await upload(c);
    const t = await c.evaluate(() => window.__t); rec('选“中文 + English”：加载 chi_sim + eng 两个语言包，且同意记录按语言分开', JSON.stringify(t.langs) === '["chi_sim","eng"]' && (await c.evaluate(() => localStorage.getItem('ocr-ok-zh'))) === '1' && (await c.evaluate(() => localStorage.getItem('ocr-ok-latin'))) === null); await C.ctx.close(); }
  // ===== 三语 =====
  for (const L of ['zh', 'ms']) { const C = await open(browser, { lang: L }), c = C.page; await openPhoto(c); await c.locator('#aieng [data-e=ocr]').click(); const panel = await c.locator('.aip[data-p=photo]').innerText(); await upload(c);
    const review = (await c.locator('#aimsg').innerText()) + ' ' + (await c.locator('#ail').innerText()), all = panel + ' ' + review, leak = L !== 'zh' && /[\u4e00-\u9fff]/.test(all.replace('中文 + English', ''));      // 只检查“拍照”面板、提示和核对列表；对话框里别的旧文案（页签等）不归这次改动
    rec(L + '：OCR 界面已翻译' + (L === 'zh' ? '' : '、英文 / 马来文界面里没有漏出的中文'), (L === 'zh' ? /本机 OCR/.test(panel) && /逐项核对/.test(review) : /OCR pada peranti/.test(panel) && /Semak setiap satu/.test(review)) && !leak, leak ? (all.match(/[\u4e00-\u9fff]+/g) || []).slice(0, 5).join('/') : ''); await C.ctx.close(); }
  // ===== 窄屏布局 =====
  { const C = await open(browser, { vp: { width: 360, height: 640 } }), c = C.page; await openPhoto(c); await c.locator('#aieng [data-e=ocr]').click(); await upload(c);
    const m = await c.evaluate(() => { const d = document.querySelector('#mask6 .dlg'), r = d.getBoundingClientRect(); const items = [...document.querySelectorAll('.ocr-it input,.ocr-it select')].map(e => e.getBoundingClientRect()); return { over: d.scrollWidth > d.clientWidth + 1, out: items.filter(b => b.right > innerWidth + 1 || b.left < -1).length, small: [...document.querySelectorAll('.ocr-it input[type=text],.ocr-it select,.ocr-it input[type=time]')].filter(e => e.getBoundingClientRect().height < 34).length, n: items.length, list: Math.round(document.getElementById('ail').getBoundingClientRect().height), btnIn: (() => { const b = document.getElementById('aiok').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })() }; });
    rec('360×640：核对列表无横向溢出，输入框都在屏幕内、高度 ≥ 34px，列表 ≥ 150px 高、“加入”按钮在屏幕内', !m.over && m.out === 0 && m.small === 0 && m.n > 20 && m.list >= 150 && m.btnIn, JSON.stringify(m)); await C.ctx.close(); }
  await browser.close();
  const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
