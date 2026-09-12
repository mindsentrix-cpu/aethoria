import{ZONES,SKILLS,CLUES,RECIPES,freshState,parseSave,serialize,rank,skillLevel,playerLevel,maxHP,maxAir,nearest,objective,objectivePosition,TILE,tutorialGuide,tutorialProgress,LESSONS,learnMenu,storyObjective}from'./model.mjs?v=pages-5';
import{Engine}from'./engine.mjs?v=pages-5';
import{Renderer}from'./render.mjs?v=pages-5';
import{workshopView}from'./workshop.mjs?v=pages-5';
import{screenLayout,playFrame,compactObjective}from'./layout.mjs?v=pages-5';
import{SAVE,BACKUP,MAX_JOURNEY_SIZE,readJourney,exportJourney,restoreJourney}from'./journey.mjs?v=pages-5';
const $=id=>document.getElementById(id),ui=$('ui'),dialogs=$('dialogs'),touch=$('touch'),canvas=$('world'),surface=$('game');
let stored=null,saveProblem=false,returnToTitle=false,pendingJourney=null,toastTimer=null;
// Follow the actual game directory, including a GitHub Pages project subpath.
const PLAY_URL=new URL('./',import.meta.url).href;
try{stored=parseSave(localStorage.getItem(SAVE))||parseSave(localStorage.getItem(BACKUP))}catch{saveProblem=true}
const game=new Engine(stored||freshState(),handleResult),renderer=new Renderer(canvas);
let hudObserver=null;
let keys={},stick={x:0,y:0},modal='title',last=0,uiTick=0,saveTick=0,context=null,holdAttack=false,priorFocus=null,lastObjective='',lastNear='',layout=screenLayout(1280,720,false),resizeQueued=false;
const icon=(kind)=>{const paths={menu:'M4 6h16M4 12h16M4 18h16',skills:'M4 18V12M10 18V7M16 18V3M3 21H21',map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16',bag:'M5 7h14v14H5zM8 7V3h8v4M5 13h14M10 12v3h4v-3',journal:'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5',pause:'M8 4v16M16 4v16',sound:'M3 9h4l5-5v16l-5-5H3zM16 7q6 5 0 10'};return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[kind]||paths.journal}"/></svg>`};
const names={scrap:'Piezas',fiber:'Fibras',cells:'Celdas',medkits:'Botiquines',sellos:'Sellos de turno'};
function toast(text,gold=false){if(!text)return;clearTimeout(toastTimer);const t=document.createElement('div');t.className='toast'+(gold?' gold':'');t.textContent=text;$('toasts').replaceChildren(t);toastTimer=setTimeout(()=>t.remove(),3600)}
function audio(kind){if(!game.state.settings.sound)return;try{if(!context)context=new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();const o=context.createOscillator(),a=context.createGain();o.type=kind==='swing'?'triangle':'sine';const f=({hit:140,swing:330,pulse:220,hurt:90,level:660,click:420})[kind]||440;o.frequency.setValueAtTime(f,context.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='level'?880:f*.48,context.currentTime+.15);a.gain.setValueAtTime(.035,context.currentTime);a.gain.exponentialRampToValueAtTime(.001,context.currentTime+.2);o.connect(a);a.connect(context.destination);o.start();o.stop(context.currentTime+.22)}catch{}}
function save(){try{const prev=localStorage.getItem(SAVE);if(parseSave(prev))localStorage.setItem(BACKUP,prev);localStorage.setItem(SAVE,serialize(game.state));stored=game.state;saveProblem=false}catch{if(!saveProblem)toast('El navegador no pudo guardar. Mantén esta pestaña abierta.');saveProblem=true}}
function clearInput(){keys={};stick={x:0,y:0};holdAttack=false;const k=document.querySelector('.knob');if(k)k.style.transform='translate(0px,0px)'}
function openModal(html,name='dialogue'){
 if(modal==='title')returnToTitle=true;
 priorFocus=document.activeElement;modal=name;game.menu=true;clearInput();touch.style.display='none';
 const template=document.createElement('template');template.innerHTML=html;
 const fragment=template.content;let header=fragment.querySelector('.panel-header');
 if(header)header.remove();
 else{
  const heading=fragment.querySelector('.name')||fragment.querySelector('h2');
  const text=heading?.textContent||'Nácar';heading?.remove();
  const holder=document.createElement('div');holder.innerHTML=modalHeader('',text);header=holder.firstElementChild;
 }
 const footer=document.createElement('footer');footer.className='panel-footer';
 const take=node=>{if(node)footer.appendChild(node)};
 if(name==='workshop')take(fragment.querySelector('.recipe-action'));
 if(name==='bag')take(fragment.querySelector('[data-action="heal"]'));
 if(name==='skills')take(fragment.querySelector('[data-action="scan"]'));
 take(fragment.querySelector('.lesson-continue'));
 const row=[...fragment.children].reverse().find(el=>el.classList.contains('row'));take(row);
 if(!footer.children.length)footer.innerHTML=`<button class="primary" data-action="close">${returnToTitle?'Volver al inicio':'Volver al juego'}</button>`;
 const panel=document.createElement('section');panel.className='panel '+name;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',header.textContent.replace('×','').trim());panel.tabIndex=-1;
 const body=document.createElement('div');body.className='panel-body';body.appendChild(fragment);panel.append(header,body,footer);
 dialogs.innerHTML='<div class="overlay"></div>';dialogs.firstElementChild.appendChild(panel);
 (panel.querySelector('[data-focus]')||panel).focus({preventScroll:true});
}
function closeModal(){pendingJourney=null;if(modal==='new'||returnToTitle){title();return}dialogs.innerHTML='';modal=null;game.menu=false;clearInput();touch.style.display='';priorFocus?.focus?.();lastNear='';updateHUD();measureHUD();save()}
function modalHeader(eyebrow,title){return`<div class="panel-header"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2></div><button class="panel-close" data-action="close" aria-label="Cerrar">×</button></div>`}
function handleResult(res){if(!res)return;if(res.sound)audio(res.sound);if(res.toast)toast(res.toast,res.gold);if(res.zoneChanged){renderer.ready=false;toast(ZONES[game.state.zone].name)}if(res.menu)showMenu(res.menu);if(res.speaker){const choices=res.choices||[{label:'Continuar',action:'close'}];openModal(`<div class="name">${res.speaker}</div><p>${res.text.replaceAll('\n\n','</p><p>')}</p><div class="row">${choices.map((ch,i)=>`<button class="${i===0?'primary':'secondary'}" data-choice="${ch.action}">${ch.label}</button>`).join('')}</div>`)}if(res.finish)finish();updateHUD();save()}
function title(){returnToTitle=false;pendingJourney=null;game.menu=true;modal='title';hudObserver?.disconnect();clearInput();touch.innerHTML='';dialogs.innerHTML='';const hasSave=!!stored;ui.innerHTML=`<section class="title-screen has-art"><img class="title-art" src="title.webp" alt="La ciudad de Nácar, tallada en un antiguo puerto de basalto"><div class="title-content"><div class="eyebrow">UNA CIUDAD. MILES DE NOMBRES.</div><h1>NÁCAR</h1><div class="subtitle">LOS NOMBRES DEL FONDO</div><p>Una dirección que no existe.<br>Un contador que sigue respirando.<br>Tu próxima entrega cambiará la ciudad.</p><div class="row"><button class="primary" data-action="start">${hasSave?'Continuar viaje':'Comenzar viaje'} &nbsp; →</button>${hasSave?'<button class="secondary" data-action="new">Nueva partida</button>':''}</div><div class="title-tools"><button class="secondary" data-action="play-mode">Jugar fuera de ChatGPT ↗</button><button class="text-button" data-action="journey">Cargar partida</button></div><div class="caption">Capítulos 1–2 · Una primera aventura jugable</div><div class="caption menu-hint">${saveProblem?'El guardado no está disponible en este navegador.':'Tu avance se guarda en este navegador.'}<br>Exploración · Habilidades · Decisiones</div></div></section>`;ui.querySelector('[data-action="start"]').focus()}
function hud(){
 ui.innerHTML=`<div class="topbar"><div class="identity"><strong>NOA <span class="pill" id="player-level"></span></strong><div class="bars"><div class="bar"><i id="hp-bar"></i></div><div class="bar air"><i id="air-bar"></i></div></div><div class="bar-label"><span id="hp-label"></span><span id="air-label"></span></div></div><nav class="hud-actions" aria-label="Menús del juego">${[['skills','Habilidades'],['map','Mapa'],['bag','Mochila'],['journal','Diario'],['pause','Pausa']].map(([a,n])=>`<button class="icon-button" data-action="${a}" aria-label="${n}" title="${n}">${icon(a)}<span class="text">${n}</span></button>`).join('')}</nav><nav class="mobile-actions" aria-label="Accesos del juego"><button class="icon-button" data-action="bag" aria-label="Mochila">${icon('bag')}<span>Mochila</span></button><button class="icon-button" data-action="menu" aria-label="Abrir menú del juego">${icon('menu')}<span>Menú</span></button></nav></div>
 <div class="objective"><div class="tutorial-progress" id="tutorial-progress"></div><div class="eyebrow" id="objective-title"></div><p id="objective-text" aria-live="polite"></p><div class="tutorial-key" id="tutorial-key"></div><div class="objective-footer"><button id="guide-action" hidden></button><button class="guide-more" data-action="guide" aria-label="Ver instrucciones completas">Guía</button></div></div>
 <div class="area-label"><strong id="area-name"></strong><span id="area-sub"></span></div><button class="interact-label" data-action="interact" id="interaction" style="display:none"></button><div class="hint">WASD · E interactuar · ESPACIO herramienta · Q esquivar</div>`;
 lastObjective='';lastNear='';buildTouch();updateHUD();measureHUD();
 if(typeof ResizeObserver!=='undefined'){hudObserver?.disconnect();hudObserver=new ResizeObserver(()=>requestAnimationFrame(measureHUD));hudObserver.observe(ui.querySelector('.topbar'));hudObserver.observe(ui.querySelector('.objective'))}
}
function begin(){returnToTitle=false;dialogs.innerHTML='';touch.style.display='';modal=null;game.menu=false;hud();renderer.ready=false;audio('click');save()}
const touchMode=()=>layout.touch;
const actionLabel=e=>e.kind==='crate'||e.id==='coil'||e.kind==='parcel'?'Recoger':e.kind==='bench'?'Fabricar':e.kind==='air'?'Recargar':e.kind==='npc'?'Hablar':e.kind==='exit'?'Entrar':e.kind==='training'?'Practicar':'Actuar';
function updateHUD(){
 if(modal==='title')return;
 const s=game.state,hp=$('hp-bar');if(!hp)return;
 hp.style.width=Math.max(0,Math.min(100,s.player.hp/maxHP(s)*100))+'%';
 $('air-bar').style.width=Math.max(0,Math.min(100,s.player.air/maxAir(s)*100))+'%';
 $('hp-label').textContent='SALUD '+Math.ceil(s.player.hp);$('air-label').textContent='AIRE '+Math.ceil(s.player.air);$('player-level').textContent='NV. '+playerLevel(s);
 if(!s.tutorial.complete&&tutorialProgress(s)===LESSONS.length){s.tutorial.complete=true;toast('Aprendizaje completado · Ya dominas lo básico. Tu misión sigue marcada.',true);save()}
 const g=tutorialGuide(s),o=objective(s),coarse=touchMode(),key=o.join('|')+s.zone+tutorialProgress(s)+coarse+g?.id+layout.mode;
 if(key!==lastObjective){
  $('objective-title').textContent=o[0];const detail=layout.mode==='desktop'?o[1]:compactObjective(g,o,coarse);$('objective-text').textContent=coarse?detail:detail.replace('Mueve el control izquierdo','Usa WASD o las flechas');
  $('tutorial-progress').textContent=g?'GUÍA · '+tutorialProgress(s)+' / '+LESSONS.length:'';
  $('tutorial-key').textContent=g?.control?(coarse?({move:'↓ Control izquierdo',interact:'Acércate y usa el botón dorado',attack:'↓ Botón Golpear',dodge:'↓ Botón Esquivar',scan:'Buscar · Habilidades',bag:'↑ Mochila',journal:'↑ Diario',map:'↑ Mapa',skills:'↑ Habilidades'}[g.control]||''):({move:'WASD / Flechas',interact:'E · Interactuar',attack:'ESPACIO · Golpear',dodge:'Q · Esquivar',scan:'H · Habilidades → Escáner',bag:'I · Mochila',journal:'J · Diario',map:'M · Mapa',skills:'H · Habilidades'}[g.control]||'')):'';
  const shortcut=$('guide-action'),action=({bag:'bag',journal:'journal',map:'map',skills:'skills',scan:'scan'}[g?.control]);shortcut.hidden=!action;if(action){shortcut.dataset.action=action;shortcut.textContent=(layout.tiny?{bag:'Mochila',journal:'Diario',map:'Mapa',skills:'Mejoras',scan:'Escáner'}:{bag:'Abrir Mochila',journal:'Abrir Diario',map:'Abrir Mapa',skills:'Ver Habilidades',scan:'Activar escáner'})[action]}
  $('area-name').textContent=ZONES[s.zone].name;$('area-sub').textContent=ZONES[s.zone].sub;lastObjective=key;measureHUD();
 }
 const n=nearest(s),label=$('interaction');
 if(!modal&&n){label.style.display='';if(lastNear!==n.id){label.innerHTML=`<span class="key">${coarse?actionLabel(n):'E'}</span>${n.name}`;lastNear=n.id}}
 else{label.style.display='none';lastNear=''}
 const use=$('use-touch');if(use)use.textContent=g?.control==='scan'?'Buscar':n?actionLabel(n):skillLevel(s,'exploration')>=2?'Buscar':'Actuar';
 const pulse=$('pulse-touch');if(pulse){pulse.hidden=!s.flags.pulse;pulse.textContent=game.pulseCooldown>0?Math.ceil(game.pulseCooldown)+' s':'Pulso'}
 const dash=$('dash-touch');if(dash)dash.textContent=game.dashCooldown>0?Math.ceil(game.dashCooldown)+' s':'Esquivar';
 const guided=new Set();
 if(!modal&&g?.control){if(!$('guide-action').hidden)guided.add($('guide-action'));const selector=({move:'.stick',interact:n?'#use-touch, #interaction':null,attack:'#attack-touch',dodge:'#dash-touch',scan:'#use-touch, [data-action="skills"]'}[g.control])||`[data-action="${g.control}"]`;document.querySelectorAll(selector).forEach(el=>{if(el.getClientRects().length)guided.add(el)})}
 for(const el of [...ui.querySelectorAll('.coach-focus'),...touch.querySelectorAll('.coach-focus')])if(!guided.has(el))el.classList.remove('coach-focus');
 for(const el of guided)if(!el.classList.contains('coach-focus'))el.classList.add('coach-focus');
}
function showMenu(name,justCrafted=null){audio('click');const s=game.state,lesson=tutorialGuide(s);let content='';
 if(name==='menu'){
  content=modalHeader(ZONES[s.zone].name,'Tu viaje')+`<div class="menu-grid">${[['skills','Habilidades','Nivel '+playerLevel(s)],['map','Mapa','Sectores y rutas'],['bag','Mochila','Materiales y salud'],['journal','Diario',s.clues.length+' pruebas'],['guide','Guía','Tu siguiente paso'],['pause','Pausa','Sonido y ayuda'],['play-mode','Pantalla completa','Jugar fuera de ChatGPT'],['journey','Tu partida','Guardar o cargar copia']].map(([a,n,d])=>`<button class="secondary" data-action="${a}">${icon(a)}<span><strong>${n}</strong><small>${d}</small></span></button>`).join('')}</div>`;
 }
 else if(name==='guide'){
  const o=objective(s),g=tutorialGuide(s),act=({bag:'bag',journal:'journal',map:'map',skills:'skills',scan:'scan'}[g?.control]);
  content=modalHeader('TU SIGUIENTE PASO',o[0])+`<p>${touchMode()?o[1]:o[1].replace('Mueve el control izquierdo','Usa WASD o las flechas')}</p><p class="small">${touchMode()?'Muévete con el control izquierdo. Usa los botones de la derecha para actuar, golpear y esquivar.':'WASD o flechas: moverte. E: interactuar. Espacio: golpear. Q: esquivar.'}</p><div class="row">${act?`<button class="primary" data-action="${act}">${({bag:'Abrir Mochila',journal:'Abrir Diario',map:'Abrir Mapa',skills:'Ver Habilidades',scan:'Activar escáner'})[act]}</button>`:'<button class="primary" data-action="close">Seguir jugando</button>'}</div>`;
 }
 else if(name==='skills'){content=modalHeader('APRENDER HACIENDO','Tus habilidades')+`<div class="cards">${Object.entries(SKILLS).map(([id,k])=>{const r=rank(s.skills[id]);const perk=k.perks[Math.min(r.level-1,3)];return`<article class="card"><div class="skill-top"><h3>${k.name}</h3><span class="level">NV. ${r.level}</span></div><p>${k.desc}</p><div class="progress"><i style="width:${r.level>=4?100:Math.min(100,r.xp/r.next*100)}%"></i></div><div class="small">${r.level>=4?'Maestría del capítulo alcanzada':r.xp+' / '+r.next+' de experiencia'}</div><p><strong style="color:var(--teal)">${perk}</strong></p><div class="small">${r.level<4?'Siguiente: '+k.perks[r.level]:'Especialidad desarrollada para esta aventura.'}</div></article>`}).join('')}</div><p class="small">Explora lugares nuevos, repara instalaciones e interpreta terminales. Repetir una acción ya resuelta no da experiencia adicional.</p>${skillLevel(s,'exploration')>=2?'<button class="secondary coach-focus" data-action="scan">Activar escáner de suministros</button>':''}`}
else if(name==='bag'){content=modalHeader('EQUIPO DE RUTA','Tu mochila')+Object.entries(s.bag).map(([k,n])=>`<div class="inventory-row"><span>${names[k]}</span><strong>${n}</strong></div>`).join('')+`<p>${s.flags.filter?'✓ Respirador de servicio':'○ Respirador pendiente'}<br>${s.flags.pulse?'✓ Emisor de pulso':'○ Emisor de pulso sin fabricar'}<br>${s.flags.reinforced?'✓ Chaqueta reforzada':'✓ Ropa de correo'}<br>✓ Llave de servicio</p><button class="primary" data-action="heal" ${!s.bag.medkits||s.player.hp>=maxHP(s)?'disabled':''}>Usar botiquín · Recuperar ${skillLevel(s,'survival')>=3?70:50} de salud</button>`}
else if(name==='journal'){content=modalHeader('LO QUE LA CIUDAD RECUERDA','Diario de Noa')+`<article class="journal-entry"><h3>${storyObjective(s)[0]}</h3><p>${storyObjective(s)[1]}</p></article>`+(s.clues.length?s.clues.map(id=>CLUES[id]?`<article class="journal-entry"><h3>${CLUES[id].title}</h3><p>${CLUES[id].text}</p></article>`:'').join(''):'<p>Las pruebas que encuentres quedarán registradas aquí.</p>')+`<p class="small">${s.clues.length} de ${Object.keys(CLUES).length} pruebas recuperadas en esta aventura.</p>`}
else if(name==='map'){content=modalHeader('RED DE PASOS','Cartografía de Nácar')+`<div class="map-grid">${Object.entries(ZONES).map(([id,z])=>`<div class="map-sector ${id===s.zone?'current':''} ${id==='annex'&&!s.flags.boss?'locked':''}"><strong>${z.name}</strong><span>${id===s.zone?'ESTÁS AQUÍ':id==='annex'&&!s.flags.boss?'REQUIERE RESPIRADOR Y ACCESO':s.flags['visited_'+id]||id==='plaza'?'EXPLORADO':'POR EXPLORAR'}</span></div>`).join('')}</div><p>La plaza conecta con las Galerías por el este. Desde la cámara del Custodio, baja al sur para llegar al anexo. Allí, el ramal D-43 continúa hacia el este.</p><p class="small">La marca dorada señala tu siguiente objetivo. Los pasos abiertos permanecen accesibles.</p>${s.flags.bridge?'<p class="notice">Montacargas reparado: acceso directo desde las Galerías al taller.</p>':''}`}
else if(name==='workshop'){content=modalHeader('RECUPERAR. REPARAR. AVANZAR.','Banco de trabajo')+workshopView(s,justCrafted)}
else{content=modalHeader('EL MUNDO ESPERA','Pausa')+`<div class="row"><button class="secondary" data-action="play-mode">Pantalla completa</button><button class="secondary" data-action="journey">Guardar o cargar partida</button></div><div class="settings-row"><span>Efectos de sonido</span><button class="secondary" data-action="sound">${s.settings.sound?'Activados':'Desactivados'}</button></div><div class="settings-row"><span>Ayuda en combate <span class="small">· Reduce el daño recibido</span></span><button class="secondary" data-action="assist">${s.settings.assist?'Activada':'Desactivada'}</button></div><p class="small">E / botón Actuar: interactuar. Espacio: herramienta. Q: esquivar. F: pulso si está fabricado. H: habilidades. I: mochila. J: diario. M: mapa.</p><p>${saveProblem?'El navegador no ha permitido guardar.':'Tu avance queda guardado en este navegador y dispositivo.'}</p><div class="row"><button class="primary" data-action="close">Continuar</button><button class="secondary" data-action="title">Volver al inicio</button></div>`}
 const lessons={bag:'Aquí ves lo que llevas y el equipo que está activo. Un botiquín se usa desde el botón inferior cuando te falta salud; si tu salud está llena no se gasta.',journal:'El paquete añadió tu primera prueba. El diario conserva las pistas y el objetivo para que puedas consultarlos cuando lo necesites.',map:'La tarjeta destacada es tu sector actual. Las Galerías están al este de la plaza. Al cerrar, sigue la marca dorada hasta el paso.',skills:'Ingeniería ha subido al reparar la bomba. Ya puedes reparar el montacargas y abrir compuertas. Las habilidades suben al realizar sus acciones; no necesitas gastar puntos.'};
 if(lessons[name]&&lesson&&(lesson.control===name||lesson.id==='heal'&&name==='bag'))content=`<aside class="menu-lesson"><div class="eyebrow">APRENDE HACIENDO</div><p>${lessons[name]}</p></aside>`+content+`<button class="primary lesson-continue" data-action="close" data-focus>Entendido · seguir jugando →</button>`;
 learnMenu(s,name);openModal(content,name);updateHUD();save()}

function showPlayMode(){
 const standalone=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone;
 openModal(modalHeader('TODO EL ESPACIO PARA NÁCAR','Jugar fuera de ChatGPT')+`
  ${standalone?'<p class="notice">Ya estás jugando en una ventana de la app.</p>':'<p>Abre Nácar en Safari o Chrome para jugar fuera del visor de ChatGPT.</p>'}
  <label class="field-label" for="play-url">Dirección del juego</label>
  <input id="play-url" class="transfer-field" type="text" inputmode="url" readonly value="${PLAY_URL}" aria-label="Dirección directa del juego">
  <button class="secondary" data-action="copy-url">Copiar dirección</button>
  <ol class="install-steps"><li>Abre Safari y pega esta dirección en la barra de direcciones.</li><li>En Safari, abre Compartir → Agregar a Inicio. Activa «Abrir como app web» si aparece y pulsa Agregar.</li><li>Entra desde el icono de Nácar. Gira el teléfono si prefieres jugar en horizontal.</li></ol>
  <div class="journey-note"><strong>Continúa tu partida</strong><p>El progreso se guarda por navegador. Antes de cambiar, guarda una copia aquí. Después cárgala desde el icono de Nácar.</p><button class="secondary" data-action="journey">Guardar o cargar partida</button></div>
  <p id="launch-status" class="small" role="status"></p>
  ${document.fullscreenEnabled&&document.documentElement.requestFullscreen?'<div class="row"><button class="primary" data-action="fullscreen">'+(document.fullscreenElement?'Salir de pantalla completa':'Activar pantalla completa')+'</button></div>':''}
 `,'play-mode');
}
async function copyField(id,status,message){
 const field=$(id);if(!field)return;field.focus({preventScroll:true});field.select();field.setSelectionRange(0,field.value.length);
 try{await navigator.clipboard.writeText(field.value);if($(status))$(status).textContent=message}
 catch{if($(status))$(status).textContent='Mantén pulsado el texto seleccionado y elige Copiar.'}
}
async function fullscreen(){
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();closeModal();requestResize()}
 catch{if($('launch-status'))$('launch-status').textContent='Este visor no permite activar la pantalla completa. Abre la dirección en Safari y añade Nácar a Inicio.'}
}
function showJourney(){
 pendingJourney=null;
 openModal(modalHeader('LLEVA TU PROGRESO CONTIGO','Tu partida')+`
  <p>Guarda una copia antes de cambiar de navegador. Desde el icono de Nácar, vuelve aquí y carga ese archivo.</p>
  <button class="primary" data-action="download-journey">Guardar copia de partida</button>
  <label class="file-button secondary">Cargar archivo de partida<input id="journey-file" type="file" accept=".json,application/json"></label>
  <details class="transfer-alternative"><summary>Usar copiar y pegar</summary><p class="small">Copia tu partida y guárdala en Notas. En el nuevo navegador, pega el texto aquí y pulsa Revisar partida.</p>
  <button class="secondary" data-action="copy-journey">Copiar mi partida</button>
  <label class="field-label" for="journey-code">Texto de la partida</label><textarea id="journey-code" class="transfer-field" rows="4" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Pega aquí la copia de Nácar"></textarea>
  <button class="secondary" data-action="review-journey">Revisar partida</button></details>
  <p id="journey-status" class="small" role="status"></p>
 `,'journey');
 $('journey-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>MAX_JOURNEY_SIZE){$('journey-status').textContent='Ese archivo es demasiado grande para ser una partida de Nácar.';return}
  try{const raw=await file.text();if(modal==='journey')reviewJourney(raw)}catch{if($('journey-status'))$('journey-status').textContent='No se pudo leer el archivo. Puedes usar copiar y pegar.'}
 });
}
function downloadJourney(){
 try{
  const url=URL.createObjectURL(new Blob([exportJourney(game.state)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='nacar-partida.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  $('journey-status').textContent='Busca nacar-partida.json en Descargas. Si el visor no permite descargarlo, usa «Usar copiar y pegar».';
 }catch{$('journey-status').textContent='No se pudo preparar el archivo. Mantén esta partida abierta.'}
}
function reviewJourney(raw){
 const state=readJourney(raw);
 if(!state){$('journey-status').textContent='No es una copia válida de Nácar. Tu partida actual sigue intacta.';return}
 pendingJourney=state;
 openModal(modalHeader('COPIA ENCONTRADA','¿Continuar esta partida?')+`<p><strong>Nivel ${playerLevel(state)} · ${ZONES[state.zone].name}</strong></p><p>${state.clues.length} pruebas · ${state.flags.filter?'Respirador equipado':'Respirador pendiente'}</p><p class="small">${stored?'Esta copia reemplazará la partida activa en este navegador.':'Se conservarán sus materiales, habilidades, decisiones y tutorial.'}</p><div class="row"><button class="secondary" data-action="journey">Cancelar</button><button class="primary" data-action="import-journey">Cargar y continuar</button></div><p id="import-status" class="small" role="status"></p>`,'import-journey');
}
function importJourney(){
 if(!pendingJourney)return;
 try{
  const state=restoreJourney(localStorage,exportJourney(pendingJourney));
  game.state=state;stored=state;pendingJourney=null;game.rebuild();
  for(const k of ['attackTimer','attackCooldown','pulseCooldown','dashCooldown','scanTimer'])game[k]=0;
  begin();toast('Partida cargada · Tu viaje continúa.',true);
 }catch{$('import-status').textContent='No se pudo guardar la copia en este navegador. Tu partida actual sigue activa.'}
}

function finish(){save();const s=game.state,registered=s.ending==='registered';openModal(`<div class="eyebrow">CAPÍTULOS 1–2 · ENTREGA COMPLETADA</div><h2>${registered?'Una dirección reconocida':'El aire tiene nombres'}</h2><p>${registered?'Las familias del ramal tienen un traslado protegido y sus nombres constan en dos archivos. La ciudad ya no puede afirmar que allí no vive nadie.':'La toma vuelve a funcionar. El barrio sigue fuera del registro, pero esta noche sus habitantes respirarán. Tú conservas las pruebas de lo que ocurrió.'}</p><div class="cards"><div class="card"><div class="finish-stat">${playerLevel(s)}</div><div class="small">NIVEL DE NOA</div></div><div class="card"><div class="finish-stat">${s.clues.length} / 7</div><div class="small">PRUEBAS RECUPERADAS</div></div></div><p>El caso de la vivienda 43 está cerrado. La pregunta que queda es más grande: ¿cuántas personas ha borrado Nácar?</p><p class="small">Esta primera aventura termina aquí. Puedes seguir explorando sus tres sectores, mejorar el equipo y recuperar las pruebas pendientes.</p><div class="row"><button class="primary" data-action="close">Seguir explorando</button><button class="secondary" data-action="journal">Leer mis pruebas</button></div>`,'finish')}
function doAction(a){if(a==='play-mode'){showPlayMode();return}if(a==='copy-url'){copyField('play-url','launch-status','Dirección copiada. Pégala en la barra de Safari.');return}if(a==='fullscreen'){fullscreen();return}if(a==='journey'){showJourney();return}if(a==='download-journey'){downloadJourney();return}if(a==='copy-journey'){try{$('journey-code').value=exportJourney(game.state);copyField('journey-code','journey-status','Partida copiada. Guárdala en Notas para pegarla desde el nuevo navegador.')}catch{$('journey-status').textContent='No se pudo preparar la copia.'}return}if(a==='review-journey'){reviewJourney($('journey-code').value);return}if(a==='import-journey'){importJourney();return}if(a==='start'){begin();return}if(a==='new'){openModal(modalHeader('OTRO PRIMER TURNO','¿Comenzar de nuevo?')+'<p>Se reemplazará el progreso guardado en este dispositivo.</p><div class="row"><button class="secondary" data-action="cancel-new">Conservar partida</button><button class="primary" data-action="confirm-new">Nueva partida</button></div>','new');return}if(a==='cancel-new'){title();return}if(a==='confirm-new'){game.state=freshState();game.rebuild();stored=null;begin();return}if(a==='close'){closeModal();return}if(a==='title'){save();title();return}if(a==='interact'){if(!game.menu)handleResult(game.perform());return}if(a==='heal'){if(game.heal()){audio('level');toast('Salud recuperada');save()}showMenu('bag');return}if(a==='track-materials'){closeModal();toast('Sigue la marca dorada: '+objective(game.state)[1]);return}if(a==='scan'){if(modal)closeModal();if(game.scan()){toast('Escáner activado · Los suministros brillan');updateHUD();save()}return}if(a==='sound'){game.state.settings.sound=!game.state.settings.sound;showMenu('pause');save();return}if(a==='assist'){game.state.settings.assist=!game.state.settings.assist;showMenu('pause');save();return}showMenu(a)}
function clicks(e){const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.action){doAction(b.dataset.action);return}if(b.dataset.choice){const a=b.dataset.choice;closeModal();if(a!=='close')handleResult(game.choose(a));return}if(b.dataset.craft){const id=b.dataset.craft;if(game.craft(id)){toast(RECIPES[id].name+' fabricado y equipado',true);audio('level');save()}showMenu('workshop',id)}}
ui.addEventListener('click',clicks);dialogs.addEventListener('click',clicks);
function buildTouch(){const coarse=touchMode();touch.innerHTML=coarse?`<div class="stick" aria-label="Control de movimiento"><div class="knob"></div></div><div class="touch-actions"><button id="pulse-touch" aria-label="Usar emisor de pulso">Pulso</button><button class="use" id="use-touch" aria-label="Interactuar">Actuar</button><button class="dash" id="dash-touch" aria-label="Esquivar">Esquivar</button><button class="attack" id="attack-touch" aria-label="Golpear con herramienta">Golpear</button></div>`:'';if(!coarse)return;const base=touch.querySelector('.stick'),knob=touch.querySelector('.knob');let pid=null;
const input=e=>{if(e.pointerId!==pid)return;const r=base.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),d=Math.hypot(x,y),m=Math.max(20,r.width/2-22);stick={x:d<6?0:x/Math.max(d,m),y:d<6?0:y/Math.max(d,m)};knob.style.transform=`translate(${x/Math.max(1,d/m)}px,${y/Math.max(1,d/m)}px)`};
base.addEventListener('pointerdown',e=>{if(pid!==null)return;pid=e.pointerId;base.setPointerCapture(pid);input(e);e.preventDefault()});base.addEventListener('pointermove',input);const end=e=>{if(e.pointerId===pid){pid=null;stick={x:0,y:0};knob.style.transform='translate(0px,0px)'}};base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end);base.addEventListener('lostpointercapture',end);
$('use-touch').addEventListener('pointerdown',e=>{e.preventDefault();if(game.menu)return;const n=nearest(game.state);if(tutorialGuide(game.state)?.control==='scan'){if(game.scan()){toast('Escáner activado · Los suministros brillan');save();updateHUD()}return}if(n)handleResult(game.perform(n));else if(!game.scan())toast('Acércate a una persona, terminal o máquina.')});$('dash-touch').addEventListener('pointerdown',e=>{e.preventDefault();game.dash()});$('pulse-touch').addEventListener('pointerdown',e=>{e.preventDefault();if(!game.state.flags.pulse)toast('Fabrica un emisor en un banco de trabajo.');else game.pulse()});const attack=$('attack-touch');attack.addEventListener('pointerdown',e=>{e.preventDefault();attack.setPointerCapture(e.pointerId);holdAttack=true;game.attack()});const release=()=>holdAttack=false;attack.addEventListener('pointerup',release);attack.addEventListener('pointercancel',release);attack.addEventListener('lostpointercapture',release);
}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();const editing=e.target.matches('input,textarea,[contenteditable=true]');if(!editing&&[' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='tab'&&modal&&modal!=='title'){const focus=[...dialogs.querySelectorAll('button:not(:disabled),input,textarea,summary')].filter(el=>el.getClientRects().length);if(focus.length){const index=focus.indexOf(document.activeElement);if(e.shiftKey&&(index<=0)){e.preventDefault();focus.at(-1).focus()}else if(!e.shiftKey&&index===focus.length-1){e.preventDefault();focus[0].focus()}}return}if(modal==='title'){if(k==='enter'&&document.activeElement?.tagName!=='BUTTON')begin();return}if(k==='escape'){if(modal)closeModal();else showMenu('pause');return}if(modal)return;keys[k]=true;if(e.repeat)return;if(k==='e')handleResult(game.perform());if(k===' ')game.attack();if(k==='q')game.dash();if(k==='f')game.pulse();if(k==='h')showMenu('skills');if(k==='i')showMenu('bag');if(k==='j')showMenu('journal');if(k==='m')showMenu('map')});window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
window.addEventListener('blur',()=>{clearInput();if(!modal)showMenu('pause');save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(!modal)showMenu('pause');save()}});window.addEventListener('pagehide',save);
function measureHUD(){
 const root=surface.getBoundingClientRect(),bar=ui.querySelector('.topbar');
 if(!bar){renderer.setFrame({left:16,top:16,right:layout.width-16,bottom:layout.height-16,zoom:layout.mode==='desktop'?1.13:1});return}
 const headerBottom=bar.getBoundingClientRect().bottom-root.top;
 surface.style.setProperty('--hud-bottom',Math.round(headerBottom+8)+'px');
 const objectiveBox=ui.querySelector('.objective')?.getBoundingClientRect();
 const controls=touch.querySelector('.touch-actions')?.getBoundingClientRect();
 const box=objectiveBox?{top:objectiveBox.top-root.top,bottom:objectiveBox.bottom-root.top}:null;
 const frame=playFrame(layout,headerBottom,box,controls?.height?controls.top-root.top:null);renderer.setFrame(frame);
 surface.style.setProperty('--toast-top',Math.round(Math.max(headerBottom+10,layout.mode==='portrait'?(box?.bottom||headerBottom)+10:headerBottom+10))+'px');
}
function resize(){
 resizeQueued=false;
 const rect=surface.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 const wantsTouch=matchMedia('(any-pointer:coarse)').matches||navigator.maxTouchPoints>0||w<760;
 const oldTouch=layout.touch;layout=screenLayout(w,h,wantsTouch);
 surface.dataset.layout=layout.mode;surface.dataset.touch=String(layout.touch);surface.dataset.short=String(layout.short);surface.dataset.brief=String(layout.brief);surface.dataset.tiny=String(layout.tiny);
 for(const[k,v]of Object.entries({'--button-size':layout.button,'--joystick-size':layout.joystick,'--control-gap':layout.gap,'--gutter':layout.gutter,'--dock-height':layout.dock}))surface.style.setProperty(k,v+'px');
 if(renderer.width!==w||renderer.height!==h||renderer.dpr!==Math.min(devicePixelRatio||1,2)||canvas.width!==Math.round(w*Math.min(devicePixelRatio||1,2))){clearInput();renderer.resize(w,h,devicePixelRatio||1)}
 if(modal!=='title'&&(oldTouch!==layout.touch||!touch.childElementCount&&layout.touch))buildTouch();
 if(modal)touch.style.display='none';lastObjective='';lastNear='';updateHUD();measureHUD();
}
function requestResize(){if(!resizeQueued){resizeQueued=true;requestAnimationFrame(resize)}}
document.addEventListener('fullscreenchange',requestResize);window.addEventListener('resize',requestResize);window.visualViewport?.addEventListener('resize',requestResize);
if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(requestResize);observer.observe(surface)}
resize();
function frame(ts){const dt=Math.min((ts-last)/1000||0,.05);last=ts;const x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+stick.x,y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+stick.y;game.step(dt,{x,y});if((keys[' ']||holdAttack)&&!game.menu)game.attack();renderer.render(game);uiTick+=dt;saveTick+=dt;if(uiTick>.12){updateHUD();uiTick=0}if(saveTick>12){if(modal!=='title')save();saveTick=0}requestAnimationFrame(frame)}
if(document.modelContext?.registerTool){const lifecycle=new AbortController();for(const tool of[{name:'read_nacar_progress',title:'Leer progreso de Nácar',description:'Consulta sector, objetivo, habilidades y pruebas sin alterar la partida.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No se aceptan parámetros.');return{sector:ZONES[game.state.zone].name,objective:objective(game.state)[1],level:playerLevel(game.state),clues:game.state.clues.map(k=>CLUES[k]?.title),ending:game.state.ending}}},{name:'open_nacar_journal',title:'Abrir diario de Nácar',description:'Pausa la aventura y abre el mismo diario que el botón visible; no avanza misiones.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No se aceptan parámetros.');if(modal==='title')throw Error('Primero comienza o continúa la partida.');showMenu('journal');return{open:true}}}]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}
title();requestAnimationFrame(frame);
