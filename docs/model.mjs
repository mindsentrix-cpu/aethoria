import {RELEASE,SHOT_DURATION,facingAngle} from './archer.mjs?v=4';
export const ARCHER_STRIDE=68;
export const WORLD_SIZE=1600;
export const CLASSES={
  guardian:{name:'Guardián',icon:'shield',hp:150,damage:24,range:87,speed:135,cooldown:.62,skill:'Torbellino',skillCost:25,skillCooldown:7,role:'RESISTENCIA · CUERPO A CUERPO',description:'La primera línea frente a la oscuridad. Resiste los golpes y rompe las defensas con un poderoso torbellino.',equipment:'Hoja del alba · Escudo de hierro',color:'#c6a65f',stats:[5,3,1]},
  arcanist:{name:'Arcanista',icon:'sparkles',hp:105,damage:25,range:285,speed:132,cooldown:.82,skill:'Nova arcana',skillCost:35,skillCooldown:8,role:'PODER ARCANO · A DISTANCIA',description:'Domina la energía que duerme bajo el valle. Lanza proyectiles arcanos y detona una nova alrededor de tus enemigos.',equipment:'Báculo de ceniza · Túnica del velo',color:'#9d91d1',stats:[2,5,4]},
  ranger:{name:'Explorador',icon:'bow-arrow',hp:120,damage:20,range:320,speed:153,cooldown:.53,skill:'Lluvia de flechas',skillCost:30,skillCooldown:7,role:'AGILIDAD · LARGO ALCANCE',description:'Cada huella cuenta una historia. Ataca desde lejos, esquiva con agilidad y cubre el terreno con una lluvia de flechas.',equipment:'Arco de fresno · Capa del bosque',color:'#83a76b',stats:[3,4,5]}
};
export const CAMP={x:300,y:1160},NPC={id:'lyra',x:337,y:1105,type:'npc',name:'Lyra, guardiana del refugio'},FIRE={id:'fire',x:253,y:1125,type:'fire',name:'Hoguera del refugio'};
export const ROAD=[{x:300,y:1170},{x:480,y:1020},{x:630,y:890},{x:820,y:730},{x:1040,y:620},{x:1040,y:410},{x:1210,y:285}];
export const RESOURCE_SEEDS=[
  {id:'herb-1',x:461,y:1111,type:'herb'},{id:'herb-2',x:585,y:1000,type:'herb'},{id:'herb-3',x:751,y:820,type:'herb'},{id:'herb-4',x:830,y:981,type:'herb'},{id:'herb-5',x:565,y:785,type:'herb'},{id:'herb-6',x:1165,y:735,type:'herb'},
  {id:'ore-1',x:668,y:1182,type:'ore'},{id:'ore-2',x:741,y:1150,type:'ore'},{id:'ore-3',x:808,y:1220,type:'ore'},{id:'ore-4',x:919,y:774,type:'ore'},
  {id:'wood-1',x:401,y:946,type:'wood'},{id:'wood-2',x:540,y:1204,type:'wood'},{id:'wood-3',x:920,y:991,type:'wood'},
  {id:'chest-1',x:1090,y:1300,type:'chest'},{id:'chest-2',x:1370,y:238,type:'chest'}
];
export const ENEMY_SEEDS=[
  {id:'wolf-1',type:'wolf',x:565,y:912},{id:'wolf-2',type:'wolf',x:825,y:1058},{id:'wolf-3',type:'wolf',x:735,y:721},{id:'wolf-4',type:'wolf',x:571,y:722},
  {id:'goblin-1',type:'goblin',x:851,y:853},{id:'goblin-2',type:'goblin',x:931,y:637},{id:'goblin-3',type:'goblin',x:1115,y:688},
  {id:'boss',type:'boss',x:1227,y:279}
];
export const ENEMY_DATA={wolf:{name:'Lobo sombrío',hp:68,damage:10,speed:91,range:49,aggro:192,xp:28,gold:8},goblin:{name:'Saqueador del valle',hp:86,damage:13,speed:77,range:55,aggro:178,xp:35,gold:12},boss:{name:'Guardián de Ceniza',hp:430,damage:22,speed:58,range:79,aggro:285,xp:150,gold:90}};
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function riverY(x){return 515+Math.sin(x*.0052)*44;}
export function isWater(x,y){return Math.abs(y-riverY(x))<42&&!(x>986&&x<1094);}
export function roadDistance(p){let d=Infinity;for(let i=1;i<ROAD.length;i++){const a=ROAD[i-1],b=ROAD[i],vx=b.x-a.x,vy=b.y-a.y,t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/(vx*vx+vy*vy),0,1);d=Math.min(d,dist(p,{x:a.x+vx*t,y:a.y+vy*t}));}return d;}
export function getZone(p){if(dist(p,CAMP)<195)return ['Refugio del Alba','ZONA SEGURA'];if(p.y<riverY(p.x)-40)return ['Ruinas de Ceniza','TERRITORIO DEL GUARDIÁN'];if(p.y>1080&&p.x>550&&p.x<900)return ['Cantera del Roble','YACIMIENTOS DE HIERRO'];return ['Bosque de los Ecos','VALLE DE LAS CENIZAS'];}
export function createProfile(classId='guardian',name='Viajero'){
  const c=CLASSES[classId]||CLASSES.guardian;
  return {version:1,classId:CLASSES[classId]?classId:'guardian',name:name.trim().slice(0,18)||'Viajero',x:CAMP.x,y:CAMP.y,hp:c.hp,mana:100,level:1,xp:0,gold:0,inventory:{herb:0,ore:0,wood:0,potion:3,relic:0},skills:{gathering:0,mining:0,woodcutting:0},quest:{stage:0,kills:0,herbs:0,ores:0,boss:false},resources:{},enemies:{},time:0};
}
export function validateProfile(raw){
  if(!raw||raw.version!==1||!CLASSES[raw.classId]||typeof raw.name!=='string')return null;
  const p=createProfile(raw.classId,raw.name),finite=(v,d,min,max)=>Number.isFinite(v)?clamp(v,min,max):d;
  p.level=Math.floor(finite(raw.level,1,1,30));p.xp=finite(raw.xp,0,0,99999);p.gold=finite(raw.gold,0,0,999999);p.x=finite(raw.x,CAMP.x,40,1560);p.y=finite(raw.y,CAMP.y,40,1560);if(isWater(p.x,p.y)){p.x=CAMP.x;p.y=CAMP.y;}
  p.hp=finite(raw.hp,CLASSES[p.classId].hp,1,CLASSES[p.classId].hp+(p.level-1)*20);p.mana=finite(raw.mana,100,0,100);p.time=finite(raw.time,0,0,999999);
  for(const k of Object.keys(p.inventory))p.inventory[k]=Math.floor(finite(raw.inventory?.[k],p.inventory[k],0,99999));
  for(const k of Object.keys(p.skills))p.skills[k]=finite(raw.skills?.[k],0,0,99999);
  p.quest={stage:Math.floor(finite(raw.quest?.stage,0,0,4)),kills:Math.floor(finite(raw.quest?.kills,0,0,9999)),herbs:Math.floor(finite(raw.quest?.herbs,0,0,9999)),ores:Math.floor(finite(raw.quest?.ores,0,0,9999)),boss:!!raw.quest?.boss};
  for(const r of RESOURCE_SEEDS)if(raw.resources?.[r.id])p.resources[r.id]=true;
  for(const e of ENEMY_SEEDS)if(raw.enemies?.[e.id])p.enemies[e.id]=true;
  return p;
}
export class GameModel{
  constructor(profile,onEvent=()=>{}){
    this.p=profile;this.onEvent=onEvent;this.enemies=ENEMY_SEEDS.map(e=>({...e,...ENEMY_DATA[e.type],homeX:e.x,homeY:e.y,maxHp:ENEMY_DATA[e.type].hp,hp:profile.enemies[e.id]?0:ENEMY_DATA[e.type].hp,cd:1,windup:0,attackX:0,attackY:0,flash:0,walk:0,angle:0,engaged:false}));
    this.resources=RESOURCE_SEEDS.map(r=>({...r,used:!!profile.resources[r.id]}));this.effects=[];this.texts=[];this.input={x:0,y:0};this.destination=null;this.moveVector={x:0,y:1};this.angle=.45;this.walk=0;this.moving=false;this.archerPhase=0;this.archerMotion=0;this.archerDirection=0;this.archerShot=null;this.attackCd=0;this.skillCd=0;this.dodgeCd=0;this.dodgeTime=0;this.attackAnim=0;this.hurtFlash=0;this.gather=null;this.lastCombat=-999;this.dead=false;this.active=true;this.zone=getZone(profile)[0];this.target=null;this.autoAttack=false;this.lastSave=0;this.interactable=null;
  }
  emit(type,data={}){this.onEvent(type,data);}
  get maxHp(){return CLASSES[this.p.classId].hp+(this.p.level-1)*20;}
  get nextXp(){return 90+(this.p.level-1)*65;}
  get config(){return CLASSES[this.p.classId];}
  get tasksDone(){return this.p.quest.kills>=3&&this.p.quest.herbs>=3&&this.p.quest.ores>=2;}
  get safe(){return dist(this.p,CAMP)<165;}
  addText(x,y,text,color='#f1d78a'){this.texts.push({x,y,text,color,life:1.25,max:1.25});}
  gainXp(amount){this.p.xp+=amount;while(this.p.xp>=this.nextXp){this.p.xp-=this.nextXp;this.p.level++;this.p.hp=this.maxHp;this.p.mana=100;this.emit('level',{level:this.p.level});this.effects.push({type:'nova',x:this.p.x,y:this.p.y,radius:130,life:.8,max:.8,color:'#e8d994'});}}
  validPosition(x,y){return x>38&&y>38&&x<1562&&y<1562&&!isWater(x,y)&&!this.collisions?.some(c=>Math.hypot(c.x-x,c.y-y)<c.r+10);}
  moveEntity(e,dx,dy){if(this.validPosition(e.x+dx,e.y))e.x+=dx;if(this.validPosition(e.x,e.y+dy))e.y+=dy;}
  nearestEnemy(range=Infinity){let found=null,d=range;for(const e of this.enemies){if(e.hp<=0||(e.type==='boss'&&this.p.quest.stage<2))continue;const n=dist(this.p,e);if(n<d){found=e;d=n;}}return found;}
  update(dt){
    if(!this.active||this.dead)return;dt=Math.min(dt,.05);this.p.time+=dt;
    for(const k of ['attackCd','skillCd','dodgeCd','dodgeTime','attackAnim','hurtFlash'])this[k]=Math.max(0,this[k]-dt);
    this.p.mana=Math.min(100,this.p.mana+dt*5.5);
    if(this.safe)this.p.hp=Math.min(this.maxHp,this.p.hp+dt*14);else if(this.p.time-this.lastCombat>9)this.p.hp=Math.min(this.maxHp,this.p.hp+dt*2.5);
    let vx=this.input.x,vy=this.input.y;
    if(Math.hypot(vx,vy)>.05)this.destination=null;
    else if(this.destination){const dx=this.destination.x-this.p.x,dy=this.destination.y-this.p.y,d=Math.hypot(dx,dy);if(d<9)this.destination=null;else{vx=dx/d;vy=dy/d;}}
    if(this.p.classId==='ranger'&&this.archerShot){vx=0;vy=0;}
    const m=Math.hypot(vx,vy);this.moving=m>.05||this.dodgeTime>0;
    if(this.moving){
      if(this.gather)this.gather=null;
      let speed=this.config.speed;
      const ranger=this.p.classId==='ranger';
      if(this.dodgeTime>0){speed*=3.5;vx=this.moveVector.x;vy=this.moveVector.y;}
      else{
        const n=Math.max(1,m);vx/=n;vy/=n;
        if(ranger){
          const dir=(Math.round(Math.atan2((vx-vy)*.86,(vx+vy)*.48)/(Math.PI/4))+8)%8;
          const sx=Math.sin(dir*Math.PI/4),sy=Math.cos(dir*Math.PI/4);
          const ax=(sx/.86+sy/.48)/2,ay=(sy/.48-sx/.86)/2,l=Math.hypot(ax,ay);
          vx=ax/l*Math.min(m,1);vy=ay/l*Math.min(m,1);
        }
        this.moveVector={x:vx,y:vy};
      }
      this.angle=Math.atan2(vy,vx);
      const px=this.p.x,py=this.p.y,dx=vx*speed*dt,dy=vy*speed*dt;
      if(ranger){if(this.validPosition(px+dx,py+dy)){this.p.x+=dx;this.p.y+=dy;}}
      else this.moveEntity(this.p,dx,dy);
      const movedX=this.p.x-px,movedY=this.p.y-py,travel=Math.hypot(movedX,movedY);
      if(this.destination&&travel<dt*5)this.destination=null;
      if(ranger){
        this.moving=travel>1e-6;
        if(this.moving){
          this.archerDirection=(Math.round(Math.atan2((movedX-movedY)*.86,(movedX+movedY)*.48)/(Math.PI/4))+8)%8;
          if(this.dodgeTime<=0)this.archerPhase=(this.archerPhase+Math.hypot((movedX-movedY)*.86,movedX+movedY)/ARCHER_STRIDE)%1;
        }
      }
      this.walk+=dt*11;
    }
    if(this.p.classId==='ranger')this.archerMotion=this.moving&&this.dodgeTime<=0?1:Math.max(0,this.archerMotion-dt/.13);
    if(this.gather){this.gather.time+=dt;if(this.gather.time>=this.gather.duration)this.finishGather();}
    for(const e of this.enemies)this.updateEnemy(e,dt);
    this.updateArcher(dt);
    if(this.autoAttack)this.attack();
    for(const t of this.texts){t.life-=dt;t.y-=dt*13;}this.texts=this.texts.filter(t=>t.life>0);
    for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    const z=getZone(this.p)[0];if(z!==this.zone){this.zone=z;this.emit('zone',{name:z});}
    this.target=this.nearestEnemy(340);this.interactable=this.getInteractable();
    if(this.p.time-this.lastSave>7){this.lastSave=this.p.time;this.emit('save');}
  }
  updateEnemy(e,dt){
    if(e.hp<=0)return;e.flash=Math.max(0,e.flash-dt);e.cd-=dt;
    if(e.type==='boss'&&this.p.quest.stage<2){e.engaged=false;return;}
    const d=dist(e,this.p),homeDistance=dist(e,{x:e.homeX,y:e.homeY});
    if(e.windup>0){e.windup-=dt;if(e.windup<=0){this.effects.push({type:'slam',x:e.attackX,y:e.attackY,radius:e.type==='boss'?115:47,life:.45,max:.45,color:'#e29660'});if(dist(this.p,{x:e.attackX,y:e.attackY})<(e.type==='boss'?115:48)&&this.dodgeTime<=0&&!this.safe)this.hurt(e.damage,e);}return;}
    if(!this.safe&&(d<e.aggro||e.engaged)&&homeDistance<335){e.engaged=true;const dx=this.p.x-e.x,dy=this.p.y-e.y;e.angle=Math.atan2(dy,dx);if(d>e.range){this.moveEntity(e,dx/d*e.speed*dt,dy/d*e.speed*dt);e.walk+=dt*10;}else if(e.cd<=0){e.cd=e.type==='boss'?2.5:1.7;e.windup=e.type==='boss'?1.1:.42;e.attackX=this.p.x;e.attackY=this.p.y;}}
    else{e.engaged=false;const dx=e.homeX-e.x,dy=e.homeY-e.y,dhome=Math.hypot(dx,dy);if(dhome>8){this.moveEntity(e,dx/dhome*e.speed*.6*dt,dy/dhome*e.speed*.6*dt);e.walk+=dt*6;}if(e.type==='boss')e.hp=Math.min(e.maxHp,e.hp+dt*15);}
  }
  hurt(damage,e){if(this.dead)return;this.p.hp=Math.max(0,this.p.hp-damage);this.hurtFlash=.3;this.lastCombat=this.p.time;this.addText(this.p.x,this.p.y,'−'+damage,'#ffbea0');this.emit('sound',{name:'hurt'});if(this.p.hp<=0){this.dead=true;this.archerShot=null;this.effects=this.effects.filter(f=>f.type!=='arrow');this.autoAttack=false;this.destination=null;this.input={x:0,y:0};this.emit('death');}}
  damageEnemy(e,amount){if(!e||e.hp<=0)return;const n=Math.round(amount);e.hp=Math.max(0,e.hp-n);e.flash=.16;e.engaged=true;this.lastCombat=this.p.time;this.addText(e.x,e.y,'−'+n,e.type==='boss'?'#ffe8aa':'#f7e5b3');if(e.hp<=0){this.p.enemies[e.id]=true;this.p.gold+=e.gold;this.gainXp(e.xp);this.p.quest.kills++;this.addText(e.x,e.y+28,'+'+e.xp+' EXP','#aed7ae');if(e.type==='boss'){this.p.quest.boss=true;this.p.quest.stage=3;this.p.inventory.relic=1;this.emit('bossDefeated');}else{if(this.p.quest.kills%2===0){this.p.inventory.potion++;this.emit('toast',{text:'+1 poción · Botín recuperado',kind:'reward'});}if(this.tasksDone&&this.p.quest.stage===1)this.emit('toast',{text:'Suministros listos. Vuelve con Lyra.',kind:'reward'});}this.emit('save');}}
  startArcherShot(target,skill=false){
    if(this.archerShot||this.dodgeTime>0)return false;
    const dx=target.x-this.p.x,dy=target.y-this.p.y;
    this.angle=Math.atan2(dy,dx);
    this.archerDirection=(Math.round(Math.atan2((dx-dy)*.86,(dx+dy)*.48)/(Math.PI/4))+8)%8;
    this.archerShot={target,skill,age:0,duration:this.config.cooldown,released:false,amount:this.config.damage+(this.p.level-1)*4};
    this.attackCd=this.config.cooldown;this.attackAnim=this.config.cooldown;
    this.moving=false;
    if(skill){this.skillCd=this.config.skillCooldown;this.p.mana-=this.config.skillCost;}
    return true;
  }
  updateArcher(dt){
    if(this.dead)return;
    const shot=this.archerShot;
    if(shot){
      shot.age+=dt;
      if(!shot.released&&shot.age>=shot.duration*RELEASE/SHOT_DURATION){
        shot.released=true;
        const e=shot.target;
        if(e.hp>0){
          if(shot.skill){
            this.effects.push({type:'arrows',x:e.x,y:e.y,radius:143,life:.7,max:.7,color:'#b4d39b'});
            for(const enemy of this.enemies)if(enemy.hp>0&&!(enemy.type==='boss'&&this.p.quest.stage<2)&&dist(enemy,e)<143)this.damageEnemy(enemy,this.config.damage*2+(this.p.level-1)*7);
          }else{
            const a=facingAngle(this.archerDirection),sx=-8*Math.cos(a)+46*Math.sin(a),gy=8*Math.sin(a)+46*Math.cos(a);
            const x=this.p.x+(sx/.86+gy)/2,y=this.p.y+(gy-sx/.86)/2;
            this.effects.push({type:'arrow',x,y,z:57,target:e,amount:shot.amount,life:2,max:2,age:0,angle:this.angle,color:'#ead19d'});
          }
          this.emit('sound',{name:shot.skill?'skill':'attack'});
        }
      }
      if(shot.age>=shot.duration)this.archerShot=null;
    }
    for(const fx of this.effects){
      if(fx.type!=='arrow'||fx.life<=0)continue;
      if(fx.target.hp<=0){fx.life=0;continue;}
      fx.age+=dt;
      const dx=fx.target.x-fx.x,dy=fx.target.y-fx.y,d=Math.hypot(dx,dy),travel=620*dt;
      fx.angle=Math.atan2(dy,dx);fx.z=57+(38-57)*Math.min(1,fx.age/.2);
      if(d<=travel){fx.x=fx.target.x;fx.y=fx.target.y;fx.life=0;this.damageEnemy(fx.target,fx.amount);}
      else{fx.x+=dx/d*travel;fx.y+=dy/d*travel;}
    }
  }
  attack(){if(!this.active||this.dead||this.attackCd>0||this.gather)return false;const e=this.nearestEnemy(this.config.range);if(!e){if(!this.autoAttack)this.emit('toast',{text:'Acércate a un enemigo para atacar.'});return false;}if(this.p.classId==='ranger')return this.startArcherShot(e,false);this.attackCd=this.config.cooldown;this.attackAnim=.3;this.angle=Math.atan2(e.y-this.p.y,e.x-this.p.x);const amount=this.config.damage+(this.p.level-1)*4;this.damageEnemy(e,amount);if(this.p.classId==='guardian')this.effects.push({type:'slash',x:this.p.x,y:this.p.y,angle:this.angle,radius:85,life:.26,max:.26,color:'#e7d2a0'});else this.effects.push({type:'projectile',x:this.p.x,y:this.p.y,tx:e.x,ty:e.y,life:.28,max:.28,color:this.p.classId==='arcanist'?'#c4b1ff':'#efe0ae',arcane:this.p.classId==='arcanist'});this.emit('sound',{name:this.p.classId==='arcanist'?'magic':'attack'});return true;}
  skill(){if(!this.active||this.dead||this.skillCd>0)return false;if(this.p.mana<this.config.skillCost){this.emit('toast',{text:'Necesitas más energía arcana.'});return false;}const target=this.nearestEnemy(this.config.range+60);if(!target){this.emit('toast',{text:'No hay enemigos al alcance.'});return false;}if(this.p.classId==='ranger')return this.startArcherShot(target,true);this.skillCd=this.config.skillCooldown;this.p.mana-=this.config.skillCost;this.attackAnim=.5;const center=this.p.classId==='guardian'?this.p:target;const radius=this.p.classId==='guardian'?158:143;this.effects.push({type:this.p.classId==='ranger'?'arrows':'nova',x:center.x,y:center.y,radius,life:.7,max:.7,color:this.p.classId==='arcanist'?'#c3a5f2':this.p.classId==='ranger'?'#b4d39b':'#e9ca7c'});for(const e of this.enemies)if(e.hp>0&&!(e.type==='boss'&&this.p.quest.stage<2)&&dist(e,center)<radius)this.damageEnemy(e,this.config.damage*2+(this.p.level-1)*7);this.emit('sound',{name:'skill'});return true;}
  dodge(){if(!this.active||this.dead||this.dodgeCd>0)return false;this.archerShot=null;this.dodgeCd=3;this.dodgeTime=.3;this.destination=null;this.gather=null;this.effects.push({type:'dust',x:this.p.x,y:this.p.y,radius:40,life:.4,max:.4,color:'#d8d8ae'});this.emit('sound',{name:'dodge'});return true;}
  potion(){if(!this.active||this.dead)return false;if(this.p.inventory.potion<=0){this.emit('toast',{text:'No quedan pociones. La hoguera te recupera.',kind:'error'});return false;}if(this.p.hp>=this.maxHp){this.emit('toast',{text:'Tu salud ya está completa.'});return false;}this.p.inventory.potion--;this.p.hp=Math.min(this.maxHp,this.p.hp+80);this.addText(this.p.x,this.p.y,'+80 salud','#b6e4a4');this.emit('sound',{name:'heal'});this.emit('save');return true;}
  getInteractable(){if(this.gather)return {...this.gather.resource,label:'Recolectando…',gathering:true};const candidates=[{...NPC,label:'Hablar con Lyra'},{...FIRE,label:'Descansar en la hoguera'},...this.resources.filter(r=>!r.used).map(r=>({...r,label:r.type==='herb'?'Recoger flor del alba':r.type==='ore'?'Extraer hierro':r.type==='wood'?'Cortar madera':'Abrir cofre'}))];let best=null,d=78;for(const c of candidates){const n=dist(c,this.p);if(n<d){best=c;d=n;}}return best;}
  interact(){if(!this.active||this.dead||this.gather||this.archerShot)return;const c=this.getInteractable();if(!c){this.emit('toast',{text:'Acércate a Lyra, un recurso o una hoguera.'});return;}this.destination=null;if(c.type==='npc'){this.emit('npc');return;}if(c.type==='fire'){this.p.hp=this.maxHp;this.p.mana=100;if(this.p.inventory.potion<2)this.p.inventory.potion=2;this.emit('toast',{text:'Salud y energía recuperadas. Pociones repuestas.',kind:'reward'});this.emit('sound',{name:'heal'});this.emit('save');return;}this.gather={resource:c,time:0,duration:c.type==='ore'?1.9:c.type==='wood'?1.5:.85};this.emit('sound',{name:'gather'});}
  finishGather(){const r=this.gather.resource;this.gather=null;const resource=this.resources.find(s=>s.id===r.id);if(!resource||resource.used)return;resource.used=true;this.p.resources[r.id]=true;if(r.type==='chest'){this.p.gold+=45;this.p.inventory.potion+=2;this.gainXp(20);this.emit('toast',{text:'Cofre descubierto · +45 oro · +2 pociones',kind:'reward'});}else{this.p.inventory[r.type]++;if(r.type==='herb'){this.p.quest.herbs++;this.p.skills.gathering+=15;}if(r.type==='ore'){this.p.quest.ores++;this.p.skills.mining+=20;}if(r.type==='wood')this.p.skills.woodcutting+=20;this.gainXp(r.type==='herb'?12:18);this.emit('toast',{text:r.type==='herb'?'+1 flor del alba · Recolección +15 EXP':r.type==='ore'?'+1 mineral de hierro · Minería +20 EXP':'+1 madera de roble · Tala +20 EXP',kind:'reward'});if(this.tasksDone&&this.p.quest.stage===1)this.emit('toast',{text:'Todo listo. Regresa al refugio con Lyra.',kind:'reward'});}this.emit('sound',{name:'reward'});this.emit('save');}
  acceptQuest(){if(this.p.quest.stage!==0)return false;this.p.quest.stage=1;this.emit('toast',{text:'Misión aceptada: El corazón del valle',kind:'reward'});this.emit('save');return true;}
  deliverSupplies(){if(this.p.quest.stage!==1||!this.tasksDone)return false;this.p.quest.stage=2;this.p.inventory.herb=Math.max(0,this.p.inventory.herb-3);this.p.inventory.ore=Math.max(0,this.p.inventory.ore-2);this.p.inventory.potion+=3;this.p.gold+=35;this.gainXp(65);this.emit('toast',{text:'El sello ha caído. Cruza el puente hacia las ruinas.',kind:'reward'});this.emit('save');return true;}
  finishQuest(){if(this.p.quest.stage!==3||!this.p.quest.boss)return false;this.p.quest.stage=4;this.p.gold+=150;this.gainXp(120);this.emit('complete');this.emit('save');return true;}
  respawn(){this.archerShot=null;this.archerMotion=0;this.archerPhase=0;this.effects=this.effects.filter(f=>f.type!=='arrow');this.dead=false;this.p.x=CAMP.x;this.p.y=CAMP.y;this.p.hp=this.maxHp;this.p.mana=100;this.p.inventory.potion=Math.max(2,this.p.inventory.potion);this.input={x:0,y:0};this.destination=null;this.autoAttack=false;this.gather=null;this.attackCd=0;this.skillCd=0;this.dodgeCd=0;this.dodgeTime=0;for(const e of this.enemies)if(e.hp>0){e.x=e.homeX;e.y=e.homeY;e.engaged=false;e.windup=0;e.hp=e.maxHp;}this.emit('save');this.emit('toast',{text:'Lyra te ha traído de vuelta. Conservas tu progreso.'});}
  craftPotion(){const reserve=this.p.quest.stage<2?3:0;if(this.p.inventory.herb-reserve<2)return false;this.p.inventory.herb-=2;this.p.inventory.potion++;this.emit('save');return true;}
  waypoint(){const q=this.p.quest;if(q.stage===0||q.stage===3||(q.stage===1&&this.tasksDone))return NPC;if(q.stage===2)return this.enemies.find(e=>e.type==='boss');if(q.stage===1){if(q.herbs<3)return this.resources.filter(r=>r.type==='herb'&&!r.used).sort((a,b)=>dist(a,this.p)-dist(b,this.p))[0];if(q.ores<2)return this.resources.filter(r=>r.type==='ore'&&!r.used).sort((a,b)=>dist(a,this.p)-dist(b,this.p))[0];if(q.kills<3)return this.nearestEnemy();}return null;}
}
