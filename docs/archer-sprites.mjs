import {RELEASE,SHOT_DURATION} from './archer.mjs?v=4';

// Beta artwork has one authored direction. Keep the existing rig for the rest.
let frames=null,loading=null;
const clamp=n=>Math.max(0,Math.min(1,n));
export function paintedPose({shot=-1,moving=false,phase=0}={}){
  if(shot>=0&&shot<SHOT_DURATION){
    const t=shot/SHOT_DURATION;
    return {group:'shoot',index:t<.2?0:t<.38?1:t<RELEASE?2:t<.9?3:0};
  }
  if(moving)return {group:'walk',index:Math.floor(((phase%1+1)%1)*6)};
  return {group:'idle',index:0};
}
function extract(im,rect,anchor,scale){
  const canvas=document.createElement('canvas');
  canvas.width=rect[2];canvas.height=rect[3];
  const ctx=canvas.getContext('2d');
  ctx.drawImage(im,...rect,0,0,canvas.width,canvas.height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height),p=data.data;
  let bottom=0,count=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const i=(y*canvas.width+x)*4,r=p[i],g=p[i+1],b=p[i+2],spill=Math.min(r,b)-g;
    p[i+3]=Math.round(clamp(1-(spill-12)/65)*255);
    if(spill>12){p[i]=Math.max(0,r-spill);p[i+2]=Math.max(0,b-spill);}
    if(p[i+3]>220){bottom=Math.max(bottom,y);count++;}
  }
  if(count<100)throw new Error('Empty archer frame');
  ctx.putImageData(data,0,0);
  return {canvas,anchor,bottom,scale};
}
export function loadPaintedArcher(){
  if(loading)return loading;
  if(typeof Image==='undefined'||typeof document==='undefined')return Promise.resolve(false);
  const load=name=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;
    im.src=new URL('./assets/'+name,import.meta.url).href;
  });
  loading=Promise.all([load('archer-poses-beta.webp'),load('archer-walk-beta.webp')]).then(([a,b])=>{
    const cols=[0,314,628,942,1254];
    // Fixed scale within each atlas: crouching must not stretch the body.
    frames={
      idle:[extract(a,[0,0,314,330],181,88/295)],
      shoot:[0,1,2,3].map(i=>extract(a,[cols[i],930,cols[i+1]-cols[i],324],[150,145,141,145][i],88/295)),
      walk:Array.from({length:6},(_,i)=>extract(b,[(i%3)*512,Math.floor(i/3)*512,512,512],[270,254,270,255,250,266][i],88/450))
    };
    return true;
  }).catch(error=>{console.warn('Archer artwork unavailable; using original animation.',error);return false;});
  return loading;
}
export function drawPaintedArcher(ctx,x,y,state={}){
  if(!frames||state.direction!==2)return false;
  const pose=paintedPose(state),f=frames[pose.group][pose.index],scale=f.scale*(state.scale||1);
  ctx.save();
  ctx.fillStyle='#0a191c44';ctx.beginPath();ctx.ellipse(x,y+1,19*(state.scale||1),6*(state.scale||1),0,0,Math.PI*2);ctx.fill();
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(f.canvas,x-f.anchor*scale,y-f.bottom*scale,f.canvas.width*scale,f.canvas.height*scale);
  ctx.restore();return true;
}
