// 푸시 본문 암호화 점검: node test/push-crypto.mjs
// 받는 쪽(브라우저) 복호화를 node:crypto로 따로 구현해서 ① RFC 8291 부록 A 예시를 풀고 ② 우리 암호문을 푼다
import assert from 'node:assert/strict';
import { createECDH, createDecipheriv, hkdfSync } from 'node:crypto';
import { encryptPayload } from '../src/push.js';

const b = s => Buffer.from(s, 'base64url');
function decrypt(body, uaPrivate, auth) {
  const ua = createECDH('prime256v1');
  ua.setPrivateKey(uaPrivate);
  const salt = body.subarray(0, 16);
  assert.equal(body.readUInt32BE(16), 4096, '레코드 크기');
  const idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen);
  const ct = body.subarray(21 + idlen);
  const ikm = hkdfSync('sha256', ua.computeSecret(asPublic), auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPublic]), 32);
  const cek = hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);
  const d = createDecipheriv('aes-128-gcm', Buffer.from(cek), Buffer.from(nonce));
  d.setAuthTag(ct.subarray(-16));
  const pt = Buffer.concat([d.update(ct.subarray(0, -16)), d.final()]);
  assert.equal(pt.at(-1), 2, '마지막 레코드 표시');
  return pt.subarray(0, -1).toString();
}

// ① RFC 8291 Appendix A
const rfc = decrypt(
  b('DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'),
  b('q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94'),
  b('BTBZMqHH6r4Tts7J_aSIgg'),
);
assert.equal(rfc, 'When I grow up, I want to be a watermelon');

// ② 우리 암호화 → 따로 만든 복호화
const ua = createECDH('prime256v1');
ua.generateKeys();
const auth = Buffer.from('0123456789abcdef');
const notice = JSON.stringify({ title: '💬 친구님의 댓글', body: '한글 · emoji 😀 · "따옴표"', url: '/#/diary/2026-10-14' });
const body = Buffer.from(await encryptPayload({ keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } }, notice));
assert.equal(decrypt(body, ua.getPrivateKey(), auth), notice);
console.log('push crypto ok');
