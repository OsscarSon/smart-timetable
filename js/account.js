// 设置页：账号与云同步面板 + 开源库加载状态
(function(){
  var box=document.getElementById('cloud'),libs=document.getElementById('libs');
  function libLine(){
    var L=[['dayjs',typeof dayjs==='function'],['rrule',!!(window.rrule&&window.rrule.RRule)],['ts-fsrs',typeof FS!=='undefined'&&!!FS],
      ['Dexie',typeof Dexie==='function'],['Chart.js',typeof Chart==='function'],['Lucide',!!(window.lucide&&window.lucide.createIcons)],['FullCalendar',!!(window.FullCalendar&&FullCalendar.Calendar)],['lz-string',!!window.LZString],['qrcode',typeof qrcode==='function'],['Supabase',!!(window.supabase&&window.supabase.createClient)]];
    libs.textContent='开源库：'+L.map(function(x){return x[0]+(x[1]?' ✓':' ✗')}).join('　')+(L.some(function(x){return !x[1]})?'（✗ = 没加载到，对应功能自动退回基础版）':'')}
  libLine();
  function inp(type,ph){var i=el('input');i.type=type;i.placeholder=ph;i.autocomplete=type==='password'?'current-password':'email';return i}
  function render(){
    box.innerHTML='';
    var s=window.cloud?cloud.state():{state:'off',msg:'未启用'},u=window.cloud&&cloud.user();
    if(!window.cloud||!cloud.ready()){box.appendChild(el('div','msg','☁️ '+s.msg+'。不开也能正常使用，数据只存在这台设备里。'));return}
    if(!u){
      var em=inp('email','邮箱'),pw=inp('password','密码（至少 6 位）'),r1=el('div','row'),r2=el('div','row'),msg=el('div','msg','登录后，课表、作业、学习进度会在你的所有设备间同步。');
      r1.appendChild(em);r1.appendChild(pw);
      var bi=el('button',null,'登录'),bu=el('button',null,'注册');
      function go(fn,okm){
        var e=em.value.trim(),p=pw.value;if(!e||p.length<6){msg.textContent='请填邮箱和至少 6 位的密码';return}
        bi.disabled=bu.disabled=true;msg.textContent='请稍等…';
        fn(e,p).then(function(d){
          if(okm&&d&&!d.session)msg.textContent='注册成功！请到邮箱点确认链接，然后回来登录。';
          else render()
        }).catch(function(x){msg.textContent='失败：'+String(x.message||x).slice(0,100)}).then(function(){bi.disabled=bu.disabled=false})}
      bi.onclick=function(){go(cloud.signIn)};bu.onclick=function(){go(cloud.signUp,true)};
      r2.appendChild(bi);r2.appendChild(bu);box.appendChild(r1);box.appendChild(r2);box.appendChild(msg);return}
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
