// 重复规则与固定课程展开：把“规则”变成某一周里具体的占位块
// 块的格式统一为 {day,h,len,t,...}，day=星期(0=周一)，h=开始整点，len=占几个整点
function modp(a,n){return ((a%n)+n)%n}
// 某天落在多周循环的第几周（1 起）。循环以“周一”为界。
function cycIdx(dn){var n=TT.cyc||1;if(n<2)return 1;return modp(Math.floor((dn-(TT.anc||0))/7),n)+1}
// 固定课程：分钟 → 占用的整点区间（08:00–08:45 占 8 点；08:00–09:30 占 8、9 点）
function fxBlocks(w){
  var out=[];if(!SET.fx)return out;
  FX.forEach(function(x){
    var dn=dnOf(w,x.day);
    if(x.wk&&x.wk.length&&x.wk.indexOf(cycIdx(dn))<0)return;
    var h=Math.floor(x.s/60),len=Math.max(1,Math.ceil(x.e/60)-h);
    out.push({day:x.day,h:h,len:len,t:x.t,les:x,dn:dn});
  });
  return out}
// 重复活动：当周是否出现（每 ev 周一次，到 un 为止，跳过 sk 里的日期）
function rpBlocks(w){
  var out=[];
  RP.forEach(function(r){
    var dn=dnOf(w,r.day);
    if(dn<r.a0||(dn-r.a0)%7!==0)return;
    if(r.un!=null&&dn>r.un)return;
    if(((dn-r.a0)/7)%r.ev!==0)return;
    if(r.sk&&r.sk.indexOf(dn)>=0)return;
    out.push({day:r.day,h:r.h,len:r.len,t:r.t,c:r.c,rp:r,dn:dn});
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
