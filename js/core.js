// 共用常量、状态与小工具（所有 js 文件共享）
  var d=new Date();
  var wk=['日','一','二','三','四','五','六'];
  document.getElementById('today').textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 · 星期'+wk[d.getDay()];

  var DAYS=['一','二','三','四','五','六','日'],H0=8,H1=22,COLS=['pink','mint','sky','lemon','peach'];
  var DN={};try{DN=JSON.parse(localStorage.getItem('mochi-dn')||'{}')}catch(e){}
  function kk(x){return x.day+'-'+x.h+'-'+x.t}
  var data=[],grid=document.getElementById('grid'),cur=null,col='pink';
  try{data=JSON.parse(localStorage.getItem('mochi-tt')||'[]')}catch(e){}
  function save(){try{localStorage.setItem('mochi-tt',JSON.stringify(data))}catch(e){}}
  var todayIdx=(d.getDay()+6)%7;
  function covered(day,h,skip){return data.some(function(x){return x!==skip&&x.day===day&&h>=x.h&&h<x.h+x.len})}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function pad2(x){return String(x).padStart(2,'0')}
function put2(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function free(day,h,len,ignore){for(var i=0;i<len;i++){if(h+i>=H1)return false;if(data.some(function(x){return x!==ignore&&x.day===day&&h+i>=x.h&&h+i<x.h+x.len}))return false}return true}
