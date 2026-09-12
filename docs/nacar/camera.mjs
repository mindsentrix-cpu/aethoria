// User camera scale is independent of viewport size, HUD layout and game rules.
export const MIN_ZOOM=.7,MAX_ZOOM=1.8,DEFAULT_ZOOM=1;
export const clampZoom=value=>Number.isFinite(value)?Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,value)):DEFAULT_ZOOM;

export class CameraZoom{
 constructor(value=DEFAULT_ZOOM){this.value=clampZoom(value);this.points=new Map();this.span=null}
 set(value){this.value=clampZoom(value);this.cancel();return this.value}
 start(id,x,y){
  if(this.points.has(id)||this.points.size>=2||!Number.isFinite(x)||!Number.isFinite(y))return false;
  this.points.set(id,{x,y});this.span=this.distance();return true;
 }
 distance(){
  if(this.points.size!==2)return null;
  const[a,b]=this.points.values(),distance=Math.hypot(a.x-b.x,a.y-b.y);
  // Rebase near touching/crossing fingers instead of dividing by a tiny span.
  return distance>=12?distance:null;
 }
 move(id,x,y){
  if(!this.points.has(id)||!Number.isFinite(x)||!Number.isFinite(y))return false;
  this.points.set(id,{x,y});const distance=this.distance(),previous=this.value;
  if(distance!==null&&this.span!==null)this.value=clampZoom(this.value*distance/this.span);
  // Incremental distance makes reversal immediate even after reaching a limit.
  this.span=distance;return this.value!==previous;
 }
 end(id){const had=this.points.delete(id);if(had)this.span=this.distance();return had}
 cancel(){this.points.clear();this.span=null}
}

// Only touches that START on the world participate in camera gestures.
// The joystick and combat buttons keep their own pointer events, including
// simultaneous movement/attacks. Native touch guards never cancel menu clicks.
export function bindCameraGestures({surface,world,controls,zoom,isPlaying,isPageZoomed=()=>false,onChange,onCommit}){
 const listeners=[],nativeTouches=new Set();let changed=false;
 const listen=(node,type,handler,options)=>{node.addEventListener(type,handler,options);listeners.push(()=>node.removeEventListener(type,handler,options))};
 const prevent=e=>{if(e.cancelable)e.preventDefault()};
 const commit=()=>{if(changed){changed=false;onCommit(zoom.value)}};
 const release=id=>{if(world.hasPointerCapture?.(id))world.releasePointerCapture(id)};
 const cancel=()=>{const ids=[...zoom.points.keys()];zoom.cancel();for(const id of ids)release(id);commit()};
 listen(world,'pointerdown',e=>{
  if(!isPlaying()||isPageZoomed()||e.pointerType!=='touch')return;
  prevent(e);if(zoom.start(e.pointerId,e.clientX,e.clientY))world.setPointerCapture(e.pointerId);
 });
 listen(world,'pointermove',e=>{
  if(!isPlaying()||isPageZoomed()){cancel();return}
  if(!zoom.points.has(e.pointerId))return;
  prevent(e);if(zoom.move(e.pointerId,e.clientX,e.clientY)){changed=true;onChange(zoom.value)}
 });
 const end=e=>{if(zoom.end(e.pointerId)){release(e.pointerId);commit()}};
 for(const type of['pointerup','pointercancel','lostpointercapture'])listen(world,type,end);

 // If an older tab (or zoomed menu) has already magnified the page, let the
 // browser handle pinch-out until visualViewport.scale returns to normal.
 // Suppress combat activation in that mode without preventing native gestures.
 listen(controls,'pointerdown',e=>{if(isPageZoomed()&&e.pointerType==='touch')e.stopPropagation()},{capture:true});

 // Safari/WebViews can recognize native touch gestures separately from pointer
 // events. Cancel their defaults on the canvas and existing pointer controls,
 // including touchend, so repeated combat taps cannot become page zoom.
 const nativeTouch=e=>{
  if(isPageZoomed()){nativeTouches.clear();return}
  const owned=e.target===world||controls.contains(e.target);
  if(e.type==='touchstart'&&owned&&(isPlaying()||controls.contains(e.target))){
   for(const t of e.changedTouches)nativeTouches.add(t.identifier);
  }
  if([...e.changedTouches].some(t=>nativeTouches.has(t.identifier)))prevent(e);
  if(e.type==='touchend'||e.type==='touchcancel')for(const t of e.changedTouches)nativeTouches.delete(t.identifier);
 };
 for(const type of['touchstart','touchmove','touchend','touchcancel'])listen(surface,type,nativeTouch,{passive:false,capture:true});
 for(const type of['gesturestart','gesturechange','gestureend'])listen(surface,type,e=>{if(isPlaying()&&!isPageZoomed())prevent(e)},{passive:false,capture:true});
 listen(surface,'dblclick',e=>{if(isPlaying()&&(e.target===world||controls.contains(e.target)))prevent(e)});
 return{cancel,destroy(){cancel();nativeTouches.clear();for(const remove of listeners)remove()}};
}
