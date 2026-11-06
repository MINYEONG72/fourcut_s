'use strict';
const $=id=>document.getElementById(id);
const FRAME_W=1240,FRAME_H=1748,S=1240/1044;
const options=[{id:'red',name:'레드 크리스마스',file:'frames/red.jpg'},{id:'cream',name:'크림 미니멀',file:'frames/cream.png'}];
const layouts={
red:[['rect',62,123,447,597],['rect',534,123,447,597],['rect',62,749,447,597],['rect',534,749,447,597]],
cream:[['rect',62,66,447,597],['rect',534,180,447,597],['rect',62,688,447,597],['rect',534,801,447,597]]
};
let choice=null,stream=null,photos=[],selected=[],busy=false,overlay=null,previewRunning=false,audioCtx=null,resultImgs=null,activeCut=0,roundShots=[];
const msg=t=>$('message').textContent=t;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('이미지를 불러올 수 없습니다: '+src));im.src=src});
const cache={};async function getOverlay(id){return cache[id]??=await load(`frames/${id}-overlay.png`)}
function show(n){for(let i=1;i<=4;i++){$('step'+i).hidden=i!==n;$('nav'+i).classList.toggle('active',i===n)}msg('');window.scrollTo({top:0,behavior:'smooth'});}
options.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='frame-option';const im=document.createElement('img');im.src=o.file;im.alt=o.name;im.onerror=()=>{im.alt=`이미지 로딩 실패: ${o.file}`};const t=document.createElement('span');t.textContent=o.name;b.append(im,t);b.onclick=()=>{choice=o;document.querySelectorAll('.frame-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('start').disabled=false};$('frames').append(b)});
async function startCamera(){if(!choice)return;try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('HTTPS 주소에서 접속해주세요.');overlay=await getOverlay(choice.id);stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}},audio:false});$('video').srcObject=stream;await $('video').play();show(2);$('progress').textContent='0 / 8 CUTS';activeCut=0;roundShots=[];previewRunning=true;requestAnimationFrame(drawPreview)}catch(e){stopCamera();msg(`카메라 실행 실패: ${e.message}. 브라우저의 카메라 권한과 HTTPS 주소를 확인해주세요.`)}}
function stopCamera(){previewRunning=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null}
$('start').onclick=startCamera;$('cancel').onclick=()=>{stopCamera();show(1)};
function initAudio(){try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume().catch(()=>{})}catch(e){}}
function shutterSound(){if(!audioCtx)return;try{const rate=audioCtx.sampleRate,dur=.16,buffer=audioCtx.createBuffer(1,Math.floor(rate*dur),rate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){const t=i/rate;data[i]=(Math.random()*2-1)*Math.exp(-t*30)*(.6+.4*Math.sin(2*Math.PI*140*t))}const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();source.buffer=buffer;gain.gain.value=.55;source.connect(gain);gain.connect(audioCtx.destination);source.start()}catch(e){}}
function mirroredVideo(){const v=$('video');if(!v.videoWidth||!v.videoHeight)throw new Error('카메라 영상이 준비되지 않았습니다.');const c=document.createElement('canvas');c.width=900;c.height=1100;const x=c.getContext('2d');const scale=Math.max(c.width/v.videoWidth,c.height/v.videoHeight),w=v.videoWidth*scale,h=v.videoHeight*scale;x.translate(c.width,0);x.scale(-1,1);x.drawImage(v,(c.width-w)/2,(c.height-h)/2,w,h);return c}
function crop(ctx,img,x,y,w,h,focusY=.5){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale,sx=(iw-sw)/2,sy=Math.max(0,Math.min(ih-sh,ih*focusY-sh/2));ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h)}
function drawSlot(ctx,img,slot,i){const [shape,xx,yy,ww,hh]=slot,[x,y,w,h]=[xx*S,yy*S,ww*S,hh*S];ctx.save();ctx.beginPath();if(shape==='rect')ctx.rect(x,y,w,h);else ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);ctx.clip();if(shape==='face'){
 // For face windows, sample a square from the upper-center of the selected portrait.
 const offset=i===2?Number($('faceTop').value):Number($('faceBottom').value);
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
 const square=Math.min(iw,ih)*.43;const sx=(iw-square)/2;const cy=ih*(.31+offset/650);const sy=Math.max(0,Math.min(ih-square,cy-square/2));ctx.drawImage(img,sx,sy,square,square,x,y,w,h);
}else crop(ctx,img,x,y,w,h,.48);ctx.restore()}
function drawSlots(ctx,imgs){layouts[choice.id].forEach((slot,i)=>{if(imgs[i])drawSlot(ctx,imgs[i],slot,i)})}
// Only the currently active slot receives live video. Completed slots remain frozen.
// Eight photos are captured as two consecutive rounds of four slots.
function drawPreview(){
 if(!previewRunning)return;
 const c=$('livePreview'),ctx=c.getContext('2d');
 ctx.clearRect(0,0,FRAME_W,FRAME_H);
 const slots=layouts[choice.id];
 roundShots.forEach((photo,i)=>{if(photo && slots[i])drawSlot(ctx,photo,slots[i],i)});
 if(activeCut<4 && $('video').readyState>=2){
   try{drawSlot(ctx,mirroredVideo(),slots[activeCut],activeCut)}catch(e){}
 }
 if(overlay)ctx.drawImage(overlay,0,0,FRAME_W,FRAME_H);
 requestAnimationFrame(drawPreview);
}
$('shoot').onclick=async()=>{
 if(busy||!stream)return;
 busy=true;$('shoot').disabled=true;initAudio();photos=[];roundShots=[];activeCut=0;
 try{
  for(let i=0;i<8;i++){
   if(i===4){roundShots=[];activeCut=0;}
   $('progress').textContent=`${i} / 8 CUTS · ${i<4?'1':'2'}회차`;
   for(let n=10;n>=1;n--){$('countdown').textContent=n;await wait(1000)}
   $('countdown').textContent='📸';shutterSound();
   const photo=mirroredVideo();photos.push(photo.toDataURL('image/jpeg',.92));
   roundShots[activeCut]=photo;activeCut++;
   $('progress').textContent=`${photos.length} / 8 CUTS`;
   await wait(500);
  }
  $('countdown').textContent='';stopCamera();renderShots();show(3);
 }catch(e){msg('촬영 실패: '+e.message)}
 finally{busy=false;$('shoot').disabled=false}
};
function renderShots(){selected=[];$('shots').replaceChildren();photos.forEach((src,i)=>{const b=document.createElement('button');b.className='shot';const im=document.createElement('img');im.src=src;im.alt=`${i+1}번째 촬영 사진`;const badge=document.createElement('b');badge.textContent=i+1;b.append(im,badge);b.onclick=()=>{if(selected.includes(i))selected=selected.filter(v=>v!==i);else if(selected.length<4)selected.push(i);document.querySelectorAll('.shot').forEach((el,j)=>el.classList.toggle('selected',selected.includes(j)));$('selectedCount').textContent=`${selected.length} / 4 SELECTED`;$('make').disabled=selected.length!==4};$('shots').append(b)});$('selectedCount').textContent='0 / 4 SELECTED';$('make').disabled=true}
$('retake').onclick=async()=>{photos=[];await startCamera()};
function drawResult(){if(!resultImgs)return;const ctx=$('result').getContext('2d');ctx.clearRect(0,0,FRAME_W,FRAME_H);drawSlots(ctx,resultImgs);ctx.drawImage(overlay,0,0,FRAME_W,FRAME_H)}
$('make').onclick=async()=>{try{resultImgs=await Promise.all(selected.map(i=>load(photos[i])));overlay=await getOverlay(choice.id);drawResult();show(4)}catch(e){msg(e.message)}};

const filename='samsung-fourcut.png';function download(){const c=$('result');c.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)},'image/png')}
$('download').onclick=download;
$('share').onclick=()=>{$('result').toBlob(async blob=>{if(!blob)return;const file=new File([blob],filename,{type:'image/png'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'삼성네컷'});return}}catch(e){if(e.name==='AbortError')return}download();msg('사진을 다운로드했어요. 이메일에 PNG 파일을 첨부해 주세요.');},'image/png')};
$('again').onclick=()=>{stopCamera();photos=[];selected=[];resultImgs=null,activeCut=0,roundShots=[];show(1)};

// 이메일 첨부 발송: Google Apps Script 웹앱 /exec 주소를 아래에 설정하세요.
const EMAIL_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzo7Bu6ze8CC-ooWzQw00uZ7meZ-ipR3GHo_barj3cAeVPOKuy82jcwjHEL-QXKH0cwYw/exec';
let sendingEmail = false;
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://script.google.com' && event.origin !== 'https://script.googleusercontent.com') return;
  const data = event.data;
  if (!data || data.type !== 'samsung-fourcut-email' || !sendingEmail) return;
  sendingEmail = false;
  $('sendEmail').disabled = false;
  $('emailStatus').textContent = data.message || (data.ok ? '전송 완료' : '전송 실패');
});
$('sendEmail').onclick = () => {
  if (sendingEmail) return;
  const email = $('emailAddress').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('emailStatus').textContent = '이메일 주소를 확인해 주세요.'; return; }
  if (!EMAIL_WEB_APP_URL.startsWith('https://script.google.com/macros/s/') || !EMAIL_WEB_APP_URL.endsWith('/exec')) {
    $('emailStatus').textContent = '먼저 app.js에 Apps Script 배포 URL을 입력해 주세요.'; return;
  }
  try {
    const png = $('result').toDataURL('image/png');
    if (png.length > 5.4 * 1024 * 1024) { $('emailStatus').textContent = '사진 용량이 커서 이메일로 보낼 수 없어요. PNG를 다운로드해 주세요.'; return; }
    $('formEmail').value = email;
    $('formImage').value = png;
    $('emailForm').action = EMAIL_WEB_APP_URL;
    sendingEmail = true;
    $('sendEmail').disabled = true;
    $('emailStatus').textContent = '이메일 전송 중...';
    $('emailForm').submit();
    // 보안 및 네트워크 문제로 응답을 받지 못할 수도 있으므로 성공으로 표시하지 않음.
  } catch (err) { sendingEmail=false; $('sendEmail').disabled=false; $('emailStatus').textContent='전송 준비 실패: '+err.message; }
};
