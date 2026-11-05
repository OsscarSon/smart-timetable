# 🐱 Mochi 智能时间表

## 文件结构
```
index.html        页面骨架（底部有脚本加载顺序，不要打乱）
css/style.css     样式
js/hook.js        监听 localStorage 写入（云同步、手机通知都靠它，必须最先加载）
js/config.js      Supabase 地址 / key、手机 App 的 API 地址（部署时填）
js/sync.js        账号 + 云同步（Supabase）：数据按键同步，附件放 Storage
js/core.js        共用常量、设置、真实日期工具、多课表数据加载
js/dates.js       dayjs 封装（格式化、加减天/周、日期校验）
js/theme.js       亮色/暗色/跟随系统 + 主题色
js/recur.js       重复活动（含 rrule：每月第几个周几）、假期、固定课程 → 当周占位
js/srs.js         复习算法：ts-fsrs（FSRS），没加载到时退回简易算法
js/timetable.js   课表网格 + 新增/修改/移动
js/log.js         记录（逐条）+ 调用 AI 重排（失败则用本地规则）
js/study.js       学习：章节、考试日期、排程
js/sport.js       运动：现状/目标、训练排程
js/remind.js      提醒、清单、顶部提示
js/store.js       本地附件（Dexie / IndexedDB）+ 上传云端
js/hw.js          作业页：分组、科目标签、搜索筛选、链接、附件
js/lessons.js     固定课表：节次模板、课程（教室/老师/类型/多周循环）
js/settings.js    设置：外观、日历、多课表与归档、备份/导入
js/holidays.js    设置页的“假期”界面
js/account.js     设置页的“账号与云同步”面板 + 开源库加载状态
js/wizard.js      首次向导
js/notify.js      网页打开时的通知
js/native.js      手机 App（Capacitor）：系统本地通知（网页里不做任何事）
js/dayview.js     课表日视图：日期条、当天列表、进行中/下一项倒计时、日/周切换
scripts/check.mjs  一键检查（语法 / 引用 / 库登记）
js/widget.js      手机 App：把今天 / 明天的安排写给 Android 桌面小组件
js/icons.js       图标：开源库 Lucide（失败时保留 emoji）
native/android-widget/  Android 桌面小组件的原生代码 + 安装说明
js/fcview.js      周视图：开源库 FullCalendar（失败时退回方块网格）
js/guide.js       📖 功能表（全部功能 + 使用方法，直接改里面的数组）
js/menu.js        ≡ 左侧菜单（分组大圆角卡片）+ 设置页分区显示
js/localai.js     🧠 本机 AI 备用（Chrome Gemini Nano / WebLLM）：云端不可用时自动接手文字排课 / 一句话添加
js/ai.js          ✨ AI 添加：一句话 / 语音 → 活动、作业；课表照片 → 固定课程（先预览，确认后才写入）
js/share.js       分享课表（链接 + 二维码）、导出 .ics、打开分享链接时导入
js/stats.js       统计页（Chart.js）
js/app.js         启动与导航（底部标签栏）
sw.js             通知用的 service worker
api/plan.js       后端：把课表交给 Gemini 重排（Vercel Serverless，已开 CORS）
api/ai.js         后端：AI 添加（文字解析 / 课表照片识别），输出逐项校验后才返回
supabase/schema.sql   Supabase 建表 + 行级安全（RLS）+ 附件存储桶，运行一次
scripts/build-www.mjs 打包手机 App 前生成 www/（库换成本地文件）
capacitor.config.json / package.json   手机 App 打包用
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

**部署后先打开 设置 页，最下面“开源库”一行会显示每个库 ✓ / ✗。** 有 ✗ 说明那个 CDN 链接没加载到（版本号或路径不对、或网络问题），去 index.html 改成能用的版本即可。

## 部署（免费）
1. https://aistudio.google.com 申请 Gemini API Key。
2. 把整个文件夹传到 GitHub 仓库（保持结构）→ https://vercel.com 导入，环境变量：`GEMINI_API_KEY`（必填）、`GEMINI_MODEL`（可选，默认 `gemini-3.5-flash-lite`；拍照识别需要支持图片输入的模型）。
3. **云同步（可选）**：
   1. https://supabase.com 新建项目。
   2. SQL Editor 里把 `supabase/schema.sql` 整段运行一次。
   3. Project Settings → API，把 **Project URL** 和 **anon public key** 填进 `js/config.js`（anon key 是公开的，安全靠 RLS；**绝不要**填 service_role key）。
   4. Authentication → URL Configuration：Site URL 填你的 Vercel 网址。想免邮件确认，可在 Providers → Email 里关掉 “Confirm email”。
   5. 重新部署，设置页 → “账号与云同步”注册 / 登录。第一次在新设备登录时，如果云端和本机都有数据，会让你选“用云端”还是“用本机”。
4. 手机打开网址 →“添加到主屏幕”。

## v6.3：桌面小组件 + Lucide 图标
- **Android 桌面小组件**（`native/android-widget/`，用 Android 自带 `AppWidgetProvider` + Capacitor 官方 Preferences 插件）：显示今天还没结束的 5 项，今天没了显示明天；点一下打开 App。数据由 `js/widget.js` 写入，数据变化 / 进出后台时立刻刷新，系统每 30 分钟也会刷新。**原生代码没有在 Android Studio 里编译过**（我只用假的 Android 类让 javac 检查了语法和类型），第一次加进工程如果报错，把报错发给我。安装步骤见该文件夹的 README。没用 Jetpack Glance，是因为 Capacitor 默认工程没有 Kotlin / Compose，加进去要改很多 Gradle 配置，出错风险更大。
- **Lucide**（ISC，固定 0.263.1）：底部标签栏、≡ 菜单、更多页的 emoji 换成统一线条图标；库没加载到或找不到某个图标时保留 emoji。设置页“开源库”行会显示 Lucide ✓ / ✗。
- 打包手机 App 多装一个：`npm i @capacitor/preferences`，`npm i -D lucide`。

## v6.2：两个开源库
- **FullCalendar**（MIT，`index.global.min.js`，固定 6.1.15）：周视图改成连续时间轴 + 当前时间红线，固定课程按真实分钟显示（如 08:00–08:45）。点事件 / 空白处仍打开原来的编辑页。设置 → 外观与日历 里可关掉；库没加载到时自动退回方块网格。手动活动目前仍按整点（分钟级是下一步）。
- **Workbox**（Apache-2.0，从 Google CDN 载入）：`sw.js` 里做离线缓存（页面 / 脚本 / 样式 / 图片先用缓存、后台更新，`/api/` 不缓存）。加上 `manifest.json` 与 `icons/`，Android Chrome 可以“安装应用”。
- 打包手机 App：`npm i -D fullcalendar` 后再 `npm run build:www`（脚本已加入 fullcalendar，并会复制 manifest 与 icons）。
- 这次没法联网，**FullCalendar / Workbox 本身没有在真实 CDN 上跑过**；我用模拟库验证了事件映射、点击、隐藏周末和出错退回。首次部署后请看一眼：设置页“开源库”那一行里 FullCalendar 应显示 ✓。

## v6.1：全屏编辑页 + ≡ 菜单（参考 Smart Timetable）
- **≡ 左侧菜单**：点左上角三条横线（或从屏幕左边缘向右划）展开，分组卡片：学习 / 运动 / 统计、固定课表 / 拍照导入 / 我的课表、分享与导出、外观 / 假期、云同步 / 备份。点一行只打开设置里对应的那一个分区（不再是一整页长设置）。
- **全屏编辑页**：新增活动、添加 / 修改课程都改成全屏分组卡片（顶部 ✕ 与「保存」）。课程新增：**楼栋、链接、文件、学期起止日期**（留空 = 不限）、**模板**（把一节课存成模板，下次一键套用）。文件沿用作业附件的存储（本机 IndexedDB，登录云同步后上传）。
- 选型：Material Web Components 已进入维护模式（Google 不再加新功能）；Ionic / Framework7 要整体改写成它们的组件体系，对这个无构建的纯 JS 项目太重。所以菜单和编辑页用原生 CSS/JS 实现（图标用 Material 的 ≡ 和 ✕ SVG，Apache-2.0；其余用 emoji）。

## v6：免 key 的内置 AI 备用
- 云端 AI（Vercel + Gemini）失败时（没部署、没 key、超额、断网），App 会自动改在本机跑小模型：免 key、免额度、数据不出设备。
- 顺序：云端 Gemini → 本机小模型 → 原来的本地规则。本机模型的结果同样会被校验，不合格就退回本地规则。
- 本机有两种引擎，自动选：
  1. **Chrome 自带 Gemini Nano**（Prompt API）：已经装好时优先用，最快。要在 `chrome://flags` 打开 “Prompt API for Gemini Nano”。
  2. **WebLLM**（Qwen2.5-1.5B，约 1 GB，跑在 WebGPU 上）：Chrome / Edge 桌面版和较新的安卓 Chrome 都可以。第一次会先询问再下载，之后缓存在浏览器里可离线用。库从 jsDelivr 载入（`js/localai.js` 顶部可改版本 / 模型）。
- 只管文字（整周重排、一句话添加）；📷 拍照识别仍需要云端。
- 没有 WebGPU 的浏览器（部分 iOS / Firefox）会自动跳过。模型较小，排得复杂时可能不如云端准，也比较耗电 / 内存。
- 默认云端模型改为 `gemini-3.5-flash-lite`（`GEMINI_MODEL` 可覆盖；`GEMINI_THINKING` 可填 minimal / medium / high）。

## 新功能（v4–v5）
- **日视图**：打开就是当天列表 + 倒计时；右上角「日 / 周」可切回原来的 7 列格子。左右滑动换天，右下角 ＋ 手动添加，✨ 用 AI 添加。
- **✨ AI 添加**：说 / 打一句话（如“下周三下午三点数学补习，每周重复”）→ 预览 → 勾选 → 加入。设置 → 固定课表 → 「📷 拍照导入课表」可以拍课表照片识别。AI 只解析，**不会直接改数据**；没部署后端时这个功能不可用，手动添加照常。
  - 语音用浏览器自带的 Web Speech API；手机 App（WebView）里通常不支持，按钮会自动隐藏。
  - 活动时间只支持整点，AI 会把分钟四舍五入。
  - 图片在浏览器里先压到最长边 1600px 再上传（Vercel 请求体上限约 4.5MB）。
- **分享与导出**（设置页）：分享 = 固定课程压成链接 / 二维码，对方打开后导入为一个**新课表**，不改动对方现有课表。导出 .ics 时固定课程和重复活动写成重复规则；**假期不会被排除**，单双周课程按“第几周”各写一条。
- **统计**（更多 → 统计）。

## 云同步怎么工作（要知道的限制）
- 本机每个 `mochi-*` 键对应云端一行，**按键、最后修改者赢**。`mochi-wk` 是“所有周”存成一个键，所以**两台设备同时改课表，后保存的那台会覆盖另一台**（不会合并到格子级别）。平时一台一台用没问题。
- 附件文件上传到私有存储桶 `hw-files`（路径 `用户id/文件id`），只有本人能读写。附件清单跟着作业数据同步；换设备点开附件时才下载。
- 退出登录时可选择是否清除本机数据（公用电脑建议清除）。
- “导出备份”只包含文字数据，**不含附件文件**（附件靠云同步）。

## 复杂重复与假期
- 新增 / 修改活动 → “重复”里选 **每月第 N 个周几** 或 **每月最后一个周几**（N 按你点的那天算）。
- 设置 → **假期**：加入起止日期。重复活动勾上“假期里不出现”就会自动跳过；另有开关可在假期里隐藏固定课表。
- 旧的重复活动不受影响（不会被自动排除假期，需要的话打开活动勾选）。

## 手机 App（Capacitor）
需要电脑上装 Node.js；Android 要 Android Studio，iOS 要 Mac + Xcode + 开发者账号。
```bash
npm init -y   # 如果还没有 package.json 就跳过（项目里已带）
npm i @capacitor/core @capacitor/local-notifications @capacitor/preferences
npm i -D @capacitor/cli @capacitor/android @capacitor/ios dayjs rrule ts-fsrs dexie @supabase/supabase-js chart.js lz-string qrcode-generator fullcalendar lucide
npx cap add android      # 或 npx cap add ios
# 在 js/config.js 里填 apiBase = 你的 Vercel 网址（App 里没有同域后端）
npm run android          # 生成 www/ → cap sync → 打开 Android Studio（iOS 用 npm run ios）
```
- 提醒用**系统本地通知**：每次数据变化 / 回到前台，会把未来 7 天的提醒、活动、课程重新排进系统队列，App 关掉也会响，**不需要自己的推送服务器**。iOS 最多排 64 条，所以只排最近的 60 条。
- Android 12+ 的“精确闹钟”权限、国产手机的“自启动 / 电池优化”可能影响准时性，需要在系统里放行。
- 真正的服务器推送（别人给你发消息那种）需要 FCM / APNs，这里没做，也用不上。
- `build-www.mjs` 找不到某个库文件时会告诉你缺哪个包；库的 dist 路径若因版本不同而变，改脚本顶部的 `LIBS` 表即可。

## 数据存放（localStorage，key 都以 mochi- 开头）
- `mochi-set` 设置、`mochi-tts` 课表列表、`mochi-hol` 假期
- 每个课表各有：`mochi-wk`、`mochi-fx`、`mochi-rp`、`mochi-hw`、`mochi-dn`；第一个课表“学校”沿用旧 key，其余末尾加 `-课表id`
- 学习章节在 `mochi-st`；FSRS 的记忆状态存在每个章节的 `fc` 字段里
- `mochi-sync-*` 是同步内部状态，不会被同步，也不进备份
- 附件文件在 IndexedDB 库 `mochi-files`

## 注意
- Key 只放 Vercel 环境变量，不要写进前端文件（Supabase 的 anon key 除外，它本来就是公开的）。
- 后端没部署或 AI 出错时，页面自动退回本地规则排程。
