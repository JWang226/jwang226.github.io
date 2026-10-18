// Autoplay the homepage highlight while visible, respecting reduced motion.
const motion = window.matchMedia('(prefers-reduced-motion:reduce)');
document.querySelectorAll('[data-cloning-highlight]').forEach(figure => {
  let visible = true;
  function sync() {
    figure.classList.toggle('is-playing', visible && !document.hidden && !motion.matches);
  }
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:.05}).observe(figure);
  sync();
});
