// 共用常量、状态与小工具（所有 js 文件共享）
var d=new Date();
var wk=['日','一','二','三','四','五','六'];
function pad2(x){return String(x).padStart(2,'0')}
function put2(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lget(k,def){try{var v=JSON.parse(localStorage.getItem(k));return v==null?def:v}catch(e){return def}}
function uid(){return Math.random().toString(36).slice(2,7)+Date.now().toString(36).slice(-4)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

// ---- 设置：ws 一周起始日(0=周一 5=周六 6=周日)，hw 隐藏周末，h24 24小时制，theme system/light/dark，acc 主题色 ----
var SET={h0:8,h1:22,fx:true,lead:10,ws:0,hw:false,h24:true,theme:'system',acc:'',wiz:false};
// 全新用户（本机还没有任何数据）才自动弹出首次向导
var FRESH=['mochi-set','mochi-wk','mochi-fx','mochi-st','mochi-tt','mochi-tts'].every(function(k){return localStorage.getItem(k)===null});
try{var s0=JSON.parse(localStorage.getItem('mochi-set')||'null');if(s0)for(var sk in s0)SET[sk]=s0[sk]}catch(e){}
var DAYS=['一','二','三','四','五','六','日'],H0=SET.h0,H1=SET.h1,COLS=['pink','mint','sky','lemon','peach'];

// ---- 日期工具：dayNum = 本地日期对应的“天序号”（1970-01-01 为 0，周四）----
var MS=864e5;
function dayNum(dt){return Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/MS)}
function mondayDn(dn){return dn-((dn+3)%7)}
function dnDate(dn){var x=new Date(dn*MS);return {y:x.getUTCFullYear(),m:x.getUTCMonth()+1,d:x.getUTCDate(),dn:dn,wd:(dn+3)%7}}
function isoOf(dn){var x=dnDate(dn);return x.y+'-'+pad2(x.m)+'-'+pad2(x.d)}
function dnFromIso(s){var p=String(s||'').split('-');if(p.length<3||!+p[0])return null;return Math.floor(Date.UTC(+p[0],+p[1]-1,+p[2])/MS)}
var todayDn=dayNum(d),todayIdx=(d.getDay()+6)%7;
document.getElementById('today').textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 · 星期'+wk[d.getDay()];

// ---- 周：week 编号随“一周起始日”变化；data 永远是“正在看的那一周”，所有周存在 WK 里 ----
function weekNum(dt){return Math.floor((dayNum(dt)+3-SET.ws)/7)}
function wsDn(w){return w*7-3+SET.ws}                       // 第 w 周第一列的 dayNum
function dnOf(w,wd){return wsDn(w)+((wd-SET.ws+7)%7)}      // 第 w 周里“星期 wd”的 dayNum
function wkDay(w,wd){return dnDate(dnOf(w,wd))}
function posDay(p){return (SET.ws+p)%7}                     // 第 p 列是星期几
function hiddenDay(wd){return !!SET.hw&&wd>=5}
function visDays(){var o=[];for(var p=0;p<7;p++){var wd=posDay(p);if(!hiddenDay(wd))o.push(wd)}return o}
// 12/24 小时制
function tmin(m){var H=Math.floor(m/60),M=m%60;if(SET.h24)return pad2(H)+':'+pad2(M);return ((H%12)||12)+':'+pad2(M)+(H<12||H===24?'am':'pm')}
function hm(h){return SET.h24?h+':00':((h%12)||12)+(h<12||h===24?'am':'pm')}

// ---- 多课表：每个课表有自己的安排、固定课、重复活动、作业；main 沿用旧 key，老用户数据不会丢 ----
function defPer(){var p=[],t=8*60;for(var i=0;i<8;i++){p.push({s:t,e:t+45});t+=55}return p}
var TTS=lget('mochi-tts',null);
if(!TTS||!TTS.list||!TTS.list.length)TTS={active:'main',list:[{id:'main',name:'学校',arch:false,cyc:1,anc:mondayDn(todayDn),per:defPer()}]};
var TT=TTS.list.filter(function(t){return t.id===TTS.active&&!t.arch})[0]||TTS.list.filter(function(t){return !t.arch})[0]||TTS.list[0];
TTS.active=TT.id;
function ttSave(){put2('mochi-tts',TTS)}
function tkOf(base,id){return id==='main'?base:base+'-'+id}
function tk(base){return tkOf(base,TT.id)}
var K_WK=tk('mochi-wk'),K_FX=tk('mochi-fx'),K_DN=tk('mochi-dn'),K_RP=tk('mochi-rp'),K_HW=tk('mochi-hw');

var DN=lget(K_DN,{});
function kk(x,w){return (w===undefined?curW:w)+'-'+x.day+'-'+x.h+'-'+x.t}
var thisW=weekNum(d),curW=thisW,WK=lget(K_WK,null)||{};
if(TT.id==='main'){var oldTT=lget('mochi-tt',null);if(oldTT&&!Object.keys(WK).length)WK[thisW]=oldTT}
var data=WK[curW]||[];WK[curW]=data;
var grid=document.getElementById('grid'),cur=null,col='pink';
function save(){WK[curW]=data;put2(K_WK,WK)}
function gotoWeek(w){WK[curW]=data;curW=w;data=WK[w]||[];WK[w]=data}
function startPos(){return curW===thisW?(todayIdx-SET.ws+7)%7:(curW>thisW?0:7)}   // 从第几列开始可排（过去的不排）
function dayOffset(wd){return dnOf(curW,wd)-todayDn}

// ---- 固定课程 FX：{id,day,s,e,t,room,teacher,type,wk,c}，s/e 为当天分钟数；wk 为循环周序号（空=每周）----
var FX=lget(K_FX,[]);
FX.forEach(function(x){
  if(x.s===undefined){x.s=(x.h||0)*60;x.e=((x.h||0)+(x.len||1))*60;delete x.h;delete x.len}
  if(!x.id)x.id=uid();if(!x.c)x.c='sky';if(!x.type)x.type='课';x.room=x.room||'';x.teacher=x.teacher||'';
});
function fxSave(){put2(K_FX,FX)}
// ---- 重复活动 RP：{id,day,h,len,t,c,a0(首次日期),ev(每几周),un(截止日期,可空),sk(跳过的日期)} ----
var RP=lget(K_RP,[]);
function rpSave(){put2(K_RP,RP)}

// ---- 占用判断：固定课程 + 重复活动当周的占位（由 recur.js 的 refreshBlocks 计算）----
var FXW=[],RPW=[];
function blkHit(x,day,h){return x.day===day&&h>=x.h&&h<x.h+x.len}
function fxHit(day,h,ign){
  if(FXW.some(function(x){return blkHit(x,day,h)}))return true;
  return RPW.some(function(x){return !(ign&&ign.rp&&x.rp===ign.rp)&&blkHit(x,day,h)})}
function covered(day,h,skip){return fxHit(day,h,skip)||data.some(function(x){return x!==skip&&x.day===day&&h>=x.h&&h<x.h+x.len})}
function free(day,h,len,ignore){
  if(hiddenDay(day))return false;
  for(var i=0;i<len;i++){if(h+i>=H1)return false;if(fxHit(day,h+i,ignore))return false;
    if(data.some(function(x){return x!==ignore&&x.day===day&&h+i>=x.h&&h+i<x.h+x.len}))return false}return true}
