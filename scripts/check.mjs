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
if (/style="/.test(html)) fail('index.html 里还有内联 style');
console.log(bad ? `\n${bad} 个问题` : `✓ 通过（检查了 ${files.length} 个脚本、${refs.length} 个页面引用）`);
process.exit(bad ? 1 : 0);
