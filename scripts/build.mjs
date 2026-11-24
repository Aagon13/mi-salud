import { execFileSync } from 'node:child_process';
import { cpSync, copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
const root=new URL('../',import.meta.url).pathname;
const dist=join(root,'dist');
rmSync(dist,{recursive:true,force:true});
mkdirSync(dist,{recursive:true});
execFileSync('tsc',['-p','tsconfig.json'],{cwd:root,stdio:'inherit'});
cpSync(join(root,'public'),dist,{recursive:true});
copyFileSync(join(root,'index.html'),join(dist,'index.html'));
copyFileSync(join(root,'src/styles.css'),join(dist,'assets/styles.css'));
const assets=[];
function collect(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){
  const target=join(folder,entry.name);
  if(entry.isDirectory())collect(target);
  else if(!entry.name.endsWith('.map'))assets.push('./'+relative(dist,target).split(sep).join('/'));
}}
collect(dist);
assets.push('./');
const version='mi-salud-v1-'+Date.now();
const worker=`const CACHE=${JSON.stringify(version)};
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE && key.startsWith('mi-salud-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(resp=>{
    if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return resp;
  }).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});`;
writeFileSync(join(dist,'service-worker.js'),worker);
console.log(`Mi Salud compilado: ${assets.length} recursos + service-worker.`);
