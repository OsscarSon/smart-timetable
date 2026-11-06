// 统计：作业完成情况 + 当前查看的那一周每天的安排时长（Chart.js）
var CHS={};
function drawStats(){
  var sum=document.getElementById('stsum'),msg=document.getElementById('stmsg'),t=isoOf(todayDn),done=0,over=0,todo=0;
  HW.forEach(function(h){if(h.done)done++;else if(h.due&&h.due<t)over++;else todo++});
  var vd=visDays(),hrs=vd.map(function(wd){return Math.round(itemsOf(wd).reduce(function(a,i){return a+(i.e-i.s)/60},0)*10)/10}),
      tot=Math.round(hrs.reduce(function(a,b){return a+b},0)*10)/10,all=done+over+todo;
  sum.textContent=all?'作业共 '+all+' 份：完成 '+done+'（'+Math.round(done/all*100)+'%）'+(over?'，逾期 '+over:'')+'。这一周共安排 '+tot+' 小时。':'还没有作业记录。这一周共安排 '+tot+' 小时。';
  if(typeof Chart!=='function'){msg.textContent='Chart.js 没加载到，图表暂时显示不了（设置页最下面能看到开源库状态）。';return}
  msg.textContent='时长是课表页当前翻到的那一周（含固定课程和重复活动）。';
  try{Chart.defaults.font.family=getComputedStyle(document.body).fontFamily}catch(e){}   // 图表里的汉字也用文楷
  function cv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
  var ink=cv('--ink'),line=cv('--line');
  ['ch1','ch2'].forEach(function(k){if(CHS[k]){CHS[k].destroy();CHS[k]=null}});
  CHS.ch1=new Chart(document.getElementById('ch1'),{type:'doughnut',
    data:{labels:['已完成','待办','已逾期'],datasets:[{data:[done,todo,over],backgroundColor:[cv('--mint'),cv('--sky'),cv('--pri3')],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:ink}}}}});
  CHS.ch2=new Chart(document.getElementById('ch2'),{type:'bar',
    data:{labels:vd.map(function(wd){return '周'+DAYS[wd]}),datasets:[{data:hrs,backgroundColor:cv('--pri2'),borderRadius:8}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:ink},grid:{display:false}},y:{beginAtZero:true,ticks:{color:ink},grid:{color:line}}}}})}
