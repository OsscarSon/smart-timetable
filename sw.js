// Service Worker：让网页版能离线打开，并负责通知点击。
// 策略：本站文件 = 先给缓存、后台更新（下次打开就是新版）；CDN 脚本 / 字体 = 缓存优先；/api/ 一律走网络，绝不缓存。
const VER = 'mochi-v8-2';
const SHELL = ['./', 'index.html', 'manifest.json', 'css/style.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ...['hook', 'config', 'install', 'lang-ui', 'lang-msg', 'lang-static', 'i18n', 'sync', 'aisrc', 'api', 'core', 'dates', 'theme', 'recur', 'srs', 'timetable', 'dayview', 'localai', 'icons', 'log', 'study', 'sport', 'remind', 'store', 'hw',
      'lessons', 'settings', 'wizard', 'holidays', 'account', 'ai', 'share', 'stats', 'notifyset', 'notify', 'native', 'syscal', 'sched', 'undo', 'agent', 'icsimport', 'search', 'rough', 'about', 'app', 'menu', 'lang-new', 'wallpaper', 'langrow'].map(n => 'js/' + n + '.js')];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.pathname.startsWith('/api/') || u.protocol.indexOf('http') !== 0) return;
  const same = u.origin === self.location.origin;
  const cdn = /(^|\.)(jsdelivr\.net|googleapis\.com|gstatic\.com)$/.test(u.hostname);
  if (!same && !cdn) return;
  if (cdn) {   // 缓存优先
    e.respondWith(caches.open(VER).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }))));
    return;
  }
  e.respondWith(caches.open(VER).then(c => c.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});
