// 通知：① 统一生成“提醒清单”（网页版 tick 和手机 App 的系统通知共用）② 设置页「通知与提醒」的界面。
var LEADS=[[0,'不提醒'],[5,'5 分钟前'],[10,'10 分钟前'],[15,'15 分钟前'],[30,'30 分钟前'],[60,'1 小时前']];
function leadMin(){return SET.lead==null?10:+SET.lead}
function alarmAt(dn,min){var x=dnDate(dn);return new Date(x.y,x.m-1,x.d,Math.floor(min/60),min%60).getTime()}
// 从今天起往后 days 天的全部提醒：[{ts,title,body}]（只含当前课表；已完成的活动 / 作业不提醒）
function buildAlarms(days){
  var L=[],lead=leadMin(),hwt=t2min(SET.hwt||'08:00');if(isNaN(hwt))hwt=8*60;
  for(var off=0;off<days;off++){
    var dn=todayDn+off,wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7);
    RM.forEach(function(m){
      if(m.d||!m.t||!m.tm||(+m.day!==wd&&+m.day!==-1))return;
      var t=t2min(m.tm);if(!isNaN(t))L.push({ts:alarmAt(dn,t),title:'⏰ 提醒',body:m.t})});
    if(lead>0){
      var evs=((w===curW?data:WK[w])||[]).concat(rpBlocks(w));
      evs.forEach(function(x){
        if(x.day!==wd||DN[kk(x,w)])return;
        if(x.dn!=null&&x.dn!==dn)return;                       // 重复活动：只取这一天的那一次
        L.push({ts:alarmAt(dn,x.s-lead),title:'马上开始：'+x.t,body:tmin(x.s)+' 开始（约 '+lead+' 分钟后）'})});
      fxBlocks(w).forEach(function(b){
        if(b.dn!==dn)return;var l=b.les;
        L.push({ts:alarmAt(dn,l.s-lead),title:'🏫 马上上课：'+l.t,body:tmin(l.s)+(l.room?' · '+(l.bld||'')+l.room:'')+(l.teacher?' · '+l.teacher:'')})})}
  }
  if(SET.hwn&&typeof HW!=='undefined')HW.forEach(function(h){     // 作业截止
    if(h.done||!h.due)return;var dd=dnFromIso(h.due);if(dd===null)return;
    var name=(h.sb?h.sb+' · ':'')+h.t;
    if(dd>=todayDn&&dd<todayDn+days)L.push({ts:alarmAt(dd,hwt),title:'📝 作业今天截止',body:name});
    if(SET.hwe&&dd-1>=todayDn&&dd-1<todayDn+days)L.push({ts:alarmAt(dd-1,20*60),title:'📝 作业明天截止',body:name})});
  return L.sort(function(a,b){return a.ts-b.ts})}

// ---- 设置页界面 ----
(function(){
  var lead=document.getElementById('nlead'),hwn=document.getElementById('nhw'),hwt=document.getElementById('nhwt'),hwe=document.getElementById('nhwe'),snd=document.getElementById('nsnd');
  LEADS.forEach(function(p){var o=el('option',null,p[1]);o.value=p[0];lead.appendChild(o)});
  lead.value=leadMin();hwn.checked=!!SET.hwn;hwt.value=SET.hwt||'08:00';hwe.checked=!!SET.hwe;snd.value=SET.snd||'sound';
  function sync(){hwt.disabled=hwe.disabled=!hwn.checked}
  function changed(){saveSet();if(window.NATIVE_NOTIF)NATIVE_NOTIF.later()}
  lead.onchange=function(){SET.lead=+lead.value;changed()};
  hwn.onchange=function(){SET.hwn=hwn.checked;sync();changed()};
  hwt.onchange=function(){if(hwt.value){SET.hwt=hwt.value;changed()}};
  hwe.onchange=function(){SET.hwe=hwe.checked;changed()};
  snd.onchange=function(){SET.snd=snd.value;changed()};
  sync();
})();
