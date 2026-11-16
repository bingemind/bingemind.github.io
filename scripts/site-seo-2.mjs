#!/usr/bin/env node
// Run after scripts/site-seo.mjs whenever tool builds are copied in. Safe to run many times. Data: scripts/seo-2.json (from Search Console, 2026-11-16).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(path.join(root, 'scripts/seo-2.json'), 'utf8'));
const robots = '<meta name="robots" content="noindex, follow">';
const listedURLs = new Set(data.noindex.flatMap(url => [`https://bingemind.com${url}`, `https://bingemind.com${url.replace(/\/$/, '')}`]));
let noindex = 0, removed = 0, snippets = 0;
for (const url of data.noindex) {
  const file = path.join(root, url, 'index.html');
  const before = await readFile(file, 'utf8');
  const tags = /<meta\b(?=[^>]*\sname\s*=\s*(['"])robots\1)[^>]*>/gi;
  let html = before;
  if (html.match(tags)) html = html.replace(tags, robots);
  else {
    if (!/<head\b[^>]*>/i.test(html)) throw new Error(`Missing head: ${file}`);
    html = html.replace(/<head\b[^>]*>/i, head => `${head}\n${robots}`);
  }
  if (html !== before) { await writeFile(file, html); noindex++; }
}
for (const tool of new Set(data.noindex.map(url => url.split('/')[1]))) {
  const folder = path.join(root, tool);
  if (!(await readdir(folder)).includes('sitemap-0.xml')) continue;
  const file = path.join(folder, 'sitemap-0.xml');
  const before = await readFile(file, 'utf8');
  const xml = before.replace(/<url\b[^>]*>[\s\S]*?<\/url>/g, block => {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/);
    if (!loc || !listedURLs.has(loc[1])) return block;
    removed++;
    return '';
  });
  if (xml !== before) await writeFile(file, xml);
}
for (const snippet of data.snippets) {
  const file = path.join(root, snippet.file);
  const before = await readFile(file, 'utf8');
  const head = before.match(/<head\b[^>]*>[\s\S]*?<\/head\s*>/i);
  if (!head) throw new Error(`Missing head: ${file}`);
  let updated = head[0];
  for (const [oldText, newText] of [[snippet.oldTitle, snippet.newTitle], [snippet.oldDescription, snippet.newDescription]]) {
    if (oldText === null && newText === null) continue;
    if (updated.includes(oldText)) updated = updated.replaceAll(oldText, newText);
    else if (!updated.includes(newText)) throw new Error(`Missing snippet in head: ${file}: ${oldText}`);
  }
  const html = before.slice(0, head.index) + updated + before.slice(head.index + head[0].length);
  if (html !== before) { await writeFile(file, html); snippets++; }
}
console.log(`site-seo-2: noindex set on ${noindex} pages, ${removed} sitemap URLs removed, snippets updated in ${snippets} files.`);
