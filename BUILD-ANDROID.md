# 打成安卓 App（给朋友装）

整个过程大约 30–60 分钟，主要时间花在第一次下载 Android Studio 和 Gradle。**只做一次**；以后改了代码，只要重跑第 2 步和第 4 步。

## 1. 先装好三样东西（一次性）
1. **Node.js 20 以上**：https://nodejs.org（装 LTS 版）
2. **Android Studio**：https://developer.android.com/studio ，第一次打开按提示把 SDK 装完。
3. 一台安卓手机：设置里打开「开发者选项 → USB 调试」；或者用 Android Studio 自带的模拟器。

## 2. 一条命令做准备
在这个文件夹（smart-timetable-main）里打开终端：

```bash
npm run android:setup
```

它会依次：装依赖 → 生成 `www/`（字体和库换成本地文件）→ 第一次创建 `android/` 工程 → 装桌面小组件 → 同步。
App 连的后端默认是 `https://smart-timetable-kappa.vercel.app`；要换成别的网址：
`npm run android:setup -- --api=https://你的网址`

## 3. 用 Android Studio 打开
```bash
npx cap open android
```
等右下角的 Gradle 同步跑完（第一次会下载很多东西）。**如果红字报错，把完整报错发给我**——这个工程里的小组件代码还没有编译过，出错很正常。

## 4. 出安装包
- **自己手机试：** 手机连电脑，顶部选好设备，点绿色三角形运行。
- **发给朋友（APK）：** 菜单 Build → Build Bundle(s) / APK(s) → Build APK(s)，完成后点右下角 locate，把 `app-debug.apk` 发给朋友。朋友手机要允许「安装未知来源的应用」。
- **上架 Google Play（AAB）：** Build → Generate Signed Bundle。**签名密钥（.jks）一定要备份好，丢了就没法更新这个 App。**

## 5. 装好后检查
0. （新）**语音输入**：AI 助手 → 🎤 语音，应该弹出系统的语音识别窗口；**手机日历**：设置 → 数据 → 📲 手机日历，点「写入」后去系统日历看有没有出现。这两项也还没在真机上验证过。
1. 先在 App 里添加几节今天的课。
2. 长按桌面 → 小组件 → Mochi，拖出来，看有没有显示。
3. 设置 → 通知与提醒 → 发一条测试通知；再点「检查精确闹钟」。
4. 拍照导入 / 问问 Mochi 需要登录账号（或在设置里填自己的 Gemini key）。

## 常见问题
- **`npm run android:setup` 报 Node 版本太旧：** 去 nodejs.org 装新版。
- **提示 MainActivity.java 被改过：** 按提示手动在 `super.onCreate` 之前加一行 `registerPlugin(MochiWidgetPlugin.class);`。
- **App 里 AI / 同步连不上：** 多半是后端网址没写进去。确认 `www/js/config.js` 里的 `apiBase` 不是空的。
- **朋友装的 APK 不会自动更新：** 改了代码要重新打包再发一次。
