const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    menu?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('is-open');
  }
});
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
