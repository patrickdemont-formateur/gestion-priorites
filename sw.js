/* Service worker : permet de rouvrir les pages sans réseau une fois qu'elles ont été chargées une fois.
   Stratégie : réseau d'abord (contenu toujours à jour), cache en secours.
   Après une modification des fichiers, changez le numéro de version ci-dessous. */
var CACHE = 'orvane-priorites-v1';
var FILES = [
  './', 'index.html', 'dossier.html', 'fiche.html', 'aide-memoire.html',
  'assets/style.css', 'assets/app.js',
  'assets/fonts/barlow-latin-400-normal.woff2', 'assets/fonts/barlow-latin-400-italic.woff2',
  'assets/fonts/barlow-latin-500-normal.woff2', 'assets/fonts/barlow-latin-600-normal.woff2',
  'assets/fonts/barlow-latin-700-normal.woff2',
  'assets/fonts/barlow-condensed-latin-600-normal.woff2', 'assets/fonts/barlow-condensed-latin-700-normal.woff2'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); });
    })
  );
});
