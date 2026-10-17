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
  for(const url of [p.arxiv,p.journal?.url,...p.links.map(l=>l.url)].filter(Boolean)) assert(new URL(url).protocol==='https:',`Use HTTPS: ${p.id}`);
}
for(const route of ['index.html','research/index.html','publications/index.html','blog/index.html','cv/index.html','404.html']) assert(htmlByFile.has(path.join(root,route)),`Missing page: ${route}`);
const home=htmlByFile.get(path.join(root,'index.html'));
for(const id of ['ai-llm','quantum','gravity']) assert(home.includes('/research/#'+id),`Home must showcase ${id}`);
const cv=htmlByFile.get(path.join(root,'cv/index.html'));
assert(!/tel:|mailto:|Take-Home|residency interview|References</i.test(cv),'Private CV details must not be published');
if(errors.length) {console.error(errors.join('\n'));process.exit(1);}
console.log(`Verified ${htmlFiles.length} HTML pages, all local links and anchors, ${papers.length} publication records, and required homepage sections.`);
