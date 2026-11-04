// 设置：固定课表、课表时间范围、备份
function fxSave(){put2('mochi-fx',FX)}
var fxon=document.getElementById('fxon');fxon.checked=!!SET.fx;
fxon.onchange=function(){SET.fx=fxon.checked;put2('mochi-set',SET);draw()};
function hopt(sel,from,to,val){for(var h=from;h<=to;h++){var o=el('option',null,h+':00');o.value=h;sel.appendChild(o)}sel.value=val}
function rFx(){
  var box=document.getElementById('fxl');box.innerHTML='';
  if(!FX.length)box.appendChild(el('div','msg','开学后在这里填上学校的上课时间（现在可以先空着）'));
  FX.forEach(function(x,i){
    var r=el('div','tp rm'),day=el('select'),hs=el('select'),he=el('select'),nm=el('input'),del=el('button',null,'×');
    DAYS.forEach(function(n,k){var o=el('option',null,'周'+n);o.value=k;day.appendChild(o)});day.value=x.day;
    hopt(hs,5,22,x.h);hopt(he,6,23,Math.min(23,x.h+x.len));
    nm.type='text';nm.value=x.t;nm.placeholder='如：上课';
    function upd(){x.day=+day.value;x.h=+hs.value;x.len=Math.max(1,+he.value-x.h);x.t=nm.value.trim()||'上课';fxSave();draw()}
    day.onchange=hs.onchange=he.onchange=nm.onchange=upd;
    del.onclick=function(){FX.splice(i,1);fxSave();rFx();draw()};
    [el('span',null,(i+1)+'.'),day,hs,el('span',null,'到'),he,nm,del].forEach(function(e){r.appendChild(e)});box.appendChild(r)});
}
document.getElementById('fxa').onclick=function(){FX.push({day:0,h:8,len:5,t:'上课'});fxSave();rFx();draw()};
document.getElementById('fxw').onclick=function(){for(var k=0;k<5;k++)FX.push({day:k,h:8,len:5,t:'上课'});fxSave();rFx();draw()};
var sh0=document.getElementById('sh0'),sh1=document.getElementById('sh1');
[6,7,8].forEach(function(h){var o=el('option',null,'从 '+h+':00 开始');o.value=h;sh0.appendChild(o)});sh0.value=SET.h0;
[22,23,24].forEach(function(h){var o=el('option',null,'到 '+h+':00 结束');o.value=h;sh1.appendChild(o)});sh1.value=SET.h1;
sh0.onchange=sh1.onchange=function(){SET.h0=+sh0.value;SET.h1=+sh1.value;put2('mochi-set',SET);location.reload()};
document.getElementById('bex').onclick=function(){
  var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('mochi-')===0)o[k]=localStorage.getItem(k)}
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));
  a.download='mochi-backup-'+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'.json';
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
  document.getElementById('semsg').textContent='已导出，请把文件存好（例如传到云盘）。'};
document.getElementById('bim').onclick=function(){document.getElementById('bfile').click()};
document.getElementById('bfile').onchange=function(){
  var f=this.files[0];if(!f)return;var fr=new FileReader();
  fr.onload=function(){try{
    var o=JSON.parse(fr.result),ks=Object.keys(o).filter(function(k){return k.indexOf('mochi-')===0});
    if(!ks.length)throw 0;if(!confirm('导入会覆盖目前的内容，确定吗？'))return;
    ks.forEach(function(k){localStorage.setItem(k,String(o[k]))});location.reload()
  }catch(e){document.getElementById('semsg').textContent='这个文件不是有效的备份。'}};
  fr.readAsText(f)};
