const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const uiSpeed = document.getElementById('speed');
const uiScore = document.getElementById('score');
const uiTime = document.getElementById('time');
const uiHealth = document.getElementById('health');
const uiNitro = document.getElementById('nitro');
const uiDrift = document.getElementById('drift');

const restartBtn = document.getElementById('restart');
const toggleTrailBtn = document.getElementById('toggleTrail');

let width = 0;
let height = 0;
function resize(){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();
  }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

document.querySelectorAll('[data-key]').forEach(btn => {
  const code = btn.getAttribute('data-key');
  const down = () => keys.add(code === 'Shift' ? 'ShiftLeft' : code);
  const up = () => keys.delete(code === 'Shift' ? 'ShiftLeft' : code);
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
});

const world = {
  width: 2600,
  height: 2000,
  rocks: [],
  beacons: []
};

function rand(min, max){
  return Math.random() * (max - min) + min;
}

function resetWorld(){
  world.rocks = [];
  world.beacons = [];
  for (let i = 0; i < 28; i++){
    world.rocks.push({
      x: rand(200, world.width - 200),
      y: rand(200, world.height - 200),
      r: rand(18, 38)
    });
  }
  for (let i = 0; i < 6; i++){
    world.beacons.push(spawnBeacon());
  }
}

function spawnBeacon(){
  return {
    x: rand(200, world.width - 200),
    y: rand(200, world.height - 200),
    r: 16,
    pulse: rand(0, Math.PI * 2)
  };
}

const car = {
  x: world.width / 2,
  y: world.height / 2,
  vx: 0,
  vy: 0,
  angle: 0,
  health: 1,
  nitro: 1,
  driftScore: 0
};

let score = 0;
let time = 0;
let showTrails = true;

function resetGame(){
  car.x = world.width / 2;
  car.y = world.height / 2;
  car.vx = 0;
  car.vy = 0;
  car.angle = -Math.PI / 2;
  car.health = 1;
  car.nitro = 1;
  car.driftScore = 0;
  score = 0;
  time = 0;
  resetWorld();
}

resetGame();

restartBtn.addEventListener('click', resetGame);
toggleTrailBtn.addEventListener('click', () => {
  showTrails = !showTrails;
});

let camera = {x: car.x, y: car.y};

function step(dt){
  time += dt;

  const forward = {x: Math.cos(car.angle), y: Math.sin(car.angle)};
  const speed = Math.hypot(car.vx, car.vy);

  const accelerating = keys.has('KeyW') || keys.has('ArrowUp');
  const braking = keys.has('KeyS') || keys.has('ArrowDown');
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const handbrake = keys.has('Space');
  const nitro = keys.has('ShiftLeft') || keys.has('ShiftRight');

  let accel = 0;
  if (accelerating) accel += 480;
  if (braking) accel -= 360;

  if (nitro && car.nitro > 0.02 && accel > 0){
    accel += 520;
    car.nitro = Math.max(0, car.nitro - dt * 0.5);
  } else {
    car.nitro = Math.min(1, car.nitro + dt * 0.15);
  }

  car.vx += forward.x * accel * dt;
  car.vy += forward.y * accel * dt;

  const turnStrength = Math.max(0.6, Math.min(2.6, speed / 120));
  if (left) car.angle -= turnStrength * dt;
  if (right) car.angle += turnStrength * dt;

  const grip = handbrake ? 0.06 : 0.18;
  const forwardSpeed = car.vx * forward.x + car.vy * forward.y;
  const lateralX = car.vx - forward.x * forwardSpeed;
  const lateralY = car.vy - forward.y * forwardSpeed;
  car.vx -= lateralX * grip;
  car.vy -= lateralY * grip;

  const drag = handbrake ? 0.985 : 0.992;
  car.vx *= drag;
  car.vy *= drag;

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  const radius = 14;
  let hit = false;
  if (car.x < radius){car.x = radius; car.vx *= -0.4; hit = true;}
  if (car.x > world.width - radius){car.x = world.width - radius; car.vx *= -0.4; hit = true;}
  if (car.y < radius){car.y = radius; car.vy *= -0.4; hit = true;}
  if (car.y > world.height - radius){car.y = world.height - radius; car.vy *= -0.4; hit = true;}

  world.rocks.forEach(rock => {
    const dx = car.x - rock.x;
    const dy = car.y - rock.y;
    const dist = Math.hypot(dx, dy);
    if (dist < rock.r + radius){
      const push = (rock.r + radius - dist) / (dist || 1);
      car.x += dx * push;
      car.y += dy * push;
      car.vx += dx * 2;
      car.vy += dy * 2;
      hit = true;
    }
  });

  if (hit){
    car.health = Math.max(0, car.health - dt * 0.4);
  } else {
    car.health = Math.min(1, car.health + dt * 0.05);
  }

  world.beacons = world.beacons.map(beacon => {
    const dx = car.x - beacon.x;
    const dy = car.y - beacon.y;
    const dist = Math.hypot(dx, dy);
    beacon.pulse += dt * 3;
    if (dist < beacon.r + radius + 6){
      score += 100;
      car.driftScore += Math.round(Math.max(0, speed - 60) * 0.1);
      return spawnBeacon();
    }
    return beacon;
  });

  if (handbrake && speed > 100){
    car.driftScore += dt * speed * 0.08;
  }

  camera.x += (car.x - camera.x) * 0.08;
  camera.y += (car.y - camera.y) * 0.08;

  uiSpeed.textContent = Math.round(speed);
  uiScore.textContent = score;
  uiTime.textContent = time.toFixed(1) + 's';
  uiHealth.textContent = Math.round(car.health * 100) + '%';
  uiNitro.style.width = Math.round(car.nitro * 100) + '%';
  uiDrift.textContent = Math.round(car.driftScore);
}

function draw(){
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#5b3c29';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.translate(-camera.x, -camera.y);

  drawGround();
  drawBeacons();
  drawRocks();
  drawCar();
  drawBounds();

  ctx.restore();
}

function drawGround(){
  ctx.save();
  const step = 80;
  for (let x = 0; x <= world.width; x += step){
    for (let y = 0; y <= world.height; y += step){
      const shade = (x + y) % 160 === 0 ? '#6a452d' : '#5b3c29';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.restore();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#d1a26a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 14; i++){
    const y = 100 + i * 130;
    ctx.moveTo(120, y + Math.sin(i) * 20);
    ctx.bezierCurveTo(600, y - 40, 1200, y + 60, 1900, y - 30);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBounds(){
  ctx.strokeStyle = '#f5c380';
  ctx.lineWidth = 6;
  ctx.strokeRect(60, 60, world.width - 120, world.height - 120);
}

function drawRocks(){
  ctx.fillStyle = '#2f1b14';
  world.rocks.forEach(rock => {
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c4a32';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function drawBeacons(){
  world.beacons.forEach(beacon => {
    const pulse = (Math.sin(beacon.pulse) + 1) * 0.5;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 222, 140, ${0.5 + pulse * 0.4})`;
    ctx.arc(beacon.x, beacon.y, beacon.r + pulse * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffbf69';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawCar(){
  if (showTrails){
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 18, 12, 0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(car.x - car.vx * 0.03, car.y - car.vy * 0.03);
    ctx.lineTo(car.x - car.vx * 0.08, car.y - car.vy * 0.08);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle + Math.PI / 2);

  ctx.fillStyle = '#3b1f12';
  ctx.fillRect(-14, -26, 28, 52);
  ctx.fillStyle = '#d78b57';
  ctx.fillRect(-10, -20, 20, 30);
  ctx.fillStyle = '#2c1c18';
  ctx.fillRect(-12, -24, 8, 48);
  ctx.fillRect(4, -24, 8, 48);

  ctx.fillStyle = '#ffb347';
  ctx.fillRect(-8, 14, 16, 8);
  ctx.restore();
}

let last = performance.now();
function loop(now){
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
