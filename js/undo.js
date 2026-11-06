// 撤销：在“批量写入”（AI 助手改动、导入日历、AI 添加）之前拍一张快照，之后弹出一条带「撤销」的提示。
// 快照 = 当前课表的 全部周的活动 + 重复 / 作业 / 固定课 / 完成记录 + 假期，原样（字符串）存起来；撤销 = 写回去再刷新页面，最稳妥。
var Undo=(function(){
  function keys(){return [K_RP,K_HW,K_FX,K_DN,'mochi-hol'].concat(weekKeysOf(TT.id))}   // v7：活动按周分键存储
  function snap(){var s={};keys().forEach(function(k){s[k]=localStorage.getItem(k)});return s}
  function restore(s){
    weekKeysOf(TT.id).forEach(function(k){if(!(k in s))localStorage.removeItem(k)});   // 撤销后不该存在的周
    Object.keys(s).forEach(function(k){if(s[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,s[k])})}
  var bar=null,tm=null;
  function hide(){if(bar){bar.remove();bar=null}clearTimeout(tm)}
  function toast(msg,s){
    hide();bar=el('div','undo');bar.setAttribute('role','status');
    bar.appendChild(el('span',null,msg));
    var b=el('button',null,'撤销');b.onclick=function(){restore(s);location.reload()};bar.appendChild(b);
    var x=el('button','x','✕');x.setAttribute('aria-label','关闭');x.onclick=hide;bar.appendChild(x);
    document.body.appendChild(bar);tm=setTimeout(hide,15000)}
  return {snap:snap,toast:toast,restore:restore}
})();
