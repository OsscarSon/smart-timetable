// 科目库：加过一次就记住，之后在课程编辑器里点「📚」直接选，不用每次打字。
// 数据：mochi-subj = [{n:名称, c:颜色, bl:楼栋, rm:教室, tc:老师}]（mochi-* 开头，会自动跟着云同步）
(function(){
  var KEY='mochi-subj';
  function lib(){var a=lget(KEY,[]);return Array.isArray(a)?a:[]}
  function save(a){put2(KEY,a.slice(0,200))}
  function find(a,n){for(var i=0;i<a.length;i++)if(a[i].n.toLowerCase()===String(n).toLowerCase())return i;return -1}
  // 第一次用：把已有课程里出现过的名字收进来
  function seed(){
    if(lget(KEY,null)!==null)return;
    var a=[];(typeof FX!=='undefined'?FX:[]).forEach(function(x){var n=String(x.t||'').trim();
      if(n&&find(a,n)<0)a.push({n:n,c:x.c||'sky',bl:x.bld||'',rm:x.room||'',tc:x.teacher||''})});
    save(a)}
  // 保存课程后：新名字自动入库；老名字更新记住的教室 / 老师
  function learn(x){
    var n=String(x.t||'').trim();if(!n)return;var a=lib(),i=find(a,n);
    var rec={n:n,c:x.c||'sky',bl:x.bld||'',rm:x.room||'',tc:x.teacher||''};
    if(i<0)a.push(rec);else{rec.n=a[i].n;a[i]=rec}save(a)}
  window.SUBJ={lib:lib,learn:learn,names:function(){return lib().map(function(s){return s.n})}};

  var mk=document.createElement('div');mk.className='mask full';mk.id='masksub';
  mk.innerHTML='<div class="dlg ed sub"><div class="ed-top"><button class="ed-x" id="sbx" aria-label="关闭">✕</button><h2 id="sbt">科目</h2></div><div class="ed-body" id="sbb"></div></div>';
  document.body.appendChild(mk);
  var body=mk.querySelector('#sbb'),title=mk.querySelector('#sbt'),onPick=null,curName='';
  function close(){mk.classList.remove('show')}
  mk.querySelector('#sbx').onclick=function(){if(mk._edit)list();else close()};

  function list(){
    mk._edit=false;title.textContent='科目';body.innerHTML='';
    var card=el('div','ed-card'),all=lib();
    var none=el('button','er sb-row');none.appendChild(el('span','sb-dot'));none.appendChild(el('span','sb-n','无'));
    if(!curName)none.appendChild(el('span','sb-ck','✓'));
    none.onclick=function(){if(onPick)onPick(null);close()};card.appendChild(none);
    all.forEach(function(s,i){
      var r=el('div','er sb-row sb-i'),pick=el('button','sb-pick'),d=el('span','sb-dot c-'+s.c);
      pick.appendChild(d);pick.appendChild(el('span','sb-n',s.n));
      if(s.n===curName)pick.appendChild(el('span','sb-ck','✓'));
      pick.onclick=function(){if(onPick)onPick(s);close()};
      var ed=el('button','sb-ed','✎');ed.setAttribute('aria-label','编辑');ed.onclick=function(){form(i)};
      r.appendChild(pick);r.appendChild(ed);card.appendChild(r)});
    mkSort(card,{item:'.sb-i',get:lib,done:function(a){save(a);list()}});
    body.appendChild(card);
    if(!all.length)body.appendChild(el('div','msg','还没有科目。点右下角 ＋ 添加，之后就能一点选中～'));
    var fab=el('button','sb-fab','＋');fab.setAttribute('aria-label','添加科目');fab.onclick=function(){form(-1)};body.appendChild(fab)}

  function form(i){
    mk._edit=true;var a=lib(),s=i>=0?a[i]:{n:'',c:COLS[a.length%COLS.length],bl:'',rm:'',tc:''},col=s.c;
    title.textContent=i>=0?'编辑科目':'添加科目';body.innerHTML='';
    function inp(ph){var x=el('input');x.placeholder=ph;x.maxLength=20;return x}
    var n=inp('科目名，如：数学'),bl=inp('常用楼栋（可选）'),rm=inp('常用教室（可选）'),tc=inp('常用老师（可选）');
    n.value=s.n;bl.value=s.bl||'';rm.value=s.rm||'';tc.value=s.tc||'';
    var c1=el('div','ed-card'),r0=el('label','er name');r0.appendChild(n);c1.appendChild(r0);body.appendChild(c1);
    var c2=el('div','ed-card');[['楼栋',bl],['教室',rm],['老师',tc]].forEach(function(p){var r=el('label','er');r.appendChild(el('span',null,p[0]));r.appendChild(p[1]);c2.appendChild(r)});body.appendChild(c2);
    var c3=el('div','ed-card'),r3=el('div','er');r3.appendChild(el('span',null,'颜色'));var sw=el('div','sw');
    function paint(){[].forEach.call(sw.children,function(k,x){k.classList.toggle('on',COLS[x]===col)})}
    COLS.forEach(function(cn){var k=el('i','c-'+cn);k.onclick=function(){col=cn;paint()};sw.appendChild(k)});paint();
    r3.appendChild(sw);c3.appendChild(r3);body.appendChild(c3);
    var ok=el('button','er-btn ok','保存');
    ok.onclick=function(){var nm=n.value.trim();if(!nm){n.focus();return}
      var b=lib(),j=find(b,nm);if(j>=0&&j!==i){alert('已经有这个科目了');return}
      var rec={n:nm,c:col,bl:bl.value.trim(),rm:rm.value.trim(),tc:tc.value.trim()};
      if(i>=0){var old=b[i].n;b[i]=rec;if(old!==nm&&typeof FX!=='undefined'&&confirm('把已有的「'+old+'」课程也改成「'+nm+'」？')){FX.forEach(function(x){if(x.t===old)x.t=nm});if(typeof fxSave==='function')fxSave();if(typeof draw==='function')draw()}}
      else b.push(rec);
      save(b);list()};
    var c4=el('div','ed-card');c4.appendChild(ok);body.appendChild(c4);
    if(i>=0){var del=el('button','er-btn','删除这个科目（不影响已有课程）');
      del.onclick=function(){if(!confirm('从科目库删除「'+s.n+'」？'))return;var b=lib();b.splice(i,1);save(b);list()};c4.appendChild(del)}}

  // 对外：打开选择器。cur = 当前名字，cb(科目或 null)
  window.openSubjects=function(cur,cb){seed();curName=cur||'';onPick=cb;list();mk.classList.add('show');mk.scrollTop=0};

  // ---- 接进课程编辑器 ----
  var lsn=document.getElementById('lsn'),host=lsn&&lsn.parentNode;
  if(host){
    var b=el('button','sb-open','📚');b.type='button';b.title='从科目库选';b.setAttribute('aria-label','从科目库选');
    b.onclick=function(){openSubjects(lsn.value.trim(),function(s){
      if(!s){lsn.value='';return}
      lsn.value=s.n;LS.col=s.c;lsPaint();
      var f=[['lsbld',s.bl],['lsrm',s.rm],['lstc',s.tc]];
      f.forEach(function(p){var e=document.getElementById(p[0]);if(e&&!e.value&&p[1])e.value=p[1]})})};
    host.appendChild(b);
    // 输入时给建议（datalist）
    var dl=document.createElement('datalist');dl.id='lssl';host.appendChild(dl);lsn.setAttribute('list','lssl');
    lsn.addEventListener('focus',function(){dl.innerHTML='';SUBJ.names().forEach(function(x){var o=document.createElement('option');o.value=x;dl.appendChild(o)})});
    // 输入已记住的名字后，空的教室 / 老师自动带出
    lsn.addEventListener('change',function(){var a=lib(),i=find(a,lsn.value.trim());if(i<0||LS.cur)return;var s=a[i];
      LS.col=s.c;lsPaint();[['lsbld',s.bl],['lsrm',s.rm],['lstc',s.tc]].forEach(function(p){var e=document.getElementById(p[0]);if(e&&!e.value&&p[1])e.value=p[1]})});
    // 保存成功（编辑器已关）后入库
    document.getElementById('lsok').addEventListener('click',function(){
      if(document.getElementById('mask2').classList.contains('show'))return;
      var n=lsn.value.trim();if(!n)return;
      var x=null;for(var i=FX.length-1;i>=0;i--)if(FX[i].t===n){x=FX[i];break}
      SUBJ.learn(x||{t:n,c:LS.col})})}
})();
