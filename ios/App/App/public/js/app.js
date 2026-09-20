(function(){
'use strict';
/* ---------- Bilder: WebP-Dateien im Ordner images/ (Dateiname = Bild-ID) ---------- */
const IMG_FILES=['imposter','bombe','buzzer','chooser','circa'];
const IMGS={};
IMG_FILES.forEach(k=>{IMGS[k]='images/'+k+'.webp'});
function setImg(im){
  const k=im.dataset.gimg,s=IMGS[k];
  if(!s||im.getAttribute('src')===s)return;
  im.src=s;
}
const paintImgs=root=>{Array.from((root||document).querySelectorAll('img[data-gimg]')).forEach(setImg)};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
let ttN=0;
const ttl=(t,c)=>{
  const T=esc(String(t).toUpperCase()),card=(c==='y'||c==='w'),n=card?6:8,dx=card?.0075:.0071,dy=card?.0135:.014,grad=(c==='l2'||c==='w'),id='ttg'+(++ttN);
  const layer=cls=>{let o='';for(let i=0;i<=n;i++)o+=`<text x="50%" y="50%" dx="${(i*dx).toFixed(4)}em" dy="${(i*dy).toFixed(4)}em">${T}</text>`;return `<g class="${cls}">${o}</g>`};
  const defs=grad?`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset=".18" stop-color="#ffd94d"/><stop offset=".5" stop-color="#f8b733"/><stop offset=".82" stop-color="#ee8a2b"/></linearGradient></defs>`:'';
  return `<span class="tt ${c}"><b>${T}</b><svg class="ttx" aria-hidden="true" focusable="false">${defs}${layer('ttw')}${layer('ttk')}<text class="ttf" x="50%" y="50%" fill="${grad?`url(#${id})`:'#fff'}">${T}</text></svg></span>`;
};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};

/* ---------- Einstellungen: Ton & Vibration ---------- */
const settings=Object.assign({sound:true,haptic:true},store.get('splash.settings',null)||{});
settings.sound=!!settings.sound;settings.haptic=!!settings.haptic;
const saveSettings=()=>store.set('splash.settings',settings);
function haptic(pattern){
  if(!settings.haptic)return;
  try{navigator.vibrate&&navigator.vibrate(pattern)}catch(e){}
}

/* ---------- Sound-Engine (Web Audio: Hall, Kompressor, Stereo, weiche Hüllkurven) ---------- */
const sfx=(()=>{
  /* Optional: eigene Samples (z. B. Pixabay-mp3 als Base64, ohne "data:"-Präfix), z. B. SAMPLES.success='//uQx...' */
  const SAMPLES={};
  let ctx=null,bus=null,send=null,noiseBuf=null;
  const bufs={};
  function ensure(){
    if(!ctx){
      try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return null}
      bus=ctx.createGain();bus.gain.value=.85;
      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-16;comp.knee.value=20;comp.ratio.value=3;comp.attack.value=.003;comp.release.value=.2;
      bus.connect(comp);comp.connect(ctx.destination);
      const conv=ctx.createConvolver(),n=Math.floor(ctx.sampleRate*1.4),ir=ctx.createBuffer(2,n,ctx.sampleRate);
      for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<n;i++){const k=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-k,2.6)*Math.min(1,k*80)}}
      conv.buffer=ir;
      const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4200;
      const wet=ctx.createGain();wet.gain.value=.55;
      send=ctx.createGain();
      send.connect(conv);conv.connect(lp);lp.connect(wet);wet.connect(bus);
      noiseBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*1.5),ctx.sampleRate);
      const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
      loadSamples();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return ctx;
  }
  function loadSamples(){
    Object.keys(SAMPLES).forEach(k=>{
      try{
        const bin=atob(SAMPLES[k]),u8=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
        const p=ctx.decodeAudioData(u8.buffer,b=>{bufs[k]=b},()=>{});
        if(p&&p.catch)p.catch(()=>{});
      }catch(e){}
    });
  }
  function out(node,pan,rev){
    let n=node;
    if(pan&&ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;n.connect(p);n=p}
    n.connect(bus);
    if(rev){const s=ctx.createGain();s.gain.value=rev;n.connect(s);s.connect(send)}
  }
  /* Einzelner Ton mit weichem Anschlag und natürlichem Ausklang */
  function note(f,o){
    o=o||{};
    const t0=ctx.currentTime+(o.delay||0),at=o.at==null?.006:o.at,dur=o.dur||.2,vol=o.vol||.15;
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type=o.type||'sine';osc.frequency.setValueAtTime(f,t0);
    if(o.glide)osc.frequency.exponentialRampToValueAtTime(o.glide,t0+(o.gt||dur));
    g.gain.setValueAtTime(.0001,t0);
    g.gain.linearRampToValueAtTime(vol,t0+at);
    g.gain.setTargetAtTime(0,t0+at,dur/4.5);
    let n=osc;
    if(o.lp){const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;fl.Q.value=.7;osc.connect(fl);n=fl}
    n.connect(g);out(g,o.pan,o.rev);
    osc.start(t0);osc.stop(t0+at+dur*1.4);
  }
  /* Glockenton aus mehreren Teiltönen [Verhältnis, Pegel, Ausklang] */
  function bell(f,o){
    o=o||{};
    const P=o.p||[[1,1,1],[2.76,.32,.45],[5.4,.1,.22]],vol=o.vol||.12,dur=o.dur||.5;
    P.forEach(p=>note(f*p[0],{delay:o.delay,dur:dur*p[2],vol:vol*p[1],at:.004,rev:o.rev==null?.3:o.rev,pan:o.pan}));
  }
  /* Gefiltertes Rauschen mit Frequenzfahrt = Whoosh, Klick */
  function whoosh(o){
    const t0=ctx.currentTime+(o.delay||0),dur=o.dur||.25;
    const s=ctx.createBufferSource();s.buffer=noiseBuf;
    const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=o.q||.9;
    f.frequency.setValueAtTime(o.f0,t0);f.frequency.exponentialRampToValueAtTime(o.f1,t0+dur);
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(o.vol||.08,t0+dur*.4);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    s.connect(f);f.connect(g);out(g,o.pan,o.rev);
    s.start(t0,Math.random()*.4,dur+.05);
  }
  const click=o=>whoosh({f0:o.f,f1:o.f,dur:o.dur||.03,vol:o.vol||.05,q:o.q||2,delay:o.delay});
  const SOFT=[[1,1,1],[2.01,.22,.5]];
  const S={
    tap(){bell(1046.5,{vol:.09,dur:.16,rev:.15,p:SOFT});click({f:2600,vol:.03,dur:.02})},
    select(){bell(783.99,{vol:.11,dur:.28,rev:.22})},
    toggle(){bell(987.77,{vol:.08,dur:.14,rev:.12,p:SOFT})},
    warn(){note(210,{type:'triangle',dur:.17,vol:.2,glide:150,lp:900,rev:.05});note(158,{type:'triangle',dur:.2,vol:.16,delay:.09,lp:800,rev:.05})},
    open(){whoosh({f0:500,f1:2600,dur:.26,vol:.06,rev:.2});bell(659.25,{vol:.07,dur:.3,delay:.08})},
    close(){whoosh({f0:2200,f1:420,dur:.22,vol:.05,rev:.15});bell(440,{vol:.06,dur:.22})},
    launch(){whoosh({f0:300,f1:3200,dur:.42,vol:.09,rev:.3});bell(587.33,{vol:.08,dur:.4,delay:.07});bell(880,{vol:.08,dur:.55,delay:.17})},
    flip(){whoosh({f0:900,f1:3400,dur:.16,vol:.07,q:1.2,rev:.1});click({f:1800,vol:.05,delay:.11});bell(1318.5,{vol:.05,dur:.2,delay:.12,rev:.2})},
    start(){[523.25,659.25,783.99].forEach((f,i)=>bell(f,{vol:.11,dur:.45+i*.1,delay:i*.075,rev:.3}))},
    tick(){note(1700,{dur:.05,vol:.09,glide:1150,rev:.05});click({f:3500,vol:.03,dur:.015})},
    alarm(){for(let r=0;r<2;r++){bell(880,{vol:.16,dur:.55,delay:r*.5,rev:.35});bell(659.25,{vol:.14,dur:.6,delay:r*.5+.2,rev:.35})}},
    success(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>bell(f,{vol:.12,dur:.6+i*.15,delay:i*.09,rev:.4,pan:(i-1.5)*.18}));whoosh({f0:2000,f1:7000,dur:.5,vol:.025,delay:.25,q:.6,rev:.4})},
    fail(){note(392,{type:'triangle',dur:.5,vol:.2,glide:262,gt:.4,lp:1100,rev:.15});note(311.13,{type:'triangle',dur:.6,vol:.17,glide:196,gt:.5,delay:.18,lp:900,rev:.2})},
    boom(){
      note(74,{type:'sine',dur:.95,vol:.5,glide:26,gt:.75,at:.002,rev:.45});
      whoosh({f0:2200,f1:70,dur:.85,vol:.4,q:.32,rev:.5});
      whoosh({f0:520,f1:44,dur:1.7,vol:.22,q:.28,delay:.06,rev:.6});
      note(50,{type:'triangle',dur:1.3,vol:.24,lp:380,delay:.02,rev:.3});
      whoosh({f0:6000,f1:900,dur:.3,vol:.12,q:.5,pan:-.3});
      whoosh({f0:5200,f1:700,dur:.36,vol:.1,q:.5,delay:.05,pan:.3});
    },
    buzz(){note(190,{dur:.24,vol:.34,glide:52,gt:.2,at:.002,rev:0});click({f:2000,vol:.09,dur:.05,q:1.4});bell(1318.5,{vol:.09,dur:.3,delay:.015,rev:.25});note(140,{type:'sawtooth',dur:.2,vol:.06,lp:1200,at:.004,rev:.05,delay:.02})}
  };
  /* Zündschnur: durchgehendes Zischen mit Knistern, läuft bis fuseStop() */
  let fuse=null;
  function fuseStop(){
    if(!fuse)return;
    const f=fuse;fuse=null;clearInterval(f.iv);
    try{const t=ctx.currentTime;f.g.gain.cancelScheduledValues(t);f.g.gain.setTargetAtTime(0,t,.03);f.src.stop(t+.2)}catch(e){}
  }
  function fuseStart(){
    fuseStop();
    if(!settings.sound)return;
    const c=ensure();if(!c)return;
    const src=c.createBufferSource();src.buffer=noiseBuf;src.loop=true;
    const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;
    const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=5200;bp.Q.value=.55;
    const g=c.createGain();g.gain.value=.0001;
    src.connect(hp);hp.connect(bp);bp.connect(g);out(g,0,.1);
    const t0=c.currentTime;g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(.075,t0+.12);
    src.start(t0,Math.random()*.6);
    const iv=setInterval(()=>{
      const t=c.currentTime;
      g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(.04+Math.random()*.075,t,.025);
      bp.frequency.setTargetAtTime(3800+Math.random()*3400,t,.04);
      if(Math.random()<.4)click({f:2600+Math.random()*4200,vol:.04+Math.random()*.04,dur:.012,q:1.6});
    },60);
    fuse={src,g,iv};
  }
  const api={};
  api.fuseStart=fuseStart;api.fuseStop=fuseStop;
  Object.keys(S).forEach(k=>{api[k]=()=>{
    if(!settings.sound)return;
    const c=ensure();if(!c)return;
    if(bufs[k]){const s=c.createBufferSource(),g=c.createGain();s.buffer=bufs[k];g.gain.value=.9;s.connect(g);g.connect(bus);s.start();return}
    try{S[k]()}catch(e){}
  }});
  return api;
})();

/* ---------- Icons ---------- */
const I={
  play:'<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M9.5 7v14l12-7z" fill="currentColor" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round"/></svg>',
  pause:'<svg viewBox="0 0 28 28" fill="#fff" aria-hidden="true"><rect x="6" y="4" width="6" height="20" rx="2"/><rect x="16" y="4" width="6" height="20" rx="2"/></svg>',
  resume:'<svg viewBox="0 0 28 28" fill="#fff" aria-hidden="true"><path d="M6 3.5v21l19-10.5z"/></svg>',
  search:'<svg viewBox="0 0 28 28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M18.5 18.5 25 25"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l8 8-8 8"/></svg>',
  back:'<svg viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2 2 10l8 8"/></svg>',
  yt:'<svg viewBox="0 0 40 30" aria-hidden="true"><rect x="1" y="1" width="38" height="28" rx="8" fill="#fff"/><path d="M16 9v12l10-6z" fill="#0a1226"/></svg>',
  lock:'<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="5" y="12" width="18" height="13" rx="4"/><path d="M9 12V9a5 5 0 0110 0v3" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  eyes:'<svg class="eyes" viewBox="0 0 46 34" aria-hidden="true"><g fill="#0a1226" stroke="#fff" stroke-width="3"><ellipse cx="13" cy="17" rx="10" ry="14"/><ellipse cx="33" cy="17" rx="10" ry="14"/></g><g fill="#fff"><ellipse cx="14" cy="18" rx="4.5" ry="8"/><ellipse cx="34" cy="18" rx="4.5" ry="8"/></g></svg>',
  hourglass:'<svg class="eyes" viewBox="0 0 46 34" aria-hidden="true"><g transform="translate(9 0)" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M4 3h20M4 31h20M6 3c0 9 8 9 8 14s-8 5-8 14M22 3c0 9-8 9-8 14s8 5 8 14"/></g></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  avatar:'<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#69b8f0"/><path d="M8 64c2-12 12-16 24-16s22 4 24 16z" fill="#1d1d22"/><rect x="26" y="40" width="12" height="10" rx="4" fill="#e8b98c"/><ellipse cx="32" cy="29" rx="13" ry="15" fill="#f2c9a0"/><path d="M18 27c-2-12 6-18 15-17 9 0 15 6 13 17-2-5-4-8-8-9-4 2-14 1-20 9z" fill="#d9a441"/><circle cx="27" cy="31" r="2" fill="#2a1a10"/><circle cx="37" cy="31" r="2" fill="#2a1a10"/><path d="M27 38q5 4 10 0" stroke="#a5563b" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  speakerOn:'<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 10.5v7h4.2l6.3 5V5.5l-6.3 5H4z" fill="#fff"/><path d="M19.5 9.5c2.2 2.5 2.2 6.5 0 9M23 6.5c4 4 4 11 0 15" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>',
  gear:'<svg viewBox="0 0 28 28" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M11.90 5.56L12.19 2.54 L15.81 2.54 L16.10 5.56A8.7 8.7 0 0 1 18.48 6.54L20.82 4.62 L23.38 7.18 L21.46 9.52A8.7 8.7 0 0 1 22.44 11.90L25.46 12.19 L25.46 15.81 L22.44 16.10A8.7 8.7 0 0 1 21.46 18.48L23.38 20.82 L20.82 23.38 L18.48 21.46A8.7 8.7 0 0 1 16.10 22.44L15.81 25.46 L12.19 25.46 L11.90 22.44A8.7 8.7 0 0 1 9.52 21.46L7.18 23.38 L4.62 20.82 L6.54 18.48A8.7 8.7 0 0 1 5.56 16.10L2.54 15.81 L2.54 12.19 L5.56 11.90A8.7 8.7 0 0 1 6.54 9.52L4.62 7.18 L7.18 4.62 L9.52 6.54A8.7 8.7 0 0 1 11.90 5.56 Z"/><circle cx="14" cy="14" r="3.8"/></svg>',
  vibrate:'<svg viewBox="0 0 28 28" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="4" width="10" height="20" rx="3"/><path d="M4.5 10v8M23.5 10v8"/></svg>',
  speakerOff:'<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 10.5v7h4.2l6.3 5V5.5l-6.3 5H4z" fill="#fff"/><path d="M18 10.5l7.5 7M25.5 10.5l-7.5 7" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>'
};
const neu=(soon)=>soon
  ?`<span class="neu soon">${I.lock}<b>BALD</b></span>`
  :'';

/* ---------- Maskottchen ---------- */
function mascot(o={}){
  const {c1='#3d8bff',c2='#1c56c9',glasses=false,mouth='smile',drops=false,brows=false,look=[0,1]}=o;
  const id='g'+Math.random().toString(36).slice(2,8);
  const [dx,dy]=look;
  const eyes=glasses
    ?`<rect x="30" y="78" width="66" height="46" rx="16" fill="#111"/><rect x="104" y="78" width="66" height="46" rx="16" fill="#111"/><rect x="92" y="92" width="16" height="9" fill="#111"/><path d="M42 90l14-6M116 90l14-6" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`
    :`<ellipse cx="66" cy="96" rx="25" ry="33" fill="#fff" stroke="#0a1226" stroke-width="5"/><ellipse cx="134" cy="96" rx="25" ry="33" fill="#fff" stroke="#0a1226" stroke-width="5"/>
      <circle cx="${66+dx*3}" cy="${96+dy*4}" r="12" fill="#0a1226"/><circle cx="${62+dx*3}" cy="${91+dy*4}" r="4" fill="#fff"/>
      <circle cx="${134+dx*3}" cy="${96+dy*4}" r="12" fill="#0a1226"/><circle cx="${130+dx*3}" cy="${91+dy*4}" r="4" fill="#fff"/>`;
  const mo={
    smile:'<path d="M76 176q24 24 48 0" fill="none" stroke="#0a1226" stroke-width="6" stroke-linecap="round"/>',
    worried:'<path d="M74 192q26-22 52 0" fill="none" stroke="#0a1226" stroke-width="6" stroke-linecap="round"/>',
    open:'<ellipse cx="100" cy="182" rx="24" ry="28" fill="#5a0f2a" stroke="#0a1226" stroke-width="5"/><ellipse cx="100" cy="196" rx="14" ry="9" fill="#ff7a90"/>',
    none:''
  }[mouth]||'';
  const br=brows?'<path d="M36 56Q60 42 86 60M164 56Q140 42 114 60" fill="none" stroke="#0a1226" stroke-width="7" stroke-linecap="round"/>':'';
  const dr=drops?'<path d="M22 60q9 15 0 24q-9-9 0-24zM178 44q9 15 0 24q-9-9 0-24z" fill="#bfe6ff" stroke="#6fb4e6" stroke-width="2"/>':'';
  return `<svg viewBox="0 0 200 240" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <path d="M14 240V96C14 42 54 8 100 8s86 34 86 88v144z" fill="url(#${id})" stroke="#0a1226" stroke-width="6"/>
  <ellipse cx="60" cy="40" rx="26" ry="12" fill="#fff" opacity=".2" transform="rotate(-24 60 40)"/>${eyes}${br}${mo}${dr}</svg>`;
}
const gameArt=(id,alt)=>`<div class="art"><img data-gimg="${id}" alt="${alt}" width="720" height="1080" decoding="async"></div>`;
const artBombe=()=>gameArt('bombe','Wer hat die Bombe: zwei erschrockene Freunde vor einer Explosion');
const artBuzzer=()=>gameArt('buzzer','Buzzer Knockout: zwei Freunde kämpfen um einen grünen Buzzer');
const artChooser=()=>gameArt('chooser','Wen trifft es Chooser: ein Freund zeigt grinsend auf den anderen, der mit erhobenen Fäusten vor einem roten Buzzer lächelt');
const artCirca=()=>gameArt('circa','Circa Impostor: zwei Freunde als Cartoon-Figuren mit erhobenen Fäusten vor türkisem Strahlenhintergrund');

/* ---------- Daten ---------- */
const SLIDES=[
  {id:'imposter',l1:'Findet den',l2:'Impostor',l3:'',desc:'Alle kennen das Wort – nur einer nicht. Wer lügen kann, gewinnt.',play:true,alt:'Zwei Freunde als Cartoon-Figuren vor orangem Strahlenhintergrund'},
  {id:'bombe',l1:'Wer hat die',l2:'Bombe',l3:'',desc:'Die Bombe tickt – nenn ein Wort und gib sie weiter. Wer sie hat, verliert.',play:true,art:artBombe},
  {id:'buzzer',l1:'Buzzer',l2:'Knockout',l3:'',desc:'Stoppt die unsichtbare Zeit – wer am nächsten dran ist, gewinnt.',play:true,art:artBuzzer}
];
const GAMES=[
  {id:'imposter',title:'Findet den Impostor',play:true},
  {id:'buzzer',title:'Buzzer Knockout',play:true},
  {id:'bombe',title:'Wer hat die Bombe',play:true},
  {id:'chooser',title:'Wen trifft es Chooser',l1:'Wen trifft es',l2:'Chooser',art:artChooser,play:false},
  {id:'circa',title:'Circa Impostor',l1:'Circa',l2:'Impostor',art:artCirca,play:false}
];
const CATS={
  tiere:{n:'Tiere',e:'🐾',w:['Elefant','Pinguin','Giraffe','Delfin','Eichhörnchen','Krokodil','Papagei','Faultier','Igel','Flamingo','Känguru','Hai','Schmetterling','Waschbär','Nashorn','Otter'],h:['Rüssel','Eis','Hals','Meer','Nuss','Sumpf','Federn','Langsam','Stacheln','Rosa','Beutel','Flosse','Flügel','Maske','Panzer','Fluss']},
  essen:{n:'Essen',e:'🍕',w:['Pizza','Sushi','Döner','Pfannkuchen','Lasagne','Currywurst','Schokolade','Popcorn','Brezel','Spaghetti','Burger','Avocado','Käsekuchen','Pommes','Gulasch','Waffeln'],h:['Käse','Reis','Spieß','Ahornsirup','Schichten','Imbiss','Kakao','Kino','Salz','Nudeln','Brötchen','Grün','Quark','Kartoffel','Eintopf','Puderzucker']},
  orte:{n:'Orte',e:'📍',w:['Strand','Flughafen','Schwimmbad','Bibliothek','Zoo','Kino','Freizeitpark','Bahnhof','Supermarkt','Campingplatz','Krankenhaus','Museum','Fußballstadion','Skigebiet','Leuchtturm','Schule'],h:['Sand','Koffer','Rutsche','Bücher','Tiere','Leinwand','Achterbahn','Gleis','Einkaufswagen','Zelt','Arzt','Ausstellung','Tribüne','Piste','Küste','Klassenzimmer']},
  zuhause:{n:'Zuhause',e:'🏠',w:['Kühlschrank','Zahnbürste','Staubsauger','Sofa','Regenschirm','Föhn','Toaster','Kerze','Wecker','Spiegel','Bügeleisen','Fernbedienung','Teppich','Gießkanne','Schlüssel','Badewanne'],h:['Küche','Zahnpasta','Putzen','Wohnzimmer','Nass','Haare','Brot','Wachs','Morgens','Glas','Hemd','Fernseher','Boden','Blumen','Tür','Schaum']},
  film:{n:'Filme & Serien',e:'🎬',w:['Titanic','Shrek','Harry Potter','Star Wars','Findet Nemo','Herr der Ringe','Die Simpsons','Stranger Things','Jurassic Park','Frozen','Squid Game','Toy Story','Matrix','König der Löwen','Spider-Man','Fluch der Karibik'],h:['Eisberg','Sumpf','Zauberer','Weltraum','Clownfisch','Mittelerde','Gelb','Achtziger','Dinosaurier','Elsa','Überleben','Spielzeug','Neo','Savanne','Netz','Piraten']},
  sport:{n:'Sport',e:'⚽',w:['Fußball','Tennis','Skispringen','Basketball','Schwimmen','Boxen','Golf','Handball','Surfen','Eishockey','Tischtennis','Klettern','Bogenschießen','Volleyball','Skateboard','Formel 1'],h:['Tor','Schläger','Schanze','Korb','Wasser','Handschuhe','Loch','Harz','Welle','Puck','Platte','Seil','Pfeil','Aufschlag','Rollen','Rennwagen']},
  laender:{n:'Länder',e:'🌍',w:['Italien','Japan','Brasilien','Ägypten','Kanada','Spanien','Island','Australien','Türkei','Mexiko','Griechenland','Norwegen','Indien','Schweiz','Thailand','Südafrika'],h:['Rom','Kirschblüte','Karneval','Pyramiden','Ahorn','Stierkampf','Vulkan','Känguru','Istanbul','Tacos','Olymp','Fjord','Curry','Berge','Bangkok','Safari']}
};
const PC=['#fff'];

/* ---------- Zustand ---------- */
const G={phase:'setup',players:['','',''],cats:Object.keys(CATS),k:1,time:3,hint:true,
  idx:0,word:'',cat:'',imp:new Set(),starter:0,picks:new Set(),remaining:0,paused:false,score:[],used:[],ok:false};
const saved=store.get('splash.imposter',null);
if(saved){
  const isDef=p=>typeof p!=='string'||!p.trim()||/^Spieler \d+$/.test(p.trim());
  if(Array.isArray(saved.players)&&saved.players.length>=3&&!saved.players.every(isDef))G.players=saved.players.slice(0,12).map(s=>isDef(s)?'':s.slice(0,14));
  if(Array.isArray(saved.cats)){const cs=saved.cats.filter(c=>CATS[c]);if(cs.length)G.cats=cs}
  if([1,2,3].includes(+saved.k))G.k=+saved.k; if(saved.time!=null&&[0,2,3,5].includes(+saved.time))G.time=+saved.time; if(saved.hint!=null)G.hint=!!saved.hint;
}
const profile=Object.assign({name:''},store.get('splash.profile',null)||{});
profile.name=String(profile.name||'').slice(0,14);
const save=()=>store.set('splash.imposter',{players:G.players,cats:G.cats,k:G.k,time:G.time,hint:G.hint});
const maxK=()=>Math.max(1,Math.min(3,Math.floor((G.players.length-1)/2)));

/* ---------- Startseite ---------- */
function slideHTML(s,i){
  const art=s.art?s.art():`<div class="art"><img data-gimg="imposter" alt="${esc(s.alt)}" width="720" height="1080" decoding="async"></div>`;
  const btn=s.play
    ?`<button class="cta" data-act="play" data-g="${s.id}">${I.play}<span>Spielen</span></button>`
    :`<button class="cta off" data-act="soon" aria-disabled="true">${I.lock}<span>Bald da</span></button>`;
  return `<article class="slide" role="group" aria-roledescription="Folie" aria-label="${esc((s.l1+' '+s.l2+' '+s.l3).trim())}">${art}
    <div class="cap"><h2 class="logo">${ttl(s.l1,'l1')}${ttl(s.l2,'l2')}${s.l3?ttl(s.l3,'l3'):''}</h2>
    <p class="desc">${s.desc}</p><div class="btns">${btn}</div></div></article>`;
}
function cardHTML(g,i){
  if(g.id==='imposter')return `<button class="card" data-act="play" data-g="imposter" aria-label="Impostor spielen">${neu(false)}<img data-gimg="imposter" alt="" decoding="async"><div class="ctitle">${ttl('Findet den','y')}${ttl('Impostor','w')}</div></button>`;
  const s=SLIDES.find(x=>x.id===g.id)||g;   /* Bald-Spiele ohne Karussell-Folie liefern Titel & Bild selbst */
  if(g.play)return `<button class="card" data-act="play" data-g="${g.id}" aria-label="${esc(g.title)} spielen">${neu(false)}${s.art()}<div class="ctitle">${ttl(s.l1,'y')}${ttl(s.l2,'w')}</div></button>`;
  return `<button class="card locked" data-act="soon" aria-disabled="true" aria-label="${esc(g.title)} – bald verfügbar">${neu(true)}${s.art()}<div class="ctitle">${ttl(s.l1,'y')}${ttl(s.l2,'w')}</div></button>`;
}
function renderHome(){
  $('#iSearch').innerHTML=I.search; $('#iSettings').innerHTML=I.gear; $('#iBack').innerHTML=I.back; $('#iSBack').innerHTML=I.back; $('#iQBack').innerHTML=I.back; $('#iSbox').innerHTML=I.search;
  $('#hRecent').textContent='Jetzt spielbar';
  $('#slides').innerHTML=SLIDES.map(slideHTML).join('');
  $('#dots').innerHTML=SLIDES.map((s,i)=>`<button class="dot" data-act="dot" data-i="${i}" aria-label="Folie ${i+1}"><i></i></button>`).join('');
  const soon=GAMES.filter(g=>!g.play);
  $('#rowRecent').innerHTML=GAMES.filter(g=>g.play).map(cardHTML).join('');
  $('#rowSoon').innerHTML=soon.map(cardHTML).join('');
  $('#secSoon').hidden=!soon.length;
  paintImgs();
}

/* Karussell: Überblenden beim Wischen + Endlosschleife */
let pos=0;                                   /* fließende Position, 0 … Anzahl Folien */
const lastW=[];
const mod=(a,n)=>((a%n)+n)%n;
const clamp01=x=>Math.max(0,Math.min(1,x));
let slideEls=[],capOfSlide=[],dotEls=[],carRaf=0;
const lastS=[];
function updateDots(){
  const N=SLIDES.length;
  dotEls.forEach((d,j)=>{
    const w=j===mod(Math.round(pos),N)?1:0,wp=11+25*w;      /* aktiver Punkt sofort voll, alle anderen sofort leer */
    if(lastW[j]!==wp){
      lastW[j]=wp;d.style.width=wp+'px';
      d.setAttribute('aria-current',w?'true':'false');
    }
  });
}
function paintCarousel(){
  const N=slideEls.length,base=Math.floor(pos),f=pos-base,i0=mod(base,N),i1=mod(base+1,N),dom=f<.5?i0:i1;
  slideEls.forEach((el,k)=>{
    let op=0,cap=0,z=0;
    if(k===i0){op=1;cap=clamp01(1-2*f);z=1}
    else if(k===i1&&f>0){op=f;cap=clamp01(2*f-1);z=2}
    const st=lastS[k]||(lastS[k]={});                      /* nur schreiben, wenn sich etwas ändert */
    if(st.op!==op){el.style.opacity=op;st.op=op;const v=op>0;if(st.v!==v){el.style.visibility=v?'visible':'hidden';st.v=v}}
    if(st.z!==z){el.style.zIndex=z;st.z=z}
    if(capOfSlide[k]&&st.cap!==cap){capOfSlide[k].style.opacity=cap;st.cap=cap}
    const inert=k!==dom;if(st.i!==inert){el.toggleAttribute('inert',inert);st.i=inert}
  });
  updateDots();
}
function animateTo(target,dur){
  cancelAnimationFrame(carRaf);
  const from=pos,t0=performance.now();
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)dur=1;
  dur=dur||420;
  if(Math.abs(target-from)<.001){pos=mod(target,slideEls.length);paintCarousel();return}
  const step=t=>{
    const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);
    pos=from+(target-from)*e;paintCarousel();
    if(k<1)carRaf=requestAnimationFrame(step);
    else{pos=mod(target,slideEls.length);paintCarousel()}
  };
  carRaf=requestAnimationFrame(step);
}
function setActive(i){
  const N=slideEls.length;let d=i-mod(Math.round(pos),N);
  if(d>N/2)d-=N;if(d<-N/2)d+=N;
  animateTo(Math.round(pos)+d);
}
function initCarousel(){
  const el=$('#slides');
  slideEls=$$('.slide',el);capOfSlide=slideEls.map(x=>x.querySelector('.cap'));dotEls=$$('.dot');
  let drag=null,suppress=false,cw=1;
  el.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    cancelAnimationFrame(carRaf);
    cw=el.clientWidth||1;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,p0:pos,locked:false,s:[[e.timeStamp,e.clientX]]};
  });
  el.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.locked){
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
      if(Math.abs(dy)>Math.abs(dx)){drag=null;animateTo(Math.round(pos),260);return}
      drag.locked=true;try{el.setPointerCapture(e.pointerId)}catch(_){}
    }
    pos=drag.p0-dx/cw;
    drag.s.push([e.timeStamp,e.clientX]);if(drag.s.length>6)drag.s.shift();
    paintCarousel();
  });
  const end=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const d=drag;drag=null;
    if(!d.locked){animateTo(Math.round(pos),260);return}
    suppress=true;setTimeout(()=>{suppress=false},0);
    const dx=e.clientX-d.x,W=cw,a=d.s[0],b=d.s[d.s.length-1];
    const v=b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0]):0;         /* px pro ms */
    const base=Math.round(d.p0);let target=base;
    if(e.type==='pointerup'&&(Math.abs(dx)>W*.2||Math.abs(v)>.4)){
      const dir=Math.abs(v)>.4?(v<0?1:-1):(dx<0?1:-1);
      target=base+dir;haptic(6);
    }
    animateTo(target);
  };
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',end);
  el.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault()}},true);
  paintCarousel();
}

/* Titel schrumpft beim Scrollen, Bild dehnt sich beim Ziehen (nur Transforms) */
function initScroll(){
  const app=$('#app'),top=$('.top'),bg=$('.topbg'),brand=$('.brand'),tools=$('.tools');
  const capEls=$$('.cap'),dotsEl=$('#dots'),below=$('.below'),imgs=$$('.slide .art>img');
  const ease=x=>x*x*(3-2*x);
  let W=0,bw=0,imgH=600,lastP=-1,raf=0,pullRaf=0,target=0,ty=null,tx=0;
  function measure(){W=top.clientWidth;bw=brand.offsetWidth;imgH=(imgs[0]&&imgs[0].offsetHeight)||600;lastP=-1;onScroll()}
  function onScroll(){
    raf=0;
    const p=ease(Math.min(1,Math.max(0,window.scrollY)/90));
    if(Math.abs(p-lastP)<.001)return;
    lastP=p;
    const s=1-.42*p,x=((W-bw*s)/2-20)*p,up=-5*p;
    brand.style.transform='translate3d('+x.toFixed(2)+'px,'+up.toFixed(2)+'px,0) scale('+s.toFixed(4)+')';
    tools.style.transform='translate3d(0,'+up.toFixed(2)+'px,0) scale('+(1-.14*p).toFixed(4)+')';
    bg.style.transform='translate3d(0,'+(-16*p).toFixed(2)+'px,0)';
  }
  function setPull(v){
    pullRaf=0;
    const y='translate3d(0,'+v.toFixed(1)+'px,0)';
    capEls.forEach(e=>e.style.transform=y);
    dotsEl.style.transform=y;below.style.transform=y;
    const sc='scale('+(1+v/imgH).toFixed(4)+')';
    imgs.forEach(im=>im.style.transform=sc);
  }
  const queue=v=>{target=v;if(!pullRaf)pullRaf=requestAnimationFrame(()=>setPull(target))};
  window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(onScroll)},{passive:true});
  let rz=0;window.addEventListener('resize',()=>{if(!rz)rz=requestAnimationFrame(()=>{rz=0;measure()})});
  document.addEventListener('touchstart',e=>{
    const blocked=overlayOpen()||$('.modal');
    if(window.scrollY<=0&&!blocked&&e.touches.length===1){ty=e.touches[0].clientY;tx=e.touches[0].clientX}else ty=null;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(ty===null)return;
    const dy=e.touches[0].clientY-ty,dx=e.touches[0].clientX-tx;
    if(dy>4&&Math.abs(dy)>Math.abs(dx)&&window.scrollY<=0){
      app.classList.add('pulling');
      queue(150*(1-Math.exp(-dy/240)));
    }else if(target){queue(0)}
  },{passive:true});
  const end=()=>{ty=null;app.classList.remove('pulling');queue(0)};
  document.addEventListener('touchend',end,{passive:true});
  document.addEventListener('touchcancel',end,{passive:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',measure);
  imgs.forEach(im=>{if(!im.complete)im.addEventListener('load',measure,{once:true})});
  measure();
}

/* Gleicher Zieh-Effekt wie im Hauptmenü, aber fürs Spiel-Hero-Bild (eigener Scroll-Container) */
function initGameHeroPull(){
  let gty=null,gtx=0,gTarget=0,gRaf=0,gImgH=600,hImg=null,hCap=null,hPad=null;
  const setGPull=v=>{
    gRaf=0;
    if(!hImg)return;
    hImg.style.transform='scale('+(1+v/gImgH).toFixed(4)+')';
    const y='translate3d(0,'+v.toFixed(1)+'px,0)';
    if(hCap)hCap.style.transform=y;
    if(hPad)hPad.style.transform=y;
  };
  const queueG=v=>{gTarget=v;if(!gRaf)gRaf=requestAnimationFrame(()=>setGPull(gTarget))};
  gBody.addEventListener('touchstart',e=>{
    if(!gameEl.classList.contains('open')||!gBody.classList.contains('gsetup')||e.touches.length!==1){gty=null;return}
    if(gBody.scrollTop<=0){
      gty=e.touches[0].clientY;gtx=e.touches[0].clientX;
      hImg=gBody.querySelector('.ghero>img');hCap=gBody.querySelector('.gcap');hPad=gBody.querySelector('.gpad');
      gImgH=(hImg&&hImg.offsetHeight)||600;
    }else gty=null;
  },{passive:true});
  gBody.addEventListener('touchmove',e=>{
    if(gty===null)return;
    const dy=e.touches[0].clientY-gty,dx=e.touches[0].clientX-gtx;
    if(dy>4&&Math.abs(dy)>Math.abs(dx)&&gBody.scrollTop<=0){
      e.preventDefault();
      gBody.classList.add('pulling');
      queueG(150*(1-Math.exp(-dy/240)));
    }else if(gTarget){queueG(0)}
  },{passive:false});
  const endG=()=>{gty=null;gBody.classList.remove('pulling');queueG(0)};
  gBody.addEventListener('touchend',endG,{passive:true});
  gBody.addEventListener('touchcancel',endG,{passive:true});
}

/* ---------- Modals & Toast ---------- */
let modalReturn=null;
function closeModal(){
  const m=$('.modal');if(!m)return;
  m.remove();
  const r=modalReturn;modalReturn=null;
  if(r&&r.isConnected&&!r.closest('[inert]')){try{r.focus({preventScroll:true})}catch(e){}}
}
function modal(inner){
  closeModal();
  modalReturn=document.activeElement;
  const m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="scrim" data-act="closeModal"></div><div class="msheet" role="dialog" aria-modal="true" tabindex="-1"><div class="grab"></div>${inner}</div>`;
  const sh=m.querySelector('.msheet'),h=sh.querySelector('.mh');
  if(h){h.id='mhead';sh.setAttribute('aria-labelledby','mhead')}
  document.body.appendChild(m);
  requestAnimationFrame(()=>{m.classList.add('in');const b=sh.querySelector('button');(b||sh).focus({preventScroll:true})});
  return m;
}
let tt;
function toast(msg){
  let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200);
}
function howTo(){
  if(cur==='bombe'){
    modal(`<h3 class="mh">So wird Wer hat die Bombe gespielt</h3><ol class="steps">
    <li><b>Kategorie lesen</b><span>Oben steht, was gesucht wird – zum Beispiel „Wörter mit E“.</span></li>
    <li><b>Wort sagen</b><span>Wer das Handy hat, nennt schnell ein passendes Wort. Kein Wort doppelt.</span></li>
    <li><b>Weitergeben</b><span>Sofort ans nächste Handy weitergeben – die Zündschnur brennt gleichmäßig herunter.</span></li>
    <li><b>Peng</b><span>Wer die Bombe beim Explodieren in der Hand hält, verliert die Runde.</span></li></ol>
    <div class="mbtns"><button class="cta" data-act="closeModal">Alles klar</button></div>`);
    return;
  }
  if(cur==='buzzer'){
    modal(`<h3 class="mh">So wird Buzzer Knockout gespielt</h3><ol class="steps">
    <li><b>Zeit wählen</b><span>Einigt euch auf eine Zielzeit, zum Beispiel 10 Sekunden. Oder nehmt den Impostor-Modus: Dann kennt einer die Zeit nicht.</span></li>
    <li><b>Reihum starten</b><span>Das Handy geht herum. Nach dem Start läuft die Zeit unsichtbar.</span></li>
    <li><b>Buzzer drücken</b><span>Tippe auf den Buzzer, sobald du glaubst, dass die Zielzeit um ist.</span></li>
    <li><b>Auflösen</b><span>Wer am nächsten an der Zielzeit war, gewinnt. Im Impostor-Modus seht ihr alle Zeiten und stimmt ab, wer die Zeit nicht kannte.</span></li></ol>
    <div class="mbtns"><button class="cta" data-act="closeModal">Alles klar</button></div>`);
    return;
  }
  modal(`<h3 class="mh">So wird Impostor gespielt</h3><ol class="steps">
    <li><b>Karten aufdecken</b><span>Das Handy geht reihum. Jeder sieht heimlich sein Wort – nur der Impostor bekommt keins.</span></li>
    <li><b>Hinweise geben</b><span>Reihum nennt jeder einen Begriff zum Wort, ohne es zu verraten. Der Impostor lügt mit.</span></li>
    <li><b>Abstimmen</b><span>Einigt euch, wer der Impostor sein könnte.</span></li>
    <li><b>Auflösen</b><span>Wort und Impostor werden aufgedeckt. Ein erwischter Impostor darf das Wort noch raten.</span></li></ol>
    <div class="mbtns"><button class="cta" data-act="closeModal">Alles klar</button></div>`);
}
const normQ=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function renderSearch(q){
  const box=$('#sres');
  if(!box.dataset.built){
    box.innerHTML=GAMES.map(g=>`<button class="sr" data-act="${g.play?'srPlay':'soon'}" ${g.play?'data-g="'+g.id+'"':'aria-disabled="true"'}><span class="th">${IMGS[g.id]?'<img data-gimg="'+g.id+'" alt="" decoding="async">':mascot({c1:g.id==='bombe'?'#ffa552':'#ff6f9c',c2:g.id==='bombe'?'#e0662a':'#c9316a',mouth:'smile'})}</span>${esc(g.title)}${g.play?'':`<em class="lk" aria-label="Bald verfügbar">${I.lock}</em>`}</button>`).join('')+'<p class="dim c none" style="margin-top:20px" hidden>Kein Spiel gefunden.</p>';
    paintImgs(box);box.dataset.built='1';
  }
  q=normQ(q.trim());let hits=0;
  $$('.sr',box).forEach((el,i)=>{const g=GAMES[i],hit=!q||normQ(g.title+' '+g.id).includes(q);el.hidden=!hit;if(hit)hits++});
  $('.none',box).hidden=hits>0;
}
function openProfile(){
  modal(`<h3 class="mh c">Dein Profil</h3><div class="bigav">${I.avatar}</div><div class="pform"><label for="pname">Dein Name</label><input id="pname" value="${esc(profile.name||'')}" maxlength="14" placeholder="Name eingeben" autocomplete="off"></div><p class="dim small" style="margin-top:10px">Dein Name wird im Impostor automatisch als erster Spieler eingetragen.</p><div class="mbtns"><button class="cta" data-act="profileDone">Fertig</button></div>`);
}

/* ---------- Spiel ---------- */
const gameEl=$('#game'),gTitle=$('#gTitle'),gBody=$('#gBody'),gFoot=$('#gFoot');
let cur='imposter';
const appEl=$('#app'),settingsEl=$('#settings'),searchEl=$('#search');
const overlayOpen=()=>gameEl.classList.contains('open')||settingsEl.classList.contains('open')||searchEl.classList.contains('open');
/* Scroll sperren + Hintergrund inert schalten, solange ein Vollbild-Overlay offen ist */
function syncOverlays(){
  const o=overlayOpen();
  document.documentElement.style.overflow=o?'hidden':'';
  appEl.toggleAttribute('inert',o);
}
const refocus=el=>{if(el&&el.isConnected&&!el.closest('[inert]')){try{el.focus({preventScroll:true})}catch(e){}}};
let gameOpener=null;
function openGame(id,from){
  cur=(id==='buzzer'||id==='bombe')?id:'imposter';
  gameEl.setAttribute('aria-label',gName());
  if(cur==='buzzer'){if(!B.players[0]&&profile.name)B.players[0]=profile.name;B.phase='setup'}
  else if(cur==='bombe')Z.phase='setup';
  else{if(!G.players[0]&&profile.name)G.players[0]=profile.name;G.phase='setup'}
  ddOpen=false;
  gameOpener=(from&&from.isConnected)?from:document.activeElement;
  gameEl.classList.add('open');gameEl.removeAttribute('inert');gameEl.setAttribute('aria-hidden','false');
  syncOverlays();render();
  refocus($('#iBack'));
}
function closeGame(){
  stopTimer();cdStop();zStop();B.t0=0;gameEl.classList.remove('open');gameEl.setAttribute('inert','');gameEl.setAttribute('aria-hidden','true');
  syncOverlays();refocus(gameOpener);gameOpener=null;
}
/* ---------- Einstellungen (Vollbild) ---------- */
function openSearch(){
  const q=$('#sq');q.value='';renderSearch('');searchEl.scrollTop=0;
  searchEl.classList.add('open');searchEl.removeAttribute('inert');searchEl.setAttribute('aria-hidden','false');
  syncOverlays();
  setTimeout(()=>q.focus({preventScroll:true}),120);
}
function closeSearch(noFocus){
  $('#sq').blur();
  searchEl.classList.remove('open');searchEl.setAttribute('inert','');searchEl.setAttribute('aria-hidden','true');
  syncOverlays();
  if(!noFocus)refocus($('#iSearch'));
}
function renderSettings(){
  $('#sBody').innerHTML=`<h3 class="sec">Ton &amp; Feedback</h3>
  <label class="toggle"><span class="ti">${settings.sound?I.speakerOn:I.speakerOff}</span><span class="tx"><b>Ton</b><small>Klänge in der App. Aus heißt stumm.</small></span><input type="checkbox" data-act="setSound" ${settings.sound?'checked':''}><i></i></label>
  <label class="toggle"><span class="ti">${I.vibrate}</span><span class="tx"><b>Vibration</b><small>Kurzes Vibrieren beim Tippen und im Spiel.</small></span><input type="checkbox" data-act="setHaptic" ${settings.haptic?'checked':''}><i></i></label>
  <p class="egg">Fick dein Gött.</p>`;
}
function openSettings(){
  renderSettings();settingsEl.scrollTop=0;
  settingsEl.classList.add('open');settingsEl.removeAttribute('inert');settingsEl.setAttribute('aria-hidden','false');
  syncOverlays();
  requestAnimationFrame(()=>{const b=$('#iSBack');b&&b.focus({preventScroll:true})});
}
function closeSettings(){
  settingsEl.classList.remove('open');settingsEl.setAttribute('inert','');settingsEl.setAttribute('aria-hidden','true');
  syncOverlays();
  refocus($('#iSettings'));
}

const kickPaint=()=>{gBody.style.transform='translateZ(0)';void gBody.offsetHeight;gBody.style.transform=''};
function setLayout(setup){gameEl.classList.toggle('sethero',setup);gBody.classList.toggle('gsetup',setup)}
/* Hero-Bild + Titel nur einmal aufbauen; beim Hinzufügen/Entfernen von Spielern wird nur der Inhalt darunter getauscht */
function setShell(id,pad){
  const gp=gBody.dataset.hero===id&&gBody.querySelector('.gpad');
  if(gp){gp.innerHTML=pad;return}
  gBody.innerHTML=ghero(id)+'<div class="gpad">'+pad+'</div>';
  gBody.dataset.hero=id;
  paintImgs(gBody);
}
const gName=()=>cur==='buzzer'?'Buzzer Knockout':cur==='bombe'?'Wer hat die Bombe':'Impostor';
const curPhase=()=>cur==='buzzer'?B.phase:cur==='bombe'?Z.phase:G.phase;
const isSetup=()=>curPhase()==='setup';
const ghero=id=>{const s=SLIDES.find(x=>x.id===id);return `<div class="ghero"><img data-gimg="${id}" alt="" decoding="async"><div class="gcap"><h2 class="logo">${ttl(s.l1,'l1')}${ttl(s.l2,'l2')}</h2><p class="desc">${s.desc}</p></div></div>`};
function render(){if(cur==='buzzer'){bRender();return}if(cur==='bombe'){zRender();return}setLayout(G.phase==='setup');({setup:rSetup,pass:rPass,discuss:rDiscuss,vote:rVote,result:rResult})[G.phase]();gBody.scrollTop=0;if(isSetup())kickPaint()}

function footSetup(){
  const ok=G.players.length>=3&&G.cats.length>0;
  gFoot.innerHTML=`<button class="cta" data-act="start" ${ok?'':'disabled'}>${I.play}<span>Spielen</span></button>${ok?'':'<p class="fnote">Wähle mindestens eine Kategorie.</p>'}`;
}
let ddOpen=false;
const catLabel=()=>{
  const all=Object.keys(CATS),sel=all.filter(k=>G.cats.includes(k));
  if(sel.length===all.length)return 'Alle Kategorien';
  if(!sel.length)return 'Keine ausgewählt';
  if(sel.length===1)return CATS[sel[0]].e+' '+CATS[sel[0]].n;
  if(sel.length===2)return sel.map(k=>CATS[k].n).join(', ');
  return sel.length+' Kategorien';
};
function syncCats(){
  $$('[data-act="cat"]').forEach(b=>b.setAttribute('aria-pressed',String(G.cats.includes(b.dataset.k))));
  const a=$('[data-act="catall"]');if(a)a.setAttribute('aria-pressed',String(G.cats.length===Object.keys(CATS).length));
  const l=$('#ddLabel');if(l)l.textContent=catLabel();
  save();footSetup();
}
function syncDD(){
  const l=$('.ddlist'),b=$('.ddbtn');if(!l||!b)return;
  l.hidden=!ddOpen;b.setAttribute('aria-expanded',String(ddOpen));
}
document.addEventListener('click',e=>{if(ddOpen&&!e.target.closest('.dd')){ddOpen=false;syncDD()}});
function rSetup(){
  stopTimer();gTitle.textContent='Impostor';
  const n=G.players.length,mk=maxK();if(G.k>mk)G.k=mk;
  const pad=`
  <h3 class="sec">Spieler <small>${n} dabei</small></h3>
  <div class="plist">${G.players.map((p,i)=>`<div class="pf"><i class="pc" style="background:${PC[i%PC.length]}">${i+1}</i><input type="text" data-i="${i}" value="${esc(p)}" placeholder="Spieler ${i+1}" maxlength="14" aria-label="Name von Spieler ${i+1}" autocomplete="off" enterkeyhint="done">${n>3?`<button class="x" data-act="rm" data-i="${i}" aria-label="Spieler ${i+1} entfernen">×</button>`:''}</div>`).join('')}</div>
  ${n<12?'<button class="ghost" data-act="add">+ Spieler hinzufügen</button>':''}
  <h3 class="sec">Kategorien</h3>
  <div class="dd"><button class="ddbtn" data-act="ddcat" aria-expanded="${ddOpen}" aria-haspopup="true"><span id="ddLabel">${esc(catLabel())}</span><svg viewBox="0 0 14 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5l5.5 5.5 5.5-5.5"/></svg></button>
  <div class="ddlist" role="group" aria-label="Kategorien" ${ddOpen?'':'hidden'}>
    <button class="pick all" data-act="catall" aria-pressed="${G.cats.length===Object.keys(CATS).length}"><span class="em">✨</span><span>Alle Kategorien</span><em class="ck">${I.check}</em></button>
    ${Object.entries(CATS).map(([k,c])=>`<button class="pick" data-act="cat" data-k="${k}" aria-pressed="${G.cats.includes(k)}"><span class="em">${c.e}</span><span>${c.n}</span><em class="ck">${I.check}</em></button>`).join('')}
  </div></div>
  <h3 class="sec">Anzahl Impostor</h3>
  <div class="seg" role="group" aria-label="Anzahl Impostor">${[1,2,3].filter(v=>v<=mk).map(v=>`<button data-act="k" data-v="${v}" aria-pressed="${G.k===v}">${v}</button>`).join('')}</div>
  <h3 class="sec">Diskussionszeit</h3>
  <div class="seg" role="group" aria-label="Diskussionszeit">${[[0,'Aus'],[2,'2 Min'],[3,'3 Min'],[5,'5 Min']].map(([v,l])=>`<button data-act="time" data-v="${v}" aria-pressed="${G.time===v}">${l}</button>`).join('')}</div>
  <label class="toggle"><span><b>Impostor bekommt ein Hilfswort</b><small>Ein Begriff, der zum Wort passt – macht das Lügen leichter.</small></span><input type="checkbox" data-act="hint" ${G.hint?'checked':''}><i></i></label>`;
  setShell('imposter',pad);
  footSetup();
}

function start(fresh){
  G.players=G.players.map((p,i)=>(p||'').trim()||('Spieler '+(i+1)));
  if(G.k>maxK())G.k=maxK();
  save();
  if(fresh||G.score.length!==G.players.length)G.score=G.players.map(()=>0);
  const n=G.players.length;
  const cat=pick(G.cats);
  let pool=CATS[cat].w.filter(w=>!G.used.includes(w));
  if(!pool.length){pool=CATS[cat].w;G.used=[]}
  G.word=pick(pool);G.used.push(G.word);G.cat=cat;G.hw=CATS[cat].h[CATS[cat].w.indexOf(G.word)]||'';
  G.imp=new Set(shuffle(Array.from({length:n},(_,i)=>i)).slice(0,G.k));
  G.starter=Math.floor(Math.random()*n);
  G.idx=0;G.phase='pass';render();
}

function rPass(){
  const n=G.players.length,i=G.idx,isImp=G.imp.has(i),c=CATS[G.cat];
  gTitle.textContent='Impostor';
  const front=isImp
    ?`<small>Du bist der</small><strong class="word">Impostor</strong><em class="tag">${G.hint&&G.hw?'Hilfswort: '+esc(G.hw):'Kein Hilfswort'}</em>`
    :`<small>Dein Wort</small><strong class="word ${G.word.length>11?'long':''}">${esc(G.word)}</strong><em class="tag">${c.e} ${c.n}</em>`;
  gBody.innerHTML=`<div class="pass"><div class="prog" aria-hidden="true">${G.players.map((_,j)=>`<i class="${j<i?'done':j===i?'now':''}"></i>`).join('')}</div>
    <p class="dim">Gib das Handy an</p><h2 class="who">${esc(G.players[i])}</h2>
    <button class="flip" id="flip" data-act="flip" aria-pressed="false" aria-label="Karte aufdecken oder verdecken"><span class="inner">
      <span class="face back"><span class="mm qmark" aria-hidden="true">?</span><b>Tippe zum Aufdecken</b></span>
      <span class="face front ${isImp?'imp':''}">${front}</span></span></button>
    <p class="dim small">Nur du darfst die Karte sehen.</p></div>`;
  gFoot.innerHTML=`<button class="cta" id="nextBtn" data-act="next" disabled><span>${i<n-1?'Verstanden':'Alle bereit – los'}</span></button>`;
}

/* Karte umdrehen: Tippen ODER Wischen. Beim Wischen folgt die Karte dem Finger (langsam wischen = langsam drehen),
   beim Loslassen rastet sie auf der näheren Seite ein; ein schneller Wisch dreht sie direkt ganz um. */
function setFlip(on,quiet){
  const f=$('#flip');if(!f)return;
  const was=f.classList.contains('rev');
  f.classList.toggle('rev',on);f.setAttribute('aria-pressed',String(on));
  if(on){if(!was&&!quiet){sfx.flip();haptic(20)}const nb=$('#nextBtn');if(nb)nb.disabled=false}
}
let fd=null,fdSnap=false,fdClick=false;
const flipHit=e=>cur==='imposter'&&G.phase==='pass'&&e.target&&e.target.closest&&e.target.closest('#flip');
function flipDown(f,id,x,y,ts){
  if(fd||fdSnap)return;
  const base=f.classList.contains('rev')?180:0;
  fd={f,inner:f.querySelector('.inner'),id,x0:x,y0:y,base,ang:base,drag:false,lx:x,lt:ts,v:0,w:f.getBoundingClientRect().width};
}
function flipMove(x,y,ts,capture){
  if(!fd)return false;
  const dx=x-fd.x0,dy=y-fd.y0;
  if(!fd.drag){
    if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){fd=null;return false}   /* senkrechte Geste: Seite scrollen lassen */
    if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy))return false;
    fd.drag=true;fd.inner.style.transition='none';
    if(capture)capture();
  }
  const dt=ts-fd.lt;
  if(dt>0)fd.v=.75*fd.v+.25*((x-fd.lx)/dt);
  fd.lx=x;fd.lt=ts;
  fd.ang=Math.max(fd.base-180,Math.min(fd.base+180,fd.base+dx*180/(fd.w*.8)));
  fd.inner.style.transform='rotateY('+fd.ang+'deg)';
  return true;
}
function flipRelease(cancelled){
  if(!fd)return false;
  const d=fd;fd=null;
  if(!d.drag)return false;                              /* normaler Tipp: der Klick übernimmt */
  fdClick=true;setTimeout(()=>{fdClick=false},350);
  let t=Math.round(d.ang/180)*180;
  if(!cancelled&&Math.abs(d.v)>.45&&Math.abs(d.ang-d.base)>14)t=d.base+(d.v>0?180:-180);
  t=Math.max(d.base-180,Math.min(d.base+180,t));
  const on=Math.abs(Math.round(t/180))%2===1;
  if(on&&!d.base){sfx.flip();haptic(20)}
  if(on){const nb=$('#nextBtn');if(nb)nb.disabled=false}
  fdSnap=true;
  d.inner.style.transition='transform .42s var(--ease)';
  d.inner.style.transform='rotateY('+t+'deg)';
  let done=false;
  const fin=()=>{
    if(done)return;done=true;fdSnap=false;
    d.inner.style.transition='none';d.inner.style.transform='';
    if(d.f.isConnected&&d.f===$('#flip'))setFlip(on,true);
    void d.inner.offsetWidth;d.inner.style.transition='';
  };
  d.inner.addEventListener('transitionend',fin,{once:true});
  setTimeout(fin,560);
  return true;
}
/* Touch (Handy): eigene Touch-Events, damit es auf iOS und Android zuverlässig läuft */
document.addEventListener('touchstart',e=>{
  if(e.touches.length!==1){if(fd&&fd.drag)flipRelease(true);else fd=null;return}
  const f=flipHit(e);if(!f)return;
  const t=e.touches[0];flipDown(f,'t',t.clientX,t.clientY,e.timeStamp);
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!fd||fd.id!=='t')return;
  const t=e.touches[0];
  if(flipMove(t.clientX,t.clientY,e.timeStamp)&&e.cancelable)e.preventDefault();
},{passive:false});
document.addEventListener('touchend',e=>{
  if(!fd||fd.id!=='t')return;
  const was=fd.drag;flipRelease(false);
  if(was&&e.cancelable)e.preventDefault();             /* keinen Fremd-Klick nach dem Wischen auslösen */
},{passive:false});
document.addEventListener('touchcancel',()=>{if(fd&&fd.id==='t')flipRelease(true)},{passive:true});
/* Maus / Stift (Desktop) */
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||(e.pointerType==='mouse'&&e.button!==0))return;
  const f=flipHit(e);if(!f)return;
  flipDown(f,e.pointerId,e.clientX,e.clientY,e.timeStamp);
});
document.addEventListener('pointermove',e=>{
  if(!fd||fd.id!==e.pointerId)return;
  flipMove(e.clientX,e.clientY,e.timeStamp,()=>{try{fd.f.setPointerCapture(e.pointerId)}catch(_){}});
});
document.addEventListener('pointerup',e=>{if(fd&&fd.id===e.pointerId)flipRelease(false)});
document.addEventListener('pointercancel',e=>{if(fd&&fd.id===e.pointerId)flipRelease(true)});
document.addEventListener('click',e=>{if(fdClick&&e.target.closest&&e.target.closest('#flip')){e.stopPropagation();e.preventDefault()}},true);

let tick=null,tnumEl=null,arcEl=null;
const RC=2*Math.PI*96;
function stopTimer(){clearInterval(tick);tick=null}
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function paintTimer(){
  if(!tnumEl||!arcEl)return;
  tnumEl.textContent=fmt(G.remaining);
  arcEl.style.strokeDashoffset=RC*(1-G.remaining/(G.time*60));
  arcEl.classList.toggle('low',G.remaining<=15);
}
/* Restzeit aus einem Zieltermin berechnen: kein Drift, auch wenn der Browser im Hintergrund drosselt */
function timerStep(){
  if(G.paused||tick===null)return;
  const r=Math.max(0,Math.ceil((G.endAt-performance.now())/1000));
  if(r===G.remaining)return;
  G.remaining=r;paintTimer();
  if(r>0&&r<=5){sfx.tick();haptic(15)}
  if(r<=0){stopTimer();sfx.alarm();haptic([250,120,250]);toast('Zeit ist um!');goVote()}
}
function startTimer(){
  stopTimer();
  tnumEl=$('#tnum');arcEl=$('#arc');
  G.endAt=performance.now()+G.remaining*1000;
  paintTimer();
  tick=setInterval(timerStep,200);
}
function rDiscuss(){
  gTitle.textContent='Impostor';
  const total=G.time*60;
  const ring=total
    ?`<div class="ring"><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="96" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="14"/><circle id="arc" class="arc" cx="110" cy="110" r="96" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-dasharray="${RC}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/></svg><div class="tnum" id="tnum" role="timer">${fmt(G.remaining)}</div></div>`
    :`<p class="nolimit">Ohne Zeitlimit</p>`;
  gBody.innerHTML=`<div class="disc"><p class="dim">Es beginnt</p><h2 class="who">${esc(G.players[G.starter])}</h2>${ring}
    <p class="dim c hint">Nennt reihum einen Begriff, der zum Wort passt – ohne es zu verraten. Der Impostor versucht mitzuhalten.</p></div>`;
  gFoot.innerHTML=`<div class="frow">${total?`<button class="round" id="pauseBtn" data-act="pause" aria-label="Timer pausieren" style="width:58px;height:58px">${G.paused?I.resume:I.pause}</button>`:''}<button class="cta" data-act="tovote">Abstimmen</button></div>`;
  if(total)startTimer();
}
function goVote(){stopTimer();G.phase='vote';G.picks=new Set();render()}

function rVote(){
  gTitle.textContent='Impostor';
  gBody.innerHTML=`<div class="vote"><h2 class="who sm">Wer ist der Impostor?</h2><p class="dim c">Einigt euch auf ${G.k===1?'eine Person':G.k+' Personen'}.</p>
    <div class="plist v">${G.players.map((p,i)=>`<button class="pick" data-act="pick" data-i="${i}" aria-pressed="${G.picks.has(i)}"><i class="pc" style="background:${PC[i%PC.length]}">${i+1}</i><span>${esc(p)}</span><em class="ck">${I.check}</em></button>`).join('')}</div></div>`;
  gFoot.innerHTML=`<button class="cta" data-act="resolve" ${G.picks.size===G.k?'':'disabled'}><span>Auflösen</span></button>`;
}
function resolve(){
  const ok=G.picks.size===G.imp.size&&[...G.imp].every(i=>G.picks.has(i));
  G.ok=ok;
  G.players.forEach((_,i)=>{if(G.imp.has(i)){if(!ok)G.score[i]+=2}else if(ok)G.score[i]+=1});
  if(ok){sfx.success();haptic([15,60,15,60,15])}else{sfx.fail();haptic([40,30,80])}
  G.phase='result';render();
}
function rResult(){
  gTitle.textContent='Impostor';
  const c=CATS[G.cat],ok=G.ok,plural=G.imp.size>1;
  const chip=(i,cls)=>`<span class="rchip ${cls||''}"><i class="pc" style="background:${PC[i%PC.length]}">${i+1}</i>${esc(G.players[i])}</span>`;
  gBody.innerHTML=`<div class="res"><h2 class="logo"><span class="l2 ${ok?'':'bad'}">${ok?'Crew':'Impostor'}</span><span class="l3">gewinnt!</span></h2>
    <div class="rcard"><p class="lbl">Das Wort war</p><p class="big">${esc(G.word)}</p>${G.hint&&G.hw?`<p class="dim small" style="margin-top:4px">Hilfswort: <b style="color:#fff">${esc(G.hw)}</b></p>`:''}<p class="dim small" style="margin-top:${G.hint&&G.hw?'6':'4'}px">${c.e} ${c.n}</p></div>
    <div class="rcard"><p class="lbl">${plural?'Die Impostor waren':'Der Impostor war'}</p><div class="rchips">${[...G.imp].map(i=>chip(i,'bad')).join('')}</div></div>
    <div class="rcard"><p class="lbl">Euer Tipp</p><div class="rchips">${[...G.picks].map(i=>chip(i,G.imp.has(i)?'good':'bad')).join('')}</div></div>
    ${ok?`<p class="tip">Letzte Chance: ${plural?'Die Impostor dürfen':'Der Impostor darf'} jetzt das Wort raten. ${plural?'Treffen sie':'Trifft er'}, dreht sich das Spiel.</p>`:''}</div>`;
  gFoot.innerHTML=`<div class="frow"><button class="round big" data-act="edit" aria-label="Spieler ändern" title="Spieler ändern">${I.back}</button><button class="cta" data-act="again"><span>Nochmal spielen</span></button></div>`;
}
function confirmQuit(){
  modal(`<h3 class="mh">Runde abbrechen?</h3><p class="dim">Der aktuelle Fortschritt geht verloren.</p><div class="mbtns"><div class="frow"><button class="round big red" data-act="quit" aria-label="Runde abbrechen" title="Runde abbrechen"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><button class="cta" data-act="closeModal">Weiterspielen</button></div></div>`);
}

/* ---------- Buzzer Knockout ---------- */
const BMAX=8;
const B={phase:'setup',players:['',''],target:10,impMode:false,imp:-1,vote:-1,idx:0,times:[],win:[],score:[],round:0,t0:0,lock:0};
const bSaved=store.get('splash.buzzer',null);
if(bSaved){
  if(Array.isArray(bSaved.players)&&bSaved.players.length>=2)B.players=bSaved.players.slice(0,BMAX).map(s=>typeof s==='string'?s.slice(0,14):'');
  if(bSaved.target>=1&&bSaved.target<=60)B.target=Math.round(bSaved.target);
  B.impMode=!!bSaved.impMode;
}
const bSave=()=>store.set('splash.buzzer',{players:B.players,target:B.target,impMode:B.impMode});
const fc=c=>(c/100).toFixed(2).replace('.',',');            /* Hundertstel -> "9,84" */
const bUnit=()=>B.target===1?'Sekunde':'Sekunden';
function bRender(){holdStop();cdStop();setLayout(B.phase==='setup');({setup:bSetup,turn:bTurn,cdown:bCount,run:bRun,vote:bVote,result:bResult})[B.phase]();gBody.scrollTop=0;if(isSetup())kickPaint()}

function bSetup(){
  B.t0=0;gTitle.textContent='Buzzer Knockout';
  const n=B.players.length,im=B.impMode;
  const pad=`
  <label class="toggle"><span><b>Impostor-Modus</b><small>Ein Spieler bekommt die Zielzeit nicht mitgeteilt.</small></span><input type="checkbox" data-act="bimp" ${im?'checked':''}><i></i></label>
  <h3 class="sec">Zielzeit <small>${im?'Zufällig – einer kennt sie nicht':'Die Zeit läuft unsichtbar'}</small></h3>
  <div class="tsel${im?' off':''}"><button class="round" data-act="btarget" data-d="-1" ${im?'aria-disabled="true" ':''}aria-label="Eine Sekunde weniger">−</button><div class="tval" role="status"><b id="tval">${im?'?':B.target}</b><span id="tunit">${im?'Zufallszeit':bUnit()}</span></div><button class="round" data-act="btarget" data-d="1" ${im?'aria-disabled="true" ':''}aria-label="Eine Sekunde mehr">+</button></div>
  <select class="tselect" id="tsel" data-act="btime" ${im?'disabled aria-disabled="true" ':''}aria-label="Zielzeit auswählen">${bTimeOpts()}</select>
  ${im?'<p class="fnote" style="margin-top:12px">Alle bekommen die geheime Zeit – nur einer nicht. Am Ende seht ihr alle Zeiten und stimmt ab.</p>':''}
  <h3 class="sec">Spieler <small>${n} dabei</small></h3>
  <div class="plist">${B.players.map((p,i)=>`<div class="pf"><i class="pc" style="background:${PC[i%PC.length]}">${i+1}</i><input type="text" data-b="1" data-i="${i}" value="${esc(p)}" placeholder="Spieler ${i+1}" maxlength="14" aria-label="Name von Spieler ${i+1}" autocomplete="off" enterkeyhint="done">${n>2?`<button class="x" data-act="brm" data-i="${i}" aria-label="Spieler ${i+1} entfernen">×</button>`:''}</div>`).join('')}</div>
  ${n<BMAX?'<button class="ghost" data-act="badd">+ Spieler hinzufügen</button>':''}`;
  setShell('buzzer',pad);
  bFoot();
}
function bFoot(){
  const ok=!B.impMode||B.players.length>=3;
  gFoot.innerHTML=`<button class="cta" data-act="bstart" ${ok?'':'disabled'}>${I.play}<span>Spielen</span></button>${ok?'':'<p class="fnote">Im Impostor-Modus braucht ihr mindestens 3 Spieler.</p>'}`;
}
const BPRE=[3,5,7,10,15,20,30,45,60];
const bTimeOpts=()=>(BPRE.includes(B.target)?BPRE:BPRE.concat(B.target).sort((a,b)=>a-b))
  .map(v=>`<option value="${v}"${v===B.target?' selected':''}>${v} ${v===1?'Sekunde':'Sekunden'}</option>`).join('');
let bsT=0;
function bSetImp(on){
  B.impMode=on;bSave();bSetup();
}
function bSetTarget(v){
  B.target=Math.max(1,Math.min(60,Math.round(v)||1));
  clearTimeout(bsT);bsT=setTimeout(bSave,250);         /* beim Gedrückthalten nicht bei jedem Schritt speichern */
  const a=$('#tval'),u=$('#tunit');
  if(a){a.textContent=B.target;a.classList.remove('bump');void a.offsetWidth;a.classList.add('bump')}
  if(u)u.textContent=bUnit();
  const s=$('#tsel');if(s){s.innerHTML=bTimeOpts();s.value=String(B.target)}
}

/* − / + gedrückt halten: wiederholt sich und wird dabei immer schneller */
let hold=null;
function holdStop(){if(hold){clearTimeout(hold.t);hold=null}}
function holdStart(btn){
  holdStop();
  const d=+btn.dataset.d,h=hold={t:0};let n=0;
  const step=()=>{
    if(hold!==h)return;
    const before=B.target;bSetTarget(before+d);
    if(B.target===before){holdStop();sfx.warn();haptic([10,20,10]);return}   /* Grenze erreicht */
    n++;
    const next=n===1?420:Math.max(40,170-(n-2)*10);
    if(next>=80){sfx.toggle();haptic(6)}
    h.t=setTimeout(step,next);
  };
  step();
}
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const b=e.target.closest('[data-act="btarget"]');
  if(!b||cur!=='buzzer'||B.phase!=='setup'||b.getAttribute('aria-disabled')==='true')return;
  e.preventDefault();holdStart(b);
});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>document.addEventListener(t,holdStop));
window.addEventListener('blur',holdStop);
document.addEventListener('contextmenu',e=>{if(e.target.closest('.tsel .round'))e.preventDefault()});
function bBegin(fresh){
  B.players=B.players.map((p,i)=>(p||'').trim()||('Spieler '+(i+1)));
  bSave();
  if(fresh||B.score.length!==B.players.length){B.score=B.players.map(()=>0);B.round=0}
  B.round++;B.times=[];B.win=[];B.idx=0;B.vote=-1;
  if(B.impMode){B.target=5+Math.floor(Math.random()*21);B.imp=Math.floor(Math.random()*B.players.length)}
  else B.imp=-1;
  B.phase='turn';bRender();
}
function bTurn(){
  B.t0=0;gTitle.textContent='Buzzer Knockout';
  const i=B.idx,isImp=B.impMode&&i===B.imp;
  gBody.innerHTML=`<div class="pass"><div class="prog" aria-hidden="true">${B.players.map((_,j)=>`<i class="${j<i?'done':j===i?'now':''}"></i>`).join('')}</div>
    <p class="dim">Gib das Handy an</p><h2 class="who">${esc(B.players[i])}</h2>
    ${isImp
      ?`<div class="icard"><b>Du bist der Impostor</b><small>Du erfährst die Zielzeit nicht. Tippe einfach irgendwann – und tu so, als wüsstest du sie.</small></div>`
      :`<div class="tgt"><small>Stoppe bei</small><strong>${B.target} s</strong></div>`}
    <p class="dim c hint">${isImp?'Nach dem Start läuft die Zeit unsichtbar. Verrate nicht, dass du der Impostor bist.':'Nach dem Start siehst du keine Zeit mehr. Tippe auf den Buzzer, sobald du glaubst, dass sie um ist.'}</p></div>`;
  gFoot.innerHTML=`<button class="cta" data-act="bgo">${I.play}<span>Start</span></button>`;
}

/* 3-2-1 bevor die unsichtbare Zeit losläuft */
let cdT=null;
function cdStop(){if(cdT){clearTimeout(cdT);cdT=null}}
function bCount(){
  gTitle.textContent='Buzzer Knockout';
  gBody.innerHTML=`<div class="brun"><h2 class="who sm">${esc(B.players[B.idx])}</h2><p class="dim">Gleich geht’s los …</p>
    <div class="cdn pop" id="cdn" role="status" aria-live="assertive">3</div></div>`;
  gFoot.innerHTML='';
  let n=3;sfx.tick();haptic(12);
  const step=()=>{
    if(B.phase!=='cdown')return;
    n--;
    const el=$('#cdn');
    if(n>0){
      if(el){el.textContent=n;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop')}
      sfx.tick();haptic(12);cdT=setTimeout(step,820);
    }else{
      if(el){el.textContent='Los!';el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop','go')}
      sfx.start();haptic([15,40,15]);
      cdT=setTimeout(()=>{if(B.phase==='cdown'){B.phase='run';bRender()}},480);
    }
  };
  cdT=setTimeout(step,820);
}
function bRun(){
  gTitle.textContent='Buzzer Knockout';
  const isImp=B.impMode&&B.idx===B.imp;
  gBody.innerHTML=`<div class="brun"><h2 class="who sm">${esc(B.players[B.idx])}</h2><p class="dim">${isImp?'Du kennst die Zeit nicht – schätze!':'Ziel: '+B.target+' '+bUnit()}</p>
    <button class="buzz" id="buzz" data-act="bstop" aria-label="Buzzer – jetzt stoppen"><i><span>Stopp</span></i></button>
    <p class="dim small c hint">Die Zeit läuft. Tippe, wenn du meinst, dass sie um ist.</p></div>`;
  gFoot.innerHTML='';
  B.t0=performance.now();
}
function bScore(){
  const t=B.target*100,d=B.times.map(x=>Math.abs(Math.round(x/10)-t)),best=Math.min(...d);
  B.win=d.map((x,i)=>x===best?i:-1).filter(i=>i>=0);
  B.win.forEach(i=>B.score[i]++);
}
function bStop(ts){
  if(B.phase!=='run'||!B.t0)return;
  const pn=performance.now();
  const now=(typeof ts==='number'&&ts>0&&Math.abs(ts-pn)<2000)?Math.min(ts,pn):pn;   /* exakter Zeitstempel des Tippens */
  const ms=now-B.t0;
  if(ms<250)return;                                    /* versehentlicher Doppeltipp nach dem Start */
  B.t0=0;B.times[B.idx]=ms;B.lock=pn+700;
  sfx.buzz();haptic(30);
  if(B.idx<B.players.length-1){B.idx++;B.phase='turn'}
  else if(B.impMode){B.vote=-1;B.phase='vote'}
  else{
    bScore();B.phase='result';
    setTimeout(()=>{if(B.phase==='result'){sfx.success();haptic([15,60,15])}},320);
  }
  bRender();
}
function bVote(){
  gTitle.textContent='Buzzer Knockout';
  const rows=B.players.map((p,i)=>({i,c:Math.round(B.times[i]/10)})).sort((a,b)=>a.c-b.c);
  gBody.innerHTML=`<div class="vote"><h2 class="who sm">Wer ist der Impostor?</h2>
    <p class="dim c">Einer kannte die Zielzeit nicht. Das habt ihr gestoppt:</p>
    <div class="plist v">${rows.map(r=>`<button class="pick" data-act="bpick" data-i="${r.i}" aria-pressed="${B.vote===r.i}"><i class="pc" style="background:${PC[r.i%PC.length]}">${r.i+1}</i><span>${esc(B.players[r.i])}</span><b class="tmv">${fc(r.c)} s</b><em class="ck">${I.check}</em></button>`).join('')}</div></div>`;
  gFoot.innerHTML=`<button class="cta" data-act="bresolve" ${B.vote<0?'disabled':''}><span>Auflösen</span></button>`;
}
function bResolve(){
  const caught=B.vote===B.imp;
  B.win=caught?B.players.map((_,i)=>i).filter(i=>i!==B.imp):[B.imp];
  B.win.forEach(i=>B.score[i]++);
  B.phase='result';bRender();
  setTimeout(()=>{if(B.phase==='result'){caught?sfx.success():sfx.fail();haptic(caught?[15,60,15]:[30,40,30])}},300);
}
function bResult(){
  gTitle.textContent='Buzzer Knockout';
  const t=B.target*100;
  const rows=B.players.map((p,i)=>{const c=Math.round(B.times[i]/10);return{i,c,d:c-t,a:Math.abs(c-t)}}).sort((x,y)=>x.a-y.a||x.i-y.i);
  const best=rows[0].a,tie=rows.filter(r=>r.a===best).length>1;
  const names=rows.filter(r=>r.a===best).map(r=>esc(B.players[r.i])).join(' &amp; ');
  const diff=r=>r.d===0?'Volltreffer':fc(Math.abs(r.d))+' s '+(r.d<0?'zu früh':'zu spät');
  const rank=r=>rows.findIndex(x=>x.a===r.a)+1;
  const board=B.score.map((s,i)=>({i,s})).sort((x,y)=>y.s-x.s);
  const caught=B.impMode&&B.vote===B.imp;
  const head=B.impMode
    ?`<h2 class="logo"><span class="l2 ${caught?'':'bad'}">${caught?'Crew':'Impostor'}</span><span class="l3">gewinnt!</span></h2>
      <div class="rcard"><p class="lbl">Der Impostor war</p><div class="rchips"><span class="rchip bad"><i class="pc" style="background:${PC[B.imp%PC.length]}">${B.imp+1}</i>${esc(B.players[B.imp])}</span></div></div>
      <div class="rcard"><p class="lbl">Die geheime Zielzeit war</p><div class="big">${B.target} ${bUnit()}</div></div>`
    :`<p class="dim c">${tie?'Unentschieden – gewonnen haben':'Gewonnen hat'}</p><h2 class="who">${names}</h2>
      <p class="dim c" style="margin-bottom:18px">Die Zielzeit war ${B.target} ${bUnit()}.${best===0?' Volltreffer auf die Hundertstel!':''}</p>`;
  gBody.innerHTML=`<div class="res">${head}
    ${rows.map(r=>`<div class="rrow ${B.impMode?(r.i===B.imp?'imp':''):(r.a===best?'win':'')}"><span class="rk">${B.impMode?'':rank(r)}</span><i class="pc" style="background:${PC[r.i%PC.length]}">${r.i+1}</i><span class="nm">${esc(B.players[r.i])}</span><span class="tm"><b>${fc(r.c)} s</b><small>${B.impMode&&r.i===B.imp?'kannte die Zeit nicht':diff(r)}</small></span></div>`).join('')}
    ${B.round>1?`<div class="rcard" style="margin-top:16px"><p class="lbl">Siege nach ${B.round} Runden</p><div class="rchips">${board.map(r=>`<span class="rchip"><i class="pc" style="background:${PC[r.i%PC.length]}">${r.i+1}</i>${esc(B.players[r.i])}<span class="pts">${r.s}</span></span>`).join('')}</div></div>`:''}</div>`;
  gFoot.innerHTML=`<div class="frow"><button class="round big" data-act="bedit" aria-label="Zeit oder Spieler ändern" title="Zeit oder Spieler ändern">${I.back}</button><button class="cta" data-act="bagain"><span>Nochmal spielen</span></button></div>`;
}
function bBack(){
  if(B.phase==='setup'){sfx.close();closeGame()}
  else if(B.phase==='result'){sfx.close();B.phase='setup';bRender()}
  else{sfx.warn();confirmQuit()}
}

/* ---------- Wer hat die Bombe ---------- */
const BCATS={
  buchstaben:{n:'Anfangsbuchstaben',e:'🔤',gen:()=>'Wörter mit '+pick('ABDEFGHIKLMNOPRSTUVWZ'.split(''))},
  leute:{n:'Körper & Leute',e:'🧍',w:['Körperteile','Berufe','Vornamen','Dinge im Gesicht','Kleidungsstücke','Dinge, die man trägt']},
  alltag:{n:'Alltag',e:'🏠',w:['Dinge in der Küche','Dinge im Bad','Dinge im Supermarkt','Dinge in der Schultasche','Möbelstücke','Dinge mit Stecker']},
  natur:{n:'Natur & Tiere',e:'🌿',w:['Tiere mit vier Beinen','Vögel','Obstsorten','Gemüsesorten','Bäume & Blumen','Tiere im Wasser']},
  welt:{n:'Welt & Reisen',e:'🌍',w:['Länder in Europa','Hauptstädte','Deutsche Städte','Dinge im Koffer','Verkehrsmittel','Flüsse & Meere']},
  pop:{n:'Popkultur',e:'🎬',w:['Filme','Serien','Musikinstrumente','Superhelden','Brettspiele','Automarken']}
};
const ZSPEED=[[10,24,'Kurz'],[20,45,'Mittel'],[40,80,'Lang']];
const Z={phase:'setup',cats:Object.keys(BCATS),speed:1,prompt:'',last:'',endAt:0,total:0,t:null};
const zSaved=store.get('splash.bombe',null);
if(zSaved){
  if(Array.isArray(zSaved.cats)){const cs=zSaved.cats.filter(c=>BCATS[c]);if(cs.length)Z.cats=cs}
  if([0,1,2].includes(+zSaved.speed))Z.speed=+zSaved.speed;
}
const zSave=()=>store.set('splash.bombe',{cats:Z.cats,speed:Z.speed});
function zStop(){if(Z.t){clearTimeout(Z.t);Z.t=null}sfx.fuseStop()}
function zRender(){zStop();setLayout(Z.phase==='setup');({setup:zSetup,run:zRun,boom:zBoom})[Z.phase]();gBody.scrollTop=0;if(isSetup())kickPaint()}
const zCatLabel=()=>{
  const all=Object.keys(BCATS),sel=all.filter(k=>Z.cats.includes(k));
  if(sel.length===all.length)return 'Alle Kategorien';
  if(!sel.length)return 'Keine ausgewählt';
  if(sel.length===1)return BCATS[sel[0]].e+' '+BCATS[sel[0]].n;
  if(sel.length===2)return sel.map(k=>BCATS[k].n).join(', ');
  return sel.length+' Kategorien';
};
function zSyncCats(){
  $$('[data-act="zcat"]').forEach(b=>b.setAttribute('aria-pressed',String(Z.cats.includes(b.dataset.k))));
  const a=$('[data-act="zcatall"]');if(a)a.setAttribute('aria-pressed',String(Z.cats.length===Object.keys(BCATS).length));
  const l=$('#zddLabel');if(l)l.textContent=zCatLabel();
  zSave();zFoot();
}
const CHEV='<svg viewBox="0 0 14 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5l5.5 5.5 5.5-5.5"/></svg>';
function zSetup(){
  gTitle.textContent='Wer hat die Bombe';
  const pad=`
  <h3 class="sec">Kategorien</h3>
  <div class="dd"><button class="ddbtn" data-act="zddcat" aria-expanded="${ddOpen}" aria-haspopup="true"><span id="zddLabel">${esc(zCatLabel())}</span>${CHEV}</button>
  <div class="ddlist" role="group" aria-label="Kategorien" ${ddOpen?'':'hidden'}>
    <button class="pick all" data-act="zcatall" aria-pressed="${Z.cats.length===Object.keys(BCATS).length}"><span class="em">✨</span><span>Alle Kategorien</span><em class="ck">${I.check}</em></button>
    ${Object.entries(BCATS).map(([k,c])=>`<button class="pick" data-act="zcat" data-k="${k}" aria-pressed="${Z.cats.includes(k)}"><span class="em">${c.e}</span><span>${c.n}</span><em class="ck">${I.check}</em></button>`).join('')}
  </div></div>
  <h3 class="sec">Zündschnur <small>Zufällig – ihr wisst nie genau wann</small></h3>
  <div class="seg" role="group" aria-label="Zündschnur">${ZSPEED.map((s,i)=>`<button data-act="zspeed" data-v="${i}" aria-pressed="${Z.speed===i}">${s[2]}</button>`).join('')}</div>
  <p class="fnote" style="margin-top:14px;text-align:center">Etwa ${ZSPEED[Z.speed][0]}–${ZSPEED[Z.speed][1]} Sekunden pro Runde.</p>`;
  setShell('bombe',pad);
  zFoot();
}
function zFoot(){
  const ok=Z.cats.length>0;
  gFoot.innerHTML=`<button class="cta" data-act="zstart" ${ok?'':'disabled'}>${I.play}<span>Spielen</span></button>${ok?'':'<p class="fnote">Wähle mindestens eine Kategorie.</p>'}`;
}
const bombSVG=`<svg viewBox="0 0 132 124" aria-hidden="true">
  <defs><radialGradient id="zbg" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#6b7694"/><stop offset=".45" stop-color="#252c44"/><stop offset="1" stop-color="#080c18"/></radialGradient></defs>
  <path d="M78 30c4-14 16-23 30-21" fill="none" stroke="#c98a3c" stroke-width="7" stroke-linecap="round"/>
  <g class="sp"><path d="M110 -5v7M110 16v7M96 9h7M117 9h7" stroke="#ffb020" stroke-width="3.4" stroke-linecap="round"/><circle cx="110" cy="9" r="9" fill="#ffd166"/><circle cx="110" cy="9" r="4.2" fill="#fff"/></g>
  <rect x="62" y="24" width="21" height="16" rx="4" transform="rotate(-34 72 32)" fill="#2b3350" stroke="#0a1226" stroke-width="3"/>
  <circle cx="56" cy="76" r="44" fill="url(#zbg)" stroke="#0a1226" stroke-width="4"/>
  <ellipse cx="41" cy="58" rx="13" ry="8.5" fill="#fff" opacity=".22" transform="rotate(-28 41 58)"/>
</svg>`;
const blastSVG=`<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs><radialGradient id="zbl" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#ffb020"/><stop offset="1" stop-color="#e2452a"/></radialGradient></defs>
  <path d="M100 4l15 35 31-25-9 39 39-7-27 29 35 18-37 9 21 32-37-14-3 38-23-30-22 30-3-38-37 14 21-32-37-9 35-18-27-29 39 7-9-39 31 25z" fill="url(#zbl)" stroke="#7a2a06" stroke-width="4" stroke-linejoin="round"/>
</svg>`;
function zBegin(){
  const c=BCATS[pick(Z.cats)];
  let p='';
  for(let i=0;i<10;i++){p=c.gen?c.gen():pick(c.w);if(p!==Z.last)break}
  Z.last=Z.prompt=p;
  const r=ZSPEED[Z.speed];
  Z.total=(r[0]+Math.random()*(r[1]-r[0]))*1000;
  Z.endAt=performance.now()+Z.total;
  Z.phase='run';zRender();
}
function zRun(){
  gTitle.textContent='Wer hat die Bombe';
  gBody.innerHTML=`<div class="bwrap">
    <div class="bprompt"><small>Kategorie</small><b>${esc(Z.prompt)}</b></div>
    <div class="bomb" id="bomb">${bombSVG}</div>
    <p class="dim small c hint">Nenn ein passendes Wort und gib das Handy sofort weiter.</p></div>`;
  gFoot.innerHTML='';
  sfx.fuseStart();
  zTick();
}
function zTick(){
  if(Z.phase!=='run')return;
  const left=Z.endAt-performance.now();
  if(left<=0){zBlow();return}
  Z.t=setTimeout(zTick,left);
}
function zBlow(){
  zStop();Z.phase='boom';zRender();
  sfx.boom();haptic([40,70,40,70,220]);
}
function zBoom(){
  gTitle.textContent='Wer hat die Bombe';
  gBody.innerHTML=`<div class="boom"><div class="bang">${blastSVG}<span>Boom!</span></div>
    <h2 class="who sm">Wer das Handy hält, verliert!</h2>
    <p class="dim c">Kategorie war <b style="color:#fff">${esc(Z.prompt)}</b></p>
</div>`;
  gFoot.innerHTML=`<div class="frow"><button class="round big" data-act="zedit" aria-label="Einstellungen ändern" title="Einstellungen ändern">${I.back}</button><button class="cta" data-act="zagain"><span>Nochmal</span></button></div>`;
}
function zBack(){
  if(Z.phase==='setup'){sfx.close();closeGame()}
  else if(Z.phase==='boom'){sfx.close();Z.phase='setup';zRender()}
  else{sfx.warn();confirmQuit()}
}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t||t.matches('input'))return;
  const a=t.dataset.act;
  if(t.getAttribute('aria-disabled')==='true'&&a!=='soon')return;
  switch(a){
    case 'play':sfx.launch();haptic(10);openGame(t.dataset.g,t);break;
    case 'srPlay':sfx.launch();haptic(10);closeSearch(true);openGame(t.dataset.g);break;
    case 'howto':sfx.open();haptic(10);howTo();break;
    case 'soon':break;
    case 'search':sfx.open();haptic(10);openSearch();break;
    case 'qback':sfx.close();haptic(8);closeSearch();break;
    case 'profile':sfx.open();haptic(10);openProfile();break;
    case 'profileDone':sfx.tap();haptic(10);if(profile.name&&!G.players[0])G.players[0]=profile.name;closeModal();break;
    case 'closeModal':sfx.close();haptic(8);closeModal();break;
    case 'dot':haptic(6);setActive(+t.dataset.i);break;
    case 'settings':sfx.open();haptic(10);openSettings();break;
    case 'sback':sfx.close();haptic(8);closeSettings();break;
    case 'gback':haptic(10);if(cur==='buzzer'){bBack();break}if(cur==='bombe'){zBack();break}if(G.phase==='setup'){sfx.close();closeGame()}else if(G.phase==='result'){sfx.close();G.phase='setup';render()}else{sfx.warn();confirmQuit()}break;
    case 'quit':sfx.warn();haptic([10,20,10]);closeModal();if(cur==='buzzer'){B.phase='setup';bRender()}else if(cur==='bombe'){Z.phase='setup';zRender()}else{G.phase='setup';render()}break;
    case 'add':if(G.players.length>=12)break;sfx.tap();haptic(8);G.players.push('');rSetup();{const ins=$$('.pf input');ins[ins.length-1].focus()}break;
    case 'rm':sfx.tap();haptic(8);G.players.splice(+t.dataset.i,1);save();rSetup();break;
    case 'cat':{sfx.toggle();haptic(8);const k=t.dataset.k,on=G.cats.includes(k);G.cats=on?G.cats.filter(x=>x!==k):G.cats.concat(k);syncCats();break}
    case 'catall':sfx.toggle();haptic(8);G.cats=G.cats.length===Object.keys(CATS).length?[]:Object.keys(CATS);syncCats();break;
    case 'ddcat':sfx.tap();haptic(8);ddOpen=!ddOpen;syncDD();break;
    case 'k':sfx.toggle();haptic(8);G.k=+t.dataset.v;$$('[data-act="k"]').forEach(b=>b.setAttribute('aria-pressed',String(b===t)));save();break;
    case 'time':sfx.toggle();haptic(8);G.time=+t.dataset.v;$$('[data-act="time"]').forEach(b=>b.setAttribute('aria-pressed',String(b===t)));save();break;
    case 'start':ddOpen=false;sfx.start();haptic([15,40,15]);start(true);break;
    case 'flip':{const f=$('#flip');setFlip(!f.classList.contains('rev'));break}
    case 'next':
      sfx.tap();haptic(10);
      if(G.idx<G.players.length-1){G.idx++;render()}
      else{G.phase='discuss';G.remaining=G.time*60;G.paused=false;render()}
      break;
    case 'pause':sfx.tap();haptic(10);G.paused=!G.paused;if(G.paused)G.left=Math.max(0,G.endAt-performance.now());else G.endAt=performance.now()+G.left;{const b=$('#pauseBtn');b.innerHTML=G.paused?I.resume:I.pause;b.setAttribute('aria-label',G.paused?'Timer fortsetzen':'Timer pausieren')}break;
    case 'tovote':sfx.tap();haptic(10);goVote();break;
    case 'pick':{
      const i=+t.dataset.i;
      if(G.picks.has(i)){G.picks.delete(i);sfx.select();haptic(8)}
      else if(G.k===1){G.picks=new Set([i]);sfx.select();haptic(10)}
      else if(G.picks.size<G.k){G.picks.add(i);sfx.select();haptic(10)}
      else{toast('Maximal '+G.k+' Personen');sfx.warn();haptic([10,20,10])}
      rVote();break}
    case 'resolve':resolve();break;
    case 'again':sfx.tap();haptic(10);start(false);break;
    case 'edit':sfx.tap();haptic(10);G.phase='setup';render();break;
    case 'btarget':if(e.detail===0){sfx.toggle();haptic(8);bSetTarget(B.target+ +t.dataset.d)}break;   /* Maus/Touch laufen über pointerdown, hier nur Tastatur */
    case 'badd':if(B.players.length>=BMAX)break;sfx.tap();haptic(8);B.players.push('');bSave();bSetup();{const ins=$$('.pf input');ins[ins.length-1].focus()}break;
    case 'brm':sfx.tap();haptic(8);B.players.splice(+t.dataset.i,1);bSave();bSetup();break;
    case 'bstart':sfx.start();haptic([15,40,15]);bBegin(true);break;
    case 'bgo':if(performance.now()<B.lock)break;sfx.tap();haptic(10);B.phase='cdown';bRender();break;
    case 'bstop':bStop();break;
    case 'bagain':if(performance.now()<B.lock)break;sfx.tap();haptic(10);bBegin(false);break;
    case 'bedit':if(performance.now()<B.lock)break;sfx.tap();haptic(10);B.phase='setup';bRender();break;
    case 'bpick':{const i=+t.dataset.i;B.vote=B.vote===i?-1:i;sfx.select();haptic(10);bVote();break}
    case 'bresolve':if(B.vote<0)break;sfx.tap();haptic(10);bResolve();break;
    case 'zstart':ddOpen=false;sfx.start();haptic([15,40,15]);zBegin();break;
    case 'zagain':sfx.start();haptic([15,40,15]);zBegin();break;
    case 'zedit':sfx.tap();haptic(10);Z.phase='setup';zRender();break;
    case 'zddcat':sfx.tap();haptic(8);ddOpen=!ddOpen;syncDD();break;
    case 'zcat':{sfx.toggle();haptic(8);const k=t.dataset.k,on=Z.cats.includes(k);Z.cats=on?Z.cats.filter(x=>x!==k):Z.cats.concat(k);zSyncCats();break}
    case 'zcatall':sfx.toggle();haptic(8);Z.cats=Z.cats.length===Object.keys(BCATS).length?[]:Object.keys(BCATS);zSyncCats();break;
    case 'zspeed':sfx.toggle();haptic(8);Z.speed=+t.dataset.v;zSave();zSetup();break;
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches('.pf input')){if(t.dataset.b){B.players[+t.dataset.i]=t.value;bSave()}else{G.players[+t.dataset.i]=t.value;save()}}
  else if(t.id==='sq')renderSearch(t.value);
  else if(t.id==='pname'){profile.name=t.value.trim();store.set('splash.profile',profile)}
});
document.addEventListener('change',e=>{
  const t=e.target;if(!t.dataset)return;
  if(t.dataset.act==='hint'){G.hint=t.checked;save()}
  else if(t.dataset.act==='setSound'){
    settings.sound=t.checked;saveSettings();
    const ti=t.closest('.toggle').querySelector('.ti');if(ti)ti.innerHTML=settings.sound?I.speakerOn:I.speakerOff;
    sfx.toggle();haptic(10);
  }
  else if(t.dataset.act==='btime'){sfx.toggle();haptic(8);bSetTarget(+t.value)}
  else if(t.dataset.act==='bimp'){sfx.toggle();haptic(10);bSetImp(t.checked)}
  else if(t.dataset.act==='setHaptic'){
    settings.haptic=t.checked;saveSettings();
    try{settings.haptic&&navigator.vibrate&&navigator.vibrate(15)}catch(e){}
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(ddOpen){ddOpen=false;syncDD()}else if($('.modal'))closeModal();else if(settingsEl.classList.contains('open'))closeSettings();else if(searchEl.classList.contains('open'))closeSearch();else if(gameEl.classList.contains('open')&&isSetup())closeGame()}
  if(e.key==='Enter'&&e.target.matches('.pf input,#pname'))e.target.blur();
  if(e.key==='Tab'){                                   /* Fokus im geöffneten Dialog halten */
    const sh=$('.msheet');if(!sh)return;
    const f=$$('button,input,[href]',sh).filter(x=>!x.disabled);if(!f.length)return;
    const a=f[0],z=f[f.length-1],ae=document.activeElement;
    if(!sh.contains(ae)||ae===sh){e.preventDefault();a.focus()}
    else if(e.shiftKey&&ae===a){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&ae===z){e.preventDefault();a.focus()}
  }
});

/* Buzzer: beim Antippen sofort stoppen (pointerdown ist genauer als click) */
document.addEventListener('pointerdown',e=>{
  if(cur!=='buzzer'||B.phase!=='run')return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(e.target.closest('#buzz')){e.preventDefault();bStop(e.timeStamp)}
});

renderHome();initCarousel();initScroll();initGameHeroPull();
})();
