// 채점 로직 — 브라우저(app.js)와 전수 테스트(test/content.mjs)가 같은 코드를 쓴다
export const plain = s => s.replace(/[{}]/g, '');
export const blankParts = s => /^(.*?)\{(.+?)\}(.*)$/s.exec(s)?.slice(1) ?? [s, '', ''];

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export function norm(s) {
  return ` ${s ?? ''} `
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,!?;:"“”]/g, ' ')
    .replace(/\b(\d{1,2})\b/g, (m, d) => NUM[+d] ?? m) // 음성 인식이 숫자로 받아 적는 경우
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b|\bcannot\b/g, 'can not')
    .replace(/n't\b/g, ' not')
    .replace(/'m\b/g, ' am')
    .replace(/'re\b/g, ' are')
    .replace(/'ve\b/g, ' have')
    .replace(/'ll\b/g, ' will')
    .replace(/'([sd])\b/g, " '$1") // 소유격·약형 's/'d는 따로 떼어 둔다(Children's → children 's)
    .replace(/\s+/g, ' ')
    .trim();
}

// 's / 'd 는 뜻이 둘이라(is·has / would·had) 가능한 풀이를 모두 만들어 비교한다
const S_RE = "\\b(it|that|there|here|he|she|what|who|where|how|when|why|everything|nothing|everyone|someone|somebody|nobody) 's(?= |$)";
const D_RE = "\\b(i|you|he|she|it|we|they|that|there|who) 'd(?= |$)";
export function variants(s) {
  let out = [norm(s)];
  for (const [re, reps] of [
    [S_RE, ['$1 is', '$1 has']],
    [D_RE, ['$1 would', '$1 had']],
  ]) {
    out = out.flatMap(v => (new RegExp(re).test(v) ? [v, ...reps.map(r => v.replace(new RegExp(re, 'g'), r))] : [v]));
  }
  return out;
}

export function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

// 'ok' | 'close'(철자 1글자 차이, 오답 처리) | 'bad'
export function grade(input, answers) {
  const xs = variants(input);
  if (!xs[0]) return 'bad';
  const as = answers.flatMap(variants);
  if (xs.some(x => as.includes(x))) return 'ok';
  // 휴대폰에서 아포스트로피 없이 친 경우(dont, lets, im)도 정답
  const bare = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (answers.some(a => bare(a) === bare(input))) return 'ok';
  return as.some(a => a.length >= 4 && xs.some(x => lev(x, a) === 1)) ? 'close' : 'bad';
}

// 말로 답할 때: 문장 전체를 말해도, 빈칸만 말해도 되게 앞뒤 문맥 단어를 떼어 낸다
function stripContext(x, before, after) {
  let w = x.split(' ').filter(Boolean);
  const b = norm(before).split(' ').filter(Boolean);
  const f = norm(after).split(' ').filter(Boolean);
  for (let k = Math.min(b.length, w.length - 1); k > 0; k--)
    if (b.slice(-k).join(' ') === w.slice(0, k).join(' ')) {
      w = w.slice(k);
      break;
    }
  for (let k = Math.min(f.length, w.length - 1); k > 0; k--)
    if (f.slice(0, k).join(' ') === w.slice(-k).join(' ')) {
      w = w.slice(0, -k);
      break;
    }
  return w.join(' ');
}

// 음성 인식 후보들 중 정답이 되는 것이 있으면 그걸, 없으면 가장 그럴듯한 받아쓰기를 돌려준다
export function fromSpeech(transcripts, answers, before, after) {
  for (const t of transcripts) {
    for (const c of [norm(t), stripContext(norm(t), before, after)]) if (grade(c, answers) === 'ok') return c;
  }
  return stripContext(norm(transcripts[0] || ''), before, after);
}

// 빈칸 자리표시: 글자 수만 점으로 보여 주고 정답 글자는 절대 노출하지 않는다
export const maskAnswer = ans => ans.replace(/[^\s]/g, '·');

// 빈칸 정답이 표제어와 다른 형태일 때 그 형태의 이름(안내용 추정). 같으면 빈 문자열
const IRREG_PAST =
  /^(went|ran|ate|saw|took|came|gave|made|got|had|was|were|did|said|bought|thought|felt|left|met|told|found|wrote|spoke|broke|drove|knew|grew|threw|drew|won|lost|hid|bit|chose|wore|woke|rode|flew|fell|kept|slept|sent|spent|built|lent|meant|dealt|lit|shot|struck|stuck|hung|dug|fed|bled|fled|brought|caught|taught|fought|sought|began|drank|sang|rang|became|shook|paid|laid|held|sold|stood|understood|tore|bore|froze|forgot|forgave|overcame|underwent|withdrew|misled|wound|bent|sank|shrank|stole|wove|clung|dove|swam|sat|led|gone|done|seen|eaten|taken|given|written|spoken|broken|driven|known|grown|thrown|drawn|chosen|worn|woken|ridden|flown|fallen|forgotten|hidden|bitten|begun|drunk|sung)$/;
export function formName(ans, en) {
  const a = norm(ans).split(' ')[0];
  const e = norm(en).split(' ')[0]; // 구동사는 첫 단어(동사)로 판단
  if (a === e) return '';
  if (a.endsWith('ing')) return '진행형·동명사(-ing)';
  if (a.endsWith('ed') || IRREG_PAST.test(a)) return '과거형·과거분사';
  if (a.endsWith('s') && !e.endsWith('s')) return '복수형 또는 3인칭 단수(-s)';
  if (a.endsWith('er') || a.endsWith('est')) return '비교급·최상급';
  return '다른 형태';
}
