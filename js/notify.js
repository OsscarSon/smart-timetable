// 通知（网页版）：页面开着时，到提醒时间会弹出通知；后台推送要装成手机 App（见 native.js）。
var swReg=null;
if('serviceWorker' in navigator&&!window.Capacitor&&location.protocol!=='file:'){
  navigator.serviceWorker.register('sw.js').then(function(r){swReg=r}).catch(function(){})}
var ntb=document.getElementById('ntf'),ntm=document.getElementById('ntmsg'),ntt=document.getElementById('ntt');
function ntState(){
  if(window.IS_NATIVE)return;
  if(!('Notification' in window)){ntb.disabled=true;ntt.disabled=true;ntm.textContent='这个浏览器不支持通知。装成手机 App 后会用系统通知。';return}
  var p=Notification.permission;
  ntb.textContent=p==='granted'?'🔔 通知已开启':p==='denied'?'🔕 通知被浏览器禁用':'🔔 开启通知';
  ntb.disabled=p!=='default';ntt.disabled=p!=='granted';
  if(p==='denied')ntm.textContent='通知被禁用了：请在浏览器地址栏左边的站点设置里改成“允许”。'}
function notify(t,b){
  if(window.IS_NATIVE)return;                // 手机 App 里由 native.js 用系统通知处理
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  var o={body:b,tag:t+b,icon:'icons/icon-192.png',badge:'icons/icon-192.png'};
  if(SET.snd==='quiet')o.silent=true;else o.vibrate=SET.snd==='vib'?[250,120,250]:[120,60,120];   // 网页版没法单独关声音，仅振动 = 加振动
  if(swReg&&swReg.showNotification)swReg.showNotification(t,o);
  else{try{new Notification(t,o)}catch(e){}}}
ntb.onclick=function(){
  if(!('Notification' in window)||window.IS_NATIVE)return;
  Notification.requestPermission().then(ntState)};
ntt.onclick=function(){
  if(window.IS_NATIVE&&window.NATIVE_NOTIF){NATIVE_NOTIF.test();return}
  notify('Mochi 🐱','这是一条测试通知')};
var sent={};
function tick(){
  if(window.IS_NATIVE)return;
  var now=Date.now();
  buildAlarms(2).forEach(function(a){
    var k=a.ts+a.title+a.body;
    if(a.ts<=now&&a.ts>now-90000&&!sent[k]){sent[k]=1;notify(a.title,a.body)}})}
setInterval(tick,30000);ntState();
