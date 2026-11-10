// 用真实 Chromium 画布跑 OCR.prep（预处理：压缩 / 灰度 / 对比度 / 擦格线），把结果存成 PNG，供系统 tesseract 评估。node prep_images.cjs SETDIR OUTDIR
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'); const fs = require('fs'), path = require('path');
const dir = process.argv[2], out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
(async () => { const b = await chromium.launch(), page = await b.newPage(); await page.setContent('<html><body></body></html>'); await page.addScriptTag({ path: path.join(__dirname, '../../js/ocr.js') });
  for (const f of fs.readdirSync(dir).filter(f => /\.jpg$/.test(f)).sort()) {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    const png = await page.evaluate(async ([b64]) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const p = await OCR.prep(new File([u], 'x.jpg', { type: 'image/jpeg' })); const ab = new Uint8Array(await p.blob.arrayBuffer()); let s = ''; for (let i = 0; i < ab.length; i += 8192) s += String.fromCharCode.apply(null, ab.subarray(i, i + 8192)); return btoa(s); }, [b64]);
    fs.writeFileSync(path.join(out, f.replace('.jpg', '.png')), Buffer.from(png, 'base64')); }
  await b.close(); console.log('prepared'); })();
