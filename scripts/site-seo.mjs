#!/usr/bin/env node
// Run after scripts/site-footer.mjs whenever tool builds are copied in. Safe to run many times.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const rootOnly = new Set(['about', 'contact', 'privacy', 'terms', 'services', 'tools', 'abhishek-mishra', 'js', 'img', 'fonts', 'favicon_io', '_astro', 'scripts', 'node_modules']);
const policyNames = new Set(['about', 'contact', 'privacy', 'terms']);
const robots = '<meta name="robots" content="noindex, follow">';
const marker = '<!-- bm-topbar v1 -->';
const topbar = `<!-- bm-topbar v1 --><style>.bm-topbar{background:#fff;border-bottom:1px solid #e5e7eb;font:500 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;position:relative;z-index:50}.bm-topbar nav{max-width:1120px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:4px;min-height:44px;flex-wrap:wrap}.bm-topbar a{color:#374151;text-decoration:none;padding:12px 10px;border-radius:6px}.bm-topbar a:hover,.bm-topbar a:focus-visible{color:#111827;background:#f3f4f6}.bm-topbar a:focus-visible{outline:2px solid #2563eb;outline-offset:1px}.bm-topbar .bm-brand{font-weight:700;color:#111827;margin-right:auto;padding-left:0}@media (prefers-color-scheme:dark){.bm-topbar{background:#0b0f17;border-color:#1f2937}.bm-topbar a{color:#d1d5db}.bm-topbar a:hover,.bm-topbar a:focus-visible{color:#fff;background:#1f2937}.bm-topbar .bm-brand{color:#fff}}@media print{.bm-topbar{display:none}}</style><div class="bm-topbar"><nav aria-label="Bingemind"><a class="bm-brand" href="/">Bingemind</a><a href="/tools/">All tools</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav></div><!-- /bm-topbar -->`;
let scanned = 0, noindex = 0, removed = 0, menus = 0;
async function walk(dir, tool) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(file, tool); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const before = await readFile(file, 'utf8');
    let html = before;
    scanned++;
    if (entry.name === 'index.html' && path.dirname(dir) === tool && policyNames.has(path.basename(dir))) {
      const tags = /<meta\b(?=[^>]*\sname\s*=\s*(['"])robots\1)[^>]*>/gi;
      if (html.match(tags)) html = html.replace(tags, robots);
      else {
        if (!/<head\b[^>]*>/i.test(html)) throw new Error(`Missing head: ${file}`);
        html = html.replace(/<head\b[^>]*>/i, head => `${head}\n${robots}`);
      }
      if (html !== before) noindex++;
    }
    if (!html.includes(marker)) {
      if (!/<body\b[^>]*>/i.test(html)) throw new Error(`Missing body: ${file}`);
      html = html.replace(/<body\b[^>]*>/i, body => `${body}${topbar}`);
      menus++;
    }
    if (html !== before) await writeFile(file, html);
  }
}
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('.') || rootOnly.has(entry.name)) continue;
  const tool = path.join(root, entry.name);
  const files = await readdir(tool, { withFileTypes: true });
  if (!files.some(file => file.isFile() && file.name === 'index.html')) continue;
  await walk(tool, tool);
  if (!files.some(file => file.isFile() && file.name === 'sitemap-0.xml')) continue;
  const sitemap = path.join(tool, 'sitemap-0.xml');
  const before = await readFile(sitemap, 'utf8');
  const policyURLs = new Set([...policyNames].flatMap(name => {
    const url = `https://bingemind.com/${entry.name}/${name}`;
    return [url, `${url}/`];
  }));
  const xml = before.replace(/<url\b[^>]*>[\s\S]*?<\/url>/g, block => {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/);
    if (!loc || !policyURLs.has(loc[1])) return block;
    removed++;
    return '';
  });
  if (xml !== before) await writeFile(sitemap, xml);
}
console.log(`site-seo: scanned ${scanned} HTML, noindex set on ${noindex} policy pages, ${removed} sitemap URLs removed, top menu added to ${menus} pages.`);
