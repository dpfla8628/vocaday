// 전 문항 자동 테스트: 모든 단어·문법 문제를 실제 채점 코드로 풀어 보고 문제-정답이 맞는지 확인한다.
// 실행: npm test   (실패가 있으면 목록을 출력하고 exit 1)
// 선택: node test/content.mjs <blind-answers.json>  — 정답을 모르는 상태로 푼 답안을 채점(모호한 문제 찾기)
import { readFileSync, existsSync } from 'node:fs';
import { plain, blankParts, norm, grade, fromSpeech, maskAnswer } from '../public/grade.js';
import { makePicker, senses } from '../src/distractors.js';

const load = f => JSON.parse(readFileSync(new URL('../content/' + f, import.meta.url), 'utf8'));
const WORDS = [1, 2, 3, 4].flatMap(n => load(`words_lv${n}.json`));
const GRAMMAR = [...load('grammar_lv12.json'), ...load('grammar_lv34.json')];
const GROUPS = existsSync(new URL('../content/confusables.json', import.meta.url)) ? load('confusables.json') : [];
const POS = ['명', '동', '형', '부', '전', '접', '대', '조', '감', '숙어'];

const fails = [];
const fail = (id, msg) => fails.push(`${id}: ${msg}`);
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const ONE_BLANK = /^[^{}]*\{[^{}]+\}[^{}]*$/;
const hasWord = (text, w) => ` ${norm(text)} `.includes(` ${norm(w)} `);

// 불규칙 변화형(원형 앞부분과 안 닮은 것)
const IRREGULAR = {
  go: ['went', 'gone'], buy: ['bought'], bring: ['brought'], think: ['thought'], catch: ['caught'], teach: ['taught'],
  fight: ['fought'], seek: ['sought'], be: ['was', 'were', 'is', 'are', 'am', 'been'], have: ['has', 'had'],
  do: ['did', 'does', 'done'], run: ['ran'], eat: ['ate'], see: ['saw', 'seen'], sit: ['sat'], swim: ['swam'],
  begin: ['began', 'begun'], drink: ['drank', 'drunk'], sing: ['sang', 'sung'], ring: ['rang'], give: ['gave'],
  come: ['came'], become: ['became'], take: ['took'], shake: ['shook'], make: ['made'], say: ['said'], pay: ['paid'],
  lay: ['laid'], fall: ['fell'], feel: ['felt'], keep: ['kept'], sleep: ['slept'], leave: ['left'], meet: ['met'],
  lead: ['led'], hold: ['held'], tell: ['told'], sell: ['sold'], find: ['found'], stand: ['stood'],
  understand: ['understood'], wear: ['wore', 'worn'], tear: ['tore', 'torn'], bear: ['bore', 'born'],
  choose: ['chose', 'chosen'], freeze: ['froze', 'frozen'], speak: ['spoke', 'spoken'], break: ['broke', 'broken'],
  wake: ['woke', 'woken'], write: ['wrote', 'written'], ride: ['rode', 'ridden'], drive: ['drove', 'driven'],
  rise: ['rose', 'risen'], arise: ['arose', 'arisen'], fly: ['flew', 'flown'], grow: ['grew', 'grown'],
  know: ['knew', 'known'], throw: ['threw', 'thrown'], draw: ['drew', 'drawn'], win: ['won'], lose: ['lost'],
  get: ['got', 'gotten'], forget: ['forgot', 'forgotten'], hide: ['hid', 'hidden'], bite: ['bit', 'bitten'],
  child: ['children'], man: ['men'], woman: ['women'], person: ['people'], foot: ['feet'], tooth: ['teeth'],
  mouse: ['mice'], good: ['better', 'best'], bad: ['worse', 'worst'], well: ['better', 'best'], many: ['more', 'most'],
  much: ['more', 'most'], little: ['less', 'least'], far: ['farther', 'further'], hear: ['heard'], send: ['sent'],
  spend: ['spent'], build: ['built'], lend: ['lent'], mean: ['meant'], deal: ['dealt'], light: ['lit'],
  shoot: ['shot'], strike: ['struck'], stick: ['stuck'], swing: ['swung'], hang: ['hung'], dig: ['dug'],
  feed: ['fed'], bleed: ['bled'], flee: ['fled'], forgive: ['forgave', 'forgiven'], overcome: ['overcame'],
  undergo: ['underwent', 'undergone'], withdraw: ['withdrew', 'withdrawn'], mislead: ['misled'], wind: ['wound'],
  bend: ['bent'], spread: ['spread'], sink: ['sank', 'sunk'], shrink: ['shrank', 'shrunk'], steal: ['stole', 'stolen'],
  weave: ['wove', 'woven'], cling: ['clung'], dive: ['dove'], prove: ['proven'], i: ['me', 'my'], we: ['us', 'our'],
};
// 표제어(구동사 포함)와 빈칸 형태가 같은 단어에서 나온 것인지
function sameLexeme(en, braced) {
  const a = norm(en).split(' ');
  const b = norm(braced).split(' ');
  if (a.length !== b.length) return a.length > 1 && b.join(' ').includes(a.slice(1).join(' ')) && sameLexeme(a[0], b[0]);
  return a.every((w, i) => {
    const v = b[i];
    if (w === v || IRREGULAR[w]?.includes(v)) return true;
    let p = 0;
    while (p < w.length && w[p] === v[p]) p++;
    return p >= Math.min(3, w.length - 1); // 규칙 변화(-s, -ed, -ing, -er, -ies, 자음 중복 …)
  });
}

// 약형·풀어 쓴 형태로 바꿔 입력해도 정답 처리되는지 확인용
const CONTRACT = [
  [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bdid not\b/gi, "didn't"], [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"], [/\bwas not\b/gi, "wasn't"], [/\bwill not\b/gi, "won't"], [/\bcannot\b/gi, "can't"],
  [/\bI am\b/gi, "I'm"], [/\b(it|that|there|he|she|what|who|where) is\b/gi, "$1's"], [/\b(I|you|we|they) have\b/gi, "$1've"],
  [/\b(I|you|we|they|he|she|it) will\b/gi, "$1'll"], [/\b(I|you|we|they|he|she) would\b/gi, "$1'd"],
  [/\bdon't\b/gi, 'do not'], [/\bdoesn't\b/gi, 'does not'], [/\bdidn't\b/gi, 'did not'], [/\bisn't\b/gi, 'is not'],
  [/\bwon't\b/gi, 'will not'], [/\bcan't\b/gi, 'cannot'], [/\bI'm\b/gi, 'I am'], [/\b(it|that|there|what|who|where)'s\b/gi, '$1 is'],
  [/\b(\w+)'ve\b/gi, '$1 have'], [/\b(\w+)'ll\b/gi, '$1 will'], [/\b(I|you|we|they|he|she)'d\b/gi, '$1 would'],
];

function checkCloze(id, sentence, answers) {
  const [before, ans, after] = blankParts(sentence);
  const full = plain(sentence);
  // 1) 타자: 정답·대체 정답을 대소문자·마침표·공백을 바꿔 넣어도 정답
  for (const a of answers) {
    for (const v of [a, a.toUpperCase(), ` ${a}. `, a.replace(/\s+/g, '  ')]) if (grade(v, answers) !== 'ok') fail(id, `정답 "${v}"이 오답 처리됨`);
    for (const [re, to] of CONTRACT) {
      if (!re.test(a)) continue;
      re.lastIndex = 0;
      const v = a.replace(re, to);
      re.lastIndex = 0;
      if (grade(v, answers) !== 'ok') fail(id, `"${a}"의 다른 표기 "${v}"이 오답 처리됨`);
    }
  }
  // 2) 오답은 오답
  for (const w of ['banana', 'xyzzy', '']) if (grade(w, answers) === 'ok') fail(id, `엉뚱한 답 "${w}"이 정답 처리됨`);
  // 3) 음성: 빈칸만 / 문장 전체 / 앞뒤 한 단어 포함해서 말해도 정답
  const say = [ans, full, [before.trim().split(/\s+/).pop(), ans, after.trim().split(/\s+/)[0]].filter(Boolean).join(' ')];
  for (const t of say) if (grade(fromSpeech([t], answers, before, after), answers) !== 'ok') fail(id, `음성 "${t}"이 오답 처리됨`);
  const wrongSentence = `${before} banana ${after}`;
  if (grade(fromSpeech([wrongSentence], answers, before, after), answers) === 'ok') fail(id, `틀린 문장을 말해도 정답 처리됨`);
  // 4) 빈칸 정답이 문장 다른 곳에 그대로 보이면 문제가 아님
  if (hasWord(`${before} ${after}`, ans) && norm(ans).length > 3) fail(id, `정답 "${ans}"이 문장에 이미 보임`);
}

// ---------- 단어 ----------
const ids = new Set();
const ens = new Set();
for (const w of WORDS) {
  const id = w.id;
  if (ids.has(id)) fail(id, 'id 중복');
  ids.add(id);
  if (ens.has(w.en)) fail(id, `단어 중복 ${w.en}`);
  ens.add(w.en);
  for (const k of ['en', 'ko', 'pos', 'ex', 'exKo']) if (!w[k]) fail(id, `${k} 없음`);
  if (!POS.includes(w.pos)) fail(id, `품사 ${w.pos}`);
  if (![1, 2, 3, 4].includes(w.lv)) fail(id, `레벨 ${w.lv}`);
  if (!ONE_BLANK.test(w.ex)) {
    fail(id, '빈칸이 정확히 하나가 아님');
    continue;
  }
  const ans = blankParts(w.ex)[1];
  if (!sameLexeme(w.en, ans)) fail(id, `빈칸 "${ans}"이 단어 "${w.en}"의 형태가 아님`);
  if (/[a-z]{3,}/i.test(w.exKo) && hasWord(w.exKo, ans)) fail(id, '한국어 해석에 정답 영어가 그대로 있음');
  if (!senses(w.ko).length) fail(id, '뜻이 비어 있음');
  if (/[a-z]/i.test(maskAnswer(ans)) || maskAnswer(ans).length !== ans.length) fail(id, '빈칸 자리표시에 정답 글자가 보임');
  checkCloze(id, w.ex, [ans, ...(w.alt || [])]);
  for (const n of w.near || []) if (grade(n, [ans, ...(w.alt || [])]) === 'ok') fail(id, `near "${n}"이 정답과 같음`);
}

// 4지선다 보기: 정답과·서로 뜻이 겹치는 보기가 없어야 함 (무작위라 여러 번 뽑아 봄)
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
// 고정 오답 후보 전수 검사: 후보 6개 각각이 정답과 뜻이 겹치지 않아야 어떤 3개를 뽑아도 정답이 하나
const FIXED = load('distractors.json');
const EN = new Map(WORDS.map(w => [w.en, w]));
for (const w of WORDS) {
  const c = FIXED[w.id];
  if (!Array.isArray(c) || c.length < 3) {
    fail(w.id, '오답 후보가 3개 미만');
    continue;
  }
  if (new Set(c).size !== c.length) fail(w.id, '오답 후보 중복');
  for (const en of c) {
    const o = EN.get(en);
    if (!o) fail(w.id, `없는 단어 후보 "${en}"`);
    else if (o.en === w.en || o.ko === w.ko || overlap(w.en, o.en)) fail(w.id, `후보 뜻 겹침: ${w.en}(${w.ko}) ~ ${o.en}(${o.ko})`);
  }
  // 실제 출제 함수가 고정 후보만 쓰는지
  const opts = pick(w, shuffle, FIXED);
  if (opts.length !== 3 || opts.some(o => !c.includes(o.en))) fail(w.id, '출제 보기가 고정 후보 밖에서 나옴');
}

// ---------- 문법 ----------
for (const g of GRAMMAR) {
  const id = g.id;
  if (ids.has(id)) fail(id, 'id 중복');
  ids.add(id);
  for (const k of ['s', 'ko', 'tag', 'tip']) if (!g[k]) fail(id, `${k} 없음`);
  if (!Array.isArray(g.alt) || g.alt.some(a => typeof a !== 'string' || !a.trim())) fail(id, 'alt 형식');
  if (![1, 2, 3, 4].includes(g.lv)) fail(id, `레벨 ${g.lv}`);
  if (g.tip && g.tip.length > 45) fail(id, `팁이 너무 김(${g.tip.length}자)`);
  if (!ONE_BLANK.test(g.s)) {
    fail(id, '빈칸이 정확히 하나가 아님');
    continue;
  }
  const ans = blankParts(g.s)[1];
  checkCloze(id, g.s, [ans, ...(g.alt || [])]);
}

// 문법 블록: 오답 블록 2~3개, 한 단어씩, 정답 단어와 겹치지 않음
for (const g of GRAMMAR) {
  if (!ONE_BLANK.test(g.s)) continue;
  const words = blankParts(g.s)[1].toLowerCase().split(' ');
  if (!Array.isArray(g.bank) || g.bank.length < 2 || g.bank.length > 3) fail(g.id, '오답 블록(bank) 2~3개 필요');
  else for (const b of g.bank) if (/\s/.test(b) || words.includes(b.toLowerCase())) fail(g.id, `오답 블록 "${b}"이 정답과 겹치거나 공백 포함`);
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
