// 壁纸：几款跟着主题色走的内置图案（纯 CSS 渐变，没有图片文件、不占流量）+ 你自己的照片。
// 只存在这台设备（键名 ui-wp*，不参与云同步）。开启后卡片变成半透明磨砂，壁纸从卡片之间透出来。
(function(){
  var M=function(a){return 'color-mix(in srgb,var(--pri) '+a+'%,transparent)'};
  var M3=function(a){return 'color-mix(in srgb,var(--pri3) '+a+'%,transparent)'};
  var M2=function(a){return 'color-mix(in srgb,var(--pri2) '+a+'%,transparent)'};
  var WP=[
    ['none','无壁纸',null,null],
    ['peach','蜜桃渐变','radial-gradient(60% 45% at 12% 8%,'+M(42)+',transparent 70%),radial-gradient(55% 45% at 95% 22%,'+M3(34)+',transparent 70%),radial-gradient(75% 55% at 45% 105%,'+M2(40)+',transparent 70%)','cover'],
    ['aurora','极光渐变','linear-gradient(165deg,'+M(30)+' 0%,transparent 38%),radial-gradient(70% 40% at 80% 70%,'+M3(30)+',transparent 70%),radial-gradient(60% 40% at 10% 85%,color-mix(in srgb,var(--sky) 70%,transparent),transparent 70%)','cover'],
    ['dots','圆点图案','radial-gradient('+M(34)+' 1.7px,transparent 2.2px)','22px 22px'],
    ['grid','方格图案','linear-gradient('+M(16)+' 1px,transparent 1px),linear-gradient(90deg,'+M(16)+' 1px,transparent 1px)','28px 28px'],
    ['stripes','斜纹图案','repeating-linear-gradient(135deg,'+M(15)+' 0 9px,transparent 9px 18px)','auto']
  ];
  var K='ui-wp',KO='ui-wp-o',KI='ui-wp-img';
  function g(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
  function s(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
  function del(k){try{localStorage.removeItem(k)}catch(e){}}
  var cur=g(K,'none'),op=+g(KO,'100')||100;
  function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

  function layer(id){
    if(id==='photo'){var u=g(KI,'');return u?['url("'+u+'")','cover']:null}
    for(var i=0;i<WP.length;i++)if(WP[i][0]===id&&WP[i][2])return [WP[i][2],WP[i][3]];
    return null}
  function apply(){
    var r=document.documentElement,L=layer(cur);
    if(!L){r.removeAttribute('data-wp');['--wp-img','--wp-size','--wp-o'].forEach(function(p){r.style.removeProperty(p)});return}
    r.setAttribute('data-wp',cur);
    r.style.setProperty('--wp-img',L[0]);r.style.setProperty('--wp-size',L[1]);r.style.setProperty('--wp-o',String(op/100))}
  apply();

  // ---- 选择面板 ----
  var sheet=null;
  function tile(id,name,prev){
    var b=h('button','wp-t'+(id===cur?' on':''));b.setAttribute('aria-pressed',id===cur?'true':'false');
    var p=h('span','wp-p');
    if(prev){p.style.backgroundImage=prev[0];p.style.backgroundSize=prev[1]==='cover'?'cover':prev[1]}
    else if(id==='photo')p.textContent='🖼️';
    b.appendChild(p);b.appendChild(h('small',null,name));
    b.onclick=function(){
      if(id==='photo'&&!g(KI,'')){fi.click();return}
      cur=id;s(K,id);apply();refresh()};
    return b}
  var fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.hidden=true;
  fi.onchange=function(){
    var f=fi.files&&fi.files[0];fi.value='';if(!f)return;
    var img=new Image(),url=URL.createObjectURL(f);
    img.onload=function(){
      var m=1080,k=Math.min(1,m/Math.max(img.width,img.height)),c=document.createElement('canvas');
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
      var data=c.toDataURL('image/jpeg',.78);
      if(!s(KI,data)){alert(window.tr?tr('这张照片太大，存不下，换一张小一点的试试。'):'Photo too large.');return}
      cur='photo';s(K,'photo');apply();refresh()};
    img.onerror=function(){URL.revokeObjectURL(url)};img.src=url};
  function refresh(){
    if(!sheet)return;var box=sheet.querySelector('.wp-g');box.innerHTML='';
    WP.forEach(function(w){box.appendChild(tile(w[0],w[1],w[2]?[w[2],w[3]]:null))});
    var u=g(KI,'');box.appendChild(tile('photo','我的照片',u?['url("'+u+'")','cover']:null));
    sheet.querySelector('.wp-rm').hidden=!u;
    sheet.querySelector('.wp-o').hidden=cur==='none';
    sheet.querySelector('.wp-o input').value=op;
    if(window.applyIcons)applyIcons(sheet);
    [].forEach.call(document.querySelectorAll('.wp-sub'),function(e){e.textContent=curName()})}
  function curName(){
    if(cur==='photo')return window.tr?tr('我的照片'):'Photo';
    for(var i=0;i<WP.length;i++)if(WP[i][0]===cur)return window.tr?tr(WP[i][1]):WP[i][1];return ''}
  function build(){
    sheet=h('div','mask sheet');sheet.id='mask-wp';
    var d=h('div','dlg wpd');d.onclick=function(e){e.stopPropagation()};
    var top=h('div','lgp-top');top.appendChild(h('h2',null,'🖼️ 壁纸'));
    var x=h('button','ed-x');x.setAttribute('aria-label','Close');var xi=h('i');xi.setAttribute('data-lucide','x');x.appendChild(xi);x.onclick=close;top.appendChild(x);d.appendChild(top);
    d.appendChild(h('div','wp-g'));
    var o=h('label','tp wp-o');var n=h('div','n');n.appendChild(h('span',null,'壁纸浓淡'));o.appendChild(n);
    var r=document.createElement('input');r.type='range';r.min=25;r.max=100;r.step=5;r.setAttribute('aria-label','Wallpaper strength');
    r.oninput=function(){op=+r.value;s(KO,String(op));apply()};o.appendChild(r);d.appendChild(o);
    var rm=h('button','chip wp-rm','移除照片');rm.onclick=function(){del(KI);if(cur==='photo'){cur='none';s(K,'none')}apply();refresh()};d.appendChild(rm);
    d.appendChild(h('div','msg','图案颜色会跟着你选的主题色走；照片只保存在这台设备上，不会上传，也不参与云同步。'));
    d.appendChild(fi);sheet.appendChild(d);sheet.onclick=close;document.body.appendChild(sheet)}
  function open(){
    if(window.closeMenu)try{closeMenu()}catch(e){}
    if(sheet)sheet.remove();build();refresh();sheet.classList.add('show')}
  function close(){if(sheet)sheet.classList.remove('show')}
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  window.openWallpaper=open;
  window.wpMenuItem=function(){return['🖼️','壁纸','图案、渐变或你自己的照片',open]};
  window.mkWpRow=function(box){
    if(!box)return;box.innerHTML='';
    var b=h('button','mrow');b.setAttribute('aria-haspopup','dialog');
    var sp=h('span',null,'🖼️'),d=h('div');d.appendChild(h('b',null,'壁纸'));d.appendChild(h('small','wp-sub',curName()));
    b.appendChild(sp);b.appendChild(d);b.appendChild(h('i',null,'›'));b.onclick=open;box.appendChild(b)};
})();
