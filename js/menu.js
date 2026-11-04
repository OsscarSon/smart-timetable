// ≡ 左侧菜单（仿 Smart Timetable 的设置菜单）：分组大圆角卡片，一行一个入口。
// 设置页被拆成“分区”：点菜单里的某一行，只显示那一个分区（外观 / 固定课表 / 假期 / 云同步 …）。
// 全部是原生 CSS + JS，没有引入 UI 框架（见 README 里的说明）。
(function(){
  var dw=document.getElementById('dwr'),mk=document.getElementById('dwm'),se=document.getElementById('v-se'),via=false;
  var X='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  // ---- 设置分区 ----
  function setSec(sec){
    var title='⚙️ 设置';
    se.classList.toggle('one',!!sec);
    [].forEach.call(se.querySelectorAll('.sec'),function(d){var on=d.getAttribute('data-sec')===sec;d.classList.toggle('cur',on);if(on)title=d.getAttribute('data-t')});
    se.querySelector('h2').textContent=title}
  var _sv=showView;
  showView=function(v){_sv(v);if(v==='se'&&!via)setSec('')};     // 从别处直接进设置 = 显示全部分区
  function openSet(sec){closeMenu();via=true;showView('se');via=false;setSec(sec)}

  // ---- 菜单内容 ----
  var G=[
    [['📚','学习计划','章节、考试日期、复习排程',function(){go('st')}],
     ['🏃','运动计划','训练安排',function(){go('sp')}],
     ['📊','统计','作业完成率、每天安排时长',function(){go('sta')}]],
    [['🏫','固定课表','上课时间、节次、课程',function(){openSet('fixed')}],
     ['📷','拍照导入课表','拍一张课表，AI 帮你填',function(){closeMenu();if(window.openAI)openAI(true)}],
     ['🗂️','我的课表','切换 / 新建多个课表',function(){openSet('tables')}]],
    [['🔗','分享与导出','链接、二维码、.ics 日历',function(){openSet('share')}]],
    [['🎨','外观与日历','主题色、深色、一周从哪天开始',function(){openSet('look')}],
     ['🎌','假期','放假期间自动跳过安排',function(){openSet('hol')}]],
    [['☁️','账号与云同步','多设备同步、附件',function(){openSet('cloud')}],
     ['💾','备份','导出 / 导入',function(){openSet('backup')}]],
    [['💌','分享给朋友','把 Mochi 推荐给同学',function(){closeMenu();shareApp()}]]
  ];
  function go(v){closeMenu();showView(v)}
  function shareApp(){
    var u=location.origin+location.pathname;
    if(navigator.share)navigator.share({title:'Mochi 时间表',text:'我在用 Mochi 排课表，超可爱～',url:u}).catch(function(){});
    else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){alert('链接已复制：'+u)},function(){prompt('复制这个链接：',u)});
    else prompt('复制这个链接：',u)}
  function build(){
    dw.innerHTML='';
    var top=el('div','dw-top'),h=el('h2',null,'菜单'),x=el('button','ed-x');x.innerHTML=X;x.setAttribute('aria-label','关闭菜单');x.onclick=closeMenu;
    top.appendChild(h);top.appendChild(x);dw.appendChild(top);
    G.forEach(function(g){var box=el('div','dw-g');
      g.forEach(function(it){var b=el('button','dw-r'),i=el('i',null,it[0]),d=el('div'),t=el('b',null,it[1]);
        d.appendChild(t);d.appendChild(el('small',null,it[2]));b.appendChild(i);b.appendChild(d);b.onclick=it[3];box.appendChild(b)});
      dw.appendChild(box)});
    dw.appendChild(el('div','dw-ft','Mochi 时间表 · v6.1'))}
  function openMenu(){build();dw.classList.add('show');mk.classList.add('show');dw.setAttribute('aria-hidden','false')}
  function closeMenu(){dw.classList.remove('show');mk.classList.remove('show');dw.setAttribute('aria-hidden','true')}
  window.openMenu=openMenu;window.closeMenu=closeMenu;
  mk.onclick=closeMenu;
  document.getElementById('burger').onclick=openMenu;
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
  // 向右划（从左边缘）打开、向左划关闭
  var sx=null,sy=0;
  document.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});
  document.addEventListener('touchend',function(e){if(sx==null)return;var t=e.changedTouches[0],dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);
    if(dy<40){if(dx>70&&sx<24&&!dw.classList.contains('show'))openMenu();else if(dx<-70&&dw.classList.contains('show'))closeMenu()}sx=null},{passive:true});

  // ---- 把原来“更多 → 设置”和设置页的返回键接到新菜单 ----
  var row=document.querySelector('#v-more [data-go="se"]');
  if(row){row.removeAttribute('data-go');row.onclick=openMenu;row.querySelector('small').textContent='外观、课表、假期、云同步、备份（也可点左上角 ≡）'}
  var bk=se.querySelector('.back');
  if(bk){bk.textContent='‹ 菜单';bk.removeAttribute('data-go');bk.onclick=function(){showView('tt');openMenu()}}
})();
