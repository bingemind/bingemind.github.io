#!/usr/bin/env node
// Run after copying tool builds. No dependencies. Existing tool footers stay intact.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const marker = '<!-- bm-site-links v1 -->';
const defaults = `<!-- bm-consent-default v1 -->
<script>window.dataLayer=window.dataLayer||[];window.bmAnalyticsAllowed=false;function gtag(){if(arguments[0]==='event'&&!window.bmAnalyticsAllowed)return;window.dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});</script>
<!-- /bm-consent-default -->`;
const row = `${marker}<nav class="bm-site-links" aria-label="Bingemind site"><a href="/about/">About</a><span aria-hidden="true">·</span><a href="/contact/">Contact</a><span aria-hidden="true">·</span><a href="/privacy/">Privacy</a><span aria-hidden="true">·</span><a href="/terms/">Terms</a><span aria-hidden="true">·</span><a href="#bm-consent" data-cookie-settings>Cookie settings</a></nav><!-- /bm-site-links -->`;
let scanned = 0, changed = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const before = await readFile(file, 'utf8');
    let html = before;
    scanned++;
    const installed = html.includes('<!-- bm-consent-default v1 -->');
    const analytics = installed
      ? /src="\/js\/consent.js"[^>]*data-analytics="on"/.test(html)
      : html.includes('G-F4Y30PMRBB');
    if (!installed) {
      // Replace every legacy GA loader. The Shakespeare variant also contains an event listener.
      html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, script => {
        if (!script.includes('googletagmanager.com/gtag/js') && !/gtag\(['"]config['"]/.test(script)) return script;
        const eventStart = script.indexOf('  let sent = false;');
        if (eventStart >= 0) {
          const eventEnd = script.indexOf('\n})();', eventStart);
          return `<script>(function(){\n${script.slice(eventStart, eventEnd)}\n})();</script>`;
        }
        return '';
      });
      // Before all scripts, including the untouched AdSense loader.
      html = html.replace(/<head\b[^>]*>/i, head => `${head}\n${defaults}`);
    }
    // A use before consent must not consume the page's once-only usage event.
    html = html.replace("if (sent || typeof gtag !== 'function') return;", "if (sent || !window.bmAnalyticsAllowed || typeof gtag !== 'function') return;")
      .replace("if (sent || !event.isTrusted", "if (sent || !window.bmAnalyticsAllowed || !event.isTrusted");
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
    if (!footer) throw new Error(`Missing footer: ${file}`);
    let updated = footer[0].replace(/<a\b([^>]*?)href="\/abhishek-mishra\/"([^>]*)>About Abhishek Mishra<\/a>/g, '<a$1href="/about/"$2>About</a>');
    if (!updated.includes(marker)) {
      const complete = ['/about/', '/contact/', '/privacy/', '/terms/'].every(url => updated.includes(`href="${url}"`));
      // A marker also owns Cookie settings on footers that already have all four site links.
      updated = updated.replace('</footer>', (complete
        ? `${marker}<nav class="bm-site-links" aria-label="Cookie settings"><a href="#bm-consent" data-cookie-settings>Cookie settings</a></nav><!-- /bm-site-links -->`
        : row) + '</footer>');
    }
    html = html.replace(footer[0], updated);
    if (!html.includes('href="/js/site-footer.css"')) html = html.replace('</head>', '<link rel="stylesheet" href="/js/site-footer.css">\n</head>');
    if (!html.includes('src="/js/consent.js"')) html = html.replace('</body>', `<script src="/js/consent.js" data-analytics="${analytics ? 'on' : 'off'}" defer></script></body>`);
    if (html !== before) { await writeFile(file, html); changed++; }
  }
}
await walk(root);
console.log(`Scanned ${scanned} HTML pages; changed ${changed}.`);
