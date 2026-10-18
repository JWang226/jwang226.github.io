import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('dist');
const errors=[];
async function filesAt(dir) {const files=[];for(const name of await readdir(dir)) {const file=path.join(dir,name); if((await stat(file)).isDirectory()) files.push(...await filesAt(file));else files.push(file);}return files;}
const files=await filesAt(root);
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const htmlByFile=new Map(await Promise.all(htmlFiles.map(async f=>[f,await readFile(f,'utf8')])));
for(const [file,html] of htmlByFile) {
  if(!html.includes('<h1>')) errors.push(`Missing h1 in ${file}`);
  if(!html.includes('<title>') || !html.includes('name="description"')) errors.push(`Missing metadata in ${file}`);
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length) errors.push(`Duplicate IDs in ${file}`);
  for(const [,raw] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const target=raw.replaceAll('&amp;','&');
    if(!target || /^(https?:|mailto:|tel:|data:)/.test(target)) continue;
    if(/^(javascript:|file:)/.test(target)) {errors.push(`Unsafe URL in ${file}`);continue;}
    const url=new URL(target,'http://local'+path.relative(root,file).replace(/^/,'/'));
    let dest=path.join(root,decodeURIComponent(url.pathname));
    try {if((await stat(dest)).isDirectory())dest=path.join(dest,'index.html');await stat(dest);}
    catch {errors.push(`Broken local link: ${target} in ${path.relative(root,file)}`);continue;}
    if(url.hash && htmlByFile.has(dest) && !htmlByFile.get(dest).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) errors.push(`Missing anchor: ${target}`);
  }
}
const papers=JSON.parse(await readFile('data/publications.json','utf8'));
assert(new Set(papers.map(p=>p.id)).size===papers.length,'Publication IDs must be unique');
for(const p of papers) {
  assert(p.title && p.authors.includes('Jinzhao Wang'),`Invalid publication: ${p.id}`);
  assert(Number.isInteger(p.year) && p.year>=2010 && p.year<=new Date().getUTCFullYear(),`Invalid year: ${p.id}`);
  assert(p.arxiv || p.journal?.url,`Paper needs a verified source: ${p.id}`);
  for(const url of [p.arxiv,p.journal?.url,p.projectWebsite,...p.links.map(l=>l.url)].filter(Boolean)) assert(new URL(url).protocol==='https:',`Use HTTPS: ${p.id}`);
}
for(const route of ['index.html','research/index.html','publications/index.html','blog/index.html','cv/index.html','404.html']) assert(htmlByFile.has(path.join(root,route)),`Missing page: ${route}`);
const home=htmlByFile.get(path.join(root,'index.html'));
for(const id of ['ai-llm','quantum','gravity']) assert(home.includes('/research/#'+id),`Home must showcase ${id}`);
const cv=htmlByFile.get(path.join(root,'cv/index.html'));
assert(!/tel:|mailto:|Take-Home|residency interview|References</i.test(cv),'Private CV details must not be published');
const presentations=JSON.parse(await readFile('data/presentations.json','utf8'));
const talks=JSON.parse(await readFile('data/talks.json','utf8'));
const site=JSON.parse(await readFile('data/site.json','utf8'));
const talkUrls=new Set(talks.map(t=>t.url));
assert(new Set(presentations.map(p=>p.id)).size===presentations.length,'Presentation IDs must be unique');
assert([...cv.matchAll(/class="cv-talk-entry"/g)].length===presentations.length,'The full presentation list must appear on the CV');
const yearPanels=[...cv.matchAll(/<details class="cv-talk-year" id="talks-(\d{4})"([^>]*)>/g)];
assert(yearPanels.length===new Set(presentations.map(p=>p.year)).size,'Each presentation year must be collapsible');
const expandedYears=yearPanels.filter(([,year,attributes])=>/\bopen\b/.test(attributes));
assert(expandedYears.length===1 && Number(expandedYears[0][1])===Math.max(...presentations.map(p=>p.year)),'Only the most recent presentation year should be expanded by default');
for(const p of presentations) {
  assert(p.event && p.kind && Number.isInteger(p.year) && Number.isInteger(p.month) && p.month>=1 && p.month<=12,`Invalid presentation: ${p.id}`);
  if(p.talkUrl) assert(talkUrls.has(p.talkUrl),`Missing verified talk resource: ${p.id}`);
  if(p.presenter) {
    assert(cv.includes(`Presented by ${p.presenter}`),`Missing presenter credit: ${p.id}`);
    if(p.presenter!==site.name) assert(talks.some(t=>t.url===p.talkUrl && t.type==='Recording' && t.speaker===p.presenter),`Coauthor CV presentation needs a verified recording: ${p.id}`);
  }
}
for(const t of talks) {
  assert(t.speaker,`Talk must identify its speaker: ${t.url}`);
  if(t.speaker!==site.name) assert(t.type==='Recording',`Coauthor talks need recordings: ${t.url}`);
  for(const id of t.arxivIds || []) {
    const p=papers.find(p=>p.id===id);
    assert(p,`Talk references an unknown paper: ${id}`);
    if(t.type==='Recording') assert(p.links.some(l=>l.url===t.url),`Recording missing from relevant paper: ${id}`);
    if(t.speaker!==site.name) {
      assert(p.authors.includes(t.speaker),`Coauthor speaker must be a paper author: ${id}`);
      assert(p.links.some(l=>l.url===t.url && l.label.includes(t.speaker) && /coauthor/i.test(l.label)),`Coauthor recording must be clearly labelled: ${id}`);
    }
  }
}
if(errors.length) {console.error(errors.join('\n'));process.exit(1);}
console.log(`Verified ${htmlFiles.length} HTML pages, all local links and anchors, ${papers.length} publication records, ${presentations.length} CV presentations, and recording-to-paper links.`);
