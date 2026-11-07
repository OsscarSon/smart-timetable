// Wrapped 2.0 统计口径单元测试：期望值都是手算的（见每组数据下的注释），不是“把实现输出抄一遍”。  node tests/wrapped-stats.test.cjs
const assert = require('node:assert/strict'); const { compute, cleanName } = require('../js/wrapped-stats.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const I = (dn, s, e, t, src, done) => ({ dn, s, e, t, src, done });
const sample = () => compute({ from: 100, to: 106, ws: 0, todayDn: 105, nowMin: 600, tasksDone: 3, items: [
  I(100, 540, 600, 'Math', 'f'), I(100, 570, 660, '📚 Study', 'm', true), I(101, 600, 660, 'study', 'm', false), I(102, 1080, 1200, 'Gym', 'r', true),
  I(103, 480, 510, 'Math', 'f'), I(105, 480, 540, 'Read', 'm', true), I(105, 900, 960, 'Later', 'm', false), I(106, 600, 700, 'Future', 'm', false),
  I(99, 0, 600, 'before range', 'm', true), I(107, 0, 600, 'after range', 'm', true), I(101, 700, 700, 'zero length', 'm', false)] });
const S = sample();
t('条目数/活跃天：范围外与零长度被排除 → 8 项、6 天', () => { assert.equal(S.items, 8); assert.equal(S.activeDays, 6); });
t('计划时长=每天并集：重叠 570–600 只算一次 → 120+60+120+30+120+100=550', () => { assert.equal(S.plannedMin, 550); assert.equal(+S.avgPerActiveDay.toFixed(3), +(550 / 6).toFixed(3)); });
t('最忙的一天：并列取最早 → dn100 / 120 分钟', () => assert.deepEqual(S.busiest, { dn: 100, min: 120 }));
t('每小时分布合计等于计划时长，10 点最高(180)', () => { assert.equal(S.hourly.reduce((a, b) => a + b, 0), 550); assert.equal(S.hourly[10], 180); assert.equal(S.peakHour, 10); });
t('时段：上午 370 / 下午 60 / 晚上 120 / 夜间 0', () => assert.deepEqual(S.slots, { morning: 370, afternoon: 60, evening: 120, night: 0 }));
t('按来源（条目自身时长）：手动 5 项 370 / 重复 1 项 120 / 课程 2 项 90', () => assert.deepEqual(S.bySrc, { m: { n: 5, min: 370 }, r: { n: 1, min: 120 }, f: { n: 2, min: 90 } }));
t('活动榜：同名(忽略大小写/emoji)合并，并列按名字排序', () => assert.deepEqual(S.top.map(x => [x.name, x.min, x.n]), [['Study', 150, 2], ['Gym', 120, 1], ['Future', 100, 1], ['Math', 90, 2], ['Later', 60, 1]]));
t('最长单个时段 = Gym 120 分钟(dn102)', () => assert.deepEqual(S.longest, { min: 120, name: 'Gym', dn: 102 }));
t('最忙的一周 = 从 dn102 起 370 分钟（不是 dn100 起的 180）', () => assert.deepEqual(S.busiestWeek, { startDn: 102, min: 370 }));
t('最长连续活跃 = 4 天(100–103)；无安排的晚上 = 5（统计到今天 dn105）', () => { assert.equal(S.streak, 4); assert.equal(S.freeEvenings, 5); });
t('计划 vs 完成：只算已过去的手动/重复项 → 4 项、完成 3、330/270 分钟、75%', () => assert.deepEqual(S.planVsDone, { eligible: 4, done: 3, eligibleMin: 330, doneMin: 270, rate: 0.75 }));
t('数据充足标志；tasksDone 透传', () => { assert.equal(S.enough.overall, true); assert.equal(S.enough.planVsDone, true); assert.equal(S.tasksDone, 3); });
t('空输入：不编造——全是 0/null，且标记为数据不足', () => { const E = compute({ from: 1, to: 30, items: [] }); assert.equal(E.items, 0); assert.equal(E.plannedMin, 0); assert.equal(E.busiest, null); assert.equal(E.peakHour, null); assert.equal(E.longest, null); assert.equal(E.planVsDone.rate, null); assert.equal(E.enough.overall, false); assert.equal(E.tasksDone, null); });
t('刚好低于门槛：4 项 → 不足；5 项但只有 2 天 → 不足', () => {
  const four = compute({ from: 1, to: 9, items: [1, 2, 3, 4].map(d => I(d, 0, 60, 'a', 'm', false)) }); assert.equal(four.enough.overall, false);
  const twoDays = compute({ from: 1, to: 9, items: [1, 1, 1, 2, 2].map((d, i) => I(d, i * 60, i * 60 + 30, 'a', 'm', false)) }); assert.equal(twoDays.enough.overall, false);
  const ok = compute({ from: 1, to: 9, items: [1, 1, 2, 2, 3].map((d, i) => I(d, i * 60, i * 60 + 30, 'a', 'm', false)) }); assert.equal(ok.enough.overall, true); });
t('裁剪到 0–1440：23:00–25:00 只算 60 分钟；e<=s 丢弃', () => { const r = compute({ from: 1, to: 1, items: [I(1, 1380, 1500, 'x', 'm', false), I(1, 50, 40, 'bad', 'm', false)] }); assert.equal(r.plannedMin, 60); assert.equal(r.items, 1); });
t('夜间时段：01:00–02:00 与 22:30–23:30 都进 night', () => { const r = compute({ from: 1, to: 1, items: [I(1, 60, 120, 'x', 'm', false), I(1, 1350, 1410, 'y', 'm', false)] }); assert.equal(r.slots.night, 120); });
t('今天恰好此刻结束的算已过去，还没结束的不进分母', () => { const r = compute({ from: 5, to: 5, todayDn: 5, nowMin: 600, items: [I(5, 480, 540, 'a', 'm', true), I(5, 540, 600, 'b', 'm', false), I(5, 601, 660, 'c', 'm', false)] }); assert.equal(r.planVsDone.eligible, 2); });
t('课程不能被当作已完成/未完成', () => { const r = compute({ from: 5, to: 9, todayDn: 9, items: [I(5, 0, 60, 'c', 'f', false), I(6, 0, 60, 'c', 'f', false), I(7, 0, 60, 'c', 'f', false)] }); assert.equal(r.planVsDone.eligible, 0); assert.equal(r.planVsDone.rate, null); });
t('cleanName 去掉开头的 emoji/符号，保留中文', () => { assert.equal(cleanName('🏫 数学'), '数学'); assert.equal(cleanName('  🔁 Gym '), 'Gym'); assert.equal(cleanName(null), ''); });
console.log(`\n${n}/${n} 通过`);
