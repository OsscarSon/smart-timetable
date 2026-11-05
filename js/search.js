// 🔍 全局搜索：课程、活动（所有周）、重复活动、作业、提醒。点一条直接跳过去。
(function(){
  var m=document.getElementById('mask7'),q=document.getElementById('sq'),box=document.getElementById('srl');
  function open(){q.value='';run();m.classList.add('show');setTimeout(function(){q.focus()},50)}
  function close(){m.classList.remove('show')}
  m.onclick=close;document.getElementById('sx').onclick=close;
  document.getElementById('srchb').onclick=open;document.getElementById('mr-srch').onclick=function(){open()};
  window.openSearch=open;
  function hit(){var a=[].slice.call(arguments).join(' ').toLowerCase(),ks=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);return ks.length&&ks.every(function(k){return a.indexOf(k)>=0})}
  function jump(w,wd,fn){close();showView('tt');if(w!==curW){pendSel=wd;go2(w)}else{selWd=wd;drawDay()}if(fn)fn()}
  function run(){
    box.innerHTML='';var R=[],qq=q.value.trim();
    if(!qq){box.appendChild(el('div','msg','输入关键字，例如：数学 / 教室号 / 老师 / 作业名'));return}
    FX.forEach(function(x){if(hit(x.t,x.room,x.bld,x.teacher,x.type))R.push({i:'🏫',t:x.t,s:'周'+DAYS[x.day]+' '+tmin(x.s)+'–'+tmin(x.e)+' · '+[(x.bld||'')+(x.room||''),x.teacher].filter(Boolean).join(' · '),f:function(){close();openLesson(x)}})});
    Object.keys(WK).map(Number).sort(function(a,b){return a-b}).forEach(function(w){(WK[w]||[]).forEach(function(x){
      if(!hit(x.t))return;var dt=wkDay(w,x.day);R.push({i:'📌',t:x.t,s:dt.m+'/'+dt.d+' 周'+DAYS[x.day]+' '+tmin(x.s)+'–'+tmin(x.e),f:function(){jump(w,x.day,function(){openDlg(x,false)})}})})});
    RP.forEach(function(r){if(!hit(r.t))return;R.push({i:'🔁',t:r.t,s:'周'+DAYS[r.day]+' '+tmin(r.s)+'–'+tmin(r.e)+' · 每'+(r.mo?'月':(r.ev>1?r.ev+' ':'')+'周')+'重复',
      f:function(){var b=RPW.filter(function(z){return z.rp===r})[0];if(!b){close();alert('这个重复活动本周没有出现，翻到有它的那一周再点开就能改。');return}jump(curW,b.day,function(){openDlg(b,false)})}})});
    HW.forEach(function(h){if(hit(h.t,h.sb,h.note))R.push({i:h.done?'✅':'📝',t:h.t,s:(h.sb?h.sb+' · ':'')+(h.due?'截止 '+h.due:'无截止日期'),f:function(){close();showView('hw');openHw(h)}})});
    RM.forEach(function(r){if(hit(r.t))R.push({i:'🔔',t:r.t,s:'提醒 '+(+r.day>=0?'周'+DAYS[r.day]:'不限日')+' '+(r.tm||''),f:function(){close();showView('tt')}})});
    if(!R.length){box.appendChild(el('div','msg','没找到“'+qq+'”'));return}
    R.slice(0,40).forEach(function(r){
      var b=el('button','mrow sm'),d=el('div');d.appendChild(el('b',null,r.t));d.appendChild(el('small',null,r.s));
      b.appendChild(el('span',null,r.i));b.appendChild(d);b.appendChild(el('i',null,'›'));b.onclick=r.f;box.appendChild(b)});
    if(R.length>40)box.appendChild(el('div','msg','只显示前 40 条，请缩小关键字'))}
  q.oninput=run;
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
})();
