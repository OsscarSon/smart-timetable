// 时间尺：横着滑动选开始时间（5 分钟一格，中间的针指着时间），下面点时长。
// 这一天已有的课 / 活动会画在尺子下面，一眼看出会不会撞车。原来的 <input type=time> 还在（只是藏起来），所有保存逻辑不变。
(function(){
  var PX=8,STEP=5,DAY=1440,DURS=[30,45,60,90,120];
  function t2m(v){var p=String(v||'').split(':');return p.length>=2&&p[0]!==''?(+p[0])*60+(+p[1]):NaN}
  function m2t(m){m=Math.max(0,Math.min(1439,m));return pad2(Math.floor(m/60))+':'+pad2(m%60)}
  function fmtDur(d){return d<60?d+' 分钟':(d%60?Math.floor(d/60)+' 小时 '+d%60+' 分钟':d/60+' 小时')}

  function make(cfg){          // cfg: {i0,i1,day(),skip(),after(), hide:[元素…]}
    var i0=cfg.i0,i1=cfg.i1,box=el('div','tpk'),rd=el('div','tpk-read'),wrap=el('div','tpk-wrap'),sc=el('div','tpk-r'),
        tr=el('div','tpk-tr'),sel=el('div','tpk-sel'),dur=el('div','tpk-d'),busy=0,tmo=0;
    var half=0;
    tr.style.width=(DAY/STEP*PX)+'px';
    for(var h=0;h<24;h++){var l=el('span','tpk-h',pad2(h));l.style.left=(h*60/STEP*PX)+'px';tr.appendChild(l)}
    tr.appendChild(sel);sc.appendChild(tr);wrap.appendChild(sc);
    wrap.appendChild(el('div','tpk-fade l'));wrap.appendChild(el('div','tpk-fade r'));wrap.appendChild(el('div','tpk-need'));
    box.appendChild(rd);box.appendChild(wrap);box.appendChild(dur);
    var chips=[],mn=el('button','chip st','−5'),pl=el('button','chip st','+5');
    mn.type=pl.type='button';dur.appendChild(mn);
    DURS.forEach(function(d){var c=el('button','chip',d<60?d+'′':(d/60)+'h'+(d%60?'':''));c.type='button';
      c.textContent=d===90?'1.5 小时':d<60?d+' 分':(d/60)+' 小时';c.onclick=function(){setDur(d)};chips.push([d,c]);dur.appendChild(c)});
    dur.appendChild(pl);
    function S(){var v=t2m(i0.value);return isNaN(v)?480:v}
    function E(){var v=t2m(i1.value);return isNaN(v)?S()+60:v}
    function fire(i){i.dispatchEvent(new Event('change',{bubbles:true}));i.dispatchEvent(new Event('input',{bubbles:true}))}
    function setDur(d){var s=S();d=Math.max(5,Math.min(d,1439-s));i1.value=m2t(s+d);fire(i1);paint()}
    mn.onclick=function(){setDur(E()-S()-5)};pl.onclick=function(){setDur(E()-S()+5)};
    function bands(){
      [].slice.call(tr.querySelectorAll('.tpk-b')).forEach(function(n){n.remove()});
      var day=cfg.day(),sk=cfg.skip?cfg.skip():null;
      (typeof FX!=='undefined'?FX:[]).forEach(function(x){if(x===sk||x.day!==day)return;
        var b=el('div','tpk-b c-'+(x.c||'sky'),x.t);b.style.left=(x.s/STEP*PX)+'px';b.style.width=Math.max(4,(x.e-x.s)/STEP*PX)+'px';b._s=x.s;b._e=x.e;b._t=x.t;tr.appendChild(b)})}
    function clash(){var s=S(),e=E(),hit=null;[].forEach.call(tr.querySelectorAll('.tpk-b'),function(b){if(!hit&&b._s<e&&b._e>s)hit=b._t});return hit}
    function paint(){
      var s=S(),e=E(),d=e-s,c=clash();
      rd.innerHTML='';rd.appendChild(document.createTextNode(m2t(s)+' → '+m2t(e)));
      var sm=el('small',null,fmtDur(Math.max(0,d)));if(c){var w=el('span','bad',' · ⚠ 与「'+c+'」重叠');sm.appendChild(w)}rd.appendChild(sm);
      sel.style.left=(s/STEP*PX)+'px';sel.style.width=Math.max(2,d/STEP*PX)+'px';
      chips.forEach(function(p){p[1].classList.toggle('on',p[0]===d)})}
    function toScroll(){busy=1;sc.scrollLeft=S()/STEP*PX;setTimeout(function(){busy=0},60)}
    sc.addEventListener('scroll',function(){
      if(busy)return;
      var m=Math.round(sc.scrollLeft/PX)*STEP,d=E()-S();m=Math.max(0,Math.min(1439,m));
      i0.value=m2t(m);if(d>0)i1.value=m2t(Math.min(1439,m+d));paint();
      clearTimeout(tmo);tmo=setTimeout(function(){busy=1;sc.scrollLeft=m/STEP*PX;fire(i0);fire(i1);setTimeout(function(){busy=0},60)},140)});
    // 桌面鼠标也能拖
    var dn=null;sc.addEventListener('pointerdown',function(ev){if(ev.pointerType==='mouse')dn=[ev.clientX,sc.scrollLeft]});
    window.addEventListener('pointermove',function(ev){if(dn)sc.scrollLeft=dn[1]-(ev.clientX-dn[0])});
    window.addEventListener('pointerup',function(){dn=null});
    // 左右留白，让 00:00 和 23:55 也能停在针下
    var spL=el('div'),spR=el('div');spL.style.flex=spR.style.flex='none';sc.style.display='flex';sc.insertBefore(spL,tr);sc.appendChild(spR);tr.style.flex='none';
    function pad(){var w=sc.clientWidth||300;spL.style.width=spR.style.width=(w/2)+'px'}
    var api={sync:function(){pad();bands();paint();toScroll()},box:box};
    cfg.hide.forEach(function(h){if(h)h.hidden=true});
    cfg.host.insertBefore(box,cfg.before);
    return api}

  var lt=null,dt=null;
  var ed=document.getElementById('lst0'),host=ed&&ed.closest('.ed-card'),row=ed&&ed.closest('.ed-2');
  if(host&&row){
    lt=make({i0:document.getElementById('lst0'),i1:document.getElementById('lst1'),host:host,before:row,hide:[row],
      day:function(){return LS.days[0]},skip:function(){return LS.cur}});
    ['lsp0','lsp1'].forEach(function(id){document.getElementById(id).addEventListener('change',function(){lt.sync()})});
    document.getElementById('lsd').addEventListener('click',function(){setTimeout(function(){lt.sync()},0)});
    var oL=window.openLesson;window.openLesson=function(){var r=oL.apply(this,arguments);setTimeout(function(){lt.sync()},60);return r};
    // 老师 / 教室之类也在同一页，窗口一显示就要重新量宽度
  }
  var dh=document.getElementById('dh'),dd=dh&&dh.closest('.ed-2');
  if(dh&&dd){
    var dc=document.getElementById('ddur'),dcr=dc&&dc.closest('.er');
    dt=make({i0:dh,i1:document.getElementById('de'),host:dd.parentNode,before:dd,hide:[dd,dcr],
      day:function(){return +document.getElementById('dday').value},skip:function(){return null}});
    var oD=window.openDlg;window.openDlg=function(){var r=oD.apply(this,arguments);setTimeout(function(){dt.sync()},60);return r};
    document.getElementById('dday').addEventListener('change',function(){dt.sync()})}
})();
