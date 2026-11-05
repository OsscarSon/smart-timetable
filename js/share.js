// 分享与导出：① 导出 .ics（Google / Apple 日历可导入）② 分享课表（lz-string 压成链接 + qrcode-generator 二维码）③ 打开分享链接时导入
(function(){
  var DOW=['MO','TU','WE','TH','FR','SA','SU'],shmsg=document.getElementById('shmsg'),qr=document.getElementById('shqr');

  // ---------- .ics ----------
  function esc(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
  function fold(l){var o=[];while(l.length>72){o.push(l.slice(0,72));l=' '+l.slice(72)}o.push(l);return o.join('\r\n')}
  function dts(dn,min){var x=dnDate(dn);return x.y+pad2(x.m)+pad2(x.d)+'T'+pad2(Math.floor(min/60))+pad2(min%60)+'00'}
  function ev(o){        // o: {id,dn,s,e,t,loc,desc,rr,ex[]}
    var L=['BEGIN:VEVENT','UID:'+o.id+'@mochi','DTSTAMP:'+new Date().toISOString().replace(/[-:]|\.\d+/g,''),
      'DTSTART:'+dts(o.dn,o.s),'DTEND:'+dts(o.dn,o.e),'SUMMARY:'+esc(o.t)];
    if(o.loc)L.push('LOCATION:'+esc(o.loc));if(o.desc)L.push('DESCRIPTION:'+esc(o.desc));
    if(o.rr)L.push('RRULE:'+o.rr);(o.ex||[]).forEach(function(dn){L.push('EXDATE:'+dts(dn,o.s))});
    L.push('END:VEVENT');return L.map(fold).join('\r\n')}
  // 假期里的出现日期（EXDATE）：把假期区间逐天过一遍，凡是落在“规则会出现的日子”上的就排除
  function holDays(match){
    var out=[];if(typeof HOL==='undefined')return out;
    HOL.forEach(function(h){var hi=Math.min(h.b,h.a+800);for(var dn=h.a;dn<=hi;dn++)if(match(dn))out.push(dn)});
    return out}
  function buildIcs(){
    var out=[],n=0,cyc=TT.cyc||1,anc=TT.anc!=null?TT.anc:mondayDn(todayDn);
    FX.forEach(function(l){                       // 固定课程：每周 / 每 N 周重复；尊重学期起止日期和假期
      var ks=(cyc>1&&l.wk&&l.wk.length)?l.wk:[0],step=(cyc>1&&l.wk&&l.wk.length)?cyc:1;
      ks.forEach(function(k){
        var first=anc+(k?(k-1)*7:0)+l.day;
        if(l.d0!=null&&first<l.d0)first+=Math.ceil((l.d0-first)/(7*step))*7*step;
        var rr='FREQ=WEEKLY;INTERVAL='+step+(l.d1!=null?';UNTIL='+dts(l.d1,23*60+59):'');
        if(l.d1!=null&&first>l.d1)return;
        var ex=SET.fxh?holDays(function(dn){return dn>=first&&(dn-first)%(7*step)===0&&(l.d1==null||dn<=l.d1)}):[];
        out.push(ev({id:l.id+'-'+k,dn:first,s:l.s,e:l.e,t:l.t,loc:[(l.bld||'')+(l.room||'')].filter(Boolean).join(''),
          desc:[l.teacher,l.type!=='课'?l.type:''].filter(Boolean).join(' · '),rr:rr,ex:ex}));n++})});
    RP.forEach(function(r){                       // 重复活动
      var rr=r.mo?'FREQ=MONTHLY;BYDAY='+(r.mo===-1?'-1':r.mo)+DOW[r.day]:'FREQ=WEEKLY;INTERVAL='+(r.ev||1);
      if(r.un!=null)rr+=';UNTIL='+dts(r.un,23*60+59);
      var ex=(r.sk||[]).slice();
      if(r.xh)holDays(function(dn){
        if(dn<r.a0||(r.un!=null&&dn>r.un)||dnDate(dn).wd!==r.day)return false;
        if(r.mo)return r.mo===-1?dnDate(dn+7).m!==dnDate(dn).m:nthOf(dn)===r.mo;
        return (dn-r.a0)%(7*(r.ev||1))===0}).forEach(function(dn){ex.push(dn)});
      out.push(ev({id:r.id,dn:r.a0,s:r.s,e:r.e,t:r.t,rr:rr,ex:ex}));n++});
    WK[curW]=data;
    Object.keys(WK).forEach(function(w){          // 手动安排（每一周）
      (WK[w]||[]).forEach(function(x,i){out.push(ev({id:'m'+w+'-'+i+'-'+x.day+'-'+x.s,dn:dnOf(+w,x.day),s:x.s,e:x.e,t:x.t}));n++})});
    return {n:n,text:['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mochi//Timetable//ZH','CALSCALE:GREGORIAN','X-WR-CALNAME:'+esc(TT.name)].concat(out).concat(['END:VCALENDAR']).join('\r\n')+'\r\n'}}
  document.getElementById('ics').onclick=function(){
    var r=buildIcs();if(!r.n){shmsg.textContent='还没有可导出的内容～';return}
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([r.text],{type:'text/calendar;charset=utf-8'}));
    a.download='mochi-'+TT.name+'.ics';document.body.appendChild(a);a.click();a.remove();
    shmsg.textContent='已导出 '+r.n+' 项（重复课程写成了重复规则；已按学期起止日期截断，设置了“假期里不出现”的课程 / 活动已把假期日期排除）。'};

  // ---------- 分享 ----------
  function baseUrl(){var b=(window.MOCHI_CFG&&MOCHI_CFG.apiBase)||'';return (b||(location.origin+location.pathname)).split('#')[0]}
  document.getElementById('shl').onclick=function(){
    qr.innerHTML='';
    if(!window.LZString){shmsg.textContent='lz-string 没加载到，暂时不能生成分享链接。';return}
    if(!FX.length){shmsg.textContent='这个课表还没有固定课程可分享～（先到「固定课表」里加课）';return}
    var p={v:1,n:TT.name,cyc:TT.cyc||1,per:TT.per.map(function(x){return [x.s,x.e]}),
      fx:FX.map(function(x){return [x.day,x.s,x.e,x.t,x.room,x.teacher,x.type,x.wk||0,x.c]})};
    var url=baseUrl()+'#share='+LZString.compressToEncodedURIComponent(JSON.stringify(p));
    var inp=el('input');inp.readOnly=true;inp.value=url;inp.onfocus=function(){inp.select()};
    var row=el('div','row'),cp=el('button',null,'复制链接');
    cp.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){shmsg.textContent='已复制 ✓'},function(){inp.select();shmsg.textContent='请长按链接框手动复制'})};
    row.appendChild(cp);
    if(navigator.share){var sb=el('button',null,'系统分享');sb.onclick=function(){navigator.share({title:'Mochi 课表：'+TT.name,url:url}).catch(function(){})};row.appendChild(sb)}
    qr.appendChild(inp);qr.appendChild(row);
    if(typeof qrcode==='function'){
      try{var q=qrcode(0,'L');q.addData(url);q.make();var box=el('div');box.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});qr.appendChild(box)}
      catch(e){shmsg.textContent='课表比较大，二维码装不下，请用链接分享。'}}
    if(!/二维码装不下/.test(shmsg.textContent))shmsg.textContent='朋友打开链接 / 扫码就能把「'+TT.name+'」导入成新课表（'+FX.length+' 节课）。'+(url.length>1800?' 链接较长，建议用「系统分享」。':'')};

  // ---------- 打开分享链接 → 导入 ----------
  function ii(v,lo,hi){v=Math.round(+v);return isFinite(v)&&v>=lo&&v<=hi?v:null}
  function tryImport(){
    var h=location.hash;if(h.indexOf('#share=')!==0)return;
    var clear=function(){history.replaceState(null,'',location.pathname+location.search)};
    try{
      if(!window.LZString)throw new Error('lz-string 没加载到');
      var p=JSON.parse(LZString.decompressFromEncodedURIComponent(h.slice(7))||'null');
      if(!p||p.v!==1||!Array.isArray(p.fx))throw new Error('链接内容不对');
      var cyc=ii(p.cyc,1,4)||1,types=[].map.call(document.getElementById('lsty').options,function(o){return o.value}),
          per=(Array.isArray(p.per)?p.per:[]).slice(0,16).map(function(x){var s=ii(x&&x[0],0,1439),e=ii(x&&x[1],1,1440);return s!==null&&e>s?{s:s,e:e}:null}).filter(Boolean);
      var fx=p.fx.slice(0,120).map(function(x){
        if(!Array.isArray(x))return null;var day=ii(x[0],0,6),s=ii(x[1],0,1439),e=ii(x[2],1,1440),t=String(x[3]||'').slice(0,20);
        if(day===null||s===null||e===null||e<=s||!t)return null;
        var wk=Array.isArray(x[7])?x[7].map(function(k){return ii(k,1,cyc)}).filter(Boolean):null;
        return {id:uid(),day:day,s:s,e:e,t:t,room:String(x[4]||'').slice(0,20),teacher:String(x[5]||'').slice(0,20),
          type:types.indexOf(x[6])>=0?x[6]:'课',wk:wk&&wk.length?wk:null,c:COLS.indexOf(x[8])>=0?x[8]:subjCol(t)}}).filter(Boolean);
      if(!fx.length)throw new Error('里面没有课程');
      var name=String(p.n||'分享的课表').slice(0,12);
      if(!confirm('收到分享的课表「'+name+'」（'+fx.length+' 节课）。\n导入为一个新课表？（不会改动你现有的课表）')){clear();return}
      var t={id:'t'+uid(),name:name,arch:false,cyc:cyc,anc:mondayDn(todayDn),per:per.length?per:TT.per.map(function(x){return {s:x.s,e:x.e}})};
      TTS.list.push(t);TTS.active=t.id;ttSave();put2(tkOf('mochi-fx',t.id),fx);clear();location.reload()
    }catch(e){clear();alert('这个分享链接打不开：'+(e&&e.message||e))}}
  setTimeout(tryImport,400);window.addEventListener('hashchange',tryImport);
})();
