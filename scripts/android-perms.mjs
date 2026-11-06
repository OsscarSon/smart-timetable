// 给 android/ 的 AndroidManifest.xml 补上语音输入和日历同步要用的权限 / 查询声明。幂等：重复运行不会重复写入。
// 由 npm run android:setup 自动调用；也可以单独运行：node scripts/android-perms.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const mf = 'android/app/src/main/AndroidManifest.xml';
if (!existsSync(mf)) { console.error('找不到 android/ 工程。请先运行：npx cap add android'); process.exit(1); }
let xml = readFileSync(mf, 'utf8'), added = [];
const perms = ['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR', 'android.permission.RECORD_AUDIO'];
const need = perms.filter(p => !xml.includes(`android:name="${p}"`));
if (need.length) {
  xml = xml.replace('</manifest>', need.map(p => `    <uses-permission android:name="${p}" />\n`).join('') + '</manifest>');
  added.push(...need.map(p => p.split('.').pop()));
}
if (!xml.includes('android.speech.RecognitionService')) {   // Android 11+ 要声明才能调用系统语音识别
  const q = `    <queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.speech.action.RECOGNIZE_SPEECH" /></intent>\n    </queries>\n`;
  xml = xml.includes('<queries>') ? xml.replace('<queries>', '<queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.speech.action.RECOGNIZE_SPEECH" /></intent>') : xml.replace('<application', q + '    <application');
  added.push('queries(语音识别)');
}
if (added.length) writeFileSync(mf, xml);
console.log(added.length ? '已补上：' + added.join('、') : '权限已经齐了，没有改动。');
