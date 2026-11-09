# 🐱 Mochi 智能时间表（v9.8）

> **v9.8**：把 Phase 3（Study Space）合并进 main（含 Starter Kits、插画横幅、菜单润色），见 `docs/v9.8-merge-and-phase3-audit.md`。
>
> **v9.7**：新增 **Study Space 学习工作台**（Phase 3A 工作台 + 3B 科目详情）：点底部“学习”默认进工作台，作业与复习计划仍是明确的子标签；只复用现有的科目 / 章节 / 复习 / 作业 / Goals 数据，不建新系统。另外补了两组 Goals 跨设备同步回归测试（`tests/goals-sync-regress.cjs`）。见 `docs/v9.7-study-space.md` 和 `docs/phase3-integration-report.md`。
> **v9.6**：Goals 排程关联表也跨设备同步（按条合并），任何设备都能管排程。见 `docs/v9.6-goals-links-sync.md`。
> **v9.5**：Goals（目标本体）跨设备同步；排程时段只由“排程的那台设备”管理。见 `docs/v9.5-goals-sync.md`。
> **v9.4**：修复 Goals 排程的写入一致性（日程 + 关联表同成败），新增跟随移动 / 重新排 / 目标级撤销。见 `docs/v9.4-goals-phase2-fixes.md`。
>
> **v9.2**：以 v9.1.0 为底，合并 v8.9.6 的 **Goals Phase 2（把已确认的目标步骤匹配到现有空档：预览、勾选、确认、撤销）**。详见 `docs/v8.9.6-goals-phase2.md` 和 `docs/v9.2-merge.md`。

> **v9.0**：菜单版本号修正（以前写死成 v8.8.1，现在统一读 `js/version.js`）· 新增「给 Mochi 评分」（星星 + 大家的评分统计，需要在 Supabase 运行一次 `supabase/ratings.sql`）· 新增「常见问题与帮助」。详见 `docs/v9.0-about-rate-faq.md`。

AI 整周重排 · 拍照导入课表 · 一句话 / 语音添加 · 分钟级时间 · 周视图 · 课前 / 作业提醒 · Android 桌面小组件（源码）· 可离线的 PWA。

> v7 的改动对照 `docs/v7-progress.md`（逐项说明做了什么、怎么验证的、哪些没做）。

## v8.4：科目库 · 时间尺 · 长单词不再被劈开（详见 `docs/v8.4-notes.md`）
- **科目库**（`js/subjects.js`）：课程编辑器名字框右边的 📚 打开科目页（无 / 列表 / ✓ / 右下 ＋）。加过一次就记住，连同常用楼栋、教室、老师和颜色；保存课程时新名字自动入库；作业的科目建议也用同一份库。数据在 `mochi-subj`，随云同步。
- **时间尺**（`js/timepick.js`）：横向滑动选开始时间（5 分钟一格），下面点时长；当天已有的课画在尺子下面，撞车会提示。课程和活动两个编辑器都用，原来的时间输入框只是藏起来，保存逻辑没动。
- **排版**：周视图里「Science」这类单词不再从中间断开——先缩小字号（最低 8px），还放不下就用省略号；很窄的块会先去掉标题前的 emoji。中日韩文字仍按字换行。

## v8.3：排版修复（详见 `docs/v8.3-fixes.md`）
- **＋ 按钮被“固定”在卡片里**：开启壁纸后卡片有 `backdrop-filter`，会让里面 `position:fixed` 的元素改成相对卡片定位，按钮跟着卡片滚走。现在 ＋ 和它的菜单放在页面最外层，只在“课表”页显示（`body[data-view]`）。
- **橙色手绘线乱跳**：去掉 rough-notation（它监听整个页面，每次 DOM 变化都重画一遍，形状随机，弹窗滚动时线还不跟着走）。改成纯 CSS 的手绘下划线，固定形状，跟着标题走。少一个库、少一个脚本。
- **当前时间线重做**：原来是红线 + 红点。现在是淡线贯穿全周、今天那一列加粗发光、时间轴上显示当前时间的小标签（跟主题色走）。时间轴加宽到 42px 以放下标签。
- **About 弹窗标题压字**：纵向 flex 的弹窗内容超高时，文字块会被压成 18px 高，文字溢出被下一个标题盖住。现在文字块不允许被压缩。
- `sw.js` 缓存版本 `mochi-v8-3`。

## v8：v7.1 + v7（多语言）+ v6.4（问问 Mochi / 导入 .ics / 撤销）
- **多语言**（来自 v7 多语言版）：English / 中文 / Bahasa Melayu，`js/i18n.js` + `lang-ui.js` + `lang-msg.js`，切换在向导第一页、≡ 菜单顶部、设置 → 外观；AI 请求自动带 `lang`。v7.1 新增的界面文字暂时没有英文 / 马来文译文，会显示中文，要补的话在字典里加 `L("中文","English","Bahasa Melayu")`。
- **漏翻的文字**：`node scripts/extract-i18n.mjs` 生成 `js/lang-static.js`（词典里没有译文的写死文字）；运行时用 Chrome 内置 Translator，没有则用 transformers.js + opus-mt-zh-en（首次询问、约 100MB），译文缓存在本机。用户自己输入的内容不会被机翻。
- **AI 来源**（设置 → 账号与同步）：自动 / 优先本机 AI（Gemini Nano 或 WebLLM）；还可以填自己的 Gemini key（`X-User-Key` 请求头，后端用它调用，不占站长额度、不要求登录，不保存）。站长的 key 仍受登录 + 限流保护；要不要强制登录由 Vercel 环境变量 `SUPABASE_URL` / `SUPABASE_ANON_KEY`（或 `REQUIRE_AUTH=1`）决定，全站日上限 `AI_GLOBAL_PER_DAY`。
- **🤖 问问 Mochi**（`js/agent.js`、`js/sched.js`、`api/agent.js`）：≡ 菜单第一组，或 AI 助手里的「💬 改为提问」。已改成分钟制，走 v7 的登录校验 / 限流（`_lib.js`）。
- **📥 导入 .ics**（`js/icsimport.js`）：设置 → 数据 → 分享与导出。按分钟导入，超出显示范围的截短。
- **撤销**（`js/undo.js`）：覆盖按周存储的全部活动；AI 助手、导入 .ics、一句话添加写入后可撤销。
- 没搬的：v6.4 的 FullCalendar 周视图、旧小组件（v7.1 已有更好的）。
- 手机 App 打包多装：`npm i -D ical.js`。

## v7.1：v7 + v6.5 合并说明
- 以 v7 为主体（它在分钟制数据、周视图、设置页拆分、接口限流、云同步分块、搜索、通知、商店素材等方面已经包含并超过 v6.5），把 v6.5 里 v7 没有的东西并进来：**Lucide 图标**（`js/icons.js`，库没加载到就保留 emoji）、你手改的两处 `addEventListener('error')` 和 `safeUrl` 注释。
- 两边重复的功能择优保留一个：周视图用 v7 自己的（按分钟存数据，v6.5 的 FullCalendar 版本只认整点，所以去掉）；桌面小组件用 v7 的（带系统倒计时和安装脚本）；离线缓存用 v7 的 `sw.js`（不依赖外部 CDN）；manifest 与图标用 v7 的（更全）。
- `docs/改进完成情况.md` 改名为 `docs/v7-progress.md`（GitHub 网页上传对中文文件名有时不友好）。

## 文件结构
```
index.html        页面骨架（底部有脚本加载顺序，不要打乱）
manifest.json     PWA 清单（名称、图标、主题色、standalone）
sw.js             Service Worker：离线缓存 + 通知点击（/api/ 永不缓存）
icons/            应用图标（192 / 512 / maskable / apple-touch / svg）
css/style.css     样式（≥768px 双栏、颜色变量、对比度达标）
js/hook.js        监听 localStorage 写入（云同步、手机通知都靠它，必须最先加载）
js/config.js      Supabase 地址 / key、手机 App 的 API 地址（部署时填）
js/sync.js        账号 + 云同步（Supabase）：按键同步；冲突检测 / 合并；cloud.token()
js/api.js         调用 /api/*：自动带登录令牌，统一错误提示
js/core.js        常量、设置、日期工具、按周存储、分钟级占用判断 free()
js/timetable.js   周视图（线格 + 红线 + 吸顶日期头）+ 全屏编辑页
js/dayview.js     日视图、进行中 / 下一项倒计时、＋菜单、空状态
js/notifyset.js   生成提醒清单（网页 / 手机共用）+ 设置页「通知与提醒」
js/notify.js      网页版通知            js/native.js  手机 App 系统通知 + 小组件数据推送
js/ai.js          ✨ AI 助手：一句话 / 拍照课表 / 整周重排（三个标签，一个入口）
js/log.js         整周重排的逻辑 + 本地规则兜底（认“三点半 / 一个半小时”）
js/search.js      全局搜索            js/menu.js    ≡ 菜单 + 设置二级页
js/wizard.js      首次向导            js/theme.js   主题 + 对比度自适应
js/…              其余（hw / lessons / settings / study / sport / stats / share / holidays / recur / localai 等）
api/_lib.js       后端共用：登录校验、限流、CORS 白名单、请求大小限制
api/plan.js       整周重排（Gemini）   api/ai.js  一句话 / 拍照识别（Gemini）
android-widget/   Android 桌面小组件（Java 源码，见下）
scripts/          build-www.mjs（打包 www/）· android-widget.mjs（装小组件）· check.mjs（发布前自检）
store/            商店素材：图标、宣传图、4 张手机截图、简介与隐私政策草稿
supabase/schema.sql   Supabase 建表 + 行级安全 + 附件存储桶，运行一次
```

## 开源库（index.html 里用固定版本的 CDN 引入）
| 库 | 做什么 | 没加载到时 |
|---|---|---|
| dayjs | 日期格式化 / 加减 / 校验 | 退回手写版本 |
| rrule | “每月第几个周几 / 最后一个周几” | 这两个重复选项变灰，已有规则暂不显示 |
| ts-fsrs | 学习页的复习间隔（FSRS） | 退回原来的简易算法 |
| Dexie | 作业附件（照片/文件）存本机 | 附件功能不可用，其余正常 |
| supabase-js | 账号、云同步、附件云存储 | 云同步面板显示“未启用” |
| Chart.js | 统计页图表 | 统计页只显示文字摘要 |
| lz-string | 分享链接压缩 / 解压 | 不能生成或打开分享链接 |
| qrcode-generator | 分享二维码 | 只提供链接，不显示二维码 |
| @capacitor-community/speech-recognition（手机 App 才用） | 语音输入：弹出系统语音识别窗口 | 网页用浏览器自带语音；都没有就隐藏按钮 |
| @ebarooni/capacitor-calendar（手机 App 才用，装的是 `latest-7`，对应 Capacitor 7） | 设置 → 数据：写入 / 导入手机系统日历 | 网页版看不到这一块 |
| 霞鹜文楷 LXGW WenKai（字体，OFL-1.1） | 界面中文字体（常规 + 粗体），按字切片加载 | 退回系统中文字体 |

**部署后先打开 设置 页，最下面“开源库”一行会显示每个库 ✓ / ✗。** 有 ✗ 说明那个 CDN 链接没加载到（版本号或路径不对、或网络问题），去 index.html 改成能用的版本即可。

## 部署
1. **Gemini API Key（上架前必须看下面「两件事」）**：https://aistudio.google.com 申请。
2. 整个文件夹传到 GitHub → https://vercel.com 导入。环境变量见 `.env.example`，最少要配：`GEMINI_API_KEY`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`（后端要用它校验登录令牌）。
3. **云同步（现在也是 AI 的“登录门槛”）**：
   1. https://supabase.com 新建项目；SQL Editor 里运行一次 `supabase/schema.sql`。
   2. Project Settings → API：把 **Project URL** 和 **anon public key** 填进 `js/config.js`，同一组值也填进 Vercel 的 `SUPABASE_URL` / `SUPABASE_ANON_KEY`。（anon key 是公开的，安全靠 RLS；**绝不要**填 service_role key。）
   3. Authentication → URL Configuration：Site URL 填你的 Vercel 网址。
4. 重新部署；手机打开网址 → 安装 / 添加到主屏幕（现在有 manifest 和图标，可作为 PWA 安装，断网也能打开）。

### 后端接口的保护（v7）
- `/api/plan`、`/api/ai` 默认**必须带登录令牌**（配了 Supabase 环境变量即生效）；没登录的用户会看到提示，并自动退回浏览器内置 AI / 本地规则。
- 限流：每账号每分钟 6 次、每天 60 次（拍照识别算 3 次）；匿名按 IP 更严；`AI_GLOBAL_PER_DAY` 设全站每日总量，防止账单被刷。多实例下要精确计数，请配 Upstash Redis（`UPSTASH_REDIS_REST_URL / _TOKEN`），否则是每个实例各算各的（尽力而为）。
- `ALLOWED_ORIGINS` 限制允许调用的网页来源；手机 App 的 `capacitor://localhost`、`https://localhost` 自动放行。
- 请求大小：plan ≤ 200 KB，ai ≤ 5.5 MB；模型输出逐项严格校验，越界值直接丢弃。
- 想完全开放（自建、不接 Supabase）：不配 Supabase 变量，或设 `REQUIRE_AUTH=0`，此时只按 IP 限流——**公开上架不要这样做**。

### 上架前必须做的两件事（代码改不了，要你去做）
1. **Gemini 改用付费层**：免费层的数据可能被 Google 用于改进产品，而拍照导入会把用户的课表照片发过去。去 Google Cloud 控制台新建项目 → 开启结算（Billing）→ 在这个项目里启用 Generative Language API 并创建 API Key（AI Studio 里把 Key 绑定到这个已开通结算的项目），再填进 `GEMINI_API_KEY`。同时在隐私政策里写明照片和文字会发送给 Gemini 处理（`store/privacy-policy-draft.md` 已写）。用 `AI_GLOBAL_PER_DAY` 给自己设一个成本上限。
2. **账号删除入口**：Google Play 要求「允许创建账号的 App，必须在 App 内提供删除账号和数据的入口」，并提供一个网页链接。目前 App 只有“退出登录（可清本机）”，**没有删除云端账号**。需要补：一个后端接口（用 service_role key，只放在服务端）删除 `auth.users` 记录和 `user_data` / 附件，再在「账号与同步」里加按钮。这一项我没有做。

## v6：免 key 的内置 AI 备用
- 云端 AI（Vercel + Gemini）失败时（没部署、没 key、超额、断网），App 会自动改在本机跑小模型：免 key、免额度、数据不出设备。
- 顺序：云端 Gemini → 本机小模型 → 原来的本地规则。本机模型的结果同样会被校验，不合格就退回本地规则。
- 本机有两种引擎，自动选：
  1. **Chrome 自带 Gemini Nano**（Prompt API）：已经装好时优先用，最快。要在 `chrome://flags` 打开 “Prompt API for Gemini Nano”。
  2. **WebLLM**（Qwen2.5-1.5B，约 1 GB，跑在 WebGPU 上）：Chrome / Edge 桌面版和较新的安卓 Chrome 都可以。打开 App 约 12 秒后会在后台自动下载（只在有 WebGPU、没有省流量 / 蜂窝网络、空间够、没有 Gemini Nano、也没填自己的 key 时；设置里可关掉，也可以手动下载），之后缓存在浏览器里可离线用。库从 jsDelivr 载入（`js/localai.js` 顶部可改版本 / 模型）。
- 只管文字（整周重排、一句话添加）；📷 拍照识别仍需要云端。
- 没有 WebGPU 的浏览器（部分 iOS / Firefox）会自动跳过。模型较小，排得复杂时可能不如云端准，也比较耗电 / 内存。
- 默认云端模型改为 `gemini-3.5-flash-lite`（`GEMINI_MODEL` 可覆盖；`GEMINI_THINKING` 可填 minimal / medium / high）。

## 分钟级时间与数据格式（v7）
- 活动、重复活动都用 `s`（开始）和 `e`（结束）表示“当天 0 点起的分钟数”。旧数据（`h` + `len` 整点）在第一次打开时自动换算，完成标记也一并迁移。
- 活动按周存储：每一周一个键 `mochi-wk:<课表id>:<周号>`（旧的“所有周一个键”`mochi-wk` 第一次打开时自动拆开并删除）。两台设备改不同的周不再互相覆盖。
- 云同步冲突：本机有没推上去的改动、云端同时被别的设备改过 → 弹一次提示让你选“用云端 / 保留本机”（列出是哪几项）；“完成记录”自动合并；云端单方面的改动静默拿下。
- AI 的输入输出同步改为 `s/e` 分钟；服务端也认旧格式（`h/len`）做兼容，但会严格校验范围。

## 通知（v7）
- 设置 → 通知与提醒：课前 / 活动前 N 分钟（不提醒 / 5 / 10 / 15 / 30 / 60）、作业截止当天几点提醒、截止前一晚 20:00 也提醒、提示方式（声音 + 振动 / 仅振动 / 静音）、发测试通知、检查精确闹钟权限、以及一份“收不到准时提醒”的排查指南（通知权限、精确闹钟、电池优化、各品牌自启动）。
- 手机 App 里提示方式靠 Android 通知渠道实现（每种方式一个渠道，渠道建好后系统不允许程序再改；用户也能在系统设置里改渠道）。网页版由浏览器 / 系统决定声音，静音可用，“仅振动”只能做到“加振动”。
- 提醒清单由 `buildAlarms()` 统一生成：网页版每 30 秒检查一次，手机 App 把未来 7 天排进系统通知队列（iOS 最多 60 条，Android 120 条）。

## 手机 App（Capacitor）与 Android 桌面小组件
需要电脑装 Node.js（20 以上）；Android 要 Android Studio，iOS 要 Mac + Xcode + 开发者账号。
**图省事：`npm run android:setup` 一条命令做完下面前几步（后端网址默认是 smart-timetable-kappa.vercel.app，可用 `-- --api=网址` 改），再照 `BUILD-ANDROID.md` 在 Android Studio 里点几下就能出 APK。**
```bash
npm i                    # package.json 已列好依赖（Capacitor 7、各开源库的固定版本）
# 在 js/config.js 里填 apiBase = 你的 Vercel 网址（App 里没有同域后端）
npm run build:www        # 生成 www/（库换成本地文件，App 能离线启动）
npx cap add android      # 第一次
npm run android:widget   # 把桌面小组件装进 android/（幂等，可重复运行）
npx cap sync
npx cap open android     # 用 Android Studio 运行 / 打 AAB（Build → Generate Signed Bundle）
```
- **桌面小组件**（`android-widget/`，Java，不需要给 Capacitor 工程加 Kotlin）：4×2，可缩放。显示当前 / 下一节 + 系统倒计时控件，下面列出后面几项；今天没安排了就显示明天。网页端 `native.js` 在数据变化 / 回到前台时把今天和明天的数据交给原生插件 `MochiWidget`，小组件自己按时间算“进行中 / 下一项”，并在下一个开始 / 结束时刻用非精确闹钟刷新（另有系统每 30 分钟周期刷新）。长按桌面 → 小组件 → Mochi。
- **这部分代码我在没有 Android SDK 的环境里写的，没有编译、没有在真机运行过**；第一次请用 Android Studio 打开看 Gradle 有没有报错，并在真机上验证小组件、通知渠道、精确闹钟。
- 包名 `app.mochi.timetable` 一旦发布就不能改。
- 发布前运行 `npm run check`：检查所有脚本语法、页面引用、`sw.js` 预缓存清单、图标是否齐全。

## 复杂重复与假期
- 新增 / 修改活动 → “重复”里选 **每月第 N 个周几** 或 **每月最后一个周几**（N 按你点的那天算）。
- 设置 → **假期**：加入起止日期。重复活动勾上“假期里不出现”就会自动跳过；另有开关可在假期里隐藏固定课表。
- 旧的重复活动不受影响（不会被自动排除假期，需要的话打开活动勾选）。

## 数据存放（localStorage，key 都以 mochi- 开头）
- `mochi-set` 设置、`mochi-tts` 课表列表、`mochi-hol` 假期、`mochi-rm` 提醒
- 每个课表各有：`mochi-fx`、`mochi-rp`、`mochi-hw`、`mochi-dn`，以及按周的 `mochi-wk:<课表id>:<周号>`；第一个课表“学校”的前四个沿用旧 key，其余末尾加 `-课表id`
- 学习章节在 `mochi-st`；FSRS 的记忆状态存在每个章节的 `fc` 字段里
- `mochi-sync-*` 是同步 / 本机内部状态，不会被同步，也不进备份
- 附件文件在 IndexedDB 库 `mochi-files`；“导出备份”默认不含附件，“导出（含附件）”会把附件编码进同一个 JSON（文件会很大）

## 注意
- Key 只放 Vercel 环境变量，不要写进前端文件（Supabase 的 anon key 除外，它本来就是公开的）。
- 后端没部署、没登录、超额或 AI 出错时，页面自动退回浏览器内置 AI，再退回本地规则。


## Google 登录（可选，网页版）
设置 → 账号与同步 里有「使用 Google 继续」按钮。要让它能用，站长需要在后台开启一次（不开的话，点按钮会提示“Google 登录还没在后台开启”，邮箱登录不受影响）：
1. **Google Cloud Console** → API 和服务 → 凭据 → 创建凭据 → OAuth 客户端 ID → 应用类型选「Web 应用」。「已获授权的重定向 URI」填：`https://<你的 Supabase 项目>.supabase.co/auth/v1/callback`。
2. **Supabase** → Authentication → Providers → Google：打开，把上一步的 Client ID 和 Client Secret 粘贴进去。
3. **Supabase** → Authentication → URL Configuration：Site URL 和 Redirect URLs 都加上你的网站地址（如 `https://smart-timetable-kappa.vercel.app`）。
4. **手机 App（Capacitor）里不显示 Google 按钮**：Google 不允许在内嵌 WebView 里登录，要另外做“系统浏览器 + 深度链接”回到 App，目前没做；手机 App 里用邮箱登录。
