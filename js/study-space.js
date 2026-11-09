// Study Space · 学习工作台（v9.7 Phase 3A 工作台 + 3B 科目详情）。见 docs/v9.7-study-space.md
// 原则：不建任何新的学习数据，也不碰云同步 / Undo / 课表。显示的内容全部来自现有数据（经 study-space-core.js 只读聚合）；
// 写入只走现有路径：章节评分 srsRate()+sv()、作业 openHw()/hwSave()、考试日 ST.ex+sv()、科目 ST.subs+sv()，写完调用 rSt()/rHw()/bnr() 让旧页面同步刷新。
// 唯一自己的存储是本机偏好 studyspace-prefs（目标显示开关，默认开；不是 mochi-* 键，不参与云同步）。文案全部在 js/lang-study-space.js（en / zh / ms）。
(function () {
  'use strict';
  var SEC = document.getElementById('v-ss'), C = window.StudySpaceCore;
  if (!SEC || !C) return;
  var PK = 'studyspace-prefs';
  var S = { view: 'dash', subject: '', tab: 'chapters', msg: '', adding: '', focusHead: false, focusInput: false };

  // ---------- 小工具 ----------
  function lang() { return window.LANG || 'en'; }
  function t(k, v) {
    var L = window.SS_I18N || {}, s = (L[lang()] || {})[k]; if (s == null) s = (L.en || {})[k]; if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function tp(base, n) { return t(base + (n === 1 ? '1' : 'N'), { n: n }); }
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls.split(' ').map(function (c) { return 'study-space-' + c; }).join(' ');
    if (txt != null) e.textContent = txt; return e;
  }
  function btn(cls, txt, fn, label) { var b = h('button', cls, txt); b.type = 'button'; if (label) b.setAttribute('aria-label', label); b.onclick = fn; return b; }
  function today() { return dayNum(new Date()); }
  function tm(m) { return typeof tmin === 'function' ? tmin(m) : Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function dlabel(iso) {
    var p = String(iso || '').split('-'); if (p.length < 3) return '';
    var d = new Date(+p[0], +p[1] - 1, +p[2]), loc = lang() === 'zh' ? 'zh-CN' : lang() === 'ms' ? 'ms-MY' : 'en-GB';
    try { return new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short' }).format(d); } catch (e) { return iso; }
  }
  function dueText(iso, td) {
    var d = C.dnOfIso(iso) - td; if (d === 0) return t('dueToday'); if (d === 1) return t('dueTomorrow'); if (d < 0) return tp('overdueBy', -d); return t('dueOn', { d: dlabel(iso) });
  }
  function prefs() { var p = null; try { p = JSON.parse(localStorage.getItem(PK) || 'null'); } catch (e) { p = null; } return { goals: !(p && p.goals === false) }; }
  function setGoalsPref(on) { try { localStorage.setItem(PK, JSON.stringify({ goals: !!on })); } catch (e) {} }
  function goalsOn() { return prefs().goals && !!(window.Goals && Goals.enabled && Goals.enabled() && Goals.core); }
  function visible() { return document.body.getAttribute('data-view') === 'ss'; }
  function ok(fn) { try { return fn(); } catch (e) { return undefined; } }

  // ---------- 读取快照（只读） ----------
  function snapshot() {
    var td = today(), now = new Date(), on = goalsOn(), goals = [], gset = {}, links = {}, events = [], colors = {};
    if (on) ok(function () {
      Goals.core.listGoals({ space: 'study' }).forEach(function (g) {
        var sm = window.GoalsPlan && GoalsPlan.enabled && GoalsPlan.enabled() ? ok(function () { return GoalsPlan.summary(g); }) : null;
        var line = window.GoalsPlan && GoalsPlan.enabled && GoalsPlan.enabled() ? ok(function () { return GoalsPlan.cardLine(g); }) : '';
        gset[g.id] = 1; goals.push(Object.assign({}, g, { summary: sm ? { n: sm.n, min: sm.min } : null, line: line || '' }));
      });
      if (window.GoalsPlan) GoalsPlan.validLinks().forEach(function (l) { if (gset[l.goalId]) links[l.w + '|' + l.day + '|' + l.s + '|' + l.e + '|' + l.t] = l.goalId; });
    });
    [thisW, thisW + 1].forEach(function (w) {
      var a = (w === curW ? data : WK[w]) || [];
      a.forEach(function (x) {
        var gid = links[w + '|' + x.day + '|' + x.s + '|' + x.e + '|' + x.t];
        if (x.a !== 1 && !gid) return;                         // 学习时段 = 一键排程生成的（a:1）或 Goals 排程关联的有效时段
        events.push({ w: w, dn: dnOf(w, x.day), s: x.s, e: x.e, t: x.t, done: !!DN[kk(x, w)], src: gid ? 'goal' : 'auto', goalId: gid || '', inWeek: w === thisW });
      });
    });
    var names = ok(function () { return subjList(); }) || [];
    ok(function () { (window.SUBJ ? SUBJ.lib() : []).forEach(function (s) { colors[s.n] = s.c; }); });
    names.concat(ST.subs || []).forEach(function (n) { if (!colors[n] && typeof subjCol === 'function') colors[n] = subjCol(n); });
    return { today: td, nowMin: now.getHours() * 60 + now.getMinutes(), subs: names, stSubs: ST.subs, topics: ST.topics, ex: ST.ex, hw: HW, events: events, goals: goals, goalsOn: on, colors: colors, limit: 6 };
  }

  // ---------- 写入：只走现有路径 ----------
  function after() { if (typeof rSt === 'function') rSt(); else refresh(); }          // rSt / rHw 被下面的包装函数接管，会顺便刷新工作台
  function ensureSubject(n) { if (ST.subs.indexOf(n) < 0) ST.subs.push(n); }           // 和学习页“+科目”一样：新科目进 ST.subs（只在用户主动添加章节 / 设考试日时发生）
  function rate(idx, g) {
    var tp0 = ST.topics[idx]; if (!tp0) return;
    srsRate(tp0, g, dleft(tp0.s), today()); sv();
    S.msg = g === 0 ? t('rateAgain') : t('rateNext', { d: dlabel(C.isoOfDn(tp0.nx)) }); after();
  }
  function addChapter(subject, name) {
    name = String(name || '').trim().slice(0, 20); if (!name) return false;
    ensureSubject(subject); ST.topics.push({ s: subject, n: name, iv: 0, nx: today() }); sv(); S.msg = t('chapterAdded'); after(); return true;
  }
  function addSubject(name) {
    name = String(name || '').trim().slice(0, 30); if (!name) return false;
    if (ST.subs.indexOf(name) >= 0) { S.msg = t('subjectExists'); render(); return false; }
    ST.subs.push(name); sv(); S.adding = ''; S.msg = t('subjectAdded'); after(); return true;
  }
  function setExam(subject, v) {
    if (v && !C.isoOk(v)) { S.msg = t('badDate'); render(); return; }
    ensureSubject(subject); ST.ex = ST.ex || {}; if (v) ST.ex[subject] = v; else delete ST.ex[subject];
    sv(); S.msg = v ? t('examSaved') : t('examCleared'); after();
  }
  function toggleHw(idx, on) { var x = HW[idx]; if (!x) return; x.done = on ? Date.now() : 0; hwSave(); if (typeof rHw === 'function') rHw(); if (typeof bnr === 'function') bnr(); }
  function editHw(idx) { if (HW[idx] && typeof openHw === 'function') openHw(HW[idx]); }
  function newHw(subject) { if (typeof openHw !== 'function') return; openHw(null); if (subject && typeof hwsb !== 'undefined' && hwsb) hwsb.value = subject; }

  // ---------- 导航 ----------
  function go(view, subject, tab) { S.view = view; S.subject = subject || ''; S.tab = tab || 'chapters'; S.msg = ''; S.adding = ''; S.focusHead = true; render(); window.scrollTo(0, 0); }
  function toTimetable() { if (typeof showView === 'function') showView('tt'); }
  function toView(v) { if (typeof showView === 'function') showView(v); }
  function toGoals() { if (window.openGoals) openGoals(); }

  // ---------- 小组件 ----------
  function tile(emoji, color) { var e = h('span', 'tile' + (color ? ' c-' + color : '')); e.textContent = emoji; e.setAttribute('aria-hidden', 'true'); return e; }
  function bar(pct, label) {
    var b = h('div', 'bar'), i = h('i'); i.style.width = Math.max(0, Math.min(100, pct || 0)) + '%'; b.appendChild(i);
    b.setAttribute('role', 'progressbar'); b.setAttribute('aria-valuemin', '0'); b.setAttribute('aria-valuemax', '100'); b.setAttribute('aria-valuenow', String(pct || 0)); if (label) b.setAttribute('aria-label', label); return b;
  }
  function pill(txt, kind) { return h('span', 'pill' + (kind ? ' ' + kind : ''), txt); }
  function heading(tag, txt) { var e = h(tag, 'h', txt); e.tabIndex = -1; return e; }
  function inlineForm(ph, okTxt, max, onOk, onCancel) {
    var r = h('div', 'form'), i = h('input', 'input'); i.type = 'text'; i.placeholder = ph; i.maxLength = max; i.setAttribute('aria-label', ph);
    function submit() { if (!onOk(i.value)) i.focus(); }
    i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel(); } };
    r.appendChild(i); r.appendChild(btn('btn', okTxt, submit)); if (onCancel) r.appendChild(btn('btn ghost', t('cancel'), onCancel)); return r;
  }
  function rateButtons(idx) {
    var w = h('span', 'rate'); w.setAttribute('role', 'group'); w.setAttribute('aria-label', t('rateGroup'));
    [['😵', 0, 'rateForgot'], ['🤔', 1, 'rateFuzzy'], ['😎', 2, 'rateGood']].forEach(function (p) { var b = btn('rate-b', p[0], function () { rate(idx, p[1]); }, t(p[2])); b.title = t(p[2]); w.appendChild(b); });
    return w;
  }
  function note(box) { if (S.msg) { var n = h('div', 'msg', S.msg); n.setAttribute('role', 'status'); box.appendChild(n); } }

  // ---------- 工作台 ----------
  function greet() { var hr = new Date().getHours(); return t(hr < 5 ? 'greetNight' : hr < 12 ? 'greetMorning' : hr < 18 ? 'greetAfternoon' : hr < 22 ? 'greetEvening' : 'greetNight'); }
  function hero(box, m) {
    var c = h('section', 'hero'), tx = h('div', 'hero-t'), img = h('img', 'buddy');
    var busy = m.stats.reviewsDue + m.stats.homeworkDue + m.stats.sessionsToday;
    tx.appendChild(h('div', 'eyebrow', t('eyebrow'))); tx.appendChild(heading('h2', greet()));
    tx.appendChild(h('p', 'sub', m.empty.all ? t('heroEmpty') : busy ? tp('heroBusy', busy) : t('heroCalm')));
    img.src = m.empty.all ? 'assets/buddy/idle.svg' : 'assets/buddy/happy.svg'; img.alt = ''; img.width = 120; img.height = 120; img.decoding = 'async';
    c.appendChild(tx); c.appendChild(img); box.appendChild(c);
  }
  function emptyState(box) {
    var c = h('section', 'card empty'); c.appendChild(h('h3', 'h3', t('emptyTitle'))); c.appendChild(h('p', 'sub', t('emptyBody')));
    var a = h('div', 'actions'); a.appendChild(btn('btn', t('addSubject'), function () { S.adding = 'subject'; S.focusInput = true; render(); }));
    a.appendChild(btn('btn ghost', t('newHomework'), function () { newHw(''); })); a.appendChild(btn('btn ghost', t('planWeek'), function () { toView('st'); }));
    c.appendChild(a); if (S.adding === 'subject') c.appendChild(inlineForm(t('subjectPh'), t('add'), 30, addSubject, function () { S.adding = ''; render(); })); box.appendChild(c);
  }
  function stats(box, m) {
    var w = h('div', 'stats'), st = m.stats;
    function card(n, lbl, sub, color, fn, emoji) {
      var b = h('button', 'stat'); b.type = 'button'; b.onclick = fn; b.appendChild(tile(emoji, color));
      var d = h('div', 'stat-t'); d.appendChild(h('b', 'num', String(n))); d.appendChild(h('span', 'lbl', lbl)); if (sub) d.appendChild(h('small', 'subl', sub)); b.appendChild(d);
      b.setAttribute('aria-label', n + ' ' + lbl + (sub ? ', ' + sub : '')); w.appendChild(b);
    }
    card(st.reviewsDue, t('statReviews'), '', 'pink', function () { go('reviews'); }, '🔁');
    card(st.homeworkDue, t('statHomework'), st.homeworkOverdue ? tp('nOverdue', st.homeworkOverdue) : '', 'sky', function () { toView('hw'); }, '📝');
    card(st.sessionsToday, t('statSessions'), t('today'), 'mint', toTimetable, '🗓');
    box.appendChild(w);
  }
  function upRow(it, m) {
    var td = m.today, r = h('button', 'row'), body = h('div', 'row-t'), badge, meta, em, col;
    var ttl = it.subject ? it.subject + ' · ' + it.title : it.title;
    if (it.kind === 'hw') { em = '📝'; col = 'sky'; meta = t('kindHomework') + ' · ' + dueText(it.due, td); badge = it.rank === 0 ? pill(tp('overdueBy', td - C.dnOfIso(it.due)), 'bad') : it.rank === 1 ? pill(t('dueToday'), 'warn') : pill(dueText(it.due, td)); r.onclick = function () { editHw(it.ref); }; }
    else if (it.kind === 'review') { em = '🔁'; col = 'pink'; meta = t('kindReview') + ' · ' + (it.late > 0 ? tp('lateBy', it.late) : t('dueToday')); badge = pill(t('review')); r.onclick = function () { go('reviews'); }; }
    else { em = '🗓'; col = 'mint'; var d0 = it.dn - td; meta = t('kindSession') + ' · ' + (d0 === 0 ? t('today') : d0 === 1 ? t('tomorrow') : dlabel(C.isoOfDn(it.dn))); badge = pill(tm(it.s)); r.onclick = toTimetable; }
    body.appendChild(h('b', 'row-n', ttl)); body.appendChild(h('small', 'row-m', meta)); r.appendChild(tile(em, col)); r.appendChild(body); r.appendChild(badge); return r;
  }
  function comingUp(box, m) {
    var c = h('section', 'card'), head = h('div', 'head'), tt = h('div'); tt.appendChild(h('h3', 'h3', t('comingUp'))); tt.appendChild(h('p', 'sub', t('comingUpSub')));
    head.appendChild(tt); head.appendChild(btn('link', t('viewHomework'), function () { toView('hw'); })); c.appendChild(head);
    if (!m.upcoming.items.length) { c.appendChild(h('p', 'sub pad', t('comingEmpty'))); var a = h('div', 'actions'); a.appendChild(btn('btn ghost', t('newHomework'), function () { newHw(''); })); a.appendChild(btn('btn ghost', t('planWeek'), function () { toView('st'); })); c.appendChild(a); }
    else { var l = h('div', 'list'); m.upcoming.items.forEach(function (it) { l.appendChild(upRow(it, m)); }); c.appendChild(l); if (m.upcoming.total > m.upcoming.items.length) c.appendChild(h('p', 'sub pad', t('andMore', { n: m.upcoming.total - m.upcoming.items.length }))); }
    return c;
  }
  function sideCards(m) {
    var w = h('div', 'side'), c = h('section', 'card tint');
    c.appendChild(h('h3', 'h3', t('weekTitle')));
    if (m.week.planned) {
      c.appendChild(h('p', 'sub', t('weekText', { d: m.week.done, n: m.week.planned }))); c.appendChild(bar(m.week.pct, t('weekTitle')));
      var r = h('div', 'between'); r.appendChild(h('small', null, m.week.done + ' / ' + m.week.planned)); r.appendChild(h('small', null, m.week.pct + '%')); c.appendChild(r);
    } else c.appendChild(h('p', 'sub', t('weekNone')));
    c.appendChild(btn('link', t('planWeek'), function () { toView('st'); }));
    if (m.goalsOn) { var gl = m.goals.filter(function (g) { return g.status === 'active'; }).length; c.appendChild(btn('link', gl ? tp('goalsActive', gl) : t('openGoals'), toGoals)); }
    w.appendChild(c);
    if (m.exam) {
      var e = h('button', 'exam'); e.type = 'button'; var d = h('div', 'days'); d.appendChild(h('b', null, String(m.exam.days))); d.appendChild(h('span', null, m.exam.days === 1 ? t('day') : t('days')));
      var tx = h('div'); tx.appendChild(h('b', 'row-n', t('examComing', { s: m.exam.subject }))); tx.appendChild(h('small', 'row-m', dlabel(m.exam.iso)));
      e.appendChild(d); e.appendChild(tx); e.onclick = function () { go('subject', m.exam.subject, 'exam'); }; w.appendChild(e);
    }
    return w;
  }
  function subjectCard(s) {
    var b = h('button', 'subj'); b.type = 'button'; b.onclick = function () { go('subject', s.name, 'chapters'); };
    var top = h('div', 'subj-top'); top.appendChild(tile((Array.from(s.name)[0] || '?').toUpperCase(), s.color || 'peach'));
    if (s.exam) top.appendChild(pill(tp('examIn', s.exam.days), s.exam.days <= 7 ? 'warn' : '')); b.appendChild(top);
    b.appendChild(h('b', 'subj-n', s.name));
    var bits = [tp('chapters', s.chapters.total)]; if (s.chapters.due) bits.push(tp('reviewsDue', s.chapters.due)); if (s.hw.open) bits.push(tp('hwOpen', s.hw.open));
    b.appendChild(h('small', 'row-m', bits.join(' · ')));
    if (s.chapters.total) { b.appendChild(bar(s.chapters.pct, t('startedBar'))); var r = h('div', 'between'); r.appendChild(h('small', null, t('startedOf', { a: s.chapters.started, b: s.chapters.total }))); b.appendChild(r); }
    return b;
  }
  function subjectsSection(box, m) {
    var c = h('section', 'sect'), head = h('div', 'head'), tt = h('div'); tt.appendChild(h('h3', 'h3', t('subjectsTitle'))); tt.appendChild(h('p', 'sub', t('subjectsSub'))); head.appendChild(tt);
    head.appendChild(btn('link', '+ ' + t('addSubject'), function () { S.adding = S.adding === 'subject' ? '' : 'subject'; S.focusInput = true; render(); })); c.appendChild(head);
    if (S.adding === 'subject') c.appendChild(inlineForm(t('subjectPh'), t('add'), 30, addSubject, function () { S.adding = ''; render(); }));
    var g = h('div', 'grid'); m.subjects.forEach(function (s) { g.appendChild(subjectCard(s)); }); c.appendChild(g); box.appendChild(c);
  }
  function dash(box, m) {
    hero(box, m); note(box);
    if (m.empty.all) { emptyState(box); return; }
    stats(box, m);
    var cols = h('div', 'cols'); cols.appendChild(comingUp(box, m)); cols.appendChild(sideCards(m)); box.appendChild(cols); subjectsSection(box, m);
  }

  // ---------- 复习队列（只是总览；评分仍走 srsRate） ----------
  function reviews(box, m) {
    box.appendChild(btn('back', '‹ ' + t('backDash'), function () { go('dash'); }));
    var c = h('section', 'card'); c.appendChild(heading('h2', t('reviewsTitle'))); c.appendChild(h('p', 'sub', t('reviewsSub'))); note(c);
    if (!m.reviews.length) { c.appendChild(h('p', 'sub pad', t('reviewsNone'))); }
    else { var l = h('div', 'list'); m.reviews.forEach(function (r) {
      var row = h('div', 'row static'), body = h('div', 'row-t'); body.appendChild(h('b', 'row-n', r.subject + ' · ' + r.name)); body.appendChild(h('small', 'row-m', r.late > 0 ? tp('lateBy', r.late) : t('dueToday')));
      row.appendChild(tile('🔁', 'pink')); row.appendChild(body); row.appendChild(rateButtons(r.idx)); l.appendChild(row); }); c.appendChild(l); }
    c.appendChild(btn('link', t('openReviewPlan'), function () { toView('st'); })); box.appendChild(c);
  }

  // ---------- 科目详情 ----------
  function chaptersTab(box, s) {
    var cols = h('div', 'cols'), c = h('section', 'card'), head = h('div', 'head');
    head.appendChild(h('h3', 'h3', t('tabChapters'))); head.appendChild(btn('link', '+ ' + t('addChapter'), function () { S.adding = S.adding === 'chapter' ? '' : 'chapter'; S.focusInput = true; render(); })); c.appendChild(head);
    if (S.adding === 'chapter') c.appendChild(inlineForm(t('chapterPh'), t('add'), 20, function (v) { return addChapter(s.name, v); }, function () { S.adding = ''; render(); }));
    if (!s.chapters.list.length) c.appendChild(h('p', 'sub pad', t('chaptersNone')));
    else { var l = h('div', 'list'); s.chapters.list.forEach(function (ch) {
      var row = h('div', 'row static'), body = h('div', 'row-t'), st;
      if (ch.due) st = ch.late > 0 ? tp('lateBy', ch.late) : t('dueToday'); else if (ch.fresh) st = t('notStarted'); else st = ch.nx === null ? t('scheduled') : t('nextReview', { d: dlabel(C.isoOfDn(ch.nx)) });
      body.appendChild(h('b', 'row-n', ch.name)); body.appendChild(h('small', 'row-m' + (ch.due ? ' bad' : ''), st));
      row.appendChild(tile(ch.due ? '🔔' : ch.fresh ? '🆕' : '✅', ch.due ? 'pink' : ch.fresh ? 'lemon' : 'mint')); row.appendChild(body); if (ch.due || ch.fresh) row.appendChild(rateButtons(ch.idx)); l.appendChild(row); }); c.appendChild(l); }
    cols.appendChild(c);
    var side = h('section', 'card tint'); side.appendChild(h('h3', 'h3', t('progressTitle')));
    if (s.chapters.total) { side.appendChild(h('p', 'sub', t('progressText', { a: s.chapters.started, b: s.chapters.total }))); side.appendChild(bar(s.chapters.pct, t('startedBar'))); if (s.chapters.due) side.appendChild(h('p', 'sub', tp('reviewsDue', s.chapters.due))); }
    else side.appendChild(h('p', 'sub', t('progressNone')));
    side.appendChild(btn('link', t('openReviewPlan'), function () { toView('st'); })); cols.appendChild(side); box.appendChild(cols);
  }
  function homeworkTab(box, s, m) {
    var c = h('section', 'card'), head = h('div', 'head'); head.appendChild(h('h3', 'h3', t('tabHomework'))); head.appendChild(btn('link', '+ ' + t('newHomework'), function () { newHw(s.name); })); c.appendChild(head);
    if (!s.hw.list.length) c.appendChild(h('p', 'sub pad', t('hwNone')));
    else { var l = h('div', 'list'); s.hw.list.forEach(function (x) {
      var row = h('div', 'row static'), cb = h('input', 'check'); cb.type = 'checkbox'; cb.checked = x.done; cb.setAttribute('aria-label', t('markDone', { t: x.title })); cb.onchange = function () { toggleHw(x.idx, cb.checked); };
      var body = h('button', 'row-t linkish'); body.type = 'button'; body.onclick = function () { editHw(x.idx); };
      body.appendChild(h('b', 'row-n' + (x.done ? ' done' : ''), x.title)); body.appendChild(h('small', 'row-m' + (x.overdue ? ' bad' : ''), x.done ? t('completed') : x.due ? dueText(x.due, m.today) : t('noDue')));
      row.appendChild(cb); row.appendChild(body); l.appendChild(row); }); c.appendChild(l); }
    box.appendChild(c);
  }
  var GSTAT = { active: 'gActive', draft: 'gDraft', paused: 'gPaused', done: 'gDone' };
  function examGoalsTab(box, s, m) {
    var cols = h('div', 'cols'), c = h('section', 'card'); c.appendChild(h('h3', 'h3', t('examTitle')));
    var lab = h('label', 'field'), inp = h('input', 'input'); lab.appendChild(h('span', null, t('examDate'))); inp.type = 'date'; inp.value = s.exam ? s.exam.iso : s.examPast || ''; lab.appendChild(inp); c.appendChild(lab);
    inp.onchange = function () { setExam(s.name, inp.value); };
    c.appendChild(h('p', 'sub', s.exam ? tp('examIn', s.exam.days) : s.examPast ? t('examPast') : t('examNone')));
    if (s.exam || s.examPast) c.appendChild(btn('btn ghost', t('examClear'), function () { setExam(s.name, ''); }));
    if (!s.inPlan) c.appendChild(h('p', 'sub', t('examAddsSubject')));
    cols.appendChild(c);
    if (m.goalsOn) {
      var g = h('section', 'card tint'); g.appendChild(h('h3', 'h3', t('goalsTitle'))); g.appendChild(h('p', 'sub', t('goalsHint')));
      if (!s.goals.length) g.appendChild(h('p', 'sub', t('goalsNone')));
      s.goals.forEach(function (x) {
        var r = h('button', 'row goal'); r.type = 'button'; r.onclick = toGoals; var b = h('div', 'row-t'); b.appendChild(h('b', 'row-n', x.title));
        var bits = [t(GSTAT[x.status] || 'gDraft')]; if (x.pct !== null) bits.push(x.pct + '%'); if (x.daysLeft !== null && x.daysLeft >= 0) bits.push(tp('daysLeft', x.daysLeft)); b.appendChild(h('small', 'row-m', bits.join(' · ')));
        if (x.line) b.appendChild(h('small', 'row-m', x.line)); if (x.pct !== null) b.appendChild(bar(x.pct, x.title)); r.appendChild(b); r.appendChild(h('span', 'chev', '›')); g.appendChild(r); });
      g.appendChild(btn('link', t('openGoals'), toGoals)); cols.appendChild(g);
    }
    box.appendChild(cols);
  }
  function subject(box, m) {
    var s = m.subjects.filter(function (x) { return x.name === S.subject; })[0];
    if (!s) { S.view = 'dash'; dash(box, m); return; }
    box.appendChild(btn('back', '‹ ' + t('backDash'), function () { go('dash'); }));
    var hd = h('section', 'hero sub-hero'), tx = h('div', 'hero-t'); hd.appendChild(tile((Array.from(s.name)[0] || '?').toUpperCase(), s.color || 'peach'));
    tx.appendChild(h('div', 'eyebrow', t('yourSubject'))); tx.appendChild(heading('h2', s.name));
    var bits = []; if (s.exam) bits.push(tp('examIn', s.exam.days)); bits.push(tp('chapters', s.chapters.total)); if (s.hw.open) bits.push(tp('hwOpen', s.hw.open)); tx.appendChild(h('p', 'sub', bits.join(' · '))); hd.appendChild(tx); box.appendChild(hd);
    var tabs = h('div', 'tabs'); tabs.setAttribute('role', 'tablist');
    [['chapters', t('tabChapters')], ['homework', t('tabHomework')], ['exam', m.goalsOn ? t('tabExamGoals') : t('tabExam')]].forEach(function (p) {
      var b = h('button', 'tab' + (S.tab === p[0] ? ' on' : ''), p[1]); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(S.tab === p[0]));
      b.onclick = function () { S.tab = p[0]; S.msg = ''; S.adding = ''; render(); }; tabs.appendChild(b); });
    box.appendChild(tabs); note(box);
    if (S.tab === 'homework') homeworkTab(box, s, m); else if (S.tab === 'exam') examGoalsTab(box, s, m); else chaptersTab(box, s);
  }

  // ---------- 渲染 ----------
  function render() {
    var root = SEC.querySelector('.study-space-root');
    if (!root) { root = h('div', 'root'); SEC.appendChild(root); }
    var m = C.build(snapshot()), y = window.pageYOffset;
    root.textContent = '';
    if (S.view === 'reviews') reviews(root, m); else if (S.view === 'subject') subject(root, m); else dash(root, m);
    if (S.focusInput) { S.focusInput = false; var i = root.querySelector('input.study-space-input'); if (i) i.focus({ preventScroll: true }); }
    else if (S.focusHead) { var hh = root.querySelector('.study-space-h'); if (hh) hh.focus({ preventScroll: true }); }
    S.focusHead = false;
    if (!S.scrollTop && y) window.scrollTo(0, y);
  }
  function refresh() { if (visible()) render(); }

  // ---------- 接入现有页面：只“包装”，不改原函数 ----------
  ['rHw', 'rSt'].forEach(function (n) {
    var o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () { var r = o.apply(this, arguments); ok(refresh); return r; };
  });
  var _sv = window.showView;
  if (typeof _sv === 'function') window.showView = function (v) { var r = _sv.apply(this, arguments); if (v === 'ss') { S.view = 'dash'; S.subject = ''; S.msg = ''; S.adding = ''; S.focusHead = true; render(); } return r; };

  // 设置页：目标显示开关（只在设置里，默认开）
  var sw = document.getElementById('ssgoals');
  if (sw) { sw.checked = prefs().goals; sw.onchange = function () { setGoalsPref(sw.checked); refresh(); }; }

  window.StudySpace = { refresh: refresh, go: go, _state: function () { return JSON.parse(JSON.stringify(S)); } };
})();
