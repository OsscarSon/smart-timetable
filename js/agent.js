// 🤖 问问 Mochi：日程助手（工具型 AI）。后端：api/agent.js
// 问空闲 / 安排 / 作业 → 直接回答；要改日程 → AI 只“提出方案”，这里先预览、勾选，点「应用」才写入，并可一键撤销。
// AI 看到的是一份很小的日程快照（今天起 14 天 + 未完成作业，见 sched.js），只能改手动添加的活动和作业；
// 重复活动、固定课程是只读的。
(function(){
  var $=function(i){return document.getElementById(i)},m=$('mask9'),log=$('agl'),inp=$('agq'),sendB=$('ags'),chips=$('agc');
  var H=[],busy=false;
  var SUG=['明天哪段时间有空？','这周哪天最空？','哪些作业快到期了？','帮我把今天没做完的事挪到明天'];

  function dstr(dn){return isoOf(dn)+' 周'+DAYS[dnDate(dn).wd]}
  // v7 起活动按分钟存：开始取 5 的倍数，时长至少 15 分钟
  function span(start,dur){var s=Math.round(start/5)*5,d=Math.max(15,Math.round((dur||60)/5)*5);return {s:s,e:s+d}}

  // ---------- 把一个动作翻译成人话 + 检查能不能执行 ----------
  function describe(a){
    var d={txt:'',warn:'',bad:false},dn,t,x,r;
    function clash(dn,t,skip){
      var C=Sched.dayItems(dn).filter(function(i){return !(skip&&i.ref===skip)&&t.s<i.e&&i.s<t.e})[0];
      return C?'⚠️ 和「'+C.t+'」时间重叠':''}
    function timeErr(dn,t){
      if(dn===null)return '日期不对';
      if(hiddenDay(dnDate(dn).wd))return '那天是隐藏的周末列';
      if(t.s<D0*60||t.e>D1*60)return '时间超出课表显示范围（'+hm(D0)+'–'+hm(D1)+'）';
      return ''}
    if(a.tool==='add_event'){
      dn=dnFromIso(a.date);t=span(a.start,a.dur);
      d.txt='📅 添加 '+(dn===null?a.date:dstr(dn))+' '+tmin(t.s)+'–'+tmin(t.e)+' · '+a.title;
      d.warn=timeErr(dn,t);if(d.warn)d.bad=true;else d.warn=clash(dn,t)}
    else if(a.tool==='move_event'){
      r=Sched.byRef(a.ref);
      if(!r||r.x.t!==a.title){d.txt='🔀 移动「'+a.title+'」';d.bad=true;d.warn='这条安排已经变了，跳过';return d}
      dn=dnFromIso(a.date);t=span(a.start,a.dur||(r.x.e-r.x.s));
      d.txt='🔀 移动「'+r.x.t+'」 '+dstr(dnOf(r.w,r.x.day))+' '+tmin(r.x.s)+' → '+(dn===null?a.date:dstr(dn))+' '+tmin(t.s)+'–'+tmin(t.e);
      d.warn=timeErr(dn,t);if(d.warn)d.bad=true;else d.warn=clash(dn,t,a.ref)}
    else if(a.tool==='delete_event'){
      r=Sched.byRef(a.ref);
      if(!r||r.x.t!==a.title){d.txt='🗑️ 删除「'+a.title+'」';d.bad=true;d.warn='这条安排已经变了，跳过';return d}
      d.txt='🗑️ 删除「'+r.x.t+'」 '+dstr(dnOf(r.w,r.x.day))+' '+tmin(r.x.s)}
    else if(a.tool==='add_homework'){
      d.txt='📝 新作业：'+a.title+(a.subject?'（'+a.subject+'）':'')+(a.due?' · 截止 '+a.due:'')}
    else if(a.tool==='update_homework'){
      x=HW.filter(function(h){return h.id===a.id})[0];
      if(!x){d.txt='📝 作业「'+(a.title||'')+'」';d.bad=true;d.warn='找不到这份作业，跳过';return d}
      d.txt=(a.done===true?'✅ 标记完成：':a.done===false?'↩️ 标记未完成：':'📅 改截止日期：')+x.t+(a.due?' → '+a.due:'')}
    return d}

  // ---------- 真正写入 ----------
  function run(x){
    var a=x.a,dn,t,wd,w;
    if(a.tool==='add_event'){
      dn=dnFromIso(a.date);t=span(a.start,a.dur);wd=dnDate(dn).wd;w=Sched.weekOf(dn);
      (WK[w]=WK[w]||[]).push({day:wd,s:t.s,e:t.e,t:a.title,c:subjCol(a.title)});return true}
    if(a.tool==='move_event'||a.tool==='delete_event'){
      var r=x.r;if(!r||r.x.t!==a.title)return false;
      var ok0=kk(r.x,r.w),flag=DN[ok0];delete DN[ok0];
      var i=r.arr.indexOf(r.x);if(i<0)return false;r.arr.splice(i,1);
      if(a.tool==='delete_event')return true;
      dn=dnFromIso(a.date);t=span(a.start,a.dur||(r.x.e-r.x.s));w=Sched.weekOf(dn);
      r.x.day=dnDate(dn).wd;r.x.s=t.s;r.x.e=t.e;(WK[w]=WK[w]||[]).push(r.x);
      if(flag)DN[kk(r.x,w)]=flag;return true}
    if(a.tool==='add_homework'){HW.push({id:uid(),done:0,ts:Date.now(),t:a.title,sb:a.subject||'',due:a.due||'',note:'',link:''});return true}
    if(a.tool==='update_homework'){
      var h=HW.filter(function(q){return q.id===a.id})[0];if(!h)return false;
      if(a.due)h.due=a.due;if(a.done===true)h.done=Date.now();else if(a.done===false)h.done=0;return true}
    return false}
  function apply(msg){
    var picks=msg.acts.filter(function(x){return x.on&&!x.d.bad});
    if(!picks.length||msg.applied)return;
    picks.forEach(function(x){if(x.a.ref)x.r=Sched.byRef(x.a.ref)});   // 先全部解析成对象，避免前面的删除 / 移动让后面的序号错位
    var snap=Undo.snap(),n=0;
    picks.forEach(function(x){if(run(x))n++});
    WK[curW]=data;Object.keys(WK).forEach(function(w){saveWeek(+w)});   // 可能动了好几周
    put2(K_DN,DN);rpSave();hwSave();if(typeof rHw==='function')rHw();draw();
    msg.applied=n;render();
    Undo.toast('已应用 '+n+' 项改动',snap)}

  // ---------- 界面 ----------
  function bubble(msg){
    var b=el('div','bub '+(msg.role==='user'?'me':'ai')+(msg.err?' err':''));
    b.appendChild(el('div',null,msg.text));
    if(msg.acts&&msg.acts.length){
      var box=el('div','acts-l');
      msg.acts.forEach(function(x){
        var r=el('label','tp ai-it'),cb=el('input');cb.type='checkbox';cb.checked=x.on&&!x.d.bad;cb.disabled=x.d.bad||!!msg.applied;
        cb.onchange=function(){x.on=cb.checked;upd()};
        var n=el('div','n');n.appendChild(document.createTextNode(x.d.txt));if(x.d.warn)n.appendChild(el('small','w',x.d.warn));
        r.appendChild(cb);r.appendChild(n);box.appendChild(r)});
      b.appendChild(box);
      if(msg.applied)b.appendChild(el('div','msg','✓ 已应用 '+msg.applied+' 项（可以点下面的「撤销」）'));
      else{var go=el('button','ok','应用 '+msg.acts.filter(function(x){return x.on&&!x.d.bad}).length+' 项');go.className='ok';go.onclick=function(){apply(msg)};b.appendChild(go);
        if(!msg.acts.some(function(x){return x.on&&!x.d.bad}))go.disabled=true}}
    return b}
  function render(){
    log.innerHTML='';
    H.forEach(function(mm){log.appendChild(bubble(mm))});
    if(busy){var t=el('div','bub ai');t.appendChild(el('div',null,'思考中…'));log.appendChild(t)}
    chips.innerHTML='';
    if(!H.length)SUG.forEach(function(s){var c=el('button','chip',s);c.onclick=function(){ask(s)};chips.appendChild(c)});
    log.scrollTop=log.scrollHeight}
  function upd(){render()}

  async function ask(text){
    text=String(text||'').trim();if(!text||busy)return;
    inp.value='';H.push({role:'user',text:text});busy=true;sendB.disabled=true;render();
    try{
      var msgs=H.filter(function(x){return !x.err&&x.text}).slice(-8).map(function(x){return {role:x.role,text:x.text}});
      var j=await apiPost('/api/agent',{messages:msgs,snapshot:Sched.snapshot(14)},45000);
      var acts=(j.actions||[]).map(function(a){var d=describe(a);return {a:a,d:d,on:!d.bad}});
      H.push({role:'model',text:j.reply||'',acts:acts,applied:0})}
    catch(e){H.push({role:'model',err:true,text:'出错了：'+apiErr(e)+'（问答需要联网并登录的云端 AI；手动编辑照常可用）'})}
    finally{busy=false;sendB.disabled=false;render();inp.focus()}}

  function open(){m.classList.add('show');render();setTimeout(function(){inp.focus()},60)}
  sendB.onclick=function(){ask(inp.value)};
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ask(inp.value)}});
  m.onclick=function(){m.classList.remove('show')};$('agx').onclick=function(){m.classList.remove('show')};
  var clr=$('agclr');if(clr)clr.onclick=function(){H=[];render()};
  var ai=$('aiask');if(ai)ai.onclick=function(){$('mask6').classList.remove('show');open()};
  window.openAgent=open;
  // 顶栏的「问问 Mochi」小按钮：放在安装按钮旁边（安装按钮在已安装 / 独立窗口时不存在，所以这里自己找位置）。
  (function(){
    var Lg=window.LANG||'en',tip={zh:'问问 Mochi',ms:'Tanya Mochi'}[Lg]||'Ask Mochi';
    function addAsk(){
      var top=document.getElementById('top');if(!top||document.getElementById('askb'))return;
      var b=document.createElement('button');b.className='ibtn';b.id='askb';b.type='button';b.setAttribute('aria-label',tip);b.title=tip;
      // 可爱的小兔脸（线条风格，和旁边的图标一致）：两只耳朵、圆圆的脸、两个小眼睛和一个小微笑
      b.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 9.4C6.6 5.6 6.8 3 8.3 3c1.5 0 2.3 2.5 2.4 5.2"/><path d="M16 9.4c1.4-3.8 1.2-6.4-.3-6.4-1.5 0-2.3 2.5-2.4 5.2"/><path d="M12 8.2c4.6 0 8 2.5 8 6 0 3.1-3.1 5.4-8 5.4s-8-2.3-8-5.4c0-3.5 3.4-6 8-6z"/><circle cx="9" cy="13.6" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="13.6" r=".9" fill="currentColor" stroke="none"/><path d="M10.8 16.2c.7.7 1.7.7 2.4 0"/></svg>';
      b.onclick=function(){if(window.openAgent)openAgent()};
      var ib=document.getElementById('instb'),sr=document.getElementById('srchb');
      top.insertBefore(b,ib||sr||null)}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addAsk);else addAsk();
  })();
})();
