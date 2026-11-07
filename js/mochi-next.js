// Mochi Smart Timetable · progressive extension. Independent of v8.6 data format.
// Never rewrites existing schedule records; all features are opt-in.
(function(){'use strict';
  var PROFILE='mochi-profile',ENERGY='mochi-energy-v1';
  var prof=read(PROFILE,{mode:'study'}), energy=read(ENERGY,{});
  function read(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function node(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
  function button(label,fn,cls){var e=node('button',cls||'mn-btn',label);e.type='button';e.addEventListener('click',fn);return e}
  function clean(s){return String(s==null?'':s)}
  function num(s){return Math.round(s*10)/10}
  function dateISO(dt){return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')}
  function today(){return dateISO(new Date())}
  function monthNow(){return today().slice(0,7)}
  function modal(title){
    var mask=node('div','mn-overlay'),panel=node('section','mn-modal'),hd=node('div','mn-modal-head'),ttl=node('h2',null,title);
    var x=button('✕',function(){mask.remove()},'mn-close');hd.append(ttl,x);panel.append(hd);mask.append(panel);
    mask.addEventListener('click',function(e){if(e.target===mask)mask.remove()});
    document.body.appendChild(mask);return {mask:mask,panel:panel};
  }
  // Mode flags are presentation preferences, not a second schedule database.
  var COPY={
    en:{modeTitle:'Choose your spaces',modeIntro:'Choose one or more. All modes share the same timetable and can be changed anytime.',study:'Study',work:'Work',life:'Life',studyDesc:'Classes, assignments, revision',workDesc:'Shifts, meetings, projects',lifeDesc:'Fitness, habits, everyday plans',saved:'Done',energyIntro:'How is your energy today? Suggestions only — your timetable will never change without confirmation.',high:'High energy',highDesc:'Good for focused work',medium:'Medium energy',mediumDesc:'Keep a steady pace',low:'Low energy',lowDesc:'Keep essentials and take breaks',todayTip:'Today’s suggestion',tipLow:'Keep important commitments and deadlines. Consider postponing optional demanding work and adding recovery breaks.',tipMedium:'Continue at a comfortable pace. Leave 10–15 minutes between commitments where possible.',tipHigh:'Consider your most demanding tasks during your best hours. Keep meals and breaks.',todayEvents:'Today’s plans',month:'Month',story:'Your time has a story.',sub:'A recap based on your saved timetable. Not connected to Spotify.',planned:'Scheduled manual event hours this month',items:'Events',marked:'Marked done',tasks:'Completed tasks',active:'Active days',highlights:'Highlights',busiest:'Busiest day',most:'Most scheduled activity',empty:'No manual events available for this month.',scope:'Current timetable, saved manual events only. Scheduled time is not actual time. Recurring and fixed events are excluded.',export:'Export story as PNG',wrappedIntro:'Turn your monthly schedule into a shareable story.',openWrapped:'See monthly recap',chrono:'Chrono date preview',chronoNote:'Previews dates in English and some Chinese expressions. The existing AI confirmation flow is unchanged.',chronoEmpty:'Type a date or time to preview it.',chronoFound:'Detected',chronoNext:'Continue using the existing Parse button.',chronoMissing:'No clear date detected; you can still use the AI parser.',tourTitle:'Welcome to Mochi',tourWelcome:'Your smart time management center.',tourSchedule:'One timetable',tourScheduleText:'Plan study, work and daily life in the same calendar.',tourAdd:'Quick add',tourAddText:'Create an event or use natural-language AI.',tourTabs:'Your tools',tourTabsText:'Tasks, health, stats and more are available here.',tourMenu:'Explore features',tourMenuText:'Discover energy insights, Wrapped and more settings.',tourFallback:'Quick introduction',tourFallbackText:'1. Timetable: plan your day. 2. +: add events. 3. More: find tools and preferences.',tourOffline:'Interactive tour is unavailable offline.',tourOkay:'Continue',tourNext:'Next',tourPrevious:'Back',tourDone:'Choose modes'},
    zh:{modeTitle:'选择使用场景',modeIntro:'可多选，所有模式共用同一份时间表，也能随时调整。',study:'学习',work:'工作',life:'生活',studyDesc:'课程、作业、复习',workDesc:'班表、会议、项目',lifeDesc:'运动、习惯、日常安排',saved:'完成',energyIntro:'今天你的精力怎么样？这里只提供建议，不会擅自改变日程。',high:'精力充沛',highDesc:'适合专注工作',medium:'普通状态',mediumDesc:'保持平稳节奏',low:'比较疲惫',lowDesc:'保留必要安排，适当休息',todayTip:'今日建议',tipLow:'先保留必要事项及截止任务，考虑推迟可选的高强度安排，并增加休息。',tipMedium:'按舒适的节奏进行，尽量在安排之间预留 10–15 分钟。',tipHigh:'把高强度任务放在精神较好的时段，也要留出吃饭和休息时间。',todayEvents:'今天的安排',month:'选择月份',story:'你的时间，写成了故事。',sub:'根据已保存的时间表生成，与 Spotify 账号无关。',planned:'本月手动安排的计划时长',items:'安排事项',marked:'标记完成',tasks:'完成任务',active:'有安排的天数',highlights:'本月亮点',busiest:'最忙的一天',most:'安排最多的项目',empty:'本月没有可统计的手动安排。',scope:'仅当前课表已保存的手动安排，计划时长并非实际时长；不含固定课与重复活动。',export:'导出分享图片（PNG）',wrappedIntro:'把这个月的时间表变成可以分享的故事。',openWrapped:'打开每月回顾',chrono:'Chrono 时间预览',chronoNote:'识别英语日期与部分中文时间表达；不会跳过原来的 AI 确认。',chronoEmpty:'输入日期或时间即可预览。',chronoFound:'识别到',chronoNext:'继续使用原本的「解析」按钮。',chronoMissing:'尚未识别到明确日期，仍可交给 AI。',tourTitle:'欢迎来到 Mochi',tourWelcome:'你的智能时间管理中心。',tourSchedule:'同一个时间表',tourScheduleText:'学习、工作和生活共享一份日历。',tourAdd:'快速添加',tourAddText:'手动创建日程，或使用 AI 一句话添加。',tourTabs:'常用工具',tourTabsText:'任务、健康、统计与更多功能都在这里。',tourMenu:'探索功能',tourMenuText:'在这里找到精力、月报和其他设置。',tourFallback:'快速介绍',tourFallbackText:'① 时间表：安排日常。② ＋：添加活动。③ 更多：查看工具和设置。',tourOffline:'离线状态下无法加载交互引导。',tourOkay:'继续',tourNext:'下一步',tourPrevious:'上一步',tourDone:'选择模式'},
    ms:{modeTitle:'Pilih mod anda',modeIntro:'Pilih satu atau lebih. Semua mod berkongsi jadual yang sama dan boleh diubah bila-bila masa.',study:'Belajar',work:'Kerja',life:'Kehidupan',studyDesc:'Kelas, tugasan, ulang kaji',workDesc:'Syif, mesyuarat, projek',lifeDesc:'Senaman, tabiat, rutin harian',saved:'Selesai',energyIntro:'Bagaimana tenaga anda hari ini? Cadangan sahaja — jadual tidak diubah tanpa pengesahan.',high:'Tenaga tinggi',highDesc:'Sesuai untuk fokus',medium:'Tenaga sederhana',mediumDesc:'Kekalkan rentak',low:'Tenaga rendah',lowDesc:'Utamakan yang penting dan rehat',todayTip:'Cadangan hari ini',tipLow:'Utamakan komitmen dan tarikh akhir penting. Tangguhkan aktiviti pilihan yang berat dan tambah waktu rehat.',tipMedium:'Teruskan pada kadar selesa. Cuba jarakkan aktiviti 10–15 minit.',tipHigh:'Jadualkan tugas sukar ketika tenaga anda terbaik, sambil mengekalkan makan dan rehat.',todayEvents:'Rancangan hari ini',month:'Pilih bulan',story:'Masa anda, sebuah cerita.',sub:'Ringkasan berdasarkan jadual disimpan. Tidak berkaitan dengan Spotify.',planned:'Jam acara manual dijadualkan bulan ini',items:'Acara',marked:'Ditanda siap',tasks:'Tugasan siap',active:'Hari aktif',highlights:'Sorotan bulan',busiest:'Hari paling sibuk',most:'Aktiviti terbanyak',empty:'Tiada acara manual untuk bulan ini.',scope:'Hanya acara manual tersimpan dalam jadual semasa. Masa dirancang bukan masa sebenar. Acara tetap dan berulang tidak termasuk.',export:'Eksport cerita PNG',wrappedIntro:'Jadikan jadual bulanan anda cerita untuk dikongsi.',openWrapped:'Lihat ringkasan bulanan',chrono:'Pratonton tarikh Chrono',chronoNote:'Pratonton tarikh bahasa Inggeris dan beberapa frasa Cina; pengesahan AI asal dikekalkan.',chronoEmpty:'Taip tarikh atau masa untuk pratonton.',chronoFound:'Dikesan',chronoNext:'Teruskan dengan butang Parse asal.',chronoMissing:'Tiada tarikh jelas; anda masih boleh menggunakan AI.',tourTitle:'Selamat datang ke Mochi',tourWelcome:'Pusat pengurusan masa pintar anda.',tourSchedule:'Satu jadual',tourScheduleText:'Rancang belajar, kerja dan kehidupan dalam satu kalendar.',tourAdd:'Tambah pantas',tourAddText:'Cipta acara atau gunakan AI.',tourTabs:'Alat anda',tourTabsText:'Tugasan, kesihatan, statistik dan lain-lain di sini.',tourMenu:'Teroka ciri',tourMenuText:'Cari tenaga, Wrapped dan tetapan lain.',tourFallback:'Pengenalan ringkas',tourFallbackText:'1. Jadual: rancang hari. 2. +: tambah acara. 3. Lagi: cari alat dan tetapan.',tourOffline:'Lawatan interaktif tidak tersedia di luar talian.',tourOkay:'Teruskan',tourNext:'Seterusnya',tourPrevious:'Kembali',tourDone:'Pilih mod'}
  };
  function tx(k){return (COPY[window.LANG]||COPY.en)[k]||k}
  function modes(){var v=prof.modes;if(!Array.isArray(v))v=prof.mode==='both'?['study','work']:[prof.mode||'study'];return ['study','work','life'].filter(function(k){return v.indexOf(k)>=0})}
  function mode(){var m=modes();return m.length===1?m[0]:m.indexOf('study')>=0&&m.indexOf('work')>=0?'both':m[0]||'study'}
  function selectMode(m){var a=Array.isArray(m)?m:[m];prof.modes=['study','work','life'].filter(function(k){return a.indexOf(k)>=0});if(!prof.modes.length)prof.modes=['study'];prof.mode=mode();save(PROFILE,prof);applyMode()}
  function makeModeCards(into){
    into.querySelectorAll('.mn-mode-grid').forEach(function(e){e.remove()});
    var wrap=node('div','mn-mode-grid');
    [['study','assets/study-mode.webp','📚'],['work','assets/work-mode.webp','💼'],['life','assets/life-mode.webp','🌿']].forEach(function(v){
      var selected=modes().indexOf(v[0])>=0,b=node('button','mn-mode-card'+(selected?' selected':''));b.type='button';b.setAttribute('aria-pressed',String(selected));
      var img=node('img');img.src=v[1];img.alt=tx(v[0]);img.loading='lazy';
      var ck=node('span','mn-mode-check',selected?'✓':'+'),info=node('div','mn-mode-detail');info.append(node('strong',null,tx(v[0])),node('small',null,tx(v[0]+'Desc')));
      b.append(img,ck,info);b.onclick=function(){var next=modes();if(next.indexOf(v[0])>=0){if(next.length===1)return;next=next.filter(function(z){return z!==v[0]})}else next.push(v[0]);selectMode(next);makeModeCards(into)};wrap.append(b);
    });into.append(wrap);
  }
  function mountWizardChoices(box){var wrap=node('div','mn-wiz-modes');wrap.append(node('h3',null,tx('modeTitle')),node('p','mn-hint',tx('modeIntro')));makeModeCards(wrap);box.append(wrap)}
  function afterTour(){var d=false;try{d=localStorage.getItem('onb-modes-done')==='1';localStorage.removeItem('onb-modes-done')}catch(e){}if(!d)openModes()}
  function openModes(){var m=modal('🧭 '+tx('modeTitle'));m.panel.append(node('p','mn-hint',tx('modeIntro')));makeModeCards(m.panel);m.panel.append(button(tx('saved'),function(){m.mask.remove()},'mn-primary'))}
  function applyMode(){
    var m=modes();document.body.dataset.mochiMode=m.join('-');
    // Do not rewrite existing labels: source app i18n and feature-specific terminology stay intact.
  }
  function dayEnergy(day){return energy[day]&&energy[day].level||'medium'}
  function openEnergy(){var m=modal('⚡ Mochi Energy');var key=today();
    var intro=node('p','mn-hint',tx('energyIntro'));m.panel.append(intro);
    var wrap=node('div','mn-energy-grid');m.panel.append(wrap);
    [['high','⚡ '+tx('high'),tx('highDesc')],['medium','🌤 '+tx('medium'),tx('mediumDesc')],['low','🌙 '+tx('low'),tx('lowDesc')]].forEach(function(v){
      var b=button(v[1]+'\n'+v[2],function(){energy[key]={level:v[0],updated:Date.now()};save(ENERGY,energy);refresh()},'mn-energy-option');b.dataset.energy=v[0];wrap.append(b);
    });
    var result=node('div','mn-suggest');m.panel.append(result);
    function refresh(){wrap.querySelectorAll('button').forEach(function(b){b.classList.toggle('selected',b.dataset.energy===dayEnergy(key))});
      var level=dayEnergy(key),txt=tx(level==='low'?'tipLow':level==='high'?'tipHigh':'tipMedium');
      result.replaceChildren(node('strong',null,tx('todayTip')),node('p',null,txt));
      var list=upcomingToday();if(list.length){result.append(node('p','mn-hint',tx('todayEvents')));list.slice(0,6).forEach(function(x){result.append(node('div','mn-mini-row',(typeof tmin==='function'?tmin(x.s):String(x.s))+' · '+x.t))});}
    }refresh();m.panel.append(button(tx('saved'),function(){m.mask.remove()},'mn-primary'));
  }
  function upcomingToday(){try{if(typeof itemsOf==='function'&&typeof todayIdx!=='undefined'&&typeof curW!=='undefined'&&curW===thisW)return itemsOf(todayIdx).filter(function(x){return x.e>0});}catch(e){}return []}
  function getMonthlyStats(ym){
    var map={},planMinutes=0,doneMinutes=0,events=0,completed=0,days=new Set(),cat={};
    // Exact dates are reconstructed from the existing per-week event keys.
    try{if(typeof TTS!=='undefined'&&typeof TT!=='undefined'&&typeof wsDn==='function'){
      var pre='mochi-wk:'+TT.id+':';for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);if(!k||k.indexOf(pre)!==0)continue;
        var w=+k.slice(pre.length);if(!Number.isFinite(w))continue;
        var a=read(k,[]);if(!Array.isArray(a))continue;
        a.forEach(function(x){var wd=+x.day;if(!Number.isFinite(wd)||!Number.isFinite(+x.s)||!Number.isFinite(+x.e))return;
          var offset=(wd-(typeof SET!=='undefined'?SET.ws:0)+7)%7, dn=wsDn(w)+offset,iso=typeof isoOf==='function'?isoOf(dn):'';
          if(!iso.startsWith(ym))return;
          var mins=Math.max(0,Math.min(1440,+x.e)-Math.max(0,+x.s));if(!mins)return;
          planMinutes+=mins;events++;days.add(iso);map[iso]=(map[iso]||0)+mins;
          var label=(x.t||'Other').replace(/^[^\p{L}\p{N}]+/u,'').trim().slice(0,15)||'Other';cat[label]=(cat[label]||0)+mins;
          var key=w+'-'+wd+'-'+x.s+'-'+x.t;var done=typeof DN!=='undefined'&&DN[key];if(done){doneMinutes+=mins;completed++;}
        });
      }
    }}catch(e){console.warn('Wrapped schedules unavailable',e)}
    var monthTasks=[];try{if(typeof HW!=='undefined')monthTasks=HW.filter(function(x){return x.done&&dateISO(new Date(x.done)).startsWith(ym)});}catch(e){}
    var dates=Object.keys(map).sort(function(a,b){return map[b]-map[a]});var categories=Object.entries(cat).sort(function(a,b){return b[1]-a[1]});
    return {ym:ym,plan:planMinutes,done:doneMinutes,events:events,completed:completed,activeDays:days.size,topDay:dates[0],topDayMinutes:dates.length?map[dates[0]]:0,topType:categories[0],tasks:monthTasks.length,dayMap:map};
  }
  function wrappedPanel(target,ym,share){var s=getMonthlyStats(ym);target.replaceChildren();
    var card=node('div','mn-wrapped-card'),ey=node('div','mn-eyebrow','MOCHI WRAPPED · '+ym),title=node('h2',null,tx('story'));card.append(ey,title);
    card.append(node('p','mn-wrapped-sub',tx('sub')));
    var n=node('div','mn-hero-number',num(s.plan/60).toLocaleString()+' h');card.append(n,node('p','mn-wrapped-label',tx('planned')));
    var facts=node('div','mn-facts');[[s.events,tx('items')],[s.completed,tx('marked')],[s.tasks,tx('tasks')],[s.activeDays,tx('active')]].forEach(function(v){var item=node('div');item.append(node('b',null,String(v[0])),node('small',null,v[1]));facts.append(item)});card.append(facts);
    var info=node('div','mn-wrapped-info');info.append(node('h3',null,tx('highlights')));
    info.append(node('p',null,s.topDay?tx('busiest')+': '+s.topDay+' · '+num(s.topDayMinutes/60)+' h':tx('empty')));
    if(s.topType)info.append(node('p',null,tx('most')+': '+s.topType[0]+' · '+num(s.topType[1]/60)+' h'));
    info.append(node('p','mn-hint',tx('scope')));
    card.append(info);target.append(card);
    if(share)target.append(button('📷 '+tx('export'),function(){exportWrapped(s)},'mn-primary'));
  }
  function exportWrapped(s){
    // Canvas is used instead of external screenshot libraries; no network and no private data upload.
    var c=document.createElement('canvas');c.width=1080;c.height=1920;var x=c.getContext('2d');
    var g=x.createLinearGradient(0,0,1080,1920);g.addColorStop(0,'#272057');g.addColorStop(.5,'#6b4ac7');g.addColorStop(1,'#ee89b3');x.fillStyle=g;x.fillRect(0,0,1080,1920);
    x.fillStyle='#fff';x.font='bold 42px system-ui';x.fillText('MOCHI WRAPPED',80,155);x.font='42px system-ui';x.fillText(s.ym+'  ·  MOCHI',80,240);
    x.font='bold 165px system-ui';x.fillText(num(s.plan/60).toLocaleString()+'h',70,580);
    x.font='40px system-ui';x.fillText(tx('planned'),80,655);
    x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.roundRect(65,810,950,610,36);x.fill();x.fillStyle='#fff';
    [[tx('items'),s.events],[tx('marked'),s.completed],[tx('tasks'),s.tasks],[tx('active'),s.activeDays]].forEach(function(v,i){var xx=110+(i%2)*480,yy=950+Math.floor(i/2)*275;x.font='bold 98px system-ui';x.fillText(String(v[1]),xx,yy);x.font='36px system-ui';x.fillText(v[0],xx,yy+68)});
    x.font='32px system-ui';x.fillText('Your Smart Timetable for Study, Work & Life',75,1660);
    x.font='25px system-ui';x.fillText(tx('scope').slice(0,70),75,1745);
    c.toBlob(function(blob){if(!blob)return;var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mochi-wrapped-'+s.ym+'.png';document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},30000)},'image/png');
  }
  function openWrapped(){var m=modal('🎧 Mochi Wrapped'),row=node('div','mn-month-row'),input=node('input');input.type='month';input.value=monthNow();input.max=monthNow();row.append(node('label',null,tx('month')),input);m.panel.append(row);var holder=node('div');m.panel.append(holder);function r(){wrappedPanel(holder,input.value||monthNow(),true)}input.addEventListener('change',r);r();}
  function mountWrapped(){var t=document.getElementById('mochi-wrapped-mount');if(!t)return;t.replaceChildren();var card=node('div','mn-stats-invite');card.append(node('div',null,'🎧 Mochi Wrapped'),node('p',null,tx('wrappedIntro')));card.append(button(tx('openWrapped'),function(){window.MochiNext.openWrapped()},'mn-btn'));t.append(card);}
  function startTour(){
    if(window.driver&&window.driver.js&&typeof window.driver.js.driver==='function'){
      if(typeof showView==='function')showView('tt');
      var obj=window.driver.js.driver({showProgress:true,allowClose:true,nextBtnText:tx('tourNext'),prevBtnText:tx('tourPrevious'),doneBtnText:tx('tourDone'),onDestroyed:function(){afterTour()},steps:[
        {element:'#top',popover:{title:tx('tourTitle'),description:tx('tourWelcome')}},
        {element:'#v-tt .tt-head',popover:{title:tx('tourSchedule'),description:tx('tourScheduleText')}},
        {element:'#fab',popover:{title:tx('tourAdd'),description:tx('tourAddText')}},
        {element:'.tabbar',popover:{title:tx('tourTabs'),description:tx('tourTabsText')}},
        {element:'#burger',popover:{title:tx('tourMenu'),description:tx('tourMenuText')}}]});obj.drive();
    }else{
      var m=modal('🧭 '+tx('tourFallback'));m.panel.append(node('p',null,tx('tourFallbackText')));
      m.panel.append(node('p','mn-hint',tx('tourOffline')));m.panel.append(button(tx('tourOkay'),function(){m.mask.remove();afterTour()},'mn-primary'));
    }
  }
  // Chrono parser: async ES module if online. No AI call or automatic calendar write.
  var chronoPromise=null;
  function chrono(){if(window.MochiChrono)return Promise.resolve(window.MochiChrono);if(chronoPromise)return chronoPromise;
    chronoPromise=import('https://esm.sh/chrono-node@2.9.0').then(function(m){return m}).catch(function(){return null});return chronoPromise;}
  function fallbackParse(s){
    var base=new Date(),out=null,day=s.match(/(今天|明天|后天|下周[一二三四五六日天]|(?:星期|周)[一二三四五六日天])/);
    if(day){out=new Date(base.getFullYear(),base.getMonth(),base.getDate());var word=day[1];if(word==='明天')out.setDate(out.getDate()+1);else if(word==='后天')out.setDate(out.getDate()+2);
      else if(/[一二三四五六日天]/.test(word)){var n={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0}[word.slice(-1)],delta=(n-out.getDay()+7)%7;if(word.startsWith('下周')&&(out.getDay()!==0||n===0))delta+=7;out.setDate(out.getDate()+delta)}}
    var direct=s.match(/(20\d\d)[-/年](\d{1,2})[-/月](\d{1,2})/);if(direct)out=new Date(+direct[1],+direct[2]-1,+direct[3]);
    var hm=s.match(/(上午|早上|中午|下午|晚上)?\s*(\d{1,2})(?::|：|点)(\d{1,2}|半)?/);
    if(!out&&!hm)return null;if(!out)out=new Date(base.getFullYear(),base.getMonth(),base.getDate());
    if(hm){var h=+hm[2],minute=hm[3]==='半'?30:+hm[3]||0;if((hm[1]==='下午'||hm[1]==='晚上')&&h<12)h+=12;if(hm[1]==='中午'&&h<11)h+=12;out.setHours(h,minute,0,0)}
    return out;
  }
  function connectChrono(){var q=document.getElementById('aiq');if(!q||q.dataset.mochiChrono)return;q.dataset.mochiChrono='1';
    var card=node('div','mn-chrono'),hint=node('div','mn-chrono-result');card.append(node('strong',null,'🕒 '+tx('chrono')),hint);
    var note=node('small',null,tx('chronoNote'));card.append(note);q.insertAdjacentElement('afterend',card);
    var timer=null;async function check(){var val=q.value.trim();if(!val){hint.textContent=tx('chronoEmpty');return}var found=fallbackParse(val);
      if(!found){var ch=await chrono();if(ch){try{var r=ch.parse(val,new Date(),{forwardDate:true});if(r.length)found=r[0].start.date()}catch(e){}}}
      hint.textContent=found&&!isNaN(found.valueOf())?tx('chronoFound')+': '+found.toLocaleString()+' · '+tx('chronoNext'):tx('chronoMissing');}
    q.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(check,220)});hint.textContent=tx('chronoEmpty');
  }
  window.MochiNext={mode:mode,modes:modes,selectMode:selectMode,mountWizardChoices:mountWizardChoices,openModes:openModes,openEnergy:openEnergy,openWrapped:openWrapped,startTour:startTour};
  document.addEventListener('DOMContentLoaded',function(){applyMode();mountWrapped();connectChrono();});
  // 向导走完会重载页面并留下标记：这里接上第二层——先跑 driver.js 引导，引导结束后弹出「学习 / 工作 / 生活」模式选择。
  window.addEventListener('load',function(){
    var f=null;try{f=localStorage.getItem('mochi-mode-after-wizard');localStorage.removeItem('mochi-mode-after-wizard')}catch(e){}
    if(f==='1')setTimeout(startTour,800)});
  // The existing first-run wizard retains full control; tutorial can be launched from More.
})();
