// 课程编辑页的时间：直接选开始 / 结束时间（原生 24 小时 <input type=time>，支持键盘输入），下面自动算出时长。
// 活动编辑器（开始 / 结束 / 结束于次日 / 时长 / 撞车提示）在 timetable.js 里；这里只负责「课程」编辑页的时长显示。
// 课程是每天固定的节次，不跨午夜：结束必须晚于开始（保存时 lessons.js 会检查）。
(function(){
  var i0=document.getElementById('lst0'),i1=document.getElementById('lst1'),out=document.getElementById('lstdv');
  if(!i0||!i1||!out)return;
  function paint(){
    var s=t2min(i0.value),e=t2min(i1.value);
    if(isNaN(s)||isNaN(e)){out.className='';out.textContent='--';return}
    if(e<=s){out.className='bad';out.textContent='结束时间要晚于开始时间';return}
    out.className='';out.textContent=fmtDur(e-s)}
  ['input','change'].forEach(function(ev){i0.addEventListener(ev,paint);i1.addEventListener(ev,paint)});
  ['lsp0','lsp1'].forEach(function(id){var n=document.getElementById(id);if(n)n.addEventListener('change',function(){setTimeout(paint,0)})});
  var oL=window.openLesson;
  if(typeof oL==='function')window.openLesson=function(){var r=oL.apply(this,arguments);paint();return r};
  paint();
})();
