// ≡ 菜单 →「常见问题与帮助」：可搜索、可按分类筛选的问答列表，点一条展开答案。文字按界面语言直接内置（和 about.js 一样，不走词典）。
// 答案里的 {tt} {hol} 等会换成菜单里对应入口的名字（按当前语言），菜单改名时只用改下面的 P。
// 作者 Instagram 链接统一放在下面的 BY，菜单底部（menu.js）和本页底部都读它。
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
    close:['关闭','Close','Tutup'],
    cats:['问题分类','Question categories','Kategori soalan']
  };
  // 分类标签（顺序 = 显示顺序）：[id, zh, en, ms]
  var C=[['all','全部','All','Semua'],['general','入门与常见','Getting started','Bermula'],['timetable','课表','Timetable','Jadual'],['ai','AI 助手','AI assistant','Pembantu AI'],['study','学习与目标','Study & goals','Belajar & matlamat'],['data','数据与同步','Data & sync','Data & segerak'],['notify','提醒','Reminders','Peringatan'],['personalize','个性化','Personalize','Peribadi']];
  function cn(c){return c[I+1]}
  var curCat='all',chipBox=null;
  // [问题, 答案, 分类]，问题和答案各三种语言：[zh, en, ms]
  var Q=[
    // ───────── 入门与常见 ─────────
    [['第一次用，从哪里开始？','I am new here. Where do I start?','Saya baru guna. Bermula dari mana?'],
     ['先点菜单里「个人配置」下的「新手引导与模式」：走一遍引导，再选学习 / 工作 / 生活模式。课表还是空的？可以用「从模板开始」选一套模板，改好时间、预览之后再添加；也可以用「AI 助手」一句话添加，或者拍照导入课表。所有改动都先让你预览，确认后才会写入。',
      'Open “Getting started & modes” under the personal section of the menu: take the short tour, then choose Study / Work / Life. Timetable still empty? Use “Start with a template”, pick a starter kit, adjust the times and preview before adding. Or use the AI assistant to add things in one sentence, or import your timetable from a photo. Everything is previewed first and nothing is saved until you confirm.',
      'Buka “Panduan & mod” di bawah bahagian peribadi dalam menu: ikuti panduan ringkas, kemudian pilih Belajar / Kerja / Kehidupan. Jadual masih kosong? Guna “Mula dengan templat”, pilih satu kit permulaan, ubah masa dan pratonton sebelum menambah. Atau guna pembantu AI untuk menambah dengan satu ayat, atau import jadual daripada foto. Semuanya dipratonton dahulu dan tiada apa disimpan sehingga anda sahkan.'],'general'],
    [['学习 / 工作 / 生活模式是什么？','What are the Study / Work / Life modes?','Apakah mod Belajar / Kerja / Kehidupan?'],
     ['这是三种使用场景，可以任意多选，全部共用同一份时间表，不会各分一份数据。在「新手引导与模式」里选择。每个模式有自己的空间页：学习空间、工作空间（今日安排、下一项、本周已排时间、工作目标）、生活空间（护肤打卡、饮水、精力、温柔的日程）。页面里的数字都来自你自己的课表和记录；选了工作或生活之后，学习空间顶部会出现切换条，一点就能切过去；底部的「学习」标签仍然先进学习空间。',
      'They are three ways of using Mochi. You can pick any combination, and all of them share the same timetable, so your data is not split into separate copies. Choose them under “Getting started & modes”. Each mode has its own space page: Study Space, Work Space (today\u2019s flow, next activity, scheduled time this week, Work goals) and Life Space (skincare check-ins, water, energy, a gentle agenda). Every number comes from your own timetable and records. Once you pick Work or Life, a switcher appears at the top of Study Space so you can jump across; the bottom Study tab still opens Study Space first.',
      'Ini tiga cara menggunakan Mochi. Anda boleh pilih mana-mana gabungan, dan semuanya berkongsi jadual yang sama, jadi data tidak dipecahkan kepada salinan berasingan. Pilih di “Panduan & mod”. Setiap mod ada halaman ruang sendiri: Ruang Belajar, Ruang Kerja (aliran hari ini, aktiviti seterusnya, masa dijadualkan minggu ini, matlamat Kerja) dan Ruang Hidup (rutin kulit, air, tenaga, agenda lembut). Semua nombor datang daripada jadual dan rekod anda sendiri. Selepas anda pilih Kerja atau Hidup, penukar muncul di atas Ruang Belajar supaya anda boleh beralih; tab Belajar di bawah masih membuka Ruang Belajar dahulu.'],'general'],
    [['运动、美容、饮食这几栏怎么用？','How do the Sport, Beauty and Diet tabs work?','Bagaimana tab Sukan, Kecantikan dan Diet berfungsi?'],
     ['运动：记录训练安排，统计页可以用图表看学习和运动时间。美容：早 / 晚护肤步骤每天打卡，步骤可以自己改、拖动排序，会算连续打卡天数。饮食：记录每天喝水和吃了什么，热量可以从开源食品数据库 Open Food Facts 查，查不到就手动填。美容和饮食记录会随云同步和备份，只保留最近 90 天。',
      'Sport: plan your training, and the statistics page charts study and sport time. Beauty: tick off your morning and evening skincare steps each day; you can edit and drag the steps into order, and it counts your streak. Diet: log water and meals each day; calories can be looked up in the open Open Food Facts database, or typed in by hand if it is not found. Beauty and diet logs sync and back up with your data, and only the last 90 days are kept.',
      'Sukan: rancang latihan, dan halaman statistik memaparkan carta masa belajar & sukan. Kecantikan: tandakan langkah penjagaan kulit pagi dan malam setiap hari; langkah boleh diubah dan diseret untuk disusun, dan ia mengira rentetan hari. Diet: catat air dan makanan setiap hari; kalori boleh dicari dalam pangkalan data terbuka Open Food Facts, atau ditaip sendiri jika tidak dijumpai. Rekod kecantikan dan diet disegerak dan disandarkan bersama data anda, dan hanya 90 hari terakhir disimpan.'],'general'],
    [['Mochi Energy 和 Mochi Wrapped 是什么？','What are Mochi Energy and Mochi Wrapped?','Apakah Mochi Energy dan Mochi Wrapped?'],
     ['Energy：记录每天的精力，给你安排建议，但不会自动修改日程。Wrapped：根据当前课表里已保存的手动安排生成每月回顾，可导出图片分享；注意它用的是计划时长，不等于实际花的时间。',
      'Energy: log your daily energy and get scheduling suggestions; it never changes your schedule automatically. Wrapped: a monthly recap built from the manual events saved in the current timetable, exportable as an image. It uses planned time, which is not the same as time actually spent.',
      'Energy: rekod tenaga harian dan dapatkan cadangan jadual; ia tidak mengubah jadual secara automatik. Wrapped: ringkasan bulanan daripada acara manual yang disimpan dalam jadual semasa, boleh dieksport sebagai imej. Ia guna masa yang dirancang, bukan masa sebenar yang digunakan.'],'general'],
    [['怎么搜索课程、活动和作业？','How do I search for lessons, events and homework?','Bagaimana mencari pelajaran, acara dan kerja rumah?'],
     ['点菜单里的「搜索」，可以搜课程、活动、作业和提醒。打错一两个字也能找到（模糊搜索），点结果会直接跳到对应的地方。',
      'Tap “Search” in the menu to search lessons, events, homework and reminders. It is typo-tolerant, so a slightly misspelled word still finds results, and tapping a result takes you straight to it.',
      'Ketik “Carian” dalam menu untuk mencari pelajaran, acara, kerja rumah dan peringatan. Ia tahan salah eja, jadi perkataan yang sedikit tersalah masih menemui hasil, dan mengetik hasil terus membawa anda ke sana.'],'general'],
    [['误操作能撤销吗？','Can I undo a mistake?','Bolehkah saya buat asal kesilapan?'],
     ['AI 助手的改动、导入 .ics、AI 添加、拍照导入、Goals 排进课表的时段，写入之后屏幕上都会弹出一条带「撤销」的提示，点一下就能恢复（页面会刷新）。看到提示时就点，别等它消失。',
      'After AI assistant changes, an .ics import, an AI add, a photo import, or goal sessions added to your timetable, a notice with an “Undo” button appears. Tap it to restore everything (the page reloads). Tap it while the notice is showing.',
      'Selepas perubahan pembantu AI, import .ics, tambahan AI, import foto, atau sesi matlamat ditambah ke jadual, satu notis dengan butang “Buat asal” muncul. Ketik untuk memulihkan semuanya (halaman dimuat semula). Ketik semasa notis masih dipaparkan.'],'general'],
    [['能离线使用吗？','Does it work offline?','Boleh guna tanpa internet?'],
     ['可以。网页版可以像 App 一样安装到手机，没网也能打开。AI 功能和云同步需要联网。',
      'Yes. The web version can be installed like an app and opens without internet. AI features and cloud sync need a connection.',
      'Boleh. Versi web boleh dipasang seperti app dan dibuka tanpa internet. Ciri AI dan segerak awan memerlukan sambungan.'],'general'],
    [['怎么把 Mochi 安装成 App？','How do I install Mochi as an app?','Bagaimana memasang Mochi sebagai app?'],
     ['Android 手机和电脑上的 Chrome：浏览器支持时，菜单里会出现「安装成 App」，点一下就能装。iPhone 没有一键安装：用 Safari 打开，点分享按钮，选「添加到主屏幕」。装好后像 App 一样打开，离线也能用。',
      'Android phones and desktop Chrome: when the browser supports it, an “Install as an app” entry appears in the menu; tap it to install. iPhone has no one-tap install: open Mochi in Safari, tap the Share button, then choose “Add to Home Screen”. Once installed it opens like an app and works offline.',
      'Telefon Android dan Chrome komputer: apabila pelayar menyokongnya, entri “Pasang sebagai app” muncul dalam menu; ketik untuk memasang. iPhone tiada pemasangan satu ketik: buka Mochi dalam Safari, ketik butang Kongsi, kemudian pilih “Tambah ke Skrin Utama”. Selepas dipasang ia dibuka seperti app dan boleh digunakan tanpa internet.'],'general'],
    [['我的隐私有保障吗？','What happens to my privacy?','Bagaimana dengan privasi saya?'],
     ['不登录时，数据只在你的设备上。使用 AI 功能时，你输入的文字或课表照片会发到服务器，再转给 AI 服务解析；「整周重排」和「问问 Mochi」还会把你的日程摘要（包括运动 / 美容 / 饮食栏的简要记录）一起发出去，好让它给出合适的建议。AI 只返回建议，不会直接改你的数据。登录后，数据会同步到你的云端账号。若想让图片不离开设备，拍照识别可以改用本机 OCR。',
      'Without signing in, your data stays on your device. When you use AI features, the text or timetable photo you give is sent to a server and passed on to an AI service for parsing; “Re-plan week” and “Ask Mochi” also send a summary of your schedule (including brief Sport / Beauty / Diet records) so the suggestions fit. AI only returns suggestions and never edits your data directly. After you sign in, your data syncs to your cloud account. If you want a photo to stay on your device, switch photo import to on-device OCR.',
      'Tanpa log masuk, data kekal pada peranti anda. Apabila guna ciri AI, teks atau foto jadual yang anda beri dihantar ke pelayan dan diteruskan kepada perkhidmatan AI untuk dihuraikan; “Susun semula minggu” dan “Tanya Mochi” juga menghantar ringkasan jadual anda (termasuk rekod ringkas Sukan / Kecantikan / Diet) supaya cadangan sesuai. AI hanya memulangkan cadangan dan tidak mengubah data anda secara langsung. Selepas log masuk, data disegerakkan ke akaun awan anda. Jika mahu foto kekal pada peranti, tukar import foto kepada OCR pada peranti.'],'general'],
    [['谁做了 Mochi？怎么给反馈？','Who made Mochi? How do I send feedback?','Siapa yang buat Mochi? Bagaimana beri maklum balas?'],
     ['Mochi 由 @stz_0506 制作，Instagram：instagram.com/stz_0506，也可以点菜单底部版本号下面的链接直接打开。想说说你的感受，可以用菜单里的「给 Mochi 评分」打分（一台设备一票，之后可以更新）。',
      'Mochi is made by @stz_0506 on Instagram (instagram.com/stz_0506); you can also tap the link under the version number at the bottom of the menu. To share how you feel about it, use “Rate Mochi” in the menu (one vote per device, and you can update it later).',
      'Mochi dibuat oleh @stz_0506 di Instagram (instagram.com/stz_0506); anda juga boleh ketik pautan di bawah nombor versi di bahagian bawah menu. Untuk berkongsi pendapat, guna “Nilai Mochi” dalam menu (satu undi setiap peranti, dan boleh dikemas kini kemudian).'],'general'],

    // ───────── 课表 ─────────
    [['怎么把课表放进来？','How do I get my timetable into Mochi?','Bagaimana memasukkan jadual ke Mochi?'],
     ['三种办法：① 拍照导入：拍一张课表，AI 识别后先给你确认，确认了才写入；② 手动添加：在「{tt}」里添加课程，节次、教室、老师都可以填；③ 朋友分享的链接 / 二维码，或导入 .ics 日历文件（在「{data}」里）。',
      'Three ways: (1) Photo import: snap your timetable, AI reads it and shows a preview, and nothing is saved until you confirm. (2) Add manually under “{tt}” with periods, rooms and teachers. (3) Open a link or QR code a friend shared, or import an .ics calendar file (under “{data}”).',
      'Tiga cara: (1) Import foto: ambil gambar jadual, AI membacanya dan menunjukkan pratonton; tiada apa disimpan sehingga anda sahkan. (2) Tambah secara manual di “{tt}” dengan waktu, bilik dan guru. (3) Buka pautan/kod QR yang dikongsi rakan, atau import fail kalendar .ics (di “{data}”).'],'timetable'],
    [['固定课程和活动有什么区别？','What is the difference between lessons and events?','Apakah beza antara pelajaran tetap dan acara?'],
     ['固定课程：每周按课表重复的课，有节次、教室、老师，可设 1–4 周轮换。活动：补习、约会、训练这类安排，可以只发生一次，也可以每周 / 每月重复。两者都会显示在日视图和周视图里，重叠的会并排显示。',
      'Fixed lessons repeat every week from your timetable, with periods, rooms and teachers, and can rotate over 1–4 weeks. Events are things like tuition, meetups or training: they can happen once or repeat weekly or monthly. Both show in the day and week views, and overlapping items are shown side by side.',
      'Pelajaran tetap berulang setiap minggu daripada jadual anda, dengan waktu, bilik dan guru, dan boleh berputar 1–4 minggu. Acara ialah perkara seperti tuisyen, pertemuan atau latihan: ia boleh berlaku sekali atau berulang setiap minggu atau bulan. Kedua-duanya dipaparkan dalam paparan hari dan minggu, dan item bertindih dipaparkan bersebelahan.'],'timetable'],
    [['上课的节次和时间怎么改？','How do I change class periods and times?','Bagaimana menukar waktu dan masa kelas?'],
     ['在「{tt}」里：可以按你填的数字一键生成节次，也可以一节一节地加。想整个重来，点「重新运行向导」。',
      'Under “{tt}”: generate the periods in one tap from the numbers you enter, or add them one by one. To start over completely, tap “Re-run setup wizard”.',
      'Di “{tt}”: jana waktu kelas sekali gus daripada nombor yang anda masukkan, atau tambah satu persatu. Untuk bermula semula sepenuhnya, ketik “Jalankan semula wizard”.'],'timetable'],
    [['可以有多份课表吗？','Can I have more than one timetable?','Bolehkah saya ada lebih daripada satu jadual?'],
     ['可以。在「{tt}」里点「新建课表」。每个课表有各自的活动和作业；分享课表时分享的是当前正在用的这一份。',
      'Yes. Tap “New timetable” under “{tt}”. Each timetable has its own events and homework, and sharing sends the one you are currently using.',
      'Boleh. Ketik “Jadual baru” di “{tt}”. Setiap jadual ada acara dan kerja rumah sendiri, dan perkongsian menghantar jadual yang sedang anda guna.'],'timetable'],
    [['单双周 / 多周轮换怎么设？','How do I set up alternating (A/B) weeks?','Bagaimana menetapkan minggu berselang-seli (A/B)?'],
     ['在「{tt}」里可以设置 1–4 周轮换（单双周就是 2 周）。轮换只影响固定课程；重复活动按各自的起始日期计算，不会因为切换轮换周数而错位。',
      'Under “{tt}” you can set a 1–4 week rotation (alternating weeks = 2). Rotation only affects fixed lessons; recurring events follow their own start dates and will not shift when you change the rotation.',
      'Di “{tt}” anda boleh tetapkan putaran 1–4 minggu (minggu berselang-seli = 2). Putaran hanya menjejaskan pelajaran tetap; acara berulang mengikut tarikh mula sendiri dan tidak beralih apabila putaran ditukar.'],'timetable'],
    [['放假时怎么让安排自动跳过？','How do I make events skip my holidays?','Bagaimana membuat acara melangkau cuti?'],
     ['在「{hol}」里设置假期日期。假期内的重复活动和固定课程会自动跳过；导出 .ics 时，假期里的安排也会自动排除。',
      'Set your holiday dates under “{hol}”. Recurring events and fixed lessons are skipped automatically during them, and they are also left out when you export an .ics file.',
      'Tetapkan tarikh cuti di “{hol}”. Acara berulang dan pelajaran tetap dilangkau secara automatik sepanjang cuti, dan ia juga dikecualikan semasa eksport fail .ics.'],'timetable'],
    [['怎么把课表分享给朋友？','How do I share my timetable with a friend?','Bagaimana berkongsi jadual dengan rakan?'],
     ['在「{data}」里点分享课表，会生成链接和二维码（里面是当前课表的固定课程）；朋友打开后可以导入成一份新课表。也可以导出 .ics 给 Google / Apple 日历。如果想推荐 Mochi 本身，用菜单里的「分享给朋友」。',
      'Under “{data}”, tap the share-timetable button to create a link and QR code (it contains the fixed lessons of the current timetable); your friend opens it and imports it as a new timetable. You can also export .ics for Google / Apple Calendar. To recommend Mochi itself, use “Share with friends” in the menu.',
      'Di “{data}”, ketik butang kongsi jadual untuk menjana pautan dan kod QR (mengandungi pelajaran tetap jadual semasa); rakan membukanya dan mengimportnya sebagai jadual baru. Anda juga boleh eksport .ics untuk Google / Apple Calendar. Untuk mengesyorkan Mochi sendiri, guna “Kongsi dengan rakan” dalam menu.'],'timetable'],

    // ───────── AI 助手 ─────────
    [['AI 助手能做什么？','What can the AI assistant do?','Apakah yang boleh dibuat pembantu AI?'],
     ['在「AI 助手」里有三个标签：① 一句话：说一句话就能添加活动或作业，例如“下周三下午三点半数学补习，每周重复”；② 拍照课表：拍一张课表，AI 识别后先给你核对；③ 整周重排：把这周的特别安排写进去，AI 会放进对应时间、把冲突的旧安排挪到空档。AI 只给方案，你确认后才会写入，写入后也可以撤销。',
      'The AI assistant has three tabs: (1) Quick add: say one sentence to add an event or homework, e.g. “Maths tuition next Wednesday 3:30 pm, repeat weekly”; (2) Photo import: snap your timetable and review what AI read; (3) Re-plan week: write this week\u2019s special plans and AI fits them in and moves clashing items into free slots. AI only proposes changes; nothing is saved until you confirm, and you can undo afterwards.',
      'Pembantu AI ada tiga tab: (1) Tambah pantas: taip satu ayat untuk menambah acara atau kerja rumah, cth “Tuisyen Matematik Rabu depan 3:30 petang, ulang setiap minggu”; (2) Import foto: ambil gambar jadual dan semak apa yang AI baca; (3) Susun semula minggu: tulis rancangan istimewa minggu ini dan AI akan menyusunnya serta mengalihkan yang bertindih ke slot kosong. AI hanya mencadangkan; tiada apa disimpan sehingga anda sahkan, dan anda boleh buat asal selepas itu.'],'ai'],
    [['「问问 Mochi」和「AI 助手」有什么不一样？','How is “Ask Mochi” different from the AI assistant?','Apakah beza “Tanya Mochi” dengan pembantu AI?'],
     ['「问问 Mochi」是聊天式的：问它“明天哪段时间有空”“哪些作业快到期”，也可以让它帮你挪日程、改安排。入口在菜单里，或者顶栏的小兔脸按钮。它的改动一样先预览，确认后才写入，写入后可以撤销。「AI 助手」更适合一次性的添加、拍照导入和整周重排。',
      '“Ask Mochi” is chat-style: ask “when am I free tomorrow?” or “what is due soon?”, or have it move things around. Open it from the menu or the little bunny button in the top bar. Its changes are previewed first, saved only after you confirm, and can be undone. The “AI assistant” is better for one-off adds, photo import and re-planning the week.',
      '“Tanya Mochi” berbentuk sembang: tanya “bila saya lapang esok?” atau “apa yang hampir tamat tempoh?”, atau minta ia mengalihkan jadual. Buka dari menu atau butang arnab kecil di bar atas. Perubahannya dipratonton dahulu, disimpan hanya selepas anda sahkan, dan boleh dibuat asal. “Pembantu AI” lebih sesuai untuk tambahan sekali, import foto dan susun semula minggu.'],'ai'],
    [['AI 说用不了 / 额度用完了？','AI says it can\u2019t be used / the quota is used up?','AI kata tidak boleh digunakan / kuota habis?'],
     ['作者提供的免费额度有限，用完当天就不能用了。可以在「{cloud}」里填你自己的 Gemini key（aistudio.google.com/apikey 免费申请），这样不占作者额度，也不用登录。拍照识别默认走云端，需要联网；也可以在「拍照」里改用本机 OCR（免费，图片不上传，第一次要联网下载识别引擎）。AI 只给方案，你确认后才会写入。',
      'The free quota provided by the author is limited and runs out for the day. Paste your own Gemini API key under “{cloud}” (free at aistudio.google.com/apikey); it will not use the author\u2019s quota and needs no sign-in. Photo import uses the cloud by default (needs internet); you can also switch to on-device OCR in the Photo tab (free, the photo is not uploaded; the engine downloads once). AI only proposes changes; nothing is saved until you confirm.',
      'Kuota percuma yang disediakan pembangun terhad dan akan habis untuk hari itu. Tampal kunci API Gemini anda sendiri di “{cloud}” (percuma di aistudio.google.com/apikey); ia tidak menggunakan kuota pembangun dan tidak perlu log masuk. Import foto guna awan secara lalai (perlu internet); anda juga boleh tukar kepada OCR pada peranti dalam tab Foto (percuma, foto tidak dimuat naik; enjin dimuat turun sekali). AI hanya mencadangkan; tiada apa disimpan sehingga anda sahkan.'],'ai'],
    [['我填的 Gemini key 安全吗？','Is my own Gemini key safe?','Adakah kunci Gemini saya selamat?'],
     ['key 只保存在这台设备上，不会同步，也不会进备份或被分享出去。用它发请求时，key 会经过本站的后端转发给 Google，后端不会把它保存下来。想换掉或删除，在「{cloud}」的「AI 来源」里清空即可。',
      'The key is stored only on this device: it is not synced, not included in backups and not shared. When it is used, the request passes through this site\u2019s backend to Google, and the backend does not store it. To replace or remove it, clear it in the “AI source” section under “{cloud}”.',
      'Kunci hanya disimpan pada peranti ini: ia tidak disegerak, tidak termasuk dalam sandaran dan tidak dikongsi. Apabila digunakan, permintaan melalui bahagian belakang tapak ini ke Google, dan bahagian belakang tidak menyimpannya. Untuk menukar atau membuangnya, kosongkan di bahagian “Sumber AI” dalam “{cloud}”.'],'ai'],
    [['拍照识别不准怎么办？本机 OCR 是什么？','The photo import is not accurate. What is on-device OCR?','Import foto tidak tepat. Apa itu OCR pada peranti?'],
     ['在「拍照」里可以选识别方式（云端 AI 或本机 OCR），本机 OCR 还要选图片里文字的语言（中文、马来文、英文）。本机 OCR 免费，图片不上传，第一次要联网下载识别引擎。准确度取决于照片：尽量拍正、光线均匀、字迹清楚、少拍到阴影。识别出来的每一项都会让你逐项核对，改好再确认，写入后还可以撤销。',
      'In the Photo tab you can choose the recognition method (cloud AI or on-device OCR), and for on-device OCR you also pick the language of the text in the picture (Chinese, Malay, English). On-device OCR is free and the photo is never uploaded, but the engine downloads once. Accuracy depends on the photo: shoot straight on, with even light, clear text and few shadows. Every recognised item is shown for you to check one by one, fix and then confirm, and you can undo afterwards.',
      'Dalam tab Foto anda boleh pilih kaedah pengecaman (AI awan atau OCR pada peranti), dan untuk OCR pada peranti anda juga pilih bahasa teks dalam gambar (Cina, Melayu, Inggeris). OCR pada peranti percuma dan foto tidak dimuat naik, tetapi enjin dimuat turun sekali. Ketepatan bergantung pada foto: ambil dari depan, cahaya sekata, tulisan jelas dan sedikit bayang. Setiap item yang dikenali ditunjukkan untuk disemak satu persatu, dibetulkan kemudian disahkan, dan anda boleh buat asal selepas itu.'],'ai'],
    [['可以用语音输入吗？','Can I use voice input?','Bolehkah saya guna input suara?'],
     ['可以。在「AI 助手」的一句话输入框旁边点 🎤。手机 App 会弹出系统的语音识别窗口，网页版用浏览器自带的语音识别；如果两者都不支持，按钮就不会显示。说话的语言可以和界面语言不同（比如界面用英文、嘴上说中文），点 🎤 旁边的小按钮切换，会记在这台设备上。',
      'Yes. Tap 🎤 next to the quick-add box in the AI assistant. The phone app opens the system speech-recognition window and the web version uses the browser\u2019s built-in recognition; if neither is supported the button is hidden. The spoken language can differ from the interface language (for example an English interface with Chinese speech): use the small button beside 🎤 to switch, and it is remembered on this device.',
      'Boleh. Ketik 🎤 di sebelah kotak tambah pantas dalam pembantu AI. App telefon membuka tetingkap pengecaman suara sistem dan versi web menggunakan pengecaman terbina dalam pelayar; jika kedua-duanya tidak disokong, butang disembunyikan. Bahasa pertuturan boleh berbeza daripada bahasa antara muka (contohnya antara muka Inggeris dengan pertuturan Cina): guna butang kecil di sebelah 🎤 untuk menukar, dan ia diingat pada peranti ini.'],'ai'],
    [['「本机 AI」是什么？要开吗？','What is “on-device AI”? Should I turn it on?','Apakah “AI pada peranti”? Perlukah saya hidupkan?'],
     ['默认不用管：AI 由云端提供，直接可用。本机 AI 是备用或可选的高级功能：Chrome 内置的 Gemini Nano、WebLLM 小模型（首次要下载约 1GB，建议用 Wi-Fi），电脑上还可以用 Ollama。好处是免额度、数据不出设备；缺点是模型小，复杂的整周重排可能排不好。想用的话，在「{cloud}」的「AI 来源」里选「智能」（简单任务用本机）或「全部优先本机」，拍照识别仍然要云端或本机 OCR。',
      'You can ignore it by default: the cloud provides AI and it just works. On-device AI is an optional, advanced extra: Chrome\u2019s built-in Gemini Nano, a small WebLLM model (about 1 GB on the first download, so use Wi-Fi), and on a computer also Ollama. The upside is no quota and your data stays on the device; the downside is that the models are small and a complex week re-plan may come out badly. To use it, choose “Smart” (simple tasks on device) or “Prefer on-device” in the “AI source” section under “{cloud}”. Photo import still needs the cloud or on-device OCR.',
      'Anda boleh abaikannya secara lalai: AI disediakan awan dan terus boleh digunakan. AI pada peranti ialah tambahan lanjutan yang pilihan: Gemini Nano terbina dalam Chrome, model kecil WebLLM (kira-kira 1 GB pada muat turun pertama, jadi guna Wi-Fi), dan pada komputer juga Ollama. Kelebihannya tiada kuota dan data kekal pada peranti; kelemahannya model kecil dan susun semula minggu yang rumit mungkin tidak baik. Untuk menggunakannya, pilih “Pintar” (tugas mudah pada peranti) atau “Utamakan peranti” di bahagian “Sumber AI” dalam “{cloud}”. Import foto masih memerlukan awan atau OCR pada peranti.'],'ai'],

    // ───────── 学习与目标 ─────────
    [['作业怎么管理？','How do I manage homework?','Bagaimana mengurus kerja rumah?'],
     ['在「作业」页点「＋ 新作业」。作业按截止日期分组，可以加科目标签、链接和附件，也能搜索。截止当天会提醒一次，提醒的时间和要不要在前一晚再提醒，在「{notif}」里设置。',
      'On the Homework page tap “+ New homework”. Items are grouped by due date, and you can add a subject, links and attachments, and search them. You get one reminder on the due day; set the time, and whether to be reminded the evening before too, under “{notif}”.',
      'Pada halaman Kerja rumah, ketik “+ Kerja rumah baru”. Item dikumpul ikut tarikh akhir, dan anda boleh tambah subjek, pautan dan lampiran, serta mencarinya. Anda diingatkan sekali pada hari akhir; tetapkan masa, dan sama ada mahu diingatkan petang sebelumnya juga, di “{notif}”.'],'study'],
    [['学习工作台是什么？','What is the Study Space?','Apakah Ruang Belajar?'],
     ['点底部的「学习」标签，顶部有三个子标签：🏠 工作台、📝 作业、📚 复习计划。工作台把学习的事放在一页：待复习、作业到期、今天还没完成的学习时段三个数字，还有即将到来的安排、本周学习进度、最近的考试倒计时和科目卡片。完全没有数据时，会显示带下一步按钮的空状态。显示选项在设置的「学习空间」里。',
      'Tap the “Study” tab at the bottom; three sub-tabs sit at the top: 🏠 Workspace, 📝 Homework and 📚 Revision plan. The workspace puts your study life on one page: three numbers (to review, homework due, study sessions not done today), plus what is coming up, this week\u2019s study progress, the nearest exam countdown and subject cards. With no data at all it shows an empty state with a next-step button. Display options are under “Study space” in settings.',
      'Ketik tab “Belajar” di bawah; tiga sub-tab ada di atas: 🏠 Ruang kerja, 📝 Kerja rumah dan 📚 Pelan ulang kaji. Ruang kerja meletakkan hal belajar anda pada satu halaman: tiga nombor (untuk diulang kaji, kerja rumah tamat tempoh, sesi belajar hari ini yang belum selesai), serta apa yang akan datang, kemajuan belajar minggu ini, kira detik peperiksaan terdekat dan kad subjek. Jika tiada data langsung, ia memaparkan keadaan kosong dengan butang langkah seterusnya. Pilihan paparan ada di “Ruang belajar” dalam tetapan.'],'study'],
    [['复习是怎么安排的？','How is revision scheduled?','Bagaimana ulang kaji dijadualkan?'],
     ['在「复习计划」里给每个章节评分：忘了 / 模糊 / 记得。Mochi 用间隔重复算法（FSRS）安排下次复习：记得越牢，出现越少；忘了的会更快回来。到期的章节和还没学过的章节会进复习队列。',
      'In “Revision plan” you rate each topic: forgot / fuzzy / got it. Mochi uses a spaced-repetition algorithm (FSRS) to schedule the next review: the better you remember, the less often it appears, and topics you forgot come back sooner. Topics that are due and topics you have not studied yet go into the review queue.',
      'Dalam “Pelan ulang kaji” anda menilai setiap topik: lupa / samar / ingat. Mochi menggunakan algoritma ulangan berjarak (FSRS) untuk menjadualkan ulang kaji seterusnya: semakin kukuh ingatan, semakin jarang muncul, dan topik yang dilupakan kembali lebih cepat. Topik yang sudah tiba masanya dan topik yang belum dipelajari masuk ke dalam giliran ulang kaji.'],'study'],
    [['Focus Revision（专注复习）怎么用？','How does Focus Revision work?','Bagaimana Focus Revision berfungsi?'],
     ['在学习工作台里进入「Focus Revision」，选好科目后一次只看一个章节，顶部有进度条和随时可点的退出，下面三个按钮：忘了 / 模糊 / 记得。每一轮最多 20 个章节，没到期的章节不会被提前评分。每次评分立刻保存，中途退出也不会丢；做完会给你一个小总结，如果还有剩下的章节，可以再来一轮。',
      'Open “Focus Revision” in the Study workspace, pick your subjects and it shows one topic at a time, with a progress bar, an Exit you can always tap, and three buttons: forgot / fuzzy / got it. A round holds at most 20 topics, and topics that are not due yet are never rated early. Every rating is saved immediately, so quitting midway loses nothing; at the end you get a short summary, and if topics are left over you can start another round.',
      'Buka “Focus Revision” dalam ruang kerja Belajar, pilih subjek dan ia menunjukkan satu topik pada satu masa, dengan bar kemajuan, butang Keluar yang sentiasa boleh diketik, dan tiga butang: lupa / samar / ingat. Satu pusingan memuatkan paling banyak 20 topik, dan topik yang belum tiba masanya tidak dinilai awal. Setiap penilaian disimpan serta-merta, jadi keluar di tengah jalan tidak menghilangkan apa-apa; di akhir anda mendapat ringkasan pendek, dan jika ada topik tertinggal anda boleh mula pusingan lain.'],'study'],
    [['Goals（目标）是什么？怎么把目标变成时间？','What are Goals and how do they turn into time?','Apakah Matlamat dan bagaimana ia menjadi masa?'],
     ['「Goals」在菜单的「AI 与工具」里。把一个大目标拆成步骤，给每一步估个时间，还可以设截止日、每日上限、单次时长和休息；也可以一键「添加我的科目」，用你已有的科目和考试日生成步骤。点「寻找空档」，Mochi 只会在你现有日程的空档里排，不会动已有的课和活动。先给你预览，逐个勾选后才写入，写入后可以撤销。时间不够排时，会如实告诉你缺多少分钟，并给出调整建议。进度只来自你手动勾选完成的步骤。登录云同步后，目标本身也会跟着同步。',
      '“Goals” is under “AI & tools” in the menu. Break a big goal into steps, estimate the time for each, and optionally set deadlines, a daily limit, session length and breaks; “Add my subjects” can also build steps from the subjects and exam dates you already have. Tap “Find time slots” and Mochi only places sessions in free gaps of your existing schedule, never moving your lessons or events. You see a preview, tick the sessions you want, and only then are they added; you can undo afterwards. If there is not enough time it tells you honestly how many minutes are short and suggests adjustments. Progress only comes from steps you tick as done. When you are signed in to cloud sync, the goals themselves sync too.',
      '“Matlamat” ada di bawah “AI & alat” dalam menu. Pecahkan matlamat besar kepada langkah, anggar masa setiap langkah, dan boleh tetapkan tarikh akhir, had harian, tempoh sesi dan rehat; “Tambah subjek saya” juga boleh membina langkah daripada subjek dan tarikh peperiksaan yang sedia ada. Ketik “Cari slot masa” dan Mochi hanya meletakkan sesi dalam ruang kosong jadual sedia ada, tanpa mengalihkan kelas atau acara anda. Anda melihat pratonton, menandakan sesi yang mahu, dan barulah ia ditambah; anda boleh buat asal selepas itu. Jika masa tidak cukup, ia memberitahu dengan jujur berapa minit kurang dan mencadangkan pelarasan. Kemajuan hanya datang daripada langkah yang anda tandakan selesai. Apabila anda log masuk segerak awan, matlamat itu sendiri turut disegerakkan.'],'study'],

    // ───────── 数据与同步 ─────────
    [['我的数据存在哪里？换手机会丢吗？','Where is my data stored? Will I lose it if I change phones?','Di mana data saya disimpan? Adakah hilang jika tukar telefon?'],
     ['默认只存在这台设备上。换手机前，先在「{cloud}」登录同步，或在「{data}」导出备份，到新手机再导入。普通备份不含作业 / 课程附件，要带附件请选「导出（含附件）」。卸载 App 或清除浏览器数据会删掉本机数据，所以换机前请先备份。',
      'By default it lives only on this device. Before switching phones, sign in under “{cloud}” to sync, or export a backup under “{data}” and import it on the new phone. A normal backup does not include homework or lesson attachments; use the export option that includes attachments to bring them along. Uninstalling the app or clearing browser data deletes the local data, so back up first.',
      'Secara lalai data hanya disimpan pada peranti ini. Sebelum tukar telefon, log masuk di “{cloud}” untuk segerak, atau eksport sandaran di “{data}” dan import pada telefon baru. Sandaran biasa tidak termasuk lampiran kerja rumah/pelajaran; pilih eksport yang termasuk lampiran untuk membawanya. Menyahpasang app atau mengosongkan data pelayar akan memadam data setempat, jadi buat sandaran dahulu.'],'data'],
    [['怎么导出和导入备份？','How do I export and import a backup?','Bagaimana mengeksport dan mengimport sandaran?'],
     ['在「{data}」的「备份」里：「导出备份」只含文字数据；「导出（含附件）」把作业和课程附件也一起带上，文件会比较大；「导入备份」把备份文件恢复回来。建议换手机、清理浏览器数据或大改课表之前先导出一份。',
      'Under “Backup” in “{data}”: “Export backup” holds the text data only; “Export (with attachments)” also brings homework and lesson attachments and makes a bigger file; “Import backup” restores a backup file. Export one before changing phones, clearing browser data or making big changes to your timetable.',
      'Di bawah “Sandaran” dalam “{data}”: “Eksport sandaran” hanya mengandungi data teks; “Eksport (dengan lampiran)” turut membawa lampiran kerja rumah dan pelajaran dan menghasilkan fail lebih besar; “Import sandaran” memulihkan fail sandaran. Eksport satu sebelum tukar telefon, kosongkan data pelayar atau buat perubahan besar pada jadual.'],'data'],
    [['一定要登录吗？','Do I have to sign in?','Adakah saya mesti log masuk?'],
     ['不用。不登录也能使用全部本地功能，数据只存在这台设备。登录（在「{cloud}」）后才会在你的多台设备间同步，出现冲突时由你选择保留哪一边。',
      'No. Without signing in you still get every local feature, and your data stays on this device. Signing in (under “{cloud}”) syncs it across your devices, and on a conflict you choose which side to keep.',
      'Tidak. Tanpa log masuk anda masih boleh guna semua ciri setempat dan data kekal pada peranti ini. Log masuk (di “{cloud}”) akan menyegerakkan data merentas peranti, dan jika berlaku konflik anda pilih versi mana untuk disimpan.'],'data'],
    [['两台设备同步冲突了怎么办？','Two of my devices conflict. What now?','Dua peranti saya berkonflik. Apa patut buat?'],
     ['如果两台设备都改了同一份数据，会弹出提示让你选「用云端」还是「保留本机」。同一周的日程是整块比较的（以最后修改的那份为准），所以选之前先看清楚提示点名的是哪一周，选错的一边的改动会被取代。目标（Goals）是每个目标单独比较，版本更新的那份会自动保留，不会弹窗。想稳妥一点，选之前先导出一份备份。',
      'If two devices changed the same data, a prompt asks you to choose “Use cloud” or “Keep this device”. A week\u2019s schedule is compared as a whole block (the most recently changed copy wins), so check which week the prompt names before choosing; the changes on the side you do not pick are replaced. Goals are compared one goal at a time and the newer version is kept automatically, with no prompt. To be safe, export a backup before you choose.',
      'Jika dua peranti mengubah data yang sama, satu gesaan meminta anda pilih “Guna awan” atau “Kekalkan peranti ini”. Jadual satu minggu dibandingkan sebagai satu blok (salinan yang terakhir diubah menang), jadi semak minggu mana yang disebut dalam gesaan sebelum memilih; perubahan pada pihak yang tidak dipilih akan diganti. Matlamat dibandingkan satu matlamat pada satu masa dan versi yang lebih baru dikekalkan secara automatik, tanpa gesaan. Untuk lebih selamat, eksport sandaran sebelum memilih.'],'data'],
    [['怎么导入日历（.ics）和手机系统日历？','How do I import calendars (.ics) and the phone calendar?','Bagaimana mengimport kalendar (.ics) dan kalendar telefon?'],
     ['.ics 文件（Google / Apple 日历导出的）在「{data}」里导入，导入后可以撤销；Mochi 也能导出 .ics。手机 App 里还有「手机日历」：可以把未来 4 周的课程和活动写进系统日历（再次写入前会先清掉上次写的，不会重复），也可以把系统日历里的事件导入成 Mochi 活动。这一块只有手机 App 有，网页版不显示。',
      'Import .ics files (exported from Google / Apple Calendar) under “{data}”; the import can be undone, and Mochi can export .ics too. The phone app also has “Phone calendar”: it can write the next 4 weeks of lessons and events into the system calendar (it clears what it wrote last time first, so nothing is duplicated), and import system-calendar events as Mochi events. This part exists only in the phone app and is hidden on the web.',
      'Import fail .ics (dieksport daripada Google / Apple Calendar) di “{data}”; import boleh dibuat asal, dan Mochi juga boleh eksport .ics. App telefon juga ada “Kalendar telefon”: ia boleh menulis pelajaran dan acara 4 minggu akan datang ke kalendar sistem (ia memadam apa yang ditulis kali lepas dahulu, jadi tiada pendua), dan mengimport acara kalendar sistem sebagai acara Mochi. Bahagian ini hanya ada dalam app telefon dan disembunyikan pada web.'],'data'],

    // ───────── 提醒 ─────────
    [['提醒不响怎么办？','My reminders don\u2019t ring. What should I do?','Peringatan tidak berbunyi. Apa patut saya buat?'],
     ['手机 App：① 在「{notif}」里开启提醒并允许通知；② 允许“闹钟和提醒”（精确闹钟）权限；③ 在系统设置里，把 Mochi 从省电 / 电池优化限制中排除。开启后会提前排好未来 7 天的提醒，App 关掉也会响。网页版需要浏览器允许通知，可靠性不如手机 App。',
      'Phone app: (1) turn reminders on and allow notifications under “{notif}”; (2) allow the “Alarms & reminders” (exact alarm) permission; (3) in system settings, exclude Mochi from battery optimization. Once on, the next 7 days of reminders are scheduled ahead and ring even when the app is closed. The web version needs browser notification permission and is less reliable than the phone app.',
      'App telefon: (1) hidupkan peringatan dan benarkan pemberitahuan di “{notif}”; (2) benarkan kebenaran “Penggera & peringatan” (penggera tepat); (3) dalam tetapan sistem, kecualikan Mochi daripada pengoptimuman bateri. Selepas diaktifkan, peringatan 7 hari akan datang dijadualkan lebih awal dan berbunyi walaupun app ditutup. Versi web memerlukan kebenaran pemberitahuan pelayar dan kurang dipercayai berbanding app telefon.'],'notify'],
    [['能设置提前多久提醒吗？作业什么时候提醒？','Can I choose how early I am reminded? When are homework reminders sent?','Bolehkah saya pilih berapa awal diingatkan? Bila peringatan kerja rumah dihantar?'],
     ['可以，都在「{notif}」里。课前 / 活动前提醒可以选：不提醒、5、10、15、30 分钟或 1 小时前（默认 10 分钟）。作业在截止当天提醒一次，几点提醒由你定（默认早上 8:00），也可以再打开「截止前一晚 20:00 也提醒」。提示方式（声音 / 震动）也能选。',
      'Yes, all under “{notif}”. For before-class and before-event reminders you can choose none, 5, 10, 15, 30 minutes or 1 hour before (default 10 minutes). Homework is reminded once on the due day at a time you choose (default 8:00 am), and you can also turn on the extra reminder at 8:00 pm the evening before. The way you are alerted (sound / vibration) is selectable too.',
      'Boleh, semuanya di “{notif}”. Untuk peringatan sebelum kelas / acara anda boleh pilih tiada, 5, 10, 15, 30 minit atau 1 jam sebelum (lalai 10 minit). Kerja rumah diingatkan sekali pada hari akhir pada masa pilihan anda (lalai 8:00 pagi), dan anda juga boleh hidupkan peringatan tambahan pada 8:00 malam sebelumnya. Cara anda dimaklumkan (bunyi / getaran) juga boleh dipilih.'],'notify'],
    [['怎么添加桌面小组件？','How do I add the home-screen widget?','Bagaimana menambah widget skrin utama?'],
     ['只有 Android App 有小组件：长按手机桌面 → 小组件 → Mochi，拖出来就会显示下一节课。',
      'Only the Android app has a widget: long-press your home screen, choose Widgets, then Mochi, and drag it out. It shows your next class.',
      'Hanya app Android ada widget: tekan lama skrin utama, pilih Widget, kemudian Mochi, dan seret keluar. Ia memaparkan kelas seterusnya.'],'notify'],

    // ───────── 个性化 ─────────
    [['怎么换语言和主题色？','How do I change the language and theme color?','Bagaimana menukar bahasa dan warna tema?'],
     ['语言：≡ 菜单里的「Language · 语言」，支持 English / 中文 / Bahasa Melayu。主题色、深色模式、视图密度：「{look}」。',
      'Language: use “Language · 语言” in the ≡ menu (English / 中文 / Bahasa Melayu). Theme color, dark mode and density: “{look}”.',
      'Bahasa: guna “Language · 语言” dalam menu ≡ (English / 中文 / Bahasa Melayu). Warna tema, mod gelap dan ketumpatan paparan: “{look}”.'],'personalize'],
    [['怎么换壁纸？','How do I change the wallpaper?','Bagaimana menukar kertas dinding?'],
     ['在菜单的「个人配置」里选壁纸。有几款跟着主题色走的内置图案（不占流量），也可以用你自己的照片。开启后卡片会变成半透明磨砂，壁纸从卡片之间透出来。壁纸只保存在这台设备上，不会同步。',
      'Pick a wallpaper in the personal section of the menu. There are a few built-in patterns that follow your theme color (no data used), or you can use your own photo. When on, cards turn into translucent frosted glass and the wallpaper shows between them. The wallpaper is stored on this device only and is not synced.',
      'Pilih kertas dinding di bahagian peribadi dalam menu. Ada beberapa corak terbina dalam yang mengikut warna tema (tanpa guna data), atau anda boleh guna foto sendiri. Apabila dihidupkan, kad menjadi kaca beku lut sinar dan kertas dinding kelihatan di antara kad. Kertas dinding hanya disimpan pada peranti ini dan tidak disegerak.'],'personalize']
  ];
  function fill(s){return s.replace(/\{(\w+)\}/g,function(_,k){return P[k]?t(P[k]):''})}
  var m=null,list=null,none=null,srch=null,rows=[];
  function build(){
    m=el('div','mask');m.id='mask-faq';m.onclick=close;
    var d=el('div','dlg fq');d.onclick=function(e){e.stopPropagation()};d.setAttribute('role','dialog');d.setAttribute('aria-label',t(T.h));
    d.appendChild(el('h2',null,t(T.h)));
    srch=el('input');srch.type='search';srch.placeholder=t(T.ph);srch.setAttribute('aria-label',t(T.ph));srch.autocomplete='off';srch.oninput=filter;d.appendChild(srch);
    chipBox=el('div','fq-cats');chipBox.setAttribute('role','group');chipBox.setAttribute('aria-label',t(T.cats));
    C.forEach(function(c){var b=el('button','fq-cat');b.type='button';b.setAttribute('data-c',c[0]);b.appendChild(el('span','fq-ck','✓'));b.appendChild(document.createTextNode(cn(c)));
      b.onclick=function(){curCat=c[0];paintCats();filter();b.scrollIntoView&&b.scrollIntoView({inline:'center',block:'nearest'})};chipBox.appendChild(b)});
    d.appendChild(chipBox);paintCats();
    list=el('div','fq-l');
    Q.forEach(function(q,n){
      var qt=t(q[0]),at=fill(t(q[1])),row=el('div','fq-i'),b=el('button','fq-q'),a=el('div','fq-a',at),id='fqa'+n;
      b.type='button';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',id);a.id=id;a.hidden=true;
      b.appendChild(el('span',null,qt));b.appendChild(el('em','fq-ch','›'));
      b.onclick=function(){var open=a.hidden;a.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');row.classList.toggle('open',open)};
      row.appendChild(b);row.appendChild(a);list.appendChild(row);rows.push({row:row,cat:q[2],txt:(qt+' '+at).toLowerCase()})});
    d.appendChild(list);
    none=el('div','msg',t(T.none));none.hidden=true;d.appendChild(none);
    var vl=el('div','msg fq-v',t(T.ver)+' v'+(window.MOCHI_VERSION||'?'));
    if(window.mochiCreatorLink)vl.appendChild(window.mochiCreatorLink());
    d.appendChild(vl);
    var ac=el('div','acts'),x=el('button',null,t(T.close));x.type='button';x.onclick=close;ac.appendChild(x);d.appendChild(ac);
    m.appendChild(d);document.body.appendChild(m)}
  function paintCats(){[].forEach.call(chipBox.children,function(b){var on=b.getAttribute('data-c')===curCat;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')})}
  function filter(){
    var q=srch.value.trim().toLowerCase(),n=0;
    rows.forEach(function(r){var ok=(curCat==='all'||r.cat===curCat)&&(!q||r.txt.indexOf(q)>=0);r.row.hidden=!ok;if(ok)n++});
    none.hidden=n>0}
  function close(){if(m)m.classList.remove('show')}
  window.openFaq=function(){if(!m)build();srch.value='';curCat='all';paintCats();filter();m.classList.add('show')};
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  window.FAQ_MENU=[t(T.menu),t(T.menuSub)];
})();
