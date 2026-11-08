// 🔤 本机文字识别（Tesseract.js，Apache-2.0）：在浏览器里把课表图片变成文字，再交给 AI 整理成课程。
// 图片不会上传去做 OCR（只有识别出来、你核对过的文字才会发给 AI 整理）。库和语言包按需从 CDN 加载（第一次约 10–20 MB，之后浏览器会缓存）。
// 中文 / 马来文的识别质量要看图片清晰度，所以识别结果一定会先给你修改，再生成课表。
window.OCR=(function(){
  var LIB='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  function load(){
    if(window.Tesseract)return Promise.resolve();
    return new Promise(function(res,rej){var s=document.createElement('script');s.src=LIB;s.onload=res;s.onerror=function(){rej(new Error('没加载到文字识别库（检查网络）'))};document.head.appendChild(s)})}
  // 放大到合适尺寸 + 灰度 + 拉开对比度，OCR 会准很多
  function prep(f){
    return new Promise(function(res,rej){
      var u=URL.createObjectURL(f),im=new Image();
      im.onload=function(){
        var k=Math.min(2200/Math.max(im.width,im.height),2.5);k=Math.max(k,Math.min(1,1200/Math.max(im.width,im.height)));
        var c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
        var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
        try{var d=x.getImageData(0,0,c.width,c.height),p=d.data;
          for(var i=0;i<p.length;i+=4){var g=.299*p[i]+.587*p[i+1]+.114*p[i+2];g=(g-128)*1.35+128;g=g<0?0:g>255?255:g;p[i]=p[i+1]=p[i+2]=g}
          x.putImageData(d,0,0)}catch(e){}
        res(c)};
      im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('这张图片打不开'))};im.src=u})}
  // 返回 {plain: 给你核对的纯文字, pos: 带水平位置的版本（让 AI 把单元格对齐到星期列）}
  async function run(file,langs,onProg){
    await load();var cv=await prep(file),W=cv.width;
    var w=await Tesseract.createWorker(langs,1,{logger:function(m){if(onProg&&m&&m.status==='recognizing text')onProg(Math.round((m.progress||0)*100));else if(onProg&&m&&/loading|initializ/.test(m.status||''))onProg(-1,m.status)}});
    try{
      await w.setParameters({preserve_interword_spaces:'1'});
      var r=await w.recognize(cv,{},{blocks:true}),d=r.data||{},lines=d.lines;
      if(!lines&&d.blocks){lines=[];d.blocks.forEach(function(b){(b.paragraphs||[]).forEach(function(p){(p.lines||[]).forEach(function(l){lines.push(l)})})})}
      var plain=String(d.text||'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
      var pos=(lines||[]).map(function(l){return (l.words||[]).filter(function(x){return x.text&&x.text.trim()}).map(function(x){return '['+Math.round((x.bbox.x0+x.bbox.x1)/2/W*100)+']'+x.text.trim()}).join(' ')}).filter(Boolean).join('\n');
      return {plain:plain,pos:pos||plain}}
    finally{try{await w.terminate()}catch(e){}}}
  return {run:run,load:load}})();
