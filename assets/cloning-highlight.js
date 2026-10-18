// Playback controls for the homepage's schematic quantum-cloning highlight.
const motion = window.matchMedia('(prefers-reduced-motion:reduce)');
document.querySelectorAll('[data-cloning-highlight]').forEach(figure => {
  const control = figure.querySelector('[data-cloning-toggle]');
  const label = figure.querySelector('[data-cloning-label]');
  let playing = true, visible = true;
  function sync() {
    figure.classList.toggle('is-playing', playing && visible && !document.hidden && !motion.matches);
    control.disabled = motion.matches;
    control.dataset.playing = String(playing && !motion.matches);
    label.textContent = motion.matches ? 'Motion paused' : playing ? 'Pause animation' : 'Play animation';
    control.setAttribute('aria-label', motion.matches ? 'Motion paused: quantum cloning machine' : `${label.textContent} of the quantum cloning machine`);
  }
  control.addEventListener('click', () => { playing = !playing; sync(); });
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:.05}).observe(figure);
  sync();
});
