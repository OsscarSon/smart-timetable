// Mochi Wrapped 2.0 · 统一统计口径（纯函数，不碰 DOM / localStorage / 全局变量，Node 里也能跑，见 tests/wrapped-stats.test.cjs）
//
// 口径（每张卡片的“来源说明”都引用这里）：
//  · 范围 = [from, to] 的 dayNum（含两端）。调用方负责把 to 截到今天——Wrapped 是回顾，不统计还没发生的日子。
//  · 条目 = 手动安排(m) + 重复活动(r) + 固定课程(f)。每个条目 { dn, s, e, t, src, done }，s/e 为当天分钟，裁剪到 0–1440。
//  · “计划时长”= 每天所有条目时间区间的并集（互相重叠的时间只算一次），再按天相加。
//  · “各活动时长”按条目自己的时长累计（同名合并），所以重叠时各项之和可以大于计划时长。
//  · “已标记完成”只对手动/重复条目有意义（课程不能打勾），并且只统计“已经过去”的条目：
//      dn < todayDn，或 dn == todayDn 且 e <= nowMin。它表示“你点了完成”，不是实际花费时间。
//  · 数据不足时返回 enough.* = false，由界面显示“数据不足”，不做任何推断。
(function (root) {
  'use strict';
  var MIN_ITEMS = 5, MIN_DAYS = 3, MIN_MARKABLE = 3;

  function cleanName(t) { return String(t == null ? '' : t).replace(/^[^\p{L}\p{N}]+/u, '').trim(); }
  function merge(iv) {
    iv = iv.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var out = [];
    iv.forEach(function (x) { var l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push([x[0], x[1]]); });
    return out;
  }
  function overlapMin(iv, a, b) { var t = 0; iv.forEach(function (x) { var s = Math.max(x[0], a), e = Math.min(x[1], b); if (e > s) t += e - s; }); return t; }

  function compute(inp) {
    var from = inp.from, to = inp.to, ws = inp.ws || 0;
    var today = inp.todayDn == null ? to : inp.todayDn, nowMin = inp.nowMin == null ? 1440 : inp.nowMin;
    var items = [];
    (inp.items || []).forEach(function (it) {
      var s = Math.max(0, +it.s), e = Math.min(1440, +it.e);
      if (!(it.dn >= from && it.dn <= to) || !isFinite(s) || !isFinite(e) || e <= s) return;
      items.push({ dn: it.dn, s: s, e: e, name: cleanName(it.t), src: it.src, done: it.done });
    });

    var byDay = {};
    items.forEach(function (it) { (byDay[it.dn] = byDay[it.dn] || []).push([it.s, it.e]); });
    var merged = {}, dayMin = {}, hourly = []; for (var h = 0; h < 24; h++) hourly.push(0);
    var total = 0, busiest = null, days = Object.keys(byDay).map(Number).sort(function (a, b) { return a - b; });
    days.forEach(function (dn) {
      var m = merged[dn] = merge(byDay[dn]), sum = 0;
      m.forEach(function (x) { sum += x[1] - x[0]; for (var k = 0; k < 24; k++) hourly[k] += overlapMin([x], k * 60, k * 60 + 60); });
      dayMin[dn] = sum; total += sum;
      if (!busiest || sum > busiest.min) busiest = { dn: dn, min: sum };
    });

    var slots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    hourly.forEach(function (v, k) { slots[k >= 5 && k < 12 ? 'morning' : k >= 12 && k < 17 ? 'afternoon' : k >= 17 && k < 22 ? 'evening' : 'night'] += v; });
    var peakHour = null; hourly.forEach(function (v, k) { if (v > 0 && (peakHour === null || v > hourly[peakHour])) peakHour = k; });

    var bySrc = { m: { n: 0, min: 0 }, r: { n: 0, min: 0 }, f: { n: 0, min: 0 } }, act = {}, longest = null;
    items.forEach(function (it) {
      var d = it.e - it.s, b = bySrc[it.src] || (bySrc[it.src] = { n: 0, min: 0 }); b.n++; b.min += d;
      var key = it.name.toLowerCase(), a = act[key] || (act[key] = { name: it.name, min: 0, n: 0 }); a.min += d; a.n++;
      if (!longest || d > longest.min) longest = { min: d, name: it.name, dn: it.dn };
    });
    var top = Object.keys(act).map(function (k) { return act[k]; }).sort(function (a, b) { return b.min - a.min || (a.name < b.name ? -1 : 1); }).slice(0, 5);

    var weeks = {}, bw = null;
    days.forEach(function (dn) { var w = Math.floor((dn + 3 - ws) / 7); weeks[w] = (weeks[w] || 0) + dayMin[dn]; });
    Object.keys(weeks).forEach(function (w) { w = +w; if (!bw || weeks[w] > bw.min) bw = { startDn: w * 7 - 3 + ws, min: weeks[w] }; });

    var streak = 0, run = 0; for (var d = from; d <= to; d++) { if (dayMin[d] > 0) { run++; if (run > streak) streak = run; } else run = 0; }
    var free = 0, lastPast = Math.min(to, today);
    for (var q = from; q <= lastPast; q++) if (overlapMin(merged[q] || [], 17 * 60, 22 * 60) === 0) free++;

    var mk = items.filter(function (it) { return (it.src === 'm' || it.src === 'r') && typeof it.done === 'boolean' && (it.dn < today || (it.dn === today && it.e <= nowMin)); });
    var done = mk.filter(function (it) { return it.done; });
    var pv = { eligible: mk.length, done: done.length, eligibleMin: 0, doneMin: 0, rate: mk.length ? done.length / mk.length : null };
    mk.forEach(function (it) { pv.eligibleMin += it.e - it.s; if (it.done) pv.doneMin += it.e - it.s; });

    return {
      range: { from: from, to: to, days: to >= from ? to - from + 1 : 0 },
      items: items.length, activeDays: days.length, plannedMin: total, avgPerActiveDay: days.length ? total / days.length : null,
      bySrc: bySrc, busiest: busiest, hourly: hourly, slots: slots, peakHour: peakHour, top: top, longest: longest, busiestWeek: bw,
      streak: streak, freeEvenings: free, planVsDone: pv,
      tasksDone: inp.tasksDone == null ? null : inp.tasksDone,
      enough: { overall: items.length >= MIN_ITEMS && days.length >= MIN_DAYS, planVsDone: mk.length >= MIN_MARKABLE },
      min: { items: MIN_ITEMS, days: MIN_DAYS, markable: MIN_MARKABLE }
    };
  }
  var api = { compute: compute, cleanName: cleanName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MochiWrappedStats = api;
})(typeof window !== 'undefined' ? window : globalThis);
