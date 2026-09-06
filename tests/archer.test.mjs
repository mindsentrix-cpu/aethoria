import assert from 'node:assert/strict';
import {GameModel,createProfile,ARCHER_STRIDE} from '../docs/model.mjs?v=4';
import {footPose,facingAngle,RELEASE,SHOT_DURATION} from '../docs/archer.mjs?v=4';

function fixture(){
  const events=[],m=new GameModel(createProfile('ranger','Prueba'),(type,data)=>events.push({type,data}));
  m.validPosition=()=>true;
  const e=m.enemies.find(e=>e.type==='wolf');
  Object.assign(e,{x:m.p.x+240,y:m.p.y,homeX:m.p.x+240,homeY:m.p.y,speed:0,hp:1000,maxHp:1000});
  m.enemies=[e];return {m,e,events};
}
function tick(m,seconds,fps=60){for(let i=0;i<Math.ceil(seconds*fps);i++)m.update(1/fps);}
const timings=[];
for(const fps of [30,60,120]){
  const {m,e}=fixture(),hp=e.hp;
  assert(m.attack());assert.equal(e.hp,hp,'Pressing attack must not cause immediate damage');
  assert(!m.attack(),'One shot at a time');
  let released=0,hit=0;
  for(let i=0;i<fps*1.2;i++){
    m.update(1/fps);
    if(!released&&m.effects.some(f=>f.type==='arrow'))released=m.p.time;
    if(!hit&&e.hp<hp)hit=m.p.time;
  }
  const threshold=m.config.cooldown*RELEASE/SHOT_DURATION;
  assert(released>=threshold-1e-8&&released<=threshold+1/fps+1e-8);
  assert(hit>released);assert.equal(e.hp,hp-m.config.damage,'Exactly one impact per released arrow');
  assert.equal(m.archerShot,null);assert(m.attack());
  timings.push({fps,release:released,impact:hit});
}
let maxFootDrift=0;
for(let dir=0;dir<8;dir++){
  const {m}=fixture();m.enemies=[];
  const sx=Math.sin(dir*Math.PI/4),sy=Math.cos(dir*Math.PI/4);
  const x=(sx/.86+sy/.48)/2,y=(sy/.48-sx/.86)/2,n=Math.hypot(x,y);
  m.input={x:x/n,y:y/n};const previous=[null,null];
  for(let i=0;i<90;i++){
    m.update(1/120);assert.equal(m.archerDirection,dir);assert(m.moving);
    const a=facingAngle(dir);
    [-1,1].forEach((side,j)=>{
      const foot=footPose(m.archerPhase,side,true,ARCHER_STRIDE);
      const pos={x:(m.p.x-m.p.y)*.86+foot.r*Math.cos(a)+foot.f*Math.sin(a),y:m.p.x+m.p.y-foot.r*Math.sin(a)+foot.f*Math.cos(a),contact:foot.contact};
      if(pos.contact&&previous[j]?.contact)maxFootDrift=Math.max(maxFootDrift,Math.hypot(pos.x-previous[j].x,pos.y-previous[j].y));
      previous[j]=pos;
    });
  }
  const phase=m.archerPhase;m.validPosition=()=>false;tick(m,.3);
  assert(!m.moving);assert.equal(m.archerPhase,phase);assert.equal(m.archerMotion,0);
}
assert(maxFootDrift<1e-8,'Stance feet must stay planted in world coordinates');
{
  const {m,e}=fixture(),hp=e.hp;
  m.attack();tick(m,.1);const age=m.archerShot.age;
  m.active=false;tick(m,1);assert.equal(m.archerShot.age,age);assert.equal(e.hp,hp);
  m.active=true;assert(m.dodge());assert.equal(m.archerShot,null);tick(m,.7);assert.equal(e.hp,hp,'Dodging cancels the unlaunched shot');
  m.attack();m.hurt(1000);assert(m.dead);m.respawn();tick(m,1);assert.equal(m.archerShot,null);assert(!m.effects.some(f=>f.type==='arrow'));
}
{
  const {m,e}=fixture(),hp=e.hp;m.attack();tick(m,.35);assert(m.effects.some(f=>f.type==='arrow'));
  e.hp=0;tick(m,.8);assert.equal(e.hp,0);assert(!m.effects.some(f=>f.type==='arrow'));
}
{
  const {m,e}=fixture(),hp=e.hp;assert(m.skill());assert.equal(m.p.mana,70);assert.equal(e.hp,hp);tick(m,.4);assert(e.hp<hp);assert(m.effects.some(f=>f.type==='arrows'));assert(!m.skill());
}
console.log(JSON.stringify({passed:true,eightDirections:true,maxFootDrift,shotTiming:timings,checks:['damage on arrival','collision stop','pause','dodge cancellation','death and respawn','dead target','ranger skill']}));
