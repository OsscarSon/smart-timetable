// 作业与任务：按截止日期分组、科目标签、搜索 / 筛选、链接。每个课表各有一份。
// 附件（照片 / 文件）需要云存储，等账号与云同步做好后再接。
var HW=lget(K_HW,[]);
var HF={st:'todo',sb:'',q:''};            // st: todo 待办 / all 全部 / done 已完成
function hwSave(){put2(K_HW,HW)}
function safeUrl(s){                      // 只允许 http(s)，其他协议的链接一律丢弃
  s=String(s||'').trim();if(!s)return '';
  try{var u=new URL(/^[a-z][a-z0-9+.-]*:/i.test(s)?s:'https://'+s);return /^https?:$/.test(u.protocol)?u.href:''}catch(e){return ''}}
function subjCol(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return COLS[h%COLS.length]}
function subjList(){
  var o=[];function add(s){s=String(s||'').trim();if(s&&o.indexOf(s)<0)o.push(s)}
  (typeof ST!=='undefined'?ST.subs:[]).forEach(add);FX.forEach(function(x){add(x.t)});HW.forEach(function(h){add(h.sb)});return o}
function dueLabel(iso){
  var dn=dnFromIso(iso),df=dn-todayDn,x=dnDate(dn);
  return dfmt(dn,'M/D')+' 周'+DAYS[x.wd]+(df===0?' · 今天':df===1?' · 明天':df===-1?' · 昨天':df>1&&df<=14?' · '+df+' 天后':'')}
function hwDue(){var t=isoOf(todayDn),r={over:0,today:0};HW.forEach(function(h){if(h.done||!h.due)return;if(h.due<t)r.over++;else if(h.due===t)r.today++});return r}
function hwPending(){                     // 给 AI 排程用：没做完的作业
  return HW.filter(function(h){return !h.done}).slice(0,20).map(function(h){return {t:h.t,sb:h.sb||'',due:h.due||''}})}

function hwMatch(h){
  if(HF.st==='todo'&&h.done)return false;if(HF.st==='done'&&!h.done)return false;
  if(HF.sb&&h.sb!==HF.sb)return false;
  if(HF.q){var q=HF.q.toLowerCase();if((h.t+' '+(h.sb||'')+' '+(h.note||'')).toLowerCase().indexOf(q)<0)return false}
  return true}
function hwRow(h){
  var r=el('div','tp hw'),cb=el('input');cb.type='checkbox';cb.checked=!!h.done;
  cb.onchange=function(){h.done=cb.checked?Date.now():0;hwSave();rHw();if(typeof bnr==='function')bnr()};
  var n=el('div','n'),ti=el('div','hwt');
  if(h.sb)ti.appendChild(el('span','tag c-'+subjCol(h.sb),h.sb));
  var tx=el('span',null,h.t);if(h.done)tx.style.textDecoration='line-through';ti.appendChild(tx);n.appendChild(ti);
  if(h.note)n.appendChild(el('small',null,h.note.length>70?h.note.slice(0,70)+'…':h.note));
  if(h.att&&h.att.length)n.appendChild(el('small',null,'📎 '+h.att.length+' 个附件'));
  n.style.cursor='pointer';n.onclick=function(){openHw(h)};
  r.appendChild(cb);r.appendChild(n);
  var u=safeUrl(h.link);if(u){var a=el('a','lk','🔗');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.title=u;r.appendChild(a)}
  return r}
function group(box,title,list,cls){
  if(!list.length)return;var g=el('div','hwg'+(cls?' '+cls:''),title);box.appendChild(g);list.forEach(function(h){box.appendChild(hwRow(h))})}
function rHw(){
  var f=document.getElementById('hwf');f.innerHTML='';
  [['todo','待办'],['all','全部'],['done','已完成']].forEach(function(p){var b=el('button','chip'+(HF.st===p[0]?' on':''),p[1]);b.onclick=function(){HF.st=p[0];rHw()};f.appendChild(b)});
  var subs=[];HW.forEach(function(h){if(h.sb&&subs.indexOf(h.sb)<0)subs.push(h.sb)});
  if(HF.sb&&subs.indexOf(HF.sb)<0)HF.sb='';
  if(subs.length){var all=el('button','chip'+(!HF.sb?' on':''),'全部科目');all.onclick=function(){HF.sb='';rHw()};f.appendChild(all);
    subs.forEach(function(s){var b=el('button','chip'+(HF.sb===s?' on':''),s);b.onclick=function(){HF.sb=HF.sb===s?'':s;rHw()};f.appendChild(b)})}
  var box=document.getElementById('hwl');box.innerHTML='';
  var L=HW.filter(hwMatch),todo=L.filter(function(h){return !h.done}),done=L.filter(function(h){return h.done});
  if(!L.length){box.appendChild(el('div','msg',HW.length?'没有符合条件的作业～':'还没有作业，点上面的“＋ 新作业”记一条吧 🐱'));return}
  var t=isoOf(todayDn),by={},nod=[],over=[];
  todo.forEach(function(h){if(!h.due)nod.push(h);else if(h.due<t)over.push(h);else(by[h.due]=by[h.due]||[]).push(h)});
  over.sort(function(a,b){return a.due<b.due?-1:1});
  group(box,'⚠️ 已逾期',over,'over');
  Object.keys(by).sort().forEach(function(k){group(box,dueLabel(k),by[k])});
  group(box,'📭 没有截止日期',nod);
  done.sort(function(a,b){return b.done-a.done});
  group(box,'✅ 已完成',done,'dn2');
}
document.getElementById('hwq').oninput=function(){HF.q=this.value.trim();rHw()};

// ---- 弹窗 ----
var hm5=document.getElementById('mask5'),hwn=document.getElementById('hwn'),hwsb=document.getElementById('hwsb'),hwdu=document.getElementById('hwdu'),hwno=document.getElementById('hwno'),hwli=document.getElementById('hwli');
var HC=null,HAT=[],HNEW=[],HRM=[],HWID='';
var hwat=document.getElementById('hwat'),hwfi=document.getElementById('hwfi'),hwam=document.getElementById('hwam');
function rAt(){
  hwat.innerHTML='';
  HAT.forEach(function(m,i){
    var b=el('button','chip',(/^image\//.test(m.type)?'🖼 ':'📄 ')+m.name+' · '+fmtSize(m.size));
    b.onclick=function(){fileOpen(m,HWID)};
    var u=el('u',null,'×');u.onclick=function(e){e.stopPropagation();HAT.splice(i,1);
      var k=HNEW.indexOf(m.id);if(k>=0){HNEW.splice(k,1);fileDel(m.id)}else HRM.push(m.id);rAt()};
    b.appendChild(u);hwat.appendChild(b)});
  hwam.textContent=fileOK()?'':'附件功能没加载（缺少 Dexie 库，检查网络）'}
hwfi.onchange=async function(){
  var fs=[].slice.call(hwfi.files);hwfi.value='';
  for(var i=0;i<fs.length;i++){
    try{hwam.textContent='处理中…';var m=await fileAdd(HWID,fs[i]);HAT.push(m);HNEW.push(m.id)}
    catch(e){alert(String(e.message||e))}}
  rAt()};
function hwCancel(){HNEW.forEach(fileDel);HNEW=[];closeHw()}   // 取消：这次新加的文件也删掉
[['今天',0],['明天',1],['下周同一天',7]].forEach(function(p){var b=el('button','chip',p[0]);b.onclick=function(){hwdu.value=isoOf(todayDn+p[1])};document.getElementById('hwqd').appendChild(b)});
var noDue=el('button','chip','不设截止');noDue.onclick=function(){hwdu.value=''};document.getElementById('hwqd').appendChild(noDue);
function openHw(h){
  HC=h||null;document.getElementById('hwt').textContent=h?'修改作业':'新作业';
  HWID=h?h.id:uid();HAT=h&&h.att?h.att.slice():[];HNEW=[];HRM=[];rAt();
  hwn.value=h?h.t:'';hwsb.value=h?(h.sb||''):(HF.sb||'');hwdu.value=h?(h.due||''):isoOf(todayDn+1);hwno.value=h?(h.note||''):'';hwli.value=h?(h.link||''):'';
  var dl3=document.getElementById('hwsl');dl3.innerHTML='';subjList().forEach(function(s){var o=document.createElement('option');o.value=s;dl3.appendChild(o)});
  document.getElementById('hwd').style.display=h?'':'none';
  hm5.classList.add('show');setTimeout(function(){hwn.focus()},50)}
function closeHw(){hm5.classList.remove('show')}
hm5.onclick=hwCancel;document.getElementById('hwx').onclick=hwCancel;
document.getElementById('hwa').onclick=function(){openHw(null)};
document.getElementById('hwd').onclick=function(){if(!HC||!confirm('删除这条作业？'))return;(HC.att||[]).forEach(function(a){fileDel(a.id)});HNEW.forEach(fileDel);HNEW=[];HW=HW.filter(function(z){return z!==HC});hwSave();closeHw();rHw();if(typeof bnr==='function')bnr()};
document.getElementById('hwok').onclick=function(){
  var t=hwn.value.trim();if(!t){hwn.focus();return}
  var lk=hwli.value.trim();if(lk&&!safeUrl(lk)){alert('链接要以 http:// 或 https:// 开头（或直接写网址）');return}
  var o=HC||{id:HWID,done:0,ts:Date.now()};
  o.t=t.slice(0,60);o.sb=hwsb.value.trim().slice(0,12);o.due=hwdu.value||'';o.note=hwno.value.trim().slice(0,300);o.link=lk;
  o.att=HAT.slice();if(!o.att.length)delete o.att;HRM.forEach(fileDel);HNEW=[];HRM=[];
  if(!HC)HW.push(o);hwSave();closeHw();if(window.fileFlush)fileFlush();rHw();if(typeof bnr==='function')bnr()};
