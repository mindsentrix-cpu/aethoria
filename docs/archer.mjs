// Directional Canvas 2D archer approved in the isolated animation trial.
export const RELEASE=.62, SHOT_DURATION=1.04, STRIDE=38;
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
export function facingAngle(direction){
  const screen=direction*Math.PI/4;
  return Math.atan2(Math.sin(screen),Math.cos(screen)/.48);
}
export function footPose(phase,side,moving,stride=STRIDE){
  if(!moving)return {r:side*6.3,f:side*1.5,z:0,contact:true};
  const t=((phase+(side>0?.5:0))%1+1)%1;
  if(t<.5)return {r:side*6.3,f:stride*(.25-t),z:0,contact:true};
  const s=(t-.5)*2;
  return {r:side*6.3,f:mix(-stride/4,stride/4,ease(s)),z:Math.sin(s*Math.PI)*8,contact:false};
}
export function shotPose(age){
  if(age<0||age>=SHOT_DURATION)return {raise:0,draw:0,release:0,loaded:false,label:'En reposo'};
  const raise=ease(age/.18)*(1-ease((age-.79)/.25));
  const draw=age<RELEASE?ease((age-.18)/.30):1-ease((age-RELEASE)/.08);
  return {raise,draw,release:clamp((age-RELEASE)/.14),loaded:age<RELEASE,label:age<.18?'Preparar':age<.48?'Tensar':age<RELEASE?'Apuntar':age<.73?'Soltar':'Recuperar'};
}
export function drawArcher(ctx,x,y,state={}){
  const {direction=1,phase=0,moving=false,time=0,shot=-1,scale=2,contacts=false,motion=moving?1:0,stride=STRIDE}=state;
  const angle=facingAngle(direction),co=Math.cos(angle),si=Math.sin(angle),pose=shotPose(shot);
  const bob=-Math.cos(phase*TAU*2)*.65*motion+Math.sin(time*2)*.3*(1-motion);
  const hip=34+bob,shoulder=59+bob,head=75+bob;
  const pr=(r,f,z)=>({x:r*co+f*si,y:(-r*si+f*co)*.48-z,d:-r*si+f*co});
  const items=[];
  const skin='#d8ae83',leather='#6d4b35',edge='#172b28';
  function shape(points,fill,stroke=edge,width=.9,offset=0){
    const p=points.map(v=>pr(...v));
    items.push({d:p.reduce((n,v)=>n+v.d,0)/p.length+offset,run(){ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}});
  }
  function tube(a,b,width,color,outline=true,offset=0){
    const pa=pr(...a),pb=pr(...b);
    items.push({d:(pa.d+pb.d)/2+offset,run(){ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);if(outline){ctx.strokeStyle=edge;ctx.lineWidth=width+1.6;ctx.stroke();}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}});
  }
  function oval(r,f,z,rx,ry,color,offset=0){const p=pr(r,f,z);items.push({d:p.d+offset,run(){ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill();}});}
  function box(r,f,z,w,l,h,colors){
    const a=r-w/2,b=r+w/2,c=f-l/2,d=f+l/2;
    shape([[a,c,z],[b,c,z],[b,c,z+h],[a,c,z+h]],colors[0]);
    shape([[a,d,z],[b,d,z],[b,d,z+h],[a,d,z+h]],colors[1]);
    shape([[a,c,z],[a,d,z],[a,d,z+h],[a,c,z+h]],colors[2]);
    shape([[b,c,z],[b,d,z],[b,d,z+h],[b,c,z+h]],colors[0]);
    shape([[a,c,z+h],[b,c,z+h],[b,d,z+h],[a,d,z+h]],colors[3]);
  }
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineJoin='round';
  const shadow=ctx.createRadialGradient(0,0,0,0,0,23);shadow.addColorStop(0,'#050e1480');shadow.addColorStop(1,'#050e1400');ctx.save();ctx.scale(1,.42);ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,23,0,TAU);ctx.fill();ctx.restore();
  const feet=[-1,1].map(side=>{const f=footPose(phase,side,true,stride),idle=footPose(0,side,false);return {...f,f:mix(idle.f,f.f,motion),z:f.z*motion,contact:f.contact||motion<.01};});
  for(const f of feet){
    const side=Math.sign(f.r),h=[side*5,0,hip],ankle=[f.r,f.f,f.z+5];
    // Two-link leg IK: solve the knee in the sagittal plane, keep the sole on z=0 in stance.
    const dy=ankle[1]-h[1],dz=ankle[2]-h[2],leg=stride>STRIDE?18:17,length=Math.min(leg*2-.01,Math.hypot(dy,dz));
    const bend=Math.sqrt(Math.max(0,leg*leg-length*length/4));
    const knee=[side*6,(h[1]+ankle[1])/2-dz/Math.max(length,1)*bend,(h[2]+ankle[2])/2+dy/Math.max(length,1)*bend];
    tube(h,knee,8.2,side<0?'#596658':'#687363');
    tube(knee,ankle,6.6,leather);
    tube([knee[0],knee[1],knee[2]-.6],[mix(knee[0],ankle[0],.6),mix(knee[1],ankle[1],.6),mix(knee[2],ankle[2],.6)],7.4,'#78543a');
    box(f.r,f.f+2,f.z+1,7.6,12,4,['#302d27','#75553c','#514333','#98724b']);
    box(f.r,f.f+2,f.z,8,12.5,1,['#202b29','#26352f','#29332d','#343b30']);
    if(contacts&&f.contact){const p=pr(f.r,f.f,0);ctx.beginPath();ctx.ellipse(p.x,p.y+.7,5,2,0,0,TAU);ctx.strokeStyle='#a9dfb5';ctx.lineWidth=.7;ctx.stroke();}
  }
  // Leather tunic with separate lit panels, split skirt, belt and brass buckle.
  shape([[-10,-4,hip-4],[10,-4,hip-4],[11,-5,shoulder-4],[-11,-5,shoulder-4]],'#465847');
  shape([[-10,5,hip-4],[-2,7,hip-6],[0,6,hip+3],[2,7,hip-6],[10,5,hip-4],[12,4,shoulder-4],[-12,4,shoulder-4]],'#73846a');
  shape([[-10,-4,hip-4],[-10,5,hip-4],[-12,4,shoulder-4],[-11,-5,shoulder-4]],'#526b58');
  shape([[10,-4,hip-4],[10,5,hip-4],[12,4,shoulder-4],[11,-5,shoulder-4]],'#3d584a');
  shape([[-11,-5,shoulder-4],[11,-5,shoulder-4],[12,4,shoulder-4],[0,6,shoulder+1],[-12,4,shoulder-4]],'#9aa88b');
  shape([[-8,5.2,hip+9],[8,5.2,hip+9],[8,5.3,shoulder-8],[-8,5.3,shoulder-8]],'#806046');
  for(let i=0;i<3;i++)tube([-5,5.6,hip+13+i*4],[5,5.6,hip+13+i*4],.7,'#b49967',false);
  box(0,0,hip+3,22,11,3,['#46352b','#745333','#6e4f34','#92734b']);
  box(0,6,hip+3.1,5.5,1.8,3.1,['#9c7946','#d4b375','#af8d52','#eed298']);
  box(10,2,hip,5,5,8,['#46372c','#795637','#51432d','#98754a']);
  // Short cloak stays behind the torso; the lower edge follows the gait subtly.
  const flutter=moving?Math.sin(phase*TAU)*2.2:Math.sin(time*1.5)*.55;
  shape([[-11,-6,shoulder],[9,-6,shoulder],[14+flutter,-9,hip-10],[5,-11,hip-15],[-14+flutter,-9,hip-10]],'#294b42',edge,.9,-.4);
  shape([[-8,-6.5,shoulder-2],[-3,-10,hip-12],[1,-10,hip-13],[-1,-7,shoulder-4]],'#4b6e58',null,0,-.3);
  tube([-14+flutter,-9.2,hip-10],[5,-11.2,hip-15],.9,'#bcaa71',false);
  // Quiver and individually visible feathered arrows.
  tube([7,-11,hip+9],[-5,-11,shoulder+9],8,'#65452f');
  tube([-6,-11,shoulder+9],[-4,-11,shoulder+6],10,'#b68d53');
  for(let i=0;i<3;i++){
    const r=-6+i*2;
    tube([r,-11.5,shoulder+5],[r-4,-11.5,shoulder+20+i%2*2],.8,'#ddc590',false);
    shape([[r-4,-11.7,shoulder+21],[r-7,-11.7,shoulder+19],[r-5,-11.7,shoulder+13],[r-3,-11.7,shoulder+16]],i===1?'#d1b176':'#becbc1',edge,.3);
  }
  // Hood: octagonal volume, actual front opening, rear seam and shaded side panels.
  const ring=[[-9,-5],[-5,-9],[5,-9],[9,-5],[10,3],[6,8],[-6,8],[-10,3]];
  const shades=['#365347','#304d43','#2b463e','#35564a','#526e54','#78906a','#91a17d','#69876a'];
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];
    shape([[a[0],a[1],head-9],[b[0],b[1],head-9],[b[0]*.75,b[1]*.8,head+7],[0,-2,head+14],[a[0]*.75,a[1]*.8,head+7]],shades[i]);
  }
  shape([[-6,8.5,head-8],[6,8.5,head-8],[7,8.5,head+1],[0,8.5,head+7],[-7,8.5,head+1]],'#243e33');
  shape([[-4.9,8.8,head-5],[0,9.2,head-8],[4.9,8.8,head-5],[5,8.8,head+1],[0,8.8,head+4],[-5,8.8,head+1]],skin);
  shape([[0,9,head+4],[5,9,head+1],[4.9,9,head-5],[0,9.4,head-8]],'#b88962',null);
  tube([-3.8,9.4,head],[ -1.1,9.4,head],.85,'#223b30',false);
  tube([1.1,9.4,head],[3.8,9.4,head],.85,'#223b30',false);
  tube([-.7,9.4,head-4],[1.4,9.4,head-4],.7,'#745742',false);
  tube([-10,3,head-9],[-6,8.9,head-8],1,'#c3b178',false);
  tube([10,3,head-9],[6,8.9,head-8],1,'#ad9c69',false);
  tube([0,-9.6,head-7],[0,-3,head+13],.8,'#6b8665',false);
  // Shoulders and arms: left hand always grips the bow; right hand draws its string.
  const swing=Math.sin(phase*TAU)*6*motion;
  const leftHand=[mix(-15,-8,pose.raise),mix(6+swing,34,pose.raise),mix(hip+4,shoulder-4,pose.raise)];
  const pull=pose.draw;
  const rightHand=[mix(14,-8,pose.raise),mix(-swing,mix(26,3,pull),pose.raise),mix(hip+3,shoulder-2,pose.raise)];
  if(shot>=RELEASE&&shot<.8){rightHand[0]+=Math.sin(pose.release*Math.PI)*7;rightHand[1]-=Math.sin(pose.release*Math.PI)*5;}
  const elbows=[[-15,mix(4,17,pose.raise),mix(hip+15,shoulder-6,pose.raise)],[mix(15,19,pose.raise),mix(1,-4-pull*4,pose.raise),mix(hip+15,shoulder-2,pose.raise)]];
  [[-1,leftHand],[1,rightHand]].forEach(([side,hand],i)=>{
    const shoulderPoint=[side*11,1,shoulder-3],elbow=elbows[i];
    tube(shoulderPoint,elbow,7,'#6a8064');
    tube(elbow,hand,5.4,skin);
    tube(elbow,[mix(elbow[0],hand[0],.64),mix(elbow[1],hand[1],.64),mix(elbow[2],hand[2],.64)],6.3,'#785239');
    tube(shoulderPoint,[mix(shoulderPoint[0],elbow[0],.3),mix(shoulderPoint[1],elbow[1],.3),mix(shoulderPoint[2],elbow[2],.3)],9,'#9aa185');
    oval(...hand,2.9,3.2,skin,1);
  });
  // Bow and string share the same endpoints in every view, never mirrored to the wrong hand.
  const r=leftHand[0],f=leftHand[1],z=leftHand[2];
  const bowPoint=(t)=>[r,f-9*t*t,z+t*27];
  const bowPoints=Array.from({length:33},(_,i)=>pr(...bowPoint(-1+i/16)));
  items.push({d:pr(r,f-4,z).d+.4,run(){ctx.lineCap='round';ctx.beginPath();bowPoints.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=4;ctx.strokeStyle=edge;ctx.stroke();ctx.lineWidth=2.7;ctx.strokeStyle='#c79a59';ctx.stroke();ctx.lineWidth=.7;ctx.strokeStyle='#efcb85';ctx.stroke();}});
  const stringCenter=pose.raise>.9&&shot<RELEASE?rightHand:[r,f-9,z];
  tube(bowPoint(-1),stringCenter,.55,'#e4dac0',false,1);
  tube(stringCenter,bowPoint(1),.55,'#e4dac0',false,1);
  tube([r,f,z-3],[r,f,z+3],3.6,'#544432',true,1);
  if(pose.loaded&&pose.raise>.72){
    const n=stringCenter,tip=[n[0],n[1]+43,n[2]];
    tube(n,tip,1,'#e6c68f',false,2);
    shape([[tip[0],tip[1]+5,tip[2]],[tip[0]-2,tip[1]-1,tip[2]],[tip[0]+2,tip[1]-1,tip[2]]],'#cddbd5',edge,.4,2);
    tube([n[0]-2,n[1]+2,n[2]],[n[0]+2,n[1]+6,n[2]],1.6,'#c0d2c4',false,2);
  }
  items.sort((a,b)=>a.d-b.d);items.forEach(i=>i.run());ctx.restore();
}
