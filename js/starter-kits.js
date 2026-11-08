/* Mochi Starter Kits v1: non-destructive current-week manual events only. */
(function(){'use strict';
/* v9.7.1：星期编号和 Mochi 一致——day 0=周一 … 6=周日（之前误按周日=0，导致周一放了周末的活动、课排到了周二到周六）。
   所有时间都在默认课表时间（8:00–22:00）之内；标题只用界面语言（不再是“English / 中文”双语）；周六、周日各有各的安排。 */
var lang=(function(){try{return localStorage.getItem('ui-lang')||'en'}catch(e){return'en'}})();if(!['en','zh','ms'].includes(lang))lang='en';
var LI={en:0,zh:1,ms:2}[lang];
var ACT={
 morning:['🌤','Morning routine','晨间准备','Rutin pagi'],class:['🏫','Class or school','上课','Kelas / sekolah'],homework:['📚','Homework','作业','Kerja rumah'],
 revision:['🧠','Revision','复习','Ulang kaji'],practice:['✍️','Practice questions','做题','Latihan soalan'],move:['🏃','Exercise or a walk','运动散步','Senaman atau berjalan'],
 mock:['📝','Mock test','模拟练习','Ujian percubaan'],mistakes:['🔎','Review mistakes','错题整理','Semak kesilapan'],rest:['🌿','Rest time','休息时间','Masa rehat'],
 planweek:['📋','Plan the week','周计划','Rancang minggu'],slow:['☀️','Slow morning','悠闲早晨','Pagi santai'],winddown:['🌙','Evening wind down','晚间放松','Santai malam'],
 deep:['💼','Deep work','专注工作','Kerja fokus'],lunch:['🍱','Lunch break','午餐休息','Rehat makan tengah hari'],followup:['🗂','Work & follow-ups','工作跟进','Kerja & susulan'],
 personal:['🌙','Personal time','私人时间','Masa peribadi'],homereset:['🧹','Home reset','居家整理','Kemas rumah'],friends:['🍜','Lunch & friends','午餐社交','Makan & kawan'],
 recharge:['🔋','Recharge','充电时间','Isi semula tenaga'],lecture:['🎓','Lecture','课程','Kuliah'],assign:['📝','Assignment','作业 / 报告','Tugasan'],
 selfstudy:['📖','Self study','自习','Belajar sendiri'],weeklyrev:['📚','Weekly revision','每周复习','Ulang kaji mingguan'],group:['🤝','Group project','小组项目','Projek kumpulan'],
 hobby:['🎨','Hobby','兴趣','Hobi'],focus:['🎯','Focus block','专注时间','Blok fokus'],free:['🌷','Free time','自由时间','Masa lapang'],mealprep:['🥗','Meal prep','备餐','Sediakan makanan']
};
/* [活动, 开始(小时), 结束(小时), 颜色]；wk = 周一到周五，sat = 周六，sun = 周日 */
var PLAN={
 exam:{wk:[['morning',8,8.5,'lemon'],['class',9,12,'sky'],['homework',15,16,'mint'],['revision',17,18,'pink'],['move',18.25,19,'mint'],['practice',20,21,'peach']],
       sat:[['slow',8.5,9.5,'lemon'],['mock',10,12,'sky'],['mistakes',14,15.5,'pink'],['rest',16,17,'mint'],['planweek',19,19.5,'peach']],
       sun:[['slow',9,10,'lemon'],['revision',10.5,12,'pink'],['rest',14,16,'mint'],['planweek',19,19.5,'peach'],['winddown',20.5,21.5,'sky']]},
 work:{wk:[['morning',8,8.5,'lemon'],['deep',9,12,'sky'],['lunch',12,13,'peach'],['followup',14,17,'mint'],['move',18,19,'mint'],['personal',20,21,'pink']],
       sat:[['slow',9,10,'lemon'],['homereset',10.5,12,'mint'],['friends',13,14.5,'peach'],['recharge',16,17,'pink'],['winddown',20,21,'sky']],
       sun:[['slow',9,10,'lemon'],['mealprep',11,12.5,'mint'],['recharge',14,16,'pink'],['planweek',19,19.5,'sky'],['winddown',20.5,21.5,'peach']]},
 college:{wk:[['morning',8,8.5,'lemon'],['lecture',9,12,'sky'],['lunch',12,13,'peach'],['assign',15,16,'mint'],['move',17,18,'mint'],['selfstudy',19,20,'pink']],
       sat:[['slow',9,10,'lemon'],['weeklyrev',10.5,12,'sky'],['group',14,15.5,'mint'],['hobby',17,18,'pink'],['winddown',20,21,'peach']],
       sun:[['slow',9,10,'lemon'],['homereset',10.5,11.5,'mint'],['weeklyrev',14,16,'sky'],['planweek',19,19.5,'peach'],['winddown',20.5,21.5,'pink']]},
 life:{wk:[['morning',8,8.5,'lemon'],['focus',10,11,'sky'],['lunch',12,13,'peach'],['move',17,18,'mint'],['winddown',20,21,'pink']],
       sat:[['slow',9,10,'lemon'],['free',14,16,'peach'],['move',17,18,'mint'],['winddown',20,21,'pink']],
       sun:[['slow',9,10,'lemon'],['homereset',11,12,'mint'],['planweek',19,19.5,'sky'],['winddown',20.5,21.5,'pink']]}
};
function entry(key,day,start,end,color){var a=ACT[key];return [a[0]+' '+a[1+LI],day,Math.round(start*60),Math.round(end*60),color]}
function makeKit(kind){var items=[],P=PLAN[kind];
 for(var d=0;d<7;d++){var list=d<=4?P.wk:d===5?P.sat:P.sun;list.forEach(function(x){items.push(entry(x[0],d,x[1],x[2],x[3]))})}
 return items}
var kits={
 exam:{icon:'📚',en:'Exam Student',zh:'考生复习',ms:'Persediaan Peperiksaan',items:makeKit('exam')},
 work:{icon:'💼',en:'Working Life',zh:'工作日常',ms:'Rutin Kerja',items:makeKit('work')},
 college:{icon:'🎓',en:'College Life',zh:'大学生活',ms:'Kehidupan Kolej',items:makeKit('college')},
 life:{icon:'🌷',en:'Daily Balance',zh:'生活平衡',ms:'Keseimbangan Harian',items:makeKit('life')}
};
var L={en:{open:'✨ Start with a template',title:'A little help getting started',acts:' activities · 7 days',sub:'Choose a starter kit, edit the times, then preview before adding. Everything stays editable.',choose:'Choose a template',preview:'Preview this week',note:'Only selected, non-conflicting events will be added to the currently selected timetable and week. No existing events will be replaced. This is a one-week starter, not an automatic recurring schedule.',add:'Add selected events',close:'Close',undo:'Undo this import',done:'Added {n} events. You can edit them in your timetable.',none:'Nothing selected or all selected items conflict. Change times or uncheck conflicts.',conflict:'Time conflict',outside:'Outside timetable hours / hidden day',bad:'Invalid time',err:'Could not save safely. No changes were kept.',tip:'Pick a starter kit to see suggested events.',day:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},zh:{acts:' 项活动 · 7 天',open:'✨ 从模板开始',title:'从一个小计划开始吧',sub:'选择模板、调整时间、预览后再加入。之后都可以修改。',choose:'选择生活模板',preview:'预览本周安排',note:'仅将已勾选且无冲突的活动加入当前课表的当前周，不会覆盖已有内容。此模板只创建一周的手动活动，不会自动每周重复。',add:'加入选中的活动',close:'关闭',undo:'撤销本次导入',done:'已加入 {n} 项活动，可以在时间表中继续修改。',none:'没有可加入的活动，请调整时间或取消冲突项目。',conflict:'时间冲突',outside:'超出课表时间 / 隐藏日期',bad:'时间无效',err:'保存失败，已恢复原有数据。',tip:'选择模板即可查看建议活动。',day:['周一','周二','周三','周四','周五','周六','周日']},ms:{acts:' aktiviti · 7 hari',open:'✨ Mulakan dengan templat',title:'Mari mulakan dengan mudah',sub:'Pilih templat, ubah masa dan pratonton sebelum menambah.',choose:'Pilih templat',preview:'Pratonton minggu ini',note:'Hanya aktiviti dipilih tanpa konflik ditambah pada jadual dan minggu semasa. Tiada aktiviti sedia ada diganti. Tidak berulang setiap minggu.',add:'Tambah aktiviti',close:'Tutup',undo:'Buat asal import',done:'{n} aktiviti ditambah. Anda boleh mengubahnya.',none:'Tiada aktiviti boleh ditambah. Laraskan masa atau pilihan.',conflict:'Bertindih masa',outside:'Di luar waktu / hari tersembunyi',bad:'Masa tidak sah',err:'Gagal menyimpan. Data asal dikekalkan.',tip:'Pilih templat untuk melihat cadangan.',day:['Isn','Sel','Rab','Kha','Jum','Sab','Ahd']}}[lang];
var layer=null,chosen='exam',rows=[],last=null;
function node(tag,cls,txt){var x=document.createElement(tag);if(cls)x.className=cls;if(txt!=null)x.textContent=txt;return x}
function btn(label,cls,fn){var x=node('button',cls,label);x.type='button';x.addEventListener('click',fn);return x}
function fmt(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function minute(t){var a=/^(\d\d):(\d\d)$/.exec(t||'');return a?+a[1]*60+ +a[2]:NaN}
function overlap(a,b){return a.s<b.e&&b.s<a.e}
function check(r){if(!Number.isFinite(r.s)||!Number.isFinite(r.e)||r.s>=r.e||r.s<0||r.e>1440)return L.bad;
 if(typeof hiddenDay==='function'&&hiddenDay(r.day)||r.s<SET.h0*60||r.e>SET.h1*60)return L.outside;
 var w=typeof curW==='number'?curW:0,arr=WK[w]||[];
 if(arr.some(function(e){return e.day===r.day&&overlap(e,r)}))return L.conflict;
 // Check fixed and repeating activities for the selected week, without changing calendar state.
 if(typeof fxBlocks==='function'&&fxBlocks(w).some(function(e){return e.day===r.day&&overlap(e,r)}))return L.conflict;
 if(typeof rpBlocks==='function'&&rpBlocks(w).some(function(e){return e.day===r.day&&overlap(e,r)}))return L.conflict;
 if(rows.some(function(other){return other!==r&&other.yes&&other.day===r.day&&overlap(other,r)}))return L.conflict;
 return ''}
function close(){if(layer)layer.hidden=true;document.body.classList.remove('mk-modal-open')}
function render(){var dlg=document.getElementById('mk-dialog');dlg.replaceChildren();var h=node('div','mk-head'),left=node('div');left.append(node('h2','',L.title),node('p','',L.sub));h.append(left,btn('×','mk-close',close));dlg.append(h);var choices=node('div','mk-choices');Object.keys(kits).forEach(function(k){var v=kits[k],b=btn(v.icon+' '+v[lang],'mk-choice',function(){chosen=k;rows=kits[k].items.map(function(it){return {t:it[0],day:it[1],s:it[2],e:it[3],c:it[4],yes:true}});render()});b.setAttribute('aria-pressed',String(k===chosen));b.append(node('small','',v.items.length+L.acts));choices.append(b)});dlg.append(choices,node('h3','',L.preview));var table=node('div','mk-list');var currentDay=-1;rows.slice().sort(function(a,b){return a.day-b.day||a.s-b.s}).forEach(function(r,i){if(r.day!==currentDay){currentDay=r.day;table.append(node('div','mk-day-heading',L.day[currentDay]))}var line=node('div','mk-row'),ck=node('input');ck.type='checkbox';ck.checked=r.yes;ck.setAttribute('aria-label',r.t);ck.onchange=function(){r.yes=ck.checked;render()};var label=node('label','',r.t);label.append(node('small','',L.day[r.day]));var a=node('input'),b=node('input');a.type=b.type='time';a.value=fmt(r.s);b.value=fmt(r.e);a.setAttribute('aria-label','Start '+r.t);b.setAttribute('aria-label','End '+r.t);a.onchange=function(){r.s=minute(a.value);render()};b.onchange=function(){r.e=minute(b.value);render()};var error=check(r);if(error&&r.yes){line.classList.add('mk-conflict');label.append(node('small','', '⚠ '+error))}line.append(ck,label,a,b);table.append(line)});dlg.append(table,node('div','mk-note',L.note));var status=node('div','mk-status');status.setAttribute('role','status');var actions=node('div','mk-actions');var add=btn(L.add,'mk-btn',function(){var valid=rows.filter(function(r){return r.yes&&!check(r)});if(!valid.length){status.textContent=L.none;return}var w=curW,tid=TT.id,old=(WK[w]||[]).slice(),key=wkKeyOf(tid,w);var previous=localStorage.getItem(key);var added=valid.map(function(r){return {day:r.day,s:r.s,e:r.e,t:r.t,c:r.c}});try{var next=old.concat(added);localStorage.setItem(key,JSON.stringify(next));WK[w]=next;data=next;last={tid:tid,w:w,added:added};if(typeof draw==='function')draw();status.textContent=L.done.replace('{n}',String(added.length));add.disabled=true;undo.hidden=false}catch(e){if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);WK[w]=old;data=old;status.textContent=L.err}});var undo=btn(L.undo,'mk-btn mk-undo',function(){if(!last||last.tid!==TT.id){status.textContent=L.err;return}var current=(WK[last.w]||[]).slice(),indices=last.added.map(function(x){return current.indexOf(x)});if(indices.some(function(i){return i<0;})){status.textContent=L.err;return}var next=current.filter(function(_,i){return !indices.includes(i)});var key=wkKeyOf(last.tid,last.w);try{if(next.length)localStorage.setItem(key,JSON.stringify(next));else localStorage.removeItem(key);WK[last.w]=next;if(curW===last.w)data=next;last=null;if(typeof draw==='function')draw();status.textContent='✓';undo.hidden=true;add.disabled=false}catch(e){status.textContent=L.err}});undo.hidden=true;actions.append(add,undo,btn(L.close,'mk-btn mk-secondary',close));dlg.append(status,actions)}
function open(){if(typeof WK==='undefined'||typeof TT==='undefined'||typeof curW==='undefined'){return}if(!layer){layer=node('div');layer.id='mk-layer';layer.hidden=true;layer.setAttribute('role','presentation');var dlg=node('section');dlg.id='mk-dialog';dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label',L.title);layer.append(dlg);layer.addEventListener('click',function(e){if(e.target===layer)close()});document.body.append(layer);document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!layer.hidden)close()})}rows=kits[chosen].items.map(function(it){return {t:it[0],day:it[1],s:it[2],e:it[3],c:it[4],yes:true}});render();layer.hidden=false;document.body.classList.add('mk-modal-open');var c=layer.querySelector('.mk-close');if(c)c.focus()}
function init(){var target=document.querySelector('#v-tt .tt-head');if(!target||document.getElementById('mk-open'))return;var b=btn(L.open,'',open);b.id='mk-open';target.insertAdjacentElement('afterend',b)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();window.MochiStarterKits={open:open,kits:kits};
})();
