// Mochi Goals · Phase 2（把“已确认的步骤”匹配到现有空档：预览 → 勾选 → 确认 → 可撤销）。见 docs/v8.9.6-goals-phase2.md
// 边界：
//  · 只读日程：用 Sched.dayItems（手动活动 + 重复活动 + 固定课程），固定课程 / 重复活动永远不会被移动或覆盖；
//  · 唯一的日程写入口是 commit()：先 Undo.snap()，再按 agent.js 同样的方式（WK[w].push + saveWeek）写入，之后弹出可撤销提示；
//  · 取消 / 返回 / Esc = 零写入；预览阶段不写任何东西；
//  · 活动与目标的关联存在独立的 goals-links（不改原活动的数据结构，也不用“周_序号”），读取时做失效检测；
//  · “已排程”不等于“已完成”：这里不改任何步骤的 doneMin。
//  · v9.4：commit() 把“日程 + 关联表”做成整体（任一失败都回滚）；新增：认出被用户移动的时段并可一键跟随、一键重新排程、目标级撤销。
//  · v9.6：目标本体和 goals-links 都跨设备同步（关联表按条合并），所以任何设备都能排 / 跟随移动 / 移除；关联读取时仍做失效检测。
// 文案在 js/lang-goals.js（en / zh / ms）。
(function (root) {
  'use strict';
  var LK = 'goals-links', LSCHEMA = 1, MAXLINKS = 3000, HORIZON = 180, DEFAULT_DAYS = 14, MIN_USEFUL = 25;

  // ================= 纯函数引擎（不碰 DOM / 存储，Node 里可直接测）=================
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function dnFromIso(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : null; }
  function isoOf(dn) { var d = new Date(dn * 864e5); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function ceil5(m) { return Math.ceil(m / 5) * 5; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // 区间合并（已按开始时间排序的 [s,e] 列表）
  function mergeBusy(list) {
    var a = list.slice().sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; }), out = [];
    a.forEach(function (r) { var l = out[out.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); });
    return out;
  }
  function freeWins(busy, lo, hi) {
    var out = [], t = lo; mergeBusy(busy).forEach(function (r) { if (r[0] > t) out.push([t, Math.min(r[0], hi)]); if (r[1] > t) t = r[1]; });
    if (t < hi) out.push([t, hi]);
    return out.filter(function (r) { return r[1] > r[0] && r[0] < hi; });
  }

  // plan(input) → 预览结果。input：
  //   goal            已保存的目标（含 steps / constraints / deadline / targetFinish / space）
  //   today           { dn, nowMin }（dn = 本地日期的“天序号”，与 core.js 的 dayNum 一致）
  //   cal             { h0, h1, items(dn) → [{s,e,...}]，hidden(dn) → boolean }   现有日程只读视图
  //   links           已存在、仍有效、还没发生的关联 [{goalId,stepId,dn,s,e}]（避免重复排程）
  //   opts            { basis:'max'|'est', pace:'even'|'asap', maxDailyMin, ignoreTarget }
  function plan(inp) {
    var g = inp.goal, o = inp.opts || {}, cal = inp.cal, today = inp.today.dn, nowMin = ceil5(inp.today.nowMin || 0);
    var K = g.constraints || {}, maxDaily = clamp(Math.round(o.maxDailyMin || K.maxDailyMin || 180), 30, 1440);
    var sess = clamp(K.sessionMin || 45, 15, 180), brk = clamp(K.breakMin == null ? 10 : K.breakMin, 0, 60);
    var basis = o.basis === 'est' ? 'est' : 'max', pace = o.pace === 'asap' ? 'asap' : 'even', study = g.space === 'study';
    var h0 = cal.h0, h1 = cal.h1, notes = [];
    var res = { sessions: [], steps: [], days: [], totals: { need: 0, placed: 0, short: 0, available: 0 }, notes: notes, feasible: true, horizon: { from: today, to: today }, opts: { basis: basis, pace: pace, maxDailyMin: maxDaily, ignoreTarget: !!o.ignoreTarget }, hasRange: false };
    var links = (inp.links || []).filter(function (l) { return l.goalId === g.id; });

    // ---- 1. 每个步骤：还需要多少分钟、最晚哪天 ----
    var goalCap = [];
    if (g.targetFinish && !o.ignoreTarget) goalCap.push(dnFromIso(g.targetFinish));
    if (g.deadline) goalCap.push(dnFromIso(g.deadline) - (study ? 1 : 0));
    var noDeadline = false;
    var steps = g.steps.map(function (s, i) {
      var est = s.estimateMin || 0, mx = (s.estimateMaxMin != null && s.estimateMaxMin > est) ? s.estimateMaxMin : null;
      if (mx) res.hasRange = true;
      var used = (basis === 'max' && mx) ? mx : est;
      var cov = 0, endDn = null, endMin = 0;
      links.forEach(function (l) { if (l.stepId === s.id) { cov += l.e - l.s; if (endDn === null || l.dn > endDn || (l.dn === endDn && l.e > endMin)) { endDn = l.dn; endMin = l.e; } } });
      var caps = goalCap.slice(); if (s.deadline) caps.push(dnFromIso(s.deadline) - (study ? 1 : 0));
      var cap = caps.length ? Math.min.apply(null, caps) : null;
      var st = { idx: i, id: s.id, title: s.title, assumed: !!s.assumed, hasRange: !!mx, est: est, used: used, covered: cov, status: 'plan', need: 0, placed: 0, short: 0, cap: cap, firstDn: null, lastDn: null, reason: '', deps: s.dependencies || [], endDn: endDn, endMin: endMin };
      if (!est) st.status = 'noEstimate';
      else if (s.doneMin >= est) st.status = 'done';
      else {
        st.need = ceil5(Math.max(0, used - (s.doneMin || 0) - cov));
        if (st.need === 0) st.status = cov > 0 ? 'covered' : 'done';
      }
      if (cap === null && st.status === 'plan') { noDeadline = true; st.cap = today + DEFAULT_DAYS - 1; }
      return st;
    });
    if (noDeadline) notes.push('noDeadline');
    if (study) notes.push('studyDayBefore');
    var maxCap = today - 1;
    steps.forEach(function (s) { if (s.status !== 'plan') return; if (s.cap > today + HORIZON - 1) { s.cap = today + HORIZON - 1; if (notes.indexOf('clamp') < 0) notes.push('clamp'); } if (s.cap > maxCap) maxCap = s.cap; });
    res.horizon = { from: today, to: Math.max(today, maxCap) };

    // ---- 2. 每天的“已用 / 缓冲”基础数据 ----
    var dayBase = {};
    function base(dn) {
      if (dayBase[dn]) return dayBase[dn];
      var items = cal.items(dn) || [], busy = items.map(function (x) { return [x.s, x.e]; });
      var goalBlocks = []; links.forEach(function (l) { if (l.dn === dn) goalBlocks.push([l.s, l.e]); });
      var d = { items: items, busy: busy, goalBlocks: goalBlocks, used: goalBlocks.reduce(function (a, b) { return a + b[1] - b[0]; }, 0), hidden: !!cal.hidden(dn), planned: [] };
      return dayBase[dn] = d;
    }
    function dayBusy(dn) {          // 现有日程 + 目标自己的块（前后各留 brk 分钟）
      var d = base(dn), b = d.busy.slice();
      d.goalBlocks.concat(d.planned.map(function (p) { return [p.s, p.e]; })).forEach(function (r) { b.push([r[0] - brk, r[1] + brk]); });
      return b;
    }
    function lo(dn, earliest) { var v = h0; if (dn === today) v = Math.max(v, nowMin); if (earliest && dn === earliest.dn) v = Math.max(v, earliest.min); return ceil5(v); }

    // 可用时间（信息用）：窗口内每天的空闲分钟数，受每日上限限制
    for (var dn = today; dn <= res.horizon.to; dn++) {
      var bd = base(dn), free = 0;
      if (!bd.hidden) free = freeWins(bd.busy, lo(dn), h1).reduce(function (a, r) { return a + r[1] - r[0]; }, 0);
      res.days.push({ dn: dn, iso: isoOf(dn), hidden: bd.hidden, existingMin: bd.items.reduce(function (a, x) { return a + (x.e - x.s); }, 0), items: bd.items, freeMin: free, placedMin: 0 });
      if (!bd.hidden) res.totals.available += Math.min(free, Math.max(0, maxDaily - bd.used));
    }

    // ---- 3. 排序：依赖在前，其余按最晚日期 → 原顺序 ----
    var byId = {}; steps.forEach(function (s) { byId[s.id] = s; });
    var todo = steps.filter(function (s) { return s.status === 'plan'; }), order = [], placedIds = {};
    var rest = todo.slice();
    function ready(s) { return s.deps.every(function (d) { var x = byId[d]; return !x || x.status !== 'plan' || placedIds[d]; }); }
    while (rest.length) {
      var cands = rest.filter(ready);
      if (!cands.length) { if (notes.indexOf('depCycle') < 0) notes.push('depCycle'); cands = rest.slice(); }     // 循环依赖：忽略依赖，照常排
      cands.sort(function (a, b) { return a.cap - b.cap || a.idx - b.idx; });
      var pick = cands[0]; order.push(pick); placedIds[pick.id] = 1; rest.splice(rest.indexOf(pick), 1);
    }

    // ---- 4. 逐步骤填空档 ----
    var sid = 0;
    function placeOnDay(st, dn, want, earliest, blk) {          // blk：这一科每块的目标时长（大小相近，避免 45+45+…+15 这样的零头）
      var bd = base(dn); if (bd.hidden) return 0;
      var capLeft = maxDaily - bd.used - bd.planned.reduce(function (a, p) { return a + p.e - p.s; }, 0), got = 0;
      if (capLeft <= 0 || want <= 0) return 0;
      var guard = 0;
      while (st.need > 0 && want > 0 && capLeft > 0 && guard++ < 40) {
        var wins = freeWins(dayBusy(dn), lo(dn, earliest), h1), placedOne = false;
        for (var wi = 0; wi < wins.length; wi++) {
          var ws = ceil5(wins[wi][0]), wl = wins[wi][1] - ws;
          if (wl < 5) continue;
          var L = Math.floor(Math.min(blk, st.need, want, capLeft, wl) / 5) * 5, rem = st.need - L;
          if (L <= 0) continue;
          if (rem > 0 && rem < 15) {          // 避免留下一小截零头
            if (st.need <= Math.min(wl, capLeft, want) && st.need <= blk + 14) L = st.need;
            else if (L - (15 - rem) >= MIN_USEFUL) L = L - (15 - rem);
          }
          if (L < st.need && L < MIN_USEFUL) continue;     // 太短的碎片不排（最后一块除外）
          var piece = { id: 's' + (sid++), stepId: st.id, stepIdx: st.idx, stepTitle: st.title, dn: dn, iso: isoOf(dn), s: ws, e: ws + L, min: L };
          bd.planned.push(piece); res.sessions.push(piece); st.need -= L; st.placed += L; want -= L; capLeft -= L; got += L;
          if (st.firstDn === null || dn < st.firstDn) st.firstDn = dn;
          if (st.lastDn === null || dn > st.lastDn) st.lastDn = dn;
          placedOne = true; break;          // 窗口变了，重新算
        }
        if (!placedOne) break;
      }
      return got;
    }
    order.forEach(function (st) {
      st.total = st.need;
      var earliest = { dn: today, min: 0 }, blocked = false;
      st.deps.forEach(function (d) {
        var x = byId[d]; if (!x) return;
        if (x.status === 'plan') { if (x.short > 0) blocked = true; var e = { dn: x.lastDn, min: x.lastEnd }; if (e.dn !== null && (e.dn > earliest.dn || (e.dn === earliest.dn && e.min > earliest.min))) earliest = e; }
        if (x.endDn !== null && (x.endDn > earliest.dn || (x.endDn === earliest.dn && x.endMin > earliest.min))) earliest = { dn: x.endDn, min: x.endMin };
      });
      if (blocked) { st.short = st.need; st.status = 'blocked'; st.reason = 'blocked'; return; }
      if (earliest.min) earliest.min += brk;
      var days = []; for (var d = Math.max(today, earliest.dn); d <= st.cap; d++) if (!base(d).hidden) days.push(d);
      if (!days.length) { st.short = st.need; st.reason = 'noDays'; return; }
      var freeAny = days.some(function (d) { return freeWins(base(d).busy, lo(d, earliest), h1).length > 0; });
      // 把需求拆成大小相近的几块（每块 ≤ 单次时长，且不会出现 < 25 分钟的碎片，除非整个步骤本来就很短）
      var nSess = Math.max(1, Math.ceil(st.need / sess)), blk = Math.min(sess, Math.max(5, ceil5(Math.ceil(st.need / nSess))));
      if (pace === 'even') {      // 按“块”平均分散到可用的日子里；某天排不下就把额度带到后面的日子
        var rate = nSess / days.length, credit = Math.max(0, 1 - rate);
        days.forEach(function (d) { if (st.need <= 0) return; credit += rate; while (credit > 0.999 && st.need > 0) { if (!placeOnDay(st, d, blk, earliest, blk)) break; credit -= 1; } });
      }
      days.forEach(function (d) { if (st.need > 0) placeOnDay(st, d, 1e9, earliest, blk); });      // 还有剩的（有的日子没空）：从最早的日子开始补
      st.short = st.need; if (st.short > 0) st.reason = freeAny ? 'notEnough' : 'noFree';
      var last = res.sessions.filter(function (s) { return s.stepId === st.id; }).reduce(function (a, s) { return (a === null || s.dn > a.dn || (s.dn === a.dn && s.e > a.e)) ? s : a; }, null);
      st.lastEnd = last ? last.e : 0;
    });

    // ---- 5. 汇总 ----
    res.sessions.sort(function (a, b) { return a.dn - b.dn || a.s - b.s; });
    steps.forEach(function (s) { res.totals.need += (s.total != null ? s.total : 0); res.totals.placed += s.placed; res.totals.short += s.short; if (s.status === 'plan' && s.short > 0) s.status = 'short'; else if (s.status === 'plan') s.status = 'ok'; });
    res.steps = steps;
    var byDay = {}; res.sessions.forEach(function (s) { byDay[s.dn] = (byDay[s.dn] || 0) + s.min; });
    res.days.forEach(function (d) { d.placedMin = byDay[d.dn] || 0; });
    res.feasible = res.totals.short === 0;
    res.finishDn = res.sessions.length ? res.sessions[res.sessions.length - 1].dn : null;
    return res;
  }

  // 预览带建议：不够排时，试试“每天多给一点时间 / 改用最终截止日”，哪种能排下就推荐哪种。从不自动应用。
  function planWithSuggestions(inp) {
    var r = plan(inp); r.suggest = { dailyMin: null, ignoreTarget: false };
    if (r.feasible) return r;
    var o = inp.opts || {}, cur = r.opts.maxDailyMin;
    for (var m = cur + 30; m <= 720; m += 30) { var t = plan({ goal: inp.goal, today: inp.today, cal: inp.cal, links: inp.links, opts: Object.assign({}, o, { maxDailyMin: m }) }); if (t.feasible) { r.suggest.dailyMin = m; break; } }
    if (inp.goal.targetFinish && inp.goal.deadline && !o.ignoreTarget) { var t2 = plan({ goal: inp.goal, today: inp.today, cal: inp.cal, links: inp.links, opts: Object.assign({}, o, { ignoreTarget: true }) }); if (t2.feasible) r.suggest.ignoreTarget = true; }
    return r;
  }

  // 提交前的最后一道检查：对着“此刻”的日程再核对每个已勾选的时段（预览之后日程可能变了）
  function validateSessions(picks, cal, ctx) {
    var ok = [], bad = [], taken = {};
    picks.slice().sort(function (a, b) { return a.dn - b.dn || a.s - b.s; }).forEach(function (s) {
      var why = '';
      if (s.dn < ctx.dn || (s.dn === ctx.dn && s.s < ctx.nowMin)) why = 'past';      // ctx = { dn, nowMin }，和 nowInfo() 同形
      else if (cal.hidden(s.dn)) why = 'hidden';
      else if (s.s < cal.h0 || s.e > cal.h1 || !(s.e > s.s)) why = 'range';
      else if ((cal.items(s.dn) || []).some(function (x) { return s.s < x.e && x.s < s.e; })) why = 'taken';
      else if ((taken[s.dn] || []).some(function (x) { return s.s < x.e && x.s < s.e; })) why = 'taken';
      if (why) bad.push({ session: s, why: why }); else { ok.push(s); (taken[s.dn] = taken[s.dn] || []).push(s); }
    });
    return { ok: ok, bad: bad };
  }

  var engine = { plan: plan, planWithSuggestions: planWithSuggestions, validateSessions: validateSessions, mergeBusy: mergeBusy, freeWins: freeWins, dnFromIso: dnFromIso, isoOf: isoOf, ceil5: ceil5 };
  root.GoalsPlan = { engine: engine };
  if (typeof document === 'undefined') return;       // Node 单元测试到此为止

  // ================= 浏览器部分：关联表 / 提交 / 界面 =================
  var Gc = function () { return root.Goals && root.Goals.core; };
  var PK = 'goals-plan-prefs';           // 排程功能的独立开关；关掉后只是看不到入口，goals-* 数据（含 goals-links）原样保留
  function planEnabled() { var s = null; try { s = root.localStorage.getItem(PK); } catch (e) {} if (!s) return true; try { return JSON.parse(s).on !== false; } catch (e) { return true; } }
  function setPlanEnabled(on) { try { root.localStorage.setItem(PK, JSON.stringify({ on: !!on })); return true; } catch (e) { return false; } }
  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function loadLinks() {
    var s = ls(), o = null; if (!s) return { schemaVersion: LSCHEMA, links: [] };
    try { o = JSON.parse(s.getItem(LK) || 'null'); } catch (e) { o = null; }
    if (!o || !Array.isArray(o.links)) o = { schemaVersion: LSCHEMA, links: [] };
    return o;
  }
  function saveLinks(o) { var s = ls(); if (!s) return false; try { s.setItem(LK, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function nowInfo() { var n = new Date(); return { dn: dayNum(n), nowMin: n.getHours() * 60 + n.getMinutes() }; }
  function liveCal() {
    var C = {};
    return { h0: H0 * 60, h1: H1 * 60, hidden: function (dn) { return hiddenDay(dnDate(dn).wd); }, items: function (dn) { return Sched.dayItems(dn, C); } };
  }
  // 失效检测：只有“活动仍在原位、原样”的关联才算有效；被删 / 被改 / 被撤销的都当作失效（不会被当成已排程）
  function validLinks(goalId) {
    var seen = {}, out = []; loadLinks().links.slice().reverse().forEach(function (l) {      // 从新到旧：同一位置只认最新的一条，避免重复计算已排分钟
      if (l.tid !== TT.id || (goalId && l.goalId !== goalId)) return;
      var arr = (l.w === curW ? data : WK[l.w]) || [], fp = l.w + '|' + l.day + '|' + l.s + '|' + l.e + '|' + l.t;
      if (seen[fp]) return;
      if (arr.some(function (x) { return x.day === l.day && x.s === l.s && x.e === l.e && x.t === l.t; })) { seen[fp] = 1; out.push(l); }
    });
    return out.reverse();
  }
  function upcoming(goalId) {
    var n = nowInfo();
    return validLinks(goalId).filter(function (l) { return (l.dn > n.dn || (l.dn === n.dn && l.e > n.nowMin)) && !DN[kk({ day: l.day, s: l.s, t: l.t }, l.w)]; });
  }
  function summary(goal) {
    var u = upcoming(goal.id), min = 0, next = null; u.forEach(function (l) { min += l.e - l.s; if (!next || l.dn < next.dn || (l.dn === next.dn && l.s < next.s)) next = l; });
    return { n: u.length, min: min, next: next };
  }
  function buildInput(goal, opts) {
    return { goal: goal, today: nowInfo(), cal: liveCal(), links: upcoming(goal.id).map(function (l) { return { goalId: l.goalId, stepId: l.stepId, dn: l.dn, s: l.s, e: l.e }; }), opts: opts };
  }

  // 唯一的日程写入口
  function commit(P, selected) {
    var core = Gc(), goal = core.getGoal(P.goalId);
    if (!goal || goal.deletedAt || goal.rev !== P.rev) return { ok: false, error: 'errStale' };
    var picks = P.result.sessions.filter(function (s) { return selected[s.id]; });
    if (!picks.length) return { ok: false, error: 'planNothing' };
    var n = nowInfo(), v = validateSessions(picks, liveCal(), n);
    if (!v.ok.length) return { ok: false, error: 'errAllTaken', skipped: v.bad.length };
    var alive0 = {}; validLinks().forEach(function (l) { alive0[l.id] = 1; });      // 写入前就仍然有效的关联（失效的旧记录之后会被清掉，防止“撤销后重排出同一位置”时复活）
    // v9.4：日程 + 关联表是一个整体——要么都写成功，要么都不写（以前关联表写失败只会返回 linksOk:false，课表里就留下“不知道属于哪个目标”的活动）。
    // 顺序：先算好每个时段落在哪一周 / 星期 / 标题 → 先写关联表并读回校验（失败 = 零写入）→ 再写日程并读回校验（失败 = 回滚日程 + 还原关联表原文）。
    var core2 = core, batch = core2.uuid(), at = new Date().toISOString(), st = ls();
    v.ok.forEach(function (s) { s._w = Sched.weekOf(s.dn); s._day = dnDate(s.dn).wd; s._t = s.stepTitle.slice(0, 24); });
    var lk = loadLinks();
    lk.links = lk.links.filter(function (l) { return l.tid !== TT.id || alive0[l.id]; });
    v.ok.forEach(function (s) { lk.links.push({ id: core2.uuid(), goalId: goal.id, stepId: s.stepId, tid: TT.id, w: s._w, dn: s.dn, day: s._day, s: s.s, e: s.e, t: s._t, batch: batch, at: at, u: Date.now() }); });
    if (lk.links.length > MAXLINKS) lk.links = lk.links.filter(function (l) { return alive0[l.id] || l.batch === batch; }).slice(-MAXLINKS);
    var raw0 = null; try { raw0 = st ? st.getItem(LK) : null; } catch (e) { return { ok: false, error: 'errLinks' }; }
    function restoreLinks() { try { if (raw0 === null) st.removeItem(LK); else st.setItem(LK, raw0); } catch (e) {} }
    var rawNew = JSON.stringify(lk);
    try { st.setItem(LK, rawNew); if (st.getItem(LK) !== rawNew) throw new Error('verify-links'); } catch (e) { restoreLinks(); return { ok: false, error: 'errLinks' }; }
    var snap = Undo.snap(), pushed = [], touched = {};
    try {
      v.ok.forEach(function (s) {
        var w = s._w, arr;
        if (w === curW) { arr = data; WK[w] = data; } else arr = (WK[w] = WK[w] || []);
        var ev = { day: s._day, s: s.s, e: s.e, t: s._t, c: subjCol(s._t) }; arr.push(ev); pushed.push({ arr: arr, ev: ev }); touched[w] = 1;
      });
      Object.keys(touched).forEach(function (w) { saveWeek(+w); });
      var okw = Object.keys(touched).every(function (w) { var arr = (+w === curW ? data : WK[w]) || [], st2 = lget(wkKeyOf(TT.id, +w), []); return st2.length === arr.length; });
      if (!okw) throw new Error('verify');
    } catch (e) {
      pushed.reverse().forEach(function (p) { var i = p.arr.lastIndexOf(p.ev); if (i >= 0) p.arr.splice(i, 1); });
      Object.keys(touched).forEach(function (w) { try { saveWeek(+w); } catch (e2) {} });
      restoreLinks();
      return { ok: false, error: 'errWrite' };
    }
    var linksOk = true;
    if (goal.status === 'draft') { try { core.saveGoal(Object.assign({}, goal, { status: 'active' }), goal.rev); } catch (e) {} }
    try { draw(); } catch (e) {}
    Undo.toast(t('undoMsg', { n: v.ok.length }), snap);
    return { ok: true, added: v.ok.length, skipped: v.bad.length, linksOk: linksOk };
  }

  // ---------- v9.4：再规划与进度追踪 ----------
  function futureLink(l, n) { return l.dn > n.dn || (l.dn === n.dn && l.e > n.nowMin); }
  function fpOf(w, day, s, e, tt) { return w + '|' + day + '|' + s + '|' + e + '|' + tt; }
  // 用户自己把活动拖到别处后，原关联会失效。这里只在“有把握”时认出它：同一周、同标题、同时长、没被别的有效关联占用的活动。
  // 删掉的活动、整批被撤销的活动找不到对应，不算“被移动”。
  function scanBroken(goalId) {
    var n = nowInfo(), valid = validLinks(), vfp = {}, vid = {}, seen = {}, broken = [], moved = [], claimed = {};
    valid.forEach(function (l) { vfp[fpOf(l.w, l.day, l.s, l.e, l.t)] = 1; vid[l.id] = 1; });
    loadLinks().links.slice().reverse().forEach(function (l) {
      if (l.tid !== TT.id || l.goalId !== goalId || vid[l.id] || !futureLink(l, n)) return;
      var fp = fpOf(l.w, l.day, l.s, l.e, l.t); if (vfp[fp] || seen[fp]) return; seen[fp] = 1; broken.push(l);
    });
    broken.sort(function (a, b) { return a.dn - b.dn || a.s - b.s; }).forEach(function (l) {
      var arr = (l.w === curW ? data : WK[l.w]) || [], best = null, bd = 1e9;
      arr.forEach(function (x, i) {
        var fp = fpOf(l.w, x.day, x.s, x.e, x.t); if (vfp[fp] || claimed[l.w + '|' + i] || x.t !== l.t || x.e - x.s !== l.e - l.s) return;
        var dn = 7 * l.w + SET.ws - 3 + x.day; if (!(dn > n.dn || (dn === n.dn && x.e > n.nowMin)) || DN[kk(x, l.w)]) return;
        var d = Math.abs(dn - l.dn) * 1440 + Math.abs(x.s - l.s); if (d < bd) { bd = d; best = { i: i, x: x, dn: dn }; }
      });
      if (best) { claimed[l.w + '|' + best.i] = 1; moved.push({ link: l, dn: best.dn, day: best.x.day, s: best.x.s, e: best.x.e }); }
    });
    return { broken: broken, moved: moved, gone: broken.length - moved.length };
  }
  // 「跟随移动」：只更新关联表里的位置，不碰日程。
  function followMoved(goalId) {
    var sc = scanBroken(goalId); if (!sc.moved.length) return { ok: false, error: 'planNothing' };
    var st = ls(), raw0 = null, lk = loadLinks(), byId = {};
    sc.moved.forEach(function (m) { byId[m.link.id] = m; });
    lk.links.forEach(function (l) { var m = byId[l.id]; if (m) { l.dn = m.dn; l.day = m.day; l.s = m.s; l.e = m.e; l.w = m.link.w; l.u = Date.now(); } });
    try { raw0 = st.getItem(LK); var raw = JSON.stringify(lk); st.setItem(LK, raw); if (st.getItem(LK) !== raw) throw new Error('verify'); }
    catch (e) { try { if (raw0 === null) st.removeItem(LK); else st.setItem(LK, raw0); } catch (e2) {} return { ok: false, error: 'errLinks' }; }
    return { ok: true, n: sc.moved.length };
  }
  // 目标级撤销：只移除这个目标“还在原位、尚未发生、没打勾”的时段（先拍 Undo 快照；写入读回校验，失败则回滚）。
  function clearUpcoming(goalId) {
    var list = upcoming(goalId); if (!list.length) return { ok: false, error: 'planNothing' };
    var snap = Undo.snap(), removed = [], touched = {};
    try {
      list.forEach(function (l) {
        var arr = (l.w === curW ? data : WK[l.w]) || [], i = -1;
        for (var k = 0; k < arr.length; k++) if (arr[k].day === l.day && arr[k].s === l.s && arr[k].e === l.e && arr[k].t === l.t) { i = k; break; }
        if (i < 0) return; removed.push({ arr: arr, ev: arr[i], i: i }); arr.splice(i, 1); touched[l.w] = 1;
      });
      Object.keys(touched).forEach(function (w) { saveWeek(+w); });
      var okw = Object.keys(touched).every(function (w) { var arr = (+w === curW ? data : WK[w]) || [], st2 = lget(wkKeyOf(TT.id, +w), []); return st2.length === arr.length; });
      if (!okw) throw new Error('verify');
    } catch (e) {
      removed.reverse().forEach(function (r) { r.arr.splice(r.i, 0, r.ev); });
      Object.keys(touched).forEach(function (w) { try { saveWeek(+w); } catch (e2) {} });
      return { ok: false, error: 'errWrite' };
    }
    try { draw(); } catch (e) {}
    Undo.toast(t('clearedMsg', { n: removed.length }), snap);
    return { ok: true, n: removed.length };
  }

  // ---------- 界面 ----------
  function t(k, v) {
    var L = (root.GOALS_I18N || {}), s = (L[root.LANG] || {})[k]; if (s == null) s = (L.en || {})[k]; if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(cls, txt, fn, label) { var b = h('button', cls, txt); b.type = 'button'; if (label) b.setAttribute('aria-label', label); b.onclick = fn; return b; }
  function fm(m) { return Gc().fmtMin(m); }
  function tm(m) { return (typeof tmin === 'function') ? tmin(m) : p2(Math.floor(m / 60)) + ':' + p2(m % 60); }
  function dateLabel(iso) {
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    try { return new Intl.DateTimeFormat(root.LANG === 'zh' ? 'zh-CN' : root.LANG === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d); } catch (e) { return iso; }
  }
  function kindLabel(k) { return t(k === 'f' ? 'existClass' : k === 'r' ? 'existRepeat' : 'existEvent'); }
  var PV = null;          // 当前预览：{ mask, goalId, rev, opts, result, sel, msg, open:{}, onClose }

  function section(goal, ctx) {
    if (!planEnabled()) return null;
    var box = h('div', 'gl-sec'); box.appendChild(h('h3', null, t('planH')));
    var sm = summary(goal), blocked = ['paused', 'done', 'archived'].indexOf(goal.status) >= 0;
    box.appendChild(h('div', 'gl-meta', sm.n ? t('planSummary', { t: fm(sm.min), n: sm.n }) + (sm.next ? ' ' + t('planNext', { d: dateLabel(isoOf(sm.next.dn)), t: tm(sm.next.s) }) : '') : t('planNone')));
    var dis = (ctx && ctx.isDirty && ctx.isDirty()) || blocked;
    var sc = scanBroken(goal.id), lost = (sm.n || sc.moved.length) ? sc.gone : 0, again = sc.moved.length || lost;
    if (sc.moved.length) box.appendChild(h('div', 'gl-meta gl-warn gl-moved', t('movedN', { n: sc.moved.length })));
    if (lost) box.appendChild(h('div', 'gl-meta gl-warn gl-gone', t('goneN', { n: lost })));
    var b = btn('gl-secondary gl-plan-btn', t(again ? 'replanBtn' : 'planBtn'), function () { open(goal.id, { onClose: ctx && ctx.onDone }); }); b.disabled = !!dis; box.appendChild(b);
    if (sc.moved.length) {
      var fb = btn('gl-secondary gl-follow-btn', t('followMoved', { n: sc.moved.length }), function () {
        var r = followMoved(goal.id); if (ctx && ctx.onDone) ctx.onDone(r.ok ? t('movedFollowed', { n: r.n }) : t(r.error));
      }); fb.disabled = !!(ctx && ctx.isDirty && ctx.isDirty()); box.appendChild(fb);
    }
    if (sm.n) {
      var cb = btn('gl-secondary gl-clear-btn', t('clearUpcoming', { n: sm.n }), function () {
        if (!confirm(t('clearConfirm', { n: sm.n }))) return;
        var r = clearUpcoming(goal.id); if (ctx && ctx.onDone) ctx.onDone(r.ok ? t('clearedMsg', { n: r.n }) : t(r.error));
      }); cb.disabled = !!(ctx && ctx.isDirty && ctx.isDirty()); box.appendChild(cb);
    }
    if (ctx && ctx.isDirty && ctx.isDirty()) box.appendChild(h('div', 'gl-meta gl-warn', t('planSaveFirst')));
    else if (blocked) box.appendChild(h('div', 'gl-meta gl-warn', t('planBlocked')));
    return box;
  }
  function cardLine(goal) {
    if (!planEnabled()) return '';
    var sm = summary(goal); if (!sm.n) return '';
    return t('planSummaryShort', { t: fm(sm.min), n: sm.n }) + (sm.next ? ' · ' + t('planNext', { d: dateLabel(isoOf(sm.next.dn)), t: tm(sm.next.s) }) : '');
  }

  function open(goalId, o) {
    if (PV || !planEnabled()) return;
    var g = Gc().getGoal(goalId); if (!g) return;
    var m = h('div', 'mask full show gl-mask gl-plan'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', t('planTitle'));
    PV = { mask: m, goalId: goalId, rev: g.rev, opts: { basis: 'max', pace: 'even', maxDailyMin: null, ignoreTarget: false }, sel: {}, open: {}, msg: '', onClose: o && o.onClose, prev: document.activeElement };
    document.body.appendChild(m);
    PV.key = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    document.addEventListener('keydown', PV.key, true);
    recompute(true);
  }
  function close(refresh) {
    if (!PV) return; document.removeEventListener('keydown', PV.key, true); PV.mask.remove(); var cb = PV.onClose, prev = PV.prev; PV = null;
    try { if (prev && prev.focus) prev.focus(); } catch (e) {}
    if (cb && refresh !== false) { try { cb(); } catch (e) {} }
  }
  function recompute(resetSel) {
    var g = Gc().getGoal(PV.goalId); if (!g) { close(); return; }
    PV.rev = g.rev;
    PV.result = planWithSuggestions(buildInput(g, PV.opts));
    if (resetSel) { PV.sel = {}; PV.result.sessions.forEach(function (s) { PV.sel[s.id] = true; }); PV.open = {}; }
    else { var keep = {}; PV.result.sessions.forEach(function (s) { keep[s.id] = true; }); PV.sel = keep; }
    PV.goal = g; render();
  }
  function selCount() { return PV.result.sessions.filter(function (s) { return PV.sel[s.id]; }).length; }
  function selMin() { return PV.result.sessions.reduce(function (a, s) { return a + (PV.sel[s.id] ? s.min : 0); }, 0); }

  function render() {
    var m = PV.mask; m.textContent = ''; var w = h('div', 'gl-wrap gl-plan-wrap'); m.appendChild(w);
    var R = PV.result, g = PV.goal;
    var top = h('div', 'gl-top'); top.appendChild(btn('ed-x gl-x', '‹', function () { close(); }, t('planCancel'))); top.appendChild(h('h2', null, t('planTitle'))); w.appendChild(top);
    w.appendChild(h('div', 'gl-hd')); w.lastChild.appendChild(h('div', 'gl-h1', g.title)); w.lastChild.appendChild(h('div', 'gl-sub', t('planNote')));
    w.appendChild(h('div', 'gl-note', t('planInto', { name: (TT && TT.name) || '' })));
    R.notes.forEach(function (n) { w.appendChild(h('div', 'gl-note', t('note_' + n))); });
    if (PV.msg) { var ms = h('div', 'gl-note gl-warn', PV.msg); ms.setAttribute('role', 'alert'); w.appendChild(ms); }

    // 汇总
    var T = R.totals, sc = h('div', 'gl-sec gl-plan-sum');
    function kv(k, v) { var d = h('div', 'gl-kv'); d.appendChild(h('span', 'gl-fl', k)); d.appendChild(h('b', null, v)); sc.appendChild(d); }
    kv(t('planNeed'), fm(T.need)); kv(t('planPlaced'), fm(T.placed)); kv(t('planFree'), fm(T.available));
    kv(t('planFinish'), R.finishDn !== null ? dateLabel(R.sessions[R.sessions.length - 1].iso) : '—'); kv(t('planConf'), '0');
    w.appendChild(sc);
    if (!R.totals.need && R.steps.some(function (s) { return s.status === 'covered' || s.status === 'done'; }) && !R.sessions.length) w.appendChild(h('div', 'gl-note gl-ok', t('planCovered')));
    else if (R.feasible && R.sessions.length) w.appendChild(h('div', 'gl-note gl-ok', t('planFits', { n: R.sessions.length })));
    else if (!R.feasible) {
      var wb = h('div', 'gl-note gl-warn'); wb.setAttribute('role', 'alert'); wb.appendChild(h('div', null, t('planShort', { t: fm(T.short) }))); wb.appendChild(h('div', 'gl-meta', t('planChoose')));
      var ops = h('div', 'gl-addrow');
      if (R.suggest.dailyMin) ops.appendChild(btn('gl-secondary', t('sugDaily', { t: fm(R.suggest.dailyMin) }), function () { PV.opts.maxDailyMin = R.suggest.dailyMin; recompute(true); }));
      if (R.suggest.ignoreTarget) ops.appendChild(btn('gl-secondary', t('sugFinish'), function () { PV.opts.ignoreTarget = true; recompute(true); }));
      ops.appendChild(btn('gl-secondary', t('sugScope'), function () { close(); }));
      wb.appendChild(ops); if (!R.suggest.dailyMin && !R.suggest.ignoreTarget) wb.appendChild(h('div', 'gl-meta', t('sugNone'))); w.appendChild(wb);
    }

    // 选项
    var det = h('details', 'gl-sec'); det.appendChild(h('summary', null, t('planOptions')));
    if (R.hasRange) { det.appendChild(h('div', 'gl-fl', t('optBasis'))); det.appendChild(chips([['max', t('basisMax')], ['est', t('basisEst')]], PV.opts.basis, function (v) { PV.opts.basis = v; recompute(true); })); }
    det.appendChild(h('div', 'gl-fl', t('optPace'))); det.appendChild(chips([['even', t('paceEven')], ['asap', t('paceAsap')]], PV.opts.pace, function (v) { PV.opts.pace = v; recompute(true); }));
    var di = h('input'); di.type = 'number'; di.min = 30; di.max = 720; di.step = 15; di.inputMode = 'numeric'; di.value = R.opts.maxDailyMin; di.setAttribute('aria-label', t('optDaily'));
    var lab = h('label', 'gl-f'); lab.appendChild(h('span', 'gl-fl', t('optDaily'))); lab.appendChild(di); det.appendChild(lab);
    det.appendChild(btn('gl-secondary', t('optApply'), function () { var v = Math.round(Number(di.value)); if (isFinite(v) && v >= 30 && v <= 720) { PV.opts.maxDailyMin = v; recompute(true); } }));
    w.appendChild(det);

    // 步骤
    var sb = h('div', 'gl-sec'); sb.appendChild(h('h3', null, t('planSteps')));
    R.steps.forEach(function (s) {
      var r = h('div', 'gl-pstep'), l1 = h('div', 'gl-r1'); l1.appendChild(h('b', 'gl-ct', s.title));
      var meta;
      if (s.status === 'noEstimate') meta = t('stepNoEst'); else if (s.status === 'done') meta = t('stepDone'); else if (s.status === 'covered') meta = t('stepCovered');
      else meta = t('stepPlaced', { p: fm(s.placed), n: fm(s.total || 0) }) + (s.lastDn !== null ? ' · ' + t('stepFinish', { d: dateLabel(isoOf(s.lastDn)) }) : '') + (s.cap !== null ? ' · ' + t('stepCap', { d: dateLabel(isoOf(s.cap)) }) : '');
      l1.appendChild(h('span', 'gl-badge ' + (s.status === 'short' || s.status === 'blocked' ? 'gl-bad' : 'gl-ok2'), t('stat_' + s.status))); r.appendChild(l1);
      r.appendChild(h('div', 'gl-meta', meta));
      if (s.assumed && s.status !== 'done') r.appendChild(h('div', 'gl-meta gl-warn', t('assumed')));
      if (s.reason) r.appendChild(h('div', 'gl-meta gl-warn', t('reason_' + s.reason) + (s.short ? ' ' + t('stepShort', { t: fm(s.short) }) : '')));
      sb.appendChild(r);
    });
    w.appendChild(sb);

    // 按天的时段（可勾选），可展开当天原有日程（叠加预览）
    var byDay = {}; R.sessions.forEach(function (s) { (byDay[s.dn] = byDay[s.dn] || []).push(s); });
    var dsec = h('div', 'gl-sec'); dsec.appendChild(h('h3', null, t('planSessions')));
    var dnKeys = Object.keys(byDay).map(Number).sort(function (a, b) { return a - b; });
    if (!dnKeys.length) dsec.appendChild(h('div', 'gl-empty', t('planNothing')));
    dnKeys.forEach(function (dn) {
      var D = R.days.filter(function (x) { return x.dn === dn; })[0], box = h('div', 'gl-pday'), hd = h('div', 'gl-r1');
      hd.appendChild(h('b', null, dateLabel(isoOf(dn)))); hd.appendChild(h('span', 'gl-meta', t('dayMeta', { p: fm(D.placedMin), e: fm(D.existingMin) }))); box.appendChild(hd);
      byDay[dn].forEach(function (s) {
        var row = h('label', 'gl-chk gl-sess'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!PV.sel[s.id];
        cb.onchange = function () { PV.sel[s.id] = cb.checked; render(); };
        row.appendChild(cb); row.appendChild(h('span', null, tm(s.s) + '–' + tm(s.e) + ' · ' + s.stepTitle + ' · ' + fm(s.min))); box.appendChild(row);
      });
      var tg = btn('gl-link', t(PV.open[dn] ? 'hideDay' : 'showDay'), function () { PV.open[dn] = !PV.open[dn]; render(); }); tg.setAttribute('aria-expanded', PV.open[dn] ? 'true' : 'false'); box.appendChild(tg);
      if (PV.open[dn]) {
        var lst = h('div', 'gl-exist');
        var all = D.items.map(function (x) { return { s: x.s, e: x.e, label: kindLabel(x.k) + ' · ' + x.t, mine: false }; }).concat(byDay[dn].map(function (x) { return { s: x.s, e: x.e, label: t('planNewTag') + ' · ' + x.stepTitle, mine: true }; })).sort(function (a, b) { return a.s - b.s || a.e - b.e; });
        all.forEach(function (x) { lst.appendChild(h('div', 'gl-ex' + (x.mine ? ' gl-new' : ''), tm(x.s) + '–' + tm(x.e) + '  ' + x.label)); });
        box.appendChild(lst);
      }
      dsec.appendChild(box);
    });
    w.appendChild(dsec);

    // 底部操作条（Buddy 在 Goals 打开时已让位，不会遮挡）
    var bar = h('div', 'gl-bar'), n = selCount();
    var add = btn('gl-primary', t('planAdd', { n: n }) + (n ? ' · ' + fm(selMin()) : ''), onAdd); add.disabled = !n; bar.appendChild(add);
    bar.appendChild(btn('gl-secondary', t('planCancel'), function () { close(); })); w.appendChild(bar);
    var f = w.querySelector('.gl-primary:not([disabled])') || w.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function chips(items, cur, fn) {
    var box = h('div', 'gl-chips'); items.forEach(function (it) { var b = btn('chip' + (it[0] === cur ? ' on' : ''), it[1], function () { fn(it[0]); }); b.setAttribute('aria-pressed', it[0] === cur ? 'true' : 'false'); box.appendChild(b); }); return box;
  }
  function onAdd() {
    var r = commit(PV, PV.sel);
    if (!r.ok) {
      if (r.error === 'errAllTaken') { PV.msg = t('errAllTaken'); recompute(true); return; }
      PV.msg = t(r.error); if (r.error === 'errStale') { render(); return; } render(); return;
    }
    var note = t('added', { n: r.added }) + (r.skipped ? ' ' + t('skippedN', { n: r.skipped }) : '');
    var cb = PV.onClose; close(false);
    if (root.GoalsPlan._after) root.GoalsPlan._after(note);
    if (cb) { try { cb(note); } catch (e) {} }
  }

  root.GoalsPlan = { engine: engine, enabled: planEnabled, setEnabled: setPlanEnabled, section: section, cardLine: cardLine, summary: summary, open: open, validLinks: validLinks, upcoming: upcoming, commit: commit, scanBroken: scanBroken,  followMoved: followMoved, clearUpcoming: clearUpcoming, _state: function () { return PV; } };
})(typeof window !== 'undefined' ? window : globalThis);
