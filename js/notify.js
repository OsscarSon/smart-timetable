// 通知：网页开着时，到提醒时间、活动开始前几分钟会弹出通知（后台推送之后再做）
var swReg=null;
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(function(r){swReg=r}).catch(function(){})}
var ntb=document.getElementById('ntf'),ntm=document.getElementById('ntmsg');
function ntState(){
  if(!('Notification' in window)){ntb.disabled=true;ntm.textContent='这个浏览器不支持通知。';return}
  ntb.textContent=Notification.permission==='granted'?'🔔 通知已开启（点一下发测试）':'🔔 开启通知'}
function notify(t,b){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  if(swReg&&swReg.showNotification)swReg.showNotification(t,{body:b,tag:t+b});
  else{try{new Notification(t,{body:b})}catch(e){}}}
ntb.onclick=function(){
  if(!('Notification' in window))return;
  if(Notification.permission==='granted'){notify('Mochi 🐱','这是一条测试通知');return}
  Notification.requestPermission().then(ntState)};
var sent={};
function tick(){
  var n=new Date(),hhmm=pad2(n.getHours())+':'+pad2(n.getMinutes()),day=(n.getDay()+6)%7,key=n.toDateString();
  RM.forEach(function(m,i){
    if(m.d||!m.t||!m.tm||(+m.day!==day&&+m.day!==-1))return;
    if(m.tm===hhmm&&!sent[key+'r'+i]){sent[key+'r'+i]=1;notify('⏰ 提醒',m.t)}});
  var lead=SET.lead||10,t0=n.getHours()*60+n.getMinutes();
  thisEvents().forEach(function(x){
    if(x.day!==day||DN[kk(x,thisW)])return;
    var k2=key+'e'+x.h+x.t;
    if(t0>=x.h*60-lead&&t0<x.h*60&&!sent[k2]){sent[k2]=1;notify('马上开始：'+x.t,hm(x.h)+' 开始（约 '+lead+' 分钟后）')}});
  // 固定课程：上课前提醒（含教室、老师）
  todayLessons().forEach(function(l){
    var k3=key+'f'+l.id+l.s;
    if(t0>=l.s-lead&&t0<l.s&&!sent[k3]){sent[k3]=1;notify('🏫 马上上课：'+l.t,tmin(l.s)+(l.room?' · '+l.room:'')+(l.teacher?' · '+l.teacher:''))}});
}
setInterval(tick,30000);ntState();
