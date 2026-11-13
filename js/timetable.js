// ---- 课表：周视图（线格 + 分钟定位 + 当前时间红线）与「新增 / 修改活动」编辑页 ----
function wtitle(){
  var a=dnDate(wsDn(curW)),b=dnDate(wsDn(curW)+6),y=a.y!==d.getFullYear()?a.y+'/':'';
  var cy=(TT.cyc>1)?' · 第'+cycIdx(dnOf(curW,0))+'周':'';
  document.getElementById('wt').textContent='🗓️ '+(curW===thisW?'本周 ':curW===thisW+1?'下周 ':curW===thisW-1?'上周 ':'')+y+a.m+'/'+a.d+'–'+b.m+'/'+b.d+cy}
function ttSel(){
  var s=document.getElementById('ttsel'),L=TTS.list.filter(function(t){return !t.arch});
  s.innerHTML='';s.hidden=L.length<=1;
  L.forEach(function(t){var o=el('option',null,t.name);o.value=t.id;s.appendChild(o)});s.value=TT.id}

// 同一列里时间重叠的块并排显示（正常情况下不会重叠，旧数据 / 云端合并时可能出现）
function layLanes(L){
  L.sort(function(a,b){return a.s-b.s||a.e-b.e});
  var cl=[],cend=0;
  L.forEach(function(x){
    if(!cl.length||x.s>=cend){cl.push([]);cend=0}
    var c=cl[cl.length-1],ln=0;
    while(c.some(function(y){return y.ln===ln&&y.e>x.s}))ln++;
    x.ln=ln;c.push(x);cend=Math.max(cend,x.e)});
  cl.forEach(function(c){var n=Math.max.apply(null,c.map(function(x){return x.ln}))+1;c.forEach(function(x){x.nl=n})})}

function weekItems(){      // 这一周所有要画的块（手动 + 重复 + 固定课程）
  var out=[];
  data.forEach(function(x){out.push({k:'m',day:x.day,s:x.s,e:x.e,t:x.t,c:x.c,x:x,dn:!!DN[kk(x)]})});
  RPW.forEach(function(x){out.push({k:'r',day:x.day,s:x.s,e:x.e,t:'🔁 '+x.t,c:x.c,x:x,dn:!!DN[kk(x)]})});
  FXW.forEach(function(x){var l=x.les;out.push({k:'f',day:x.day,s:x.s,e:x.e,t:(l.type==='考试'?'📝 ':'🏫 ')+x.t,c:l.c,les:l,
    sub:[(l.bld||'')+(l.room||'')].filter(Boolean).join(' ')})});
  return out}

// 防止「Science」这种长单词被从中间劈开：先缩字号（最小 8px），还放不下就加省略号
function fitText(){
  [].forEach.call(document.querySelectorAll('.wk-e .et:not(.cjk)'),function(t){
    if(!t.clientWidth)return;
    // 很窄的块里，开头的 emoji 会吃掉一半宽度：先藏起来，让名字完整显示
    var full=t.getAttribute('data-full')||t.textContent;t.setAttribute('data-full',full);
    var m=/^([^\u0000-\u007f]{1,4}) (\S.*)$/.exec(full);
    t.textContent=(t.parentNode.clientWidth<52&&m)?m[2]:full;
    var f=12;t.style.fontSize='';t.style.whiteSpace='';
    while(t.scrollWidth>t.clientWidth+1&&f>8){f--;t.style.fontSize=f+'px'}
    if(t.scrollWidth>t.clientWidth+1)t.style.whiteSpace='nowrap'})}
if(window.ResizeObserver)new ResizeObserver(function(){fitText()}).observe(document.getElementById('grid')||document.body);
window.addEventListener('resize',fitText);
function drawGrid(){
  var vd=visDays(),n=D1-D0,Ht=n*HR,mini=function(wd){return !!SET.wkc&&wd>=5&&vd.length>5};
  grid.innerHTML='';
  grid.className='grid wk'+(vd.some(mini)?' wkc':'');
  grid.style.setProperty('--hr',HR+'px');
  grid.style.setProperty('--cols',vd.map(function(wd){return mini(wd)?'.4fr':'1fr'}).join(' '));
  // 日期头（吸顶）
  var hd=el('div','wk-h');hd.appendChild(el('div','wk-cor'));
  vd.forEach(function(wd){
    var wdt=wkDay(curW,wd),c=el('div','wk-d'+(curW===thisW&&wd===todayIdx?' today':'')+(mini(wd)?' mini':''));
    c.appendChild(el('span','wn',DAYS[wd]));c.appendChild(el('span','dt',mini(wd)?'':wdt.m+'/'+wdt.d));
    if(mini(wd)){c.title='展开周末';c.onclick=function(){SET.wkc=false;saveSet();drawGrid();nowLine()}}
    hd.appendChild(c)});
  grid.appendChild(hd);
  // 主体：时间轴 + 每天一列
  var body=el('div','wk-b'),gut=el('div','wk-g');body.style.height=Ht+'px';
  for(var h=D0;h<D1;h++){var t=el('span','wk-tl'+(h===D0?' first':''),hm(h));t.style.top=((h-D0)*HR)+'px';gut.appendChild(t)}
  var tz=el('span','wk-tl last',hm(D1));tz.style.top=Ht+'px';gut.appendChild(tz);
  body.appendChild(gut);
  var items=weekItems();
  vd.forEach(function(wd){
    var c=el('div','wk-c'+(curW===thisW&&wd===todayIdx?' td':'')+(mini(wd)?' mini':''));
    c.onclick=function(ev){if(ev.target!==c)return;
      var y=ev.clientY-c.getBoundingClientRect().top,sn=SET.snap||15,
          s=D0*60+Math.floor(y/HR*60/sn)*sn;
      s=Math.max(D0*60,Math.min(s,D1*60-sn));
      var e=Math.min(s+60,D1*60);
      items.forEach(function(o){if(o.day===wd&&o.s>s&&o.s<e)e=o.s});
      if(e-s<sn)e=Math.min(s+sn,D1*60);
      openDlg({day:wd,s:s,e:e,t:'',c:'pink'},true)};
    var L=items.filter(function(o){return o.day===wd});
    // 前一天跨午夜延伸过来的尾巴（00:00 到结束时间），点它会打开原活动
    spillBlocks(dnOf(curW,wd)).forEach(function(b){
      L.push({k:b.k,sp:b.w,day:wd,s:0,e:b.e,t:'↩ '+b.t,c:b.c,x:b.x,dn:!!DN[kk(b.x,b.w)],full:tmin(b.x.s)+'–'+tmin(b.x.e)})});
    // 一天只画到 24:00；跨午夜的活动在今天只画到午夜，剩下的在次日那一列画
    L.forEach(function(o){o.s0=Math.max(o.s,D0*60);o.e0=Math.min(o.e,D1*60)});
    layLanes(L);
    L.forEach(function(o){
      var top=(o.s0-D0*60)/60*HR,hh=Math.max(18,(o.e0-o.s0)/60*HR-2),
          b=el('button','wk-e c-'+o.c+(o.k==='f'?' fx':'')+(o.k==='r'?' rp':'')+(o.dn?' dn':'')+(hh<36?' sm':''));
      b.style.top=top+'px';b.style.height=hh+'px';
      b.style.left='calc(2px + (100% - 4px) * '+o.ln+' / '+o.nl+')';b.style.width='calc((100% - 4px) / '+o.nl+' - 1px)';
      var tx=el('span','et'+(/[\u3000-\u9fff\uac00-\ud7af]/.test(o.t)?' cjk':''),o.t);b.appendChild(tx);
      if(hh>=58){var tm=el('span','tm2',o.sp!==undefined?o.full:tmin(o.s)+'–'+tmin(o.e));b.appendChild(tm)}
      if(o.sub&&hh>=74)b.appendChild(el('span','tm2',o.sub));
      b.title=o.t+' '+(o.sp!==undefined?o.full:tmin(o.s)+'–'+tmin(o.e))+(o.les&&o.les.teacher?' · '+o.les.teacher:'');
      b.setAttribute('aria-label',b.title);
      b.onclick=function(ev){ev.stopPropagation();if(o.k==='f')openLesson(o.les);else openItem(o.x,o.sp)};
      c.appendChild(b)});
    body.appendChild(c)});
  if(typeof isBlank==='function'&&isBlank()){var cta=emptyCTA();cta.classList.add('over');body.appendChild(cta)}
  grid.appendChild(body);
  fitText();setTimeout(fitText,0);
  nowLine();
}
function nowLine(){          // 当前时间线（只在看本周时出现）：整周一条淡线 + 今天那一列加粗发光 + 时间轴上的时间标签
  grid.querySelectorAll('.wk-now,.wk-now-d,.wk-nt').forEach(function(e){e.remove()});
  var body=grid.querySelector('.wk-b');if(!body||curW!==thisW)return;
  var m=nowMin();if(m<D0*60||m>=D1*60)return;
  var y=((m-D0*60)/60*HR)+'px';
  var ln=el('div','wk-now');ln.style.top=y;body.appendChild(ln);
  var td=body.querySelector('.wk-c.td');if(td){var d=el('div','wk-now-d');d.style.top=y;td.appendChild(d)}
  var g=body.querySelector('.wk-g');if(g){var t=el('span','wk-nt',tmin(m));t.style.top=y;g.appendChild(t)}}
function wkScrollNow(){      // 周视图可见时，把页面滚到“现在”附近（只在切到周视图 / 点今天时调用）；网格始终是完整的 00:00–24:00，这里只决定滚到哪
  var b=grid.querySelector('.wk-b');if(!b||!b.offsetParent)return;
  var m=curW===thisW?nowMin():Math.max(D0*60,H0*60-30),y=b.getBoundingClientRect().top+window.scrollY+(m-D0*60)/60*HR-window.innerHeight*.3;
  window.scrollTo(0,Math.max(0,y))}

function draw(){
  refreshBlocks();wtitle();drawGrid();
  if(typeof rf==='function')rf();
  if(typeof drawDay==='function')drawDay();
  if(typeof fabHint==='function')fabHint();
}

// ---- 新增 / 修改活动（全屏编辑页）----
var mask=document.getElementById('mask'),dn=document.getElementById('dn'),sw=document.getElementById('sw');
COLS.forEach(function(n){var i=document.createElement('i');i.className='c-'+n;i.onclick=function(){col=n;paint()};sw.appendChild(i)});
function paint(){[].forEach.call(sw.children,function(i,x){i.classList.toggle('on',COLS[x]===col)})}
var isNew=false;
var dday=document.getElementById('dday'),dh=document.getElementById('dh'),de=document.getElementById('de'),ddur=document.getElementById('ddur'),
    drp=document.getElementById('drp'),dun=document.getElementById('dun'),drw=document.getElementById('drw'),dxh=document.getElementById('dxh'),dxr=document.getElementById('dxr');
var DURS=[[30,'30 分'],[45,'45 分'],[60,'1 小时'],[90,'1.5 小时'],[120,'2 小时'],[180,'3 小时'],[480,'8 小时']];
var dnxc=document.getElementById('dnxc'),dtdv=document.getElementById('dtdv'),dtdw=document.getElementById('dtdw');
// 读编辑器里的开始 / 结束 / “结束于次日”：e = 以开始那天 00:00 为起点的结束分钟（跨午夜时 > 1440）。
// 不会自己猜“结束早于开始就是次日”：必须勾选。err: empty 没填全 / equal 相同 / rev 结束早于开始 / long 超过 24 小时
function edTimes(){
  var s=t2min(dh.value),t=t2min(de.value);
  if(isNaN(s)||isNaN(t))return {err:'empty'};
  var e=dnxc.checked?1440+t:t,d=e-s;
  if(!dnxc.checked&&e===s)return {err:'equal',s:s,e:e};
  if(e<s)return {err:'rev',s:s,e:e};
  if(d>1440)return {err:'long',s:s,e:e};
  return {s:s,e:e,d:d}}
var ED_ERR={empty:'请选择开始和结束时间',equal:'开始和结束时间不能相同。如果活动跨午夜，请勾选「结束于次日」',
  rev:'结束时间早于开始时间。如果活动跨午夜（例如 22:00 → 次日 06:00），请勾选「结束于次日」',long:'活动最长 24 小时'};
function edSetEnd(e){            // 把“结束分钟 e”写回结束时间框 + 次日开关（e=1440 即次日 00:00）
  dnxc.checked=e>=1440;de.value=min2t(e>=1440?e-1440:e)}
function durPaint(){             // 自动算时长 + 跨午夜提示 + 撞车提示 + 快捷时长
  var r=edTimes(),dur=r.d;ddur.innerHTML='';
  DURS.forEach(function(p){var b=el('button','chip'+(dur===p[0]?' on':''),p[1]);b.type='button';
    b.onclick=function(){var s2=t2min(dh.value);if(isNaN(s2))return;var tot=s2+p[0];if(tot>1440+1439){tot=1440+1439}edSetEnd(tot);durPaint()};ddur.appendChild(b)});
  dtdv.className=r.err?'bad':'';dtdw.className=r.err?'bad':'';
  if(r.err){dtdv.textContent=r.err==='empty'?'--':'请选择有效时间';dtdw.textContent=ED_ERR[r.err];return}
  dtdv.textContent=fmtDur(r.d);
  var c=clashOf(+dday.value,r.s,r.e,cur);
  dtdw.textContent=tmin(r.s)+' → '+tmin(r.e)+(c?' · ⚠ 与「'+c.t+'」重叠':'');
  if(c)dtdw.className='bad'}
var lastS=null;
dh.onchange=function(){      // 改开始时间：没勾“次日”时，结束时间跟着顺延、保持原来的时长（只在不会越过午夜时；越过午夜必须由你自己勾选）
  var s=t2min(dh.value),e0=t2min(de.value);
  if(!isNaN(s)&&!dnxc.checked&&!isNaN(e0)&&lastS!==null&&e0>lastS){
    var tot=s+(e0-lastS);if(tot<1440)de.value=min2t(tot)}
  if(!isNaN(s))lastS=s;
  durPaint()};
de.onchange=durPaint;de.oninput=durPaint;dh.oninput=durPaint;dnxc.onchange=durPaint;
dday.onchange=function(){moLabels();durPaint()};
drp.onchange=function(){var on=drp.value!=='0';drw.hidden=!on;dxr.hidden=!on};
function moLabels(){                       // “每月第 N 个周X”的文字跟着所选日期变
  var wd=+dday.value,n=nthOf(dnOf(curW,wd));
  drp.querySelector('option[value=m]').textContent='每月第 '+n+' 个周'+DAYS[wd];
  drp.querySelector('option[value=ml]').textContent='每月最后一个周'+DAYS[wd]}
function openDlg(x,nw){
  cur=x;isNew=nw;col=x.c;dn.value=x.t;
  dday.innerHTML='';for(var p=0;p<7;p++){var wd=posDay(p);if(hiddenDay(wd)&&wd!==x.day)continue;var o=el('option',null,'周'+DAYS[wd]);o.value=wd;dday.appendChild(o)}
  dday.value=x.day;dh.value=min2t(x.s);edSetEnd(x.e);lastS=x.s;durPaint();
  var r=x.rp;moLabels();drp.value=r?(r.mo?(r.mo===-1?'ml':'m'):String(r.ev)):'0';dun.value=r&&r.un!=null?isoOf(r.un):'';drw.hidden=!r;
  dxh.checked=r?!!r.xh:true;dxr.hidden=!r;
  if(!rrOK()){[].forEach.call(drp.querySelectorAll('option[value=m],option[value=ml]'),function(o){o.disabled=true})}
  var wdt=wkDay(curW,x.day);
  document.getElementById('dt').textContent=(nw?'新增':r?'修改重复活动':'修改')+' · '+wdt.m+'/'+wdt.d+' 周'+DAYS[x.day];
  document.getElementById('dd').hidden=nw;
  document.getElementById('dd').textContent=r?'删整个系列':'删除';
  document.getElementById('ddo').hidden=!r;
  paint();mask.classList.add('show');setTimeout(function(){dn.focus()},50);
}
function close(){mask.classList.remove('show')}
mask.onclick=close;document.getElementById('dx').onclick=close;
document.getElementById('ds').onclick=function(){
  var t=dn.value.trim();if(!t){dn.focus();return}
  var nd=+dday.value,s,e,rv=drp.value,un=dun.value?dnFromIso(dun.value):null,xh=dxh.checked;
  var tm=edTimes();if(tm.err){alert(ED_ERR[tm.err]);return}
  s=tm.s;e=tm.e;
  var ev=(rv==='m'||rv==='ml')?0:+rv,mo=rv==='m'?nthOf(dnOf(curW,nd)):rv==='ml'?-1:0,rep=ev||mo;
  if(!free(nd,s,e,cur,true)){alert('那个时间已经有安排啦～');return}
  var dn0=dnOf(curW,nd);
  if(rep&&un!==null&&un<dn0){alert('“重复到”的日期不能早于这次活动的日期');return}
  var r=cur.rp;
  if(r){                                   // 正在编辑一个重复系列
    if(!rep){                              // 改为不重复：删掉系列，只在本周留一个
      RP=RP.filter(function(z){return z!==r});data.push({day:nd,s:s,e:e,t:t,c:col})}
    else{
      var shift=dn0-cur.dn;                // 星期改了就整体平移所有出现日期
      r.a0+=shift;r.sk=(r.sk||[]).map(function(v){return v+shift});
      r.day=nd;r.s=s;r.e=e;r.t=t;r.c=col;r.ev=ev;r.mo=mo;r.un=un;r.xh=xh;if(!mo)delete r.mo}
    rpSave();save();draw();close();return}
  if(rep){                                 // 单次活动改为重复
    if(!isNew)data=data.filter(function(z){return z!==cur});
    var nr={id:uid(),day:nd,s:s,e:e,t:t,c:col,a0:dn0,ev:ev,un:un,sk:[],xh:xh};if(mo)nr.mo=mo;RP.push(nr);rpSave();save();draw();close();return}
  cur.t=t;cur.c=col;cur.day=nd;cur.s=s;cur.e=e;delete cur.a;if(isNew)data.push(cur);save();draw();close()};
document.getElementById('dd').onclick=function(){
  if(cur.rp){if(!confirm('删除整个重复系列？（只想删这一周，请点“只删本周”）'))return;RP=RP.filter(function(z){return z!==cur.rp});rpSave()}
  else data=data.filter(function(x){return x!==cur});
  save();draw();close()};
document.getElementById('ddo').onclick=function(){
  var r=cur.rp;if(!r)return;(r.sk=r.sk||[]).push(cur.dn);rpSave();draw();close()};

// 点一个“前一天跨午夜延伸过来的尾巴”：原活动可能在上一周，先切到那一周再编辑（保证保存到正确的周）
function openItem(x,w){if(w!==undefined&&w!==curW)go2(w);openDlg(x,false)}

// ---- 切换周 / 跳到某一天 ----
function go2(w){gotoWeek(w);draw()}
document.getElementById('wp').onclick=function(){go2(curW-1)};
document.getElementById('wn').onclick=function(){go2(curW+1)};
document.getElementById('wn0').onclick=function(){go2(thisW);if(typeof wkScrollNow==='function'&&grid.offsetParent)wkScrollNow()};
var wj=document.getElementById('wjump');
document.getElementById('wt').onclick=function(){wj.value=isoOf(wsDn(curW));try{wj.showPicker()}catch(e){wj.focus();wj.click()}};
wj.onchange=function(){var n=dnFromIso(wj.value);if(n!==null)go2(Math.floor((n+3-SET.ws)/7))};
document.getElementById('ttsel').onchange=function(){TTS.active=this.value;ttSave();location.reload()};

// ---- 「⋯」菜单：次要操作（复制到下周 / 折叠周末 / 清空）收在这里，清空需要二次确认 ----
var wpop=document.getElementById('wpop'),wmore=document.getElementById('wmore'),wkcb=el('button',null,'');
wpop.insertBefore(wkcb,document.getElementById('clr'));
function popShow(on){wpop.hidden=!on;wmore.setAttribute('aria-expanded',on?'true':'false');if(on)wkcb.textContent=SET.wkc?'展开周末列':'折叠周末列'}
wmore.onclick=function(ev){ev.stopPropagation();popShow(wpop.hidden)};
document.addEventListener('click',function(ev){if(!wpop.hidden&&!wpop.contains(ev.target))popShow(false)});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape')popShow(false)});
wkcb.onclick=function(){SET.wkc=!SET.wkc;saveSet();popShow(false);drawGrid();var c=document.getElementById('vwkc');if(c)c.checked=!!SET.wkc};
document.getElementById('wcp').onclick=function(){
  popShow(false);
  var nx=curW+1;if(!data.length){alert('本周还没有手动安排可以复制');return}
  if((WK[nx]||[]).length&&!confirm('下一周已有安排，要追加复制进去吗？'))return;
  WK[nx]=WK[nx]||[];
  data.forEach(function(x){var y={day:x.day,s:x.s,e:x.e,t:x.t,c:x.c};if(x.a)y.a=x.a;
    if(!WK[nx].some(function(z){return z.day===y.day&&z.s===y.s&&z.t===y.t}))WK[nx].push(y)});
  save();saveWeek(nx);go2(nx)};
document.getElementById('clr').onclick=function(){
  popShow(false);
  if(!data.length){alert('本周没有手动安排');return}
  if(!confirm('清空本周的 '+data.length+' 项手动安排？\n（固定课表和重复活动不受影响）'))return;
  if(!confirm('再确认一次：清空后无法恢复，真的要清空吗？'))return;
  data=[];save();draw()};
