// ↕ 拖拽排序（SortableJS，MIT）：mkSort(容器, {item:'.选择器', handle:'.把手', get:()=>数组, done:(数组,from,to)=>{保存并重画}})
// 手机上要“按住约 0.2 秒再拖”，这样上下滑动页面不会被误当成拖动。没加载到库时什么都不做。
window.mkSort=function(box,o){
  if(!window.Sortable||!box)return;
  if(box._sort){try{box._sort.destroy()}catch(e){}}
  box._sort=Sortable.create(box,{animation:150,draggable:o.item,handle:o.handle||null,delay:200,delayOnTouchOnly:true,touchStartThreshold:6,ghostClass:'sort-ghost',
    onEnd:function(ev){
      var f=ev.oldDraggableIndex,t=ev.newDraggableIndex;if(f==null||t==null||f===t)return;
      var a=o.get();a.splice(t,0,a.splice(f,1)[0]);o.done(a,f,t)}})};
