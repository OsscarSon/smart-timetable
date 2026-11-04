// 共用常量、状态与小工具（所有 js 文件共享）
var d=new Date();
var wk=['日','一','二','三','四','五','六'];
document.getElementById('today').textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 · 星期'+wk[d.getDay()];
var SET={h0:8,h1:22,fx:true,lead:10};
try{var s0=JSON.parse(localStorage.getItem('mochi-set')||'null');if(s0)for(var sk in s0)SET[sk]=s0[sk]}catch(e){}
var DAYS=['一','二','三','四','五','六','日'],H0=SET.h0,H1=SET.h1,COLS=['pink','mint','sky','lemon','peach'];
var DN={};try{DN=JSON.parse(localStorage.getItem('mochi-dn')||'{}')}catch(e){}
function kk(x,w){return (w===undefined?curW:w)+'-'+x.day+'-'+x.h+'-'+x.t}
// ---- 周：data 永远是“正在看的那一周”，所有周存在 WK 里 ----
var MS=864e5;
function dayNum(dt){return Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/MS)}
function weekNum(dt){return Math.floor((dayNum(dt)+3)/7)}
function wkDay(w,i){var x=new Date((w*7-3+i)*MS);return {m:x.getUTCMonth()+1,d:x.getUTCDate()}}
var thisW=weekNum(d),curW=thisW,WK={};
try{WK=JSON.parse(localStorage.getItem('mochi-wk')||'null')||{}}catch(e){WK={}}
try{var oldTT=JSON.parse(localStorage.getItem('mochi-tt')||'null');if(oldTT&&!Object.keys(WK).length)WK[thisW]=oldTT}catch(e){}
var data=WK[curW]||[];WK[curW]=data;
var grid=document.getElementById('grid'),cur=null,col='pink';
function save(){WK[curW]=data;put2('mochi-wk',WK)}
function gotoWeek(w){WK[curW]=data;curW=w;data=WK[w]||[];WK[w]=data}
var todayIdx=(d.getDay()+6)%7;
function startDay(){return curW===thisW?todayIdx:(curW>thisW?0:7)}
function dayOffset(i){return (curW-thisW)*7+i-todayIdx}
function thisEvents(){return curW===thisW?data:(WK[thisW]||[])}
// ---- 固定课表：每周重复，占用的时间不会被排进别的活动 ----
var FX=[];try{FX=JSON.parse(localStorage.getItem('mochi-fx')||'[]')}catch(e){}
function fxHit(day,h){return !!SET.fx&&FX.some(function(x){return x.day===day&&h>=x.h&&h<x.h+x.len})}
function covered(day,h,skip){return fxHit(day,h)||data.some(function(x){return x!==skip&&x.day===day&&h>=x.h&&h<x.h+x.len})}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function pad2(x){return String(x).padStart(2,'0')}
function put2(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function free(day,h,len,ignore){for(var i=0;i<len;i++){if(h+i>=H1)return false;if(fxHit(day,h+i))return false;if(data.some(function(x){return x!==ignore&&x.day===day&&h+i>=x.h&&h+i<x.h+x.len}))return false}return true}
