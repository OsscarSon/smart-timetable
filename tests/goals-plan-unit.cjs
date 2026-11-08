// Goals Phase 2 排程引擎单元测试（纯函数，不需要浏览器）。用法：node tests/goals-plan-unit.cjs
require('../js/goals-plan.js');
const E = globalThis.GoalsPlan.engine;
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const TODAY = E.dnFromIso('2026-11-09'), NOW = { dn: TODAY, nowMin: 630 };       // 周一 10:30
const wdOf = dn => (dn + 3) % 7;
function cal(opts) {
  opts = opts || {}; const items = opts.items || {}, hide = opts.hide || {};
  return { h0: opts.h0 == null ? 480 : opts.h0, h1: opts.h1 == null ? 1320 : opts.h1, hidden: dn => !!hide[dn] || (opts.weekend && wdOf(dn) >= 5), items: dn => (typeof items === 'function' ? items(dn) : items[dn]) || [] };
}
let gid = 0;
function goal(o) {
  o = o || {}; const steps = (o.steps || [{ t: 'Math', est: 180 }]).map((s, i) => ({ id: 'st' + (++gid) + 'xxxx', title: s.t, estimateMin: s.est, estimateMaxMin: s.max == null ? null : s.max, assumed: !!s.assumed, doneMin: s.done || 0, deadline: s.dl || '', dependencies: s.deps || [] }));
  steps.forEach((s, i) => { s.dependencies = (o.steps[i] && o.steps[i].depIdx || []).map(k => steps[k].id); });
  return { id: 'goal' + (++gid) + 'xxxx', space: o.space || 'study', title: 'G', deadline: o.deadline || '', targetFinish: o.targetFinish || '', status: 'active', steps, constraints: Object.assign({ maxDailyMin: 180, sessionMin: 45, breakMin: 10 }, o.k || {}) };
}
const plan = (g, c, extra) => E.plan(Object.assign({ goal: g, today: NOW, cal: c || cal(), links: [] }, extra || {}));
const iso = dn => E.isoOf(dn), d = n => iso(TODAY + n);
// 通用不变量：从不重叠、不越界、不超每日上限、在最晚日之前、起点对齐 5 分钟
function invariants(g, c, r, maxDaily) {
  const bad = [], per = {};
  r.sessions.forEach(s => {
    if (s.s < c.h0 || s.e > c.h1) bad.push('range ' + s.iso);
    if (s.s % 5 || s.e % 5) bad.push('align');
    if (c.hidden(s.dn)) bad.push('hidden');
    if (c.items(s.dn).some(x => s.s < x.e && x.s < s.e)) bad.push('overlap ' + s.iso + ' ' + s.s);
    if (s.dn === NOW.dn && s.s < E.ceil5(NOW.nowMin)) bad.push('past');
    if (s.dn < TODAY) bad.push('before today');
    per[s.dn] = (per[s.dn] || 0) + s.min;
    const st = r.steps.find(x => x.id === s.stepId); if (st.cap !== null && s.dn > st.cap) bad.push('after cap ' + st.title);
  });
  Object.keys(per).forEach(k => { if (per[k] > maxDaily) bad.push('daily ' + per[k]); });
  for (let i = 0; i < r.sessions.length; i++) for (let j = i + 1; j < r.sessions.length; j++) { const a = r.sessions[i], b = r.sessions[j]; if (a.dn === b.dn && a.s < b.e && b.s < a.e) bad.push('self-overlap'); }
  r.steps.forEach(s => { if (s.status === 'ok' || s.status === 'short') { if (s.placed + s.short !== s.total) bad.push('sum ' + s.title); } });
  r.steps.forEach(s => { const mine = r.sessions.filter(x => x.stepId === s.id), small = mine.filter(x => x.min < 25); if (small.length > 1 || (small.length === 1 && s.short === 0 && small[0] !== mine[mine.length - 1] && mine.some(x => x.dn > small[0].dn || (x.dn === small[0].dn && x.s > small[0].s)) && false)) bad.push('fragments ' + s.title); });
  return bad;
}

// 1 基本
{ const g = goal({ steps: [{ t: 'Math', est: 180 }], deadline: d(10) }), c = cal(), r = plan(g, c);
  rec('基本：180 分钟排得下，全在显示范围内、不重叠、每块 ≤ 单次时长', r.feasible && r.totals.placed === 180 && invariants(g, c, r, 180).length === 0 && r.sessions.every(s => s.min <= 45)); }
// 2 今天已过去的时间不排
{ const g = goal({ steps: [{ t: 'A', est: 600 }], deadline: d(3), k: { maxDailyMin: 600 } }), c = cal(), r = plan(g, c, { opts: { pace: 'asap' } });
  const t0 = r.sessions.filter(s => s.dn === TODAY); rec('今天只排现在（10:30）之后的时间', t0.length > 0 && t0.every(s => s.s >= 630)); }
// 3 每日上限
{ const g = goal({ steps: [{ t: 'A', est: 900 }], deadline: d(12), k: { maxDailyMin: 120 } }), c = cal(), r = plan(g, c, { opts: { pace: 'asap' } }), per = {}; r.sessions.forEach(s => per[s.dn] = (per[s.dn] || 0) + s.min);
  rec('每日上限 120 分钟：任何一天都不超', Math.max.apply(null, Object.values(per)) <= 120 && r.totals.placed === 900); }
// 4 休息缓冲
{ const g = goal({ steps: [{ t: 'A', est: 400 }], deadline: d(3), k: { maxDailyMin: 600, breakMin: 15 } }), r = plan(g, cal(), { opts: { pace: 'asap' } });
  const day = r.sessions.filter(s => s.dn === TODAY), gaps = day.slice(1).map((s, i) => s.s - day[i].e);
  rec('同一天相邻时段之间至少留 15 分钟', day.length > 1 && gaps.every(x => x >= 15), 'gaps=' + gaps.join(',')); }
// 5 隐藏的周末不排
{ const g = goal({ steps: [{ t: 'A', est: 1200 }], deadline: d(14), k: { maxDailyMin: 240 } }), c = cal({ weekend: true }), r = plan(g, c);
  rec('隐藏的周末列不排', r.sessions.length > 0 && r.sessions.every(s => wdOf(s.dn) < 5) && invariants(g, c, r, 240).length === 0); }
// 6 考试日前一天 / 非学习空间截止日当天
{ const exam = d(5), gs = goal({ steps: [{ t: 'Sci', est: 900, dl: exam }], k: { maxDailyMin: 600 } }), rs = plan(gs, cal());
  rec('学习空间：考试日不排，最后一天是考试前一天', rs.sessions.every(s => s.iso < exam) && rs.steps[0].cap === TODAY + 4);
  const gw = goal({ space: 'work', steps: [{ t: 'Rep', est: 900, dl: exam }], k: { maxDailyMin: 600 } }), rw = plan(gw, cal());
  rec('工作空间：截止日当天可排', rw.steps[0].cap === TODAY + 5 && rw.sessions.every(s => s.iso <= exam)); }
// 7 希望完成日
{ const g = goal({ steps: [{ t: 'A', est: 600 }], deadline: d(20), targetFinish: d(6) }), r = plan(g, cal()), r2 = plan(g, cal(), { opts: { ignoreTarget: true } });
  rec('希望完成日是硬上限；改用最终截止日才可延后', r.sessions.every(s => s.iso <= d(6)) && r2.steps[0].cap === TODAY + 19); }
// 8 排不下：从不超排，如实报告
{ const full = dn => [{ s: 480, e: 1320 }], g = goal({ steps: [{ t: 'A', est: 300, dl: d(6) }] }), c = cal({ items: full }), r = plan(g, c);
  rec('没有空档：不排任何时段，短缺 = 全部需求，原因 noFree', r.sessions.length === 0 && !r.feasible && r.totals.short === 300 && r.steps[0].reason === 'noFree');
  const g2 = goal({ steps: [{ t: 'A', est: 100, dl: d(1) }] }), r2 = plan(g2, cal()); rec('考试前一天 = 今天：今天剩余时间够就排，否则报告', r2.feasible && r2.sessions.every(s => s.dn === TODAY));
  const g3 = goal({ steps: [{ t: 'A', est: 100, dl: d(0) }] }), r3 = plan(g3, cal()); rec('截止日就是今天（学习空间）：没有可排的日子', r3.sessions.length === 0 && r3.steps[0].reason === 'noDays'); }
// 9 建议：每天多给一点时间 / 改用最终截止日
{ const g = goal({ steps: [{ t: 'A', est: 600, dl: d(5) }], k: { maxDailyMin: 60 } }), r = E.planWithSuggestions({ goal: g, today: NOW, cal: cal(), links: [] });
  rec('每日 60 分钟不够 → 建议提高每日上限，且按建议重排后确实排得下', !r.feasible && r.suggest.dailyMin > 60 && E.plan({ goal: g, today: NOW, cal: cal(), links: [], opts: { maxDailyMin: r.suggest.dailyMin } }).feasible, 'suggest=' + r.suggest.dailyMin);
  const g2 = goal({ steps: [{ t: 'A', est: 400 }], deadline: d(20), targetFinish: d(2), k: { maxDailyMin: 120 } }), r2 = E.planWithSuggestions({ goal: g2, today: NOW, cal: cal(), links: [] });
  rec('希望完成日太紧 → 建议改用最终截止日', !r2.feasible && r2.suggest.ignoreTarget === true); }
// 10 估时区间
{ const g = goal({ steps: [{ t: 'A', est: 100, max: 200 }], deadline: d(10) }), a = plan(g, cal(), { opts: { basis: 'max' } }), b = plan(g, cal(), { opts: { basis: 'est' } });
  rec('估时区间：按上限排 200、按预计排 100，并标记有区间', a.totals.need === 200 && b.totals.need === 100 && a.hasRange); }
// 11 SPM：7 科、20 天、提前 3 天、各科考试日不同、白天有固定课程
{ const classes = dn => (wdOf(dn) < 5 ? [{ s: 480, e: 780, k: 'f', t: 'School' }] : []);
  const ex = [8, 9, 10, 12, 14, 18, 20], names = ['BM', 'BI', 'Math', 'Sci', 'Sej', 'Add', 'PI'];
  const g = goal({ steps: ex.map((x, i) => ({ t: names[i], est: 240, dl: d(x) })), targetFinish: d(16), k: { maxDailyMin: 180, sessionMin: 45, breakMin: 10 } }), c = cal({ items: classes }), r = plan(g, c);
  const bad = invariants(g, c, r, 180);
  rec('SPM 7 科 × 240 分钟、考试日不同、提前 3 天完成：排得下，无违规', r.feasible && r.totals.placed === 7 * 240 && bad.length === 0, bad.slice(0, 3).join('|'));
  rec('SPM：每科的最后一个时段不晚于“考试前一天”与“希望完成日”的较早者', r.steps.every(s => s.lastDn <= Math.min(s.cap, TODAY + 16)) && r.sessions.every(s => s.dn <= TODAY + 16));
  rec('SPM：固定课程时间一分钟都没被占用', r.sessions.every(s => !classes(s.dn).some(x => s.s < x.e && x.s < s.e)));
  const early = plan(goal({ steps: ex.map((x, i) => ({ t: names[i], est: 240, dl: d(x) })), k: { maxDailyMin: 180 } }), c);
  rec('SPM：不设希望完成日时，各科最晚日按各自考试日（不是同一天）', early.steps.map(s => s.cap).join() === ex.map(x => TODAY + x - 1).join()); }
// 11b 碎片：SPM 场景里不能出现 < 25 分钟的零头；两种节奏下每块大小相近
{ const classes = dn => (wdOf(dn) < 5 ? [{ s: 480, e: 780 }] : []), ex = [8, 9, 10, 12, 14, 18, 20];
  const g = goal({ steps: ex.map((x, i) => ({ t: 'S' + i, est: 240, dl: d(x) })), targetFinish: d(16) });
  ['even', 'asap'].forEach(p => { const r = plan(g, cal({ items: classes }), { opts: { pace: p } }), mins = r.sessions.map(s => s.min);
    rec('SPM（' + p + '）：没有 < 25 分钟的碎片，平均每块 ≥ 35 分钟，每科 ≤ 6 块', r.feasible && Math.min.apply(null, mins) >= 25 && mins.reduce((a, b) => a + b, 0) / mins.length >= 35 && r.steps.every(s => r.sessions.filter(x => x.stepId === s.id).length <= 6), 'n=' + mins.length + ' min=' + Math.min.apply(null, mins) + ' avg=' + Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)); }); }
// 12 已有关联时段：不重复排程
{ const g = goal({ steps: [{ t: 'A', est: 300 }], deadline: d(10) }), sid = g.steps[0].id, links = [{ goalId: g.id, stepId: sid, dn: TODAY + 1, s: 600, e: 660 }, { goalId: g.id, stepId: sid, dn: TODAY + 2, s: 600, e: 700 }];
  const c = cal({ items: dn => links.filter(l => l.dn === dn).map(l => ({ s: l.s, e: l.e })) }), r = plan(g, c, { links });
  rec('已排的 160 分钟不再重复排：只排剩下的 140', r.totals.need === 140 && r.totals.placed === 140 && invariants(g, c, r, 180).length === 0);
  const other = plan(g, c, { links: links.map(l => Object.assign({}, l, { goalId: 'otherxxxx' })) }); rec('别的目标的关联不影响本目标的需求', other.totals.need === 300); }
// 13 依赖 / 循环依赖
{ const g = goal({ steps: [{ t: 'B', est: 90, depIdx: [1], dl: d(10) }, { t: 'A', est: 90, dl: d(10) }] }), r = plan(g, cal()), A = r.sessions.filter(s => s.stepTitle === 'A'), B = r.sessions.filter(s => s.stepTitle === 'B');
  const aEnd = A.reduce((m, s) => Math.max(m, s.dn * 2000 + s.e), 0), bStart = B.reduce((m, s) => Math.min(m, s.dn * 2000 + s.s), 1e12);
  rec('依赖：B 依赖 A → B 的第一个时段在 A 的最后一个之后', r.feasible && bStart > aEnd);
  const gc = goal({ steps: [{ t: 'X', est: 60, depIdx: [1], dl: d(5) }, { t: 'Y', est: 60, depIdx: [0], dl: d(5) }] }), rc = plan(gc, cal());
  rec('循环依赖：不死循环，给出提示，照常排', rc.notes.includes('depCycle') && rc.totals.placed === 120); }
// 14 提交前复核
{ const c = cal({ items: { [TODAY + 1]: [{ s: 600, e: 660 }] }, hide: { [TODAY + 2]: 1 } }), P = [
    { id: 'a', dn: TODAY + 1, s: 630, e: 690, iso: '' }, { id: 'b', dn: TODAY + 2, s: 600, e: 660 }, { id: 'c', dn: TODAY + 3, s: 400, e: 460 }, { id: 'd', dn: TODAY, s: 540, e: 600 },
    { id: 'e', dn: TODAY + 3, s: 600, e: 660 }, { id: 'f', dn: TODAY + 3, s: 630, e: 690 }, { id: 'g', dn: TODAY + 4, s: 600, e: 660 }];
  const v = E.validateSessions(P, c, NOW), why = {}; v.bad.forEach(b => why[b.session.id] = b.why);
  rec('复核：与新出现的活动冲突 / 隐藏日 / 超范围 / 已过去 / 选中项互相重叠，全部被拦下', why.a === 'taken' && why.b === 'hidden' && why.c === 'range' && why.d === 'past' && why.f === 'taken' && v.ok.map(x => x.id).join() === 'e,g'); }
// 15 无估时 / 已完成
{ const g = goal({ steps: [{ t: 'N', est: 0 }, { t: 'D', est: 60, done: 60 }, { t: 'P', est: 60, done: 30, dl: d(5) }] }), r = plan(g, cal());
  rec('没估时的跳过、已完成的跳过、部分完成的只排剩余 30', r.steps[0].status === 'noEstimate' && r.steps[1].status === 'done' && r.totals.need === 30 && r.totals.placed === 30); }
// 16 确定性 + 不改输入
{ const g = goal({ steps: [{ t: 'A', est: 500, dl: d(8) }, { t: 'B', est: 300, dl: d(6) }] }), snap = JSON.stringify(g), a = plan(g, cal()), b = plan(g, cal());
  rec('相同输入 → 完全相同的结果；输入对象没被修改', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(g) === snap); }
// 17 节奏
{ const g = goal({ steps: [{ t: 'A', est: 300, dl: d(10) }], k: { maxDailyMin: 300 } }), ev = plan(g, cal(), { opts: { pace: 'even' } }), as = plan(g, cal(), { opts: { pace: 'asap' } }), days = r => new Set(r.sessions.map(s => s.dn)).size;
  rec('尽早排完用的天数少于平均分散', days(as) < days(ev) && ev.totals.placed === 300 && as.totals.placed === 300, 'even=' + days(ev) + ' asap=' + days(as)); }
// 18 随机压力测试：任何输入都必须满足不变量
{ let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let runs = 0, viol = 0, first = '';
  for (let n = 0; n < 400; n++) {
    const items = {}, hide = {}; for (let k = 0; k < 40; k++) { const dn = TODAY + k, l = []; for (let j = ri(0, 4); j > 0; j--) { const s = ri(0, 90) * 15, e = Math.min(1440, s + ri(1, 12) * 15); l.push({ s, e }); } items[dn] = l; if (rnd() < 0.08) hide[dn] = 1; }
    const c = cal({ items, hide, h0: ri(5, 9) * 60, h1: ri(18, 24) * 60 }), steps = []; for (let j = ri(1, 8); j > 0; j--) steps.push({ t: 'S' + j, est: ri(0, 40) * 15, max: rnd() < .3 ? ri(0, 50) * 15 : null, done: rnd() < .15 ? ri(0, 10) * 15 : 0, dl: rnd() < .7 ? d(ri(0, 35)) : '' });
    const g = goal({ steps, space: rnd() < .5 ? 'study' : 'work', deadline: rnd() < .4 ? d(ri(0, 40)) : '', targetFinish: rnd() < .3 ? d(ri(0, 30)) : '', k: { maxDailyMin: ri(2, 12) * 30, sessionMin: ri(1, 12) * 15, breakMin: ri(0, 6) * 10 } });
    const opts = { pace: rnd() < .5 ? 'asap' : 'even', basis: rnd() < .5 ? 'max' : 'est' }, r = plan(g, c, { opts }); runs++;
    const bad = invariants(g, c, r, g.constraints.maxDailyMin); if (r.totals.placed + r.totals.short !== r.totals.need) bad.push('totals');
    if (r.feasible !== (r.totals.short === 0)) bad.push('feasible flag');
    if (bad.length) { viol++; if (!first) first = JSON.stringify({ n, bad: bad.slice(0, 3) }); }
  }
  rec('随机压力 400 组（随机日程 / 隐藏日 / 显示范围 / 估时 / 截止日 / 每日上限 / 时长 / 休息）：0 违规', viol === 0, runs + ' runs, ' + viol + ' violations ' + first); }
// 19 跨午夜：显示范围到 24:00 时，最后一块可以正好结束在 24:00，且不会越过
{ const g = goal({ steps: [{ t: 'N', est: 200, dl: d(1) }], k: { maxDailyMin: 600 } }), c = cal({ h0: 0, h1: 1440, items: { [TODAY]: [{ s: 0, e: 1380 }] } }), r = plan(g, c, { opts: { pace: 'asap' } });
  rec('显示范围到 24:00：只会用到 23:00–24:00 的空档，不越过午夜', r.sessions.length > 0 && r.sessions.every(s => s.e <= 1440) && r.sessions.filter(s => s.dn === TODAY).every(s => s.s >= 1380)); }
// 20 估时很小
{ const g = goal({ steps: [{ t: 'T', est: 10, dl: d(3) }] }), r = plan(g, cal()); rec('10 分钟的小任务能排成一个 10 分钟的块', r.sessions.length === 1 && r.sessions[0].min === 10); }

const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
