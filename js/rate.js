// ≡ 菜单 →「给 Mochi 评分」：点星星打分，下面显示大家的评分统计（平均分 + 1–5 星分布）。
// 统计走 Supabase 的两个函数 rating_stats() / submit_rating()（见 supabase/ratings.sql，要在 Supabase 的 SQL Editor 里运行一次）。
// 没配置云端 / 没联网 / 函数还没建：评分先存在本机（键 app-rate，故意不用 mochi- 开头，不参与云同步和备份），统计区显示“暂时看不到”。
// 文字按界面语言直接内置（和 about.js 一样，不走词典）。
(function(){
  var L=window.LANG||'en',I=L==='zh'?0:L==='ms'?2:1;
  function t(a){return a[I]}
  var T={
    menu:['给 Mochi 评分','Rate Us','Nilaikan Mochi'],
    menuSub:['喜欢 Mochi 吗？告诉我们！','Love the app? Let us know!','Suka app ini? Beritahu kami!'],
    h:['给 Mochi 评分','Rate Mochi','Nilaikan Mochi'],
    intro:['用得开心吗？点一颗星告诉我们。','Enjoying Mochi? Tap a star to tell us.','Seronok guna Mochi? Ketik bintang untuk beritahu kami.'],
    lbl:[['很失望','不太好','还可以','不错','太棒了！'],['Disappointed','Not great',"It's okay",'Good','Love it!'],['Kecewa','Kurang baik','Boleh tahan','Bagus','Suka sangat!']],
    submit:['提交评分','Submit rating','Hantar nilaian'],
    update:['更新评分','Update rating','Kemas kini nilaian'],
    pick:['先点一颗星','Tap a star first','Ketik bintang dahulu'],
    sending:['提交中…','Submitting…','Menghantar…'],
    thanks:['谢谢你的评分！','Thanks for rating!','Terima kasih atas nilaian!'],
    local:['已保存在这台设备。联网后再打开这里，会再提交一次。','Saved on this device. Open this again when online and it will be sent.','Disimpan pada peranti ini. Buka semula apabila dalam talian untuk menghantar.'],
    yours:['你的评分','Your rating','Nilaian anda'],
    sh:['大家的评分','Ratings from everyone','Nilaian semua pengguna'],
    load:['正在加载统计…','Loading stats…','Memuatkan statistik…'],
    empty:['还没有人评分，来当第一个吧！','No ratings yet — be the first!','Belum ada nilaian — jadilah yang pertama!'],
    off:['暂时看不到统计（需要联网）。','Stats aren\u2019t available right now (internet needed).','Statistik tidak tersedia buat masa ini (perlu internet).'],
    retry:['重试','Retry','Cuba lagi'],
    note:['每台设备只算一票；重新评分会更新原来的那一票。','One vote per device; rating again updates your earlier vote.','Satu undi setiap peranti; nilai semula akan mengemas kini undi lama.'],
    close:['关闭','Close','Tutup']
  };
  function cnt(n){return L==='zh'?n+' 个评分':L==='ms'?n+' nilaian':n+(n===1?' rating':' ratings')}
  var KEY='app-rate',IDK='app-rate-id',SK='app-rate-stats';
  function jget(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function jset(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function devId(){
    var id='';try{id=localStorage.getItem(IDK)||''}catch(e){}
    if(!/^[0-9a-f]{32}$/.test(id)){
      id='';try{var a=new Uint8Array(16);crypto.getRandomValues(a);a.forEach(function(b){id+=('0'+b.toString(16)).slice(-2)})}
      catch(e){for(var i=0;i<32;i++)id+=Math.floor(Math.random()*16).toString(16)}
      try{localStorage.setItem(IDK,id)}catch(e){}}
    return id}
  function platform(){try{var c=window.Capacitor;if(c&&c.getPlatform)return String(c.getPlatform()).slice(0,12)}catch(e){}return 'web'}
  // ---- 云端：直接用 REST 调 Supabase 函数，不依赖 supabase-js 是否加载 ----
  function cfg(){
    var C=window.MOCHI_CFG||{},u=String(C.supabaseUrl||'').trim(),k=String(C.supabaseKey||'').trim().replace(/^['"]|['"]$/g,'');
    try{u=new URL(u).origin}catch(e){return null}
    return k?{u:u,k:k}:null}
  function rpc(name,body){
    var a=cfg();if(!a)return Promise.reject(new Error('off'));
    var ctl=window.AbortController?new AbortController():null,tm=setTimeout(function(){if(ctl)ctl.abort()},9000);
    var h={'Content-Type':'application/json',apikey:a.k};if(/^eyJ/.test(a.k))h.Authorization='Bearer '+a.k;   // 新式 sb_publishable_ key 不是 JWT，只带 apikey
    return fetch(a.u+'/rest/v1/rpc/'+name,{method:'POST',headers:h,body:JSON.stringify(body||{}),signal:ctl?ctl.signal:undefined})
      .then(function(r){clearTimeout(tm);if(!r.ok)throw new Error('http '+r.status);return r.json()},function(e){clearTimeout(tm);throw e})}
  function norm(s){
    if(Array.isArray(s))s=s[0];
    if(!s||typeof s!=='object')return null;
    var d=(Array.isArray(s.d)?s.d:[]).slice(0,5).map(function(n){n=Number(n);return n>0?Math.floor(n):0});
    while(d.length<5)d.push(0);
    var tot=d.reduce(function(a,b){return a+b},0);
    return {total:tot,avg:tot?d.reduce(function(a,c,i){return a+c*(i+1)},0)/tot:0,d:d}}
  function fetchStats(){return rpc('rating_stats',{}).then(function(r){var s=norm(r);if(!s)throw new Error('bad');jset(SK,s);return s})}
  function send(stars){return rpc('submit_rating',{p_device:devId(),p_stars:stars,p_platform:platform(),p_version:String(window.MOCHI_VERSION||'')}).then(function(r){var s=norm(r);if(s)jset(SK,s);return s})}

  // ---- 界面 ----
  var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.9-4.8 4.6 1.2 6.5L12 17.4l-5.8 3.2 1.2-6.5L2.6 9.5l6.5-.9z"/></svg>';
  var m=null,sel=0,els={};
  function starsRow(cls){var r=el('div',cls);for(var i=0;i<5;i++){var s=el('span','rt-st');s.innerHTML=STAR;r.appendChild(s)}return r}
  function paintStars(){
    [].forEach.call(els.btns,function(b,i){var on=i<sel;b.classList.toggle('on',on);b.setAttribute('aria-checked',i===sel-1?'true':'false')});
    els.lbl.textContent=sel?t(T.lbl)[sel-1]:'';
    var mine=jget(KEY);els.go.textContent=mine&&mine.stars?t(T.update):t(T.submit)}
  function renderStats(s,stale){
    var b=els.stats;b.innerHTML='';
    if(!s){b.appendChild(el('div','msg',t(T.off)));var r=el('button','chip',t(T.retry));r.type='button';r.onclick=loadStats;b.appendChild(r);return}
    if(!s.total){b.appendChild(el('div','msg rt-empty',t(T.empty)));return}
    var sum=el('div','rt-sum'),big=el('div','rt-big'),n=el('b',null,(Math.round(s.avg*10)/10).toFixed(1)),st=starsRow('rt-sts'),fg=starsRow('rt-sts rt-fg');
    var wrap=el('div','rt-stw');wrap.appendChild(st);fg.style.width=Math.max(0,Math.min(100,s.avg/5*100))+'%';wrap.appendChild(fg);
    big.appendChild(n);big.appendChild(wrap);big.appendChild(el('small',null,cnt(s.total)));
    var bars=el('div','rt-bars');
    for(var k=5;k>=1;k--){var c=s.d[k-1],p=Math.round(c/s.total*100),row=el('div','rt-b'),tr=el('div','rt-tr'),fl=el('div','rt-fl');
      fl.style.width=(c?Math.max(p,3):0)+'%';tr.appendChild(fl);
      row.appendChild(el('span','rt-n',String(k)));row.appendChild(tr);row.appendChild(el('span','rt-c',String(c)));row.setAttribute('aria-label',k+' ★ · '+c);bars.appendChild(row)}
    sum.appendChild(big);sum.appendChild(bars);b.appendChild(sum)}
  function loadStats(){
    var cached=jget(SK),ns=norm(cached);
    if(ns)renderStats(ns);else{els.stats.innerHTML='';els.stats.appendChild(el('div','msg',t(T.load)))}
    fetchStats().then(renderStats,function(){if(!ns)renderStats(null)})}
  function mineBox(){
    var mine=jget(KEY);els.mine.innerHTML='';els.mine.hidden=!(mine&&mine.stars);
    if(mine&&mine.stars)els.mine.textContent=t(T.yours)+'：'+'★'.repeat(mine.stars)+'☆'.repeat(5-mine.stars)}
  function submit(){
    if(!sel){els.msg.textContent=t(T.pick);return}
    els.go.disabled=true;els.msg.textContent=t(T.sending);
    var rec={stars:sel,at:Date.now(),synced:false};jset(KEY,rec);
    send(sel).then(function(s){rec.synced=true;jset(KEY,rec);els.msg.textContent=t(T.thanks);if(s)renderStats(s);else loadStats()},
      function(){els.msg.textContent=t(T.local)}).then(function(){els.go.disabled=false;mineBox();paintStars()})}
  function build(){
    m=el('div','mask');m.id='mask-rate';m.onclick=close;
    var d=el('div','dlg rt');d.onclick=function(e){e.stopPropagation()};d.setAttribute('role','dialog');d.setAttribute('aria-label',t(T.h));
    d.appendChild(el('h2',null,t(T.h)));d.appendChild(el('div','msg',t(T.intro)));
    var row=el('div','rt-stars');row.setAttribute('role','radiogroup');row.setAttribute('aria-label',t(T.h));els.btns=[];
    for(var i=1;i<=5;i++)(function(v){var b=el('button','rt-s');b.type='button';b.innerHTML=STAR;b.setAttribute('role','radio');b.setAttribute('aria-checked','false');b.setAttribute('aria-label',v+' / 5 · '+t(T.lbl)[v-1]);
      b.onclick=function(){sel=v;els.msg.textContent='';paintStars()};row.appendChild(b);els.btns.push(b)})(i);
    d.appendChild(row);els.lbl=el('div','rt-lbl');d.appendChild(els.lbl);
    els.mine=el('div','msg rt-mine');d.appendChild(els.mine);
    els.msg=el('div','msg rt-msg');els.msg.setAttribute('role','status');d.appendChild(els.msg);
    var ac=el('div','acts');els.go=el('button','ok');els.go.type='button';els.go.onclick=submit;ac.appendChild(els.go);d.appendChild(ac);
    d.appendChild(el('h3','hs',t(T.sh)));els.stats=el('div','rt-stats');d.appendChild(els.stats);
    d.appendChild(el('div','msg rt-note',t(T.note)));
    var ac2=el('div','acts'),x=el('button',null,t(T.close));x.type='button';x.onclick=close;ac2.appendChild(x);d.appendChild(ac2);
    m.appendChild(d);document.body.appendChild(m)}
  function close(){if(m)m.classList.remove('show')}
  window.openRate=function(){
    if(!m)build();
    var mine=jget(KEY);sel=mine&&mine.stars?mine.stars:0;els.msg.textContent='';mineBox();paintStars();m.classList.add('show');loadStats();
    if(mine&&mine.stars&&mine.synced===false)send(mine.stars).then(function(s){mine.synced=true;jset(KEY,mine);if(s)renderStats(s)},function(){})}   // 上次没发出去的，这次补发
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  window.RATE_MENU=[t(T.menu),t(T.menuSub)];
})();
