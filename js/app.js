// 启动：渲染各页面 + 底部标签栏 + Ai 小猫
draw();ttSel();rLg();rSt();rSp();rRm();rFx();rPer();rTT();rHw();rf();
var V=['tt','hw','st','sp','rm','se','sta','more'],SUB={st:1,sp:1,se:1,sta:1};
function showView(v){
  V.forEach(function(k){document.getElementById('v-'+k).style.display=k===v?(k==='tt'?'':'flex'):'none'});
  document.getElementById('v-bt').style.display=v==='more'?'grid':'none';
  var tab=SUB[v]?'more':v;
  document.querySelectorAll('.tabbar button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===tab)});
  if(v==='sta'&&typeof drawStats==='function')drawStats();
  window.scrollTo(0,0)}
document.querySelectorAll('.tabbar button').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-v'))}});
// 学习 / 运动 / 设置 在「更多」里：加一个返回键
['st','sp','se','sta'].forEach(function(k){var s=document.getElementById('v-'+k),b=el('button','back','‹ 更多');b.setAttribute('data-go','more');s.insertBefore(b,s.firstChild)});
document.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-go'))}});
var bub=document.getElementById('bubble');
document.getElementById('ai').onclick=function(){bub.classList.toggle('show')};
