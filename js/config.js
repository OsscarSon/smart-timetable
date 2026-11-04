// 部署时填写。Supabase 的 URL 和 anon key 是“公开”的（安全靠数据库的 RLS 规则），可以放在前端。
// 千万不要把 service_role key 放这里。留空 = 不启用云同步，应用照常本地使用。
window.MOCHI_CFG={
  supabaseUrl:'',      // 例：https://xxxx.supabase.co
  supabaseKey:'',      // Project Settings → API → anon public
  apiBase:''           // 网页版留空；手机 App（Capacitor）里填你的 Vercel 网址，如 https://mochi.vercel.app
};
