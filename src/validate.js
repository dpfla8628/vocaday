// 문항 하나 검사 — 전수 테스트(test/content.mjs)와 AI 자동 생성(src/generate.js)이 같은 규칙을 쓴다.
// fail(메시지)를 문제마다 부른다. 아무것도 안 부르면 통과.
import { plain, blankParts, norm, grade, fromSpeech, maskAnswer, lev } from '../public/grade.js';
import { senses } from './distractors.js';

export const POS = ['명', '동', '형', '부', '전', '접', '대', '조', '감', '숙어'];
export const ONE_BLANK = /^[^{}]*\{[^{}]+\}[^{}]*$/;
export const hasWord = (text, w) => ` ${norm(text)} `.includes(` ${norm(w)} `);

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
export function sameLexeme(en, braced) {
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

function checkCloze(sentence, answers, fail) {
  const [before, ans, after] = blankParts(sentence);
  const full = plain(sentence);
  // 1) 타자: 정답·대체 정답을 대소문자·마침표·공백을 바꿔 넣어도 정답
  for (const a of answers) {
    for (const v of [a, a.toUpperCase(), ` ${a}. `, a.replace(/\s+/g, '  ')]) if (grade(v, answers) !== 'ok') fail(`정답 "${v}"이 오답 처리됨`);
    for (const [re, to] of CONTRACT) {
      if (!re.test(a)) continue;
      re.lastIndex = 0;
      const v = a.replace(re, to);
      re.lastIndex = 0;
      if (grade(v, answers) !== 'ok') fail(`"${a}"의 다른 표기 "${v}"이 오답 처리됨`);
    }
  }
  // 2) 오답은 오답
  for (const w of ['banana', 'xyzzy', '']) if (grade(w, answers) === 'ok') fail(`엉뚱한 답 "${w}"이 정답 처리됨`);
  // 3) 음성: 빈칸만 / 문장 전체 / 앞뒤 한 단어 포함해서 말해도 정답
  const say = [ans, full, [before.trim().split(/\s+/).pop(), ans, after.trim().split(/\s+/)[0]].filter(Boolean).join(' ')];
  for (const t of say) if (grade(fromSpeech([t], answers, before, after), answers) !== 'ok') fail(`음성 "${t}"이 오답 처리됨`);
  const wrongSentence = `${before} banana ${after}`;
  if (grade(fromSpeech([wrongSentence], answers, before, after), answers) === 'ok') fail(`틀린 문장을 말해도 정답 처리됨`);
  // 4) 빈칸 정답이 문장 다른 곳에 그대로 보이면 문제가 아님
  if (hasWord(`${before} ${after}`, ans) && norm(ans).length > 3) fail(`정답 "${ans}"이 문장에 이미 보임`);
}

// 단어 문항: 형식·빈칸·채점
export function checkWord(w, fail) {
  for (const k of ['en', 'ko', 'pos', 'ex', 'exKo']) if (!w[k]) fail(`${k} 없음`);
  if (!POS.includes(w.pos)) fail(`품사 ${w.pos}`);
  if (![1, 2, 3, 4].includes(w.lv)) fail(`레벨 ${w.lv}`);
  if (!ONE_BLANK.test(w.ex ?? '')) return fail('빈칸이 정확히 하나가 아님');
  const ans = blankParts(w.ex)[1];
  if (!sameLexeme(w.en, ans)) fail(`빈칸 "${ans}"이 단어 "${w.en}"의 형태가 아님`);
  if (/[a-z]{3,}/i.test(w.exKo) && hasWord(w.exKo, ans)) fail('한국어 해석에 정답 영어가 그대로 있음');
  if (!senses(w.ko).length) fail('뜻이 비어 있음');
  if (/[a-z]/i.test(maskAnswer(ans)) || maskAnswer(ans).length !== ans.length) fail('빈칸 자리표시에 정답 글자가 보임');
  checkCloze(w.ex, [ans, ...(w.alt || [])], fail);
  for (const n of w.near || []) if (grade(n, [ans, ...(w.alt || [])]) === 'ok') fail(`near "${n}"이 정답과 같음`);
}

// '하다'·'되다' 같은 어미만 남은 뜻(예: (경기를) 하다)은 비교에서 뺀다 — 기도하다·지불하다와 겹친다고 잘못 잡지 않게
const GENERIC = new Set(['하다', '되다', '이다']);
export const sensesClash = (a, b) => {
  const [x, y] = [a.filter(s => !GENERIC.has(s)), b.filter(s => !GENERIC.has(s))];
  return x.some(p => y.some(q => p === q || (p.length >= 2 && q.includes(p)) || (q.length >= 2 && p.includes(q))));
};
// 철자가 비슷한 함정 보기(weather/whether, endure/endorse, look up to/look forward to)인지
export const lookAlike = (a, b) => {
  const [x, y] = [norm(a), norm(b)];
  if (x.includes(' ') && x.split(' ')[0] === y.split(' ')[0]) return true; // 같은 동사의 구동사
  let p = 0;
  while (p < x.length && x[p] === y[p]) p++;
  const d = lev(x, y);
  return p >= 3 || d <= 3 || (p >= 2 && d <= Math.ceil(Math.max(x.length, y.length) / 2) + 1);
};

// 고정 오답 후보 6개: 후보 각각이 정답과 뜻이 겹치지 않아야 어떤 3개를 뽑아도 정답이 하나
// EN: 단어장 표제어 → 문항, overlap(a, b): 단어장 두 단어의 뜻 겹침·유의어 묶음
export function checkDistractors(w, c, { EN, overlap }, fail) {
  if (!Array.isArray(c) || c.length < 6) return fail('오답 후보가 6개 미만');
  if (c.some(x => typeof x !== 'object' || !x.en?.trim() || !x.ko?.trim())) return fail('오답 후보 형식({en, ko})');
  if (new Set(c.map(x => norm(x.en))).size !== c.length) fail('오답 후보 중복');
  for (const x of c) {
    if (norm(x.en) === norm(w.en)) fail(`후보가 정답 자체: ${x.en}`);
    if (x.ko === w.ko || sensesClash(senses(w.ko), senses(x.ko))) fail(`후보 뜻 겹침: ${w.en}(${w.ko}) ~ ${x.en}(${x.ko})`);
    const o = EN.get(x.en);
    if (o) {
      if (EN.has(w.en) && overlap(w.en, o.en)) fail(`후보가 유의어 묶음/뜻 겹침: ${w.en}(${w.ko}) ~ ${o.en}(${o.ko})`);
      else if (!EN.has(w.en) && sensesClash(senses(w.ko), senses(o.ko))) fail(`후보 뜻 겹침(단어장 뜻): ${w.en}(${w.ko}) ~ ${o.en}(${o.ko})`);
      // 쉬운 단어는 철자 함정일 때만 허용(rice·bread 같은 쉬운 '아무 단어'는 금지)
      if (o.lv < w.lv && !lookAlike(w.en, o.en)) fail(`후보가 정답보다 쉬움: ${o.en}(lv${o.lv}) < ${w.en}(lv${w.lv})`);
    }
  }
}

// 문법 문항: 형식·빈칸·채점·오답 블록
export function checkGrammar(g, fail) {
  for (const k of ['s', 'ko', 'tag', 'tip']) if (!g[k]) fail(`${k} 없음`);
  if (!Array.isArray(g.alt) || g.alt.some(a => typeof a !== 'string' || !a.trim())) fail('alt 형식');
  if (![1, 2, 3, 4].includes(g.lv)) fail(`레벨 ${g.lv}`);
  if (g.tip && g.tip.length > 45) fail(`팁이 너무 김(${g.tip.length}자)`);
  if (!ONE_BLANK.test(g.s ?? '')) return fail('빈칸이 정확히 하나가 아님');
  const ans = blankParts(g.s)[1];
  checkCloze(g.s, [ans, ...(Array.isArray(g.alt) ? g.alt : [])], fail);
  // 문법 블록: 오답 블록 2~3개, 한 단어씩, 정답 단어와 겹치지 않음
  const words = ans.toLowerCase().split(' ');
  if (!Array.isArray(g.bank) || g.bank.length < 2 || g.bank.length > 3) fail('오답 블록(bank) 2~3개 필요');
  else for (const b of g.bank) if (typeof b !== 'string' || /\s/.test(b) || words.includes(b.toLowerCase())) fail(`오답 블록 "${b}"이 정답과 겹치거나 공백 포함`);
}
