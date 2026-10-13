// 서비스 워커: 홈 화면 앱(PWA)용. 화면 파일은 네트워크 우선(배포가 바로 반영), 안 되면 캐시(오프라인에도 열림).
// API(/api/)는 건드리지 않는다.
const CACHE = 'vocaday-v2';
const SHELL = ['/', '/app.js', '/grade.js', '/style.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/'))),
  );
});

// 푸시 알림: 서버는 '빈 푸시'만 보내고, 여기서 /api/push/next 로 알림 내용을 가져와 보여 준다
self.addEventListener('push', e => {
  e.waitUntil(
    (async () => {
      let n = null;
      try {
        const r = await fetch('/api/push/next', { credentials: 'same-origin', cache: 'no-store' });
        if (r.ok) n = await r.json();
      } catch {}
      await self.registration.showNotification(n?.title || '보카데이', {
        body: n?.body || '새 소식이 있어요',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: n?.url || '/' },
        tag: 'vocaday-' + Date.now(),
      });
    })(),
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const c = cs[0];
      if (c) return c.navigate(url).then(() => c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
