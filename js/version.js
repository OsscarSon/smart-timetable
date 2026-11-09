// 版本号的唯一来源。菜单底部、常见问题、评分统计都读 window.MOCHI_VERSION，不要在别处再写死版本号。
// 发新版时要同步三处：这里、package.json 的 version、sw.js 的 VER（mochi-v9-0-0）；`npm run check` 会检查它们是否一致。
// 打包 Android 时还要手动改 android/app/build.gradle 的 versionName / versionCode（Capacitor 不会读 package.json）。
window.MOCHI_VERSION = '9.8.3';
