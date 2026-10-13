// 실행 중인 서버에 대고 핵심 흐름 점검: node test/smoke.mjs [baseURL]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// 계정은 .dev.vars의 USERS(JSON)에서 읽는다 — 저장소에 아이디·비밀번호를 두지 않는다
const USERS = JSON.parse(/^USERS=(.*)$/m.exec(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'))[1]);
const [[ID, { pw: PW }], [ID2]] = Object.entries(USERS);

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

const after = (await call('session?kind=word')).data.items.map(x => x.id);
assert.ok(!after.includes(a.id) && !after.includes(b.id), '오늘 푼 문제가 다시 큐에 들어옴');

const board = (await call('board')).data;
assert.deepEqual(board.users.map(u => u.id).sort(), [ID, ID2].sort());

assert.equal((await call('settings', { level: 9, plan: 'normal' })).status, 400);

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
console.log('smoke ok');
