// 📲 安装成 App（PWA）：Android / 电脑 Chrome 一键安装；iPhone 没有一键安装，给出“添加到主屏幕”的步骤。
// 入口：≡ 菜单里的「安装成 App」+ 课表页底部一条可关闭的小提示（关掉后 14 天不再出现）。已经装好（独立窗口打开）就都不显示。
(function(){
  var L=window.LANG||'en',I=L==='zh'?0:L==='ms'?2:1;
  var T={
    menu:[['安装成 App','Install as an app','Pasang sebagai app'],['添加到主屏幕，像 App 一样打开、离线也能用','Add to your home screen — opens like an app, works offline','Tambah ke skrin utama — buka seperti app, boleh guna luar talian']],
    bar:['把 Mochi 装到主屏幕','Put Mochi on your home screen','Letak Mochi di skrin utama'],
    go:['安装','Install','Pasang'],
    h:['📲 安装 Mochi','📲 Install Mochi','📲 Pasang Mochi'],
    ios:[['在 Safari 里打开这个网页（不是微信 / 其他 App 内置的浏览器）','Open this page in Safari (not inside another app’s browser)','Buka halaman ini dalam Safari (bukan pelayar dalam app lain)'],['点底部的「分享」按钮（方框加向上箭头）','Tap the Share button (square with an up arrow)','Ketik butang Kongsi (petak dengan anak panah ke atas)'],['往下滑，选「添加到主屏幕」，再点「添加」','Scroll down, choose “Add to Home Screen”, then Add','Tatal ke bawah, pilih “Add to Home Screen”, kemudian Add']],
    and:[['用 Chrome 打开这个网页','Open this page in Chrome','Buka halaman ini dalam Chrome'],['点右上角「⋮」菜单','Tap the ⋮ menu at the top right','Ketik menu ⋮ di penjuru kanan atas'],['选「安装应用」或「添加到主屏幕」','Choose “Install app” or “Add to Home screen”','Pilih “Install app” atau “Add to Home screen”']],
    ok:['好的','Got it','Faham'],
    done:['已安装！可以在主屏幕找到 Mochi 🐱','Installed! Find Mochi on your home screen 🐱','Siap! Cari Mochi di skrin utama 🐱']
  };
  function t(a){return a[I]}
  var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  if(standalone)return;
  var ua=navigator.userAgent||'',IOS=/iphone|ipad|ipod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  var dp=null,bar=null,m=null;
  function mk(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
  function hideBar(rem){if(bar){bar.remove();bar=null}if(rem){try{localStorage.setItem('inst-dismiss',String(Date.now()))}catch(e){}}}
  function help(){
    if(!m){
      m=mk('div','mask');m.onclick=function(){m.classList.remove('show')};
      var d=mk('div','dlg');d.onclick=function(e){e.stopPropagation()};
      d.appendChild(mk('h2',null,t(T.h)));
      var ol=mk('ol','inst-s');(IOS?T.ios:T.and).forEach(function(s){ol.appendChild(mk('li',null,t(s)))});d.appendChild(ol);
      var a=mk('div','acts'),b=mk('button','ok',t(T.ok));b.onclick=function(){m.classList.remove('show')};a.appendChild(b);d.appendChild(a);
      m.appendChild(d);document.body.appendChild(m)}
    m.classList.add('show')}
  window.openInstall=async function(){
    hideBar(true);
    if(dp){var p=dp;dp=null;try{p.prompt();var c=await p.userChoice;if(c&&c.outcome==='accepted')alert(t(T.done))}catch(e){help()}return}
    help()};
  window.INSTALL_MENU=['📲',t(T.menu[0]),t(T.menu[1]),function(){if(window.closeMenu)closeMenu();openInstall()}];
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dp=e;later()});
  window.addEventListener('appinstalled',function(){dp=null;hideBar(false);window.INSTALL_MENU=null});
  function later(){setTimeout(showBar,3500)}
  function showBar(){
    if(bar||standalone)return;
    try{var d=+localStorage.getItem('inst-dismiss')||0;if(Date.now()-d<14*864e5)return}catch(e){}
    if(!dp&&!IOS)return;
    bar=mk('div','inst');bar.setAttribute('role','status');
    var im=mk('img');im.src='icons/icon-192.png';im.alt='';im.width=36;im.height=36;bar.appendChild(im);
    bar.appendChild(mk('span',null,t(T.bar)));
    var b=mk('button',null,t(T.go));b.onclick=function(){openInstall()};bar.appendChild(b);
    var x=mk('button','x','✕');x.setAttribute('aria-label','close');x.onclick=function(){hideBar(true)};bar.appendChild(x);
    document.body.appendChild(bar)}
  if(IOS)later();
})();
