// 间隔复习算法。有电脑后可换成 ts-fsrs（保持函数名 nextInterval 不变）。
// iv：目前间隔(天)；g：0忘了 1模糊 2记得；D：距离考试的天数（没有则为 null）
function nextInterval(iv,g,D){
  var n=g===0?1:g===1?Math.max(2,Math.round(iv*1.3)):(iv<1?1:iv===1?3:Math.round(iv*2.3));
  if(D!==null&&D>1)n=Math.min(n,D-1);
  if(D!==null&&D<=1)n=1;
  return n;
}
