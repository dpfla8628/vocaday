// AI 자동 생성 검사(가짜 AI 응답): 규칙·중복·블라인드 풀이에서 걸러야 할 것을 거르는지
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate } from '../src/generate.js';

const load = f => JSON.parse(readFileSync(new URL('../content/' + f, import.meta.url), 'utf8'));
const WORDS = [1, 2, 3, 4].flatMap(n => load(`words_lv${n}.json`)).map(x => ({ ...x, kind: 'word' }));
const GRAMMAR = [...load('grammar_lv12.json'), ...load('grammar_lv34.json')].map(x => ({ ...x, kind: 'grammar' }));
const fixed = load('distractors.json');

// 기존 문항 하나를 '새로 만든 것'처럼 쓰려고 목록에서 뺀다
const word = WORDS.find(x => x.lv === 4 && !x.alt && fixed[x.id]);
const gram = GRAMMAR.find(x => x.lv === 4);
const ans = s => /\{(.+?)\}/.exec(s)[1];

// review: 검수 단계 응답(기본은 전부 통과)
function fakeAI(made, solve, review = () => ({ ok: true, bad: [] })) {
  let n = 0;
  return {
    async run(model, { messages }) {
      const c = messages[0].content;
      if (c.startsWith('List 25')) return { response: JSON.stringify(made.map(x => x.en)) }; // 표제어 후보
      if (n++ === 0) return { response: JSON.stringify(made) };
      if (messages[0].content.includes('strict reviewer')) {
        const ids = messages[0].content.split('\n').map(l => /^(\d+) \|/.exec(l)?.[1]).filter(Boolean);
        return { response: JSON.stringify(Object.fromEntries(ids.map(i => [i, review(+i)]))) };
      }
      const out = {};
      for (const line of messages[0].content.split('\n')) {
        const [id] = line.split(' ');
        if (/^[wg]\d+$/.test(id)) out[id] = solve(id);
        if (/^w\d+c$/.test(id)) out[id] = solve(id, /([A-G])\) (\S[^]*?)(?=\s{2}[A-G]\)|$)/g, line);
      }
      return { response: JSON.stringify(out) };
    },
  };
}
const letterOf = (en, re, line) => [...line.matchAll(re)].find(m => m[2].trim() === en)?.[1];

const goodWord = { en: word.en, ko: word.ko, pos: word.pos, ex: word.ex, exKo: word.exKo, distractors: fixed[word.id] };
const ctx = kind => ({
  items: (kind === 'word' ? WORDS : GRAMMAR).filter(x => x !== word && x !== gram),
  EN: new Map(WORDS.filter(x => x !== word).map(w => [w.en, w])),
  fixed,
});

// 1) 좋은 단어 1 + 빈칸 없는 것 + 이미 있는 단어 + 뜻 겹치는 보기 → 좋은 것만, 블라인드도 맞힘
{
  const made = [
    goodWord,
    { ...goodWord, en: 'zqx', ex: 'No blank here.' },
    { ...WORDS[300], distractors: fixed[WORDS[300].id] },
    { ...goodWord, en: 'qzx', ex: 'I {qzx} it.', distractors: [{ en: 'aaa', ko: word.ko }, ...fixed[word.id].slice(1)] },
  ];
  const env = { AI: fakeAI(made, (id, re, line) => (re ? letterOf(word.en, re, line) : ans(word.ex))) };
  const r = await generate(env, 'word', 4, ctx('word'));
  assert.deepEqual(r.items.map(x => x.en), [word.en], JSON.stringify(r.reasons));
  assert.ok(r.items[0].id.startsWith('aw4-') && r.items[0].kind === 'word' && r.items[0].distractors.length === 6);
  assert.equal(r.reasons['중복'], 1);
}
// 2) 블라인드에서 틀리면(정답이 하나로 안 정해짐) 버린다
{
  const env = { AI: fakeAI([goodWord], (id, re) => (re ? 'A' : 'banana')) };
  const r = await generate(env, 'word', 4, ctx('word'));
  assert.equal(r.items.length, 0);
  assert.equal(r.reasons['블라인드 빈칸 틀림'], 1);
}
// 2-1) 검수에서 탈락시키면 버리고, 오답 후보를 빼서 6개가 안 되면 버린다
{
  const solve = (id, re, line) => (re ? letterOf(word.en, re, line) : ans(word.ex));
  assert.equal((await generate({ AI: fakeAI([goodWord], solve, () => ({ ok: false })) }, 'word', 4, ctx('word'))).items.length, 0);
  const r = await generate({ AI: fakeAI([goodWord], solve, () => ({ ok: true, bad: [1] })) }, 'word', 4, ctx('word'));
  assert.equal(r.reasons['검수: 오답 후보 부족'], 1, '후보 6개 중 하나를 빼면 5개라 버려야 함');
  const ten = { ...goodWord, distractors: [...fixed[word.id], { en: 'zzwordx', ko: '가나다라' }] };
  const r2 = await generate({ AI: fakeAI([ten], solve, () => ({ ok: true, bad: [2] })) }, 'word', 4, ctx('word'));
  assert.equal(r2.items[0]?.distractors.length, 6);
  assert.ok(!r2.items[0].distractors.some(d => d.en === fixed[word.id][1].en), '검수에서 지적한 후보가 남음');
}
// 2-1b) 오답 후보가 단어장에 있는 단어면 뜻풀이는 단어장 것으로 통일된다
{
  const solve = (id, re, line) => (re ? letterOf(word.en, re, line) : ans(word.ex));
  const other = WORDS.find(x => x.lv === 4 && x !== word && !fixed[word.id].some(d => d.en === x.en) && !x.en.includes(' '));
  const made = { ...goodWord, distractors: [{ en: other.en, ko: '엉뚱한 뜻' }, ...fixed[word.id].slice(0, 5)] };
  const r = await generate({ AI: fakeAI([made], solve) }, 'word', 4, ctx('word'));
  const d = r.items[0]?.distractors.find(d => d.en === other.en);
  assert.ok(d && d.ko === other.ko, `후보 뜻이 단어장과 통일되지 않음: ${d?.ko} ≠ ${other.ko} (${JSON.stringify(r.reasons)})`);
}
// 2-2) 생성 모델이 자주 내는 실수는 규칙으로 미리 거른다
{
  const solve = (id, re, line) => (re ? letterOf(word.en, re, line) : ans(word.ex));
  const placeholder = { ...goodWord, en: 'come down with something', ex: 'I {come down with something} every winter.', pos: '숙어' };
  const verbNoun = { ...goodWord, en: 'zqscald', ex: 'The {zqscald} hurt.', pos: '명', ko: '뜨겁다, 화상을 입히다' };
  const verbAdj = { ...goodWord, en: 'zqscalding', ex: 'The water is {zqscalding}.', pos: '형', ko: '뜨겁다, 화상을 입히다' };
  const r = await generate({ AI: fakeAI([placeholder, verbNoun, verbAdj], solve) }, 'word', 4, ctx('word'));
  assert.equal(r.items.length, 0, JSON.stringify(r.reasons));
  assert.equal(r.reasons['표제어에 자리표시(something 등)'], 1);
  assert.equal(r.reasons['명사 뜻이 서술형'], 1);
  assert.equal(r.reasons['형용사 뜻이 서술형'], 1);
  // 같은 구절 변형(come down with the flu)은 오답 후보에서 뺀다 → 6개가 안 되면 탈락
  const fam = { ...goodWord, en: 'zqcome down with', ex: "I think I'm {zqcoming down with} a cold.", pos: '숙어', ko: '(병에) 걸리다',
    distractors: [{ en: 'zqcome down with the flu', ko: '독감에 걸리다' }, { en: 'zqcome down with a fever', ko: '열이 나다' }, ...fixed[word.id].slice(0, 4)] };
  const r2 = await generate({ AI: fakeAI([fam], (id, re, line) => (re ? letterOf('zqcome down with', re, line) : 'zqcoming down with')) }, 'word', 4, ctx('word'));
  assert.equal(r2.reasons['규칙: 오답 후보가 6개 미만'], 1, JSON.stringify(r2.reasons));
  const g = { tag: gram.tag, s: gram.s, ko: gram.ko, tip: gram.tip, bank: gram.bank };
  const partial = { ...g, tag: '패턴: hold the line', s: 'Please {hold} the line.', ko: '잠시만 기다려 주세요.', bank: ['wait', 'keep'] };
  const capital = { ...g, tag: '패턴: by the way', s: 'Hey, {By the way}, did you call?', ko: '야, 그런데 전화했어?', bank: ['On', 'At'] };
  const nonword = { ...g, tag: '패턴: said ~ would', s: 'She said she {would} call me later.', ko: '그녀는 나중에 전화하겠다고 말했다.', bank: ['will', 'wouldly'] };
  const dupTag = { ...g, tag: '패턴: said ~ would', s: 'He said he {would} be late.', ko: '그는 늦을 거라고 말했다.', bank: ['will', 'can'] };
  const dupTag2 = { ...g, tag: '패턴: said ~ would', s: 'They said they {would} come.', ko: '그들은 오겠다고 말했다.', bank: ['will', 'can'] };
  const r3 = await generate({ AI: fakeAI([partial, capital, nonword, dupTag, dupTag2], () => 'x') }, 'grammar', 4, ctx('grammar'));
  assert.equal(r3.reasons['빈칸에 패턴이 다 안 들어감'], 1, JSON.stringify(r3.reasons));
  assert.equal(r3.reasons['문장 중간 대문자'], 1, JSON.stringify(r3.reasons));
  assert.equal(r3.reasons['오답 블록이 모르는 단어'], 1, JSON.stringify(r3.reasons));
  assert.equal(r3.reasons['같은 패턴 중복'], 1, JSON.stringify(r3.reasons));
}
// 3) 문법: 좋은 것만 통과, 오답 블록이 정답과 겹치면 버림
{
  const good = { tag: gram.tag, s: gram.s, ko: gram.ko, alt: gram.alt, tip: gram.tip, bank: gram.bank };
  const bad = { ...good, s: 'I {really want} it.', bank: ['really', 'want'] };
  const env = { AI: fakeAI([good, bad], () => ans(gram.s)) };
  const r = await generate(env, 'grammar', 4, ctx('grammar'));
  assert.deepEqual(r.items.map(x => x.s), [gram.s], JSON.stringify(r.reasons));
}
// 4) AI가 JSON이 아닌 답을 줘도 죽지 않는다
{
  const env = { AI: { run: async () => ({ response: '죄송합니다' }) } };
  assert.equal((await generate(env, 'word', 4, ctx('word'))).items.length, 0);
}
console.log('generate ok');
