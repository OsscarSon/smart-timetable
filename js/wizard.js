// 首次向导：外观 → 日历 → 节次与循环 → 完成。全新用户自动弹出，也可以在设置里重新运行。
var WZ={i:0,ws:SET.ws,hw:SET.hw,h24:SET.h24,cyc:TT.cyc||1,per:{s:'08:00',l:45,g:10,n:8}};
var wzm=document.getElementById('mask4'),wzb=document.getElementById('wzb'),wzt=document.getElementById('wzt'),wzs=document.getElementById('wzs');
var WZT=['👋 欢迎来到 Mochi','📅 日历习惯','⏱ 学校节次','🎉 准备好啦'];
function wzField(label,input){var l=el('label','wzf');l.appendChild(el('span',null,label));l.appendChild(input);return l}
function wzStep(){
  wzb.innerHTML='';wzt.textContent=WZT[WZ.i];wzs.textContent='';
  document.getElementById('wzp').style.display=WZ.i?'':'none';
  document.getElementById('wzn').textContent=WZ.i===3?'开始使用':'下一步';
  document.getElementById('wzk').style.display=WZ.i===3?'none':'';
  if(WZ.i===0){
    wzb.appendChild(el('div','msg','先挑个喜欢的样子，之后随时能在“设置”里改。'));
    var a=el('div','chips'),b=el('div','swatches');wzb.appendChild(a);wzb.appendChild(b);mkThemeChips(a);mkAccSw(b)}
  if(WZ.i===1){
    var ws=el('select','sel');WSS.forEach(function(p){var o=el('option',null,p[1]);o.value=p[0];ws.appendChild(o)});ws.value=WZ.ws;ws.onchange=function(){WZ.ws=+ws.value};
    wzb.appendChild(wzField('一周从哪天开始',ws));
    var hw=el('input');hw.type='checkbox';hw.checked=WZ.hw;hw.onchange=function(){WZ.hw=hw.checked};wzb.appendChild(wzField('隐藏周末',hw));
    var h=el('input');h.type='checkbox';h.checked=WZ.h24;h.onchange=function(){WZ.h24=h.checked};wzb.appendChild(wzField('24 小时制',h))}
  if(WZ.i===2){
    wzb.appendChild(el('div','msg','填一下学校每节课的时间，生成后可以在设置里微调。不用学校课表的话直接下一步。'));
    var s=el('input');s.type='time';s.value=WZ.per.s;s.onchange=function(){WZ.per.s=s.value};wzb.appendChild(wzField('首节开始',s));
    [['l','每节多少分钟',15,180],['g','课间多少分钟',0,60],['n','一天几节',1,16]].forEach(function(f){
      var n=el('input');n.type='number';n.min=f[2];n.max=f[3];n.value=WZ.per[f[0]];n.oninput=function(){WZ.per[f[0]]=+n.value};wzb.appendChild(wzField(f[1],n))});
    var cy=el('select','sel');for(var k=1;k<=4;k++){var o=el('option',null,k===1?'每周一样':k+' 周一循环（单双周等）');o.value=k;cy.appendChild(o)}cy.value=WZ.cyc;cy.onchange=function(){WZ.cyc=+cy.value};
    wzb.appendChild(wzField('课表循环',cy))}
  if(WZ.i===3){
    wzb.appendChild(el('div','msg','设置好了！接下来可以：'));
    var ul=el('div','msg');ul.style.color='var(--ink)';ul.innerHTML='🏫 到“设置 → 固定课表”加上学校的课<br>📝 到“作业”记下要交的东西<br>🪄 到“学习 / 运动”让 AI 帮你排进空档';wzb.appendChild(ul)}
}
function wzApply(){
  var t0=t2min(WZ.per.s);
  if(!isNaN(t0)&&WZ.per.l>=15&&WZ.per.n>=1)TT.per=genPer(t0,WZ.per.l,Math.max(0,WZ.per.g||0),Math.min(16,WZ.per.n));
  if(WZ.cyc!==TT.cyc){TT.cyc=WZ.cyc;TT.anc=mondayDn(todayDn)}
  rebucketAll(SET.ws,WZ.ws);SET.ws=WZ.ws;SET.hw=WZ.hw;SET.h24=WZ.h24;SET.wiz=true;
  ttSave();saveSet()}
function wzDone(){wzApply();location.reload()}
function showWiz(){
  WZ={i:0,ws:SET.ws,hw:SET.hw,h24:SET.h24,cyc:TT.cyc||1,per:{s:min2t((TT.per[0]||{s:480}).s),l:45,g:10,n:Math.max(1,Math.min(16,TT.per.length||8))}};
  wzStep();wzm.classList.add('show')}
document.getElementById('wzn').onclick=function(){if(WZ.i===3){wzDone();return}WZ.i++;wzStep()};
document.getElementById('wzp').onclick=function(){if(WZ.i>0){WZ.i--;wzStep()}};
document.getElementById('wzk').onclick=function(){SET.wiz=true;saveSet();wzm.classList.remove('show')};
document.getElementById('wzr').onclick=showWiz;
if(FRESH&&!SET.wiz)showWiz();
