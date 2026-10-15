// 일기 첨삭 결과 검증 함수 테스트 + (선택) 실제 모델 품질 확인
// node test/diary.mjs            → 검증 함수 단위 테스트
// node test/diary.mjs <baseURL>  → 실행 중인 서버에 샘플 일기를 보내 첨삭 결과 출력(.dev.vars의 첫 계정)
import assert from 'node:assert/strict';
import { sanitizeReview, promptOf, PROMPTS, trivial } from '../src/diary.js';

const good = {
  praise: '과거형을 잘 썼어요',
  corrected: 'Yesterday I went to the park.',
  edits: [{ from: 'goed', to: 'went', type: 'spelling', why: 'go의 과거형은 went' }, { from: 'same', to: 'same', type: 'grammar', why: '같음' }],
  translations: [{ ko: '산책', en: 'go for a walk' }],
  better: [{ en: 'I took a stroll in the park.', ko: '공원을 산책했어.' }],
  practice: [
    { s: 'Yesterday I {went} to the park.', ko: '어제 공원에 갔어.', bank: ['goed', 'go', 'went', 'gone now'], tip: 'go-went-gone' },
    { s: 'No blank here.', ko: '빈칸 없음', bank: ['a', 'b'] },
    { s: 'I {really really really really like} it.', ko: '너무 좋아', bank: ['a', 'b'] },
  ],
};
const r = sanitizeReview(JSON.stringify(good), 'Yesterday I goed to the park.');
assert.equal(r.edits.length, 1, '같은 from/to 수정은 버린다');
assert.equal(r.practice.length, 1, '빈칸이 없거나 4단어 넘는 복습 문제는 버린다');
assert.deepEqual(r.practice[0].bank, ['goed', 'go'], '정답과 같은 블록·공백 블록은 뺀다');
assert.equal(sanitizeReview('모델이 헛소리를 함', 'x'), null);
assert.equal(sanitizeReview('앞말 ' + JSON.stringify({ corrected: '' }) + ' 뒷말', 'orig').corrected, 'orig', '교정문이 비면 원문');
assert.equal(sanitizeReview({ edits: [{ from: 'a', to: 'b', type: 'weird', why: 'x' }] }, 't').edits[0].type, 'natural');
assert.ok(PROMPTS.length >= 14 && promptOf('2026-10-13').ko && promptOf('2026-10-14').ko !== promptOf('2026-10-13').ko);
// 대소문자·줄임말·이름은 실수로 치지 않는다
for (const [a, b] of [['i', 'I'], ["I'm", 'I am'], ['dont', "don't"], ["can't", 'cannot'], ['Im', "I'm"], ["it's", 'it is'], ['monday', 'Monday']]) assert.ok(trivial(a, b), `${a} → ${b}`);
for (const [a, b] of [['its', "it's"], ['were', "we're"], ['goed', 'went'], ['I am', 'I was']]) assert.ok(!trivial(a, b), `${a} → ${b}는 진짜 수정`);
const t2 = 'i met Yerim. Im happy.';
const r2 = sanitizeReview({ corrected: "I met Yerim. I'm happy.", edits: [
  { from: 'i', to: 'I', type: 'grammar', why: '대문자' },
  { from: 'Im', to: "I'm", type: 'spelling', why: '줄임말' },
  { from: 'Yerim', to: 'Yeri', type: 'spelling', why: '철자' },
  { from: 'goed', to: 'went', type: 'spelling', why: '과거형' },
] }, t2);
assert.deepEqual(r2.edits.map(e => e.from), ['goed'], '대소문자·줄임말·이름 지적은 버린다');
assert.equal(r2.corrected, t2, '대소문자·줄임말만 바뀐 교정문은 원문 그대로');
console.log('diary sanitize ok');

const BASE = process.argv[2];
if (BASE) {
  let cookie = '';
  const call = async (p, body) => {
    const res = await fetch(BASE + '/api/' + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body && JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json() };
  };
  const { readFileSync } = await import('node:fs');
  const [[ID, { pw: PW }]] = Object.entries(JSON.parse(/^USERS=(.*)$/m.exec(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'))[1]));
  await call('login', { id: ID, pw: PW });
  for (const text of [
    'Yesterday I goed to the park with my freind. We eated pizza and it was very delicious. I want to (산책) again tomorrow.',
    'Today I was so busy because of work. I have finished my report at 9pm. I am so tired but I feel proud.',
  ]) {
    await call('diary', { text });
    const t0 = Date.now();
    const { status, data } = await call('diary/check', {});
    console.log(`\n=== ${status} ${Date.now() - t0}ms ===\n${text}\n`, JSON.stringify(data.review ?? data, null, 1));
  }
}
