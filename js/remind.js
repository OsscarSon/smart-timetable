// 提醒 + 今日/本周清单 + 顶部提示
  // ===== 清单 / 提醒 / 记录条目 =====
  var RM=[],LG=[{t:'',d:0}];
  try{RM=JSON.parse(localStorage.getItem('mochi-rm')||'[]');var l0=JSON.parse(localStorage.getItem('mochi-lg')||'null');if(l0&&l0.length)LG=l0}catch(e){}
  function wl(box,flt,list,w){
    var ww=w===undefined?curW:w;
    box.innerHTML='';var L=(list||data).filter(flt).sort(function(a,b){return a.day-b.day||a.h-b.h});
    if(!L.length){box.appendChild(el('div','msg','还没有安排～'));return}
    L.forEach(function(x,i){var r=el('label','tp'),cb=el('input');cb.type='checkbox';cb.checked=!!DN[kk(x,ww)];
      cb.onchange=function(){if(cb.checked)DN[kk(x,ww)]=1;else delete DN[kk(x,ww)];put2(K_DN,DN);draw()};
      var n=el('div','n',(i+1)+'. 周'+DAYS[x.day]+' '+hm(x.h)+' '+x.t+(x.rp?' 🔁':''));if(cb.checked)n.style.textDecoration='line-through';
      r.appendChild(cb);r.appendChild(n);box.appendChild(r)});
  }
  function rRm(){
    var box=document.getElementById('rml');box.innerHTML='';
    if(!RM.length)box.appendChild(el('div','msg','点下面“加一条提醒”～'));
    RM.forEach(function(m,i){var r=el('div','tp rm');
      var cb=el('input');cb.type='checkbox';cb.checked=!!m.d;cb.onchange=function(){m.d=cb.checked;put2('mochi-rm',RM);bnr()};
      var t=el('input');t.type='text';t.value=m.t;t.placeholder='要提醒自己什么？';t.oninput=function(){m.t=t.value;put2('mochi-rm',RM)};
      var sl=el('select');[['-1','不限日']].concat(DAYS.map(function(n,k){return [k,'周'+n]})).forEach(function(p){var o=el('option',null,p[1]);o.value=p[0];sl.appendChild(o)});
      sl.value=m.day;sl.onchange=function(){m.day=+sl.value;put2('mochi-rm',RM);bnr()};
      var tm=el('input');tm.type='time';tm.value=m.tm||'';tm.onchange=function(){m.tm=tm.value;put2('mochi-rm',RM);bnr()};
      var x=el('button',null,'×');x.onclick=function(){RM.splice(i,1);put2('mochi-rm',RM);rRm();bnr()};
      r.appendChild(el('span',null,(i+1)+'.'));[cb,t,sl,tm,x].forEach(function(e){r.appendChild(e)});box.appendChild(r)});
  }
  document.getElementById('rma').onclick=function(){RM.push({t:'',day:todayIdx,tm:'',d:false});put2('mochi-rm',RM);rRm()};
  function bnr(){
    var n=thisEvents().filter(function(x){return x.day===todayIdx&&!DN[kk(x,thisW)]}).length+RM.filter(function(m){return !m.d&&+m.day===todayIdx}).length;
    var now=pad2(new Date().getHours())+':'+pad2(new Date().getMinutes());
    var od=RM.filter(function(m){return !m.d&&+m.day===todayIdx&&m.tm&&m.tm<=now})[0];
    var ne=nearestExam(),ex=ne?'　📅 '+ne.s+'考试剩 '+ne.d+' 天':'';var hn=(typeof hwDue==='function')?hwDue():null;if(hn&&(hn.over||hn.today))ex+='　📝 作业：'+(hn.over?'逾期 '+hn.over+' 项 ':'')+(hn.today?'今天截止 '+hn.today+' 项':'');
    document.getElementById('bn').textContent=(od?'⏰ 该做啦：'+od.t:(n?'📌 今天还有 '+n+' 件事要完成，加油！':'🎉 今天的事都完成啦！'))+ex;
  }
  rf=function(){
    var b0=document.getElementById('wl0');
    wl(b0,function(x){return x.day===todayIdx},thisEvents(),thisW);
    var ls=todayLessons();                       // 今天的固定课程放在最前面（只显示，不用勾）
    if(ls.length){var em=b0.querySelector('.msg');if(em)em.remove();
      ls.slice().reverse().forEach(function(l){var r=el('div','tp'),n=el('div','n',tmin(l.s)+'–'+tmin(l.e)+' '+(l.type==='考试'?'📝 ':'🏫 ')+l.t);
        var sm=[l.room,l.teacher].filter(Boolean).join(' · ');if(sm)n.appendChild(el('small',null,sm));r.appendChild(n);b0.insertBefore(r,b0.firstChild)})}
    wl(document.getElementById('wl1'),function(x){return x.a===1});wl(document.getElementById('wl2'),function(x){return x.a===2});bnr()};
