// 学习：章节 + 间隔复习 + 考试倒推 + 自动排程
  // ===== 学习：章节 + 间隔复习 + 自动排程 =====
  var ST={subs:['华文','英文','数学','物理','化学'],topics:[]},sel=0;
  try{var q=JSON.parse(localStorage.getItem('mochi-st')||'null');if(q&&q.subs)ST=q}catch(e){}
  ST.ex=ST.ex||{};
  function sv(){try{localStorage.setItem('mochi-st',JSON.stringify(ST))}catch(e){}}
  var tn0=Math.floor(Date.now()/864e5);
  function fmt(n){var x=new Date(n*864e5+(new Date().getTimezoneOffset()*6e4));return (x.getMonth()+1)+'/'+x.getDate()}
  function rSt(){
    var sb=document.getElementById('subs');sb.innerHTML='';
    var cs=ST.subs[sel];document.getElementById('exl').textContent=cs?'📅 '+cs+' 考试日':'';document.getElementById('exd').value=(ST.ex&&ST.ex[cs])||'';
    ST.subs.forEach(function(n,i){var b=el('button','chip'+(i===sel?' on':''),n+(dleft(n)!==null?' · '+dleft(n)+'天':''));
      var u=el('u',null,'×');u.onclick=function(e){e.stopPropagation();if(confirm('删除科目「'+n+'」及其章节？')){ST.topics=ST.topics.filter(function(t){return t.s!==n});ST.subs.splice(i,1);sel=0;sv();rSt()}};
      b.appendChild(u);b.onclick=function(){sel=i;rSt()};sb.appendChild(b)});
    var tl=document.getElementById('tl');tl.innerHTML='';
    if(!ST.topics.length)tl.appendChild(el('div','msg','还没有章节～'));
    ST.topics.slice().sort(function(a,b){return a.nx-b.nx}).forEach(function(t){
      var due=t.iv===0||t.nx<=tn0,r=el('div','tp'),n=el('div','n'+(due?' due':''),t.s+' · '+t.n);
      n.appendChild(el('small',null,t.iv===0?'🆕 还没学过':due?'🔔 今天该复习':'下次复习 '+fmt(t.nx)+'（间隔 '+t.iv+' 天）'));
      r.appendChild(n);
      if(due)[['😵',0],['🤔',1],['😎',2]].forEach(function(p){var b=el('button',null,p[0]);b.title=['忘了','模糊','记得'][p[1]];
        b.onclick=function(){rate(t,p[1])};r.appendChild(b)});
      var d=el('button',null,'🗑');d.onclick=function(){ST.topics=ST.topics.filter(function(x){return x!==t});sv();rSt()};r.appendChild(d);
      tl.appendChild(r)});
  }
  function rate(t,g){ // 简易间隔算法（之后换成 FSRS）
    t.iv=nextInterval(t.iv,g,dleft(t.s));
    t.nx=tn0+t.iv;sv();rSt();
    document.getElementById('msg').textContent=g===0?'没关系，明天再来一次 💪':'下次复习：'+fmt(t.nx)+' ✨';
  }
  document.getElementById('sa').onclick=function(){var i=document.getElementById('sn'),v=i.value.trim();if(v&&ST.subs.indexOf(v)<0){ST.subs.push(v);sel=ST.subs.length-1;sv();rSt()}i.value=''};
  document.getElementById('ta').onclick=function(){var i=document.getElementById('tn'),v=i.value.trim();
    if(!v||!ST.subs.length)return;ST.topics.push({s:ST.subs[sel],n:v.slice(0,20),iv:0,nx:tn0});sv();rSt();i.value=''};
  function put(day,hs,len,t,c){for(var k=0;k<hs.length;k++)if(free(day,hs[k],len)){data.push({day:day,h:hs[k],len:len,t:t.slice(0,14),c:c,a:1});return true}return false}
  document.getElementById('plan').onclick=function(){
    data=data.filter(function(x){return x.a!==1});
    var used=[],cnt={r:0,q:0,p:0},last='';
    var due=ST.topics.filter(function(t){return t.iv>0}).sort(function(a,b){return (dd(a.s)-dd(b.s))||(a.nx-b.nx)});
    var fresh=ST.topics.filter(function(t){return t.iv===0&&(dleft(t.s)===null||dleft(t.s)>2)});
    var withT=ST.subs.filter(function(s){return ST.topics.some(function(t){return t.s===s})});
    var rot=[];withT.slice().sort(function(a,b){return dd(a)-dd(b)}).forEach(function(s){var D=dleft(s);if(D!==null&&D<=0)return;var r=D===null?1:D<=7?3:D<=14?2:1;for(var k=0;k<r;k++)rot.push(s)});
    for(var d=todayIdx;d<7;d++){
      var dn=tn0+d-todayIdx;
      var cand=due.filter(function(t){return used.indexOf(t)<0&&t.nx<=dn});
      var pk=cand.filter(function(t){return t.s!==last})[0]||cand[0];
      if(pk&&put(d,[9,10,8],2,'🔁 '+pk.s+'·'+pk.n,'mint')){used.push(pk);last=pk.s;cnt.r++}
      if(rot.length){var s2=rot[(d+cnt.q)%rot.length];if(put(d,[15,16,14],2,'✏️ '+s2+'·做题','pink'))cnt.q++}
      var f=fresh.filter(function(t){return used.indexOf(t)<0})[0];
      if(f&&put(d,[19,20],1,'👀 '+f.s+'·'+f.n,'sky')){used.push(f);cnt.p++}
    }
    save();draw();
    document.getElementById('msg').textContent=(cnt.r+cnt.q+cnt.p)?'已排好：复习 '+cnt.r+'、做题 '+cnt.q+'、预习 '+cnt.p+' 个时段'+(nearestExam()?'；'+nearestExam().s+'考试还有 '+nearestExam().d+' 天，已加强':'')+'，去时间表看看吧 🐱':'没有可排的内容，先加入章节吧～';
  };
  // ---- 考试日期 ----
  function dleft(s){var v=ST.ex&&ST.ex[s];if(!v)return null;var p=v.split('-'),e=new Date(+p[0],+p[1]-1,+p[2]),t=new Date();t=new Date(t.getFullYear(),t.getMonth(),t.getDate());var n=Math.round((e-t)/864e5);return n<0?null:n}
  function dd(s){var x=dleft(s);return x===null?999:x}
  function nearestExam(){var b=null;ST.subs.forEach(function(s){var x=dleft(s);if(x!==null&&(!b||x<b.d))b={s:s,d:x}});return b}
  document.getElementById('exd').onchange=function(){var cs=ST.subs[sel];if(!cs)return;ST.ex=ST.ex||{};if(this.value)ST.ex[cs]=this.value;else delete ST.ex[cs];sv();rSt()};
