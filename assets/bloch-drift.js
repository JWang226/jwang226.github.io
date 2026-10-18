// Smooth random angular motion on the unit sphere, projected into the SVG.
const RADIUS = 71;
const TRACE_DURATION = 6, TRACE_INTERVAL = .05, TRACE_BANDS = 8;
const gaussian = random => Math.sqrt(-2*Math.log(Math.max(random(),1e-12))) * Math.cos(2*Math.PI*random());
export function advanceBloch(vector, velocity, dt, random = Math.random) {
  const persistence = Math.exp(-dt/1.3);
  const noise = .65*Math.sqrt(1-persistence*persistence);
  const nextVelocity = velocity.map(value => persistence*value + noise*gaussian(random));
  const speed = Math.hypot(...nextVelocity);
  if (speed < 1e-12) return {vector:[...vector],velocity:nextVelocity};
  const axis = nextVelocity.map(value => value/speed);
  const angle = speed*dt, c = Math.cos(angle), s = Math.sin(angle);
  const dot = axis.reduce((sum,value,i) => sum+value*vector[i],0);
  const cross = [axis[1]*vector[2]-axis[2]*vector[1],axis[2]*vector[0]-axis[0]*vector[2],axis[0]*vector[1]-axis[1]*vector[0]];
  const rotated = vector.map((value,i) => value*c+cross[i]*s+axis[i]*dot*(1-c));
  const norm = Math.hypot(...rotated);
  return {vector:rotated.map(value => value/norm),velocity:nextVelocity};
}
export function projectBloch(vector) {
  return {x:145+RADIUS*vector[0],y:100+RADIUS*vector[1],depth:vector[2]};
}
function mountBloch(state) {
  const button = state.closest('.animation-toggle');
  const card = button.closest('.research-card');
  const hoverTarget = card || button;
  const cardLink = card?.querySelector('.research-card-link');
  const dot = state.querySelector('.quantum-dot');
  const arrow = state.querySelector('.quantum-vector');
  const trace = state.parentElement.querySelector('.quantum-trace');
  const tracePaths = Array.from({length:TRACE_BANDS*2},(_,i) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('opacity',(.7*(1-Math.floor(i/2)/TRACE_BANDS)**1.4*(i%2?.45:1)).toFixed(3));
    if (i%2) path.setAttribute('stroke-dasharray','2.5 3');
    trace.append(path);
    return path;
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  let vector = [41/RADIUS,-52/RADIUS,Math.sqrt(1-(41*41+52*52)/(RADIUS*RADIUS))];
  let velocity = Array.from({length:3},() => .45*gaussian(Math.random));
  let visible = true, frame = null, previousTime = null;
  let elapsed = 0, lastSample = 0;
  const history = [{...projectBloch(vector),time:0}];
  function drawTrace() {
    while (history.length>1 && history[1].time<elapsed-TRACE_DURATION) history.shift();
    const paths = Array(TRACE_BANDS*2).fill('');
    let lastPath = -1;
    function segment(a,b,back) {
      const age = elapsed-(a.time+b.time)/2;
      const band = Math.min(TRACE_BANDS-1,Math.floor(age/TRACE_DURATION*TRACE_BANDS));
      const index = band*2+(back?1:0);
      paths[index] += `${lastPath===index?'':`M${a.x.toFixed(2)} ${a.y.toFixed(2)}`}L${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
      lastPath = index;
    }
    for (let i=1;i<history.length;i++) {
      const a = history[i-1], b = history[i];
      if (a.depth*b.depth<0) {
        const fraction = a.depth/(a.depth-b.depth);
        const crossing = Object.fromEntries(['x','y','time'].map(key => [key,a[key]+(b[key]-a[key])*fraction]));
        segment(a,crossing,a.depth<0);
        segment(crossing,b,b.depth<0);
      } else segment(a,b,(a.depth+b.depth)<0);
    }
    tracePaths.forEach((path,i) => path.setAttribute('d',paths[i]));
  }
  function active() {
    return visible && !document.hidden && !reducedMotion.matches &&
      (button.classList.contains('is-animating') || (finePointer.matches &&
        (hoverTarget.matches(':hover') || cardLink?.matches(':focus-visible'))));
  }
  function draw() {
    const point = projectBloch(vector);
    dot.setAttribute('cx',point.x.toFixed(3));
    dot.setAttribute('cy',point.y.toFixed(3));
    dot.setAttribute('r',(4.5+.5*point.depth).toFixed(3));
    arrow.setAttribute('d',`M145 100L${point.x.toFixed(3)} ${point.y.toFixed(3)}`);
    arrow.setAttribute('stroke-dasharray',point.depth<0?'3 3':'none');
    state.setAttribute('opacity',(.7+.3*point.depth).toFixed(3));
    state.dataset.depth = point.depth.toFixed(6);
  }
  function tick(time) {
    frame = null;
    if (!active()) { previousTime = null; return; }
    if (previousTime !== null) {
      const dt = Math.min((time-previousTime)/1000,.05);
      const next = advanceBloch(vector,velocity,dt);
      vector = next.vector;
      velocity = next.velocity;
      elapsed += dt;
      if (elapsed-lastSample>=TRACE_INTERVAL) {
        history.push({...projectBloch(vector),time:elapsed});
        lastSample = elapsed;
        drawTrace();
      }
      draw();
    }
    previousTime = time;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!active()) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
    } else if (frame === null) frame = requestAnimationFrame(tick);
  }
  hoverTarget.addEventListener('pointerenter',sync);
  hoverTarget.addEventListener('pointerleave',sync);
  hoverTarget.addEventListener('focusin',sync);
  hoverTarget.addEventListener('focusout',() => queueMicrotask(sync));
  new MutationObserver(sync).observe(button,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); },{threshold:.05}).observe(button);
  reducedMotion.addEventListener('change',sync);
  finePointer.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  draw();
  sync();
}
if (typeof document !== 'undefined') document.querySelectorAll('[data-bloch-state]').forEach(mountBloch);
