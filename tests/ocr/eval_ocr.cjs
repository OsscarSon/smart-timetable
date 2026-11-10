// 用真实的 Tesseract（系统版 eng，--psm 11/6/3 的 TSV 输出）评估解析器：node eval_ocr.cjs SETDIR [psm]
// 输出召回 / 精确率（日 + 时间 ±5 分钟 + 名称相似度）。合成图是“比真实拍照干净得多”的上限，真实照片会更差。
const fs = require('fs'), path = require('path'); require('../../js/ocr.js'); const O = globalThis.OCR;
const dir = process.argv[2], psms = process.argv[3] ? [process.argv[3]] : ['11', '6', '3'];
function sim(a, b) { a = a.toLowerCase().replace(/[^a-z0-9]/g, ''); b = b.toLowerCase().replace(/[^a-z0-9]/g, ''); if (!a || !b) return 0; const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return 1 - d[m][n] / Math.max(m, n); }
const files = fs.readdirSync(dir).filter(f => /^tt\d+\.json$/.test(f)).sort();
for (const psm of psms) {
  let gtN = 0, prN = 0, ok = 0, okTime = 0, okTitle = 0, modeStat = {}, gridFail = 0, hardGt = 0, hardOk = 0, easyGt = 0, easyOk = 0; const bad = [];
  for (const f of files) {
    const gt = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), tsv = fs.readFileSync(path.join(dir, (process.env.TSVPREFIX || 'tsv') + psm, f.replace('.json', '.tsv')), 'utf8');
    const r = O.parse(O.tsvToWords(tsv), {}); modeStat[r.mode] = (modeStat[r.mode] || 0) + 1; if (r.mode !== 'grid') gridFail++;
    const used = new Set();
    gt.lessons.forEach(g => {
      gtN++; g.hard ? hardGt++ : easyGt++;
      let best = -1, bs = 0;
      r.lessons.forEach((p, i) => { if (used.has(i) || p.day !== g.day) return; const s = sim(p.t, g.t), tm = Math.abs(p.s - g.s) <= 5 && Math.abs(p.e - g.e) <= 5; const sc = (s >= 0.75 ? 1 : 0) + (tm ? 1 : 0) + s * 0.1; if (sc > bs) { bs = sc; best = i; } });
      if (best >= 0) { const p = r.lessons[best], s = sim(p.t, g.t) >= 0.75, tm = Math.abs(p.s - g.s) <= 5 && Math.abs(p.e - g.e) <= 5; if (s) okTitle++; if (tm) okTime++; if (s && tm) { ok++; used.add(best); g.hard ? hardOk++ : easyOk++; } else if (bad.length < 6) bad.push(f + ' ' + JSON.stringify({ g: [g.day, g.s, g.e, g.t], p: [p.day, p.s, p.e, p.t] })); }
      else if (bad.length < 6) bad.push(f + ' MISSING ' + JSON.stringify([g.day, g.s, g.e, g.t]));
    });
    prN += r.lessons.length;
  }
  const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
  console.log('psm ' + psm + ': images=' + files.length + ' modes=' + JSON.stringify(modeStat) + '\n   GT lessons=' + gtN + '  predicted=' + prN + '\n   recall(day+time+title)=' + pct(ok, gtN) + '  precision=' + pct(ok, prN) + '  | title ok ' + pct(okTitle, gtN) + '  time ok ' + pct(okTime, gtN) + '\n   single-period cells: ' + pct(easyOk, easyGt) + ' (' + easyGt + ')   merged double-period cells: ' + pct(hardOk, hardGt) + ' (' + hardGt + ')');
  if (process.argv[3]) bad.forEach(b => console.log('   ' + b));
}
