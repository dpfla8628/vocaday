// 보카데이 API — Cloudflare Worker + D1. 정적 파일(public/)은 Workers Assets가 바로 서빙한다.
// 로컬: npx wrangler dev   배포: npx wrangler deploy
import w1 from '../content/words_lv1.json';
import w2 from '../content/words_lv2.json';
import w3 from '../content/words_lv3.json';
import w4 from '../content/words_lv4.json';
import g12 from '../content/grammar_lv12.json';
import g34 from '../content/grammar_lv34.json';
import confusables from '../content/confusables.json';
import fixedDistractors from '../content/distractors.json';
import PLACEMENT from '../content/placement.json';
import { makePicker } from './distractors.js';
import { placeLevel, PASS } from './placement.js';
import { freshOrder } from './queue.js';
import { MAX_LEN, promptOf, checkDiary } from './diary.js';

const WORDS = [...w1, ...w2, ...w3, ...w4].map(x => ({ ...x, kind: 'word' }));
const GRAMMAR = [...g12, ...g34].map(x => ({ ...x, kind: 'grammar' }));
const BANK = { word: WORDS, grammar: GRAMMAR };
const BY_ID = new Map([...WORDS, ...GRAMMAR].map(x => [x.id, x]));
// 공용 문항 + 내 일기에서 만든 복습 문항(u.custom)
const itemOf = (u, id) => BY_ID.get(id) ?? (u.custom?.[id] && { ...u.custom[id], kind: 'grammar' });
const HEADWORDS = WORDS.map(x => x.en);
const pickDistractors = makePicker(WORDS, confusables);

// 하루 신규 학습량 + 복습 상한. 복습이 상한만큼 밀려 있으면 새 문제는 쉬어 간다(Anki 권장 방식).
const PLANS = {
  light: { word: 8, grammar: 4, reviewCap: 50 },
  normal: { word: 15, grammar: 6, reviewCap: 100 },
  hard: { word: 30, grammar: 10, reviewCap: 200 },
};
// Leitner 상자별 다음 복습까지 일수. 틀리면 0번(내일 다시) → 맞힐수록 1·2·4·7·15·30일 뒤.
const INTERVALS = [1, 1, 2, 4, 7, 15, 30];
const MASTER_BOX = 6; // 30일 상자 도달 = 완전 암기
const LEECH = 5; // 5번 이상 틀리면 '약점' 표시

const TZ = 'Asia/Seoul';
// 학습일은 새벽 4시에 바뀐다(밤늦게 한 공부도 그날로 친다)
const today = () => new Date(Date.now() - 4 * 3600e3).toLocaleDateString('sv-SE', { timeZone: TZ });
const addDays = (d, n) => {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const err = (status, message) => Object.assign(new Error(message), { status });

// ---------- 저장소: D1의 key-value 테이블 하나 ----------
// ponytail: 사용자 1명 = JSON 한 행. 동시 탭에서 같은 계정으로 풀면 마지막 저장이 이긴다(2인용이라 감수).
const get = async (env, k) => {
  const v = await env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first('v');
  return v ? JSON.parse(v) : null;
};
const put = (env, k, v) =>
  env.DB.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
    .bind(k, JSON.stringify(v))
    .run();
const del = (env, k) => env.DB.prepare('DELETE FROM kv WHERE k = ?').bind(k).run();

async function hashPw(pw, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 },
    key,
    256,
  );
  return hex(bits);
}

// 계정은 코드가 아니라 비밀값 USERS에 둔다(공개 저장소에 아이디·이름이 남지 않게).
// USERS = {"<로그인 아이디>":{"name":"<표시 이름>","pw":"<처음 비밀번호>"}, ...}  — 로컬은 .dev.vars, 운영은 wrangler secret
let USERS = {};
const parseUsers = env => {
  try {
    return JSON.parse(env.USERS || '{}');
  } catch {
    return {};
  }
};
const nameOf = id => USERS[id]?.name ?? id;
const DIARY_CHECKS = 10; // 하루 첨삭 횟수(무료 AI 한도 보호)

let ready;
const init = env =>
  (ready ??= (async () => {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)').run();
    for (const [id, { pw }] of Object.entries(USERS)) {
      if (await get(env, 'user:' + id)) continue;
      const salt = randomHex(16);
      await put(env, 'user:' + id, { id, salt, hash: await hashPw(pw ?? id, salt), level: 2, plan: 'normal', items: {}, days: {} });
    }
  })().catch(e => {
    ready = null;
    throw e;
  }));

const emptyKind = () => ({ new: 0, review: 0, answered: 0, correct: 0, done: false });
const dayOf = (u, d) => (u.days[d] ??= { word: emptyKind(), grammar: emptyKind() });
const complete = day => !!(day?.word.done && day?.grammar.done);

// ---------- 학습 로직 ----------
function queue(u, kind, mode) {
  const t = today();
  const plan = PLANS[u.plan];
  const mine = Object.entries(u.items).filter(([id]) => itemOf(u, id)?.kind === kind);

  if (mode === 'wrong') return mine.filter(([, s]) => s.wrong > 0 && s.box < MASTER_BOX).map(([id]) => id);

  // 간격 대비 많이 밀린 것부터(relative overdueness)
  const overdue = s => (Date.parse(t) - Date.parse(s.due)) / 864e5 / INTERVALS[s.box];
  const due = mine
    .filter(([, s]) => s.due <= t)
    .sort((a, b) => overdue(b[1]) - overdue(a[1]))
    .slice(0, plan.reviewCap)
    .map(([id]) => id);
  const backlog = due.length >= plan.reviewCap;
  const newLeft = backlog ? 0 : Math.max(0, plan[kind] - (u.days[t]?.[kind].new ?? 0));
  const fresh = freshOrder(BANK[kind].filter(x => !u.items[x.id]), u.level)
    .slice(0, newLeft)
    .map(x => x.id);
  return [...due, ...fresh];
}

function question(u, id) {
  const x = itemOf(u, id);
  const s = u.items[id];
  const q = { ...x, box: s?.box ?? 0, isNew: !s, wrongCount: s?.wrong ?? 0 };
  if (x.kind === 'word') {
    q.distractors = pickDistractors(x, shuffle, fixedDistractors);
  }
  return q;
}

function answer(u, id, correct) {
  const x = itemOf(u, id);
  if (!x) throw err(400, 'unknown item');
  const t = today();
  const day = dayOf(u, t)[x.kind];
  let s = u.items[id];
  if (s) day.review++;
  else {
    s = u.items[id] = { box: 0, right: 0, wrong: 0, first: t };
    day.new++;
  }
  if (correct) {
    s.box = Math.min(s.box + 1, MASTER_BOX);
    s.right++;
  } else {
    s.box = 0;
    s.wrong++;
  }
  s.due = addDays(t, INTERVALS[s.box]);
  s.last = t;
  day.answered++;
  if (correct) day.correct++;
  return { box: s.box, due: s.due };
}

function streakOf(done) {
  let d = today();
  if (!done(d)) d = addDays(d, -1); // 오늘 아직 안 했어도 어제까지 이어졌으면 유지
  let n = 0;
  while (done(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function stats(u) {
  const t = today();
  const vals = Object.values(u.items);
  const history = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(t, -i);
    const day = u.days[d];
    const answered = (day?.word.answered ?? 0) + (day?.grammar.answered ?? 0);
    const correct = (day?.word.correct ?? 0) + (day?.grammar.correct ?? 0);
    history.push({ date: d, answered, correct, done: complete(day) });
  }
  const last7 = history.slice(-7);
  const a7 = last7.reduce((n, h) => n + h.answered, 0);
  const c7 = last7.reduce((n, h) => n + h.correct, 0);
  return {
    id: u.id,
    name: nameOf(u.id),
    placed: !!u.placed,
    level: u.level,
    plan: u.plan,
    streak: streakOf(d => complete(u.days[d])),
    today: u.days[t] ?? { word: emptyKind(), grammar: emptyKind() },
    learned: vals.length,
    mastered: vals.filter(s => s.box >= MASTER_BOX).length,
    wrongNote: vals.filter(s => s.wrong > 0 && s.box < MASTER_BOX).length,
    accuracy7: a7 ? Math.round((c7 / a7) * 100) : null,
    answered7: a7,
    history,
  };
}

function preview(u, kind) {
  const ids = queue(u, kind);
  const fresh = ids.filter(id => !u.items[id]).length;
  return { new: fresh, review: ids.length - fresh };
}

// ---------- HTTP ----------
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

async function readBody(req) {
  const s = await req.text();
  if (s.length > 1e4) throw err(413, 'too large');
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    throw err(400, 'bad json');
  }
}

async function api(req, env, url) {
  await init(env);
  const route = `${req.method} ${url.pathname}`;
  const body = req.method === 'POST' ? await readBody(req) : {};
  const secure = url.protocol === 'https:' ? '; Secure' : '';

  if (route === 'POST /api/login') {
    const u = await get(env, 'user:' + String(body.id || '').trim().toLowerCase());
    const ok =
      u &&
      crypto.subtle.timingSafeEqual(new TextEncoder().encode(await hashPw(String(body.pw || ''), u.salt)), new TextEncoder().encode(u.hash));
    if (!ok) throw err(401, '아이디 또는 비밀번호가 틀렸어요');
    const sid = randomHex(24);
    await put(env, 'sid:' + sid, u.id);
    return json({ id: u.id }, 200, { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=7776000${secure}` });
  }

  const sid = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.get('Cookie') || '')?.[1];
  const uid = sid && (await get(env, 'sid:' + sid));
  const u = uid && (await get(env, 'user:' + uid));
  if (!u) throw err(401, '로그인이 필요해요');
  const saveUser = () => put(env, 'user:' + u.id, u);

  switch (route) {
    case 'POST /api/logout':
      await del(env, 'sid:' + sid);
      return json({}, 200, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
    case 'GET /api/me': {
      const todayDiary = await get(env, `diary:${u.id}:${today()}`);
      return json({ ...stats(u), plans: PLANS, preview: { word: preview(u, 'word'), grammar: preview(u, 'grammar') }, diaryToday: !!todayDiary?.text });
    }
    case 'GET /api/placement': {
      // 볼 때마다 다른 문제: 레벨·종류(어휘/문법)별 풀에서 3개씩 무작위로 뽑되, 지난번에 본 문제는 되도록 피한다
      const seen = new Set(u.placementSeen ?? []);
      const set = [];
      for (const lv of [1, 2, 3, 4])
        for (const skill of ['vocab', 'grammar']) {
          const pool = PLACEMENT.filter(p => p.lv === lv && p.skill === skill);
          const fresh = pool.filter(p => !seen.has(p.id));
          set.push(...shuffle(fresh.length >= 3 ? fresh : [...pool]).slice(0, 3));
        }
      u.placementSet = set.map(p => p.id); // 이번 회차 채점 기준
      await saveUser();
      // 정답과 보기 뜻은 서버에만 두고 문제만 보낸다(뜻을 보면 정답이 드러나므로)
      return json({ items: set.map(({ answer, glosses, ...q }) => q), pass: PASS });
    }
    case 'POST /api/placement/check': {
      // 한 문항 즉시 채점: 정답 번호는 고른 뒤에만 알려 준다
      const p = PLACEMENT.find(x => x.id === body.id);
      if (!p || !Number.isInteger(body.pick) || body.pick < -1 || body.pick > 3) throw err(400, 'bad pick');
      // 고른 뒤에는 정답의 뜻과 내가 고른 보기의 뜻을 같이 알려 준다
      return json({
        correct: body.pick === p.answer,
        answer: p.answer,
        answerKo: p.glosses?.[p.answer] ?? '',
        pickKo: body.pick >= 0 ? p.glosses?.[body.pick] ?? '' : '',
      });
    }
    case 'POST /api/placement': {
      const picks = body.answers && typeof body.answers === 'object' ? body.answers : {};
      const ids = new Set(u.placementSet ?? []);
      const set = ids.size ? PLACEMENT.filter(p => ids.has(p.id)) : PLACEMENT; // 이번 회차에 낸 문제만 채점
      u.placementSeen = [...ids]; // 다음 회차에는 다른 문제를
      const perLevel = {};
      for (const p of set) {
        const r = (perLevel[p.lv] ??= { correct: 0, total: 0 });
        r.total++;
        if (picks[p.id] === p.answer) r.correct++;
      }
      u.level = placeLevel(perLevel);
      u.placed = true;
      await saveUser();
      return json({ level: u.level, perLevel });
    }
    case 'POST /api/settings':
      if (![1, 2, 3, 4].includes(body.level) || !PLANS[body.plan]) throw err(400, 'bad settings');
      u.level = body.level;
      u.plan = body.plan;
      await saveUser();
      return json({});
    case 'POST /api/password': {
      const pw = String(body.pw || '');
      if (pw.length < 4 || pw.length > 64) throw err(400, '비밀번호는 4~64자로 해주세요');
      u.salt = randomHex(16);
      u.hash = await hashPw(pw, u.salt);
      await saveUser();
      return json({});
    }
    case 'GET /api/session': {
      const kind = url.searchParams.get('kind');
      if (!BANK[kind]) throw err(400, 'bad kind');
      const ids = shuffle(queue(u, kind, url.searchParams.get('mode')));
      // 동의어를 쓴 경우 오답 대신 한 번 더 기회를 주려고 표제어 목록을 같이 보낸다
      return json({ items: ids.map(id => question(u, id)), headwords: kind === 'word' ? HEADWORDS : [] });
    }
    case 'POST /api/answer': {
      const r = answer(u, String(body.id), !!body.correct);
      await saveUser();
      return json(r);
    }
    case 'POST /api/finish':
      if (!BANK[body.kind]) throw err(400, 'bad kind');
      dayOf(u, today())[body.kind].done = true;
      await saveUser();
      return json(stats(u));
    case 'GET /api/board': {
      const { results } = await env.DB.prepare("SELECT v FROM kv WHERE k LIKE 'user:%'").all();
      const users = results.map(r => JSON.parse(r.v));
      const together = streakOf(d => users.every(x => complete(x.days[d])));
      return json({ me: u.id, together, users: users.map(stats) });
    }
    // ---------- 오늘의 영어 일기 ----------
    case 'GET /api/diary': {
      const t = today();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') : t;
      const { results } = await env.DB.prepare('SELECT k, v FROM kv WHERE k LIKE ?').bind('diary:%').all();
      const all = results.map(r => JSON.parse(r.v));
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(t, -i);
        days.push({ date: d, by: all.filter(e => e.date === d && e.text).map(e => e.uid) });
      }
      const entries = Object.keys(USERS).map(uid => {
        const e = all.find(x => x.uid === uid && x.date === date);
        return { uid, name: nameOf(uid), text: e?.text ?? '', comments: e?.comments ?? [], updatedAt: e?.updatedAt ?? null };
      });
      return json({ me: u.id, date, today: t, prompt: promptOf(date), maxLen: MAX_LEN, checksLeft: DIARY_CHECKS - (u.diaryChecks?.[t] ?? 0), entries, days });
    }
    case 'POST /api/diary': {
      const text = String(body.text ?? '').replace(/\r/g, '').trim();
      if (!text) throw err(400, '일기를 써 주세요');
      if (text.length > MAX_LEN) throw err(400, `${MAX_LEN}자 이내로 써 주세요`);
      const k = `diary:${u.id}:${today()}`;
      const e = (await get(env, k)) ?? { uid: u.id, date: today(), text: '', review: null, comments: [] };
      if (e.text !== text) e.review = null; // 고쳐 쓰면 이전 첨삭은 버린다(복습 문제는 첨삭 때 이미 만들어짐)
      e.text = text;
      e.updatedAt = Date.now();
      await put(env, k, e);
      return json({});
    }
    case 'POST /api/diary/check': {
      const t = today();
      const k = `diary:${u.id}:${t}`;
      // dry: 저장하지 않고 첨삭만 미리 보기(운영 점검용). 횟수는 똑같이 센다
      const dry = body.dry === true;
      const e = dry ? { text: String(body.text ?? '').trim().slice(0, MAX_LEN) } : await get(env, k);
      if (!e?.text) throw err(400, '먼저 일기를 저장해 주세요');
      u.diaryChecks = { [t]: (u.diaryChecks?.[t] ?? 0) + 1 }; // 오늘 것만 남긴다
      if (u.diaryChecks[t] > DIARY_CHECKS) throw err(429, `첨삭은 하루 ${DIARY_CHECKS}번까지예요`);
      const review = await checkDiary(env, e.text, u.level);
      if (dry) {
        await saveUser();
        return json({ review, checksLeft: DIARY_CHECKS - u.diaryChecks[t] });
      }
      e.review = review;
      await put(env, k, e);
      // 내 실수로 만든 복습 문제 → 내일부터 문법 복습에 등장(오답노트에도 보임)
      u.custom ??= {};
      review.practice.forEach((p, i) => {
        const id = `c-${t}-${i}`;
        u.custom[id] = { id, lv: u.level, tag: '내 일기 복습', s: p.s, ko: p.ko, alt: [], bank: p.bank, tip: p.tip || '내 일기에서 고친 표현' };
        u.items[id] ??= { box: 0, right: 0, wrong: 1, first: t, due: addDays(t, 1), last: t };
      });
      await saveUser();
      return json({ review, checksLeft: DIARY_CHECKS - u.diaryChecks[t] });
    }
    case 'POST /api/diary/comment': {
      const text = String(body.text ?? '').trim().slice(0, 300);
      const owner = String(body.uid ?? '');
      const date = String(body.date ?? '');
      if (!text || !USERS[owner] || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw err(400, '댓글을 확인해 주세요');
      const k = `diary:${owner}:${date}`;
      const e = await get(env, k);
      if (!e?.text) throw err(404, '아직 일기가 없어요');
      e.comments.push({ by: u.id, name: nameOf(u.id), text, at: Date.now() });
      await put(env, k, e);
      return json({ comments: e.comments });
    }
    case 'GET /api/wrongs': {
      const items = Object.entries(u.items)
        .filter(([id, s]) => itemOf(u, id) && s.wrong > 0 && s.box < MASTER_BOX)
        .sort((a, b) => b[1].wrong - a[1].wrong)
        .map(([id, s]) => ({ ...itemOf(u, id), ...s, leech: s.wrong >= LEECH }));
      return json({ items });
    }
  }
  throw err(404, 'not found');
}

export default {
  async fetch(req, env) {
    USERS = parseUsers(env);
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      return await api(req, env, url);
    } catch (e) {
      if (!e.status) console.error(e);
      return json({ error: e.status ? e.message : '서버 오류' }, e.status || 500);
    }
  },
};
