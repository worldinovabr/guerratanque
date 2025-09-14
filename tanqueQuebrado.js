// Imagem placeholder para tanque quebrado
function placeholderTanqueQuebrado(w, h) {
  let gfx = createGraphics(w, h);
  gfx.background(80);
  gfx.stroke(255,0,0);
  gfx.strokeWeight(4);
  gfx.line(10, h-10, w-10, 10);
  gfx.line(w-10, h-10, 10, 10);
  gfx.noStroke();
  gfx.fill(200,0,0);
  gfx.textAlign(CENTER, CENTER);
  gfx.textSize(14);
  gfx.text("Quebrado", w/2, h/2);
  return gfx;
}
