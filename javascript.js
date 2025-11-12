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
const PLANE_SPEED_FACTOR = 1.1; // 1.0 = normal speed, <1 slower
let fallenPlanes = []; // fragments for broken planes that fall with gravity
let planeCounter = 0; // unique id for planes (kept for future use)

// Sistema de fumaça realista
let smokeParticles = [];
class SmokeParticle {
  constructor(x, y, intensity = 1) {
    this.x = x;
    this.y = y;
    this.vx = random(-0.5, 0.5) * intensity;
    this.vy = random(-1, -2) * intensity; // sobe
    // reduced base sizes for subtler smoke
    this.size = random(12, 28) * intensity;
    this.maxSize = this.size + random(10, 30);
    this.alpha = random(100, 180);
    this.life = 255;
    this.color = random(40, 80); // tons de cinza escuro
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

function addSmoke(x, y, count = 1, intensity = 1) {
  for (let i = 0; i < count; i++) {
    smokeParticles.push(new SmokeParticle(x + random(-10, 10), y + random(-5, 5), intensity));
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
  }

  update() {
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

  createCanvas(800, 400); // Mantém o tamanho da tela

  tanque1 = { x: 150, y: 315, w: 90, h: 135 };
  tanque2 = { x: 700, y: 315, w: 110, h: 135 };
  vida = [100, 100];
  setTimeout(() => {
    atualizarBarraVida('vida1', vida[0]);
    atualizarBarraVida('vida2', vida[1]);
  }, 100);
  p5Ready = true;

  try {
    setGroundFireAnchor(0, tanque1.x - 88, tanque1.y + 20);
    setGroundFireAnchor(1, tanque2.x + 86, tanque2.y + 20);
    createGroundFireAt(groundFireAnchors[0].x, groundFireAnchors[0].y, { rate: isMobile ? 8 : 5, fireRate: isMobile ? 6 : 3 });
    createGroundFireAt(groundFireAnchors[1].x, groundFireAnchors[1].y, { rate: isMobile ? 8 : 5, fireRate: isMobile ? 6 : 3 });
    const midX = Math.round((tanque1.x + tanque2.x) / 2);
    const midY = Math.round(Math.min(tanque1.y, tanque2.y) + 22 + 18);
    setGroundFireAnchor(2, midX, midY);
    createGroundFireAt(groundFireAnchors[2].x, groundFireAnchors[2].y, { rate: isMobile ? 12 : 10, fireRate: isMobile ? 10 : 8, smokeCount: 1, smokeIntensity: isMobile ? 0.25 : 0.35, fireSizeScale: isMobile ? 0.45 : 0.55 });
  } catch (e) {
    console.warn('Could not create ground fire emitters:', e);
  }
}

function updateClouds() {
  const canvasWidth = width;
  const canvasHeight = height;
  const cloudStartX = -20; // Diminui ainda mais o início das nuvens
  const cloudEndX = canvasWidth + 20; // Diminui ainda mais o fim das nuvens

  document.querySelectorAll('.cloud').forEach(cloud => {
    const depth = parseInt(cloud.className.match(/depth-(\d+)/)[1], 10);
    const speed = 0.5 * depth; // Ajusta a velocidade com base na profundidade

    let left = parseFloat(cloud.style.left || cloudStartX);
    left += speed;

    if (left > cloudEndX) {
      left = cloudStartX; // Reposiciona para o início da área ajustada
    }

    cloud.style.left = `${left}px`;
  });
}

function draw() {
  try {
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    const frameSkip = isMobile ? 2 : 1; // Pula frames em dispositivos móveis para melhorar o desempenho
    if (frameCount % frameSkip !== 0) return;

    tocarSomExplosaoSeNecessario();
    background(30);
    image(fundoImg, 0, 0, width, height);
    updateGameLogic();
    displaySmoke();
  } catch (error) {
    console.error('Erro no loop principal:', error);
  }
  
  // Atualiza geradores de fogo no chão e partículas de fogo; depois atualiza fumaça
  updateGroundFires();
  drawFireParticles();
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
  if (vida[0] <= 0 || tanque1QuebradoTemp) {
    // Exibir o tanque quebrado sem inversão (apply offset)
    pop();
    image(tanque1QuebradoImg, tanque1.x - tanque1.w / 2 -20 + ox0, tanque1.y - tanque1.h / 2 -30 + oy0, tanque1.w, tanque1.h);
  } else {
    image(tanque1Img, -tanque1.w / 2, -tanque1.h / 2, tanque1.w, tanque1.h);
    pop();
  }

  // engine idle oscillation for tank2
  const e1 = engineOsc[1] || { amp: 1.2, freq: 0.06, phase: Math.PI * 0.5 };
  const ox1 = 0; // no horizontal oscillation for engine hum
  const oy1 = Math.sin(t * e1.freq + e1.phase) * e1.amp;

  if (vida[1] <= 0 || tanque2QuebradoTemp) {
    push();
    translate(tanque2.x + ox1, tanque2.y + oy1);
    scale(-1, 1);
    image(tanque2QuebradoImg, -tanque2.w / 2, -tanque2.h / 2 - 30, tanque2.w, tanque2.h); // Move image 20px up
    pop();
  } else {
    image(tanque2Img, tanque2.x - tanque2.w / 2 + ox1, tanque2.y - tanque2.h / 2 + oy1, tanque2.w, tanque2.h);
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
    for (let k = fallenPlanes.length - 1; k >= 0; k--) {
      const fp = fallenPlanes[k];
      // physics
      fp.x += fp.vx;
      fp.y += fp.vy;
      fp.vy += fp.grav;
      fp.rot += fp.rotV;
      
      // Gera fumaça do avião caindo
      if (frameCount % 3 === 0) {
        addSmoke(fp.x, fp.y, 2, 1.2);
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

          // first hit: darken + show small defense effect
          if (planeEl._hp > 0) {
            planeEl.style.opacity = '0.6';
            planeEl.style.filter = 'brightness(0.7)';
            explosao = { x: planeHitbox.centerX, y: planeHitbox.centerY, size: 100, fade: true, alpha: 255, fadeStep: 10, img: defesaImg };
            addSmoke(planeHitbox.centerX, planeHitbox.centerY, 3, 0.8);
          } else {
            // destroyed
            explosao = { x: planeHitbox.centerX, y: planeHitbox.centerY, size: 120 };
            explosaoTimer = 40;
            addSmoke(planeHitbox.centerX, planeHitbox.centerY, 8, 1.5);
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
              const sizeForPlane = Math.max(64, Math.min(220, Math.max(planeWCanvas, planeHCanvas) * 1.1));
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
          explosao = { x: (damagedIdx === 0 ? tanque1.x : tanque2.x), y: (damagedIdx === 0 ? tanque1.y : tanque2.y), size: 120 };
          explosaoTimer = 40;
          let anchor = groundFireAnchors[damagedIdx];
          let smokeOffsetX = (anchor && isFinite(anchor.x)) ? anchor.x : ((damagedIdx === 0) ? (tanque1.x - 12) : (tanque2.x + 36));
          let smokeOffsetY = (anchor && isFinite(anchor.y)) ? anchor.y : (damagedIdx === 0 ? tanque1.y : tanque2.y);
          addSmoke(smokeOffsetX, smokeOffsetY, 6, 1.3);
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
          explosao = { x: adversarioTank.x, y: adversarioTank.y, size: 120 };
          explosaoTimer = 40;
          addSmoke(adversarioTank.x, adversarioTank.y, 10, 1.8);
          projeteis.splice(i, 1);
          if (adversarioIdx === 0 && vida[adversarioIdx] > 0) { tanque1QuebradoTemp = true; setTimeout(() => { tanque1QuebradoTemp = false; }, 1000); }
          else if (adversarioIdx === 1 && vida[adversarioIdx] > 0) { tanque2QuebradoTemp = true; setTimeout(() => { tanque2QuebradoTemp = false; }, 1000); }
            if (vida[adversarioIdx] <= 0) { aguardandoRecomecar = true; setTimeout(() => { document.getElementById('recomecar').style.display = 'inline-flex'; }, 300); }
            else {
              // this is an active player shot that hit the opponent; immediately change turn
              // and clear the pendingTurnOwner so we don't double-switch below
              try { mudarTurno(); } catch (e) { console.warn('mudarTurno error', e); }
              pendingTurnOwner = 0;
            }
          continue;
        }
      }

      // Remove projétil se sair da tela
      if (p.x < 0 || p.x > width || p.y > height) {
        // simply remove the projectile; turn resolution is handled centrally below
        projeteis.splice(i, 1);
      }
    }
    // Centralized turn resolution: if a player fired (pendingTurnOwner) and that player
    // currently has no active projectiles, switch the turn once and clear the pending flag.
    try {
      if (pendingTurnOwner && !projeteis.some(pp => pp.owner === pendingTurnOwner)) {
        mudarTurno();
        pendingTurnOwner = 0;
      }
    } catch (e) {
      console.warn('Turn resolution error', e);
    }
  }
  
  // Fumaça contínua dos tanques destruídos
  if (vida[0] <= 0 && frameCount % 8 === 0) {
    const a0 = groundFireAnchors[0];
    const sx0 = (a0 && isFinite(a0.x)) ? a0.x : (tanque1.x - 24);
    const sy0 = (a0 && isFinite(a0.y)) ? (a0.y - 20) : (tanque1.y - 20);
    addSmoke(sx0, sy0, 1, 0.8);
  }
  if (vida[1] <= 0 && frameCount % 8 === 0) {
    const a1 = groundFireAnchors[1];
    const sx1 = (a1 && isFinite(a1.x)) ? a1.x : (tanque2.x + 24);
    const sy1 = (a1 && isFinite(a1.y)) ? (a1.y - 20) : (tanque2.y - 20);
    addSmoke(sx1, sy1, 1, 0.8);
  }
  
  // Renderiza todas as partículas de fumaça (atrás de tudo)
  displaySmoke();
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

    const fatorVelocidade = 0.5; // Reduz a velocidade do tiro
    const proj = {
      x: origem.x,
      y: origem.y,
      vx: cos(angulo) * potencia * fatorVelocidade,
      vy: sin(angulo) * potencia * fatorVelocidade,
      gravidade: 0.2,
      owner: turno // who fired this projectile (1 or 2)
    };
    console.log('DISPARAR: Player', turno, 'fired projectile from', origem.x.toFixed(1), origem.y.toFixed(1), 'velocity', proj.vx.toFixed(2), proj.vy.toFixed(2));
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
  aguardandoRecomecar = false;
  explosao = null;
  explosaoTimer = 0;
  projeteis = [];
  turno = 1;
  vida = [100, 100];
  placar = [0, 0];
  document.getElementById("p1score").textContent = placar[0];
  document.getElementById("p2score").textContent = placar[1];
  atualizarBarraVida('vida1', 100);
  atualizarBarraVida('vida2', 100);
  // Reset coordinate UI to default starting values
  try {
    const cx = document.getElementById('coordX'); if (cx) cx.textContent = '400';
    const cy = document.getElementById('coordY'); if (cy) cy.textContent = '90';
    const pot = document.getElementById('potencia'); if (pot) pot.textContent = '30';
  } catch (e) {
    console.warn('Could not reset coord UI:', e);
  }
  document.getElementById("turno").textContent = `Turno: Jogador 1`;
  document.getElementById('recomecar').style.display = 'none';
}
// Função para atualizar barras de vida
if (typeof atualizarBarraVida !== 'function') {
  function atualizarBarraVida(id, percentual) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.max(0, Math.min(100, percentual)) + '%';
  }
}


// Plane spawner: aviao.png flies left->right, aviao1.png flies right->left
;(function () {
  console.log('plane manager IIFE initializing');
  const IMG_LR = 'assets/aviao.png';   // left -> right
  const IMG_RL = 'assets/aviao1.png';  // right -> left
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
  el._maxHp = 2; // number of successful hits to destroy (now 2 hits)
  el._hp = el._maxHp;
  // render HUD
  updatePlaneHUD(el);
    // assign id
    planeCounter++;
    el._id = planeCounter;
  console.log('createPlane dir=', dir, 'startX=', el._x, 'top=', topY, 'width=', el.style.width, 'id=', el._id, 'maxHp=', el._maxHp);
    return el;
  }

  // cache a single top value so all planes share the exact same vertical position
  let planeTopY = computeTop();

  let currentDir = 1;
  let active = createPlane(currentDir);

  // When a plane is hit, respawn a fresh plane in the same direction.
  // If the event supplies a delayRespawn (ms) we'll wait that long before creating the new plane
  document.addEventListener('planeHit', (ev) => {
    console.log('planeHit event received!', ev.detail);
    try {
      if (active) {
        console.log('Removing current active plane, dir=', active._dir);
        const dir = active._dir || currentDir;
        active.remove();
        const delay = ev && ev.detail && typeof ev.detail.delayRespawn === 'number' ? ev.detail.delayRespawn : 0;
        console.log('Will respawn plane after', delay, 'ms');
        if (delay > 0) {
          setTimeout(() => {
            console.log('Creating new plane after delay, dir=', dir);
            active = createPlane(dir);
            currentDir = dir;
          }, delay);
        } else {
          console.log('Creating new plane immediately, dir=', dir);
          active = createPlane(dir);
          currentDir = dir;
        }
        // update HUD for the new plane
        if (active) updatePlaneHUD(active);
      } else {
        console.warn('planeHit event but no active plane!');
      }
    } catch (e) {
      console.warn('planeHit handler error', e);
    }
  });

  window.addEventListener('resize', () => {
    // recompute shared top and update for all planes
    planeTopY = computeTop();
    document.querySelectorAll('.aviao-fly').forEach(p => {
      p.style.top = planeTopY + 'px';
        p._speed = (180 + Math.min(220, window.innerWidth / 3)) * PLANE_SPEED_FACTOR;
  // adjust sizes responsively (slightly smaller)
  if (p._dir === 1) p.style.width = '64px';
  else p.style.width = '48px';
    });
  });

  let last = null;
  function frame(ts) {
    if (!last) {
      last = ts;
      console.log('plane frame loop started at', ts);
    }
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

          projeteis.push({ x: originX, y: originY, vx: vx, vy: vy, gravidade: 0.2, owner: 0 });

          // Reagenda o próximo disparo para um tempo aleatório entre ~300ms e ~2s
          active._nextDrop = ts + (300 + Math.random() * 1700);
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
        console.log('Plane exited screen (dir=1), HP was:', savedHp);

        try { removePlaneHUD(); } catch (e) {}
        active.remove();
        currentDir = -1;
        planeTopY = computeRandomTop();
        active = createPlane(currentDir);

        active._hp = savedHp;
        if (wasDamaged) {
          active.style.opacity = '0.6';
          active.style.filter = 'brightness(0.7)';
          console.log('Restored damaged appearance, HP:', active._hp);
        }
      } else if (active._dir === -1 && active._x <= -BUFFER) {
        const savedHp = active._hp;
        const wasDamaged = savedHp < active._maxHp;
        console.log('Plane exited screen (dir=-1), HP was:', savedHp);

        try { removePlaneHUD(); } catch (e) {}
        active.remove();
        currentDir = 1;
        planeTopY = computeRandomTop();
        active = createPlane(currentDir);

        active._hp = savedHp;
        if (wasDamaged) {
          active.style.opacity = '0.6';
          active.style.filter = 'brightness(0.7)';
          console.log('Restored damaged appearance, HP:', active._hp);
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
window.addEventListener('load', () => {
  positionGameTitle();
  // re-run after a short delay to capture any late layout adjustments
  setTimeout(positionGameTitle, 350);
});

// Run once immediately if DOM is already ready
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(positionGameTitle, 50);
}

// CSS corner-fire positioning helpers removed (DOM/CSS 3D effects were removed)



