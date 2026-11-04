// 账号 + 云同步（Supabase）。做法：本机 localStorage 里每个 mochi-* 键是一行，按“最后修改者赢”同步。
// 附件文件放 Supabase Storage（bucket: hw-files），附件清单跟着作业数据一起同步。
// 没填 js/config.js 或没加载到 supabase 库时，整个模块安静地不工作。
(function(){
  var C=window.MOCHI_CFG||{},H=window.MOCHI_HOOK,SB=null,USER=null,ST={state:'off',msg:''};
  var MK='mochi-sync-meta',UK='mochi-sync-uid',RK='mochi-sync-rm';
  var META={},pushing=false,syncing=false,timer=null,subs=[],changedPending=false;
  try{META=JSON.parse(localStorage.getItem(MK)||'{}')||{}}catch(e){META={}}
  function saveMeta(){try{H.raw.set(MK,JSON.stringify(META))}catch(e){}}
  function syncKey(k){return k.indexOf('mochi-')===0&&k.indexOf('mochi-sync')!==0}
  function emit(){subs.forEach(function(f){try{f(ST)}catch(e){}})}
  function setSt(s,m){ST.state=s;ST.msg=m||'';emit()}
  function hhmm(){var n=new Date();return pad2(n.getHours())+':'+pad2(n.getMinutes())}
  function emsg(e){return String((e&&e.message)||e).slice(0,120)}

  // META[k] = {t:最后修改时间(ms)，q:修改计数，p:1=还没推到云端，d:1=已删除}
  function touch(k,del){
    if(!syncKey(k))return;
    var m=META[k]||{q:0};m.t=Date.now();m.q=(m.q||0)+1;m.p=1;m.d=del?1:0;META[k]=m;saveMeta();
    if(USER)later(1500)}
  if(H)H.on(touch);
  function later(ms){clearTimeout(timer);timer=setTimeout(function(){push()},ms)}
  function localKeys(){var o=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(syncKey(k))o.push(k)}return o}

  async function push(){
    if(!USER||pushing)return;
    var keys=Object.keys(META).filter(function(k){return META[k].p&&syncKey(k)});
    if(!keys.length)return;
    pushing=true;var ok=false;
    try{
      var snap={},rows=keys.map(function(k){
        snap[k]=META[k].q;var v=localStorage.getItem(k),del=!!META[k].d||v===null;
        return {user_id:USER.id,key:k,value:del?null:v,deleted:del}});
      var r=await SB.from('user_data').upsert(rows,{onConflict:'user_id,key'}).select('key,updated_at');
      if(r.error)throw r.error;
      (r.data||[]).forEach(function(row){var m=META[row.key];if(m&&m.q===snap[row.key]){m.p=0;m.t=Date.parse(row.updated_at)}});
      saveMeta();ok=true;setSt('ok','已同步 '+hhmm());
    }catch(e){setSt('err','同步失败：'+emsg(e))}
    pushing=false;
    if(ok&&Object.keys(META).some(function(k){return META[k].p&&syncKey(k)}))later(3000);
  }

  function apply(row){
    if(row.deleted||row.value===null)H.raw.del(row.key);else H.raw.set(row.key,row.value);
    META[row.key]={t:Date.parse(row.updated_at),q:(META[row.key]&&META[row.key].q)||0,p:0,d:row.deleted?1:0};
  }
  async function pull(){
    var r=await SB.from('user_data').select('key,value,deleted,updated_at');
    if(r.error)throw r.error;
    var rem={};(r.data||[]).forEach(function(row){if(syncKey(row.key))rem[row.key]=row});
    var first=localStorage.getItem(UK)!==USER.id,useRemote=true,changed=0,taken={};
    if(first&&localKeys().some(function(k){return rem[k]&&!rem[k].deleted})){
      useRemote=confirm('云端已经有这个账号的数据了。\n\n【确定】= 用云端数据覆盖这台设备\n【取消】= 用这台设备的数据覆盖云端');
    }
    Object.keys(rem).forEach(function(k){
      var row=rem[k],m=META[k],rt=Date.parse(row.updated_at),cur=localStorage.getItem(k),take;
      if(first)take=useRemote||cur===null;            // 第一次登录：按上面的选择；本机没有的一律拿下来
      else take=!m||rt>m.t;                           // 之后：谁新听谁的
      if(!take)return;
      taken[k]=1;if(cur!==(row.deleted?null:row.value))changed++;
      apply(row)});
    localKeys().forEach(function(k){                  // 本机有、云端没有 / 本机更新的，标记要上传
      var m=META[k];
      if(!rem[k]){if(!m||!m.p)META[k]={t:Date.now(),q:((m&&m.q)||0)+1,p:1,d:0};return}
      if(taken[k])return;
      if(first&&!useRemote)META[k]={t:Date.now(),q:((m&&m.q)||0)+1,p:1,d:0}});
    H.raw.set(UK,USER.id);saveMeta();
    return changed;
  }
  async function syncNow(){
    if(!USER||syncing)return;syncing=true;setSt('busy','同步中…');
    try{
      var n=await pull();await push();
      if(window.fileFlush)window.fileFlush();
      if(n){changedPending=true;maybeReload()}
    }catch(e){setSt('err','同步失败：'+emsg(e))}
    syncing=false;
  }
  function maybeReload(){
    if(!changedPending)return;
    if(document.querySelector('.mask.show')){setSt('ok','云端有新数据，关掉窗口后点“立即同步”刷新');return}
    changedPending=false;location.reload();
  }

  // ---- 附件文件：Supabase Storage ----
  function bk(){return SB.storage.from('hw-files')}
  function rmQ(){try{return JSON.parse(localStorage.getItem(RK)||'[]')}catch(e){return []}}
  function rmSave(l){try{H.raw.set(RK,JSON.stringify(l))}catch(e){}}

  window.cloud={
    ready:function(){return !!SB},
    user:function(){return USER},
    state:function(){return ST},
    on:function(f){subs.push(f)},
    syncNow:syncNow,
    signIn:async function(email,pw){var r=await SB.auth.signInWithPassword({email:email,password:pw});if(r.error)throw r.error;return r.data},
    signUp:async function(email,pw){var r=await SB.auth.signUp({email:email,password:pw});if(r.error)throw r.error;return r.data},
    signOut:async function(clear){
      await SB.auth.signOut();USER=null;H.raw.del(UK);META={};H.raw.del(MK);
      if(clear){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('mochi-')===0)ks.push(k)}
        ks.forEach(function(k){H.raw.del(k)});try{indexedDB.deleteDatabase('mochi-files')}catch(e){}}
      setSt('out');
    },
    upload:async function(id,blob){var r=await bk().upload(USER.id+'/'+id,blob,{upsert:true,contentType:blob.type||'application/octet-stream'});if(r.error)throw r.error;return true},
    download:async function(id){var r=await bk().download(USER.id+'/'+id);if(r.error)throw r.error;return r.data},
    delFile:function(id){var l=rmQ();if(l.indexOf(id)<0){l.push(id);rmSave(l)}if(USER)this.flushRm()},
    flushRm:async function(){
      var l=rmQ();if(!l.length||!USER)return;
      try{var r=await bk().remove(l.map(function(i){return USER.id+'/'+i}));if(!r.error)rmSave([])}catch(e){}}
  };

  if(!C.supabaseUrl||!C.supabaseKey){setSt('off','未配置（填 js/config.js）');return}
  if(!window.supabase||!window.supabase.createClient){setSt('off','没加载到 supabase 库（检查网络）');return}
  SB=window.supabase.createClient(C.supabaseUrl,C.supabaseKey);
  SB.auth.getSession().then(function(r){
    USER=(r.data&&r.data.session&&r.data.session.user)||null;
    if(USER)syncNow();else setSt('out')});
  SB.auth.onAuthStateChange(function(ev,sess){
    setTimeout(function(){                           // 官方建议：别在回调里直接 await supabase 调用
      var u=(sess&&sess.user)||null,was=USER;USER=u;
      if(u&&(!was||was.id!==u.id))syncNow();
      if(!u&&ev==='SIGNED_OUT')setSt('out');else emit()},0)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&USER)syncNow()});
  window.addEventListener('online',function(){if(USER)syncNow()});
  setInterval(function(){if(USER&&!document.hidden)syncNow()},5*60*1000);
})();
