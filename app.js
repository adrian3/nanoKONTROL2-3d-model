import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createMidiLink } from './midi.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); }
catch { $('loading').textContent = 'WebGL is unavailable. Open this preview in a browser with hardware acceleration.'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .5, 3000);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.dampingFactor = .075;
orbit.minDistance = 220; orbit.maxDistance = 1000;
orbit.enablePan = false; orbit.target.set(0, 12, 0);
orbit.autoRotateSpeed = 1.1;
scene.add(new THREE.HemisphereLight(0xfffdf2, 0x758477, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 4.5); key.position.set(-140, 290, 140); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left:-260, right:260, top:180, bottom:-180, near:1, far:750 }); key.shadow.bias = -.0003; key.shadow.normalBias = .3; scene.add(key);
const rim = new THREE.DirectionalLight(0xe0edff, 3); rim.position.set(180, 130, -170); scene.add(rim);
const model = new THREE.Group(); scene.add(model);
const upper = new THREE.Group(); model.add(upper);
const controlsLayer = new THREE.Group(); model.add(controlsLayer);
const plastic = new THREE.MeshStandardMaterial({ color:0x242626, roughness:.62, metalness:.06 });
const capMaterial = new THREE.MeshStandardMaterial({color:0x292b2c, roughness:.5, metalness:.13});
const dark = new THREE.MeshStandardMaterial({color:0x080b0d, roughness:.55});
// Finish-specific surfaces are separate from recesses and the USB socket.
const topEdgeMaterial = dark.clone();
const knobBaseMaterial = dark.clone();
const faderGrooveMaterial = dark.clone();
const rubber = new THREE.MeshStandardMaterial({color:0x121515, roughness:.96});
const silver = new THREE.MeshStandardMaterial({color:0xa8aaa2, roughness:.37, metalness:.7});
const ink = new THREE.MeshStandardMaterial({color:0xd3d2c6, roughness:.7});
const pink = new THREE.MeshStandardMaterial({color:0xf18da6, roughness:.4, emissive:0x4d0c22, emissiveIntensity:.15});
let finish = 'black', demo = false, exploded = false, explosion = 0, selected, cameraTween;
const items = [], pickables = [], faders = [], knobs = [], buttons = [];
function rounded(w,d,h,r,mat,parent,x,y,z) {
  const s = new THREE.Shape(), a = w/2, b = d/2;
  s.moveTo(-a+r,-b); s.lineTo(a-r,-b); s.quadraticCurveTo(a,-b,a,-b+r); s.lineTo(a,b-r); s.quadraticCurveTo(a,b,a-r,b); s.lineTo(-a+r,b); s.quadraticCurveTo(-a,b,-a,b-r); s.lineTo(-a,-b+r); s.quadraticCurveTo(-a,-b,-a+r,-b);
  const geo = new THREE.ExtrudeGeometry(s,{depth:h-.8,bevelEnabled:true,bevelThickness:.4,bevelSize:.4,bevelSegments:2,steps:1,curveSegments:8});
  geo.rotateX(-Math.PI/2);
  const mesh = new THREE.Mesh(geo,mat); mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function box(w,h,d,mat,parent,x,y,z) {const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
function cylinder(r,h,mat,parent,x,y,z) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh; }
// The shell has a straight wall between distinct lower and upper bevels.
// Flat bands retain profile breaks; the upper curve shares smooth normals.
function shellProfile(levels,parent,smooth=false) {
 const outline=(w,d,r)=>{
  const s=new THREE.Shape(),a=w/2,b=d/2;
  s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);
  s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);
  s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);
  return s;
 };
 const rings=levels.map(([y,w,d,r])=>outline(w,d,r).getPoints(12).slice(0,-1).map(p=>[p.x,y,p.y]));
 for(let band=0;band<(smooth?1:rings.length-1);band++) {
  const section=smooth?rings:rings.slice(band,band+2),n=section[0].length,positions=section.flat(2),indices=[];
  for(let row=0;row<section.length-1;row++)for(let i=0;i<n;i++){
   const a=row*n+i,b=row*n+(i+1)%n;indices.push(a,a+n,b,b,a+n,b+n);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,plastic);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 }
 for(const [index,bottom] of [[0,true],[levels.length-1,false]]) {
  const [y,w,d,r]=levels[index],geometry=new THREE.ShapeGeometry(outline(w,d,r),12);
  geometry.rotateX(bottom?Math.PI/2:-Math.PI/2);
  const mesh=new THREE.Mesh(geometry,plastic);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 }
}
shellProfile([[1,313,71,5],[4.8,325,83,6]],model);
shellProfile([[4.8,325,83,6],[14.5,325,83,6]],upper);
// A recessed quarter-ellipse replaces the straight chamfer and raised rim.
const shoulder=[];
for(let i=0;i<=24;i++){
 const angle=i/24*Math.PI/2,inset=5*Math.sin(angle);
 shoulder.push([14.5+4.08*(1-Math.cos(angle)),325-inset*2,83-inset*2,6-Math.sin(angle)]);
}
shellProfile(shoulder,upper,true);
// A generated, high-resolution screen print supplies markings, never the geometry.
const faceCanvas = document.createElement('canvas'); faceCanvas.width = 2600; faceCanvas.height = 664;
const ctx = faceCanvas.getContext('2d');
const texture = new THREE.CanvasTexture(faceCanvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const face = new THREE.Mesh(new THREE.PlaneGeometry(315,74), new THREE.MeshStandardMaterial({map:texture,roughness:.76,metalness:.03}));face.rotation.x=-Math.PI/2;face.position.y=18.6;upper.add(face);
function printFace() {
 ctx.fillStyle=finish==='black'?'#262829':'#e8e8e3';ctx.fillRect(0,0,2600,664);ctx.save();ctx.scale(2600/315,664/74);ctx.translate(157.5,37);
 const textColor = finish==='black'?'#d7d8d4':'#404440';
 const label=(text,x,z,size=3,align='center',weight='normal')=>{ctx.fillStyle=textColor;ctx.textAlign=align;ctx.font=`${weight} ${size}px Arial`;ctx.fillText(text,x,z);};
 label('KORG',-113,-28,6,'center','900'); ctx.save(); ctx.transform(1,0,-.18,1,0,0);label('nanoKONTROL2',-117,-16,7.5,'center','500');ctx.restore();
 label('TRACK',-136,-8,2.5);label('MARKER',-97,5,2.3);
 ctx.strokeStyle=textColor;ctx.lineWidth=.3;ctx.beginPath();ctx.moveTo(-125,3.9);ctx.lineTo(-108,3.9);ctx.moveTo(-85,3.9);ctx.lineTo(-77,3.9);ctx.stroke();
 for(let i=0;i<8;i++) {const x=-48+i*27.5;ctx.fillStyle=finish==='black'?'#bebfb7':'#666e69';ctx.fillRect(x-3,-19,6,55);ctx.fillStyle='#0b0d0e';ctx.fillRect(x-.65,-9,1.3,39);for(let j=0;j<12;j++){ctx.fillStyle=textColor;ctx.fillRect(x-6,29-j*3,.9+j%3*.5,.2);}label(String(i+1),x,35,2.1);}
 ctx.restore();texture.needsUpdate=true;
}
printFace();
// Bottom feet, screw recesses, center label and a left-side mini USB socket.
for(const x of [-141,141]) for(const z of [-29,29]) {cylinder(4.5,1.6,rubber,model,x,.3,z); cylinder(1.4,.3,dark,model,x*.86,.6,z*.9);}
box(.8,6,10,dark,model,-162.8,10,-17);box(1,4.4,7.8,silver,model,-163.3,10,-17);box(1.1,2.8,5.5,dark,model,-163.9,10,-17);box(1.2,.7,4,silver,model,-164,9.6,-17);
const bottomCanvas=document.createElement('canvas');bottomCanvas.width=768;bottomCanvas.height=256;const bc=bottomCanvas.getContext('2d');bc.fillStyle='#202324';bc.fillRect(0,0,768,256);bc.fillStyle='#a5aaa7';bc.font='bold 36px Arial';bc.fillText('KORG  nanoKONTROL2',40,70);bc.font='20px Arial';bc.fillText('USB MIDI CONTROLLER',40,112);bc.fillText('DC 5V   •   USB BUS POWERED',40,156);bc.font='15px monospace';bc.fillText('3D PRODUCT STUDY  /  325 × 83 × 30 mm',40,206);
const bottomTex=new THREE.CanvasTexture(bottomCanvas);bottomTex.colorSpace=THREE.SRGBColorSpace;const bottomLabel=new THREE.Mesh(new THREE.PlaneGeometry(93,31),new THREE.MeshStandardMaterial({map:bottomTex,roughness:.8}));bottomLabel.rotation.x=Math.PI/2;bottomLabel.position.y=.5;model.add(bottomLabel);
function decal(text,w,d,color='#e8e8e2',bg=null) {const c=document.createElement('canvas');c.width=256;c.height=256;const t=c.getContext('2d');if(bg){t.fillStyle=bg;t.fillRect(0,0,256,128);}t.fillStyle=color;t.textAlign='center';t.textBaseline='middle';t.font=`bold ${text.length>3?58:text.length>1?110:180}px Arial`;t.fillText(text,128,136);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;return m;}
function register(item) {item.id=items.length;items.push(item);item.mesh.traverse(m=>{if(m.isMesh){m.userData.control=item;pickables.push(m);}});const option=document.createElement('option');option.value=item.id;option.textContent=item.name;$('control-select').append(option);return item;}
function button(name,text,x,z,w=8,d=8,transport=false) {
 const group=new THREE.Group();group.position.set(x,19,z);controlsLayer.add(group);
 rounded(w,d,.8,1.1,transport?pink:pink,group,0,0,0);
 const cap=rounded(w-1.1,d-1.1,1.4,.7,capMaterial,group,0,.65,0);
 const writing=decal(text,w-2,d-2,'#ffffff');writing.material.color.set(0xfca1b6);writing.position.y=2.2;group.add(writing);
 const item=register({name,type:'button',mesh:group,cap,writing,value:0,baseY:.65});buttons.push(item);return item;
}
// Rounded, slightly tapered caps with shallow vertical grip flutes.
const knobGeometry=new THREE.LatheGeometry([
 [0,1.15],[4.35,1.15],[4.65,1.3],[4.8,1.65],
 [4.72,2.1],[4.15,9.2],[4.1,9.55],[3.95,9.85],[3.65,10],[0,10]
].map(([r,y])=>new THREE.Vector2(r,y)),160);
const knobPositions=knobGeometry.attributes.position;
for(let i=0;i<knobPositions.count;i++){
 const x=knobPositions.getX(i),z=knobPositions.getZ(i),y=knobPositions.getY(i),r=Math.hypot(x,z);
 if(r>0 && y>1.3 && y<9.85){
  const fade=Math.min(1,(y-1.3)/.6,(9.85-y)/.6);
  const scale=(r+.09*Math.cos(Math.atan2(x,z)*40)*fade)/r;
  knobPositions.setXYZ(i,x*scale,y,z*scale);
 }
}
knobGeometry.computeVertexNormals();
const knobFootGeometry=new THREE.LatheGeometry([
 [0,0],[5.4,0],[5.8,.15],[5.95,.4],[5.95,.65],[5.8,.85],[4.7,1.2],[0,1.2]
].map(([r,y])=>new THREE.Vector2(r,y)),64);
for(let i=0;i<8;i++) {
 const x=-48+i*27.5;
 const knobGroup=new THREE.Group();knobGroup.position.set(x,18.9,-25);controlsLayer.add(knobGroup);
 const foot=new THREE.Mesh(knobFootGeometry,knobBaseMaterial);foot.castShadow=true;foot.receiveShadow=true;knobGroup.add(foot);
 const cap=new THREE.Mesh(knobGeometry,capMaterial);cap.castShadow=true;cap.receiveShadow=true;knobGroup.add(cap);
 const pointer=box(.45,.08,2.25,ink,knobGroup,0,10.04,-2.5);
 const knob=register({name:`Channel ${i+1} · Pan`,type:'knob',mesh:knobGroup,value:64,index:i,pointer});knobs.push(knob);
 const g=new THREE.Group();g.position.set(x,19,6);controlsLayer.add(g);
 rounded(8,20,3.3,.7,capMaterial,g,0,0,0);box(7.7,.3,.55,ink,g,0,3.6,0);
 for(let j=-4;j<=4;j++){box(7.6,.25,.25,faderGrooveMaterial,g,0,3.45,j*1.65);}
 const f=register({name:`Channel ${i+1} · Volume`,type:'fader',mesh:g,value:80,index:i});faders.push(f);
 ['Solo','Mute','Record'].forEach((label,j)=>button(`Channel ${i+1} · ${label}`,['S','M','R'][j],x-12.5,-3+j*15));
}
button('Track · Previous','◀',-145,-4,11,5);button('Track · Next','▶',-129,-4,11,5);
button('Cycle','CYCLE',-145,9,11,5);button('Marker · Set','SET',-113,9,11,5);button('Marker · Previous','◀',-97,9,11,5);button('Marker · Next','▶',-81,9,11,5);
['Rewind','Fast forward','Stop','Play','Record'].forEach((name,i)=>button(`Transport · ${name}`,['◀◀','▶▶','■','▶','●'][i],-145+i*16,25,10,10,true));
const powerMat=new THREE.MeshStandardMaterial({color:0x351018,emissive:0xff1824,emissiveIntensity:0});const powerShape=new THREE.Shape();powerShape.moveTo(-1.1,-.7);powerShape.lineTo(1.1,-.7);powerShape.absarc(1.1,0,.7,-Math.PI/2,Math.PI/2,false);powerShape.lineTo(-1.1,.7);powerShape.absarc(-1.1,0,.7,Math.PI/2,Math.PI*1.5,false);
const powerGeometry=new THREE.ExtrudeGeometry(powerShape,{depth:.2,bevelEnabled:false,curveSegments:16});powerGeometry.rotateX(-Math.PI/2);
const power=new THREE.Mesh(powerGeometry,powerMat);power.position.set(-150,19,-30);upper.add(power);
function updateItem(item,value) {
 item.value=Math.max(0,Math.min(127,Math.round(value)));
 if(item.type==='fader') item.mesh.position.z=23-item.value/127*31;
 if(item.type==='knob') item.mesh.rotation.y=(.5-item.value/127)*Math.PI*1.55;
 if(item.type==='button'){const on=item.value>63;item.cap.position.y=on?.3:.65;item.writing.material.color.set(on?0xff1824:finish==='white'?0x8c979c:0xfca1b6);item.writing.position.y=on?1.85:2.2;}
 if(selected===item){$('control-value').value=item.value;$('value').textContent=item.type==='button'?(item.value>63?'ON':'OFF'):item.value;}
}
items.forEach(item=>updateItem(item,item.value));
function select(item){selected=item;$('control-select').value=item.id;$('selected-name').textContent=item.name;$('control-help').textContent=item.type==='button'?'Click the button to toggle, or use the value slider.':'Drag vertically on the model, or adjust the value slider.';updateItem(item,item.value);}
select(faders[0]);
$('control-select').addEventListener('change',e=>select(items[Number(e.target.value)]));
$('control-value').addEventListener('input',e=>{setDemo(false);updateItem(selected,Number(e.target.value));$('status').textContent='Control updated';});
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let gesture;
function hit(e){const rect=canvas.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.intersectObjects(pickables,false)[0]?.object.userData.control;}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const item=hit(e);if(!item)return;setDemo(false);select(item);gesture={item,y:e.clientY,value:item.value};orbit.enabled=false;canvas.setPointerCapture(e.pointerId);e.stopImmediatePropagation();if(item.type==='button')updateItem(item,item.value>63?0:127);},{capture:true});
canvas.addEventListener('pointermove',e=>{if(gesture){const {item,y,value}=gesture;if(item.type!=='button')updateItem(item,value+(y-e.clientY)*.8);$('status').textContent='Control updated';}else canvas.style.cursor=hit(e)?'pointer':'grab';});
function endGesture(){gesture=null;orbit.enabled=true;}canvas.addEventListener('pointerup',endGesture);canvas.addEventListener('pointercancel',endGesture);canvas.addEventListener('lostpointercapture',endGesture);
function setDemo(on){demo=on;$('demo').setAttribute('aria-pressed',on);$('demo').innerHTML=`<span>${on?'Ⅱ':'▶'}</span> ${on?'Pause demo':'Play demo'}`;$('status').textContent=on?'Automation running':'Ready to explore';}
$('demo').onclick=()=>setDemo(!demo);
$('spin').onclick=()=>{orbit.autoRotate=!orbit.autoRotate;$('spin').setAttribute('aria-pressed',orbit.autoRotate);};
$('explode').onclick=()=>{exploded=!exploded;$('explode').setAttribute('aria-pressed',exploded);};
document.querySelectorAll('[data-finish]').forEach(btn=>btn.onclick=()=>{finish=btn.dataset.finish;const white=finish==='white';
plastic.color.set(white?0xe5e6df:0x242626);
capMaterial.color.set(white?0xd9dad5:0x292b2c);
topEdgeMaterial.color.set(white?0xe5e6df:0x080b0d);
knobBaseMaterial.color.set(white?0xd9dad5:0x080b0d);
faderGrooveMaterial.color.set(white?0xc5c8c1:0x080b0d);
pink.color.set(white?0x485050:0xf18da6);
pink.emissive.set(white?0x000000:0x4d0c22);
buttons.forEach(item=>updateItem(item,item.value));
printFace();$('finish-name').textContent=finish==='black'?'Graphite black':'Studio white';document.querySelectorAll('[data-finish]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',b===btn);});});
const views={perspective:new THREE.Vector3(-105,210,250),top:new THREE.Vector3(0,340,.1),bottom:new THREE.Vector3(90,-235,245)};
function setView(name,immediate=false){const end=views[name].clone();if(camera.aspect<1.4)end.multiplyScalar(2/camera.aspect);if(immediate){camera.position.copy(end);orbit.update();}else cameraTween={start:camera.position.clone(),end,t:0};document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===name));$('view-label').textContent=`${name==='bottom'?'UNDERSIDE':name.toUpperCase()} VIEW`;}
document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.view));
orbit.addEventListener('start',()=>{cameraTween=null;document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.remove('active'));$('view-label').textContent='FREE ORBIT';});
$('reset').onclick=()=>{model.rotation.set(0,0,0);key.position.set(-140,290,140);key.intensity=4.5;renderer.toneMappingExposure=1.35;setDemo(false);orbit.autoRotate=false;exploded=false;[$('spin'),$('explode')].forEach(b=>b.setAttribute('aria-pressed',false));items.forEach(item=>updateItem(item,item.type==='fader'?80:item.type==='knob'?64:0));setView('perspective');select(faders[0]);};
$('capture').onclick=()=>{renderer.render(scene,camera);canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nanokontrol2-study.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});};
function resize(){const {width,height}=$('stage').getBoundingClientRect();camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
new ResizeObserver(()=>{resize();if(!gesture && $('view-label').textContent==='PERSPECTIVE VIEW')setView('perspective',true);}).observe($('stage'));resize();orbit.minDistance=220;setView('perspective',true);$('loading').hidden=true;
const clock=new THREE.Clock();let elapsed=0;
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;if(cameraTween){cameraTween.t=Math.min(1,cameraTween.t+dt*1.5);const t=cameraTween.t;camera.position.lerpVectors(cameraTween.start,cameraTween.end,t*t*(3-2*t));if(t===1)cameraTween=null;}
 explosion=THREE.MathUtils.damp(explosion,exploded?1:0,5,dt);upper.position.y=explosion*26;controlsLayer.position.y=explosion*58;
 if(demo){faders.forEach((f,i)=>updateItem(f,64+52*Math.sin(elapsed*1.3+i*.8)));knobs.forEach((k,i)=>updateItem(k,64+48*Math.sin(elapsed*.7+i*.5)));buttons.forEach((b,i)=>updateItem(b,Math.sin(elapsed*2+i*.7)>.65?127:0));}
 orbit.update();renderer.render(scene,camera);
});
// Small read-only hook for preview verification and future model integration.
window.nanoPreview={scene,renderer,camera,items,get demo(){return demo;},get exploded(){return exploded;}};
function driveView(item,value,previous) {
 if(!$('midi-view-mode').checked)return;
 const t=value/127;
 if(item.type==='button') {
  if(value===0 || previous>0)return;
  const actions={'Track · Previous':()=>document.querySelector('[data-finish="black"]').click(),'Track · Next':()=>document.querySelector('[data-finish="white"]').click(),'Cycle':()=>$('spin').click(),'Marker · Set':()=>$('reset').click(),'Marker · Next':()=>$('explode').click(),'Transport · Play':()=>{orbit.autoRotate=true;$('spin').setAttribute('aria-pressed',true);},'Transport · Stop':()=>{orbit.autoRotate=false;$('spin').setAttribute('aria-pressed',false);}};
  actions[item.name]?.();return;
 }
 if(item.type==='fader' && item.index===0) {
  cameraTween=null;
  const direction=camera.position.clone().sub(orbit.target).normalize();
  camera.position.copy(orbit.target).addScaledVector(direction,orbit.maxDistance-t*(orbit.maxDistance-orbit.minDistance));
 } else if(item.type==='knob') {
  if(item.index===0)model.rotation.y=(t-.5)*Math.PI*2;
  if(item.index===1)model.rotation.x=(t-.5)*Math.PI;
  if(item.index===2)model.rotation.z=(t-.5)*Math.PI;
  if(item.index===3 || item.index===4) {
   cameraTween=null;
   const position=new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
   if(item.index===3)position.theta=(t-.5)*Math.PI*2;
   else position.phi=.1+t*(Math.PI-.2);
   camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(position));
  }
  if(item.index===5){const a=t*Math.PI*2;key.position.set(Math.sin(a)*200,290,Math.cos(a)*200);}
  if(item.index===6)key.intensity=.5+t*7.5;
  if(item.index===7)renderer.toneMappingExposure=.5+t*2;
 } else return;
 orbit.update();
 document.querySelectorAll('[data-view]').forEach(btn=>btn.classList.remove('active'));
 $('view-label').textContent='MIDI VIEW';
}
const midiLink = createMidiLink({
 items,
 onValue(item,value){const previous=item.value;setDemo(false);driveView(item,value,previous);updateItem(item,value);select(item);$('status').textContent='USB MIDI control updated';},
 onStatus(message,connected){powerMat.color.set(connected?0xff1824:0x351018);powerMat.emissiveIntensity=connected?2:0;$('midi-status').textContent=message;$('midi-connect').textContent=connected?'Reconnect MIDI':'Connect nanoKONTROL2';},
});
$('midi-connect').onclick=()=>midiLink.connect();
midiLink.autoConnect();
window.addEventListener('pagehide',()=>midiLink.destroy());
