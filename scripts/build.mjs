import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { createHash } from 'node:crypto';

const json = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; } };
const site = await json('data/site.json');
const styleVersion = createHash('sha256').update(await readFile('assets/style.css')).digest('hex').slice(0, 10);
const highlightVersion = createHash('sha256').update(await readFile('assets/cloning-highlight.js')).digest('hex').slice(0, 10);
const scriptVersion = createHash('sha256').update(await readFile('assets/site.js')).digest('hex').slice(0, 10);
const publications = (await json('data/publications.json', [])).sort((a,b) => b.year - a.year || (b.date || '').localeCompare(a.date || ''));
const talks = await json('data/talks.json', []);
const presentations = (await json('data/presentations.json', [])).sort((a,b) => b.year - a.year || b.month - a.month);
const talkByUrl = new Map(talks.map(t => [t.url,t]));
const externalPosts = await json('data/external-posts.json', []);
const researchHighlights = await json('data/research-highlights.json');
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = '<span aria-hidden="true">↗</span>';
const link = (label, url, cls = '') => `<a class="${cls}" href="${esc(url)}">${esc(label)} ${arrow}</a>`;
const dateLabel = date => new Intl.DateTimeFormat('en', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date));
const topics = ['AI', 'Quantum', 'Gravity'];
const ids = {'AI':'ai-llm', Quantum:'quantum', Gravity:'gravity'};
const descriptions = {
  'AI': 'Learning, reasoning, and the information that makes intelligence possible.',
  Quantum: 'The structure of quantum information and the limits of what we can learn.',
  Gravity: 'Spacetime, black holes, and the information hidden in geometry.'
};

function visual(topic, large = false) {
  let art = '';
  if (topic === 'AI') {
    const layers = [[40,[55,100,145]],[110,[35,78,122,165]],[180,[55,100,145]],[250,[78,122]]];
    let wires = '';
    for (let i=0;i<layers.length-1;i++) for (const y of layers[i][1]) for (const z of layers[i+1][1]) wires += `<line x1="${layers[i][0]}" y1="${y}" x2="${layers[i+1][0]}" y2="${z}" stroke="#bcb8ad" stroke-width=".8"/>`;
    art = `<g class="network-wires">${wires}</g><g class="network-signals" stroke="#8b342b" stroke-width="1.7"><path class="network-signal" pathLength="1" d="M40 55L110 78L180 100L250 78"/><path class="network-signal" pathLength="1" d="M40 100L110 122L180 145L250 122"/><path class="network-signal" pathLength="1" d="M40 145L110 165L180 100L250 122"/></g>`;
    layers.forEach(([x,ys],layer) => ys.forEach((y,index) => { art += `<circle class="network-node" style="--node-delay:${layer*220+index*75}ms" cx="${x}" cy="${y}" r="5" fill="${x === 250 ? '#8b342b' : '#f5f3ec'}" stroke="${x === 250 ? '#8b342b' : '#5b625b'}"/>`; }));
  } else if (topic === 'Quantum') {
    art = '<circle cx="145" cy="100" r="71"/><ellipse cx="145" cy="100" rx="71" ry="24"/><g class="quantum-meridian"><ellipse cx="145" cy="100" rx="24" ry="71" transform="rotate(32 145 100)"/></g><path d="M145 182V18M55 100h180" stroke-dasharray="3 5" opacity=".55"/><g class="quantum-state"><path d="M145 100l41-52" stroke="#8b342b" stroke-width="1.6"/><circle cx="186" cy="48" r="5" fill="#8b342b" stroke="none"/></g><text x="145" y="12" text-anchor="middle">|0⟩</text><text x="145" y="197" text-anchor="middle">|1⟩</text>';
  } else {
    // A smooth surface of revolution: exterior -> throat -> rounded bag.
    const bezier = (p0,p1,p2,p3,t) => (1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3;
    const profile = (along,angle) => {
      const rim = 108/Math.max(Math.abs(Math.cos(angle)),Math.abs(Math.sin(angle)));
      const segment = Math.min(2,Math.floor(along)), t = along-segment;
      const radii = [[rim,64,24,24],[24,24,62,62],[62,62,36,0]][segment];
      const heights = [[40,40,55,91],[91,113,118,143],[143,171,190,190]][segment];
      return [bezier(...radii,t),bezier(...heights,t)];
    };
    const project = (along,angle) => {
      const [radius,height] = profile(along,angle);
      const x = radius*Math.cos(angle), y = radius*Math.sin(angle);
      return [145+x+.22*y, height+.23*y];
    };
    const trace = points => points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const meridian = (angle,end = 2.95) => trace(Array.from({length:73},(_,i)=>project(end*i/72,angle)));
    const ring = along => trace(Array.from({length:65},(_,i)=>project(along,i*Math.PI/32)))+'Z';
    const rings = [.12,.28,.45,.62,.78,.9,1.28,1.55,1.8,2,2.23,2.46,2.68,2.86,2.95].map(along=>`<path d="${ring(along)}"/>`).join('');
    const meridians = Array.from({length:24},(_,i)=>`<path d="${meridian(i*Math.PI/12)}"/>`).join('');
    const signals = [.2,.5,.8].map((turn,i)=>`<path class="gravity-infall" pathLength="1" d="${meridian(turn*Math.PI,2.35)}" style="--infall-delay:-${i*1.5}s"/>`).join('');
    const edge = [Math.atan(.22),Math.atan(.22)+Math.PI].map(angle=>`<path d="${meridian(angle,3)}"/>`).join('');
    art = `<path class="gravity-sheet" d="M13 15.16H229L277 64.84H61Z"/><g class="gravity-meridians">${meridians}</g><g class="gravity-contours">${rings}</g><g class="gravity-silhouette">${edge}</g><g>${signals}</g><path class="gravity-throat-halo" d="${ring(1)}"/><path class="gravity-throat" d="${ring(1)}"/>`;
  }
  return `<button type="button" class="research-visual animation-toggle ${large?'large':''}" aria-label="Animate ${esc(topic)} illustration" aria-pressed="false"><svg class="research-art" viewBox="0 0 290 205" aria-hidden="true" fill="none" stroke="#777d70" stroke-width=".85"><g>${art}</g></svg></button>`;
}

function cloningHighlight() {
  const publication = publications.find(p => p.id === '2609.35986');
  const state = (x,y,output = false,i = 0) => `<g class="clone-state ${output?'clone-output':'clone-input'}" style="--state-delay:${i*.2}s" transform="translate(${x} ${y})"><circle r="18" class="clone-state-halo"/><circle r="13"/><ellipse rx="13" ry="4.5"/><path d="M0 0l${output?7:5} -${output?6:9}" class="clone-state-vector"/><circle cx="${output?7:5}" cy="-${output?6:9}" r="2" class="clone-state-tip"/></g>`;
  const outputs = [75,125,175,225];
  const paths = ['M78 125C123 125 132 149 178 149','M78 185C123 185 132 161 178 161',...outputs.map(y=>`M328 155C375 155 377 ${y} 419 ${y}`)];
  const wires = paths.map((d,i)=>`<path class="clone-wire" d="${d}"/><path class="clone-signal" pathLength="1" d="${d}" style="--signal-delay:${i<2?i*.25:1.5+(i-2)*.18}s"/>`).join('');
  return `<figure class="research-spotlight" data-cloning-highlight><p class="eyebrow">RESEARCH HIGHLIGHT</p><button class="cloning-toggle" type="button" data-cloning-toggle aria-label="Pause animation of the quantum cloning machine" data-playing="true" aria-describedby="cloning-description"><span class="cloning-legend" aria-hidden="true"><span><var>n</var> inputs<small>mixed states</small></span><span>Quantum<br>cloner</span><span><var>m</var> &gt; <var>n</var> outputs<small>approximate copies</small></span></span><svg class="cloning-machine" viewBox="0 55 500 195" aria-hidden="true"><defs><linearGradient id="cloner-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#e9eadd"/></linearGradient><clipPath id="cloner-window"><rect x="180" y="90" width="146" height="132" rx="20"/></clipPath></defs><g fill="none">${wires}</g><rect class="clone-chamber-shadow" x="184" y="96" width="150" height="136" rx="22"/><rect class="clone-chamber" x="178" y="88" width="150" height="136" rx="22" fill="url(#cloner-glass)"/><g clip-path="url(#cloner-window)"><path class="clone-scan" d="M180 103H326"/><g class="clone-core"><circle cx="253" cy="155" r="34"/><ellipse cx="253" cy="155" rx="34" ry="11"/><ellipse cx="253" cy="155" rx="11" ry="34" transform="rotate(28 253 155)"/></g><circle class="clone-core-center" cx="253" cy="155" r="4"/></g>${state(58,125)}${state(58,185,false,1)}${outputs.map((y,i)=>state(439,y,true,i)).join('')}</svg><span class="cloning-control" data-cloning-label>Pause animation</span></button><span class="sr-only" id="cloning-description">A schematic quantum cloner transforms n input copies of a mixed state into m greater than n approximate output copies.</span><figcaption><h2><a href="${esc(publication.arxiv)}">${esc(publication.title)} <span aria-hidden="true">↗</span></a></h2><p>Optimal fidelity for mixed-state cloning in the many-copy limit.</p></figcaption></figure><script type="module" src="/assets/cloning-highlight.js?v=${highlightVersion}"></script>`;
}

function shell(title, current, body, description = site.description, route = '/') {
  const nav = [['Home','/'],['Research','/research/'],['Publications','/publications/'],['Blog','/blog/'],['CV','/cv/']];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title === 'Home' ? site.name + ' — AI, Quantum & Gravity' : title + ' — ' + site.name)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f5f3ec"><link rel="canonical" href="${site.url}${route}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title === 'Home' ? site.name : title + ' — ' + site.name)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${site.url}${route}"><meta property="og:image" content="${site.url}/assets/social-card.svg"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css?v=${styleVersion}"><link rel="alternate" type="application/rss+xml" title="Jinzhao Wang — Blog" href="/feed.xml"><script src="/assets/site.js?v=${scriptVersion}" defer></script></head><body><a class="skip-link" href="#main">Skip to content</a><header class="site-header wrap"><a class="wordmark" href="/" aria-label="Jinzhao Wang home">Jinzhao Wang<span class="wordmark-dot">.</span></a><button class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="main-nav">Menu <span aria-hidden="true">☰</span></button><nav id="main-nav" aria-label="Main navigation">${nav.map(([name,url])=>`<a href="${url}" ${current===name?'aria-current="page"':''}>${name}</a>`).join('')}</nav></header><main id="main">${body}</main><footer class="site-footer wrap"><div><a class="footer-name" href="/">Jinzhao Wang<span>.</span></a><p>AI · Quantum · Information · Gravity</p></div><div class="footer-links">${link('Google Scholar',site.scholar)}${link('GitHub',site.github)}${link('LinkedIn',site.linkedin)}${link('X',site.x)}${link('ORCID',site.orcid)}</div><p class="copyright">© ${new Date().getUTCFullYear()} Jinzhao Wang</p></footer></body></html>`;
}

function paperLinks(p) {
  const all = [];
  if (p.arxiv) all.push({label:'arXiv',url:p.arxiv});
  if (p.journal?.url) all.push({label:'Journal',url:p.journal.url});
  for (const resource of p.links || []) {
    const talk = talkByUrl.get(resource.url);
    if (talk && talk.speaker !== site.name) {
      if (talk.type !== 'Recording' || !talk.speaker) continue;
      all.push({...resource,label:`Coauthor talk · ${talk.speaker}`});
    } else all.push(resource);
  }
  return `<div class="paper-links">${[...new Map(all.map(l=>[l.url,l])).values()].map(l=>link(l.label,l.url)).join('')}</div>`;
}
function paper(p, compact = false) {
  return `<article class="paper ${compact?'compact':''}" id="${esc(p.id)}" data-publication data-topics="${esc((p.topics||[]).join('|'))}"><div class="paper-topline">${(p.topics||[]).map(t=>`<span>${esc(t)}</span>`).join('')}<span>${esc(p.journal ? p.journal.name + (p.status === 'Accepted' ? ' · Accepted' : '') : (p.status || 'Preprint'))}</span></div><h3><a href="${esc(p.arxiv || p.journal?.url || '#'+p.id)}">${esc(p.title)}</a></h3><p class="authors">${(p.authors||[]).map(a=>a==='Jinzhao Wang'?'<strong>Jinzhao Wang</strong>':esc(a)).join(', ')}</p>${!compact && p.summary?`<p class="paper-summary">${esc(p.summary)}</p>`:''}${paperLinks(p)}</article>`;
}
const topicCard = (topic, i) => `<article class="research-card"><div class="card-top"><span class="eyebrow">0${i+1}</span><span class="card-arrow" aria-hidden="true">↗</span></div>${visual(topic)}<h3><a class="research-card-link" href="/research/#${ids[topic]}" aria-label="Explore ${esc(topic)} research">${esc(topic)}</a></h3><p>${descriptions[topic]}</p><span class="card-link" aria-hidden="true">Explore research <span>→</span></span></article>`;
const pageHeading = (kicker,title,description) => `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="page-deck">${description}</p></div>`;

const home = `<section class="hero wrap"><div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> ${site.role.toUpperCase()} · ${site.affiliation.toUpperCase()}</p><h1>Jinzhao Wang<span class="serif-dot">.</span></h1><p class="intro">I’m a research scientist at ${link(site.affiliation,site.affiliationUrl)} working on AI and large language models. I’m also a theoretical physicist working on quantum information, exploring how information is learned, processed, and encoded in the physical world.</p><p class="intro secondary">Previously, I was a postdoctoral fellow at Stanford. I received my PhD in theoretical physics from ETH Zürich. I studied theoretical physics at Imperial College London and the University of Cambridge.</p><div class="hero-links"><a class="button" href="/research/">Explore my research <span aria-hidden="true">↗</span></a></div></div>${cloningHighlight()}</section><section class="research-overview wrap"><div class="section-heading"><div><p class="eyebrow">RESEARCH</p><h2>Information,<br> <em>across scales</em></h2></div><p>From learning systems to quantum states<br class="desktop-break"> and the geometry of spacetime.</p></div><div class="research-grid">${topics.map(topicCard).join('')}</div></section><section class="selected-section wrap"><div class="section-heading"><div><p class="eyebrow">SELECTED WORK</p><h2>Recent publications</h2></div><a class="text-link" href="/publications/">All publications <span aria-hidden="true">↗</span></a></div><div class="home-papers">${publications.filter(p=>p.featured).map(p=>`<div class="home-paper"><span class="paper-year">${p.year}</span>${paper(p,true)}</div>`).join('')}</div></section><section class="notebook-section wrap"><div><p class="eyebrow">THE LAB BOOK</p><h2>Ideas beyond<br> <em>the paper.</em></h2></div><div><p>Notes and longer perspectives on AI, quantum information, and gravity.</p><a class="text-link" href="/blog/">Visit the blog <span aria-hidden="true">↗</span></a></div></section>`;

const researchCopy = {
  'AI': ['Learning & intelligence', 'I work on AI and large language models at Zyphra. My interests include how models learn and reason, with a focus on the training methods that shape their capabilities.', 'My background in information theory informs how I think about learning, representations, and the limits of inference. Areas of interest include pre-training, post-training, and reinforcement learning with verifiable rewards.', ['Large language models','Pre- & post-training','Reasoning']],
  Quantum: ['Information & its limits', 'What can we learn about a quantum system, and how efficiently can we describe, transform, and communicate its information? My work explores these questions through quantum information theory and mathematical physics.', 'Topics include quantum state estimation, state merging, cloning, entropy and divergences, and quantum minimum description length. Recent projects also use Lean to make mathematical arguments formally verifiable.', ['Quantum information','Free probability','Formal verification']],
  Gravity: ['Information & spacetime', 'Black holes bring quantum theory and gravity into direct conversation. I study what information-theoretic ideas can tell us about black hole entropy, holography, and the emergence of spacetime.', 'My research connects the quantum de Finetti theorem, one-shot entropies, and free probability with the black hole information problem. I have also worked on causal sets, quasilocal mass, and the geometry of small causal diamonds.', ['Black hole information','Holography','Geometry & general relativity']]
};
function highlightedPublications(topic) {
  return (researchHighlights[topic] || []).map(id => {
    const publication = publications.find(p => p.id === id);
    if (!publication) throw new Error(`Unknown research highlight: ${id}`);
    return publication;
  });
}
function researchWriting(topic) {
  const writing = externalPosts.filter(p=>(p.researchTopics||[]).includes(topic));
  if (!writing.length) return '';
  return `<h4 class="eyebrow related-heading">SELECTED WRITING</h4><div class="related-writing">${writing.map(p=>`<article class="research-writing"><p class="research-writing-meta">${esc(p.publication)} · ${esc(dateLabel(p.date))}</p><h5>${link(p.title,p.url)}</h5><p class="research-writing-credit">${esc(p.kind||'Article')}</p><p class="research-writing-summary">${esc(p.description)}</p>${link('Read on '+p.publication,p.url,'text-link')}</article>`).join('')}</div>`;
}
const research = `<div class="wrap">${pageHeading('RESEARCH','Information at every scale.','Three connected areas of research, from artificial intelligence to the foundations of spacetime.')}<nav class="section-index" aria-label="Research areas">${topics.map((t,i)=>`<a href="#${ids[t]}"><span>0${i+1}</span> ${esc(t)} <span aria-hidden="true">↓</span></a>`).join('')}</nav>${topics.map((t,i)=>{const c=researchCopy[t];const selected=highlightedPublications(t);const writing=researchWriting(t);return `<section class="research-detail" id="${ids[t]}"><div class="research-detail-heading"><p class="eyebrow">0${i+1} / ${esc(c[0])}</p><h2>${esc(t)}</h2>${visual(t,true)}</div><div class="research-detail-copy"><h3>${esc(descriptions[t])}</h3><p>${esc(c[1])}</p><p>${esc(c[2])}</p><div class="topic-tags">${c[3].map(x=>`<span>${esc(x)}</span>`).join('')}</div>${selected.length?`<h4 class="eyebrow related-heading">HIGHLIGHTS</h4><div class="related-papers">${selected.map(p=>`<a href="/publications/#${esc(p.id)}"><span>${esc(p.title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div>`:''}${writing}${!selected.length&&!writing?'<p class="research-note">My AI work is a current research direction. Public papers and project links will be added as they become available.</p>':''}</div></section>`;}).join('')}<div class="research-end">Browse the full research record. <a class="text-link" href="/publications/">All publications <span aria-hidden="true">↗</span></a></div></div>`;

const years=[...new Set(publications.map(p=>p.year))];
const publicationPage = `<div class="wrap">${pageHeading('PUBLICATIONS','Papers & preprints.','Research in quantum information, mathematical physics, and gravity, with links to papers and associated talks.')}<div class="publication-toolbar"><div class="filters" role="group" aria-label="Filter publications by research area">${['All',...topics].map(t=>`<button data-topic-filter="${t}" aria-pressed="${t==='All'}">${esc(t==='All'?'All research':t)}</button>`).join('')}</div><label class="search-label"><span class="sr-only">Search publications by title, author, or keyword</span><span aria-hidden="true">⌕</span><input id="publication-search" type="search" placeholder="Search papers…" autocomplete="off"></label></div><div class="publication-meta"><p id="results-count" aria-live="polite">${publications.length} publications</p>${link('Google Scholar',site.scholar)}</div><div class="publication-list">${years.map(year=>`<section class="year-group" data-year-group aria-labelledby="year-${year}"><h2 id="year-${year}">${year}</h2><div>${publications.filter(p=>p.year===year).map(p=>paper(p)).join('')}</div></section>`).join('')}</div><div id="no-results" class="empty-state" hidden><h2>No matching papers.</h2><p>Try another title, author, or research area.</p><button class="button" data-clear-search>Clear filters</button></div><p class="source-note">Journal details are linked where available; preprints are marked accordingly. Conference and recording links are included when verified.</p></div>`;

const localPosts=[];
for(const file of (await readdir('content/blog')).filter(f=>f.endsWith('.md'))) {
  const raw=await readFile(path.join('content/blog',file),'utf8');
  const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if(!match) throw new Error(`Missing front matter in ${file}`);
  const meta={};
  for(const line of match[1].split(/\r?\n/)) { const m=line.match(/^(\w+):\s*(.*)$/); if(m) meta[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2'); }
  if(meta.draft==='true') continue;
  if(!meta.title || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date || '')) throw new Error(`Title/date missing in ${file}`);
  localPosts.push({...meta,tags:(meta.tags||'').replace(/^\[|\]$/g,'').split(',').map(t=>t.trim()).filter(Boolean),slug:file.replace(/\.md$/,''),html:marked.parse(match[2])});
}
const posts=[...localPosts,...externalPosts].sort((a,b)=>b.date.localeCompare(a.date));
const blog = `<div class="wrap">${pageHeading('BLOG','The lab book.','Ideas in progress, longer perspectives, and connections across AI, quantum information, and gravity.')}<div class="blog-layout"><div class="blog-posts">${posts.map(p=>`<article class="blog-entry"><div class="eyebrow">${esc(dateLabel(p.date))} <span> / ${esc(p.url?(p.kind||'Guest writing').toUpperCase():'RESEARCH NOTES')}</span></div><h2><a href="${esc(p.url || '/blog/'+p.slug+'/')}">${esc(p.title)} <span aria-hidden="true">${p.url?'↗':'→'}</span></a></h2><p>${esc(p.description)}</p><div class="blog-meta"><span>${esc(p.url?p.publication:'Jinzhao Wang')}</span><div>${(p.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></article>`).join('') || '<div class="empty-state"><h2>A space for ideas in progress.</h2><p>Research notes will appear here.</p></div>'}</div><aside class="blog-aside"><span class="notebook-mark" aria-hidden="true">✳</span><h2>Thinking out loud.</h2><p>A place for questions, explanations, and the threads that connect different areas of research.</p><a href="/feed.xml" class="text-link">Subscribe via RSS <span aria-hidden="true">↗</span></a></aside></div></div>`;

const presentationYears = [...new Set(presentations.map(p => p.year))];
function presentation(p) {
  const talk = talkByUrl.get(p.talkUrl);
  const resources = talk ? [{label:talk.type === 'Recording'?'Recording':'Event',url:talk.url}, ...(talk.slidesUrl?[{label:'Slides',url:talk.slidesUrl}]:[])] : [];
  const month = new Intl.DateTimeFormat('en', {month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(p.year,p.month-1,1)));
  return `<li class="cv-talk-entry"><div class="cv-talk-line"><h4>${esc(p.event)}</h4><span class="cv-talk-month">${month}</span></div><p>${[p.venue,p.kind].filter(Boolean).map(esc).join(' · ')}${p.presenter?` · Presented by ${esc(p.presenter)}`:''}</p>${talk?`<p class="cv-talk-title">${esc(talk.title)}</p>`:''}${resources.length?`<div class="cv-talk-links">${resources.map(r=>link(r.label,r.url)).join('')}</div>`:''}</li>`;
}
const cvPresentations = `<section class="cv-section cv-presentations" id="presentations"><h2>Talks &amp;<br>presentations</h2><div><nav class="cv-talk-index" aria-label="Presentation years">${presentationYears.map(year=>`<a href="#talks-${year}">${year}</a>`).join('')}</nav>${presentationYears.map((year,index)=>{const entries=presentations.filter(p=>p.year===year);return `<details class="cv-talk-year" id="talks-${year}"${index===0?' open':''}><summary><h3><span>${year}</span><span class="cv-talk-year-meta">${entries.length} presentations<span class="cv-talk-toggle" aria-hidden="true"></span></span></h3></summary><ol class="cv-talk-list">${entries.map(presentation).join('')}</ol></details>`;}).join('')}</div></section>`;
const cv = `<div class="wrap cv-wrap"><div class="page-heading"><p class="eyebrow">CURRICULUM VITAE</p><p class="page-deck">Experience, education, service, and presentations.</p></div><div class="cv-top"><div><h1>Jinzhao Wang</h1><p>Research Scientist · Zyphra</p><p class="cv-interests">AI & large language models · Quantum information · Gravity</p></div><button class="button button-outline" data-print>Print / Save PDF <span aria-hidden="true">↗</span></button></div><section class="cv-section"><h2>Experience</h2><div><div class="cv-entry"><span class="cv-date">Mar 2026 – present</span><h3>Member of Technical Staff</h3><p>Zyphra Technology, San Francisco</p><p class="muted">Reinforcement Learning · Post Training Team</p></div><div class="cv-entry"><span class="cv-date">Sep 2022 – Dec 2025</span><h3>Postdoctoral Fellow</h3><p>Stanford Institute for Theoretical Physics, Stanford University</p><p class="muted">Quantum information theory</p></div></div></section><section class="cv-section"><h2>Education</h2><div><div class="cv-entry"><span class="cv-date">2016 – 2022</span><h3>PhD in Theoretical Physics</h3><p>ETH Zürich</p><p class="muted">Supervisor: Renato Renner<br>Dissertation: <a href="https://www.research-collection.ethz.ch/handle/20.500.11850/548584"><em>On information-theoretic aspects of black holes</em></a></p></div><div class="cv-entry"><span class="cv-date">2015 – 2016</span><h3>Master of Advanced Study in Applied Mathematics</h3><p>University of Cambridge · Mathematics Tripos, Part III</p></div><div class="cv-entry"><span class="cv-date">2012 – 2015</span><h3>BSc in Physics with Theoretical Physics</h3><p>Imperial College London</p></div></div></section><section class="cv-section"><h2>Service</h2><div><h3>Organization</h3><p>Organizer, Stanford Q-Farm <a href="https://qfarm.stanford.edu/events/conference-symposium/thermalization-and-quantum-information-workshop">Thermalization and Quantum Information Workshop</a>.<br>Conference committee member, <a href="https://events.perimeterinstitute.ca/event/43/">It from Qubit, Perimeter Institute (2023)</a>.</p><h3>Reviewing</h3><p>Physical Review Letters, Physical Review A, Quantum, Journal of High Energy Physics, Neural Networks, General Relativity and Gravitation, Classical and Quantum Gravity, Physica Scripta, Canadian Journal of Physics; QIP (2019, 2021), TQC (2024).</p></div></section>${cvPresentations}</div>`;

await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('assets','dist/assets',{recursive:true});
const output = async (file, html) => {await mkdir(path.dirname('dist/'+file),{recursive:true}); await writeFile('dist/'+file,html);};
await output('index.html',shell('Home','Home',home));
await output('research/index.html',shell('Research','Research',research,undefined,'/research/'));
await output('publications/index.html',shell('Publications','Publications',publicationPage,undefined,'/publications/'));
await output('blog/index.html',shell('Blog','Blog',blog,undefined,'/blog/'));
await output('cv/index.html',shell('CV','CV',cv,undefined,'/cv/'));
for(const p of localPosts) await output(`blog/${p.slug}/index.html`,shell(p.title,'Blog',`<article class="wrap article-wrap"><a class="back-link" href="/blog/">← Back to the lab book</a><header class="article-heading"><p class="eyebrow">${esc(dateLabel(p.date))} · RESEARCH NOTES</p><h1>${esc(p.title)}</h1><p class="page-deck">${esc(p.description)}</p></header><div class="prose">${p.html}</div></article>`,p.description,`/blog/${p.slug}/`));
await output('404.html',shell('Page not found','',`<section class="wrap error-page"><p class="eyebrow">404</p><h1>A little off the map.</h1><p>This page could not be found.</p><a class="button" href="/">Back to home <span aria-hidden="true">→</span></a></section>`));
await output('.nojekyll','');
await output('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await output('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/research/','/publications/','/blog/','/cv/',...localPosts.map(p=>'/blog/'+p.slug+'/')].map(p=>`<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
await output('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Jinzhao Wang — The lab book</title><link>${site.url}/blog/</link><description>Notes on AI, quantum information, and gravity.</description>${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${esc(p.url || site.url+'/blog/'+p.slug+'/')}</link><guid>${esc(p.url || site.url+'/blog/'+p.slug+'/')}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('')}</channel></rss>`);
console.log(`Built 5 pages, ${publications.length} publications, and ${posts.length} blog entries into dist/.`);
