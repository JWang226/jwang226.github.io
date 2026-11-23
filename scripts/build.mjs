import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { createHash } from 'node:crypto';
import { networkLayers } from '../assets/neural-flow.js';

const json = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; } };
const site = await json('data/site.json');
const styleVersion = createHash('sha256').update(await readFile('assets/style.css')).digest('hex').slice(0, 10);
const networkVersion = createHash('sha256').update(await readFile('assets/neural-flow.js')).digest('hex').slice(0, 10);
const blochVersion = createHash('sha256').update(await readFile('assets/bloch-drift.js')).digest('hex').slice(0, 10);
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
function visual(topic) {
  let art = '';
  if (topic === 'AI') {
    let wires = '', cursors = '', nodes = '';
    networkLayers.slice(0,-1).forEach(([x,ys],layer) => ys.forEach((y,source) => {
      const [nextX,nextYs] = networkLayers[layer+1];
      nextYs.forEach((nextY,target) => {
        wires += `<line x1="${x}" y1="${y}" x2="${nextX}" y2="${nextY}"/>`;
        cursors += `<circle class="network-cursor" data-layer="${layer}" data-source="${source}" data-target="${target}" cx="${x}" cy="${y}" r="2.5" opacity="0"/>`;
      });
    }));
    networkLayers.forEach(([x,ys],layer) => ys.forEach((y,index) => {
      nodes += `<circle class="network-node" data-layer="${layer}" data-index="${index}" cx="${x}" cy="${y}" r="5" fill="#242320" stroke="#999484"/>`;
    }));
    art = `<g data-neural-network><g class="network-wires">${wires}</g><g class="network-cursors">${cursors}</g><g class="network-nodes">${nodes}</g></g>`;
  } else if (topic === 'Quantum') {
    art = '<circle cx="145" cy="100" r="71"/><ellipse cx="145" cy="100" rx="71" ry="24"/><g class="quantum-meridian"><ellipse cx="145" cy="100" rx="24" ry="71" transform="rotate(32 145 100)"/></g><path d="M145 182V18M55 100h180" stroke-dasharray="3 5" opacity=".55"/><g class="quantum-trace"></g><g class="quantum-state" data-bloch-state><path class="quantum-vector" d="M145 100l41-52" stroke="#efa391" stroke-width="1.6"/><circle class="quantum-dot" cx="186" cy="48" r="5" fill="#efa391" stroke="none"/></g><text x="145" y="12" text-anchor="middle">|0⟩</text><text x="145" y="197" text-anchor="middle">|1⟩</text>';
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
    const pairs = [.22,.5,.78].map((turn,i) => {
      const angle = turn*Math.PI;
      const [x,y] = project(1,angle);
      const inward = trace(Array.from({length:49},(_,j)=>project(1+1.2*j/48,angle)));
      const outward = trace(Array.from({length:49},(_,j)=>project(1-j/48,angle)));
      const particle = (direction,path) => `<path class="hawking-particle hawking-halo hawking-${direction}" pathLength="1" d="${path}"/><path class="hawking-particle hawking-${direction}" pathLength="1" d="${path}"/>`;
      return `<g class="hawking-pair" style="--pair-delay:-${i*2}s"><circle class="hawking-birth" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="5"/>${particle('in',inward)}${particle('out',outward)}</g>`;
    }).join('');
    const edge = [Math.atan(.22),Math.atan(.22)+Math.PI].map(angle=>`<path d="${meridian(angle,3)}"/>`).join('');
    art = `<path class="gravity-sheet" d="M13 15.16H229L277 64.84H61Z"/><g class="gravity-meridians">${meridians}</g><g class="gravity-contours">${rings}</g><g class="gravity-silhouette">${edge}</g><path class="gravity-throat-halo" d="${ring(1)}"/><path class="gravity-throat" d="${ring(1)}"/>${pairs}`;
  }
  return `<div class="research-visual animation-toggle" data-illustration-name="${esc(topic)}" role="img" aria-label="${esc(topic)} illustration"><svg class="research-art" viewBox="0 0 290 205" aria-hidden="true" fill="none" stroke="#999484" stroke-width=".85"><g>${art}</g></svg></div>`;
}

function shell(title, current, body, description = site.description, route = '/') {
  const nav = [['Home','/'],['Research','/research/'],['Publications','/publications/'],['Blog','/blog/'],['CV','/cv/']];
  const profiles = [['Google Scholar',site.scholar],['arXiv',site.arxiv],['GitHub',site.github],['LinkedIn',site.linkedin],['X',site.x],['Email','mailto:'+site.email]];
  const pageTitle = current === 'Home' ? `${site.name} — AI, Quantum & Gravity` : `${title} — ${site.name}`;
  const canonical = `${site.url}${route}`;
  const researchScripts = current === 'Home' ? `
    <script type="module" src="/assets/neural-flow.js?v=${networkVersion}"></script>
    <script type="module" src="/assets/bloch-drift.js?v=${blochVersion}"></script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#242320">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(current === 'Home' ? site.name : pageTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${site.url}/assets/social-card.svg">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/style.css?v=${styleVersion}">
  <link rel="alternate" type="application/rss+xml" title="Jinzhao Wang — Blog" href="/feed.xml">
  <script src="/assets/site.js?v=${scriptVersion}" defer></script>${researchScripts}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site">
    <header class="site-header">
      <nav aria-label="Main navigation">
        <ul>${nav.map(([name,url])=>`<li><a href="${url}"${current===name?' aria-current="page"':''}>${name}</a></li>`).join('')}</ul>
      </nav>
    </header>
    <main id="main">${body}</main>
    <footer class="site-footer">
      <span>${esc(site.name)}</span>
      <ul aria-label="Profile and contact links">${profiles.map(([name,url])=>`<li><a href="${esc(url)}">${name}</a></li>`).join('')}</ul>
    </footer>
  </div>
  <script data-goatcounter="https://wangjinzhao.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>`;
}

function paperLinks(p) {
  const all = [];
  if (p.arxiv) all.push({label:'arXiv',url:p.arxiv});
  if (p.journal?.url) all.push({label:'Journal',url:p.journal.url});
  if (p.projectWebsite) all.push({label:'Project website',url:p.projectWebsite});
  for (const resource of p.links || []) {
    const talk = talkByUrl.get(resource.url);
    if (talk && talk.speaker !== site.name) {
      if (talk.type !== 'Recording' || !talk.speaker) continue;
      all.push({...resource,label:`Coauthor talk · ${talk.speaker}`});
    } else all.push(resource);
  }
  return `<div class="paper-links">${[...new Map(all.map(l=>[l.url,l])).values()].map(l=>link(l.label,l.url)).join('')}</div>`;
}
function paper(p) {
  return `<article class="paper" id="${esc(p.id)}" data-publication data-topics="${esc((p.topics||[]).join('|'))}"><div class="paper-topline">${(p.topics||[]).map(t=>`<span>${esc(t)}</span>`).join('')}<span>${esc(p.journal ? p.journal.name + (p.status === 'Accepted' ? ' · Accepted' : '') : (p.status || 'Preprint'))}</span></div><h3><a href="${esc(p.arxiv || p.journal?.url || '#'+p.id)}">${esc(p.title)}</a></h3><p class="authors">${(p.authors||[]).map(a=>a==='Jinzhao Wang'?'<strong>Jinzhao Wang</strong>':esc(a)).join(', ')}</p>${p.summary?`<p class="paper-summary">${esc(p.summary)}</p>`:''}${paperLinks(p)}</article>`;
}
const pageHeading = title => `<div class="page-heading"><h1>${esc(title)}</h1></div>`;

const researchCards = topics.map(topic => `
  <li class="research-card">
    <a class="research-card-link" href="/research/#${ids[topic]}">${esc(topic)}</a>
    ${visual(topic)}
  </li>`).join('');

const recentPapers = publications.filter(p => p.featured).map(p => `
  <li><time datetime="${p.year}">${p.year}</time><a href="/publications/#${esc(p.id)}">${esc(p.title)}</a></li>`).join('');

const home = `
  <div class="intro">
    <h1>${esc(site.name)}</h1>
    <p>I’m a research scientist at <a href="${esc(site.affiliationUrl)}">${esc(site.affiliation)}</a> working on AI and large language models. I’m also a theoretical physicist working on quantum information.</p>
    <p class="background">Previously at Stanford. PhD from ETH Zürich. Studied theoretical physics at Imperial College London and Cambridge.</p>
  </div>
  <section class="research" aria-labelledby="research-heading">
    <h2 id="research-heading">Research</h2>
    <ul class="research-links">${researchCards}</ul>
  </section>
  <section class="publications" aria-labelledby="publications-heading">
    <div class="section-heading">
      <h2 id="publications-heading">Recent publications</h2>
      <a href="/publications/">All publications</a>
    </div>
    <ul class="paper-list">${recentPapers}</ul>
  </section>`;

const researchCopy = {
  AI: {
    summary: 'At Zyphra, I study how language models learn and reason, with a focus on post-training and diffusion language models.',
    tags: ['Large language models', 'Post-Training', 'Diffusion Language Models']
  },
  Quantum: {
    summary: 'I study how to learn about quantum states, copy them, and describe them efficiently. Some of my projects use Lean to verify proofs.',
    tags: ['Quantum information', 'Free probability', 'Mathematical Physics']
  },
  Gravity: {
    summary: 'I use information theory and free probability to study black hole entropy, holography, and the emergence of spacetime.',
    tags: ['Black hole information', 'Holography', 'General Relativity']
  }
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
  return `<h3 class="eyebrow related-heading">Selected writing</h3><div class="related-writing">${writing.map(p=>`<article class="research-writing"><p class="research-writing-meta">${esc(p.publication)} · ${esc(dateLabel(p.date))}</p><h4>${link(p.title,p.url)}</h4><p class="research-writing-credit">${esc(p.kind||'Article')}</p><p class="research-writing-summary">${esc(p.description)}</p>${link('Read on '+p.publication,p.url,'text-link')}</article>`).join('')}</div>`;
}
const research = `<div class="wrap">${pageHeading('Research')}<nav class="section-index" aria-label="Research areas">${topics.map(t=>`<a href="#${ids[t]}">${esc(t)}</a>`).join('')}</nav>${topics.map(t=>{const {summary,tags}=researchCopy[t];const selected=highlightedPublications(t);const writing=researchWriting(t);return `<section class="research-detail" id="${ids[t]}"><div class="research-detail-heading"><h2>${esc(t)}</h2></div><div class="research-detail-copy"><p>${esc(summary)}</p><div class="topic-tags">${tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div>${selected.length?`<h3 class="eyebrow related-heading">Highlights</h3><div class="related-papers">${selected.map(p=>`<a href="/publications/#${esc(p.id)}"><span>${esc(p.title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div>`:''}${writing}${!selected.length&&!writing?'<p class="research-note">Papers and project links will appear here when available.</p>':''}</div></section>`;}).join('')}<div class="research-end"><a class="text-link" href="/publications/">All publications <span aria-hidden="true">↗</span></a></div></div>`;

const years=[...new Set(publications.map(p=>p.year))];
const publicationPage = `<div class="wrap">${pageHeading('Publications')}<div class="publication-toolbar"><div class="filters" role="group" aria-label="Filter publications by research area">${['All',...topics].map(t=>`<button data-topic-filter="${t}" aria-pressed="${t==='All'}">${esc(t==='All'?'All research':t)}</button>`).join('')}</div><label class="search-label"><span class="sr-only">Search publications by title, author, or keyword</span><span aria-hidden="true">⌕</span><input id="publication-search" type="search" placeholder="Search papers…" autocomplete="off"></label></div><div class="publication-meta"><p id="results-count" aria-live="polite">${publications.length} publications</p><div class="publication-profile-links">${link('Google Scholar',site.scholar)}${link('arXiv',site.arxiv)}</div></div><div class="publication-list">${years.map(year=>`<section class="year-group" data-year-group aria-labelledby="year-${year}"><h2 id="year-${year}">${year}</h2><div>${publications.filter(p=>p.year===year).map(p=>paper(p)).join('')}</div></section>`).join('')}</div><div id="no-results" class="empty-state" hidden><h2>No matching papers.</h2><p>Try another title, author, or research area.</p><button class="button" data-clear-search>Clear filters</button></div><p class="source-note">Preprints are labeled. Journal, conference, and recording links are included where available.</p></div>`;

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
const blog = `<div class="wrap">${pageHeading('Blog')}<div class="blog-layout"><div class="blog-posts">${posts.map(p=>`<article class="blog-entry"><div class="eyebrow">${esc(dateLabel(p.date))} <span> / ${esc(p.url?(p.kind||'Guest writing').toUpperCase():'RESEARCH NOTES')}</span></div><h2><a href="${esc(p.url || '/blog/'+p.slug+'/')}">${esc(p.title)} <span aria-hidden="true">${p.url?'↗':'→'}</span></a></h2><p>${esc(p.description)}</p><div class="blog-meta"><span>${esc(p.url?p.publication:'Jinzhao Wang')}</span><div>${(p.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></article>`).join('') || '<div class="empty-state"><h2>A space for ideas in progress.</h2><p>Research notes will appear here.</p></div>'}</div></div></div>`;

const presentationYears = [...new Set(presentations.map(p => p.year))];
function presentation(p) {
  const talk = talkByUrl.get(p.talkUrl);
  const resources = talk ? [{label:talk.type === 'Recording'?'Recording':'Event',url:talk.url}, ...(talk.slidesUrl?[{label:'Slides',url:talk.slidesUrl}]:[])] : [];
  const month = new Intl.DateTimeFormat('en', {month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(p.year,p.month-1,1)));
  return `<li class="cv-talk-entry"><div class="cv-talk-line"><h4>${p.eventUrl?`<a href="${esc(p.eventUrl)}">${esc(p.event)}</a>`:esc(p.event)}</h4><span class="cv-talk-month">${month}</span></div><p>${[p.venue,p.kind].filter(Boolean).map(esc).join(' · ')}${p.presenter?` · Presented by ${esc(p.presenter)}`:''}</p>${talk?`<p class="cv-talk-title">${esc(talk.title)}</p>`:''}${resources.length?`<div class="cv-talk-links">${resources.map(r=>link(r.label,r.url)).join('')}</div>`:''}</li>`;
}
const cvPresentations = `<section class="cv-section cv-presentations" id="presentations"><h2>Talks &amp; presentations</h2><div><nav class="cv-talk-index" aria-label="Presentation years">${presentationYears.map(year=>`<a href="#talks-${year}">${year}</a>`).join('')}</nav>${presentationYears.map((year,index)=>{const entries=presentations.filter(p=>p.year===year);return `<details class="cv-talk-year" id="talks-${year}"${index===0?' open':''}><summary><h3><span>${year}</span><span class="cv-talk-year-meta">${entries.length} presentations<span class="cv-talk-toggle" aria-hidden="true"></span></span></h3></summary><ol class="cv-talk-list">${entries.map(presentation).join('')}</ol></details>`;}).join('')}</div></section>`;
const cv = `<div class="wrap cv-wrap"><div class="cv-top"><div><h1>Jinzhao Wang (王今朝)</h1><p>Research Scientist · Zyphra</p><p class="cv-interests">AI & large language models · Quantum information · Gravity</p></div><button class="button button-outline" data-print>Print / Save PDF <span aria-hidden="true">↗</span></button></div><section class="cv-section"><h2>Experience</h2><div><div class="cv-entry"><span class="cv-date">Mar 2026 – present</span><h3>Member of Technical Staff</h3><p>Zyphra Technology, San Francisco</p><p class="muted">Reinforcement Learning · Post Training Team</p></div><div class="cv-entry"><span class="cv-date">Sep 2022 – Dec 2025</span><h3>Postdoctoral Fellow</h3><p>Stanford Institute for Theoretical Physics, Stanford University</p><p class="muted">Quantum information theory</p></div></div></section><section class="cv-section"><h2>Education</h2><div><div class="cv-entry"><span class="cv-date">2016 – 2022</span><h3>PhD in Theoretical Physics</h3><p>ETH Zürich</p><p class="muted">Supervisor: Renato Renner<br>Dissertation: <a href="https://www.research-collection.ethz.ch/handle/20.500.11850/548584"><em>On information-theoretic aspects of black holes</em></a></p></div><div class="cv-entry"><span class="cv-date">2015 – 2016</span><h3>Master of Advanced Study in Applied Mathematics</h3><p>University of Cambridge · Mathematics Tripos, Part III</p></div><div class="cv-entry"><span class="cv-date">2012 – 2015</span><h3>BSc in Physics with Theoretical Physics</h3><p>Imperial College London</p></div></div></section>${cvPresentations}</div>`;

await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('assets','dist/assets',{recursive:true});
const output = async (file, html) => {await mkdir(path.dirname('dist/'+file),{recursive:true}); await writeFile('dist/'+file,html);};
await output('index.html',shell('Home','Home',home));
await output('research/index.html',shell('Research','Research',research,undefined,'/research/'));
await output('publications/index.html',shell('Publications','Publications',publicationPage,undefined,'/publications/'));
await output('blog/index.html',shell('Blog','Blog',blog,undefined,'/blog/'));
await output('cv/index.html',shell('CV','CV',cv,undefined,'/cv/'));
for(const p of localPosts) await output(`blog/${p.slug}/index.html`,shell(p.title,'Blog',`<article class="wrap article-wrap"><a class="back-link" href="/blog/">Back to Blog</a><header class="article-heading"><p class="eyebrow">${esc(dateLabel(p.date))} · RESEARCH NOTES</p><h1>${esc(p.title)}</h1><p class="page-deck">${esc(p.description)}</p></header><div class="prose">${p.html}</div></article>`,p.description,`/blog/${p.slug}/`));
await output('404.html',shell('Page not found','',`<section class="wrap error-page"><p class="eyebrow">404</p><h1>Page not found</h1><p>This page could not be found.</p><a href="/">Back to home</a></section>`));
await output('.nojekyll','');
await output('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await output('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/research/','/publications/','/blog/','/cv/',...localPosts.map(p=>'/blog/'+p.slug+'/')].map(p=>`<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
await output('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Jinzhao Wang — The lab book</title><link>${site.url}/blog/</link><description>Notes on AI, quantum information, and gravity.</description>${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${esc(p.url || site.url+'/blog/'+p.slug+'/')}</link><guid>${esc(p.url || site.url+'/blog/'+p.slug+'/')}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('')}</channel></rss>`);
console.log(`Built 5 pages, ${publications.length} publications, and ${posts.length} blog entries into dist/.`);
