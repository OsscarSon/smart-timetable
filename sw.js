// Service worker：① 系统通知点击；② 开源库 Workbox（Apache-2.0）做离线缓存。
// Workbox 从 Google 的 CDN 载入；载入失败时只保留通知功能，不影响使用。
try{
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');
  if(self.workbox){
    workbox.core.setCacheNameDetails({prefix:'mochi'});
    // 页面 / 脚本 / 样式 / 图片 / 字体：先用缓存、后台更新（改了代码下次打开就是新的）。只缓存 GET，后端接口 /api/ 不缓存。
    workbox.routing.registerRoute(function(c){
      return c.request.method==='GET'&&!/\/api\//.test(c.url.pathname)&&['document','script','style','image','font','manifest'].indexOf(c.request.destination)>=0},
      new workbox.strategies.StaleWhileRevalidate({cacheName:'mochi-static',plugins:[
        new workbox.cacheableResponse.CacheableResponsePlugin({statuses:[0,200]}),
        new workbox.expiration.ExpirationPlugin({maxEntries:80,maxAgeSeconds:30*24*3600})]}));
  }
}catch(e){}
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(function(l){return l.length?l[0].focus():clients.openWindow('./')}))});
