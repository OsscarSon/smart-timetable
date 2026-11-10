// AI 来源（只存在这台设备，键名不以 mochi- 开头，所以不会同步 / 不进备份 / 不会被分享出去）：
//   auto  = 默认：全部云端优先（本站后端提供 AI，不用安装/下载任何东西），不可用时再用本机 AI
//   smart = 一句话添加优先用本机 AI，整周重排仍云端优先（小模型排整周容易排坏）
//   local = 一句话添加和整周重排都优先用本机 AI（Chrome 内置 Gemini Nano / WebLLM / 电脑上的 Ollama），失败再用云端；拍照识别仍要云端
//   另外可以填自己的 Gemini API key：请求会带上它，后端用你的 key 调用，不占站长的额度，也不要求登录。
window.AISRC=(function(){
  var P='ai-src',K='ai-own-key';
  function g(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
  function s(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}}
  var o={pref:function(){var v=g(P);return v==='local'||v==='smart'?v:'auto'},setPref:function(v){s(P,v==='auto'?'':v)},
    key:function(){var k=g(K).trim();return /^[\w-]{20,80}$/.test(k)?k:''},setKey:function(v){s(K,String(v||'').trim())},
    preferLocal:function(kind){var p=o.pref();return !o.key()&&(p==='local'||(p==='smart'&&kind==='quick'))}};
  var chips=document.getElementById('aisrc'),inp=document.getElementById('aikey'),msg=document.getElementById('aikm');
  if(!chips||!inp)return o;
  function paint(){
    chips.innerHTML='';
    [['auto','云端优先（推荐）'],['smart','智能（简单任务用本机）'],['local','全部优先本机']].forEach(function(x){
      var b=document.createElement('button');b.className='chip'+(o.pref()===x[0]?' on':'');b.textContent=x[1];   // 这个脚本比 core.js 先加载，不能用 el()
      b.onclick=function(){o.setPref(x[0]);paint()};chips.appendChild(b)});
    msg.textContent=o.key()?'✓ 已设置自己的 key：AI 请求会用它，不占站长额度，也不需要登录。key 只存在这台设备，不会同步；它会经过本站的后端转发给 Google，不会被保存。':
      '默认由本站后端提供 AI，不用安装或下载任何东西，直接可用。拍照识别也走云端，也可以在「拍照」里改用本机 OCR（免费，图片不上传）。想不受额度限制，可以填自己的 Gemini API key（aistudio.google.com/apikey 免费申请）。'}
  // 本机 AI 状态 / 下载 / Ollama 设置
  var chk=document.getElementById('ailchk'),dl=document.getElementById('ailwl'),info=document.getElementById('aiinfo'),olu=document.getElementById('aiolu'),olm=document.getElementById('aiolm'),olr=document.getElementById('aiolr');
  if(chk&&info){
    var desk=!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
    if(olr)olr.hidden=!desk;
    if(olu){olu.value=g('ai-ollama-url');olu.onchange=function(){s('ai-ollama-url',olu.value.trim())}}
    if(olm){olm.value=g('ai-ollama-model');olm.onchange=function(){s('ai-ollama-model',olm.value.trim())}}
    chk.onclick=async function(){
      if(!window.LocalAI){info.textContent='本机 AI 模块没加载';return}
      info.textContent='检查中…';var i=await LocalAI.info(),L=[];
      L.push((i.nano==='yes'?'✅':i.nano==='download'?'⬇️':'❌')+' Chrome 内置 Gemini Nano：'+(i.nano==='yes'?'可用':i.nano==='download'?'支持，但模型还没下载':'这个浏览器不支持'));
      L.push((i.gpu?(i.webllm?'✅':'⬇️'):'❌')+' WebLLM：'+(!i.gpu?'这台设备 / 浏览器没有 WebGPU':i.webllm?'模型已下载，可离线使用':i.webllm===null?'无法检查（可能没网）':'模型还没下载（约 1GB）'));
      if(desk||g('ai-ollama-url'))L.push((i.ollama?'✅':'❌')+' Ollama：'+(i.ollama?(i.ollama.length?'已连接，模型 '+i.ollama.slice(0,4).join(' / '):'已连接，但还没有下载模型'):'没连上（要先安装并运行 Ollama，并设置 OLLAMA_ORIGINS 放行本站网址）'));
      info.textContent=L.join('\n')};
    if(dl)dl.onclick=async function(){
      if(!window.LocalAI)return;if(!confirm('现在下载 WebLLM 模型（约 1GB，只下载一次，建议用 Wi-Fi）？'))return;
      try{await LocalAI.download(function(p){info.textContent='⬇️ 下载中 '+p+'%'});info.textContent='✅ WebLLM 模型已下载。';}
      catch(e){info.textContent='下载失败：'+(e&&e.message||e)}};
    var tb=document.getElementById('ailtest');
    if(tb)tb.onclick=async function(){info.textContent='测试中…';try{await LocalAI.test();info.textContent='✅ 本机 AI 回复正常'}catch(e){info.textContent='❌ 本机 AI 没跑通：'+(e&&e.message||e)}}}
  // 自动下载本机模型（默认开）
  var au=document.getElementById('ailauto');
  if(au){var paintA=function(){au.textContent=(g('ai-noauto')==='1'?'⬜':'✅')+' 自动下载本机模型（Wi-Fi 下，后台进行）'};
    au.onclick=function(){s('ai-noauto',g('ai-noauto')==='1'?'':'1');paintA()};paintA()}
  // 后台自动预下载 WebLLM。注意：本脚本比 localai.js 先加载，所以必须等 12 秒后（页面都加载完）再检查 window.LocalAI / 设置，
  // 不能在加载时就判断，否则 LocalAI 还没定义，这段永远不会执行。失败会隔几分钟重试，最多 2 次。
  function auto(n){
    if(!window.LocalAI||o.pref()==='auto'||o.key())return;     // 云端优先 / 自己填了 key：不需要本机模型
    window.LocalAI.prefetch(function(p){if(info&&document.getElementById('v-se')&&document.getElementById('v-se').style.display!=='none')info.textContent='⬇️ 本机 AI 模型后台下载中 '+p+'%'})
      .then(function(r){if(r==='fail'&&n<2)setTimeout(function(){auto(n+1)},5*60*1000)})}
  setTimeout(function(){(window.requestIdleCallback||function(f){f()})(function(){auto(0)})},12000)
  inp.value=g(K);
  inp.onchange=function(){o.setKey(inp.value);inp.value=g(K);paint()};
  paint();return o})();
