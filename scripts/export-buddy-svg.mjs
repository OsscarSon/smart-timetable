// 把 js/buddy-art.js 里的 8 种状态导出成独立 .svg（assets/buddy/）+ 一张预览页 buddy-sheet.html。
// 用途：给设计师描摹/分层，作为以后做 Rive 动画的起点；App 运行时并不读这些文件（角色已内联在 JS 里，离线可用）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const win = {}; new Function('window', readFileSync('js/buddy-art.js', 'utf8').replace(/typeof window !== 'undefined' \? window : globalThis/, 'window'))(win);
const A = win.MochiBuddyArt; mkdirSync('assets/buddy', { recursive: true });
for (const s of A.STATES) writeFileSync(`assets/buddy/${s}.svg`, A.svg(s, { title: 'Mochi Buddy · ' + s }));
const cells = A.STATES.map(s => `<figure><div>${A.svg(s)}</div><figcaption>${s}</figcaption></figure>`).join('');
writeFileSync('assets/buddy/buddy-sheet.html', `<!doctype html><meta charset="utf-8"><title>Mochi Buddy states</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;background:#fff4ec;font:600 14px system-ui;color:#4a3a35}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:760px;margin:auto}figure{margin:0;background:#fff;border-radius:16px;padding:12px;text-align:center}svg{width:100%;height:auto}@media(max-width:520px){.g{grid-template-columns:repeat(2,1fr)}}</style><div class="g">${cells}</div>`);
console.log('✓ 导出 ' + A.STATES.length + ' 个 SVG → assets/buddy/');
