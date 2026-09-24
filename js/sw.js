/* Service worker do Subsolo: deixa o jogo abrir offline e instalar no celular.
   Ao mudar arquivos, suba o número da versão para forçar a atualização. */
const VERSAO = 'subsolo-v2';
const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest',
  './css/style.css', './js/config.js', './js/api.js', './js/game.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // nada de cache para a API nem para nada que não seja GET simples
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const rede = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(VERSAO).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => hit);
      return hit || rede;   // responde do cache na hora e atualiza por baixo
    })
  );
});
