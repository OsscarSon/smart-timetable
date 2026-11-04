  function draw(){
    grid.innerHTML='';
    var c=document.createElement('div');c.className='h';grid.appendChild(c);
    DAYS.forEach(function(n,i){var e=document.createElement('div');e.className='h'+(i===todayIdx?' today':'');e.textContent=n;grid.appendChild(e)});
    for(var h=H0;h<H1;h++){
      var t=document.createElement('div');t.className='tm';t.textContent=h+':00';t.style.gridRow=(h-H0+2);t.style.gridColumn=1;grid.appendChild(t);
      for(var k=0;k<7;k++){(function(k,h){
        var b=document.createElement('button');b.className='c';b.style.gridRow=(h-H0+2);b.style.gridColumn=k+2;
        b.setAttribute('aria-label','添加');b.onclick=function(){openDlg({day:k,h:h,len:1,t:'',c:'pink'},true)};grid.appendChild(b)})(k,h)}
    }
    data.forEach(function(x){
      var b=document.createElement('button');b.className='e c-'+x.c+(DN[kk(x)]?' dn':'');b.textContent=x.t;
      b.style.gridColumn=x.day+2;b.style.gridRow=(x.h-H0+2)+' / span '+x.len;
      b.onclick=function(){openDlg(x,false)};grid.appendChild(b)});
    if(typeof rf==='function')rf();
  }
  var mask=document.getElementById('mask'),dn=document.getElementById('dn'),dl=document.getElementById('dl'),sw=document.getElementById('sw');
  COLS.forEach(function(n){var i=document.createElement('i');i.className='c-'+n;i.onclick=function(){col=n;paint()};sw.appendChild(i)});
  function paint(){[].forEach.call(sw.children,function(i,x){i.classList.toggle('on',COLS[x]===col)})}
  var isNew=false;
  var dday=document.getElementById('dday'),dh=document.getElementById('dh');
  function lenOpts(day,h,keep){var max=1;while(max<3&&h+max<H1&&!covered(day,h+max,cur))max++;
    dl.innerHTML='';for(var i=1;i<=max;i++){var o=document.createElement('option');o.value=i;o.textContent=i+' 小时';dl.appendChild(o)}
    dl.value=Math.min(keep,max)}
  dday.onchange=dh.onchange=function(){lenOpts(+dday.value,+dh.value,+dl.value)};
  function openDlg(x,nw){
    cur=x;isNew=nw;col=x.c;dn.value=x.t;
    dday.innerHTML='';DAYS.forEach(function(n,k){var o=document.createElement('option');o.value=k;o.textContent='周'+n;dday.appendChild(o)});
    dh.innerHTML='';for(var h=H0;h<H1;h++){var o2=document.createElement('option');o2.value=h;o2.textContent=h+':00';dh.appendChild(o2)}
    dday.value=x.day;dh.value=x.h;lenOpts(x.day,x.h,x.len);
    document.getElementById('dt').textContent=(nw?'新增':'修改')+' · 周'+DAYS[x.day]+' '+x.h+':00';
    document.getElementById('dd').style.display=nw?'none':'';
    paint();mask.classList.add('show');setTimeout(function(){dn.focus()},50);
  }
  function close(){mask.classList.remove('show')}
  mask.onclick=close;document.getElementById('dx').onclick=close;
  document.getElementById('ds').onclick=function(){
    var t=dn.value.trim();if(!t){dn.focus();return}
    var nd=+dday.value,nh=+dh.value,nl=+dl.value;
    if(!free(nd,nh,nl,cur)){alert('那个时间已经有安排啦～');return}
    cur.t=t;cur.c=col;cur.day=nd;cur.h=nh;cur.len=nl;delete cur.a;if(isNew)data.push(cur);save();draw();close()};
  document.getElementById('dd').onclick=function(){data=data.filter(function(x){return x!==cur});save();draw();close()};
  document.getElementById('clr').onclick=function(){if(data.length&&confirm('清空整周安排？')){data=[];save();draw()}};
  // 示范：规则式自动排程（之后换成真正的 AI）
  document.getElementById('demo').onclick=function(e){
    e.stopPropagation();
    var plan=[[9,2,'📖 数学复习','pink'],[12,1,'🍱 午饭小憩','mint'],[15,1,'📝 英语单词','sky'],[18,1,'🏃 运动','lemon']];
    for(var k=0;k<5;k++)plan.forEach(function(p){
      for(var i=0;i<p[1];i++)if(covered(k,p[0]+i))return;
      data.push({day:k,h:p[0],len:p[1],t:p[2],c:p[3]})});
    save();draw();
  };
