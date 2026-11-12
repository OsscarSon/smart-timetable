// Work Space · Life Space（v9.8.8）。见 docs/v9.8.8-work-life-spaces.md
// 原则：不建任何新的日程 / 习惯 / 项目数据，也不碰云同步、Undo、课表数据结构。页面里的每个数字和每一行都来自现有数据：
//   课表（手动 + 重复活动，经 spaces-core.js 只读聚合）、Goals（space = work）、健康页的护肤打卡与饮水、Mochi Energy。
// 写入只走现有路径：打卡 btSave()+rBt()、饮水 diSave()+rDi()、新增活动 addOnDay()（现有编辑器）、精力 MochiNext.openEnergy()。
// 这个文件没有任何本机存储读写，也没有数据键字面量；文案全部在 js/lang-spaces.js（en / zh / ms）。
(function () {
  'use strict';
  var WK_SEC = document.getElementById('v-wk'), LF_SEC = document.getElementById('v-lf'), C = window.SpacesCore;
  if (!WK_SEC || !LF_SEC || !C) return;
  var S = { focusHead: false };

  // ---------- 小工具 ----------
  function lang() { return window.LANG || 'en'; }
  function loc() { return lang() === 'zh' ? 'zh-CN' : lang() === 'ms' ? 'ms-MY' : 'en-GB'; }
  function t(k, v) {
    var L = window.SPACES_I18N || {}, s = (L[lang()] || {})[k]; if (s == null) s = (L.en || {})[k]; if (s == null) s = k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function h(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls.split(' ').map(function (c) { return 'spc-' + c; }).join(' ');
    if (txt != null) e.textContent = txt; return e;
  }
  function btn(cls, txt, fn, label) { var b = h('button', cls, txt); b.type = 'button'; if (label) b.setAttribute('aria-label', label); b.onclick = fn; return b; }
  function ok(fn) { try { return fn(); } catch (e) { return undefined; } }
  function tm(m) { return typeof tmin === 'function' ? tmin(m) : Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  function fmtDur(min) {
    min = Math.round(min);
    if (min < 60) return t('minsN', { n: min });
    return t('hoursN', { n: (Math.round(min / 6) / 10).toLocaleString(loc()) });
  }
  function view() { return document.body.getAttribute('data-view'); }
  function visible() { var v = view(); return v === 'wk' || v === 'lf'; }
  function modes() { var m = ok(function () { return MochiNext.modes(); }); return Array.isArray(m) && m.length ? m : ['study']; }

  // ---------- 只读快照（全部来自现有数据）----------
  function snapshot() {
    var now = new Date(), s = { todayDn: dayNum(now), nowMin: now.getHours() * 60 + now.getMinutes(), items: [], goals: [], goalsOn: false, weekFrom: 0, weekTo: 0 };
    var gspace = {}, links = {};
    s.goalsOn = !!ok(function () { return window.Goals && Goals.enabled && Goals.enabled() && Goals.core; });
    if (s.goalsOn) ok(function () {
      var all = Goals.core.listGoals();
      all.forEach(function (g) { gspace[g.id] = g.space; });
      all.forEach(function (g) {
        if (g.space !== 'work' || g.status !== 'active') return;
        var p = Goals.core.progress(g);
        s.goals.push({ id: g.id, title: g.title, space: g.space, status: g.status, pct: p.pct, hasEst: p.total > 0, daysLeft: g.deadline ? Goals.core.daysLeft(g.deadline) : null });
      });
      if (window.GoalsPlan && GoalsPlan.validLinks) GoalsPlan.validLinks().forEach(function (l) { links[l.w + '|' + l.day + '|' + l.s + '|' + l.e + '|' + l.t] = l.goalId; });
    });
    ok(function () { s.weekFrom = wsDn(thisW); s.weekTo = s.weekFrom + 6; });
    ok(function () {
      [thisW, thisW + 1].forEach(function (w) {
        ((w === curW ? data : WK[w]) || []).forEach(function (x) {
          var gid = links[w + '|' + x.day + '|' + x.s + '|' + x.e + '|' + x.t] || '';
          if (x.a === 1) return;                                   // 自动排的学习时段：属于学习空间
          if (gid && gspace[gid] === 'study') return;               // 属于“学习”目标的时段：同上
          s.items.push({ dn: dnOf(w, x.day), s: x.s, e: x.e, t: x.t, src: 'm', done: !!DN[kk(x, w)], goalId: gid, goalSpace: gid ? gspace[gid] : '' });
        });
        rpBlocks(w).forEach(function (x) { s.items.push({ dn: x.dn, s: x.s, e: x.e, t: x.t, src: 'r', done: !!DN[kk(x, w)] }); });
      });
    });
    ok(function () {
      if (typeof BT === 'undefined' || typeof hDay !== 'function') return;
      var k = hDay(0), l = BT.log[k] || {};
      s.bt = { am: BT.am.slice(), pm: BT.pm.slice(), doneAm: (l.am || []).slice(), donePm: (l.pm || []).slice() };
    });
    ok(function () {
      if (typeof DI === 'undefined' || typeof hDay !== 'function') return;
      var d = DI.days[hDay(0)]; s.water = { w: d ? d.w : 0, goal: DI.water };
    });
    s.energy = ok(function () { return MochiNext.energyToday(); }) || '';
    return s;
  }

  // ---------- 写入：只走现有路径 ----------
  function toggleStep(p, i, on) {
    ok(function () {
      var k = hDay(0), l = BT.log[k] = BT.log[k] || {}, d = l[p] = l[p] || [], j = d.indexOf(i);
      if (on && j < 0) d.push(i); if (!on && j >= 0) d.splice(j, 1);
      btSave(); rBt();
    });
  }
  function cup(delta) { ok(function () { var d = dayDi(hDay(0)); d.w = Math.max(0, Math.min(30, d.w + delta)); diSave(); rDi(); }); }
  function addPlan() { if (typeof addOnDay === 'function') addOnDay(); }
  function toTimetable() { if (typeof showView === 'function') showView('tt'); }
  function openEnergy() { ok(function () { MochiNext.openEnergy(); }); }

  // ---------- 积木 ----------
  var HERO = {
    work: { img: 'assets/work-mode.webp', eyebrow: 'wEyebrow', title: 'wTitle', sub: 'wSub' },
    life: { img: 'assets/life-mode.webp', eyebrow: 'lEyebrow', title: 'lTitle', sub: 'lSub' }
  };
  function hero(box, kind) {
    var d = HERO[kind], e = h('section', 'hero'), tx = h('div', 'hero-t'), hd = h('h1', 'h', t(d.title));
    hd.tabIndex = -1; tx.appendChild(h('div', 'eyebrow', t(d.eyebrow))); tx.appendChild(hd); tx.appendChild(h('p', 'sub', t(d.sub)));
    var im = h('img', 'hero-img'); im.src = d.img; im.alt = ''; im.width = 120; im.height = 120; im.decoding = 'async'; im.setAttribute('aria-hidden', 'true');
    e.appendChild(tx); e.appendChild(im); box.appendChild(e);
  }
  function stat(tag, num, lbl, sub, fn, fk) {
    var e = h(fn ? 'button' : 'div', 'stat'); if (fn) { e.type = 'button'; e.onclick = fn; if (fk) e.setAttribute('data-fk', fk); }
    e.appendChild(h('span', 'tag', tag)); e.appendChild(h('b', 'num', num)); e.appendChild(h('span', 'lbl', lbl));
    if (sub) e.appendChild(h('small', 'sub2', sub)); return e;
  }
  function heading(txt, sub) { var d = h('div', 'head'); d.appendChild(h('h2', 'h2', txt)); if (sub) d.appendChild(h('p', 'sub', sub)); return d; }
  function row(emoji, title, meta, pills) {
    var r = h('div', 'row'), tl = h('span', 'tile', emoji), b = h('div', 'row-t');
    b.appendChild(h('b', 'row-n', title)); if (meta) b.appendChild(h('small', 'row-m', meta));
    r.appendChild(tl); r.appendChild(b); (pills || []).forEach(function (p) { r.appendChild(h('span', 'pill' + (p.on ? ' on' : ''), p.txt)); });
    return r;
  }
  function empty(txt, cta, fn) {
    var e = h('div', 'empty'); e.appendChild(h('p', 'sub', txt)); if (cta) e.appendChild(btn('btn', cta, fn)); return e;
  }
  function dueText(d) { return d === 0 ? t('dueToday') : d > 0 ? t('dueIn', { n: d }) : t('overdue', { n: -d }); }
  function levelName(l) { return t(l); }

  // ---------- Work ----------
  function renderWork(box, m) {
    var w = m.work;
    hero(box, 'work');
    var st = h('div', 'stats');
    st.appendChild(stat(t('tagToday'), String(w.count), t('wStatToday'), w.count ? t('doneN', { n: w.done }) : ''));
    st.appendChild(stat(t('tagNext'), w.next ? tm(w.next.s) : t('dash'), t('wStatNext'), w.next ? w.next.t : t('nextNone')));
    st.appendChild(stat(t('tagWeek'), fmtDur(w.weekMin), t('wStatWeek'), ''));
    box.appendChild(st); box.appendChild(h('p', 'note', t('wNote')));

    var cols = h('div', 'cols' + (w.goalsOn ? '' : ' one'));
    var flow = h('section', 'card'); flow.appendChild(heading(t('flowTitle'), t('flowSub')));
    if (!w.flow.length) flow.appendChild(empty(t('flowEmpty'), t('addActivity'), addPlan));
    else {
      var l = h('div', 'list'); w.flow.slice(0, 12).forEach(function (i) {
        var pills = [];
        if (i.status === 'done') pills.push({ txt: t('pillDone') }); else if (i.status === 'now') pills.push({ txt: t('pillNow'), on: true }); else if (i.next) pills.push({ txt: t('pillNext'), on: true });
        if (i.goalId && i.goalSpace === 'work') pills.push({ txt: t('pillGoal') });
        l.appendChild(row(i.goalId ? '🎯' : i.src === 'r' ? '🔁' : '🗓️', i.t, tm(i.s) + '–' + tm(i.e), pills));
      });
      flow.appendChild(l);
      var a = h('div', 'actions'); a.appendChild(btn('btn', t('addActivity'), addPlan)); a.appendChild(btn('btn ghost', t('viewTt'), toTimetable)); flow.appendChild(a);
    }
    cols.appendChild(flow);

    if (w.goalsOn) {
      var gc = h('section', 'card'); gc.appendChild(heading(t('goalsTitle'), t('goalsSub')));
      if (!w.goals.length) gc.appendChild(h('p', 'sub pad', t('goalsEmpty')));
      else w.goals.forEach(function (g) {
        var it = h('div', 'goal'), bar = h('div', 'bar'), fill = h('div', 'fill');
        it.appendChild(h('b', 'row-n', g.title));
        bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', g.title); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(g.hasEst ? g.pct : 0));
        fill.style.width = (g.hasEst ? g.pct : 0) + '%'; bar.appendChild(fill); it.appendChild(bar);
        var meta = [g.hasEst ? t('pct', { p: g.pct }) : t('noEst')]; if (g.daysLeft != null) meta.push(dueText(g.daysLeft));
        it.appendChild(h('small', 'row-m', meta.join(' · '))); gc.appendChild(it);
      });
      var ga = h('div', 'actions'); ga.appendChild(btn('btn ghost', t('goalsOpen'), function () { if (typeof openGoals === 'function') openGoals(); })); gc.appendChild(ga);
      cols.appendChild(gc);
    }
    box.appendChild(cols);
  }

  // ---------- Life ----------
  function renderLife(box, m) {
    var l = m.life, r = l.rituals;
    hero(box, 'life');
    var st = h('div', 'stats');
    st.appendChild(stat(t('tagToday'), r.total ? r.done + '/' + r.total : t('dash'), t('lStatRituals'), r.total ? '' : t('ritualsNone')));
    var ico = l.energy === 'low' ? '🌧️' : l.energy === 'high' ? '☀️' : l.energy === 'medium' ? '🌤️' : t('dash');
    st.appendChild(stat(t('tagToday'), ico, t('lStatEnergy'), l.energy ? levelName(l.energy) : t('energyNone'), openEnergy, 'energy'));
    st.appendChild(stat(t('tagToday'), l.water.has ? l.water.w + '/' + l.water.goal : t('dash'), t('lStatWater'), l.water.has ? t('cups') : ''));
    box.appendChild(st);

    var cols = h('div', 'cols');
    var rc = h('section', 'card'); rc.appendChild(heading(t('ritTitle'), t('ritSub')));
    if (!r.total) { rc.appendChild(empty(t('ritEmpty'), t('ritOpen'), function () { showView('bt'); })); }
    else r.groups.forEach(function (g) {
      if (!g.steps.length) return;
      rc.appendChild(h('div', 'grp', t(g.key === 'am' ? 'morning' : 'evening')));
      g.steps.forEach(function (sp) {
        var lb = h('label', 'chk'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = sp.done; cb.setAttribute('data-fk', 'step:' + g.key + ':' + sp.i);
        cb.onchange = function () { toggleStep(g.key, sp.i, cb.checked); };
        lb.appendChild(cb); lb.appendChild(h('span', 'chk-n', sp.name)); rc.appendChild(lb);
      });
    });
    if (l.water.has) {
      var wr = h('div', 'water'); wr.appendChild(h('b', 'row-n', t('waterRow') + ' ' + l.water.w + ' / ' + l.water.goal + ' ' + t('cups')));
      var wb = h('div', 'actions');
      var mi = btn('btn ghost sm', '−', function () { cup(-1); }, t('waterMinus')); mi.setAttribute('data-fk', 'cup:-');
      var pl = btn('btn sm', '＋', function () { cup(1); }, t('waterPlus')); pl.setAttribute('data-fk', 'cup:+');
      wb.appendChild(mi); wb.appendChild(pl); wr.appendChild(wb); rc.appendChild(wr);
    }
    cols.appendChild(rc);

    var ac = h('section', 'card'); ac.appendChild(heading(t('agTitle'), t('agSub')));
    if (!l.agenda.length) ac.appendChild(empty(t('agEmpty'), t('agAdd'), addPlan));
    else {
      var li = h('div', 'list'); l.agenda.forEach(function (i) {
        li.appendChild(row(i.goalId ? '🎯' : i.src === 'r' ? '🔁' : '🌿', i.t, tm(i.s) + '–' + tm(i.e), [{ txt: t(i.day === 'today' ? 'today' : 'tomorrow'), on: i.day === 'today' }]));
      });
      ac.appendChild(li);
      var aa = h('div', 'actions'); aa.appendChild(btn('btn', t('agAdd'), addPlan)); aa.appendChild(btn('btn ghost', t('viewTt'), toTimetable)); ac.appendChild(aa);
    }
    cols.appendChild(ac); box.appendChild(cols);

    box.appendChild(h('h2', 'h2 sect', t('careTitle')));
    var c2 = h('div', 'cols');
    var ec = h('section', 'card'); ec.appendChild(h('h2', 'h2', t('enTitle'))); ec.appendChild(h('p', 'sub', t('enText')));
    if (l.energy) ec.appendChild(h('p', 'msg', t('enToday', { l: levelName(l.energy) })));
    var ea = h('div', 'actions'); ea.appendChild(btn('btn ghost', t('enBtn'), openEnergy)); ec.appendChild(ea);
    var bc = h('section', 'card'); bc.appendChild(h('h2', 'h2', t('breatheTitle'))); bc.appendChild(h('p', 'sub', t('breatheText')));
    var ba = h('div', 'actions'); ba.appendChild(btn('btn ghost', t('breatheBtn'), addPlan)); bc.appendChild(ba);
    c2.appendChild(ec); c2.appendChild(bc); box.appendChild(c2);
  }

  // ---------- 渲染 ----------
  function render() {
    var v = view(), sec = v === 'wk' ? WK_SEC : v === 'lf' ? LF_SEC : null; if (!sec) return;
    var rootEl = sec.querySelector('.spc-root');
    if (!rootEl) { rootEl = h('div', 'root'); sec.appendChild(rootEl); }
    var ae = document.activeElement, fk = ae && ae.getAttribute && rootEl.contains(ae) ? ae.getAttribute('data-fk') : null, y = window.pageYOffset;
    rootEl.textContent = '';
    try {
      var m = C.build(snapshot());
      if (v === 'wk') renderWork(rootEl, m); else renderLife(rootEl, m);
    } catch (e) {
      rootEl.textContent = '';
      var er = h('div', 'card'); er.setAttribute('role', 'alert'); er.appendChild(h('p', 'sub', t('err'))); er.appendChild(btn('btn', t('retry'), render)); rootEl.appendChild(er);
    }
    if (S.focusHead) { S.focusHead = false; var hh = rootEl.querySelector('.spc-h'); if (hh) hh.focus({ preventScroll: true }); }
    else if (fk) { var f = rootEl.querySelector('[data-fk="' + fk + '"]'); if (f) f.focus({ preventScroll: true }); }
    if (y && !S.focusHead) window.scrollTo(0, y);
  }

  // ---------- 空间切换条 ----------
  var SW = [['study', '📚', 'swStudy', 'ss', 'v-ss'], ['work', '💼', 'swWork', 'wk', 'v-wk'], ['life', '🌿', 'swLife', 'lf', 'v-lf']];
  function mountSwitch() {
    var ms = modes();
    SW.forEach(function (cur) {
      var sec = document.getElementById(cur[4]); if (!sec) return;
      var old = sec.querySelector(':scope > .spc-sw'); if (old) old.remove();
      if (ms.indexOf('work') < 0 && ms.indexOf('life') < 0) return;      // 只选学习：和以前一样，不出现切换条
      var bar = h('div', 'sw'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', t('swAria'));
      SW.forEach(function (o) {
        if (o[0] !== 'study' && ms.indexOf(o[0]) < 0) return;               // 学习永远在（底部“学习”标签的落点不变）
        var on = o[0] === cur[0], b = btn('swb' + (on ? ' on' : ''), o[1] + ' ' + t(o[2]), function () { if (!on && typeof showView === 'function') showView(o[3]); });
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); bar.appendChild(b);
      });
      sec.insertBefore(bar, sec.firstChild);
    });
  }
  // ---------- 接入现有页面：只“包装”，不改原函数 ----------
  ['draw', 'rBt', 'rDi'].forEach(function (n) {
    var o = window[n]; if (typeof o !== 'function') return;
    window[n] = function () { var r = o.apply(this, arguments); if (visible()) ok(render); return r; };
  });
  var _sv = window.showView;
  if (typeof _sv === 'function') window.showView = function (v) { var r = _sv.apply(this, arguments); if (v === 'wk' || v === 'lf') { S.focusHead = true; render(); } return r; };
  document.addEventListener('mochi:modes', function () { mountSwitch(); if (visible()) render(); });
  document.addEventListener('mochi:energy', function () { if (visible()) render(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && visible()) render(); });

  mountSwitch();
})();
