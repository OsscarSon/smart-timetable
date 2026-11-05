// 🧠 浏览器内置 AI（备用）：后端没部署 / 没有 API key / 超额时，改在本机跑小模型：Chrome 的 Gemini Nano，或 WebLLM（Qwen2.5-1.5B，需要 WebGPU）。
// 免 key、免额度、数据不出设备；但模型小，复杂安排可能排不好。
// 排课结果仍会经过 log.js 的 clean() 校验；不合格就继续退回本地规则。拍照识别不走这里（只做文字）。
(function(){
  var COLS=['pink','mint','sky','lemon','peach'],cache=null;

  // 两种本地引擎：① Chrome 自带 Gemini Nano（Prompt API，免下载 App 外的东西）；② WebLLM（Qwen2.5 小模型，跑在 WebGPU 上，别的浏览器也行）
  var WEBLLM='https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm',MODEL='Qwen2.5-1.5B-Instruct-q4f16_1-MLC',eng=null,wl=null;
  function api(){return window.LanguageModel||null}
  function hasGpu(){return !!(navigator&&navigator.gpu)}
  async function nano(){            // 'yes' 已就绪 | 'download' 要先下载 | 'no'
    var L=api();if(!L||!L.availability)return 'no';
    try{var a=await L.availability({expectedOutputs:[{type:'text',languages:['en']}]});
      return a==='available'?'yes':(a==='downloadable'||a==='downloading')?'download':'no'}
    catch(e){try{var b=await L.availability();return b==='available'?'yes':(b==='unavailable'?'no':'download')}catch(x){return 'no'}}}
  // 是否有任何一种可用：'no' | 'yes'
  async function status(){return (await nano())!=='no'||hasGpu()?'yes':'no'}

  async function nanoAsk(system,user,schema,onProg){
    var L=api(),opt={initialPrompts:[{role:'system',content:system}],temperature:0.3,topK:20,
      expectedOutputs:[{type:'text',languages:['en']}],
      monitor:function(m){m.addEventListener('downloadprogress',function(e){if(onProg)onProg(Math.round(e.loaded*100))})}},s;
    try{s=await L.create(opt)}
    catch(e){delete opt.expectedOutputs;delete opt.temperature;delete opt.topK;s=await L.create(opt)}
    try{
      try{return await s.prompt(user,{responseConstraint:schema})}
      catch(e){return await s.prompt(user)}}       // 旧版不认 responseConstraint
    finally{try{s.destroy()}catch(e){}}}

  async function wlAsk(system,user,schema,onProg){
    if(!eng){
      wl=wl||await import(WEBLLM);
      var cached=false;try{cached=await wl.hasModelInCache(MODEL)}catch(e){}
      if(!cached&&!confirm('内置 AI 需要先下载约 1 GB 的模型（只下载一次，之后离线可用，建议用 Wi-Fi）。现在下载吗？'))throw new Error('已取消下载');
      eng=await wl.CreateMLCEngine(MODEL,{initProgressCallback:function(r){if(onProg)onProg(Math.round((r.progress||0)*100))}})}
    var msg=[{role:'system',content:system},{role:'user',content:user}],r;
    try{r=await eng.chat.completions.create({messages:msg,temperature:0.3,max_tokens:2000,response_format:{type:'json_object',schema:JSON.stringify(schema)}})}
    catch(e){r=await eng.chat.completions.create({messages:msg,temperature:0.3,max_tokens:2000})}
    return r.choices[0].message.content}

  async function ask(system,user,schema,onProg){
    var n=await nano(),out;
    if(n==='yes')out=await nanoAsk(system,user,schema,onProg);          // 已装好的 Nano 最快
    else if(hasGpu())out=await wlAsk(system,user,schema,onProg);
    else if(n==='download')out=await nanoAsk(system,user,schema,onProg);
    else throw new Error('这个浏览器不支持内置 AI');
    var m=String(out).replace(/```json|```/g,'').trim(),i=m.indexOf('{'),j=m.lastIndexOf('}');
    if(i<0||j<i)throw new Error('内置 AI 没给出有效 JSON');
    return JSON.parse(m.slice(i,j+1))}

  var int=function(v,lo,hi,d){v=Math.round(Number(v));return isFinite(v)?Math.min(hi,Math.max(lo,v)):d};
  var str=function(v,n){return String(v==null?'':v).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n)};
  var iso=function(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v))?String(v):''};

  // ---- 整周重排：输入与 /api/plan 的请求体相同，输出 {events,notes} ----
  var PLAN_SYS='You are Mochi, a study timetable planner. Reply with JSON only: {"events":[{"day":0,"s":540,"e":660,"t":"title","c":"pink"}],"notes":["..."]}. '+
    'day 0=Mon..6=Sun; s,e=start/end as minutes since midnight (multiples of 5, e.g. 9:00=540), 30-180 minutes long, inside the allowed hours; no overlaps on the same day; c is one of pink,mint,sky,lemon,peach; t max 12 chars, start with one emoji. '+
    'Put the new one-off activity at its requested day/time. Move conflicting old events to free slots nearby (delete only if impossible). Never use any "fixed" slot, never use "hidden" days. '+
    'Hard study in the morning, light stuff after lunch, keep 12:00 and 18:00 free for meals, keep a rest gap, nothing heavy after 21:00. Return the COMPLETE week. notes: max 3 short Chinese sentences, cute and gentle.';
  var PLAN_SCHEMA={type:'object',required:['events','notes'],properties:{
    events:{type:'array',items:{type:'object',required:['day','s','e','t','c'],properties:{
      day:{type:'integer'},s:{type:'integer'},e:{type:'integer'},t:{type:'string'},c:{type:'string',enum:COLS}}}},
    notes:{type:'array',items:{type:'string'}}}};
  async function plan(b,onProg){
    var days='一二三四五六日',
      p='Today: day='+b.today+'. Hours '+((b.hours&&b.hours[0])||8)+'-'+((b.hours&&b.hours[1])||22)+'.\n'+
      'Current events: '+JSON.stringify((b.events||[]).slice(0,40))+'\n'+
      'Fixed (forbidden): '+JSON.stringify((b.fixed||[]).slice(0,40)).slice(0,1500)+'\n'+
      'Hidden days: '+JSON.stringify(b.hidden||[])+'\n'+
      'Homework: '+JSON.stringify((b.homework||[]).slice(0,8)).slice(0,600)+'\n'+
      'New request: '+String(b.text||'')+'\nReturn the full rescheduled week.';
    var o=await ask(PLAN_SYS,p,PLAN_SCHEMA,onProg);
    if(!Array.isArray(o.events))throw new Error('内置 AI 的结果格式不对');
    return {events:o.events,notes:(Array.isArray(o.notes)?o.notes:[]).slice(0,3)}}

  // ---- 一句话添加：输入 {text,today,wd}，输出 {items,notes}（同样逐项校验）----
  var Q_SYS='You parse one Chinese sentence into timetable items. JSON only: {"items":[...],"notes":["..."]}. '+
    'Event: {"type":"event","date":"YYYY-MM-DD","s":930,"e":990,"t":"emoji + title (max 12 chars)","c":"pink","every":0,"until":""}; s,e = start/end minutes since midnight (e.g. 15:30=930), every = repeat every N weeks (0 none, max 4), c in pink,mint,sky,lemon,peach. '+
    'Homework: {"type":"homework","t":"title","sb":"subject","due":"YYYY-MM-DD or empty"}. '+
    'Convert relative dates (tomorrow, next Wednesday) using today\'s date. Do not invent missing date/time; explain in notes (Chinese, max 2).';
  var Q_SCHEMA={type:'object',required:['items','notes'],properties:{
    items:{type:'array',items:{type:'object',required:['type','t'],properties:{
      type:{type:'string',enum:['event','homework']},date:{type:'string'},s:{type:'integer'},e:{type:'integer'},t:{type:'string'},
      c:{type:'string',enum:COLS},every:{type:'integer'},until:{type:'string'},sb:{type:'string'},due:{type:'string'}}}},
    notes:{type:'array',items:{type:'string'}}}};
  async function quick(b,onProg){
    var o=await ask(Q_SYS,'Today is '+b.today+' (weekday index '+b.wd+', 0=Mon).\nUser said: '+String(b.text||'').slice(0,300),Q_SCHEMA,onProg);
    var items=(Array.isArray(o.items)?o.items:[]).slice(0,12).map(function(x){
      if(x&&x.type==='homework')return {type:'homework',t:str(x.t,60),sb:str(x.sb,12),due:iso(x.due)};
      if(x&&x.type==='event')return {type:'event',date:iso(x.date),s:int(x.s,0,1439,-1),e:int(x.e,1,1440,-1),t:str(x.t,20),
        c:COLS.indexOf(x.c)>=0?x.c:'pink',every:int(x.every,0,4,0),until:iso(x.until)};
      return null}).filter(function(x){return x&&x.t&&(x.type==='homework'||(x.date&&x.s>=0&&x.e>x.s))});
    return {items:items,notes:(Array.isArray(o.notes)?o.notes:[]).slice(0,3).map(function(n){return str(n,80)})}}

  window.LocalAI={status:status,plan:plan,quick:quick};
})();
