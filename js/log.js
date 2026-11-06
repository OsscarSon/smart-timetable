// 整周重排：一次性安排交给 AI（失败时用本地规则）并重排。界面在「AI 助手 → 整周重排」（ai.js），这里只放逻辑。
  var NUM={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'两':2};
  function num(x){if(/^\d+$/.test(x))return +x;if(x.length===1)return NUM[x];if(x.length===2&&x[0]==='十')return 10+NUM[x[1]];if(x.length===2&&x[1]==='十')return NUM[x[0]]*10;return 0}
  // 时间：3点 / 3点半 / 3点15分 / 三点一刻 / 15:30，可带 上午 下午 晚上 …
  var TIME_RE=/(上午|早上|中午|下午|晚上|傍晚)?\s*(\d{1,2}|[一二三四五六七八九十两]{1,3})\s*(?:点钟?|时|:|：)\s*(半|一刻|三刻|\d{1,2})?\s*分?/;
  var TIME_G=new RegExp(TIME_RE.source,'g');
  var DUR_G=/(?:(?:\d+(?:\.\d+)?|[一二三四五六七八九十两]+)\s*个?\s*(?:半)?\s*小时|半小时|\d+\s*分钟)(?:半)?/g;
  function durOf(c){
    var m;if((m=c.match(/(\d+)\s*分钟/)))return +m[1];
    if(/一个半小时/.test(c))return 90;if(/半小时/.test(c))return 30;
    if((m=c.match(/(\d+(?:\.\d+)?|[一二三四五六七八九十两]+)\s*个?\s*小时/))){var v=/^[\d.]+$/.test(m[1])?parseFloat(m[1]):num(m[1]);return v>0?Math.round(v*60):0}
    return 0}
  function parse(clause){
    var day=-1,m;
    if((m=clause.match(/(?:周|礼拜|星期)([一二三四五六日天1-7])/))){var c=m[1];day=(c==='日'||c==='天'||c==='7')?6:(NUM[c]||+c)-1}
    else if(/今天/.test(clause))day=todayIdx;else if(/明天/.test(clause))day=todayIdx+1;else if(/后天/.test(clause))day=todayIdx+2;
    if(day<0||day>6)return null;
    var s=14*60,t=clause.match(TIME_RE);
    if(t){var h=num(t[2]),mi=0,q=t[3];
      if(q==='半')mi=30;else if(q==='一刻')mi=15;else if(q==='三刻')mi=45;else if(q)mi=Math.min(59,+q);
      if(/(下午|晚上|傍晚)/.test(t[1]||'')&&h<12)h+=12;if(t[1]==='中午'&&h<11)h+=12;s=h*60+mi}
    else if(/早上|上午/.test(clause))s=9*60;else if(/中午/.test(clause))s=12*60;else if(/晚上|晚饭/.test(clause))s=19*60;
    var dur=durOf(clause)||(/考试|比赛|旅行|聚会|看电影/.test(clause)?180:120);
    s=Math.max(H0*60,Math.min(s,H1*60-30));var e=Math.min(s+dur,H1*60);
    var ti=clause.replace(/(这|下)?(周|礼拜|星期)[一二三四五六日天1-7]|今天|明天|后天/g,'').replace(TIME_G,'').replace(DUR_G,'').replace(/^[\s,，我有要会想去和与跟]+/,'').replace(/[。！!]/g,'').trim()||'活动';
    var ic=/球|跑|运动|健身|游泳|比赛/.test(ti)?'🏃 ':/吃|饭|聚|火锅/.test(ti)?'🍽️ ':/考/.test(ti)?'📝 ':'📌 ';
    return {day:day,s:s,e:e,t:ic+ti.slice(0,12),c:/考/.test(ti)?'pink':/球|跑|运动|比赛/.test(ti)?'lemon':'peach'};
  }
  // 给 x 找一个新位置（同样时长，离原来最近；今天以后的天里找）
  function relocate(x){
    var dur=x.e-x.s;
    for(var dd=0;dd<7;dd++){var day=(x.day+dd)%7,best=null;
      for(var t=H0*60;t+dur<=H1*60;t+=15){
        if(!free(day,t,t+dur,x))continue;
        var dist=Math.abs(t-x.s);if(best===null||dist<best.d)best={t:t,d:dist}}
      if(best!==null){x.day=day;x.s=best.t;x.e=best.t+dur;return true}}
    return false;
  }
  function addEvent(ev){
    var moved=[];
    data.filter(function(x){return x.day===ev.day&&ovl(x,ev)}).forEach(function(x){
      data.push(ev);                       // 暂时放入新活动，避免挪回原位
      var ok=relocate(x);
      data.pop();
      if(ok)moved.push('「'+x.t+'」→周'+DAYS[x.day]+' '+tmin(x.s));
      else{data=data.filter(function(y){return y!==x});moved.push('「'+x.t+'」排不下，已暂时移除')}
    });
    data.push(ev);
    return moved;
  }
  function localPlan(txt,say){
    var raw=txt.split(/[，,；;。\n]+/).filter(Boolean),cl=[],n=0,miss=[];
    raw.forEach(function(c){      // “…打球，一个半小时”：只有时长 / 时间、没有日期的片段，并回上一句
      var hasDay=/(?:周|礼拜|星期)[一二三四五六日天1-7]|今天|明天|后天/.test(c);
      if(!hasDay&&cl.length&&(durOf(c)||TIME_RE.test(c)))cl[cl.length-1]+='，'+c;else cl.push(c)});
    cl.forEach(function(c){var ev=parse(c);if(!ev){miss.push(c);return}
      var mv=addEvent(ev);n++;
      say('✅ 周'+DAYS[ev.day]+' '+tmin(ev.s)+'–'+tmin(ev.e)+' '+ev.t+(mv.length?'；已重排 '+mv.join('、'):''))});
    if(miss.length)say('🤔 没看懂时间：'+miss.join('、')+'（请写“周六”“明天”等）');
    if(n){save();draw()}
  }
  function str14(v){return String(v).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,14)}
  // 校验 AI / 本机模型给的整周安排（既认新格式 s/e 分钟，也认旧格式 h/len）：任何一条不合格就整体放弃，退回本地规则
  function clean(l){
    if(!Array.isArray(l))return null;var out=[];
    for(var i=0;i<l.length;i++){var x=l[i]||{},day=+x.day,s,e;
      if(x.s!=null){s=Math.round(+x.s);e=Math.round(+x.e)}else{s=Math.round(+x.h*60);e=s+Math.round(+x.len*60)}
      if(!(day>=0&&day<=6)||day%1||!isFinite(s)||!isFinite(e)||e<=s||e-s>240||s<H0*60||e>H1*60||!x.t||hiddenDay(day))return null;
      if(fxHit(day,s,e))return null;
      var o={day:day,s:s,e:e,t:str14(x.t),c:COLS.indexOf(x.c)>=0?x.c:'peach'};
      if(out.some(function(y){return y.day===o.day&&ovl(y,o)}))return null;out.push(o)}
    return out}
  // 整周重排：云端 AI → 浏览器内置 AI → 本地规则。say(文字) 用来显示进度和说明。
  async function replan(txt,say,onDone){
    var body={text:txt,events:data.map(function(x){return {day:x.day,s:x.s,e:x.e,t:x.t,c:x.c}}),today:(curW===thisW?todayIdx:-1),hours:[H0,H1],study:ST,sports:SP,fixed:fixedForAI(),
      hidden:DAYS.filter(function(n,i){return hiddenDay(i)}).map(function(n){return '周'+n}),
      week:isoOf(wsDn(curW))+' 起的一周（一周从周'+DAYS[SET.ws]+'开始，列顺序：'+visDays().map(function(i){return DAYS[i]}).join('')+'）',
      homework:(typeof hwPending==='function'?hwPending():[])},j,viaLocal=false;
    try{
      if(window.AISRC&&AISRC.preferLocal()&&window.LocalAI&&await LocalAI.status()!=='no'){
        say('🧠 用本机 AI 重排（第一次可能要先下载模型）…');
        try{j=await LocalAI.plan(body,function(p){say('⬇️ 正在下载内置 AI 模型 '+p+'%')});viaLocal=true}catch(e0){j=null;say('本机 AI 没成功，改用云端…')}}
      if(!j)try{j=await apiPost('/api/plan',body,60000)}
      catch(e1){        // 后端不可用 / 没登录 / 没 key / 超额：试试浏览器内置 AI（免 key）
        if(!(window.LocalAI&&await LocalAI.status()!=='no'))throw e1;
        say('🧠 云端 AI 不可用（'+apiErr(e1)+'），改用浏览器内置 AI（第一次可能要先下载模型）…');
        try{j=await LocalAI.plan(body,function(p){say('⬇️ 正在下载内置 AI 模型 '+p+'%')});viaLocal=true}
        catch(e2){throw new Error(apiErr(e1).slice(0,60)+'；内置 AI 也失败：'+String(e2.message||e2).slice(0,60))}}
      var ev=clean(j.events);
      if(!ev)throw new Error('AI 的结果排到了固定时段/隐藏的日子，或格式不对');
      data=ev;save();draw();
      say(viaLocal?'🧠 内置 AI 已重排（小模型，请检查一下结果）':'🤖 AI 已重排');(j.notes||[]).slice(0,4).forEach(function(n){say('💡 '+String(n).slice(0,60))});
    }catch(e){
      say('🔌 AI 未连接（'+apiErr(e)+'），先用本地规则排');
      localPlan(txt,say);
    }
    if(onDone)onDone()}
