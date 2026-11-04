// 运动：现状 + 目标 → 针对性训练（学习优先，运动排在剩余空档）
var SP=[];try{SP=JSON.parse(localStorage.getItem('mochi-sp')||'[]')}catch(e){}
function ssv(){put2('mochi-sp',SP)}
function sec(v){if(!v)return NaN;var p=String(v).split(':').map(Number);if(p.some(isNaN))return NaN;return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:NaN}
function ft(x){x=Math.abs(Math.round(x));var h=Math.floor(x/3600),m=Math.floor(x%3600/60),r=x%60;return (h?h+'小时':'')+(m?m+'分':'')+(r?r+'秒':'')||'0'}
function gap(m){var c=sec(m.c),g=sec(m.g);return (isNaN(c)||isNaN(g))?null:{d:c-g,p:(c-g)/c}}
function gapText(m){var gp=gap(m);return gp?(gp.d>0?'还差 '+ft(gp.d)+'（'+(gp.p*100).toFixed(1)+'%）':'已达标 🎉'):''}
function rSp(){
  var box=document.getElementById('sl');box.innerHTML='';
  SP.forEach(function(sp,i){
    var c=el('div','sc'),hd=el('div','hd');hd.appendChild(el('b',null,'🏅 '+sp.n));
    var w=el('select');[1,2,3].forEach(function(k){var o=el('option',null,'每周 '+k+' 次');o.value=k;w.appendChild(o)});w.value=sp.w;w.style.width='92px';w.onchange=function(){sp.w=+w.value;ssv()};hd.appendChild(w);
    var x=el('button',null,'×');x.onclick=function(){SP.splice(i,1);ssv();rSp()};hd.appendChild(x);c.appendChild(hd);
    var h=el('div','mr');['项目/距离','现在成绩','目标成绩'].forEach(function(t){h.appendChild(el('span','mh',t))});c.appendChild(h);
    sp.m.forEach(function(m){var r=el('div','mr'),sm=el('small',null,gapText(m));
      [['k','如 5k'],['c','如 21:00'],['g','如 20:00']].forEach(function(f){var inp2=el('input');inp2.value=m[f[0]]||'';inp2.placeholder=f[1];
        inp2.oninput=function(){m[f[0]]=inp2.value;ssv();sm.textContent=gapText(m)};r.appendChild(inp2)});
      r.appendChild(sm);c.appendChild(r)});
    var ad=el('button','chip','＋ 加一个项目');ad.style.alignSelf='flex-start';ad.onclick=function(){sp.m.push({k:'',c:'',g:''});ssv();rSp()};c.appendChild(ad);
    box.appendChild(c)});
}
function addSp(n,m){if(!n)return;SP.push({n:n.slice(0,10),w:2,m:m||[{k:'',c:'',g:''}]});ssv();rSp()}
document.getElementById('pa').onclick=function(){var i=document.getElementById('pn');addSp(i.value.trim());i.value=''};
document.getElementById('pex').onclick=function(){addSp('长跑',[{k:'5k',c:'21:00',g:'20:00'},{k:'10k',c:'48:42',g:'46:00'},{k:'21k',c:'2:05:00',g:''}])};
function sput(day,hs,len,t){for(var k=0;k<hs.length;k++)if(free(day,hs[k],len)){data.push({day:day,h:hs[k],len:len,t:t.slice(0,14),c:'lemon',a:2});return true}return false}
document.getElementById('pplan').onclick=function(){
  data=data.filter(function(x){return x.a!==2});
  var q2=[],info=[];
  SP.forEach(function(sp){
    var run=/跑/.test(sp.n),W=sp.w,foc=null;
    sp.m.forEach(function(m){var g=gap(m);if(g&&g.d>0&&(!foc||g.p>foc.p))foc={k:m.k,p:g.p}});
    var ty=run?(W===1?['节奏跑']:W===2?['间歇','长距离']:['间歇','轻松跑','长距离']):(W===1?['综合']:W===2?['技术','体能']:['技术','体能','实战']);
    if(foc)info.push(sp.n+'重点提升 '+foc.k);
    ty.forEach(function(t){q2.push({n:sp.n,t:t+((run&&foc&&t==='间歇')?'('+foc.k+')':''),long:t==='长距离'||t==='实战'})});
  });
  q2.sort(function(a,b){return (a.long?1:0)-(b.long?1:0)});
  var d2=startPos(),ok=0;
  q2.slice(0,5).forEach(function(s2){
    for(var k=d2;k<7;k++){var wd=posDay(k);if(s2.long&&wd<5)continue;   // 长距离/实战放周末
      if(sput(wd,s2.long?[17,16,10]:[17,18,16],s2.long?2:1,'🏃 '+s2.n+'·'+s2.t)){d2=k+2;ok++;break}}});
  save();draw();
  document.getElementById('pmsg').textContent=ok?'已排 '+ok+' 次训练（隔天练、给身体恢复时间）'+(info.length?'；'+info.join('，'):'')+'。建议先按“学习”排好再来排运动 🐱':'没有可排的空档或还没加运动～';
};
