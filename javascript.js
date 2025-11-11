
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
    this.size = random(20, 40) * intensity;
    this.maxSize = this.size + random(30, 60);
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
  createCanvas(800, 400);
  tanque1 = { x: 200, y: 315, w: 90, h: 135 };
  tanque2 = { x: 700, y: 315, w: 110, h: 135 };
  vida = [100, 100];
  setTimeout(() => {
    atualizarBarraVida('vida1', vida[0]);
    atualizarBarraVida('vida2', vida[1]);
  }, 100);
  p5Ready = true;

}

function draw() {
  tocarSomExplosaoSeNecessario();
  background(30);
  image(fundoImg, 0, 0, width, height);
  
  // Atualiza partículas de fumaça
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
      const bw = 25;
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
          const pr = active.getBoundingClientRect ? active.getBoundingClientRect() : { left: active._x, top: planeTopY, width: parseFloat(active.style.width) || 48, height: 24 };
          // ensure p5 canvas and width/height are ready to avoid NaN coordinates
          if (!canvas) {
            console.log('plane drop skipped: canvas not found yet');
            active._nextDrop = ts + 500; // try again shortly
          } else {
            const cr = canvas.getBoundingClientRect();
            if (typeof width !== 'number' || typeof height !== 'number' || cr.width === 0 || cr.height === 0) {
              console.log('plane drop skipped: canvas/size not ready', 'width', width, 'height', height, 'cr', cr.width, cr.height);
              active._nextDrop = ts + 500;
            } else {
              const originX = ((pr.left - cr.left) / cr.width) * width + (pr.width / cr.width) * width / 2;
              const originY = ((pr.top - cr.top) / cr.height) * height + (pr.height / cr.height) * height / 2;
              // Linha do solo (aprox da base dos tanques). Usamos y dos tanques (estão centrados).
              const groundY = tanque1.y; // ambos tanques compartilham a mesma linha y
              const dyGround = groundY - originY;
              // target a random x between tanks with some margin
              const tanksMinX = Math.min(tanque1.x, tanque2.x) - 40;
              const tanksMaxX = Math.max(tanque1.x, tanque2.x) + 40;
              const targetX = tanksMinX + Math.random() * (tanksMaxX - tanksMinX);
              // Física: y(t) = originY + vy*t + 0.5*g*t^2. Queremos y(t_landing) ~= groundY.
              // Escolhemos g e vy inicial e resolvemos t. Para simplificar, vy inicial pequeno para queda quase vertical.
              const grav = 0.15; // mesma gravidade que já usávamos
              const initialVy = 1.0 + Math.random()*0.8; // leve velocidade inicial para baixo
              // 0.5*g*t^2 + initialVy*t - dyGround = 0  (with dyGround = groundY-originY)
              // a = 0.5*g, b = initialVy, c = -dyGround
              const a = 0.2 * grav;
              const b = initialVy;
              const c = -dyGround;
              let tLand = 0;
              const disc = b*b - 4*a*c;
              if (disc >= 0) {
                const sqrtD = Math.sqrt(disc);
                const t1 = (-b + sqrtD) / (2*a);
                const t2 = (-b - sqrtD) / (2*a);
                // escolhe a raiz positiva maior (tempo futuro)
                tLand = Math.max(t1, t2);
              }
              if (!tLand || !isFinite(tLand) || tLand < 0.3) {
                // fallback: estimativa simples se algo deu errado
                tLand = Math.sqrt((2 * dyGround) / grav);
              }
              // vx necessário para alcançar targetX em tLand
              const dx = targetX - originX;
              const vx = dx / tLand;
              console.log('plane drop ->', 'from', Math.round(originX), Math.round(originY), 'toX≈', Math.round(targetX), 't', tLand.toFixed(2), 'vx', vx.toFixed(2), 'vy', initialVy.toFixed(2));
              projeteis.push({ x: originX, y: originY, vx: vx, vy: initialVy, gravidade: grav, owner: 0 });
              // schedule next drop in 2 seconds (2000 ms)
              active._nextDrop = ts + 2000;
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



