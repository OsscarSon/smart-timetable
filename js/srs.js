// 间隔复习：优先用 ts-fsrs（FSRS 算法，MIT），没加载到时退回下面的简易算法。
// 每个章节 t 仍保留 t.iv（间隔天数）和 t.nx（下次复习日 dayNum），排程代码不用改；
// FSRS 的记忆状态存在 t.fc 里（稳定度、难度、复习次数…）。
var FS=(function(){
  var L=window.FSRS||window.tsfsrs||window['ts-fsrs'];
  if(!L||!L.FSRS||!L.createEmptyCard)return null;
  try{return {L:L,f:new L.FSRS(L.generatorParameters({enable_fuzz:false,enable_short_term:false}))}}catch(e){return null}
})();
// 简易算法。iv：目前间隔(天)；g：0忘了 1模糊 2记得；D：距离考试的天数（没有则为 null）
function nextInterval(iv,g,D){
  var n=g===0?1:g===1?Math.max(2,Math.round(iv*1.3)):(iv<1?1:iv===1?3:Math.round(iv*2.3));
  return examCap(n,D);
}
function examCap(n,D){
  if(D!==null&&D>1)n=Math.min(n,D-1);
  if(D!==null&&D<=1)n=1;
  return n;
}
function fcThaw(c){var o={};for(var k in c)o[k]=c[k];if(o.due)o.due=new Date(o.due);if(o.last_review)o.last_review=new Date(o.last_review);return o}
function fcSeed(t,now){ // 旧数据（只有 iv/nx）转成 FSRS 卡片，复习历史不会丢
  var L=FS.L,c=L.createEmptyCard(now),iv=Math.max(1,t.iv);
  c.state=L.State.Review;c.stability=iv;c.difficulty=5;c.reps=1;c.lapses=0;
  c.scheduled_days=iv;c.elapsed_days=iv;c.last_review=new Date(now.getTime()-iv*864e5);c.due=now;return c}
// 评分：g 0忘了 1模糊 2记得；D 距考试天数；today 今天的 dayNum。结果写回 t.iv / t.nx / t.fc
function srsRate(t,g,D,today){
  if(!FS){t.iv=nextInterval(t.iv,g,D);t.nx=today+t.iv;return}
  var L=FS.L,now=new Date(),card=t.fc?fcThaw(t.fc):(t.iv>0?fcSeed(t,now):L.createEmptyCard(now));
  var rating=[L.Rating.Again,L.Rating.Hard,L.Rating.Good][g],res;
  try{res=FS.f.next?FS.f.next(card,now,rating):FS.f.repeat(card,now)[rating]}
  catch(e){t.iv=nextInterval(t.iv,g,D);t.nx=today+t.iv;return}
  var c=res.card,iv=Math.max(1,Math.round(c.scheduled_days||0),Math.round((new Date(c.due)-now)/864e5));
  iv=examCap(iv,D);
  t.fc=JSON.parse(JSON.stringify(c));t.iv=iv;t.nx=today+iv;
}
