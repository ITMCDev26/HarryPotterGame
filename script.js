const API_URL = 'https://script.google.com/macros/s/AKfycbz349XxM4qFVzU-F27Db1Sa7eTMGXA7FdzO_wXYyeDKmEPyZwC-I_c4l8xHwOYT2Vgq/exec'; // e.g. https://script.google.com/macros/s/XXXX/exec
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function call(fn, ...a) {
  let r;
  try { r = await fetch(API_URL + '?fn=' + fn + '&args=' + encodeURIComponent(JSON.stringify(a))); }
  catch (e) { throw new Error('Cannot reach the server. Check API_URL in script.js and your internet.'); }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Bad reply. Redeploy the web app with access set to Anyone.'); }
  if (!j.ok) throw new Error(j.error);
  return j.data;
}

const EASY = ['float', 'rain', 'swirl'], HARD = ['zigzag', 'comet', 'gravity', 'ring', 'float', 'swirl', 'rain'];
const MODE_TXT = { float: '✨ Floating Charms', rain: '🌧️ Digit Downpour', swirl: '🌀 Whirlwind', zigzag: '🐍 Serpent Sway',
  comet: '☄️ Comet Rush', gravity: '🏀 Bouncing Bludgers', ring: '💫 Twin Rings' };
const LOOK = ['O', 'I', 'S', 'B', 'G', 'Z', 'Q', 'l', 'D', 'T'], EMOJI = ['🕷️', '💀', '🦉', '🍬', '🐍'];
const rnd = n => Math.floor(Math.random() * n), diffOf = p => (p < 3 ? 0 : p - 2);
let S = null, nums = [], busy = false, mode = 'float', pos = 0, W = 0, H = 0, SZ = 48, diff = 0, sm = 1, shuf = 0, shT = 0;
let tprev = 0, running = false, snitchObj = null;
const show = id => ['login', 'game', 'end'].forEach(s => $('s-' + s).classList.toggle('hidden', s !== id));

let tt;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }
const setScore = s => { S.score = s; $('score').textContent = '⭐ ' + s; };

async function doLogin() {
  $('e1').textContent = '';
  try { S = await call('login', $('code').value); start(); } catch (e) { $('e1').textContent = e.message; }
}
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function start() {
  show('game'); $('who').textContent = '🧙 ' + S.name + ' → ' + S.target; setScore(S.score);
  if (!running) { running = true; requestAnimationFrame(tick); nextSnitch(); }
  S.digits.indexOf('-') < 0 ? finish() : round();
}

function arenaSize() { W = $('arena').clientWidth; H = $('arena').clientHeight; }
function renderSlots() {
  const cur = S.digits.indexOf('-');
  $('slots').innerHTML = S.digits.split('').map((c, i) =>
    `<div class="slot ${c !== '-' ? 'on' : ''} ${i === cur ? 'cur' : ''}">${c === '-' ? '?' : c}</div>`).join('');
}

// Difficulty: runes 1-3 easy. From rune 4 it ramps: faster, smaller, more copies, blinking, shuffling, decoys.
// The last 2 runes add fog and a flood of look-alike decoys.
function round() {
  pos = S.digits.indexOf('-'); diff = diffOf(pos); mode = pos < 3 ? EASY[pos] : HARD[(pos - 3) % HARD.length];
  sm = Math.min(2.8, 1 + .2 * diff); SZ = Math.round(Math.max(32, 48 - 2.5 * diff));
  const last = pos >= S.len - 2; shuf = diff >= 4 ? Math.max(2.2, 6 - diff * .5) : 0; shT = 0;
  $('arena').style.setProperty('--sz', SZ + 'px'); $('fog').classList.toggle('on', last);
  arenaSize(); nums.forEach(n => n.el.remove()); nums = []; busy = false;
  const lvl = pos < 3 ? 'APPRENTICE' : last ? '☠️ DARK ARTS' : '🔥 AUROR LV ' + diff;
  $('clue').innerHTML = `<small>RUNE ${pos + 1} OF ${S.len} · ${lvl} · ${MODE_TXT[mode]}</small><br>🔮 ${esc(S.clues[pos])}`;
  const copies = 3 + Math.min(2, Math.floor(diff / 3));
  for (let d = 0; d < 10; d++) for (let k = 0; k < copies; k++) spawn(d);
  const decoys = diff === 0 ? 0 : 3 * diff + (last ? 12 : 0);
  for (let i = 0; i < decoys; i++) spawn(null);
  renderSlots();
  toast(last ? '☠️ Dark Arts! Beware the look-alikes!' : diff ? '🔥 It gets harder… stay sharp!' : 'Catch the number that answers the riddle!');
}

// Colours are random per object, so a colour never tells you which digit it is
function spawn(d) {
  const decoy = d === null, el = document.createElement('div'), col = 'c' + rnd(8);
  const emo = decoy && Math.random() < .3;
  el.className = 'num ' + col; el.textContent = decoy ? (emo ? EMOJI[rnd(EMOJI.length)] : LOOK[rnd(LOOK.length)]) : d;
  const ring = rnd(3), n = { d: decoy ? 'X' : String(d), decoy, el, col, x: Math.random() * (W - SZ), y: Math.random() * (H - SZ),
    vx: (Math.random() - .5) * 170 || 40, vy: (Math.random() - .5) * 170, a: Math.random() * 6.28, bx: 0, ring,
    ph: Math.random() * 6.28, sp: (.3 + Math.random() * .6) * (Math.random() < .5 ? -1 : 1), r: .15 + Math.random() * .8 };
  if (mode === 'rain' || mode === 'zigzag') n.vy = 60 + Math.random() * 130;
  if (mode === 'comet') { const s = 100 + Math.random() * 120, g = Math.random() * 6.28; n.vx = Math.cos(g) * s; n.vy = Math.sin(g) * s; }
  if (mode === 'gravity') n.vy = 0;
  if (mode === 'ring') n.sp = (ring % 2 ? 1 : -1) * (.35 + Math.random() * .5);
  n.bx = n.x;
  el.addEventListener('pointerdown', e => { e.preventDefault(); tap(n); });
  $('arena').appendChild(el); nums.push(n); place(n);
}
const place = n => { n.el.style.transform = `translate(${n.x}px,${n.y}px)`; };
function remove(n, respawn) { n.el.remove(); nums = nums.filter(x => x !== n); if (respawn) spawn(n.decoy ? null : Number(n.d)); }
const spot = n => { const r = $('arena').getBoundingClientRect(); return [r.left + n.x + SZ / 2, r.top + n.y + SZ / 2]; };

async function tap(n) {
  if (busy || n.held) return; busy = true; n.held = true; n.el.classList.add('held');
  let r;
  try { r = await call('hit', S.code, n.d); }
  catch (e) { n.held = false; n.el.classList.remove('held'); busy = false; toast(e.message); return; }
  setScore(r.score);
  if (!r.ok) {
    n.el.classList.remove('held'); n.el.classList.add('bad');
    if (n.decoy) {
      toast('👻 A Boggart! −' + r.pen + ' and frozen!'); $('arena').classList.add('stun');
      setTimeout(() => { $('arena').classList.remove('stun'); remove(n, true); busy = false; }, 1100); return;
    }
    toast('💥 Wrong rune! −' + r.pen); setTimeout(() => { remove(n, true); busy = false; }, 500); return;
  }
  if (!r.done) {
    const w = document.createElement('div'); w.className = 'wand'; w.textContent = '🪄';
    w.style.left = (n.x - 6) + 'px'; w.style.top = (n.y - 46) + 'px'; $('arena').appendChild(w);
    setTimeout(() => { burst(...spot(n), 40); remove(n, true); w.remove(); busy = false; }, 650);
    toast('🪄 Correct! But the wand destroyed it. Catch ANOTHER one!'); return;
  }
  fly(n, r);
}

function fly(n, r) {
  const slot = $('slots').children[r.pos], a = n.el.getBoundingClientRect(), b = slot.getBoundingClientRect();
  const f = n.el.cloneNode(true); f.className = 'num fly ' + n.col; f.style.cssText = `left:${a.left}px;top:${a.top}px;transform:none;--sz:${SZ}px`;
  document.body.appendChild(f); n.el.style.visibility = 'hidden';
  f.animate([{ left: a.left + 'px', top: a.top + 'px', transform: 'scale(1.3)' },
             { left: b.left + 'px', top: b.top + 'px', transform: 'scale(.8)' }],
    { duration: 850, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = () => {
      f.remove(); S.digits = S.digits.slice(0, r.pos) + r.digit + S.digits.slice(r.pos + 1);
      renderSlots(); burst(b.left + b.width / 2, b.top + b.height / 2, 50);
      toast('✨ Rune locked in!'); setTimeout(r.complete ? finish : round, r.complete ? 900 : 700);
    };
}

function step(n, dt, t) {
  const mw = W - SZ, mh = H - SZ, v = sm * dt, cl = (x, m) => Math.max(0, Math.min(m, x));
  switch (mode) {
    case 'float': n.x += n.vx * v; n.y += n.vy * v; if (n.x < 0 || n.x > mw) n.vx *= -1; if (n.y < 0 || n.y > mh) n.vy *= -1; n.x = cl(n.x, mw); n.y = cl(n.y, mh); break;
    case 'rain': n.y += n.vy * v; if (n.y > H) { n.y = -SZ; n.x = Math.random() * mw; } break;
    case 'zigzag': n.y += n.vy * v; n.a += dt * 2.2; n.x = cl(n.bx + Math.sin(n.a) * 70, mw); if (n.y > H) { n.y = -SZ; n.bx = Math.random() * mw; } break;
    case 'comet': n.x += n.vx * v * 1.5; n.y += n.vy * v * 1.5; if (n.x < -SZ) n.x = W; if (n.x > W) n.x = -SZ; if (n.y < -SZ) n.y = H; if (n.y > H) n.y = -SZ; break;
    case 'gravity': n.vy += 700 * dt; n.y += n.vy * dt; n.x += n.vx * v * .5; if (n.y > mh) { n.y = mh; n.vy = -(320 + Math.random() * 380); } if (n.x < 0 || n.x > mw) n.vx *= -1; n.x = cl(n.x, mw); break;
    case 'ring': { n.a += n.sp * v; const rr = [.3, .62, .95][n.ring]; n.x = mw / 2 + Math.cos(n.a) * rr * mw / 2; n.y = mh / 2 + Math.sin(n.a) * rr * mh / 2; break; }
    default: n.a += n.sp * v; n.x = mw / 2 + Math.cos(n.a) * n.r * mw / 2; n.y = mh / 2 + Math.sin(n.a) * n.r * mh / 2;
  }
  if (diff >= 3) n.el.style.opacity = 1 - Math.min(.75, .15 * (diff - 2)) * (.5 + .5 * Math.sin(t / 400 * (1 + n.ph % 1) + n.ph));
}

// Every few seconds a bunch of objects teleport and change colour
function shuffle() {
  for (const n of nums) if (!n.held && Math.random() < .35) {
    const col = 'c' + rnd(8); n.el.classList.replace(n.col, col); n.col = col;
    n.a = Math.random() * 6.28; n.bx = n.x = Math.random() * (W - SZ); n.y = Math.random() * (H - SZ);
    n.el.classList.add('flash'); setTimeout(() => n.el.classList.remove('flash'), 350);
  }
}

// Golden Snitch bonus
function nextSnitch() { setTimeout(() => { if (!$('s-game').classList.contains('hidden') && !snitchObj) spawnSnitch(); nextSnitch(); }, 9000 + Math.random() * 6000); }
function spawnSnitch() {
  const el = document.createElement('div'); el.className = 'snitch'; $('arena').appendChild(el);
  snitchObj = { el, x: -40, y: 30 + Math.random() * (H - 90), vx: 240, vy: (Math.random() - .5) * 200, life: 7 };
  el.addEventListener('pointerdown', async e => {
    e.preventDefault(); const s = snitchObj; if (!s) return; const [x, y] = [s.x, s.y]; killSnitch();
    const r = $('arena').getBoundingClientRect(); burst(r.left + x + 18, r.top + y + 18, 40);
    try { const res = await call('snitch', S.code); setScore(res.score); toast('🟡 Golden Snitch caught! +50'); } catch (er) { toast(er.message); }
  });
}
function killSnitch() { if (snitchObj) { snitchObj.el.remove(); snitchObj = null; } }

// Finale
function finish() {
  show('end'); nums.forEach(n => n.el.remove()); nums = [];
  $('endbox').innerHTML = `<h2 style="color:var(--gold)">🔓 The vault opens!</h2><p>${esc(S.target)}'s secret number is</p>
    <div class="big">${S.digits}</div><p>⭐ ${S.score} house points</p><button onclick="claim()">🪄 Claim your wand</button><div id="e3" class="err"></div>`;
  for (let i = 0; i < 6; i++) setTimeout(() => burst(innerWidth * Math.random(), innerHeight * .4, 40), i * 300);
}
async function claim() {
  try {
    const w = await call('wand', S.code);
    $('endbox').innerHTML = `<h2 style="color:var(--gold)">The wand has chosen you,<br>${esc(w.name)}</h2>
    <svg class="wandsvg" viewBox="0 0 400 60"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#5a3a1b"/><stop offset="1" stop-color="#b98a52"/></linearGradient></defs>
    <path d="M10 30 Q120 22 250 28 L385 30 L250 34 Q120 40 10 30Z" fill="url(#g)"/><rect x="10" y="24" width="64" height="12" rx="6" fill="#3a2410"/>
    <circle cx="392" cy="30" r="6" fill="#fff6c8"><animate attributeName="r" values="4;9;4" dur="1.2s" repeatCount="indefinite"/></circle></svg>
    <div class="spec">Wood: ${w.wood}<br>Core: ${w.core}<br>Length: ${w.length} inches<br>House points: ${w.points} / ${w.max}</div>
    <p style="font-style:italic;opacity:.85">"It is not the number that makes the wizard, it is the courage to catch it."</p>`;
    for (let i = 0; i < 8; i++) setTimeout(() => burst(innerWidth * Math.random(), innerHeight * Math.random(), 40), i * 350);
  } catch (e) { $('e3').textContent = e.message; }
}

// Animation loop + sparkles
const cv = $('bg'), cx = cv.getContext('2d'); let P = [];
function rs() { cv.width = innerWidth; cv.height = innerHeight; }
rs(); addEventListener('resize', () => { rs(); arenaSize(); });
for (let i = 0; i < 50; i++) P.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.5 + .3, v: Math.random() * .3 + .05, a: Math.random() * .6 });
function burst(x, y, n = 30) { for (let i = 0; i < n; i++) P.push({ x, y, r: Math.random() * 2.5 + 1, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9, a: 1, b: 1 }); }

function tick(t) {
  const dt = Math.min(.05, (t - tprev) / 1000 || 0); tprev = t;
  if (!$('s-game').classList.contains('hidden')) {
    if (shuf && !busy && (shT += dt) > shuf) { shT = 0; shuffle(); }
    for (const n of nums) { if (n.held) continue; step(n, dt, t); place(n); }
    const s = snitchObj;
    if (s) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.y < 0 || s.y > H - 36) s.vy *= -1;
      s.el.style.transform = `translate(${s.x}px,${s.y}px)`; if (s.x > W + 40 || s.life < 0) killSnitch();
    }
  }
  cx.clearRect(0, 0, cv.width, cv.height);
  P = P.filter(p => !p.b || p.a > .02);
  for (const p of P) {
    if (p.b) { p.x += p.vx; p.y += p.vy; p.a *= .95; } else { p.y -= p.v; p.a += (Math.random() - .5) * .06; if (p.y < 0) p.y = cv.height; }
    cx.globalAlpha = Math.max(0, Math.min(1, p.a)); cx.fillStyle = '#ffe9a0'; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
  }
  requestAnimationFrame(tick);
}
