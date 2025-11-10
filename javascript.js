
let howlerSomTiro;

  
let tanque1Img, tanque2Img, fundoImg, explosionSprite, tanque1QuebradoImg, tanque2QuebradoImg;
let bombaImg; // image for plane bombs (assets/bomba.png)
let defesaImg; // image for plane defensive effect (assets/defesa.png)
let tanque1, tanque2;
let projeteis = [];
let turno = 1;
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
const PLANE_SPEED_FACTOR = 1.3; // 1.0 = normal speed, <1 slower
// Global multiplier to control canvas cloud opacity (1.0 = unchanged, <1 = more transparent)
const CANVAS_CLOUD_ALPHA = 0.72;
let fallenPlanes = []; // fragments for broken planes that fall with gravity
let planeCounter = 0; // unique id for planes (kept for future use)

// Sistema de fumaça realista
let smokeParticles = [];
class SmokeParticle {
  constructor(x, y, intensity = 1) {
    this.x = x;
    this.y = y;
    // Pyramid/plume particles (for tank destruction) should rise slowly and spread outward
    this.pyramid = (intensity >= 2.2);
    if (this.pyramid) {
      this.vx = random(-0.15, 0.15);
      this.vy = random(-0.15, -0.4); // slow upward motion
      this.size = random(28, 48) * (1 + intensity * 0.35);
      this.maxSize = this.size + random(40, 90);
      this.baseLife = Math.round((100 + random(80, 100)) * intensity);
      this.color = random(20, 50); // darker base for thick smoke
    } else {
      this.vx = random(-0.5, 0.5) * intensity;
      this.vy = random(-1, -2) * intensity; // sobe
      this.size = random(20, 40) * intensity;
      this.maxSize = this.size + random(30, 60);
      this.baseLife = Math.round((100 + random(40, 10)) * intensity);
      this.color = random(30, 85); // gray tones
    }
    this.life = this.baseLife;
    this.alpha = map(this.life, 0, this.baseLife, 0, 100);
    this.rotation = random(TWO_PI);
    this.rotationSpeed = random(-0.03, 0.03);
    this.seed = random(10000);
    this.intensity = intensity;
  }
  
  update() {
    // time-based turbulence using Perlin noise for smooth organic motion
    const t = frameCount * 0.008;
    const n1 = noise(this.seed, t);
    const n2 = noise(this.seed + 57.3, t * 1.2);
    if (this.pyramid) {
      // pyramid plume: encourage outward spread while keeping vertical rise slow
      this.vx += map(n1, 0, 1, -0.12, 0.12) * (0.9 + 0.2 * this.intensity);
      // tiny vertical wobble only
      this.vy += map(n2, 0, 1, -0.02, 0.01);
      // integrate
      this.x += this.vx * (0.9 + 0.1 * this.intensity);
      this.y += this.vy * (0.6); // slower upward motion
      // gentle damping
      this.vx *= 0.992;
      this.vy *= 0.997;
      // grow and diffuse slightly faster for dense plume base
      this.size = lerp(this.size, this.maxSize, 0.035 + 0.006 * this.intensity);
      this.life -= (0.6 + 0.8 * this.intensity);
      this.alpha = map(this.life, 0, this.baseLife, 0, 220);
      this.rotation += this.rotationSpeed * (0.5 + 0.3 * this.intensity);
    } else {
      // diffused smoke behavior
      this.vx += map(n1, 0, 1, -0.25, 0.25) * this.intensity;
      this.vy += map(n2, 0, 1, -0.06, 0.02) * this.intensity; // negative tends upward
      // integrate
      this.x += this.vx;
      this.y += this.vy;
      // apply gentle damping
      this.vx *= 0.995;
      this.vy *= 0.998;
      // grow and diffuse
      this.size = lerp(this.size, this.maxSize, 0.03 + 0.005 * this.intensity);
      // life progression
      this.life -= (0.8 + 0.6 * this.intensity);
      this.alpha = map(this.life, 0, this.baseLife, 0, 200);
      this.rotation += this.rotationSpeed * (0.8 + 0.4 * this.intensity);
    }
  }
  
  display() {
    push();
    translate(this.x, this.y);
    noStroke();
    // If pyramid plume (now render mushroom-style cloud)
    if (this.pyramid) {
      // Parameters
      const stemLayers = 6 + Math.floor(this.intensity * 2);
      const capLayers = 5 + Math.floor(this.intensity * 2);
      const stemW = this.size * (0.35 + 0.12 * this.intensity);
      const stemStep = this.size * 0.28; // vertical spacing for stem
      // Draw stem: narrow stacked ellipses, darker near base
      for (let i = 0; i < stemLayers; i++) {
        const f = i / stemLayers; // 0 bottom -> 1 top
        const w = stemW * (1 - f * 0.35) * (1 + (noise(this.seed + i, frameCount * 0.01) - 0.5) * 0.08);
        const h = w * 0.6;
        const yOff = -i * stemStep;
        const a = this.alpha * (0.6 - 0.35 * f);
        const shade = Math.max(4, this.color - 22 + i * 1.8);
        fill(shade, a);
        const ox = (noise(this.seed + i * 7, frameCount * 0.012) - 0.5) * 2.5 * (1 - f);
        ellipse(ox, yOff, w, h);
      }

      // Draw cap: large flattened ellipses with inner darker core and outer softer ring
      const capBaseW = this.size * (2.2 + this.intensity * 0.9);
      const capY = -stemLayers * stemStep + this.size * 0.6; // slightly overlap stem top
      for (let j = 0; j < capLayers; j++) {
        const fj = j / capLayers; // 0 bottom -> 1 top
        const wj = capBaseW * (1 - fj * 0.35) * (1 + (noise(this.seed + 100 + j, frameCount * 0.006) - 0.5) * 0.12);
        const hj = wj * (0.28 + 0.06 * (1 - fj));
        const yj = capY - fj * (this.size * 0.9);
        const aj = this.alpha * (0.9 - 0.7 * fj) * (0.95 - fj * 0.15);
        const shadej = Math.max(4, this.color - 10 + j * 4);
        fill(shadej, aj);
        const oxj = (noise(this.seed + 200 + j, frameCount * 0.008) - 0.5) * 6 * (1 - fj);
        ellipse(oxj, yj, wj, hj);
      }

      // inner darker cap core
      fill(Math.max(2, this.color - 30), this.alpha * 0.95);
      ellipse(0, capY - (this.size * 0.15), capBaseW * 0.62, capBaseW * 0.36);
      // subtle top puff
      fill(Math.max(6, this.color - 6), this.alpha * 0.7);
      ellipse(0, capY - this.size * 1.05, capBaseW * 0.42, capBaseW * 0.22);
    } else {
      // normal diffused smoke (soft multi-layer)
      rotate(this.rotation);
      const layers = 5;
      for (let i = layers; i >= 1; i--) {
        const f = i / layers;
        const s = this.size * (0.5 + 0.75 * f);
        const a = this.alpha * (0.18 + 0.16 * f) * (1 - (i / (layers + 2)) * 0.12);
        const shade = this.color + (layers - i) * 6;
        fill(shade, a);
        const ox = (noise(this.seed + i * 7, frameCount * 0.01) - 0.5) * 2.5;
        const oy = (noise(this.seed - i * 13, frameCount * 0.01) - 0.5) * 2.5;
        ellipse(ox, oy, s * (1 + 0.02 * i), s * (0.7 + 0.05 * f));
      }
    }
    pop();
  }
  
  isDead() {
    return this.life <= 0 || this.alpha <= 2 || this.size < 0.5;
  }
}

function addSmoke(x, y, count = 1, intensity = 1) {
  for (let i = 0; i < count; i++) {
    smokeParticles.push(new SmokeParticle(x + random(-10, 10), y + random(-5, 5), intensity));
  }
}

// --- Scene (chimney) smoke system - separate from generic smoke ---
let sceneSmokeParticles = [];
let sceneFireParticles = [];
let sceneEmitters = [];

class SceneSmokeParticle {
  constructor(x, y, intensity = 1) {
    this.x = x;
    this.y = y;
    this.seed = random(10000);
    this.intensity = intensity;
    this.life = Math.round(50 + random(30, 20) * intensity);
    this.baseLife = this.life;
  // smaller initial size for scene smoke (reduced per user request)
  this.size = random(6, 18) * intensity;
    this.color = random(30, 100);
    this.alpha = map(this.life, 0, this.baseLife, 0, 160);
    this.vx = random(-0.10, 0.02);
    this.vy = random(-0.18, -0.04);
  }

  update() {
    const t = frameCount * 0.006;
    const n1 = noise(this.seed, t);
    const n2 = noise(this.seed + 47.1, t * 1.1);
    this.vx += map(n1, 0, 1, -0.02, 0.02) * this.intensity;
    this.vy += map(n2, 0, 1, -0.01, 0.01) * this.intensity;
    this.x += this.vx;
    this.y += this.vy * 0.6; // very slow rise
    // subtle spread
    this.vx *= 0.995;
    this.vy *= 0.997;
  // slower/smaller growth so particles stay more compact
  this.size = lerp(this.size, this.size * (1.04 + 0.25 * this.intensity), 0.008);
    this.life -= 0.6 + 0.4 * this.intensity;
    this.alpha = map(this.life, 0, this.baseLife, 0, 160);
  }

  display() {
    push();
    translate(this.x, this.y);
    noStroke();
    // thin stem lower part
    const stemLen = Math.max(4, Math.floor(this.size * 0.18));
    for (let s = 0; s < stemLen; s++) {
      const f = s / Math.max(1, stemLen - 1);
      const sw = this.size * (0.05 + 0.02 * (1 - f));
      const yOff = s * 1.0;
      const a = this.alpha * (0.08 * (1 - f));
      fill(Math.max(6, this.color - 18), a);
      const ox = (noise(this.seed + s * 3, frameCount * 0.008) - 0.5) * 1.6;
      ellipse(ox, yOff, sw, sw * 1.8);
    }

    // stacked blobs with outer soft rings then darker core
    const blobCount = Math.max(3, Math.floor(this.size / 10));
    const spineHeight = this.size * (1.8 + 0.8 * this.intensity);
    for (let b = 0; b < blobCount; b++) {
      const t = b / (blobCount - 1 || 1);
      const yOff = lerp(0, -spineHeight, t) + (noise(this.seed + b * 11, frameCount * 0.009) - 0.5) * 4.5;
      const blobBase = this.size * (0.6 + 1.4 * t) * (1 + 0.06 * noise(this.seed + b * 7));
      const layers = 5;
      // outer -> inner
      for (let L = layers - 1; L >= 0; L--) {
        const lf = 1 - L / layers;
        const rad = blobBase * (0.6 + 0.9 * (L / layers)) * (1 + (noise(this.seed + L * 5 + b * 3, frameCount * 0.011) - 0.5) * 0.05);
        const baseA = this.alpha * (0.14 + 0.7 * (1 - t));
        const a = baseA * (0.2 + 0.95 * (1 - L / layers));
        const shade = this.color + Math.round((b - blobCount / 2) * 2);
        fill(Math.max(4, shade - Math.round(6 * (1 - L / layers))), a);
        const ox = (noise(this.seed + b * 13 + L * 5, frameCount * 0.009) - 0.5) * (5 * (1 - t));
        const oy = (noise(this.seed - b * 9 + L * 6, frameCount * 0.008) - 0.5) * 3.5;
        ellipse(ox, yOff + oy, rad, rad * (0.78 + 0.12 * lf));
      }
      // small darker core
      fill(Math.max(2, this.color - 26), this.alpha * 0.9);
      ellipse((noise(this.seed + b * 21, frameCount * 0.01) - 0.5) * 2, yOff + (noise(this.seed + b * 27, frameCount * 0.01) - 0.5) * 2, blobBase * 0.6, blobBase * 0.42);
    }

    pop();
  }

  isDead() {
    return this.life <= 0 || this.alpha <= 2;
  }
}

function addSceneSmoke(x, y, count = 1, intensity = 1) {
  for (let i = 0; i < count; i++) {
    sceneSmokeParticles.push(new SceneSmokeParticle(x + random(-6, 6), y + random(-3, 3), intensity));
  }
}

// Fire + smoke mixed particle (small flames that transition to smoke)
class FireSmokeParticle {
  constructor(x, y, intensity = 1) {
    this.x = x;
    this.y = y;
    this.seed = random(10000);
    this.intensity = intensity;
    this.life = Math.round(30 + random(20, 40) * intensity); // shorter life (flame flicker)
    this.baseLife = this.life;
    this.size = random(6, 22) * intensity;
    this.alpha = map(this.life, 0, this.baseLife, 0, 220);
    this.vx = random(-0.12, 0.12) * (1 + 0.2 * intensity);
    this.vy = random(-0.6, -0.12) * (1 + 0.2 * intensity); // faster upward rise than smoke
  }

  update() {
    const t = frameCount * 0.01;
    const n1 = noise(this.seed, t);
    this.vx += map(n1, 0, 1, -0.02, 0.02) * this.intensity;
    this.vy += map(noise(this.seed + 12, t), 0, 1, -0.02, 0.02) * this.intensity;
    this.x += this.vx;
    this.y += this.vy;
    // grow slightly then fade into smoke
    this.size = lerp(this.size, this.size * (1.05 + 0.5 * this.intensity), 0.06);
    this.life -= 0.9 + 0.4 * this.intensity;
    this.alpha = map(this.life, 0, this.baseLife, 0, 220);
  }

  display() {
    push();
    translate(this.x, this.y);
    noStroke();
    // draw inner flame (yellow/orange)
    const lifeF = constrain(this.life / this.baseLife, 0, 1);
    const flameAlpha = this.alpha * (0.9 * lifeF);
    // core
    fill(255, 220, 80, flameAlpha);
    ellipse(0, 0, this.size * 0.9, this.size * 0.6);
    // mid flame
    fill(255, 120, 40, flameAlpha * 0.7);
    ellipse((noise(this.seed + 7, frameCount * 0.02) - 0.5) * 2, -this.size * 0.08, this.size * 1.2, this.size * 0.8);
    // outer smoky ring (reddish -> gray as it ages)
    const smokeMix = lerpColor(color(220, 80, 20, flameAlpha * 0.4), color(120, 120, 120, flameAlpha * 0.6), 1 - lifeF);
    fill(smokeMix);
    ellipse(0, -this.size * 0.6, this.size * (1.6 + (1 - lifeF) * 1.6), this.size * (1.0 + (1 - lifeF) * 1.2));
    pop();
  }

  isDead() {
    return this.life <= 0 || this.alpha <= 2;
  }
}

function addFireSmoke(x, y, count = 1, intensity = 1) {
  for (let i = 0; i < count; i++) {
    sceneFireParticles.push(new FireSmokeParticle(x + random(-6, 6), y + random(-3, 3), intensity));
  }
}

function addSceneEmitter(x, y, rateFrames = 180, intensity = 1, count = 1, type = 'smoke') {
  sceneEmitters.push({ x, y, rate: rateFrames, intensity, count, type, lastFrame: 0 });
}

function updateSceneEmitters() {
  for (let e of sceneEmitters) {
    if (frameCount - e.lastFrame >= e.rate) {
      const ex = e.x + random(-2, 2);
      const ey = e.y + random(-1, 1);
      if (e.type === 'fire') {
        addFireSmoke(ex, ey, e.count, e.intensity);
      } else {
        addSceneSmoke(ex, ey, e.count, e.intensity);
      }
      e.lastFrame = frameCount;
    }
  }
}

function updateSceneSmoke() {
  for (let i = sceneSmokeParticles.length - 1; i >= 0; i--) {
    sceneSmokeParticles[i].update();
    if (sceneSmokeParticles[i].isDead()) sceneSmokeParticles.splice(i, 1);
  }
  for (let i = sceneFireParticles.length - 1; i >= 0; i--) {
    sceneFireParticles[i].update();
    if (sceneFireParticles[i].isDead()) sceneFireParticles.splice(i, 1);
  }
}

function displaySceneSmoke() {
  // render behind other scene elements
  for (let p of sceneSmokeParticles) p.display();
  for (let p of sceneFireParticles) p.display();
}

// --- Cloud system (sky background) ---
let clouds = [];

class Cloud {
  constructor(x, y, scale = 1, depth = 1) {
    this.x = x;
    this.y = y;
    this.scale = scale; // overall size multiplier
    this.depth = depth; // 0..1 smaller -> further back (fainter)
    this.seed = random(10000);
    this.speed = 0.12 * (0.6 + this.depth); // slow horizontal drift
    this.puffs = [];
    // number of puffs per cloud (3..6)
    const count = Math.floor(random(3, 6 + 1));
    this.elongation = random(1.35, 1.9);
    for (let i = 0; i < count; i++) {
      const rx = random(-30, 30) * (0.6 + 0.8 * (i / count));
      const ry = random(-6, 6) * (0.6 + 0.6 * (i / count));
      // reduced base radius to make clouds visually smaller
      const baseR = random(16, 42) * this.scale * (0.7 + 0.6 * (1 - this.depth));
      // store baseR so we can clamp growth later and avoid runaway sizes
      this.puffs.push({ ox: rx, oy: ry, r: baseR, baseR: baseR, seed: random(10000), off: random(1000) });
    }
  }

  update() {
    // gentle horizontal drift with perlin wobble
    const t = frameCount * 0.002 * (1 + this.depth * 0.6);
    const n = noise(this.seed, t) - 0.5;
    this.x += this.speed + n * 0.25 * (0.5 + this.depth * 0.6);
    this.y += (noise(this.seed + 33, t) - 0.5) * 0.12;
    // animate puffs slightly
    for (let p of this.puffs) {
      p.ox += (noise(p.seed, t * 0.8) - 0.5) * 0.4;
      p.oy += (noise(p.seed + 44, t * 0.9) - 0.5) * 0.18;
      // reduce the growth jitter and clamp radius relative to baseR so clouds do not grow too large
      const delta = (noise(p.seed + 99, t * 0.6) - 0.5) * 0.28; // smaller jitter
      p.r += delta;
      // keep p.r within ~80% .. 118% of baseR to avoid runaway growth/shrink
      if (typeof p.baseR === 'number') {
        p.r = constrain(p.r, p.baseR * 0.8, p.baseR * 1.18);
      }
    }

    // wrap-around horizontally
    if (this.x - 300 > width) {
      this.x = -random(120, 360);
      this.y = random(30, height * 0.36);
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    noStroke();
    // light direction (approx top-left)
    const lx = -0.5;
    const ly = -0.45;
    // Draw puffs with simple 3D shading: soft shadow below, outer soft shells, darker core and lighter highlight
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      // baseAlpha in 0..255 range; apply global canvas cloud alpha multiplier to reduce overall opacity
      const baseAlpha = 200 * (0.35 + 0.65 * this.scale) * (1 - this.depth * 0.5) * CANVAS_CLOUD_ALPHA;

      // smoky, irregular-edge rendering: many small translucent 'cloudlets' around the puff
      // core (slightly bright)
      fill(245, Math.max(14, baseAlpha * 0.82));
      ellipse(p.ox + lx * 1.2, p.oy + ly * 1.2, p.r * this.elongation, p.r * 0.6);

      // irregular edge particles
      const edgeParts = 22;
      for (let k = 0; k < edgeParts; k++) {
        // angle and radius modulated by perlin noise for smooth organic deformation
        const ang = noise(p.seed + k * 13, frameCount * 0.006) * TWO_PI * 2.0;
        const radial = p.r * (0.55 + noise(p.seed + k * 7, frameCount * 0.004) * 1.35);
        const jitterX = (noise(p.off + k * 3, frameCount * 0.005) - 0.5) * 6.5;
        const jitterY = (noise(p.off - k * 5, frameCount * 0.006) - 0.5) * 5.5;
        const px = p.ox + Math.cos(ang) * radial + jitterX;
        const py = p.oy + Math.sin(ang) * radial * 0.62 + jitterY;
        const partSize = p.r * (0.10 + noise(p.seed + k * 19, frameCount * 0.008) * 0.55);
        const partAlpha = Math.max(6, baseAlpha * (0.04 + 0.30 * noise(p.seed + k * 11, frameCount * 0.007)));
        fill(255, partAlpha);
        ellipse(px, py, partSize, partSize * 0.72);
      }

      // darker inner core (gives depth)
      fill(220, Math.max(18, baseAlpha * 0.56));
      ellipse(p.ox + lx * 2, p.oy + ly * 1.4, p.r * 0.54 * this.elongation, p.r * 0.38);

      // soft top highlight
      fill(255, Math.max(6, baseAlpha * 0.18));
      ellipse(p.ox + lx * -2, p.oy + ly * -4, p.r * 0.36 * this.elongation, p.r * 0.24);
    }
    pop();
  }
}

function createClouds(count = 3) {
  clouds = [];
  for (let i = 0; i < count; i++) {
    const sx = random(-200, width + 200);
    const sy = random(20, height * 0.36);
    // slightly reduced overall scale range for a smaller cloud appearance
    const sc = random(0.34, 0.66);
    const depth = random(0.08, 0.55);
    clouds.push(new Cloud(sx, sy, sc, depth));
  }
}

function updateClouds() {
  if (!clouds) return;
  for (let c of clouds) c.update();
}

function displayClouds() {
  if (!clouds) return;
  // draw furthest clouds first (higher depth -> closer)
  const sorted = clouds.slice().sort((a, b) => a.depth - b.depth);
  for (let c of sorted) c.display();
}

// Sync DOM clouds removed — canvas clouds are used for the sky

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


// Inicializa o som da explosão, música de fundo e som do tiro com Howler.js após o carregamento da página
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
  // create a p5 canvas and parent it into the #scene container so DOM background + CSS clouds sit beneath
  const cnv = createCanvas(800, 400);
  try { cnv.parent('scene'); } catch (e) { /* if container not present, ignore */ }
  tanque1 = { x: 200, y: 315, w: 90, h: 135 };
  tanque2 = { x: 700, y: 315, w: 110, h: 135 };
  vida = [100, 100];
  setTimeout(() => {
    atualizarBarraVida('vida1', vida[0]);
    atualizarBarraVida('vida2', vida[1]);
  }, 100);
  p5Ready = true;

  // Add two fixed scene emitters (chimney-style) as requested
  // Coordinates are canvas-space and can be tuned later
  // Increased frequency: emit every 100 frames (approx every 1.6s at 60fps)
  addSceneEmitter(300, 330, 3, 0.3, 0.7);
  addSceneEmitter(620, 320, 2, 0.4, 0.9);
  // Additional scene emitter added: another chimney-style smoke source at a different position
  addSceneEmitter(440, 340, 2, 0.5, 1);
  // New fire+smoke emitter (mixed flame that turns to smoke)
  addSceneEmitter(520, 335, 6, 0.6, 1, 'fire');
  // Also emit background smoke at the same position so fire is mixed with steady smoke
  addSceneEmitter(520, 335, 5, 0.5, 1, 'smoke');

  // Duplicate the fire+smoke effect in the bottom-left corner
  addSceneEmitter(80, 340, 6, 0.6, 1, 'fire');
  addSceneEmitter(80, 340, 5, 0.5, 1, 'smoke');

}

function draw() {
  tocarSomExplosaoSeNecessario();
  // Make canvas transparent and allow DOM background (#scene) + #css-clouds to show through
  clear();
  
  // sky clouds (behind scene smoke)
  // Using CSS DOM clouds only (canvas cloud rendering removed)

  // Atualiza partículas de fumaça
  // First update and render scene (background) smoke so it appears behind tanks
  updateSceneEmitters();
  updateSceneSmoke();
  displaySceneSmoke();

  // Then update generic smoke (explosions, debris, etc.) unchanged
  updateSmoke();

  // Tanque 1 invertido horizontalmente
  push();
  translate(tanque1.x, tanque1.y);
  scale(-1.3, 1);
  if (vida[0] <= 0 || tanque1QuebradoTemp) {
    // Exibir o tanque quebrado sem inversão
    pop();
    image(tanque1QuebradoImg, tanque1.x - tanque1.w / 2, tanque1.y - tanque1.h / 2, tanque1.w, tanque1.h);
  } else {
    image(tanque1Img, -tanque1.w / 2, -tanque1.h / 2, tanque1.w, tanque1.h);
    pop();
  }

  // Tanque 2: inverter apenas o quebrado
  if (vida[1] <= 0 || tanque2QuebradoTemp) {
    push();
    translate(tanque2.x, tanque2.y);
    scale(-1, 1);
    image(tanque2QuebradoImg, -tanque2.w / 2, -tanque2.h / 2, tanque2.w, tanque2.h);
    pop();
  } else {
    image(tanque2Img, tanque2.x - tanque2.w / 2, tanque2.y - tanque2.h / 2, tanque2.w, tanque2.h);
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
    for (let i = projeteis.length - 1; i >= 0; i--) {
      let p = projeteis[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravidade;

      // Player projectiles can hit the plane
      if (p && (p.owner === 1 || p.owner === 2)) {
        // Add a check counter to this projectile
        if (!p._checkCount) p._checkCount = 0;
        p._checkCount++;
        try {
          const planeEl = document.querySelector('.aviao-fly');
          const canvas = document.querySelector('canvas');
          if (!planeEl) {
            if (p._checkCount === 1) console.log('No plane element found (.aviao-fly)');
          }
          if (planeEl && canvas) {
            const pr = planeEl.getBoundingClientRect();
            const cr = canvas.getBoundingClientRect();
            const planeX = ((pr.left - cr.left) / cr.width) * width;
            const planeY = ((pr.top - cr.top) / cr.height) * height;
            const planeW = (pr.width / cr.width) * width;
            const planeH = (pr.height / cr.height) * height;
            // Use full plane size as hitbox (easier to hit for testing)
            const hitboxW = planeW * 1.0;
            const hitboxH = planeH * 1.0;
            const hitboxX = planeX;
            const hitboxY = planeY;
            // Log first few checks for this projectile
            if (p._checkCount <= 3) {
              console.log('Check #' + p._checkCount + ': proj(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') vs plane hitbox(' + hitboxX.toFixed(1) + '-' + (hitboxX+hitboxW).toFixed(1) + ', ' + hitboxY.toFixed(1) + '-' + (hitboxY+hitboxH).toFixed(1) + ')');
            }
            if (p.x > hitboxX && p.x < hitboxX + hitboxW && p.y > hitboxY && p.y < hitboxY + hitboxH) {
              console.log('✓✓✓ HIT DETECTED! Projectile from player', p.owner, 'hit plane id', planeEl._id);
              
              // Decrementa HP do avião
              planeEl._hp--;
              console.log('HP ANTES:', planeEl._hp + 1, '→ HP DEPOIS:', planeEl._hp, '/', planeEl._maxHp);
              
              // Calculate plane center in canvas coordinates
              const planeCenterCanvasX = ((pr.left + pr.width/2 - cr.left) / cr.width) * width;
              const planeCenterCanvasY = ((pr.top + pr.height/2 - cr.top) / cr.height) * height;
              
              // Remove projectile
              projeteis.splice(i, 1);
              
              // PRIMEIRO TIRO: Escurece o avião e mostra defesa.png
              if (planeEl._hp > 0) {
                console.log('>>> PRIMEIRO TIRO: Escurecendo avião');
                planeEl.style.opacity = '0.6';
                planeEl.style.filter = 'brightness(0.7)';
                
                // Mostra imagem defesa.png com fade
                explosao = { 
                  x: planeCenterCanvasX, 
                  y: planeCenterCanvasY, 
                  size: 100, 
                  fade: true, 
                  alpha: 255, 
                  fadeStep: 10, 
                  img: defesaImg 
                };
                
                // Fumaça leve no primeiro tiro
                addSmoke(planeCenterCanvasX, planeCenterCanvasY, 3, 0.8);
              } 
              // SEGUNDO TIRO: Explosão completa e destruição
              else {
                console.log('>>> SEGUNDO TIRO: DESTRUINDO AVIÃO');
                
                // Explosão animada
                explosao = { x: planeCenterCanvasX, y: planeCenterCanvasY, size: 120 };
                explosaoTimer = 40;
                
                // Fumaça intensa na destruição
                addSmoke(planeCenterCanvasX, planeCenterCanvasY, 8, 1.5);
                console.log('PLANE DESTROYED! Awarding point to player', p.owner);
                // Award score to shooter
                if (p.owner === 1 || p.owner === 2) {
                  placar[p.owner - 1]++;
                  document.getElementById('p1score').textContent = placar[0];
                  document.getElementById('p2score').textContent = placar[1];
                  console.log('Score updated: Player 1 =', placar[0], 'Player 2 =', placar[1]);
                }
                
                // Create falling broken plane fragment
                const planeWCanvas = (pr.width / cr.width) * width;
                const planeHCanvas = (pr.height / cr.height) * height;
                const sizeForPlane = Math.max(64, Math.min(220, Math.max(planeWCanvas, planeHCanvas) * 1.1));
                const brokenImg = aviaoQuebrado1Img; // Always use aviaoquebrado1
                console.log('brokenImg loaded?', brokenImg ? 'YES' : 'NO', 'size:', sizeForPlane);
                
                const frag = {
                  x: planeCenterCanvasX,
                  y: planeCenterCanvasY,
                  size: sizeForPlane,
                  vx: (planeEl._dir || 1) * (1 + Math.random() * 2),
                  vy: 1 + Math.random() * 2,
                  grav: 0.18,
                  rot: 0,
                  rotV: (Math.random() - 0.5) * 0.08,
                  img: brokenImg,
                  alpha: 255
                };
                fallenPlanes.push(frag);
                console.log('Created falling plane fragment at', planeCenterCanvasX.toFixed(1), planeCenterCanvasY.toFixed(1));
                
                // Remove the plane DOM element immediately
                if (planeEl && planeEl.parentNode) {
                  console.log('Removing plane element from DOM');
                  planeEl.parentNode.removeChild(planeEl);
                }
                
                // Tell plane manager to respawn after delay
                console.log('Dispatching planeHit event with 1200ms delay');
                document.dispatchEvent(new CustomEvent('planeHit', { detail: { delayRespawn: 1200 } }));
              }
              break;
            }
          }
        } catch (err) {
          // ignore plane-hit detection errors
          console.warn('plane collision detection error:', err);
        }
      }

      // If projectile was already removed (hit plane), skip drawing and other checks
      if (!projeteis[i]) continue;

      // Desenha um míssil estilizado (ou bomba do avião)
  if (p && p.owner === 0) {
    // bomba: desenhe imagem quando disponível, senão use fallback óbvio
    if (typeof bombaImg !== 'undefined' && bombaImg) {
      // draw centered bomb image (approx 24x24)
      const bw = 35;
      const bh = 10;
      image(bombaImg, p.x - bw / 2, p.y - bh / 2, bw, bh);
    } else {
      push();
      noStroke();
      fill(200, 30, 30);
      ellipse(p.x, p.y, 18, 18);
      // pingo de sombra
      fill(120, 20, 20, 160);
      ellipse(p.x, p.y + 4, 10, 6);
      pop();
    }
  } else {
    push();
    translate(p.x, p.y);
    let ang = atan2(p.vy, p.vx);
    rotate(ang);
    // Corpo do míssil
    fill(200);
    stroke(80);
    strokeWeight(1);
    rect(-8, -3, 16, 6, 3);
    // Ponta vermelha
    fill(220, 0, 0);
    noStroke();
    ellipse(8, 0, 7, 7);
    // Cauda de fogo animada
    let fireLen = 6 + random(2, 6);
    fill(255, 180, 0, 180);
    ellipse(-10, 0, fireLen, 6);
    fill(255, 80, 0, 120);
    ellipse(-13, 0, fireLen * 0.7, 4);
    pop();
  }

      // Determine if projectile hits either tank (bombs can hit any; player shot targets enemy only)
      const tankHit = (tankObj) => {
        const hb = { x: tankObj.x - tankObj.w/2, y: tankObj.y - tankObj.h/2, w: tankObj.w, h: tankObj.h };
        return p.x > hb.x && p.x < hb.x + hb.w && p.y > hb.y && p.y < hb.y + hb.h;
      };
      const hitTank1 = tankHit(tanque1);
      const hitTank2 = tankHit(tanque2);
      if (p.owner === 0) {
        // Bomb from plane: damage whichever tank it hits (only one in practice)
        let damagedIdx = -1;
        if (hitTank1) damagedIdx = 0; else if (hitTank2) damagedIdx = 1;
        if (damagedIdx !== -1) {
          vida[damagedIdx] = Math.max(0, vida[damagedIdx] - 10);
          setTimeout(() => atualizarBarraVida(damagedIdx === 0 ? 'vida1' : 'vida2', vida[damagedIdx]), 50);
          explosao = { x: (damagedIdx === 0 ? tanque1.x : tanque2.x), y: (damagedIdx === 0 ? tanque1.y : tanque2.y), size: 120 };
          explosaoTimer = 40;
          
          // Adiciona fumaça da explosão de bomba
          addSmoke((damagedIdx === 0 ? tanque1.x : tanque2.x), (damagedIdx === 0 ? tanque1.y : tanque2.y), 6, 1.3);
          projeteis.splice(i, 1);
          if (damagedIdx === 0 && vida[damagedIdx] > 0) {
            tanque1QuebradoTemp = true; setTimeout(() => { tanque1QuebradoTemp = false; }, 1000);
          } else if (damagedIdx === 1 && vida[damagedIdx] > 0) {
            tanque2QuebradoTemp = true; setTimeout(() => { tanque2QuebradoTemp = false; }, 1000);
          }
          if (vida[damagedIdx] <= 0) {
            aguardandoRecomecar = true;
            setTimeout(() => { document.getElementById('recomecar').style.display = 'inline-flex'; }, 300);
          }
          // Bombs do not affect score or turn.
          break;
        }
      } else {
        // Player projectile: can only score by hitting the opponent's tank
        const adversarioIdx = (turno === 1 ? 1 : 0);
        const adversarioTank = adversarioIdx === 0 ? tanque1 : tanque2;
        if (tankHit(adversarioTank)) {
          // award score to projectile owner (validate owner in [1,2])
            if (p.owner === 1 || p.owner === 2) {
              placar[p.owner - 1]++;
              document.getElementById('p1score').textContent = placar[0];
              document.getElementById('p2score').textContent = placar[1];
            }
          vida[adversarioIdx] = Math.max(0, vida[adversarioIdx] - 10);
          setTimeout(() => atualizarBarraVida(adversarioIdx === 0 ? 'vida1' : 'vida2', vida[adversarioIdx]), 50);
          explosao = { x: adversarioTank.x, y: adversarioTank.y, size: 120 };
          explosaoTimer = 40;
          
          // Adiciona fumaça da explosão de tanque
          addSmoke(adversarioTank.x, adversarioTank.y, 10, 1.8);
          
          projeteis.splice(i, 1);
          if (adversarioIdx === 0 && vida[adversarioIdx] > 0) { tanque1QuebradoTemp = true; setTimeout(() => { tanque1QuebradoTemp = false; }, 1000); }
          else if (adversarioIdx === 1 && vida[adversarioIdx] > 0) { tanque2QuebradoTemp = true; setTimeout(() => { tanque2QuebradoTemp = false; }, 1000); }
          if (vida[adversarioIdx] <= 0) {
            aguardandoRecomecar = true;
            setTimeout(() => { document.getElementById('recomecar').style.display = 'inline-flex'; }, 300);
            // Emissão adicional de fumaça intensa na destruição do tanque
            // (mais partículas e maior intensidade para destaque)
            addSmoke(adversarioTank.x, adversarioTank.y, 30, 2.6);
          } else {
            mudarTurno();
          }
          break;
        }
      }

      // Remove projétil se sair da tela
      if (p.x < 0 || p.x > width || p.y > height) {
        // remove projectile; only change turn for player shots
        const wasPlayerShot = (p.owner === 1 || p.owner === 2);
        projeteis.splice(i, 1);
        if (wasPlayerShot) mudarTurno();
      }
    }
  }
  
  // Fumaça contínua dos tanques destruídos
  if (vida[0] <= 0 && frameCount % 8 === 0) {
    addSmoke(tanque1.x, tanque1.y - 20, 1, 0.8);
  }
  if (vida[1] <= 0 && frameCount % 8 === 0) {
    addSmoke(tanque2.x, tanque2.y - 20, 1, 0.8);
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
  if (projeteis.length > 0 || explosaoTimer > 0 || aguardandoRecomecar) return;

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
}

function moverTanque(direcao) {
  if (aguardandoRecomecar) return;
  let ativo = turno === 1 ? tanque1 : tanque2;
  let passo = 20 * direcao;
  ativo.x += passo;
  ativo.x = constrain(ativo.x, ativo.w / 2, width - ativo.w / 2);
}

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
  el._speed = (180 + Math.min(220, window.innerWidth / 3)) * PLANE_SPEED_FACTOR;
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
      el.style.width = '48px';
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

      // Plane drop logic: occasionally drop a bomb aiming to the area between tanks
      // Both directions can drop bombs
      try {
  if (p5Ready && !active._nextDrop) active._nextDrop = ts + 2000; // start drops after 2s once p5 is ready
  if (p5Ready && ts >= active._nextDrop) {
          const canvas = document.querySelector('canvas');
          // robust bounding rect + fallbacks so this works on mobile where sizes may be zero briefly
          const pr = (active.getBoundingClientRect && typeof active.getBoundingClientRect === 'function')
            ? active.getBoundingClientRect()
            : { left: active._x || 0, top: planeTopY || 0, width: parseFloat(active.style.width) || 48, height: 24 };
          if (!canvas) {
            console.log('plane drop skipped: canvas not found yet');
            active._nextDrop = ts + 500; // try again shortly
          } else {
            const cr = canvas.getBoundingClientRect();
            // fallback sizes if bounding rect is zero (common during layout changes on mobile)
            const crw = (cr && cr.width) || canvas.offsetWidth || canvas.clientWidth || 1;
            const crh = (cr && cr.height) || canvas.offsetHeight || canvas.clientHeight || 1;
            const canvasWidth = (typeof width === 'number' && isFinite(width)) ? width : crw;
            const canvasHeight = (typeof height === 'number' && isFinite(height)) ? height : crh;
            if (crw === 0 || crh === 0) {
              console.log('plane drop skipped: canvas rect zero, using fallbacks', crw, crh);
              active._nextDrop = ts + 500;
            } else {
              // compute plane center on canvas using safe fallbacks
              const prWidth = pr.width || parseFloat(active.style.width) || 48;
              const prHeight = pr.height || 24;
              const originX = (((pr.left || (active._x || 0)) - cr.left) / crw) * canvasWidth + (prWidth / crw) * canvasWidth / 2;
              const originY = (((pr.top || planeTopY || 0) - cr.top) / crh) * canvasHeight + (prHeight / crh) * canvasHeight / 2;
              // clamp to canvas bounds to avoid NaN or offscreen values on mobile
              const ox = Math.max(0, Math.min(canvasWidth, originX));
              const oy = Math.max(0, Math.min(canvasHeight, originY));
              // Linha do solo (aprox da base dos tanques). Usamos y dos tanques (estão centrados).
              const groundY = tanque1.y; // ambos tanques compartilham a mesma linha y (canvas coords)
              const dyGround = groundY - oy;
              // target a random x between tanks with some margin
              const tanksMinX = Math.min(tanque1.x, tanque2.x) - 40;
              const tanksMaxX = Math.max(tanque1.x, tanque2.x) + 40;
              const targetX = tanksMinX + Math.random() * (tanksMaxX - tanksMinX);
              // Física: y(t) = originY + vy*t + 0.5*g*t^2. Queremos y(t_landing) ~= groundY.
              const grav = 0.15;
              const initialVy = 1.0 + Math.random() * 0.8;
              // quadratic: 0.5*g*t^2 + initialVy*t - dyGround = 0
              const a = 0.5 * grav;
              const b = initialVy;
              const c = -dyGround;
              let tLand = 0;
              const disc = b * b - 4 * a * c;
              if (disc >= 0) {
                const sqrtD = Math.sqrt(disc);
                const t1 = (-b + sqrtD) / (2 * a);
                const t2 = (-b - sqrtD) / (2 * a);
                tLand = Math.max(t1, t2);
              }
              if (!tLand || !isFinite(tLand) || tLand < 0.25) {
                // fallback: simple free-fall estimate
                tLand = Math.max(0.25, Math.sqrt((2 * Math.max(8, Math.abs(dyGround))) / grav));
              }
              const dx = targetX - ox;
              const vx = dx / tLand;
              console.log('plane drop ->', 'from', Math.round(ox), Math.round(oy), 'toX≈', Math.round(targetX), 't', tLand.toFixed(2), 'vx', vx.toFixed(2), 'vy', initialVy.toFixed(2));
              projeteis.push({ x: ox, y: oy, vx: vx, vy: initialVy, gravidade: grav, owner: 0 });
              // schedule next drop; add a small random to avoid strict rhythm and adapt for mobile
              active._nextDrop = ts + (1800 + Math.floor(Math.random() * 1000));
            }
          }
        }
      } catch (err) {
        // ignore drop errors
      }

      // Defensive shot handling removed from plane manager to avoid double-interception.
      // Defense is handled in the projectile collision path so charges and blocking are deterministic.

      if (active._dir === 1 && active._x >= window.innerWidth + BUFFER) {
        // Salva HP antes de remover o avião
        const savedHp = active._hp;
        const wasDamaged = (savedHp < active._maxHp);
        console.log('Plane exited screen (dir=1), HP was:', savedHp);
        
        // remove HUD, remove and spawn opposite; randomize altitude for the next loop
        try { removePlaneHUD(); } catch (e) {}
        active.remove();
        currentDir = -1;
        planeTopY = computeRandomTop();
        active = createPlane(currentDir);
        
        // Restaura HP e aparência escura se estava danificado
        active._hp = savedHp;
        if (wasDamaged) {
          active.style.opacity = '0.6';
          active.style.filter = 'brightness(0.7)';
          console.log('Restored damaged appearance, HP:', active._hp);
        }
      } else if (active._dir === -1 && active._x <= -BUFFER) {
        // Salva HP antes de remover o avião
        const savedHp = active._hp;
        const wasDamaged = (savedHp < active._maxHp);
        console.log('Plane exited screen (dir=-1), HP was:', savedHp);
        
        // remove HUD, remove and spawn opposite; randomize altitude for the next loop
        try { removePlaneHUD(); } catch (e) {}
        active.remove();
        currentDir = 1;
        planeTopY = computeRandomTop();
        active = createPlane(currentDir);
        
        // Restaura HP e aparência escura se estava danificado
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



