// 전 문항 자동 테스트: 모든 단어·문법 문제를 실제 채점 코드로 풀어 보고 문제-정답이 맞는지 확인한다.
// 실행: npm test   (실패가 있으면 목록을 출력하고 exit 1)
// 선택: node test/content.mjs <blind-answers.json>  — 정답을 모르는 상태로 푼 답안을 채점(모호한 문제 찾기)
import { readFileSync, existsSync } from 'node:fs';
import { blankParts, norm, grade } from '../public/grade.js';
import { makePicker, senses } from '../src/distractors.js';
import { checkWord, checkDistractors, checkGrammar, hasWord } from '../src/validate.js';

const load = f => JSON.parse(readFileSync(new URL('../content/' + f, import.meta.url), 'utf8'));
const WORDS = [1, 2, 3, 4].flatMap(n => load(`words_lv${n}.json`));
const GRAMMAR = [...load('grammar_lv12.json'), ...load('grammar_lv34.json')];
const GROUPS = existsSync(new URL('../content/confusables.json', import.meta.url)) ? load('confusables.json') : [];

const fails = [];
const fail = (id, msg) => fails.push(`${id}: ${msg}`);
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- 단어 ---------- (문항별 규칙은 src/validate.js — AI 자동 생성도 같은 규칙)
const ids = new Set();
const ens = new Set();
for (const w of WORDS) {
  if (ids.has(w.id)) fail(w.id, 'id 중복');
  ids.add(w.id);
  if (ens.has(w.en)) fail(w.id, `단어 중복 ${w.en}`);
  ens.add(w.en);
  checkWord(w, m => fail(w.id, m));
}

// 4지선다 보기: 정답과·서로 뜻이 겹치는 보기가 없어야 함
const pick = makePicker(WORDS, GROUPS);
const S = new Map(WORDS.map(w => [w.en, senses(w.ko)]));
const G = new Map();
GROUPS.forEach((g, i) => g.forEach(en => (G.get(en) ?? G.set(en, new Set()).get(en)).add(i)));
for (const g of GROUPS) for (const en of g) if (!S.has(en)) fail('confusables', `없는 단어 "${en}"`);
const overlap = (a, b) => {
  const x = S.get(a);
  const y = S.get(b);
  return x.some(p => y.some(q => p === q || (p.length >= 2 && q.includes(p)) || (q.length >= 2 && p.includes(q)))) || [...(G.get(a) ?? [])].some(i => G.get(b)?.has(i));
};
// 고정 오답 후보 전수 검사(content/distractors.json)
const FIXED = load('distractors.json');
const EN = new Map(WORDS.map(w => [w.en, w]));
for (const w of WORDS) {
  const c = FIXED[w.id];
  let bad = false;
  checkDistractors(w, c, { EN, overlap }, m => (fail(w.id, m), (bad = true)));
  if (bad || !Array.isArray(c)) continue;
  // 실제 출제 함수가 고정 후보만 쓰는지
  const opts = pick(w, shuffle, FIXED);
  if (opts.length !== 3 || opts.some(o => !c.some(x => x.en === o.en && x.ko === o.ko))) fail(w.id, '출제 보기가 고정 후보 밖에서 나옴');
}

// ---------- 문법 ----------
for (const g of GRAMMAR) {
  if (ids.has(g.id)) fail(g.id, 'id 중복');
  ids.add(g.id);
  checkGrammar(g, m => fail(g.id, m));
}

// ---------- 레벨 테스트 ----------
const PLACEMENT = load('placement.json');
// 풀 72개(레벨·종류별 9개) 중 회차마다 3개씩 뽑아 24문제를 낸다 → 다시 볼 때 지난 문제를 피할 수 있다
if (PLACEMENT.length !== 72) fail('placement', `문항 수 ${PLACEMENT.length} (72개여야 함)`);
for (const lv of [1, 2, 3, 4])
  for (const skill of ['vocab', 'grammar'])
    if (PLACEMENT.filter(p => p.lv === lv && p.skill === skill).length !== 9) fail('placement', `레벨 ${lv} ${skill} 문항이 9개가 아님`);
{
  const seenId = new Set();
  const seenQ = new Map();
  for (const p of PLACEMENT) {
    if (seenId.has(p.id)) fail(p.id, 'id 중복');
    seenId.add(p.id);
    const k = p.q.toLowerCase().replace(/[^a-z_ ]/g, '').replace(/\s+/g, ' ').trim();
    if (seenQ.has(k)) fail(p.id, `문장이 ${seenQ.get(k)}와 같음`);
    seenQ.set(k, p.id);
  }
}
for (const p of PLACEMENT) {
  if (p.q.split('___').length !== 2) fail(p.id, '빈칸(___)이 하나가 아님');
  if (p.options?.length !== 4 || new Set(p.options.map(norm)).size !== 4) fail(p.id, '보기 4개가 서로 달라야 함');
  if (![0, 1, 2, 3].includes(p.answer)) fail(p.id, `정답 번호 ${p.answer}`);
  if (!Array.isArray(p.glosses) || p.glosses.length !== 4 || p.glosses.some(g => typeof g !== 'string' || !g.trim())) fail(p.id, '보기 뜻(glosses) 4개 필요');
  if (p.ko && p.options[p.answer] && /[a-z]{3,}/i.test(p.ko) && hasWord(p.ko, p.options[p.answer])) fail(p.id, '해석에 정답이 보임');
}
const { placeLevel } = await import('../src/placement.js');
const lvl = (...c) => placeLevel(Object.fromEntries(c.map((n, i) => [i + 1, { correct: n, total: 6 }])));
for (const [got, want, why] of [
  [lvl(6, 6, 6, 6), 4, '전부 맞힘 → 실전'],
  [lvl(0, 0, 0, 0), 1, '전부 틀림 → 초등'],
  [lvl(5, 5, 3, 0), 2, '초등 5·중등 5·고등 3 → 중등(편안한 가장 높은 단계)'],
  [lvl(6, 2, 3, 0), 2, '초등을 전부 맞히면 더 배울 게 없으니 중등'],
  [lvl(6, 1, 0, 0), 2, '초등만 알아도 공부는 중등부터'],
  [lvl(4, 2, 0, 0), 1, '초등 4/6 통과·중등 2/6 미달 → 초등'],
  [lvl(3, 6, 6, 6), 1, '초등 3/6이면 초등'],
  [lvl(5, 5, 4, 2), 3, '고등 4/6도 통과 → 고등'],
  [lvl(6, 6, 5, 3), 3, '고등 5/6은 편안, 실전 3/6은 버거움 → 고등'],
  [lvl(6, 6, 6, 3), 4, '고등까지 전부 맞히면 실전'],
  [lvl(6, 3, 6, 6), 2, '중등에서 막히면(3/6) 그 위 점수와 무관하게 중등'],
])
  if (got !== want) fail('placeLevel', `${why}: ${got} ≠ ${want}`);

// ---------- 새 문제 순서(같은 패턴이 연달아 나오지 않게) ----------
const { freshOrder } = await import('../src/queue.js');
{
  const a = freshOrder(GRAMMAR, 2).map(x => x.id).join();
  const b = freshOrder(GRAMMAR, 2).map(x => x.id).join();
  if (a !== b) fail('freshOrder', '순서가 호출마다 달라짐(하루 안에서는 같아야 함)');
  const first = freshOrder(GRAMMAR, 2).slice(0, 6);
  if (first.some(x => x.lv !== 2)) fail('freshOrder', '내 레벨 문제부터 나오지 않음');
  if (new Set(first.map(x => x.tag)).size !== 6) fail('freshOrder', `하루치 6문제의 문법 패턴이 겹침: ${first.map(x => x.tag).join(', ')}`);
  const rank = x => (x.lv >= 2 ? x.lv - 2 : 12 - x.lv);
  const ranks = freshOrder(GRAMMAR, 2).map(rank);
  if (ranks.some((r, i) => i && r < ranks[i - 1])) fail('freshOrder', '레벨 순서(내 레벨 → 위 → 아래)가 깨짐');
  if (freshOrder(WORDS, 1).slice(0, 15).some(x => x.lv !== 1)) fail('freshOrder', '단어도 내 레벨부터 나와야 함');
}

// ---------- 숨김 단어(너무 쉬운 1단계) ----------
{
  const hidden = load('hidden.json');
  const byId = new Map(WORDS.map(w => [w.id, w]));
  for (const id of hidden) if (!byId.has(id)) fail('hidden', `없는 단어 id ${id}`);
  for (const en of ['dog', 'cat', 'apple', 'red']) {
    const w = WORDS.find(x => x.en === en);
    if (w && !hidden.includes(w.id)) fail('hidden', `너무 쉬운 "${en}"이 숨김 목록에 없음`);
  }
  const shown = WORDS.filter(w => w.lv === 1 && !hidden.includes(w.id));
  if (shown.length < 20) fail('hidden', `1단계에 남은 단어가 너무 적음(${shown.length})`);
}

// ---------- 형태 안내(표제어와 다른 빈칸 정답) ----------
const { formName } = await import('../public/grade.js');
for (const [a, e, want] of [
  ['participated', 'participate', '과거형·과거분사'],
  ['went', 'go', '과거형·과거분사'],
  ['running', 'run', '진행형·동명사(-ing)'],
  ['apples', 'apple', '복수형 또는 3인칭 단수(-s)'],
  ['took part in', 'take part in', '과거형·과거분사'],
  ['apple', 'apple', ''],
  ['children', 'child', '다른 형태'],
])
  if (formName(a, e) !== want) fail('formName', `${a}/${e}: "${formName(a, e)}" ≠ "${want}"`);

// ---------- 블라인드 답안(선택) ----------
const blind = process.argv[2];
if (blind) {
  const answers = JSON.parse(readFileSync(blind, 'utf8'));
  const byId = new Map([...WORDS, ...GRAMMAR].map(x => [x.id, x]));
  let n = 0;
  for (const [id, given] of Object.entries(answers)) {
    const x = byId.get(id);
    if (!x) continue;
    n++;
    const key = x.ex ? [blankParts(x.ex)[1], ...(x.alt || [])] : [blankParts(x.s)[1], ...x.alt];
    if (grade(String(given), key) !== 'ok') fail(id, `블라인드 답 "${given}" ≠ 정답 [${key.join(' | ')}]`);
  }
  console.log(`블라인드 답안 ${n}개 채점`);
}

console.log(`단어 ${WORDS.length} · 문법 ${GRAMMAR.length} · 유의어 묶음 ${GROUPS.length}`);
if (fails.length) {
  console.log(`실패 ${fails.length}건`);
  console.log(fails.join('\n'));
  process.exit(1);
}
console.log('모든 문제 통과 ✓');
