// AI 来源（只存在这台设备，键名不以 mochi- 开头，所以不会同步 / 不进备份 / 不会被分享出去）：
//   auto  = 云端优先，不可用时自动改用本机 AI（默认）
//   local = 文字类（一句话添加、整周重排）优先用本机 AI（Chrome 内置 Gemini Nano / WebLLM），失败再用云端；拍照识别仍要云端
//   另外可以填自己的 Gemini API key：请求会带上它，后端用你的 key 调用，不占站长的额度，也不要求登录。
window.AISRC=(function(){
  var P='ai-src',K='ai-own-key';
  function g(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
  function s(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}}
  var o={pref:function(){return g(P)==='local'?'local':'auto'},setPref:function(v){s(P,v==='local'?'local':'')},
    key:function(){var k=g(K).trim();return /^[\w-]{20,80}$/.test(k)?k:''},setKey:function(v){s(K,String(v||'').trim())},
    preferLocal:function(){return o.pref()==='local'&&!o.key()}};
  var chips=document.getElementById('aisrc'),inp=document.getElementById('aikey'),msg=document.getElementById('aikm');
  if(!chips||!inp)return o;
  function paint(){
    chips.innerHTML='';
    [['auto','自动（云端优先）'],['local','优先用本机 AI']].forEach(function(x){
      var b=el('button','chip'+(o.pref()===x[0]?' on':''),x[1]);b.onclick=function(){o.setPref(x[0]);paint()};chips.appendChild(b)});
    msg.textContent=o.key()?'✓ 已设置自己的 key：AI 请求会用它，不占站长额度，也不需要登录。key 只存在这台设备，不会同步；它会经过本站的后端转发给 Google，不会被保存。':
      '本机 AI = Chrome 内置的 Gemini Nano 或 WebLLM 小模型（免额度，数据不出设备；首次可能要下载约 1GB，只适合文字类，拍照仍需云端）。也可以填自己的 Gemini API key（在 aistudio.google.com/apikey 免费申请）。'}
  inp.value=g(K);
  inp.onchange=function(){o.setKey(inp.value);inp.value=g(K);paint()};
  paint();return o})();
