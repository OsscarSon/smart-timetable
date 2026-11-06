// 导入 .ics 日历文件（学校日历、Google / Apple 日历导出）。
// 解析：开源库 ical.js（Mozilla，MPL-2.0），能处理时区、复杂重复规则、例外日；没加载到时用下面内置的简易解析（只懂每天 / 每周重复）。
// 流程：选文件 → 展开未来 N 周的事件 → 预览（重复 / 冲突提示）→ 勾选 → 写入（可撤销）。
// 定时事件 → 普通活动（按分钟导入，超出显示范围的会被截到范围内）；全天事件 → 默认不勾，勾上就当作“假期”。
(function(){
  var $=function(i){return document.getElementById(i)},m=$('mask10'),list=$('icl'),msg=$('icm'),rng=$('icr'),ok=$('icok'),file=$('icfile');
  var RAW=null,CAND=[],MAXROWS=150;

  // ---------- 解析：ical.js ----------
  function convLib(t){
    if(t.isDate)return {dn:Math.floor(Date.UTC(t.year,t.month-1,t.day)/MS),min:0,allDay:true};
    var j=t.toJSDate();return {dn:dayNum(j),min:j.getHours()*60+j.getMinutes()}}
  function parseLib(text){
    var comp=new ICAL.Component(ICAL.parse(text));
    comp.getAllSubcomponents('vtimezone').forEach(function(z){try{ICAL.TimezoneService.register(z)}catch(e){}});
    var all=comp.getAllSubcomponents('vevent').map(function(v){return new ICAL.Event(v)}),by={};
    all.forEach(function(e){if(!e.isRecurrenceException())by[e.uid]=e});
    all.forEach(function(e){if(e.isRecurrenceException()&&by[e.uid]){try{by[e.uid].relateException(e)}catch(x){}}});
    return Object.keys(by).map(function(k){return by[k]})}
  function expandLib(ev,from,to,out){
    function add(item,s,e){
      var a=convLib(s);if(a.dn<from||a.dn>to)return;
      var b=e?convLib(e):a,o={dn:a.dn,t:item.summary||ev.summary||'',loc:item.location||''};
      if(a.allDay){o.allDay=true;o.dnEnd=Math.max(a.dn,b.dn-1)}
      else{o.s=a.min;o.e=b.dn>a.dn?1440:Math.max(a.min+30,b.min)}
      out.push(o)}
    if(ev.isRecurring()){
      var ex={};                                   // 排除日：再手动过滤一遍，不只依赖库的内部处理
      try{ev.component.getAllProperties('exdate').forEach(function(p){p.getValues().forEach(function(t){ex[convLib(t).dn]=1})})}catch(e){}
      var it=ev.iterator(),n=0,nx;
      while((nx=it.next())&&n++<4000){
        var d=ev.getOccurrenceDetails(nx),dn=convLib(d.startDate).dn;
        if(dn>to)break;
        if(!ex[dn])add(d.item||ev,d.startDate,d.endDate)}}
    else add(ev,ev.startDate,ev.endDate)}

  // ---------- 解析：内置简易版（没有 ical.js 时）----------
  var BD={MO:0,TU:1,WE:2,TH:3,FR:4,SA:5,SU:6};
  function pt(val,params){
    var x=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(val).trim());if(!x)return null;
    if(!x[4]||/VALUE=DATE(?!-)/i.test(params||''))return {dn:Math.floor(Date.UTC(+x[1],+x[2]-1,+x[3])/MS),min:0,allDay:true};
    var dt=x[7]?new Date(Date.UTC(+x[1],+x[2]-1,+x[3],+x[4],+x[5],+(x[6]||0))):new Date(+x[1],+x[2]-1,+x[3],+x[4],+x[5],+(x[6]||0));
    return {dn:dayNum(dt),min:dt.getHours()*60+dt.getMinutes()}}
  function unesc(s){return String(s||'').replace(/\\[nN]/g,' ').replace(/\\([,;\\])/g,'$1').trim()}
  function parseSimple(text){
    var lines=text.replace(/\r\n|\r/g,'\n').replace(/\n[ \t]/g,'').split('\n'),evs=[],cur=null,skipped=0;
    lines.forEach(function(l){
      if(l==='BEGIN:VEVENT'){cur={ex:[]};return}
      if(l==='END:VEVENT'){if(cur){if(cur.rid)skipped++;else if(cur.s)evs.push(cur)}cur=null;return}
      if(!cur)return;var i=l.indexOf(':');if(i<0)return;
      var head=l.slice(0,i),v=l.slice(i+1),n=head.split(';')[0].toUpperCase(),pr=head.slice(n.length);
      if(n==='SUMMARY')cur.t=unesc(v);else if(n==='LOCATION')cur.loc=unesc(v);
      else if(n==='DTSTART')cur.s=pt(v,pr);else if(n==='DTEND')cur.e=pt(v,pr);
      else if(n==='RECURRENCE-ID')cur.rid=1;
      else if(n==='RRULE'){cur.rr={};v.split(';').forEach(function(p){var k=p.split('=');cur.rr[k[0].toUpperCase()]=k[1]})}
      else if(n==='EXDATE')v.split(',').forEach(function(x){var q=pt(x,pr);if(q)cur.ex.push(q.dn)})});
    evs.skipped=skipped;return evs}
  function expandSimple(ev,from,to,out,st){
    var s=ev.s,e=ev.e||s,span=Math.max(1,e.dn-s.dn),dur=s.allDay?0:Math.max(30,(e.dn-s.dn)*1440+e.min-s.min);
    function add(dn){
      if(dn<from||dn>to||ev.ex.indexOf(dn)>=0)return;
      var o={dn:dn,t:ev.t||'',loc:ev.loc||''};
      if(s.allDay){o.allDay=true;o.dnEnd=dn+span-1}else{o.s=s.min;o.e=Math.min(1440,s.min+dur)}
      out.push(o)}
    var rr=ev.rr;if(!rr){add(s.dn);return}
    var f=rr.FREQ,iv=+rr.INTERVAL||1,cnt=+rr.COUNT||0,until=rr.UNTIL?(pt(rr.UNTIL)||{dn:Infinity}).dn:Infinity;
    if(f!=='DAILY'&&f!=='WEEKLY'){st.unsupported++;add(s.dn);return}
    var by=String(rr.BYDAY||'').split(',').map(function(c){return BD[c.slice(-2)]}).filter(function(x){return x!==undefined});
    if(f==='WEEKLY'&&!by.length)by=[dnDate(s.dn).wd];
    var n=0,guard=0;
    for(var dn=s.dn;dn<=to&&dn<=until&&guard++<6000;dn++){
      var hit=f==='DAILY'?((dn-s.dn)%iv===0):(by.indexOf(dnDate(dn).wd)>=0&&Math.floor((mondayDn(dn)-mondayDn(s.dn))/7)%iv===0);
      if(!hit)continue;n++;if(cnt&&n>cnt)break;add(dn)}}

  // ---------- 候选 → 预览 ----------
  function clean(t){return String(t||'').replace(/\s+/g,' ').trim().slice(0,20)||'（无标题）'}
  function build(){
    var weeks=+rng.value||8,from=todayDn,to=todayDn+weeks*7-1,occ=[],st={unsupported:0};
    try{
      if(RAW.lib)RAW.evs.forEach(function(ev){try{expandLib(ev,from,to,occ)}catch(e){}});
      else RAW.evs.forEach(function(ev){expandSimple(ev,from,to,occ,st)})}
    catch(e){msg.textContent='这个文件读不了：'+String(e&&e.message||e).slice(0,80);list.innerHTML='';ok.hidden=true;return}
    var C={},seen={},out=[],skipOut=0,skipHid=0;
    occ.sort(function(a,b){return a.dn-b.dn||(a.s||0)-(b.s||0)});
    occ.forEach(function(o){
      var key=o.dn+'|'+(o.s||'d')+'|'+o.t;if(seen[key])return;seen[key]=1;       // 同一个事件在文件里出现两次
      var t=clean(o.t);
      if(o.allDay){
        var dup=HOL.some(function(h){return h.a===o.dn&&h.b===o.dnEnd});
        out.push({hol:true,dn:o.dn,dnEnd:o.dnEnd,t:t,dup:dup});return}
      var wd=dnDate(o.dn).wd,w=Sched.weekOf(o.dn);
      if(hiddenDay(wd)){skipHid++;return}
      var st=Math.max(o.s,H0*60),en=Math.min(o.e,H1*60);
      if(en<=st){skipOut++;return}
      var arr=(w===curW?data:WK[w])||[],dup=arr.some(function(x){return x.day===wd&&x.s===st&&x.t===t});
      var clash=Sched.dayItems(o.dn,C).filter(function(x){return st<x.e&&x.s<en})[0];
      out.push({dn:o.dn,wd:wd,w:w,s:st,e:en,t:t,dup:dup,clash:clash?clash.t:'',cut:st!==o.s||en!==o.e,os:o.s,oe:o.e})});
    var total=out.length;CAND=out.slice(0,MAXROWS);
    render(total,skipOut,skipHid,st.unsupported)}
  function row(txt,warn,on,dis){
    var r=el('label','tp ai-it'),cb=el('input');cb.type='checkbox';cb.checked=!!on;cb.disabled=!!dis;
    var n=el('div','n');n.appendChild(document.createTextNode(txt));if(warn)n.appendChild(el('small','w',warn));
    r.appendChild(cb);r.appendChild(n);list.appendChild(r);return cb}
  function dstr(dn){return isoOf(dn)+' 周'+DAYS[dnDate(dn).wd]}
  function render(total,skipOut,skipHid,unsup){
    list.innerHTML='';
    CAND.forEach(function(c){
      if(c.hol)c.cb=row('🎌 '+dstr(c.dn)+(c.dnEnd>c.dn?' – '+isoOf(c.dnEnd):'')+' · '+c.t,c.dup?'已经有同样的假期':'全天事项：勾选 = 加为假期',false,c.dup);
      else c.cb=row('📅 '+dstr(c.dn)+' '+tmin(c.s)+'–'+tmin(c.e)+' · '+c.t,
        c.dup?'已经有同样的安排，跳过':c.clash?'⚠️ 和「'+c.clash+'」时间重叠':c.cut?'原时间 '+tmin(c.os)+'–'+tmin(c.oe)+'，超出显示范围，已截短':'',!c.dup,c.dup)});
    var notes=[];
    if(total>CAND.length)notes.push('只显示前 '+MAXROWS+' 项，其余 '+(total-CAND.length)+' 项没列出（把范围改小可以看到）');
    if(skipOut)notes.push(skipOut+' 个事件不在课表显示的时间范围（'+hm(H0)+'–'+hm(H1)+'）里，已跳过');
    if(skipHid)notes.push(skipHid+' 个落在隐藏的周末，已跳过');
    if(unsup)notes.push(unsup+' 个事件用了内置解析不支持的重复规则，只导入了第一次');
    if(RAW.skipped)notes.push(RAW.skipped+' 个单次修改的重复事件没导入');
    msg.textContent=(CAND.length?'读到 '+RAW.evs.length+' 个事件，未来 '+(+rng.value)+' 周内展开成下面 '+CAND.length+' 项。勾选要导入的，再点「导入」。':'未来 '+(+rng.value)+' 周内没有可导入的事件。')+(notes.length?'\n'+notes.join('；')+'。':'')+(RAW.lib?'':'\n（没加载到 ical.js，用的是内置简易解析：只懂每天 / 每周重复，时区按本机处理。）');
ok.hidden=!CAND.length}

  // ---------- 写入 ----------
  ok.onclick=function(){
    var pick=CAND.filter(function(c){return c.cb&&c.cb.checked&&!c.cb.disabled});
    if(!pick.length){msg.textContent='还没有勾选任何一项';return}
    var snap=Undo.snap(),n=0,hn=0;
    pick.forEach(function(c){
      if(c.hol){HOL.push({id:uid(),n:c.t.slice(0,12),a:c.dn,b:c.dnEnd});hn++;return}
      (WK[c.w]=WK[c.w]||[]).push({day:c.wd,s:c.s,e:c.e,t:c.t,c:subjCol(c.t)});n++});
    WK[curW]=data;Object.keys(WK).forEach(function(w){saveWeek(+w)});if(hn){holSave();if(window.holRender)holRender()}draw();
    m.classList.remove('show');
    Undo.toast('已导入 '+(n?n+' 项活动':'')+(n&&hn?'、':'')+(hn?hn+' 个假期':''),snap)};

  // ---------- 选文件 ----------
  function open(){file.click()}
  file.onchange=function(){
    var f=file.files&&file.files[0];file.value='';if(!f)return;
    if(f.size>3e6){alert('文件超过 3MB，太大了');return}
    var rd=new FileReader();
    rd.onload=function(){
      var text=String(rd.result||'');
      if(text.indexOf('BEGIN:VCALENDAR')<0){alert('这不是 .ics 日历文件');return}
      try{
        if(window.ICAL)RAW={lib:true,evs:parseLib(text)};
        else{var e=parseSimple(text);RAW={lib:false,evs:e,skipped:e.skipped}}}
      catch(err){alert('这个文件读不了：'+String(err&&err.message||err).slice(0,80));return}
      if(!RAW.evs.length){alert('文件里没有事件');return}
      m.classList.add('show');build()};
    rd.onerror=function(){alert('读取文件失败')};rd.readAsText(f)};
  rng.onchange=function(){if(RAW)build()};
  m.onclick=function(){m.classList.remove('show')};$('icx').onclick=function(){m.classList.remove('show')};
  $('icbtn').onclick=open;window.openIcs=open;
})();
