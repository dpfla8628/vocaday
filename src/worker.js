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
import HIDDEN_IDS from '../content/hidden.json'; // 성인에게 너무 쉬운 단어(dog·cat 등) — 출제하지 않는다(파일에서 빼면 복구)
import { makePicker } from './distractors.js';
import { placeLevel, PASS } from './placement.js';
import { freshOrder } from './queue.js';
import { MAX_LEN, promptOf, checkDiary } from './diary.js';
import { generate } from './generate.js';
import { notify, nextNotice, subscriptions, saveSubscriptions } from './push.js';

const KIND_KO = { word: '단어', grammar: '문법' };
const others = uid => Object.keys(USERS).filter(x => x !== uid);
let later = p => p; // fetch()에서 ctx.waitUntil로 바뀐다(응답 후 백그라운드 실행)
const notifyLater = (env, uids, notice) => later((async () => { for (const t of uids) await notify(env, t, notice); })());

const WORDS = [...w1, ...w2, ...w3, ...w4].map(x => ({ ...x, kind: 'word' }));
const GRAMMAR = [...g12, ...g34].map(x => ({ ...x, kind: 'grammar' }));
const BANK = { word: WORDS, grammar: GRAMMAR };
const BY_ID = new Map([...WORDS, ...GRAMMAR].map(x => [x.id, x]));
// 공용 문항 + 내 일기에서 만든 복습 문항(u.custom)
const itemOf = (u, id) => BY_ID.get(id) ?? GEN.byId.get(id) ?? (u.custom?.[id] && { ...u.custom[id], kind: 'grammar' });
const HEADWORDS = WORDS.map(x => x.en);

// AI가 만든 문제(D1 gen 표). 고정 문제 뒤에 붙어 새 문제가 바닥나지 않게 한다. 워커마다 1분 캐시
let GEN = { at: 0, all: [], byId: new Map(), word: [], grammar: [] };
async function loadGen(env, force) {
  if (!force && Date.now() - GEN.at < 60e3) return;
  const { results } = await env.DB.prepare('SELECT v FROM gen').all();
  const all = results.map(r => JSON.parse(r.v));
  const live = all.filter(x => !x.reported); // 신고된 문제는 안 내고, 같은 문제를 또 만들지 않게 기록만 남긴다
  GEN = { at: Date.now(), all, byId: new Map(live.map(x => [x.id, x])), word: live.filter(x => x.kind === 'word'), grammar: live.filter(x => x.kind === 'grammar') };
}
const bankOf = kind => [...BANK[kind], ...GEN[kind]];
// 누군가 내 레벨 이상에서 남은 새 문제가 이만큼 아래로 내려가면 Cron이 새로 만든다.
// 맨 위 단계(실전)를 채운다 — 순서상 내 레벨 → 위 단계로 올라가므로 바닥나는 건 항상 맨 위다
const GEN_MIN = 100;
const GEN_LV = 4;
// 꺼 둠(2026-10-19 사용자 결정): 무료 모델(Qwen)이 만든 문제는 규칙으로 걸러도 대부분 오역·어색한 뜻이 남아 품질 기준에 못 미쳤다.
// 새 문제는 사람이 검수한 묶음을 test/add-items.mjs로 넣는다. 다시 켜려면 wrangler.jsonc env.app crons에 GEN_CRON을 추가(한도 초기화 직전 = 첨삭이 쓰고 남은 한도만).
const GEN_CRON = '30 23 * * *';
const GEN_N = 4; // 한 번에 만들 문제 수
const GEN_BATCHES = 3; // Cron 한 번에 최대 몇 번 부를지(종류마다)
const GEN_ENOUGH = 8; // 이만큼 모이면 그날은 그만
async function refill(env) {
  await loadGen(env, true);
  const users = [];
  for (const uid of Object.keys(USERS)) {
    const x = await get(env, 'user:' + uid);
    if (x) users.push(x);
  }
  const items = [...WORDS, ...GRAMMAR, ...GEN.all];
  const EN = new Map([...WORDS, ...GEN.word].map(w => [w.en, w]));
  for (const kind of ['word', 'grammar']) {
    const left = Math.min(...users.map(u => bankOf(kind).filter(x => !u.items[x.id] && !HIDDEN.has(x.id) && x.lv >= u.level).length));
    if (left >= (+env.GEN_MIN || GEN_MIN)) continue;
    // Qwen은 한 번에 많이 시키면 2분 타임아웃 → 작은 묶음을 여러 번. 충분히 모이면 그만(한도 아끼기)
    let made = 0;
    for (let i = 0; i < (+env.GEN_BATCHES || GEN_BATCHES) && made < GEN_ENOUGH; i++) {
      try {
        const r = await generate(env, kind, GEN_LV, { items, EN, fixed: fixedDistractors }, GEN_N);
        for (const x of r.items) {
          await env.DB.prepare('INSERT INTO gen (id, kind, lv, v) VALUES (?, ?, ?, ?)').bind(x.id, kind, x.lv, JSON.stringify(x)).run();
          items.push(x);
          if (kind === 'word') EN.set(x.en, x);
        }
        made += r.items.length;
        console.log(`gen ${kind} left=${left} ok=${r.items.length}/${r.tried} ${JSON.stringify(r.reasons)}`);
      } catch (e) {
        console.log(`gen ${kind} error ${e.message}`);
        if (/4006|allocation|quota/i.test(e.message)) return; // 오늘 한도 끝 — 더 불러도 소용없다
      }
    }
  }
}
const pickDistractors = makePicker(WORDS, confusables);

// 하루 신규 학습량 + 복습 상한. 복습이 상한만큼 밀려 있으면 새 문제는 쉬어 간다(Anki 권장 방식).
const PLANS = {
  light: { word: 8, grammar: 4, reviewCap: 50 },
  normal: { word: 15, grammar: 6, reviewCap: 100 },
  hard: { word: 30, grammar: 10, reviewCap: 200 },
};
// 처음 보고 맞힌 문제는 아는 문제 → 다시 안 낸다(사용자 결정 2026-10-19).
// 틀린 문제만 복습: 틀리면 0번(내일) → 맞히면 1번(3일 뒤) → 한 번 더 맞히면 졸업. 다시 틀리면 0번부터.
const INTERVALS = [1, 3];
const MASTER_BOX = 2;
// 옛 데이터(맞히기만 한 문제가 1~5번 상자에 남아 있음)도 졸업으로 친다
const graduated = s => !s.wrong || s.box >= MASTER_BOX;
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
// 사용자 기록은 JSON 하나라, 같은 사람의 요청이 겹치면(답 저장 직후 미션 완료 등) 나중 저장이 앞 기록을 덮어써
// 맞힌 문제가 '새 문제'로 다시 나왔다. 그래서 읽은 뒤 누가 바꿨으면 최신 값에 내 변경분만 얹어 다시 저장한다.
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function rebase(base, mine, theirs) {
  for (const k of new Set([...Object.keys(base), ...Object.keys(mine)])) {
    if (!(k in mine)) delete theirs[k];
    else if (isObj(base[k]) && isObj(mine[k]) && isObj(theirs[k])) rebase(base[k], mine[k], theirs[k]);
    else if (typeof base[k] === 'number' && typeof mine[k] === 'number' && typeof theirs[k] === 'number') theirs[k] += mine[k] - base[k]; // 횟수는 양쪽 증가분을 더한다
    else if (JSON.stringify(base[k]) !== JSON.stringify(mine[k])) theirs[k] = mine[k];
  }
  return theirs;
}
async function saveMerged(env, k, u, base) {
  for (let i = 0; i < 5; i++) {
    const v = JSON.stringify(u);
    const r = await env.DB.prepare('UPDATE kv SET v = ? WHERE k = ? AND v = ?').bind(v, k, base).run();
    if (r.meta.changes) return v;
    const cur = await env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first('v');
    const merged = rebase(JSON.parse(base), JSON.parse(v), JSON.parse(cur));
    for (const x of Object.keys(u)) delete u[x];
    Object.assign(u, merged);
    base = cur;
  }
  throw err(503, '잠시 후 다시 시도해 주세요');
}
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
// 댓글 속 '@이름' 태그 → 태그된 사용자 아이디들
const mentionsIn = text => Object.keys(USERS).filter(id => text.includes('@' + nameOf(id)));
const DIARY_CHECKS = 10; // 하루 첨삭 횟수(무료 AI 한도 보호)
const withIds = cs => (cs ?? []).map(c => ({ ...c, id: c.id ?? String(c.at) })); // id가 없던 옛 댓글은 작성 시각을 id로

let ready;
const init = env =>
  (ready ??= (async () => {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)').run();
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS gen (id TEXT PRIMARY KEY, kind TEXT NOT NULL, lv INTEGER NOT NULL, v TEXT NOT NULL)').run();
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
// 내 레벨보다 쉬운 문제는 새 문제·복습·오답노트 모두에서 빼다(레벨을 올린 뒤 dog·cat 같은 게 다시 나오지 않게).
// 내 일기에서 만든 복습 문제(c-)는 내 실수라 레벨과 무관하게 남긴다
const HIDDEN = new Set(HIDDEN_IDS);
// 레벨업할 때 남겨 둔(keep) 아랫 레벨의 틀린 문제는 졸업할 때까지 복습에 남는다
const atLevel = (u, id) => id.startsWith('c-') || !!u.items[id]?.keep || (!HIDDEN.has(id) && (itemOf(u, id)?.lv ?? 0) >= u.level);

// 레벨업: 지금 레벨 문제(단어+문법)를 다 한 번씩 풀면 '올라갈까요?'를 묻는다(사용자 결정 2026-10-19: 자동이 아니라 물어보고)
const LEVEL_KO = { 1: '초등', 2: '중등', 3: '고등', 4: '실전' };
function levelUpOffer(u) {
  if (u.level >= 4 || u.levelUpDeclined === u.level) return null;
  const left = [...WORDS, ...GRAMMAR].some(x => x.lv === u.level && !HIDDEN.has(x.id) && !u.items[x.id]);
  return left ? null : { from: u.level, to: u.level + 1 };
}

function queue(u, kind, mode) {
  const t = today();
  const plan = PLANS[u.plan];
  const mine = Object.entries(u.items).filter(([id]) => itemOf(u, id)?.kind === kind && atLevel(u, id));

  if (mode === 'wrong') return mine.filter(([, s]) => !graduated(s)).map(([id]) => id);

  // 간격 대비 많이 밀린 것부터(relative overdueness)
  const overdue = s => (Date.parse(t) - Date.parse(s.due)) / 864e5 / INTERVALS[s.box];
  const due = mine
    .filter(([, s]) => !graduated(s) && s.due <= t)
    .sort((a, b) => overdue(b[1]) - overdue(a[1]))
    .slice(0, plan.reviewCap)
    .map(([id]) => id);
  const backlog = due.length >= plan.reviewCap;
  const newLeft = backlog ? 0 : Math.max(0, plan[kind] - (u.days[t]?.[kind].new ?? 0));
  const fresh = freshOrder(bankOf(kind).filter(x => !u.items[x.id] && !HIDDEN.has(x.id) && x.lv >= u.level), u.level)
    .slice(0, newLeft)
    .map(x => x.id);
  return [...due, ...fresh];
}

function question(u, id) {
  const x = itemOf(u, id);
  const s = u.items[id];
  const q = { ...x, box: s?.box ?? 0, isNew: !s, wrongCount: s?.wrong ?? 0 };
  if (x.kind === 'word') {
    q.distractors = pickDistractors(x, shuffle, x.distractors ? { [x.id]: x.distractors } : fixedDistractors);
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
    s.box = s.wrong ? s.box + 1 : MASTER_BOX;
    s.right++;
  } else {
    s.box = 0;
    s.wrong++;
  }
  if (graduated(s)) delete s.due;
  else s.due = addDays(t, INTERVALS[s.box]);
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
    mastered: vals.filter(graduated).length,
    wrongNote: Object.entries(u.items).filter(([id, s]) => itemOf(u, id) && atLevel(u, id) && !graduated(s)).length,
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
  await loadGen(env);
  const route = `${req.method} ${url.pathname}`;
  const body = req.method === 'POST' ? await readBody(req) : {};
  const secure = url.protocol === 'https:' ? '; Secure' : '';

  if (route === 'POST /api/login') {
    const id = String(body.id || '').trim().toLowerCase();
    const u = await get(env, 'user:' + id);
    const ok =
      u &&
      crypto.subtle.timingSafeEqual(new TextEncoder().encode(await hashPw(String(body.pw || ''), u.salt)), new TextEncoder().encode(u.hash));
    // Cloudflare 대시보드(Workers Logs)에서 누가 언제 로그인했는지 보려고 남긴다. 비밀번호는 절대 기록하지 않는다.
    console.log(`login ${ok ? 'ok' : 'fail'} id=${id.slice(0, 40)}`);
    if (!ok) throw err(401, '아이디 또는 비밀번호가 틀렸어요');
    const sid = randomHex(24);
    await put(env, 'sid:' + sid, u.id);
    return json({ id: u.id }, 200, { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=7776000${secure}` });
  }

  const sid = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.get('Cookie') || '')?.[1];
  const uid = sid && (await get(env, 'sid:' + sid));
  let raw = uid && (await env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind('user:' + uid).first('v'));
  const u = raw && JSON.parse(raw);
  if (!u) throw err(401, '로그인이 필요해요');
  const saveUser = async () => (raw = await saveMerged(env, 'user:' + u.id, u, raw));

  switch (route) {
    case 'POST /api/logout':
      await del(env, 'sid:' + sid);
      return json({}, 200, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
    case 'GET /api/me': {
      const todayDiary = await get(env, `diary:${u.id}:${today()}`);
      return json({ ...stats(u), plans: PLANS, preview: { word: preview(u, 'word'), grammar: preview(u, 'grammar') }, diaryToday: !!todayDiary?.text, levelUp: levelUpOffer(u) });
    }
    case 'POST /api/levelup': {
      const offer = levelUpOffer(u);
      if (!offer) throw err(400, '아직 지금 레벨 문제가 남아 있어요');
      if (!body.accept) {
        u.levelUpDeclined = u.level; // 이 레벨에서는 다시 묻지 않는다(설정에서 직접 올릴 수 있음)
        await saveUser();
        return json({});
      }
      for (const [id, s] of Object.entries(u.items)) if (!graduated(s) && (itemOf(u, id)?.lv ?? 9) < offer.to) s.keep = true;
      u.level = offer.to;
      await saveUser();
      notifyLater(env, others(u.id), { title: `🎉 ${nameOf(u.id)}님이 ${LEVEL_KO[offer.to]}으로 레벨 업했어요`, body: `${LEVEL_KO[offer.from]} 문제를 전부 풀었어요`, url: '/#/friends' });
      return json(offer);
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
      // 새 문제를 먼저, 틀렸던 문제(복습)는 뒤에. 각 묶음 안에서만 섞는다
      const ids = queue(u, kind, url.searchParams.get('mode'));
      const isNew = id => !u.items[id];
      ids.splice(0, ids.length, ...shuffle(ids.filter(isNew)), ...shuffle(ids.filter(id => !isNew(id))));
      // 동의어를 쓴 경우 오답 대신 한 번 더 기회를 주려고 표제어 목록을 같이 보낸다
      return json({ items: ids.map(id => question(u, id)), headwords: kind === 'word' ? HEADWORDS : [] });
    }
    case 'POST /api/answer': {
      const r = answer(u, String(body.id), !!body.correct);
      await saveUser();
      return json(r);
    }
    case 'POST /api/finish': {
      if (!BANK[body.kind]) throw err(400, 'bad kind');
      const day = dayOf(u, today())[body.kind];
      const first = !day.done;
      day.done = true;
      await saveUser();
      // 처음 끝냈을 때만 친구에게 알림
      if (first) notifyLater(env, others(u.id), { title: `🔥 ${nameOf(u.id)}님이 오늘 ${KIND_KO[body.kind]} 미션을 끝냈어요`, body: '나도 오늘 미션 하러 가기', url: '/#/home' });
      return json(stats(u));
    }
    // ---------- 푸시 알림 ----------
    case 'GET /api/push/key':
      return json({ key: env.VAPID_PUBLIC_KEY || '' });
    case 'POST /api/push/subscribe': {
      const s = body.subscription;
      if (!s?.endpoint?.startsWith('https://') || !s.keys?.p256dh || !s.keys?.auth) throw err(400, 'bad subscription');
      const subs = (await subscriptions(env, u.id)).filter(x => x.endpoint !== s.endpoint);
      subs.push({ endpoint: s.endpoint, keys: s.keys, at: Date.now(), ua: (req.headers.get('User-Agent') || '').slice(0, 80) });
      await saveSubscriptions(env, u.id, subs.slice(-5)); // 기기 5개까지
      return json({ ok: true, devices: Math.min(subs.length, 5) });
    }
    case 'POST /api/push/unsubscribe': {
      const subs = (await subscriptions(env, u.id)).filter(x => x.endpoint !== String(body.endpoint || ''));
      await saveSubscriptions(env, u.id, subs);
      return json({ ok: true, devices: subs.length });
    }
    case 'POST /api/push/log': {
      // 알림 켜기 단계 기록(기기별 원격 진단용). 최근 30개만
      const entry = { at: Date.now(), step: String(body.step ?? '').slice(0, 20), detail: String(body.detail ?? '').slice(0, 200), perm: String(body.perm ?? '').slice(0, 10), standalone: !!body.standalone, ua: String(body.ua ?? '').slice(0, 160) };
      console.log(`push-log ${u.id} ${entry.step} ${entry.detail} perm=${entry.perm}`);
      later((async () => {
        const list = (await get(env, 'pushlog:' + u.id)) ?? [];
        list.push(entry);
        await put(env, 'pushlog:' + u.id, list.slice(-30));
      })());
      return json({ ok: true });
    }
    case 'GET /api/push/next': // 서비스 워커가 푸시를 받으면 여기서 알림 내용을 가져간다
      return json((await nextNotice(env, u.id)) ?? {});
    case 'POST /api/push/test':
      notifyLater(env, [u.id], { title: '🔔 알림 테스트', body: '알림이 잘 와요! 댓글·친구 미션 완료·저녁 8시 리마인더를 받아요.', url: '/#/settings' });
      return json({ ok: true });
    case 'GET /api/board': {
      const { results } = await env.DB.prepare("SELECT v FROM kv WHERE k LIKE 'user:%'").all();
      const users = results.map(r => JSON.parse(r.v));
      const together = streakOf(d => users.every(x => complete(x.days[d])));
      const t = today();
      const out = [];
      for (const x of users) out.push({ ...stats(x), diaryToday: !!(await get(env, `diary:${x.id}:${t}`))?.text }); // 오늘 일기 썼는지도 같이
      return json({ me: u.id, together, users: out });
    }
    // ---------- 오늘의 영어 일기 ----------
    case 'GET /api/diary': {
      const t = today();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') : t;
      // 전체 일기를 읽지 않는다: 날짜 줄은 키(diary:<uid>:<date>)만, 본문은 보고 있는 날짜의 일기만
      const uids = Object.keys(USERS);
      const [keys, ...rows] = await env.DB.batch([
        env.DB.prepare("SELECT k FROM kv WHERE k LIKE 'diary:%' AND substr(k, -10) >= ?").bind(addDays(t, -13)),
        ...uids.map(uid => env.DB.prepare('SELECT v FROM kv WHERE k = ?').bind(`diary:${uid}:${date}`)),
      ]);
      const wrote = keys.results.map(r => r.k.split(':')); // ['diary', uid, date]
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = addDays(t, -i);
        days.push({ date: d, by: wrote.filter(([, , kd]) => kd === d).map(([, uid]) => uid) });
      }
      const entries = uids.map((uid, i) => {
        const v = rows[i].results[0]?.v;
        const e = v ? JSON.parse(v) : null;
        return { uid, name: nameOf(uid), text: e?.text ?? '', comments: withIds(e?.comments), updatedAt: e?.updatedAt ?? null };
      });
      return json({ me: u.id, date, today: t, prompt: promptOf(date), maxLen: MAX_LEN, checksLeft: DIARY_CHECKS - (u.diaryChecks?.[t] ?? 0), entries, days });
    }
    case 'POST /api/diary': {
      const text = String(body.text ?? '').replace(/\r/g, '').trim();
      if (!text) throw err(400, '일기를 써 주세요');
      if (text.length > MAX_LEN) throw err(400, `${MAX_LEN}자 이내로 써 주세요`);
      const k = `diary:${u.id}:${today()}`;
      const e = (await get(env, k)) ?? { uid: u.id, date: today(), text: '', review: null, comments: [] };
      const firstToday = !e.text;
      if (e.text !== text) e.review = null; // 고쳐 쓰면 이전 첨삭은 버린다(복습 문제는 첨삭 때 이미 만들어짐)
      e.text = text;
      e.updatedAt = Date.now();
      await put(env, k, e);
      if (firstToday) notifyLater(env, others(u.id), { title: `📔 ${nameOf(u.id)}님이 오늘 일기를 썼어요`, body: text.slice(0, 80), url: '/#/diary' });
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
      await saveUser();
      return json({ review, checksLeft: DIARY_CHECKS - u.diaryChecks[t] });
    }
    case 'POST /api/diary/practice': {
      // 첨삭에서 고른 복습 문제만 오답노트에 넣는다 → 내일부터 문법 복습에 등장
      const t = today();
      const i = Number(body.i);
      const r = (await get(env, `diary:${u.id}:${t}`))?.review;
      const p = r?.practice?.[i];
      if (!p) throw err(400, '첨삭을 다시 받아 주세요');
      const id = `c-${t}-${r.at}-${i}`; // 다시 첨삭받아도 앞서 넣은 문제를 덮어쓰지 않게
      u.custom ??= {};
      u.custom[id] = { id, lv: u.level, tag: '내 일기 복습', s: p.s, ko: p.ko, alt: [], bank: p.bank, tip: p.tip || '내 일기에서 고친 표현' };
      u.items[id] = { box: 0, right: 0, wrong: 1, first: t, due: addDays(t, 1), last: t };
      await saveUser();
      return json({ id });
    }
    case 'POST /api/diary/nudge': {
      // 아직 오늘 일기를 안 쓴 친구에게 '일기 써' 알림. 몇 번이든 보낼 수 있다
      const t = today();
      const to = String(body.uid || '');
      if (!USERS[to] || to === u.id) throw err(400, '없는 친구예요');
      if ((await get(env, `diary:${to}:${t}`))?.text) throw err(400, '벌써 일기를 썼어요');
      if (!(await subscriptions(env, to))?.length) throw err(400, `${nameOf(to)}님이 알림을 꺼 두었어요`);
      notifyLater(env, [to], { title: `🔔 ${nameOf(u.id)}님이 일기 쓰래요`, body: `오늘의 질문: ${promptOf(t).ko}`, url: '/#/diary' });
      return json({});
    }
    case 'POST /api/diary/comment': {
      const text = commentText(body.text);
      const owner = String(body.uid ?? '');
      const date = String(body.date ?? '');
      if (!text || !USERS[owner] || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw err(400, '댓글을 확인해 주세요');
      const k = `diary:${owner}:${date}`;
      const e = await get(env, k);
      if (!e?.text) throw err(404, '아직 일기가 없어요');
      e.comments = withIds(e.comments);
      // 답글은 한 단계만(댓글 → 답글). 답글에 또 답글은 없다
      const parent = body.parent ? String(body.parent) : null;
      if (parent && !e.comments.some(c => c.id === parent && !c.parent)) throw err(400, '답글을 달 댓글이 없어요');
      // 같은 사람이 같은 글을 10초 안에 또 보내면(두 번 누름·네트워크 재전송) 한 번만 저장한다
      // ponytail: 읽고-쓰기 사이 동시 요청은 못 막음. 필요해지면 Idempotency-Key + D1 유니크 키로
      if (e.comments.some(c => c.by === u.id && c.text === text && (c.parent ?? null) === parent && Date.now() - c.at < 10_000)) return json({ comments: e.comments });
      e.comments.push({ id: randomHex(6), by: u.id, name: nameOf(u.id), text, at: Date.now(), ...(parent ? { parent } : {}) });
      await put(env, k, e);
      // 일기 주인과(답글이면) 원댓글 작성자에게 알림 — 내가 나에게는 X. @태그된 사람은 '태그' 알림 하나만
      const tagged = mentionsIn(text).filter(id => id !== u.id);
      const targets = new Set();
      if (owner !== u.id) targets.add(owner);
      const pc = parent && e.comments.find(c => c.id === parent);
      if (pc && pc.by !== u.id) targets.add(pc.by);
      tagged.forEach(id => targets.delete(id));
      const url = `/#/diary/${date}`;
      notifyLater(env, [...targets], { title: `💬 ${nameOf(u.id)}님의 ${parent ? '답글' : '댓글'}`, body: text.slice(0, 80), url });
      notifyLater(env, tagged, { title: `📣 ${nameOf(u.id)}님이 나를 태그했어요`, body: text.slice(0, 80), url });
      return json({ comments: e.comments });
    }
    case 'POST /api/diary/comment/edit':
    case 'POST /api/diary/comment/delete': {
      const owner = String(body.uid ?? '');
      const date = String(body.date ?? '');
      const id = String(body.id ?? '');
      if (!USERS[owner] || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !id) throw err(400, '댓글을 확인해 주세요');
      const k = `diary:${owner}:${date}`;
      const e = await get(env, k);
      if (!e?.text) throw err(404, '아직 일기가 없어요');
      e.comments = withIds(e.comments);
      const c = e.comments.find(x => x.id === id);
      if (!c) throw err(404, '댓글이 없어요');
      if (c.by !== u.id) throw err(403, '내 댓글만 고치거나 지울 수 있어요');
      if (c.deleted) throw err(400, '삭제된 댓글이에요');
      if (route.endsWith('/edit')) {
        const text = commentText(body.text);
        if (!text) throw err(400, '내용을 써 주세요');
        // 고치면서 새로 태그한 사람에게만 알림
        const before = mentionsIn(c.text);
        const added = mentionsIn(text).filter(id => id !== u.id && !before.includes(id));
        c.text = text;
        c.editedAt = Date.now();
        notifyLater(env, added, { title: `📣 ${nameOf(u.id)}님이 나를 태그했어요`, body: text.slice(0, 80), url: `/#/diary/${date}` });
      } else if (e.comments.some(x => x.parent === id)) {
        c.deleted = true; // 답글이 달린 댓글은 자리만 남긴다
        c.text = '';
      } else e.comments = e.comments.filter(x => x.id !== id);
      // 마지막 답글이 지워지면 자리만 남아 있던 삭제 댓글도 치운다
      e.comments = e.comments.filter(x => !x.deleted || e.comments.some(r => r.parent === x.id));
      await put(env, k, e);
      return json({ comments: e.comments });
    }
    case 'GET /api/wrongs': {
      const items = Object.entries(u.items)
        .filter(([id, s]) => itemOf(u, id) && atLevel(u, id) && !graduated(s))
        .sort((a, b) => b[1].wrong - a[1].wrong)
        .map(([id, s]) => ({ ...itemOf(u, id), ...s, leech: s.wrong >= LEECH }));
      return json({ items });
    }
    case 'POST /api/wrongs/delete': {
      // 오답노트에서 빼기: 일기 복습 문제는 통째로 지우고, 기본 문제는 틀린 기록만 지운다(= 아는 문제로 졸업, 다시 안 나옴)
      const id = String(body.id || '');
      const s = u.items[id];
      if (!s) throw err(404, '없는 문제예요');
      if (id.startsWith('c-')) delete u.items[id], delete u.custom?.[id];
      else s.wrong = 0;
      await saveUser();
      return json({});
    }
    case 'POST /api/report': {
      // AI 문제 신고: 공용 풀에서 바로 뺀다(사람이 검수한 고정 문제는 대상 아님)
      const x = GEN.byId.get(String(body.id || ''));
      if (!x) throw err(404, '없는 문제예요');
      await env.DB.prepare('UPDATE gen SET v = ? WHERE id = ?').bind(JSON.stringify({ ...x, reported: u.id }), x.id).run();
      console.log(`report ${x.id} by ${u.id}`);
      GEN.at = 0; // 다음 요청에서 다시 읽기
      return json({});
    }
  }
  throw err(404, 'not found');
}

// 댓글 본문: 앞뒤 공백 제거, 빈 줄은 한 줄까지만, 300자
const commentText = t => String(t ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 300);

export default {
  // Cron(wrangler.jsonc env.app의 triggers): 아침 새 문제 보충, 저녁 리마인더는 그날 미션을 안 끝낸 사람에게만
  async scheduled(event, env) {
    USERS = parseUsers(env);
    await init(env);
    if (event.cron === GEN_CRON) return refill(env);
    const t = today();
    for (const uid of Object.keys(USERS)) {
      const x = await get(env, 'user:' + uid);
      if (!x) continue;
      const left = ['word', 'grammar'].filter(k => !x.days?.[t]?.[k]?.done);
      if (!left.length || !(await subscriptions(env, uid)).length) continue;
      await notify(env, uid, { title: '⏰ 오늘 미션이 아직이에요', body: `${left.map(k => KIND_KO[k]).join('·')} 미션을 끝내고 연속 기록을 지켜요`, url: '/#/home' });
    }
  },
  async fetch(req, env, ctx) {
    USERS = parseUsers(env);
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    // 알림 보내기는 응답을 먼저 돌려준 뒤 뒤에서(사용자가 버튼을 누르고 기다리지 않게)
    later = p => ctx.waitUntil(Promise.resolve(p).catch(e => console.log('later error', e.message)));
    try {
      return await api(req, env, url);
    } catch (e) {
      if (!e.status) console.error(e);
      return json({ error: e.status ? e.message : '서버 오류' }, e.status || 500);
    }
  },
};
