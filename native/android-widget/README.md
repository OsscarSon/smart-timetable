# Mochi Android 桌面小组件（今日课表）

显示“今天还没结束的 5 项”，今天没有了就显示明天；点小组件打开 App。数据来自 App（网页端 `js/widget.js` 写入），小组件本身不联网。
用的是 Android 自带的 `AppWidgetProvider`（AOSP，Apache-2.0）+ Capacitor 官方 Preferences 插件（MIT），**不用改 Gradle、不用 Kotlin / Compose**。

> ⚠️ 这部分原生代码我没有在真机或 Android Studio 里编译过（环境里没有 Android SDK）。第一次加进去如果编译报错，把报错原文发给我就能改。

## 加进你的 Android 工程（`npx cap add android` 之后）
1. 装插件：`npm i @capacitor/preferences`，然后 `npm run sync`。
2. 把本文件夹里的文件复制到 `android/app/src/main/`：
   - `java/*.java` → `java/app/mochi/timetable/`（按你的 appId 的路径；如果包名不是 `app.mochi.timetable`，两个 java 文件第一行要一起改）
   - `res/` 里的 `layout`、`drawable`、`xml`、`values` 文件 → `res/` 对应文件夹（`values/` 里的两个文件是新文件，不会覆盖原来的）
3. 打开 `android/app/src/main/AndroidManifest.xml`，在 `<application>` 里加：
   ```xml
   <receiver android:name=".MochiWidgetProvider" android:exported="true" android:label="Mochi 今日课表">
       <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
       <meta-data android:name="android.appwidget.provider" android:resource="@xml/mochi_widget_info" />
   </receiver>
   ```
4. 打开 `MainActivity.java`，注册插件（要放在 `super.onCreate` 之前）：
   ```java
   import android.os.Bundle;
   public class MainActivity extends BridgeActivity {
       @Override public void onCreate(Bundle savedInstanceState) {
           registerPlugin(MochiWidgetPlugin.class);
           super.onCreate(savedInstanceState);
       }
   }
   ```
5. 运行 App → 长按桌面 → 小组件 → 找 “Mochi 今日课表”拖出来。先在 App 里打开一次，小组件才有数据。

## 它怎么更新
- 每次课表数据变化、App 退到后台 / 回到前台，`js/widget.js` 会把今天、明天、后天的安排写进 SharedPreferences 并立刻刷新小组件。
- 另外系统每 30 分钟也会自动刷新一次（`updatePeriodMillis`），所以过了下课时间，已结束的项目会自己消失。
