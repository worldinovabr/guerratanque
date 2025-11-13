let howlerSomTiro;

  
let tanque1Img, tanque2Img, fundoImg, explosionSprite, tanque1QuebradoImg, tanque2QuebradoImg;
let bombaImg; // image for plane bombs (assets/bomba.png)
let defesaImg; // image for plane defensive effect (assets/defesa.png)
let tanque1, tanque2;
// per-tank engine idle oscillation parameters (amp in px, freq in radians/frame, phase offset)
let engineOsc = [
  // further reduced amplitude for a subtler idle hum, frequency kept faster
  { amp: 0.4, freq: 0.82, phase: 0 },
  { amp: 0.3, freq: 0.72, phase: Math.PI * 0.5 }
];
let projeteis = [];
let turno = 1;
// when a player fires, mark pendingTurnOwner so we only change turn once all that player's
// projectiles are gone (or when code calls mudarTurno explicitly)
let pendingTurnOwner = 0;
let placar = [0, 0];
let explosao = null;
let explosaoTimer = 0;
let tanque1Quebrado = false;
let tanque2Quebrado = false;
let tanque1QuebradoTemp = false;
let tanque2QuebradoTemp = false;
let aguardandoRecomecar = false;
let explosionFrame = 0;
let explosionMaxFrames = 8;
let explosionSpriteW = 128;
let explosionSpriteH = 128;
let somExplosao;
let howlerExplosao;
let howlerFundoMusical;
let aviaoQuebrado1Img, aviaoQuebrado2Img;
let vida = [100, 100];
let p5Ready = false; // becomes true after setup() completes
const PLANE_SPEED_FACTOR = 1; // 1.0 = normal speed, <1 slower
let fallenPlanes = []; // fragments for broken planes that fall with gravity
let planeCounter = 0; // unique id for planes (kept for future use)

// Controle de visibilidade dos botões
let botoesVisiveis = true;
let botaoAtirarSolo = false;
let clickCount = 0;
let clickTimer = null;

// Sistema de fumaça realista
let smokeParticles = [];

// Função para calcular fator de escala baseado na resolução atual
function getScreenScale() {
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const is800x600 = window.innerWidth === 800 && window.innerHeight === 600;
  
  if (is800x600) {
    return 1.0;
  } else if (isMobile) {
    return 0.5; // Mobile usa escala menor para elementos visuais
  } else {
    return 2.0; // Desktop usa escala maior
  }
}

class SmokeParticle {
  constructor(x, y, intensity = 1, colorBase = null) {
    this.x = x;
    this.y = y;
    this.vx = random(-0.5, 0.5) * intensity;
    this.vy = random(-1, -2) * intensity; // sobe
    // reduced base sizes for subtler smoke
    this.size = random(12, 28) * intensity;
    this.maxSize = this.size + random(10, 30);
    this.alpha = random(100, 180);
    this.life = 255;
    this.color = colorBase !== null ? colorBase : random(40, 80); // tons de cinza escuro ou cor customizada
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.02, 0.02);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx += random(-0.1, 0.1); // movimento orgânico
    this.vy *= 0.98; // desacelera
    this.size = lerp(this.size, this.maxSize, 0.02);
    this.life -= random(1, 3);
    this.alpha = map(this.life, 0, 255, 0, 180);
    this.rotation += this.rotationSpeed;
  }
  
  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    noStroke();
    // Múltiplas camadas para profundidade
    fill(this.color, this.alpha * 0.6);
    ellipse(0, 0, this.size * 1.2, this.size);
    fill(this.color + 20, this.alpha * 0.8);
    ellipse(0, 0, this.size * 0.8, this.size * 0.7);
    fill(this.color + 40, this.alpha);
    ellipse(0, 0, this.size * 0.5, this.size * 0.5);
    pop();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

function addSmoke(x, y, count = 1, intensity = 1, colorBase = null) {
  for (let i = 0; i < count; i++) {
    smokeParticles.push(new SmokeParticle(x + random(-10, 10), y + random(-5, 5), intensity, colorBase));
  }
}

// Fumaça branca para motores de tanques (misturada com fumaça escura)
function addWhiteEngineSmoke(x, y, count = 1, intensity = 0.3) {
  for (let i = 0; i < count; i++) {
    // Mistura de fumaça branca e escura (30% branca, 70% escura)
    let colorBase = random(100) < 30 ? random(200, 240) : random(60, 100);
    smokeParticles.push(new SmokeParticle(x + random(-3, 3), y + random(-2, 2), intensity, colorBase));
  }
}

// Small horizontal engine smoke particles (lighter and more transparent)
class EngineSmokeParticle {
  constructor(x, y, dir = 1) {
    this.x = x;
    this.y = y;
    // make the engine smoke long and thin (stick-like)
    // slightly stronger horizontal velocity so the puff stretches into a thin trail
    this.vx = -dir * (0.6 + random(0, 0.6));
    // keep very small vertical jitter so the stick remains mostly horizontal
    this.vy = random(-0.02, 0.02);
  // base size controls the thickness; increase slightly to make the stick a bit thicker
  this.size = random(3, 6);
    // longer life so the stick extends and remains visible longer
    this.maxLife = Math.floor(random(40, 90));
    this.life = this.maxLife;
  // slightly stronger alpha so the thicker smoke is visible but still translucent
  this.initAlpha = random(50, 130);
    this.alpha = this.initAlpha;
    // minimal rotation to keep the stick mostly horizontal
    this.rotation = random(-0.03, 0.03);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // slight slow-down of horizontal component so puffs spread out gently
    this.vx *= 0.995;
    this.life--;
    // fade using the stored initial alpha and actual lifespan
    this.alpha = map(this.life, 0, this.maxLife, 0, this.initAlpha);
    this.rotation *= 0.995;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    noStroke();
  // stick-like elongated puff: long but slightly thicker than before
  const w = this.size * 12; // length of the stick
  const h = Math.max(2, this.size * 0.9); // thicker height for a chunkier stick
  fill(255, this.alpha * 0.95);
  ellipse(0, 0, w, h);
  // inner faint core for softness, slightly stronger for thicker smoke
  fill(255, this.alpha * 0.45);
  ellipse(0, 0, Math.max(1, w * 0.6), Math.max(1, h * 0.6));
    pop();
  }

  isDead() {
    return this.life <= 0 || this.alpha <= 2;
  }
}

function addEngineSmoke(x, y, dir = 1, count = 1) {
  for (let i = 0; i < count; i++) {
    smokeParticles.push(new EngineSmokeParticle(x + random(-3, 3), y + random(-1.5, 1.5), dir));
  }
}

// --- Canvas ground fire: short-lived flame particles + spawns smoke via addSmoke ---
let fireParticles = [];
let groundFires = [];
// independent anchor positions for ground fire/smoke (so they don't track tanks)
let groundFireAnchors = [];

function setGroundFireAnchor(index, x, y) {
  groundFireAnchors[index] = { x: x, y: y };
  // if a GroundFire instance exists at this index, update its position immediately
  if (groundFires[index]) {
    groundFires[index].x = x;
    groundFires[index].y = y;
  }
}

function getGroundFireAnchor(index) {
  return groundFireAnchors[index];
}

class FireParticle {
  constructor(x, y, scale = 1) {
    this.x = x + random(-6, 6);
    this.y = y + random(-4, 4);
    this.vx = random(-0.6, 0.6);
    this.vy = random(-1.2, -0.4);
    // slightly smaller flames for a more subtle look; allow per-emitter scaling
    this.size = random(4, 12) * scale;
    this.life = Math.floor(random(14, 30) * scale);
    this.age = 0;
    this.hue = random(20, 40); // warm hue range
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // gentle upward acceleration for flame
    this.vy += 0.025;
    // shrink a bit
    this.size *= 0.98;
    this.age++;
  }

  display() {
    push();
    translate(this.x, this.y);
    noStroke();
    // additive glow
    blendMode(ADD);
    const t = this.age / this.life;
    // core
    fill(255, 180, 40, map(1 - t, 0, 1, 0, 220));
    ellipse(0, 0, this.size * 1.6, this.size);
    // inner
    fill(255, 110, 20, map(1 - t, 0, 1, 0, 180));
    ellipse(0, 0, this.size, this.size * 0.7);
    // tiny ember
    fill(255, 220, 90, map(1 - t, 0, 1, 0, 120));
    ellipse(random(-2,2), random(-2,2), max(1, this.size * 0.2));
    blendMode(BLEND);
    pop();
  }

  isDead() {
    return this.age >= this.life || this.size < 0.6;
  }
}

class GroundFire {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.rate = opts.rate || 3; // smoke spawn rate divisor (higher = less smoke)
    this.fireRate = opts.fireRate || 2; // frames per flame spawn (higher = less flames)
    // per-emitter tuning
    this.smokeCount = (typeof opts.smokeCount === 'number') ? opts.smokeCount : 1;
    this.smokeIntensity = (typeof opts.smokeIntensity === 'number') ? opts.smokeIntensity : 0.55;
    this.fireSizeScale = (typeof opts.fireSizeScale === 'number') ? opts.fireSizeScale : 1;
    this.tick = 0;
    this.tankIndex = opts.tankIndex; // índice do tanque (0 ou 1) para acompanhar sua posição
    this.offsetX = opts.offsetX || 0; // offset X relativo ao tanque
    this.offsetY = opts.offsetY || 0; // offset Y relativo ao tanque
  }

  update() {
    // Se está vinculado a um tanque, atualiza posição baseada no tanque
    if (this.tankIndex !== undefined) {
      const tank = this.tankIndex === 0 ? tanque1 : tanque2;
      this.x = tank.x + this.offsetX;
      this.y = tank.y + this.offsetY;
    }
    
    this.tick++;
    // spawn smoke every few frames
    if (this.tick % this.rate === 0) {
      // spawn smoke using emitter-specific count/intensity
      addSmoke(this.x + random(-6,6), this.y - 6 + random(-4,4), Math.max(0, Math.floor(this.smokeCount)), this.smokeIntensity);
    }
    // spawn flames more frequently
    if (this.tick % this.fireRate === 0) {
      fireParticles.push(new FireParticle(this.x + random(-6,6), this.y + random(-4,4), this.fireSizeScale));
    }
  }
}

function createGroundFireAt(x, y, opts) {
  groundFires.push(new GroundFire(x, y, opts));
}

function updateGroundFires() {
  for (let g of groundFires) g.update();
}

function drawFireParticles() {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.update();
    p.display();
    if (p.isDead()) fireParticles.splice(i, 1);
  }
}

function updateSmoke() {
  // Atualiza e remove partículas mortas
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    smokeParticles[i].update();
    if (smokeParticles[i].isDead()) {
      smokeParticles.splice(i, 1);
    }
  }
}

function displaySmoke() {
  for (let particle of smokeParticles) {
    particle.display();
  }
}

// (Removed canvas-based ground fire emitter — using CSS 3D layer instead)

// --- Plane HUD: show plane HP to the player ---
function updatePlaneHUD(planeEl) {
  try {
    // HUD intentionally disabled: remove any existing HUD and do nothing.
    // The user requested the on-screen plane life bars be removed because they were not working.
    // Keep a cleanup path so any pre-existing element is removed.
    const existing = document.getElementById('plane-life-hud');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    return;
  } catch (e) {
    // ignore HUD errors
  }
}

function removePlaneHUD() {
  const hud = document.getElementById('plane-life-hud');
  if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
}


window.addEventListener('DOMContentLoaded', function() {
  howlerExplosao = new Howl({ src: ['explosao.mp3'], volume: 0.5 });
  howlerFundoMusical = new Howl({ src: ['fundomusical.mp3'], volume: 0.7, loop: true });
  howlerSomTiro = new Howl({ src: ['somtiro.mp3'], volume: 0.7 });
  // Toca a música de fundo automaticamente
  howlerFundoMusical.play();
  // Toca o som do tiro ao clicar no botão Disparar
  var btnDisparar = document.getElementById('disparar');
  if (btnDisparar) {
    btnDisparar.addEventListener('click', function() {
      if (howlerSomTiro) howlerSomTiro.play();
    });
  }
  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW registration failed:', err));
  }
});

// PWA install flow: show install prompt as soon as browser allows it
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  deferredPrompt = e;
  // Try to prompt immediately
  setTimeout(async () => {
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Optional: log the outcome
      console.log('User response to install prompt:', outcome);
      deferredPrompt = null;
    } catch (err) {
      console.warn('Install prompt failed:', err);
    }
  }, 700); // give the page a short moment to finish loading UI
});

// Toca som de explosão quando inicia a animação
window.__explosaoAnterior = false;
function tocarSomExplosaoSeNecessario() {
  if (explosao && !window.__explosaoAnterior) {
    if (howlerExplosao) howlerExplosao.play();
  }
  window.__explosaoAnterior = !!explosao;
}

function preload() {
  // Função auxiliar para criar placeholder
  function placeholder(w, h, txt) {
    let gfx = createGraphics(w, h);
    gfx.background(100);
    gfx.fill(255);
    gfx.textAlign(CENTER, CENTER);
    gfx.textSize(16);
    gfx.text(txt, w/2, h/2);
    return gfx;
  }

  tanque1Img = loadImage(
    "tanque1.png",
    undefined,
    () => { tanque1Img = placeholder(90, 90, "Tanque 1"); }
  );
  tanque2Img = loadImage(
    "tanque2.png",
    undefined,
    () => { tanque2Img = placeholder(90, 90, "Tanque 2"); }
  );
  fundoImg = loadImage(
    "fundo.png",
    undefined,
    () => {
      let gfx = createGraphics(800, 400);
      gfx.background(220, 200, 120);
      gfx.fill(180, 140, 60);
      gfx.rect(0, 300, 800, 100);
      gfx.fill(60, 180, 60);
      gfx.ellipse(700, 350, 60, 80);
      gfx.fill(0);
      gfx.textAlign(CENTER, CENTER);
      gfx.textSize(32);
      gfx.text("Cenário", 400, 200);
      fundoImg = gfx;
    }
  );
  explosionSprite = loadImage(
    "explosion_sprite.png",
    undefined,
    () => { explosionSprite = placeholder(128, 128, "EXPLOSÃO"); }
  );
  bombaImg = loadImage(
    'assets/bomba.png',
    undefined,
    () => { bombaImg = placeholder(24, 24, 'BOMBA'); }
  );
  aviaoQuebrado1Img = loadImage(
    'aviaoquebrado1.png',
    undefined,
    () => { aviaoQuebrado1Img = placeholder(120, 60, 'AQ1'); }
  );
  aviaoQuebrado2Img = loadImage(
    'aviaoquebrado2.png',
    undefined,
    () => { aviaoQuebrado2Img = placeholder(120, 60, 'AQ2'); }
  );
  defesaImg = loadImage(
    'assets/defesa.png',
    undefined,
    () => { defesaImg = placeholder(64, 64, 'DEF'); }
  );
  tanque1QuebradoImg = loadImage(
    "tanquequebrado1.png",
    undefined,
    () => { tanque1QuebradoImg = placeholder(90, 90, "Quebrado1"); }
  );
  tanque2QuebradoImg = loadImage(
    "tanquequebrado2.png",
    undefined,
    () => { tanque2QuebradoImg = placeholder(90, 90, "Quebrado2"); }
  );
}

function setup() {
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const is800x600 = window.innerWidth === 800 && window.innerHeight === 600;

  // 800x600: canvas específico, Desktop: canvas (1600x600), Mobile: canvas padrão (800x400)
  if (is800x600) {
    createCanvas(800, 600);
  } else if (isMobile) {
    createCanvas(800, 400);
  } else {
    createCanvas(1600, 600);
  }

  // Ajusta posições e tamanhos dos tanques proporcionalmente ao canvas
  let scale, yOffset;
  if (is800x600) {
    scale = 1.0;
    yOffset = 100; // ajuste para centralizar verticalmente em 800x600
  } else {
    scale = isMobile ? 1 : 2.0;
    yOffset = isMobile ? 0 : -100;
  }
  
  tanque1 = { x: 150 * scale, y: (315 * scale) + yOffset, w: 90 * scale, h: 135 * scale };
  tanque2 = { x: 700 * scale, y: (315 * scale) + yOffset, w: 110 * scale, h: 135 * scale };
  vida = [100, 100];
  setTimeout(() => {
    atualizarBarraVida('vida1', vida[0]);
    atualizarBarraVida('vida2', vida[1]);
  }, 100);
  p5Ready = true;

  try {
    setGroundFireAnchor(0, tanque1.x - 88 * scale, tanque1.y + 10 * scale);
    setGroundFireAnchor(1, tanque2.x + 86 * scale, tanque2.y + 10 * scale);
    
    // Ajusta taxas de fogo baseado na resolução
    const fireRate = is800x600 ? 7 : (isMobile ? 8 : 5);
    const fireRateFlames = is800x600 ? 5 : (isMobile ? 6 : 3);
    
    // Fogo do tanque 1 - fixo no cenário (NÃO acompanha o tanque)
    createGroundFireAt(groundFireAnchors[0].x, groundFireAnchors[0].y, { 
      rate: fireRate, 
      fireRate: fireRateFlames
    });
    // Fogo do tanque 2 - fixo no cenário (NÃO acompanha o tanque)
    createGroundFireAt(groundFireAnchors[1].x, groundFireAnchors[1].y, { 
      rate: fireRate, 
      fireRate: fireRateFlames
    });
    const midX = Math.round((tanque1.x + tanque2.x) / 2);
    const midY = Math.round(Math.min(tanque1.y, tanque2.y) + 5 * scale);
    setGroundFireAnchor(2, midX, midY);
    
    const midFireRate = is800x600 ? 11 : (isMobile ? 12 : 10);
    const midFireRateFlames = is800x600 ? 9 : (isMobile ? 10 : 8);
    const midSmokeIntensity = is800x600 ? 0.3 : (isMobile ? 0.25 : 0.35);
    const midFireScale = is800x600 ? 0.5 : (isMobile ? 0.45 : 0.55);
    
    createGroundFireAt(groundFireAnchors[2].x, groundFireAnchors[2].y, { 
      rate: midFireRate, 
      fireRate: midFireRateFlames, 
      smokeCount: 1, 
      smokeIntensity: midSmokeIntensity, 
      fireSizeScale: midFireScale 
    });
  } catch (e) {
    console.warn('Could not create ground fire emitters:', e);
  }
}

function draw() {
  tocarSomExplosaoSeNecessario();
  background(30);
  image(fundoImg, 0, 0, width, height);
  
  // Atualiza geradores de fogo no chão
  updateGroundFires();
  // Atualiza partículas de fumaça (remove mortas, as novas fumaças podem ter sido adicionadas acima)
  updateSmoke();

  // Occasionally reposition the CSS corner-fire so it aligns with the canvas emitter
  // (CSS corner-fire removed) no DOM positioning calls needed here

  // (CSS corner fire will be positioned to match canvas; canvas-based fire removed)

  // engine idle oscillation for tank1 (subtle constant hum)
  const t = frameCount || 0;
  const e0 = engineOsc[0] || { amp: 1.2, freq: 0.06, phase: 0 };
  const ox0 = 0; // keep horizontal position steady
  const oy0 = Math.sin(t * e0.freq + e0.phase) * e0.amp; // vertical-only oscillation

  push();
  translate(tanque1.x + ox0, tanque1.y + oy0);
  scale(-1.3, 1);
  if (vida[0] <= 0) {
    // Exibir o tanque quebrado sem inversão (apply offset)
    pop();
    image(tanque1QuebradoImg, tanque1.x - tanque1.w / 2 -20 + ox0, tanque1.y - tanque1.h / 2 -60 + oy0, tanque1.w, tanque1.h);
  } else {
    image(tanque1Img, -tanque1.w / 2, -tanque1.h / 2, tanque1.w, tanque1.h);
    pop();
    // Fumaça branca do motor do tanque 1 (traseira, saindo para cima)
    if (frameCount % 12 === 0) {
      addWhiteEngineSmoke(tanque1.x - tanque1.w * 0.35, tanque1.y - tanque1.h * 0.1, 1, 0.3);
    }
  }

  // engine idle oscillation for tank2
  const e1 = engineOsc[1] || { amp: 1.2, freq: 0.06, phase: Math.PI * 0.5 };
  const ox1 = 0; // no horizontal oscillation for engine hum
  const oy1 = Math.sin(t * e1.freq + e1.phase) * e1.amp;

  if (vida[1] <= 0) {
    push();
    translate(tanque2.x + ox1, tanque2.y + oy1);
    scale(-1, 1);
    image(tanque2QuebradoImg, -tanque2.w / 2, -tanque2.h / 2 - 60, tanque2.w, tanque2.h); // Move image 20px up
    pop();
  } else {
    image(tanque2Img, tanque2.x - tanque2.w / 2 + ox1, tanque2.y - tanque2.h / 2 + oy1, tanque2.w, tanque2.h);
    // Fumaça branca do motor do tanque 2 (traseira, saindo para cima)
    if (frameCount % 12 === 0) {
      addWhiteEngineSmoke(tanque2.x + tanque2.w * 0.35, tanque2.y - tanque2.h * 0.1, 1, 0.3);
    }
  }

  // Explosão: suporta animação por sprite (tanques/bombas) e modo estático com fade (acerto de avião)
  if (explosao) {
    if (explosao.fade) {
      // Static frame + fade out using tint alpha
      push();
      // alpha is 0..255
      if (explosao.img) {
        // draw provided image (e.g., defense icon) with fade
        tint(255, explosao.alpha);
        image(explosao.img, explosao.x - explosao.size / 2, explosao.y - explosao.size / 2, explosao.size, explosao.size);
        noTint();
      } else if (explosao.fallback || !explosionSprite) {
        // fallback: draw a quick visible circle where the explosion should be
        noStroke();
        fill(255, 200, 0, explosao.alpha);
        ellipse(explosao.x, explosao.y, explosao.size, explosao.size);
      } else {
        tint(255, explosao.alpha);
        // draw first frame of the sprite sheet as a static explosion
        image(
          explosionSprite,
          0, 0, explosionSpriteW, explosionSpriteH,
          explosao.x - explosao.size / 2, explosao.y - explosao.size / 2, explosao.size, explosao.size
        );
        noTint();
      }
      pop();
      // decrease alpha until it disappears
      explosao.alpha -= (explosao.fadeStep || 6);
      if (explosao.alpha <= 0) {
        explosao = null;
      }
    } else if (explosaoTimer > 0) {
      // existing animated sprite behaviour (kept for tank/bomb explosions)
      let frame = Math.floor(explosionFrame);
      let sx = (frame % explosionMaxFrames) * explosionSpriteW;
      let sy = 0;
      image(
        explosionSprite,
        sx, sy, explosionSpriteW, explosionSpriteH,
        explosao.x - explosao.size / 2, explosao.y - explosao.size / 2, explosao.size, explosao.size
      );
      explosionFrame += 0.7;
      explosaoTimer--;
      if (explosionFrame >= explosionMaxFrames) explosionFrame = 0;
      if (explosaoTimer === 0) {
        explosao = null;
      }
    }
  }

  // Fallen broken planes: update physics and draw them (they fall with gravity until removed)
  if (fallenPlanes.length > 0) {
    // Obter escala para fumaça dos aviões
    const screenScale = getScreenScale();
    
    for (let k = fallenPlanes.length - 1; k >= 0; k--) {
      const fp = fallenPlanes[k];
      // physics
      fp.x += fp.vx;
      fp.y += fp.vy;
      fp.vy += fp.grav;
      fp.rot += fp.rotV;
      
      // Gera fumaça do avião caindo (proporcional)
      if (frameCount % 3 === 0) {
        addSmoke(fp.x, fp.y, Math.floor(2 * screenScale), 1.2 * screenScale);
      }
      
      // fade out when below screen or after timeout
      if (fp.y > height + fp.size || (fp.lifetime !== undefined && fp.lifetime-- <= 0)) {
        fallenPlanes.splice(k, 1);
        continue;
      }
      push();
      translate(fp.x, fp.y);
      rotate(fp.rot);
      tint(255, fp.alpha || 255);
      if (fp.img) {
        image(fp.img, -fp.size/2, -fp.size/2, fp.size, fp.size);
      } else {
        // fallback visual
        noStroke();
        fill(180, 80, 20, 220);
        ellipse(0, 0, fp.size, fp.size);
      }
      noTint();
      pop();
    }
  }

  // Projéteis em movimento
  if (!aguardandoRecomecar) {
    // Cache expensive DOM queries per frame (avoid calling getBoundingClientRect inside the projectile loop)
    const planeEl = document.querySelector('.aviao-fly');
    const canvas = document.querySelector('canvas');
    let planeHitbox = null; // { x,y,w,h, centerX, centerY }
    if (planeEl && canvas) {
      try {
        const pr = planeEl.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        const planeX = ((pr.left - cr.left) / cr.width) * width;
        const planeY = ((pr.top - cr.top) / cr.height) * height;
        const planeW = (pr.width / cr.width) * width;
        const planeH = (pr.height / cr.height) * height;
        planeHitbox = {
          x: planeX,
          y: planeY,
          w: planeW,
          h: planeH,
          centerX: ((pr.left + pr.width/2 - cr.left) / cr.width) * width,
          centerY: ((pr.top + pr.height/2 - cr.top) / cr.height) * height,
          rawPr: pr,
          rawCr: cr
        };
      } catch (e) {
        planeHitbox = null;
      }
    }

    for (let i = projeteis.length - 1; i >= 0; i--) {
      let p = projeteis[i];
      if (!p) continue;
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravidade) p.vy += p.gravidade;

      // --- Plane collision (only for player projectiles) ---
      if ((p.owner === 1 || p.owner === 2) && planeHitbox && planeEl) {
        if (p.x > planeHitbox.x && p.x < planeHitbox.x + planeHitbox.w && p.y > planeHitbox.y && p.y < planeHitbox.y + planeHitbox.h) {
          // hit
          planeEl._hp = (typeof planeEl._hp === 'number') ? planeEl._hp - 1 : -1;
          // remove projectile
          projeteis.splice(i, 1);

          // Obter escala da tela para elementos responsivos
          const screenScale = getScreenScale();

          // first hit: darken + show small defense effect
          if (planeEl._hp > 0) {
            planeEl.style.opacity = '0.6';
            planeEl.style.filter = 'brightness(0.7)';
            explosao = { x: planeHitbox.centerX, y: planeHitbox.centerY, size: 100 * screenScale, fade: true, alpha: 255, fadeStep: 10, img: defesaImg };
            addSmoke(planeHitbox.centerX, planeHitbox.centerY, Math.floor(3 * screenScale), 0.8 * screenScale);
          } else {
            // destroyed
            explosao = { x: planeHitbox.centerX, y: planeHitbox.centerY, size: 120 * screenScale };
            explosaoTimer = 40;
            addSmoke(planeHitbox.centerX, planeHitbox.centerY, Math.floor(8 * screenScale), 1.5 * screenScale);
            if (p.owner === 1 || p.owner === 2) {
              placar[p.owner - 1]++;
              document.getElementById('p1score').textContent = placar[0];
              document.getElementById('p2score').textContent = placar[1];
            }
            // create falling fragment
            try {
              const pr = planeHitbox.rawPr;
              const cr = planeHitbox.rawCr;
              const planeWCanvas = (pr.width / cr.width) * width;
              const planeHCanvas = (pr.height / cr.height) * height;
              const sizeForPlane = Math.max(64 * screenScale, Math.min(220 * screenScale, Math.max(planeWCanvas, planeHCanvas) * 1.1));
              const frag = {
                x: planeHitbox.centerX,
                y: planeHitbox.centerY,
                size: sizeForPlane,
                vx: (planeEl._dir || 1) * (1 + Math.random() * 2),
                vy: 1 + Math.random() * 2,
                grav: 0.18,
                rot: 0,
                rotV: (Math.random() - 0.5) * 0.08,
                img: aviaoQuebrado1Img,
                alpha: 255
              };
              fallenPlanes.push(frag);
            } catch (e) {
              // ignore fragment errors
            }
            // remove plane element and request respawn
            try { if (planeEl && planeEl.parentNode) planeEl.parentNode.removeChild(planeEl); } catch (e) {}
            document.dispatchEvent(new CustomEvent('planeHit', { detail: { delayRespawn: 1200 } }));
          }
          continue; // move to next projectile
        }
      }

      // --- Draw projectile ---
      if (p.owner === 0) {
        if (typeof bombaImg !== 'undefined' && bombaImg) {
          const bw = 25; const bh = 10;
          image(bombaImg, p.x - bw / 2, p.y - bh / 2, bw, bh);
        } else {
          push(); noStroke(); fill(200,30,30); ellipse(p.x, p.y, 18, 18);
          fill(120,20,20,160); ellipse(p.x, p.y+4, 10, 6); pop();
        }
      } else {
        push(); translate(p.x, p.y); let ang = atan2(p.vy, p.vx); rotate(ang);
        fill(200); stroke(80); strokeWeight(1); rect(-8, -3, 16, 6, 3);
        fill(220,0,0); noStroke(); ellipse(8,0,7,7);
        let fireLen = 6 + random(2,6); fill(255,180,0,180); ellipse(-10,0,fireLen,6);
        fill(255,80,0,120); ellipse(-13,0,fireLen*0.7,4); pop();
      }

      // --- Tank collisions / scoring ---
      const tankHit = (tankObj) => {
        const hb = { x: tankObj.x - tankObj.w/2, y: tankObj.y - tankObj.h/2, w: tankObj.w, h: tankObj.h };
        return p.x > hb.x && p.x < hb.x + hb.w && p.y > hb.y && p.y < hb.y + hb.h;
      };
      const hitTank1 = tankHit(tanque1);
      const hitTank2 = tankHit(tanque2);
      if (p.owner === 0) {
        let damagedIdx = -1; if (hitTank1) damagedIdx = 0; else if (hitTank2) damagedIdx = 1;
        if (damagedIdx !== -1) {
          vida[damagedIdx] = Math.max(0, vida[damagedIdx] - 10);
          setTimeout(() => atualizarBarraVida(damagedIdx === 0 ? 'vida1' : 'vida2', vida[damagedIdx]), 50);
          
          // Obter escala da tela para elementos responsivos
          const screenScale = getScreenScale();
          
          explosao = { x: (damagedIdx === 0 ? tanque1.x : tanque2.x), y: (damagedIdx === 0 ? tanque1.y : tanque2.y), size: 120 * screenScale };
          explosaoTimer = 40;
          let anchor = groundFireAnchors[damagedIdx];
          let smokeOffsetX = (anchor && isFinite(anchor.x)) ? anchor.x : ((damagedIdx === 0) ? (tanque1.x - 12) : (tanque2.x + 36));
          let smokeOffsetY = (anchor && isFinite(anchor.y)) ? anchor.y : (damagedIdx === 0 ? tanque1.y : tanque2.y);
          
          // Efeito de explosão de fogo e fumaça quando bomba atinge tanque (alinhados verticalmente, na base do tanque)
          const explosionY = p.y + (60 * screenScale); // Um pouco mais acima (era 80)
          const fireCount = Math.floor(35 * screenScale); // Quantidade proporcional
          for (let f = 0; f < fireCount; f++) {
            fireParticles.push(new FireParticle(p.x, explosionY, 2.2 * screenScale));
          }
          // Apenas uma fumaça (tamanho reduzido em 50%)
          addSmoke(p.x, explosionY, Math.floor(8 * screenScale), 0.25 * screenScale);
          
          // Adicionar fogo contínuo que acompanha o tanque atingido
          const tankObj = (damagedIdx === 0 ? tanque1 : tanque2);
          // Calcula offset relativo à posição atual do tanque
          const offsetXFire = p.x - tankObj.x;
          
          // Calcula offset Y baseado na proximidade do centro do tanque
          // Quanto mais perto do centro, mais acima fica o fogo
          const distanceFromCenter = Math.abs(offsetXFire);
          const maxDistance = tankObj.w / 2; // metade da largura do tanque
          const proximityRatio = 1 - Math.min(distanceFromCenter / maxDistance, 1);
          // Varia de 30 (nas bordas) até -20 (no centro) - mais acima quando no meio
          const offsetYFire = (30 - (proximityRatio * 50)) * screenScale;
          
          const fireEmitter = new GroundFire(p.x, tankObj.y + offsetYFire, { 
            rate: 6, 
            fireRate: 4, 
            smokeCount: 1, 
            smokeIntensity: 0.4 * screenScale, 
            fireSizeScale: 0.7 * screenScale,
            tankIndex: damagedIdx, // vincula ao tanque
            offsetX: offsetXFire, // offset X relativo ao centro do tanque
            offsetY: offsetYFire // offset Y relativo ao centro do tanque
          });
          groundFires.push(fireEmitter);
          
          // Adicionar pequenas chamas contínuas e visíveis sobre o tanque atingido
          const flameCount = Math.floor(12 * screenScale);
          for (let flame = 0; flame < flameCount; flame++) {
            let fx = p.x + random(-20 * screenScale, 20 * screenScale);
            let fy = p.y + random(-8 * screenScale, 8 * screenScale);
            let fire = new FireParticle(fx, fy, 1.2 * screenScale);
            fire.vy = random(-0.3, 0.1); // movimento mais lento para ficar visível sobre o tanque
            fire.life = Math.floor(random(25, 45)); // vida mais longa
            fireParticles.push(fire);
          }
          projeteis.splice(i, 1);
          if (damagedIdx === 0 && vida[damagedIdx] > 0) { tanque1QuebradoTemp = true; setTimeout(() => { tanque1QuebradoTemp = false; }, 1000); }
          else if (damagedIdx === 1 && vida[damagedIdx] > 0) { tanque2QuebradoTemp = true; setTimeout(() => { tanque2QuebradoTemp = false; }, 1000); }
          if (vida[damagedIdx] <= 0) { aguardandoRecomecar = true; setTimeout(() => { document.getElementById('recomecar').style.display = 'inline-flex'; }, 300); }
          continue;
        }
      } else {
        const adversarioIdx = (turno === 1 ? 1 : 0);
        const adversarioTank = adversarioIdx === 0 ? tanque1 : tanque2;
        if (tankHit(adversarioTank)) {
          if (p.owner === 1 || p.owner === 2) { placar[p.owner - 1]++; document.getElementById('p1score').textContent = placar[0]; document.getElementById('p2score').textContent = placar[1]; }
          vida[adversarioIdx] = Math.max(0, vida[adversarioIdx] - 10);
          setTimeout(() => atualizarBarraVida(adversarioIdx === 0 ? 'vida1' : 'vida2', vida[adversarioIdx]), 50);
          
          // Obter escala da tela para elementos responsivos
          const screenScale = getScreenScale();
          
          explosao = { x: adversarioTank.x, y: adversarioTank.y, size: 120 * screenScale };
          explosaoTimer = 40;
          
          // Efeito de explosão de fogo e fumaça quando tiro de tanque atinge adversário
          const explosionY = p.y + (100 * screenScale); // Proporcional ao tamanho da tela
          const fireCount = Math.floor(35 * screenScale); // Quantidade proporcional
          for (let f = 0; f < fireCount; f++) {
            fireParticles.push(new FireParticle(p.x, explosionY, 2.2 * screenScale));
          }
          // Fumaça alinhada verticalmente com o fogo no ponto de impacto
          addSmoke(p.x, explosionY, Math.floor(35 * screenScale), 2.5 * screenScale);
          addSmoke(adversarioTank.x, adversarioTank.y, Math.floor(10 * screenScale), 1.8 * screenScale);
          
          // Adicionar fogo contínuo que acompanha o tanque atingido
          const tankObj = adversarioTank;
          // Calcula offset relativo à posição atual do tanque
          const offsetXFire = p.x - tankObj.x;
          
          // Calcula offset Y baseado na proximidade do centro do tanque
          // Quanto mais perto do centro, mais acima fica o fogo
          const distanceFromCenter = Math.abs(offsetXFire);
          const maxDistance = tankObj.w / 2; // metade da largura do tanque
          const proximityRatio = 1 - Math.min(distanceFromCenter / maxDistance, 1);
          // Varia de 30 (nas bordas) até -20 (no centro) - mais acima quando no meio
          const offsetYFire = (30 - (proximityRatio * 50)) * screenScale;
          
          const fireEmitter = new GroundFire(p.x, tankObj.y + offsetYFire, { 
            rate: 6, 
            fireRate: 4, 
            smokeCount: 1, 
            smokeIntensity: 0.4 * screenScale, 
            fireSizeScale: 0.7 * screenScale,
            tankIndex: adversarioIdx, // vincula ao tanque
            offsetX: offsetXFire, // offset X relativo ao centro do tanque
            offsetY: offsetYFire // offset Y relativo ao centro do tanque
          });
          groundFires.push(fireEmitter);
          
          // Adicionar pequenas chamas contínuas e visíveis sobre o tanque atingido
          const flameCount = Math.floor(12 * screenScale);
          for (let flame = 0; flame < flameCount; flame++) {
            let fx = p.x + random(-20 * screenScale, 20 * screenScale);
            let fy = p.y + random(-8 * screenScale, 8 * screenScale);
            let fire = new FireParticle(fx, fy, 1.2 * screenScale);
            fire.vy = random(-0.3, 0.1); // movimento mais lento para ficar visível sobre o tanque
            fire.life = Math.floor(random(25, 45)); // vida mais longa
            fireParticles.push(fire);
          }
          
          projeteis.splice(i, 1);
          if (adversarioIdx === 0 && vida[adversarioIdx] > 0) { tanque1QuebradoTemp = true; setTimeout(() => { tanque1QuebradoTemp = false; }, 1000); }
          else if (adversarioIdx === 1 && vida[adversarioIdx] > 0) { tanque2QuebradoTemp = true; setTimeout(() => { tanque2QuebradoTemp = false; }, 1000); }
            if (vida[adversarioIdx] <= 0) { aguardandoRecomecar = true; setTimeout(() => { document.getElementById('recomecar').style.display = 'inline-flex'; }, 300); }
            else {
              mudarTurno();
              pendingTurnOwner = 0;
            }
          continue;
        }
      }

      // Remove projétil se sair da tela
      if (p.x < 0 || p.x > width || p.y > height) {
        // Efeito de fogo e fumaça quando bomba de avião cai no chão
        if (p.owner === 0 && p.y >= height) {
          // Obter escala da tela
          const screenScale = getScreenScale();
          // No desktop (screenScale = 2.0), reduzir explosão ao cair no chão
          let explosionScale = screenScale === 2.0 ? 1.2 : screenScale;
          // Avião 1 (planeDir === 1) tem explosão menor no chão que avião 2
          if (p.planeDir === 1) {
            explosionScale *= 0.75; // Reduz em 25% a explosão do avião 1
          }
          const fireCount = Math.floor(35 * explosionScale);
          // Adicionar partículas de fogo proporcionais
          for (let f = 0; f < fireCount; f++) {
            fireParticles.push(new FireParticle(p.x, height - 5, 2.2 * explosionScale));
          }
          // Adicionar fumaça proporcional
          addSmoke(p.x, height - 5, Math.floor(22 * explosionScale), 2.0 * explosionScale);
        }
        // simply remove the projectile; turn resolution is handled centrally below
        projeteis.splice(i, 1);
      }
    }
    // Centralized turn resolution
    if (pendingTurnOwner && !projeteis.some(pp => pp.owner === pendingTurnOwner)) {
      mudarTurno();
      pendingTurnOwner = 0;
    }
  }
  
  // Fumaça contínua dos tanques destruídos (proporcional ao tamanho da tela)
  const screenScale = getScreenScale();
  if (vida[0] <= 0 && frameCount % 8 === 0) {
    const a0 = groundFireAnchors[0];
    const sx0 = (a0 && isFinite(a0.x)) ? a0.x : (tanque1.x - 24);
    const sy0 = (a0 && isFinite(a0.y)) ? (a0.y - 20) : (tanque1.y - 20);
    addSmoke(sx0, sy0, 1, 0.8 * screenScale);
  }
  if (vida[1] <= 0 && frameCount % 8 === 0) {
    const a1 = groundFireAnchors[1];
    const sx1 = (a1 && isFinite(a1.x)) ? a1.x : (tanque2.x + 24);
    const sy1 = (a1 && isFinite(a1.y)) ? (a1.y - 20) : (tanque2.y - 20);
    addSmoke(sx1, sy1, 1, 0.8 * screenScale);
  }
  
  // Renderiza todas as partículas de fumaça
  displaySmoke();
  
  // Renderiza partículas de fogo POR ÚLTIMO para ficarem visíveis sobre os tanques
  drawFireParticles();
}

// Função para alterar valores dos controles
function alterarValor(id, incremento) {
  const elemento = document.getElementById(id);
  let valorAtual = parseInt(elemento.textContent);
  let novoValor = valorAtual + incremento;
  
  // Definir limites para cada valor
  switch(id) {
    case 'coordX':
      novoValor = Math.max(0, Math.min(800, novoValor));
      break;
    case 'coordY':
      novoValor = Math.max(0, Math.min(400, novoValor));
      break;
    case 'potencia':
      // allow power from 0 up to 100
      novoValor = Math.max(0, Math.min(100, novoValor));
      break;
  }
  
  elemento.textContent = novoValor;
}

function disparar() {
  // Allow firing as long as this player doesn't already have an active projectile
  if (projeteis.some(p => p.owner === turno) || explosaoTimer > 0 || aguardandoRecomecar) return;

  let x = parseInt(document.getElementById("coordX").textContent);
  let y = parseInt(document.getElementById("coordY").textContent);
  let potencia = parseInt(document.getElementById("potencia").textContent);

  // allow potencia == 0 (zero-speed shot), only reject negative or NaN
  if (isNaN(x) || isNaN(y) || isNaN(potencia) || potencia < 0) return;

  let origem = turno === 1 ? tanque1 : tanque2;
  let dx = x - origem.x;
  let dy = y - origem.y;
  let angulo = atan2(dy, dx);

  // Ambos os tanques têm a mesma potência
  const fatorVelocidade = 0.5;
  const fatorY = 1.0;
  const proj = {
    x: origem.x,
    y: origem.y,
    vx: cos(angulo) * potencia * fatorVelocidade,
    vy: sin(angulo) * potencia * fatorVelocidade * fatorY,
    gravidade: 0.2,
    owner: turno
  };
  projeteis.push(proj);
  // mark that this player's shot is pending a turn change when it resolves
  pendingTurnOwner = turno;
}

function moverTanque(direcao) {
  if (aguardandoRecomecar) return;
  let ativo = turno === 1 ? tanque1 : tanque2;
  let passo = 20 * direcao;
  ativo.x += passo;
  ativo.x = constrain(ativo.x, ativo.w / 2, width - ativo.w / 2);
  // small movement done; engine idle effect remains constant (no transient shake)
}

// start a per-tank shake: idx = 0 or 1, mag in px, dur in frames
// removed startTankShake: replaced by continuous engine oscillation (engineOsc)

function mudarTurno() {
  turno = turno === 1 ? 2 : 1;
  // Exibe aviso centralizado
  let aviso = document.createElement('div');
  aviso.className = 'aviso-jogador-centro';
  aviso.textContent = `Vez do Jogador ${turno}`;
  document.body.appendChild(aviso);
  setTimeout(() => {
    aviso.remove();
  }, 1200);
}

function recomecarJogo() {
  // Resetar estado do jogo
  aguardandoRecomecar = false;
  explosao = null;
  explosaoTimer = 0;
  explosionFrame = 0;
  
  // Limpar projéteis
  projeteis = [];
  pendingTurnOwner = 0;
  
  // Resetar turno
  turno = 1;
  
  // Resetar vida dos tanques
  vida = [100, 100];
  tanque1Quebrado = false;
  tanque2Quebrado = false;
  tanque1QuebradoTemp = false;
  tanque2QuebradoTemp = false;
  
  // Resetar placar
  placar = [0, 0];
  document.getElementById("p1score").textContent = placar[0];
  document.getElementById("p2score").textContent = placar[1];
  
  // Atualizar barras de vida
  atualizarBarraVida('vida1', 100);
  atualizarBarraVida('vida2', 100);
  
  // Limpar partículas de fumaça e fogo
  smokeParticles = [];
  fireParticles = [];
  
  // Limpar aviões caídos
  fallenPlanes = [];
  
  // Limpar emissores de fogo contínuo (mantém apenas os 3 do cenário)
  // Remove todos os fogos criados por impactos de bombas/tiros
  if (groundFires.length > 3) {
    groundFires = groundFires.slice(0, 3);
  }
  
  // Resetar posições dos tanques para inicial
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const is800x600 = window.innerWidth === 800 && window.innerHeight === 600;
  
  let scale, yOffset;
  if (is800x600) {
    scale = 1.0;
    yOffset = 100;
  } else {
    scale = isMobile ? 1 : 2.0;
    yOffset = isMobile ? 0 : -100;
  }
  
  tanque1.x = 150 * scale;
  tanque1.y = (315 * scale) + yOffset;
  tanque2.x = 700 * scale;
  tanque2.y = (315 * scale) + yOffset;
  
  // Resetar controles de interface
  try {
    const cx = document.getElementById('coordX'); 
    if (cx) cx.textContent = '400';
    const cy = document.getElementById('coordY'); 
    if (cy) cy.textContent = '90';
    const pot = document.getElementById('potencia'); 
    if (pot) pot.textContent = '30';
  } catch (e) {
    console.warn('Could not reset coord UI:', e);
  }
  
  // Atualizar texto do turno
  const turnoEl = document.getElementById("turno");
  if (turnoEl) turnoEl.textContent = `Turno: Jogador 1`;
  
  // Esconder botão recomeçar
  document.getElementById('recomecar').style.display = 'none';
  
  // Resetar visibilidade dos botões
  mostrarBotoes();
  
  // Resetar contadores de cliques
  clickCount = 0;
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
  
  // Resetar aviões (remover aviões danificados e criar novo)
  const planesExisting = document.querySelectorAll('.aviao-fly');
  planesExisting.forEach(plane => {
    if (plane && plane.parentNode) {
      plane.parentNode.removeChild(plane);
    }
  });
  
  // Disparar evento para criar novo avião limpo
  document.dispatchEvent(new CustomEvent('planeHit', { detail: { delayRespawn: 100 } }));
}
// Função para atualizar barras de vida com cache
if (typeof atualizarBarraVida !== 'function') {
  const vidaCache = { vida1: null, vida2: null };
  function atualizarBarraVida(id, percentual) {
    const val = Math.max(0, Math.min(100, percentual));
    if (vidaCache[id] === val) return; // Evita atualização se valor não mudou
    vidaCache[id] = val;
    const el = document.getElementById(id);
    if (el) el.style.width = val + '%';
  }
}


// Plane spawner: aviao.png flies left->right, aviao1.png flies right->left
;(function () {
  const IMG_LR = 'assets/aviao.png';
  const IMG_RL = 'assets/aviao1.png';
  const BUFFER = 140;

  function computeTop() {
    const canvas = document.querySelector('canvas');
    // If there's no canvas yet, place it around 25% down the viewport
    if (!canvas) return Math.max(30, window.innerHeight * 0.25);
    const r = canvas.getBoundingClientRect();
    // Move planes lower over the background: use a larger fraction of canvas height
    // If device is mobile in landscape, position planes even lower so they fly closer to the bottom
    try {
      const isMobileLandscape = window.matchMedia && window.matchMedia('(max-width: 900px) and (orientation: landscape)').matches;
      const fraction = isMobileLandscape ? 0.42 : 0.28;
      return r.top + Math.max(30, r.height * fraction);
    } catch (e) {
      return r.top + Math.max(30, r.height * 0.28);
    }
  }

  // Compute a randomized top position for the plane each loop
  function computeRandomTop() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return computeTop();
    const r = canvas.getBoundingClientRect();
    try {
      const isMobileLandscape = window.matchMedia && window.matchMedia('(max-width: 900px) and (orientation: landscape)').matches;
      const baseFraction = isMobileLandscape ? 0.42 : 0.28;
      const baseTop = r.top + Math.max(30, r.height * baseFraction);
      // jitter up to ±10% of canvas height so each loop varies altitude
      const jitter = (Math.random() - 0.5) * r.height * 0.2;
      return baseTop + jitter;
    } catch (e) {
      return computeTop();
    }
  }

  function createPlane(dir) {
    const el = document.createElement('img');
    el.className = 'aviao-fly';
    el.src = dir === 1 ? IMG_LR : IMG_RL;
    el.style.position = 'fixed';
    // use cached planeTopY if available so both planes share same height
    const topY = typeof planeTopY !== 'undefined' ? planeTopY : computeTop();
    el.style.top = topY + 'px';
    el.style.zIndex = '1002';
    el.style.pointerEvents = 'none';
    // Initialize X based on direction
    el._dir = dir;
  el._speed = (150 + Math.min(150, window.innerWidth / 3)) * PLANE_SPEED_FACTOR;
    // Size adjustments: default width, smaller for dir === -1
    if (dir === 1) {
      el._x = -BUFFER;
      el.style.left = el._x + 'px';
      el.style.width = '64px';
      el.style.transform = 'translateY(-50%) scaleX(1)';
    } else {
      el._x = window.innerWidth + BUFFER;
      el.style.left = el._x + 'px';
      // make aviao1 smaller and flipped horizontally
      el.style.width = '58px';
      el.style.transform = 'translateY(-50%) scaleX(-1)';
    }
    document.body.appendChild(el);
  el._maxHp = 2;
  el._hp = el._maxHp;
  updatePlaneHUD(el);
    planeCounter++;
    el._id = planeCounter;
    return el;
  }

  // cache a single top value so all planes share the exact same vertical position
  let planeTopY = computeTop();

  let currentDir = 1;
  let active = createPlane(currentDir);

  // When a plane is hit, respawn a fresh plane in the same direction.
  document.addEventListener('planeHit', (ev) => {
    try {
      if (active) {
        const dir = active._dir || currentDir;
        active.remove();
        const delay = ev && ev.detail && typeof ev.detail.delayRespawn === 'number' ? ev.detail.delayRespawn : 0;
        if (delay > 0) {
          setTimeout(() => {
            active = createPlane(dir);
            currentDir = dir;
          }, delay);
        } else {
          active = createPlane(dir);
          currentDir = dir;
        }
        if (active) updatePlaneHUD(active);
      }
    } catch (e) {
      console.warn('planeHit handler error', e);
    }
  });

  window.addEventListener('resize', () => {
    planeTopY = computeTop();
    document.querySelectorAll('.aviao-fly').forEach(p => {
      p.style.top = planeTopY + 'px';
        p._speed = (180 + Math.min(220, window.innerWidth / 3)) * PLANE_SPEED_FACTOR;
  if (p._dir === 1) p.style.width = '64px';
  else p.style.width = '48px';
    });
  });

  let last = null;
  function frame(ts) {
    if (!last) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;

    if (active) {
      active._x += active._dir * active._speed * dt;
      active.style.left = active._x + 'px';

      // Lógica de disparo a cada 3 segundos
      try {
  // schedule the first drop and subsequent drops at a faster random interval (~300ms..2000ms)
    if (!active._nextDrop) active._nextDrop = ts + (300 + Math.random() * 1700);
  if (ts >= active._nextDrop) {
          // Verificar se já existe uma bomba ativa do avião (owner: 0)
          const hasActiveBomb = projeteis.some(p => p.owner === 0);
          if (!hasActiveBomb) {
            const pr = active.getBoundingClientRect();
            const canvas = document.querySelector('canvas');
            // if canvas isn't available yet (race on load), provide a safe fallback
            const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

            const originX = ((pr.left - cr.left) / cr.width) * width + pr.width / 2;
            const originY = ((pr.top - cr.top) / cr.height) * height + pr.height / 2;

            const targetX = Math.random() * width;
            const targetY = Math.random() * height;

            const dx = targetX - originX;
            const dy = targetY - originY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const speed = 3; // Velocidade normal
            const vx = (dx / distance) * speed;
            const vy = (dy / distance) * speed;

            // owner: 0 = bomba de avião, planeDir identifica qual avião (-1 = aviao2)
            projeteis.push({ x: originX, y: originY, vx: vx, vy: vy, gravidade: 0.2, owner: 0, planeDir: active._dir });
          }
          // Reagenda o próximo disparo para um tempo aleatório entre ~300ms e ~2s
          active._nextDrop = ts + (650 + Math.random() * 4700);
        }
      } catch (err) {
        console.warn('plane drop error', err);
      }

      // Engine smoke: emit small horizontal puffs from plane's tail
      try {
        const pr = active.getBoundingClientRect();
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const cr = canvas.getBoundingClientRect();
          const centerX = ((pr.left + pr.width/2 - cr.left) / cr.width) * width;
          const centerY = ((pr.top + pr.height/2 - cr.top) / cr.height) * height;
          // estimate half-size in canvas units
          const halfW = (pr.width / cr.width) * (width / 2);
          const halfH = (pr.height / cr.height) * (height / 2);
          // engine tail offset: behind the plane relative to direction
          const tailOffsetX = halfW * 0.55 * (active._dir || 1);
          const tailOffsetY = halfH * 0.15; // slightly below center
          const engineX = centerX - tailOffsetX;
          const engineY = centerY + tailOffsetY;

          if (!active._nextEngineSmoke) active._nextEngineSmoke = ts + 80 + Math.random() * 80;
          if (ts >= active._nextEngineSmoke) {
            const cnt = Math.max(1, Math.floor(random(1, 2)));
            for (let k = 0; k < cnt; k++) {
              addEngineSmoke(engineX + random(-2, 2), engineY + random(-1, 1), active._dir, 1);
            }
            active._nextEngineSmoke = ts + 80 + Math.random() * 160; // jitter interval
          }
        }
      } catch (e) {
        // decorative smoke may fail silently
      }

      if (active._dir === 1 && active._x >= window.innerWidth + BUFFER) {
        const savedHp = active._hp;
        const wasDamaged = savedHp < active._maxHp;

        try { removePlaneHUD(); } catch (e) {}
        active.remove();
        currentDir = -1;
        planeTopY = computeRandomTop();
        active = createPlane(currentDir);

        active._hp = savedHp;
        if (wasDamaged) {
          active.style.opacity = '0.6';
          active.style.filter = 'brightness(0.7)';
        }
      } else if (active._dir === -1 && active._x <= -BUFFER) {
        const savedHp = active._hp;
        const wasDamaged = savedHp < active._maxHp;

        try { removePlaneHUD(); } catch (e) {}
        active.remove();
        currentDir = 1;
        planeTopY = computeRandomTop();
        active = createPlane(currentDir);

        active._hp = savedHp;
        if (wasDamaged) {
          active.style.opacity = '0.6';
          active.style.filter = 'brightness(0.7)';
        }
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();

// Ensure the game title is visible and positioned under the scoreboard across all viewports
function positionGameTitle() {
  try {
    const title = document.getElementById('game-title');
    if (!title) return;
    const placar = document.querySelector('.placar-futebol');
    let topPx = 90;
    if (placar) {
      const r = placar.getBoundingClientRect();
      if (r && isFinite(r.bottom)) {
        // small offset so the title sits just below the placar
        topPx = Math.max(8, Math.round(r.bottom + 6));
      }
    }
    // force fixed positioning so it's always visible regardless of layout changes
    title.style.position = 'fixed';
    title.style.left = '50%';
    title.style.transform = 'translateX(-50%)';
    title.style.top = topPx + 'px';
    title.style.zIndex = '1001';
    title.style.display = 'block';
    title.style.pointerEvents = 'none';
  } catch (e) {
    // ignore positioning errors
    console.warn('positionGameTitle error', e);
  }
}

window.addEventListener('resize', positionGameTitle);
window.addEventListener('orientationchange', positionGameTitle);
window.addEventListener('load', positionGameTitle);

// Run once immediately if DOM is already ready
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  positionGameTitle();
}

// CSS corner-fire positioning helpers removed (DOM/CSS 3D effects were removed)

// Funções para controlar visibilidade dos botões
function ocultarBotoes() {
  const controls = document.querySelector('.controls-container');
  const recomecar = document.getElementById('recomecar');
  
  if (controls) {
    controls.style.opacity = '0';
    controls.style.pointerEvents = 'none';
    botoesVisiveis = false;
    botaoAtirarSolo = false;
    
    // Manter botão recomeçar visível se o jogo terminou
    if (recomecar && aguardandoRecomecar && recomecar.style.display === 'inline-flex') {
      recomecar.style.opacity = '1';
      recomecar.style.pointerEvents = 'auto';
      recomecar.style.visibility = 'visible';
    }
  }
}

function mostrarBotoes() {
  const controls = document.querySelector('.controls-container');
  if (controls) {
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';
    botoesVisiveis = true;
    botaoAtirarSolo = false;
    // Resetar estilos especiais
    resetarEstilosBotoes();
  }
}

function mostrarApenasAtirar() {
  const controls = document.querySelector('.controls-container');
  const disparar = document.getElementById('disparar');
  const recomecar = document.getElementById('recomecar');
  const coordControls = document.querySelector('.coord-controls');
  const actionButtons = document.querySelector('.action-buttons');
  const outrosBotoes = actionButtons.querySelectorAll('button:not(#disparar):not(#recomecar)');
  
  if (controls && disparar) {
    // Mostrar container
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';
    
    // Ocultar coord-controls completamente
    if (coordControls) {
      coordControls.style.opacity = '0';
      coordControls.style.pointerEvents = 'none';
      coordControls.style.position = 'absolute';
      coordControls.style.visibility = 'hidden';
    }
    
    // Ocultar outros botões de ação (exceto disparar e recomeçar)
    outrosBotoes.forEach(btn => {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
      btn.style.position = 'absolute';
      btn.style.visibility = 'hidden';
    });
    
    // Estilizar botão disparar com efeito glass
    disparar.style.display = 'flex';
    disparar.style.opacity = '1';
    disparar.style.visibility = 'visible';
    disparar.style.position = 'relative';
    disparar.style.background = 'rgba(255, 255, 255, 0.15)';
    disparar.style.backdropFilter = 'blur(10px)';
    disparar.style.webkitBackdropFilter = 'blur(10px)';
    disparar.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    disparar.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    
    // Manter botão recomeçar visível se o jogo terminou
    if (recomecar && aguardandoRecomecar && recomecar.style.display === 'inline-flex') {
      recomecar.style.opacity = '1';
      recomecar.style.pointerEvents = 'auto';
      recomecar.style.visibility = 'visible';
      recomecar.style.position = 'relative';
    }
    
    botoesVisiveis = false;
    botaoAtirarSolo = true;
  }
}

function resetarEstilosBotoes() {
  const coordControls = document.querySelector('.coord-controls');
  const actionButtons = document.querySelector('.action-buttons');
  const disparar = document.getElementById('disparar');
  const recomecar = document.getElementById('recomecar');
  const outrosBotoes = actionButtons ? actionButtons.querySelectorAll('button:not(#disparar):not(#recomecar)') : [];
  
  // Mostrar todos os elementos
  if (coordControls) {
    coordControls.style.display = '';
    coordControls.style.opacity = '';
    coordControls.style.pointerEvents = '';
    coordControls.style.position = '';
    coordControls.style.visibility = '';
  }
  
  outrosBotoes.forEach(btn => {
    btn.style.display = '';
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    btn.style.position = '';
    btn.style.visibility = '';
  });
  
  // Resetar estilos do botão disparar
  if (disparar) {
    disparar.style.background = '';
    disparar.style.backdropFilter = '';
    disparar.style.webkitBackdropFilter = '';
    disparar.style.border = '';
    disparar.style.boxShadow = '';
    disparar.style.opacity = '';
    disparar.style.position = '';
    disparar.style.visibility = '';
  }
  
  // Não resetar o botão recomeçar se o jogo terminou
  if (recomecar && (!aguardandoRecomecar || recomecar.style.display !== 'inline-flex')) {
    recomecar.style.opacity = '';
    recomecar.style.pointerEvents = '';
    recomecar.style.position = '';
    recomecar.style.visibility = '';
  }
}

// Adicionar eventos de duplo clique aos botões de controle e à tela
window.addEventListener('load', function() {
  // Detector de cliques múltiplos (2 ou 3 cliques)
  document.addEventListener('click', function(e) {
    // Ignorar cliques nos botões de controle para não interferir
    if (e.target.closest('.controls-container button')) {
      return;
    }
    
    clickCount++;
    
    // Limpar timer anterior
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    // Timer para resetar contagem após 400ms (janela para múltiplos cliques)
    clickTimer = setTimeout(function() {
      // Processar baseado no número de cliques
      if (clickCount === 2) {
        // Duplo clique: disparar tiro do tanque atual
        disparar();
      } else if (clickCount === 3) {
        // Triplo clique: toggle visibilidade dos controles
        if (botaoAtirarSolo) {
          // Se está em modo solo, volta ao normal
          mostrarBotoes();
        } else if (botoesVisiveis) {
          ocultarBotoes();
        } else {
          mostrarBotoes();
        }
      }
      
      // Resetar contagem
      clickCount = 0;
    }, 400);
  });
  
  // Prevenir que cliques nos botões interfiram com a contagem
  const allButtons = document.querySelectorAll('.controls-container button');
  allButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Parar propagação para não contar cliques nos botões
      e.stopPropagation();
    });
  });
});






