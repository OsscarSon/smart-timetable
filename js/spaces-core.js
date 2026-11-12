// Work Space / Life Space · 纯函数聚合层（v9.8.8）。不碰 DOM / 本机存储 / 全局变量，Node 里也能跑（见 tests/spaces-unit.cjs）。
// 口径（界面上的每个数字都只来自这里）：
//  · 条目 = 现有课表里的“手动安排(m) + 重复活动(r)”。固定课程不算（上课留在学习空间）；
//    自动排的学习时段（a:1）和属于“学习”目标的关联时段由调用方在 snapshot 里先剔除。
//  · 现有活动没有“工作 / 生活”分类字段，所以这里不去猜：Work 和 Life 读的是同一份课表，只是看的角度不同。
//  · 本周已排时间 = 本周每天的时间区间并集（重叠只算一次）。它是“排了多少”，不是“实际做了多少”。
//  · 打卡 / 饮水 / 精力 全部原样读取现有记录；没有记录就返回空，不编数字。
(function (root) {
  'use strict';

  function num(v) { v = +v; return isFinite(v) ? v : NaN; }
  function unionMin(iv) {
    iv = iv.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var tot = 0, cs = null, ce = null;
    iv.forEach(function (x) {
      if (cs === null) { cs = x[0]; ce = x[1]; return; }
      if (x[0] <= ce) { if (x[1] > ce) ce = x[1]; } else { tot += ce - cs; cs = x[0]; ce = x[1]; }
    });
    if (cs !== null) tot += ce - cs;
    return tot;
  }
  function clean(items) {
    var out = [];
    (items || []).forEach(function (it) {
      var s = Math.max(0, num(it.s)), e = Math.min(1440, num(it.e)), dn = num(it.dn);
      if (!isFinite(s) || !isFinite(e) || !isFinite(dn) || e <= s) return;
      out.push({ dn: dn, s: s, e: e, t: String(it.t == null ? '' : it.t), src: it.src === 'r' ? 'r' : 'm', done: !!it.done, goalId: it.goalId || '', goalSpace: it.goalSpace || '' });
    });
    out.sort(function (a, b) { return a.dn - b.dn || a.s - b.s || a.e - b.e; });
    return out;
  }
  // today 的条目状态：done（用户点了完成）/ now（正在进行）/ later（还没开始）/ past（时间过了但没标记完成，不下结论）
  function statusOf(it, now) {
    if (it.done) return 'done';
    if (it.s <= now && now < it.e) return 'now';
    if (it.s > now) return 'later';
    return 'past';
  }

  function work(s, items) {
    var td = s.todayDn, now = s.nowMin, list = items.filter(function (i) { return i.dn === td; }).map(function (i) {
      return { s: i.s, e: i.e, t: i.t, src: i.src, status: statusOf(i, now), next: false, goalId: i.goalId, goalSpace: i.goalSpace };
    });
    var nx = null; list.forEach(function (i) { if (!nx && i.status === 'later') nx = i; });
    if (nx) nx.next = true;
    var wk = {};
    items.forEach(function (i) { if (i.dn >= s.weekFrom && i.dn <= s.weekTo) (wk[i.dn] = wk[i.dn] || []).push([i.s, i.e]); });
    var weekMin = 0; Object.keys(wk).forEach(function (k) { weekMin += unionMin(wk[k]); });
    var goals = (s.goals || []).filter(function (g) { return g && g.space === 'work' && g.status === 'active'; }).map(function (g) {
      return { id: g.id, title: g.title, pct: g.pct, hasEst: !!g.hasEst, daysLeft: g.daysLeft == null ? null : g.daysLeft };
    }).sort(function (a, b) {
      var A = a.daysLeft == null ? 1e9 : a.daysLeft, B = b.daysLeft == null ? 1e9 : b.daysLeft; return A - B;
    }).slice(0, 3);
    return {
      flow: list, count: list.length, done: list.filter(function (i) { return i.status === 'done'; }).length,
      next: nx ? { s: nx.s, t: nx.t } : null, weekMin: weekMin, goalsOn: !!s.goalsOn, goals: goals
    };
  }

  function life(s, items) {
    var td = s.todayDn, now = s.nowMin, ag = [];
    items.forEach(function (i) {
      if (i.dn === td) { var st = statusOf(i, now); if (st === 'now' || st === 'later') ag.push({ day: 'today', s: i.s, e: i.e, t: i.t, src: i.src, goalId: i.goalId }); }
      else if (i.dn === td + 1 && !i.done) ag.push({ day: 'tomorrow', s: i.s, e: i.e, t: i.t, src: i.src, goalId: i.goalId });
    });
    var bt = s.bt || { am: [], pm: [], doneAm: [], donePm: [] }, groups = [], total = 0, done = 0;
    [['am', bt.am, bt.doneAm], ['pm', bt.pm, bt.donePm]].forEach(function (g) {
      var steps = (g[1] || []).map(function (name, i) { var d = (g[2] || []).indexOf(i) >= 0; total++; if (d) done++; return { i: i, name: name, done: d }; });
      groups.push({ key: g[0], steps: steps });
    });
    var w = s.water || {}, level = s.energy === 'low' || s.energy === 'medium' || s.energy === 'high' ? s.energy : '';
    return { agenda: ag.slice(0, 6), rituals: { groups: groups, total: total, done: done }, water: { w: +w.w || 0, goal: +w.goal || 0, has: !!w.goal }, energy: level };
  }

  function build(s) {
    s = s || {};
    var items = clean(s.items);
    return { work: work(s, items), life: life(s, items) };
  }

  var api = { build: build, unionMin: unionMin, clean: clean, statusOf: statusOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SpacesCore = api;
})(typeof window !== 'undefined' ? window : this);
