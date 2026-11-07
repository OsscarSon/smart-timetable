// 首次向导：先问“最想先做什么” → 日历习惯 → 节次与循环 → 外观 → 完成。全新用户自动弹出，也可以在设置里重新运行。
var WZ={i:0,goal:'photo',ws:SET.ws,hw:SET.hw,h24:SET.h24,cyc:TT.cyc||1,per:{s:'08:00',l:45,g:10,n:8}};
var wzm=document.getElementById('mask4'),wzb=document.getElementById('wzb'),wzt=document.getElementById('wzt'),wzs=document.getElementById('wzs');
// v8.9.7：前面加了 3 个介绍页（欢迎+语言 / 空间 / 功能介绍），原来的 5 步保持不变。重新运行向导（设置里）从“导入”开始。
var STEPS=['welcome','space','feature','import','habit','period','look','done'],WZN=STEPS.length-1,ISTART=STEPS.indexOf('import');
var WZT={welcome:'👋 欢迎来到 Mochi',space:'🌍 你的空间',feature:'🪄 一点小魔法','import':'📥 先把课表放进来',habit:'📅 日历习惯',period:'⏱ 学校节次',look:'🎨 挑个样子',done:'🎉 准备好啦'};
function wzField(label,input){var l=el('label','wzf');l.appendChild(el('span',null,label));l.appendChild(input);return l}
function wzStep(){
  wzb.innerHTML='';var K=STEPS[WZ.i];wzt.textContent=tr(WZT[K]);wzs.textContent='';
  wzm.dataset.wzStep=K;document.getElementById('wzcount').textContent=(WZ.i+1)+' / '+STEPS.length;
  document.getElementById('wzprogress').innerHTML=STEPS.map(function(_,n){return '<span class="'+(n===WZ.i?'active':'')+'"></span>'}).join('');
  document.getElementById('wzp').hidden=!WZ.i;
  document.getElementById('wzn').textContent=tr(WZ.i===WZN?'开始使用':K==='welcome'?'开始吧':'下一步')+' →';
  document.getElementById('wzk').hidden=WZ.i===WZN;
  if(K==='welcome'){
    var hero=el('div','wz-hero'),im=el('img');im.src='assets/buddy/happy.svg';im.alt='';im.width=120;im.height=120;hero.appendChild(im);
    hero.appendChild(el('div','wz-eyebrow','HELLO THERE ✦'));hero.appendChild(el('h2',null,tr('多一点时间，留给重要的事。')));hero.appendChild(el('p','wz-sub',tr('认识 Mochi：陪你学习、工作和过好每一天的温暖小伙伴。')));wzb.appendChild(hero);
    wzb.appendChild(el('div','wz-section-title',tr('选择你的语言')));var lg=el('div','chips');mkLangChips(lg);wzb.appendChild(lg);wzb.appendChild(el('div','wz-note',tr('之后可以随时在设置里更改。')))}
  if(K==='space'){
    wzb.appendChild(el('h3','wz-h',tr('你为什么来这里？')));wzb.appendChild(el('div','wz-intro',tr('想选几个都可以。一份课表，装下生活的每一面。')));
    WZ.spaceSeen=true;if(window.MochiNext&&MochiNext.mountWizardChoices)MochiNext.mountWizardChoices(wzb)}
  if(K==='feature'){
    wzb.appendChild(el('h3','wz-h',tr('大计划，小步骤。')));wzb.appendChild(el('div','wz-intro',tr('告诉 Mochi 你的目标，我们帮你找时间，不会背着你改日程。')));
    [['🪄','AI 帮你排','拍照导入课表、一句话添加、整周重排：先给方案，你确认才写入。'],['🌿','学习、工作、生活','一份课表装下所有，随时切换。'],['🔒','你说了算','数据默认只存在你的设备上，登录后才会同步。']].forEach(function(f){
      var r=el('div','wz-f'),ic=el('i',null,f[0]),d=el('div');d.appendChild(el('b',null,tr(f[1])));d.appendChild(el('small',null,tr(f[2])));r.appendChild(ic);r.appendChild(d);wzb.appendChild(r)});
    var gi=el('input');gi.type='text';gi.maxLength=80;gi.placeholder=tr('例如：每周练三次羽毛球');gi.value=WZ.goalDraft||'';gi.oninput=function(){WZ.goalDraft=gi.value.trim().slice(0,80)};
    wzb.appendChild(wzField(tr('你最想做的一件事是什么？（可选）'),gi));wzb.appendChild(el('div','wz-note',tr('先记一下就好，现在不会加进课表。')))}
  if(K==='import'){
    wzb.appendChild(el('div','msg','先做最重要的一件事：把课表放进来。（后面几步都可以先跳过）'));
    [['photo','📷','拍照导入课表','拍一张课表，AI 帮你识别（需要登录账号）'],['lesson','✍️','手动添加第一节课','自己填，最稳'],['none','🐱','先逛逛','之后随时能在“更多”里导入']].forEach(function(o){
      var b=el('button','wz-o'+(WZ.goal===o[0]?' on':'')),i=el('i',null,o[1]),d=el('div');
      d.appendChild(el('b',null,tr(o[2])));d.appendChild(el('small',null,tr(o[3])));b.appendChild(i);b.appendChild(d);
      b.onclick=function(){WZ.goal=o[0];wzStep()};wzb.appendChild(b)})}
  if(K==='habit'){
    var ws=el('select','sel');WSS.forEach(function(p){var o=el('option',null,p[1]);o.value=p[0];ws.appendChild(o)});ws.value=WZ.ws;ws.onchange=function(){WZ.ws=+ws.value};
    wzb.appendChild(wzField('一周从哪天开始',ws));
    var hw=el('input');hw.type='checkbox';hw.checked=WZ.hw;hw.onchange=function(){WZ.hw=hw.checked};wzb.appendChild(wzField('隐藏周末',hw));
    var h=el('input');h.type='checkbox';h.checked=WZ.h24;h.onchange=function(){WZ.h24=h.checked};wzb.appendChild(wzField('24 小时制',h))}
  if(K==='period'){
    wzb.appendChild(el('div','msg','填一下学校每节课的时间，生成后可以在设置里微调。不用学校课表的话直接下一步。'));
    var s=el('input');s.type='time';s.value=WZ.per.s;s.onchange=function(){WZ.per.s=s.value};wzb.appendChild(wzField('首节开始',s));
    [['l','每节多少分钟',15,180],['g','课间多少分钟',0,60],['n','一天几节',1,16]].forEach(function(f){
      var n=el('input');n.type='number';n.min=f[2];n.max=f[3];n.value=WZ.per[f[0]];n.oninput=function(){WZ.per[f[0]]=+n.value};wzb.appendChild(wzField(f[1],n))});
    var cy=el('select','sel');for(var k=1;k<=4;k++){var o=el('option',null,k===1?'每周一样':k+' 周一循环（单双周等）');o.value=k;cy.appendChild(o)}cy.value=WZ.cyc;cy.onchange=function(){WZ.cyc=+cy.value};
    wzb.appendChild(wzField('课表循环',cy))}
  if(K==='look'){
    wzb.appendChild(el('div','msg','挑个喜欢的样子，之后随时能在“设置”里改。'));
    var a=el('div','chips'),b=el('div','swatches');wzb.appendChild(a);wzb.appendChild(b);mkThemeChips(a);mkAccSw(b)}
  if(K==='done'){var happy=el('img','wz-finish-buddy');happy.src='assets/buddy/happy.svg';happy.alt='';wzb.appendChild(happy);
    if(WZ.goalDraft)wzb.appendChild(el('div','msg ink','已记下你的想法：'+WZ.goalDraft));
    wzb.appendChild(el('div','msg',WZ.goal==='photo'?'设置好了！点“开始使用”后会直接打开拍照导入。':WZ.goal==='lesson'?'设置好了！点“开始使用”后会直接打开“添加课程”。':'设置好了！随时可以点右下角 ＋ 开始添加。'));
    var ul=el('div','msg ink');ul.innerHTML='📝 到“作业”记下要交的东西<br>🪄 到“学习”让 AI 帮你排进空档<br>🔔 到“设置 → 通知与提醒”开启上课提醒';wzb.appendChild(ul)}
}
function wzApply(){
  var t0=t2min(WZ.per.s);
  if(!isNaN(t0)&&WZ.per.l>=15&&WZ.per.n>=1)TT.per=genPer(t0,WZ.per.l,Math.max(0,WZ.per.g||0),Math.min(16,WZ.per.n));
  if(WZ.cyc!==TT.cyc){TT.cyc=WZ.cyc;TT.anc=mondayDn(todayDn)}
  rebucketAll(SET.ws,WZ.ws);SET.ws=WZ.ws;SET.hw=WZ.hw;SET.h24=WZ.h24;SET.wiz=true;
  ttSave();saveSet();
  try{if(WZ.goalDraft)localStorage.setItem('onb-goal-draft',WZ.goalDraft);if(WZ.spaceSeen)localStorage.setItem('onb-modes-done','1')}catch(e){}
  try{if(WZ.goal!=='none')localStorage.setItem('mochi-sync-after',WZ.goal);else localStorage.removeItem('mochi-sync-after')}catch(e){}}
function wzDone(){document.body.classList.remove('wz-open');wzApply();try{localStorage.setItem('mochi-mode-after-wizard','1')}catch(e){}location.reload()}
function showWiz(){
  WZ={i:0,goal:'photo',ws:SET.ws,hw:SET.hw,h24:SET.h24,cyc:TT.cyc||1,per:{s:min2t((TT.per[0]||{s:480}).s),l:45,g:10,n:Math.max(1,Math.min(16,TT.per.length||8))}};
  WZ.i=SET.wiz?ISTART:0;wzStep();wzm.classList.add('show');document.body.classList.add('wz-open')}
document.getElementById('wzn').onclick=function(){if(WZ.i===WZN){wzDone();return}WZ.i++;wzStep()};
document.getElementById('wzp').onclick=function(){if(WZ.i>0){WZ.i--;wzStep()}};
document.getElementById('wzk').onclick=function(){if(WZ.i<ISTART){WZ.i=ISTART;wzStep();return}SET.wiz=true;saveSet();wzm.classList.remove('show');document.body.classList.remove('wz-open');if(window.MochiNext)MochiNext.startTour()};
document.getElementById('wzr').onclick=showWiz;
// 第一层：登录（可跳过）。只有配置了云同步、Google 登录可用、不是手机 App、还没登录、没看过这一屏时才出现；点过一次（登录或跳过）就不再出现。
function loginGate(next){
  var seen=false;try{seen=localStorage.getItem('onb-login')==='1'}catch(e){}
  var native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
  if(seen||native||!window.cloud||!cloud.ready()||!cloud.signInGoogle||cloud.user()){next();return}
  var I=window.LANG==='zh'?0:window.LANG==='ms'?2:1,T=function(a){return a[I]};
  var m=el('div','mask show'),d=el('div','dlg');d.onclick=function(e){e.stopPropagation()};
  d.appendChild(el('h2',null,T(['👋 欢迎来到 Mochi','👋 Welcome to Mochi','👋 Selamat datang ke Mochi'])));
  var msg=el('div','msg',T(['登录后，课表、作业会在你的所有设备间同步，AI 助手也需要登录才能使用。不登录也能用，之后可以在设置里再登录。','Sign in to sync your timetable and homework across devices — the AI assistant also needs an account. You can skip this and sign in later in Settings.','Log masuk untuk segerakkan jadual dan kerja rumah merentas peranti — pembantu AI juga perlukan akaun. Anda boleh langkau dan log masuk kemudian di Tetapan.']));
  d.appendChild(msg);
  var done=function(){try{localStorage.setItem('onb-login','1')}catch(e){}m.remove();next()};
  var g=el('button','gbtn',T(['使用 Google 登录','Continue with Google','Teruskan dengan Google']));g.type='button';
  g.onclick=function(){
    try{localStorage.setItem('onb-login','1')}catch(e){}        // 先记下：Google 登录会整页跳转，回来后不要再显示这一屏
    g.disabled=true;msg.textContent=T(['正在跳转到 Google…','Redirecting to Google…','Mengalih ke Google…']);
    cloud.signInGoogle().catch(function(x){
      var s=String((x&&x.message)||x);g.disabled=false;
      msg.textContent=/provider is not enabled|Unsupported provider/i.test(s)?T(['Google 登录还没开启，先跳过吧。','Google sign-in isn’t enabled yet — skip for now.','Log masuk Google belum diaktifkan — langkau dahulu.']):s.slice(0,100)})};
  d.appendChild(g);
  var sk=el('button','chip',T(['先不登录，直接使用','Skip — use without an account','Langkau — guna tanpa akaun']));sk.type='button';sk.onclick=done;
  var row=el('div','acts');row.appendChild(sk);d.appendChild(row);
  m.appendChild(d);document.body.appendChild(m)}
if(FRESH&&!SET.wiz)loginGate(showWiz);
