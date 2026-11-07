// 图标引擎：开源库 Lucide（ISC）。整个界面里的 emoji 统一换成同一套线条图标。
// 做法：不改任何文字内容（翻译词典是按“带 emoji 的整句”匹配的），而是在文字显示出来、翻译完成之后，
//       再把页面上的 emoji 换成 <svg>。以后新出现的内容（重新绘制的列表、弹窗……）由 MutationObserver 自动处理。
// 安全网：库没加载到（离线、CDN 被拦）、或库里没有某个图标时，保留原来的 emoji，不影响使用。
// 不会动：输入框 / 下拉选项 / 文本框里的字（放不了图标，这些地方只去掉 emoji）、未翻译完的中文句子（等翻译好再换）。
(function(){
  // emoji → Lucide 图标名（按顺序找第一个这个版本里存在的，所以换库版本也不怕改名）
  var C=[
    ['📅',['calendar-days']],['🗓',['calendar']],['📝',['clipboard-list','notebook-pen']],['⏰',['alarm-clock']],['⏱',['timer']],
    ['✨',['sparkles']],['🪄',['wand-sparkles','wand-2','wand']],['📚',['library','book-open']],['📖',['book-open']],
    ['🏃',['footprints','person-standing']],['💪',['dumbbell','biceps-flexed']],['📊',['chart-column','bar-chart-3','chart-no-axes-column']],
    ['🔍',['search']],['🔔',['bell']],['🔕',['bell-off']],['🏫',['school']],['📷',['camera']],['🗂',['folders']],['🔗',['link']],
    ['🎨',['palette']],['🎌',['flag']],['☁',['cloud']],['💾',['save','floppy-disk']],['💌',['send']],['⚙',['settings']],
    ['✅',['circle-check','check-circle-2','check-circle']],['✓',['check']],['✗',['x']],['✕',['x']],['❌',['x']],
    ['⚠',['triangle-alert','alert-triangle']],['📌',['pin']],['📎',['paperclip']],['📲',['smartphone']],['📤',['upload']],['📥',['download']],
    ['🗑',['trash-2']],['🎤',['mic']],['📦',['package']],['🌐',['globe']],['🔁',['repeat']],['🔀',['shuffle']],['🔌',['plug']],
    ['✏',['pencil']],['✍',['pen-line']],['👀',['eye']],['🧠',['brain']],['🤖',['bot']],['🎉',['party-popper']],['🏅',['medal']],
    ['☀',['sun']],['🌙',['moon']],['🌗',['sun-moon','contrast']],['🌤',['cloud-sun']],['☕',['coffee']],['🍱',['utensils']],['🍽',['utensils']],
    ['📭',['inbox']],['📄',['file-text']],['🖼',['image']],['💡',['lightbulb']],['♻',['recycle']],['ℹ',['info']],
    ['🔊',['volume-2']],['💬',['message-circle']],['👆',['pointer','mouse-pointer-click']],['👋',['hand','smile']],
    ['🐱',['cat']],['😺',['cat']],['😎',['smile']],['🤔',['circle-help','help-circle']],['😵',['frown','annoyed']],
    ['🌿',['heart-pulse','leaf']],['🌱',['sprout','leaf']],['💧',['droplet']],['🥗',['salad','apple']],['💄',['sparkle','sparkles']],
    ['🧭',['compass']],['⭐',['star']],['❓',['circle-help','help-circle']],['⚡',['zap']],['🎧',['headphones']],['🕒',['clock']],['🎯',['target']],['💼',['briefcase']],
    ['⬇',['download']],['▶',['play']],['⏹',['square']],['⬜',['square']],['↩',['undo-2','undo']],['✎',['pencil']],
    ['＋',['plus']],['⋯',['ellipsis']],['›',['chevron-right']],['‹',['chevron-left']]
  ];
  var MAP=Object.create(null),keys=[];
  C.forEach(function(r){MAP[r[0]]=r[1];keys.push(r[0])});
  var RE=new RegExp('(?:'+keys.join('|')+')\\uFE0F?','g');
  var CJK=/[\u4e00-\u9fff]/,NOCJK=(window.LANG||'zh')!=='zh';          // en / ms：还带中文的句子是“没翻译完”或用户自己写的，不动
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1,CANVAS:1,NOSCRIPT:1,TITLE:1,SVG:1,svg:1};
  var ATTR=['placeholder','title','aria-label','alt'];
  var cache=Object.create(null);

  function pascal(n){return n.replace(/(^|-)([a-z0-9])/g,function(m,a,b){return b.toUpperCase()})}
  function ready(){return !!(window.lucide&&lucide.icons&&lucide.createIcons)}
  function pick(ch){
    var b=ch.replace(/\uFE0F/g,'');
    if(b in cache)return cache[b];
    var r=null,c=MAP[b]||[];
    for(var i=0;i<c.length;i++)if(lucide.icons[pascal(c[i])]){r=c[i];break}
    return cache[b]=r}
  function skipEl(e){
    for(;e&&e.nodeType===1;e=e.parentNode){
      if(SKIP[e.nodeName]||e.isContentEditable||(e.hasAttribute&&e.hasAttribute('data-noic')))return true}
    return false}

  // 文字节点：emoji → <i data-lucide>（稍后统一变成 svg）
  function conv(tn){
    var v=tn.nodeValue;if(!v)return false;
    RE.lastIndex=0;if(!RE.test(v))return false;
    if(NOCJK&&CJK.test(v))return false;
    if(skipEl(tn.parentNode))return false;
    var f=document.createDocumentFragment(),last=0,m,hit=false;RE.lastIndex=0;
    while((m=RE.exec(v))){
      var n=pick(m[0]);if(!n)continue;
      if(m.index>last)f.appendChild(document.createTextNode(v.slice(last,m.index)));
      var i=document.createElement('i');i.setAttribute('data-lucide',n);i.setAttribute('aria-hidden','true');f.appendChild(i);
      last=m.index+m[0].length;hit=true}
    if(!hit)return false;
    if(last<v.length)f.appendChild(document.createTextNode(v.slice(last)));
    tn.parentNode.replaceChild(f,tn);return true}

  // 放不了图标的地方（placeholder / title / aria-label / 下拉选项）：只去掉 emoji
  function strip(s){return s.replace(RE,function(x){return pick(x)?'':x}).replace(/^\s+/,'')}
  function stripAttrs(e){
    ATTR.forEach(function(a){var v=e.getAttribute&&e.getAttribute(a);
      if(v&&(!NOCJK||!CJK.test(v))){RE.lastIndex=0;if(RE.test(v)){var s=strip(v);if(s!==v)e.setAttribute(a,s)}}});
    if(e.nodeName==='OPTION'){var t=e.textContent;if(t&&(!NOCJK||!CJK.test(t))){RE.lastIndex=0;if(RE.test(t)){var s2=strip(t);if(s2!==t)e.textContent=s2}}}}

  function scan(n){
    if(!n||!n.isConnected)return;
    if(n.nodeType===3){conv(n);return}
    if(n.nodeType!==1||skipEl(n)&&n.nodeName!=='OPTION'&&n.nodeName!=='SELECT'&&n.nodeName!=='INPUT'&&n.nodeName!=='TEXTAREA')return;
    stripAttrs(n);
    var tw=document.createTreeWalker(n,5),x,list=[];
    while((x=tw.nextNode()))list.push(x);
    list.forEach(function(x){if(x.nodeType===3)conv(x);else if(x.nodeType===1)stripAttrs(x)})}

  var mo=null;
  function observe(){if(mo)mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR})}
  function run(nodes){
    if(!ready())return;
    if(mo)mo.disconnect();
    try{
      nodes.forEach(scan);
      lucide.createIcons({attrs:{'stroke-width':2}});     // 大小 / 颜色由 CSS 控制（svg.lucide）
    }catch(e){}
    observe()}

  window.applyIcons=function(root){run([root||document.body])};   // 其它脚本想立刻刷新时可以调用
  if(!ready())return;
  mo=new MutationObserver(function(ml){
    var s=[],seen=new Set();
    ml.forEach(function(m){
      if(m.type==='childList')m.addedNodes.forEach(function(n){if(!seen.has(n)){seen.add(n);s.push(n)}});
      else if(!seen.has(m.target)){seen.add(m.target);s.push(m.target)}});
    if(s.length)run(s)});
  run([document.body]);
})();
