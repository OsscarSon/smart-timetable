// Work / Life Space 聚合层单元测试（纯函数，Node 直接跑）：node tests/spaces-unit.cjs
const C = require('../js/spaces-core.js');
let fails = 0; const rec = (n, ok, note) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const TD = 20000, NOW = 10 * 60 + 30;                       // 今天 10:30
const base = () => ({ todayDn: TD, nowMin: NOW, weekFrom: TD, weekTo: TD + 6, items: [], goals: [], goalsOn: true });

// ---- unionMin ----
rec('unionMin：重叠只算一次', C.unionMin([[60, 120], [90, 150], [300, 330]]) === 120);
rec('unionMin：空 = 0', C.unionMin([]) === 0);

// ---- 空数据：不抛错、不编数字 ----
{
  const m = C.build({});
  rec('空快照：Work 全是 0 / 空，没有 next', m.work.count === 0 && m.work.done === 0 && m.work.next === null && m.work.weekMin === 0 && m.work.flow.length === 0 && m.work.goals.length === 0);
  rec('空快照：Life 没有打卡 / 饮水 / 精力 / 日程', m.life.rituals.total === 0 && m.life.water.has === false && m.life.energy === '' && m.life.agenda.length === 0);
}

// ---- Work：今日条目、状态、next、本周已排时间 ----
{
  const s = base();
  s.items = [
    { dn: TD, s: 540, e: 600, t: 'Planning', src: 'm', done: true },            // 09:00–10:00 已完成
    { dn: TD, s: 620, e: 680, t: 'Deep work', src: 'm' },                        // 10:20–11:20 正在进行
    { dn: TD, s: 840, e: 870, t: 'Sync', src: 'r' },                             // 14:00 下一项
    { dn: TD, s: 1020, e: 1080, t: 'Walk', src: 'm' },
    { dn: TD, s: 480, e: 500, t: 'Early', src: 'm' },                            // 过去但没标记完成 → past
    { dn: TD + 1, s: 600, e: 660, t: 'Tomorrow', src: 'm' },
    { dn: TD, s: 700, e: 700, t: 'Zero length', src: 'm' },                      // 无效：e<=s
    { dn: TD, s: 'x', e: 1, t: 'Bad', src: 'm' },                                // 无效：不是数字
    { dn: TD + 30, s: 600, e: 660, t: 'Far', src: 'm' }                          // 不在本周
  ];
  const w = C.build(s).work, by = {}; w.flow.forEach(i => by[i.t] = i);
  rec('Work：今日条目数只数有效且在今天的', w.count === 5, 'count=' + w.count);
  rec('Work：已完成数来自 done 标记', w.done === 1);
  rec('Work：状态 done / now / later / past', by.Planning.status === 'done' && by['Deep work'].status === 'now' && by.Sync.status === 'later' && by.Early.status === 'past');
  rec('Work：下一项 = 第一个还没开始的（不是正在进行的）', w.next && w.next.t === 'Sync' && w.next.s === 840 && by.Sync.next === true && !by['Deep work'].next);
  rec('Work：条目按开始时间排序', w.flow.map(i => i.s).join() === '480,540,620,840,1020');
  // 本周已排 = 今天 480–500,540–600,620–680,840–870,1020–1080 = 20+60+60+30+60=230 ；明天 60 ；总 290
  rec('Work：本周已排时间 = 每天区间并集之和（含明天，不含本周之外）', w.weekMin === 290, 'weekMin=' + w.weekMin);
  const o = base(); o.items = [{ dn: TD, s: 600, e: 660, t: 'A' }, { dn: TD, s: 630, e: 700, t: 'B' }];
  rec('Work：同一天重叠的活动只算一次时间', C.build(o).work.weekMin === 100);
}

// ---- Work：目标只读取 space=work 且进行中 ----
{
  const s = base();
  s.goals = [
    { id: 'a', title: 'Late', space: 'work', status: 'active', pct: 10, hasEst: true, daysLeft: 20 },
    { id: 'b', title: 'Soon', space: 'work', status: 'active', pct: 70, hasEst: true, daysLeft: 3 },
    { id: 'c', title: 'Study one', space: 'study', status: 'active', pct: 5, hasEst: true, daysLeft: 1 },
    { id: 'd', title: 'Paused', space: 'work', status: 'paused', pct: 5, hasEst: true, daysLeft: 1 },
    { id: 'e', title: 'Open ended', space: 'work', status: 'active', pct: 0, hasEst: false, daysLeft: null },
    { id: 'f', title: 'Life one', space: 'life', status: 'active', pct: 5, hasEst: true, daysLeft: 1 }
  ];
  const g = C.build(s).work.goals;
  rec('目标：只取 work + active', g.map(x => x.id).join() === 'b,a,e', g.map(x => x.id).join());
  rec('目标：按剩余天数从近到远，没有截止日的排最后', g[0].id === 'b' && g[2].id === 'e');
  rec('目标：没有时间估计的目标不显示进度（hasEst=false）', g[2].hasEst === false);
  s.goalsOn = false; rec('goalsOn=false：标记传出去，界面据此隐藏整个模块', C.build(s).work.goalsOn === false);
  s.goals = Array.from({ length: 8 }, (_, i) => ({ id: 'x' + i, title: 't', space: 'work', status: 'active', pct: 0, hasEst: true, daysLeft: i })); s.goalsOn = true;
  rec('目标：最多 3 个', C.build(s).work.goals.length === 3);
}

// ---- Life：日程、打卡、饮水、精力 ----
{
  const s = base();
  s.items = [
    { dn: TD, s: 540, e: 600, t: 'Done early', src: 'm', done: true },
    { dn: TD, s: 480, e: 500, t: 'Gone by', src: 'm' },
    { dn: TD, s: 620, e: 680, t: 'Now', src: 'm' },
    { dn: TD, s: 1020, e: 1080, t: 'Walk', src: 'r' },
    { dn: TD + 1, s: 600, e: 660, t: 'Tomorrow A', src: 'm' },
    { dn: TD + 1, s: 700, e: 760, t: 'Tomorrow done', src: 'm', done: true },
    { dn: TD + 2, s: 600, e: 660, t: 'Day after', src: 'm' }
  ];
  s.bt = { am: ['Cleanser', 'Moisturizer', 'SPF'], pm: ['Remove', 'Cleanser'], doneAm: [0, 2], donePm: [] };
  s.water = { w: 3, goal: 8 }; s.energy = 'low';
  const l = C.build(s).life;
  rec('Life 日程：今天只留“进行中 + 还没开始”，已完成 / 已过去的不出现', l.agenda.filter(a => a.day === 'today').map(a => a.t).join() === 'Now,Walk');
  rec('Life 日程：明天只留没标记完成的；后天不出现', l.agenda.filter(a => a.day === 'tomorrow').map(a => a.t).join() === 'Tomorrow A' && !l.agenda.some(a => a.t === 'Day after'));
  rec('Life 打卡：2/5（来自现有护肤记录）', l.rituals.done === 2 && l.rituals.total === 5);
  rec('Life 打卡：分组与每一步的勾选状态', l.rituals.groups[0].steps.map(x => x.done).join() === 'true,false,true' && l.rituals.groups[1].steps.every(x => !x.done));
  rec('Life 饮水：原样读取', l.water.w === 3 && l.water.goal === 8 && l.water.has === true);
  rec('Life 精力：只接受 low / medium / high', l.energy === 'low' && C.build(Object.assign(base(), { energy: 'weird' })).life.energy === '' && C.build(Object.assign(base(), { energy: '' })).life.energy === '');
  const many = base(); many.items = Array.from({ length: 12 }, (_, i) => ({ dn: TD + 1, s: 600 + i * 10, e: 605 + i * 10, t: 'T' + i }));
  rec('Life 日程：最多 6 条', C.build(many).life.agenda.length === 6);
}

// ---- 纯度：不改输入 ----
{
  const s = base(); s.items = [{ dn: TD, s: 600, e: 660, t: 'A', done: false }]; const before = JSON.stringify(s); C.build(s);
  rec('build 不修改输入快照', JSON.stringify(s) === before);
}
console.log('\n' + (fails ? fails + ' FAILED' : 'all passed')); process.exit(fails ? 1 : 0);
