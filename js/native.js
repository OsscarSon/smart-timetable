// 手机 App（Capacitor）：用系统本地通知，App 关掉、手机锁屏也会准时提醒。
// 做法：每次数据变化 / 回到前台，就把“未来 7 天”的提醒、活动、课程重新排进系统通知队列。
// 不需要自己的推送服务器；网页版不受影响（这个文件在网页里什么都不做）。
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  window.IS_NATIVE=true;
  var LN=C.Plugins&&C.Plugins.LocalNotifications;
  if(!LN){console.warn('缺少 @capacitor/local-notifications');return}
  async function ensure(){var p=await LN.checkPermissions();if(p.display!=='granted')p=await LN.requestPermissions();return p.display==='granted'}
  function at(dn,min){var x=dnDate(dn);return new Date(x.y,x.m-1,x.d,Math.floor(min/60),min%60).getTime()}
  function build(){
    var L=[],now=Date.now(),lead=SET.lead||10;
    for(var off=0;off<7;off++){
      var dn=todayDn+off,wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7);
      RM.forEach(function(m){
        if(m.d||!m.t||!m.tm||(+m.day!==wd&&+m.day!==-1))return;
        L.push({ts:at(dn,t2min(m.tm)),title:'⏰ 提醒',body:m.t})});
      var evs=((w===curW?data:WK[w])||[]).concat(rpBlocks(w));
      evs.forEach(function(x){
        if(x.day!==wd||DN[kk(x,w)])return;
        L.push({ts:at(dn,x.h*60-lead),title:'马上开始：'+x.t,body:hm(x.h)+' 开始（约 '+lead+' 分钟后）'})});
      fxBlocks(w).forEach(function(b){
        if(b.dn!==dn)return;var l=b.les;
        L.push({ts:at(dn,l.s-lead),title:'🏫 马上上课：'+l.t,body:tmin(l.s)+(l.room?' · '+l.room:'')+(l.teacher?' · '+l.teacher:'')})});
    }
    return L.filter(function(x){return x.ts>now+5000}).sort(function(a,b){return a.ts-b.ts}).slice(0,60)}   // iOS 最多排 64 条
  async function schedule(){
    try{
      if(!await ensure())return;
      var pend=await LN.getPending();
      if(pend.notifications.length)await LN.cancel({notifications:pend.notifications.map(function(n){return {id:n.id}})});
      var L=build();if(!L.length)return;
      await LN.schedule({notifications:L.map(function(x,i){return {id:i+1,title:x.title,body:x.body,schedule:{at:new Date(x.ts),allowWhileIdle:true}}})});
    }catch(e){console.warn('排通知失败',e)}}
  var tm=null;function later(){clearTimeout(tm);tm=setTimeout(schedule,2000)}
  if(window.MOCHI_HOOK)MOCHI_HOOK.on(later);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)later()});
  var ntb=document.getElementById('ntf'),ntm=document.getElementById('ntmsg');
  if(ntb){ntb.textContent='🔔 开启系统通知';
    ntb.onclick=async function(){var ok=await ensure();ntm.textContent=ok?'已开启：会提前排好未来 7 天的提醒，App 关掉也会响 🐱':'没有通知权限，请到手机系统设置里打开';if(ok)schedule()}}
  later();
})();
