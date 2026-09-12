import test from 'node:test';
import assert from 'node:assert/strict';
import{ZONES,TILE,LESSONS,freshState,parseSave,serialize,objective,objectivePosition,storyObjective,tutorialGuide,tutorialProgress,learnMenu,missingMaterials,craft,canStand,lineClear,skillLevel,emergencySupplies}from'../model.mjs?v=pages-5';
import{interact,choiceAction}from'../actions.mjs?v=pages-5';
import{Engine}from'../engine.mjs?v=pages-5';
import{workshopView}from'../workshop.mjs?v=pages-5';

const act=(s,id)=>interact(s,ZONES[s.zone].entities.find(e=>e.id===id));
function blockedSave(){const s=freshState();delete s.tutorial;for(const id of ['sera','iven','parcel','plaza_exit','pump','coil'])act(s,id);delete s.tutorial;return parseSave(serialize(s))}

// Quest navigation is isolated from enemy AI here. Walk the real collision grid,
// interact through nearest(), and collect only what the displayed guide requests.
function walkTo(engine,target){
 const s=engine.state,z=ZONES[s.zone],step=16,width=z.w*4,encode=(x,y)=>y*width+x;
 engine.enemies=[];
 const sx=Math.round(s.player.x/step),sy=Math.round(s.player.y/step),start=encode(sx,sy);
 assert.ok(canStand(s,sx*step,sy*step));
 const queue=[[sx,sy]],parents=new Map([[start,null]]);let end=null;
 for(let i=0;i<queue.length;i++){
  const[x,y]=queue[i];
  if(Math.hypot(x*step-target.x,y*step-target.y)<75&&lineClear(s,{x:x*step,y:y*step},target)){end=encode(x,y);break}
  for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,key=encode(xx,yy);if(xx<0||yy<0||xx>=width||yy>=z.h*4||parents.has(key)||!canStand(s,xx*step,yy*step))continue;parents.set(key,encode(x,y));queue.push([xx,yy])}
 }
 assert.notEqual(end,null,`Cannot reach ${s.zone}/${target.id}`);
 const path=[];for(let k=end;k!==null;k=parents.get(k))path.push([k%width*step,Math.floor(k/width)*step]);
 for(const[x,y]of path.reverse()){
  let iterations=0;
  while(Math.hypot(x-s.player.x,y-s.player.y)>.01){
   assert.ok(++iterations<20,`Movement stuck toward ${target.id}`);
   const dx=x-s.player.x,dy=y-s.player.y,speed=skillLevel(s,'exploration')>=3?225:205;
   engine.step(Math.min(.04,Math.hypot(dx,dy)/speed),{x:dx,y:dy});
   if(objectivePosition(s)?.id!==target.id)return false;
  }
 }
 return true;
}

test('the reported old save points to supplies, then the usable local workbench',()=>{
 const s=blockedSave();assert.deepEqual(missingMaterials(s,'filter').map(x=>[x.key,x.missing]),[['fiber',2],['scrap',1]]);
 assert.equal(objective(s)[2],'g_cache1');assert.match(objective(s)[1],/2 fibras y 1 pieza/);
 const original={xp:s.xp,flags:{...s.flags},bag:{...s.bag}};
 assert.equal(craft(s,'filter'),false);assert.deepEqual({xp:s.xp,flags:s.flags,bag:s.bag},original);
 act(s,'g_cache1');assert.equal(objective(s)[2],'bench_gallery');
 act(s,'gallery_exit');assert.equal(objective(s)[2],'bench_plaza');
 assert.equal(craft(s,'filter'),true);assert.ok(s.tutorial.done.craft);
});

test('a new player can complete every basic lesson by following the guide alone',()=>{
 const game=new Engine(),s=game.state;game.menu=false;const steps=[];
 for(let i=0;i<100&&tutorialProgress(s)<LESSONS.length;i++){
  const g=tutorialGuide(s);assert.ok(g,'Guide disappeared before its basic lessons were practiced');steps.push(g.id+':'+g.target);
  if(g.id==='move'){for(let n=0;n<10;n++)game.step(.05,{x:1,y:0});continue}
  if(g.id==='dodge'){assert.equal(game.dash(),true);for(let n=0;n<5;n++)game.step(.05,{x:1,y:0});continue}
  if(['bag','journal','map','skills'].includes(g.id)){learnMenu(s,g.id);continue}
  if(g.id==='scan'){assert.equal(game.scan(),true);continue}
  const target=objectivePosition(s);assert.ok(target,JSON.stringify(g));
  if(!walkTo(game,target))continue;
  if(g.id==='attack'){assert.equal(game.attack(),true);continue}
  if(g.id==='air'&&target.id==='record'){
   for(let n=0;n<40&&!s.tutorial.done.exposure;n++)game.step(.05,{x:0,y:0});
   if(objectivePosition(s)?.id!==target.id)continue;
  }
  const result=game.perform();assert.ok(result,`No interaction for ${target.id}`);
  if(result.menu==='workshop'){assert.equal(missingMaterials(s,'filter').length,0);assert.equal(game.craft('filter'),true)}
 }
 assert.equal(tutorialProgress(s),LESSONS.length,steps.join('\n'));
 assert.ok(s.flags.filter);assert.ok(s.flags.bossPeaceful);assert.ok(s.tutorial.done.exposure);assert.equal(s.zone,'annex');
 assert.ok(s.looted.includes('plaza_cache'));assert.equal(s.flags.emergencyFilter,undefined);
 assert.equal(tutorialGuide(s),null);assert.deepEqual(parseSave(serialize(s)),s);
});

test('the respirator remains obtainable after repairing the optional shortcut',()=>{
 const s=blockedSave();act(s,'g_cache2');act(s,'bridge');choiceAction(s,'shortcut');
 assert.equal(s.zone,'plaza');assert.equal(storyObjective(s)[2],'plaza_cache');
 act(s,'plaza_cache');assert.equal(storyObjective(s)[2],'bench_plaza');assert.equal(craft(s,'filter'),true);
});

test('remaining supplies are selected by actual need and unopened containers',()=>{
 const s=blockedSave();s.looted.push('g_cache1');s.bag.scrap=10;
 assert.equal(storyObjective(s)[2],'plaza_cache');
 s.looted.push('plaza_cache');assert.equal(storyObjective(s)[2],'sera');
 assert.equal(emergencySupplies(s),true);const after=serialize(s);assert.equal(emergencySupplies(s),false);assert.equal(serialize(s),after);
 assert.equal(craft(s,'filter'),true);assert.equal(emergencySupplies(s),false);
});

test('workbench names the required item, shows deficits, and gives an actionable next step',()=>{
 const s=blockedSave(),blocked=workshopView(s);
 assert.match(blocked,/TU OBJETIVO/);assert.match(blocked,/Respirador de servicio/);assert.match(blocked,/0 \/ 2/);assert.match(blocked,/Faltan 2/);assert.match(blocked,/Cajón de aislantes/);assert.match(blocked,/data-action="track-materials"/);assert.doesNotMatch(blocked,/data-craft="pulse"/);
 act(s,'g_cache1');const ready=workshopView(s);assert.match(ready,/data-craft="filter" data-focus>Fabricar respirador/);assert.doesNotMatch(ready,/data-action="track-materials"/);
 craft(s,'filter');const done=workshopView(s,'filter');assert.match(done,/FABRICADO Y EQUIPADO/);assert.match(done,/Continuar con la guía/);assert.doesNotMatch(done,/data-craft="filter"/);
});

test('learning requires actions, respects pause, and resumes without clearing progress',()=>{
 const s=freshState(),g=new Engine(s);g.step(.05,{x:1,y:0});assert.equal(tutorialProgress(s),0);assert.equal(g.attack(),false);assert.equal(g.dash(),false);
 g.menu=false;assert.equal(g.attack(),true);assert.equal(s.tutorial.done.attack,undefined,'Swinging far from the practice post is not a lesson');
 g.step(.05,{x:0,y:0});assert.equal(s.tutorial.done.move,undefined);
 learnMenu(s,'skills');assert.equal(s.tutorial.done.skills,undefined,'Opening level 1 skills cannot dismiss the upgrade lesson');
 const legacy=blockedSave(),snapshot={flags:{...legacy.flags},bag:{...legacy.bag},xp:legacy.xp,zone:legacy.zone};
 const restored=parseSave(serialize(legacy));assert.deepEqual({flags:restored.flags,bag:restored.bag,xp:restored.xp,zone:restored.zone},snapshot);assert.equal(objective(restored)[2],'g_cache1');
});
