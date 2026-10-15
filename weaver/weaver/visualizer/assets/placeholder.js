function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}

function draw() {
  background(17);
  const spacing = 34;
  const t = frameCount * 0.015;
  for (let x = spacing / 2; x < width; x += spacing) {
    for (let y = spacing / 2; y < height; y += spacing) {
      const d = dist(x, y, width / 2, height / 2);
      const size = 2 + 1.5 * sin(d * 0.02 - t);
      fill(150 + 40 * sin(d * 0.015 + t), 160, 220, 90);
      circle(x, y, max(0.5, size));
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
