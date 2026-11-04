// 日视图（默认）：日期条 + 当天列表 + 「进行中 / 下一项」倒计时 + 日/周切换 + ＋按钮
var VM='day';try{VM=localStorage.getItem('mochi-sync-vm')==='week'?'week':'day'}catch(e){}
var selWd=null,lastW=null,pendSel=null;

function defSel(){var vd=visDays();return(curW===thisW&&vd.indexOf(todayIdx)>=0)?todayIdx:vd[0]}
function nowMin(){var n=new Date();return n.getHours()*60+n.getMinutes()}
function fmtDur(m){m=Math.max(1,Math.round(m));if(m<60)return m+' 分钟';var h=Math.floor(m/60),r=m%60;return h+' 小时'+(r?' '+r+' 分钟':'')}

// 某一天的全部项目（手动安排 + 重复活动 + 固定课程），按开始时间排序
function itemsOf(wd){
  var out=[];
  data.forEach(function(x){if(x.day!==wd)return;out.push({s:x.h*60,e:(x.h+x.len)*60,t:x.t,c:x.c,kind:'m',x:x,done:!!DN[kk(x)]})});
  RPW.forEach(function(x){if(x.day!==wd)return;out.push({s:x.h*60,e:(x.h+x.len)*60,t:'🔁 '+x.t,c:x.c,kind:'r',x:x,done:!!DN[kk(x)]})});
  FXW.forEach(function(x){if(x.day!==wd)return;var l=x.les;
    out.push({s:l.s,e:l.e,t:(l.type==='考试'?'📝 ':'🏫 ')+x.t,c:l.c,kind:'f',les:l,
      meta:[(l.bld||'')+(l.room||''),l.teacher,l.type!=='课'?l.type:''].filter(Boolean).join(' · ')})});
  out.sort(function(a,b){return a.s-b.s||a.e-b.e});return out}

function greet(){
  var h=new Date().getHours(),g=h<11?'早安 ☀️':h<14?'午安 🍱':h<18?'下午好 🌤️':'晚上好 🌙';
  document.getElementById('greet').textContent=g+'，小主人'}

// 「进行中 / 下一项」卡片（只在看本周时显示）
function drawNow(){
  var box=document.getElementById('dnow');box.innerHTML='';
  if(curW!==thisW||hiddenDay(todayIdx)){box.style.display='none';return}
  box.style.display='';
  var all=itemsOf(todayIdx),L=all.filter(function(i){return !i.done}),n=nowMin();
  var go=L.filter(function(i){return i.s<=n&&n<i.e})[0],nx=L.filter(function(i){return i.s>n})[0];
  if(go){
    box.appendChild(el('small',null,'进行中'));box.appendChild(el('b',null,go.t));
    box.appendChild(el('small',null,tmin(go.s)+'–'+tmin(go.e)+' · 还剩 '+fmtDur(go.e-n)+(go.meta?' · '+go.meta:'')));
    var pb=el('div','pb'),bar=el('i');bar.style.width=Math.min(100,Math.max(0,(n-go.s)/(go.e-go.s)*100))+'%';pb.appendChild(bar);box.appendChild(pb)}
  else if(nx){
    box.appendChild(el('small',null,'下一项'));box.appendChild(el('b',null,nx.t));
    box.appendChild(el('small',null,tmin(nx.s)+' 开始 · '+(nx.s-n<=180?fmtDur(nx.s-n)+'后':'今天')+(nx.meta?' · '+nx.meta:'')))}
  else box.appendChild(el('b',null,all.length?'今天的安排都结束了 🎉':'今天没有安排，好好休息 ☕'))}

function drawStrip(){
  var s=document.getElementById('dstrip');s.innerHTML='';
  visDays().forEach(function(wd){
    var dt=wkDay(curW,wd),b=el('button','dd'+(wd===selWd?' on':'')+(curW===thisW&&wd===todayIdx?' td':''));
    b.appendChild(el('span','w','周'+DAYS[wd]));b.appendChild(el('span','n',String(dt.d)));
    b.appendChild(el('i',itemsOf(wd).length?'dot':'dot e'));
    b.onclick=function(){selWd=wd;drawDay()};s.appendChild(b)})}

function addOnDay(){
  var isT=curW===thisW&&selWd===todayIdx,from=isT?Math.max(H0,new Date().getHours()+1):H0,h=H0,ok=false,i;
  for(i=from;i<H1&&!ok;i++)if(free(selWd,i,1)){h=i;ok=true}
  for(i=H0;i<H1&&!ok;i++)if(free(selWd,i,1)){h=i;ok=true}
  openDlg({day:selWd,h:h,len:1,t:'',c:'pink'},true)}

function drawList(){
  var box=document.getElementById('dlist');box.innerHTML='';
  var L=itemsOf(selWd),dt=wkDay(curW,selWd),isT=curW===thisW&&selWd===todayIdx,n=nowMin();
  box.appendChild(el('div','dh0',dt.m+'月'+dt.d+'日 · 星期'+DAYS[selWd]+(isT?'（今天）':'')));
  if(!L.length){
    var e=el('div','dempty');e.appendChild(el('div',null,'这天没有安排 ☕'));
    var ab=el('button','chip','＋ 添加一项');ab.onclick=addOnDay;e.appendChild(ab);box.appendChild(e);return}
  L.forEach(function(i){
    var r=el('div','lc'+(isT&&!i.done&&i.s<=n&&n<i.e?' now':'')+(i.done?' dn':'')),
        tm=el('div','tmc'),cd=el('div','cd c-'+i.c+(i.kind==='f'?' fxc':'')),tx=el('div','tx');
    tm.appendChild(el('b',null,tmin(i.s)));tm.appendChild(el('small',null,tmin(i.e)));
    tx.appendChild(el('b',null,i.t));if(i.meta)tx.appendChild(el('small',null,i.meta));cd.appendChild(tx);
    if(i.kind!=='f'){
      var ck=el('button','ck',i.done?'✓':'');ck.setAttribute('aria-label','完成');
      ck.onclick=function(ev){ev.stopPropagation();if(DN[kk(i.x)])delete DN[kk(i.x)];else DN[kk(i.x)]=1;put2(K_DN,DN);draw()};
      cd.appendChild(ck)}
    cd.onclick=function(){if(i.kind==='f')openLesson(i.les);else openDlg(i.x,false)};
    r.appendChild(tm);r.appendChild(cd);box.appendChild(r)})}

function drawDay(){
  if(lastW!==curW){lastW=curW;selWd=pendSel!=null?pendSel:defSel();pendSel=null}
  if(visDays().indexOf(selWd)<0)selWd=defSel();
  var v=document.getElementById('v-tt');v.classList.toggle('vm-week',VM==='week');v.classList.toggle('vm-day',VM!=='week');
  document.getElementById('vmd').classList.toggle('on',VM!=='week');document.getElementById('vmw').classList.toggle('on',VM==='week');
  greet();drawNow();drawStrip();drawList()}

function setVM(m){VM=m;try{localStorage.setItem('mochi-sync-vm',m)}catch(e){}drawDay()}
document.getElementById('vmd').onclick=function(){setVM('day')};
document.getElementById('vmw').onclick=function(){setVM('week')};
document.getElementById('fab').onclick=addOnDay;
document.getElementById('wn0').addEventListener('click',function(){selWd=defSel();drawDay()});

// 左右滑动切换前一天 / 后一天（滑到本周尽头就翻到相邻一周）
function stepDay(k){
  var vd=visDays(),i=vd.indexOf(selWd)+k;
  if(i>=0&&i<vd.length){selWd=vd[i];drawDay();return}
  pendSel=k>0?vd[0]:vd[vd.length-1];go2(curW+k)}
(function(){
  var box=document.getElementById('dlist'),x0=null,y0=null;
  box.addEventListener('touchstart',function(e){var t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
  box.addEventListener('touchend',function(e){
    if(x0===null)return;var t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.5)return;stepDay(dx<0?1:-1)},{passive:true})})();

// 每 30 秒刷新倒计时
setInterval(function(){if(!document.hidden){drawNow();drawList()}},30000);
