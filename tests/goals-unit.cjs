// Goals 数据层单元测试（Node，无浏览器）。用法：node tests/goals-unit.cjs
const fs = require('fs'), vm = require('vm'), assert = require('assert');
function mkEnv(seed) {
  const store = Object.assign({}, seed || {});
  const ls = { get length() { return Object.keys(store).length; }, key: i => Object.keys(store)[i] || null, getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { if (ls.fail) throw new Error('quota'); store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const root = { localStorage: ls, crypto: require('crypto').webcrypto, LANG: 'en' }; root.window = root;
  vm.runInNewContext(fs.readFileSync(__dirname + '/../js/goals.js', 'utf8'), root);
  return { G: root.Goals, c: root.Goals.core, store, ls };
}
const res = []; const T = (n, f) => { try { f(); res.push([n, 1]); console.log('PASS ' + n); } catch (e) { res.push([n, 0]); console.log('FAIL ' + n + '  — ' + e.message); } };

T('打开/读取不写入任何键（零写入）', () => { const { c, store } = mkEnv({ 'mochi-wk:main:1': '[]' }); c.listGoals(); c.subjectsFromStudy(); assert.deepStrictEqual(Object.keys(store), ['mochi-wk:main:1']); });
T('保存只写 goals-* 键，旧键一字节不变', () => {
  const seed = { 'mochi-st': '{"subs":["A"],"ex":{}}', 'mochi-hw': '[1]', 'mochi-wk:main:5': '[{"day":1}]' };
  const { c, store } = mkEnv(seed); const g = c.newGoal({ title: 'x', steps: [{ title: 's' }] }); assert(c.saveGoal(g, 0).ok);
  Object.keys(seed).forEach(k => assert.strictEqual(store[k], seed[k]));
  Object.keys(store).forEach(k => assert(k in seed || k.indexOf('goals-') === 0, '意外的键 ' + k));
});
T('UUID / rev / updatedAt / updatedBy 预留字段', () => {
  const { c } = mkEnv(); const r = c.saveGoal(c.newGoal({ title: 'a' }), 0);
  assert(/^[0-9a-f-]{36}$/.test(r.goal.id)); assert.strictEqual(r.goal.rev, 1); assert(r.goal.updatedAt); assert(r.goal.updatedBy); assert.strictEqual(r.goal.schemaVersion, 1);
  const r2 = c.saveGoal(r.goal, 1); assert.strictEqual(r2.goal.rev, 2); assert(r2.goal.updatedAt >= r.goal.updatedAt);
});
T('多标签冲突：旧 rev 保存被拒绝', () => { const { c } = mkEnv(); const a = c.saveGoal(c.newGoal({ title: 'a' }), 0).goal; c.saveGoal(a, 1); const r = c.saveGoal(a, 1); assert(!r.ok && r.error === 'errConflict'); });
T('校验：空标题 / 完成日晚于截止 / 空步骤名', () => {
  const { c } = mkEnv(); let g = c.newGoal({ title: '' }); assert.strictEqual(c.saveGoal(g, 0).error, 'errTitle');
  g = c.newGoal({ title: 'a' }); g.deadline = '2026-12-01'; g.targetFinish = '2026-12-05'; assert.strictEqual(c.saveGoal(g, 0).error, 'errFinish');
  g = c.newGoal({ title: 'a', steps: [{ title: '' }] }); const r = c.saveGoal(g, 0); assert.strictEqual(r.error, 'errStep'); assert.strictEqual(r.index, 0);
});
T('存储写入失败返回 errSave，不抛异常、不半写', () => { const { c, ls, store } = mkEnv(); ls.fail = true; const r = c.saveGoal(c.newGoal({ title: 'a' }), 0); assert(!r.ok && r.error === 'errSave'); assert.strictEqual(Object.keys(store).length, 0); });
T('规范化：非法日期/空间/状态/超范围数值', () => {
  const { c } = mkEnv(); const g = c.normGoal({ id: 'abcdefgh', title: '  T  ', space: 'hack', status: 'zzz', deadline: '2026-02-31', steps: [{ title: 's', estimateMin: -5, estimateMaxMin: 1, doneMin: 99999 }], constraints: { sessionMin: 9999, maxDailyMin: 'x' } });
  assert.strictEqual(g.title, 'T'); assert.strictEqual(g.space, 'study'); assert.strictEqual(g.status, 'draft'); assert.strictEqual(g.deadline === '', true);
  assert.strictEqual(g.steps[0].estimateMin, 0); assert(g.steps[0].doneMin <= 6000); assert.strictEqual(g.constraints.sessionMin, 180); assert.strictEqual(g.constraints.maxDailyMin, 180);
});
T('估时区间：max 不小于 min；步骤依赖只保留存在的 id', () => {
  const { c } = mkEnv(); const a = 'aaaaaaaa-1', b = 'bbbbbbbb-2'; const g = c.normGoal({ id: 'gggggggg', title: 't', steps: [{ id: a, title: 'a', estimateMin: 60, estimateMaxMin: 30 }, { id: b, title: 'b', dependencies: [a, 'ghostghost', b] }] });
  assert.strictEqual(g.steps[0].estimateMaxMin, 60); assert.deepStrictEqual(g.steps[1].dependencies, [a]);
});
T('进度只统计明确勾选的完成；没估时的不计入分母', () => {
  const { c } = mkEnv(); const g = c.normGoal({ id: 'gggggggg', title: 't', steps: [{ title: 'a', estimateMin: 60, doneMin: 60 }, { title: 'b', estimateMin: 60 }, { title: 'c' }] });
  const p = c.progress(g); assert.deepStrictEqual([p.total, p.done, p.pct, p.missing], [120, 60, 50, 1]);
});
T('软删除：列表不再显示，墓碑保留并带 rev/deletedAt', () => {
  const { c, store } = mkEnv(); const g = c.saveGoal(c.newGoal({ title: 'a' }), 0).goal; assert(c.deleteGoal(g.id).ok);
  assert.strictEqual(c.listGoals().length, 0); const raw = JSON.parse(store['goals-g:' + g.id]); assert(raw.deletedAt); assert.strictEqual(raw.rev, 2);
});
T('损坏的存储项：跳过并计数，不删除', () => { const { c, store } = mkEnv({ 'goals-g:badbadbad': '{oops' }); assert.strictEqual(c.listGoals().length, 0); assert.strictEqual(c.listGoals.corrupt, 1); assert.strictEqual(store['goals-g:badbadbad'], '{oops'); });
T('新版本数据（schemaVersion 更高）：保留未知字段、拒绝覆盖', () => {
  const raw = { id: 'futurefut', title: 'f', schemaVersion: 2, rev: 3, newThing: { a: 1 } }; const { c, store } = mkEnv({ 'goals-g:futurefut': JSON.stringify(raw) });
  const g = c.getGoal('futurefut'); assert.strictEqual(JSON.stringify(g.newThing), '{"a":1}'); const r = c.saveGoal(g, 3); assert(!r.ok && r.error === 'errFuture'); assert.strictEqual(store['goals-g:futurefut'], JSON.stringify(raw));
});
T('导出再导入：往返一致；较新的本机数据不被旧备份覆盖', () => {
  const A = mkEnv(); const g = A.c.saveGoal(A.c.newGoal({ title: 'x', steps: [{ title: 's', estimateMin: 30 }] }), 0).goal; const dump = A.c.exportAll();
  const B = mkEnv(); const r = B.c.importData(dump); assert(r.ok && r.added === 1); assert.strictEqual(B.c.getGoal(g.id).steps[0].estimateMin, 30);
  const g2 = B.c.getGoal(g.id); g2.title = 'newer'; B.c.saveGoal(g2, g2.rev); const r2 = B.c.importData(dump); assert.strictEqual(r2.skipped, 1); assert.strictEqual(B.c.getGoal(g.id).title, 'newer');
});
T('导入：垃圾/非本应用/过大/路径注入 id 都不写入', () => {
  const { c, store } = mkEnv(); assert(!c.importData('not json').ok); assert(!c.importData('{"app":"other","goals":[]}').ok); assert(!c.importData('x'.repeat(2e6 + 1)).ok);
  const r = c.importData(JSON.stringify({ app: 'mochi-goals', schemaVersion: 1, goals: [{ id: '../mochi-hw', title: 'x' }, { id: 'a b', title: 'x' }] })); assert.strictEqual(r.invalid, 2); assert.strictEqual(Object.keys(store).filter(k => k.indexOf('goals-g:') === 0).length, 0);
});
T('从「学习」只读取科目与考试日（每科不同），不修改 mochi-st', () => {
  const st = '{"subs":["BM","Math"],"ex":{"BM":"2026-11-30","Math":"bad"},"topics":[]}'; const { c, store } = mkEnv({ 'mochi-st': st });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.subjectsFromStudy())), [{ title: 'BM', deadline: '2026-11-30' }, { title: 'Math', deadline: '' }]); assert.strictEqual(store['mochi-st'], st);
});
T('daysLeft / fmtMin', () => { const { c } = mkEnv(); assert.strictEqual(c.daysLeft('2026-11-17', '2026-11-07'), 10); assert.strictEqual(c.daysLeft('2026-11-01', '2026-11-07'), -6); assert.strictEqual(c.fmtMin(90), '1h 30m'); assert.strictEqual(c.fmtMin(45), '45m'); });
T('enabled / setEnabled 开关', () => { const { G } = mkEnv(); assert(G.enabled()); G.setEnabled(false); assert(!G.enabled()); G.setEnabled(true); assert(G.enabled()); });
const f = res.filter(r => !r[1]).length; console.log(`\n${res.length - f}/${res.length} 通过`); process.exit(f ? 1 : 0);
