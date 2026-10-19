const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const mobileNavigation = window.matchMedia('(max-width:760px), (max-width:950px) and (max-height:500px)');
function closeMenu(returnFocus = false) {
  menu?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
  if (returnFocus) menu?.focus();
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav?.classList.toggle('is-open', open);
});
nav?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
function closeMenuOutside(event) {
  if (menu?.getAttribute('aria-expanded') === 'true' && !menu.contains(event.target) && !nav?.contains(event.target)) closeMenu();
}
document.addEventListener('click', closeMenuOutside);
document.addEventListener('focusin', closeMenuOutside);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
mobileNavigation.addEventListener('change', () => closeMenu());
const search = document.querySelector('#publication-search');
const filters = document.querySelectorAll('[data-topic-filter]');
let activeTopic = 'All';
function filterPublications() {
  const query = search?.value.trim().toLowerCase() || '';
  let count = 0;
  document.querySelectorAll('[data-publication]').forEach((entry) => {
    const visible = (activeTopic === 'All' || entry.dataset.topics.split('|').includes(activeTopic)) && entry.textContent.toLowerCase().includes(query);
    entry.hidden = !visible;
    if (visible) count++;
  });
  document.querySelectorAll('[data-year-group]').forEach((group) => {
    group.hidden = !group.querySelector('[data-publication]:not([hidden])');
  });
  const countEl = document.querySelector('#results-count');
  if (countEl) countEl.textContent = `${count} ${count === 1 ? 'publication' : 'publications'}`;
  const empty = document.querySelector('#no-results');
  if (empty) empty.hidden = count > 0;
}
filters.forEach((button) => button.addEventListener('click', () => {
  activeTopic = button.dataset.topicFilter;
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  filterPublications();
}));
search?.addEventListener('input', filterPublications);
document.querySelector('[data-clear-search]')?.addEventListener('click', () => {
  search.value = '';
  activeTopic = 'All';
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.topicFilter === 'All')));
  filterPublications();
  search.focus();
});
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());

const presentationYears = [...document.querySelectorAll('details.cv-talk-year')];
function openPresentationYear(hash) {
  const year = presentationYears.find(year => '#'+year.id === hash);
  if (year) year.open = true;
}
openPresentationYear(window.location.hash);
window.addEventListener('hashchange', () => openPresentationYear(window.location.hash));
document.querySelectorAll('.cv-talk-index a').forEach(link => link.addEventListener('click', () => openPresentationYear(link.hash)));
let presentationPrintState;
window.addEventListener('beforeprint', () => {
  if (presentationPrintState) return;
  presentationPrintState = presentationYears.map(year => year.open);
  presentationYears.forEach(year => { year.open = true; });
});
window.addEventListener('afterprint', () => {
  if (!presentationPrintState) return;
  presentationYears.forEach((year,index) => { year.open = presentationPrintState[index]; });
  presentationPrintState = undefined;
});

// Phone illustrations play automatically; desktop keeps hover and keyboard controls.
const illustrations = [...document.querySelectorAll('.animation-toggle')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
const mobileMotion = window.matchMedia('(max-width:760px), (max-width:950px) and (max-height:500px), (hover:none), (pointer:coarse)');
const illustrationVisibility = new WeakMap();
let selectedIllustration = null;
function syncIllustrationMotion() {
  const interactive = !mobileMotion.matches && !reducedMotion.matches;
  illustrations.forEach(illustration => {
    illustration.setAttribute('role',interactive?'button':'img');
    illustration.setAttribute('aria-label',`${interactive?'Animate ':''}${illustration.dataset.illustrationName} illustration`);
    if (interactive) {
      illustration.setAttribute('tabindex','0');
      illustration.setAttribute('aria-pressed',String(selectedIllustration===illustration));
    } else {
      illustration.removeAttribute('tabindex');
      illustration.removeAttribute('aria-pressed');
    }
    const playing = !reducedMotion.matches && !document.hidden &&
      (mobileMotion.matches?illustrationVisibility.get(illustration)===true:selectedIllustration===illustration);
    illustration.classList.toggle('is-animating',playing);
  });
}
illustrations.forEach(illustration => {
  illustration.addEventListener('click',() => {
    if (mobileMotion.matches || reducedMotion.matches) return;
    selectedIllustration = selectedIllustration===illustration?null:illustration;
    syncIllustrationMotion();
  });
  illustration.addEventListener('keydown',event => {
    if (mobileMotion.matches || reducedMotion.matches || event.repeat || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    illustration.click();
  });
});
const illustrationObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => illustrationVisibility.set(entry.target,entry.isIntersecting));
  syncIllustrationMotion();
},{threshold:.05});
illustrations.forEach(illustration => illustrationObserver.observe(illustration));
function resetIllustrationMotion() {
  selectedIllustration = null;
  syncIllustrationMotion();
}
reducedMotion.addEventListener('change',resetIllustrationMotion);
mobileMotion.addEventListener('change',resetIllustrationMotion);
document.addEventListener('visibilitychange',() => {
  if (document.hidden) selectedIllustration = null;
  syncIllustrationMotion();
});
syncIllustrationMotion();
