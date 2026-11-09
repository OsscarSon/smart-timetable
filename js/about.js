// ≡ 菜单 →「功能介绍与开源」：给朋友看的说明页。文字按界面语言直接内置（不走词典 / 机翻），开源库清单要和 index.html 里的 data-lib 保持一致。
(function(){
  var L=window.LANG||'en',I=L==='zh'?0:L==='ms'?2:1;
  function t(a){return a[I]}
  var T={
    menu:['功能介绍与开源','Features & open source','Ciri & sumber terbuka'],
    menuSub:['这个 App 能做什么、用了哪些开源项目','What this app does and what it is built on','Apa yang app ini boleh buat & projek yang digunakan'],
    h:['🐱 Mochi 智能时间表','🐱 Mochi Smart Timetable','🐱 Mochi Jadual Pintar'],
    intro:['适用于学习、工作与生活的智能时间表。AI 帮你安排时间；数据默认保存在设备上，登录后才同步。','A smart timetable for study, work and everyday life. AI helps organize your time. Your data stays on your device unless you sign in to sync.','Jadual pintar untuk belajar, kerja dan kehidupan harian. AI membantu mengatur masa anda. Data kekal pada peranti sehingga anda log masuk untuk segerak.'],
    fh:['功能','Features','Ciri'],
    tabO:['开源项目','Open source','Sumber terbuka'],
    lh:['用到的开源项目','Open-source projects used','Projek sumber terbuka'],
    note:['AI 整理 / 问答：文字类请求按顺序用 Groq / Cerebras / Mistral / Gemini 的免费额度（都不是开源，需要登录）；拍照识别只用 Gemini。浏览器内置翻译和 Gemini Nano 属于浏览器自带功能。','Text AI requests use the free tiers of Groq, Cerebras, Mistral and Gemini in turn (none are open source; sign-in required); photo import uses Gemini only. Browser built-in translation is a browser feature.','Permintaan AI teks guna tahap percuma Groq, Cerebras, Mistral dan Gemini secara bergilir (bukan sumber terbuka; perlu log masuk); import foto guna Gemini sahaja. Terjemahan terbina dalam pelayar ialah ciri pelayar.'],
    close:['关闭','Close','Tutup']
  };
  var F=[
    ['🧭',['使用场景与引导','Modes & guided tour','Mod & panduan'],['学习、工作、生活可多选；全部共用同一份时间表，新手引导结束后可选择模式。','Select any combination of Study, Work and Life on one timetable; choose modes after the guided tour.','Pilih Belajar, Kerja dan Kehidupan secara gabungan pada satu jadual selepas panduan.']],
    ['⚡',['Mochi Energy','Mochi Energy','Mochi Energy'],['记录每天精力，得到不自动修改日程的安排建议。','Log your daily energy and get suggestions without automatic schedule changes.','Rekod tenaga harian dan terima cadangan tanpa mengubah jadual secara automatik.']],
    ['🎧',['Mochi Wrapped','Mochi Wrapped','Mochi Wrapped'],['根据当前课表已保存的手动安排生成每月回顾，可导出 PNG 分享；计划时长不等于实际时长。','Monthly recap from saved manual events in the current timetable, exportable as PNG; planned time is not actual time.','Ringkasan bulanan daripada acara manual tersimpan dan eksport PNG; masa dirancang bukan masa sebenar.']],
    ['🕒',['Chrono 日期识别','Chrono date preview','Pratonton tarikh Chrono'],['在 AI 输入框预览识别到的日期，仍通过原本的 AI 流程确认后添加。','Preview detected dates in the AI input; adding events still follows the existing confirmation flow.','Pratonton tarikh yang dikesan dalam input AI; tambah acara masih melalui pengesahan asal.']],
    ['📅',['日视图 / 周视图','Day & week views','Paparan hari & minggu'],['按分钟排课，周视图能看到当前时间线，重叠的安排会并排显示。','Minute-level scheduling, a live “now” line, and overlapping items shown side by side.','Jadual hingga minit, garisan masa kini, dan item bertindih dipaparkan bersebelahan.']],
    ['✨',['AI 助手','AI assistant','Pembantu AI'],['一句话添加活动或作业；拍照导入课表；整周自动重排。AI 只给方案，你确认后才写入。','Add an event or homework in one sentence, import a timetable from a photo, or let AI re-plan the week. AI only proposes — you confirm.','Tambah acara/kerja rumah dengan satu ayat, import jadual dari foto, atau susun semula minggu. AI hanya cadang — anda sahkan.']],
    ['🤖',['问问 Mochi','Ask Mochi','Tanya Mochi'],['问“明天哪段时间有空”“哪些作业快到期”，或让它帮你挪日程。改动先预览，可撤销。','Ask “when am I free tomorrow?” or “what is due soon?”, or have it move things around. Changes are previewed and can be undone.','Tanya “bila saya lapang esok?” atau “apa yang hampir tamat tempoh?”. Perubahan dipratonton dan boleh dibatalkan.']],
    ['🏫',['多课表与固定课程','Multiple timetables & lessons','Banyak jadual & pelajaran'],['节次、教室、老师、单双周轮换；每个课表有各自的安排和作业。','Periods, rooms, teachers and 1–4 week rotation; each timetable has its own events and homework.','Waktu, bilik, guru dan putaran 1–4 minggu; setiap jadual ada acara & kerja rumah sendiri.']],
    ['🔁',['重复活动与假期','Recurring events & holidays','Acara berulang & cuti'],['每周 / 每月重复；设置假期后重复活动自动跳过。','Weekly or monthly repeats; recurring items skip your holidays automatically.','Ulang mingguan/bulanan; acara berulang melangkau cuti secara automatik.']],
    ['📝',['作业','Homework','Kerja rumah'],['按截止日期分组，科目标签、搜索、链接和附件，快到期会提醒。','Grouped by due date with subjects, search, links, attachments and due-date reminders.','Dikumpul ikut tarikh akhir, dengan subjek, carian, pautan, lampiran dan peringatan.']],
    ['📖',['学习 / 复习','Study & revision','Belajar & ulang kaji'],['闪卡用间隔重复算法（FSRS）安排复习，记得越牢出现越少。','Flashcards scheduled with spaced repetition (FSRS): the better you know a card, the less often it appears.','Kad imbas dijadual dengan ulangan berjarak (FSRS): semakin kukuh ingatan, semakin jarang muncul.']],
    ['🏃',['运动计划与统计','Sport plan & stats','Pelan sukan & statistik'],['记录训练安排；统计页用图表看学习和运动时间。','Plan training and see study and sport time in charts.','Rancang latihan dan lihat masa belajar & sukan dalam carta.']],
    ['🔔',['提醒与通知','Reminders & notifications','Peringatan & notifikasi'],['课前提醒、作业截止提醒、提示方式可选；手机 App 可用系统闹钟。','Before-class and homework-due reminders with selectable sound/vibration; the phone app uses system alarms.','Peringatan sebelum kelas & tarikh akhir, bunyi/getaran boleh dipilih; app telefon guna penggera sistem.']],
    ['📤',['分享与日历','Sharing & calendars','Kongsi & kalendar'],['课表可生成链接 / 二维码给朋友；支持导出和导入 .ics（Google / Apple 日历）。','Share a timetable by link or QR code; export and import .ics (Google / Apple Calendar).','Kongsi jadual melalui pautan/kod QR; eksport & import .ics (Google / Apple Calendar).']],
    ['☁️',['账号与云同步','Account & cloud sync','Akaun & segerak awan'],['多设备同步，冲突时让你选择；也可完全离线使用。','Sync across devices and choose a side on conflicts; works fully offline too.','Segerak merentas peranti, pilih versi bila berlaku konflik; boleh guna sepenuhnya luar talian.']],
    ['🔍',['搜索、撤销、小组件','Search, undo, widget','Carian, buat asal, widget'],['全局搜索课程 / 活动 / 作业；批量改动可撤销；Android 桌面小组件显示下一节课。','Search everything, undo bulk changes, and an Android home-screen widget for your next class.','Cari semua, buat asal perubahan pukal, dan widget skrin utama Android untuk kelas seterusnya.']],
    ['🌐',['三种语言 / 可安装','3 languages & installable','3 bahasa & boleh dipasang'],['English / 中文 / Bahasa Melayu；可像 App 一样安装到手机，离线也能打开。','English / 中文 / Bahasa Melayu; install it like an app and open it offline.','English / 中文 / Bahasa Melayu; pasang seperti app dan buka tanpa internet.']]
  ];
  var O=[
    ['Driver.js','MIT',['交互式新手引导','Interactive guided tour','Panduan interaktif'],'https://github.com/kamranahmedse/driver.js'],
    ['chrono-node','MIT',['自然语言日期识别预览','Natural-language date parsing preview','Pratonton tafsiran tarikh bahasa semula jadi'],'https://github.com/wanasit/chrono'],
    ['dayjs','MIT',['日期计算','Date handling','Pengiraan tarikh'],'https://github.com/iamkun/dayjs'],
    ['rrule','BSD-3',['复杂重复规则（每月第几个周几）','Complex recurrence rules','Peraturan ulangan kompleks'],'https://github.com/jkbrzt/rrule'],
    ['ical.js','MPL-2.0',['解析 .ics 日历文件','Parsing .ics calendar files','Menghurai fail kalendar .ics'],'https://github.com/kewisch/ical.js'],
    ['ts-fsrs','MIT',['闪卡间隔重复（FSRS）','Spaced repetition (FSRS)','Ulangan berjarak (FSRS)'],'https://github.com/open-spaced-repetition/ts-fsrs'],
    ['Dexie','Apache-2.0',['浏览器本地数据库（附件）','In-browser database (attachments)','Pangkalan data pelayar (lampiran)'],'https://github.com/dexie/Dexie.js'],
    ['Supabase JS','MIT',['账号登录与云同步','Sign-in and cloud sync','Log masuk & segerak awan'],'https://github.com/supabase/supabase-js'],
    ['Chart.js','MIT',['统计图表','Statistics charts','Carta statistik'],'https://github.com/chartjs/Chart.js'],
    ['lz-string','MIT',['把课表压缩成分享链接','Compresses timetables into share links','Mampatkan jadual untuk pautan kongsi'],'https://github.com/pieroxy/lz-string'],
    ['qrcode-generator','MIT',['生成分享二维码','Share QR codes','Kod QR kongsi'],'https://github.com/kazuhikoarase/qrcode-generator'],
    ['LXGW WenKai 霞鹜文楷','OFL-1.1',['界面中文字体','Chinese interface font','Fon Cina antara muka'],'https://github.com/lxgw/LxgwWenKai'],
    ['@capacitor-community/speech-recognition','MIT',['手机 App 里的语音输入','Voice input in the phone app','Input suara dalam app telefon'],'https://github.com/capacitor-community/speech-recognition'],
    ['@ebarooni/capacitor-calendar','MIT',['读写手机系统日历','Read and write the phone calendar','Baca & tulis kalendar telefon'],'https://github.com/ebarooni/capacitor-calendar'],
    ['Lucide','ISC',['界面图标','Interface icons','Ikon antara muka'],'https://github.com/lucide-icons/lucide'],
    ['Capacitor','MIT',['打包成 Android / iOS App','Packages the web app as Android / iOS','Membungkus sebagai app Android / iOS'],'https://github.com/ionic-team/capacitor'],
    ['SortableJS','MIT',['拖动排序（科目、护肤步骤、运动卡片）','Drag-and-drop ordering (subjects, skincare steps, sport cards)','Susun seret (subjek, langkah kulit, kad sukan)'],'https://github.com/SortableJS/Sortable'],
    ['Fuse.js','Apache-2.0',['模糊搜索（打错字也能找到）','Fuzzy search (finds results despite typos)','Carian kabur (jumpa walaupun salah taip)'],'https://github.com/krisk/Fuse'],
    ['Open Food Facts','ODbL',['开源食品营养数据库（饮食栏查热量）','Open food & nutrition database (diet tab lookups)','Pangkalan data makanan terbuka (carian diet)'],'https://world.openfoodfacts.org'],
    ['Transformers.js + opus-mt','Apache-2.0 / CC-BY-4.0',['浏览器内的开源翻译模型（Helsinki-NLP）','On-device open-source translation model (Helsinki-NLP)','Model terjemahan sumber terbuka dalam pelayar (Helsinki-NLP)'],'https://github.com/huggingface/transformers.js']
  ];
  var m=null;
  function build(){
    m=el('div','mask');m.id='mask11';m.onclick=function(){m.classList.remove('show')};
    var d=el('div','dlg ab');d.onclick=function(e){e.stopPropagation()};
    d.appendChild(el('h2',null,t(T.h)));d.appendChild(el('div','msg',t(T.intro)));
    // 两个栏：功能 / 开源项目
    var tabs=el('div','seg wide ab-tabs'),pf=el('div','ab-pane'),po=el('div','ab-pane'),bf=el('button','on',t(T.fh)),bo=el('button',null,t(T.tabO));
    tabs.setAttribute('role','tablist');[bf,bo].forEach(function(b){b.type='button';b.setAttribute('role','tab')});
    function pick(f){bf.classList.toggle('on',f);bo.classList.toggle('on',!f);bf.setAttribute('aria-selected',f?'true':'false');bo.setAttribute('aria-selected',f?'false':'true');pf.hidden=!f;po.hidden=f;d.scrollTop=0}
    bf.onclick=function(){pick(true)};bo.onclick=function(){pick(false)};tabs.appendChild(bf);tabs.appendChild(bo);d.appendChild(tabs);
    F.forEach(function(f){var r=el('div','ab-r'),i=el('i',null,f[0]),b=el('div');b.appendChild(el('b',null,t(f[1])));b.appendChild(el('small',null,t(f[2])));r.appendChild(i);r.appendChild(b);pf.appendChild(r)});
    O.forEach(function(o){var r=el('div','ab-r'),i=el('i',null,'📦'),b=el('div'),a=el('a',null,o[0]);a.href=o[3];a.target='_blank';a.rel='noopener noreferrer';
      var h=el('b');h.appendChild(a);h.appendChild(document.createTextNode(' · '+o[1]));b.appendChild(h);b.appendChild(el('small',null,t(o[2])));r.appendChild(i);r.appendChild(b);po.appendChild(r)});
    po.appendChild(el('div','msg',t(T.note)));
    d.appendChild(pf);d.appendChild(po);pick(true);
    var ac=el('div','acts'),x=el('button',null,t(T.close));x.onclick=function(){m.classList.remove('show')};ac.appendChild(x);d.appendChild(ac);
    m.appendChild(d);document.body.appendChild(m)}
  window.openAbout=function(){if(!m)build();m.classList.add('show')};
  window.ABOUT_MENU=[t(T.menu),t(T.menuSub)];
})();
