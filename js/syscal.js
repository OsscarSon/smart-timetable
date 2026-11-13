// 手机系统日历读写（只有手机 App；网页版里这一块一直是隐藏的）。
// 用开源插件 @ebarooni/capacitor-calendar（MIT）：写入 = 把未来 4 周的课程 / 活动放进系统日历；导入 = 把系统日历的事件加成 Mochi 活动。
// 写入过的事件 id 只存在本机（键名不以 mochi- 开头，所以不会被云同步），下次写入前先删掉，避免重复。
(function(){
  var C=window.Capacitor,box=document.getElementById('scbox');
  if(!box||!C||!C.isNativePlatform||!C.isNativePlatform())return;
  var CAL=(C.Plugins&&(C.Plugins.CapacitorCalendar||C.Plugins.EBarooniCapacitorCalendar))||(C.registerPlugin?C.registerPlugin('CapacitorCalendar'):null);
  if(!CAL)return;
  box.hidden=false;
  var wr=document.getElementById('scw'),rd=document.getElementById('scr'),un=document.getElementById('scu'),msg=document.getElementById('scmsg');
  var KEY='syscal-ids',WEEKS=4,TAG='[Mochi]';
  function say(t){msg.textContent=t}
  function ids(){try{return JSON.parse(localStorage.getItem(KEY)||'{}').ids||[]}catch(e){return[]}}
  function put(a){try{localStorage.setItem(KEY,JSON.stringify({ids:a,at:Date.now()}))}catch(e){}}
  async function access(){var r=await CAL.requestFullCalendarAccess();return !!r&&r.result==='granted'}
  function ms(dn,m){var x=dnDate(dn);return new Date(x.y,x.m-1,x.d,Math.floor(m/60),m%60).getTime()}
  async function clearOld(){
    var old=ids();if(!old.length)return -1;var n=0;
    try{var r=await CAL.deleteEventsById({ids:old});n=((r&&r.result&&r.result.deleted)||[]).length}catch(e){}
    put([]);return n}
  var NOPERM='没有日历权限：请在手机设置 → 应用 → Mochi → 权限 里允许“日历”';

  wr.onclick=async function(){
    wr.disabled=true;
    try{
      if(!await access()){say(NOPERM);return}
      var def=null;try{var d=await CAL.getDefaultCalendar({useFallbackCalendar:true});def=d&&d.result}catch(e){}
      if(!def||!def.id){say('找不到手机上的日历。请先在系统日历 App 里登录一个账号（例如 Google）。');return}
      await clearOld();
      var made=[],bad=0,items=window.NATIVE_DAYITEMS;
      for(var k=0;k<WEEKS*7;k++){
        var dn=todayDn+k,its=items?items(dn):[];
        for(var j=0;j<its.length;j++){
          var it=its[j];
          try{var r=await CAL.createEvent({title:it.t||'（无标题）',location:it.l||undefined,description:TAG+' Mochi',
              startDate:ms(dn,it.s),endDate:ms(dn,it.e),calendarId:String(def.id)});
            if(r&&r.id)made.push(String(r.id))}catch(e){bad++}}
        if(k%4===0)say('正在写入… '+made.length)}
      put(made);
      say('已写入 '+made.length+' 项到「'+(def.title||'默认日历')+'」（未来 4 周）'+(bad?'，失败 '+bad:'')+'。再点一次会先删掉上次写入的，不会重复。');
    }catch(e){say('写入失败：'+(e&&e.message||e))}
    finally{wr.disabled=false}};

  un.onclick=async function(){
    un.disabled=true;
    try{if(!await access()){say(NOPERM);return}
      var n=await clearOld();say(n<0?'没有写入过的事件':'已删掉上次写入的 '+n)}
    catch(e){say('写入失败：'+(e&&e.message||e))}
    finally{un.disabled=false}};

  rd.onclick=async function(){
    rd.disabled=true;
    try{
      if(!await access()){say(NOPERM);return}
      var r=await CAL.listEventsInRange({from:ms(todayDn,0),to:ms(todayDn+WEEKS*7,0)}),mine={};
      ids().forEach(function(i){mine[i]=1});
      var evs=((r&&r.result)||[]).filter(function(e){return !e.isAllDay&&!mine[String(e.id)]&&String(e.description||'').indexOf(TAG)<0});
      var add=[],skip=0;
      evs.forEach(function(e){
        var a=new Date(e.startDate),b=new Date(e.endDate),dn=dayNum(a),endDn=dayNum(b);
        var s=a.getHours()*60+a.getMinutes(),en=endDn===dn?b.getHours()*60+b.getMinutes():(endDn===dn+1&&b.getHours()===0&&b.getMinutes()===0?1440:-1);
        if(en<=s||s<D0*60||en>D1*60){skip++;return}
        var t=String(e.title||'').replace(/\s+/g,' ').trim().slice(0,20)||'（无标题）',wd=dnDate(dn).wd,w=Math.floor((dn+3-SET.ws)/7);
        var list=(w===curW?data:WK[w])||[];
        if(list.some(function(x){return x.day===wd&&x.s===s&&x.e===en&&x.t===t})){skip++;return}
        add.push({w:w,wd:wd,s:s,e:en,t:t})});
      if(!add.length){say('系统日历里未来 4 周没有可导入的事件（全天事件、跨天事件会跳过）');return}
      if(!confirm('从手机日历导入 '+add.length+' 项活动？'+(skip?'（另有 '+skip+' 项因跨天 / 超出课表时间范围 / 已存在而跳过）':'')))return;
      var snap=Undo.snap(),touched={};
      add.forEach(function(it){(it.w===curW?data:(WK[it.w]=WK[it.w]||[])).push({day:it.wd,s:it.s,e:it.e,t:it.t,c:subjCol(it.t)});touched[it.w]=1});
      Object.keys(touched).forEach(function(w){saveWeek(+w)});
      draw();if(typeof bnr==='function')bnr();
      Undo.toast('已加入 '+add.length+' 项',snap);say('已加入 '+add.length+' 项');
    }catch(e){say('导入失败：'+(e&&e.message||e))}
    finally{rd.disabled=false}};
})();
