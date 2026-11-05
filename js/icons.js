// 图标：开源库 Lucide（ISC）。把底部标签栏 / ≡ 菜单 / 更多页里的 emoji 换成统一的线条图标。
// 库没加载到（离线、CDN 被拦）或找不到某个图标时，保留原来的 emoji，不影响使用。
(function(){
  var MAP={'📅':'calendar-days','📝':'clipboard-list','⏰':'alarm-clock','✨':'sparkles','📚':'book-open','🏃':'footprints','📊':'bar-chart-3',
    '🏫':'school','📷':'camera','🗂':'folders','🔗':'link','🎨':'palette','🎌':'flag','☁':'cloud','💾':'save','💌':'send','⚙':'settings'};
  function pascal(n){return n.replace(/(^|-)([a-z0-9])/g,function(m,a,b){return b.toUpperCase()})}
  function has(n){return !!(window.lucide&&lucide.icons&&lucide.icons[pascal(n)])}
  window.applyIcons=function(root){
    if(!(window.lucide&&lucide.createIcons))return;
    [].forEach.call((root||document).querySelectorAll('.tabbar button span,.dw-r i,.mrow span'),function(s){
      if(s.getAttribute('data-ic'))return;
      var n=MAP[s.textContent.replace(/️/g,'').trim()];if(!n||!has(n))return;
      s.setAttribute('data-ic','1');s.textContent='';var i=document.createElement('i');i.setAttribute('data-lucide',n);s.appendChild(i)});
    try{lucide.createIcons({attrs:{width:22,height:22,'stroke-width':2}})}catch(e){}};
  window.applyIcons();
})();
