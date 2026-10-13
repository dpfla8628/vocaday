// 웹 푸시 알림. 외부 라이브러리 없이 VAPID(ES256)만 서명해서 보낸다.
// ponytail: 본문 암호화(RFC 8291)는 구현하지 않고 '빈 푸시'만 보낸다 — 서비스 워커가 깨어나 /api/push/next 로 알림 내용을 가져간다.
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = s => new TextEncoder().encode(s);

const keyStore = { get: (env, uid) => env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(`push:${uid}`).first('v').then(v => (v ? JSON.parse(v) : [])) };
const putKv = (env, k, v) =>
  env.DB.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, JSON.stringify(v)).run();

export const subscriptions = (env, uid) => keyStore.get(env, uid);
export const saveSubscriptions = (env, uid, subs) => putKv(env, `push:${uid}`, subs);
export const notices = (env, uid) =>
  env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(`notices:${uid}`).first('v').then(v => (v ? JSON.parse(v) : []));
export const saveNotices = (env, uid, list) => putKv(env, `notices:${uid}`, list.slice(-30));

let signingKey; // 요청마다 다시 import하지 않게 isolate 안에서 재사용
async function vapidJwt(env, audience) {
  if (!env.VAPID_PRIVATE_JWK) throw new Error('VAPID_PRIVATE_JWK secret 없음');
  signingKey ??= await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u(enc(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'https://github.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, enc(`${header}.${payload}`));
  return `${header}.${payload}.${b64u(sig)}`;
}

// 구독 하나에 빈 푸시. 410/404면 죽은 구독(앱 삭제 등) → false 반환해서 지우게 한다
async function pushOne(env, sub) {
  const url = new URL(sub.endpoint);
  const jwt = await vapidJwt(env, url.origin);
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`, TTL: '86400', 'Content-Length': '0', Urgency: 'normal' },
  });
  if (r.status === 404 || r.status === 410) return false;
  if (!r.ok) console.log(`push fail ${r.status} ${url.host}`);
  return true;
}

// 알림 저장 + 그 사용자의 모든 기기에 푸시
export async function notify(env, uid, notice) {
  const list = await notices(env, uid);
  list.push({ ...notice, at: Date.now(), pending: true });
  await saveNotices(env, uid, list);
  const subs = await subscriptions(env, uid);
  if (!subs.length) return;
  const alive = [];
  for (const s of subs) {
    try {
      if (await pushOne(env, s)) alive.push(s);
    } catch (e) {
      console.log('push error', e.message);
      alive.push(s);
    }
  }
  if (alive.length !== subs.length) await saveSubscriptions(env, uid, alive);
}

// 서비스 워커가 가져갈 다음 알림(가장 오래된 미전달 1개)
export async function nextNotice(env, uid) {
  const list = await notices(env, uid);
  const n = list.find(x => x.pending);
  if (!n) return null;
  n.pending = false;
  await saveNotices(env, uid, list);
  return { title: n.title, body: n.body, url: n.url || '/' };
}
