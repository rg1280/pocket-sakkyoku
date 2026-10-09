// オフライン（地下鉄など）でも開けるように、画面のファイルを端末に控えておく
const CACHE = 'pocket-v45';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// 画面本体は「電波があれば最新を取る・3秒で取れなければ控え」（直した画面が1回の開き直しで届くように）
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request, { ignoreSearch: true }) || await c.match('./index.html');
      const net = fetch(e.request, { cache: 'no-store' }).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; });
      const timeout = new Promise(res => setTimeout(() => res(null), 3000));
      try { return (await Promise.race([net, timeout])) || hit || await net; } catch (err) { return hit; }
    }));
    return;
  }
  // それ以外（アイコン等）は控えをすぐ返し、裏で最新を取りに行く
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => {
      if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone());
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
