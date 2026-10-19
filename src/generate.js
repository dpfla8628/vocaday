// 새 문제 자동 생성: 고정 문제가 바닥나지 않게 Cloudflare 무료 AI(Qwen)로 만든다.
// 전수 테스트와 같은 규칙(src/validate.js)을 통과하고, AI가 정답을 모른 채 다시 풀어 맞힌 것만 쓴다(애매한 문제 거르기).
import { blankParts, maskAnswer, norm, plain, grade } from '../public/grade.js';
import { checkWord, checkDistractors, checkGrammar, sensesClash, lookAlike } from './validate.js';
import { senses } from './distractors.js';

// 만드는 모델과 푸는 모델을 다르게 — 같은 모델은 자기 실수를 못 잡는다(env.GEN_MODEL·env.CHECK_MODEL로 바꿀 수 있음)
// 2026-10-19 무료 플랜 비교: llama-3.3-70b는 뜻에 한자가 섞임, gpt-oss-120b는 생성이 느림 → Qwen이 만들고 gpt-oss가 푼다
export const GEN_MODEL = '@cf/qwen/qwen3.8-27b';
export const CHECK_MODEL = '@cf/openai/gpt-oss-120b';

const LEVEL = { 1: 'elementary school', 2: 'Korean middle school essentials', 3: 'Korean high school / CSAT (수능)', 4: 'TOEIC and advanced native conversation' };
const THEMES = {
  word: ['work and office', 'meetings and projects', 'money and finance', 'health and medicine', 'travel and airports', 'shopping and customer service',
    'feelings and personality', 'relationships', 'news and society', 'science and technology', 'environment', 'law and rules', 'media and entertainment',
    'food and cooking', 'housing', 'education', 'sports', 'phrasal verbs in daily conversation', 'idioms in casual conversation', 'describing people and things'],
  grammar: ['making polite requests', 'giving opinions', 'complaining politely', 'small talk', 'making plans', 'work emails', 'phone calls', 'restaurants',
    'travel problems', 'apologizing', 'reacting with surprise', 'regrets and hypotheticals', 'advice and suggestions', 'storytelling about the past',
    'comparisons', 'conditionals', 'emphasis and inversion', 'reported speech', 'participle clauses', 'relative clauses'],
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);
// 한국어 뜻·해석: 한글이 있고 한자(察知하다 같은)는 없어야 한다
const hangul = s => typeof s === 'string' && /[가-힣]/.test(s) && !/[㐀-鿿]/.test(s);
const str = v => (typeof v === 'string' ? v.trim() : '');
const strs = v => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

async function ask(env, model, prompt, max_tokens) {
  const out = await env.AI.run(model, {
    messages: [{ role: 'user', content: prompt }],
    max_tokens,
    temperature: 0.7,
    chat_template_kwargs: { enable_thinking: false },
  });
  const raw = out?.response ?? out?.choices?.[0]?.message?.content ?? '';
  if (typeof raw === 'object') return raw;
  const m = /[[{][\s\S]*[\]}]/.exec(raw);
  try {
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

// 단어는 표제어 후보를 먼저 받아 이미 있는 단어를 뺀 뒤 그 단어들로만 만든다(한 번에 시키면 아는 단어만 또 냄)
const headwordPrompt = (lv, theme) => `List 25 English headwords (single words, phrasal verbs or idioms) for Korean learners. Level: ${LEVEL[lv]}. Theme: ${theme}.
Commonly used in news, work, school and daily conversation; useful; right for the level; not too basic. No technical jargon (cooking, medicine, law terms), no slang, no proper nouns, no placeholders like "something"/"someone". Return ONLY a JSON array of lowercase strings.`;

const wordPrompt = (lv, targets, examples) => `You write English vocabulary quiz items for Korean learners. Level: ${LEVEL[lv]}.
Write exactly one item for EACH of these headwords: ${targets.join(', ')}
Return ONLY a JSON array of ${targets.length} objects, no other text. Each object:
- "en": the headword exactly as given
- "ko": its core Korean meaning(s), 1-2 senses separated by ", ", in dictionary form matching the part of speech (verb → ~하다, adjective → ~한/~적인, noun → noun)
- "pos": one of 명 동 형 부 전 접 숙어
- "ex": one natural English sentence (lowercase except sentence start and proper nouns); the headword or its inflected form wrapped in {curly braces} exactly once
- "exKo": natural Korean translation of "ex" (no English)
- "distractors": exactly 10 objects {"en","ko"}: real English words that LOOK or SOUND similar to the headword (same part of speech if possible) but have clearly DIFFERENT meanings, with their correct Korean meaning
Rules: knowing "ko", "exKo" and the letter count, only one word fits the blank. The headword must not appear elsewhere in the sentence. No distractor may mean the same as the headword or as another distractor.
Examples (distractors omitted here — you must include all 10):
${examples.map(x => JSON.stringify(x)).join('\n')}`;

const grammarPrompt = (lv, n, examples) => `You write English grammar / expression fill-in-the-blank items for Korean learners. Level: ${LEVEL[lv]}. Situation: ${pick(THEMES.grammar)}.
Return ONLY a JSON array of ${n} objects, no other text. Each object:
- "tag": short pattern name, a grammar point in Korean (e.g. "가정법 과거완료") or "패턴: <English pattern>"
- "s": one natural English sentence with the WHOLE target pattern wrapped in {curly braces} exactly once (for "패턴: hold the line" the braces must contain "hold the line", not just "hold"); normal capitalization (capital only at sentence start)
- "ko": natural Korean translation of "s"
- "tip": Korean explanation of the pattern, under 40 characters
- "bank": 2-3 tempting WRONG single words (no spaces, not words of the answer)
Rule: knowing "tag" and "ko", only ONE fill is correct — avoid sentences where another word would also work. Use varied patterns.
Examples:
${examples.map(x => JSON.stringify(x)).join('\n')}`;

const REVIEW = `You are a strict reviewer of English quiz items for Korean learners. Check each item carefully.
Set "ok": false if ANY of these is true: the English sentence is unnatural or ungrammatical; the Korean translation or meaning is inaccurate; the Korean meaning's form does not match the part of speech (e.g. an adjective glossed as a verb); the word is too rare, technical or slangy for a general learner; the tip is wrong; the Korean has typos or sounds unnatural; another common word or phrase would fit the blank equally well; (grammar) the blank does not contain the whole pattern named in the tag; (grammar) the wrong blocks could form a correct answer or are not real English words.
For word items, list in "bad" the numbers of wrong options whose meaning is the same as or close to the answer (including variations of the same phrase), or whose Korean meaning is wrong. Spelling look-alikes with clearly different meanings are fine.
Return ONLY a JSON object keyed by item number: {"0": {"ok": true, "bad": [], "why": ""}, ...}
Items:`;

// 규칙 검사(validate.js) 앞단: 생성 모델이 자주 내는 실수. 사유 문자열을 돌려주면 탈락
const PLACEHOLDER = /\b(something|someone|somebody|sth|sb|one's)\b/;
const tokens = s => norm(s).split(' ').filter(t => /[a-z]/.test(t) && !['sb', 'sth', 'o', 'v', 'a', 'b', 'n', 'ing', 'adj', 'p', 'pp'].includes(t));
function wordSmell(x) {
  if (PLACEHOLDER.test(x.en)) return '표제어에 자리표시(something 등)';
  const ss = x.ko.replace(/\(.*?\)/g, '').split(/[,/;]/).map(s => s.trim()).filter(Boolean); // senses()는 괄호 안 ·까지 쪼개서 여기선 안 씀
  if (x.pos === '동' && !ss.every(s => s.endsWith('다'))) return '동사 뜻이 ~다 꼴이 아님';
  if (x.pos === '명' && ss.some(s => /[가-힣]다$/.test(s) && !/(바다|소다|판다)$/.test(s))) return '명사 뜻이 서술형';
  if (x.pos === '형' && ss.some(s => /[가-힣]다$/.test(s))) return '형용사 뜻이 서술형'; // 단어장 형용사 뜻은 전부 '~한/~인' 꼴(뜨겁다 ✗ → 몹시 뜨거운)
  return '';
}
function grammarSmell(x) {
  const [before, ans] = blankParts(x.s);
  if (/^[A-Z]/.test(ans) && before.trim() && !/[.!?:]$/.test(before.trim()) && !/^I\b/.test(ans)) return '문장 중간 대문자';
  if (x.tag.startsWith('패턴')) {
    // 빈칸이 패턴의 끝 단어를 담거나 단어 대부분(60%)을 담아야 한다 — "hold the line"인데 빈칸이 hold뿐이면 탈락
    // ("I'm looking forward to" / "to seeing"처럼 사람이 만든 문항은 끝 단어 기준으로 통과)
    const want = tokens(x.tag.replace(/^패턴\s*:/, '').replace(/\(.*?\)/g, ''));
    const have = new Set(tokens(ans));
    if (want.length && !have.has(want.at(-1)) && want.filter(t => have.has(t)).length < Math.ceil(want.length * 0.6)) return '빈칸에 패턴이 다 안 들어감';
  }
  return '';
}

// 블라인드 풀이: 정답 없이 문제지만 주고 풀게 한다
function blindSheet(items) {
  const lines = [];
  const key = {};
  items.forEach((x, i) => {
    const [b, ans, a] = blankParts(x.ex ?? x.s);
    if (x.kind === 'word') {
      lines.push(`w${i} fill | meaning: ${x.ko} | translation: ${x.exKo} | ${b}[${maskAnswer(ans)}]${a} (${ans.replace(/ /g, '').length} letters)`);
      const opts = sample([x.en, ...x.distractors.slice(0, 6).map(d => d.en)], 7);
      const letters = 'ABCDEFG';
      key[`w${i}c`] = letters[opts.indexOf(x.en)];
      lines.push(`w${i}c choose | which ONE option means "${x.ko}"? | ${opts.map((o, j) => `${letters[j]}) ${o}`).join('  ')}`);
    } else lines.push(`g${i} fill | pattern: ${x.tag} | translation: ${x.ko} | ${b}___${a}`);
  });
  return { lines, key };
}

// items: 이미 있는 문항 전부(중복 방지·예시용), EN: 단어장 표제어 → 문항(오답 후보 검사용), fixed: 고정 오답 후보
export async function generate(env, kind, lv, { items, EN, fixed }, n = 10) {
  const same = items.filter(x => x.kind === kind && x.lv === lv);
  const seen = new Set(items.map(x => norm(kind === 'word' ? x.en ?? '' : plain(x.s ?? ''))));
  // 단어장·예문에 한 번이라도 나온 영어 단어 = 아는 단어. 오답 블록이 여기 없으면(wouldly, wasn 같은 비단어) 버린다
  const known = new Set();
  const addWords = s => { for (const w of String(s ?? '').toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []) known.add(w); };
  for (const x of items) { addWords(x.en); addWords(x.ex); addWords(x.s); (x.alt ?? []).forEach(addWords); (x.bank ?? []).forEach(addWords); (x.distractors ?? []).forEach(d => addWords(d.en)); }
  const tagsInBatch = new Set(); // 한 묶음 안에서 같은 패턴은 하나만
  // 예시의 오답 후보는 고정 문항이라 6개뿐 → 10개를 달라는 지시와 헷갈리지 않게 예시에서는 뺀다
  const examples = sample(same, 2).map(x =>
    kind === 'word' ? { en: x.en, ko: x.ko, pos: x.pos, ex: x.ex, exKo: x.exKo } : { tag: x.tag, s: x.s, ko: x.ko, tip: x.tip, bank: x.bank },
  );
  const model = env.GEN_MODEL || GEN_MODEL;
  const reasons = {};
  const reject = r => ((reasons[r] = (reasons[r] ?? 0) + 1), false);
  let raw;
  if (kind === 'word') {
    const cand = await ask(env, model, headwordPrompt(lv, pick(THEMES.word)), 600);
    const targets = [...new Set((Array.isArray(cand) ? cand : []).map(w => str(w).toLowerCase()))].filter(w => w && !seen.has(norm(w))).slice(0, n);
    if (!targets.length) return { items: [], tried: 0, reasons: { '새 표제어 없음': 1 } };
    raw = await ask(env, model, wordPrompt(lv, targets, examples), 5000);
  } else raw = await ask(env, model, grammarPrompt(lv, n, examples), 3000);

  // 1) 형식·규칙 검사(전수 테스트와 같은 규칙)
  const passed = (Array.isArray(raw) ? raw : []).filter(o => {
    if (!o || typeof o !== 'object') return reject('형식');
    const x =
      kind === 'word'
        ? { kind, lv, en: str(o.en).toLowerCase(), ko: str(o.ko), pos: str(o.pos), ex: str(o.ex), exKo: str(o.exKo), alt: [], near: [],
            distractors: (Array.isArray(o.distractors) ? o.distractors : []).map(d => ({ en: str(d?.en).toLowerCase(), ko: str(d?.ko) })) }
        : { kind, lv, tag: str(o.tag), s: str(o.s), ko: str(o.ko), alt: [], tip: str(o.tip), bank: strs(o.bank) }; // AI가 낸 대체 정답은 틀린 게 많아 안 받는다
    const k = norm(kind === 'word' ? x.en : plain(x.s));
    if (!k || seen.has(k)) return reject('중복');
    if (!hangul(x.ko) || (kind === 'word' && !hangul(x.exKo)) || (kind === 'grammar' && !hangul(x.tip))) return reject('한국어 아님');
    // AI가 자주 내는 실수(2026-10-19 로컬 시험에서 본 것)를 규칙으로 미리 거른다
    const r = kind === 'word' ? wordSmell(x) : grammarSmell(x);
    if (r) return reject(r);
    const fails = [];
    if (kind === 'word') {
      // 후보 10개 중 정답·서로와 겹치지 않는 것만(검수에서 더 빼고 6개로 줄인다)
      const ok = [];
      const family = (a, b) => ` ${norm(a)} `.includes(` ${norm(b)} `) || ` ${norm(b)} `.includes(` ${norm(a)} `); // come down with ⊂ come down with the flu
      for (const d of x.distractors) {
        const o = EN.get(d.en);
        if (!d.en || !hangul(d.ko) || family(d.en, x.en) || ok.some(p => norm(p.en) === norm(d.en))) continue;
        if (sensesClash(senses(x.ko), senses(d.ko)) || ok.some(p => sensesClash(senses(p.ko), senses(d.ko)))) continue;
        if (o && (sensesClash(senses(x.ko), senses(o.ko)) || (o.lv < x.lv && !lookAlike(x.en, o.en)))) continue;
        ok.push(d);
      }
      x.distractors = ok;
      checkWord(x, m => fails.push(m));
      checkDistractors(x, x.distractors, { EN, overlap: () => false }, m => fails.push(m));
    } else {
      if (x.bank.some(b => !known.has(b.toLowerCase()))) return reject('오답 블록이 모르는 단어');
      if (tagsInBatch.has(norm(x.tag))) return reject('같은 패턴 중복');
      checkGrammar(x, m => fails.push(m));
    }
    if (fails.length) return reject('규칙: ' + fails[0].split(':')[0].slice(0, 20));
    if (kind === 'grammar') tagsInBatch.add(norm(x.tag));
    seen.add(k);
    Object.assign(o, { _item: x });
    return true;
  }).map(o => o._item);
  if (!passed.length) return { items: [], tried: Array.isArray(raw) ? raw.length : 0, reasons };

  // 2) 블라인드 풀이: 빈칸을 맞히고(단어는 4지선다도) 정답이 하나인 것만
  const { lines, key } = blindSheet(passed);
  const answers = (await ask(env, env.CHECK_MODEL || CHECK_MODEL, `Solve these English quiz items for a Korean learner. Return ONLY a JSON object mapping each id to your answer: the exact word(s) for "fill" items, the letter for "choose" items.\n${lines.join('\n')}`, 1500)) ?? {};
  const ok = passed.filter((x, i) => {
    const id = (x.kind === 'word' ? 'w' : 'g') + i;
    const [, ans] = blankParts(x.ex ?? x.s);
    if (grade(String(answers[id] ?? ''), [ans, ...x.alt]) !== 'ok') return reject('블라인드 빈칸 틀림');
    if (x.kind === 'word' && String(answers[id + 'c'] ?? '').trim().toUpperCase().slice(0, 1) !== key[id + 'c']) return reject('블라인드 보기 틀림');
    return true;
  });
  if (!ok.length) return { items: [], tried: raw.length, reasons };

  // 3) 검수: 정답을 보여 주고 해석·팁·문장·오답 후보가 정확한지 판정. 하나라도 틀리면 버리고, 나쁜 오답 후보는 뺀다
  //    (블라인드 풀이만으로는 틀린 해석·뜻이 겹치는 오답 후보를 못 잡았다 — 2026-10-19 로컬 시험)
  const sheet = ok.map((x, i) =>
    x.kind === 'word'
      ? `${i} | word: ${x.en} (${x.pos}) = ${x.ko} | sentence: ${plain(x.ex)} | translation: ${x.exKo} | wrong options: ${x.distractors.map((d, j) => `${j + 1}) ${d.en} = ${d.ko}`).join('  ')}`
      : `${i} | pattern: ${x.tag} | sentence: ${x.s} (answer in braces) | translation: ${x.ko} | tip: ${x.tip} | wrong blocks: ${x.bank.join(', ')}`,
  );
  const verdict = (await ask(env, env.CHECK_MODEL || CHECK_MODEL, `${REVIEW}\n${sheet.join('\n')}`, 4000)) ?? {};
  const good = ok.filter((x, i) => {
    const v = verdict[i];
    if (v?.ok !== true) return reject('검수 탈락');
    if (x.kind === 'word') {
      const bad = new Set((Array.isArray(v.bad) ? v.bad : []).map(Number));
      x.distractors = x.distractors.filter((_, j) => !bad.has(j + 1));
      if (x.distractors.length < 6) return reject('검수: 오답 후보 부족');
      x.distractors = x.distractors.slice(0, 6);
    }
    return true;
  });
  const stamp = Date.now().toString(36);
  return { items: good.map((x, i) => ({ id: `a${kind[0]}${lv}-${stamp}${i}`, ...x })), tried: raw.length, reasons };
}
