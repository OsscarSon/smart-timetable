// 🔍 全局搜索：课程、活动（所有周）、重复活动、作业、提醒、饮食、护肤。精确包含优先，再用 Fuse.js 做模糊匹配（容错、少打字）。点一条直接跳过去。
(function(){
  var m=document.getElementById('mask7'),q=document.getElementById('sq'),box=document.getElementById('srl');
  function open(){q.value='';run();m.classList.add('show');setTimeout(function(){q.focus()},50)}
  function close(){m.classList.remove('show')}
  m.onclick=close;document.getElementById('sx').onclick=close;
  document.getElementById('srchb').onclick=open;
  window.openSearch=open;
  function jump(w,wd,fn){close();showView('tt');if(w!==curW){pendSel=wd;go2(w)}else{selWd=wd;drawDay()}if(fn)fn()}
  // 先收集所有可搜的条目（k = 用来匹配的文字），再做“精确包含”+“模糊匹配（Fuse.js，容错错别字 / 少打字）”
  function collect(){
    var A=[];function add(k,it){it.k=k.filter(Boolean).join(' ').toLowerCase();A.push(it)}
    FX.forEach(function(x){add([x.t,x.room,x.bld,x.teacher,x.type],{i:'🏫',t:x.t,s:'周'+DAYS[x.day]+' '+tmin(x.s)+'–'+tmin(x.e)+' · '+[(x.bld||'')+(x.room||''),x.teacher].filter(Boolean).join(' · '),f:function(){close();openLesson(x)}})});
    Object.keys(WK).map(Number).sort(function(a,b){return a-b}).forEach(function(w){(WK[w]||[]).forEach(function(x){
      var dt=wkDay(w,x.day);add([x.t],{i:'📌',t:x.t,s:dt.m+'/'+dt.d+' 周'+DAYS[x.day]+' '+tmin(x.s)+'–'+tmin(x.e),f:function(){jump(w,x.day,function(){openDlg(x,false)})}})})});
    RP.forEach(function(r){add([r.t],{i:'🔁',t:r.t,s:'周'+DAYS[r.day]+' '+tmin(r.s)+'–'+tmin(r.e)+' · 每'+(r.mo?'月':(r.ev>1?r.ev+' ':'')+'周')+'重复',
      f:function(){var b=RPW.filter(function(z){return z.rp===r})[0];if(!b){close();alert('这个重复活动本周没有出现，翻到有它的那一周再点开就能改。');return}jump(curW,b.day,function(){openDlg(b,false)})}})});
    HW.forEach(function(h){add([h.t,h.sb,h.note],{i:h.done?'✅':'📝',t:h.t,s:(h.sb?h.sb+' · ':'')+(h.due?'截止 '+h.due:'无截止日期'),f:function(){close();showView('hw');openHw(h)}})});
    RM.forEach(function(r){add([r.t],{i:'🔔',t:r.t,s:'提醒 '+(+r.day>=0?'周'+DAYS[r.day]:'不限日')+' '+(r.tm||''),f:function(){close();showView('tt')}})});
    if(window.DI)Object.keys(DI.days).sort().reverse().slice(0,30).forEach(function(d){DI.days[d].m.forEach(function(m){add([m.n,m.t],{i:'🥗',t:m.n,s:d+' · '+m.t+' · '+m.k+' kcal',f:function(){close();showView('di')}})})});
    if(window.BT)['am','pm'].forEach(function(p){BT[p].forEach(function(n){add([n],{i:'💄',t:n,s:p==='am'?'早上护肤':'晚上护肤',f:function(){close();showView('bt')}})})});
    return A}
  function run(){
    box.innerHTML='';var qq=q.value.trim().toLowerCase();
    if(!qq){box.appendChild(el('div','msg','输入关键字，例如：数学 / 教室号 / 老师 / 作业名（打错一两个字也能找到）'));return}
    var A=collect(),ks=qq.split(/\s+/).filter(Boolean);
    var R=A.filter(function(a){return ks.every(function(k){return a.k.indexOf(k)>=0})});
    if(window.Fuse&&qq.length>=2){
      var seen=new Set(R);
      R=R.concat(new Fuse(A,{keys:['k'],threshold:0.4,ignoreLocation:true,minMatchCharLength:2}).search(qq,{limit:30}).map(function(r){return r.item}).filter(function(a){return !seen.has(a)}))}
    if(!R.length){box.appendChild(el('div','msg','没找到“'+q.value.trim()+'”'));return}
    R.slice(0,40).forEach(function(r){
      var b=el('button','mrow sm'),d=el('div');d.appendChild(el('b',null,r.t));d.appendChild(el('small',null,r.s));
      b.appendChild(el('span',null,r.i));b.appendChild(d);b.appendChild(el('i',null,'›'));b.onclick=r.f;box.appendChild(b)});
    if(R.length>40)box.appendChild(el('div','msg','只显示前 40 条，请缩小关键字'))}
  q.oninput=run;
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
})();
