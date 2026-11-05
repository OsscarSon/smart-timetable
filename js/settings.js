// 设置：外观、日历、多课表与归档、课表时间范围、备份
var THEMES=[['system','🌗 跟随系统'],['light','☀️ 亮色'],['dark','🌙 暗色']];
var ACCS=['#ff8f4d','#ff7aa2','#e85d75','#9b7bff','#4da3ff','#2ec4a6','#7bc043','#f5b700'];
var WSS=[[0,'周一'],[6,'周日'],[5,'周六']];
function saveSet(){put2('mochi-set',SET)}

// ---- 外观（向导也会用到这两个组件）----
function mkThemeChips(box,after){
  box.innerHTML='';
  THEMES.forEach(function(t){var b=el('button','chip'+(SET.theme===t[0]?' on':''),t[1]);
    b.onclick=function(){SET.theme=t[0];saveSet();applyTheme();mkThemeChips(box,after);if(after)after()};box.appendChild(b)})}
function mkAccSw(box,after){
  box.innerHTML='';
  var curA=(SET.acc||DEF_ACC).toLowerCase();
  ACCS.forEach(function(c){var i=el('i',curA===c?'on':'');i.style.background=c;i.title=c;
    i.onclick=function(){SET.acc=c===DEF_ACC?'':c;saveSet();applyTheme();mkAccSw(box,after);if(after)after()};box.appendChild(i)});
  var lab=el('label','custom'),ci=el('input');ci.type='color';ci.value=/^#[0-9a-f]{6}$/i.test(SET.acc||'')?SET.acc:DEF_ACC;
  ci.oninput=function(){SET.acc=ci.value;applyTheme()};
  ci.onchange=function(){SET.acc=ci.value;saveSet();applyTheme();mkAccSw(box,after);if(after)after()};
  lab.appendChild(el('span',null,'自选'));lab.appendChild(ci);box.appendChild(lab)}
mkThemeChips(document.getElementById('thm'));if(window.mkLangChips)mkLangChips(document.getElementById('lng'));mkAccSw(document.getElementById('acc'));

// ---- 日历 ----
// 一周起始日变了：按真实日期把所有已存的周重新归位，数据不会丢也不会错位
function rebucketAll(o,n){
  if(o===n)return;
  function nw(w,wd){var dn=w*7-3+o+((wd-o+7)%7);return Math.floor((dn+3-n)/7)}
  TTS.list.forEach(function(t){
    var W=weeksOf(t.id),kd=tkOf('mochi-dn',t.id),D=lget(kd,null),N={};
    Object.keys(W).forEach(function(w){W[w].forEach(function(e){var w2=nw(+w,e.day);(N[w2]=N[w2]||[]).push(e)})});
    weekKeysOf(t.id).forEach(function(k){localStorage.removeItem(k)});
    Object.keys(N).forEach(function(w){put2(wkKeyOf(t.id,w),N[w])});
    if(D){var M={};Object.keys(D).forEach(function(k){var m=k.match(/^(-?\d+)-(\d)-(.*)$/);if(!m){M[k]=D[k];return}M[nw(+m[1],+m[2])+'-'+m[2]+'-'+m[3]]=D[k]});put2(kd,M)}
  })}
var wsel=document.getElementById('wsel');
WSS.forEach(function(p){var o=el('option',null,p[1]);o.value=p[0];wsel.appendChild(o)});wsel.value=SET.ws;
wsel.onchange=function(){var o=SET.ws,n=+wsel.value;rebucketAll(o,n);SET.ws=n;saveSet();location.reload()};
var hwk=document.getElementById('hwk'),h24=document.getElementById('h24');hwk.checked=!!SET.hw;h24.checked=!!SET.h24;
function redrawAll(){draw();rFx();rPer();if(typeof rHw==='function')rHw();if(typeof dlgRefill==='function')dlgRefill()}
hwk.onchange=function(){SET.hw=hwk.checked;saveSet();redrawAll()};
h24.onchange=function(){SET.h24=h24.checked;saveSet();redrawAll()};
var sh0=document.getElementById('sh0'),sh1=document.getElementById('sh1');
[6,7,8].forEach(function(h){var o=el('option',null,'从 '+h+':00 开始');o.value=h;sh0.appendChild(o)});sh0.value=SET.h0;
[22,23,24].forEach(function(h){var o=el('option',null,'到 '+h+':00 结束');o.value=h;sh1.appendChild(o)});sh1.value=SET.h1;
sh0.onchange=sh1.onchange=function(){SET.h0=+sh0.value;SET.h1=+sh1.value;saveSet();location.reload()};


// ---- 视图：密度 / 吸附 / 折叠周末 / 列表里显示的字段 ----
(function(){
  var dn=document.getElementById('vdens'),sn=document.getElementById('vsnap'),wc=document.getElementById('vwkc'),sr=document.getElementById('vsr'),st=document.getElementById('vst');
  dn.value=SET.dens||'std';sn.value=String(SET.snap||15);wc.checked=!!SET.wkc;sr.checked=SET.sr!==false;st.checked=SET.st!==false;
  dn.onchange=function(){SET.dens=dn.value;saveSet();location.reload()};
  sn.onchange=function(){SET.snap=+sn.value;saveSet()};
  wc.onchange=function(){SET.wkc=wc.checked;saveSet();draw()};
  sr.onchange=function(){SET.sr=sr.checked;saveSet();draw()};
  st.onchange=function(){SET.st=st.checked;saveSet();draw()};
})();

// ---- 多课表与归档 ----
function cntLessons(t){return lget(tkOf('mochi-fx',t.id),[]).length}
function switchTT(id){TTS.active=id;ttSave();location.reload()}
function liveList(){return TTS.list.filter(function(t){return !t.arch})}
function rTT(){
  var box=document.getElementById('ttl');box.innerHTML='';document.getElementById('ttn').textContent=TT.name;
  function row(t){
    var r=el('div','tp'),n=el('div','n'),act=t.id===TT.id;
    n.appendChild(el('b',null,(act?'✅ ':'')+t.name));
    n.appendChild(el('small',null,cntLessons(t)+' 门固定课'+(t.cyc>1?' · '+t.cyc+' 周循环':'')));
    r.appendChild(n);
    if(!t.arch&&!act){var go=el('button',null,'切换');go.onclick=function(){switchTT(t.id)};go.style.fontSize='13px';r.appendChild(go)}
    var rn=el('button',null,'✏️');rn.title='重命名';
    rn.onclick=function(){var v=prompt('课表名称',t.name);if(v&&v.trim()){t.name=v.trim().slice(0,12);ttSave();rTT();ttSel()}};r.appendChild(rn);
    var ar=el('button',null,t.arch?'♻️':'📦');ar.title=t.arch?'恢复':'归档';
    ar.onclick=function(){
      if(!t.arch&&liveList().length<=1){alert('至少要保留一个正在用的课表');return}
      t.arch=!t.arch;ttSave();
      if(t.arch&&act){var o=liveList()[0];switchTT(o.id)}else{rTT();ttSel()}};r.appendChild(ar);
    var dl2=el('button',null,'🗑');dl2.title='删除';
    dl2.onclick=function(){
      if(TTS.list.length<=1){alert('这是唯一的课表，不能删');return}
      if(!t.arch&&liveList().length<=1){alert('至少要保留一个正在用的课表');return}
      if(!confirm('删除课表「'+t.name+'」及里面所有安排、课程、作业？不能恢复。（想保留请用“归档”）'))return;
      lget(tkOf('mochi-hw',t.id),[]).forEach(function(h){(h.att||[]).forEach(function(a){fileDel(a.id)})});   // 作业附件一起删
      ['mochi-fx','mochi-dn','mochi-rp','mochi-hw'].forEach(function(b){try{localStorage.removeItem(tkOf(b,t.id))}catch(e){}});weekKeysOf(t.id).forEach(function(k){try{localStorage.removeItem(k)}catch(e){}});try{localStorage.removeItem(tkOf('mochi-wk',t.id))}catch(e){}
      TTS.list=TTS.list.filter(function(z){return z!==t});ttSave();
      if(act)switchTT(liveList()[0].id);else{rTT();ttSel()}};r.appendChild(dl2);
    return r}
  liveList().forEach(function(t){box.appendChild(row(t))});
  var ar2=TTS.list.filter(function(t){return t.arch});
  if(ar2.length){box.appendChild(el('div','msg','📦 已归档（数据保留，不再出现在切换列表）'));ar2.forEach(function(t){box.appendChild(row(t))})}
}
document.getElementById('tta').onclick=function(){
  var v=prompt('新课表叫什么？例如：运动、备考','');if(!v||!v.trim())return;
  var t={id:'t'+uid(),name:v.trim().slice(0,12),arch:false,cyc:1,anc:mondayDn(todayDn),per:TT.per.map(function(p){return {s:p.s,e:p.e}})};
  TTS.list.push(t);ttSave();
  if(confirm('已创建「'+t.name+'」。现在切换过去吗？'))switchTT(t.id);else{rTT();ttSel()}};

// ---- 备份（可选连附件一起导出）----
function backupObj(){var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('mochi-')===0&&k.indexOf('mochi-sync')!==0)o[k]=localStorage.getItem(k)}return o}
function b64Of(blob){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){var s=String(r.result);ok(s.slice(s.indexOf(',')+1))};r.onerror=no;r.readAsDataURL(blob)})}
function saveJson(o,name){
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));a.download=name;
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function bname(x){return 'mochi-backup'+(x||'')+'-'+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'.json'}
document.getElementById('bex').onclick=function(){
  saveJson(backupObj(),bname());
  document.getElementById('semsg').textContent='已导出（不含附件）。请把文件存好，例如传到云盘。'};
document.getElementById('bexf').onclick=async function(){
  var msg=document.getElementById('semsg');
  if(typeof FDB==='undefined'||!FDB){msg.textContent='附件功能没加载（缺少 Dexie 库），只能导出普通备份。';return}
  try{
    msg.textContent='正在打包附件…';var o=backupObj(),L=await FDB.files.toArray(),F=[];
    for(var i=0;i<L.length;i++){var r=L[i];if(!r.blob)continue;F.push({id:r.id,hw:r.hw,name:r.name,type:r.type,size:r.size,data:await b64Of(r.blob)})}
    o.__files=F;saveJson(o,bname('-附件'));
    msg.textContent='已导出，含 '+F.length+' 个附件。文件可能比较大，请存好。'
  }catch(e){msg.textContent='导出失败：'+String(e.message||e).slice(0,80)}};
document.getElementById('bim').onclick=function(){document.getElementById('bfile').click()};
document.getElementById('bfile').onchange=function(){
  var f=this.files[0];if(!f)return;var fr=new FileReader(),inp=this;
  fr.onload=async function(){try{
    var o=JSON.parse(fr.result),ks=Object.keys(o).filter(function(k){return k.indexOf('mochi-')===0&&k.indexOf('mochi-sync')!==0});
    if(!ks.length)throw 0;if(!confirm('导入会覆盖目前的内容，确定吗？'))return;
    if(Array.isArray(o.__files)&&o.__files.length&&typeof FDB!=='undefined'&&FDB){
      for(var i=0;i<o.__files.length;i++){var x=o.__files[i];
        var bin=atob(x.data),u8=new Uint8Array(bin.length);for(var j=0;j<bin.length;j++)u8[j]=bin.charCodeAt(j);
        await FDB.files.put({id:x.id,hw:x.hw||'',name:x.name,type:x.type,size:x.size,blob:new Blob([u8],{type:x.type}),ts:Date.now(),up:0})}}
    // 旧备份里是“所有周一个键”，导入时先清掉现有的按周键，避免新旧混在一起
    if(ks.some(function(k){return /^mochi-wk(-|$)/.test(k)||k.indexOf('mochi-wk:')===0}))
      TTS.list.forEach(function(t){weekKeysOf(t.id).forEach(function(k){localStorage.removeItem(k)})});
    ks.forEach(function(k){localStorage.setItem(k,String(o[k]))});location.reload()
  }catch(e){document.getElementById('semsg').textContent='这个文件不是有效的备份。'}inp.value=''};
  fr.readAsText(f)};
