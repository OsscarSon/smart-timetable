// 周视图（开源库 FullCalendar，MIT）：连续时间轴、当前时间红线、固定课程按真实分钟显示（如 08:00–08:45）。
// 没加载到库（离线 / CDN 被拦）或在设置里关掉时，自动退回原来的方块网格。点击 / 新增沿用原来的编辑页。
(function(){
  var box=document.getElementById('fc'),grid=document.getElementById('grid'),cal=null;
  function on(){return !!(window.FullCalendar&&FullCalendar.Calendar)&&SET.fc!==0}
  function p2(n){return (n<10?'0':'')+n}
  function node(cls,t,sub){var d=el('div',cls);d.appendChild(el('b',null,t));if(sub)d.appendChild(el('small',null,sub));return d}
  function events(){
    var out=[];refreshBlocks();
    function add(x,kind,ref,cls,t,sub){
      var iso=isoOf(dnOf(curW,x.day));
      out.push({start:iso+'T'+p2(x.h)+':00:00',end:iso+'T'+p2(Math.min(23,x.h+x.len))+':00:00',classNames:[cls,kind],
        extendedProps:{kind:kind,ref:ref,t:t,sub:sub}})}
    data.forEach(function(x){add(x,'ev',x,'c-'+x.c+(DN[kk(x)]?' dn':''),x.t,'')});
    RPW.forEach(function(x){add(x,'rp',x,'c-'+x.c+' rp'+(DN[kk(x)]?' dn':''),'🔁 '+x.t,'')});
    FXW.forEach(function(b){
      var l=b.les,iso=isoOf(dnOf(curW,b.day));
      out.push({start:iso+'T'+min2t(l.s)+':00',end:iso+'T'+min2t(Math.min(l.e,1439))+':00',classNames:['fx','c-'+l.c],
        extendedProps:{kind:'fx',ref:l,t:(l.type==='考试'?'📝 ':'🏫 ')+l.t,sub:[(l.bld||'')+(l.room||''),l.teacher].filter(Boolean).join(' · ')}})});
    return out}
  function show(v){box.style.display=v?'':'none';grid.style.display=v?'none':''}
  window.fcDraw=function(){
    if(cal){try{cal.destroy()}catch(e){}cal=null}
    if(!on()||(typeof VM!=='undefined'&&VM!=='week')){show(false);return}      // 日视图时不渲染（隐藏状态下算不出宽度）
    try{
      var hid=[];for(var wd=0;wd<7;wd++)if(hiddenDay(wd))hid.push((wd+1)%7);          // FullCalendar：0=周日
      box.innerHTML='';
      cal=new FullCalendar.Calendar(box,{
        initialView:'timeGridWeek',initialDate:isoOf(wsDn(curW)),headerToolbar:false,allDaySlot:false,
        firstDay:(SET.ws+1)%7,hiddenDays:hid,height:'auto',expandRows:false,nowIndicator:true,
        slotMinTime:p2(H0)+':00:00',slotMaxTime:p2(H1)+':00:00',slotDuration:'00:30:00',snapDuration:'00:15:00',
        slotLabelInterval:'01:00',eventMaxStack:3,dayMaxEvents:true,
        dayHeaderContent:function(a){var wd=(a.date.getDay()+6)%7,s=el('span');s.appendChild(el('b',null,'周'+DAYS[wd]));s.appendChild(el('small',null,(a.date.getMonth()+1)+'/'+a.date.getDate()));return {domNodes:[s]}},
        slotLabelContent:function(a){return a.date.getMinutes()?'':hm(a.date.getHours())},
        events:events(),
        eventContent:function(a){var q=a.event.extendedProps;return {domNodes:[node('mc-t',q.t,q.sub)]}},
        eventClick:function(i){var q=i.event.extendedProps;if(q.kind==='fx')openLesson(q.ref);else openDlg(q.ref,false)},
        dateClick:function(i){
          var s=i.dateStr,dn=dnFromIso(s.slice(0,10)),h=parseInt(s.slice(11,13),10);if(dn===null||isNaN(h))return;
          h=Math.max(H0,Math.min(H1-1,h));openDlg({day:dnDate(dn).wd,h:h,len:1,t:'',c:'pink'},true)}
      });
      cal.render();show(true)
    }catch(e){cal=null;show(false)}                              // 任何出错都退回方块网格
  };
  // 设置里的开关
  var sw=document.getElementById('fcon');
  if(sw){sw.checked=SET.fc!==0;sw.onchange=function(){SET.fc=sw.checked?1:0;put2('mochi-set',SET);draw()}}
})();
