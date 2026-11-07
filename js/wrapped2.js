// Mochi Wrapped 2.0：月度/年度“时间故事”卡片 + 隐私预览 + 9:16 PNG 导出。
// 数据口径全部在 wrapped-stats.js（纯函数，有单元测试）；这里只负责：从现有数据收集条目 → 调用统计 → 排版成卡片 → 画到 DOM / canvas。
// 只读：不写任何用户数据；全部在本机计算，不联网、不上传。
// 接管 MochiNext.openWrapped（菜单与统计页入口都走它）；开关关闭或任何异常都回退到原来的 1.0。
(function () {
  'use strict';
  var NX = window.MochiNext, ST = window.MochiWrappedStats;
  if (!NX || !ST || typeof NX.openWrapped !== 'function') return;
  var classic = NX.openWrapped, PK = 'wrapped2-prefs', P = { on: true };
  try { var sp = JSON.parse(localStorage.getItem(PK) || 'null'); if (sp && typeof sp.on === 'boolean') P.on = sp.on; } catch (e) {}
  function savePrefs() { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) {} }

  var COPY = {
    en: {
      title: 'Mochi Wrapped', month: 'Month', year: 'Year', pick: 'Period', prev: 'Previous card', next: 'Next card', cardN: 'Card {i} of {n}', close: 'Close',
      c1: 'Your time, planned', c1h: 'planned time', items: 'Items', active: 'Active days', avg: 'Average per active day',
      c2: 'Your rhythm', c2h: 'busiest day', morning: 'Morning 05–12', afternoon: 'Afternoon 12–17', evening: 'Evening 17–22', night: 'Night 22–05', peak: 'Peak hour',
      c3: 'Where your time went', c3h: 'most scheduled activity', classes: 'Classes', recurring: 'Recurring', oneoff: 'One-off', activity: 'Activity {n}', untitled: 'Untitled',
      c4: 'Plan vs. marked done', c4h: 'of past items were marked done', past: 'Items already passed', marked: 'Marked done', markedT: 'Time marked done',
      c4n: 'Classes can’t be ticked, so they are not included. “Marked done” means you ticked it; it is not tracked time.',
      c5: 'Your highlights', classT: 'Class time', tasks: 'Tasks completed', longest: 'Longest single block', bweek: 'Busiest week', streak: 'Longest active streak', free: 'Evenings with nothing planned', weekOf: 'Week of {d}', days: '{n} days',
      emptyT: 'Not enough data yet', empty: 'Wrapped needs at least {a} items on {b} different days. This period has {x} items on {y} days. Add a few plans and come back.',
      emptyC: 'Not enough data yet. Needs at least {a} past items that can be ticked; this period has {x}.',
      calcQ: 'How is this calculated?', cMin: 'min', cH: 'h',
      calc1: 'Planned time adds up each day’s scheduled time from {from} to {to}; items that overlap are counted once. {n} items: {m} one-off, {r} recurring, {f} classes. Only days up to today are included.',
      calc2: 'Busiest day is the day with the most scheduled time. Time of day splits every scheduled block across the hours it covers.',
      calc3: 'Each activity adds up the length of its items (same name = same activity, ignoring case and emoji). Overlapping items each count, so the list can add up to more than your planned time. The split shows each source’s share of item time.',
      calc4: 'Looks at one-off and recurring items whose end time has already passed: {a} items, {b} ticked. Time = the scheduled length of those items.',
      calc5: 'Longest block = the single longest item. Busiest week = the week with the most scheduled time. Active streak = most consecutive days with something scheduled. Evenings = days up to today with nothing scheduled between 17:00 and 22:00. Tasks completed = homework you ticked in this period.',
      export: 'Save as image', share: 'Share', save: 'Save image', back: 'Back', hide: 'Hide event names (recommended)', hideD: 'The image shows “Activity 1, 2…” instead of your own titles. Your screen always shows the real names.',
      preview: 'Image preview', local: 'Calculated on this device. Nothing is uploaded.', classic: 'Use classic recap', foot: 'Mochi · calculated on your device', err: 'Could not create the image. Try again.',
      setT: 'Mochi Wrapped 2.0', setD: 'Story cards, plan vs. done, and a privacy preview before sharing. Turn off to use the classic recap.'
    },
    zh: {
      title: 'Mochi Wrapped', month: '月度', year: '年度', pick: '时间范围', prev: '上一张', next: '下一张', cardN: '第 {i} 张，共 {n} 张', close: '关闭',
      c1: '你的时间安排', c1h: '计划时长', items: '安排数', active: '有安排的天数', avg: '每个活跃日平均',
      c2: '你的节奏', c2h: '最忙的一天', morning: '上午 05–12', afternoon: '下午 12–17', evening: '晚上 17–22', night: '深夜 22–05', peak: '最忙的时段',
      c3: '时间花在哪里', c3h: '安排最多的活动', classes: '课程', recurring: '重复活动', oneoff: '单次安排', activity: '活动 {n}', untitled: '未命名',
      c4: '计划与完成', c4h: '已过去的安排被标记完成', past: '已过去的安排', marked: '已标记完成', markedT: '标记完成的时长',
      c4n: '课程不能打勾，所以不计入。“标记完成”指你点了完成，不代表实际花费的时间。',
      c5: '你的亮点', classT: '上课时间', tasks: '完成的任务', longest: '最长的单个安排', bweek: '最忙的一周', streak: '最长连续有安排', free: '没有安排的晚上', weekOf: '{d} 起的一周', days: '{n} 天',
      emptyT: '数据还不够', empty: 'Wrapped 至少需要 {b} 个不同日期上的 {a} 条安排。这个时间范围只有 {y} 天的 {x} 条。多添加一些安排再来看看吧。',
      emptyC: '数据还不够：至少需要 {a} 条已过去且可打勾的安排，这个时间范围只有 {x} 条。',
      calcQ: '这是怎么算的？', cMin: '分钟', cH: '小时',
      calc1: '计划时长 = {from} 到 {to} 每天已安排时间的总和，重叠的时间只算一次。共 {n} 条：单次 {m}、重复 {r}、课程 {f}。只统计到今天。',
      calc2: '最忙的一天 = 已安排时间最长的一天。时段分布把每个安排拆到它覆盖的每个小时里。',
      calc3: '每个活动累计其所有安排的时长（同名视为同一活动，忽略大小写和表情）。重叠的安排各算各的，所以合计可能大于计划时长。来源占比 = 各来源占安排时长的比例。',
      calc4: '统计结束时间已过去的单次/重复安排：{a} 条，其中 {b} 条已打勾。时长 = 这些安排的计划长度。',
      calc5: '最长安排 = 单个最长的一条。最忙的一周 = 已安排时间最多的一周。连续 = 连续有安排的最多天数。晚上 = 到今天为止 17:00–22:00 没有任何安排的天数。完成的任务 = 这段时间内你打勾的作业。',
      export: '保存为图片', share: '分享', save: '保存图片', back: '返回', hide: '隐藏事件名称（推荐）', hideD: '图片里会显示“活动 1、2…”而不是你自己的标题。你屏幕上始终显示真实名称。',
      preview: '图片预览', local: '全部在本机计算，不会上传任何内容。', classic: '使用经典版', foot: 'Mochi · 在你的设备上计算', err: '生成图片失败，请重试。',
      setT: 'Mochi Wrapped 2.0', setD: '故事卡片、计划与完成对比，分享前可预览隐私。关闭后使用经典版。'
    },
    ms: {
      title: 'Mochi Wrapped', month: 'Bulan', year: 'Tahun', pick: 'Tempoh', prev: 'Kad sebelumnya', next: 'Kad seterusnya', cardN: 'Kad {i} daripada {n}', close: 'Tutup',
      c1: 'Masa yang anda rancang', c1h: 'masa dirancang', items: 'Item', active: 'Hari aktif', avg: 'Purata setiap hari aktif',
      c2: 'Rentak anda', c2h: 'hari paling sibuk', morning: 'Pagi 05–12', afternoon: 'Petang 12–17', evening: 'Malam 17–22', night: 'Lewat malam 22–05', peak: 'Jam paling sibuk',
      c3: 'Ke mana masa anda pergi', c3h: 'aktiviti paling banyak dijadualkan', classes: 'Kelas', recurring: 'Berulang', oneoff: 'Sekali sahaja', activity: 'Aktiviti {n}', untitled: 'Tanpa tajuk',
      c4: 'Rancangan vs. selesai', c4h: 'item yang telah lalu ditanda selesai', past: 'Item yang telah lalu', marked: 'Ditanda selesai', markedT: 'Masa ditanda selesai',
      c4n: 'Kelas tidak boleh ditanda, jadi tidak dikira. “Ditanda selesai” bermaksud anda menandanya; ia bukan masa yang dijejaki.',
      c5: 'Sorotan anda', classT: 'Masa kelas', tasks: 'Tugasan selesai', longest: 'Blok tunggal terpanjang', bweek: 'Minggu paling sibuk', streak: 'Rentetan aktif terpanjang', free: 'Malam tanpa rancangan', weekOf: 'Minggu {d}', days: '{n} hari',
      emptyT: 'Data belum mencukupi', empty: 'Wrapped memerlukan sekurang-kurangnya {a} item pada {b} hari berbeza. Tempoh ini ada {x} item pada {y} hari. Tambah beberapa rancangan dan datang semula.',
      emptyC: 'Data belum mencukupi. Perlu sekurang-kurangnya {a} item lepas yang boleh ditanda; tempoh ini ada {x}.',
      calcQ: 'Bagaimana ini dikira?', cMin: 'min', cH: 'j',
      calc1: 'Masa dirancang menjumlahkan masa berjadual setiap hari dari {from} hingga {to}; item yang bertindih dikira sekali. {n} item: {m} sekali sahaja, {r} berulang, {f} kelas. Hanya hari sehingga hari ini.',
      calc2: 'Hari paling sibuk ialah hari dengan masa berjadual terbanyak. Waktu dalam hari membahagikan setiap blok kepada jam yang diliputinya.',
      calc3: 'Setiap aktiviti menjumlahkan tempoh itemnya (nama sama = aktiviti sama, abaikan huruf besar/kecil dan emoji). Item bertindih dikira masing-masing, jadi jumlahnya boleh melebihi masa dirancang. Pecahan menunjukkan kongsi setiap sumber.',
      calc4: 'Melihat item sekali sahaja dan berulang yang masa tamatnya sudah lalu: {a} item, {b} ditanda. Masa = tempoh berjadual item tersebut.',
      calc5: 'Blok terpanjang = satu item terpanjang. Minggu paling sibuk = minggu dengan masa berjadual terbanyak. Rentetan = hari berturut-turut terbanyak yang ada jadual. Malam = hari sehingga hari ini tanpa jadual antara 17:00 dan 22:00. Tugasan selesai = kerja rumah yang anda tanda dalam tempoh ini.',
      export: 'Simpan sebagai imej', share: 'Kongsi', save: 'Simpan imej', back: 'Kembali', hide: 'Sembunyikan nama acara (disyorkan)', hideD: 'Imej menunjukkan “Aktiviti 1, 2…” dan bukan tajuk anda. Skrin anda sentiasa menunjukkan nama sebenar.',
      preview: 'Pratonton imej', local: 'Dikira pada peranti ini. Tiada apa dimuat naik.', classic: 'Guna ringkasan klasik', foot: 'Mochi · dikira pada peranti anda', err: 'Tidak dapat mencipta imej. Cuba lagi.',
      setT: 'Mochi Wrapped 2.0', setD: 'Kad cerita, rancangan vs. selesai, dan pratonton privasi sebelum berkongsi. Matikan untuk guna ringkasan klasik.'
    }
  };
  function C() { return COPY[window.LANG] || COPY.en; }
  function tx(k, v) { var s = C()[k]; if (s === undefined) s = COPY.en[k]; if (s === undefined) s = k; if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  function loc() { return window.LANG === 'zh' ? 'zh-CN' : window.LANG === 'ms' ? 'ms-MY' : 'en'; }
  function node(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dnLabel(dn, withYear) { try { return new Intl.DateTimeFormat(loc(), { weekday: withYear ? undefined : 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(dn * 864e5)); } catch (e) { return String(dn); } }
  function fmtDur(min) { min = Math.round(min); if (min < 60) return min + ' ' + tx('cMin'); var h = Math.round(min / 6) / 10; return h.toLocaleString(loc()) + ' ' + tx('cH'); }
  function fmtHour(h) { return pad(h) + ':00–' + pad((h + 1) % 24) + ':00'; }

  // ---------- 从现有数据收集条目（只读） ----------
  function dayOfIso(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 864e5); }
  function rangeOf(st) {
    var now = new Date(), todayDn = dayOfIso(now.getFullYear(), now.getMonth() + 1, now.getDate()), a, b;
    if (st.kind === 'year') { a = dayOfIso(st.year, 1, 1); b = dayOfIso(st.year, 12, 31); st.label = String(st.year); }
    else { var p = st.ym.split('-'), y = +p[0], m = +p[1]; a = dayOfIso(y, m, 1); b = dayOfIso(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - 1; st.label = new Intl.DateTimeFormat(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(a * 864e5)); }
    return { from: a, to: Math.min(b, todayDn), todayDn: todayDn, nowMin: now.getHours() * 60 + now.getMinutes() };
  }
  function collect(r) {
    var items = [], ws = SET.ws || 0, w0 = Math.floor((r.from + 3 - ws) / 7), w1 = Math.floor((r.to + 3 - ws) / 7);
    for (var w = w0; w <= w1; w++) {
      (WK[w] || []).forEach(function (x) { items.push({ dn: dnOf(w, x.day), s: x.s, e: x.e, t: x.t, src: 'm', done: !!DN[kk(x, w)] }); });
      rpBlocks(w).forEach(function (x) { items.push({ dn: x.dn, s: x.s, e: x.e, t: x.t, src: 'r', done: !!DN[kk(x, w)] }); });
      fxBlocks(w).forEach(function (x) { items.push({ dn: x.dn, s: x.s, e: x.e, t: x.t, src: 'f' }); });
    }
    var tasks = null;
    try { if (typeof HW !== 'undefined' && typeof dayNum === 'function') { tasks = HW.filter(function (h) { if (!h.done) return false; var d = dayNum(new Date(h.done)); return d >= r.from && d <= r.to; }).length; } } catch (e) { tasks = null; }
    return { items: items, tasks: tasks, ws: ws };
  }
  function stats(st) { var r = rangeOf(st), c = collect(r); st.r = r; return ST.compute({ from: r.from, to: r.to, todayDn: r.todayDn, nowMin: r.nowMin, ws: c.ws, items: c.items, tasksDone: c.tasks }); }

  // ---------- 卡片数据（DOM 与 PNG 共用同一份） ----------
  function modes() { try { var m = NX.modes(); return Array.isArray(m) && m.length ? m : ['study']; } catch (e) { return ['study']; } }
  function cards(S, st) {
    var out = [], ep = 'MOCHI WRAPPED · ' + st.label, r = st.r, T = S.bySrc;
    if (!S.enough.overall) return [{ id: 'empty', ep: ep, title: tx('emptyT'), note: tx('empty', { a: S.min.items, b: S.min.days, x: S.items, y: S.activeDays }), calc: '', rows: [] }];
    var itemMin = (T.m.min + T.r.min + T.f.min) || 1;
    out.push({ id: 'c1', ep: ep, title: tx('c1'), hero: { v: fmtDur(S.plannedMin), l: tx('c1h') }, rows: [
      { l: tx('items'), v: String(S.items) }, { l: tx('active'), v: String(S.activeDays) }, { l: tx('avg'), v: fmtDur(S.avgPerActiveDay) }],
      calc: tx('calc1', { from: dnLabel(r.from, true), to: dnLabel(r.to, true), n: S.items, m: T.m.n, r: T.r.n, f: T.f.n }) });
    var sl = S.slots, slMax = Math.max(sl.morning, sl.afternoon, sl.evening, sl.night, 1);
    out.push({ id: 'c2', ep: ep, title: tx('c2'), hero: { v: dnLabel(S.busiest.dn), l: tx('c2h') + ' · ' + fmtDur(S.busiest.min) }, rows: [
      { l: tx('morning'), v: fmtDur(sl.morning), p: sl.morning / slMax }, { l: tx('afternoon'), v: fmtDur(sl.afternoon), p: sl.afternoon / slMax },
      { l: tx('evening'), v: fmtDur(sl.evening), p: sl.evening / slMax }, { l: tx('night'), v: fmtDur(sl.night), p: sl.night / slMax },
      { l: tx('peak'), v: fmtHour(S.peakHour) }], calc: tx('calc2') });
    var top = S.top, tMax = top.length ? top[0].min : 1, rows3 = [];
    top.forEach(function (a, i) { rows3.push({ l: a.name || tx('untitled'), alt: tx('activity', { n: i + 1 }), priv: true, v: fmtDur(a.min), p: a.min / tMax }); });
    [['classes', 'f'], ['recurring', 'r'], ['oneoff', 'm']].forEach(function (k) { if (T[k[1]].n) rows3.push({ l: tx(k[0]), v: Math.round(T[k[1]].min / itemMin * 100) + '%', p: T[k[1]].min / itemMin, group: true }); });
    out.push({ id: 'c3', ep: ep, title: tx('c3'), hero: { v: top[0].name || tx('untitled'), alt: tx('activity', { n: 1 }), priv: true, l: tx('c3h') + ' · ' + fmtDur(top[0].min) }, rows: rows3, calc: tx('calc3') });
    var pv = S.planVsDone;
    if (S.enough.planVsDone) out.push({ id: 'c4', ep: ep, title: tx('c4'), hero: { v: Math.round(pv.rate * 100) + '%', l: tx('c4h') }, rows: [
      { l: tx('past'), v: String(pv.eligible) }, { l: tx('marked'), v: String(pv.done), p: pv.done / pv.eligible }, { l: tx('markedT'), v: fmtDur(pv.doneMin) + ' / ' + fmtDur(pv.eligibleMin) }], note: tx('c4n'), calc: tx('calc4', { a: pv.eligible, b: pv.done }) });
    else out.push({ id: 'c4', ep: ep, title: tx('c4'), rows: [], note: tx('emptyC', { a: S.min.markable, x: pv.eligible }), calc: tx('calc4', { a: pv.eligible, b: pv.done }) });
    var rows5 = [], ms = modes();
    if (ms.indexOf('study') >= 0) { if (T.f.n) rows5.push({ l: tx('classT'), v: fmtDur(T.f.min) }); if (S.tasksDone != null) rows5.push({ l: tx('tasks'), v: String(S.tasksDone) }); }
    if (ms.indexOf('work') >= 0) { rows5.push({ l: tx('longest'), v: fmtDur(S.longest.min), sub: S.longest.name || tx('untitled') }); if (S.busiestWeek) rows5.push({ l: tx('bweek'), v: fmtDur(S.busiestWeek.min), sub: tx('weekOf', { d: dnLabel(S.busiestWeek.startDn) }), subPublic: true }); }
    if (ms.indexOf('life') >= 0) { rows5.push({ l: tx('streak'), v: tx('days', { n: S.streak }) }); rows5.push({ l: tx('free'), v: String(S.freeEvenings) }); }
    if (rows5.length) out.push({ id: 'c5', ep: ep, title: tx('c5'), rows: rows5, calc: tx('calc5') });
    return out;
  }

  // ---------- DOM ----------
  var ov, body, st, cur = 0, list = [], S0 = null, blobUrl = null;
  function cardEl(c) {
    var a = node('article', 'w2-card w2-' + c.id); a.append(node('div', 'w2-eyebrow', c.ep), node('h3', null, c.title));
    if (c.hero) { var h = node('div', 'w2-hero'); h.append(node('b', null, c.hero.v), node('span', null, c.hero.l)); a.append(h); }
    c.rows.forEach(function (r) { var row = node('div', 'w2-row' + (r.group ? ' w2-group' : '')), t = node('div', 'w2-rt'); t.append(node('span', 'w2-l', r.l), node('span', 'w2-v', r.v)); row.append(t);
      if (r.sub) row.append(node('small', 'w2-sub', r.sub));
      if (r.p != null) { var bar = node('i', 'w2-bar'), f = node('u'); f.style.setProperty('--p', Math.max(0.02, Math.min(1, r.p)).toFixed(3)); bar.append(f); row.append(bar); } a.append(row); });
    if (c.note) a.append(node('p', 'w2-note', c.note));
    if (c.calc) { var d = node('details', 'w2-calc'); d.append(node('summary', null, tx('calcQ')), node('p', null, c.calc)); a.append(d); }
    return a;
  }
  function close() { if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; } if (ov) { ov.remove(); ov = null; } document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (!ov) return; if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (!body.classList.contains('w2-exporting') && /^(ArrowLeft|ArrowRight)$/.test(e.key) && !/INPUT|SELECT/.test(document.activeElement.tagName)) go(e.key === 'ArrowLeft' ? -1 : 1); }
  function go(d) { cur = Math.max(0, Math.min(list.length - 1, cur + d)); showCard(); }
  var stage, dots, prevB, nextB, exportB, live;
  function showCard() {
    stage.replaceChildren(cardEl(list[cur])); live.textContent = tx('cardN', { i: cur + 1, n: list.length }) + ' — ' + list[cur].title;
    prevB.disabled = cur === 0; nextB.disabled = cur >= list.length - 1; exportB.disabled = list[cur].id === 'empty';
    dots.replaceChildren(); list.forEach(function (c, i) { var b = node('button', 'w2-dot' + (i === cur ? ' on' : '')); b.type = 'button'; b.setAttribute('aria-label', tx('cardN', { i: i + 1, n: list.length })); b.onclick = function () { cur = i; showCard(); }; dots.append(b); });
  }
  function recompute() {
    try { S0 = stats(st); list = cards(S0, st); cur = Math.min(cur, list.length - 1); showCard(); }
    catch (e) { console.warn('Wrapped 2.0 failed, using classic', e); fallback(); }
  }
  function fallback() { close(); try { classic(); } catch (e) {} }
  function open() {
    if (ov) return;
    var now = new Date(); st = { kind: 'month', ym: now.getFullYear() + '-' + pad(now.getMonth() + 1), year: now.getFullYear() }; cur = 0;
    ov = node('div', 'mn-overlay w2-ov'); var panel = node('section', 'mn-modal w2-modal'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', tx('title'));
    var hd = node('div', 'mn-modal-head'), x = node('button', 'mn-close', '✕'); x.type = 'button'; x.setAttribute('aria-label', tx('close')); x.onclick = close; hd.append(node('h2', null, '🎧 ' + tx('title')), x);
    var ctl = node('div', 'w2-ctl'), seg = node('div', 'w2-seg'), bM = node('button', 'on', tx('month')), bY = node('button', null, tx('year')); bM.type = bY.type = 'button';
    var inM = node('input'); inM.type = 'month'; inM.value = st.ym; inM.max = st.ym; inM.setAttribute('aria-label', tx('pick'));
    var inY = node('select'); inY.setAttribute('aria-label', tx('pick')); inY.hidden = true; for (var y = now.getFullYear(); y > now.getFullYear() - 5; y--) { var o = node('option', null, String(y)); o.value = y; inY.append(o); }
    function setKind(k) { st.kind = k; bM.classList.toggle('on', k === 'month'); bY.classList.toggle('on', k === 'year'); bM.setAttribute('aria-pressed', k === 'month'); bY.setAttribute('aria-pressed', k === 'year'); inM.hidden = k !== 'month'; inY.hidden = k !== 'year'; cur = 0; recompute(); }
    bM.onclick = function () { setKind('month'); }; bY.onclick = function () { setKind('year'); };
    inM.onchange = function () { if (/^\d{4}-\d{2}$/.test(inM.value)) { st.ym = inM.value; cur = 0; recompute(); } }; inY.onchange = function () { st.year = +inY.value; cur = 0; recompute(); };
    seg.append(bM, bY); ctl.append(seg, inM, inY);
    body = node('div', 'w2-body'); stage = node('div', 'w2-stage'); live = node('div', 'w2-live'); live.setAttribute('aria-live', 'polite');
    var nav = node('div', 'w2-nav'); prevB = node('button', 'w2-arrow', '‹'); nextB = node('button', 'w2-arrow', '›'); prevB.type = nextB.type = 'button'; prevB.setAttribute('aria-label', tx('prev')); nextB.setAttribute('aria-label', tx('next'));
    prevB.onclick = function () { go(-1); }; nextB.onclick = function () { go(1); }; dots = node('div', 'w2-dots'); nav.append(prevB, dots, nextB);
    exportB = node('button', 'mn-primary', '📷 ' + tx('export')); exportB.type = 'button'; exportB.onclick = openExport;
    var cl = node('button', 'w2-link', tx('classic')); cl.type = 'button'; cl.onclick = function () { fallback(); };
    hint2 = node('p', 'mn-hint', tx('local')); nav2 = nav; cl2 = cl; body.append(stage, nav, exportB, hint2, cl, live);
    panel.append(hd, ctl, body); ov.append(panel); ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); document.body.appendChild(ov); document.addEventListener('keydown', onKey);
    recompute(); x.focus();
  }

  // ---------- 导出：隐私预览 + 9:16 PNG（canvas，本机生成） ----------
  var GRAD = { c1: ['#2a1f5c', '#c0397c'], c2: ['#14305e', '#2b86a8'], c3: ['#3d1f4f', '#d2534f'], c4: ['#12433a', '#3a9a6c'], c5: ['#4a2a1a', '#d9822b'], empty: ['#2a2a3a', '#55556a'] };
  function wrapText(x, text, maxW) {
    var lines = [], cur = '', words = String(text).split(/(\s+)/);
    words.forEach(function (w) { if (x.measureText(w).width > maxW) { w.split('').forEach(function (ch) { if (x.measureText(cur + ch).width > maxW && cur) { lines.push(cur.trim()); cur = ''; } cur += ch; }); } else if (x.measureText(cur + w).width > maxW && cur.trim()) { lines.push(cur.trim()); cur = w.replace(/^\s+/, ''); } else cur += w; });
    if (cur.trim()) lines.push(cur.trim()); return lines;
  }
  function loadBuddy() { return new Promise(function (res) { try { if (!window.MochiBuddyArt) return res(null); var im = new Image(), done = false; function fin(v) { if (!done) { done = true; res(v); } } im.onload = function () { fin(im); }; im.onerror = function () { fin(null); }; setTimeout(function () { fin(null); }, 900); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.MochiBuddyArt.svg(list[cur] && list[cur].id === 'c4' ? 'happy' : 'idle')); } catch (e) { res(null); } }); }
  function drawPNG(c, hide) {
    return loadBuddy().then(function (buddy) {
      var W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d'), F = 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif', g = GRAD[c.id] || GRAD.c1;
      var bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, g[0]); bg.addColorStop(1, g[1]); x.fillStyle = bg; x.fillRect(0, 0, W, H);
      x.textBaseline = 'alphabetic'; x.fillStyle = '#fff'; x.font = '700 38px ' + F; x.fillText(c.ep, 80, 150);
      if (buddy) x.drawImage(buddy, W - 80 - 190, 70, 190, 190);
      x.font = '800 76px ' + F; var y = 290; wrapText(x, c.title, W - 160 - (buddy ? 210 : 0)).slice(0, 3).forEach(function (l) { x.fillText(l, 80, y); y += 92; });
      y += 20;
      if (c.hero) { var hv = hide && c.hero.priv ? c.hero.alt : c.hero.v, fs = 190; do { x.font = '800 ' + fs + 'px ' + F; fs -= 6; } while (x.measureText(hv).width > W - 160 && fs > 60); y += fs + 20; x.fillText(hv, 80, y); x.font = '500 44px ' + F; x.fillStyle = 'rgba(255,255,255,.88)'; y += 30; wrapText(x, c.hero.l, W - 160).slice(0, 2).forEach(function (l) { y += 56; x.fillText(l, 80, y); }); y += 60; x.fillStyle = '#fff'; }
      // 行多时按剩余高度压缩行距（字号不变），保证不压到页脚
      var rowsD = c.rows.slice(0, 8), natural = 0; rowsD.forEach(function (r) { natural += 70 + ((r.sub && (!hide || r.subPublic)) ? 46 : 0) + (r.p != null ? 48 : 0) + 26; });
      var noteH = c.note ? 14 + 48 * 4 : 0, kk2 = Math.max(0.6, Math.min(1, (H - 190 - y - noteH) / (natural || 1)));
      rowsD.forEach(function (r) {
        var label = hide && r.priv ? r.alt : r.l; x.font = '600 44px ' + F; x.fillStyle = '#fff'; x.textAlign = 'left';
        var vW = (x.font = '800 46px ' + F, x.measureText(r.v).width), maxL = W - 160 - vW - 30; x.font = '600 44px ' + F; var ll = wrapText(x, label, maxL)[0] || '';
        y += 70 * kk2; x.fillText(ll, 80, y); x.font = '800 46px ' + F; x.textAlign = 'right'; x.fillText(r.v, W - 80, y); x.textAlign = 'left';
        if (r.sub && !hide || r.sub && r.subPublic) { x.font = '500 34px ' + F; x.fillStyle = 'rgba(255,255,255,.8)'; y += 46 * kk2; x.fillText(wrapText(x, r.sub, W - 160)[0], 80, y); x.fillStyle = '#fff'; }
        if (r.p != null) { y += 28 * kk2; x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.roundRect(80, y, W - 160, 20, 10); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.roundRect(80, y, Math.max(20, (W - 160) * Math.min(1, r.p)), 20, 10); x.fill(); y += 20; }
        y += 26 * kk2;
      });
      if (c.note) { x.font = '500 36px ' + F; x.fillStyle = 'rgba(255,255,255,.88)'; y += 14; wrapText(x, c.note, W - 160).slice(0, 4).forEach(function (l) { y += 48; x.fillText(l, 80, y); }); }
      x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '500 32px ' + F; x.fillText(tx('foot'), 80, H - 90);
      return new Promise(function (res, rej) { cv.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob')); }, 'image/png'); });
    });
  }
  function openExport() {
    var c = list[cur], hide = true, blob = null; body.classList.add('w2-exporting'); var normal = [stage, nav2, exportB, hint2, cl2]; normal.forEach(function (e) { e.hidden = true; }); var xp = node('div', 'w2-xp');
    var t = node('h3', 'w2-ex-t', tx('preview')), lab = node('label', 'tp w2-hide'), cb = node('input'); cb.type = 'checkbox'; cb.checked = true; var d = node('div', 'n', tx('hide')); d.append(node('small', null, tx('hideD'))); lab.append(cb, d);
    var img = node('img', 'w2-prev'); img.alt = tx('preview'); var err = node('p', 'w2-err'); err.setAttribute('role', 'alert');
    var row = node('div', 'w2-ex-row'), back = node('button', 'mn-btn', tx('back')), save = node('button', 'mn-primary', tx('save')), share = node('button', 'mn-btn', tx('share')); back.type = save.type = share.type = 'button';
    row.append(back, save); var canShare = false; function name() { return 'mochi-wrapped-' + (st.kind === 'year' ? st.year : st.ym) + '-' + c.id + '.png'; }
    function render() { err.textContent = ''; save.disabled = share.disabled = true; drawPNG(c, cb.checked).then(function (b) { blob = b; if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = URL.createObjectURL(b); img.src = blobUrl; save.disabled = share.disabled = false;
      try { canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([b], name(), { type: 'image/png' })] })); } catch (e) { canShare = false; } if (canShare && !share.parentNode) row.append(share); }).catch(function () { err.textContent = tx('err'); }); }
    cb.onchange = render;
    back.onclick = function () { body.classList.remove('w2-exporting'); xp.remove(); normal.forEach(function (e) { e.hidden = false; }); showCard(); exportB.focus(); };
    save.onclick = function () { if (!blob) return; var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name(); document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000); };
    share.onclick = function () { if (!blob) return; navigator.share({ files: [new File([blob], name(), { type: 'image/png' })], title: 'Mochi Wrapped' }).catch(function () {}); };
    xp.append(t, lab, img, err, row, node('p', 'mn-hint', tx('local'))); body.append(xp); render(); cb.focus();
  }
  var nav2, hint2, cl2;

  // ---------- 接管入口 + 设置开关 ----------
  NX.openWrapped = function () { if (!P.on) return classic(); try { open(); } catch (e) { console.warn('Wrapped 2.0 failed, using classic', e); close(); classic(); } };
  NX.openWrappedClassic = classic;
  function buildSettings() {
    var sec = document.querySelector('#v-se .sec[data-sec="look"]'); if (!sec || sec.querySelector('.w2-set')) return;
    sec.appendChild(node('h3', 'hs w2-set', '🎧 ' + tx('setT')));
    var l = node('label', 'tp'), i = node('input'); i.type = 'checkbox'; i.checked = P.on; var d = node('div', 'n', tx('setT')); d.append(node('small', null, tx('setD'))); l.append(i, d); i.onchange = function () { P.on = i.checked; savePrefs(); }; sec.appendChild(l);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildSettings); else buildSettings();
  window.MochiWrapped2 = { open: open, prefs: function () { return { on: P.on }; }, _cards: function (st0) { return cards(stats(st0), st0); } };
})();
