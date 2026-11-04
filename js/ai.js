// ✨ AI 添加：一句话 / 语音 → 活动、作业；课表照片 → 固定课程。
// AI 只“解析”，先在这里预览、勾选，确认后才写入数据。后端：api/ai.js
(function(){
  var m=document.getElementById('mask6'),q=document.getElementById('aiq'),msg=document.getElementById('aimsg'),
      list=document.getElementById('ail'),go=document.getElementById('aigo'),ok=document.getElementById('aiok'),
      mic=document.getElementById('aimic'),img=document.getElementById('aiimg'),rw=document.getElementById('airw'),rep=document.getElementById('airep');
  var ST={kind:'',items:[],busy:false};
  function api(){return ((window.MOCHI_CFG&&MOCHI_CFG.apiBase)||'')+'/api/ai'}
  function say(t){msg.textContent=t||''}

  function openAI(photo){
    q.value='';list.innerHTML='';say('');ok.style.display='none';rw.style.display='none';ST.items=[];ST.kind='';
    m.classList.add('show');
    if(photo)setTimeout(function(){img.click()},50);else setTimeout(function(){q.focus()},50)}
  function close(){m.classList.remove('show');stopMic()}
  m.onclick=close;document.getElementById('aix').onclick=close;
  document.getElementById('aifab').onclick=function(){openAI(false)};
  document.getElementById('fxph').onclick=function(){openAI(true)};

  async function post(body){
    try{return await postSrv(body)}
    catch(e){            // 云端不可用时，文字解析改用浏览器内置 AI（拍照识别需要云端）
      if(body.mode!=='quick'||!(window.LocalAI&&await LocalAI.status()!=='no'))throw e;
      say('🧠 云端 AI 不可用，改用浏览器内置 AI（第一次可能要先下载模型）…');
      try{return await LocalAI.quick(body,function(p){say('⬇️ 正在下载内置 AI 模型 '+p+'%')})}
      catch(e2){throw new Error(String(e.message||e).slice(0,60)+'；内置 AI 也失败：'+String(e2.message||e2).slice(0,60))}}}
  async function postSrv(body){
    var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},45000);
    try{
      var r=await fetch(api(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});
      var j=await r.json().catch(function(){return {}});
      if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
      return j}
    finally{clearTimeout(tm)}}
  function busy(b,t){ST.busy=b;go.disabled=b;mic.disabled=b;say(b?t:'')}
  function fail(e){busy(false);say('出错了：'+(e&&e.name==='AbortError'?'超时了，再试一次':(e&&e.message||e))+'（云端和内置 AI 都不可用时，手动添加照常可用）')}

  // ---- 文字 ----
  go.onclick=async function(){
    var t=q.value.trim();if(!t){q.focus();return}
    if(ST.busy)return;stopMic();busy(true,'正在理解你的话…');
    try{var j=await post({mode:'quick',text:t,today:isoOf(todayDn),wd:todayIdx});
      busy(false);ST.kind='quick';ST.items=j.items||[];renderQuick(j.notes||[])}
    catch(e){fail(e)}};

  function conflict(it){            // 只检查已经存在的手动安排（同一周、同一天、时间重叠）
    var dn=dnFromIso(it.date);if(dn===null)return false;
    var w=Math.floor((dn+3-SET.ws)/7),wd=dnDate(dn).wd;
    return (WK[w]||[]).some(function(x){return x.day===wd&&it.h<x.h+x.len&&x.h<it.h+it.len})}
  function row(txt,warn,checked){
    var r=el('label','tp ai-it'),cb=el('input');cb.type='checkbox';cb.checked=checked!==false;
    var n=el('div','n');n.appendChild(document.createTextNode(txt));
    if(warn)n.appendChild(el('small','w',warn));
    r.appendChild(cb);r.appendChild(n);list.appendChild(r);return cb}
  function renderQuick(notes){
    list.innerHTML='';rw.style.display='none';
    if(!ST.items.length){say(notes.join(' ')||'没听懂要加什么，换个说法试试～');ok.style.display='none';return}
    ST.items.forEach(function(it){
      if(it.type==='homework'){it.cb=row('📝 作业：'+it.t+(it.sb?'（'+it.sb+'）':'')+(it.due?' · 截止 '+it.due:' · 没有截止日期'))}
      else{
        var dn=dnFromIso(it.date),wdx=dn===null?'?':DAYS[dnDate(dn).wd],bad=dn===null||it.h+it.len>24;
        it.cb=row('📅 '+it.date+' 周'+wdx+' '+hm(it.h)+' · '+it.len+' 小时 · '+it.t+(it.every?' · 每'+(it.every>1?it.every+' ':'')+'周重复':''),
          bad?'日期或时间不对':conflict(it)?'⚠️ 和已有安排时间重叠':'',!bad);
        if(bad)it.cb.disabled=true}});
    say(notes.join(' ')||'勾选要加入的，再点「加入」。');ok.style.display=''}

  // ---- 拍照 ----
  img.onchange=async function(){
    var f=img.files&&img.files[0];img.value='';if(!f||ST.busy)return;
    busy(true,'正在压缩图片…');
    try{
      var b64=await shrink(f);busy(true,'正在识别课表（可能要 10–20 秒）…');
      var j=await post({mode:'photo',image:b64,mime:'image/jpeg'});
      busy(false);ST.kind='photo';ST.items=j.lessons||[];renderPhoto(j.notes||[])}
    catch(e){fail(e)}};
  function shrink(f){             // 最长边压到 1600px、JPEG，保证在 Vercel 请求体限制内
    return new Promise(function(res,rej){
      var u=URL.createObjectURL(f),im=new Image();
      im.onload=function(){
        var k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');
        c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
        var d=c.toDataURL('image/jpeg',.82);res(d.slice(d.indexOf(',')+1))};
      im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('这张图片打不开'))};im.src=u})}
  function renderPhoto(notes){
    list.innerHTML='';
    if(!ST.items.length){say(notes.join(' ')||'没识别到课程，换一张更清晰的试试～');ok.style.display='none';rw.style.display='none';return}
    ST.items.sort(function(a,b){return a.day-b.day||a.s-b.s});
    ST.items.forEach(function(it){
      it.cb=row('周'+DAYS[it.day]+' '+tmin(it.s)+'–'+tmin(it.e)+' · '+it.t+(it.room?' · '+it.room:'')+(it.teacher?' · '+it.teacher:''))});
    rep.checked=false;rw.style.display=FX.length?'':'none';
    say('识别到 '+ST.items.length+' 节课。'+(notes.join(' ')||'请核对后再加入～'));ok.style.display=''}

  // ---- 写入 ----
  ok.onclick=function(){
    var pick=ST.items.filter(function(it){return it.cb&&it.cb.checked&&!it.cb.disabled});
    if(!pick.length){say('还没有勾选任何一项');return}
    if(ST.kind==='photo'){
      if(rep.checked&&FX.length&&!confirm('会先清空现有的 '+FX.length+' 节固定课程，确定？'))return;
      if(rep.checked)FX=[];
      pick.forEach(function(it){FX.push({id:uid(),day:it.day,s:it.s,e:it.e,t:it.t,room:it.room,teacher:it.teacher,type:'课',wk:null,c:subjCol(it.t)})});
      fxSave();rFx();draw()}
    else{
      pick.forEach(function(it){
        if(it.type==='homework'){HW.push({id:uid(),done:0,ts:Date.now(),t:it.t,sb:it.sb,due:it.due,note:'',link:''});return}
        var dn=dnFromIso(it.date),wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7);
        if(it.every>0)RP.push({id:uid(),day:wd,h:it.h,len:it.len,t:it.t,c:it.c,a0:dn,ev:it.every,un:it.until?dnFromIso(it.until):null,sk:[],xh:true});
        else(WK[w]=WK[w]||[]).push({day:wd,h:it.h,len:it.len,t:it.t,c:it.c})});
      rpSave();save();hwSave();if(typeof rHw==='function')rHw();draw();if(typeof bnr==='function')bnr()}
    close()};

  // ---- 语音（浏览器自带 Web Speech API；不支持的环境直接隐藏按钮）----
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=null;
  if(!SR)mic.style.display='none';
  function stopMic(){if(rec){try{rec.stop()}catch(e){}}}
  mic.onclick=function(){
    if(rec){stopMic();return}
    rec=new SR();rec.lang='zh-CN';rec.interimResults=true;rec.continuous=false;
    var base=q.value?q.value.replace(/\s*$/,'')+' ':'';
    rec.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;q.value=(base+t).slice(0,300)};
    rec.onend=function(){rec=null;mic.textContent='🎤 语音';mic.classList.remove('rec');if(q.value.trim()&&!ST.busy)say('说完了？点「解析」。')};
    rec.onerror=function(e){say(e.error==='not-allowed'?'没有麦克风权限，请在浏览器里允许':'语音识别失败：'+e.error)};
    try{rec.start();mic.textContent='⏹ 停止';mic.classList.add('rec');say('在听…')}catch(e){rec=null}};
  window.openAI=openAI;
})();
