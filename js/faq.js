// ≡ 菜单 →「常见问题与帮助」：可搜索的问答列表，点一条展开答案。文字按界面语言直接内置（和 about.js 一样，不走词典）。
// 答案里的 {tt} {hol} 等会换成菜单里对应入口的名字（按当前语言），菜单改名时只用改下面的 P。
(function(){
  var L=window.LANG||'en',I=L==='zh'?0:L==='ms'?2:1;
  function t(a){return a[I]}
  var P={
    tt:['课表与课程','Timetables & classes','Jadual & kelas'],
    hol:['假期','Holidays','Cuti'],
    cloud:['账号与云同步','Account & cloud sync','Akaun & segerak awan'],
    data:['数据：分享与备份','Data: share & backup','Data: kongsi & sandaran'],
    notif:['通知与提醒','Notifications & reminders','Pemberitahuan & peringatan'],
    look:['外观与显示','Appearance & display','Rupa & paparan']
  };
  var T={
    menu:['常见问题与帮助','FAQ & Help','Soalan lazim & bantuan'],
    menuSub:['常见问题和使用技巧','Common questions and how-tos','Soalan biasa dan cara guna'],
    h:['常见问题与帮助','FAQ & Help','Soalan lazim & bantuan'],
    ph:['搜索问题…','Search questions…','Cari soalan…'],
    none:['没有找到相关问题。换个关键词试试？','No matching questions. Try another keyword?','Tiada soalan sepadan. Cuba kata kunci lain?'],
    ver:['Mochi 版本','Mochi version','Versi Mochi'],
    close:['关闭','Close','Tutup']
  };
  // [问题, 答案]，每项三种语言：[zh, en, ms]
  var Q=[
    [['我的数据存在哪里？换手机会丢吗？','Where is my data stored? Will I lose it if I change phones?','Di mana data saya disimpan? Adakah hilang jika tukar telefon?'],
     ['默认只存在这台设备上。换手机前，先在「{cloud}」登录同步，或在「{data}」导出备份，到新手机再导入。普通备份不含作业 / 课程附件，要带附件请选「导出（含附件）」。卸载 App 或清除浏览器数据会删掉本机数据，所以换机前请先备份。',
      'By default it lives only on this device. Before switching phones, sign in under “{cloud}” to sync, or export a backup under “{data}” and import it on the new phone. A normal backup does not include homework or lesson attachments; use the export option that includes attachments to bring them along. Uninstalling the app or clearing browser data deletes the local data, so back up first.',
      'Secara lalai data hanya disimpan pada peranti ini. Sebelum tukar telefon, log masuk di “{cloud}” untuk segerak, atau eksport sandaran di “{data}” dan import pada telefon baru. Sandaran biasa tidak termasuk lampiran kerja rumah/pelajaran; pilih eksport yang termasuk lampiran untuk membawanya. Menyahpasang app atau mengosongkan data pelayar akan memadam data setempat, jadi buat sandaran dahulu.']],
    [['怎么把课表放进来？','How do I get my timetable into Mochi?','Bagaimana memasukkan jadual ke Mochi?'],
     ['三种办法：① 拍照导入：拍一张课表，AI 识别后先给你确认，确认了才写入；② 手动添加：在「{tt}」里添加课程，节次、教室、老师都可以填；③ 朋友分享的链接 / 二维码，或导入 .ics 日历文件（在「{data}」里）。',
      'Three ways: (1) Photo import: snap your timetable, AI reads it and shows a preview, and nothing is saved until you confirm. (2) Add manually under “{tt}” with periods, rooms and teachers. (3) Open a link or QR code a friend shared, or import an .ics calendar file (under “{data}”).',
      'Tiga cara: (1) Import foto: ambil gambar jadual, AI membacanya dan menunjukkan pratonton; tiada apa disimpan sehingga anda sahkan. (2) Tambah secara manual di “{tt}” dengan waktu, bilik dan guru. (3) Buka pautan/kod QR yang dikongsi rakan, atau import fail kalendar .ics (di “{data}”).']],
    [['单双周 / 多周轮换怎么设？','How do I set up alternating (A/B) weeks?','Bagaimana menetapkan minggu berselang-seli (A/B)?'],
     ['在「{tt}」里可以设置 1–4 周轮换（单双周就是 2 周）。轮换只影响固定课程；重复活动按各自的起始日期计算，不会因为切换轮换周数而错位。',
      'Under “{tt}” you can set a 1–4 week rotation (alternating weeks = 2). Rotation only affects fixed lessons; recurring events follow their own start dates and will not shift when you change the rotation.',
      'Di “{tt}” anda boleh tetapkan putaran 1–4 minggu (minggu berselang-seli = 2). Putaran hanya menjejaskan pelajaran tetap; acara berulang mengikut tarikh mula sendiri dan tidak beralih apabila putaran ditukar.']],
    [['提醒不响怎么办？','My reminders don\u2019t ring. What should I do?','Peringatan tidak berbunyi. Apa patut saya buat?'],
     ['手机 App：① 在「{notif}」里开启提醒并允许通知；② 允许“闹钟和提醒”（精确闹钟）权限；③ 在系统设置里，把 Mochi 从省电 / 电池优化限制中排除。开启后会提前排好未来 7 天的提醒，App 关掉也会响。网页版需要浏览器允许通知，可靠性不如手机 App。',
      'Phone app: (1) turn reminders on and allow notifications under “{notif}”; (2) allow the “Alarms & reminders” (exact alarm) permission; (3) in system settings, exclude Mochi from battery optimization. Once on, the next 7 days of reminders are scheduled ahead and ring even when the app is closed. The web version needs browser notification permission and is less reliable than the phone app.',
      'App telefon: (1) hidupkan peringatan dan benarkan pemberitahuan di “{notif}”; (2) benarkan kebenaran “Penggera & peringatan” (penggera tepat); (3) dalam tetapan sistem, kecualikan Mochi daripada pengoptimuman bateri. Selepas diaktifkan, peringatan 7 hari akan datang dijadualkan lebih awal dan berbunyi walaupun app ditutup. Versi web memerlukan kebenaran pemberitahuan pelayar dan kurang dipercayai berbanding app telefon.']],
    [['AI 说用不了 / 额度用完了？','AI says it can\u2019t be used / the quota is used up?','AI kata tidak boleh digunakan / kuota habis?'],
     ['作者提供的免费额度有限，用完当天就不能用了。可以在「{cloud}」里填你自己的 Gemini key（aistudio.google.com/apikey 免费申请），这样不占作者额度，也不用登录。拍照识别只能走云端，需要联网。AI 只给方案，你确认后才会写入。',
      'The free quota provided by the author is limited and runs out for the day. Paste your own Gemini API key under “{cloud}” (free at aistudio.google.com/apikey); it will not use the author\u2019s quota and needs no sign-in. Photo import only works through the cloud, so it needs internet. AI only proposes changes; nothing is saved until you confirm.',
      'Kuota percuma yang disediakan pembangun terhad dan akan habis untuk hari itu. Tampal kunci API Gemini anda sendiri di “{cloud}” (percuma di aistudio.google.com/apikey); ia tidak menggunakan kuota pembangun dan tidak perlu log masuk. Import foto hanya berfungsi melalui awan, jadi perlu internet. AI hanya mencadangkan; tiada apa disimpan sehingga anda sahkan.']],
    [['误操作能撤销吗？','Can I undo a mistake?','Bolehkah saya buat asal kesilapan?'],
     ['AI 助手的改动、导入 .ics、AI 添加写入之后，屏幕上会弹出一条带「撤销」的提示，点一下就能恢复（页面会刷新）。看到提示时就点，别等它消失。',
      'After AI assistant changes, an .ics import, or an AI add, a notice with an “Undo” button appears. Tap it to restore everything (the page reloads). Tap it while the notice is showing.',
      'Selepas perubahan pembantu AI, import .ics atau tambahan AI, satu notis dengan butang “Buat asal” muncul. Ketik untuk memulihkan semuanya (halaman dimuat semula). Ketik semasa notis masih dipaparkan.']],
    [['放假时怎么让安排自动跳过？','How do I make events skip my holidays?','Bagaimana membuat acara melangkau cuti?'],
     ['在「{hol}」里设置假期日期。假期内的重复活动和固定课程会自动跳过；导出 .ics 时，假期里的安排也会自动排除。',
      'Set your holiday dates under “{hol}”. Recurring events and fixed lessons are skipped automatically during them, and they are also left out when you export an .ics file.',
      'Tetapkan tarikh cuti di “{hol}”. Acara berulang dan pelajaran tetap dilangkau secara automatik sepanjang cuti, dan ia juga dikecualikan semasa eksport fail .ics.']],
    [['怎么把课表分享给朋友？','How do I share my timetable with a friend?','Bagaimana berkongsi jadual dengan rakan?'],
     ['在「{data}」里点分享课表，会生成链接和二维码（里面是当前课表的固定课程）；朋友打开后可以导入成一份新课表。也可以导出 .ics 给 Google / Apple 日历。如果想推荐 Mochi 本身，用菜单里的「分享给朋友」。',
      'Under “{data}”, tap the share-timetable button to create a link and QR code (it contains the fixed lessons of the current timetable); your friend opens it and imports it as a new timetable. You can also export .ics for Google / Apple Calendar. To recommend Mochi itself, use “Share with friends” in the menu.',
      'Di “{data}”, ketik butang kongsi jadual untuk menjana pautan dan kod QR (mengandungi pelajaran tetap jadual semasa); rakan membukanya dan mengimportnya sebagai jadual baru. Anda juga boleh eksport .ics untuk Google / Apple Calendar. Untuk mengesyorkan Mochi sendiri, guna “Kongsi dengan rakan” dalam menu.']],
    [['一定要登录吗？','Do I have to sign in?','Adakah saya mesti log masuk?'],
     ['不用。不登录也能使用全部本地功能，数据只存在这台设备。登录（在「{cloud}」）后才会在你的多台设备间同步，出现冲突时由你选择保留哪一边。',
      'No. Without signing in you still get every local feature, and your data stays on this device. Signing in (under “{cloud}”) syncs it across your devices, and on a conflict you choose which side to keep.',
      'Tidak. Tanpa log masuk anda masih boleh guna semua ciri setempat dan data kekal pada peranti ini. Log masuk (di “{cloud}”) akan menyegerakkan data merentas peranti, dan jika berlaku konflik anda pilih versi mana untuk disimpan.']],
    [['能离线使用吗？','Does it work offline?','Boleh guna tanpa internet?'],
     ['可以。网页版可以像 App 一样安装到手机，没网也能打开。AI 功能和云同步需要联网。',
      'Yes. The web version can be installed like an app and opens without internet. AI features and cloud sync need a connection.',
      'Boleh. Versi web boleh dipasang seperti app dan dibuka tanpa internet. Ciri AI dan segerak awan memerlukan sambungan.']],
    [['怎么添加桌面小组件？','How do I add the home-screen widget?','Bagaimana menambah widget skrin utama?'],
     ['只有 Android App 有小组件：长按手机桌面 → 小组件 → Mochi，拖出来就会显示下一节课。',
      'Only the Android app has a widget: long-press your home screen, choose Widgets, then Mochi, and drag it out. It shows your next class.',
      'Hanya app Android ada widget: tekan lama skrin utama, pilih Widget, kemudian Mochi, dan seret keluar. Ia memaparkan kelas seterusnya.']],
    [['Mochi Energy 和 Mochi Wrapped 是什么？','What are Mochi Energy and Mochi Wrapped?','Apakah Mochi Energy dan Mochi Wrapped?'],
     ['Energy：记录每天的精力，给你安排建议，但不会自动修改日程。Wrapped：根据当前课表里已保存的手动安排生成每月回顾，可导出图片分享；注意它用的是计划时长，不等于实际花的时间。',
      'Energy: log your daily energy and get scheduling suggestions; it never changes your schedule automatically. Wrapped: a monthly recap built from the manual events saved in the current timetable, exportable as an image. It uses planned time, which is not the same as time actually spent.',
      'Energy: rekod tenaga harian dan dapatkan cadangan jadual; ia tidak mengubah jadual secara automatik. Wrapped: ringkasan bulanan daripada acara manual yang disimpan dalam jadual semasa, boleh dieksport sebagai imej. Ia guna masa yang dirancang, bukan masa sebenar yang digunakan.']],
    [['怎么换语言和主题色？','How do I change the language and theme color?','Bagaimana menukar bahasa dan warna tema?'],
     ['语言：≡ 菜单里的「Language · 语言」，支持 English / 中文 / Bahasa Melayu。主题色、深色模式、视图密度：「{look}」。',
      'Language: use “Language · 语言” in the ≡ menu (English / 中文 / Bahasa Melayu). Theme color, dark mode and density: “{look}”.',
      'Bahasa: guna “Language · 语言” dalam menu ≡ (English / 中文 / Bahasa Melayu). Warna tema, mod gelap dan ketumpatan paparan: “{look}”.']],
    [['我的隐私有保障吗？','What happens to my privacy?','Bagaimana dengan privasi saya?'],
     ['不登录时，数据只在你的设备上。使用 AI 功能时，你输入的文字或课表照片会发到服务器，再转给 AI 服务解析；AI 只返回建议，不会直接改你的数据。登录后，数据会同步到你的云端账号。',
      'Without signing in, your data stays on your device. When you use AI features, the text or timetable photo you give is sent to a server and passed on to an AI service for parsing; AI only returns suggestions and never edits your data directly. After you sign in, your data syncs to your cloud account.',
      'Tanpa log masuk, data kekal pada peranti anda. Apabila guna ciri AI, teks atau foto jadual yang anda beri dihantar ke pelayan dan diteruskan kepada perkhidmatan AI untuk dihuraikan; AI hanya memulangkan cadangan dan tidak mengubah data anda secara langsung. Selepas log masuk, data disegerakkan ke akaun awan anda.']]
  ];
  function fill(s){return s.replace(/\{(\w+)\}/g,function(_,k){return P[k]?t(P[k]):''})}
  var m=null,list=null,none=null,srch=null,rows=[];
  function build(){
    m=el('div','mask');m.id='mask-faq';m.onclick=close;
    var d=el('div','dlg fq');d.onclick=function(e){e.stopPropagation()};d.setAttribute('role','dialog');d.setAttribute('aria-label',t(T.h));
    d.appendChild(el('h2',null,t(T.h)));
    srch=el('input');srch.type='search';srch.placeholder=t(T.ph);srch.setAttribute('aria-label',t(T.ph));srch.autocomplete='off';srch.oninput=filter;d.appendChild(srch);
    list=el('div','fq-l');
    Q.forEach(function(q,n){
      var qt=t(q[0]),at=fill(t(q[1])),row=el('div','fq-i'),b=el('button','fq-q'),a=el('div','fq-a',at),id='fqa'+n;
      b.type='button';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',id);a.id=id;a.hidden=true;
      b.appendChild(el('span',null,qt));b.appendChild(el('em','fq-ch','›'));
      b.onclick=function(){var open=a.hidden;a.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');row.classList.toggle('open',open)};
      row.appendChild(b);row.appendChild(a);list.appendChild(row);rows.push({row:row,txt:(qt+' '+at).toLowerCase()})});
    d.appendChild(list);
    none=el('div','msg',t(T.none));none.hidden=true;d.appendChild(none);
    d.appendChild(el('div','msg fq-v',t(T.ver)+' v'+(window.MOCHI_VERSION||'?')));
    var ac=el('div','acts'),x=el('button',null,t(T.close));x.type='button';x.onclick=close;ac.appendChild(x);d.appendChild(ac);
    m.appendChild(d);document.body.appendChild(m)}
  function filter(){
    var q=srch.value.trim().toLowerCase(),n=0;
    rows.forEach(function(r){var ok=!q||r.txt.indexOf(q)>=0;r.row.hidden=!ok;if(ok)n++});
    none.hidden=n>0}
  function close(){if(m)m.classList.remove('show')}
  window.openFaq=function(){if(!m)build();srch.value='';filter();m.classList.add('show')};
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  window.FAQ_MENU=[t(T.menu),t(T.menuSub)];
})();
