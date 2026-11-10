// 本机 OCR（开源：Tesseract.js，Apache-2.0）→ 课表。图片只在这台设备上处理，不上传。
// 结构：
//  1) 纯函数（Node 里可测）：tsvToWords / blocksToWords / parse —— 把 OCR 的“词 + 位置”还原成课程列表（网格课表优先，列表式课表兜底）；
//  2) 浏览器部分 OCR.recognize：按需加载 Tesseract.js（固定版本、第一次使用前先征得同意）→ 预处理图片 → 识别 → parse。
// 任何识别结果都只是“候选”：必须在 AI 助手里逐项核对 / 修改，确认后才写入（见 js/ai.js）。
(function (root) {
  'use strict';
  var VERSION = '6.0.1', SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';      // 固定版本；升级时两处一起改

  // ---------- 小工具 ----------
  function isCJK(ch) { return /[\u3400-\u9fff\uf900-\ufaff]/.test(ch); }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function joinText(parts) {      // 中文字之间不加空格，其余加空格
    var out = ''; parts.forEach(function (p) { if (!p) return; if (out && !(isCJK(out.slice(-1)) && isCJK(p.charAt(0)))) out += ' '; out += p; }); return out;
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j; if (!m) return n; if (!n) return m;
    for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return d[m][n];
  }

  // ---------- 星期名（英 / 中 / 马来文）。0 = 周一 ----------
  var DAYN = [
    ['monday', 'mon', 'isnin', 'isn', '周一', '週一', '星期一', '礼拜一', '禮拜一'],
    ['tuesday', 'tues', 'tue', 'selasa', 'sel', '周二', '週二', '星期二', '礼拜二', '禮拜二'],
    ['wednesday', 'wed', 'rabu', 'rab', '周三', '週三', '星期三', '礼拜三', '禮拜三'],
    ['thursday', 'thurs', 'thur', 'thu', 'khamis', 'kha', '周四', '週四', '星期四', '礼拜四', '禮拜四'],
    ['friday', 'fri', 'jumaat', 'jumat', 'jum', '周五', '週五', '星期五', '礼拜五', '禮拜五'],
    ['saturday', 'sat', 'sabtu', 'sab', '周六', '週六', '星期六', '礼拜六', '禮拜六'],
    ['sunday', 'sun', 'ahad', 'ahd', '周日', '週日', '周天', '星期日', '星期天', '礼拜日', '礼拜天', '禮拜日']];
  function matchDay(text) {
    var s = String(text || '').toLowerCase().replace(/[^a-z\u3400-\u9fff\uf900-\ufaff]/g, '');
    if (!s) return -1;
    for (var d = 0; d < 7; d++) for (var k = 0; k < DAYN[d].length; k++) if (s === DAYN[d][k]) return d;
    if (/^[a-z]{5,}$/.test(s)) for (var d2 = 0; d2 < 7; d2++) for (var k2 = 0; k2 < DAYN[d2].length; k2++) { var w = DAYN[d2][k2]; if (w.length >= 5 && /^[a-z]+$/.test(w) && Math.abs(w.length - s.length) <= 1 && lev(s, w) <= 1) return d2; }
    return -1;
  }

  // ---------- 时间 ----------
  function fixDigits(s) { return String(s).replace(/[Oo]/g, '0').replace(/[lI|]/g, '1').replace(/S/g, '5').replace(/B/g, '8'); }
  var T1 = '(\\d{1,2})\\s*[:.,\\uFF1A]\\s*(\\d{2})\\s*([ap]\\.?m\\.?)?';
  var RANGE = new RegExp(T1 + '\\s*(?:[-\\u2013\\u2014~]|to|hingga|hingga|sehingga|\\u81f3)\\s*' + T1, 'i'), SINGLE = new RegExp(T1, 'i');
  function toMin(h, m, ap) { h = +h; m = +m; if (h > 24 || m > 59) return null; if (ap) { ap = ap.toLowerCase().charAt(0); if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; } return h * 60 + m; }
  function parseTimes(text) {          // → { s, e|null, ap:boolean } 或 null
    var t = String(text || ''), c = /[:.,\uFF1A]/.test(t) ? t.replace(/[OolI|SB]/g, function (ch) { return fixDigits(ch); }) : t, m;
    if (!/\d/.test(c)) return null;
    if ((m = RANGE.exec(c))) { var a = toMin(m[1], m[2], m[3]), b = toMin(m[4], m[5], m[6]); if (a !== null && b !== null) return { s: a, e: b, ap: !!(m[3] || m[6]) }; }
    if ((m = SINGLE.exec(c))) { var s = toMin(m[1], m[2], m[3]); if (s !== null) return { s: s, e: null, ap: !!m[3] }; }
    return null;
  }

  // ---------- 输入归一：TSV / tesseract.js blocks → words ----------
  function tsvToWords(tsv) {
    var out = [], lines = String(tsv || '').split(/\r?\n/), i;
    for (i = 1; i < lines.length; i++) {
      var f = lines[i].split('\t'); if (f.length < 12 || f[0] !== '5') continue;
      var text = f.slice(11).join('\t').trim(); if (!text) continue;
      var x = +f[6], y = +f[7], w = +f[8], h = +f[9];
      out.push({ t: text, x0: x, y0: y, x1: x + w, y1: y + h, c: +f[10], ln: f[2] + '-' + f[3] + '-' + f[4] });
    }
    return out;
  }
  function blocksToWords(blocks) {
    var out = [], n = 0;
    (blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) { n++; (l.words || []).forEach(function (w) {
      var t = String(w.text || '').trim(); if (!t || !w.bbox) return; out.push({ t: t, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1, c: w.confidence, ln: 'L' + n }); }); }); }); });
    return out;
  }

  // ---------- 词 → 记号（同一行里挨得很近的词并成一个）----------
  function tokenize(words, mh) {
    var ws = words.map(function (w) { return { t: w.t, x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1, c: w.c, cy: (w.y0 + w.y1) / 2 }; }).sort(function (a, b) { return a.cy - b.cy || a.x0 - b.x0; });
    var rows = []; ws.forEach(function (w) { var r = rows[rows.length - 1]; if (r && Math.abs(w.cy - r.cy) <= mh * 0.5) { r.items.push(w); r.cy = (r.cy * (r.items.length - 1) + w.cy) / r.items.length; } else rows.push({ cy: w.cy, items: [w] }); });
    var toks = [];
    rows.forEach(function (r) {
      r.items.sort(function (a, b) { return a.x0 - b.x0; });
      var cur = null;
      r.items.forEach(function (w) {
        var lastCh = cur ? cur.parts[cur.parts.length - 1].slice(-1) : '', cjkGap = cur && isCJK(w.t.charAt(0)) && isCJK(lastCh) ? mh * 1.0 : mh * 0.9;
        if (cur && w.x0 - cur.x1 <= cjkGap) { cur.parts.push(w.t); cur.x1 = Math.max(cur.x1, w.x1); cur.y0 = Math.min(cur.y0, w.y0); cur.y1 = Math.max(cur.y1, w.y1); cur.cs.push([w.c, w.t.length]); }
        else { if (cur) toks.push(cur); cur = { parts: [w.t], x0: w.x0, x1: w.x1, y0: w.y0, y1: w.y1, cs: [[w.c, w.t.length]] }; }
      });
      if (cur) toks.push(cur);
    });
    return toks.map(function (k) { var tw = 0, sw = 0; k.cs.forEach(function (p) { tw += p[1]; sw += p[0] * p[1]; }); return { t: joinText(k.parts), x0: k.x0, x1: k.x1, y0: k.y0, y1: k.y1, cx: (k.x0 + k.x1) / 2, cy: (k.y0 + k.y1) / 2, c: tw ? sw / tw : 0 }; });
  }

  var BREAKS = /^(rehat|istirehat|recess|break|lunch|assembly|perhimpunan|solat|sembahyang|休息|午休|午餐|课间|早会|集会)$/i;
  var ROOM = /^(?:(?:bilik|room|rm|kelas|makmal|dewan|lab|教室|室)\s*)?[A-Za-z]{0,3}[\s-]?\d{1,3}[A-Za-z]?$/;
  var TEACHER = /^(?:cikgu|cg|pn|puan|en|encik|mr|ms|mrs|miss|dr|ustaz|ustazah|teacher|tr)\b\.?/i;
  function splitCell(lines) {
    var title = [], room = '', teacher = '';
    lines.forEach(function (l, i) {
      if (i > 0 && !room && ROOM.test(l) && /\d/.test(l)) room = l;
      else if (i > 0 && !teacher && (TEACHER.test(l) || /(老师|老師|教师)$/.test(l))) teacher = l;
      else title.push(l);
    });
    return { t: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 40), room: room.slice(0, 20), teacher: teacher.slice(0, 30) };
  }

  // ---------- 主入口 ----------
  // words: [{t,x0,y0,x1,y1,c}]；返回 { mode, lessons:[{day,s,e,t,room,teacher,conf,low}], unplaced:[], notes:[], stats:{} }
  function parse(words, opts) {
    opts = opts || {};
    var res = { mode: 'none', lessons: [], unplaced: [], notes: [], stats: { words: 0, avgConf: 0 } };
    words = (words || []).filter(function (w) { return w && String(w.t || '').trim() && w.c >= 0; });
    res.stats.words = words.length;
    if (words.length < 6) { res.notes.push('fewWords'); return res; }
    res.stats.avgConf = Math.round(words.reduce(function (a, w) { return a + w.c; }, 0) / words.length);
    var mh = median(words.map(function (w) { return w.y1 - w.y0; })) || 12;
    var toks = tokenize(words, mh), lowConf = opts.lowConf || 60;

    // ---- 网格：找星期表头 ----
    var heads = []; toks.forEach(function (k) { var d = matchDay(k.t); if (d >= 0) heads.push({ k: k, d: d }); });
    var best = null; heads.forEach(function (h) {
      var grp = heads.filter(function (o) { return Math.abs(o.k.cy - h.k.cy) <= mh * 0.9; }), days = {}; grp.forEach(function (o) { days[o.d] = o; });
      var n = Object.keys(days).length; if (!best || n > best.n) best = { n: n, days: days, y: h.k.cy };
    });
    if (best && best.n >= 3) return gridParse(toks, best, mh, lowConf, res);
    return listParse(toks, mh, lowConf, res);
  }

  function gridParse(toks, hd, mh, lowConf, res) {
    res.mode = 'grid';
    var cols = Object.keys(hd.days).map(function (d) { var o = hd.days[d]; return { d: +d, cx: o.k.cx, x0: o.k.x0 }; }).sort(function (a, b) { return a.cx - b.cx; });
    var gap = median(cols.slice(1).map(function (c, i) { return c.cx - cols[i].cx; })) || 100;
    cols.forEach(function (c, i) { c.l = i === 0 ? c.cx - gap / 2 : (cols[i - 1].cx + c.cx) / 2; c.r = i === cols.length - 1 ? c.cx + gap / 2 : (c.cx + cols[i + 1].cx) / 2; });
    var headBottom = hd.y + mh, left = cols[0].l, used = {};
    // 时间标签：表头下方、第一列左边
    var labs = toks.filter(function (k) { return k.cy > headBottom && k.cx < left + gap * 0.05; });
    // 同一行里的标签记号先拼起来（“07:45”“-”“08:15” 常被拆成三个记号），再整体解析成区间
    var ll = []; labs.slice().sort(function (a, b) { return a.cy - b.cy || a.x0 - b.x0; }).forEach(function (k) { var l = ll[ll.length - 1]; if (l && Math.abs(k.cy - l.cy) <= mh * 0.6) { l.toks.push(k); l.cy = (l.cy + k.cy) / 2; } else ll.push({ cy: k.cy, toks: [k] }); });
    var times = []; ll.forEach(function (l) { l.toks.sort(function (a, b) { return a.x0 - b.x0; }); var text = joinText(l.toks.map(function (k) { return k.t; })), p = parseTimes(text); if (p) times.push({ k: { t: text, cx: (l.toks[0].x0 + l.toks[l.toks.length - 1].x1) / 2, cy: l.cy }, p: p }); });
    times.sort(function (a, b) { return a.k.cy - b.k.cy; });
    // 上下两行叠在一个格子里的“开始 / 结束”：看相邻标签的间距——短、长交替（同一格里的两行近，格与格之间远）就两两配对
    var singles = times.every(function (t) { return t.p.e === null; }), rows = [];
    if (singles && times.length >= 4) {
      var gp = []; for (var gi = 0; gi + 1 < times.length; gi++) gp.push(times[gi + 1].k.cy - times[gi].k.cy);
      var ev = median(gp.filter(function (_, i) { return i % 2 === 0; })), od = median(gp.filter(function (_, i) { return i % 2 === 1; })), startAt = -1;
      if (ev < od * 0.7) startAt = 0; else if (od < ev * 0.7) startAt = 1;
      if (startAt >= 0) {
        for (var ti = 0; ti < times.length; ti++) {
          if (ti >= startAt && (ti - startAt) % 2 === 0 && ti + 1 < times.length) { var A = times[ti], B = times[ti + 1]; rows.push({ p: { s: A.p.s, e: B.p.s, ap: A.p.ap || B.p.ap }, cy: (A.k.cy + B.k.cy) / 2, cx: A.k.cx, pair: true }); ti++; }
          else rows.push({ p: times[ti].p, cy: times[ti].k.cy, cx: times[ti].k.cx });
        }
      }
    }
    if (!rows.length) times.forEach(function (t) { rows.push({ p: t.p, cy: t.k.cy, cx: t.k.cx }); });
    if (rows.length < 2) { res.notes.push('noTimes'); return gridNoTimes(toks, cols, hd, mh, lowConf, res); }
    // 12 小时制：时间应从上到下递增，且在上学时间（5:30–19:00）内。对每一行在“原值 / +12 小时”里选一个，
    // 用动态规划让翻转次数最少、不出现倒退——单个行被 OCR 读错时不会连累后面所有行。有 AM/PM 的行不动。
    (function () {
      var n = rows.length, INF = 1e9, cost = [], from = [], i, k;
      function cand(r) { var a = [{ v: r.p.s, e: r.p.e, f: 0 }]; if (!r.p.ap && r.p.s + 720 < 1440) a.push({ v: r.p.s + 720, e: r.p.e === null ? null : r.p.e + 720, f: 1 }); return a; }
      var C = rows.map(cand);
      for (i = 0; i < n; i++) { cost[i] = []; from[i] = [];
        C[i].forEach(function (c, ci) { var own = c.f + ((c.v < 330 || c.v > 1140) ? 5 : 0), best = i === 0 ? 0 : INF, bf = -1;
          if (i > 0) C[i - 1].forEach(function (pc, pi) { if (pc.v <= c.v && cost[i - 1][pi] < best) { best = cost[i - 1][pi]; bf = pi; } });
          cost[i][ci] = best >= INF ? INF : best + own; from[i][ci] = bf; }); }
      var last = cost[n - 1], bi = last.indexOf(Math.min.apply(null, last));
      if (last[bi] >= INF) { var prev = -1; rows.forEach(function (r) { var s = r.p.s, e = r.p.e; if (!r.p.ap) { while (s < prev && s + 720 <= 1440) { s += 720; if (e !== null) e += 720; } } r.s = s; r.e = e; prev = Math.max(prev, s); }); }
      else for (i = n - 1; i >= 0; i--) { rows[i].s = C[i][bi].v; rows[i].e = C[i][bi].e; bi = from[i][bi]; }
      rows.forEach(function (r) { if (r.e !== null && r.e <= r.s && !r.p.ap) while (r.e <= r.s && r.e + 720 <= 1440) r.e += 720; });
    })();
    var durs = rows.filter(function (r) { return r.e !== null && r.e > r.s; }).map(function (r) { return r.e - r.s; }), defDur = median(durs) || median(rows.slice(1).map(function (r, i) { return r.s - rows[i].s; }).filter(function (x) { return x > 0; })) || 40;
    rows.forEach(function (r, i) { if (r.e === null || r.e <= r.s) r.e = (i + 1 < rows.length && rows[i + 1].s > r.s) ? rows[i + 1].s : r.s + defDur; });
    rows.forEach(function (r, i) { r.top = i === 0 ? headBottom : (rows[i - 1].cy + r.cy) / 2; r.bot = i === rows.length - 1 ? r.cy + (r.cy - (rows[i - 1] ? rows[i - 1].cy : r.cy - 40)) / 2 + mh : (r.cy + rows[i + 1].cy) / 2; });
    // 把记号分配到单元格
    var cells = {}, rest = [];
    toks.forEach(function (k) {
      if (k.cy <= headBottom - mh * 0.2 || labs.indexOf(k) >= 0 || matchDay(k.t) >= 0 && Math.abs(k.cy - hd.y) <= mh) return;
      var col = cols.filter(function (c) { return k.cx >= c.l && k.cx < c.r; })[0], row = rows.filter(function (r) { return k.cy >= r.top && k.cy < r.bot; })[0];
      if (!col || !row) { if (k.cx >= left - gap && k.cy > headBottom) rest.push(k.t); return; }
      var key = col.d + '|' + rows.indexOf(row); (cells[key] = cells[key] || { col: col, row: row, toks: [] }).toks.push(k);
    });
    var out = [];
    Object.keys(cells).forEach(function (key) {
      var c = cells[key]; c.toks.sort(function (a, b) { return a.cy - b.cy || a.x0 - b.x0; });
      var lines = [], cw = 0, cs = 0; c.toks.forEach(function (k) { var l = lines[lines.length - 1]; if (l && Math.abs(k.cy - l.cy) <= mh * 0.6) { l.parts.push(k.t); } else lines.push({ cy: k.cy, parts: [k.t] }); cw += k.t.length; cs += k.c * k.t.length; });
      var texts = lines.map(function (l) { return joinText(l.parts); }), sp = splitCell(texts);
      if (sp.t.replace(/[^A-Za-z0-9\u3400-\u9fff]/g, '').length < 2) { if (texts.join('').trim()) rest.push(texts.join(' ')); return; }
      if (BREAKS.test(sp.t.trim())) return;
      var conf = cw ? Math.round(cs / cw) : 0, ri = rows.indexOf(c.row), s0 = c.row.s, e0 = c.row.e, ri2 = ri;
      // 合并格（连堂）：文字垂直居中在两行的交界处，且相邻那一格是空的 → 这一节跨两行
      var cyAvg = c.toks.reduce(function (a, k) { return a + k.cy; }, 0) / c.toks.length, rh = c.row.bot - c.row.top, off = cyAvg - (c.row.top + c.row.bot) / 2;
      if (Math.abs(off) > rh * 0.3) { var nb = off > 0 ? ri + 1 : ri - 1; if (rows[nb] && !cells[c.col.d + '|' + nb]) { s0 = Math.min(c.row.s, rows[nb].s); e0 = Math.max(c.row.e, rows[nb].e); ri = Math.min(ri, nb); ri2 = Math.max(rows.indexOf(c.row), nb); if (res.notes.indexOf('spanned') < 0) res.notes.push('spanned'); } }
      out.push({ day: c.col.d, s: s0, e: e0, t: sp.t, room: sp.room, teacher: sp.teacher, conf: conf, low: conf < lowConf, _ri: ri, _ri2: ri2 });
    });
    // 同一天、相邻时段、同名 → 合并成一节
    out.sort(function (a, b) { return a.day - b.day || a._ri - b._ri; });
    var merged = []; out.forEach(function (l) {
      var p = merged[merged.length - 1];
      if (p && p.day === l.day && p._ri2 + 1 === l._ri && p.t.toLowerCase() === l.t.toLowerCase()) { p.e = l.e; p._ri2 = l._ri2; p.conf = Math.min(p.conf, l.conf); p.low = p.low || l.low; if (res.notes.indexOf('merged') < 0) res.notes.push('merged'); }
      else merged.push(l);
    });
    merged.forEach(function (l) { delete l._ri; delete l._ri2; });
    res.lessons = merged; res.unplaced = rest.filter(function (x) { return x.length > 1; }).slice(0, 20);
    res.stats.cols = cols.length; res.stats.rows = rows.length; res.rows = rows.map(function (r) { return { s: r.s, e: r.e, y: Math.round(r.cy) }; });
    if (!merged.length) res.notes.push('noLessons');
    return res;
  }

  // 找到了星期表头但没找到时间标签（例如用 1、2、3… 节次）：只给“候选”，时间用默认值，一律不默认勾选
  function gridNoTimes(toks, cols, hd, mh, lowConf, res) {
    var headBottom = hd.y + mh, items = toks.filter(function (k) { return k.cy > headBottom && matchDay(k.t) < 0; });
    var ys = items.map(function (k) { return k.cy; }).sort(function (a, b) { return a - b; }), bands = [];
    ys.forEach(function (y) { var b = bands[bands.length - 1]; if (b && y - b.y1 < mh * 2.2) b.y1 = y; else bands.push({ y0: y, y1: y }); });
    var out = [], rest = [];
    bands.forEach(function (b, bi) {
      cols.forEach(function (c) {
        var cell = items.filter(function (k) { return k.cy >= b.y0 - 1 && k.cy <= b.y1 + 1 && k.cx >= c.l && k.cx < c.r; }).sort(function (a, b2) { return a.cy - b2.cy || a.x0 - b2.x0; });
        if (!cell.length) return;
        var sp = splitCell(cell.map(function (k) { return k.t; })); if (sp.t.length < 2 || BREAKS.test(sp.t)) return;
        var cf = Math.round(cell.reduce(function (a, k) { return a + k.c; }, 0) / cell.length);
        out.push({ day: c.d, s: 8 * 60 + bi * 40, e: 8 * 60 + bi * 40 + 40, t: sp.t, room: sp.room, teacher: sp.teacher, conf: cf, low: true, guessedTime: true });
      });
    });
    res.lessons = out; res.stats.cols = cols.length; res.stats.rows = bands.length; if (!out.length) res.notes.push('noLessons'); return res;
  }

  // ---------- 列表式课表兜底：“Mon 08:00-09:00 Math”/ 一行一节 ----------
  function listParse(toks, mh, lowConf, res) {
    res.mode = 'list';
    var lines = [], sorted = toks.slice().sort(function (a, b) { return a.cy - b.cy || a.x0 - b.x0; });
    sorted.forEach(function (k) { var l = lines[lines.length - 1]; if (l && Math.abs(k.cy - l.cy) <= mh * 0.6) l.toks.push(k); else lines.push({ cy: k.cy, toks: [k] }); });
    var day = -1, out = [], rest = [];
    lines.forEach(function (l) {
      l.toks.sort(function (a, b) { return a.x0 - b.x0; });
      var text = joinText(l.toks.map(function (k) { return k.t; })), cw = 0, cs = 0; l.toks.forEach(function (k) { cw += k.t.length; cs += k.c * k.t.length; });
      var d = -1, rem = text;
      var words = text.split(/\s+/), first = matchDay(words[0].replace(/[:：,]$/, ''));
      if (first >= 0) { d = first; rem = words.slice(1).join(' '); } else if (matchDay(text.replace(/[:：]$/, '')) >= 0) { day = matchDay(text); return; }
      if (d >= 0) day = d;
      var tm = parseTimes(rem); if (!tm) { if (text.trim().length > 2) rest.push(text); return; }
      if (day < 0) { rest.push(text); return; }
      var title = rem.replace(RANGE, ' ').replace(SINGLE, ' ').replace(/^[\s:：\-–—|,]+|[\s:：\-–—|,]+$/g, '').replace(/\s+/g, ' ');
      var e = tm.e !== null && tm.e > tm.s ? tm.e : tm.s + 40;
      if (title.replace(/[^A-Za-z0-9\u3400-\u9fff]/g, '').length < 2 || BREAKS.test(title)) return;
      var sp = splitCell([title]), conf = cw ? Math.round(cs / cw) : 0;
      out.push({ day: day, s: tm.s, e: e, t: sp.t, room: '', teacher: '', conf: conf, low: conf < lowConf });
    });
    res.lessons = out; res.unplaced = rest.slice(0, 20); res.notes.push(out.length ? 'list' : 'noGrid'); return res;
  }

  var api = { parse: parse, tsvToWords: tsvToWords, blocksToWords: blocksToWords, matchDay: matchDay, parseTimes: parseTimes, version: VERSION };
  root.OCR = api;
  if (typeof document === 'undefined') return;

  // ================= 浏览器部分 =================
  var libP = null;
  function loadLib() {
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    if (libP) return libP;
    libP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = SRC; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { root.Tesseract ? res(root.Tesseract) : rej(new Error('ocr-lib')); };
      s.onerror = function () { libP = null; rej(new Error('ocr-lib')); };
      document.head.appendChild(s);
    });
    return libP;
  }
  // 擦掉表格线：Tesseract 会把黑色格线当成文字、还会把相邻格子连成一行。只擦“很长的深色横线 / 竖线”（长度 ≥ 画面的 5%，文字笔画远达不到），
  // 字母被线穿过的地方会少一小截，但整体识别要好得多。歪斜的线（斜拍）擦不掉，这是已知限制。
  function removeLines(a, w, h) {
    var DARK = 120, minH = Math.max(50, Math.round(w * 0.05)), minV = Math.max(50, Math.round(h * 0.05)), kill = new Uint8Array(w * h), x, y, run, start, gaps;
    for (y = 0; y < h; y++) { run = 0; start = 0; gaps = 0;
      for (x = 0; x <= w; x++) { var dark = x < w && a[(y * w + x) * 4] < DARK;
        if (dark) { if (!run) start = x; run = x - start + 1; gaps = 0; }
        else if (run && x < w && ++gaps <= 2) { run++; }
        else { if (run >= minH) for (var k = start; k < start + run && k < w; k++) kill[y * w + k] = 1; run = 0; gaps = 0; } } }
    for (x = 0; x < w; x++) { run = 0; start = 0; gaps = 0;
      for (y = 0; y <= h; y++) { var dk = y < h && a[(y * w + x) * 4] < DARK;
        if (dk) { if (!run) start = y; run = y - start + 1; gaps = 0; }
        else if (run && y < h && ++gaps <= 2) { run++; }
        else { if (run >= minV) for (var q = start; q < start + run && q < h; q++) kill[q * w + x] = 1; run = 0; gaps = 0; } } }
    var i, n = w * h;      // 线的边缘（抗锯齿的灰边）也一起擦：只扩 1 像素，且只擦偏深的像素
    for (i = 0; i < n; i++) if (kill[i]) { a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = 255; }
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { i = y * w + x; if (!kill[i] && a[i * 4] < 200 && (kill[i - 1] || kill[i + 1] || kill[i - w] || kill[i + w])) { var nb = (kill[i - 1] ? 1 : 0) + (kill[i + 1] ? 1 : 0) + (kill[i - w] ? 1 : 0) + (kill[i + w] ? 1 : 0); if (nb >= 1 && a[i * 4] > 60) a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = 255; } }
  }
  // 预处理：最长边压到 2200px，转灰度并拉伸对比度（彩色格子、手机拍摄偏灰都会好一些）
  function prep(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 2200 / Math.max(im.width, im.height)), c = document.createElement('canvas'), w = Math.round(im.width * k), h = Math.round(im.height * k);
        c.width = w; c.height = h; var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h); URL.revokeObjectURL(u);
        try {
          var d = g.getImageData(0, 0, w, h), a = d.data, hist = new Uint32Array(256), i, n = w * h;
          for (i = 0; i < a.length; i += 4) { var y = (a[i] * 0.299 + a[i + 1] * 0.587 + a[i + 2] * 0.114) | 0; a[i] = a[i + 1] = a[i + 2] = y; hist[y]++; }
          var lo = 0, hi = 255, acc = 0; while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++; acc = 0; while (hi > 0 && (acc += hist[hi]) < n * 0.01) hi--;
          if (hi - lo > 40) for (i = 0; i < a.length; i += 4) { var v = Math.max(0, Math.min(255, ((a[i] - lo) * 255) / (hi - lo))); a[i] = a[i + 1] = a[i + 2] = v; }
          removeLines(a, w, h);
          g.putImageData(d, 0, 0);
        } catch (e) {}
        c.toBlob(function (b) { b ? res({ blob: b, w: w, h: h }) : rej(new Error('img')); }, 'image/png');
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u;
    });
  }
  // lang: 'latin'（英文 / 马来文）或 'zh'（中文 + 英文）。onProgress(stage, pct)；stage = lib | data | run
  async function recognize(file, o) {
    o = o || {}; var T = await loadLib(), langs = o.lang === 'zh' ? ['chi_sim', 'eng'] : ['eng'], on = o.onProgress || function () {};
    on('lib', 0);
    var worker = await T.createWorker(langs, 1, { logger: function (m) { if (!m) return; if (/loading (tesseract core|language)/i.test(m.status || '')) on('data', Math.round((m.progress || 0) * 100)); else if (/recognizing/i.test(m.status || '')) on('run', Math.round((m.progress || 0) * 100)); } });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });      // 11 = 稀疏文字：对表格比默认的自动分块更稳
      var p = await prep(file); on('run', 0);
      var r = await worker.recognize(p.blob, {}, { tsv: true, blocks: true }), d = r && r.data || {};
      var words = d.tsv ? tsvToWords(d.tsv) : blocksToWords(d.blocks);
      var out = parse(words, {}); out.size = { w: p.w, h: p.h }; return out;
    } finally { try { await worker.terminate(); } catch (e) {} }
  }
  api.recognize = recognize; api.src = SRC; api.prep = prep;
})(typeof window !== 'undefined' ? window : globalThis);
