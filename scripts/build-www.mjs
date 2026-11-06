// 把网页文件复制到 www/，并把 index.html 里的 CDN 脚本换成本地 vendor/ 文件（手机 App 要能离线启动）。
// 用法：先 npm i（package.json 里已列好所有库，含字体 lxgw-wenkai-webfont），再 npm run build:www
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const LIBS = { // data-lib 名 → [npm 包名, 包内文件的候选路径]
  dayjs:    ['dayjs',                ['dayjs.min.js']],
  rrule:    ['rrule',                ['dist/es5/rrule.min.js']],
  'ts-fsrs':['ts-fsrs',              ['dist/index.umd.js', 'dist/index.umd.cjs']],
  dexie:    ['dexie',                ['dist/dexie.min.js']],
  supabase: ['@supabase/supabase-js',['dist/umd/supabase.js']],
  'chart.js':['chart.js',            ['dist/chart.umd.js']],
  'lz-string':['lz-string',          ['libs/lz-string.min.js']],
  qrcode:   ['qrcode-generator',     ['qrcode.js']],
  ical:     ['ical.js',              ['build/ical.min.js']],
  lucide:   ['lucide',               ['dist/umd/lucide.min.js']],
};
rmSync('www', { recursive: true, force: true });
mkdirSync('www/vendor', { recursive: true });
for (const f of ['index.html', 'sw.js', 'manifest.json']) cpSync(f, join('www', f));
for (const d of ['css', 'js', 'icons']) cpSync(d, join('www', d), { recursive: true });

let html = readFileSync('www/index.html', 'utf8');
for (const [name, [pkg, cands]] of Object.entries(LIBS)) {
  const hit = cands.map(c => join('node_modules', pkg, c)).find(existsSync);
  if (!hit) { console.error(`找不到 ${name}：请先 npm i -D ${pkg}（查过 ${cands.join('、')}）`); process.exit(1); }
  cpSync(hit, `www/vendor/${name}.js`);
  html = html.replace(new RegExp(`(<script data-lib="${name}" src=")[^"]+(")`), `$1vendor/${name}.js$2`);
}

// 字体：霞鹜文楷 LXGW WenKai（SIL OFL 1.1）。把 index.html 里 CDN 的 css 换成本地 vendor/lxgw/，并只复制 css 里实际引用的 woff2 切片（常规 + 粗体）。
const FONT_PKG = join('node_modules', 'lxgw-wenkai-webfont'), FONT_CSS = ['lxgwwenkai-regular.css', 'lxgwwenkai-bold.css'];
if (!existsSync(FONT_PKG)) { console.error('找不到字体包：请先 npm i -D lxgw-wenkai-webfont'); process.exit(1); }
let nFont = 0;
for (const css of FONT_CSS) {
  const src = join(FONT_PKG, css);
  if (!existsSync(src)) { console.error(`字体包里没有 ${css}（包结构变了？看 ${FONT_PKG} 里有哪些 .css）`); process.exit(1); }
  mkdirSync('www/vendor/lxgw', { recursive: true });
  cpSync(src, join('www/vendor/lxgw', css));
  for (const m of readFileSync(src, 'utf8').matchAll(/url\(["']?([^)"']+)["']?\)/g)) {
    const u = m[1]; if (/^(https?:|data:)/.test(u)) continue;
    const from = join(FONT_PKG, u), to = join('www/vendor/lxgw', u);
    if (!existsSync(from)) { console.error(`${css} 引用了不存在的字体文件：${u}`); process.exit(1); }
    mkdirSync(dirname(to), { recursive: true }); cpSync(from, to); nFont++;
  }
}
writeFileSync('www/vendor/lxgw/LICENSE.txt', 'LXGW WenKai (霞鹜文楷) — SIL Open Font License 1.1\nFont: https://github.com/lxgw/LxgwWenKai\nWebfont packaging: https://github.com/chawyehsu/lxgw-wenkai-webfont (MIT)\nOFL text: https://openfontlicense.org\n');
html = html.replace(/(<link data-font="lxgw"[^>]*href=")[^"]*\/(lxgwwenkai-[a-z]+\.css)(")/g, '$1vendor/lxgw/$2$3');
if (/data-font="lxgw"[^>]*cdn\.jsdelivr/.test(html)) { console.error('index.html 里的字体链接没换成本地文件'); process.exit(1); }
writeFileSync('www/index.html', html);

// 手机 App 里没有同域后端：把 apiBase 写进 www/js/config.js（只改 www/ 里的副本，不动源码，网页版照旧留空）。
// 用法：MOCHI_API_BASE=https://你的网址 npm run build:www（npm run android:setup 会自动带上）
const API = (process.env.MOCHI_API_BASE || '').trim().replace(/\/$/, '');
if (API) {
  const cp = 'www/js/config.js', c = readFileSync(cp, 'utf8');
  if (/apiBase:\s*''/.test(c)) { writeFileSync(cp, c.replace(/apiBase:\s*''/, `apiBase:'${API}'`)); console.log('apiBase 已写入 www/js/config.js：' + API); }
  else console.warn('⚠️ js/config.js 里的 apiBase 不是空的，没有覆盖。');
}
console.log(`www/ 已生成（库和 ${nFont} 个字体切片已换成本地文件）。${process.env.MOCHI_API_BASE ? '' : '没设 MOCHI_API_BASE：App 里的 AI / 同步会连不上后端。'}`);
