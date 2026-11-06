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
  function selectMode(m){prof.mode=m;save(PROFILE,prof);applyMode();}
  function mode(){return ['study','work','life','both'].includes(prof.mode)?prof.mode:'study'}
  function makeModeCards(into,compact){
    var wrap=node('div','mn-mode-grid');
    [['study','学习 Study','上课、作业、复习','assets/study-mode.webp'],['work','工作 Work','班表、会议、项目','assets/work-mode.webp'],['life','生活 Life','运动、习惯、日常安排','assets/life-mode.webp']].forEach(function(x){
      var b=node('button','mn-mode-card'+(mode()===x[0]?' selected':''));b.type='button';b.setAttribute('aria-pressed',String(mode()===x[0]));
      var im=node('img');im.src=x[3];im.alt=x[1]+' 场景插画';im.loading='lazy';b.append(im,node('strong',null,x[1]),node('small',null,x[2]));
      b.onclick=function(){selectMode(x[0]);if(compact&&typeof WZ!=='undefined'&&WZ.i===0){WZ.goal=x[0]==='study'?'photo':'none';if(typeof wzStep==='function'){wzStep();return}}wrap.querySelectorAll('.mn-mode-card').forEach(function(z){z.classList.remove('selected');z.setAttribute('aria-pressed','false')});b.classList.add('selected');b.setAttribute('aria-pressed','true');};wrap.append(b);
    });
    var b=button('☯ 学习 + 工作（混合）',function(){selectMode('both');makeModeCards(into,compact)},'mn-both'+(mode()==='both'?' selected':''));
    into.querySelectorAll('.mn-mode-grid,.mn-both').forEach(function(e){e.remove()});into.append(wrap,b);
    if(!compact)into.append(node('p','mn-hint','只更改界面标签与推荐入口；原有时间表、作业、数据不会转换或删除。'));
  }
  function mountWizardChoices(box){var wrap=node('div','mn-wiz-modes');wrap.append(node('h3',null,'你主要用 Mochi 安排什么？'));makeModeCards(wrap,true);box.append(wrap);}
  function openModes(){var m=modal('🧭 选择使用场景');m.panel.append(node('p','mn-hint','所有模式共用同一套时间表，可随时切换。'));makeModeCards(m.panel,false);m.panel.append(button('完成',function(){m.mask.remove()},'mn-primary'));}
  function applyMode(){
    document.body.dataset.mochiMode=mode();
    var work=mode()==='work',both=mode()==='both',life=mode()==='life';
    var hm=document.querySelector('#v-hw h2'),st=document.querySelector('#v-st h2'),hw=document.querySelector('#hwa'),dt=document.querySelector('#hwt');
    if(hm)hm.textContent=work?'📋 工作与任务':life?'🗓️ 生活任务':both?'📝 学习 / 工作任务':'📝 作业与任务';
    if(hw)hw.textContent=work?'＋ 新任务':life?'＋ 新生活任务':both?'＋ 新任务 / 作业':'＋ 新作业';
    if(st)st.textContent=work||life?'📚 个人学习（可选）':'📚 学习计划';
    var header=document.querySelector('.tabbar button[data-v="hw"]');if(header)header.lastChild.textContent=work||life?'任务':both?'任务':'学习';
    var ttl=document.getElementById('ttn');if(ttl)ttl.title='同一个日程引擎，任何使用场景都可以共享';
    renderLife();
  }
  function dayEnergy(day){return energy[day]&&energy[day].level||'medium'}
  function openEnergy(){var m=modal('⚡ Mochi Energy');var key=today();
    var intro=node('p','mn-hint','今天你的精力怎么样？只提供排程建议，绝不会未经确认自动移动日程。');m.panel.append(intro);
    var wrap=node('div','mn-energy-grid');m.panel.append(wrap);
    [['high','⚡ 精力充沛','适合需要深度专注的安排'],['medium','🌤 状态普通','维持原计划，留好休息时间'],['low','🌙 比较疲惫','优先保留必要事项，减少非紧急负担']].forEach(function(v){
      var b=button(v[1]+'\n'+v[2],function(){energy[key]={level:v[0],updated:Date.now()};save(ENERGY,energy);refresh();renderLife()},'mn-energy-option');b.dataset.energy=v[0];wrap.append(b);
    });
    var result=node('div','mn-suggest');m.panel.append(result);
    function refresh(){wrap.querySelectorAll('button').forEach(function(b){b.classList.toggle('selected',b.dataset.energy===dayEnergy(key))});
      var level=dayEnergy(key),txt=level==='low'?'建议今天保留必要会议、课程与截止任务，先推迟可选的高强度项目；每工作一段时间留出休息。':level==='high'?'可以考虑把最需要集中注意力的任务放在精神最佳的时段，仍要保留用餐与休息。':'按原计划稳步推进。给任务之间安排 10–15 分钟缓冲会更舒适。';
      result.replaceChildren(node('strong',null,'今日建议'),node('p',null,txt));
      var list=upcomingToday();if(list.length){result.append(node('p','mn-hint','今天在当前课表的安排：'));list.slice(0,6).forEach(function(x){result.append(node('div','mn-mini-row',(typeof tmin==='function'?tmin(x.s):String(x.s))+' · '+x.t))});}
    }refresh();m.panel.append(button('完成',function(){m.mask.remove()},'mn-primary'));
  }
  function upcomingToday(){try{if(typeof itemsOf==='function'&&typeof todayIdx!=='undefined'&&typeof curW!=='undefined'&&curW===thisW)return itemsOf(todayIdx).filter(function(x){return x.e>0});}catch(e){}return []}
  function renderLife(){var target=document.getElementById('mochi-life-mount');if(!target)return;
    target.replaceChildren();var h=node('div','mn-life-intro');h.append(node('h3',null,'学习、工作之外，也有自己的生活。'),node('p',null,'生活管理始终独立于身份模式，并使用同一份时间表。'));target.append(h);
    var grid=node('div','mn-life-grid');[['🏃','运动计划','sp'],['💧','饮食与饮水','di'],['✨','美容护肤','bt'],['📅','我的日程','tt']].forEach(function(x){grid.append(button(x[0]+' '+x[1],function(){if(typeof showView==='function')showView(x[2])},'mn-life-tile'))});target.append(grid);
    var status=node('div','mn-life-status');status.append(node('span',null,'今日精力'),node('b',null,({high:'精力充沛',medium:'普通状态',low:'比较疲惫'})[dayEnergy(today())]));target.append(status);
    target.append(button('⚡ 记录今日精力',openEnergy,'mn-primary'),button('🎧 查看 Mochi Wrapped',openWrapped,'mn-btn'));
  }
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
          var label=(x.t||'其他').replace(/^[^\p{L}\p{N}]+/u,'').trim().slice(0,15)||'其他';cat[label]=(cat[label]||0)+mins;
          var key=w+'-'+wd+'-'+x.s+'-'+x.t;var done=typeof DN!=='undefined'&&DN[key];if(done){doneMinutes+=mins;completed++;}
        });
      }
    }}catch(e){console.warn('Wrapped schedules unavailable',e)}
    var monthTasks=[];try{if(typeof HW!=='undefined')monthTasks=HW.filter(function(x){return x.done&&dateISO(new Date(x.done)).startsWith(ym)});}catch(e){}
    var dates=Object.keys(map).sort(function(a,b){return map[b]-map[a]});var categories=Object.entries(cat).sort(function(a,b){return b[1]-a[1]});
    return {ym:ym,plan:planMinutes,done:doneMinutes,events:events,completed:completed,activeDays:days.size,topDay:dates[0],topDayMinutes:dates.length?map[dates[0]]:0,topType:categories[0],tasks:monthTasks.length,dayMap:map};
  }
  function wrappedPanel(target,ym,share){var s=getMonthlyStats(ym);target.replaceChildren();
    var card=node('div','mn-wrapped-card'),ey=node('div','mn-eyebrow','MOCHI WRAPPED · '+ym),title=node('h2',null,'你的时间，写成了故事。');card.append(ey,title);
    card.append(node('p','mn-wrapped-sub','这是一份基于当前课表本地记录生成的回顾，不是 Spotify 账号数据。'));
    var n=node('div','mn-hero-number',num(s.plan/60).toLocaleString()+' h');card.append(n,node('p','mn-wrapped-label','这个月已记录的手动安排时长'));
    var facts=node('div','mn-facts');[[s.events,'安排事项'],[s.completed,'标记完成'],[s.tasks,'完成任务'],[s.activeDays,'有安排的天数']].forEach(function(v){var item=node('div');item.append(node('b',null,String(v[0])),node('small',null,v[1]));facts.append(item)});card.append(facts);
    var info=node('div','mn-wrapped-info');info.append(node('h3',null,'本月亮点'));
    info.append(node('p',null,s.topDay?'最忙碌的一天：'+s.topDay+'，安排 '+num(s.topDayMinutes/60)+' 小时':'目前没有可统计的手动安排。'));
    if(s.topType)info.append(node('p',null,'出现时间最多的项目：'+s.topType[0]+' · '+num(s.topType[1]/60)+' 小时'));
    info.append(node('p','mn-hint','统计范围：当前课表中本月的手动安排；不把“已计划”冒充“实际花费”。固定课程、周期事件和不同课表不计入此版月报。'));
    card.append(info);target.append(card);
    if(share)target.append(button('📷 导出分享图片（PNG）',function(){exportWrapped(s)},'mn-primary'));
  }
  function exportWrapped(s){
    // Canvas is used instead of external screenshot libraries; no network and no private data upload.
    var c=document.createElement('canvas');c.width=1080;c.height=1920;var x=c.getContext('2d');
    var g=x.createLinearGradient(0,0,1080,1920);g.addColorStop(0,'#272057');g.addColorStop(.5,'#6b4ac7');g.addColorStop(1,'#ee89b3');x.fillStyle=g;x.fillRect(0,0,1080,1920);
    x.fillStyle='#fff';x.font='bold 42px system-ui';x.fillText('MOCHI WRAPPED',80,155);x.font='42px system-ui';x.fillText(s.ym+'  ·  MY TIME',80,240);
    x.font='bold 165px system-ui';x.fillText(num(s.plan/60).toLocaleString()+'h',70,580);
    x.font='40px system-ui';x.fillText('已记录的手动日程时长',80,655);
    x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.roundRect(65,810,950,610,36);x.fill();x.fillStyle='#fff';
    [['安排事项',s.events],['标记完成',s.completed],['完成任务',s.tasks],['活跃天数',s.activeDays]].forEach(function(v,i){var xx=110+(i%2)*480,yy=950+Math.floor(i/2)*275;x.font='bold 98px system-ui';x.fillText(String(v[1]),xx,yy);x.font='36px system-ui';x.fillText(v[0],xx,yy+68)});
    x.font='32px system-ui';x.fillText('Your Smart Timetable for Study, Work & Life',75,1660);
    x.font='25px system-ui';x.fillText('仅基于已保存的手动日程 · Planned, not actual time',75,1745);
    c.toBlob(function(blob){if(!blob)return;var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mochi-wrapped-'+s.ym+'.png';document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},30000)},'image/png');
  }
  function openWrapped(){var m=modal('🎧 Mochi Wrapped'),row=node('div','mn-month-row'),input=node('input');input.type='month';input.value=monthNow();input.max=monthNow();row.append(node('label',null,'选择月份'),input);m.panel.append(row);var holder=node('div');m.panel.append(holder);function r(){wrappedPanel(holder,input.value||monthNow(),true)}input.addEventListener('change',r);r();}
  function mountWrapped(){var t=document.getElementById('mochi-wrapped-mount');if(!t)return;t.replaceChildren();var card=node('div','mn-stats-invite');card.append(node('div',null,'🎧 Mochi Wrapped'),node('p',null,'把这个月的日程，变成可以分享的故事。'));card.append(button('打开每月回顾',openWrapped,'mn-btn'));t.append(card);}
  function startTour(){
    if(window.driver&&window.driver.js&&typeof window.driver.js.driver==='function'){
      if(typeof showView==='function')showView('tt');
      var obj=window.driver.js.driver({showProgress:true,allowClose:true,nextBtnText:'下一步',prevBtnText:'上一步',doneBtnText:'完成',steps:[
        {element:'#top',popover:{title:'欢迎来到 Mochi',description:'这是你的智能时间管理中心。'}},
        {element:'#v-tt .tt-head',popover:{title:'同一个时间表',description:'学习、工作、生活，都可以安排在同一套日历里。'}},
        {element:'#fab',popover:{title:'快速安排',description:'手动创建日程，或选择 AI 一句话添加。'}},
        {element:'.tabbar',popover:{title:'生活与统计',description:'底部可进入任务、健康、统计和更多功能。'}},
        {element:'#burger',popover:{title:'更多功能',description:'在这里切换 Study / Work、记录精力、打开 Wrapped。'}}]});obj.drive();
    }else{
      var m=modal('🧭 Mochi 快速引导');m.panel.append(node('p',null,'① 课表：管理你的日常安排。\n② ＋：新增活动或让 AI 帮你解析。\n③ 更多：切换 Study / Work、查看 Energy 与 Wrapped。'));
      m.panel.append(node('p','mn-hint','当前离线或 Driver.js 尚未加载，显示简易引导。'));m.panel.append(button('了解了',function(){m.mask.remove()},'mn-primary'));
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
    var card=node('div','mn-chrono'),hint=node('div','mn-chrono-result');card.append(node('strong',null,'🕒 Chrono 时间识别'),hint);
    var note=node('small',null,'解析英文日期及常见中文时间表达；只是预览，真正加入前仍走原 AI 确认流程。');card.append(note);q.insertAdjacentElement('afterend',card);
    var timer=null;async function check(){var val=q.value.trim();if(!val){hint.textContent='输入日期或时间后，会显示识别结果。';return}var found=fallbackParse(val);
      if(!found){var ch=await chrono();if(ch){try{var r=ch.parse(val,new Date(),{forwardDate:true});if(r.length)found=r[0].start.date()}catch(e){}}}
      hint.textContent=found&&!isNaN(found.valueOf())?'识别到：'+found.toLocaleString()+' · 点击原有「解析」继续':'尚未识别到明确日期，仍可交给原 AI 理解。';}
    q.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(check,220)});hint.textContent='输入日期或时间后，会显示识别结果。';
  }
  window.MochiNext={mode:mode,selectMode:selectMode,mountWizardChoices:mountWizardChoices,openModes:openModes,openEnergy:openEnergy,openWrapped:openWrapped,startTour:startTour};
  document.addEventListener('DOMContentLoaded',function(){applyMode();renderLife();mountWrapped();connectChrono();});
  // The existing first-run wizard retains full control; tutorial can be launched from More.
})();
