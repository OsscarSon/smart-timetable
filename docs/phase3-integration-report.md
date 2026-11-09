# Phase 3 集成报告（v9.6 → v9.7.0）

## 测试结果（本机，Playwright + Chromium，固定时钟 2026-11-09）
| 套件 | 结果 |
|---|---|
| `scripts/check.mjs`（含新增的 Study Space 边界检查） | 通过 |
| `tests/study-space-unit.cjs`（聚合层，新） | 27/27 |
| `tests/study-space-smoke.cjs`（浏览器，新，含 SW 离线重载） | 75/75 |
| `tests/goals-sync-regress.cjs`（Goals 同步回归，新） | 25/25 |
| 原有：goals-unit 17 · goals-plan-unit 31 · wrapped-stats 19 · goals-smoke 36 · goals-plan-smoke 65 · goals-sync-smoke 17 · buddy 49 · about 63 · empty 44 · wrapped2 24 | 全部通过 |

## 与交接文档不一致、按真实代码处理的地方
- 函数名是 `openHw()` / `rHw()`（不是 `openHW` / `rHW`）；作业保存逻辑是 `hw.js` 里的内联处理，没有可复用的函数，所以“新作业 / 编辑”打开原编辑框，“勾选完成”用 `hwSave()` 复刻原来的三行。
- 文案：Study Space 用自己的三语字典 `SS_I18N`（和 Goals 的做法一致），少数写在 `index.html` / `app.js` / `menu.js` 里的中文原文用现有 i18n 条目翻译。
- 样式：没有照搬设计稿的字体和固定颜色，而是用 `style.css` 现有主题变量（`--card / --ink / --pri / --pink …`）调出同样的奶油 / 蜜桃 / 薰衣草 / 鼠尾草气质，所以深色模式、主题色自动跟随。设计稿里的 Google 字体没有引入。
- 设计稿里的“Learning progress 42%”没有真实数据来源，改成“已开始的章节 / 全部章节”，不编造掌握度。
- 设计稿里的“Reviews”页是总览；实现为工作台里的“复习队列”（评分仍走 `srsRate`），完整复习界面仍是原来的“复习计划”页。
- 设计稿里的 Focus Mode 没有做（文档允许只放“即将推出”提示，我选择完全不放，避免出现不能用的入口）。

## 没有做 / 没法验证的
- 没有在真机（Android / iOS）上测过；安全区域依赖原有 `.app` 的底部留白，在 Chromium 里测了 360 / 390 / 768 / 1280 宽度无横向滚动。
- 测试环境里 CDN 被阻断，Lucide 图标没加载，界面显示的是 emoji；联网时 `icons.js` 会把 emoji 换成图标，这个路径没有逐像素检查。
- 截图（`docs/phase3-screenshots/`）是实现的实际渲染，没有和设计稿做像素对比；是否符合你的视觉预期请你确认。
- 没有测真实 Supabase；Study Space 不新增任何同步键。
- 安卓返回键：原应用没有按视图处理返回键，Study Space 也没有新增。

## 发现但没有处理的原有问题
- `HW` 数组里如果出现 `null` / 非对象条目，原有的 `notifyset.js`（`buildAlarms`）会在启动时抛错，整个页面起不来。这是 Phase 3 之前就存在的脆弱点，不是本次引入；Study Space 自己对这类数据是容错的。真实使用中不太会出现，如需加固建议单独处理。
- 超长科目名 + 另一个同样前 12 字的科目会让作业归属有歧义（此时作业保留为未归属，不会错归）。

## 同步回归测试的结论
见 `docs/v9.7-study-space.md` 第一节：现有同步实现行为符合预期，未改动 `sync.js` / `hook.js` / `goals-plan.js`。
