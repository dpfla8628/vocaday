// 서비스 워커: 홈 화면 앱(PWA)용. 화면 파일은 네트워크 우선(배포가 바로 반영), 안 되면 캐시(오프라인에도 열림).
// API(/api/)는 건드리지 않는다.
const CACHE = 'vocaday-v3';
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

// 푸시 알림: 푸시마다 암호화된 알림 내용({title, body, url})이 실려 온다(브라우저가 풀어 줌).
// 내용이 없으면(옛 서버) /api/push/next 에서 가져온다.
self.addEventListener('push', e => {
  e.waitUntil(
    (async () => {
      let n = null;
      try {
        n = e.data?.json();
      } catch {}
      if (!n?.title)
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
// 알림을 누르면 앱을 앞으로 가져온 뒤 그 화면으로 이동.
// 창을 앞으로 가져오는 건 '누른 직후'에만 허용되므로 focus를 먼저 한다(이동부터 하면 그사이 허용이 끝나 앱이 안 뜸).
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(
    (async () => {
      const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const c = cs.find(x => x.focused) || cs[0];
      let how;
      try {
        if (!c) throw new Error('no window');
        await c.focus();
        how = 'focus';
        await c.navigate(url).catch(err => (how += ' nav:' + err.name));
      } catch (err) {
        how = 'open(' + err.name + ')';
        await self.clients.openWindow(url).catch(err2 => (how += ' fail:' + err2.name));
      }
      // 기기별 진단용(설정 화면의 알림 기록과 같은 곳)
      await fetch('/api/push/log', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'nclick', detail: `${how} windows=${cs.length}`, perm: Notification.permission, standalone: true, ua: navigator.userAgent.slice(0, 160) }),
      }).catch(() => {});
    })(),
  );
});
