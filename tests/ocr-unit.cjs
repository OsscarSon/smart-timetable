// 本机 OCR 解析器单元测试（Node，纯函数）。用法：node tests/ocr-unit.cjs
// 包含：手工构造的文字框（拉丁 / 中文逐字 / 马来文错字）、时间与星期解析、12 小时制推断、列表式兜底、稳健性乱序测试，
// 以及“用真实 Tesseract 输出（TSV）做的准确率门槛”（tests/ocr/fixtures，20 张合成课表）。
const fs = require('fs'), path = require('path'); require('../js/ocr.js'); const O = globalThis.OCR;
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const W = (t, x, y, c, w, h) => ({ t, x0: x, y0: y, x1: x + (w || t.length * 11), y1: y + (h || 20), c: c == null ? 92 : c });
// 造一张网格课表：header=星期名（可带错字），labels=每行时间标签文字，cells[r][c]=单元格文字（'' 表示空）
function grid(o) {
  const ws = [], X0 = 40, LW = 160, CW = 170, RH = 80, TOP = 100, days = o.days;
  days.forEach((d, i) => ws.push(W(d, X0 + LW + i * CW + 40, TOP, 95)));
  o.labels.forEach((l, r) => { const y = TOP + 50 + r * RH + 30; String(l).split('\n').forEach((line, k, a) => ws.push(W(line, X0 + 10, y + (k - (a.length - 1) / 2) * 24, 93))); });
  o.cells.forEach((row, r) => row.forEach((txt, c) => { if (!txt) return; const lines = Array.isArray(txt) ? txt : [txt], y = TOP + 50 + r * RH + 30 - (lines.length - 1) * 12; lines.forEach((ln, k) => { let x = X0 + LW + c * CW + 12; ln.split(' ').forEach(wd => { ws.push(W(wd, x, y + k * 24, o.conf && o.conf[r + ',' + c] != null ? o.conf[r + ',' + c] : 93)); x += wd.length * 11 + 10; }); }); }));
  return ws;
}
const key = r => r.lessons.map(l => [l.day, l.s, l.e, l.t].join(':')).join(' | ');
const D5 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// 1 基本网格（区间标签）
{ const r = O.parse(grid({ days: D5, labels: ['07:30-08:10', '08:10-08:50', '08:50-09:30'], cells: [['Math', 'English', '', 'Art', 'PE'], ['Science', '', 'History', '', 'Music'], ['', 'Math', 'Math', '', '']] }), {});
  rec('网格：区间标签 → 日 / 开始 / 结束 / 名称都对，空格子不产生课程；相邻同名（周二周三不同列）不误合并', r.mode === 'grid' && key(r) === '0:450:490:Math | 0:490:530:Science | 1:450:490:English | 1:530:570:Math | 2:490:530:History | 2:530:570:Math | 3:450:490:Art | 4:450:490:PE | 4:490:530:Music', key(r)); }
// 2 同一列里相邻同名 → 合并成一节
{ const r = O.parse(grid({ days: D5, labels: ['08:00-08:40', '08:40-09:20', '09:20-10:00'], cells: [['Math', '', '', '', ''], ['Math', 'Art', '', '', ''], ['', '', '', '', 'PE']] }), {});
  rec('同一天相邻两行同名（连堂）→ 合并成一节 08:00–09:20', key(r).indexOf('0:480:560:Math') >= 0 && r.notes.indexOf('merged') >= 0, key(r)); }
// 3 只有开始时间的标签：结束时间取下一行的开始
{ const r = O.parse(grid({ days: D5, labels: ['8.00', '9.00', '10.00', '11.00'], cells: [['A1', '', '', '', ''], ['', 'B1', '', '', ''], ['', '', 'C1', '', ''], ['', '', '', 'D1', '']] }), {});
  rec('只有开始时间（8.00 / 9.00…）：每节到下一行开始', key(r) === '0:480:540:A1 | 1:540:600:B1 | 2:600:660:C1 | 3:660:720:D1', key(r)); }
// 4 上下两行叠放的开始 / 结束标签
{ const r = O.parse(grid({ days: D5, labels: ['07:30\n08:10', '08:10\n08:50', '08:50\n09:30', '09:30\n10:10'], cells: [['A1', '', '', '', ''], ['', 'B1', '', '', ''], ['', '', 'C1', '', ''], ['', '', '', 'D1', '']] }), {});
  rec('两行叠放的“开始 / 结束”标签（短长间距交替）→ 两两配对成区间', key(r) === '0:450:490:A1 | 1:490:530:B1 | 2:530:570:C1 | 3:570:610:D1', key(r)); }
// 5 12 小时制（没有 AM/PM）：11:00 → 12:00 → 1:00 → 2:00 应是 660 720 780 840
{ const r = O.parse(grid({ days: D5, labels: ['11:00', '12:00', '1:00', '2:00', '3:00'], cells: [['A1', '', '', '', ''], ['B1', '', '', '', ''], ['C1', '', '', '', ''], ['D1', '', '', '', ''], ['E1', '', '', '', '']] }), {});
  rec('12 小时制没有 AM/PM：1:00→13:00、2:00→14:00（动态规划，不出现倒退）', r.lessons.map(l => l.s).join() === '660,720,780,840,900', r.lessons.map(l => l.s).join()); }
// 6 单个标签被 OCR 读错不会连累后面
{ const r = O.parse(grid({ days: D5, labels: ['8:00', '9:00', '10:00', '11:00', '12:00', '1:00'], cells: [['A1'], ['B1'], ['C1'], ['D1'], ['E1'], ['F1']].map(a => a.concat(['', '', '', ''])) }), {});
  rec('上午 / 下午混合：8:00…12:00, 1:00 → 480…720, 780', r.lessons.map(l => l.s).join() === '480,540,600,660,720,780', r.lessons.map(l => l.s).join()); }
// 7 马来文表头 + OCR 错字（Se1asa / Khamls）
{ const r = O.parse(grid({ days: ['Isnin', 'Se1asa', 'Rabu', 'Khamls', 'Jumaat'], labels: ['08:00-08:40', '08:40-09:20'], cells: [['Bahasa Melayu', 'Matematik', 'Sains', 'Sejarah', 'Geografi'], ['Seni', '', '', '', 'Pendidikan Islam']] }), {});
  rec('马来文星期名（含 OCR 错字）与两个单词的科目名', r.lessons.filter(l => l.t === 'Bahasa Melayu' && l.day === 0).length === 1 && r.lessons.filter(l => l.day === 1 && l.t === 'Matematik').length === 1 && r.lessons.filter(l => l.day === 4 && l.t === 'Pendidikan Islam').length === 1 && r.lessons.length === 7, key(r)); }
// 8 中文：逐字识别的词（周 / 一、数 / 学）应拼成“周一”“数学”，字与字之间不加空格
{ const ws = []; ['周一', '周二', '周三', '周四', '周五'].forEach((d, i) => d.split('').forEach((ch, k) => ws.push(W(ch, 220 + i * 170 + 40 + k * 22, 100, 90, 20, 22))));
  ['08:00-08:45', '08:55-09:40'].forEach((l, r) => ws.push(W(l, 50, 180 + r * 80, 93)));
  const put = (txt, c, r) => txt.split('').forEach((ch, k) => ws.push(W(ch, 232 + c * 170 + k * 22, 180 + r * 80, 85, 20, 22)));
  put('数学', 0, 0); put('语文', 1, 0); put('英语', 2, 1); put('体育', 4, 1);
  const r = O.parse(ws, {}); rec('中文：逐字 OCR 的“周一…周五”和“数学 / 语文 / 英语 / 体育”被正确拼接，无多余空格', key(r) === '0:480:525:数学 | 1:480:525:语文 | 2:535:580:英语 | 4:535:580:体育', key(r)); }
// 9 休息行不进课表；教室 / 老师分开
{ const r = O.parse(grid({ days: D5, labels: ['08:00-08:40', '08:40-09:00', '09:00-09:40'], cells: [[['Math', 'Rm 12'], ['Sains', 'Cikgu Aina'], '', '', ''], ['REHAT', 'REHAT', 'REHAT', 'REHAT', 'REHAT'], [['English', 'Mr Tan'], '', '', '', '']] }), {});
  const m = r.lessons.find(l => l.t === 'Math'), s = r.lessons.find(l => l.t === 'Sains'), e = r.lessons.find(l => l.t === 'English');
  rec('休息行（REHAT）被跳过；第二行的“Rm 12”是教室、“Cikgu Aina / Mr Tan”是老师，没混进名称', r.lessons.length === 3 && m.room === 'Rm 12' && s.teacher === 'Cikgu Aina' && e.teacher === 'Mr Tan' && m.t === 'Math', key(r)); }
// 10 低把握标记
{ const r = O.parse(grid({ days: D5, labels: ['08:00-08:40', '08:40-09:20'], cells: [['Math', 'Art', '', '', ''], ['', '', 'Music', '', '']], conf: { '0,1': 28 } }), {});
  rec('把握低（<60）的课标记 low；正常的不标记', r.lessons.find(l => l.t === 'Art').low === true && r.lessons.find(l => l.t === 'Math').low === false); }
// 11 没有时间栏：给出候选但时间是猜的、全部标记 low + guessedTime
{ const ws = grid({ days: D5, labels: [], cells: [['Math', 'English', '', '', ''], ['', '', 'Art', '', '']] });
  const r = O.parse(ws, {}); rec('找到星期表头但没有时间栏：不瞎编成“已确认”，候选全部标 guessedTime + low，并给出 noTimes 提示', r.notes.indexOf('noTimes') >= 0 && r.lessons.length === 3 && r.lessons.every(l => l.guessedTime && l.low)); }
// 12 列表式
{ const ws = []; ['Monday', 'Math 08:00-09:00', 'English 09:15-10:00', 'Tuesday', '10.00 - 11.00 Science', 'Wed 13:00-14:00 Art'].forEach((t, i) => { let x = 40; t.split(' ').forEach(wd => { ws.push(W(wd, x, 100 + i * 40, 90)); x += wd.length * 11 + 10; }); });
  const r = O.parse(ws, {}); rec('列表式课表（没有网格）：按“星期 + 时间 + 名称”逐行解析，星期可沿用上一行', r.mode === 'list' && key(r) === '0:480:540:Math | 0:555:600:English | 1:600:660:Science | 2:780:840:Art', key(r)); }
// 13 文字太少
{ const r = O.parse([W('hello', 10, 10), W('world', 100, 10)], {}); rec('文字太少：返回 fewWords，不崩溃', r.notes.indexOf('fewWords') >= 0 && r.lessons.length === 0); }
// 14 时间 / 星期解析
{ const P = O.parseTimes;
  rec('parseTimes：O7:3O → 07:30；7.30pm → 19:30；12:15 AM → 00:15；25:00 → 无效；8,30-9,15 → 区间', P('O7:3O').s === 450 && P('7.30pm').s === 1170 && P('12:15 AM').s === 15 && P('25:00') === null && P('8,30-9,15').s === 510 && P('8,30-9,15').e === 555);
  const M = O.matchDay;
  rec('matchDay：MON / Isn / Jumaat / Khamis / 星期五 / 礼拜三 / Thurs ✓；Monkey / Sunny / Math ✗', M('MON') === 0 && M('Isn') === 0 && M('Jumaat') === 4 && M('Khamis') === 3 && M('星期五') === 4 && M('礼拜三') === 2 && M('Thurs') === 3 && M('Monkey') === -1 && M('Sunny') === -1 && M('Math') === -1); }
// 15 确定性 + 不修改输入
{ const ws = grid({ days: D5, labels: ['08:00-08:40', '08:40-09:20'], cells: [['Math', 'Art', '', '', ''], ['', '', 'Music', '', '']] }), snap = JSON.stringify(ws), a = O.parse(ws, {}), b = O.parse(ws, {}); rec('相同输入 → 相同输出；输入没被修改', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(ws) === snap); }
// 16 稳健性：乱序文字框、重叠、负数、超大坐标、空文字，2000 次都不能抛异常，且返回结构完整
{ let seed = 99, bad = 0; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296, pick = a => a[Math.floor(rnd() * a.length)];
  const T = ['Mon', 'Tue', 'Wed', '08:00', '8.30-9.15', 'Math', 'REHAT', '周一', '数', '学', '|', '--', '12:xx', '', ' ', 'Rm', '13', 'AM', 'Isnin', '9:99'];
  for (let n = 0; n < 2000; n++) { const ws = []; for (let k = Math.floor(rnd() * 60); k >= 0; k--) { const x = Math.floor(rnd() * 3000) - 100, y = Math.floor(rnd() * 3000) - 100; ws.push({ t: pick(T), x0: x, y0: y, x1: x + Math.floor(rnd() * 400) - 20, y1: y + Math.floor(rnd() * 80) - 5, c: rnd() < 0.1 ? -1 : Math.floor(rnd() * 100) }); }
    try { const r = O.parse(ws, {}); if (!Array.isArray(r.lessons) || !Array.isArray(r.notes) || !Array.isArray(r.unplaced)) bad++; r.lessons.forEach(l => { if (!(l.day >= 0 && l.day <= 6) || !(l.s >= 0 && l.e <= 1440 + 720) || typeof l.t !== 'string') bad++; }); } catch (e) { bad++; if (bad < 3) console.log('   threw', e.message); } }
  rec('稳健性：2000 组乱序 / 重叠 / 负坐标 / 空文字的文字框，0 次异常、返回结构完整、日在 0–6', bad === 0, bad + ' bad'); }
// 17 真实 Tesseract 输出（TSV）的准确率门槛
{ const dir = path.join(__dirname, 'ocr/fixtures'); let gt = 0, pr = 0, ok = 0;
  const sim = (a, b) => { a = a.toLowerCase().replace(/[^a-z0-9]/g, ''); b = b.toLowerCase().replace(/[^a-z0-9]/g, ''); if (!a || !b) return 0; const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return 1 - d[m][n] / Math.max(m, n); };
  const names = fs.readdirSync(dir).filter(f => /^tt\d+\.json$/.test(f)).sort(); 
  names.forEach(f => { const g = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), r = O.parse(O.tsvToWords(fs.readFileSync(path.join(dir, f.replace('.json', '.tsv')), 'utf8')), {}), used = new Set(); pr += r.lessons.length;
    g.lessons.forEach(l => { gt++; let b = -1, bs = 0; r.lessons.forEach((p, i) => { if (used.has(i) || p.day !== l.day) return; const s = sim(p.t, l.t) >= 0.75, t = Math.abs(p.s - l.s) <= 5 && Math.abs(p.e - l.e) <= 5, sc = (s ? 1 : 0) + (t ? 1 : 0); if (s && t && sc > bs) { bs = sc; b = i; } }); if (b >= 0) { ok++; used.add(b); } }); });
  const rc = ok / gt, pc = ok / pr; rec('真实 Tesseract 输出（' + names.length + ' 张合成课表，经过预处理）：召回 ≥ 80%、精确率 ≥ 80%', rc >= 0.8 && pc >= 0.8, 'recall ' + (100 * rc).toFixed(1) + '% precision ' + (100 * pc).toFixed(1) + '% (' + gt + ' lessons)'); }

const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
