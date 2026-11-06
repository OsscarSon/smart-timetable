// 一条命令做完安卓打包前的准备：npm run android:setup
// 依次：装依赖 → 生成 www/（并把后端网址写进去）→ 第一次创建 android/ 工程 → 装桌面小组件 → 同步。
// 之后的“编译成 APK / AAB”这一步要在 Android Studio 里点（见 BUILD-ANDROID.md）。
// 可选：npm run android:setup -- --api=https://你的网址
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const arg = process.argv.find(a => a.startsWith('--api='));
const API = (arg ? arg.slice(6) : process.env.MOCHI_API_BASE || 'https://smart-timetable-kappa.vercel.app').replace(/\/$/, '');
const major = +process.versions.node.split('.')[0];
if (major < 20) { console.error(`Node.js 版本太旧（${process.versions.node}）。Capacitor 7 需要 Node 20 或更新：https://nodejs.org`); process.exit(1); }
if (!existsSync('package.json') || !existsSync('index.html')) { console.error('请在 smart-timetable-main 文件夹里运行这条命令。'); process.exit(1); }

const run = c => { console.log('\n▶ ' + c); execSync(c, { stdio: 'inherit', env: { ...process.env, MOCHI_API_BASE: API } }); };
try {
  run('npm install');
  run('node scripts/build-www.mjs');
  if (!existsSync('android')) run('npx cap add android');
  run('node scripts/android-widget.mjs');
  run('node scripts/android-perms.mjs');
  run('npx cap sync android');
} catch (e) { console.error('\n✗ 上面某一步失败了，把那一段红字发给我。'); process.exit(1); }

console.log(`\n✓ 准备好了（App 会连到 ${API}）。\n下一步：npx cap open android → 等 Gradle 同步完 → Build 菜单 → Build APK(s)。详细步骤见 BUILD-ANDROID.md。`);
