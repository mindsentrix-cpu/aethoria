import test from 'node:test';
import assert from 'node:assert/strict';
import{CameraZoom,bindCameraGestures,clampZoom,MIN_ZOOM,MAX_ZOOM}from'../camera.mjs?v=zoom-6';
import{Renderer}from'../render.mjs?v=zoom-6';
import{screenLayout,playFrame}from'../layout.mjs?v=zoom-6';
import{freshState,serialize,parseSave}from'../model.mjs?v=zoom-6';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' must equal '+b);

test('spreading and pinching are reciprocal; a single finger never zooms',()=>{
 const z=new CameraZoom();
 z.start(1,0,0);z.move(1,50,0);assert.equal(z.value,1);
 z.start(2,150,0);z.move(2,200,0);near(z.value,1.5);
 z.move(2,150,0);near(z.value,1);
 z.move(2,130,0);near(z.value,.8);
 z.move(2,150,0);near(z.value,1);
 z.end(2);z.move(1,-50,0);near(z.value,1);
});

test('zoom reverses immediately at either limit instead of getting stuck',()=>{
 const z=new CameraZoom();z.start(1,0,0);z.start(2,100,0);
 z.move(2,300,0);assert.equal(z.value,MAX_ZOOM);
 z.move(2,600,0);assert.equal(z.value,MAX_ZOOM);
 z.move(2,500,0);near(z.value,1.5);
 z.move(2,20,0);assert.equal(z.value,MIN_ZOOM);
 z.move(2,30,0);near(z.value,1.05);
});

test('lifting, replacing, adding or crossing fingers cannot create a zoom jump',()=>{
 const z=new CameraZoom();z.start(1,0,0);z.start(2,100,0);z.move(2,120,0);
 assert.equal(z.start(3,1000,0),false);z.move(3,2000,0);near(z.value,1.2);
 z.end(2);z.move(1,10,0);z.start(4,210,0);near(z.value,1.2);
 z.move(4,310,0);near(z.value,1.8);
 z.move(4,10,0);near(z.value,1.8); // collapsed span: rebase safely
 z.move(4,-100,0);near(z.value,1.8);
 z.move(4,-90,0);assert.ok(z.value<1.8);
 z.cancel();z.move(1,1000,0);assert.equal(z.points.size,0);
 assert.ok(Number.isFinite(z.value));
});

test('normal view resets safely and malformed saved preferences cannot break rendering',()=>{
 for(const value of[undefined,null,NaN,Infinity,-Infinity,'170',{},[]])assert.equal(clampZoom(value),1);
 assert.equal(clampZoom(-5),MIN_ZOOM);assert.equal(clampZoom(20),MAX_ZOOM);
 const z=new CameraZoom(1.6);z.start(1,0,0);z.start(2,100,0);z.set(1);
 assert.equal(z.value,1);assert.equal(z.points.size,0);assert.equal(z.span,null);
});

test('camera preference survives rotation and HUD changes without resizing the canvas or controls',()=>{
 const canvas={width:0,height:0,getContext(){return{}}},r=new Renderer(canvas);
 r.setCameraZoom(1.5);
 for(const[w,h]of[[390,844],[844,390],[640,280],[320,480],[1280,720]]){
  r.resize(w,h,3);
  const layout=screenLayout(w,h,w<1000),button=layout.button;
  for(const header of[68,110]){
   r.setFrame(playFrame(layout,header));
   near(r.zoom,1.5*(layout.mode==='desktop'?1.13:1));
   assert.equal(canvas.width,w*2);assert.equal(canvas.height,h*2);
   assert.equal(screenLayout(w,h,w<1000).button,button);
  }
 }
 r.setCameraZoom(1);near(r.zoom,1.13);
});

test('camera distance travels with the existing save without changing progress',()=>{
 const state=freshState();state.settings.cameraZoom=1.42;
 const restored=parseSave(serialize(state));
 assert.equal(restored.settings.cameraZoom,1.42);
 assert.deepEqual(restored.player,state.player);assert.deepEqual(restored.bag,state.bag);
 assert.equal(new CameraZoom(freshState().settings.cameraZoom).value,1);
});

// Minimal DOM event fixture. This verifies routing/cancellation, not Safari's
// own gesture recognizer; a physical iPhone check is still required.
class Node{
 constructor(parent=null){this.parent=parent;this.listeners=new Map();this.captures=new Set()}
 contains(node){for(let n=node;n;n=n.parent)if(n===this)return true;return false}
 addEventListener(type,fn,options){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push({fn,options})}
 removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn))}
 setPointerCapture(id){this.captures.add(id)}
 hasPointerCapture(id){return this.captures.has(id)}
 releasePointerCapture(id){if(this.captures.delete(id))this.fire('lostpointercapture',{pointerId:id})}
 fire(type,props={}){
  const e={type,target:this,cancelable:true,defaultPrevented:false,stopped:false,stopPropagation(){this.stopped=true},preventDefault(){if(this.cancelable)this.defaultPrevented=true},...props};
  const path=[];for(let n=this;n;n=n.parent)path.push(n);
  for(const n of[...path].reverse()){for(const h of n.listeners.get(type)||[])if(h.options?.capture)h.fn(e);if(e.stopped)return e}
  for(const n of path){for(const h of n.listeners.get(type)||[])if(!h.options?.capture)h.fn(e);if(e.stopped)return e}
  return e;
 }
}
function fixture(){
 const surface=new Node(),world=new Node(surface),controls=new Node(surface),attack=new Node(controls),stick=new Node(controls),menu=new Node(surface);
 const f={surface,world,controls,attack,stick,menu,playing:true,pageZoomed:false,changes:[],commits:[],zoom:new CameraZoom()};
 f.binding=bindCameraGestures({...f,isPlaying:()=>f.playing,isPageZoomed:()=>f.pageZoomed,onChange:z=>f.changes.push(z),onCommit:z=>f.commits.push(z)});
 return f;
}
const pointer=(node,type,id,x=0,y=0,extra={})=>node.fire(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,...extra});
const touch=(node,type,id)=>node.fire(type,{changedTouches:[{identifier:id}]});

test('rapid combat taps with a held joystick cancel native zoom but preserve every action',()=>{
 const f=fixture();let actions=0;f.attack.addEventListener('pointerdown',()=>actions++);
 pointer(f.stick,'pointerdown',1);assert.equal(touch(f.stick,'touchstart',1).defaultPrevented,true);
 for(let i=2;i<62;i++){
  pointer(f.attack,'pointerdown',i,200,200);
  assert.equal(touch(f.attack,'touchstart',i).defaultPrevented,true);
  pointer(f.attack,'pointerup',i,200,200);
  assert.equal(touch(f.attack,'touchend',i).defaultPrevented,true);
 }
 pointer(f.stick,'pointermove',1,100,100);pointer(f.stick,'pointerup',1);touch(f.stick,'touchend',1);
 assert.equal(actions,60);assert.equal(f.zoom.value,1);assert.equal(f.changes.length,0);
 assert.equal(f.attack.fire('dblclick').defaultPrevented,true);
 for(const type of['touchstart','touchmove','touchend','gesturestart','gesturechange'])assert.ok(f.surface.listeners.get(type).every(x=>x.options.passive===false));
});

test('only two world touches zoom; control touches and mouse movement cannot join a pinch',()=>{
 const f=fixture();
 pointer(f.world,'pointerdown',7,0,0,{pointerType:'mouse'});
 pointer(f.world,'pointermove',7,400,0,{pointerType:'mouse'});assert.equal(f.zoom.points.size,0);
 pointer(f.world,'pointerdown',1,0,0);
 pointer(f.attack,'pointerdown',2,100,0);pointer(f.attack,'pointermove',2,200,0);assert.equal(f.zoom.value,1);
 pointer(f.world,'pointerdown',3,100,0);pointer(f.world,'pointermove',3,150,0);
 near(f.zoom.value,1.5);assert.equal(f.world.captures.size,2);
 pointer(f.world,'pointerup',3);pointer(f.world,'pointerup',1);
 assert.equal(f.commits.length,1);assert.equal(f.world.captures.size,0);
});

test('pause, cancellation and orientation cleanup keep the chosen zoom without stranded pointers',()=>{
 const f=fixture();pointer(f.world,'pointerdown',1);pointer(f.world,'pointerdown',2,100);
 touch(f.world,'touchstart',1);pointer(f.world,'pointermove',2,140);
 f.playing=false;f.binding.cancel();
 near(f.zoom.value,1.4);assert.equal(f.world.captures.size,0);assert.equal(f.zoom.points.size,0);
 assert.equal(f.commits.length,1);
 assert.equal(touch(f.world,'touchend',1).defaultPrevented,true,'Finish owning an in-flight touch after a modal opens');
 pointer(f.world,'pointermove',2,250);near(f.zoom.value,1.4);
 f.playing=true;pointer(f.world,'pointerdown',4,100);pointer(f.world,'pointerdown',5,200);near(f.zoom.value,1.4);
 pointer(f.world,'pointercancel',5);pointer(f.world,'pointercancel',4);
 assert.equal(f.zoom.points.size,0);assert.equal(f.commits.length,1);
});

test('menu clicks, text zoom and scrolling retain their native behavior',()=>{
 const f=fixture();
 for(const type of['touchstart','touchmove','touchend'])assert.equal(touch(f.menu,type,1).defaultPrevented,false);
 assert.equal(f.world.fire('gesturestart').defaultPrevented,true);
 f.playing=false;
 for(const type of['gesturestart','gesturechange','gestureend','dblclick'])assert.equal(f.menu.fire(type).defaultPrevented,false);
 for(const type of['touchstart','touchmove','touchend'])assert.equal(touch(f.world,type,2).defaultPrevented,false);
 pointer(f.world,'pointerdown',1);pointer(f.world,'pointerdown',2,100);pointer(f.world,'pointermove',2,200);
 assert.equal(f.changes.length,0);
 f.binding.destroy();
 assert.equal([...f.surface.listeners.values()].flat().length,0);
 assert.equal([...f.world.listeners.values()].flat().length,0);
});

test('an already magnified browser page can pinch back out without firing combat actions',()=>{
 const f=fixture();let attacks=0;f.attack.addEventListener('pointerdown',()=>attacks++);
 f.pageZoomed=true;
 for(const target of[f.world,f.attack,f.stick]){
  pointer(target,'pointerdown',1);pointer(target,'pointerdown',2,100);
  for(const type of['touchstart','touchmove','touchend'])assert.equal(touch(target,type,1).defaultPrevented,false);
  for(const type of['gesturestart','gesturechange','gestureend'])assert.equal(target.fire(type).defaultPrevented,false);
  pointer(target,'pointermove',2,50);pointer(target,'pointerup',2);pointer(target,'pointerup',1);
 }
 assert.equal(attacks,0);assert.equal(f.changes.length,0);assert.equal(f.zoom.points.size,0);
 f.pageZoomed=false;
 pointer(f.attack,'pointerdown',3);assert.equal(attacks,1);
 pointer(f.world,'pointerdown',4);pointer(f.world,'pointerdown',5,100);pointer(f.world,'pointermove',5,130);
 near(f.zoom.value,1.3);
});
