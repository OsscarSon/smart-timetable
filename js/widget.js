// 手机 App：把“今天 / 明天 / 后天”的安排写给 Android 桌面小组件（只在 Capacitor 原生 App 里工作，网页里什么都不做）。
// 做法：Capacitor 官方 Preferences 插件把 JSON 存进 SharedPreferences（组 CapacitorStorage、键 mochi-widget），
// 原生小组件（native/android-widget/）读它显示；再调用 MochiWidget.refresh() 立刻刷新。
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  var PR=(C.Plugins&&C.Plugins.Preferences)||(C.registerPlugin&&C.registerPlugin('Preferences'));
  var WG=C.registerPlugin?C.registerPlugin('MochiWidget'):null;
  if(!PR||!PR.set)return;
  function dayItems(dn){
    var wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7),out=[];
    ((w===curW?data:WK[w])||[]).concat(rpBlocks(w)).forEach(function(x){
      if(x.day!==wd||DN[kk(x,w)])return;out.push({s:x.h*60,e:(x.h+x.len)*60,t:x.t,m:''})});
    fxBlocks(w).forEach(function(b){
      if(b.dn!==dn)return;var l=b.les;
      out.push({s:l.s,e:l.e,t:l.t,m:[(l.bld||'')+(l.room||''),l.teacher].filter(Boolean).join(' · ')})});
    return out.sort(function(a,b){return a.s-b.s}).slice(0,8)}
  function payload(){
    var days=[];for(var k=0;k<3;k++)days.push({date:isoOf(todayDn+k),items:dayItems(todayDn+k)});    // 多带两天：过了午夜 App 没打开，小组件也有数据
    return {v:1,days:days}}
  async function push(){
    try{await PR.set({key:'mochi-widget',value:JSON.stringify(payload())});if(WG&&WG.refresh)await WG.refresh()}
    catch(e){console.warn('更新小组件失败',e)}}
  var tm=null;function later(){clearTimeout(tm);tm=setTimeout(push,1500)}
  if(window.MOCHI_HOOK)MOCHI_HOOK.on(later);
  document.addEventListener('visibilitychange',function(){if(document.hidden)push();else later()});
  window.widgetPayload=payload;later();
})();
