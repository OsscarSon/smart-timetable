# 🐱 Mochi 智能时间表

## 文件结构
```
index.html        页面骨架
css/style.css     样式
js/core.js        共用常量、设置、真实日期工具、多课表数据加载
js/theme.js       亮色/暗色/跟随系统 + 主题色
js/recur.js       重复活动与固定课程（多周循环）展开成当周占位
js/srs.js         间隔复习算法（之后可换成 ts-fsrs）
js/timetable.js   课表网格 + 新增/修改/移动
js/log.js         记录（逐条）+ 调用 AI 重排（失败则用本地规则）
js/study.js       学习：章节、考试日期、排程
js/sport.js       运动：现状/目标、训练排程
js/remind.js      提醒、清单、顶部提示
js/hw.js          作业页：按日期分组、科目标签、搜索筛选、链接
js/lessons.js     固定课表：节次模板、课程（教室/老师/类型/多周循环）
js/settings.js    设置：外观、日历、多课表与归档、备份/导入
js/wizard.js      首次向导（全新用户自动弹出，设置里可重新运行）
js/notify.js      网页打开时的通知（提醒 + 活动开始前）
sw.js             通知用的 service worker
vercel.json       让后端最多运行 60 秒
js/app.js         启动与导航
api/plan.js       后端：把课表交给 Gemini 重排（Vercel Serverless）
```
脚本加载顺序见 index.html 底部（core → theme → recur → srs → timetable → log → study → sport → remind → hw → lessons → settings → wizard → notify → app），不要打乱。

## 部署（免费）
1. https://aistudio.google.com 申请 Gemini API Key。
2. 把整个文件夹内容上传到一个 GitHub 仓库（保持文件夹结构）。
3. https://vercel.com 用 GitHub 登录 → Add New Project → 选仓库，环境变量添加：
   - `GEMINI_API_KEY` = 你的 key
   - `GEMINI_MODEL` = 可选，默认 `gemini-2.5-flash-lite`（免费额度以 AI Studio 显示为准）
4. Deploy 后用手机打开网址 →“添加到主屏幕”。

## 数据存放（localStorage，key 都以 mochi- 开头，备份会全部带上）
- `mochi-set` 设置（一周起始日、隐藏周末、24 小时制、主题、主题色）
- `mochi-tts` 课表列表（名称、归档、节次模板、循环周数）
- 每个课表各有一份：`mochi-wk`（每周安排）、`mochi-fx`（固定课程）、`mochi-rp`（重复活动）、`mochi-hw`（作业）、`mochi-dn`（完成记录）。第一个课表“学校”沿用旧 key，非首个课表的 key 末尾加 `-课表id`。
- 固定课程按“当天分钟数”存，所以改节次时间不会弄乱已有课程。

## 之后可做
- 账号 + 云同步（Supabase），然后作业附件（照片/文件）放云存储
- `js/srs.js` 换成 ts-fsrs（MIT）
- Capacitor 打包成手机 App + 本地推送通知
- AI 根据笔记出练习题

## 注意
- Key 只放 Vercel 环境变量，不要写进前端文件。
- 后端没部署或 AI 出错时，页面自动退回本地规则排程。
- 数据暂存在浏览器 localStorage，换手机/清缓存会丢，之后可接 Supabase。
