// 🌿 健康：美容护肤打卡 + 饮食 / 饮水记录（运动在 sport.js）。数据 key：mochi-bt、mochi-di（mochi- 开头，所以自动云同步、进备份）。
// 食物营养用开源数据库 Open Food Facts（ODbL，免 key，浏览器直接查）；查不到也可以手动输入热量。
// AI 读取：healthSummary() 会放进「整周重排」的请求（log.js）和「问问 Mochi」的快照（sched.js）。
var BT={am:['洁面','保湿','防晒'],pm:['卸妆','洁面','保湿'],log:{}},DI={kcal:2000,water:8,days:{}};
try{var b0=JSON.parse(localStorage.getItem('mochi-bt')||'null');if(b0&&b0.am)BT=b0}catch(e){}
try{var d0=JSON.parse(localStorage.getItem('mochi-di')||'null');if(d0&&d0.days)DI=d0}catch(e){}
function btSave(){var ks=Object.keys(BT.log).sort();ks.slice(0,Math.max(0,ks.length-90)).forEach(function(k){delete BT.log[k]});put2('mochi-bt',BT)}
function diSave(){var ks=Object.keys(DI.days).sort();ks.slice(0,Math.max(0,ks.length-90)).forEach(function(k){delete DI.days[k]});put2('mochi-di',DI)}
function hDay(off){var d=new Date();d.setDate(d.getDate()+(off||0));var p=function(n){return (n<10?'0':'')+n};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function dayDi(k){return DI.days[k]||(DI.days[k]={w:0,m:[]})}
function kcalOf(k){return (DI.days[k]?DI.days[k].m:[]).reduce(function(a,m){return a+(+m.k||0)},0)}
function btDone(k){var l=BT.log[k]||{};return (l.am||[]).length+(l.pm||[]).length}
function btStreak(){var n=0;for(var i=0;i<90;i++){var k=hDay(-i);if(btDone(k)>0)n++;else if(i>0)break;else continue}return n}
// 给 AI 的健康摘要（很小）：护肤步骤与今日完成度、饮食目标与最近 3 天的摄入 / 饮水
function healthSummary(){
  var k=hDay(0),l=BT.log[k]||{},t=dayDi(k);
  return {skin:{am:BT.am,pm:BT.pm,doneToday:{am:(l.am||[]).length,pm:(l.pm||[]).length},streakDays:btStreak()},
    diet:{goalKcal:DI.kcal,goalWater:DI.water,today:{kcal:kcalOf(k),water:t.w,meals:t.m.slice(-8).map(function(m){return {t:m.t,n:m.n,k:m.k}})},
      recent:[1,2,3].map(function(i){var d=hDay(-i);return {d:d,kcal:kcalOf(d),water:(DI.days[d]||{}).w||0}})}}}
window.healthSummary=healthSummary;

// ---------- 美容 ----------
var btP='am';
function rBt(){
  var k=hDay(0),l=(BT.log[k]=BT.log[k]||{am:[],pm:[]}),box=document.getElementById('btl'),mm=document.getElementById('btm');
  mm.innerHTML='';[['am','☀️ 早上'],['pm','🌙 晚上']].forEach(function(x){var b=el('button','chip'+(btP===x[0]?' on':''),x[1]);b.onclick=function(){btP=x[0];rBt()};mm.appendChild(b)});
  box.innerHTML='';
  var steps=BT[btP],done=l[btP]=l[btP]||[];
  steps.forEach(function(n,i){
    var r=el('div','tp hw'),c=el('input');c.type='checkbox';c.checked=done.indexOf(i)>=0;c.setAttribute('aria-label',n);
    c.onchange=function(){var j=done.indexOf(i);if(c.checked&&j<0)done.push(i);if(!c.checked&&j>=0)done.splice(j,1);btSave();rBt()};
    var nn=el('div','n'),tt=el('div','hwt',n);nn.appendChild(tt);var x=el('button','lk','×');x.setAttribute('aria-label','delete');
    x.onclick=function(){steps.splice(i,1);l.am=[];l.pm=[];btSave();rBt()};
    r.appendChild(c);r.appendChild(nn);r.appendChild(x);box.appendChild(r)});
  mkSort(box,{item:'.tp',get:function(){return steps},done:function(a,f,t){
    var m=function(i){return i===f?t:(f<t?(i>f&&i<=t?i-1:i):(i>=t&&i<f?i+1:i))};
    l[btP]=done.map(m);btSave();rBt()}});
  if(!steps.length)box.appendChild(el('div','msg','还没有步骤，在下面加一个～'));
  var tot=BT.am.length+BT.pm.length,dn=btDone(k);
  document.getElementById('btp').textContent='今天完成 '+dn+'/'+tot+' · 连续打卡 '+btStreak()+' 天'}
document.getElementById('bta').onclick=function(){var i=document.getElementById('btn'),v=i.value.trim().slice(0,12);if(!v)return;BT[btP].push(v);i.value='';btSave();rBt()};

// ---------- 饮食 ----------
var diMeal='午餐',diPick=null,diCtl=null;
function rDi(){
  var k=hDay(0),t=dayDi(k),kc=kcalOf(k);
  document.getElementById('dis').textContent='今天已记录 '+kc+' / '+DI.kcal+' kcal'+(kc>DI.kcal?'（超过目标了，别太苛责自己 🌱）':'');
  document.getElementById('diw').textContent='💧 '+t.w+' / '+DI.water+' 杯';
  var mm=document.getElementById('dim');mm.innerHTML='';
  ['早餐','午餐','晚餐','加餐'].forEach(function(n){var b=el('button','chip'+(diMeal===n?' on':''),n);b.onclick=function(){diMeal=n;rDi()};mm.appendChild(b)});
  var box=document.getElementById('dil');box.innerHTML='';
  t.m.forEach(function(m,i){var r=el('div','tp hw'),nn=el('div','n');nn.appendChild(el('div','hwt',m.t+' · '+m.n));nn.appendChild(el('small',null,m.k+' kcal'));var x=el('button','lk','×');x.setAttribute('aria-label','delete');
    x.onclick=function(){t.m.splice(i,1);diSave();rDi()};r.appendChild(nn);r.appendChild(x);box.appendChild(r)});
  if(!t.m.length)box.appendChild(el('div','msg','今天还没记录，吃了什么就加一条～'));
  document.getElementById('digl').value=DI.kcal;document.getElementById('diwl').value=DI.water}
document.getElementById('diwp').onclick=function(){var t=dayDi(hDay(0));t.w=Math.min(30,t.w+1);diSave();rDi()};
document.getElementById('diwm').onclick=function(){var t=dayDi(hDay(0));t.w=Math.max(0,t.w-1);diSave();rDi()};
document.getElementById('digl').onchange=function(){DI.kcal=Math.max(500,Math.min(6000,+this.value||2000));diSave();rDi()};
document.getElementById('diwl').onchange=function(){DI.water=Math.max(1,Math.min(30,+this.value||8));diSave();rDi()};
function diCalc(){if(diPick){var g=+document.getElementById('dig').value||100;document.getElementById('dik').value=Math.round(diPick.per*g/100)}}
document.getElementById('dig').oninput=diCalc;
document.getElementById('dis2').onclick=async function(){
  var q=document.getElementById('dif').value.trim(),box=document.getElementById('dir'),msg=document.getElementById('dim2');
  if(!q)return;box.innerHTML='';msg.textContent='查询中…（Open Food Facts 开源食品数据库）';
  if(diCtl)diCtl.abort();diCtl=new AbortController();var tm=setTimeout(function(){diCtl.abort()},8000);
  try{
    var r=await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments&search_terms='+encodeURIComponent(q),{signal:diCtl.signal});
    var j=await r.json(),n=0;
    (j.products||[]).forEach(function(p){
      var kc=p.nutriments&&+p.nutriments['energy-kcal_100g'];if(!p.product_name||!(kc>=0))return;n++;
      var b=el('button','chip',p.product_name.slice(0,26)+' · '+Math.round(kc)+' kcal/100g');
      b.onclick=function(){diPick={per:kc};document.getElementById('dif').value=p.product_name.slice(0,30);document.getElementById('dig').value=100;diCalc()};box.appendChild(b)});
    msg.textContent=n?'点一个结果，再调整克数；热量会自动算好。数据来自 Open Food Facts（开源，可能有误差）。':'没查到。可以直接手动输入热量。'}
  catch(e){msg.textContent='查不到（可能没网）。可以直接手动输入热量。'}
  finally{clearTimeout(tm)}};
document.getElementById('dia').onclick=function(){
  var n=document.getElementById('dif').value.trim().slice(0,30),k=Math.round(+document.getElementById('dik').value);
  if(!n||!(k>=0)||k>5000){document.getElementById('dim2').textContent='请填食物名称和热量（kcal）';return}
  dayDi(hDay(0)).m.push({t:diMeal,n:n,k:k});diSave();diPick=null;
  ['dif','dik'].forEach(function(i){document.getElementById(i).value=''});document.getElementById('dir').innerHTML='';document.getElementById('dim2').textContent='';rDi()};
rBt();rDi();
