// 撤销：在“批量写入”（AI 助手改动、导入日历、AI 添加）之前拍一张快照，之后弹出一条带「撤销」的提示。
// 快照 = 当前课表相关键 + 假期，原样（字符串）存起来；撤销 = 写回去再刷新页面，最稳妥。
// v8：适配 v7.1 的按周存储（mochi-wk:<id>:<w>）与分钟制。
var Undo=(function(){
  function keys(){
    var ks=[K_RP,K_HW,K_FX,K_DN,'mochi-hol'];
    if(typeof weekKeysOf==='function' && window.TT) ks=ks.concat(weekKeysOf(TT.id));
    else if(typeof K_WK!=='undefined') ks.push(K_WK);
    return ks;
  }
  function snap(){var s={};keys().forEach(function(k){s[k]=localStorage.getItem(k)});return s}
  function restore(s){Object.keys(s).forEach(function(k){if(s[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,s[k])})}
  var bar=null,tm=null;
  function hide(){if(bar){bar.remove();bar=null}clearTimeout(tm)}
  function toast(msg,s){
    hide();bar=el('div','undo');bar.setAttribute('role','status');
    bar.appendChild(el('span',null,msg||'已应用更改'));
    var b=el('button',null,'撤销');b.onclick=function(){restore(s);location.reload()};bar.appendChild(b);
    var x=el('button','x','✕');x.setAttribute('aria-label','关闭');x.onclick=hide;bar.appendChild(x);
    document.body.appendChild(bar);tm=setTimeout(hide,15000)}
  return {snap:snap,toast:toast,restore:restore}
})();
