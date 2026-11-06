// 语言栏：不再是一排要“点来点去”的小按钮，而是和菜单里其他功能一样的一行（图标 + 标题 + 当前语言 + ›）。
// 点开是一张底部列表：每种语言一行，当前的打勾，点哪个就切换（切换 = 记住选择 + 刷新页面，逻辑仍在 i18n.js）。
(function(){
  var NAMES=window.LANG_NAMES||{en:'English',zh:'中文',ms:'Bahasa Melayu'};
  var SUB={en:'English',zh:'Chinese · 华文',ms:'Malay'};
  var ORDER=['en','zh','ms'];
  var sheet=null;
  function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
  function lname(k){return k==='zh'?'zh-CN':k}

  function build(){
    sheet=h('div','mask sheet');sheet.id='mask-lang';
    var d=h('div','dlg lgp');d.onclick=function(e){e.stopPropagation()};
    var top=h('div','lgp-top');top.appendChild(h('h2',null,'Language · 语言'));
    var x=h('button','ed-x');x.setAttribute('aria-label','Close');x.appendChild(h('i'));x.firstChild.setAttribute('data-lucide','x');x.onclick=close;top.appendChild(x);
    d.appendChild(top);
    var list=h('div','dw-g');
    ORDER.forEach(function(k){
      var b=h('button','dw-r lgp-r'+(k===window.LANG?' on':''));b.setAttribute('lang',lname(k));
      var ic=h('i');ic.setAttribute('data-lucide','languages');b.appendChild(ic);
      var t=h('div');t.appendChild(h('b',null,NAMES[k]));t.appendChild(h('small',null,SUB[k]));b.appendChild(t);
      var ck=h('em','lgp-ck');if(k===window.LANG){var c=h('i');c.setAttribute('data-lucide','check');ck.appendChild(c)}b.appendChild(ck);
      b.onclick=function(){if(k===window.LANG){close();return}window.setLang(k)};
      list.appendChild(b)});
    d.appendChild(list);
    d.appendChild(h('div','msg','Mochi remembers this on this device only.'));
    sheet.appendChild(d);sheet.onclick=close;document.body.appendChild(sheet)}
  function open(){
    if(window.closeMenu)try{closeMenu()}catch(e){}
    if(sheet)sheet.remove();build();sheet.classList.add('show');
    if(window.applyIcons)applyIcons(sheet)}
  function close(){if(sheet)sheet.classList.remove('show')}
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  window.openLangPicker=open;

  // 一行（设置页用）：返回 <button class="mrow">
  window.mkLangRow=function(box){
    if(!box)return;box.innerHTML='';
    var b=h('button','mrow');b.setAttribute('aria-haspopup','dialog');
    var s=h('span',null,'🌐');var d=h('div');d.appendChild(h('b',null,'Language · 语言'));d.appendChild(h('small',null,NAMES[window.LANG]||''));
    b.appendChild(s);b.appendChild(d);b.appendChild(h('i',null,'›'));b.onclick=open;box.appendChild(b)};
  // 一行（菜单 / 更多页用）：[emoji, 标题, 副标题, 点击]
  window.langMenuItem=function(){return['🌐','Language · 语言',NAMES[window.LANG]||'',open]};
  // 向导里仍用小按钮（第一次打开时一步选完最快）
})();
