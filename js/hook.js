// 必须最先加载：监听 localStorage 里 mochi-* 的写入。云同步、手机通知都靠它，其他文件不用改。
(function(){
  var ls=[],_s=Storage.prototype.setItem,_r=Storage.prototype.removeItem;
  function fire(k,del){if(String(k).indexOf('mochi-')!==0)return;ls.forEach(function(f){try{f(String(k),del)}catch(e){}})}
  Storage.prototype.setItem=function(k,v){_s.call(this,k,v);if(this===window.localStorage)fire(k,false)};
  Storage.prototype.removeItem=function(k){_r.call(this,k);if(this===window.localStorage)fire(k,true)};
  // raw：绕过监听直接读写（云端数据写回本机时用，避免又被当成“本机修改”）
  window.MOCHI_HOOK={on:function(f){ls.push(f)},raw:{set:function(k,v){_s.call(localStorage,k,v)},del:function(k){_r.call(localStorage,k)}}};
})();
