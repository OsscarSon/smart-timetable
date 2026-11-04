// 把网页文件复制到 www/，并把 index.html 里的 CDN 脚本换成本地 vendor/ 文件（手机 App 要能离线启动）。
// 用法：先 npm i -D dayjs rrule ts-fsrs dexie @supabase/supabase-js chart.js lz-string qrcode-generator，再 npm run build:www
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LIBS = { // data-lib 名 → [npm 包名, 包内文件的候选路径]
  dayjs:    ['dayjs',                ['dayjs.min.js']],
  rrule:    ['rrule',                ['dist/es5/rrule.min.js']],
  'ts-fsrs':['ts-fsrs',              ['dist/index.umd.js', 'dist/index.umd.cjs']],
  dexie:    ['dexie',                ['dist/dexie.min.js']],
  supabase: ['@supabase/supabase-js',['dist/umd/supabase.js']],
  'chart.js':['chart.js',            ['dist/chart.umd.js']],
  'lz-string':['lz-string',          ['libs/lz-string.min.js']],
  qrcode:   ['qrcode-generator',     ['qrcode.js']],
};
rmSync('www', { recursive: true, force: true });
mkdirSync('www/vendor', { recursive: true });
for (const f of ['index.html', 'sw.js']) cpSync(f, join('www', f));
for (const d of ['css', 'js']) cpSync(d, join('www', d), { recursive: true });

let html = readFileSync('www/index.html', 'utf8');
for (const [name, [pkg, cands]] of Object.entries(LIBS)) {
  const hit = cands.map(c => join('node_modules', pkg, c)).find(existsSync);
  if (!hit) { console.error(`找不到 ${name}：请先 npm i -D ${pkg}（查过 ${cands.join('、')}）`); process.exit(1); }
  cpSync(hit, `www/vendor/${name}.js`);
  html = html.replace(new RegExp(`(<script data-lib="${name}" src=")[^"]+(")`), `$1vendor/${name}.js$2`);
}
writeFileSync('www/index.html', html);
console.log('www/ 已生成（库已换成本地文件）。别忘了在 js/config.js 填 apiBase。');
