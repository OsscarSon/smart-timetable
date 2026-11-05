// 启动：渲染各页面 + 底部标签栏（课表 / 作业 / 学习 / 统计 / 更多）
draw();ttSel();rSt();rSp();rRm();rFx();rPer();rTT();rHw();rf();
var V=['tt','hw','st','sp','se','sta','more'],SUB={sp:1,se:1};
function showView(v){
  V.forEach(function(k){document.getElementById('v-'+k).style.display=k===v?(k==='tt'?'':'flex'):'none'});
  var tab=SUB[v]?'more':v;
  document.querySelectorAll('.tabbar button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-v')===tab)});
  if(v==='sta'&&typeof drawStats==='function')drawStats();
  if(window.fabClose)fabClose();
  window.scrollTo(0,0)}
document.querySelectorAll('.tabbar button').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-v'))}});
// 运动 / 设置 在「更多」里：加一个返回键
['sp','se'].forEach(function(k){var s=document.getElementById('v-'+k),b=el('button','back','‹ 更多');b.setAttribute('data-go','more');s.insertBefore(b,s.firstChild)});
document.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){showView(b.getAttribute('data-go'))}});
document.getElementById('mr-ai').onclick=function(){openAI('quick')};
// 向导里选了“拍照导入 / 添加第一节课”：重新载入后直接打开
(function(){
  var a=null;try{a=localStorage.getItem('mochi-sync-after');localStorage.removeItem('mochi-sync-after')}catch(e){}
  if(a==='photo')setTimeout(function(){openAI('photo')},300);else if(a==='lesson')setTimeout(function(){openLesson(null)},300);
  else if(!a&&(VM==='week'||WIDE.matches))setTimeout(wkScrollNow,80)})();
