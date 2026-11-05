// 把 android-widget/ 里的桌面小组件装进 Capacitor 生成的 android/ 工程。幂等：重复运行不会重复写入。
// 用法：npm i → npm run build:www → npx cap add android → npm run android:widget → npx cap sync → 用 Android Studio 打开 android/ 运行
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';

if (!existsSync('android/app/src/main')) { console.error('找不到 android/ 工程。请先运行：npx cap add android'); process.exit(1); }
const cfg = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
const pkg = cfg.appId, main = 'android/app/src/main';
const jdir = join(main, 'java', ...pkg.split('.'));
mkdirSync(jdir, { recursive: true });

for (const f of ['MochiWidgetPlugin.java', 'MochiWidgetProvider.java', 'MainActivity.java']) {
  const target = join(jdir, f);
  if (f === 'MainActivity.java' && existsSync(target)) {
    const cur = readFileSync(target, 'utf8');
    if (!/registerPlugin\(\s*MochiWidgetPlugin/.test(cur)) {
      if (/extends\s+BridgeActivity\s*\{\s*\}/.test(cur)) { /* Capacitor 默认的空 MainActivity：直接替换 */ }
      else { console.warn(`⚠️ ${target} 已被你改过：请手动在 onCreate 里、super.onCreate 之前加一行 registerPlugin(MochiWidgetPlugin.class);`); continue; }
    } else continue;
  }
  writeFileSync(target, readFileSync(join('android-widget/java', f), 'utf8').replaceAll('__PKG__', pkg));
}
cpSync('android-widget/res', join(main, 'res'), { recursive: true });

const mf = join(main, 'AndroidManifest.xml');
let xml = readFileSync(mf, 'utf8');
if (!xml.includes('MochiWidgetProvider')) {
  const rcv = `
        <receiver android:name=".MochiWidgetProvider" android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="${pkg}.WIDGET_TICK" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/mochi_widget_info" />
        </receiver>
`;
  xml = xml.replace('</application>', rcv + '    </application>');
  writeFileSync(mf, xml);
}
console.log('桌面小组件已装入 android/。接着：npx cap sync，再用 Android Studio 运行；长按桌面 → 小组件 → Mochi。');
