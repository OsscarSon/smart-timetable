// 界面语言：en（默认）/ zh（华文）/ ms（马来文）。
// 做法：代码和页面里的文字原样保留中文（zh 就是原文）；选了 en / ms 时，这里在“显示出来的那一刻”把文字换成译文。
// 好处：数据里存的东西（课程类型、科目名…）不会被翻译破坏，切换语言也不会丢数据。
// 切换语言 = 记住选择 + 刷新页面。选择只存在这台设备（键名 ui-lang，不参与云同步）。
(function(){
  var NAMES={en:'English',zh:'中文',ms:'Bahasa Melayu'},lang='en';
  try{lang=localStorage.getItem('ui-lang')||'en'}catch(e){}
  if(!NAMES[lang])lang='en';
  window.LANG=lang;window.LANG_NAMES=NAMES;
  document.documentElement.lang=lang==='zh'?'zh-CN':lang;
  window.setLang=function(l){try{localStorage.setItem('ui-lang',l)}catch(e){}location.reload()};
  // 语言按钮（设置页、向导、菜单里共用）
  window.mkLangChips=function(box){
    box.innerHTML='';
    Object.keys(NAMES).forEach(function(k){
      var b=document.createElement('button');b.className='chip'+(k===lang?' on':'');b.textContent=NAMES[k];
      b.setAttribute('lang',k==='zh'?'zh-CN':k);b.onclick=function(){if(k!==lang)window.setLang(k)};box.appendChild(b)})};
  window.tr=function(s){return s};
  if(lang==='zh')return;                         // 华文 = 原文，什么都不用做

  var CJK=/[\u4e00-\u9fff\u3000-\u303f\uff01\uff08\uff09\uff0c\uff1a\uff1b\uff1f]/,IDX=lang==='en'?1:2;
  var M=Object.create(null),XM=Object.create(null),PAT=[],keys=[];
  function load(){
    (window.I18N||[]).forEach(function(r){if(r[IDX]!==undefined){M[r[0]]=r[IDX];keys.push(r[0])}});
    (window.I18N_X||[]).forEach(function(r){if(r[IDX]!==undefined)XM[r[0]]=r[IDX]});
    (window.I18N_P||[]).forEach(function(p){var rep=p[IDX];if(rep!==undefined)PAT.push([p[0],rep])});
    keys.sort(function(a,b){return b.length-a.length});
    window.I18N=window.I18N_X=window.I18N_P=null}
  load();
  function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
  var RE=keys.length?new RegExp(keys.map(esc).join('|'),'g'):null;
  var maxK=0;
  function subst(t){maxK=0;return RE?t.replace(RE,function(m){if(m.length>maxK)maxK=m.length;return M[m]}):t}
  // 句子框架翻译了、只剩用户自己写的词（被空格 / 标点 / 引号隔开）时，保留那些词原样；否则整句不动，免得把用户的中文弄成半中半英
  function partialOK(o){
    if(maxK<4)return false;
    var re=new RegExp(CJK.source+'+','g'),m;
    while((m=re.exec(o))){
      var b=o.charAt(m.index-1),a=o.charAt(m.index+m[0].length);
      if(/[A-Za-z0-9]/.test(b)||/[A-Za-z0-9]/.test(a))return false}
    return true}
  function core(t,deep){
    if(t in M)return M[t];
    if(t in XM)return XM[t];
    var o=t;
    PAT.forEach(function(p){o=o.replace(p[0],p[1])});
    o=subst(o);
    if(!CJK.test(o)||partialOK(o))return o.replace(/ {2,}/g,' ');
    if(!deep&&/ · |\n/.test(t)){            // 一行里有几段：能翻的翻，用户自己写的中文原样保留
      var ch=false,parts=t.split(/( · |\n)/).map(function(p){
        if(p===' · '||p==='\n'||!CJK.test(p))return p;
        var r=core(p,true);if(r!==null){ch=true;return r}return p});
      if(ch)return parts.join('')}
    return null}
  function tr1(s){
    var t=s.trim();if(!t)return s;
    var i=s.indexOf(t),out=core(t,false);
    return out===null?s:s.slice(0,i)+out+s.slice(i+t.length)}
  window.tr=function(s){s=String(s==null?'':s);return CJK.test(s)?tr1(s):s};

  // ---- 把页面上的文字换成译文（现有 + 以后新出现的）----
  var ATTRS=['placeholder','title','aria-label','alt','data-note'];
  function doText(n){var v=n.nodeValue;if(!v||!CJK.test(v))return;var o=tr1(v);if(o!==v)n.nodeValue=o}
  function doEl(e){
    var k=e.getAttribute&&e.getAttribute('data-i18n');          // 个别有歧义的词（如“日”= Day / Sun）用 data-i18n 指定
    if(k&&XM[k]!==undefined&&e.textContent!==XM[k])e.textContent=XM[k];
    for(var i=0;i<ATTRS.length;i++){var v=e.getAttribute&&e.getAttribute(ATTRS[i]);
      if(v&&CJK.test(v)){var o=tr1(v);if(o!==v)e.setAttribute(ATTRS[i],o)}}}
  function walk(root){
    if(root.nodeType===3){doText(root);return}
    if(root.nodeType!==1&&root.nodeType!==9)return;
    var tw=document.createTreeWalker(root,5,{acceptNode:function(n){return n.nodeType===1&&(n.tagName==='SCRIPT'||n.tagName==='STYLE')?2:1}});
    if(root.nodeType===1)doEl(root);
    var n;while((n=tw.nextNode())){if(n.nodeType===3)doText(n);else doEl(n)}}
  walk(document.documentElement);
  new MutationObserver(function(ml){
    ml.forEach(function(m){
      if(m.type==='characterData')doText(m.target);
      else if(m.type==='attributes')doEl(m.target);
      else[].forEach.call(m.addedNodes,walk)})
  }).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});

  // ---- 弹窗 ----
  ['alert','confirm'].forEach(function(k){var o=window[k];window[k]=function(m){return o.call(window,window.tr(m))}});
  var op=window.prompt;window.prompt=function(m,d){return op.call(window,window.tr(m),d)};
})();
