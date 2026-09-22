(()=>{
'use strict';
const COLS=8, ROWS=15;
const $=id=>document.getElementById(id);
const board=$('board'), bx=board.getContext('2d');
const nextCv=$('nextCv'), nx=nextCv.getContext('2d');
let DPR=Math.min(2,window.devicePixelRatio||1);

/* ---------------- DADOS ---------------- */
const GEMS=[
 {n:'Rubi',      sides:4,  rot:Math.PI/4,  pal:['#ff9aa6','#e3143a','#5e0013']},
 {n:'Âmbar',     sides:6,  rot:0,          pal:['#ffd495','#ff7f11','#6e2800']},
 {n:'Citrino',   sides:4,  rot:0,          pal:['#fff6a8','#ffcf00','#6e5000']},
 {n:'Esmeralda', sides:8,  rot:Math.PI/8,  pal:['#a6ffc6','#14c45c','#03431f']},
 {n:'Safira',    sides:12, rot:0,          pal:['#a8dcff','#1f7bff','#072566']},
 {n:'Ametista',  sides:3,  rot:-Math.PI/2, pal:['#efb4ff','#a92cff','#3e0766']},
 {n:'Quartzo',   sides:5,  rot:-Math.PI/2, pal:['#ffffff','#cdd8ea','#56667f']},
];
const EARTH=[
 {n:'Terra',   hp:1, pal:['#bd5a33','#8e3c20','#5a2211'], speck:'#e08a5a'},
 {n:'Argila',  hp:2, pal:['#d9a263','#a86d34','#643b16'], speck:'#f6cb95'},
 {n:'Pedra',   hp:3, pal:['#a2a2ab','#6d6d78','#3e3e48'], speck:'#d0d0d8'},
 {n:'Granito', hp:4, pal:['#766d7a','#4a4250','#241f2a'], speck:'#f0b0c0'},
 {n:'Basalto', hp:5, pal:['#3b2c40','#221828','#0e0812'], speck:'#ff6a2a'},
];
const ORES={
 carvao:  {n:'Carvão',   pts:30,   col:'#262322', hi:'#9a9a9a', min:0,  w:10},
 ferro:   {n:'Ferro',    pts:60,   col:'#d9a88c', hi:'#fff0e2', min:3,  w:8},
 tnt:     {n:'Dinamite', pts:50,   col:'#e8322a', hi:'#ffd04a', min:5,  w:2},
 ouro:    {n:'Ouro',     pts:150,  col:'#ffcf3a', hi:'#fff7c8', min:7,  w:6},
 topazio: {n:'Topázio',  pts:300,  col:'#39e6ff', hi:'#e0fbff', min:14, w:4},
 diamante:{n:'Diamante', pts:700,  col:'#eafcff', hi:'#ffffff', min:24, w:2.5},
 reliquia:{n:'Relíquia', pts:1500, col:'#efe0bb', hi:'#fffaf0', min:40, w:1},
};
const ZONES=[
 {d:0,  n:'Terra Vermelha',       w:[.85,.15,0,0,0], bg:['#3a1a10','#160906']},
 {d:6,  n:'Camada de Argila',     w:[.3,.6,.1,0,0],  bg:['#3a2410','#160c06']},
 {d:15, n:'Rocha Cinzenta',       w:[0,.25,.6,.15,0],bg:['#23252d','#0b0c11']},
 {d:30, n:'Granito Antigo',       w:[0,0,.3,.6,.1],  bg:['#281b2c','#0c070f']},
 {d:50, n:'Basalto Vulcânico',    w:[0,0,0,.4,.6],   bg:['#331412','#0d0506']},
 {d:80, n:'Núcleo Incandescente', w:[0,0,0,.2,.8],   bg:['#4a1406','#140302']},
];
const SHAPES={
 I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
 O:[[1,1],[1,1]],
 T:[[0,1,0],[1,1,1],[0,0,0]],
 S:[[0,1,1],[1,1,0],[0,0,0]],
 Z:[[1,1,0],[0,1,1],[0,0,0]],
 J:[[1,0,0],[1,1,1],[0,0,0]],
 L:[[0,0,1],[1,1,1],[0,0,0]],
};
const SPNAME={bomb:'Bomba',star:'Estrela',cube:'Hipercubo'};

/* ---------------- UTIL ---------------- */
const rnd=n=>Math.floor(Math.random()*n);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function wpick(ws){let t=0;for(const w of ws)t+=w;let x=Math.random()*t;for(let i=0;i<ws.length;i++){x-=ws[i];if(x<0)return i;}return ws.length-1;}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const inB=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
const store={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};

/* ---------------- ÁUDIO ---------------- */
const AU={ctx:null,master:null,muted:false};
function au(){
  if(!AU.ctx){try{AU.ctx=new (window.AudioContext||window.webkitAudioContext)();AU.master=AU.ctx.createGain();AU.master.gain.value=.55;AU.master.connect(AU.ctx.destination);}catch(e){AU.ctx=null;}}
  if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();
}
function tone(f,d,type,v,slide,delay){
  const c=AU.ctx;if(!c||AU.muted)return;
  const t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.2,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(AU.master);o.start(t);o.stop(t+d+.05);
}
let noiseBuf=null;
function noise(d,v,freq,delay){
  const c=AU.ctx;if(!c||AU.muted)return;
  if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate,c.sampleRate);const ch=noiseBuf.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;}
  const t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=noiseBuf;
  const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=freq||1000;
  const g=c.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f);f.connect(g);g.connect(AU.master);s.start(t);s.stop(t+d+.02);
}
const NOTES=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1567.98];
const SFX={
 move:()=>tone(260,.035,'square',.025),
 rot:()=>tone(520,.06,'triangle',.07,260),
 cyc:()=>{tone(660,.05,'sine',.06);tone(990,.06,'sine',.05,0,.04);},
 lock:()=>{noise(.07,.18,700);tone(95,.12,'sine',.2,-40);},
 drop:()=>{noise(.12,.3,900);tone(70,.18,'sine',.3,-30);},
 match:n=>{const f=NOTES[Math.min(n-1,NOTES.length-1)];tone(f,.18,'triangle',.12);tone(f*1.5,.24,'sine',.07,0,.05);},
 brk:()=>{noise(.14,.28,1500);tone(140,.08,'square',.05,-60);},
 ore:()=>{tone(1318,.14,'triangle',.1);tone(1975,.22,'sine',.08,0,.07);},
 boom:()=>{noise(.55,.5,380);tone(58,.45,'sine',.45,-28);},
 zap:()=>{tone(1200,.25,'sawtooth',.05,-900);noise(.2,.12,4000);},
 cube:()=>{for(let i=0;i<7;i++)tone(600+i*170,.12,'triangle',.06,0,i*.04);},
 line:()=>{tone(392,.12,'square',.06);tone(523,.12,'square',.06,0,.08);tone(784,.2,'square',.06,0,.16);},
 rise:()=>{tone(62,.4,'sawtooth',.09,-18);noise(.35,.12,250);},
 swap:()=>tone(740,.05,'sine',.06,120),
 bad:()=>tone(140,.12,'square',.07,-30),
 level:()=>[523,659,784,1046].forEach((f,i)=>tone(f,.16,'triangle',.1,0,i*.08)),
 bonus:()=>[784,988,1175,1568].forEach((f,i)=>tone(f,.2,'triangle',.09,0,i*.07)),
 over:()=>{[392,330,262,196].forEach((f,i)=>tone(f,.3,'sawtooth',.07,-10,i*.18));noise(.8,.3,300,.1);},
};
/* trilha procedural: baixo sincopado + dedilhado pentatônico */
const MUS={next:0,step:0};
const PENTA=[0,3,5,7,10,12,15];
const PATTERN=[0,-1,2,-1,4,3,-1,2,5,-1,4,-1,2,3,-1,1];
const ROOTS=[0,-4,-2,-5];
function musicTick(){
  const c=AU.ctx;if(!c||AU.muted||(S.state!=='fall'&&S.state!=='resolve'))return;
  const spb=60/(88+Math.min(S.level,15)*3)/2;
  if(MUS.next<c.currentTime)MUS.next=c.currentTime+.05;
  while(MUS.next<c.currentTime+.2){
    const st=MUS.step++,bar=Math.floor(st/16)%4,s=st%16,root=110*Math.pow(2,ROOTS[bar]/12),dl=MUS.next-c.currentTime;
    if(s===0||s===6||s===8||s===14)tone(root/2,spb*1.6,'triangle',.07,0,dl);
    const p=PATTERN[s];if(p>=0)tone(root*2*Math.pow(2,PENTA[p]/12),spb*1.2,'sine',.035,0,dl);
    if(s%2===1)noise(.03,.025,6000,dl);
    MUS.next+=spb;
  }
}
setInterval(musicTick,60);

/* ---------------- ESTADO ---------------- */
let grid=[];let bag=[];let R=null;
const S={state:'menu',score:0,destroyed:0,depth:0,zone:0,level:1,colors:5,cascade:0,maxCascade:1,piece:null,next:null,nextRow:null,
  fallT:0,lockT:0,lockMoves:0,riseT:0,soft:false,recent:new Set(),sel:null,pendingTNT:[],ores:{},
  shake:0,time:0,playTime:0,cs:32,stripH:20,particles:[],popups:[],beams:[],rings:[],banner:null,prevState:null};
const cellK=k=>grid[Math.floor(k/COLS)][k%COLS];
const gem=(c,sp)=>({t:'g',c,sp:sp||null,oy:0,vy:0});
const fallInterval=()=>Math.max(.07,.8*Math.pow(.87,S.level-1));
const riseInterval=()=>Math.max(4.5,15-(S.level-1)*.9);
function zoneIdx(d){let z=0;for(let i=0;i<ZONES.length;i++)if(d>=ZONES[i].d)z=i;return z;}

function pickOre(d){const ks=Object.keys(ORES).filter(k=>ORES[k].min<=d);return ks[wpick(ks.map(k=>ORES[k].w))];}
function newEarthRow(){
  const d=S.depth+3,z=ZONES[zoneIdx(d)],oreChance=Math.min(.3,.07+d*.004),row=[];
  for(let c=0;c<COLS;c++){
    const k=wpick(z.w);
    row.push({t:'e',k,hp:EARTH[k].hp,max:EARTH[k].hp,ore:Math.random()<oreChance?pickOre(d):null,oy:0,vy:0,seed:1+rnd(99999),hit:0});
  }
  return row;
}

/* ---------------- PEÇAS ---------------- */
function makePiece(){
  if(!bag.length)bag=shuffle(Object.keys(SHAPES));
  const k=bag.pop();const a=rnd(S.colors);let b=rnd(S.colors);if(b===a)b=(a+1+rnd(S.colors-1))%S.colors;
  const m=SHAPES[k].map(row=>row.map(v=>v?gem(Math.random()<.55?a:b):null));
  if(S.level>=3&&Math.random()<.06){const cells=[];m.forEach(r=>r.forEach(x=>x&&cells.push(x)));cells[rnd(cells.length)].sp='bomb';}
  return {m,k,x:0,y:0};
}
function collide(m,x,y){
  for(let r=0;r<m.length;r++)for(let c=0;c<m.length;c++){
    if(!m[r][c])continue;const gr=y+r,gc=x+c;
    if(gc<0||gc>=COLS||gr>=ROWS)return true;
    if(gr>=0&&grid[gr][gc])return true;
  }
  return false;
}
function spawnPiece(){
  const p=S.next||makePiece();S.next=makePiece();drawNext();
  const n=p.m.length;let top=0;while(top<n&&p.m[top].every(v=>!v))top++;
  p.x=Math.floor((COLS-n)/2);p.y=-top;
  S.piece=p;S.fallT=0;S.lockT=0;S.lockMoves=0;
  if(collide(p.m,p.x,p.y))gameOver('Não sobrou espaço para a próxima peça.');
}
const rotM=m=>{const n=m.length;return m.map((row,r)=>row.map((_,c)=>m[n-1-c][r]));};
function onMoved(){const p=S.piece;if(collide(p.m,p.x,p.y+1)&&S.lockMoves<15){S.lockT=0;S.lockMoves++;}}
function move(dx){const p=S.piece;if(!collide(p.m,p.x+dx,p.y)){p.x+=dx;onMoved();SFX.move();}}
function tryRotate(){
  const p=S.piece,nm=rotM(p.m);
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1]]){
    if(!collide(nm,p.x+dx,p.y+dy)){p.m=nm;p.x+=dx;p.y+=dy;onMoved();SFX.rot();return;}
  }
}
function cycleColors(){
  const p=S.piece,pos=[];
  p.m.forEach((row,r)=>row.forEach((x,c)=>{if(x)pos.push([r,c]);}));
  const cells=pos.map(([r,c])=>p.m[r][c]);cells.unshift(cells.pop());
  pos.forEach(([r,c],i)=>p.m[r][c]=cells[i]);SFX.cyc();
}
function stepDown(){const p=S.piece;if(!collide(p.m,p.x,p.y+1)){p.y++;return true;}return false;}
function hardDrop(){let n=0;while(stepDown())n++;S.score+=n*2;SFX.drop();S.shake=Math.max(S.shake,3);lockPiece(true);}
function lockPiece(silent){
  const p=S.piece;let over=false;S.recent=new Set();
  p.m.forEach((row,r)=>row.forEach((x,c)=>{
    if(!x)return;const gr=p.y+r,gc=p.x+c;
    if(gr<0){over=true;return;}
    grid[gr][gc]=x;S.recent.add(x);
  }));
  S.piece=null;if(!silent)SFX.lock();
  if(over){gameOver('A pilha passou do teto da mina.');return;}
  applyGravity();startResolve('falling');
}

/* ---------------- GRAVIDADE / SUBIDA ---------------- */
function applyGravity(){
  for(let c=0;c<COLS;c++){
    let w=ROWS-1;
    for(let r=ROWS-1;r>=0;r--){
      const x=grid[r][c];if(!x)continue;
      if(r!==w){grid[w][c]=x;grid[r][c]=null;x.oy=(x.oy||0)-(w-r);}
      w--;
    }
  }
}
function riseRow(){
  if(grid[0].some(Boolean)){gameOver('A terra subiu até o teto.');return false;}
  grid.shift();grid.push(S.nextRow);S.nextRow=newEarthRow();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=grid[r][c];if(x)x.oy=(x.oy||0)+1;}
  if(S.sel!=null){S.sel-=COLS;if(S.sel<0)S.sel=null;}
  if(S.piece&&collide(S.piece.m,S.piece.x,S.piece.y)){
    S.piece.y--;if(collide(S.piece.m,S.piece.x,S.piece.y)){gameOver('A terra subiu e esmagou a peça.');return false;}
  }
  SFX.rise();S.shake=Math.max(S.shake,4);return true;
}
const hasEarth=()=>grid.some(row=>row.some(x=>x&&x.t==='e'));

/* ---------------- MATCHES ---------------- */
function gAt(r,c){const x=grid[r]&&grid[r][c];return x&&x.t==='g'?x:null;}
function addDmg(m,k,a){m.set(k,(m.get(k)||0)+a);}
function runLen(r,c,dr,dc,col){let n=0;r+=dr;c+=dc;while(inB(r,c)){const g=gAt(r,c);if(g&&g.c===col){n++;r+=dr;c+=dc;}else break;}return n;}
function matchesAt(r,c){
  const g=gAt(r,c);if(!g||g.c<0)return false;
  return runLen(r,c,0,-1,g.c)+runLen(r,c,0,1,g.c)>=2||runLen(r,c,-1,0,g.c)+runLen(r,c,1,0,g.c)>=2;
}
function pickSpot(cells,reserved){
  const cand=cells.filter(k=>!reserved.has(k)&&!cellK(k).sp);
  if(!cand.length)return null;
  const rec=cand.find(k=>S.recent.has(cellK(k)));
  return rec!=null?rec:cand[Math.floor(cand.length/2)];
}
function findClears(){
  const runs=[];
  for(let r=0;r<ROWS;r++){let c=0;while(c<COLS){const g=gAt(r,c);if(!g||g.c<0){c++;continue;}let e=c+1;while(e<COLS){const h=gAt(r,e);if(h&&h.c===g.c)e++;else break;}
    if(e-c>=3){const cells=[];for(let i=c;i<e;i++)cells.push(r*COLS+i);runs.push({cells,color:g.c});}c=e;}}
  for(let c=0;c<COLS;c++){let r=0;while(r<ROWS){const g=gAt(r,c);if(!g||g.c<0){r++;continue;}let e=r+1;while(e<ROWS){const h=gAt(e,c);if(h&&h.c===g.c)e++;else break;}
    if(e-r>=3){const cells=[];for(let i=r;i<e;i++)cells.push(i*COLS+c);runs.push({cells,color:g.c});}r=e;}}
  if(!runs.length)return null;
  const clear=new Set(),create=[],dmg=new Map(),fx=[],cnt=new Map(),consumed=new Set(),reserved=new Set();
  for(const run of runs)for(const k of run.cells){clear.add(k);cnt.set(k,(cnt.get(k)||0)+1);}
  /* grupos: gemas da mesma cor que casaram e se encostam contam juntas */
  const groups=[],seen=new Set();
  for(const k of clear){
    if(seen.has(k))continue;const col=cellK(k).c,st=[k],cells=[];seen.add(k);
    while(st.length){const q=st.pop();cells.push(q);const r=Math.floor(q/COLS),c=q%COLS;
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){if(!inB(r+dr,c+dc))continue;const nk=(r+dr)*COLS+c+dc;
        if(clear.has(nk)&&!seen.has(nk)&&cellK(nk).c===col){seen.add(nk);st.push(nk);}}}
    groups.push({cells,color:col,power:Math.min(5,cells.length-2)});
  }
  for(const [k,n] of cnt){
    if(n<2||reserved.has(k))continue;
    const rs=runs.filter(ru=>ru.cells.includes(k));
    if(rs.some(ru=>ru.cells.length>=5))continue;
    create.push({k,sp:'star',c:rs[0].color});reserved.add(k);rs.forEach(ru=>consumed.add(ru));
  }
  for(const run of runs){
    if(consumed.has(run)||run.cells.length<4)continue;
    const k=pickSpot(run.cells,reserved);if(k==null)continue;reserved.add(k);
    const big=run.cells.length>=5;create.push({k,sp:big?'cube':'bomb',c:big?-1:run.color});
  }
  for(const cr of create)clear.delete(cr.k);
  return finalize(clear,create,dmg,fx,groups,1);
}
function commonColor(){
  const n=new Array(GEMS.length).fill(0);
  grid.forEach(row=>row.forEach(x=>{if(x&&x.t==='g'&&x.c>=0)n[x.c]++;}));
  let best=0;for(let i=1;i<n.length;i++)if(n[i]>n[best])best=i;return best;
}
function finalize(clear,create,dmg,fx,groups,basePower){
  const protect=new Set(create.map(x=>x.k)),done=new Set();
  const queue=[...clear].filter(k=>{const x=cellK(k);return x&&x.sp;});
  const addG=k=>{if(protect.has(k)||clear.has(k))return;const x=cellK(k);if(!x||x.t!=='g')return;clear.add(k);if(x.sp)queue.push(k);};
  const hit=(k,a)=>{const x=cellK(k);if(!x)return;if(x.t==='e')addDmg(dmg,k,a);else addG(k);};
  while(queue.length){
    const k=queue.shift();if(done.has(k))continue;done.add(k);
    const x=cellK(k);if(!x)continue;const r=Math.floor(k/COLS),c=k%COLS;
    if(x.sp==='bomb'){fx.push({type:'boom',r,c});for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&inB(r+dr,c+dc))hit((r+dr)*COLS+c+dc,3);}
    else if(x.sp==='star'){fx.push({type:'star',r,c});for(let i=0;i<COLS;i++)if(i!==c)hit(r*COLS+i,2);for(let i=0;i<ROWS;i++)if(i!==r)hit(i*COLS+c,2);}
    else if(x.sp==='cube'){
      const col=x.force!=null?x.force:commonColor();fx.push({type:'cube',r,c});
      for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){const y=grid[rr][cc];if(y&&y.t==='g'&&(col==='all'||y.c===col))addG(rr*COLS+cc);}
    }
  }
  /* golpe na rocha encostada: grupo de 3 = 1, 4 = 2, 5 = 3... (vale o maior golpe vizinho) */
  const adjMax=new Map(),inGroup=new Set();
  const bump=(k,pw)=>{const r=Math.floor(k/COLS),c=k%COLS;
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){if(!inB(r+dr,c+dc))continue;const kk=(r+dr)*COLS+c+dc,y=grid[r+dr][c+dc];
      if(y&&y.t==='e')adjMax.set(kk,Math.max(adjMax.get(kk)||0,pw));}};
  for(const g of groups)for(const k of g.cells){inGroup.add(k);bump(k,g.power);}
  for(const k of clear)if(!inGroup.has(k))bump(k,basePower);
  for(const [k,pw] of adjMax)addDmg(dmg,k,pw);
  return {clear,create,dmg,fx,groups};
}
function tntClear(){
  const clear=new Set(),dmg=new Map(),fx=[];
  for(const k of S.pendingTNT){
    const r=Math.floor(k/COLS),c=k%COLS;fx.push({type:'boom',r,c});
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!inB(r+dr,c+dc))continue;const kk=(r+dr)*COLS+c+dc,y=grid[r+dr][c+dc];
      if(!y)continue;if(y.t==='e')addDmg(dmg,kk,4);else clear.add(kk);
    }
  }
  S.pendingTNT=[];
  return finalize(clear,[],dmg,fx,[],1);
}

/* ---------------- RESOLUÇÃO (cascatas) ---------------- */
function startResolve(phase,preset){S.state='resolve';S.cascade=0;R={phase,t:0,preset:preset||null,res:null};}
function updateResolve(dt,moving){
  R.t+=dt;
  if(R.phase==='swap'){if(R.t>=.14){R.phase='check';R.t=0;}return;}
  if(R.phase==='falling'){if(!moving){R.phase='check';R.t=0;}return;}
  if(R.phase==='check'){
    let res=R.preset;R.preset=null;
    if(!res&&S.pendingTNT.length)res=tntClear();
    if(!res)res=findClears();
    if(res&&(res.clear.size||res.dmg.size||res.create.length)){
      S.cascade++;S.maxCascade=Math.max(S.maxCascade,S.cascade);R.res=res;
      res.clear.forEach(k=>{const x=cellK(k);if(x)x.clr=1;});
      res.dmg.forEach((a,k)=>{const x=cellK(k);if(x)x.hit=.25;});
      playFX(res);R.phase='clearing';R.t=0;
    }else endResolve();
    return;
  }
  if(R.phase==='clearing'){if(R.t>=.24){applyClear(R.res);applyGravity();R.phase='falling';R.t=0;}}
}
function endResolve(){
  S.state='fall';S.cascade=0;R=null;S.recent=new Set();
  if(!hasEarth()){
    const b=1000*S.level;S.score+=b;SFX.bonus();
    S.banner={text:'Veio limpo',sub:'+'+b.toLocaleString('pt-BR'),life:1.8};
    for(let i=0;i<3&&S.state==='fall';i++)riseRow();
  }
  if(S.state==='fall'&&!S.piece)spawnPiece();
}
function playFX(res){
  let boom=false,star=false,cube=false;
  for(const f of res.fx){
    if(f.type==='boom'){boom=true;S.rings.push({r:f.r,c:f.c,life:.45});}
    else if(f.type==='star'){star=true;S.beams.push({r:f.r,c:f.c,life:.4});}
    else if(f.type==='cube'){cube=true;S.rings.push({r:f.r,c:f.c,life:.6,big:true});}
  }
  if(res.clear.size)SFX.match(S.cascade);
  if(boom){SFX.boom();S.shake=Math.max(S.shake,9);}
  if(star)SFX.zap();if(cube)SFX.cube();
}
function gemColor(x){return x.c>=0?GEMS[x.c].pal[1]:'#ffffff';}
function applyClear(res){
  const mult=S.cascade,lvlM=1+(S.level-1)*.15;
  let pts=0,sr=0,sc=0,n=0,broke=0,oreHit=false;
  for(const k of res.clear){
    const r=Math.floor(k/COLS),c=k%COLS,x=grid[r][c];if(!x)continue;
    pts+=x.sp?60:15;burst(r,c,gemColor(x),7);grid[r][c]=null;sr+=r;sc+=c;n++;
  }
  for(const cr of res.create){
    const r=Math.floor(cr.k/COLS),c=cr.k%COLS,g=gem(cr.c,cr.sp);g.born=.4;grid[r][c]=g;
    S.popups.push({x:c+.5,y:r+.2,text:SPNAME[cr.sp],col:'#ffd98a',life:1,size:.42});
  }
  for(const g of res.groups){
    const n2=g.cells.length;pts+=Math.round(n2*15*(n2-3)*.5);
    if(g.power>=2){const k0=g.cells[Math.floor(g.cells.length/2)];
      S.popups.push({x:k0%COLS+.5,y:Math.floor(k0/COLS)-.1,text:n2+' gemas, golpe '+g.power,col:GEMS[g.color].pal[0],life:1.1,size:.34});}
  }
  for(const [k,a] of res.dmg){
    const r=Math.floor(k/COLS),c=k%COLS,x=grid[r][c];if(!x||x.t!=='e')continue;
    x.hp-=a;x.hit=.25;
    if(x.hp<=0){
      pts+=EARTH[x.k].hp*12;
      if(x.ore){const o=ORES[x.ore];pts+=o.pts;S.ores[x.ore]=(S.ores[x.ore]||0)+1;oreHit=true;
        S.popups.push({x:c+.5,y:r+.5,text:'+'+o.pts+' '+o.n,col:o.col==='#262322'?'#bdbdbd':o.col,life:1.2,size:.36});
        burst(r,c,o.col,10,true);if(x.ore==='tnt')S.pendingTNT.push(k);}
      burst(r,c,EARTH[x.k].pal[1],9);grid[r][c]=null;S.destroyed++;broke++;
    }else burst(r,c,EARTH[x.k].speck,4);
  }
  const total=Math.round(pts*mult*lvlM);S.score+=total;
  if(total>0){
    const cx=n?sc/n+.5:COLS/2,cy=n?sr/n+.5:ROWS-3;
    S.popups.push({x:cx,y:cy,text:'+'+total.toLocaleString('pt-BR'),col:'#ffffff',life:1.1,size:.5});
  }
  if(broke)SFX.brk();if(oreHit)SFX.ore();
  updateLevel();
}
function updateLevel(){
  const depth=Math.floor(S.destroyed/COLS);
  if(depth!==S.depth){
    S.depth=depth;const z=zoneIdx(depth);
    if(z!==S.zone){S.zone=z;S.banner={text:ZONES[z].n,sub:depth+' m de profundidade',life:2.2};}
  }
  const lvl=1+Math.floor(depth/3);
  if(lvl>S.level){
    S.level=lvl;S.colors=lvl>=10?7:lvl>=4?6:5;SFX.level();
    if(!S.banner||S.banner.life<1)S.banner={text:'Nível '+lvl,sub:S.colors>5&&(lvl===4||lvl===10)?'nova cor de gema na mina':'a terra sobe mais rápido',life:1.8};
  }
}

/* ---------------- TROCA DE GEMAS (Bejeweled) ---------------- */
function trySwap(k1,k2){
  if(S.state!=='fall')return;
  const a=cellK(k1),b=cellK(k2);
  if(!a||!b||a.t!=='g'||b.t!=='g'||a.oy||b.oy){if(a&&a.t==='g'){a.shk=.3;SFX.bad();}return;}
  const r1=Math.floor(k1/COLS),c1=k1%COLS,r2=Math.floor(k2/COLS),c2=k2%COLS;
  grid[r1][c1]=b;grid[r2][c2]=a;
  const slide=()=>{a.sx=c1-c2;a.sy=r1-r2;b.sx=c2-c1;b.sy=r2-r1;};
  if(a.sp==='cube'||b.sp==='cube'){
    slide();SFX.swap();let res;
    if(a.sp==='cube'&&b.sp==='cube'){a.force='all';res=finalize(new Set([k1,k2]),[],new Map(),[],[],2);}
    else{const cube=a.sp==='cube'?a:b,other=cube===a?b:a;cube.force=other.c;res=finalize(new Set([cube===a?k2:k1]),[],new Map(),[],[],2);}
    startResolve('swap',res);return;
  }
  if(!matchesAt(r1,c1)&&!matchesAt(r2,c2)){grid[r1][c1]=a;grid[r2][c2]=b;a.shk=b.shk=.3;SFX.bad();return;}
  slide();S.recent=new Set([a,b]);SFX.swap();startResolve('swap');
}

/* ---------------- PARTÍCULAS ---------------- */
function burst(r,c,col,n,spark){
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,sp=1.5+Math.random()*(spark?6:4);
    S.particles.push({x:c+.5,y:r+.5,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,life:.5+Math.random()*.4,max:.9,col,s:.08+Math.random()*.1,spark});}
  if(S.particles.length>500)S.particles.splice(0,S.particles.length-500);
}

/* ---------------- UPDATE ---------------- */
const rep={left:null,right:null};
function animCells(dt){
  let moving=false;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const x=grid[r][c];if(!x)continue;
    if(x.oy<0){x.vy=(x.vy||0)+70*dt;x.oy=Math.min(0,x.oy+x.vy*dt);if(x.oy===0)x.vy=0;else moving=true;}
    else if(x.oy>0){x.oy=Math.max(0,x.oy-dt*6);}
    if(x.sx){x.sx=x.sx>0?Math.max(0,x.sx-dt*8):Math.min(0,x.sx+dt*8);}
    if(x.sy){x.sy=x.sy>0?Math.max(0,x.sy-dt*8):Math.min(0,x.sy+dt*8);}
    if(x.shk>0)x.shk-=dt;if(x.hit>0)x.hit-=dt;if(x.born>0)x.born=Math.max(0,x.born-dt*2);
  }
  return moving;
}
function update(dt){
  S.time+=dt;
  const moving=animCells(dt);
  for(const p of S.particles){p.vy+=14*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  S.particles=S.particles.filter(p=>p.life>0);
  for(const p of S.popups){p.y-=dt*1.1;p.life-=dt;}S.popups=S.popups.filter(p=>p.life>0);
  for(const b of S.beams)b.life-=dt;S.beams=S.beams.filter(b=>b.life>0);
  for(const b of S.rings)b.life-=dt;S.rings=S.rings.filter(b=>b.life>0);
  if(S.banner){S.banner.life-=dt;if(S.banner.life<=0)S.banner=null;}
  S.shake=Math.max(0,S.shake-dt*30);
  if(S.state==='fall'||S.state==='resolve'){
    S.playTime+=dt;
    for(const a of ['left','right']){const h=rep[a];if(h&&S.piece){h.t+=dt;if(h.t>=(h.init?.16:.05)){h.t=0;h.init=false;move(a==='left'?-1:1);}}}
  }
  if(S.state==='fall'&&S.piece){
    const p=S.piece;const iv=S.soft?Math.min(.035,fallInterval()/10):fallInterval();
    S.fallT+=dt;
    while(S.fallT>=iv){S.fallT-=iv;if(stepDown()){if(S.soft)S.score+=1;}else{S.fallT=0;break;}}
    if(collide(p.m,p.x,p.y+1)){S.lockT+=dt;if(S.lockT>=.5)lockPiece();}else S.lockT=0;
    if(S.state==='fall'){S.riseT+=dt;if(S.riseT>=riseInterval()){S.riseT=0;riseRow();}}
  }else if(S.state==='resolve'){updateResolve(dt,moving);}
  updateHUD();
}
const hudCache={};
function setT(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function updateHUD(){
  setT('score',S.score.toLocaleString('pt-BR'));setT('depth',S.depth+' m');setT('level',String(S.level));
  setT('zone',ZONES[S.zone].n);setT('cascade',S.cascade>=2?'Cascata x'+S.cascade:'');
}

/* ---------------- SPRITES ---------------- */
let cache={};
function poly(n,rad,rot,cx,cy){const p=[];for(let i=0;i<n;i++){const a=rot+i*Math.PI*2/n;p.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]);}return p;}
function path(g,pts){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();}
function gemSprite(ci){
  const s=Math.max(8,Math.round(S.cs*DPR)),key='g'+ci+'_'+s;if(cache[key])return cache[key];
  const cv=document.createElement('canvas');cv.width=cv.height=s;const g=cv.getContext('2d');
  const G=GEMS[ci],cx=s/2,cy=s/2+(G.sides===3?s*.05:0),R0=s*(G.sides===3?.47:G.sides===4&&G.rot===0?.46:.41);
  const out=poly(G.sides,R0,G.rot,cx,cy),inn=poly(G.sides,R0*.52,G.rot,cx-s*.02,cy-s*.03);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=s*.06;g.shadowOffsetY=s*.03;
  const gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,G.pal[0]);gr.addColorStop(.45,G.pal[1]);gr.addColorStop(1,G.pal[2]);
  path(g,out);g.fillStyle=gr;g.fill();g.shadowColor='transparent';
  for(let i=0;i<G.sides;i++){
    const j=(i+1)%G.sides,mx=(out[i][0]+out[j][0])/2-cx,my=(out[i][1]+out[j][1])/2-cy;
    const light=Math.cos(Math.atan2(my,mx)+Math.PI*.75);
    g.beginPath();g.moveTo(out[i][0],out[i][1]);g.lineTo(out[j][0],out[j][1]);g.lineTo(inn[j][0],inn[j][1]);g.lineTo(inn[i][0],inn[i][1]);g.closePath();
    g.fillStyle=light>0?'rgba(255,255,255,'+(light*.35)+')':'rgba(0,0,0,'+(-light*.3)+')';g.fill();
  }
  const gi=g.createLinearGradient(cx-R0*.5,cy-R0*.5,cx+R0*.5,cy+R0*.5);gi.addColorStop(0,G.pal[0]);gi.addColorStop(1,G.pal[1]);
  path(g,inn);g.fillStyle=gi;g.fill();
  path(g,out);g.strokeStyle=G.pal[2];g.lineWidth=Math.max(1,s*.025);g.stroke();
  g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(cx-R0*.28,cy-R0*.32,R0*.16,R0*.08,-.6,0,Math.PI*2);g.fill();
  return cache[key]=cv;
}
function drawOre(g,ore,s,rng){
  const o=ORES[ore];
  if(ore==='tnt'){
    const w=s*.5,h=s*.42,x=(s-w)/2,y=(s-h)/2+s*.04;
    g.fillStyle='#b81d16';roundRect(g,x,y,w,h,s*.05);g.fill();
    g.fillStyle='#e8322a';g.fillRect(x+w*.08,y,w*.18,h);g.fillRect(x+w*.41,y,w*.18,h);g.fillRect(x+w*.74,y,w*.18,h);
    g.fillStyle='#111';g.fillRect(x,y+h*.4,w,h*.2);
    g.strokeStyle='#d8c8a0';g.lineWidth=s*.03;g.beginPath();g.moveTo(s/2,y);g.quadraticCurveTo(s*.6,y-s*.12,s*.68,y-s*.1);g.stroke();
    g.fillStyle=o.hi;g.beginPath();g.arc(s*.69,y-s*.1,s*.035,0,Math.PI*2);g.fill();return;
  }
  if(ore==='reliquia'){
    g.save();g.translate(s/2,s/2);g.rotate(-.6);g.fillStyle=o.col;g.strokeStyle='#8a7550';g.lineWidth=s*.02;
    g.fillRect(-s*.2,-s*.05,s*.4,s*.1);g.strokeRect(-s*.2,-s*.05,s*.4,s*.1);
    for(const [x,y] of [[-.22,-.06],[-.22,.06],[.22,-.06],[.22,.06]]){g.beginPath();g.arc(x*s,y*s,s*.07,0,Math.PI*2);g.fill();g.stroke();}
    g.restore();return;
  }
  const n=ore==='diamante'||ore==='topazio'?3:4;
  for(let i=0;i<n;i++){
    const cx=s*(.25+rng()*.5),cy=s*(.25+rng()*.5),rad=s*(.08+rng()*.06);
    const pts=[];const k=ore==='diamante'||ore==='topazio'?4:6;
    for(let j=0;j<k;j++){const a=j/k*Math.PI*2+rng()*.4;const rr=k===4?rad*(j%2?.7:1.2):rad*(.7+rng()*.5);pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
    path(g,pts);g.fillStyle=o.col;g.fill();g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=s*.02;g.stroke();
    g.fillStyle=o.hi;g.globalAlpha=.8;g.beginPath();g.arc(cx-rad*.3,cy-rad*.3,rad*.28,0,Math.PI*2);g.fill();g.globalAlpha=1;
  }
}
function earthSprite(x){
  const s=Math.max(8,Math.round(S.cs*DPR)),v=x.seed%4,key='e'+x.k+'_'+v+'_'+(x.ore||'')+'_'+s;if(cache[key])return cache[key];
  const cv=document.createElement('canvas');cv.width=cv.height=s;const g=cv.getContext('2d');const E=EARTH[x.k];
  const rng=mulberry(x.k*977+v*131+7);
  const gr=g.createLinearGradient(0,0,0,s);gr.addColorStop(0,E.pal[0]);gr.addColorStop(.55,E.pal[1]);gr.addColorStop(1,E.pal[2]);
  g.fillStyle=gr;g.fillRect(0,0,s,s);
  for(let i=0;i<26;i++){g.fillStyle=i%3?'rgba(0,0,0,.22)':E.speck;g.globalAlpha=i%3?1:.5;const w=s*(.03+rng()*.06);g.fillRect(rng()*s,rng()*s,w,w*(.6+rng()*.6));}
  g.globalAlpha=1;
  if(x.k===4){g.strokeStyle='rgba(255,106,42,.8)';g.lineWidth=s*.03;g.shadowColor='#ff6a2a';g.shadowBlur=s*.1;
    for(let i=0;i<2;i++){g.beginPath();let px=rng()*s,py=0;g.moveTo(px,py);while(py<s){py+=s*.2;px+=(rng()-.5)*s*.35;g.lineTo(px,py);}g.stroke();}g.shadowBlur=0;}
  if(x.k===2||x.k===3){g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=s*.02;g.beginPath();g.moveTo(0,s*(.3+rng()*.4));g.lineTo(s,s*(.3+rng()*.4));g.stroke();}
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,0,s,s*.06);g.fillRect(0,0,s*.06,s);
  g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,s*.94,s,s*.06);g.fillRect(s*.94,0,s*.06,s);
  if(x.ore)drawOre(g,x.ore,s,rng);
  return cache[key]=cv;
}

/* ---------------- RENDER ---------------- */
function drawCracks(px,py,cs,lv,seed){
  const rng=mulberry(seed);bx.lineCap='round';
  for(let i=0;i<lv;i++){
    let x=px+cs*(.3+rng()*.4),y=py+cs*(.3+rng()*.4);const a0=rng()*Math.PI*2;
    const pts=[[x,y]];for(let j=0;j<4;j++){const a=a0+(rng()-.5)*1.2;x+=Math.cos(a)*cs*.17;y+=Math.sin(a)*cs*.17;
      x=Math.max(px+1,Math.min(px+cs-1,x));y=Math.max(py+1,Math.min(py+cs-1,y));pts.push([x,y]);}
    bx.beginPath();pts.forEach((p,j)=>j?bx.lineTo(p[0],p[1]):bx.moveTo(p[0],p[1]));
    bx.strokeStyle='rgba(0,0,0,.75)';bx.lineWidth=Math.max(1.2,cs*.055);bx.stroke();
    bx.strokeStyle='rgba(255,230,200,.18)';bx.lineWidth=Math.max(.6,cs*.02);bx.stroke();
  }
}
function drawStar(cx,cy,ro,ri,rot){
  bx.beginPath();for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,r=i%2?ri:ro;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?bx.lineTo(x,y):bx.moveTo(x,y);}bx.closePath();
}
function drawCube(px,py,cs){
  const cx=px+cs/2,cy=py+cs/2,t=S.time;
  bx.save();bx.translate(cx,cy);bx.rotate(t*1.4);
  const gr=bx.createLinearGradient(-cs*.35,-cs*.35,cs*.35,cs*.35);
  const h=(t*120)%360;[0,.25,.5,.75,1].forEach((p,i)=>gr.addColorStop(p,'hsl('+((h+i*72)%360)+',95%,62%)'));
  bx.fillStyle=gr;roundRect(bx,-cs*.33,-cs*.33,cs*.66,cs*.66,cs*.08);bx.fill();
  bx.fillStyle='rgba(20,10,30,.55)';roundRect(bx,-cs*.17,-cs*.17,cs*.34,cs*.34,cs*.05);bx.fill();
  bx.strokeStyle='rgba(255,255,255,.9)';bx.lineWidth=Math.max(1,cs*.04);roundRect(bx,-cs*.33,-cs*.33,cs*.66,cs*.66,cs*.08);bx.stroke();
  bx.restore();
}
function drawCell(x,px,py,cs){
  if(x.t==='g'){
    let s=1,a=1;
    if(x.clr&&R&&R.phase==='clearing'){const p=Math.min(1,R.t/.24);s=1+p*.3;a=1-p;}
    if(x.born>0)s*=1+x.born*.9;
    if(x.shk>0)px+=Math.sin(x.shk*70)*cs*.09;
    bx.globalAlpha=a;
    if(x.sp==='bomb'){const pul=.55+.35*Math.sin(S.time*9);const rg=bx.createRadialGradient(px+cs/2,py+cs/2,cs*.1,px+cs/2,py+cs/2,cs*.62);
      rg.addColorStop(0,'rgba(255,170,40,'+pul+')');rg.addColorStop(1,'rgba(255,80,0,0)');bx.fillStyle=rg;bx.fillRect(px-cs*.15,py-cs*.15,cs*1.3,cs*1.3);}
    if(x.sp==='cube')drawCube(px,py,cs*s);
    else{const size=cs*s,off=(cs-size)/2;bx.drawImage(gemSprite(x.c),px+off,py+off,size,size);}
    if(x.sp==='star'){bx.fillStyle='rgba(255,255,255,.9)';drawStar(px+cs/2,py+cs/2,cs*.44,cs*.08,S.time*2);bx.fill();}
    if(x.sp==='bomb'){bx.fillStyle='rgba(255,240,200,.95)';bx.beginPath();bx.arc(px+cs/2,py+cs/2,cs*.09*(1+.3*Math.sin(S.time*12)),0,Math.PI*2);bx.fill();}
    if(x.clr){bx.fillStyle='rgba(255,255,255,.55)';roundRect(bx,px+cs*.12,py+cs*.12,cs*.76,cs*.76,cs*.2);bx.fill();}
    bx.globalAlpha=1;
  }else{
    bx.drawImage(earthSprite(x),px,py,cs,cs);
    if(x.hp<x.max)drawCracks(px,py,cs,x.max-x.hp,x.seed);
    if(x.max>=2){const rr=Math.max(1.6,cs*.055),gap=rr*2.6;
      for(let i=0;i<x.hp;i++){const dx=px+cs*.13+i*gap,dy=py+cs*.85;bx.beginPath();bx.arc(dx,dy,rr,0,Math.PI*2);
        bx.fillStyle='rgba(255,244,225,.92)';bx.fill();bx.lineWidth=Math.max(1,rr*.5);bx.strokeStyle='rgba(20,8,4,.8)';bx.stroke();}}
    if(x.ore==='diamante'||x.ore==='topazio'||x.ore==='ouro'){
      const tw=Math.sin(S.time*3+x.seed)*.5+.5;if(tw>.75){bx.fillStyle='rgba(255,255,255,'+((tw-.75)*3.5)+')';drawStar(px+cs*(.3+(x.seed%5)*.1),py+cs*(.3+(x.seed%3)*.15),cs*.14,cs*.03,0);bx.fill();}
    }
    if(x.hit>0){bx.fillStyle='rgba(255,245,220,'+(x.hit*2)+')';bx.fillRect(px,py,cs,cs);}
  }
}
function render(){
  const cs=S.cs,W=COLS*cs,H=ROWS*cs;
  bx.setTransform(DPR,0,0,DPR,0,0);bx.clearRect(0,0,W+4,H+S.stripH+4);
  let ox=0,oy=0;if(S.shake>0){ox=(Math.random()-.5)*S.shake;oy=(Math.random()-.5)*S.shake;}
  bx.save();bx.translate(ox,oy);
  const z=ZONES[S.zone];const gr=bx.createLinearGradient(0,0,0,H);gr.addColorStop(0,z.bg[0]);gr.addColorStop(1,z.bg[1]);
  bx.save();roundRect(bx,0,0,W,H,12);bx.fillStyle=gr;bx.fill();bx.clip();
  // luz da lanterna no topo
  const lg=bx.createRadialGradient(W/2,-cs,cs,W/2,-cs,H*.8);lg.addColorStop(0,'rgba(255,217,138,.12)');lg.addColorStop(1,'rgba(255,217,138,0)');bx.fillStyle=lg;bx.fillRect(0,0,W,H);
  bx.fillStyle='rgba(255,255,255,.05)';for(let r=1;r<ROWS;r++)for(let c=1;c<COLS;c++)bx.fillRect(c*cs-1,r*cs-1,2,2);
  let top=ROWS;for(let r=0;r<ROWS;r++)if(grid[r]&&grid[r].some(Boolean)){top=r;break;}
  if(top<4&&S.state!=='menu'){const a=(4-top)/4*(.22+.14*Math.sin(S.time*8));const dg=bx.createLinearGradient(0,0,0,cs*4);dg.addColorStop(0,'rgba(255,60,40,'+a+')');dg.addColorStop(1,'rgba(255,60,40,0)');bx.fillStyle=dg;bx.fillRect(0,0,W,cs*4);}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=grid[r]&&grid[r][c];if(x)drawCell(x,(c+(x.sx||0))*cs,(r+x.oy+(x.sy||0))*cs,cs);}
  for(const b of S.beams){
    const a=b.life/.4;bx.fillStyle='rgba(255,245,200,'+(a*.8)+')';
    bx.fillRect(0,(b.r+.5)*cs-cs*.18*a,W,cs*.36*a);
    if(b.c>=0)bx.fillRect((b.c+.5)*cs-cs*.18*a,0,cs*.36*a,H);
  }
  for(const g of S.rings){const m=g.big?.6:.45,p=1-g.life/m;bx.strokeStyle=g.big?'hsla('+(S.time*400%360)+',100%,70%,'+(1-p)+')':'rgba(255,170,60,'+(1-p)+')';
    bx.lineWidth=cs*.15*(1-p)+1;bx.beginPath();bx.arc((g.c+.5)*cs,(g.r+.5)*cs,cs*(.3+p*(g.big?4:1.8)),0,Math.PI*2);bx.stroke();}
  const p=S.piece;
  if(p&&S.state!=='over'){
    let gy=p.y;while(!collide(p.m,p.x,gy+1))gy++;
    p.m.forEach((row,r)=>row.forEach((x,c)=>{if(!x||gy+r<0)return;bx.strokeStyle=gemColor(x);bx.globalAlpha=.45;bx.lineWidth=2;roundRect(bx,(p.x+c)*cs+3,(gy+r)*cs+3,cs-6,cs-6,cs*.2);bx.stroke();bx.globalAlpha=1;}));
    p.m.forEach((row,r)=>row.forEach((x,c)=>{if(x&&p.y+r>=0)drawCell(x,(p.x+c)*cs,(p.y+r)*cs,cs);}));
  }
  if(S.sel!=null){const r=Math.floor(S.sel/COLS),c=S.sel%COLS;bx.strokeStyle='rgba(255,217,138,'+(.6+.4*Math.sin(S.time*10))+')';bx.lineWidth=3;roundRect(bx,c*cs+2,r*cs+2,cs-4,cs-4,cs*.22);bx.stroke();}
  for(const q of S.particles){bx.globalAlpha=Math.max(0,q.life/q.max);bx.fillStyle=q.col;const s=q.s*cs;
    if(q.spark){drawStar(q.x*cs,q.y*cs,s*1.3,s*.35,0);bx.fill();}else bx.fillRect(q.x*cs-s/2,q.y*cs-s/2,s,s);}
  bx.globalAlpha=1;bx.textAlign='center';bx.textBaseline='middle';
  for(const q of S.popups){bx.globalAlpha=Math.min(1,q.life*2);bx.font='700 '+Math.round(cs*q.size)+'px "Chakra Petch", sans-serif';
    bx.lineWidth=cs*.1;bx.strokeStyle='rgba(20,8,4,.85)';bx.strokeText(q.text,q.x*cs,q.y*cs);bx.fillStyle=q.col;bx.fillText(q.text,q.x*cs,q.y*cs);}
  bx.globalAlpha=1;
  if(S.banner){const b=S.banner,a=Math.min(1,b.life*2,(2.4-b.life)*4);bx.globalAlpha=Math.max(0,a);
    bx.fillStyle='rgba(18,8,6,.6)';bx.fillRect(0,H*.38,W,cs*2.2);
    bx.font=Math.round(cs*1.05)+'px "Rubik Dirt", Impact, sans-serif';bx.fillStyle='#e0a13a';bx.fillText(b.text,W/2,H*.38+cs*.85);
    bx.font='600 '+Math.round(cs*.36)+'px "Chakra Petch", sans-serif';bx.fillStyle='#ffd98a';bx.fillText(b.sub,W/2,H*.38+cs*1.7);bx.globalAlpha=1;}
  if(S.state==='over'){bx.fillStyle='rgba(10,4,2,.55)';bx.fillRect(0,0,W,H);}
  bx.restore();
  // faixa da próxima camada de terra (subindo)
  const y0=H+Math.round(cs*.18),sh=S.stripH-Math.round(cs*.18);
  if(S.nextRow){
    bx.save();roundRect(bx,0,y0,W,sh,6);bx.clip();
    S.nextRow.forEach((x,c)=>bx.drawImage(earthSprite(x),c*cs,y0,cs,cs));
    bx.fillStyle='rgba(10,4,2,.55)';bx.fillRect(0,y0,W,sh);
    const prog=S.state==='menu'?0:Math.min(1,S.riseT/riseInterval());
    bx.fillStyle=prog>.8?'rgba(255,75,58,'+(.7+.3*Math.sin(S.time*14))+')':'#e0a13a';bx.fillRect(0,y0,W*prog,Math.max(3,sh*.22));
    bx.restore();
  }
  bx.restore();
}
function drawNext(){
  const s=nextCv.width;nx.clearRect(0,0,s,s);if(!S.next)return;
  const m=S.next.m;let r0=9,r1=-1,c0=9,c1=-1;
  m.forEach((row,r)=>row.forEach((x,c)=>{if(x){r0=Math.min(r0,r);r1=Math.max(r1,r);c0=Math.min(c0,c);c1=Math.max(c1,c);}}));
  const cs=s/4.4,w=(c1-c0+1)*cs,h=(r1-r0+1)*cs,ox=(s-w)/2,oy=(s-h)/2;
  m.forEach((row,r)=>row.forEach((x,c)=>{if(x)nx.drawImage(gemSprite(x.c>=0?x.c:0),ox+(c-c0)*cs,oy+(r-r0)*cs,cs,cs);
    if(x&&x.sp==='bomb'){nx.fillStyle='#ffe3a0';nx.beginPath();nx.arc(ox+(c-c0+.5)*cs,oy+(r-r0+.5)*cs,cs*.12,0,Math.PI*2);nx.fill();}}));
}

/* ---------------- LAYOUT ---------------- */
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  const st=$('stage');const w=st.clientWidth,h=st.clientHeight;
  const cs=Math.max(14,Math.floor(Math.min(w/COLS,h/(ROWS+.75))));
  if(cs!==S.cs)cache={};
  S.cs=cs;S.stripH=Math.round(cs*.75);
  const W=COLS*cs,H=ROWS*cs+S.stripH;
  board.style.width=W+'px';board.style.height=H+'px';board.width=Math.round(W*DPR);board.height=Math.round(H*DPR);
  drawNext();
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>setTimeout(resize,200));

/* ---------------- FLUXO ---------------- */
function localBest(){return store.get('subsolo-best');}
function emptyGrid(){grid=[];for(let r=0;r<ROWS;r++)grid.push(new Array(COLS).fill(null));}
function startGame(){
  au();emptyGrid();bag=[];R=null;
  Object.assign(S,{state:'fall',score:0,destroyed:0,depth:0,zone:0,level:1,colors:5,cascade:0,maxCascade:1,piece:null,next:null,
    fallT:0,lockT:0,lockMoves:0,riseT:0,soft:false,recent:new Set(),sel:null,pendingTNT:[],ores:{},playTime:0,particles:[],popups:[],beams:[],rings:[],
    banner:{text:'Terra Vermelha',sub:'boa escavação',life:1.8}});
  for(let i=0;i<4;i++)grid[ROWS-1-i]=newEarthRow();
  S.nextRow=newEarthRow();
  spawnPiece();
}
function demoBoard(){
  emptyGrid();S.state='menu';S.piece=null;S.next=null;S.zone=0;S.depth=0;S.level=1;S.riseT=0;
  for(let i=0;i<5;i++)grid[ROWS-1-i]=newEarthRow();S.nextRow=newEarthRow();drawNext();
}
function gameOver(why){
  if(S.state==='over')return;
  S.state='over';S.soft=false;rep.left=rep.right=null;SFX.over();S.shake=12;
  const prev=localBest();let rec=!prev||S.score>prev.score;
  store.set('subsolo-best',{score:Math.max(S.score,prev?prev.score:0),depth:Math.max(S.depth,prev?prev.depth:0)});
  const stats={score:S.score,depth:S.depth,level:S.level,maxCascade:S.maxCascade,ores:Object.assign({},S.ores),duration:Math.round(S.playTime),reason:why,localRecord:rec&&S.score>0};
  setTimeout(()=>{if(S.state==='over'&&Game.onOver)Game.onOver(stats);},900);
}
function togglePause(){
  if(S.state==='paused'){S.state=S.prevState;if(Game.onPause)Game.onPause(false);}
  else if(S.state==='fall'||S.state==='resolve'){S.prevState=S.state;S.state='paused';S.soft=false;rep.left=rep.right=null;if(Game.onPause)Game.onPause(true);}
}
function toggleMute(){au();AU.muted=!AU.muted;if(AU.master)AU.master.gain.value=AU.muted?0:.55;$('btnMute').textContent=AU.muted?'✕':'♪';$('btnMute').style.opacity=AU.muted?.5:1;}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(S.state==='fall'||S.state==='resolve'))togglePause();});

/* ---------------- ENTRADA ---------------- */
function act(a){
  if(!S.piece||(S.state!=='fall'&&S.state!=='resolve'))return;
  if(a==='left')move(-1);else if(a==='right')move(1);else if(a==='rot')tryRotate();else if(a==='cyc')cycleColors();
  else if(a==='drop'&&S.state==='fall')hardDrop();
}
function press(a){au();if(a==='left'||a==='right'){act(a);rep[a]={t:0,init:true};}else if(a==='down')S.soft=true;else act(a);}
function release(a){if(a==='left'||a==='right')rep[a]=null;else if(a==='down')S.soft=false;}
const KEYMAP={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'rot',x:'rot',X:'rot',w:'rot',W:'rot',
  c:'cyc',C:'cyc',z:'cyc',Z:'cyc',ArrowDown:'down',s:'down',S:'down',' ':'drop'};
const playing=()=>S.state==='fall'||S.state==='resolve'||S.state==='paused';
document.addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
  if(!playing())return;
  const k=e.key;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault();
  if(e.repeat)return;
  if(k==='p'||k==='P'||k==='Escape'){togglePause();return;}
  if(k==='m'||k==='M'){toggleMute();return;}
  if(S.state==='paused')return;
  if(KEYMAP[k])press(KEYMAP[k]);
});
document.addEventListener('keyup',e=>{if(KEYMAP[e.key])release(KEYMAP[e.key]);});
document.querySelectorAll('#controls button').forEach(b=>{
  const a=b.dataset.act;
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(S.state==='paused')return;press(a);});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>release(a)));
});
let drag=null;
function cellAt(e){const r=board.getBoundingClientRect();const c=Math.floor((e.clientX-r.left)/S.cs),row=Math.floor((e.clientY-r.top)/S.cs);return inB(row,c)?{r:row,c}:null;}
const isGem=k=>{const x=cellK(k);return !!(x&&x.t==='g');};
board.addEventListener('pointerdown',e=>{
  au();if(S.state!=='fall'&&S.state!=='resolve')return;const p=cellAt(e);if(!p)return;
  drag={r:p.r,c:p.c,x:e.clientX,y:e.clientY,done:false};try{board.setPointerCapture(e.pointerId);}catch(_){}
});
board.addEventListener('pointermove',e=>{
  if(!drag||drag.done)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<S.cs*.35)return;
  let r=drag.r,c=drag.c;if(Math.abs(dx)>Math.abs(dy))c+=dx>0?1:-1;else r+=dy>0?1:-1;
  drag.done=true;S.sel=null;if(inB(r,c))trySwap(drag.r*COLS+drag.c,r*COLS+c);
});
board.addEventListener('pointerup',()=>{
  if(drag&&!drag.done){
    const k=drag.r*COLS+drag.c;
    if(S.sel!=null&&S.sel!==k){
      const r1=Math.floor(S.sel/COLS),c1=S.sel%COLS;
      if(Math.abs(r1-drag.r)+Math.abs(c1-drag.c)===1){trySwap(S.sel,k);S.sel=null;}else S.sel=isGem(k)?k:null;
    }else S.sel=(S.sel===k||!isGem(k))?null:k;
  }
  drag=null;
});
$('btnPause').addEventListener('click',()=>{au();togglePause();});
$('btnMute').addEventListener('click',toggleMute);

/* ---------------- LOOP ---------------- */
demoBoard();
let last=0;
function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(S.state!=='paused')update(dt);render();requestAnimationFrame(frame);}
resize();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{cache={};});
requestAnimationFrame(frame);

const Game={
  start:startGame,
  togglePause,
  quit(){demoBoard();},
  get state(){return S.state;},
  localBest,
  onOver:null,onPause:null,
  _t:{S,get grid(){return grid;},update,act,trySwap,findClears}
};
window.Game=Game;
})();
