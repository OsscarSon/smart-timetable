// 设置页：账号与云同步面板 + 开源库加载状态
(function(){
  var box=document.getElementById('cloud'),libs=document.getElementById('libs');
  function libLine(){
    var L=[['dayjs',typeof dayjs==='function'],['rrule',!!(window.rrule&&window.rrule.RRule)],['ts-fsrs',typeof FS!=='undefined'&&!!FS],
      ['Dexie',typeof Dexie==='function'],['Lucide',!!(window.lucide&&window.lucide.createIcons)],['Chart.js',typeof Chart==='function'],['lz-string',!!window.LZString],['qrcode',typeof qrcode==='function'],['Supabase',!!(window.supabase&&window.supabase.createClient)]];
    libs.innerHTML='';
    L.forEach(function(x){libs.appendChild(el('span',x[1]?'ok':'no',x[0]+(x[1]?' ✓':' ✗')))});
    if(L.some(function(x){return !x[1]}))libs.appendChild(el('div','msg','✗ = 没加载到，对应功能自动退回基础版'))}
  libLine();
  function inp(type,ph){var i=el('input');i.type=type;i.placeholder=ph;i.autocomplete=type==='password'?'current-password':'email';i.setAttribute('aria-label',ph);return i}
  function render(){
    box.innerHTML='';
    var s=window.cloud?cloud.state():{state:'off',msg:'未启用'},u=window.cloud&&cloud.user();
    if(!window.cloud||!cloud.ready()){box.appendChild(el('div','msg','☁️ '+s.msg+'。不开也能正常使用，数据只存在这台设备里。'));return}
    if(!u){
      var msg=el('div','msg','登录后，课表、作业、学习进度会在你的所有设备间同步。'),form=el('div','acc');
      var native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());   // 手机 App 的 WebView 不能用 Google 网页登录
      var all=[];
      function busy(v){all.forEach(function(b){b.disabled=v})}
      if(!native&&cloud.signInGoogle){
        var gb=el('button','gbtn');gb.type='button';
        gb.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>使用 Google 继续</span>';
        gb.onclick=function(){
          busy(true);msg.textContent='正在跳转到 Google…';
          cloud.signInGoogle().catch(function(x){
            var m=String((x&&x.message)||x);
            msg.textContent=/provider is not enabled|Unsupported provider/i.test(m)?'Google 登录还没在后台开启（站长要先在 Supabase 里打开 Google 登录）':'失败：'+m.slice(0,100);
            busy(false)})};
        all.push(gb);form.appendChild(gb);form.appendChild(el('div','or','或用邮箱'))}
      var em=inp('email','邮箱'),pw=inp('password','密码（至少 6 位）');
      var bi=el('button','p','登录'),bu=el('button','s','注册'),r2=el('div','abtns');
      bi.type=bu.type='button';all.push(bi,bu);
      function go(fn,okm){
        var e=em.value.trim(),p=pw.value;if(!e||p.length<6){msg.textContent='请填邮箱和至少 6 位的密码';return}
        busy(true);msg.textContent='请稍等…';
        fn(e,p).then(function(d){
          if(okm&&d&&!d.session)msg.textContent='注册成功！请到邮箱点确认链接，然后回来登录。';
          else render()
        }).catch(function(x){msg.textContent='失败：'+String(x.message||x).slice(0,100)}).then(function(){busy(false)})}
      bi.onclick=function(){go(cloud.signIn)};bu.onclick=function(){go(cloud.signUp,true)};
      r2.appendChild(bi);r2.appendChild(bu);form.appendChild(em);form.appendChild(pw);form.appendChild(r2);
      box.appendChild(form);box.appendChild(msg);return}
    var t=el('div','tp'),n=el('div','n','✅ '+u.email);n.appendChild(el('small',null,s.msg||''));t.appendChild(n);box.appendChild(t);
    var r=el('div','row'),b1=el('button',null,'立即同步'),b2=el('button',null,'退出登录');
    b1.onclick=function(){cloud.syncNow()};
    b2.onclick=function(){
      var clr=confirm('退出登录。\n\n要同时清除这台设备上的数据吗？（数据仍保存在云端，适合公用电脑）\n\n【确定】清除本机　【取消】保留本机');
      cloud.signOut(clr).then(function(){if(clr)location.reload();else render()})};
    r.appendChild(b1);r.appendChild(b2);box.appendChild(r);
    box.appendChild(el('div','msg','附件文件在登录后会自动上传到云端，换设备也能打开。'));
  }
  if(window.cloud){cloud.on(render)}
  render();
})();
