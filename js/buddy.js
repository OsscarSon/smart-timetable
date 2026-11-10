// Mochi Buddy v2（重写版）：右下角的小麻薯兔。只"读"今天的日程来显示状态，不写任何数据、不调用 AI。
// 设计原则：① 点击只走一条路（button.click），不依赖 MutationObserver / pointer 事件链；② 任何一步出错都不会让按钮失效；
// ③ 让位（隐藏）靠轻量轮询 + 少量事件，不监听整个 body 的 DOM 变化。
// 设置只存本机 buddy-prefs（故意不用 mochi- 前缀，不会被云同步）；提示冷却存 buddy-cool。
(function () {
  'use strict';
  if (!window.MochiBuddyArt) return;
  var PK = 'buddy-prefs', CK = 'buddy-cool', COOL_MS = 60 * 60 * 1000, BUBBLE_MS = 7000;
  var P = { on: true, mute: false, calm: false, side: 'right' };
  try { var sp = JSON.parse(localStorage.getItem(PK) || 'null'); if (sp && typeof sp === 'object') { for (var k in P) if (typeof sp[k] === typeof P[k]) P[k] = sp[k]; } } catch (e) {}
  if (P.side !== 'left') P.side = 'right';
  function savePrefs() { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) {} }

  var COPY = {
    en: {
      name: 'Mochi Buddy', title: 'Mochi Buddy', setOn: 'Show Mochi Buddy', setOnD: 'A small helper that shows what is happening in today’s timetable',
      setMute: 'Quiet mode', setMuteD: 'Buddy never pops up on its own; it only talks when you tap it',
      setCalm: 'Calm mode', setCalmD: 'Turn off Buddy’s movement (the system “reduce motion” setting is always respected)',
      setSide: 'Buddy position', right: 'Right', left: 'Left', dismiss: 'Close',
      conflict: '“{a}” and “{b}” overlap today. Have a look when you have a moment.', review: 'Open today',
      now: '“{t}” is on until {e}.', next: 'Next: “{t}” at {s}, in {m}.', night: 'It’s late. Maybe time to wind down.',
      allDone: 'Everything planned for today is wrapped up.', none: 'Nothing planned today. Enjoy the open space.',
      free: 'No plans right now. A good moment to add something, or just rest.', away: 'You are looking at another week.',
      open: 'Open today', add: 'Add a plan', back: 'Back to today', min: '{n} min', hr: '{n} h', hrmin: '{h} h {n} min'
    },
    zh: {
      name: 'Mochi 小伙伴', title: 'Mochi 小伙伴', setOn: '显示 Mochi 小伙伴', setOnD: '一只小小的助手，显示今天日程的状态',
      setMute: '安静模式', setMuteD: '小伙伴不会主动冒出来，只有你点它时才说话',
      setCalm: '平静模式', setCalmD: '关闭小伙伴的动作（系统的“减少动态效果”设置始终有效）',
      setSide: '小伙伴的位置', right: '右侧', left: '左侧', dismiss: '关闭',
      conflict: '今天“{a}”和“{b}”时间重叠了，有空看一下吧。', review: '查看今天',
      now: '“{t}”进行到 {e}。', next: '下一项：“{t}”，{s} 开始（{m}后）。', night: '时间不早了，也许该准备休息了。',
      allDone: '今天计划的事情都结束了。', none: '今天没有安排，享受空白时光吧。',
      free: '现在没有安排。适合添加点什么，或者就休息一下。', away: '你正在看另一周的课表。',
      open: '查看今天', add: '添加安排', back: '回到今天', min: '{n} 分钟', hr: '{n} 小时', hrmin: '{h} 小时 {n} 分钟'
    },
    ms: {
      name: 'Mochi Buddy', title: 'Mochi Buddy', setOn: 'Papar Mochi Buddy', setOnD: 'Pembantu kecil yang menunjukkan keadaan jadual hari ini',
      setMute: 'Mod senyap', setMuteD: 'Buddy tidak muncul sendiri; hanya bercakap apabila anda ketik',
      setCalm: 'Mod tenang', setCalmD: 'Matikan pergerakan Buddy (tetapan “kurangkan gerakan” sistem sentiasa dihormati)',
      setSide: 'Kedudukan Buddy', right: 'Kanan', left: 'Kiri', dismiss: 'Tutup',
      conflict: '“{a}” dan “{b}” bertindih hari ini. Sila semak apabila lapang.', review: 'Buka hari ini',
      now: '“{t}” berlangsung hingga {e}.', next: 'Seterusnya: “{t}” pada {s}, dalam {m}.', night: 'Dah lewat. Mungkin masa untuk berehat.',
      allDone: 'Semua yang dirancang untuk hari ini sudah selesai.', none: 'Tiada rancangan hari ini. Nikmati ruang kosong.',
      free: 'Tiada rancangan sekarang. Masa sesuai untuk tambah sesuatu, atau berehat.', away: 'Anda sedang melihat minggu lain.',
      open: 'Buka hari ini', add: 'Tambah rancangan', back: 'Kembali ke hari ini', min: '{n} min', hr: '{n} j', hrmin: '{h} j {n} min'
    }
  };
  function C() { return COPY[window.LANG] || COPY.en; }
  function tx(k, v) { var s = C()[k] || COPY.en[k] || k; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  function node(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function clean(t) { return String(t == null ? '' : t).replace(/^[^\p{L}\p{N}]+/u, '').trim().slice(0, 24) || '…'; }
  function hhmm(m) { return typeof tmin === 'function' ? tmin(m) : (Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2)); }
  function dur(m) { m = Math.max(1, Math.round(m)); if (m < 60) return tx('min', { n: m }); var h = Math.floor(m / 60), r = m % 60; return r ? tx('hrmin', { h: h, n: r }) : tx('hr', { n: h }); }

  // ---- 状态：只读今天的日程 ----
  function snapshot() {
    var n = new Date(), nowM = n.getHours() * 60 + n.getMinutes(), hr = n.getHours(), late = hr >= 22 || hr < 5;
    try {
      if (typeof itemsOf !== 'function' || typeof curW === 'undefined' || typeof thisW === 'undefined' || typeof todayIdx === 'undefined')
        return { state: late ? 'sleepy' : 'idle', msg: tx('free'), act: 'add', key: 'x' };
      if (curW !== thisW) return { state: 'idle', msg: tx('away'), act: 'back', key: 'away' };
      var all = itemsOf(todayIdx).filter(function (i) { return i && i.e > i.s; });
      var live = all.filter(function (i) { return !i.done && i.e > nowM; });
      for (var a = 0; a < live.length; a++) for (var b = a + 1; b < live.length; b++) {
        if (live[a].s < live[b].e && live[b].s < live[a].e)
          return { state: 'warning', msg: tx('conflict', { a: clean(live[a].t), b: clean(live[b].t) }), act: 'review', key: 'c:' + live[a].s + ':' + live[b].s, proactive: true };
      }
      var cur = live.filter(function (i) { return i.s <= nowM; })[0], nxt = live.filter(function (i) { return i.s > nowM; })[0];
      if (cur) return { state: 'focus', msg: tx('now', { t: clean(cur.t), e: hhmm(cur.e) }), act: 'open', key: 'now:' + cur.s };
      if (late) return { state: 'sleepy', msg: tx('night'), act: 'open', key: 'night' };
      if (nxt) return { state: 'idle', msg: tx('next', { t: clean(nxt.t), s: hhmm(nxt.s), m: dur(nxt.s - nowM) }), act: 'open', key: 'n:' + nxt.s, proactive: nxt.s - nowM <= 10 };
      if (all.length) return { state: 'happy', msg: tx('allDone'), act: 'add', key: 'done' };
      return { state: 'rest', msg: tx('none'), act: 'add', key: 'none' };
    } catch (e) { return { state: 'idle', msg: tx('free'), act: 'add', key: 'err' }; }
  }

  // ---- 按钮动作：只是点已有的按钮（“今天”/＋），不自己写任何数据 ----
  function actOpen() { try { var b = document.getElementById('tdp'); if (b) b.click(); else if (typeof showView === 'function') showView('tt'); } catch (e) {} }
  function actAdd() { try { if (typeof showView === 'function') showView('tt'); setTimeout(function () { var f = document.getElementById('fab'); if (f) f.click(); }, 0); } catch (e) {} }
  var ACTS = { open: ['open', actOpen], review: ['review', actOpen], back: ['back', actOpen], add: ['add', actAdd] };

  // ---- DOM ----
  var root = null, btn = null, bubble = null, bubbleP = null, actB = null, dotEl = null;
  var curState = '', timer = 0, snap = null, hid = false, poll = 0, tick = 0;

  function mount() {
    if (root) return;
    root = node('div', 'bd'); root.setAttribute('role', 'complementary'); root.setAttribute('aria-label', tx('name'));
    bubble = node('div', 'bd-bubble'); bubble.hidden = true; bubble.setAttribute('role', 'status');
    bubbleP = node('p');
    var row = node('div', 'bd-row'), x = node('button', 'bd-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', tx('dismiss'));
    actB = node('button', 'bd-act'); actB.type = 'button';
    row.appendChild(x); row.appendChild(actB); bubble.appendChild(bubbleP); bubble.appendChild(row);
    btn = node('button', 'bd-btn'); btn.type = 'button'; btn.setAttribute('aria-label', tx('name')); btn.setAttribute('aria-expanded', 'false');
    dotEl = node('i', 'bd-dot'); dotEl.hidden = true; btn.appendChild(dotEl);
    root.appendChild(bubble); root.appendChild(btn);

    // 点击：只有这三个 onclick，没有别的状态机。
    btn.addEventListener('click', onBuddyTap);
    x.addEventListener('click', function () { closeBubble(); });
    actB.addEventListener('click', function () { var a = ACTS[(snap || {}).act]; closeBubble(); if (a) a[1](); });

    document.body.appendChild(root);
    applyPrefs(); refresh();
    clearInterval(poll); poll = setInterval(checkHide, 400);   // 轻量轮询，代替监听整个 body
  }
  function unmount() {
    clearTimeout(timer); clearInterval(poll); poll = 0;
    if (root) { root.remove(); }
    root = btn = bubble = bubbleP = actB = dotEl = null; curState = ''; hid = false;
  }
  function onBuddyTap() {
    try {
      if (bubble.hidden) { openBubble(false); bounce(); } else closeBubble();
    } catch (e) { try { closeBubble(); } catch (e2) {} }
  }
  function applyPrefs() { if (!root) return; root.dataset.side = P.side; root.dataset.calm = P.calm ? '1' : '0'; }
  function bounce() {
    if (P.calm || !root) return;
    root.classList.remove('bd-tap'); void root.offsetWidth; root.classList.add('bd-tap');
    clearTimeout(tick); tick = setTimeout(function () { if (root) root.classList.remove('bd-tap'); }, 500);
  }
  function setArt(state) {
    if (!btn || state === curState) return; curState = state;
    var old = btn.querySelector('svg'); if (old) old.remove();
    var tmp = document.createElement('div'); tmp.innerHTML = window.MochiBuddyArt.svg(state);
    var s = tmp.firstChild; if (!s) return;
    s.setAttribute('aria-hidden', 'true'); s.removeAttribute('role'); s.removeAttribute('width'); s.removeAttribute('height');
    s.style.pointerEvents = 'none';   // 点击永远落在 button 上，不会被 SVG 子元素吞掉
    btn.insertBefore(s, dotEl); root.dataset.state = state;
  }
  function refresh() {
    if (!root) return;
    try {
      snap = snapshot(); setArt(snap.state); dotEl.hidden = !snap.proactive;
      if (!bubble.hidden) fillBubble();
      checkHide();
      if (!hid && !P.mute && snap.proactive && bubble.hidden && cool(snap.key)) openBubble(true);
    } catch (e) {}
  }
  function fillBubble() { var a = ACTS[snap.act]; bubbleP.textContent = snap.msg; actB.textContent = a ? tx(a[0]) : ''; actB.hidden = !a; }
  function openBubble(auto) {
    snap = snapshot(); fillBubble(); bubble.hidden = false; btn.setAttribute('aria-expanded', 'true'); clearTimeout(timer);
    if (auto) { markCool(snap.key); timer = setTimeout(closeBubble, BUBBLE_MS); } else timer = setTimeout(closeBubble, BUBBLE_MS * 2);
  }
  function closeBubble() { clearTimeout(timer); if (!bubble) return; bubble.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  function cool(key) { try { var m = JSON.parse(localStorage.getItem(CK) || '{}'); return !(m[key] && Date.now() - m[key] < COOL_MS); } catch (e) { return true; } }
  function markCool(key) { try { var m = JSON.parse(localStorage.getItem(CK) || '{}'), now = Date.now(); Object.keys(m).forEach(function (k) { if (now - m[k] > COOL_MS) delete m[k]; }); m[key] = now; localStorage.setItem(CK, JSON.stringify(m)); } catch (e) {} }

  // ---- 让位：弹窗 / 抽屉 / 引导 / 拖拽 / ＋ 菜单 / 全屏 / 正在输入 时隐藏 ----
  var BLOCK = '.mask.show,.mn-overlay,.dw.show,.driver-popover,.driver-overlay,.sort-ghost,.sortable-chosen,.sortable-drag';
  function blocked() {
    try {
      if (document.querySelector(BLOCK)) return true;
      var fm = document.getElementById('fabm'); if (fm && !fm.hidden) return true;
      if (document.fullscreenElement) return true;
      var a = document.activeElement;
      if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && !(a.closest && a.closest('.bd'))) return true;
    } catch (e) {}
    return false;
  }
  function checkHide() {
    if (!root) return;
    var b = blocked();
    if (b !== hid) { hid = b; root.classList.toggle('bd-hide', b); if (b) closeBubble(); }
  }

  // ---- 设置（设置 → 外观与显示 末尾）----
  function buildSettings() {
    var sec = document.querySelector('#v-se .sec[data-sec="look"]'); if (!sec || sec.querySelector('.bd-set')) return;
    sec.appendChild(node('h3', 'hs bd-set', '🐰 ' + tx('title')));
    function check(key, label, desc) {
      var l = node('label', 'tp'), i = node('input'); i.type = 'checkbox'; i.checked = !!P[key];
      var d = node('div', 'n', label); d.appendChild(node('small', null, desc)); l.appendChild(i); l.appendChild(d);
      i.onchange = function () { P[key] = i.checked; savePrefs(); sync(); }; sec.appendChild(l);
    }
    check('on', tx('setOn'), tx('setOnD')); check('mute', tx('setMute'), tx('setMuteD')); check('calm', tx('setCalm'), tx('setCalmD'));
    var l = node('label', 'tp'), d = node('div', 'n', tx('setSide')), s = node('select', 'sel'); s.setAttribute('aria-label', tx('setSide'));
    [['right', tx('right')], ['left', tx('left')]].forEach(function (o) { var op = node('option', null, o[1]); op.value = o[0]; s.appendChild(op); });
    s.value = P.side; s.onchange = function () { P.side = s.value; savePrefs(); sync(); }; l.appendChild(d); l.appendChild(s); sec.appendChild(l);
  }
  function sync() { if (P.on) { mount(); applyPrefs(); refresh(); } else unmount(); }

  function init() {
    try { buildSettings(); } catch (e) {}
    try { sync(); } catch (e) {}
    // 日程重绘时原系统会重写 #dnow，借它当“数据变了”的信号
    var dn = document.getElementById('dnow');
    if (dn) { try { new MutationObserver(function () { refresh(); }).observe(dn, { childList: true, subtree: true }); } catch (e) {} }
  }
  document.addEventListener('focusin', function () { checkHide(); });
  document.addEventListener('focusout', function () { setTimeout(checkHide, 50); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bubble && !bubble.hidden) closeBubble(); });
  document.addEventListener('pointerdown', function (e) { if (bubble && !bubble.hidden && !(e.target.closest && e.target.closest('.bd'))) closeBubble(); });
  setInterval(function () { if (!document.hidden) refresh(); }, 30000);

  window.MochiBuddy = { refresh: refresh, prefs: function () { return JSON.parse(JSON.stringify(P)); }, snapshot: snapshot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 600); }); else setTimeout(init, 600);
})();
