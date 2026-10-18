// Equal-mass Newtonian figure-eight orbit, with Simó's initial conditions.
// Source: Chenciner & Montgomery, https://arxiv.org/abs/math/0011268
export const PERIOD = 6.32591398;
export const SAMPLES = 1200;
export const LOOP_MS = 18000;
export const initialState = [
  .97000436, -.24308753, -.97000436, .24308753, 0, 0,
  .466203685, .43236573, .466203685, .43236573, -.93240737, -.86473146
];
function derivative(state) {
  const result = [...state.slice(6), 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const dx = state[2*j] - state[2*i];
    const dy = state[2*j+1] - state[2*i+1];
    const factor = (dx*dx + dy*dy) ** -1.5;
    result[6+2*i] += dx * factor;
    result[7+2*i] += dy * factor;
    result[6+2*j] -= dx * factor;
    result[7+2*j] -= dy * factor;
  }
  return result;
}
export function createOrbit() {
  const frames = [];
  let state = [...initialState];
  const dt = PERIOD / SAMPLES;
  for (let n = 0; n <= SAMPLES; n++) {
    frames.push(state);
    const k1 = derivative(state);
    const k2 = derivative(state.map((x,i) => x + dt*k1[i]/2));
    const k3 = derivative(state.map((x,i) => x + dt*k2[i]/2));
    const k4 = derivative(state.map((x,i) => x + dt*k3[i]));
    state = state.map((x,i) => x + dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  }
  return frames;
}
export function orbitPoint(frames, phase, body) {
  const wrapped = ((phase % SAMPLES) + SAMPLES) % SAMPLES;
  const index = Math.floor(wrapped);
  const fraction = wrapped - index;
  const a = frames[index], b = frames[index + 1];
  const x = 177*(a[body*2] + (b[body*2]-a[body*2])*fraction);
  const y = -177*(a[body*2+1] + (b[body*2+1]-a[body*2+1])*fraction);
  const tilt = -Math.PI / 7.5;
  return [240 + x*Math.cos(tilt) - y*Math.sin(tilt),
    176 + x*Math.sin(tilt) + y*Math.cos(tilt)];
}
export function orbitPath(frames, phase, body, length = 72, step = 3) {
  const points = [];
  for (let offset = length; offset >= 0; offset -= step) {
    const point = orbitPoint(frames, phase-offset, body);
    points.push(`${points.length ? 'L' : 'M'}${point[0].toFixed(2)} ${point[1].toFixed(2)}`);
  }
  return points.join(' ');
}
function mountOrbit(figure) {
  const frames = createOrbit();
  const control = figure.querySelector('[data-orbit-toggle]');
  const label = figure.querySelector('[data-orbit-label]');
  const bodies = [...figure.querySelectorAll('[data-orbit-body]')];
  const trails = [...figure.querySelectorAll('[data-orbit-trail]')];
  const motion = window.matchMedia('(prefers-reduced-motion:reduce)');
  let playing = true, visible = true, elapsed = 0, previousTime = null, request = null;
  const active = () => playing && visible && !document.hidden && !motion.matches;
  function draw() {
    const phase = elapsed / LOOP_MS * SAMPLES;
    bodies.forEach((body,i) => {
      const [x,y] = orbitPoint(frames,phase,i);
      body.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    });
    trails.forEach(trail => {
      const body = Number(trail.dataset.orbitTrail);
      const segment = Number(trail.dataset.trailSegment);
      trail.setAttribute('d', orbitPath(frames,phase-segment*24,body,24,3));
    });
  }
  function tick(time) {
    request = null;
    if (!active()) { previousTime = null; return; }
    if (previousTime !== null) elapsed = (elapsed + Math.min(time-previousTime,100)) % LOOP_MS;
    previousTime = time;
    draw();
    request = requestAnimationFrame(tick);
  }
  function sync() {
    control.disabled = motion.matches;
    control.setAttribute('aria-pressed', String(playing && !motion.matches));
    label.textContent = motion.matches ? 'Motion paused' : playing ? 'Pause animation' : 'Play animation';
    if (!active()) {
      if (request !== null) cancelAnimationFrame(request);
      request = null;
      previousTime = null;
    } else if (request === null) request = requestAnimationFrame(tick);
  }
  control.addEventListener('click', () => { playing = !playing; sync(); });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:.05}).observe(figure);
  draw();
  sync();
}
if (typeof document !== 'undefined') document.querySelectorAll('[data-three-body]').forEach(mountOrbit);
