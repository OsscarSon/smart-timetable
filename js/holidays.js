// 假期：一段日期范围。重复活动可选“假期里不出现”；固定课表可选“假期里隐藏”。
// 数据 HOL（mochi-hol）与 isHol() 在 recur.js；这里只是设置页的界面。
(function(){
  var box=document.getElementById('hol'),n=document.getElementById('holn'),a=document.getElementById('hola'),b=document.getElementById('holb'),fxh=document.getElementById('fxh');
  function render(){
    box.innerHTML='';
    if(!HOL.length)box.appendChild(el('div','msg','还没有假期。加入后，勾了“假期里不出现”的重复活动会自动跳过这些日子。'));
    HOL.slice().sort(function(x,y){return x.a-y.a}).forEach(function(h){
      var r=el('div','tp'),t=el('div','n',h.n||'假期');
      t.appendChild(el('small',null,dfmt(h.a,'YYYY/M/D')+(h.b!==h.a?' – '+dfmt(h.b,'YYYY/M/D'):'')+(h.b<todayDn?'（已过）':'')));
      var x=el('button',null,'×');x.onclick=function(){HOL=HOL.filter(function(z){return z!==h});holSave();render();draw()};
      r.appendChild(t);r.appendChild(x);box.appendChild(r)})}
  document.getElementById('holadd').onclick=function(){
    if(!isoValid(a.value)){alert('请选开始日期');return}
    var s=dnFromIso(a.value),e=isoValid(b.value)?dnFromIso(b.value):s;
    if(e<s){alert('结束日期不能早于开始日期');return}
    HOL.push({id:uid(),n:n.value.trim().slice(0,12),a:s,b:e});holSave();n.value=a.value=b.value='';render();draw()};
  fxh.checked=!!SET.fxh;
  fxh.onchange=function(){SET.fxh=fxh.checked;saveSet();draw()};
  render();
})();
