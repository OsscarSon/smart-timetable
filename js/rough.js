// ✏️ 手账风：用 rough-notation（底层是 rough.js）给标题加手绘下划线。加载失败 / 用户开了“减少动态效果”就什么都不做。
(function(){
  if(!window.RoughNotation||!RoughNotation.annotate)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var SEL='#wt, .hs, .dlg h2',live=[],tmr=0;
  function clear(){live.forEach(function(a){try{a.remove()}catch(e){}});live=[]}
  var obs=null;
  function watch(){obs.observe(document.body,{childList:true,subtree:true})}
  function paint(){
    obs.disconnect();                       // 画标注本身会改 DOM：先停止监听，画完再开，避免自己触发自己
    clear();
    document.querySelectorAll(SEL).forEach(function(e){
      if(!e.offsetParent||!e.textContent.trim())return;
      var r=e.getBoundingClientRect();if(r.width<20||r.height<8)return;
      try{var a=RoughNotation.annotate(e,{type:'underline',color:getComputedStyle(document.documentElement).getPropertyValue('--pri').trim()||'#ff8a4c',strokeWidth:2,padding:1,animate:false,iterations:1});a.show();live.push(a)}catch(x){}});
    watch()}
  function later(){clearTimeout(tmr);tmr=setTimeout(paint,500)}
  obs=new MutationObserver(later);watch();
  window.addEventListener('resize',later);window.addEventListener('load',later);
})();
