// 外观：亮色 / 暗色 / 跟随系统 + 主题色（预设或自选）
function hexRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbHex(r){return '#'+r.map(function(v){return pad2(Math.round(Math.max(0,Math.min(255,v))).toString(16))}).join('')}
function mixHex(a,b,t){var x=hexRgb(a),y=hexRgb(b);return rgbHex([0,1,2].map(function(i){return x[i]*(1-t)+y[i]*t}))}
function lumHex(h){return hexRgb(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce(function(s,v,i){return s+v*[.2126,.7152,.0722][i]},0)}
var DEF_ACC='#ff8f4d';
function applyTheme(){
  var r=document.documentElement;
  if(SET.theme==='light'||SET.theme==='dark')r.setAttribute('data-theme',SET.theme);else r.removeAttribute('data-theme');
  var a=SET.acc,ps=['--pri','--pri2','--pri3','--onpri'];
  if(/^#[0-9a-f]{6}$/i.test(a||'')&&a.toLowerCase()!==DEF_ACC){
    r.style.setProperty('--pri',a);r.style.setProperty('--pri2',mixHex(a,'#ffffff',.35));
    r.style.setProperty('--pri3',mixHex(a,'#ff7aa2',.6));
    r.style.setProperty('--onpri',lumHex(a)>.45?'#2b211d':'#ffffff');
  }else ps.forEach(function(p){r.style.removeProperty(p)});
}
applyTheme();
