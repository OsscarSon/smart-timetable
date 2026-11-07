// 发布前自检：所有 js 语法、index.html 引用的脚本都存在、sw.js 预缓存清单和 js/ 目录一致、图标都在。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
let bad = 0; const fail = m => { console.error('✗ ' + m); bad++; };
const files = [...readdirSync('js').map(f => 'js/' + f), ...readdirSync('api').map(f => 'api/' + f), 'sw.js'].filter(f => f.endsWith('.js'));
for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail('语法错误：' + f + '\n' + String(e.stderr).split('\n').slice(0, 4).join('\n')); } }
const html = readFileSync('index.html', 'utf8');
const refs = [...html.matchAll(/<script[^>]+src="(js\/[^"]+)"/g)].map(m => m[1]);
for (const r of refs) if (!existsSync(r)) fail('index.html 引用了不存在的文件：' + r);
const sw = readFileSync('sw.js', 'utf8');
for (const r of refs) { const n = r.replace('js/', '').replace('.js', ''); if (!sw.includes("'" + n + "'")) fail('sw.js 预缓存清单缺少：' + r); }
for (const i of ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'manifest.json']) if (!existsSync(i)) fail('缺少 ' + i);
// 样式表也必须在 sw.js 预缓存里
for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(css\/[^"]+)"/g)) { if (!existsSync(m[1])) fail('index.html 引用了不存在的样式：' + m[1]); else if (!sw.includes("'" + m[1] + "'")) fail('sw.js 预缓存清单缺少：' + m[1]); }
// Goals（Phase 1）边界：只能读写 goals-* 键，唯一允许读取的旧键是 mochi-st；不得碰云同步 / Undo / 日历写入；三种语言键必须一致
if (existsSync('js/goals.js')) {
  const g = readFileSync('js/goals.js', 'utf8');
  for (const m of g.matchAll(/['"`](mochi-[A-Za-z0-9:_-]*)/g)) if (m[1] !== 'mochi-st' && m[1] !== 'mochi-goals') fail('goals.js 访问了不允许的旧键：' + m[1]);
  for (const w of ['Undo.', 'cloud.', 'put2(', 'saveWeek', 'data.push', 'WK[', 'fxSave', 'rpSave', 'hwSave', 'sync.js']) if (g.includes(w)) fail('goals.js 不应使用：' + w);
  const ks = (l) => { const sandbox = { window: {} }; new Function('window', readFileSync('js/lang-goals.js', 'utf8'))(sandbox.window); return Object.keys(sandbox.window.GOALS_I18N[l]).sort().join(','); };
  const en = ks('en'); for (const l of ['zh', 'ms']) if (ks(l) !== en) fail('lang-goals.js：' + l + ' 与 en 的键不一致');
  for (const m of g.matchAll(/\bt\('([A-Za-z_0-9]+)'/g)) if (!m[1].endsWith('_') && !en.split(',').includes(m[1])) fail('goals.js 用了没有翻译的键：' + m[1]);
}
if (/style="/.test(html)) fail('index.html 里还有内联 style');
console.log(bad ? `\n${bad} 个问题` : `✓ 通过（检查了 ${files.length} 个脚本、${refs.length} 个页面引用）`);
process.exit(bad ? 1 : 0);
