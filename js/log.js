// 记录：一次性安排交给 AI（失败时用本地规则）并重排
  // 记录：读取一次性活动 → 加入课表 → 重排冲突
  var items=document.getElementById('items'),inp=document.getElementById('inp');
  var NUM={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'两':2};
  function num(x){if(/^\d+$/.test(x))return +x;if(x.length===1)return NUM[x];if(x.length===2&&x[0]==='十')return 10+NUM[x[1]];if(x.length===2&&x[1]==='十')return NUM[x[0]]*10;return 0}
  function say(t){var e=items.querySelector('.empty');if(e)e.remove();var li=document.createElement('li');li.textContent=t;items.prepend(li);while(items.children.length>8)items.removeChild(items.lastChild)}
  function parse(clause){
    var day=-1,m;
    if((m=clause.match(/(?:周|礼拜|星期)([一二三四五六日天1-7])/))){var c=m[1];day=(c==='日'||c==='天'||c==='7')?6:(NUM[c]||+c)-1}
    else if(/今天/.test(clause))day=todayIdx;else if(/明天/.test(clause))day=todayIdx+1;else if(/后天/.test(clause))day=todayIdx+2;
    if(day<0||day>6)return null;
    var h=14,pm=/(下午|晚上|傍晚)/.test(clause),t=clause.match(/(上午|早上|中午|下午|晚上)?\s*(\d{1,2}|[一二三四五六七八九十两]{1,3})\s*点/);
    if(t){h=num(t[2]);if(/(下午|晚上)/.test(t[1]||'')&&h<12)h+=12;if(t[1]==='中午'&&h<11)h+=12}
    else if(/早上|上午/.test(clause))h=9;else if(/中午/.test(clause))h=12;else if(/晚上|晚饭/.test(clause))h=19;
    h=Math.max(H0,Math.min(h,H1-1));
    var len=/考试|比赛|旅行|聚会|看电影/.test(clause)?3:2;len=Math.min(len,H1-h);
    var ti=clause.replace(/(这|下)?(周|礼拜|星期)[一二三四五六日天1-7]|今天|明天|后天|(上午|早上|中午|下午|晚上|傍晚)?\s*(\d{1,2}|[一二三四五六七八九十两]{1,3})\s*点/g,'').replace(/^[\s,，我有要会想去和与跟]+/,'').replace(/[。！!]/g,'').trim()||'活动';
    var ic=/球|跑|运动|健身|游泳|比赛/.test(ti)?'🏃 ':/吃|饭|聚|火锅/.test(ti)?'🍽️ ':/考/.test(ti)?'📝 ':'📌 ';
    return {day:day,h:h,len:len,t:ic+ti.slice(0,12),c:/考/.test(ti)?'pink':/球|跑|运动|比赛/.test(ti)?'lemon':'peach'};
  }
  function relocate(x){
    for(var dd=0;dd<7;dd++){var day=(x.day+dd)%7;
      for(var o=0;o<14;o++){var hs=[x.h+o,x.h-o];for(var j=0;j<2;j++){var h=hs[j];
        if(h>=H0&&free(day,h,x.len,x)&&!(dd===0&&o===0)){x.day=day;x.h=h;return true}}}}
    return false;
  }
  function addEvent(ev){
    var moved=[];
    data.filter(function(x){return x.day===ev.day&&x.h<ev.h+ev.len&&x.h+x.len>ev.h}).forEach(function(x){
      
      // 暂时放入新活动，避免挪回原位
      data.push(ev);
      var ok=relocate(x);
      data.pop();
      if(ok)moved.push('「'+x.t+'」→周'+DAYS[x.day]+' '+x.h+':00');
      else{data=data.filter(function(y){return y!==x});moved.push('「'+x.t+'」排不下，已暂时移除')}
    });
    data.push(ev);
    return moved;
  }
  function local(txt){
    var cl=txt.split(/[，,；;。\n]+/).filter(Boolean),n=0,miss=[];
    cl.forEach(function(c){var ev=parse(c);if(!ev){miss.push(c);return}
      var mv=addEvent(ev);n++;
      say('✅ 周'+DAYS[ev.day]+' '+ev.h+':00 '+ev.t+(mv.length?'；已重排 '+mv.join('、'):''))});
    if(miss.length)say('🤔 没看懂时间：'+miss.join('、')+'（请写“周六”“明天”等）');
    if(n){save();draw()}
  }
  function clean(l){
    if(!Array.isArray(l))return null;var out=[];
    for(var i=0;i<l.length;i++){var x=l[i],day=+x.day,h=+x.h,len=+x.len;
      if(!(day>=0&&day<=6&&h>=H0&&len>=1&&len<=4&&h+len<=H1)||day%1||h%1||len%1||!x.t)return null;
      for(var j=0;j<len;j++)if(fxHit(day,h+j))return null;
      var o={day:day,h:h,len:len,t:String(x.t).slice(0,14),c:COLS.indexOf(x.c)>=0?x.c:'peach'};
      if(!free2(out,o))return null;out.push(o)}
    return out}
  function free2(list,o){return !list.some(function(x){return x.day===o.day&&x.h<o.h+o.len&&x.h+x.len>o.h})}
  var addBtn=document.getElementById('add');
  async function go(){
    var txt=inp.value.trim();if(!txt)return;
    addBtn.disabled=true;addBtn.textContent='…';
    try{
      var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},60000);
      var r=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,
        body:JSON.stringify({text:txt,events:data,today:(curW===thisW?todayIdx:-1),hours:[H0,H1],study:ST,sports:SP,fixed:(SET.fx?FX:[])})});
      clearTimeout(tm);
      if(!r.ok){var ej={};try{ej=await r.json()}catch(x){}throw new Error(r.status+' '+(ej.error||''))}
      var j=await r.json(),ev=clean(j.events);
      if(!ev)throw new Error('AI 的结果排到了上课时间或格式不对');
      data=ev;save();draw();
      say('🤖 AI 已重排');(j.notes||[]).slice(0,4).forEach(function(n){say('💡 '+String(n).slice(0,60))});
    }catch(e){
      say('🔌 AI 未连接（'+(e.name==='AbortError'?'等了 60 秒没回应':String(e.message||e).slice(0,160))+'），先用本地规则排');
      local(txt);
    }
    inp.value='';addBtn.disabled=false;addBtn.textContent='排';
  }
  // 记录：逐条列表。勾选 = 这次要排；排完变成 ✅ 已排，不会重复处理
  function lgSave(){put2('mochi-lg',LG)}
  function lgFix(){LG.forEach(function(g){if(g.s===undefined)g.s=g.d?2:0})}
  function ensureEmpty(){var k=LG[LG.length-1];if(!k||k.t.trim()||k.s===2)LG.push({t:'',s:0})}
  function rLg(){
    lgFix();ensureEmpty();
    var box=document.getElementById('lr');box.innerHTML='';
    LG.forEach(function(g,i){
      var r=el('div','lr'+(g.s===2?' fin':'')),c;
      if(g.s===2)c=el('span',null,'✅');
      else{c=el('input');c.type='checkbox';c.checked=g.s===1;c.onchange=function(){g.s=c.checked?1:0;lgSave()}}
      var t=el('input');t.type='text';t.value=g.t;t.disabled=g.s===2;t.placeholder=i===0?'周六与朋友打球':'周日有跑步比赛';
      t.oninput=function(){g.t=t.value;lgSave()};
      t.onkeydown=function(e){if(e.key==='Enter'){ensureEmpty();lgSave();rLg();var ins=box.querySelectorAll('input[type=text]');ins[ins.length-1].focus()}};
      r.appendChild(el('span',null,(i+1)+'.'));r.appendChild(c);r.appendChild(t);box.appendChild(r)});
  }
  document.getElementById('la').onclick=function(){ensureEmpty();lgSave();rLg()};
  var rowBox=addBtn.parentNode;
  var allBtn=el('button','chip','全选'),clrBtn=el('button','chip','清除已排');
  allBtn.onclick=function(){lgFix();LG.forEach(function(g){if(g.s!==2&&g.t.trim())g.s=1});lgSave();rLg()};
  clrBtn.onclick=function(){lgFix();LG=LG.filter(function(g){return g.s!==2});lgSave();rLg()};
  rowBox.insertBefore(allBtn,addBtn);rowBox.insertBefore(clrBtn,addBtn);
  addBtn.onclick=function(){
    lgFix();
    var todo=LG.filter(function(g){return g.s===1&&g.t.trim()});
    if(!todo.length){say('👆 先勾选要排的那几条，再按“排”');return}
    inp.value=todo.map(function(g){return g.t.trim()}).join('，');
    todo.forEach(function(g){g.s=2});lgSave();rLg();go();
  };
  var lgTitle=document.querySelector('.log h2');if(lgTitle)lgTitle.textContent='📝 记录本周特别安排 · v3';
