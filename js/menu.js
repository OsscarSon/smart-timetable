// ≡ 左侧菜单：分组大圆角卡片，一行一个入口。设置页是“分类列表 → 二级页面”，菜单里的设置项直接跳到对应二级页。
(function(){
  var dw=document.getElementById('dwr'),mk=document.getElementById('dwm'),se=document.getElementById('v-se'),idx=document.getElementById('seidx'),seh=document.getElementById('seh'),curSec='';
  var X='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var SECS=[['look','🎨','外观与显示','主题色、深色、日历、视图密度'],['tt','🏫','课表与课程','多个课表、节次、课程、拍照导入'],['hol','🎌','假期','放假期间自动跳过安排'],
    ['notify','🔔','通知与提醒','课前 / 作业提醒、提示方式、手机权限'],['cloud','☁️','账号与同步','多设备同步、附件'],['data','💾','数据：分享与备份','链接 / .ics 分享、导出 / 导入备份']];
  var bk=se.querySelector('.back');
  // ---- 设置：index → 二级页 ----
  function buildIdx(){idx.innerHTML='';SECS.forEach(function(s){
    var b=el('button','mrow'),d=el('div');d.appendChild(el('b',null,s[2]));d.appendChild(el('small',null,s[3]));
    b.appendChild(el('span',null,s[1]));b.appendChild(d);b.appendChild(el('i',null,'›'));b.onclick=function(){setSec(s[0]);window.scrollTo(0,0)};idx.appendChild(b)})}
  function setSec(sec){
    curSec=sec||'';var title='⚙️ 设置';
    se.classList.toggle('one',!!sec);idx.hidden=!!sec;
    [].forEach.call(se.querySelectorAll('.sec'),function(d){var on=d.getAttribute('data-sec')===sec;d.classList.toggle('cur',on);if(on)title=d.getAttribute('data-t')});
    seh.textContent=title;if(bk)bk.textContent=sec?'‹ 设置':'‹ 更多'}
  buildIdx();setSec('');
  var _sv=showView;
  showView=function(v){_sv(v);if(v==='se'&&!via)setSec('');if(v==='more')buildMore()};
  var via=false;
  function openSet(sec){closeMenu();via=true;showView('se');via=false;setSec(sec)}
  if(bk)bk.onclick=function(){if(curSec)setSec('');else showView('more');window.scrollTo(0,0)};

  function loc(en,zh,ms){return ({en:en,zh:zh,ms:ms})[window.LANG||'en']||en}
  // Goals 入口（Phase 1）：goals.js 没加载或被关掉（Goals.setEnabled(false)）时不显示
  function goalsMenu(){if(!(window.Goals&&Goals.enabled&&Goals.enabled()))return [];var L=(window.GOALS_I18N||{})[window.LANG||'en']||(window.GOALS_I18N||{}).en||{};
    return [['🎯',L.title||'Goals',L.menuDesc||'',function(){closeMenu();if(window.openGoals)openGoals()}]]}
  // ---- 菜单内容 ----
  function go(v){closeMenu();showView(v)}
  // 一份入口清单，≡ 菜单和底部“更多”页共用（分组：AI 与工具 / 个性化 / 课表与数据 / 关于）
  function groups(){
    var rm=window.RATE_MENU||['给 Mochi 评分','喜欢 Mochi 吗？告诉我们！'],fm=window.FAQ_MENU||['常见问题与帮助','常见问题和使用技巧'];
    // 顺序：评分 → 分享 → 常见问题 → 功能介绍与开源 →（可安装）
    var about=[['⭐',rm[0],rm[1],function(){closeMenu();if(window.openRate)openRate()}],
      ['💌','分享给朋友','把 Mochi 推荐给同学',function(){closeMenu();shareApp()}],
      ['❓',fm[0],fm[1],function(){closeMenu();if(window.openFaq)openFaq()}],
      ['ℹ️',(window.ABOUT_MENU||['功能介绍与开源'])[0],(window.ABOUT_MENU||['',''])[1],function(){closeMenu();openAbout()}]].concat(window.INSTALL_MENU?[window.INSTALL_MENU]:[]);
    return [
      ['AI 与工具',[['✨','AI 助手','一句话添加 · 拍照导入 · 整周重排',function(){closeMenu();openAI('quick')}],
        ['🤖','问问 Mochi','问日程、让 AI 帮你改（先预览，可撤销）',function(){closeMenu();if(window.openAgent)openAgent()}],
        ['📷','拍照导入课表','拍一张课表，AI 帮你填',function(){closeMenu();openAI('photo')}],
        ['🔍','搜索','课程、活动、作业、提醒',function(){closeMenu();openSearch()}],
        ['🏃','运动计划','训练安排',function(){go('sp')}],
        ['⚡','Mochi Energy',loc('Plan around your energy','根据精力合理安排','Rancang ikut tenaga anda'),function(){closeMenu();window.MochiNext&&MochiNext.openEnergy()}],
        ['🎧','Mochi Wrapped',loc('Your monthly schedule recap','查看每月时间回顾','Ringkasan jadual bulanan'),function(){closeMenu();window.MochiNext&&MochiNext.openWrapped()}]].concat(goalsMenu())],
      ['个人配置',[['🧭',loc('Getting started & modes','新手引导与模式','Panduan & mod'),loc('Take a tour, then choose Study / Work / Life','先看引导，再选择学习 / 工作 / 生活','Lihat panduan, kemudian pilih Belajar / Kerja / Kehidupan'),function(){closeMenu();window.MochiNext&&MochiNext.startTour()}],
        ['🎨','外观与显示','主题色、深色、视图密度',function(){openSet('look')}],
        window.wpMenuItem?window.wpMenuItem():null,
        window.langMenuItem?window.langMenuItem():null,
        ['🔔','通知与提醒','课前 / 作业提醒、手机权限',function(){openSet('notify')}]].filter(Boolean)],
      ['课表与数据',[['🏫','课表与课程','多个课表、节次、课程',function(){openSet('tt')}],
        ['🎌','假期','放假期间自动跳过安排',function(){openSet('hol')}],
        ['☁️','账号与云同步','多设备同步、附件',function(){openSet('cloud')}],
        ['💾','数据：分享与备份','链接、二维码、.ics、备份',function(){openSet('data')}]]],
      ['关于 Mochi',about]]}
  function fill(box,withTitles){
    groups().forEach(function(g){
      if(withTitles)box.appendChild(el('div','grp-t',g[0]));
      var gb=el('div','dw-g');
      g[1].forEach(function(it){var b=el('button','dw-r'),i=el('i',null,it[0]),d=el('div'),t=el('b',null,it[1]);
        d.appendChild(t);d.appendChild(el('small',null,it[2]));b.appendChild(i);b.appendChild(d);b.appendChild(el('em','dw-ch','›'));b.onclick=it[3];gb.appendChild(b)});
      box.appendChild(gb)})}
  function shareApp(){
    var u=location.origin+location.pathname;
    if(navigator.share)navigator.share({title:'Mochi 时间表',text:'我在用 Mochi 排课表，超可爱～',url:u}).catch(function(){});
    else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){alert('链接已复制：'+u)},function(){prompt('复制这个链接：',u)});
    else prompt('复制这个链接：',u)}
  // 版本号只从 js/version.js 读（以前写死成 v8.8.1，更新后菜单还是旧号）
  function verLine(){return el('div','dw-ft','Mochi Schedule · v'+(window.MOCHI_VERSION||'?'))}
  function build(){
    dw.innerHTML='';
    var top=el('div','dw-top'),h=el('h2',null,'菜单'),x=el('button','ed-x');x.innerHTML=X;x.setAttribute('aria-label','关闭菜单');x.onclick=closeMenu;
    top.appendChild(h);top.appendChild(x);dw.appendChild(top);
    fill(dw,true);
    dw.appendChild(verLine())}
  // 「更多」页：同一份清单，不再是 4 行
  var mv=document.getElementById('v-more');
  function buildMore(){
    if(!mv)return;
    mv.innerHTML='';mv.appendChild(el('h2',null,'更多'));
    fill(mv,true);mv.appendChild(verLine())}
  buildMore();
  function openMenu(){build();if(window.applyIcons)applyIcons(dw);dw.classList.add('show');mk.classList.add('show');dw.setAttribute('aria-hidden','false')}
  function closeMenu(){dw.classList.remove('show');mk.classList.remove('show');dw.setAttribute('aria-hidden','true')}
  window.openMenu=openMenu;window.closeMenu=closeMenu;
  mk.onclick=closeMenu;document.getElementById('burger').onclick=openMenu;
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
  var sx=null,sy=0;
  document.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});
  document.addEventListener('touchend',function(e){if(sx==null)return;var t=e.changedTouches[0],dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);
    if(dy<40){if(dx>70&&sx<24&&!dw.classList.contains('show'))openMenu();else if(dx<-70&&dw.classList.contains('show'))closeMenu()}sx=null},{passive:true});
})();
