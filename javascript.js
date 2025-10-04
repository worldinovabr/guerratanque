
let howlerSomTiro;

  
let tanque1Img, tanque2Img, fundoImg, explosionSprite, tanque1QuebradoImg, tanque2QuebradoImg;
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
let vida = [100, 100];

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
    "https://copilot.microsoft.com/th/id/BCO.89c0ed36-720f-4a45-bb9c-f67edba35271.png",
    undefined,
    () => { tanque1Img = placeholder(90, 90, "Tanque 1"); }
  );
  tanque2Img = loadImage(
    "https://copilot.microsoft.com/th/id/BCO.92972bda-fb88-40b5-9980-d44ba5513799.png",
    undefined,
    () => { tanque2Img = placeholder(90, 90, "Tanque 2"); }
  );
  fundoImg = loadImage(
    "https://copilot.microsoft.com/th/id/BCO.93c0dbca-ed97-4d29-9c48-8b36745bf773.png",
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
    "https://img.icons8.com/external-flaticons-flat-flat-icons/128/external-explosion-nuclear-disaster-flaticons-flat-flat-icons.png",
    undefined,
    () => { explosionSprite = placeholder(128, 128, "EXPLOSÃO"); }
  );
  tanque1QuebradoImg = loadImage(
    "https://copilot.microsoft.com/th/id/BCO.f7cc0ccd-dfb7-4b3e-9770-49f25bdd766a.png",
    undefined,
    () => { tanque1QuebradoImg = placeholder(90, 90, "Quebrado1"); }
  );
  tanque2QuebradoImg = loadImage(
    "https://copilot.microsoft.com/th/id/BCO.5e4811e1-4e4b-4b12-95fb-380e9374aa75.png",
    undefined,
    () => { tanque2QuebradoImg = placeholder(90, 90, "Quebrado2"); }
  );
}

function setup() {
  createCanvas(800, 400);
  tanque1 = { x: 100, y: 300, w: 90, h: 90 };
  tanque2 = { x: 700, y: 300, w: 90, h: 90 };
  vida = [100, 100];
  setTimeout(() => {
    atualizarBarraVida('vida1', vida[0]);
    atualizarBarraVida('vida2', vida[1]);
  }, 100);
  // Adiciona botão de recomeçar ao lado dos botões de ação
  if (!document.getElementById('recomecar')) {
    let btn = document.createElement('button');
    btn.id = 'recomecar';   
    btn.title = 'Recomeçar';
    btn.style = 'width:48px;height:48px;padding:0;background:#ffcc00;color:#222;border:none;border-radius:50%;cursor:pointer;display:none;display:flex;align-items:center;justify-content:center;';
    btn.onclick = recomecarJogo;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#222" d="M12 6V3l-5 5 5 5V8c2.76 0 5 2.24 5 5a5 5 0 1 1-5-5z"/></svg>`;
    let btnContainer = document.querySelector('.button-container');
    if (btnContainer) {
      btnContainer.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
  }
}

function draw() {
  tocarSomExplosaoSeNecessario();
  background(30);
  image(fundoImg, 0, 0, width, height);

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

  // Explosão animada
  if (explosao && explosaoTimer > 0) {
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

  // Projéteis em movimento
  if (!aguardandoRecomecar) {
    for (let i = projeteis.length - 1; i >= 0; i--) {
      let p = projeteis[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravidade;

  // Desenha um míssil estilizado
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

      let inimigo = turno === 1 ? tanque2 : tanque1;
      let hitbox = {
        x: inimigo.x - inimigo.w / 2,
        y: inimigo.y - inimigo.h / 2,
        w: inimigo.w,
        h: inimigo.h
      };

      // Verifica colisão com o tanque
      if (
        p.x > hitbox.x &&
        p.x < hitbox.x + hitbox.w &&
        p.y > hitbox.y &&
        p.y < hitbox.y + hitbox.h
      ) {
        placar[turno - 1]++;
        document.getElementById("p1score").textContent = placar[0];
        document.getElementById("p2score").textContent = placar[1];
        let adversario = turno === 1 ? 1 : 0;
        vida[adversario] = Math.max(0, vida[adversario] - 10);
  setTimeout(() => atualizarBarraVida(adversario === 0 ? 'vida1' : 'vida2', vida[adversario]), 50);
        explosao = { x: inimigo.x, y: inimigo.y, size: 120 };
        explosaoTimer = 40;
        projeteis.splice(i, 1);
        // Mostra o tanque destruído temporariamente
        if (adversario === 0 && vida[adversario] > 0) {
          tanque1QuebradoTemp = true;
          setTimeout(() => { tanque1QuebradoTemp = false; }, 1000);
        } else if (adversario === 1 && vida[adversario] > 0) {
          tanque2QuebradoTemp = true;
          setTimeout(() => { tanque2QuebradoTemp = false; }, 1000);
        }
        if (vida[adversario] <= 0) {
          aguardandoRecomecar = true;
          setTimeout(() => {
            document.getElementById('recomecar').style.display = 'inline-block';
          }, 300);
        } else {
          mudarTurno();
        }
        break;
      }

      // Remove projétil se sair da tela
      if (p.x < 0 || p.x > width || p.y > height) {
        projeteis.splice(i, 1);
        mudarTurno();
      }
    }
  }
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
      novoValor = Math.max(1, Math.min(20, novoValor));
      break;
  }
  
  elemento.textContent = novoValor;
}

function disparar() {
  if (projeteis.length > 0 || explosaoTimer > 0 || aguardandoRecomecar) return;

  let x = parseInt(document.getElementById("coordX").textContent);
  let y = parseInt(document.getElementById("coordY").textContent);
  let potencia = parseInt(document.getElementById("potencia").textContent);

  if (isNaN(x) || isNaN(y) || isNaN(potencia) || potencia <= 0) return;

  let origem = turno === 1 ? tanque1 : tanque2;
  let dx = x - origem.x;
  let dy = y - origem.y;
  let angulo = atan2(dy, dx);

  const fatorVelocidade = 0.5; // Reduz a velocidade do tiro
  projeteis.push({
    x: origem.x,
    y: origem.y,
    vx: cos(angulo) * potencia * fatorVelocidade,
    vy: sin(angulo) * potencia * fatorVelocidade,
    gravidade: 0.2
  });
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



