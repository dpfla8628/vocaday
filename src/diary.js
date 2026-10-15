// 오늘의 영어 일기 첨삭: LanguageTool(맞춤법·문법) → Workers AI(설명·자연스러운 표현·복습 문제)
export const MODEL = '@cf/qwen/qwen3.8-27b';
export const MAX_LEN = 400;

// 매일 바뀌는 오늘의 질문(빈 화면 앞에서 막막하지 않게)
export const PROMPTS = [
  ['오늘 제일 맛있게 먹은 건 뭐야?', 'What was the best thing you ate today?'],
  ['오늘 기분을 날씨로 표현하면?', 'If your mood today were the weather, what would it be?'],
  ['오늘 누구랑 무슨 얘기 했어?', 'Who did you talk to today, and about what?'],
  ['요즘 빠져 있는 것 하나', "What's something you're into these days?"],
  ['오늘 웃겼던 일', 'What made you laugh today?'],
  ['오늘 가장 피곤했던 순간', 'When were you most tired today?'],
  ['이번 주말에 하고 싶은 것', 'What do you want to do this weekend?'],
  ['오늘 고마웠던 사람', 'Who are you thankful for today?'],
  ['오늘 새로 알게 된 것', 'What did you learn today?'],
  ['오늘 산 것 / 사고 싶은 것', 'What did you buy, or want to buy, today?'],
  ['오늘 아침 루틴', 'What was your morning like?'],
  ['요즘 보는 드라마·영화·유튜브', "What show or video are you watching these days?"],
  ['오늘 미뤘던 일', 'What did you put off today?'],
  ['내일 꼭 할 일 하나', "What's one thing you must do tomorrow?"],
  ['오늘 들은 노래', 'What song did you listen to today?'],
  ['가고 싶은 여행지와 이유', 'Where do you want to travel, and why?'],
  ['오늘 운동했어? 몸 상태는?', 'Did you exercise today? How do you feel?'],
  ['오늘 짜증났던 일', 'What annoyed you today?'],
  ['어릴 때 추억 하나', "What's one childhood memory you have?"],
  ['오늘 나에게 주는 칭찬', 'Give yourself a compliment for today.'],
];
export const promptOf = date => {
  const n = Math.floor(Date.parse(date + 'T00:00:00Z') / 864e5);
  const [ko, en] = PROMPTS[n % PROMPTS.length];
  return { ko, en };
};

// LanguageTool 공개 API — 실패하면 빈 결과(첨삭은 AI만으로 계속)
export async function languageTool(text) {
  try {
    const r = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'en-US' }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    const { matches = [] } = await r.json();
    return matches
      .filter(m => m.rule?.category?.id !== 'CASING' && !(m.rule?.category?.id === 'TYPOS' && /^[A-Z]/.test(text.substr(m.offset, m.length)))) // 대소문자·이름(대문자로 시작하는 철자 지적)은 버린다
      .filter(m => !trivial(text.substr(m.offset, m.length), m.replacements?.[0]?.value ?? ''))
      .slice(0, 15)
      .map(m => ({
      text: text.substr(m.offset, m.length),
      fix: m.replacements?.slice(0, 3).map(x => x.value) ?? [],
      kind: m.rule?.category?.id === 'TYPOS' ? 'spelling' : 'grammar',
      message: m.message,
    }));
  } catch {
    return [];
  }
}

// 대소문자만 다르거나 줄임말(I'm ↔ I am, dont ↔ don't)만 다른 수정은 실수로 치지 않는다
const EXPAND = [[/\bcan't\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/n't\b/g, ' not'], [/'m\b/g, ' am'], [/'re\b/g, ' are'], [/'s\b/g, ' is'], [/'ll\b/g, ' will'], [/'ve\b/g, ' have'], [/'d\b/g, ' would'], [/\bcannot\b/g, 'can not']];
// 아포스트로피를 빼도 다른 단어라 진짜 실수인 것(its ↔ it's 등)
const REAL = new Set(['its', 'were', 'well', 'ill', 'shed', 'lets', 'wed', 'hell', 'shell', 'id', 'hed']);
const words = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
export function trivial(a, b) {
  const x = words(a);
  const y = words(b);
  if (x.join(' ') === y.join(' ')) return true; // 대소문자·문장부호만 다름
  const flat = ws => ws.map(w => w.replace(/'/g, '')).join(' ');
  if (flat(x) === flat(y) && !x.concat(y).some(w => REAL.has(w.replace(/'/g, '')))) return true; // dont ↔ don't
  const ex = ws => EXPAND.reduce((t, [re, to]) => t.replace(re, to), ws.join(' ')).replace(/\s+/g, ' ');
  return ex(x) === ex(y); // I'm ↔ I am
}

const LEVELS = { 1: '초등(왕초보)', 2: '중학생 수준', 3: '고등학생 수준', 4: '성인 중상급' };

export function buildMessages(text, level, lt) {
  const system = `너는 한국인 성인을 가르치는 친절한 원어민 영어 선생님이야. 학습자(${LEVELS[level] || '중학생 수준'})가 쓴 짧은 영어 일기를 첨삭해.
원칙:
- 칭찬을 먼저, 고칠 점은 의미·문법상 중요한 것 위주로 최대 5개. 사소한 취향 차이는 고치지 마.
- 대소문자, 줄임말(I'm/I am, don't/do not, gonna 등), 사람 이름·고유명사는 절대 고치지 마. edits·practice에도 넣지 마.
- 괄호 안에 쓴 한국어(예: "(산책)")는 문맥에 맞는 자연스러운 영어로 바꿔 corrected에 반영하고 translations에 적어.
- 설명(why, tip, praise)은 모두 한국어로 짧고 쉽게.
- better는 학습자 레벨에 맞는, 원어민이 실제로 쓰는 표현 1~2개.
- practice는 학습자의 실제 실수로 만든 복습용 빈칸 문제 최대 2개: s는 고친 문장에서 정답 부분을 {중괄호}로 한 번만 감싼 것(1~4단어), ko는 그 문장의 한국어 해석, bank는 학습자가 틀렸던 형태를 포함한 오답 단어 2~3개(각각 한 단어, 정답 단어와 겹치지 않게).
- 반드시 아래 JSON 하나만 출력해. 다른 말 없이.
{"praise":"","corrected":"","edits":[{"from":"","to":"","type":"spelling|grammar|natural","why":""}],"translations":[{"ko":"","en":""}],"better":[{"en":"","ko":""}],"practice":[{"s":"","ko":"","bank":[""],"tip":""}]}`;
  const hints = lt.length ? `\n\n[맞춤법 검사기 결과 — 참고용, 틀릴 수도 있음]\n${lt.map(m => `- "${m.text}" → ${m.fix.join(' / ') || '?'} (${m.message})`).join('\n')}` : '';
  return [
    { role: 'system', content: system },
    { role: 'user', content: `[일기]\n${text}${hints}` },
  ];
}

// 모델 응답에서 JSON을 꺼내고, 규칙에 맞는 것만 남긴다(모델이 지어낸 이상한 값이 화면·복습에 들어가지 않게)
export function sanitizeReview(raw, text) {
  let o = raw;
  if (typeof o === 'string') {
    const m = /\{[\s\S]*\}/.exec(o);
    try {
      o = m ? JSON.parse(m[0]) : null;
    } catch {
      o = null;
    }
  }
  if (!o || typeof o !== 'object' || !('corrected' in o || 'edits' in o)) return null; // 첨삭 JSON이 아니면 실패
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const arr = v => (Array.isArray(v) ? v : []);
  const TYPES = ['spelling', 'grammar', 'natural'];
  const edits = arr(o.edits)
    .map(e => ({ from: str(e?.from, 80), to: str(e?.to, 80), type: TYPES.includes(e?.type) ? e.type : 'natural', why: str(e?.why, 140) }))
    .filter(e => (e.from || e.to) && e.from !== e.to && e.why && !trivial(e.from, e.to))
    // ponytail: 대문자로 시작하는 한 단어 철자 지적은 이름으로 본다(대문자 오타 Englsh도 같이 빠지는 한계)
    .filter(e => !(e.type === 'spelling' && /^[A-Z][a-z]*$/.test(e.from)))
    .slice(0, 6);
  const practice = arr(o.practice)
    .map(p => ({ s: str(p?.s, 160), ko: str(p?.ko, 120), tip: str(p?.tip, 60), bank: arr(p?.bank).map(b => str(b, 24)).filter(b => b && !/\s/.test(b)) }))
    .filter(p => {
      const m = /^[^{}]*\{([^{}]+)\}[^{}]*$/.exec(p.s);
      if (!m || !p.ko) return false;
      const words = m[1].toLowerCase().split(/\s+/);
      if (words.length > 4) return false;
      p.bank = [...new Set(p.bank)].filter(b => !words.includes(b.toLowerCase())).slice(0, 3);
      return p.bank.length >= 2;
    })
    .slice(0, 2);
  const c = str(o.corrected, 800);
  const corrected = c && !trivial(c, text) ? c : text; // 대소문자·줄임말만 바뀐 교정문은 원문 그대로
  return {
    praise: str(o.praise, 160),
    corrected,
    edits,
    translations: arr(o.translations).map(t => ({ ko: str(t?.ko, 40), en: str(t?.en, 80) })).filter(t => t.ko && t.en).slice(0, 5),
    better: arr(o.better).map(b => ({ en: str(b?.en, 120), ko: str(b?.ko, 120) })).filter(b => b.en).slice(0, 2),
    practice,
  };
}

export async function checkDiary(env, text, level) {
  const lt = await languageTool(text);
  const out = await env.AI.run(MODEL, {
    messages: buildMessages(text, level, lt),
    max_tokens: 1500,
    temperature: 0.2,
    chat_template_kwargs: { enable_thinking: false }, // 추론 모드 끄기(속도·토큰 절약)
  });
  // 모델마다 응답 모양이 달라서(response / OpenAI식 choices) 둘 다 받는다
  const content = out?.response ?? out?.choices?.[0]?.message?.content ?? '';
  const review = sanitizeReview(content, text);
  if (!review) throw Object.assign(new Error('첨삭을 만들지 못했어요. 잠시 후 다시 해 주세요'), { status: 502 });
  return { ...review, checker: lt.length ? 'languagetool+ai' : 'ai', at: Date.now() };
}
