// 실행 중인 서버에 대고 핵심 흐름 점검: node test/smoke.mjs [baseURL]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// 계정은 .dev.vars의 USERS(JSON)에서 읽는다 — 저장소에 아이디·비밀번호를 두지 않는다
const USERS = JSON.parse(/^USERS=(.*)$/m.exec(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'))[1]);
const [[ID, { pw: PW }], [ID2, { pw: PW2 }]] = Object.entries(USERS);

const BASE = process.argv[2] || 'http://localhost:8787';
let cookie = '';
async function call(path, body) {
  const r = await fetch(BASE + '/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body && JSON.stringify(body),
  });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: r.status, data: await r.json() };
}

assert.equal((await call('login', { id: ID, pw: PW + 'x' })).status, 401);
assert.equal((await call('me')).status, 401);
assert.equal((await call('login', { id: ID, pw: PW })).status, 200);

const me = (await call('me')).data;
assert.ok(me.preview.word.new + me.preview.word.review > 0, '단어 큐가 비어 있음');

const { items } = (await call('session?kind=word')).data;
assert.ok(items.length > 0);
const [a, b] = items;
assert.equal((await call('answer', { id: a.id, correct: true })).data.box, 1);
assert.equal((await call('answer', { id: b.id, correct: false })).data.box, 0);

const wrongs = (await call('wrongs')).data.items;
assert.ok(wrongs.some(x => x.id === b.id), '틀린 문제가 오답노트에 없음');
assert.equal((await call('wrongs/delete', { id: b.id })).status, 200);
assert.ok(!(await call('wrongs')).data.items.some(x => x.id === b.id), '오답노트 삭제가 안 됨');
assert.equal((await call('diary/practice', { i: 9 })).status, 400, '없는 복습 문제는 추가 안 됨');

const after = (await call('session?kind=word')).data.items.map(x => x.id);
assert.ok(!after.includes(a.id) && !after.includes(b.id), '오늘 푼 문제가 다시 큐에 들어옴');

const board = (await call('board')).data;
assert.deepEqual(board.users.map(u => u.id).sort(), [ID, ID2].sort());

assert.equal((await call('settings', { level: 9, plan: 'normal' })).status, 400);
// 내 레벨보다 쉬운 문제(복습 포함)는 나오지 않는다
const before = me.level;
assert.equal((await call('settings', { level: 3, plan: 'normal' })).status, 200);
const hi = (await call('session?kind=word')).data.items;
assert.ok(hi.length && hi.every(x => x.lv >= 3), `레벨 3인데 쉬운 단어가 나옴: ${hi.filter(x => x.lv < 3).map(x => x.en)}`);
assert.ok((await call('wrongs')).data.items.every(x => x.id.startsWith('c-') || x.lv >= 3), '오답노트에 레벨보다 쉬운 문제');
// 숨김 단어(dog·cat 등)는 1단계에서도 나오지 않는다
assert.equal((await call('settings', { level: 1, plan: 'hard' })).status, 200);
const HIDDEN = JSON.parse(readFileSync(new URL('../content/hidden.json', import.meta.url), 'utf8'));
const lo = (await call('session?kind=word')).data.items;
assert.ok(lo.every(x => !HIDDEN.includes(x.id)), `숨김 단어가 나옴: ${lo.filter(x => HIDDEN.includes(x.id)).map(x => x.en)}`);
await call('settings', { level: before, plan: 'normal' });

// 레벨 테스트: 문제에는 정답이 없고, 한 문항 채점은 고른 뒤에만 정답 번호를 준다
const { items: pl } = (await call('placement')).data;
assert.ok(pl.length === 24 && pl.every(p => !('answer' in p) && !('glosses' in p)), '레벨 테스트 정답/보기 뜻이 클라이언트로 새어 나감');
const chk = (await call('placement/check', { id: pl[0].id, pick: 0 })).data;
assert.ok([0, 1, 2, 3].includes(chk.answer) && chk.correct === (chk.answer === 0), '즉시 채점 결과가 이상함');
assert.ok(chk.answerKo && chk.pickKo, '채점 결과에 정답·내가 고른 보기의 뜻이 없음');
assert.equal((await call('placement/check', { id: pl[0].id, pick: chk.answer })).data.correct, true);
assert.equal((await call('placement/check', { id: pl[0].id, pick: -1 })).data.correct, false);
assert.equal((await call('placement/check', { id: 'nope', pick: 0 })).status, 400);
// 다시 보기: 지난 회차에 낸 문제는 다음 회차에 나오지 않는다
const ids1 = new Set(pl.map(p => p.id));
assert.equal((await call('placement', { answers: {} })).status, 200);
const { items: pl2 } = (await call('placement')).data;
assert.ok(pl2.length === 24 && pl2.every(p => !ids1.has(p.id)), '레벨 테스트를 다시 보면 지난번과 다른 문제가 나와야 함');
// 일기 댓글: 달기 → 답글 → 수정 → 삭제(답글 있는 댓글은 자리만 남음)
await call('diary', { text: 'Smoke test diary entry for comments.' });
const d0 = (await call('diary')).data;
const c1 = (await call('diary/comment', { uid: ID, date: d0.today, text: 'first' })).data.comments.at(-1);
const r1 = (await call('diary/comment', { uid: ID, date: d0.today, text: 'reply', parent: c1.id })).data.comments.at(-1);
assert.equal(r1.parent, c1.id, '답글의 parent');
assert.equal((await call('diary/comment', { uid: ID, date: d0.today, text: 'x', parent: r1.id })).status, 400, '답글에 답글은 안 됨');
// 같은 댓글을 연달아 보내면(두 번 누름·재전송) 한 번만 저장, 줄바꿈은 살리고 빈 줄은 하나까지
const dupBody = { uid: ID, date: d0.today, text: 'dup\n\n\n\nline' };
await call('diary/comment', dupBody);
const dd = (await call('diary/comment', dupBody)).data.comments.filter(c => c.text === 'dup\n\nline');
assert.equal(dd.length, 1, '같은 댓글을 두 번 보내면 한 번만 저장');
await call('diary/comment/delete', { uid: ID, date: d0.today, id: dd[0].id });
const ed = (await call('diary/comment/edit', { uid: ID, date: d0.today, id: c1.id, text: 'first (edited)' })).data.comments.find(c => c.id === c1.id);
assert.ok(ed.text === 'first (edited)' && ed.editedAt, '댓글 수정');
const del = (await call('diary/comment/delete', { uid: ID, date: d0.today, id: c1.id })).data.comments;
assert.ok(del.find(c => c.id === c1.id)?.deleted && del.some(c => c.id === r1.id), '답글 있는 댓글은 자리만 남고 답글은 유지');
const del2 = (await call('diary/comment/delete', { uid: ID, date: d0.today, id: r1.id })).data.comments;
assert.ok(!del2.some(c => c.id === r1.id), '답글 삭제');
assert.ok(!del2.some(c => c.id === c1.id), '마지막 답글이 지워지면 삭제 댓글 자리도 사라짐');
assert.ok((await call('board')).data.users.find(x => x.id === ID).diaryToday === true, '친구 화면용 오늘 일기 여부');

// 푸시 알림: 구독 저장 → 친구가 댓글을 달면 알림이 쌓이고, 서비스 워커가 push/next 로 하나씩 가져간다
assert.ok((await call('push/key')).data.key.length > 60, 'VAPID 공개키가 없음');
const fake = { endpoint: 'https://example.invalid/push/' + Date.now(), keys: { p256dh: 'x', auth: 'y' } };
assert.equal((await call('push/subscribe', { subscription: fake })).data.ok, true);
while ((await call('push/next')).data.title); // 남아 있던 알림 비우기
cookie = '';
assert.equal((await call('login', { id: ID2, pw: PW2 })).status, 200);
await call('diary/comment', { uid: ID, date: d0.today, text: 'notify me' });
cookie = '';
assert.equal((await call('login', { id: ID, pw: PW })).status, 200);
const n = (await call('push/next')).data;
assert.ok(n.title?.includes('댓글') && n.body === 'notify me', `댓글 알림이 없음: ${JSON.stringify(n)}`);
assert.deepEqual((await call('push/next')).data, {}, '알림은 한 번만 전달');
assert.equal((await call('push/unsubscribe', { endpoint: fake.endpoint })).data.devices, 0);
console.log('smoke ok');
