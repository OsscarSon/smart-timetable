// Study Space · 只读聚合（v9.7 Phase 3A/3B）。输入是一份“纯数据快照”，输出是工作台 / 科目详情要显示的内容。
// 边界：不碰 DOM、不碰本机存储、不调用任何会写数据的函数；坏数据一律跳过，不抛错；排序全部确定（同样的数据，顺序永远一样）。
// 读到的数据都来自现有系统：ST.topics / ST.ex（章节 + 复习 + 考试日）、HW（作业）、WK + DN（课表 + 完成记录）、Goals + GoalsPlan（目标与排程）。这里不创建任何新的学习数据。
(function (root) {
  'use strict';
  var MAXHW = 12;                                  // hw.js 保存作业时把科目标签截到 12 个字；科目名更长时，作业上的标签是截断版本
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function str(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 200); }
  function fin(v) { if (v === '' || v == null || typeof v === 'boolean') return null; var n = Number(v); return isFinite(n) ? n : null; }
  function isoOk(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function dnOfIso(s) { if (!isoOk(s)) return null; var p = s.split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); }
  function isoOfDn(dn) { var x = new Date(dn * 864e5), p = function (n) { return (n < 10 ? '0' : '') + n; }; return x.getUTCFullYear() + '-' + p(x.getUTCMonth() + 1) + '-' + p(x.getUTCDate()); }
  function cmpS(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function cmpN(a, b) { return a - b; }
  function low(s) { return String(s || '').trim().toLowerCase(); }
  function sortBy(list, fns) {                      // 稳定排序：依次比较 fns，全相同时按原始顺序
    return list.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) {
      for (var k = 0; k < fns.length; k++) { var c = fns[k](a.x, b.x); if (c) return c; }
      return a.i - b.i;
    }).map(function (o) { return o.x; });
  }

  // ---------- 规范化 ----------
  // 章节：和 study.js 一致——iv===0 是“还没学过”；iv>0 且 nx<=今天 才是“该复习”（nx 读不出来就不算到期，和原有逻辑相同）
  function normTopics(list, today) {
    var out = [];
    arr(list).forEach(function (t, i) {
      if (!isObj(t)) return; var s = str(t.s, 80), n = str(t.n, 80); if (!s || !n) return;
      var iv = fin(t.iv); if (iv === null || iv < 0) iv = 0; var nx = fin(t.nx), fresh = iv === 0, due = !fresh && nx !== null && nx <= today;
      out.push({ idx: i, s: s, n: n, iv: iv, nx: nx, fresh: fresh, due: due, late: due ? Math.max(0, today - nx) : 0 });
    });
    return out;
  }
  function normHw(list, todayIso) {
    var out = [];
    arr(list).forEach(function (h, i) {
      if (!isObj(h)) return; var t = str(h.t, 80); if (!t) return;
      var due = isoOk(h.due) ? h.due : '', done = !!h.done, open = !done;
      out.push({ idx: i, id: str(h.id, 40), t: t, sb: str(h.sb, 40), sbRaw: String(h.sb == null ? '' : h.sb).slice(0, 40), due: due, done: done, doneAt: done ? (fin(h.done) || 1) : 0,
        overdue: open && !!due && due < todayIso, today: open && due === todayIso });
    });
    return out;
  }
  function normGoal(g, today) {
    if (!isObj(g) || !str(g.id, 80) || g.deletedAt) return null;
    var steps = arr(g.steps).filter(isObj).map(function (s) { return { title: str(s.title, 80), est: Math.max(0, fin(s.estimateMin) || 0), done: Math.max(0, fin(s.doneMin) || 0) }; });
    var tot = 0, dn = 0; steps.forEach(function (s) { tot += s.est; dn += Math.min(s.done, s.est); });
    var dl = isoOk(g.deadline) ? g.deadline : '', dd = dl ? dnOfIso(dl) - today : null;
    var sm = isObj(g.summary) ? g.summary : null;
    return { id: str(g.id, 80), title: str(g.title, 80) || '—', status: str(g.status, 20) || 'draft', deadline: dl, daysLeft: dd, steps: steps, pct: tot ? Math.round(dn / tot * 100) : null,
      sched: sm ? { n: Math.max(0, fin(sm.n) || 0), min: Math.max(0, fin(sm.min) || 0) } : null, line: str(g.line, 200) };
  }
  var GRANK = { active: 0, draft: 1, paused: 2, done: 3 };
  function goalsFor(goals, name) {
    var k = low(name); if (!k) return [];
    return sortBy(goals.filter(function (g) { return g.steps.some(function (s) { return low(s.title) === k; }); }),
      [function (a, b) { return (GRANK[a.status] == null ? 9 : GRANK[a.status]) - (GRANK[b.status] == null ? 9 : GRANK[b.status]); },
       function (a, b) { return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : (a.deadline || '9999') > (b.deadline || '9999') ? 1 : 0; },
       function (a, b) { return cmpS(a.title, b.title); }, function (a, b) { return cmpS(a.id, b.id); }]);
  }

  // ---------- 主函数 ----------
  // inp: { today(dayNum), nowMin, subs[subjList()], stSubs[ST.subs], topics[ST.topics], ex{ST.ex}, hw[HW], events[{w,dn,s,e,t,done,src,inWeek}], goals[…], goalsOn, colors{}, limit }
  function build(inp) {
    inp = isObj(inp) ? inp : {};
    var today = fin(inp.today); if (today === null) today = Math.floor(Date.now() / 864e5);
    var todayIso = isoOfDn(today), nowMin = fin(inp.nowMin); if (nowMin === null) nowMin = 0;
    var limit = Math.max(1, fin(inp.limit) || 6);
    var stSubs = []; arr(inp.stSubs).forEach(function (s) { s = str(s, 80); if (s && stSubs.indexOf(s) < 0) stSubs.push(s); });
    var topics = normTopics(inp.topics, today), hw = normHw(inp.hw, todayIso), ex = isObj(inp.ex) ? inp.ex : {};
    var on = !!inp.goalsOn, goals = on ? arr(inp.goals).map(function (g) { return normGoal(g, today); }).filter(Boolean).filter(function (g) { return g.status !== 'archived'; }) : [];

    // 科目名单：ST.subs（保持原顺序）+ subjList() 里有学习数据的；作业上被截断的标签并入同名的长科目
    var names = []; function add(n) { n = str(n, 80); if (n && names.indexOf(n) < 0) names.push(n); }
    stSubs.forEach(add); arr(inp.subs).forEach(add); topics.forEach(function (t) { add(t.s); }); hw.forEach(function (h) { add(h.sb); }); Object.keys(ex).forEach(add);
    // hw.js 是“先 trim 再截 12 字”，所以作业上的标签可能带尾随空格；这里两种写法都认。真实存在的短科目（在 ST.subs / 有章节 / 有考试日）不会被当成截断版本合并掉。
    var real = {}; stSubs.forEach(function (n) { real[n] = 1; }); topics.forEach(function (x) { real[x.s] = 1; }); Object.keys(ex).forEach(function (n) { real[str(n, 80)] = 1; });
    function longOf(sb, raw) { return names.filter(function (n) { var p = n.slice(0, MAXHW); return n.length > MAXHW && (p === raw || p.trim() === sb); }); }
    function isTrunc(n) { return n.length <= MAXHW && !real[n] && longOf(n, n).length > 0; }
    names = names.filter(function (n) { return !isTrunc(n); });
    function canon(sb, raw) {
      if (!sb) return ''; if (names.indexOf(sb) >= 0) return sb;
      var long = longOf(sb, raw); return long.length === 1 ? long[0] : sb;
    }
    hw.forEach(function (h) { h.subject = canon(h.sb, h.sbRaw); });

    var subjects = [];
    names.forEach(function (name) {
      var tps = topics.filter(function (t) { return t.s === name; }), hws = hw.filter(function (h) { return h.subject === name; });
      var exIso = isoOk(ex[name]) ? ex[name] : '', exDays = exIso ? dnOfIso(exIso) - today : null;
      var inPlan = stSubs.indexOf(name) >= 0;
      if (!inPlan && !tps.length && !hws.length && !exIso) return;                 // 只是课表里出现过的课，没有任何学习数据：不占工作台的位置
      var chapters = sortBy(tps, [function (a, b) { return (a.due ? 0 : a.fresh ? 1 : 2) - (b.due ? 0 : b.fresh ? 1 : 2); },
        function (a, b) { return (a.fresh || b.fresh) ? 0 : (a.nx === null ? 1e12 : a.nx) - (b.nx === null ? 1e12 : b.nx); }, function (a, b) { return cmpS(a.n, b.n); }])
        .map(function (t) { return { idx: t.idx, name: t.n, iv: t.iv, nx: t.nx, fresh: t.fresh, due: t.due, late: t.late, inDays: t.nx === null ? null : t.nx - today }; });
      var started = tps.filter(function (t) { return !t.fresh; }).length;
      var open = hws.filter(function (h) { return !h.done; });
      var hlist = sortBy(hws, [function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0); },
        function (a, b) { return a.done ? b.doneAt - a.doneAt : 0; },
        function (a, b) { return a.done ? 0 : cmpS(a.due || '9999-99-99', b.due || '9999-99-99'); }, function (a, b) { return cmpS(a.t, b.t); }, function (a, b) { return cmpS(a.id, b.id); }])
        .map(function (h) { return { idx: h.idx, id: h.id, title: h.t, due: h.due, done: h.done, overdue: h.overdue, today: h.today }; });
      subjects.push({
        name: name, inPlan: inPlan, color: (isObj(inp.colors) && inp.colors[name]) || '',
        chapters: { total: tps.length, started: started, fresh: tps.length - started, due: tps.filter(function (t) { return t.due; }).length, pct: tps.length ? Math.round(started / tps.length * 100) : null, list: chapters },
        hw: { open: open.length, overdue: open.filter(function (h) { return h.overdue; }).length, today: open.filter(function (h) { return h.today; }).length, done: hws.length - open.length, list: hlist },
        exam: exIso && exDays >= 0 ? { iso: exIso, days: exDays } : null, examPast: exIso && exDays < 0 ? exIso : '',
        goals: goalsFor(goals, name)
      });
    });

    // 统计
    var homeworkOverdue = hw.filter(function (h) { return h.overdue; }).length, homeworkToday = hw.filter(function (h) { return h.today; }).length;
    var due = topics.filter(function (t) { return t.due; });
    var events = arr(inp.events).filter(isObj).map(function (e, i) { return { i: i, w: fin(e.w), dn: fin(e.dn), s: fin(e.s), e: fin(e.e), t: str(e.t, 60), done: !!e.done, src: e.src === 'goal' ? 'goal' : 'auto', goalId: str(e.goalId, 80), inWeek: !!e.inWeek }; })
      .filter(function (e) { return e.dn !== null && e.s !== null && e.t; }).map(function (e) { if (e.e === null || e.e <= e.s) e.e = e.s; return e; });
    var weekAll = events.filter(function (e) { return e.inWeek; }), weekDone = weekAll.filter(function (e) { return e.done; });
    var sessionsToday = events.filter(function (e) { return e.dn === today && !e.done; }).length;

    // 即将到来：逾期作业 > 今天到期作业 > 到期复习 > 最近的学习时段（> 近 3 天到期的作业放在最后）；同级的顺序也是确定的
    var byTitle = function (a, b) { return cmpS(a.title, b.title); };
    var L0 = hw.filter(function (h) { return h.overdue; }).map(function (h) { return { kind: 'hw', rank: 0, subject: h.subject, title: h.t, due: h.due, ref: h.idx, id: h.id }; });
    var L1 = hw.filter(function (h) { return h.today; }).map(function (h) { return { kind: 'hw', rank: 1, subject: h.subject, title: h.t, due: h.due, ref: h.idx, id: h.id }; });
    var L2 = due.map(function (t) { return { kind: 'review', rank: 2, subject: t.s, title: t.n, nx: t.nx, late: t.late, ref: t.idx, id: '' }; });
    var L3 = events.filter(function (e) { return !e.done && (e.dn > today || (e.dn === today && e.e > nowMin)); })
      .map(function (e) { return { kind: 'session', rank: 3, subject: '', title: e.t, dn: e.dn, s: e.s, e: e.e, src: e.src, goalId: e.goalId, ref: e.i, id: '' }; });
    var L4 = hw.filter(function (h) { return !h.done && h.due && h.due > todayIso && dnOfIso(h.due) - today <= 3; }).map(function (h) { return { kind: 'hw', rank: 4, subject: h.subject, title: h.t, due: h.due, ref: h.idx, id: h.id }; });
    var tie = [byTitle, function (a, b) { return cmpS(a.id, b.id); }, function (a, b) { return cmpN(a.ref, b.ref); }];
    var all = sortBy(L0, [function (a, b) { return cmpS(a.due, b.due); }].concat(tie)).concat(sortBy(L1, [function (a, b) { return cmpS(a.subject, b.subject); }].concat(tie)))
      .concat(sortBy(L2, [function (a, b) { return cmpN(a.nx, b.nx); }, function (a, b) { return cmpS(a.subject, b.subject); }].concat(tie)))
      .concat(sortBy(L3, [function (a, b) { return cmpN(a.dn, b.dn); }, function (a, b) { return cmpN(a.s, b.s); }].concat(tie)))
      .concat(sortBy(L4, [function (a, b) { return cmpS(a.due, b.due); }].concat(tie)));

    // 最近的考试：和 study.js 的 nearestExam() 一致（只看 ST.subs，天数相同取先出现的）
    var nearest = null; stSubs.forEach(function (s) { if (!isoOk(ex[s])) return; var d = dnOfIso(ex[s]) - today; if (d >= 0 && (!nearest || d < nearest.days)) nearest = { subject: s, iso: ex[s], days: d }; });

    return {
      today: today, todayIso: todayIso, goalsOn: on,
      stats: { reviewsDue: due.length, homeworkDue: homeworkOverdue + homeworkToday, homeworkOverdue: homeworkOverdue, homeworkToday: homeworkToday, sessionsToday: sessionsToday },
      upcoming: { items: all.slice(0, limit), total: all.length },
      week: { planned: weekAll.length, done: weekDone.length, pct: weekAll.length ? Math.round(weekDone.length / weekAll.length * 100) : null },
      exam: nearest, subjects: subjects, goals: goals,
      reviews: sortBy(due, [function (a, b) { return cmpN(a.nx, b.nx); }, function (a, b) { return cmpS(a.s, b.s); }, function (a, b) { return cmpS(a.n, b.n); }, function (a, b) { return cmpN(a.idx, b.idx); }])
        .map(function (t) { return { idx: t.idx, subject: t.s, name: t.n, late: t.late, nx: t.nx }; }),
      empty: { subjects: !subjects.length, topics: !topics.length, hw: !hw.length, all: !subjects.length && !topics.length && !hw.length }
    };
  }

  var api = { build: build, isoOk: isoOk, dnOfIso: dnOfIso, isoOfDn: isoOfDn, MAXHW: MAXHW };
  root.StudySpaceCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
