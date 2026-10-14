// 웹 푸시 알림. 외부 라이브러리 없이 VAPID(ES256) 서명 + 본문 암호화(RFC 8291)를 직접 한다.
// 예전엔 '빈 푸시'만 보내고 서비스 워커가 /api/push/next 에서 내용을 가져갔는데, 푸시 하나가 안 오면
// 그 뒤 알림이 전부 하나씩 밀려 엉뚱한 옛 알림이 떴다 → 이제 푸시마다 자기 내용을 싣는다.
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

const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((i, p) => (out.set(p, i), i + p.length), 0);
  return out;
};
const hkdf = async (salt, ikm, info, bytes) =>
  new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bytes * 8));

// 알림 내용을 그 기기의 구독 키로 암호화(RFC 8291 · aes128gcm). 푸시마다 자기 내용을 싣고 가므로
// 중간에 하나가 안 와도 다음 알림이 밀려서(엉뚱한 옛 알림으로) 뜨지 않는다.
export async function encryptPayload(sub, text) {
  const uaPublic = unb64u(sub.keys.p256dh);
  const auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await crypto.subtle.importKey('raw', await hkdf(salt, ikm, enc('Content-Encoding: aes128gcm\0'), 16), 'AES-GCM', false, ['encrypt']);
  const nonce = await hkdf(salt, ikm, enc('Content-Encoding: nonce\0'), 12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, concat(enc(text), new Uint8Array([2])))); // 2 = 마지막 레코드
  // 머리: salt(16) · 레코드 크기 4096(4) · 키 길이(1) · 보내는 쪽 공개키(65)
  return concat(salt, new Uint8Array([0, 0, 16, 0, 65]), asPublic, ct);
}

// 구독 하나에 알림(내용 암호화). 410/404면 죽은 구독(앱 삭제 등) → false 반환해서 지우게 한다
async function pushOne(env, sub, notice) {
  const url = new URL(sub.endpoint);
  const jwt = await vapidJwt(env, url.origin);
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    // high: 화면 꺼진 안드로이드(Doze)에서도 바로 오게
    headers: { Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`, TTL: '86400', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' },
    body: await encryptPayload(sub, JSON.stringify(notice)),
  });
  if (!r.ok) console.log(`push fail ${r.status} ${url.host}`);
  return r.status;
}

// 알림 저장 + 그 사용자의 모든 기기에 푸시
export async function notify(env, uid, notice) {
  const list = await notices(env, uid);
  list.push({ ...notice, at: Date.now(), pending: true });
  await saveNotices(env, uid, list);
  const subs = await subscriptions(env, uid);
  if (!subs.length) return;
  const alive = [];
  const fails = [];
  for (const s of subs) {
    const host = new URL(s.endpoint).host;
    try {
      const st = await pushOne(env, s, { title: notice.title, body: notice.body, url: notice.url || '/' });
      if (st === 404 || st === 410) continue; // 죽은 구독(앱 삭제 등)은 지운다
      alive.push(s);
      if (st >= 400) fails.push(`${st} ${host}`);
    } catch (e) {
      console.log('push error', e.message);
      alive.push(s);
      fails.push(`${e.message.slice(0, 40)} ${host}`);
    }
  }
  if (alive.length !== subs.length) await saveSubscriptions(env, uid, alive);
  // 보내기 실패는 기기 진단 기록(pushlog)에 남긴다
  if (fails.length) {
    const k = 'pushlog:' + uid;
    const log = JSON.parse((await env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first('v')) ?? '[]');
    log.push({ at: Date.now(), step: 'send-fail', detail: fails.join(', ').slice(0, 200), perm: '', standalone: false, ua: '' });
    await putKv(env, k, log.slice(-30));
  }
}

// 아직 새 서비스 워커로 안 바뀐 기기(내용 없는 푸시를 기대)용: 가장 최근 알림 하나만 주고, 쌓인 건 비운다(옛 알림이 뒤늦게 뜨지 않게)
export async function nextNotice(env, uid) {
  const list = await notices(env, uid);
  const pend = list.filter(x => x.pending);
  if (!pend.length) return null;
  pend.forEach(x => (x.pending = false));
  await saveNotices(env, uid, list);
  const n = pend.at(-1);
  return { title: n.title, body: n.body, url: n.url || '/' };
}
