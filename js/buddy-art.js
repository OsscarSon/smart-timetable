// Mochi Buddy 角色矢量图（原创、纯 SVG、无外部素材）。一个函数按状态拼出同一只小麻薯兔，保证各表情比例/中心一致。
// 状态：idle blink thinking happy warning sleepy focus rest。无网络也能显示，同时是 Rive 动画出来之前的静态回退。
// 也被 scripts/export-buddy-svg.mjs 用来导出独立 .svg，方便设计师描摹/分层。
(function (root) {
  'use strict';
  var C = { line: '#8b5e46', body: '#fff7ea', ear: '#f9c9c0', blush: '#f4a9a0', ink: '#4a2f25', mouth: '#c9695f', amber: '#e8913c', sparkle: '#f0b25a', wood: '#c9966f', mug: '#f6cf94' };
  var STATES = ['idle', 'blink', 'thinking', 'happy', 'warning', 'sleepy', 'focus', 'rest'];

  function stroke(w) { return 'stroke="' + C.line + '" stroke-width="' + (w || 3) + '" stroke-linecap="round" stroke-linejoin="round"'; }
  function line(d, col, w) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 3) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function dot(x, y, r, fill) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"/>'; }

  // 眼睛：圆点 / 开心弧 / 闭眼弧
  function eyes(state) {
    var L = 44, R = 76, y = 70;
    if (state === 'happy') return line('M39 71 Q44 63 49 71', C.ink) + line('M71 71 Q76 63 81 71', C.ink);
    if (state === 'blink' || state === 'sleepy' || state === 'rest') return line('M39 69 Q44 75 49 69', C.ink) + line('M71 69 Q76 75 81 69', C.ink);
    var dx = state === 'thinking' ? 3 : 0, dy = state === 'thinking' ? -3 : 0;
    function one(x) { return '<g class="bd-eye"><circle cx="' + (x + dx) + '" cy="' + (y + dy) + '" r="4.4" fill="' + C.ink + '"/><circle cx="' + (x + dx + 1.4) + '" cy="' + (y + dy - 1.5) + '" r="1.3" fill="#fff"/></g>'; }
    var out = '<g class="bd-eyes">' + one(L) + one(R) + '</g>';
    if (state === 'warning') out += line('M37 65 L49 60', C.ink, 2.4) + line('M83 65 L71 60', C.ink, 2.4);  // 担心的八字眉（不是生气）
    return out;
  }
  function mouth(state) {
    if (state === 'happy') return '<path d="M53 79 Q60 92 67 79 Z" fill="' + C.mouth + '" stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round"/>';
    if (state === 'warning') return line('M52 84 Q56 79 60 84 T68 84', C.ink, 2.6);
    if (state === 'thinking') return line('M56 83 L64 82', C.ink, 2.6);
    if (state === 'sleepy') return '<ellipse cx="60" cy="83" rx="2.6" ry="3.2" fill="' + C.ink + '"/>';
    return line('M55 80 Q57.5 84 60 80 Q62.5 84 65 80', C.ink, 2.6);
  }
  function extras(state) {
    if (state === 'thinking') return line('M92 22 Q92 12 101 12 Q110 12 110 20 Q110 26 103 29 Q101 31 101 35', C.line, 3.4) + dot(101, 43, 2.6, C.line);
    if (state === 'warning') return line('M101 9 L101 28', C.amber, 6) + dot(101, 38, 3.6, C.amber);
    if (state === 'happy') return line('M96 26 L104 18', C.sparkle, 3) + line('M101 40 L111 38', C.sparkle, 3) + line('M24 26 L16 18', C.sparkle, 3) + line('M19 40 L9 38', C.sparkle, 3);
    if (state === 'sleepy') return line('M90 30 L100 30 L90 42 L100 42', C.line, 3.2) + line('M103 14 L110 14 L103 23 L110 23', C.line, 2.6);
    if (state === 'focus') return '<rect x="30" y="92" width="60" height="18" rx="5" fill="' + C.wood + '" ' + stroke(3) + '/>' + '<circle cx="60" cy="101" r="2.6" fill="' + C.body + '"/>';
    if (state === 'rest') return '<path d="M80 93 H100 V106 Q100 112 94 112 H86 Q80 112 80 106 Z" fill="' + C.mug + '" ' + stroke(3) + '/>' +
      line('M100 97 Q108 97 108 103 Q108 109 100 108', C.line, 3) + '<path d="M90 106 C86 102 86 99 90 99 C94 99 94 102 90 106Z" fill="#e87d7d"/>' +
      line('M86 88 Q84 84 87 81', C.line, 2) + line('M93 88 Q91 84 94 81', C.line, 2);
    return '';
  }
  // 返回完整 <svg> 字符串。opts.title 可选（无障碍用）。
  function svg(state, opts) {
    if (STATES.indexOf(state) < 0) state = 'idle';
    var title = opts && opts.title ? '<title>' + String(opts.title).replace(/[<&>]/g, '') + '</title>' : '';
    var paws = state === 'focus' ? '' : '<ellipse cx="38" cy="105" rx="9" ry="6" fill="' + C.body + '" ' + stroke(2.6) + '/><ellipse cx="82" cy="105" rx="9" ry="6" fill="' + C.body + '" ' + stroke(2.6) + '/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" data-state="' + state + '">' + title +
      '<ellipse cx="60" cy="113" rx="34" ry="5" fill="rgba(80,45,30,.16)"/>' +
      '<g class="bd-body">' +
      '<g transform="rotate(-10 40 34)"><ellipse cx="40" cy="30" rx="11" ry="21" fill="' + C.body + '" ' + stroke() + '/><ellipse cx="40" cy="32" rx="5" ry="13" fill="' + C.ear + '"/></g>' +
      '<g transform="rotate(10 80 34)"><ellipse cx="80" cy="30" rx="11" ry="21" fill="' + C.body + '" ' + stroke() + '/><ellipse cx="80" cy="32" rx="5" ry="13" fill="' + C.ear + '"/></g>' +
      '<path d="M60 31 C93 31 108 56 106 80 C105 100 88 109 60 109 C32 109 15 100 14 80 C12 56 27 31 60 31 Z" fill="' + C.body + '" ' + stroke() + '/>' +
      '<ellipse cx="32" cy="79" rx="8" ry="5" fill="' + C.blush + '" opacity=".75"/><ellipse cx="88" cy="79" rx="8" ry="5" fill="' + C.blush + '" opacity=".75"/>' +
      eyes(state) + mouth(state) + paws + extras(state) +
      '</g></svg>';
  }
  root.MochiBuddyArt = { svg: svg, STATES: STATES };
})(typeof window !== 'undefined' ? window : globalThis);
