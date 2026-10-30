/* Service worker del Club de Lectura.
   Cambia VERSION en cada actualización: la app la toma sola al abrirse con internet.
   Los datos están en el almacenamiento del teléfono y no se tocan aquí. */
const VERSION='2026.10.29-6';
const CACHE='club-lectura-'+VERSION;
const ASSETS=['./','./index.html','./localdb.js','./manifest.webmanifest',
  './fonts/fonts.css','./fonts/young-serif-latin-400-normal.woff2','./fonts/bebas-neue-latin-400-normal.woff2',
  './fonts/figtree-latin-400-normal.woff2','./fonts/figtree-latin-500-normal.woff2','./fonts/figtree-latin-600-normal.woff2','./fonts/figtree-latin-700-normal.woff2',
  './vendor/jspdf.umd.min.js','./vendor/jspdf.plugin.autotable.min.js',
  './icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/favicon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('club-lectura-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',e=>{
  if(e.data==='skipWaiting'){self.skipWaiting();return;}
  if(e.data==='version'&&e.source)e.source.postMessage({version:VERSION});
});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url); if(url.origin!==location.origin) return;
  if(req.mode==='navigate'){
    e.respondWith(caches.match('./index.html',{ignoreSearch:true}).then(r=>r||fetch(req)));
    return;
  }
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(r=>r||fetch(req).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));}
    return res;
  })));
});
