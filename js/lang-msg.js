// 翻译字典 2/2：代码里生成的提示、列表、日期等。L = 通用（也用于句子里的片段）；E = 只在整句完全相同时才翻；P = 带数字/星期的句式
(function(){var A=(window.I18N=window.I18N||[]),X=(window.I18N_X=window.I18N_X||[]),P=(window.I18N_P=window.I18N_P||[]);
function L(z,e,m){A.push([z,e,m])}function E(z,e,m){X.push([z,e,m])}
var CH='一二三四五六日',WD=[null,['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],['Isn','Sel','Rab','Kha','Jum','Sab','Aha']],
WL=[null,['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],['Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu','Ahad']],
MO=[null,['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis']],
OR=['','1st','2nd','3rd','4th','5th'];
function P2(re,en,ms){P.push([re,en,ms])}
// ---- 星期 / 日期 ----
for(var i=0;i<7;i++){L("周"+CH[i],WD[1][i],WD[2][i]);E(CH[i],WD[1][i],WD[2][i])}
E("@vday","Day","Hari");E("@vweek","Week","Minggu");
P2(/(\d+)月(\d+)日 · 星期([一二三四五六日])(（今天）)?/g,function(m,mo,d,c,t){return WL[1][CH.indexOf(c)]+', '+d+' '+MO[1][mo-1]+(t?' (today)':'')},function(m,mo,d,c,t){return WL[2][CH.indexOf(c)]+', '+d+' '+MO[2][mo-1]+(t?' (hari ini)':'')});
P2(/每月第 (\d) 个周([一二三四五六日])/g,function(m,n,c){return 'Monthly, '+OR[n]+' '+WD[1][CH.indexOf(c)]},function(m,n,c){return 'Bulanan, '+WD[2][CH.indexOf(c)]+' ke-'+n});
P2(/每月最后一个周([一二三四五六日])/g,function(m,c){return 'Monthly, last '+WD[1][CH.indexOf(c)]},function(m,c){return 'Bulanan, '+WD[2][CH.indexOf(c)]+' terakhir'});
P2(/ · 每(\d+) 周重复/g," · every $1 weeks"," · setiap $1 minggu");
P2(/ · 每周重复/g," · every week"," · setiap minggu");
P2(/ · 还剩 (.+?)(?= · |$)/g," · $1 left"," · $1 lagi");
P2(/ · (\d+) 天后/g," · in $1 days"," · $1 hari lagi");
P2(/(\d+) 个附件/g,function(m,n){return n+(n==="1"?" attachment":" attachments")},"$1 lampiran");
P2(/第(\d+)–(\d+)节/g,"Periods $1–$2","Waktu $1–$2");
P2(/第(\d+)节/g,"Period $1","Waktu $1");
P2(/这周是第 (\d+) 周/g,"This week is week $1","Minggu ini ialah minggu ke-$1");
P2(/第 ([\d、]+) 周/g,"Wk $1","Minggu $1");
P2(/(\d+) 周一循环（单双周等）/g,"$1-week rotation (odd/even weeks, etc.)","Kitaran $1 minggu (minggu ganjil/genap, dll.)");
P2(/(\d+) 周一循环/g,"$1-week rotation","Kitaran $1 minggu");
P2(/📅 (.+?)考试剩 (\d+) 天/g,"📅 $1 exam in $2 days","📅 Peperiksaan $1 dalam $2 hari");
P2(/ · 第(\d+)周/g," · Wk $1"," · Minggu $1");
P2(/从 (.+?) 开始/g,"From $1","Dari $1");
P2(/到 (.+?) 结束/g,"To $1","Hingga $1");
// ---- 单位 ----
L(" 分钟"," min"," min");L(" 小时"," h"," jam");L("小时","h","j");L("分","m","m");L("秒","s","s");L("后"," later"," lagi");
L(" 分钟后）"," min)"," min lagi)");L(" 开始（约 "," starts (in about "," bermula (lebih kurang ");L(" 开始 · "," starts · "," bermula · ");
// ---- 标点（句子拼接用）----
L("（"," ("," (");L("）",")",")");L("　","  ","  ");L("、",", ",", ");L("，",", ",", ");L("；","; ","; ");L("：",": ",": ");L("「","“","“");L("」","”","”");L("」→","” → ","” → ");
// ---- 日视图 / 课表 ----
L("早安 ☀️","Good morning ☀️","Selamat pagi ☀️");L("午安 🍱","Good noon 🍱","Selamat tengah hari 🍱");L("下午好 🌤️","Good afternoon 🌤️","Selamat petang 🌤️");L("晚上好 🌙","Good evening 🌙","Selamat malam 🌙");L("，小主人","","");
L("进行中","In progress","Sedang berlangsung");L("下一项","Up next","Seterusnya");
L("今天的安排都结束了 🎉","All done for today 🎉","Semua selesai untuk hari ini 🎉");
L("今天没有安排，好好休息 ☕","Nothing scheduled today — enjoy the rest ☕","Tiada jadual hari ini — berehatlah ☕");
L("（今天）"," (today)"," (hari ini)");L("这天没有安排 ☕","Nothing scheduled this day ☕","Tiada jadual pada hari ini ☕");
L("＋ 添加一项","＋ Add one","＋ Tambah satu");L("完成","Done","Siap");
L("本周 ","This week ","Minggu ini ");L("下周 ","Next week ","Minggu depan ");L("上周 ","Last week ","Minggu lepas ");
L("添加","Add","Tambah");L("新增","New","Baharu");L("修改重复活动","Edit repeating event","Edit acara berulang");L("修改","Edit","Edit");
L("删整个系列","Delete whole series","Padam keseluruhan siri");
L("那个时间已经有安排啦～","That time slot is already taken~","Slot masa itu sudah ada acara~");
L("“重复到”的日期不能早于这次活动的日期","The “Repeat until” date can’t be before this event’s date","Tarikh “Ulang sehingga” tidak boleh lebih awal daripada acara ini");
L("删除整个重复系列？（只想删这一周，请点“只删本周”）","Delete the whole repeating series? (To delete just this week, tap “Delete this week only”)","Padam keseluruhan siri berulang? (Untuk padam minggu ini sahaja, ketik “Padam minggu ini sahaja”)");
L("清空本周手动安排？（固定课表和重复活动不受影响）","Clear this week’s manual events? (Fixed classes and repeating events are not affected)","Kosongkan acara manual minggu ini? (Kelas tetap dan acara berulang tidak terjejas)");
L("📖 数学复习","📖 Maths revision","📖 Ulang kaji Matematik");L("🍱 午饭小憩","🍱 Lunch break","🍱 Rehat makan tengah hari");
L("📝 英语单词","📝 English vocabulary","📝 Kosa kata Bahasa Inggeris");L("🏃 运动","🏃 Exercise","🏃 Senaman");
L("下一周已有安排，要追加复制进去吗？","Next week already has events — copy these in as well?","Minggu depan sudah ada acara — salin ke dalamnya juga?");
// ---- 课程 ----
L("学校","School","Sekolah");L("考试","Exam","Peperiksaan");L("实验","Lab","Makmal");L("自习","Self-study","Belajar sendiri");L("活动","Event","Acara");E("课","Class","Kelas");
L("开学后在这里填上学校的上课时间（现在可以先空着）","After term starts, fill in your school’s period times here (you can leave it empty for now)","Selepas sesi bermula, isi masa waktu sekolah di sini (boleh dibiarkan kosong buat masa ini)");
L("请把四个数字填完整","Please fill in all four numbers","Sila isi keempat-empat nombor");
L("会替换现在的节次时间（已有课程不受影响）。继续吗？","This replaces the current period times (existing classes are unaffected). Continue?","Ini akan menggantikan masa waktu sedia ada (kelas sedia ada tidak terjejas). Teruskan?");
L("每周都一样","Same every week","Sama setiap minggu");
L("删除「","Delete “","Padam “");L("」？","”?","”?");
L("还没有链接","No links yet","Belum ada pautan");L("还没有文件","No files yet","Belum ada fail");L("最多 8 个文件","Up to 8 files","Maksimum 8 fail");
L("正在添加「","Adding “","Menambah “");L("」…","”…","”…");L("不使用模板","No template","Tiada templat");
L("开始节次…","Start period…","Waktu mula…");L("结束节次…","End period…","Waktu tamat…");
L("修改课程","Edit class","Edit kelas");
L("请填好开始和结束时间（结束要晚于开始）","Fill in start and end times (end must be after start)","Isi masa mula dan tamat (tamat mesti selepas mula)");
L("请至少选一天","Pick at least one day","Pilih sekurang-kurangnya satu hari");
// ---- 假期 / 云同步 / 账号 ----
L("还没有假期。加入后，勾了“假期里不出现”的重复活动会自动跳过这些日子。","No holidays yet. Once added, repeating events set to “Skip during holidays” will skip these days.","Belum ada cuti. Selepas ditambah, acara berulang yang ditanda “Langkau semasa cuti” akan melangkau hari-hari ini.");
L("（已过）"," (past)"," (sudah lalu)");L("请选开始日期","Pick a start date","Pilih tarikh mula");L("结束日期不能早于开始日期","The end date can’t be before the start date","Tarikh tamat tidak boleh lebih awal daripada tarikh mula");
L("开源库：","Open-source libraries: ","Pustaka sumber terbuka: ");
L("（✗ = 没加载到，对应功能自动退回基础版）"," (✗ = not loaded; that feature falls back to the basic version)"," (✗ = tidak dimuatkan; ciri itu kembali kepada versi asas)");
L("未启用","Not enabled","Tidak diaktifkan");L("。不开也能正常使用，数据只存在这台设备里。",". It works fine without this — your data stays on this device only.",". Berfungsi seperti biasa tanpanya — data anda hanya disimpan pada peranti ini.");
L("邮箱","Email","E-mel");L("密码（至少 6 位）","Password (6+ characters)","Kata laluan (min. 6 aksara)");
L("登录后，课表、作业、学习进度会在你的所有设备间同步。","After signing in, your timetable, homework and study progress sync across all your devices.","Selepas log masuk, jadual, kerja rumah dan kemajuan belajar anda disegerakkan merentas semua peranti.");
L("登录","Sign in","Log masuk");L("注册","Sign up","Daftar");
L("请填邮箱和至少 6 位的密码","Enter an email and a password of at least 6 characters","Masukkan e-mel dan kata laluan sekurang-kurangnya 6 aksara");
L("请稍等…","Please wait…","Sila tunggu…");
L("注册成功！请到邮箱点确认链接，然后回来登录。","Signed up! Click the confirmation link in your email, then come back and sign in.","Pendaftaran berjaya! Klik pautan pengesahan dalam e-mel anda, kemudian kembali dan log masuk.");
L("失败：","Failed: ","Gagal: ");L("立即同步","Sync now","Segerak sekarang");L("退出登录","Sign out","Log keluar");
L("退出登录。\n\n要同时清除这台设备上的数据吗？（数据仍保存在云端，适合公用电脑）\n\n【确定】清除本机　【取消】保留本机","Sign out.\n\nAlso clear the data on this device? (Your data stays in the cloud — good for shared computers)\n\n[OK] clear this device   [Cancel] keep it","Log keluar.\n\nPadam juga data pada peranti ini? (Data kekal di awan — sesuai untuk komputer awam)\n\n[OK] padam peranti ini   [Batal] kekalkan");
L("附件文件在登录后会自动上传到云端，换设备也能打开。","After signing in, attachments upload to the cloud automatically so you can open them on other devices.","Selepas log masuk, lampiran dimuat naik ke awan secara automatik supaya boleh dibuka pada peranti lain.");
L("已同步 ","Synced ","Disegerakkan ");L("同步失败：","Sync failed: ","Segerak gagal: ");
L("云端已经有这个账号的数据了。\n\n【确定】= 用云端数据覆盖这台设备\n【取消】= 用这台设备的数据覆盖云端","This account already has data in the cloud.\n\n[OK] = overwrite this device with the cloud data\n[Cancel] = overwrite the cloud with this device’s data","Akaun ini sudah mempunyai data di awan.\n\n[OK] = timpa peranti ini dengan data awan\n[Batal] = timpa awan dengan data peranti ini");
L("同步中…","Syncing…","Menyegerak…");
L("云端有新数据，关掉窗口后点“立即同步”刷新","There’s new data in the cloud — close this window, then tap “Sync now” to refresh","Ada data baharu di awan — tutup tetingkap ini, kemudian ketik “Segerak sekarang” untuk muat semula");
L("未配置（填 js/config.js）","Not configured (fill in js/config.js)","Belum dikonfigurasi (isi js/config.js)");
L("没加载到 supabase 库（检查网络）","The Supabase library didn’t load (check your connection)","Pustaka Supabase tidak dimuatkan (semak sambungan anda)");
// ---- AI / 记录 ----
L("🧠 云端 AI 不可用，改用浏览器内置 AI（第一次可能要先下载模型）…","🧠 Cloud AI unavailable — switching to the browser’s built-in AI (the first time may need a model download)…","🧠 AI awan tidak tersedia — beralih kepada AI terbina dalam pelayar (kali pertama mungkin perlu muat turun model)…");
L("⬇️ 正在下载内置 AI 模型 ","⬇️ Downloading the built-in AI model ","⬇️ Memuat turun model AI terbina dalam ");
L("；内置 AI 也失败：","; built-in AI also failed: ","; AI terbina dalam juga gagal: ");
L("出错了：","Something went wrong: ","Berlaku ralat: ");L("超时了，再试一次","Timed out — try again","Tamat masa — cuba lagi");
L("（云端和内置 AI 都不可用时，手动添加照常可用）"," (When neither cloud nor built-in AI works, adding manually still works)"," (Apabila AI awan dan AI terbina dalam tidak boleh digunakan, tambah secara manual masih berfungsi)");
L("正在理解你的话…","Understanding what you said…","Memahami kata-kata anda…");
L("没听懂要加什么，换个说法试试～","I couldn’t tell what to add — try rephrasing~","Saya tidak faham apa yang perlu ditambah — cuba ayat lain~");
L("📝 作业：","📝 Homework: ","📝 Kerja rumah: ");L(" · 截止 "," · due "," · tarikh akhir ");L(" · 没有截止日期"," · no due date"," · tiada tarikh akhir");
L(" 小时 · "," h · "," jam · ");
L("日期或时间不对","Invalid date or time","Tarikh atau masa tidak sah");L("⚠️ 和已有安排时间重叠","⚠️ Overlaps an existing event","⚠️ Bertindih dengan acara sedia ada");
L("勾选要加入的，再点「加入」。","Tick the ones to add, then tap “Add”.","Tanda yang hendak ditambah, kemudian ketik “Tambah”.");
L("正在压缩图片…","Compressing the image…","Memampatkan imej…");L("正在识别课表（可能要 10–20 秒）…","Reading the timetable (may take 10–20 s)…","Membaca jadual (mungkin mengambil masa 10–20 saat)…");
L("这张图片打不开","This image can’t be opened","Imej ini tidak boleh dibuka");L("没识别到课程，换一张更清晰的试试～","No classes found — try a clearer photo~","Tiada kelas ditemui — cuba foto yang lebih jelas~");
L("识别到 ","Found ","Ditemui ");L(" 节课。"," classes. "," kelas. ");L("请核对后再加入～","Please check them before adding~","Sila semak sebelum menambah~");
L("还没有勾选任何一项","Nothing is ticked yet","Belum ada yang ditanda");L("会先清空现有的 ","This will first clear the existing ","Ini akan memadam dahulu ");L(" 节固定课程，确定？"," fixed classes. Continue?"," kelas tetap sedia ada. Teruskan?");
L("说完了？点「解析」。","Done speaking? Tap “Parse”.","Dah selesai bercakap? Ketik “Analisis”.");
L("没有麦克风权限，请在浏览器里允许","No microphone permission — please allow it in the browser","Tiada kebenaran mikrofon — sila benarkan dalam pelayar");
L("语音识别失败：","Voice recognition failed: ","Pengecaman suara gagal: ");L("⏹ 停止","⏹ Stop","⏹ Henti");L("在听…","Listening…","Mendengar…");
L("内置 AI 需要先下载约 1 GB 的模型（只下载一次，之后离线可用，建议用 Wi-Fi）。现在下载吗？","The built-in AI needs to download a model of about 1 GB (one time only; works offline afterwards — Wi-Fi recommended). Download now?","AI terbina dalam perlu memuat turun model kira-kira 1 GB (sekali sahaja; boleh digunakan luar talian selepas itu — disyorkan Wi-Fi). Muat turun sekarang?");
L("已取消下载","Download cancelled","Muat turun dibatalkan");L("这个浏览器不支持内置 AI","This browser doesn’t support built-in AI","Pelayar ini tidak menyokong AI terbina dalam");
L("内置 AI 没给出有效 JSON","The built-in AI didn’t return valid JSON","AI terbina dalam tidak memulangkan JSON yang sah");L("内置 AI 的结果格式不对","The built-in AI returned the wrong format","AI terbina dalam memulangkan format yang salah");
L("」排不下，已暂时移除","” didn’t fit and was removed for now","” tidak muat dan dialih keluar buat sementara");
L("；已重排 ","; rescheduled ","; disusun semula ");
L("🤔 没看懂时间：","🤔 Couldn’t read the time: ","🤔 Tidak dapat baca masa: ");L("（请写“周六”“明天”等）"," (please write “Saturday”, “tomorrow”, etc.)"," (sila tulis “Sabtu”, “esok”, dll.)");
L("AI 的结果排到了固定时段/隐藏的日子，或格式不对","The AI’s result landed in a fixed slot / hidden day, or has the wrong format","Hasil AI jatuh pada slot tetap / hari tersembunyi, atau formatnya salah");
L("🧠 内置 AI 已重排（小模型，请检查一下结果）","🧠 Rescheduled by the built-in AI (small model — please check the result)","🧠 Disusun semula oleh AI terbina dalam (model kecil — sila semak hasilnya)");
L("🤖 AI 已重排","🤖 Rescheduled by AI","🤖 Disusun semula oleh AI");L("🔌 AI 未连接（","🔌 AI not connected (","🔌 AI tidak bersambung (");
L("等了 60 秒没回应","no response after 60 s","tiada respons selepas 60 saat");L("），先用本地规则排","), using local rules instead","), menggunakan peraturan setempat");
L("周六与朋友打球","Football with friends on Saturday","Bermain bola dengan kawan pada hari Sabtu");L("周日有跑步比赛","Running race on Sunday","Perlumbaan larian pada hari Ahad");
L("全选","Select all","Pilih semua");L("清除已排","Clear planned","Kosongkan yang disusun");L("👆 先勾选要排的那几条，再按“排”","👆 Tick the items to plan, then press “Plan”","👆 Tanda item yang hendak disusun, kemudian tekan “Susun”");
L("📝 记录本周特别安排 · v3","📝 Log special plans this week","📝 Catat rancangan khas minggu ini");
// ---- 提醒 / 通知 ----
L("⏰ 提醒","⏰ Reminder","⏰ Peringatan");L("马上开始：","Starting soon: ","Akan bermula: ");L("🏫 马上上课：","🏫 Class starting soon: ","🏫 Kelas akan bermula: ");
L("🔔 开启系统通知","🔔 Turn on system notifications","🔔 Hidupkan notifikasi sistem");
L("已开启：会提前排好未来 7 天的提醒，App 关掉也会响 🐱","Enabled: reminders for the next 7 days are scheduled in advance and will ring even when the app is closed 🐱","Diaktifkan: peringatan 7 hari akan datang dijadualkan lebih awal dan akan berbunyi walaupun aplikasi ditutup 🐱");
L("没有通知权限，请到手机系统设置里打开","No notification permission — please enable it in your phone’s system settings","Tiada kebenaran notifikasi — sila aktifkan dalam tetapan sistem telefon anda");
L("这个浏览器不支持通知。","This browser doesn’t support notifications.","Pelayar ini tidak menyokong notifikasi.");
L("🔔 通知已开启（点一下发测试）","🔔 Notifications on (tap to send a test)","🔔 Notifikasi dihidupkan (ketik untuk hantar ujian)");L("这是一条测试通知","This is a test notification","Ini ialah notifikasi ujian");
L("重复活动","Repeating events","Acara berulang");L("还没有安排～","Nothing scheduled yet~","Belum ada jadual~");L("点下面“加一条提醒”～","Tap “Add a reminder” below~","Ketik “Tambah peringatan” di bawah~");
L("要提醒自己什么？","What should I remind you about?","Apa yang perlu diingatkan?");L("不限日","Any day","Mana-mana hari");
L("　📝 作业：","  📝 Homework: ","  📝 Kerja rumah: ");L("逾期 ","Overdue: ","Tertunggak: ");L(" 项 "," · "," · ");L("今天截止 ","Due today: ","Tamat hari ini: ");L(" 项","","");
L("⏰ 该做啦：","⏰ Time for: ","⏰ Masa untuk: ");L("📌 今天还有 ","📌 ","📌 ");L(" 件事要完成，加油！"," things left to do today — you’ve got this!"," perkara lagi untuk disiapkan hari ini — semangat!");
L("🎉 今天的事都完成啦！","🎉 Everything for today is done!","🎉 Semua untuk hari ini sudah siap!");
// ---- 运动 ----
L("还差 ","Gap: ","Beza: ");L("%）","%)","%)");L("已达标 🎉","Goal reached 🎉","Sasaran dicapai 🎉");L("每周 ","","");L(" 次","× per week","× seminggu");
L("项目/距离","Event / distance","Acara / jarak");L("现在成绩","Current result","Keputusan semasa");L("目标成绩","Goal result","Sasaran");L("如 5k","e.g. 5k","cth: 5k");L("如 21:00","e.g. 21:00","cth: 21:00");L("如 20:00","e.g. 20:00","cth: 20:00");L("＋ 加一个项目","＋ Add an event","＋ Tambah acara");
L("长跑","Long-distance running","Larian jarak jauh");L("节奏跑","Tempo run","Larian rentak");L("间歇","Intervals","Selang");L("长距离","Long run","Larian jauh");L("轻松跑","Easy run","Larian santai");L("综合","Mixed","Campuran");L("技术","Skills","Kemahiran");L("体能","Fitness","Kecergasan");L("实战","Match play","Perlawanan");
L("重点提升 "," focus: "," fokus: ");L("已排 ","Scheduled ","Dijadualkan ");L(" 次训练（隔天练、给身体恢复时间）"," workouts (every other day, to let your body recover)"," sesi latihan (selang sehari, untuk badan pulih)");
L("。建议先按“学习”排好再来排运动 🐱",". Tip: plan “Study” first, then sports 🐱",". Petua: susun “Belajar” dahulu, kemudian sukan 🐱");L("没有可排的空档或还没加运动～","No free slots, or no sports added yet~","Tiada slot kosong, atau belum tambah sukan~");
// ---- 统计 ----
L("作业共 ","Homework total: ","Jumlah kerja rumah: ");L(" 份：完成 "," — done "," — siap ");L("，逾期 ",", overdue ",", tertunggak ");L("。这一周共安排 ",". This week you have ",". Minggu ini anda ada ");L(" 小时。"," h scheduled."," jam dijadualkan.");
L("还没有作业记录。这一周共安排 ","No homework yet. This week you have ","Belum ada kerja rumah. Minggu ini anda ada ");
L("Chart.js 没加载到，图表暂时显示不了（设置页最下面能看到开源库状态）。","Chart.js didn’t load, so charts can’t be shown right now (library status is at the bottom of Settings).","Chart.js tidak dimuatkan, jadi carta tidak dapat dipaparkan (status pustaka ada di bahagian bawah Tetapan).");
L("时长是课表页当前翻到的那一周（含固定课程和重复活动）。","Hours are for the week currently shown in the timetable (including fixed classes and repeating events).","Jam ialah untuk minggu yang sedang dipaparkan dalam jadual (termasuk kelas tetap dan acara berulang).");L("已逾期","Overdue","Tertunggak");
// ---- 学习 ----
L("华文","Chinese","Bahasa Cina");L("英文","English","Bahasa Inggeris");L("数学","Maths","Matematik");L("物理","Physics","Fizik");L("化学","Chemistry","Kimia");
L(" 考试日"," exam date"," tarikh peperiksaan");L("删除科目「","Delete subject “","Padam subjek “");L("」及其章节？","” and its topics?","” dan topiknya?");
L("还没有章节～","No topics yet~","Belum ada topik~");L("🆕 还没学过","🆕 Not studied yet","🆕 Belum dipelajari");L("🔔 今天该复习","🔔 Review today","🔔 Ulang kaji hari ini");
L("下次复习 ","Next review ","Ulang kaji seterusnya ");L("（间隔 "," (interval "," (sela ");L(" 天）"," days)"," hari)");
L("忘了","Forgot","Lupa");L("模糊","Fuzzy","Kabur");L("记得","Got it","Ingat");L("没关系，明天再来一次 💪","No worries — try again tomorrow 💪","Tak apa — cuba lagi esok 💪");L("下次复习：","Next review: ","Ulang kaji seterusnya: ");
L("·做题"," · practice"," · latihan");L("已排好：复习 ","Scheduled: review ","Dijadualkan: ulang kaji ");L("、做题 ",", practice ",", latihan ");L("、预习 ",", preview ",", pratonton ");L(" 个时段"," slots"," slot");
L("考试还有 "," exam in "," peperiksaan dalam ");L(" 天，已加强"," days — extra sessions added"," hari — sesi tambahan ditambah");L("，去时间表看看吧 🐱"," — go check the timetable 🐱"," — lihat jadual anda 🐱");
L("没有可排的内容，先加入章节吧～","Nothing to schedule — add some topics first~","Tiada untuk dijadualkan — tambah topik dahulu~");
// ---- 分享 / 导出 ----
L("还没有可导出的内容～","Nothing to export yet~","Belum ada kandungan untuk dieksport~");L("已导出 ","Exported ","Dieksport ");
L(" 项（重复课程写成了重复规则；假期没有排除，导入后可在日历里删掉）。"," items (repeating classes were written as repeat rules; holidays aren’t excluded — delete them in your calendar after importing)."," item (kelas berulang ditulis sebagai peraturan ulang; cuti tidak dikecualikan — padam dalam kalendar selepas import).");
L("lz-string 没加载到，暂时不能生成分享链接。","lz-string didn’t load, so share links can’t be generated right now.","lz-string tidak dimuatkan, jadi pautan kongsi tidak dapat dijana sekarang.");
L("这个课表还没有固定课程可分享～（先到「固定课表」里加课）","This timetable has no fixed classes to share yet~ (add some under “Fixed classes” first)","Jadual ini belum ada kelas tetap untuk dikongsi~ (tambah dahulu di “Kelas tetap”)");
L("复制链接","Copy link","Salin pautan");L("已复制 ✓","Copied ✓","Disalin ✓");L("请长按链接框手动复制","Long-press the link box to copy it manually","Tekan lama kotak pautan untuk salin secara manual");L("系统分享","Share via…","Kongsi melalui…");
L("Mochi 课表：","Mochi timetable: ","Jadual Mochi: ");L("课表比较大，二维码装不下，请用链接分享。","This timetable is too big for a QR code — please share by link.","Jadual ini terlalu besar untuk kod QR — sila kongsi melalui pautan.");
L("朋友打开链接 / 扫码就能把「","A friend who opens the link / scans the code can import “","Rakan yang membuka pautan / mengimbas kod boleh mengimport “");L("」导入成新课表（","” as a new timetable (","” sebagai jadual baharu (");L(" 节课）。"," classes). "," kelas). ");
L(" 链接较长，建议用「系统分享」。"," The link is long — try “Share via…”."," Pautan panjang — cuba “Kongsi melalui…”.");
L("lz-string 没加载到","lz-string didn’t load","lz-string tidak dimuatkan");L("链接内容不对","The link content is invalid","Kandungan pautan tidak sah");L("里面没有课程","It contains no classes","Tiada kelas di dalamnya");L("分享的课表","Shared timetable","Jadual dikongsi");
L("收到分享的课表「","You received a shared timetable “","Anda menerima jadual dikongsi “");L("」（","” (","” (");L(" 节课）。\n导入为一个新课表？（不会改动你现有的课表）"," classes).\nImport it as a new timetable? (Your existing timetables won’t change)"," kelas).\nImport sebagai jadual baharu? (Jadual sedia ada anda tidak akan berubah)");
L("这个分享链接打不开：","This share link can’t be opened: ","Pautan kongsi ini tidak boleh dibuka: ");
})();
