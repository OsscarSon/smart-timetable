// Service worker：① 系统通知点击；② 开源库 Workbox（Apache-2.0）做离线缓存。
// Workbox 从 Google 的 CDN 载入；载入失败时只保留通知功能，不影响使用。
try{
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');
  if(self.workbox){
    workbox.core.setCacheNameDetails({prefix:'mochi'});
    // 页面 / 脚本 / 样式：联网时永远取最新（避免新旧文件混在一起），断网才用缓存。
    // 图片 / 字体 / manifest：先用缓存、后台更新。后端接口 /api/ 不缓存。
    var ok=new workbox.cacheableResponse.CacheableResponsePlugin({statuses:[0,200]});
    workbox.routing.registerRoute(function(c){
      return c.request.method==='GET'&&!/\/api\//.test(c.url.pathname)&&['document','script','style'].indexOf(c.request.destination)>=0},
      new workbox.strategies.NetworkFirst({cacheName:'mochi-pages-v65',networkTimeoutSeconds:4,plugins:[ok]}));
    workbox.routing.registerRoute(function(c){
      return c.request.method==='GET'&&!/\/api\//.test(c.url.pathname)&&['image','font','manifest'].indexOf(c.request.destination)>=0},
      new workbox.strategies.StaleWhileRevalidate({cacheName:'mochi-assets-v65',plugins:[ok,
        new workbox.expiration.ExpirationPlugin({maxEntries:60,maxAgeSeconds:30*24*3600})]}));
  }
}catch(e){}
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^mochi-static/.test(k)}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(function(l){return l.length?l[0].focus():clients.openWindow('./')}))});
