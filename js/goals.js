// Mochi Goals · Phase 1（草稿 + 步骤 + 工作量，只存本机）。见 docs/v8.9.5-goals-phase1.md
// 边界：只读写 goals-* 键；唯一读取的旧数据是 mochi-st（科目 / 考试日，只读，用于“添加我的科目”）。
// 不写日历、不碰 Undo / 云同步 / Study 排程 / Agent。文案全部在 js/lang-goals.js（en / zh / ms）。
(function (root) {
  'use strict';
  var PFX = 'goals-g:', META = 'goals-meta', PREFS = 'goals-prefs', SCHEMA = 1;
  var SPACES = ['study', 'work', 'life'], STATUS = ['draft', 'active', 'paused', 'done', 'archived'];
  var MAXEST = 6000, MAXSTEPS = 100, MAXGOALS = 200;
  var KNOWN = { id: 1, schemaVersion: 1, space: 1, title: 1, deadline: 1, targetFinish: 1, status: 1, steps: 1, constraints: 1, createdAt: 1, updatedAt: 1, updatedBy: 1, rev: 1, deletedAt: 1 };

  // ---------- 小工具 ----------
  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function nowIso() { return new Date().toISOString(); }
  function int(v, min, max, def) { var n = Math.round(Number(v)); if (v === '' || v == null || !isFinite(n)) return def; return Math.max(min, Math.min(max, n)); }
  function str(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }
  function isoOk(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }
  function uuid() {
    var c = root.crypto; if (c && c.randomUUID) return c.randomUUID();
    var b = new Uint8Array(16), i;
    if (c && c.getRandomValues) c.getRandomValues(b); else for (i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = []; for (i = 0; i < 16; i++) h.push((b[i] + 256).toString(16).slice(1));
    return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('') + '-' + h.slice(8, 10).join('') + '-' + h.slice(10).join('');
  }
  function idOk(id) { return /^[A-Za-z0-9_-]{8,64}$/.test(String(id || '')); }
  function fmtMin(m) { m = Math.max(0, Math.round(m || 0)); var h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + 'h ' + r + 'm' : h + 'h') : r + 'm'; }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysLeft(iso, from) {
    if (!isoOk(iso)) return null; var a = String(iso).split('-'), b = String(from || todayIso()).split('-');
    return Math.round((Date.UTC(+a[0], +a[1] - 1, +a[2]) - Date.UTC(+b[0], +b[1] - 1, +b[2])) / 864e5);
  }

  // ---------- 规范化（读到的、导入的、保存的都过这里）----------
  function normStep(s) {
    if (!s || typeof s !== 'object') s = {};
    var est = int(s.estimateMin, 0, MAXEST, 0), max = (s.estimateMaxMin == null || s.estimateMaxMin === '') ? null : int(s.estimateMaxMin, 0, MAXEST, null);
    if (max !== null && max < est) max = est;
    return {
      id: idOk(s.id) ? s.id : uuid(), title: str(s.title, 80), estimateMin: est, estimateMaxMin: max,
      assumed: !!s.assumed, doneMin: int(s.doneMin, 0, MAXEST, 0), doneAt: s.doneAt ? str(s.doneAt, 40) : null,
      deadline: isoOk(s.deadline) ? s.deadline : '', dependencies: Array.isArray(s.dependencies) ? s.dependencies.filter(idOk).slice(0, 20) : []
    };
  }
  function normGoal(raw, id) {
    if (!raw || typeof raw !== 'object') return null;
    var gid = id || raw.id; if (!idOk(gid)) return null;
    var c = raw.constraints && typeof raw.constraints === 'object' ? raw.constraints : {};
    var g = {
      id: gid, schemaVersion: SCHEMA, space: SPACES.indexOf(raw.space) >= 0 ? raw.space : 'study', title: str(raw.title, 80),
      deadline: isoOk(raw.deadline) ? raw.deadline : '', targetFinish: isoOk(raw.targetFinish) ? raw.targetFinish : '',
      status: STATUS.indexOf(raw.status) >= 0 ? raw.status : 'draft',
      steps: (Array.isArray(raw.steps) ? raw.steps : []).slice(0, MAXSTEPS).map(normStep),
      constraints: { maxDailyMin: int(c.maxDailyMin, 30, 720, 180), sessionMin: int(c.sessionMin, 15, 180, 45), breakMin: int(c.breakMin, 0, 60, 10) },
      createdAt: str(raw.createdAt, 40) || nowIso(), updatedAt: str(raw.updatedAt, 40) || '', updatedBy: str(raw.updatedBy, 64),
      rev: int(raw.rev, 0, 1e9, 0), deletedAt: raw.deletedAt ? str(raw.deletedAt, 40) : null
    };
    var ids = {}; g.steps.forEach(function (s) { ids[s.id] = 1; });
    g.steps.forEach(function (s) { s.dependencies = s.dependencies.filter(function (d) { return ids[d] && d !== s.id; }); });
    Object.keys(raw).forEach(function (k) { if (!KNOWN[k] && g[k] === undefined) g[k] = raw[k]; });   // 保留新版本的未知字段
    if (int(raw.schemaVersion, 0, 1e6, SCHEMA) > SCHEMA) { g.schemaVersion = raw.schemaVersion; Object.defineProperty(g, '_future', { value: true, enumerable: false }); }
    return g;
  }

  // ---------- 存储（只碰 goals-*）----------
  function rawGet(id) { var s = ls(); if (!s) return null; try { var v = s.getItem(PFX + id); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
  function write(k, v) { var s = ls(); if (!s) return false; try { s.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function deviceId() {
    var s = ls(), m = null; if (!s) return '';
    try { m = JSON.parse(s.getItem(META) || 'null'); } catch (e) { m = null; }
    if (!m || !idOk(m.deviceId)) { m = { schemaVersion: SCHEMA, deviceId: uuid(), createdAt: nowIso() }; write(META, m); }
    return m.deviceId;
  }
  function listGoals(opt) {
    opt = opt || {}; var s = ls(), out = [], bad = 0, i, k; listGoals.corrupt = 0; if (!s) return out;
    var keys = []; for (i = 0; i < s.length; i++) { k = s.key(i); if (k && k.indexOf(PFX) === 0) keys.push(k); }
    keys.forEach(function (k) {
      var id = k.slice(PFX.length), raw = null; try { raw = JSON.parse(s.getItem(k)); } catch (e) { raw = null; }
      var g = normGoal(raw, id); if (!g) { bad++; return; }
      if (g.deletedAt && !opt.deleted) return;
      if (opt.space && g.space !== opt.space) return;
      out.push(g);
    });
    listGoals.corrupt = bad;
    return out.sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0; });
  }
  function getGoal(id) { return idOk(id) ? normGoal(rawGet(id), id) : null; }
  function newGoal(o) {
    o = o || {}; return normGoal({ id: uuid(), space: o.space, title: o.title || '', status: 'draft', steps: o.steps || [], createdAt: nowIso(), rev: 0 });
  }
  function validate(g) {
    if (!g.title) return { code: 'errTitle' };
    if (g.deadline && g.targetFinish && g.targetFinish > g.deadline) return { code: 'errFinish' };
    for (var i = 0; i < g.steps.length; i++) if (!g.steps[i].title) return { code: 'errStep', index: i };
    return null;
  }
  // 保存：baseRev = 打开编辑时读到的版本号；别的标签页改过就拒绝覆盖
  function saveGoal(goal, baseRev) {
    var g = normGoal(goal, goal && goal.id); if (!g) return { ok: false, error: 'errSave' };
    if (goal._future) return { ok: false, error: 'errFuture' };
    var v = validate(g); if (v) return { ok: false, error: v.code, index: v.index };
    var cur = rawGet(g.id);
    if (cur && int(cur.rev, 0, 1e9, 0) !== (baseRev || 0)) return { ok: false, error: 'errConflict' };
    if (!cur && !g.deletedAt && listGoals({ deleted: true }).length >= MAXGOALS) return { ok: false, error: 'errLimit' };
    g.rev = (cur ? int(cur.rev, 0, 1e9, 0) : 0) + 1; g.updatedAt = nowIso(); g.updatedBy = deviceId();
    if (!write(PFX + g.id, g)) return { ok: false, error: 'errSave' };
    return { ok: true, goal: g };
  }
  function deleteGoal(id) {      // 软删除（保留墓碑，将来同步需要）
    var cur = rawGet(id); if (!cur) return { ok: false, error: 'errSave' };
    var g = normGoal(cur, id); if (!g || cur.schemaVersion > SCHEMA) return { ok: false, error: 'errFuture' };
    g.deletedAt = nowIso(); g.rev = int(cur.rev, 0, 1e9, 0) + 1; g.updatedAt = g.deletedAt; g.updatedBy = deviceId();
    return write(PFX + id, g) ? { ok: true } : { ok: false, error: 'errSave' };
  }
  // 进度：只统计用户明确勾选的完成，已排程不算完成（Phase 1 还没有排程）
  function progress(g) {
    var tot = 0, done = 0, miss = 0;
    g.steps.forEach(function (s) { if (!s.estimateMin) { miss++; return; } tot += s.estimateMin; done += Math.min(s.doneMin, s.estimateMin); });
    return { total: tot, done: done, pct: tot ? Math.round(done / tot * 100) : 0, missing: miss };
  }
  function stepDone(s) { return s.estimateMin > 0 && s.doneMin >= s.estimateMin; }

  // ---------- 备份 / 恢复（粘贴文本，不依赖文件接口，Android WebView 也能用）----------
  function exportAll() { return JSON.stringify({ app: 'mochi-goals', schemaVersion: SCHEMA, exportedAt: nowIso(), goals: listGoals() }, null, 1); }
  function importData(text) {
    var r = { ok: false, added: 0, updated: 0, skipped: 0, invalid: 0 }, o;
    if (typeof text !== 'string' || text.length > 2e6) return r;
    try { o = JSON.parse(text); } catch (e) { return r; }
    if (!o || o.app !== 'mochi-goals' || !Array.isArray(o.goals)) return r;
    if (o.schemaVersion > SCHEMA) return r;
    var dev = deviceId();
    o.goals.slice(0, MAXGOALS).forEach(function (raw) {
      var g = normGoal(raw, raw && raw.id); if (!g || g.deletedAt) { r.invalid += g ? 0 : 1; return; }
      var cur = rawGet(g.id);
      if (cur && (int(cur.rev, 0, 1e9, 0) >= g.rev)) { r.skipped++; return; }
      g.updatedBy = g.updatedBy || dev;
      if (write(PFX + g.id, g)) { if (cur) r.updated++; else r.added++; } else r.invalid++;
    });
    r.ok = true; return r;
  }
  // 只读：从“学习”里读科目和考试日（mochi-st），不重复建科目库
  function subjectsFromStudy() {
    var s = ls(), st = null; if (!s) return [];
    try { st = JSON.parse(s.getItem('mochi-st') || 'null'); } catch (e) { st = null; }
    if (!st || !Array.isArray(st.subs)) return [];
    return st.subs.slice(0, 30).map(function (n) { return { title: str(n, 80), deadline: st.ex && isoOk(st.ex[n]) ? st.ex[n] : '' }; }).filter(function (x) { return x.title; });
  }
  function enabled() { var s = ls(), p = null; if (!s) return true; try { p = JSON.parse(s.getItem(PREFS) || 'null'); } catch (e) { p = null; } return !(p && p.on === false); }
  function setEnabled(on) { return write(PREFS, { on: !!on }); }

  var core = { uuid: uuid, normGoal: normGoal, listGoals: listGoals, getGoal: getGoal, newGoal: newGoal, saveGoal: saveGoal, deleteGoal: deleteGoal, validate: validate,
    progress: progress, stepDone: stepDone, exportAll: exportAll, importData: importData, subjectsFromStudy: subjectsFromStudy, daysLeft: daysLeft, fmtMin: fmtMin, isoOk: isoOk, SCHEMA: SCHEMA };
  root.Goals = { core: core, enabled: enabled, setEnabled: setEnabled };
  if (typeof document === 'undefined') return;       // 单元测试（Node）到此为止

  // ================= 界面 =================
  var UI = { mask: null, view: 'list', filter: 'all', arch: false, draft: null, snap: '', base: 0, msg: '', err: '', back: null, prev: null };
  function t(k, v) {
    var L = (root.GOALS_I18N || {}), s = (L[root.LANG] || {})[k]; if (s == null) s = (L.en || {})[k]; if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(cls, txt, fn, label) { var b = h('button', cls, txt); b.type = 'button'; if (label) b.setAttribute('aria-label', label); b.onclick = fn; return b; }
  function inp(type, val, max) { var i = h('input'); i.type = type; i.value = val == null ? '' : val; if (max) i.maxLength = max; return i; }
  function field(label, ctl) { var l = h('label', 'gl-f'); l.appendChild(h('span', 'gl-fl', label)); l.appendChild(ctl); return l; }
  function chips(items, cur, fn) {
    var box = h('div', 'gl-chips'); items.forEach(function (it) { var b = btn('chip' + (it[0] === cur ? ' on' : ''), it[1], function () { fn(it[0]); }); b.setAttribute('aria-pressed', it[0] === cur ? 'true' : 'false'); box.appendChild(b); }); return box;
  }
  function spaceName(s) { return t('sp_' + s); }
  function defaultSpace() { try { var m = root.MochiNext && MochiNext.modes && MochiNext.modes()[0]; if (SPACES.indexOf(m) >= 0) return m; } catch (e) {} return 'study'; }

  function open() {
    if (UI.mask) return;
    UI.prev = document.activeElement; UI.view = 'list'; UI.msg = ''; UI.err = '';
    var m = h('div', 'mask full show gl-mask'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', t('title'));
    UI.mask = m; document.body.appendChild(m);
    UI.key = function (e) { if (e.key === 'Escape') { e.preventDefault(); goBack(); } };
    document.addEventListener('keydown', UI.key); render();
  }
  function close() {
    if (!UI.mask) return; document.removeEventListener('keydown', UI.key); UI.mask.remove(); UI.mask = null; UI.draft = null;
    try { if (UI.prev && UI.prev.focus) UI.prev.focus(); } catch (e) {}
  }
  function dirty() { return UI.view === 'edit' && UI.draft && JSON.stringify(UI.draft) !== UI.snap; }
  function goBack() {
    if (UI.view === 'list') { close(); return; }
    if (dirty() && !confirm(t('discard'))) return;
    UI.view = 'list'; UI.draft = null; UI.err = ''; UI.msg = ''; render();
  }
  function render() {
    var m = UI.mask; if (!m) return; m.textContent = '';
    var w = h('div', 'gl-wrap'); m.appendChild(w);
    if (UI.view === 'list') viewList(w); else if (UI.view === 'edit') viewEdit(w); else if (UI.view === 'new') viewNew(w); else viewBackup(w);
    var f = w.querySelector('input,button'); if (f && UI.view !== 'edit') try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function top(w, title, right) {
    var b = h('div', 'gl-top');
    b.appendChild(btn('ed-x gl-x', UI.view === 'list' ? '✕' : '‹', goBack, UI.view === 'list' ? t('close') : t('back')));
    b.appendChild(h('h2', null, title)); if (right) b.appendChild(right); w.appendChild(b);
  }
  function banner(w) { w.appendChild(h('div', 'gl-note gl-local', '📍 ' + t('localOnly'))); }

  // ----- 列表 -----
  function viewList(w) {
    top(w, t('title'));
    var hd = h('div', 'gl-hd'); hd.appendChild(h('div', 'gl-h1', t('headline'))); hd.appendChild(h('div', 'gl-sub', t('sub'))); w.appendChild(hd);
    banner(w); w.appendChild(h('div', 'gl-note', t('phaseNote')));
    var all = listGoals(), vis = all.filter(function (g) { return UI.arch || g.status !== 'archived'; });
    if (listGoals.corrupt) w.appendChild(h('div', 'gl-note gl-warn', t('corrupt', { n: listGoals.corrupt })));
    var cnt = { all: vis.length }; SPACES.forEach(function (s) { cnt[s] = vis.filter(function (g) { return g.space === s; }).length; });
    var items = [['all', t('spAll') + ' ' + cnt.all]].concat(SPACES.map(function (s) { return [s, spaceName(s) + ' ' + cnt[s]]; }));
    w.appendChild(chips(items, UI.filter, function (f) { UI.filter = f; render(); }));
    w.appendChild(btn('gl-primary', '＋ ' + t('newGoal'), function () { UI.view = 'new'; UI.err = ''; render(); }));
    if (UI.msg) { var ms = h('div', 'gl-note gl-ok', UI.msg); ms.setAttribute('role', 'status'); w.appendChild(ms); }
    var list = vis.filter(function (g) { return UI.filter === 'all' || g.space === UI.filter; });
    if (!list.length) w.appendChild(h('div', 'gl-empty', t(all.length ? 'emptyFilter' : 'empty')));
    list.forEach(function (g) { w.appendChild(card(g)); });
    var ft = h('div', 'gl-foot'), lab = h('label', 'gl-chk'), cb = h('input'); cb.type = 'checkbox'; cb.checked = UI.arch;
    cb.onchange = function () { UI.arch = cb.checked; render(); }; lab.appendChild(cb); lab.appendChild(h('span', null, t('showArchived'))); ft.appendChild(lab);
    ft.appendChild(btn('gl-link', t('backup'), function () { UI.view = 'backup'; UI.msg = ''; render(); })); w.appendChild(ft);
  }
  function card(g) {
    var c = btn('gl-card', null, function () { UI.draft = JSON.parse(JSON.stringify(g)); Object.defineProperty(UI.draft, '_future', { value: !!g._future, enumerable: false }); UI.snap = JSON.stringify(UI.draft); UI.base = g.rev; UI.isNew = false; UI.view = 'edit'; UI.err = ''; render(); });
    var r1 = h('div', 'gl-r1'); r1.appendChild(h('b', 'gl-ct', g.title)); r1.appendChild(h('span', 'gl-badge gl-' + g.space, spaceName(g.space))); c.appendChild(r1);
    var meta = [t('st_' + g.status), t('stepsN', { n: g.steps.length })], dl = daysLeft(g.deadline);
    if (g.deadline) meta.push(t('due', { d: g.deadline }) + (dl === null ? '' : dl < 0 ? ' · ' + t('overdue') : dl === 0 ? ' · ' + t('today') : ' · ' + t('daysLeft', { n: dl })));
    c.appendChild(h('div', 'gl-meta', meta.join(' · ')));
    var p = progress(g), pr = h('progress', 'gl-prog'); pr.max = 100; pr.value = p.pct; pr.setAttribute('aria-label', t('progressLbl', { p: p.pct })); c.appendChild(pr);
    c.appendChild(h('div', 'gl-meta', t('progressLbl', { p: p.pct }) + (p.total ? ' · ' + fmtMin(p.done) + ' / ' + fmtMin(p.total) : '') + (p.missing ? ' · ' + t('needEstN', { n: p.missing }) : '')));
    return c;
  }

  // ----- 新建（模板）-----
  function viewNew(w) {
    top(w, t('newGoal')); w.appendChild(h('div', 'gl-sub gl-pad', t('tplTitle')));
    var T = [['study', 'tplExam', 'tplExamTitle', 'tplExamStep'], ['work', 'tplProject', 'tplProjectTitle', 'tplProjectStep'], ['life', 'tplPersonal', 'tplPersonalTitle', 'tplPersonalStep']];
    T.forEach(function (x) { w.appendChild(btn('gl-card gl-tpl', null, function () { start({ space: x[0], title: t(x[2]), steps: [{ title: t(x[3]) }] }); }, null)); var c = w.lastChild; c.appendChild(h('b', 'gl-ct', t(x[1]))); c.appendChild(h('div', 'gl-meta', spaceName(x[0]))); });
    w.appendChild(btn('gl-card gl-tpl', null, function () { start({ space: defaultSpace() }); })); var b = w.lastChild; b.appendChild(h('b', 'gl-ct', t('tplBlank')));
  }
  function start(o) { UI.draft = newGoal(o); UI.snap = JSON.stringify(UI.draft); UI.base = 0; UI.isNew = true; UI.view = 'edit'; UI.err = ''; render(); }

  // ----- 编辑 -----
  function viewEdit(w) {
    var g = UI.draft, ro = !!g._future, stepsBox = h('div', 'gl-steps'), totalEl = h('div', 'gl-total'), errEl = h('div', 'gl-note gl-warn'); errEl.setAttribute('role', 'alert');
    function showErr(code, extra) { errEl.textContent = code ? t(code) : ''; errEl.style.display = code ? '' : 'none'; if (extra != null && extra >= 0) { var r = stepsBox.children[extra]; if (r) { r.scrollIntoView({ block: 'center' }); var i = r.querySelector('input'); if (i) i.focus(); } } }
    function totals() { var p = progress(g); totalEl.textContent = t('total', { t: fmtMin(p.total) }) + (p.missing ? ' · ' + t('needEstN', { n: p.missing }) : '') + ' · ' + t('progressLbl', { p: p.pct }); }
    function steps() {
      stepsBox.textContent = '';
      g.steps.forEach(function (s, i) {
        var r = h('div', 'gl-step'), ti = inp('text', s.title, 80); ti.placeholder = t('stepPh'); ti.setAttribute('aria-label', t('stepTitle')); ti.disabled = ro;
        ti.oninput = function () { s.title = ti.value; }; r.appendChild(ti);
        var g2 = h('div', 'gl-g2'), e1 = inp('number', s.estimateMin || '', 5), e2 = inp('number', s.estimateMaxMin == null ? '' : s.estimateMaxMin, 5), dd = inp('date', s.deadline);
        [e1, e2].forEach(function (e) { e.min = 0; e.max = MAXEST; e.step = 5; e.inputMode = 'numeric'; e.disabled = ro; }); dd.disabled = ro;
        var c1, c2, dl, warn = h('div', 'gl-meta gl-warn', t('assumed'));
        function sync() {      // 就地更新，不重绘，避免点到下一个输入框时焦点被抢走
          c2.disabled = ro || !s.estimateMin; c2.checked = stepDone(s); dl.textContent = s.estimateMin ? t('doneLbl') : t('needEst'); warn.style.display = s.assumed ? '' : 'none'; totals();
        }
        e1.oninput = function () { s.estimateMin = int(e1.value, 0, MAXEST, 0); if (s.estimateMaxMin != null && s.estimateMaxMin < s.estimateMin) { s.estimateMaxMin = s.estimateMin; e2.value = s.estimateMaxMin; } sync(); };
        e2.onchange = function () { s.estimateMaxMin = e2.value === '' ? null : Math.max(s.estimateMin, int(e2.value, 0, MAXEST, s.estimateMin)); e2.value = s.estimateMaxMin == null ? '' : s.estimateMaxMin; };
        dd.onchange = function () { s.deadline = isoOk(dd.value) ? dd.value : ''; };
        g2.appendChild(field(t('estMin'), e1)); g2.appendChild(field(t('estMax'), e2)); r.appendChild(g2); r.appendChild(field(t('stepDeadline'), dd));
        var row = h('div', 'gl-srow');
        var l1 = h('label', 'gl-chk'); c1 = h('input'); c1.type = 'checkbox'; c1.checked = !!s.assumed; c1.disabled = ro; c1.onchange = function () { s.assumed = c1.checked; sync(); }; l1.appendChild(c1); l1.appendChild(h('span', null, t('assumedLbl'))); row.appendChild(l1);
        var l2 = h('label', 'gl-chk'); c2 = h('input'); c2.type = 'checkbox'; dl = h('span'); c2.onchange = function () { s.doneMin = c2.checked ? s.estimateMin : 0; s.doneAt = c2.checked ? nowIso() : null; sync(); }; l2.appendChild(c2); l2.appendChild(dl); row.appendChild(l2); r.appendChild(row);
        r.appendChild(warn); sync();
        if (!ro) {
          var ops = h('div', 'gl-ops');
          if (i > 0) ops.appendChild(btn('gl-mini', '↑', function () { g.steps.splice(i - 1, 0, g.steps.splice(i, 1)[0]); steps(); }, t('moveUp')));
          if (i < g.steps.length - 1) ops.appendChild(btn('gl-mini', '↓', function () { g.steps.splice(i + 1, 0, g.steps.splice(i, 1)[0]); steps(); }, t('moveDown')));
          ops.appendChild(btn('gl-mini gl-del', '🗑', function () { g.steps.splice(i, 1); steps(); totals(); }, t('removeStep'))); r.appendChild(ops);
        }
        stepsBox.appendChild(r);
      });
      totals();
    }
    function save() {
      if (ro) return;
      var res = saveGoal(g, UI.base); if (!res.ok) { showErr(res.error, res.index); return; }
      UI.msg = t('saved'); UI.view = 'list'; UI.draft = null; render();
    }
    top(w, t(UI.isNew ? 'newGoal' : 'editGoal'), ro ? null : btn('gl-save', t('save'), save));
    banner(w); if (ro) w.appendChild(h('div', 'gl-note gl-warn', t('errFuture'))); w.appendChild(errEl); showErr('');
    var c = h('div', 'gl-sec');
    var ti = inp('text', g.title, 80); ti.placeholder = t('goalPh'); ti.disabled = ro; ti.oninput = function () { g.title = ti.value; }; c.appendChild(field(t('goalLbl'), ti));
    var spBox = h('div'), spLbl = h('span', 'gl-fl', t('spaceLbl'));
    function paintSp() {
      while (spBox.lastChild && spBox.lastChild !== spLbl) spBox.removeChild(spBox.lastChild);
      spBox.appendChild(chips(SPACES.map(function (s) { return [s, spaceName(s)]; }), g.space, function (s) { if (ro) return; g.space = s; paintSp(); addBtn(); }));
    }
    spBox.appendChild(spLbl); paintSp(); c.appendChild(spBox);
    var st = h('select'); STATUS.forEach(function (s) { var o = h('option', null, t('st_' + s)); o.value = s; if (s === g.status) o.selected = true; st.appendChild(o); }); st.disabled = ro; st.onchange = function () { g.status = st.value; };
    c.appendChild(field(t('statusLbl'), st));
    var d1 = inp('date', g.deadline), d2 = inp('date', g.targetFinish); d1.disabled = d2.disabled = ro;
    d1.onchange = function () { g.deadline = isoOk(d1.value) ? d1.value : ''; }; d2.onchange = function () { g.targetFinish = isoOk(d2.value) ? d2.value : ''; };
    var gg = h('div', 'gl-g2'); gg.appendChild(field(t('deadline'), d1)); gg.appendChild(field(t('targetFinish'), d2)); c.appendChild(gg); w.appendChild(c);

    var s2 = h('div', 'gl-sec'); s2.appendChild(h('h3', null, t('stepsH'))); s2.appendChild(stepsBox); s2.appendChild(totalEl);
    var addRow = h('div', 'gl-addrow');
    function addBtn() {
      addRow.textContent = ''; if (ro) return;
      addRow.appendChild(btn('gl-secondary', '＋ ' + t('addStep'), function () { if (g.steps.length >= MAXSTEPS) return; g.steps.push(normStep({ title: '' })); steps(); var l = stepsBox.lastChild; if (l) { var i = l.querySelector('input'); if (i) i.focus(); } }));
      if (g.space === 'study') addRow.appendChild(btn('gl-secondary', t('addSubjects'), function () {
        var L = subjectsFromStudy(), have = {}, n = 0; g.steps.forEach(function (s) { have[s.title.toLowerCase()] = 1; });
        L.forEach(function (x) { if (!have[x.title.toLowerCase()] && g.steps.length < MAXSTEPS) { g.steps.push(normStep({ title: x.title, deadline: x.deadline })); n++; } });
        steps(); showErr(''); errEl.textContent = L.length ? t('subjectsAdded', { n: n }) : t('noSubjects'); errEl.style.display = ''; errEl.className = 'gl-note';
      }));
    }
    addBtn(); s2.appendChild(addRow); w.appendChild(s2); steps();

    var s3 = h('div', 'gl-sec'); s3.appendChild(h('h3', null, t('limitsH')));
    var k = g.constraints, g3 = h('div', 'gl-g3');
    [['maxDailyMin', 'maxDaily', 30, 720], ['sessionMin', 'session', 15, 180], ['breakMin', 'breakMin', 0, 60]].forEach(function (x) {
      var i = inp('number', k[x[0]], 4); i.min = x[2]; i.max = x[3]; i.inputMode = 'numeric'; i.disabled = ro;
      i.onchange = function () { k[x[0]] = int(i.value, x[2], x[3], k[x[0]]); i.value = k[x[0]]; }; g3.appendChild(field(t(x[1]), i));
    }); s3.appendChild(g3); s3.appendChild(h('div', 'gl-meta', t('limitsNote'))); w.appendChild(s3);
    if (!UI.isNew) w.appendChild(btn('gl-danger', t('delete'), function () {
      if (!confirm(t('confirmDelete'))) return; var r = deleteGoal(g.id); if (!r.ok) { showErr(r.error); return; } UI.msg = t('deleted'); UI.view = 'list'; UI.draft = null; render();
    }));
  }

  // ----- 备份 -----
  function viewBackup(w) {
    top(w, t('backup')); banner(w);
    var a = h('div', 'gl-sec'); a.appendChild(h('h3', null, t('exportH'))); a.appendChild(h('div', 'gl-meta', t('exportHint')));
    var ta = h('textarea', 'gl-ta'); ta.readOnly = true; ta.value = exportAll(); ta.rows = 6; a.appendChild(ta);
    var cp = btn('gl-secondary', t('copy'), function () {
      ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      if (!ok && navigator.clipboard) { navigator.clipboard.writeText(ta.value).then(function () { cp.textContent = t('copied'); }); return; } cp.textContent = ok ? t('copied') : t('copyManual');
    }); a.appendChild(cp); w.appendChild(a);
    var b = h('div', 'gl-sec'); b.appendChild(h('h3', null, t('importH'))); b.appendChild(h('div', 'gl-meta', t('importHint')));
    var ti = h('textarea', 'gl-ta'); ti.rows = 5; ti.placeholder = '{ "app": "mochi-goals", … }'; b.appendChild(ti);
    var out = h('div', 'gl-note'); out.setAttribute('role', 'status'); out.style.display = 'none';
    b.appendChild(btn('gl-secondary', t('importBtn'), function () {
      var r = importData(ti.value); out.style.display = ''; out.className = 'gl-note' + (r.ok ? ' gl-ok' : ' gl-warn');
      out.textContent = r.ok ? t('importDone', { a: r.added, u: r.updated, s: r.skipped, i: r.invalid }) : t('importBad');
    })); b.appendChild(out); w.appendChild(b);
  }

  root.openGoals = open;
})(typeof window !== 'undefined' ? window : globalThis);
