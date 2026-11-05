// 启动：渲染各页面 + 底部标签栏 + Ai 小猫
draw();ttSel();rLg();rSt();rSp();rRm();rFx();rPer();rTT();rHw();rf();
var V=['tt','hw','st','sp','rm','se','sta','gd','more'],SUB={st:1,sp:1,se:1,sta:1,gd:1};
function showView(v){
  if(v==='gd'&&!document.getElementById('v-gd')&&!window.__gdTry){window.__gdTry=1;var gs=document.createElement('script');gs.src='js/guide.js';gs.onload=function(){showView('gd')};document.head.appendChild(gs);return}   // 网页文件是旧的、没有功能表页：现场补载
  V.forEach(function(k){var e=document.getElementById('v-'+k);if(e)e.style.display=k===v?(k==='tt'?'':'flex'):'none'});
  var bt=document.getElementById('v-bt');if(bt)bt.style.display=v==='more'?'grid':'none';
  var tab=SUB[v]?'more':v;
  document.querySelectorAll('.tabbar button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===tab)});
  if(v==='sta'&&typeof drawStats==='function')drawStats();
  window.scrollTo(0,0)}
document.querySelectorAll('.tabbar button').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-v'))}});
// 学习 / 运动 / 设置 在「更多」里：加一个返回键
['st','sp','se','sta','gd'].forEach(function(k){var s=document.getElementById('v-'+k);if(!s)return;var b=el('button','back','‹ 更多');b.setAttribute('data-go','more');s.insertBefore(b,s.firstChild)});
document.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-go'))}});
var bub=document.getElementById('bubble');
document.getElementById('ai').onclick=function(){bub.classList.toggle('show')};
