// 外观：亮色 / 暗色 / 跟随系统 + 主题色（预设或自选）。并保证文字对比度：
// --onpri（主色按钮上的字）在黑 / 白里选对比度高的；--pri-ink（用主色写的文字）自动加深 / 提亮到至少 4.5:1。
function hexRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbHex(r){return '#'+r.map(function(v){return pad2(Math.round(Math.max(0,Math.min(255,v))).toString(16))}).join('')}
function mixHex(a,b,t){var x=hexRgb(a),y=hexRgb(b);return rgbHex([0,1,2].map(function(i){return x[i]*(1-t)+y[i]*t}))}
function lumHex(h){return hexRgb(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce(function(s,v,i){return s+v*[.2126,.7152,.0722][i]},0)}
function contrast(a,b){var x=lumHex(a),y=lumHex(b);if(x<y){var t=x;x=y;y=t}return (x+.05)/(y+.05)}
var DEF_ACC='#ff8f4d',INK_DARK='#2b211d';
function isDark(){return SET.theme==='dark'||(SET.theme!=='light'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)}
function applyTheme(){
  var r=document.documentElement;
  if(SET.theme==='light'||SET.theme==='dark')r.setAttribute('data-theme',SET.theme);else r.removeAttribute('data-theme');
  var a=SET.acc,custom=/^#[0-9a-f]{6}$/i.test(a||'')&&a.toLowerCase()!==DEF_ACC,pri=custom?a:DEF_ACC;
  if(custom){
    r.style.setProperty('--pri',a);r.style.setProperty('--pri2',mixHex(a,'#ffffff',.35));r.style.setProperty('--pri3',mixHex(a,'#ff7aa2',.6));
  }else['--pri','--pri2','--pri3'].forEach(function(p){r.style.removeProperty(p)});
  r.style.setProperty('--onpri',contrast(pri,'#ffffff')>=contrast(pri,INK_DARK)?'#ffffff':INK_DARK);
  var dark=isDark(),bg=dark?'#2b211d':'#ffffff',ink=pri,k=0;
  while(contrast(ink,bg)<4.5&&k++<20)ink=mixHex(ink,dark?'#ffffff':'#000000',.08);
  r.style.setProperty('--pri-ink',ink);
}
applyTheme();
if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme)}catch(e){}
