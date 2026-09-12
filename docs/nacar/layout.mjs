const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Responsive controls follow the browser viewport; world scale stays fixed.
export function screenLayout(width,height,touch=false){
 const compact=width<760||height<500||(touch&&width<1200);
 const mode=!compact?'desktop':height>=width?'portrait':'landscape';
 const short=height<360,tiny=width<600&&height<440;
 const button=mode==='desktop'?68:short||tiny?56:width<360?60:64;
 const brief=mode==='portrait'&&height<620;
 return{width,height,touch,mode,short,brief,tiny,button,joystick:tiny?72:short?88:width<360?96:108,gap:8,gutter:width<360?12:16,dock:touch?button*2+8+28:16};
}

export function playFrame(layout,headerBottom,objectiveBox=null,controlsTop=null){
 const{width:w,height:h,mode}=layout;
 // These bounds position only the objective arrows. The renderer centers the
 // camera on the full canvas and never clips the world to these bounds.
 const inset=clamp(headerBottom+10,16,Math.max(16,h/2-40));
 return{left:16,top:inset,right:Math.max(17,w-16),bottom:h-inset,zoom:mode==='desktop'?1.13:1};
}

export function targetIndicator(target,anchor,frame,margin=16){
 const left=frame.left+margin,right=frame.right-margin,top=frame.top+margin,bottom=frame.bottom-margin;
 if(target.x>=left&&target.x<=right&&target.y>=top&&target.y<=bottom)return null;
 const dx=target.x-anchor.x,dy=target.y-anchor.y;
 const scale=Math.min(dx>0?(right-anchor.x)/dx:dx<0?(left-anchor.x)/dx:Infinity,dy>0?(bottom-anchor.y)/dy:dy<0?(top-anchor.y)/dy:Infinity);
 return{x:anchor.x+dx*scale,y:anchor.y+dy*scale,angle:Math.atan2(dy,dx)};
}

export function compactObjective(guide,objective,touch){
 if(!guide)return objective[1];
 const text={move:touch?'Mueve el control izquierdo hacia la marca dorada.':'Usa WASD o las flechas hacia la marca dorada.',attack:guide.target?'Acércate al poste y pulsa Golpear.':'Pulsa Golpear para practicar tu herramienta.',dodge:'Muévete hacia un espacio libre y pulsa Esquivar.',journal:'Abre el Diario para revisar la pista del paquete.',map:'Abre el Mapa para localizar las Galerías.',bag:'Revisa tus materiales y botiquines en la Mochila.',skills:'Descubre lo que acaba de desbloquear Ingeniería.',scan:'Activa el escáner para localizar suministros.',heal:'Abre Mochila y usa un botiquín.'};
 return text[guide.id]||objective[1];
}
