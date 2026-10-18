// A small feedforward network: ReLU hidden layers and a softmax output.
export const networkLayers = [[40,[55,100,145]],[110,[35,78,122,165]],[180,[55,100,145]],[250,[78,122]]];
// Each row contains one destination neuron's incoming weights.
export const networkWeights = [
  [[.9,-.55,.5],[-.3,.95,.65],[.6,.45,-.8],[.5,-.4,.9]],
  [[.8,-.6,.65,.25],[-.45,.9,.45,-.4],[.4,.35,-.55,.85]],
  [[.9,-.65,.4],[-.5,.8,.55]]
];
const biases = [[-.2,-.15,-.05,-.2],[-.15,-.05,-.2],[.05,-.05]];
const inputs = [[.9,.25,.65],[.25,.85,.4],[.55,.45,.95],[.8,.6,.2]];
const STEP = 1.45, ACTIVATION_TIME = .25, DEPARTURE_DELAY = .4;
const FLIGHT_TIME = STEP-DEPARTURE_DELAY;
const RESET_START = (networkLayers.length-1)*STEP+ACTIVATION_TIME+.8;
const RESET_TIME = .4, CYCLE_TIME = RESET_START+RESET_TIME+.25;
const clamp = value => Math.max(0,Math.min(1,value));

export function forwardNetwork(input) {
  const values = [[...input]];
  networkWeights.forEach((weights,layer) => {
    const sums = weights.map((row,target) => row.reduce((sum,weight,source) => sum+weight*values[layer][source],biases[layer][target]));
    if (layer<networkWeights.length-1) values.push(sums.map(value => Math.max(0,value)));
    else {
      const exp = sums.map(value => Math.exp(value-Math.max(...sums)));
      const total = exp.reduce((sum,value) => sum+value,0);
      values.push(exp.map(value => value/total));
    }
  });
  return values;
}
const passes = inputs.map(forwardNetwork);

export function networkFrame(elapsed) {
  const time = elapsed%CYCLE_TIME;
  const values = passes[Math.floor(elapsed/CYCLE_TIME)%passes.length];
  const fade = 1-clamp((time-RESET_START)/RESET_TIME);
  const activations = values.map((layer,index) => layer.map(value => value*clamp((time-index*STEP)/ACTIVATION_TIME)*fade));
  const sourceLayer = Math.floor(time/STEP);
  const progress = (time-sourceLayer*STEP-DEPARTURE_DELAY)/FLIGHT_TIME;
  return {values,activations,progress,transition:sourceLayer<networkWeights.length && progress>=0 && progress<1?sourceLayer:-1};
}

function mountNetwork(network) {
  const button = network.closest('.animation-toggle');
  const card = button.closest('.research-card');
  const hoverTarget = card || button;
  const cardLink = card?.querySelector('.research-card-link');
  const nodes = Array.from(network.querySelectorAll('.network-node'),element => ({element,layer:Number(element.dataset.layer),index:Number(element.dataset.index)}));
  const cursors = Array.from(network.querySelectorAll('.network-cursor'),element => {
    const layer = Number(element.dataset.layer), source = Number(element.dataset.source), target = Number(element.dataset.target);
    return {element,layer,source,weight:networkWeights[layer][target][source],
      x1:networkLayers[layer][0],y1:networkLayers[layer][1][source],
      x2:networkLayers[layer+1][0],y2:networkLayers[layer+1][1][target]};
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  let visible = true, frame = null, previousTime = null, elapsed = 0;
  const blend = (from,to,amount) => `rgb(${from.map((value,i) => Math.round(value+(to[i]-value)*amount)).join(' ')})`;
  function active() {
    return visible && !document.hidden && !reducedMotion.matches &&
      (button.classList.contains('is-animating') || (finePointer.matches &&
        (hoverTarget.matches(':hover') || cardLink?.matches(':focus-visible'))));
  }
  function draw() {
    const state = networkFrame(elapsed);
    for (const {element,layer,index} of nodes) {
      const value = state.activations[layer][index], intensity = clamp(value);
      element.setAttribute('fill',blend([245,243,236],[139,52,43],intensity));
      element.setAttribute('stroke',blend([91,98,91],[139,52,43],intensity));
      element.dataset.activation = value.toFixed(4);
    }
    for (const {element,layer,source,weight,x1,y1,x2,y2} of cursors) {
      const signal = Math.abs(state.values[layer][source]*weight);
      if (state.transition!==layer || signal<1e-8) { element.setAttribute('opacity','0'); continue; }
      element.setAttribute('cx',(x1+(x2-x1)*state.progress).toFixed(3));
      element.setAttribute('cy',(y1+(y2-y1)*state.progress).toFixed(3));
      element.setAttribute('r',(2.1+1.2*clamp(signal)).toFixed(3));
      element.setAttribute('opacity',(.35+.65*clamp(signal)).toFixed(3));
    }
  }
  function tick(time) {
    frame = null;
    if (!active()) { previousTime = null; return; }
    if (previousTime!==null) { elapsed += Math.min((time-previousTime)/1000,.05); draw(); }
    previousTime = time;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!active()) {
      if (frame!==null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
    } else if (frame===null) frame = requestAnimationFrame(tick);
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
if (typeof document!=='undefined') document.querySelectorAll('[data-neural-network]').forEach(mountNetwork);
