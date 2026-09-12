import test from 'node:test';
import assert from 'node:assert/strict';
import{screenLayout,playFrame,targetIndicator,compactObjective}from'../layout.mjs?v=pages-5';

test('the game chooses its layout from the available surface, including a short embedded viewer',()=>{
 assert.equal(screenLayout(1280,720).mode,'desktop');
 assert.equal(screenLayout(390,740,true).mode,'portrait');
 assert.equal(screenLayout(844,390,true).mode,'landscape');
 assert.equal(screenLayout(390,300,true).tiny,true);
 for(const[w,h]of[[320,480],[375,667],[390,740],[430,830],[640,280],[844,390],[1024,768]]){
  const l=screenLayout(w,h,true);assert.ok(l.button>=44);assert.ok(l.joystick>=72);
  assert.ok(l.joystick+l.button*2+l.gap+l.gutter*2<w,'The left and right controls must fit separately');
 }
});

test('mobile world size and camera center remain stable when viewer height or HUD content changes',()=>{
 for(const[w,h]of[[390,740],[844,390],[640,280],[390,300],[320,480]]){
  const layout=screenLayout(w,h,true);
  const a=playFrame(layout,78,{top:86,bottom:140},h-150);
  const b=playFrame(layout,102,{top:110,bottom:220},h-180);
  for(const frame of[a,b]){
   assert.equal(frame.zoom,1,'Mobile characters must retain their original world scale');
   assert.equal((frame.left+frame.right)/2,w/2);
   assert.equal((frame.top+frame.bottom)/2,h/2);
   assert.ok(frame.bottom-frame.top>=80);
  }
 }
});

test('offscreen objective arrows stay inside the playable area and point toward their targets',()=>{
 const frame={left:16,top:92,right:828,bottom:240},anchor={x:422,y:166};
 for(const target of [{x:2000,y:166},{x:-100,y:166},{x:422,y:-200},{x:422,y:2000},{x:1500,y:1600}]){
  const p=targetIndicator(target,anchor,frame);assert.ok(p);
  assert.ok(p.x>=frame.left+16&&p.x<=frame.right-16);
  assert.ok(p.y>=frame.top+16&&p.y<=frame.bottom-16);
  assert.ok(Math.abs((p.x-anchor.x)*(target.y-anchor.y)-(p.y-anchor.y)*(target.x-anchor.x))<.00001);
 }
 assert.equal(targetIndicator({x:450,y:170},anchor,frame),null);
});

test('short instructions retain the material deficit and distinguish keyboard from touch',()=>{
 const o=['REÚNE LOS MATERIALES','Faltan 2 fibras y 1 pieza. Recoge: Cajón de aislantes.','g_cache1'];
 assert.equal(compactObjective({id:'craft'},o,true),o[1]);
 assert.match(compactObjective({id:'move'},o,false),/WASD/);
 assert.match(compactObjective({id:'move'},o,true),/control izquierdo/);
});
