// 启动：渲染各页面 + 顶部导航 + Ai 小猫
draw();rLg();rSt();rSp();rRm();rFx();rf();
var V=['tt','st','sp','rm','se'];
document.querySelectorAll('.nav button').forEach(function(b){b.onclick=function(){
  document.querySelectorAll('.nav button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');
  var v=b.getAttribute('data-v');if(v)V.forEach(function(k){document.getElementById('v-'+k).style.display=k===v?(k==='tt'?'':'flex'):'none'})}});
var bub=document.getElementById('bubble');
document.getElementById('ai').onclick=function(){bub.classList.toggle('show')};
