// Landscape coordinates are shared by layout, Canvas and touch input.
// CSS rotation is a fallback when native orientation locking is unavailable.
export function layoutFor(width,height,touch){
  const rotated=touch&&height>width;
  return {width:rotated?height:width,height:rotated?width:height,physicalWidth:width,physicalHeight:height,rotated,mobile:touch};
}
export function localPoint(clientX,clientY,rect,rotated){
  return rotated?{x:clientY-rect.top,y:rect.right-clientX}:{x:clientX-rect.left,y:clientY-rect.top};
}
export function localVector(dx,dy,rotated){return rotated?{x:dy,y:-dx}:{x:dx,y:dy};}
export const viewport=layoutFor(1024,768,false);
export function installViewport(onChange){
  const touch=matchMedia('(pointer: coarse)').matches||(navigator.maxTouchPoints>0&&Math.min(window.screen.width,window.screen.height)<=1024);
  let updating=false,lastGeometry='';
  function update(){
    updating=false;
    // Keep the layout stable while the name field's software keyboard is open.
    if(document.activeElement?.tagName==='INPUT'&&viewport.mobile)return;
    const visible=window.visualViewport;
    const width=Math.floor(visible?.width||document.documentElement.clientWidth||innerWidth);
    const height=Math.floor(visible?.height||innerHeight);
    Object.assign(viewport,layoutFor(width,height,touch));
    const root=document.documentElement;
    root.style.setProperty('--game-width',viewport.width+'px');
    root.style.setProperty('--game-height',viewport.height+'px');
    root.style.setProperty('--physical-width',width+'px');
    root.style.setProperty('--physical-height',height+'px');
    root.style.setProperty('--viewport-left',(visible?.offsetLeft||0)+'px');
    root.style.setProperty('--viewport-top',(visible?.offsetTop||0)+'px');
    root.classList.toggle('mobile-ui',touch);
    root.classList.toggle('rotated-ui',viewport.rotated);
    root.classList.toggle('compact-ui',touch&&viewport.height<620);
    root.classList.toggle('tiny-ui',touch&&viewport.height<350);
    const geometry=[width,height,touch,viewport.rotated].join(':');
    if(geometry!==lastGeometry){lastGeometry=geometry;onChange?.(viewport);}
  }
  function schedule(){if(!updating){updating=true;requestAnimationFrame(update);}}
  update();window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  document.addEventListener('fullscreenchange',schedule);
  document.addEventListener('focusout',()=>setTimeout(schedule,200));
  return update;
}
export function canScroll(scrollTop,scrollHeight,clientHeight,delta){
  if(scrollHeight<=clientHeight+1)return false;
  return delta>0?scrollTop<scrollHeight-clientHeight-1:delta<0?scrollTop>0:false;
}
export function installScrollGuard(){
  let previous=null;
  function panelConsumes(target,delta){
    let el=target instanceof Element?target:target?.parentElement;
    while(el&&el!==document.body){
      if(el.matches('#panel-dialog,.lobby-layout,.lobby-screen')){
        const overflow=getComputedStyle(el).overflowY;
        if(/auto|scroll/.test(overflow)&&canScroll(el.scrollTop,el.scrollHeight,el.clientHeight,delta))return true;
      }
      el=el.parentElement;
    }
    return false;
  }
  document.addEventListener('touchstart',e=>{const t=e.touches[0];previous=t?{x:t.clientX,y:t.clientY}:null;},{passive:true,capture:true});
  document.addEventListener('touchmove',e=>{
    const t=e.touches[0];if(!t)return;
    const d=previous?localVector(previous.x-t.clientX,previous.y-t.clientY,viewport.rotated):{x:0,y:0};
    previous={x:t.clientX,y:t.clientY};
    if(e.touches.length===1&&panelConsumes(e.target,d.y))return;
    if(e.cancelable)e.preventDefault();
  },{passive:false,capture:true});
  document.addEventListener('touchend',()=>previous=null,{passive:true});
  document.addEventListener('wheel',e=>{
    const d=localVector(e.deltaX,e.deltaY,viewport.rotated);
    if(!panelConsumes(e.target,d.y)&&e.cancelable)e.preventDefault();
  },{passive:false});
  // Native text focus can move the document. Keep the page origin fixed after it closes.
  window.addEventListener('scroll',()=>{
    if(document.activeElement?.tagName!=='INPUT'&&(window.scrollX||window.scrollY))window.scrollTo(0,0);
  },{passive:true});
}
let requesting=false;
export async function requestLandscape(){
  if(!viewport.mobile||requesting)return false;
  requesting=true;
  try{
    if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
      try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch{}
    }
    try{await window.screen.orientation?.lock?.('landscape');}catch{}
    return !!document.fullscreenElement;
  }finally{requesting=false;}
}
