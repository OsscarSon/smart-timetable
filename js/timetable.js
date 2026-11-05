  // ---- 课表网格：真实日期、可翻周、可隐藏周末、起始日可选 ----
  function wtitle(){
    var a=dnDate(wsDn(curW)),b=dnDate(wsDn(curW)+6),y=a.y!==d.getFullYear()?a.y+'/':'';
    var cy=(TT.cyc>1)?' · 第'+cycIdx(dnOf(curW,0))+'周':'';
    document.getElementById('wt').textContent='🗓️ '+(curW===thisW?'本周 ':curW===thisW+1?'下周 ':curW===thisW-1?'上周 ':'')+y+a.m+'/'+a.d+'–'+b.m+'/'+b.d+cy}
  function ttSel(){
    var s=document.getElementById('ttsel'),L=TTS.list.filter(function(t){return !t.arch});
    s.innerHTML='';s.style.display=L.length>1?'':'none';
    L.forEach(function(t){var o=el('option',null,t.name);o.value=t.id;s.appendChild(o)});s.value=TT.id}
  function draw(){
    refreshBlocks();wtitle();grid.innerHTML='';
    var vd=visDays(),cc=function(wd){return vd.indexOf(wd)+2};
    grid.style.gridTemplateColumns='34px repeat('+vd.length+',1fr)';
    grid.appendChild(el('div','h'));
    vd.forEach(function(wd){var e=el('div','h'+(curW===thisW&&wd===todayIdx?' today':''),DAYS[wd]),wdt=wkDay(curW,wd);
      e.appendChild(el('small',null,wdt.m+'/'+wdt.d));grid.appendChild(e)});
    for(var h=H0;h<H1;h++){
      var t=el('div','tm',hm(h));t.style.gridRow=(h-H0+2);t.style.gridColumn=1;grid.appendChild(t);
      vd.forEach(function(wd,k){(function(wd,k,h){
        var b=el('button','c');b.style.gridRow=(h-H0+2);b.style.gridColumn=k+2;
        b.setAttribute('aria-label','添加');b.onclick=function(){openDlg({day:wd,h:h,len:1,t:'',c:'pink'},true)};grid.appendChild(b)})(wd,k,h)});
    }
    data.forEach(function(x){
      if(cc(x.day)<2)return;
      var b=el('button','e c-'+x.c+(DN[kk(x)]?' dn':''),x.t);
      b.style.gridColumn=cc(x.day);b.style.gridRow=(x.h-H0+2)+' / span '+x.len;
      b.onclick=function(){openDlg(x,false)};grid.appendChild(b)});
    RPW.forEach(function(x){
      if(cc(x.day)<2||x.h+x.len<=H0||x.h>=H1)return;
      var b=el('button','e c-'+x.c+' rp'+(DN[kk(x)]?' dn':''),'🔁 '+x.t);
      b.style.gridColumn=cc(x.day);b.style.gridRow=(x.h-H0+2)+' / span '+x.len;
      b.onclick=function(){openDlg(x,false)};grid.appendChild(b)});
    FXW.forEach(function(x){
      if(cc(x.day)<2||x.h+x.len<=H0||x.h>=H1)return;
      var l=x.les,s=Math.max(x.h,H0),e2=Math.min(x.h+x.len,H1),b=el('button','e fx');
      b.textContent=(l.type==='考试'?'📝 ':'🏫 ')+x.t+(l.room?'\n'+(l.bld||'')+l.room:'');
      b.title=tmin(l.s)+'–'+tmin(l.e)+(l.teacher?' · '+l.teacher:'')+' · '+l.type;
      b.style.whiteSpace='pre-line';
      b.style.background='repeating-linear-gradient(45deg,rgba(128,128,128,.14) 0 6px,transparent 6px 12px),var(--'+l.c+')';
      b.style.gridColumn=cc(x.day);b.style.gridRow=(s-H0+2)+' / span '+(e2-s);
      b.onclick=function(){openLesson(l)};grid.appendChild(b)});
    if(window.fcDraw)fcDraw();
    if(typeof rf==='function')rf();
    if(typeof drawDay==='function')drawDay();
  }
  var mask=document.getElementById('mask'),dn=document.getElementById('dn'),dl=document.getElementById('dl'),sw=document.getElementById('sw');
  COLS.forEach(function(n){var i=document.createElement('i');i.className='c-'+n;i.onclick=function(){col=n;paint()};sw.appendChild(i)});
  function paint(){[].forEach.call(sw.children,function(i,x){i.classList.toggle('on',COLS[x]===col)})}
  var isNew=false;
  var dday=document.getElementById('dday'),dh=document.getElementById('dh'),drp=document.getElementById('drp'),dun=document.getElementById('dun'),drw=document.getElementById('drw');
  function lenOpts(day,h,keep){var max=1;while(max<3&&h+max<H1&&!covered(day,h+max,cur))max++;
    dl.innerHTML='';for(var i=1;i<=max;i++){var o=document.createElement('option');o.value=i;o.textContent=i+' 小时';dl.appendChild(o)}
    dl.value=Math.min(keep,max)}
  dday.onchange=dh.onchange=function(){lenOpts(+dday.value,+dh.value,+dl.value);moLabels()};
  var dxh=document.getElementById('dxh');
  drp.onchange=function(){var on=drp.value!=='0';drw.style.display=on?'':'none';dxh.parentNode.style.display=on?'':'none'};
  function moLabels(){                       // “每月第 N 个周X”的文字跟着所选日期变
    var wd=+dday.value,n=nthOf(dnOf(curW,wd));
    drp.querySelector('option[value=m]').textContent='每月第 '+n+' 个周'+DAYS[wd];
    drp.querySelector('option[value=ml]').textContent='每月最后一个周'+DAYS[wd]}
  function openDlg(x,nw){
    cur=x;isNew=nw;col=x.c;dn.value=x.t;
    dday.innerHTML='';for(var p=0;p<7;p++){var wd=posDay(p);if(hiddenDay(wd)&&wd!==x.day)continue;var o=el('option',null,'周'+DAYS[wd]);o.value=wd;dday.appendChild(o)}
    dh.innerHTML='';for(var h=H0;h<H1;h++){var o2=el('option',null,hm(h));o2.value=h;dh.appendChild(o2)}
    dday.value=x.day;dh.value=x.h;lenOpts(x.day,x.h,x.len);
    var r=x.rp;moLabels();drp.value=r?(r.mo?(r.mo===-1?'ml':'m'):String(r.ev)):'0';dun.value=r&&r.un!=null?isoOf(r.un):'';drw.style.display=r?'':'none';
    dxh.checked=r?!!r.xh:true;dxh.parentNode.style.display=r?'':'none';
    if(!rrOK()){[].forEach.call(drp.querySelectorAll('option[value=m],option[value=ml]'),function(o){o.disabled=true})}
    var wdt=wkDay(curW,x.day);
    document.getElementById('dt').textContent=(nw?'新增':r?'修改重复活动':'修改')+' · '+wdt.m+'/'+wdt.d+' 周'+DAYS[x.day]+' '+hm(x.h);
    document.getElementById('dd').style.display=nw?'none':'';
    document.getElementById('dd').textContent=r?'删整个系列':'删除';
    document.getElementById('ddo').style.display=r?'':'none';
    paint();mask.classList.add('show');setTimeout(function(){dn.focus()},50);
  }
  function close(){mask.classList.remove('show')}
  mask.onclick=close;document.getElementById('dx').onclick=close;
  document.getElementById('ds').onclick=function(){
    var t=dn.value.trim();if(!t){dn.focus();return}
    var nd=+dday.value,nh=+dh.value,nl=+dl.value,rv=drp.value,un=dun.value?dnFromIso(dun.value):null,xh=dxh.checked;
    var ev=(rv==='m'||rv==='ml')?0:+rv,mo=rv==='m'?nthOf(dnOf(curW,nd)):rv==='ml'?-1:0,rep=ev||mo;
    if(!free(nd,nh,nl,cur)){alert('那个时间已经有安排啦～');return}
    var dn0=dnOf(curW,nd);
    if(rep&&un!==null&&un<dn0){alert('“重复到”的日期不能早于这次活动的日期');return}
    var r=cur.rp;
    if(r){                                   // 正在编辑一个重复系列
      if(!rep){                              // 改为不重复：删掉系列，只在本周留一个
        RP=RP.filter(function(z){return z!==r});data.push({day:nd,h:nh,len:nl,t:t,c:col})}
      else{
        var shift=dn0-cur.dn;                // 星期改了就整体平移所有出现日期
        r.a0+=shift;r.sk=(r.sk||[]).map(function(v){return v+shift});
        r.day=nd;r.h=nh;r.len=nl;r.t=t;r.c=col;r.ev=ev;r.mo=mo;r.un=un;r.xh=xh;if(!mo)delete r.mo}
      rpSave();save();draw();close();return}
    if(rep){                                 // 单次活动改为重复
      if(!isNew)data=data.filter(function(z){return z!==cur});
      var nr={id:uid(),day:nd,h:nh,len:nl,t:t,c:col,a0:dn0,ev:ev,un:un,sk:[],xh:xh};if(mo)nr.mo=mo;RP.push(nr);rpSave();save();draw();close();return}
    cur.t=t;cur.c=col;cur.day=nd;cur.h=nh;cur.len=nl;delete cur.a;if(isNew)data.push(cur);save();draw();close()};
  document.getElementById('dd').onclick=function(){
    if(cur.rp){if(!confirm('删除整个重复系列？（只想删这一周，请点“只删本周”）'))return;RP=RP.filter(function(z){return z!==cur.rp});rpSave()}
    else data=data.filter(function(x){return x!==cur});
    save();draw();close()};
  document.getElementById('ddo').onclick=function(){
    var r=cur.rp;if(!r)return;(r.sk=r.sk||[]).push(cur.dn);rpSave();draw();close()};
  document.getElementById('clr').onclick=function(){if(data.length&&confirm('清空本周手动安排？（固定课表和重复活动不受影响）')){data=[];save();draw()}};
  // 示范：规则式自动排程（之后换成真正的 AI）
  document.getElementById('demo').onclick=function(e){
    e.stopPropagation();
    var plan=[[9,2,'📖 数学复习','pink'],[12,1,'🍱 午饭小憩','mint'],[15,1,'📝 英语单词','sky'],[18,1,'🏃 运动','lemon']];
    for(var k=0;k<5;k++)plan.forEach(function(p){
      if(!free(k,p[0],p[1]))return;
      data.push({day:k,h:p[0],len:p[1],t:p[2],c:p[3]})});
    save();draw();
  };
  // ---- 切换周 / 跳到某一天 ----
  function go2(w){gotoWeek(w);draw()}
  document.getElementById('wp').onclick=function(){go2(curW-1)};
  document.getElementById('wn').onclick=function(){go2(curW+1)};
  document.getElementById('wn0').onclick=function(){go2(thisW)};
  var wj=document.getElementById('wjump');
  document.getElementById('wt').onclick=function(){wj.value=isoOf(wsDn(curW));try{wj.showPicker()}catch(e){wj.focus();wj.click()}};
  wj.onchange=function(){var n=dnFromIso(wj.value);if(n!==null)go2(Math.floor((n+3-SET.ws)/7))};
  document.getElementById('ttsel').onchange=function(){TTS.active=this.value;ttSave();location.reload()};
  document.getElementById('wcp').onclick=function(){
    var nx=curW+1;if((WK[nx]||[]).length&&!confirm('下一周已有安排，要追加复制进去吗？'))return;
    WK[nx]=WK[nx]||[];
    data.forEach(function(x){var y={day:x.day,h:x.h,len:x.len,t:x.t,c:x.c};if(x.a)y.a=x.a;
      if(!WK[nx].some(function(z){return z.day===y.day&&z.h===y.h&&z.t===y.t}))WK[nx].push(y)});
    save();go2(nx)};
