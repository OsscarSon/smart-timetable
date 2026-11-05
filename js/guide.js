// 📖 功能表：全部功能 + 怎么用。想增减内容，直接改下面的 GD 数组。
(function(){
  var GD=[
   ['📅 课表',[
    ['日视图 / 周视图','课表页右上角「日｜周」','日视图：顶部日期条选日期，下面是当天列表，会提示“进行中 / 下一项”和倒计时。周视图：整周时间轴，用 ‹ 今天 › 翻周，今天的列和当前时间线会高亮。','FullCalendar（周视图时间轴）、dayjs（日期）'],
    ['新增活动','点周视图的空白处，或右下角橙色 ＋','填名字，选星期、开始时间、持续时间、颜色。可设重复：每周、每 2/3/4 周、每月第几个周几、每月最后一个周几，还能设“重复到哪天”和“假期里不出现”。','rrule（每月第几个周几）、dayjs'],
    ['修改 / 删除活动','点课表上的色块','在同一个页面里改任何内容。重复活动有“只删本周”和“删除（全部）”两种。'],
    ['复制到下周 / 清空','课表页上方按钮','把这一周的安排复制到下一周；清空只清当前这一周，会先确认。'],
    ['勾选完成','提醒页的“今天的安排”','勾选后课表上的色块会变淡并加删除线，顶部会提示今天还剩几件事。']]],
   ['✨ AI',[
    ['AI 添加（一句话 / 语音 / 拍照）','课表页右下角 ✨','直接打字或点麦克风说“下周三下午三点数学补习”，也可以拍课表照片。AI 先给你预览，确认后才会写入。','云端用 Google Gemini（不开源）；本机备用用 WebLLM（Apache-2.0）'],
    ['记录本周特别安排','底部「更多」页下方','每行写一件临时的事（如“周六与朋友打球”），勾选要排的行，按「排」。AI 会把它放进去，并把冲突的安排挪开；写完的行会变 ✅，不会重复处理。'],
    ['Ai 小猫','「更多」页左下角','点一下会冒出对话气泡，“示范：帮我排一周”可以看到自动排程的效果。'],
    ['AI 没反应怎么办','Vercel 后台','检查环境变量 GEMINI_API_KEY（必填）和 GEMINI_MODEL（可选）是否正确，改完要 Redeploy。云端不可用时，会自动改用本机 AI 或本地规则。']]],
   ['📚 学习与运动',[
    ['学习计划','≡ 菜单或「更多」→ 学习计划','选科目 → 加入章节 → 设考试日期 → 按「一键排进本周课表」。复习排上午、做题排下午、预习排晚上，离考试越近做题越多。学完或复习完给自己打分 😵忘了 / 🤔模糊 / 😎记得，系统用 FSRS 间隔复习算下次复习日。','ts-fsrs（FSRS 间隔复习，MIT）'],
    ['运动计划','≡ 菜单或「更多」→ 运动计划','加一项运动，填项目/现在成绩/目标成绩（如 5k：21:00 → 20:00），选每周 1–3 次，按「一键排」。会安排间歇、节奏、长距离等训练，隔天练。建议先排学习，再排运动。']]],
   ['📝 作业与提醒',[
    ['作业与任务','底部「作业」','点“＋ 新作业”，写内容、科目、截止时间、备注、链接，可以附照片或文件。按日期分组，支持搜索和筛选，勾选完成。','Dexie（附件存本机，Apache-2.0）'],
    ['提醒','底部「提醒」','上面是今天的安排清单，下面是“我的提醒”：写内容、选星期和时间。点“开启通知”允许通知；网页版要开着才会提醒，装成手机 App 后用系统通知。'],
    ['统计','≡ 菜单 → 统计','作业完成率、每天安排的时长。','Chart.js（MIT）']]],
   ['🏫 课表管理',[
    ['固定课表','≡ 菜单 → 固定课表','填学校每周重复的上课时间：节次时间模板、课程（教室、老师、类型、第几周循环）。也可以用“拍照导入课表”。固定课表占用的时间不会被 AI 排进别的活动。'],
    ['我的课表（多个课表）','≡ 菜单 → 我的课表','可以建多个课表（学校、运动、备考…），切换和归档。'],
    ['假期','≡ 菜单 → 假期','添加假期的起止日，放假期间重复活动和固定课程会自动跳过。'],
    ['外观与日历','≡ 菜单 → 外观与日历','主题色、浅色/深色/跟随系统、一周从周几开始、隐藏周末、24 小时制，还有“新版周视图”开关（出问题时可以关掉）。','Lucide（线条图标，ISC）']]],
   ['💾 数据与分享',[
    ['分享与导出','≡ 菜单 → 分享与导出','生成分享链接和二维码，朋友打开就能把你的课表导入成新课表；也可导出 .ics 放进手机日历（注意假期不会被排除）。','lz-string（压缩链接）、qrcode-generator（二维码）'],
    ['备份','≡ 菜单 → 备份','导出 / 导入备份文件。换手机或清缓存前先导出。附件不在备份里。'],
    ['账号与云同步（可选）','≡ 菜单 → 账号与云同步','需要先设置 Supabase。登录后多台设备自动同步，附件也会上传云端。','Supabase / supabase-js（开源，MIT）'],
    ['安装到手机','浏览器菜单 → 添加到主屏幕','像 App 一样打开；打包成 Android App 后还能用桌面小组件和后台通知（需要在 Android Studio 里编译）。','Workbox（离线缓存）、Capacitor（打包 Android App）']]],
   ['🧭 小技巧',[
    ['打开菜单','左上角 ≡，或从屏幕左边缘向右划','菜单里能找到所有功能入口。'],
    ['看不到新版本','关掉网页重新打开','为了离线能用，页面会缓存，更新后可能要重开一次。'],
    ['检查开源库有没有加载','设置页最下面“开源库”一行','✓ 表示加载成功，✗ 表示没加载到，对应功能会自动退回基础版。']]]
  ];
  // 网页文件是旧的、没有功能表页时，自己把页面和入口补上
  var sec=document.getElementById('v-gd');
  if(!sec){
    sec=document.createElement('section');sec.className='card st';sec.id='v-gd';
    sec.appendChild(el('h2',null,'📖 功能表'));
    var qi=document.createElement('input');qi.id='gdq';qi.className='gdq';qi.placeholder='搜索功能，例如：提醒、分享、开源…';sec.appendChild(qi);
    var gl=document.createElement('div');gl.id='gdl';sec.appendChild(gl);
    var anchor=document.getElementById('v-bt')||document.getElementById('v-more');
    anchor.parentNode.insertBefore(sec,anchor);
    var mv=document.getElementById('v-more');
    if(mv&&!mv.querySelector('[data-go="gd"]')){
      var row=document.createElement('button');row.className='mrow';row.setAttribute('data-go','gd');
      row.innerHTML='<span>📖</span><div><b>功能表</b><small>全部功能和使用方法</small></div><i>›</i>';
      row.onclick=function(){showView('gd')};
      mv.insertBefore(row,mv.children[1]||null)}
    // 正常加载时 app.js 会自己加返回键；现场补载（app.js 已经跑完）时由这里补
    setTimeout(function(){if(!sec.querySelector('.back')){var bk=el('button','back','‹ 更多');bk.onclick=function(){showView('more')};sec.insertBefore(bk,sec.firstChild)}},0)
  }
  var box=document.getElementById('gdl'),q=document.getElementById('gdq');
  if(!box)return;
  GD.forEach(function(g){
    var h=el('div','gd-g',g[0]);box.appendChild(h);var items=[];
    g[1].forEach(function(it){
      var d=document.createElement('details');d.className='gd-i';
      d.appendChild(el('summary',null,it[0]));d.appendChild(el('div','gd-w','📍 '+it[1]));d.appendChild(el('p',null,it[2]));if(it[3])d.appendChild(el('div','gd-o','🧩 用到的开源：'+it[3]));
      d._t=(it[0]+it[1]+it[2]+(it[3]||'')).toLowerCase();items.push(d);box.appendChild(d)});
    h._items=items});
  // ---- 🧩 开源项目（✓/✗ = 这个库现在有没有加载到）----
  function T(f){try{return !!f()}catch(e){return false}}
  var OSS=[
   ['FullCalendar','MIT','fullcalendar/fullcalendar','周视图的连续时间轴和当前时间线','退回方块网格',function(){return window.FullCalendar&&FullCalendar.Calendar}],
   ['dayjs','MIT','iamkun/dayjs','日期格式化、加减天/周、校验','退回手写版本',function(){return typeof dayjs==='function'}],
   ['rrule','BSD-3-Clause','jkbrzt/rrule','“每月第几个周几”这类重复规则','这两个重复选项变灰',function(){return window.rrule&&window.rrule.RRule}],
   ['ts-fsrs','MIT','open-spaced-repetition/ts-fsrs','学习计划的间隔复习（FSRS 算法）','退回简易算法',function(){return typeof FS!=='undefined'&&FS}],
   ['Dexie','Apache-2.0','dexie/Dexie.js','作业附件存在本机（IndexedDB）','附件功能不可用，其余正常',function(){return typeof Dexie==='function'}],
   ['Supabase（supabase-js）','MIT；Supabase 本身也是开源项目','supabase/supabase-js','账号、云同步、附件云存储','云同步显示“未启用”',function(){return window.supabase&&window.supabase.createClient}],
   ['Chart.js','MIT','chartjs/Chart.js','统计页图表','只显示文字摘要',function(){return typeof Chart==='function'}],
   ['lz-string','MIT','pieroxy/lz-string','分享链接的压缩和解压','不能生成或打开分享链接',function(){return window.LZString}],
   ['qrcode-generator','MIT','kazuhikoarase/qrcode-generator','分享二维码','只提供链接',function(){return typeof qrcode==='function'}],
   ['Lucide','ISC','lucide-icons/lucide','底部栏和菜单的线条图标','保留 emoji',function(){return window.lucide&&window.lucide.createIcons}],
   ['Workbox','MIT','GoogleChrome/workbox','离线缓存（service worker）','只保留通知功能',null],
   ['Capacitor','MIT','ionic-team/capacitor','打包成 Android App：系统通知、桌面小组件','网页版不受影响',null],
   ['WebLLM','Apache-2.0','mlc-ai/web-llm','本机 AI 备用：在浏览器里跑模型，不用 key','云端 AI 不可用时才会用到',null]
  ];
  var og=el('div','gd-g','🧩 开源项目（✓ 已加载　✗ 没加载到）');box.appendChild(og);og._items=[];
  OSS.forEach(function(o){
    var d=document.createElement('details');d.className='gd-i';
    var st=o[5]?(T(o[5])?' ✓':' ✗'):'';
    d.appendChild(el('summary',null,o[0]+st));
    d.appendChild(el('div','gd-w','📜 许可：'+o[1]+'　　🔗 GitHub：'+o[2]));
    d.appendChild(el('p',null,'用在：'+o[3]+'。没加载到时：'+o[4]+'。'));
    d._t=(o[0]+o[1]+o[2]+o[3]+'开源').toLowerCase();og._items.push(d);box.appendChild(d)});
  var ng=el('div','gd-g','☁️ 不是开源的服务');box.appendChild(ng);ng._items=[];
  [['Google Gemini API','云端 AI（重排、一句话/拍照添加）。免费额度有每日次数限制，免费版的内容可能被 Google 用来改进产品，别输入太私密的内容。'],
   ['Vercel','放网页和后端（api 文件夹）。个人用免费。'],
   ['Chrome 内置 Gemini Nano','部分浏览器里自带的本机 AI，是“本机 AI 备用”的第一选择之一。']].forEach(function(o){
    var d=document.createElement('details');d.className='gd-i';
    d.appendChild(el('summary',null,o[0]));d.appendChild(el('p',null,o[1]));d._t=(o[0]+o[1]+'不开源').toLowerCase();ng._items.push(d);box.appendChild(d)});
  box.appendChild(el('div','gd-w','⚠️ 许可证和仓库名来自我的记忆，使用前请到各项目的 GitHub 页面确认最新许可和维护状态。'));
  q.oninput=function(){
    var k=q.value.trim().toLowerCase();
    [].forEach.call(box.querySelectorAll('.gd-g'),function(h){
      var any=false;h._items.forEach(function(d){var on=!k||d._t.indexOf(k)>=0;d.hidden=!on;if(on)any=true;if(k&&on)d.open=true;if(!k)d.open=false});
      h.hidden=!any})};
})();
