const pet = document.querySelector('#pet');
const sprite = document.querySelector('#sprite');
const bubble = document.querySelector('#bubble');
const statsUI = {
  happiness: document.querySelector('#happy'),
  energy: document.querySelector('#energy'),
  hunger: document.querySelector('#hunger'),
};

const poses = {
  idle1: [0, 0], idle2: [1, 0], walk1: [2, 0], walk2: [3, 0],
  sleep: [0, 1], jump: [1, 1], eat: [2, 1], happy: [3, 1],
};
const stateFrames = {
  idle: ['idle1', 'idle2'], walk: ['walk1', 'walk2'], sleep: ['sleep'],
  jump: ['jump'], eat: ['eat'], happy: ['happy'],
};

let state = 'idle';
let frame = 0;
let direction = -1;
let paused = false;
let dragging = false;
let dragOffset = { x: 100, y: 100 };
let velocity = { x: 0, y: 0 };
let lastPointer = null;
let world = null;
let pos = { x: 0, y: 0 };
let stateUntil = performance.now() + 2500;
let lastTick = performance.now();
let lastFrame = 0;
let bubbleTimer;
const stats = { happiness: 88, energy: 74, hunger: 62 };

function setPose(name) {
  const [column, row] = poses[name];
  sprite.style.backgroundPosition = `${column * 33.333}% ${row * 100}%`;
}

function setState(next, duration = 2400) {
  state = next;
  frame = 0;
  stateUntil = performance.now() + duration;
  pet.className = `state-${state} facing-${direction > 0 ? 'right' : 'left'}${dragging ? ' dragging' : ''}`;
  setPose(stateFrames[state][0]);
}

function say(text, duration = 2200) {
  bubble.textContent = text;
  bubble.classList.add('visible');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('visible'), duration);
}

function updateStats() {
  Object.entries(stats).forEach(([key, value]) => {
    stats[key] = Math.round(Math.max(0, Math.min(100, value)));
    statsUI[key].textContent = stats[key];
  });
}

function chooseNextState() {
  if (paused) return setState('idle', 4000);
  if (stats.energy < 22) { say('Tiny nap. Big dreams.'); return setState('sleep', 9000); }
  const roll = Math.random();
  if (roll < .52) { direction = Math.random() > .5 ? 1 : -1; return setState('walk', 2500 + Math.random() * 4500); }
  if (roll < .72) return setState('idle', 1800 + Math.random() * 4000);
  if (roll < .86) return setState('jump', 700);
  return setState('happy', 1400);
}

async function refreshWorld() {
  world = await window.petAPI.getWorld();
  pos.x = world.bounds.x;
  pos.y = world.bounds.y;
}

function clampAndBounce() {
  const minX = world.workArea.x;
  const maxX = world.workArea.x + world.workArea.width - world.bounds.width;
  const minY = world.workArea.y;
  const maxY = world.workArea.y + world.workArea.height - world.bounds.height;
  if (pos.x <= minX || pos.x >= maxX) {
    pos.x = Math.max(minX, Math.min(pos.x, maxX));
    direction *= -1;
    pet.classList.toggle('facing-right', direction > 0);
    pet.classList.toggle('facing-left', direction < 0);
  }
  if (pos.y >= maxY) { pos.y = maxY; velocity.y = 0; velocity.x *= .82; }
  if (pos.y < minY) { pos.y = minY; velocity.y = Math.abs(velocity.y) * .4; }
}

function animate(now) {
  const dt = Math.min((now - lastTick) / 1000, .05);
  lastTick = now;
  if (!dragging && world) {
    if (Math.abs(velocity.x) > 8 || Math.abs(velocity.y) > 8) {
      velocity.y += 1150 * dt;
      pos.x += velocity.x * dt;
      pos.y += velocity.y * dt;
      velocity.x *= Math.pow(.965, dt * 60);
      clampAndBounce();
      window.petAPI.setPosition(pos.x, pos.y);
    } else if (state === 'walk' && !paused) {
      pos.x += direction * 50 * dt;
      clampAndBounce();
      window.petAPI.setPosition(pos.x, pos.y);
      stats.energy -= .003;
    }
  }

  if (now - lastFrame > (state === 'walk' ? 170 : 520)) {
    const frames = stateFrames[state];
    frame = (frame + 1) % frames.length;
    setPose(frames[frame]);
    lastFrame = now;
  }
  if (!dragging && now > stateUntil) chooseNextState();
  requestAnimationFrame(animate);
}

pet.addEventListener('pointerdown', (event) => {
  if (event.button === 2) return window.petAPI.openMenu();
  dragging = true;
  pet.setPointerCapture(event.pointerId);
  dragOffset = { x: event.clientX, y: event.clientY };
  lastPointer = { x: event.screenX, y: event.screenY, time: performance.now() };
  velocity = { x: 0, y: 0 };
  pet.classList.add('dragging');
  say('Wheee!');
});

pet.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const now = performance.now();
  const dt = Math.max((now - lastPointer.time) / 1000, .016);
  velocity = { x: (event.screenX - lastPointer.x) / dt, y: (event.screenY - lastPointer.y) / dt };
  lastPointer = { x: event.screenX, y: event.screenY, time: now };
  pos.x = event.screenX - dragOffset.x;
  pos.y = event.screenY - dragOffset.y;
  window.petAPI.drag(dragOffset.x, dragOffset.y);
});

function dropPet(event) {
  if (!dragging) return;
  dragging = false;
  pet.releasePointerCapture?.(event.pointerId);
  pet.classList.remove('dragging');
  velocity.x = Math.max(-900, Math.min(900, velocity.x));
  velocity.y = Math.max(-850, Math.min(850, velocity.y));
  stats.happiness += 3;
  setState('jump', 900);
  updateStats();
}
pet.addEventListener('pointerup', dropPet);
pet.addEventListener('pointercancel', dropPet);
pet.addEventListener('contextmenu', (event) => { event.preventDefault(); window.petAPI.openMenu(); });
pet.addEventListener('dblclick', () => { stats.happiness += 8; updateStats(); say('You found my happy spot!'); setState('happy', 1600); });

window.petAPI.onCommand((command) => {
  if (command === 'feed') { stats.hunger += 28; stats.happiness += 5; updateStats(); say('Blueberry acquired!'); setState('eat', 2600); }
  if (command === 'sleep') { say('Five more minutes…'); setState('sleep', 9000); }
  if (command === 'call') { stats.happiness += 4; updateStats(); say('I’m right here!'); setState('happy', 1800); }
});
window.petAPI.onPause((value) => { paused = value; say(value ? 'I’ll stay put.' : 'Adventure time!'); setState('idle', 1800); });

setInterval(() => {
  stats.hunger -= .8;
  stats.energy += state === 'sleep' ? 4 : -.25;
  stats.happiness -= stats.hunger < 20 ? 1.2 : .12;
  updateStats();
}, 12000);

refreshWorld().then(() => {
  updateStats();
  setState('idle', 1600);
  say('Hi! I’m Volt. Drag me, pet me, or right-click me.');
  requestAnimationFrame(animate);
});
