// 找出还没有译文的界面文字 → js/lang-static.js。运行时只有这些“写死在代码 / 页面里”的文字才会交给翻译模型，
// 用户自己输入的内容（课程名、作业…）不会被机翻。新增界面文字后重新运行：node scripts/extract-i18n.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const win = {}; vm.createContext(win); win.window = win;
for (const f of ['js/lang-ui.js', 'js/lang-msg.js']) vm.runInContext(readFileSync(f, 'utf8'), win);
const have = new Set([...(win.I18N || []), ...(win.I18N_X || [])].map(r => r[0]));
const CJK = /[\u4e00-\u9fff]/, out = new Set();
const add = s => { s = s.replace(/\\n/g, '\n').replace(/\\(['"`\\])/g, '$1'); s.split('\n').forEach(l => { l = l.trim(); if (CJK.test(l) && l.length <= 80 && !have.has(l) && !/\$\{|<[a-z]/i.test(l)) out.add(l); }); };
const skip = new Set(['i18n.js', 'lang-ui.js', 'lang-msg.js', 'lang-static.js', 'about.js', 'rate.js', 'faq.js']);
for (const f of readdirSync('js').filter(f => !skip.has(f))) {
  const src = readFileSync('js/' + f, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) if (CJK.test(m[2])) add(m[2]);
}
const html = readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
for (const m of html.matchAll(/>([^<>]*[\u4e00-\u9fff][^<>]*)</g)) add(m[1]);
for (const m of html.matchAll(/\b(?:placeholder|title|aria-label|alt)="([^"]*[\u4e00-\u9fff][^"]*)"/g)) add(m[1]);
const list = [...out];
writeFileSync('js/lang-static.js', '// 自动生成（node scripts/extract-i18n.mjs）：词典里还没有译文的界面文字，运行时交给翻译模型。\nwindow.I18N_STATIC = ' + JSON.stringify(list) + ';\n');
console.log('已生成 js/lang-static.js：' + list.length + ' 条');
