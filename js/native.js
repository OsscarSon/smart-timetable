// 手机 App（Capacitor）：用系统本地通知（App 关掉、锁屏也会准时提醒）+ 把今天的课表推给 Android 桌面小组件。
// 做法：每次数据变化 / 回到前台，就把“未来几天”的提醒重新排进系统通知队列。不需要自己的推送服务器。
// 网页版不受影响（这个文件在网页里什么都不做）。
(function(){
  var C=window.Capacitor;
  if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
  window.IS_NATIVE=true;
  var LN=C.Plugins&&C.Plugins.LocalNotifications,PLAT=C.getPlatform?C.getPlatform():'android';
  var WG=(C.Plugins&&C.Plugins.MochiWidget)||(C.registerPlugin&&PLAT==='android'?C.registerPlugin('MochiWidget'):null);
  var CH={sound:'mochi-sound',vib:'mochi-vib',quiet:'mochi-quiet'},LIMIT=PLAT==='ios'?60:120;   // iOS 最多排 64 条
  var ntm=document.getElementById('ntmsg'),ntb=document.getElementById('ntf'),exr=document.getElementById('ntexr'),exb=document.getElementById('ntex');

  async function ensure(){if(!LN)return false;var p=await LN.checkPermissions();if(p.display!=='granted')p=await LN.requestPermissions();return p.display==='granted'}
  // Android 的提示方式是“通知渠道”决定的，渠道建好后不能改，所以每种方式一个渠道
  async function channels(){
    if(PLAT!=='android'||!LN||!LN.createChannel)return;
    try{
      await LN.createChannel({id:CH.sound,name:'提醒（声音 + 振动）',description:'上课、活动、作业提醒',importance:4,visibility:1,vibration:true});
      await LN.createChannel({id:CH.vib,name:'提醒（仅振动）',description:'只振动，不响铃',importance:2,visibility:1,vibration:true,sound:''});
      await LN.createChannel({id:CH.quiet,name:'提醒（静音）',description:'只在通知栏显示',importance:2,visibility:1,vibration:false,sound:''});
    }catch(e){console.warn('建通知渠道失败',e)}}
  function chId(){return CH[SET.snd]||CH.sound}

  // ---- 桌面小组件：把今天 / 明天的项目写给原生端（见 android-widget/）----
  function dayItems(dn){
    var wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7),out=[];
    ((w===curW?data:WK[w])||[]).forEach(function(x){if(x.day===wd&&!DN[kk(x,w)])out.push({s:x.s,e:x.e,t:x.t,l:''})});
    rpBlocks(w).forEach(function(b){if(b.dn===dn&&!DN[kk(b,w)])out.push({s:b.s,e:b.e,t:b.t,l:''})});
    fxBlocks(w).forEach(function(b){if(b.dn===dn){var l=b.les;out.push({s:b.s,e:b.e,t:b.t,l:[(l.bld||'')+(l.room||''),l.teacher].filter(Boolean).join(' · ')})}});
    return out.sort(function(a,b){return a.s-b.s})}
  function pushWidget(){
    if(!WG)return;
    try{WG.update({json:JSON.stringify({v:1,gen:Date.now(),h24:!!SET.h24,
      days:[{date:isoOf(todayDn),items:dayItems(todayDn)},{date:isoOf(todayDn+1),items:dayItems(todayDn+1)}]})})}catch(e){}}

  async function schedule(){
    pushWidget();
    try{
      if(!await ensure())return;
      await channels();
      var pend=await LN.getPending();
      if(pend.notifications.length)await LN.cancel({notifications:pend.notifications.map(function(n){return {id:n.id}})});
      var now=Date.now(),L=buildAlarms(7).filter(function(x){return x.ts>now+5000}).slice(0,LIMIT);if(!L.length)return;
      await LN.schedule({notifications:L.map(function(x,i){var n={id:i+1,title:x.title,body:x.body,schedule:{at:new Date(x.ts),allowWhileIdle:true}};
        if(PLAT==='android')n.channelId=chId();return n})});
    }catch(e){console.warn('排通知失败',e)}}
  var tm=null;function later(){clearTimeout(tm);tm=setTimeout(schedule,2000)}
  if(window.MOCHI_HOOK)MOCHI_HOOK.on(later);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)later()});

  // ---- 设置页里的按钮 ----
  async function exactState(){
    if(PLAT!=='android'||!LN||!LN.checkExactNotificationSetting)return null;
    try{var r=await LN.checkExactNotificationSetting();return r.exact_alarm}catch(e){return null}}
  window.NATIVE_NOTIF={later:later,
    test:async function(){
      if(!await ensure()){ntm.textContent='没有通知权限，请到手机系统设置里打开';return}
      await channels();
      var n={id:9999,title:'Mochi 🐱',body:'这是一条测试通知（约 3 秒后）',schedule:{at:new Date(Date.now()+3000),allowWhileIdle:true}};if(PLAT==='android')n.channelId=chId();
      await LN.schedule({notifications:[n]});ntm.textContent='已发出，3 秒后看通知栏。没响的话看下面的“收不到准时提醒”。'}};
  if(ntb){ntb.textContent='🔔 开启系统通知';
    ntb.onclick=async function(){var ok=await ensure();ntm.textContent=ok?'已开启：会提前排好未来 7 天的提醒，App 关掉也会响 🐱':'没有通知权限，请到手机系统设置里打开';if(ok)schedule()}}
  if(exr&&PLAT==='android'){exr.hidden=false;
    exb.onclick=async function(){
      var s=await exactState();
      if(s==='granted'){ntm.textContent='精确闹钟权限已开启 ✓';return}
      if(s===null){ntm.textContent='这台设备不需要单独设置（或系统版本较旧）。';return}
      ntm.textContent='精确闹钟没开：马上打开系统设置页，请把 Mochi 的“闹钟和提醒”打开。';
      try{await LN.changeExactNotificationSetting()}catch(e){}}}
  later();
})();
