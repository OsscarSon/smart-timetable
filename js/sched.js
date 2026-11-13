// 只读：读取“任意一天”的全部安排（手动活动 + 重复活动 + 固定课程）。
// 给「问问 Mochi」（生成日程快照）和「导入 .ics」（查冲突 / 去重）用。不修改任何数据。
var Sched=(function(){
  function weekOf(dn){return Math.floor((dn+3-SET.ws)/7)}
  function blocks(C,w){return C[w]||(C[w]={fx:fxBlocks(w),rp:rpBlocks(w)})}
  // 某一天的安排，按开始时间排序。k：m=手动（有 ref，可改）r=重复活动 f=固定课程（只读）。C 是缓存对象（同一批查询共用）。
  function dayItems(dn,C){
    C=C||{};var w=weekOf(dn),wd=dnDate(dn).wd,B=blocks(C,w),out=[],arr=(w===curW?data:WK[w])||[];
    arr.forEach(function(x,i){if(x.day===wd)out.push({k:'m',ref:'m'+w+'_'+i,t:x.t,s:x.s,e:x.e,done:!!DN[kk(x,w)]})});
    B.rp.forEach(function(b){if(b.dn===dn)out.push({k:'r',t:b.t,s:b.s,e:b.e})});
    B.fx.forEach(function(b){if(b.dn===dn)out.push({k:'f',t:b.t,s:b.s,e:b.e})});
    spillBlocks(dn).forEach(function(b){out.push({k:'r',t:b.t,s:0,e:b.e})});   // 前一天跨午夜延伸过来的部分：只读占位
    return out.sort(function(a,b){return a.s-b.s||a.e-b.e})}
  // 空闲时段：显示范围（H0–H1）里扣掉所有安排；from 之前的不算（今天已过去的时间）；短于 minLen 分钟的丢掉。
  function freeWindows(items,from,minLen){
    var a=Math.max(H0*60,from||0),b=H1*60,out=[],t=a;minLen=minLen||30;
    items.forEach(function(x){if(x.s>t&&x.s-t>=minLen)out.push([t,Math.min(x.s,b)]);if(x.e>t)t=x.e});
    if(b-t>=minLen)out.push([t,b]);
    return out.filter(function(r){return r[1]>r[0]})}
  function nowMin(){var n=new Date();return n.getHours()*60+n.getMinutes()}
  // 给 AI 的快照：从今天起 n 天（跳过隐藏的周末）+ 未完成作业。刻意做得很小（几 KB）。
  function snapshot(n){
    var C={},days=[],now=nowMin();
    for(var i=0;i<(n||14);i++){
      var dn=todayDn+i,wd=dnDate(dn).wd;if(hiddenDay(wd))continue;
      var it=dayItems(dn,C);
      days.push({date:isoOf(dn),wd:wd,
        items:it.map(function(x){var o={k:x.k,t:x.t,s:x.s,e:x.e};if(x.ref)o.ref=x.ref;if(x.done)o.done=1;return o}),
        free:freeWindows(it,i===0?Math.ceil(now/15)*15:0)})}
    var hw=HW.filter(function(h){return !h.done}).slice(0,40).map(function(h){return {id:h.id,t:h.t,sb:h.sb||'',due:h.due||''}});
    return {today:isoOf(todayDn),wd:todayIdx,now:now,h0:H0,h1:H1,days:days,hw:hw,health:(window.healthSummary?healthSummary():null)}}
  // ref（'m<周>_<序号>'）→ {w,i,x}；找不到返回 null
  function byRef(ref){
    var m=/^m(-?\d+)_(\d+)$/.exec(String(ref));if(!m)return null;
    var w=+m[1],i=+m[2],arr=(w===curW?data:WK[w])||[],x=arr[i];return x?{w:w,i:i,x:x,arr:arr}:null}
  return {weekOf:weekOf,dayItems:dayItems,freeWindows:freeWindows,snapshot:snapshot,byRef:byRef}
})();
