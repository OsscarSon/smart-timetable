// 调后端 /api/*：带上 Supabase 登录令牌（后端要求登录才能用云端 AI），统一错误提示。
async function apiPost(path,body,ms){
  var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},ms||45000);
  try{
    var h={'Content-Type':'application/json'},tok=window.cloud&&cloud.token?await cloud.token():'';
    if(tok)h.Authorization='Bearer '+tok;
    var r=await fetch(((window.MOCHI_CFG&&MOCHI_CFG.apiBase)||'')+path,{method:'POST',headers:h,body:JSON.stringify(body),signal:ctl.signal});
    var j=await r.json().catch(function(){return {}});
    if(!r.ok){var e=new Error(j.error||('HTTP '+r.status));e.status=r.status;e.code=j.code;e.retry=+r.headers.get('retry-after')||0;throw e}
    return j}
  finally{clearTimeout(tm)}}
function apiErr(e){
  if(!e)return '未知错误';
  if(e.name==='AbortError')return '等了太久没回应';
  if(e.status===401)return '云端 AI 需要先登录账号（设置 → 账号与同步）';
  if(e.status===429)return e.message||'请求太频繁了，稍等一下再试';
  return String(e.message||e).slice(0,120)}
