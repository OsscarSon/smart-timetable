// Study Space 聚合层（js/study-space-core.js）单元测试：纯函数，不需要浏览器。  用法：node tests/study-space-unit.cjs
const C = require('../js/study-space-core.js');
const results = []; const rec = (n, ok, note) => { results.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (note ? '  — ' + note : '')); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const TODAY = C.dnOfIso('2026-11-09'), iso = d => C.isoOfDn(TODAY + d);
const base = (o) => Object.assign({ today: TODAY, nowMin: 10 * 60, subs: [], stSubs: [], topics: [], hw: [], ex: {}, events: [], goals: [], goalsOn: true, limit: 50 }, o || {});

// 1 空数据 / 垃圾输入
{
  const m = C.build(base());
  rec('1 空数据：全部为 0、没有科目、empty.all = true，不抛错', m.empty.all && m.subjects.length === 0 && m.stats.reviewsDue === 0 && m.stats.homeworkDue === 0 && m.stats.sessionsToday === 0 && m.week.pct === null && m.exam === null && m.upcoming.items.length === 0);
  let ok = true; try { [undefined, null, 5, 'x', [], { topics: 5, hw: 'a', ex: [], events: {}, goals: 3, stSubs: null }].forEach(x => C.build(x)); } catch (e) { ok = false; }
  rec('1b 垃圾输入（undefined / null / 数字 / 字符串 / 字段类型全错）都不抛错', ok);
}

// 2 坏记录被跳过，好记录照常
{
  const m = C.build(base({ stSubs: ['Math'], topics: [null, 5, 'x', [], { s: 'Math' }, { n: 'x' }, { s: 'Math', n: 'Algebra', iv: 'abc', nx: 'zzz' }, { s: 'Math', n: 'Calculus', iv: 2, nx: TODAY - 3 }, { s: 'Math', n: 'Geometry', iv: -4, nx: null }],
    hw: [null, 7, { t: '' }, { t: 'Bad date', sb: 'Math', due: '2026-02-30' }, { t: 'Real', sb: 'Math', due: iso(0) }, { sb: 'Math' }], ex: { Math: 'not-a-date' } }));
  const mt = m.subjects.find(s => s.name === 'Math');
  rec('2 坏章节被跳过（缺科目 / 缺名称 / 非对象），iv 读不出来按“没学过”，负数按 0', mt && mt.chapters.total === 3 && mt.chapters.fresh === 2 && mt.chapters.due === 1, JSON.stringify(mt && mt.chapters));
  rec('2b 作业：空标题 / 非对象被跳过；非法日期（2 月 30 日）当作“没有截止日期”；坏考试日期忽略', mt.hw.list.length === 2 && mt.hw.list.some(h => h.title === 'Bad date' && h.due === '') && mt.exam === null && m.stats.homeworkDue === 1);
}

// 3 到期判断与原有 study.js 一致
{
  const m = C.build(base({ stSubs: ['A'], topics: [{ s: 'A', n: 'due-today', iv: 1, nx: TODAY }, { s: 'A', n: 'future', iv: 3, nx: TODAY + 2 }, { s: 'A', n: 'new', iv: 0, nx: TODAY }, { s: 'A', n: 'no-nx', iv: 2 }, { s: 'A', n: 'late', iv: 1, nx: TODAY - 5 }] }));
  rec('3 到期复习 = iv>0 且 nx<=今天（今天到期算、未来不算、没学过的不算复习、nx 缺失不算）', m.stats.reviewsDue === 2 && eq(m.reviews.map(r => r.name), ['late', 'due-today']), JSON.stringify(m.reviews));
  const ch = m.subjects[0].chapters.list.map(c => c.name);
  rec('3b 科目内章节顺序：先到期（nx 小的在前），再没学过，再未来', eq(ch, ['late', 'due-today', 'new', 'future', 'no-nx']) || eq(ch.slice(0, 3), ['late', 'due-today', 'new']), ch.join());
}

// 4 作业科目标签被截断（hw.js 保存时 slice(0,12)）
{
  const long = 'Pendidikan Islam Lanjutan', m = C.build(base({ subs: [long, 'Pendidikan I'], stSubs: [long], hw: [{ t: 'Essay', sb: 'Pendidikan I', due: iso(1) }, { t: 'Quiz', sb: long, due: iso(2) }] }));
  const s = m.subjects.find(x => x.name === long);
  rec('4 作业上被截断成 12 个字的科目标签，归到同名的长科目下；不会多出一个“Pendidikan I”科目', s && s.hw.open === 2 && !m.subjects.some(x => x.name === 'Pendidikan I') && m.subjects.length === 1, JSON.stringify(m.subjects.map(x => [x.name, x.hw.open])));
}

// 4b hw.js 先 trim 再截 12 字 → 标签可能带尾随空格；真实存在的短科目不被误并
{
  const long = 'A very long subject name', m = C.build(base({ stSubs: [long], hw: [{ t: 'Trunc', sb: 'A very long ', due: iso(0) }] }));
  rec('4b 带尾随空格的截断标签（“A very long ”）也归到长科目', m.subjects.length === 1 && m.subjects[0].name === long && m.subjects[0].hw.open === 1, JSON.stringify(m.subjects.map(x => [x.name, x.hw.open])));
  const m2 = C.build(base({ stSubs: ['Mathematics', 'Mathematics Advanced'], hw: [{ t: 'x', sb: 'Mathematics', due: iso(0) }] }));
  rec('4c 真实存在的短科目（Mathematics）不会被误并进更长的 Mathematics Advanced', m2.subjects.length === 2 && m2.subjects.find(s => s.name === 'Mathematics').hw.open === 1);
}
// 5 排序：逾期作业 > 今天作业 > 到期复习 > 学习时段 > 近 3 天作业；同级确定；与输入顺序无关
{
  const hw = [{ id: 'h5', t: 'Soon', sb: 'A', due: iso(2) }, { id: 'h2', t: 'Today B', sb: 'A', due: iso(0) }, { id: 'h1', t: 'Over old', sb: 'A', due: iso(-3) }, { id: 'h3', t: 'Today A', sb: 'A', due: iso(0) }, { id: 'h4', t: 'Over new', sb: 'A', due: iso(-1) }, { id: 'h6', t: 'Far', sb: 'A', due: iso(30) }, { id: 'h7', t: 'Finished', sb: 'A', due: iso(-9), done: 1 }];
  const topics = [{ s: 'A', n: 'R2', iv: 1, nx: TODAY }, { s: 'A', n: 'R1', iv: 1, nx: TODAY - 2 }];
  const ev = [{ w: 1, dn: TODAY + 1, s: 600, e: 660, t: 'Later', src: 'auto', inWeek: true }, { w: 1, dn: TODAY, s: 900, e: 960, t: 'Tonight', src: 'goal', goalId: 'g' }, { w: 1, dn: TODAY, s: 300, e: 360, t: 'Already over', src: 'auto' }, { w: 1, dn: TODAY, s: 1000, e: 1060, t: 'Done one', done: true }];
  const want = ['Over old', 'Over new', 'Today A', 'Today B', 'R1', 'R2', 'Tonight', 'Later', 'Soon'];
  const m1 = C.build(base({ stSubs: ['A'], hw, topics, events: ev })), got = m1.upcoming.items.map(i => i.title);
  rec('5 即将到来的顺序：逾期（旧→新）→ 今天（按标题）→ 到期复习（更久没复习的在前）→ 学习时段（今天的、已结束 / 已完成的不出现）→ 近 3 天作业；30 天后的和已完成的不出现', eq(got, want), got.join(' | '));
  let same = true; for (let k = 0; k < 6; k++) { const sh = a => a.slice().sort(() => Math.random() - .5); const m2 = C.build(base({ stSubs: ['A'], hw: sh(hw), topics: sh(topics), events: sh(ev) })); if (!eq(m2.upcoming.items.map(i => i.title), want)) same = false; }
  rec('5b 打乱输入顺序重算 6 次，排序结果完全一样（确定性）', same);
  const ties = C.build(base({ hw: [{ id: 'b', t: 'Same', due: iso(0) }, { id: 'a', t: 'Same', due: iso(0) }, { id: 'c', t: 'Same', due: iso(0) }] })).upcoming.items.map(i => i.id);
  rec('5c 标题、日期都相同的作业：按 id 排，稳定', eq(ties, ['a', 'b', 'c']), ties.join());
  const lim = C.build(base({ hw, topics, events: ev, limit: 3 }));
  rec('5d limit 只截断显示，total 仍是完整数量', lim.upcoming.items.length === 3 && lim.upcoming.total === want.length, lim.upcoming.total);
}

// 6 考试日
{
  const m = C.build(base({ stSubs: ['A', 'B', 'C'], ex: { A: iso(12), B: iso(5), C: iso(-2) } }));
  rec('6 最近的考试 = 未过期里最近的（B，5 天）；已过期的不倒数，但科目里记为 examPast', m.exam && m.exam.subject === 'B' && m.exam.days === 5 && m.subjects.find(s => s.name === 'C').exam === null && m.subjects.find(s => s.name === 'C').examPast === iso(-2));
  rec('6b 考试就在今天：天数为 0，仍算', C.build(base({ stSubs: ['A'], ex: { A: iso(0) } })).exam.days === 0);
  const tie = C.build(base({ stSubs: ['Z', 'A'], ex: { Z: iso(4), A: iso(4) } }));
  rec('6c 天数相同取 ST.subs 里排在前面的（与 nearestExam() 一致）', tie.exam.subject === 'Z');
}

// 7 本周进度：只统计“学习时段”，完成只看打勾，不看时长
{
  const ev = [{ w: 1, dn: TODAY - 1, s: 500, e: 560, t: 'S1', done: true, inWeek: true }, { w: 1, dn: TODAY, s: 500, e: 560, t: 'S2', inWeek: true }, { w: 1, dn: TODAY + 1, s: 500, e: 560, t: 'S3', inWeek: true }, { w: 2, dn: TODAY + 8, s: 500, e: 560, t: 'NextWeek' }, { w: 1, dn: TODAY, s: 0, e: 0, t: '' }];
  const m = C.build(base({ events: ev }));
  rec('7 本周 3 个时段、完成 1 个 → 33%；下周的不算；没标题的跳过', m.week.planned === 3 && m.week.done === 1 && m.week.pct === 33, JSON.stringify(m.week));
  rec('7b 今天还没打勾的时段数（工作台“学习时段”）= 1', m.stats.sessionsToday === 1);
  rec('7c 本周没有任何时段：pct 为 null（不是 0%）', C.build(base()).week.pct === null);
}

// 8 Goals：按步骤标题关联科目；开关关闭时完全不出现
{
  const g = (id, title, status, steps, extra) => Object.assign({ id, title, status, deadline: '', steps }, extra || {});
  const goals = [g('g000001', 'SPM revision', 'active', [{ title: 'math', estimateMin: 60, doneMin: 30 }, { title: 'Physics', estimateMin: 60, doneMin: 0 }], { deadline: iso(20), summary: { n: 3, min: 120 }, line: 'Scheduled' }), g('g000002', 'Other', 'draft', [{ title: 'History', estimateMin: 0 }]), g('g000003', 'Old', 'archived', [{ title: 'Math', estimateMin: 10 }]), g('g000004', 'Gone', 'active', [{ title: 'Math' }], { deletedAt: '2026-01-01' })];
  const on = C.build(base({ stSubs: ['Math', 'Physics', 'History'], goals })), off = C.build(base({ stSubs: ['Math', 'Physics', 'History'], goals, goalsOn: false }));
  const m = on.subjects.find(s => s.name === 'Math');
  rec('8 目标按“步骤标题 = 科目名”（忽略大小写）关联；已归档 / 已删除的目标不出现', m.goals.length === 1 && m.goals[0].id === 'g000001' && on.goals.length === 2, JSON.stringify(m.goals.map(x => x.id)));
  rec('8b 目标进度只按用户勾选的完成量算：30 / 120 = 25%；步骤没有估时的目标进度为 null', m.goals[0].pct === 25 && on.subjects.find(s => s.name === 'History').goals[0].pct === null);
  rec('8c 目标排程摘要和截止天数原样带出', m.goals[0].sched.n === 3 && m.goals[0].daysLeft === 20 && m.goals[0].line === 'Scheduled');
  rec('8d Goals 开关关闭：科目里没有目标、总目标列表为空', off.subjects.every(s => s.goals.length === 0) && off.goals.length === 0 && off.goalsOn === false);
}

// 9 没有学习数据的“课表课程”不占科目卡；ST.subs 里的一定显示（哪怕是空科目）
{
  const m = C.build(base({ subs: ['School', 'PE', 'Math', 'Art'], stSubs: ['Math', 'Art'], hw: [{ t: 'x', sb: 'PE', due: iso(1) }] }));
  rec('9 学习科目（ST.subs）和有作业 / 章节 / 考试的科目会出现；只在课表里出现过的课（School）不出现；顺序 = ST.subs 在前', eq(m.subjects.map(s => s.name), ['Math', 'Art', 'PE']), m.subjects.map(s => s.name).join());
  rec('9b 空科目（只在 ST.subs）：章节 0、进度 null、没有作业', (() => { const a = m.subjects.find(s => s.name === 'Art'); return a.chapters.total === 0 && a.chapters.pct === null && a.hw.open === 0; })());
}

// 10 规模
{
  const topics = [], hw = []; for (let i = 0; i < 3000; i++) { topics.push({ s: 'S' + (i % 30), n: 'T' + i, iv: i % 3, nx: TODAY + (i % 7) - 3 }); hw.push({ id: 'h' + i, t: 'W' + i, sb: 'S' + (i % 30), due: iso((i % 11) - 5) }); }
  const t0 = Date.now(), m = C.build(base({ stSubs: Array.from({ length: 30 }, (_, i) => 'S' + i), topics, hw, limit: 6 })); const ms = Date.now() - t0;
  rec('10 3000 个章节 + 3000 条作业 + 30 个科目：聚合 < 500 ms，显示仍只取 6 条', ms < 500 && m.upcoming.items.length === 6 && m.subjects.length === 30, ms + ' ms');
}
// 11 纯度：不修改输入
{
  const inp = base({ stSubs: ['A'], topics: [{ s: 'A', n: 'x', iv: 1, nx: TODAY }], hw: [{ id: 'q', t: 'h', sb: 'A', due: iso(0) }], goals: [{ id: 'g000001', title: 'g', status: 'active', steps: [{ title: 'A', estimateMin: 5 }] }] });
  const before = JSON.stringify(inp); C.build(inp);
  rec('11 build() 不修改传入的数据（只读）', JSON.stringify(inp) === before);
}
const ok = results.filter(Boolean).length; console.log('\n' + ok + '/' + results.length + ' passed'); process.exit(ok === results.length ? 0 : 1);
