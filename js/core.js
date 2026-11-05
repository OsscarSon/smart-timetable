// 共用常量、状态与小工具（所有 js 文件共享）
var d=new Date();
var wk=['日','一','二','三','四','五','六'];
function pad2(x){return String(x).padStart(2,'0')}
function put2(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lget(k,def){try{var v=JSON.parse(localStorage.getItem(k));return v==null?def:v}catch(e){return def}}
function uid(){return Math.random().toString(36).slice(2,7)+Date.now().toString(36).slice(-4)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

// ---- 设置：ws 一周起始日(0=周一 5=周六 6=周日)，hw 隐藏周末，h24 24小时制，theme system/light/dark，acc 主题色 ----
// v7 新增：snap 周视图吸附分钟(15/30)，dens 视图密度(compact/std/roomy)，wkc 折叠周末列，sr/st 列表里显示教室/老师，
//        lead 课前提醒分钟，hwn/hwt/hwe 作业截止提醒，snd 提示方式(sound/vib/quiet)
var SET={h0:8,h1:22,fx:true,lead:10,ws:0,hw:false,h24:true,theme:'system',acc:'',wiz:false,
  snap:15,dens:'std',wkc:false,sr:true,st:true,hwn:true,hwt:'08:00',hwe:true,snd:'sound'};
// 全新用户（本机还没有任何数据）才自动弹出首次向导
var FRESH=['mochi-set','mochi-wk','mochi-fx','mochi-st','mochi-tt','mochi-tts'].every(function(k){return localStorage.getItem(k)===null})&&
  !(function(){for(var i=0;i<localStorage.length;i++)if(localStorage.key(i).indexOf('mochi-wk:')===0)return true;return false})();
try{var s0=JSON.parse(localStorage.getItem('mochi-set')||'null');if(s0)for(var sk in s0)SET[sk]=s0[sk]}catch(e){}
var DAYS=['一','二','三','四','五','六','日'],H0=SET.h0,H1=SET.h1,COLS=['pink','mint','sky','lemon','peach'];
var HR={compact:44,std:56,roomy:72}[SET.dens]||56;     // 周视图每小时的高度(px)

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
function tmin(m){var H=Math.floor(m/60),M=m%60;if(SET.h24)return pad2(H)+':'+pad2(M);return ((H%12)||12)+':'+pad2(M)+(H%24<12?'am':'pm')}
function hm(h){return SET.h24?h+':00':((h%12)||12)+(h%24<12?'am':'pm')}
function snapMin(m,s){s=s||SET.snap||15;return Math.round(m/s)*s}
function min2t(m){return pad2(Math.floor(m/60))+':'+pad2(m%60)}                       // 给 <input type=time>
function t2min(s){var p=String(s||'').split(':');return p.length>=2&&p[0]!==''&&!isNaN(+p[0])?(+p[0])*60+(+p[1]):NaN}

// ---- 多课表：每个课表有自己的安排、固定课、重复活动、作业；main 沿用旧 key，老用户数据不会丢 ----
function defPer(){var p=[],t=8*60;for(var i=0;i<8;i++){p.push({s:t,e:t+45});t+=55}return p}
var TTS=lget('mochi-tts',null);
if(!TTS||!TTS.list||!TTS.list.length)TTS={active:'main',list:[{id:'main',name:'学校',arch:false,cyc:1,anc:mondayDn(todayDn),per:defPer()}]};
var TT=TTS.list.filter(function(t){return t.id===TTS.active&&!t.arch})[0]||TTS.list.filter(function(t){return !t.arch})[0]||TTS.list[0];
TTS.active=TT.id;
function ttSave(){put2('mochi-tts',TTS)}
function tkOf(base,id){return id==='main'?base:base+'-'+id}
function tk(base){return tkOf(base,TT.id)}
var K_FX=tk('mochi-fx'),K_DN=tk('mochi-dn'),K_RP=tk('mochi-rp'),K_HW=tk('mochi-hw');

// ---- 活动 / 重复活动：都用“当天分钟数” s、e 表示（v7 起支持任意分钟；旧数据的 h、len 在读取时自动换算）----
function normEv(x){if(x.s===undefined){var h=+x.h||0;x.s=h*60;x.e=(h+(+x.len||1))*60}delete x.h;delete x.len;return x}
function ovl(a,b){return a.s<b.e&&b.s<a.e}

// ---- 活动按周存储：每一周一个键 mochi-wk:<课表id>:<周号>，云同步时两台设备改不同的周不会互相覆盖 ----
// 旧版把所有周放在一个键 mochi-wk 里；第一次读取时自动拆开并删掉旧键。
function wkKeyOf(tid,w){return 'mochi-wk:'+tid+':'+w}
function weeksOf(tid){
  var out={},pre='mochi-wk:'+tid+':',ks=[],i,k;
  for(i=0;i<localStorage.length;i++){k=localStorage.key(i);if(k&&k.indexOf(pre)===0)ks.push(k)}
  ks.forEach(function(k){var w=+k.slice(pre.length),a=lget(k,[]);if(isFinite(w)&&a&&a.length)out[w]=a.map(normEv)});
  var old=tkOf('mochi-wk',tid),o=lget(old,null);
  if(o&&typeof o==='object'){
    Object.keys(o).forEach(function(w){if(out[w]===undefined&&(o[w]||[]).length){out[w]=o[w].map(normEv);put2(wkKeyOf(tid,w),out[w])}});
    try{localStorage.removeItem(old)}catch(e){}}
  return out}
function weekKeysOf(tid){var pre='mochi-wk:'+tid+':',ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(pre)===0)ks.push(k)}return ks}

// ---- 已完成标记：键 = 周-星期-开始分钟-标题（v7 前用的是开始整点，读取时一次性换算）----
var DN=lget(K_DN,{});
if(!DN.__v){var nd={__v:2};Object.keys(DN).forEach(function(k){var m=k.match(/^(-?\d+)-(\d)-(\d+)-(.*)$/);nd[m&&+m[3]<=24?m[1]+'-'+m[2]+'-'+(+m[3]*60)+'-'+m[4]:k]=DN[k]});DN=nd;put2(K_DN,DN)}
function kk(x,w){return (w===undefined?curW:w)+'-'+x.day+'-'+x.s+'-'+x.t}

var thisW=weekNum(d),curW=thisW,WK=weeksOf(TT.id);
if(TT.id==='main'){var oldTT=lget('mochi-tt',null);if(Array.isArray(oldTT)&&!Object.keys(WK).length){WK[thisW]=oldTT.map(normEv);put2(wkKeyOf('main',thisW),WK[thisW])}}
var data=WK[curW]||[];WK[curW]=data;
var grid=document.getElementById('grid'),cur=null,col='pink';
function saveWeek(w){var a=WK[w],k=wkKeyOf(TT.id,w);
  if(a&&a.length)put2(k,a);else{try{if(localStorage.getItem(k)!==null)localStorage.removeItem(k)}catch(e){}}}
function save(){WK[curW]=data;saveWeek(curW)}
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
// ---- 重复活动 RP：{id,day,s,e,t,c,a0(首次日期),ev(每几周),un(截止日期,可空),sk(跳过的日期)} ----
var RP=lget(K_RP,[]).map(normEv);
function rpSave(){put2(K_RP,RP)}

// ---- 占用判断：固定课程 + 重复活动当周的占位（由 recur.js 的 refreshBlocks 计算）；全部按分钟 ----
var FXW=[],RPW=[];
function fxHit(day,s,e,ign){
  var q={s:s,e:e};
  if(FXW.some(function(x){return x.day===day&&ovl(x,q)}))return true;
  return RPW.some(function(x){return !(ign&&ign.rp&&x.rp===ign.rp)&&x.day===day&&ovl(x,q)})}
function free(day,s,e,ignore){            // day 这天 s–e（分钟）有没有空；ignore 是正在编辑的那一项
  if(hiddenDay(day)||!(e>s)||s<H0*60||e>H1*60)return false;
  if(fxHit(day,s,e,ignore))return false;
  var q={s:s,e:e};
  return !data.some(function(x){return x!==ignore&&x.day===day&&ovl(x,q)})}
