from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, urljoin
import re, subprocess, json, random, hashlib, xml.etree.ElementTree as ET
r=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,s):
  super().__init__();self.ids=set();self.refs=[];self.h1=0;self.feed(s)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag=='h1':self.h1+=1
  for attr in ['href','src']:
   if a.get(attr):self.refs.append(a[attr])
pages={p:Page(p.read_text()) for p in r.rglob('*.html')}
selected=[r/x for x in ['index.html','tools/index.html','about/index.html','contact/index.html','terms/index.html','services/index.html']]
tools=[p for p in pages if p.name=='index.html' and len(p.relative_to(r).parts)==2 and p.parent.name not in ['tools','about','contact','terms','services','privacy','abhishek-mishra']]
sample=random.Random(20261112).sample(sorted(tools),5);selected+=sample
bad=[];refs=0
for p in selected:
 base='https://bingemind.com/'+str(p.relative_to(r)).replace('index.html','')
 for ref in pages[p].refs:
  url=urlsplit(urljoin(base,ref))
  if url.scheme not in ['http','https'] or url.hostname!='bingemind.com':continue
  target=r/unquote(url.path).lstrip('/')
  if target.is_dir():target=target/'index.html'
  refs+=1
  if not target.exists():bad.append([str(p.relative_to(r)),ref,'missing file']);continue
  if url.fragment and url.fragment!='bm-consent' and target in pages and unquote(url.fragment) not in pages[target].ids:bad.append([str(p.relative_to(r)),ref,'missing fragment'])
assert not bad,bad
print('PASS internal links and assets:',refs,'references across',len(selected),'pages')
print('Random tool pages:',', '.join(str(p.relative_to(r)) for p in sample))
for p,page in pages.items():
 s=p.read_text();assert s.count('<!-- bm-site-links v1 -->')==1,p;assert s.count('src="/js/consent.js"')==1,p
 default=s.index("gtag('consent','default'")
 for field in ['analytics_storage','ad_storage','ad_user_data','ad_personalization']:assert field+":'denied'" in s[:default+230],p
 assert 'googletagmanager.com/gtag/js' not in s,p
 assert s.index('<!-- bm-consent-default v1 -->')<s.index('<script'),p
 footer=re.search(r'<footer\b.*?</footer>',s,re.S)[0]
 for link in ['/about/','/contact/','/privacy/','/terms/']:assert 'href="'+link+'"' in footer,p
 assert 'data-cookie-settings' in footer,p
print('PASS all',len(pages),'HTML pages: global defaults first, shared script once, four site links and Cookie settings')
for p in selected[:6]:assert pages[p].h1==1,p
for slug in ['about','contact','terms','services']:
 s=(r/slug/'index.html').read_text();assert 'href="https://bingemind.com/'+slug+'/"' in s
 assert 'noindex' not in s
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
xml=ET.parse(r/'sitemap.xml');urls={n.find('s:loc',ns).text:n.find('s:lastmod',ns).text for n in xml.getroot()}
for slug in ['about','contact','terms','services']:assert urls['https://bingemind.com/'+slug+'/']=='2026-11-12'
index=ET.parse(r/'sitemap-index.xml');assert any(n.find('s:loc',ns).text=='https://bingemind.com/sitemap.xml' for n in index.getroot())
print('PASS new pages: one H1, indexable, canonical, root sitemap and index')
baseline='HEAD'
if subprocess.check_output(['git','log','-1','--format=%s'],cwd=r,text=True).strip()=='AdSense fixes: contact, about, terms, footer, consent, tools-first home':baseline='HEAD^'
oldfiles=subprocess.check_output(['git','ls-tree','-r','--name-only',baseline],cwd=r,text=True).splitlines()
checked=0; mains=0;new_scripts={}
for name in oldfiles:
 if not name.endswith('.html'):continue
 old=subprocess.check_output(['git','show',baseline+':'+name],cwd=r,text=True);now=(r/name).read_text()
 ads=lambda s:re.findall(r'<script[^>]+src="https://pagead2\.googlesyndication\.com/[^>]*></script>',s,re.S)
 assert ads(old)==ads(now),('ads changed',name)
 checked+=1
 if len(Path(name).parts)>1 and Path(name).parts[0] not in ['tools','abhishek-mishra','privacy','about','contact','terms','services']:
  getmain=lambda s:re.search(r'<main\b.*?</main>',s,re.S)[0]
  assert getmain(old)==getmain(now),('tool content changed',name);mains+=1
for p in pages:
 for typ,code in re.findall(r'<script([^>]*)>(.*?)</script>',p.read_text(),re.S):
  if 'ld+json' in typ:
   json.loads(code)
print('PASS preservation:',checked,'existing AdSense loader states,',mains,'tool main bodies; all JSON-LD parses')
# Byte-for-byte tree equality after a repeat run, including untracked new pages.
def digest():return {str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in r.rglob('*') if p.is_file() and '.git' not in p.parts}
a=digest();output=subprocess.check_output(['node','scripts/site-footer.mjs'],cwd=r,text=True).strip();assert a==digest()
print('PASS idempotence: complete working tree unchanged;',output)
print('All static checks passed. HTTP/browser/layout not tested by this script.')
