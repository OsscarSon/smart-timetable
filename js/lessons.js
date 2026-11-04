// 固定课表：节次时间模板、课程（教室 / 老师 / 类型 / 多周循环）
// 课程按“当天分钟数”存储，所以改节次时间、删节次都不会弄乱已有课程。
var TYPES=['课','实验','考试','自习','活动'];
function min2t(m){return pad2(Math.floor(m/60))+':'+pad2(m%60)}                       // 给 <input type=time>
function t2min(s){var p=String(s||'').split(':');return p.length>=2&&p[0]!==''&&!isNaN(+p[0])?(+p[0])*60+(+p[1]):NaN}
function genPer(st,len,gap,n){var o=[],t=st;for(var i=0;i<n;i++){o.push({s:t,e:t+len});t+=len+gap}return o}
function perIdx(s,e){var a=-1,b=-1;TT.per.forEach(function(p,i){if(p.s===s)a=i;if(p.e===e)b=i});return [a,b]}
function perLabel(s,e){var ab=perIdx(s,e),a=ab[0],b=ab[1];return (a>=0&&b>=a)?(a===b?'第'+(a+1)+'节':'第'+(a+1)+'–'+(b+1)+'节'):''}

// ---- 节次时间 ----
function rPer(){
  var box=document.getElementById('perl');box.innerHTML='';
  TT.per.forEach(function(p,i){
    var r=el('div','tp rm'),a=el('input'),b=el('input'),x=el('button',null,'×');
    a.type=b.type='time';a.value=min2t(p.s);b.value=min2t(p.e);
    function upd(){var s=t2min(a.value),e=t2min(b.value);if(isNaN(s)||isNaN(e)||e<=s){a.value=min2t(p.s);b.value=min2t(p.e);return}p.s=s;p.e=e;ttSave();draw();rFx()}
    a.onchange=b.onchange=upd;
    x.onclick=function(){if(TT.per.length<=1)return;TT.per.splice(i,1);ttSave();rPer();rFx()};
    [el('span',null,'第'+(i+1)+'节'),a,el('span',null,'–'),b,x].forEach(function(e){r.appendChild(e)});box.appendChild(r)});
}
document.getElementById('perg').onclick=function(){
  var s=t2min(document.getElementById('g0').value),l=+document.getElementById('g1').value,g=+document.getElementById('g2').value,n=+document.getElementById('g3').value;
  if(isNaN(s)||!(l>=15)||!(g>=0)||!(n>=1)){alert('请把四个数字填完整');return}
  if(TT.per.length&&!confirm('会替换现在的节次时间（已有课程不受影响）。继续吗？'))return;
  TT.per=genPer(s,l,g,Math.min(16,n));ttSave();rPer();rFx();draw()};
document.getElementById('pera').onclick=function(){
  var last=TT.per[TT.per.length-1]||{s:7*60+50,e:8*60+35},len=last.e-last.s,s=last.e+10;
  if(TT.per.length>=20)return;TT.per.push({s:s,e:s+len});ttSave();rPer();rFx()};

// ---- 多周循环 ----
var cycS=document.getElementById('cyc'),cywS=document.getElementById('cyw');
for(var ci=1;ci<=4;ci++){var co=el('option',null,ci===1?'每周都一样':ci+' 周一循环');co.value=ci;cycS.appendChild(co)}
function rCyc(){
  cycS.value=TT.cyc||1;cywS.innerHTML='';cywS.style.display=(TT.cyc>1)?'':'none';
  for(var k=1;k<=(TT.cyc||1);k++){var o=el('option',null,'这周是第 '+k+' 周');o.value=k;cywS.appendChild(o)}
  cywS.value=cycIdx(todayDn)}
cycS.onchange=function(){
  TT.cyc=+cycS.value;if(TT.anc==null)TT.anc=mondayDn(todayDn);
  FX.forEach(function(x){if(x.wk){x.wk=x.wk.filter(function(k){return k<=TT.cyc});if(!x.wk.length||x.wk.length>=TT.cyc)x.wk=null}});
  fxSave();ttSave();rCyc();rFx();draw()};
cywS.onchange=function(){TT.anc=mondayDn(todayDn)-(+cywS.value-1)*7;ttSave();rFx();draw()};

// ---- 课程列表 ----
function rFx(){
  var box=document.getElementById('fxl');box.innerHTML='';
  if(!FX.length)box.appendChild(el('div','msg','开学后在这里填上学校的上课时间（现在可以先空着）'));
  FX.slice().sort(function(a,b){return ((a.day-SET.ws+7)%7)-((b.day-SET.ws+7)%7)||a.s-b.s}).forEach(function(x){
    var r=el('div','tp'),n=el('div','n'),pl=perLabel(x.s,x.e);
    n.appendChild(el('div',null,'周'+DAYS[x.day]+' '+tmin(x.s)+'–'+tmin(x.e)+(pl?'（'+pl+'）':'')+' '+(x.type==='考试'?'📝 ':'')+x.t));
    var sm=[x.room,x.teacher,x.type!=='课'?x.type:'',(x.wk&&x.wk.length)?'第 '+x.wk.join('、')+' 周':''].filter(Boolean).join(' · ');
    if(sm)n.appendChild(el('small',null,sm));
    n.style.cursor='pointer';n.onclick=function(){openLesson(x)};
    var dl2=el('button',null,'×');dl2.onclick=function(){if(!confirm('删除「'+x.t+'」？'))return;FX=FX.filter(function(z){return z!==x});fxSave();rFx();draw()};
    r.appendChild(n);r.appendChild(dl2);box.appendChild(r)});
  rCyc();
}
document.getElementById('fxon').checked=!!SET.fx;
document.getElementById('fxon').onchange=function(){SET.fx=this.checked;put2('mochi-set',SET);draw()};

// ---- 课程弹窗 ----
var LS={cur:null,days:[],wks:[],col:'sky'},lm=document.getElementById('mask2');
var lsn=document.getElementById('lsn'),lsp0=document.getElementById('lsp0'),lsp1=document.getElementById('lsp1'),lst0=document.getElementById('lst0'),lst1=document.getElementById('lst1');
var lsrm=document.getElementById('lsrm'),lstc=document.getElementById('lstc'),lsty=document.getElementById('lsty');
TYPES.forEach(function(t){var o=el('option',null,t);o.value=t;lsty.appendChild(o)});
COLS.forEach(function(n){var i=el('i','c-'+n);i.onclick=function(){LS.col=n;lsPaint()};document.getElementById('lssw').appendChild(i)});
function lsPaint(){[].forEach.call(document.getElementById('lssw').children,function(i,x){i.classList.toggle('on',COLS[x]===LS.col)})}
function chipSet(box,items,sel,single){
  box.innerHTML='';
  items.forEach(function(it){var b=el('button','chip'+(sel.indexOf(it[0])>=0?' on':''),it[1]);
    b.onclick=function(){var i=sel.indexOf(it[0]);if(single){sel.length=0;sel.push(it[0])}else if(i>=0)sel.splice(i,1);else sel.push(it[0]);chipSet(box,items,sel,single)};
    box.appendChild(b)})}
function lsFillPer(){
  [[lsp0,'开始节次…'],[lsp1,'结束节次…']].forEach(function(p){
    p[0].innerHTML='';var o=el('option',null,p[1]);o.value=-1;p[0].appendChild(o);
    TT.per.forEach(function(q,i){var o2=el('option',null,'第'+(i+1)+'节 '+tmin(q.s)+(p[0]===lsp1?'–'+tmin(q.e):''));o2.value=i;p[0].appendChild(o2)})})}
lsp0.onchange=function(){var i=+lsp0.value;if(i>=0){lst0.value=min2t(TT.per[i].s);if(+lsp1.value<i){lsp1.value=i;lst1.value=min2t(TT.per[i].e)}}};
lsp1.onchange=function(){var i=+lsp1.value;if(i>=0)lst1.value=min2t(TT.per[i].e)};
lst0.onchange=lst1.onchange=function(){var ab=perIdx(t2min(lst0.value),t2min(lst1.value));lsp0.value=ab[0];lsp1.value=ab[1]};
function openLesson(x,preDay){
  LS.cur=x||null;LS.col=x?x.c:COLS[FX.length%COLS.length];
  lsFillPer();
  document.getElementById('lst').textContent=x?'修改课程':'添加课程';
  lsn.value=x?x.t:'';lsrm.value=x?x.room:'';lstc.value=x?x.teacher:'';lsty.value=x?x.type:'课';
  var def=TT.per[0]||{s:480,e:525};
  lst0.value=min2t(x?x.s:def.s);lst1.value=min2t(x?x.e:def.e);
  var ab=perIdx(x?x.s:def.s,x?x.e:def.e);lsp0.value=ab[0];lsp1.value=ab[1];
  LS.days=x?[x.day]:[preDay!==undefined?preDay:posDay(0)];
  var dItems=[];for(var p=0;p<7;p++){var wd=posDay(p);dItems.push([wd,'周'+DAYS[wd]])}
  chipSet(document.getElementById('lsd'),dItems,LS.days,false);
  LS.wks=x&&x.wk?x.wk.slice():[];
  var wItems=[];for(var k=1;k<=(TT.cyc||1);k++)wItems.push([k,'第 '+k+' 周']);
  document.getElementById('lsww').style.display=TT.cyc>1?'':'none';
  chipSet(document.getElementById('lsw'),wItems,LS.wks,false);
  document.getElementById('lsdel').style.display=x?'':'none';
  lsPaint();lm.classList.add('show');setTimeout(function(){lsn.focus()},50)}
function closeLesson(){lm.classList.remove('show')}
lm.onclick=closeLesson;document.getElementById('lsx').onclick=closeLesson;
document.getElementById('lsdel').onclick=function(){
  if(!LS.cur||!confirm('删除「'+LS.cur.t+'」？'))return;
  FX=FX.filter(function(z){return z!==LS.cur});fxSave();closeLesson();rFx();draw()};
document.getElementById('lsok').onclick=function(){
  var t=lsn.value.trim(),s=t2min(lst0.value),e=t2min(lst1.value);
  if(!t){lsn.focus();return}
  if(isNaN(s)||isNaN(e)||e<=s){alert('请填好开始和结束时间（结束要晚于开始）');return}
  if(!LS.days.length){alert('请至少选一天');return}
  var wk2=(TT.cyc>1&&LS.wks.length&&LS.wks.length<TT.cyc)?LS.wks.slice().sort():null;
  var base={t:t.slice(0,20),s:s,e:e,room:lsrm.value.trim().slice(0,20),teacher:lstc.value.trim().slice(0,20),type:lsty.value,wk:wk2,c:LS.col};
  var x=LS.cur,days=LS.days.slice();
  if(x&&days.indexOf(x.day)>0){days.splice(days.indexOf(x.day),1);days.unshift(x.day)}   // 原来那天优先更新原课程
  days.forEach(function(dv,i){
    if(x&&i===0){for(var k in base)x[k]=base[k];x.day=dv}
    else{var o={id:uid(),day:dv};for(var k2 in base)o[k2]=base[k2];FX.push(o)}});
  fxSave();closeLesson();rFx();draw()};
document.getElementById('fxa').onclick=function(){openLesson(null)};
