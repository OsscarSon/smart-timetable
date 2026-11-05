// 一键检查：所有 JS 语法、index.html 引用的脚本都存在、每个 data-lib 都在打包脚本里登记了。
// 用法：node scripts/check.mjs（出错会以非 0 退出）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';

let bad = 0;
const fail = m => { console.error('✗ ' + m); bad++; };
const files = [...readdirSync('js').filter(f => f.endsWith('.js')).map(f => 'js/' + f),
  ...readdirSync('api').filter(f => f.endsWith('.js')).map(f => 'api/' + f), 'sw.js'];
for (const f of files) {
  try { new Script(readFileSync(f, 'utf8'), { filename: f }); } catch (e) { fail(`${f} 语法错误：${e.message}`); }
}
const html = readFileSync('index.html', 'utf8');
for (const m of html.matchAll(/<script[^>]*\ssrc="(js\/[^"]+)"/g)) if (!existsSync(m[1])) fail(`index.html 引用了不存在的 ${m[1]}`);
const build = readFileSync('scripts/build-www.mjs', 'utf8');
for (const m of html.matchAll(/data-lib="([^"]+)"/g)) {
  if (!build.includes(`'${m[1]}'`) && !new RegExp(`\\b${m[1]}\\s*:`).test(build)) fail(`data-lib="${m[1]}" 没有登记到 scripts/build-www.mjs 的 LIBS`);
}
try { JSON.parse(readFileSync('manifest.json', 'utf8')); } catch (e) { fail('manifest.json 不是有效 JSON'); }
console.log(bad ? `\n${bad} 个问题` : `✓ 通过（${files.length} 个 JS 文件）`);
process.exit(bad ? 1 : 0);
