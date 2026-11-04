// 重复规则与固定课程展开：把“规则”变成某一周里具体的占位块
// 块的格式统一为 {day,h,len,t,...}，day=星期(0=周一)，h=开始整点，len=占几个整点
function modp(a,n){return ((a%n)+n)%n}
// 假期：{id,n,a,b}，a/b 为起止 dayNum（含）。全局，不分课表。
var HOL=lget('mochi-hol',[]);
function holSave(){put2('mochi-hol',HOL)}
function isHol(dn){return HOL.some(function(h){return dn>=h.a&&dn<=h.b})}
// 复杂重复（rrule.js）：每月第 n 个星期几（n=-1 为最后一个）。r.mo 有值就走这条路。
function rrOK(){return !!(window.rrule&&window.rrule.RRule)}
function rrDays(r,w){                      // 第 w 周里这条规则出现的 dayNum 列表
  if(!rrOK())return [];
  var R=window.rrule.RRule,WD=[R.MO,R.TU,R.WE,R.TH,R.FR,R.SA,R.SU],a=wsDn(w);
  var o={freq:R.MONTHLY,byweekday:[WD[r.day].nth(r.mo)],dtstart:new Date(r.a0*MS)};
  if(r.un!=null)o.until=new Date(r.un*MS);
  try{return new R(o).between(new Date(a*MS),new Date((a+6)*MS),true).map(function(x){return Math.floor(x.getTime()/MS)})}
  catch(e){return []}}
// 日期是当月第几个这个星期几（1–5）
function nthOf(dn){return Math.ceil(dnDate(dn).d/7)}
// 某天落在多周循环的第几周（1 起）。循环以“周一”为界。
function cycIdx(dn){var n=TT.cyc||1;if(n<2)return 1;return modp(Math.floor((dn-(TT.anc||0))/7),n)+1}
// 固定课程：分钟 → 占用的整点区间（08:00–08:45 占 8 点；08:00–09:30 占 8、9 点）
function fxBlocks(w){
  var out=[];if(!SET.fx)return out;
  FX.forEach(function(x){
    var dn=dnOf(w,x.day);
    if(SET.fxh&&isHol(dn))return;
    if((x.d0!=null&&dn<x.d0)||(x.d1!=null&&dn>x.d1))return;     // 学期起止日期
    if(x.wk&&x.wk.length&&x.wk.indexOf(cycIdx(dn))<0)return;
    var h=Math.floor(x.s/60),len=Math.max(1,Math.ceil(x.e/60)-h);
    out.push({day:x.day,h:h,len:len,t:x.t,les:x,dn:dn});
  });
  return out}
// 重复活动：当周是否出现（每 ev 周一次，到 un 为止，跳过 sk 里的日期）
function rpBlocks(w){
  var out=[];
  RP.forEach(function(r){
    var days;
    if(r.mo)days=rrDays(r,w);              // 每月第几个星期几
    else{
      var dn0=dnOf(w,r.day);
      if(dn0<r.a0||(dn0-r.a0)%7!==0)return;
      if(r.un!=null&&dn0>r.un)return;
      if(((dn0-r.a0)/7)%r.ev!==0)return;
      days=[dn0]}
    days.forEach(function(dn){
      if(r.sk&&r.sk.indexOf(dn)>=0)return;
      if(r.xh&&isHol(dn))return;           // 假期里不出现
      out.push({day:r.day,h:r.h,len:r.len,t:r.t,c:r.c,rp:r,dn:dn})})
  });
  return out}
function refreshBlocks(){FXW=fxBlocks(curW);RPW=rpBlocks(curW)}
// “这周全部活动”：手动安排 + 重复活动（用于提醒、今日清单）
function thisEvents(){return curW===thisW?data.concat(RPW):(WK[thisW]||[]).concat(rpBlocks(thisW))}
// 给 AI 的“不可移动时段”：固定课程 + 重复活动
function fixedForAI(){
  return fxBlocks(curW).map(function(b){return {day:b.day,h:b.h,len:b.len,t:b.t,type:b.les.type}})
    .concat(rpBlocks(curW).map(function(b){return {day:b.day,h:b.h,len:b.len,t:b.t,type:'重复活动'}}))}
// 今天的课（按时间排序），用于“今天的安排”
function todayLessons(){
  return fxBlocks(thisW).filter(function(b){return b.day===todayIdx&&b.dn===todayDn}).map(function(b){return b.les})
    .sort(function(a,b){return a.s-b.s})}
