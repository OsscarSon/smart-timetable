// ✨ AI 助手（一个入口、三个标签）：
//   一句话 / 语音 → 活动、作业；拍课表照片 → 固定课程；整周重排（把特别安排放进去，冲突的旧安排自动挪开）。
// AI 只“解析”，先在这里预览、勾选，确认后才写入数据（整周重排例外：它本来就是改整周，改完会在 说明 里告诉你）。后端：api/ai.js、api/plan.js
(function(){
  var m=document.getElementById('mask6'),q=document.getElementById('aiq'),pq=document.getElementById('aipl'),msg=document.getElementById('aimsg'),
      list=document.getElementById('ail'),go=document.getElementById('aigo'),ok=document.getElementById('aiok'),
      mic=document.getElementById('aimic'),img=document.getElementById('aiimg'),rw=document.getElementById('airw'),rep=document.getElementById('airep'),
      tabs=document.getElementById('aitabs');
  var S={tab:'quick',kind:'',items:[],busy:false};
  function say(t){msg.textContent=t||''}

  function setTab(t){
    leaveReview();S.tab=t;S.items=[];S.kind='';list.innerHTML='';say('');ok.hidden=true;rw.hidden=true;stopMic();
    [].forEach.call(tabs.children,function(b){b.classList.toggle('on',b.getAttribute('data-t')===t)});
    [].forEach.call(m.querySelectorAll('.aip'),function(p){p.hidden=p.getAttribute('data-p')!==t});
    go.hidden=t==='photo';go.textContent=t==='plan'?'重排整周':'解析';if(t==='photo'&&typeof paintEng==='function')paintEng()}
  [].forEach.call(tabs.children,function(b){b.onclick=function(){setTab(b.getAttribute('data-t'))}});

  function openAI(tab){
    if(tab===true)tab='photo';else if(!tab)tab='quick';
    q.value='';pq.value='';setTab(tab);
    m.classList.add('show');
    if(tab==='photo')setTimeout(function(){img.click()},50);else setTimeout(function(){(tab==='plan'?pq:q).focus()},50)}
  var dlgEl=m.querySelector('.dlg');
  function leaveReview(){dlgEl.classList.remove('rv')}
  function close(){m.classList.remove('show');stopMic();leaveReview();if(thumbUrl){URL.revokeObjectURL(thumbUrl);thumbUrl=null}}
  m.onclick=close;document.getElementById('aix').onclick=close;
  document.getElementById('fxph').onclick=function(){openAI('photo')};

  async function post(body){
    if(body.mode==='quick'&&window.AISRC&&AISRC.preferLocal('quick')&&window.LocalAI&&await LocalAI.status()!=='no'){
      say('🧠 用本机 AI 解析（第一次可能要先下载模型）…');
      try{return await LocalAI.quick(body,function(p){say('⬇️ 正在下载内置 AI 模型 '+p+'%')})}catch(e0){say('本机 AI 没成功，改用云端…')}}
    try{return await apiPost('/api/ai',body,45000)}
    catch(e){            // 云端不可用时，文字解析改用浏览器内置 AI（拍照识别需要云端）
      if(body.mode!=='quick'||!(window.LocalAI&&await LocalAI.status()!=='no')){e.message=apiErr(e);throw e}
      say('🧠 云端 AI 不可用（'+apiErr(e)+'），改用浏览器内置 AI（第一次可能要先下载模型）…');
      try{return await LocalAI.quick(body,function(p){say('⬇️ 正在下载内置 AI 模型 '+p+'%')})}
      catch(e2){throw new Error(apiErr(e).slice(0,60)+'；内置 AI 也失败：'+String(e2.message||e2).slice(0,60))}}}
  function busy(b,t){S.busy=b;go.disabled=b;mic.disabled=b;say(b?t:'')}
  function fail(e){busy(false);say('出错了：'+apiErr(e)+'（云端和内置 AI 都不可用时，手动添加照常可用）'+(S.tab==='photo'&&window.OCR&&S.engine==='cloud'?' 拍照可以改用上面的「本机 OCR」（免费，图片不上传）。':''))}

  // ---- 一句话 / 整周重排 ----
  go.onclick=async function(){
    if(S.busy)return;
    if(S.tab==='plan'){
      var lines=pq.value.split(/\n+/).map(function(x){return x.trim()}).filter(Boolean);if(!lines.length){pq.focus();return}
      list.innerHTML='';busy(true,'正在重排…');
      function ps(t){var r=el('div','msg pl',t);list.appendChild(r);while(list.children.length>10)list.removeChild(list.firstChild);list.scrollTop=list.scrollHeight}
      await replan(lines.join('，'),ps,function(){busy(false);say('排完了，去课表看看吧 🐱')});
      return}
    var t=q.value.trim();if(!t){q.focus();return}
    stopMic();busy(true,'正在理解你的话…');
    try{var j=await post({mode:'quick',text:t,today:isoOf(todayDn),wd:todayIdx});
      busy(false);S.kind='quick';S.items=(j.items||[]).map(normItem);renderQuick(j.notes||[])}
    catch(e){fail(e)}};
  function normItem(it){if(it&&it.type==='event'&&it.s==null&&it.h!=null){it.s=it.h*60;it.e=it.s+(it.len||1)*60}return it}

  function conflict(it){            // 只检查已经存在的手动安排（同一周、同一天、时间重叠）
    var dn=dnFromIso(it.date);if(dn===null)return false;
    var w=Math.floor((dn+3-SET.ws)/7),wd=dnDate(dn).wd;
    return (WK[w]||[]).some(function(x){return x.day===wd&&ovl(x,it)})}
  function row(txt,warn,checked){
    var r=el('label','tp ai-it'),cb=el('input');cb.type='checkbox';cb.checked=checked!==false;
    var n=el('div','n');n.appendChild(document.createTextNode(txt));
    if(warn)n.appendChild(el('small','w',warn));
    r.appendChild(cb);r.appendChild(n);list.appendChild(r);return cb}
  function renderQuick(notes){
    list.innerHTML='';rw.hidden=true;
    if(!S.items.length){say(notes.join(' ')||'没听懂要加什么，换个说法试试～');ok.hidden=true;return}
    S.items.forEach(function(it){
      if(it.type==='homework'){it.cb=row('📝 作业：'+it.t+(it.sb?'（'+it.sb+'）':'')+(it.due?' · 截止 '+it.due:' · 没有截止日期'))}
      else{
        var dn=dnFromIso(it.date),wdx=dn===null?'?':DAYS[dnDate(dn).wd],bad=dn===null||!(it.s>=0)||!(it.e>it.s)||it.e>1440;
        it.cb=row('📅 '+it.date+' 周'+wdx+' '+(bad?'?':tmin(it.s)+'–'+tmin(it.e))+' · '+it.t+(it.every?' · 每'+(it.every>1?it.every+' ':'')+'周重复':''),
          bad?'日期或时间不对':conflict(it)?'⚠️ 和已有安排时间重叠':'',!bad);
        if(bad)it.cb.disabled=true}});
    say(notes.join(' ')||'勾选要加入的，再点「加入」。');ok.hidden=false}

  // ---- 拍照识别的两种方式：云端 AI（默认）/ 本机 OCR（开源 Tesseract.js，图片不上传；结果只是候选，必须逐项核对）----
  var eng=document.getElementById('aieng'),ocrl=document.getElementById('aiocrl'),engnote=document.getElementById('aiengnote'),thumbUrl=null;
  function lsget(k,d){try{return localStorage.getItem(k)||d}catch(e){return d}}
  function lsset(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  S.engine=lsget('ai-photo-engine','cloud');S.ocrLang=lsget('ai-ocr-lang',window.LANG==='zh'?'zh':'latin');
  function paintEng(){
    [].forEach.call(eng.children,function(b){var on=b.getAttribute('data-e')===S.engine;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
    [].forEach.call(ocrl.querySelectorAll('[data-l]'),function(b){var on=b.getAttribute('data-l')===S.ocrLang;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
    ocrl.hidden=S.engine!=='ocr';
    engnote.textContent=S.engine==='ocr'?'本机 OCR 免费，图片只在这台设备上处理，不会上传；第一次要下载识别引擎。对“星期在上、时间在左”的网格课表最有效。识别难免出错，所以每一项都要你核对，也可以直接修改。':''}
  [].forEach.call(eng.children,function(b){b.onclick=function(){S.engine=b.getAttribute('data-e');lsset('ai-photo-engine',S.engine);paintEng()}});
  [].forEach.call(ocrl.querySelectorAll('[data-l]'),function(b){b.onclick=function(){S.ocrLang=b.getAttribute('data-l');lsset('ai-ocr-lang',S.ocrLang);paintEng()}});
  if(!window.OCR){eng.hidden=true;S.engine='cloud'}
  function ocrConsent(){
    var k='ocr-ok-'+S.ocrLang;if(lsget(k,'')==='1')return true;
    if(!confirm('本机 OCR 第一次使用要下载识别引擎和语言包（约 10–15 MB，只下载一次，之后可离线用）。图片始终只在这台设备上处理，不会上传。现在开始吗？'))return false;
    lsset(k,'1');return true}
  async function runOcr(f){
    if(S.busy)return;if(!ocrConsent()){say('已取消。');return}
    busy(true,'正在准备本机 OCR…');
    try{
      var res=await OCR.recognize(f,{lang:S.ocrLang,onProgress:function(st,p){say(st==='lib'?'正在加载识别引擎…':st==='data'?'正在下载识别数据 '+p+'%（只下载一次）…':'正在识别 '+p+'%…')}});
      busy(false);S.kind='photo';S.ocr=res;
      S.items=res.lessons.map(function(l){return {day:l.day,s:l.s,e:l.e,t:l.t,room:l.room||'',teacher:l.teacher||'',low:!!l.low,guess:!!l.guessedTime,conf:l.conf}});
      if(thumbUrl)URL.revokeObjectURL(thumbUrl);thumbUrl=URL.createObjectURL(f);renderOcr(res)}
    catch(e){busy(false);say(String(e&&e.message)==='ocr-lib'?'识别引擎没能加载（第一次需要联网下载）。请检查网络，或改用云端 AI。':'本机 OCR 出错了：'+String((e&&e.message)||e).slice(0,80)+'。可以改用云端 AI，或手动添加。')}}
  function toHM(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
  function fromHM(v){var m=/^(\d{1,2}):(\d{2})$/.exec(v||'');return m?+m[1]*60+(+m[2]):null}
  function ocrNote(res){
    var n=[];
    if(res.notes.indexOf('noTimes')>=0)n.push('没找到时间栏，时间是我猜的，请务必改成正确的。');
    if(res.notes.indexOf('list')>=0)n.push('这张图按“一行一节”来识别。');
    if(res.notes.indexOf('merged')>=0||res.notes.indexOf('spanned')>=0)n.push('相邻同名或跨行的课已合并成一节。');
    if(res.notes.indexOf('fewWords')>=0)n.push('图里认出的文字太少。');
    return n.join(' ')+(n.length?' ':'')}
  function ocrRow(it){
    var r=el('div','tp ai-it ocr-it'+(it.low||it.guess?' low':'')),lab=el('label','ocr-ck'),cb=el('input');cb.type='checkbox';cb.checked=!(it.low||it.guess);lab.setAttribute('aria-label','加入这一节');lab.appendChild(cb);it.cb=cb;
    var f=el('div','n ocr-f'),r1=el('div','ocr-r1'),r2=el('div','ocr-r2');
    var ds=el('select');ds.setAttribute('aria-label','星期');DAYS.forEach(function(d,i){var o=el('option',null,'周'+d);o.value=i;if(i===it.day)o.selected=true;ds.appendChild(o)});ds.onchange=function(){it.day=+ds.value};
    var ti=el('input');ti.type='time';ti.step=300;ti.value=toHM(it.s);ti.setAttribute('aria-label','开始时间');ti.onchange=function(){var v=fromHM(ti.value);if(v!==null)it.s=v};
    var te=el('input');te.type='time';te.step=300;te.value=toHM(it.e);te.setAttribute('aria-label','结束时间');te.onchange=function(){var v=fromHM(te.value);if(v!==null)it.e=v};
    var tt=el('input');tt.type='text';tt.maxLength=40;tt.value=it.t;tt.setAttribute('aria-label','课程名称');tt.oninput=function(){it.t=tt.value.trim()};
    var tr=el('input');tr.type='text';tr.maxLength=20;tr.value=it.room;tr.placeholder='教室';tr.setAttribute('aria-label','教室');tr.oninput=function(){it.room=tr.value.trim()};
    r1.appendChild(ds);r1.appendChild(ti);r1.appendChild(el('span',null,'–'));r1.appendChild(te);r2.appendChild(tt);r2.appendChild(tr);f.appendChild(r1);f.appendChild(r2);
    if(it.guess)f.appendChild(el('small','w','时间是猜的，请改成正确的'));else if(it.low)f.appendChild(el('small','w','识别把握较低（'+it.conf+'%），请核对'));
    r.appendChild(lab);r.appendChild(f);return r}
  function renderOcr(res){
    list.innerHTML='';
    var im=el('img','ocr-thumb');im.src=thumbUrl;im.alt='你选的课表图片';im.onclick=function(){im.classList.toggle('big')};list.appendChild(im);
    if(!S.items.length){say(ocrNote(res)+'没识别到课程。拍得再正、再清楚一点，或改用云端 AI。');ok.hidden=true;rw.hidden=true;return}
    S.items.sort(function(a,b){return a.day-b.day||a.s-b.s});
    dlgEl.classList.add('rv');      // 核对模式：收起页签和说明，让列表占满、按钮始终可见
    var back=el('button','chip as','← 重新选择图片');back.type='button';back.onclick=function(){leaveReview();list.innerHTML='';S.items=[];ok.hidden=true;rw.hidden=true;say('')};list.insertBefore(back,list.firstChild);
    S.items.forEach(function(it){list.appendChild(ocrRow(it))});
    if(res.unplaced&&res.unplaced.length){var d=el('details','ocr-un');d.appendChild(el('summary',null,'没有放进课表的文字（'+res.unplaced.length+'）'));d.appendChild(el('div','msg',res.unplaced.join(' · ')));list.appendChild(d)}
    rep.checked=false;rw.hidden=!FX.length;
    say('识别到 '+S.items.length+' 节课（平均把握 '+res.stats.avgConf+'%）。'+ocrNote(res)+'请对照上面的图片逐项核对，可以直接修改；把握较低的已经取消勾选。');ok.hidden=false}

  // ---- 拍照 ----
  img.onchange=async function(){
    var f=img.files&&img.files[0];img.value='';if(!f||S.busy)return;
    if(S.engine==='ocr'&&window.OCR){runOcr(f);return}
    busy(true,'正在压缩图片…');
    try{
      var b64=await shrink(f);busy(true,'正在识别课表（可能要 10–20 秒）…');
      var j=await post({mode:'photo',image:b64,mime:'image/jpeg'});
      busy(false);S.kind='photo';S.items=j.lessons||[];renderPhoto(j.notes||[])}
    catch(e){fail(e)}};
  function shrink(f){             // 最长边压到 1600px、JPEG，保证在 Vercel 请求体限制内
    return new Promise(function(res,rej){
      var u=URL.createObjectURL(f),im=new Image();
      im.onload=function(){
        var k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');
        c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
        var d=c.toDataURL('image/jpeg',.82);res(d.slice(d.indexOf(',')+1))};
      im.addEventListener('error',function(){URL.revokeObjectURL(u);rej(new Error('这张图片打不开'))});im.src=u})}
  function renderPhoto(notes){
    list.innerHTML='';
    if(!S.items.length){say(notes.join(' ')||'没识别到课程，换一张更清晰的试试～');ok.hidden=true;rw.hidden=true;return}
    S.items.sort(function(a,b){return a.day-b.day||a.s-b.s});
    S.items.forEach(function(it){
      it.cb=row('周'+DAYS[it.day]+' '+tmin(it.s)+'–'+tmin(it.e)+' · '+it.t+(it.room?' · '+it.room:'')+(it.teacher?' · '+it.teacher:''))});
    rep.checked=false;rw.hidden=!FX.length;
    say('识别到 '+S.items.length+' 节课。'+(notes.join(' ')||'请核对后再加入～'));ok.hidden=false}

  // ---- 写入 ----
  ok.onclick=function(){
    var pick=S.items.filter(function(it){return it.cb&&it.cb.checked&&!it.cb.disabled});
    if(!pick.length){say('还没有勾选任何一项');return}
    if(S.kind==='photo'){
      var bad=pick.filter(function(it){return !it.t||!(it.e>it.s)||it.s<0||it.e>1440});      // 核对时可能改坏：名称不能空，结束要晚于开始
      [].forEach.call(list.querySelectorAll('.ai-it.bad'),function(n){n.classList.remove('bad')});
      if(bad.length){bad.forEach(function(it){var n=it.cb&&it.cb.closest&&it.cb.closest('.ai-it');if(n)n.classList.add('bad')});say(bad.length+' 节课的名称或时间不对（结束要晚于开始）。请先改好，或取消勾选。');return}
      if(rep.checked&&FX.length&&!confirm('会先清空现有的 '+FX.length+' 节固定课程，确定？'))return;
      var psnap=Undo.snap();
      if(rep.checked)FX=[];
      pick.forEach(function(it){FX.push({id:uid(),day:it.day,s:it.s,e:it.e,t:it.t,room:it.room,teacher:it.teacher,type:'课',wk:null,c:subjCol(it.t)})});
      fxSave();rFx();draw();Undo.toast('已加入 '+pick.length+' 节课',psnap)}
    else{
      var snap=Undo.snap(),touched={};
      pick.forEach(function(it){
        if(it.type==='homework'){HW.push({id:uid(),done:0,ts:Date.now(),t:it.t,sb:it.sb,due:it.due,note:'',link:''});return}
        var dn=dnFromIso(it.date),wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7);
        if(it.every>0)RP.push({id:uid(),day:wd,s:it.s,e:it.e,t:it.t,c:it.c,a0:dn,ev:it.every,un:it.until?dnFromIso(it.until):null,sk:[],xh:true});
        else{(WK[w]=WK[w]||[]).push({day:wd,s:it.s,e:it.e,t:it.t,c:it.c});touched[w]=1}});
      Object.keys(touched).forEach(function(w){saveWeek(+w)});
      rpSave();save();hwSave();if(typeof rHw==='function')rHw();draw();if(typeof bnr==='function')bnr();Undo.toast('已加入 '+pick.length+' 项',snap)}
    close()};

  // ---- 语音：手机 App 用开源插件 @capacitor-community/speech-recognition（弹出系统语音识别窗口）；
  //      网页用浏览器自带 Web Speech API；两个都没有就隐藏按钮 ----
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=null,SRL=['zh-CN','en-US','ms-MY'];
  // 语音识别语言可以和界面语言不同：界面用英文、嘴上说中文的人很多。点 🎤 旁边的小按钮切换，记在这台设备上
  function srLang(){var v='';try{v=localStorage.getItem('ai-sr-lang')||''}catch(e){}return SRL.indexOf(v)>=0?v:({en:'en-US',ms:'ms-MY',zh:'zh-CN'}[window.LANG]||'en-US')}
  function nativeSR(){var C=window.Capacitor;if(!(C&&C.isNativePlatform&&C.isNativePlatform()))return null;
    return (C.Plugins&&C.Plugins.SpeechRecognition)||(C.registerPlugin?C.registerPlugin('SpeechRecognition'):null)}
  var NSR=nativeSR(),nbusy=false;
  if(!SR&&!NSR)mic.hidden=true;
  function stopMic(){if(nbusy&&NSR){try{NSR.stop()}catch(e){}}if(rec){try{rec.stop()}catch(e){}}}
  async function nativeListen(){
    if(nbusy){stopMic();return}
    try{
      var av=await NSR.available();if(av&&av.available===false){say('这台手机没有可用的语音识别（需要 Google 语音服务）');return}
      var p=await NSR.checkPermissions();if(!p||p.speechRecognition!=='granted')p=await NSR.requestPermissions();
      if(!p||p.speechRecognition!=='granted'){say('没有麦克风权限，请在手机设置里允许');return}
      nbusy=true;mic.textContent='⏹ 停止';mic.classList.add('rec');say('在听…');
      var base=q.value?q.value.replace(/\s*$/,'')+' ':'';
      var r=await NSR.start({language:srLang(),maxResults:1,partialResults:false,popup:true}),t=r&&r.matches&&r.matches[0]||'';
      if(t)q.value=(base+t).slice(0,300);
    }catch(e){say('语音识别失败：'+(e&&e.message||e))}
    nbusy=false;mic.textContent='🎤 语音';mic.classList.remove('rec');
    if(q.value.trim()&&!S.busy)say('说完了？点「解析」。')}
  mic.onclick=function(){
    if(NSR){nativeListen();return}
    if(rec){stopMic();return}
    rec=new SR();rec.lang=srLang();rec.interimResults=true;rec.continuous=false;
    var base=q.value?q.value.replace(/\s*$/,'')+' ':'';
    rec.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;q.value=(base+t).slice(0,300)};
    rec.onend=function(){rec=null;mic.textContent='🎤 语音';mic.classList.remove('rec');if(q.value.trim()&&!S.busy)say('说完了？点「解析」。')};
    rec.addEventListener('error',function(e){say(e.error==='not-allowed'?'没有麦克风权限，请在浏览器里允许':'语音识别失败：'+e.error)});
    try{rec.start();mic.textContent='⏹ 停止';mic.classList.add('rec');say('在听…')}catch(e){rec=null}};
  window.openAI=openAI;
})();

// 🎤 语言小按钮：中文 → English → Melayu 循环
(function(){
  var b=document.getElementById('aimlang');if(!b)return;
  var N={'zh-CN':'🎤 中文','en-US':'🎤 English','ms-MY':'🎤 Melayu'},L=['zh-CN','en-US','ms-MY'];
  function cur(){var v='';try{v=localStorage.getItem('ai-sr-lang')||''}catch(e){}return L.indexOf(v)>=0?v:({en:'en-US',ms:'ms-MY',zh:'zh-CN'}[window.LANG]||'en-US')}
  function paint(){b.textContent=N[cur()];b.setAttribute('aria-label','Speech language')}
  b.onclick=function(){var n=L[(L.indexOf(cur())+1)%3];try{localStorage.setItem('ai-sr-lang',n)}catch(e){}paint()};
  paint()})();
