// 本地附件（照片 / 文件）：Dexie 封装 IndexedDB。文件本体只在这台设备；登录云同步后会上传到 Supabase Storage。
var FDB=null,MAXF=15*1024*1024;
try{if(typeof Dexie==='function'){FDB=new Dexie('mochi-files');FDB.version(1).stores({files:'id,hw'});
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}}catch(e){FDB=null}
function fileOK(){return !!FDB}
function fmtSize(n){return n>1048576?(n/1048576).toFixed(1)+'MB':Math.max(1,Math.round(n/1024))+'KB'}
function shrinkImg(file,max,q){return new Promise(function(ok){   // 照片压到最长边 1600px，省空间
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||!window.createImageBitmap){ok(file);return}
  createImageBitmap(file).then(function(bm){
    var s=Math.min(1,max/Math.max(bm.width,bm.height));if(s===1&&file.size<600*1024){ok(file);return}
    var c=document.createElement('canvas');c.width=Math.round(bm.width*s);c.height=Math.round(bm.height*s);
    c.getContext('2d').drawImage(bm,0,0,c.width,c.height);
    c.toBlob(function(b){ok(b&&b.size<file.size?b:file)},'image/jpeg',q)
  }).catch(function(){ok(file)})})}
async function fileAdd(hwId,file){
  if(!FDB)throw new Error('这个浏览器不支持本地附件');
  var b=await shrinkImg(file,1600,.82);
  if(b.size>MAXF)throw new Error('「'+file.name+'」超过 15MB');
  var id=uid()+uid(),rec={id:id,hw:hwId,name:file.name.slice(0,60),type:b.type||file.type||'application/octet-stream',size:b.size,blob:b,ts:Date.now(),up:0};
  await FDB.files.put(rec);return {id:id,name:rec.name,type:rec.type,size:rec.size}}
async function fileBlob(m,hwId){
  var r=FDB&&await FDB.files.get(m.id);if(r&&r.blob)return r.blob;
  if(window.cloud&&cloud.user()){var b=await cloud.download(m.id);
    if(FDB)await FDB.files.put({id:m.id,hw:hwId||'',name:m.name,type:m.type,size:m.size,blob:b,ts:Date.now(),up:1});return b}
  throw new Error('这台设备上没有这个文件（登录云同步后可以下载）')}
function fileDel(id){try{if(FDB)FDB.files.delete(id)}catch(e){}if(window.cloud)cloud.delFile(id)}
async function fileOpen(m,hwId){
  var w=window.open('','_blank');                 // 先同步开窗，避免被浏览器拦截
  try{var b=await fileBlob(m,hwId),u=URL.createObjectURL(b);
    if(w&&!w.closed)w.location.href=u;
    else{var a=document.createElement('a');a.href=u;a.download=m.name;document.body.appendChild(a);a.click();a.remove()}
    setTimeout(function(){URL.revokeObjectURL(u)},60000)
  }catch(e){if(w)w.close();alert(e.message||e)}}
// 把还没上传的文件传到云端（已登录时）
window.fileFlush=async function(){
  if(!FDB||!window.cloud||!cloud.user())return;
  try{var L=await FDB.files.filter(function(r){return !r.up}).toArray();
    for(var i=0;i<L.length;i++){await cloud.upload(L[i].id,L[i].blob);await FDB.files.update(L[i].id,{up:1})}}catch(e){}
  cloud.flushRm()};
