/* Analytics consent: opt in for the EU, UK and Switzerland (by time zone), opt out elsewhere. Ads use Google's own message. */
(function(){
'use strict';
var key='bm-analytics-consent',choice,loaded=false,back;
var source=document.querySelector('script[src="/js/consent.js"]');
var enabled=source.dataset.analytics==='on';
try{choice=localStorage.getItem(key)}catch(e){}
var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
var strict=!/^(America|Asia|Australia|Pacific|Indian)\//.test(tz)&&!/^Africa\/(?!Ceuta)/.test(tz);
function eff(c){return c||(strict?null:'accepted')}
function shut(c){return !strict||c==='accepted'||c==='rejected'}
var box=document.createElement('section');
box.id='bm-consent';box.className='bm-consent';
box.setAttribute('role','region');box.setAttribute('aria-labelledby','bm-consent-title');
box.innerHTML='<div><h2 id="bm-consent-title">Analytics cookies</h2><p>Allow analytics to help us improve the tools? Advertising choices are separate. <a href="/privacy/">Privacy policy</a></p></div><div class="bm-consent-actions"><button type="button" data-choice="accepted">Accept</button><button type="button" data-choice="rejected">Reject</button></div>';
var footer=document.querySelector('footer');footer.before(box);
function apply(value){
 var allow=value==='accepted'&&enabled;
 window.bmAnalyticsAllowed=allow;
 window['ga-disable-G-F4Y30PMRBB']=!allow;
 gtag('consent','update',{analytics_storage:allow?'granted':'denied'});
 if(allow&&/(^|\.)bingemind\.com$/.test(location.hostname)){
  gtag('js',new Date());gtag('config','G-F4Y30PMRBB');
  if(!loaded){loaded=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-F4Y30PMRBB';document.head.appendChild(s)}
 }
 if(value!=='accepted')document.cookie.split(';').forEach(function(cookie){var name=cookie.split('=')[0].trim();if(!/^_ga($|_)/.test(name))return;['',';domain='+location.hostname,';domain=.bingemind.com'].forEach(function(domain){document.cookie=name+'=;max-age=0;path=/'+domain})});
}
box.hidden=shut(choice);
apply(eff(choice));
box.addEventListener('click',function(e){var btn=e.target.closest('[data-choice]');if(!btn)return;choice=btn.dataset.choice;try{localStorage.setItem(key,choice)}catch(err){}apply(choice);box.hidden=true;(back||footer.querySelector('[data-cookie-settings]')).focus()});
document.addEventListener('click',function(e){var link=e.target.closest('[data-cookie-settings]');if(!link)return;e.preventDefault();back=link;box.hidden=false;box.scrollIntoView({block:'center'});box.querySelector('button').focus()});
addEventListener('storage',function(e){if(e.key===key||e.key===null){try{choice=localStorage.getItem(key)}catch(err){choice=null}apply(eff(choice));box.hidden=shut(choice)}});
})();
