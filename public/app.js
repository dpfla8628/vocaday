// 보카데이 프론트엔드 — 프레임워크 없이 해시 라우팅 + 템플릿 문자열
import { plain, blankParts, norm, grade, fromSpeech, maskAnswer, formName } from './grade.js';
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const LEVELS = {
  1: ['초등', '교과서 기본 어휘 · 기초 문장'],
  2: ['중등', '중학 필수 어휘 · 기본 문법'],
  3: ['고등', '고교·수능 어휘 · 심화 문법'],
  4: ['실전', '토익·회화 고급 어휘 · 원어민 표현'],
};
const PLAN_NAMES = { light: '라이트', normal: '노멀', hard: '하드' };
const POS = { 명: '명사', 동: '동사', 형: '형용사', 부: '부사', 전: '전치사', 접: '접속사', 대: '대명사', 조: '조동사', 감: '감탄사', 숙어: '숙어' };
const KIND_NAMES = { word: '단어', grammar: '문법·표현' };
const pref = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
}; // 기기별 취향(문법 풀이 방식) 기억
const SR = window.SpeechRecognition || window.webkitSpeechRecognition; // 음성 인식(크롬·엣지·사파리)
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b; }; // 받침 유무로 이/가

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  wrongs: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 12h6M9 16h4"/>',
  friends: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21.5 19"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  diary: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};
const icon = (name, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

async function api(path, body) {
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}).catch(() => {
    throw new Error('인터넷 연결을 확인하고 다시 눌러 주세요');
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') {
    go('#/login');
    throw new Error('login');
  }
  if (!r.ok) throw new Error(data.error || '오류가 났어요');
  return data;
}

// ---------- 소리 ----------
function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
let audio;
function beep(ok) {
  try {
    audio ??= new AudioContext();
    const notes = ok ? [660, 990] : [220, 180];
    notes.forEach((f, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      const t = audio.currentTime + i * 0.09;
      o.frequency.value = f;
      o.type = ok ? 'sine' : 'triangle';
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.17);
    });
  } catch {}
}

// ---------- 라우터 ----------
const go = h => (location.hash === h ? route() : (location.hash = h));
const routes = { login, home, quiz, wrongs, friends, settings, placement, diary };
async function route() {
  const [, name = 'home', ...args] = location.hash.split('/');
  window.speechSynthesis?.cancel();
  document.onkeydown = null;
  try {
    await (routes[name] || home)(...args);
    window.scrollTo(0, 0);
  } catch (e) {
    if (e.message !== 'login') app.innerHTML = `<div class="page"><p class="error">${esc(e.message)}</p><a class="btn" href="#/home">홈으로</a></div>`;
  }
}

const tabs = active =>
  `<nav class="tabs">${[
    ['home', '홈'],
    ['wrongs', '오답노트'],
    ['diary', '일기'],
    ['friends', '친구'],
    ['settings', '설정'],
  ]
    .map(([k, l]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}">${icon(k)}<span>${l}</span></a>`)
    .join('')}</nav>`;

const heat = history =>
  `<div class="heat">${history
    .map(h => {
      const lv = h.done ? 4 : h.answered >= 30 ? 3 : h.answered >= 10 ? 2 : h.answered ? 1 : 0;
      const day = '일월화수목금토'[new Date(h.date + 'T00:00:00').getDay()];
      return `<div class="cell l${lv}" title="${h.date} · ${h.answered}문제 ${h.done ? '· 완료' : ''}"><i></i><span>${day}</span></div>`;
    })
    .join('')}</div>`;

// ---------- 로그인 ----------
function login() {
  app.innerHTML = `
  <section class="page login">
    <div class="brand"><div class="logo">V</div><h1>보카데이</h1><p class="sub">매일 단어 하나, 문장 하나.<br>친구랑 같이 하는 영어 습관</p></div>
    <form id="f" class="card">
      <label>아이디<input name="id" autocomplete="username" autocapitalize="off" required></label>
      <label>비밀번호<input name="pw" type="password" autocomplete="current-password" required></label>
      <p class="error" id="msg" role="alert"></p>
      <button class="btn primary big">로그인</button>
    </form>
  </section>`;
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('login', { id: f.get('id'), pw: f.get('pw') });
      go('#/home');
    } catch (x) {
      $('#msg').textContent = x.message;
    }
  };
}

// ---------- 홈 ----------
async function home() {
  const [me, board] = await Promise.all([api('me'), api('board')]);
  if (!me.placed) return go('#/placement'); // 처음엔 레벨 테스트부터
  const friend = board.users.find(u => u.id !== me.id);
  const todayDone = me.today.word.done && me.today.grammar.done;
  app.innerHTML = `
  <section class="page">
    <header class="top">
      <div><p class="sub">${LEVELS[me.level][0]} · ${PLAN_NAMES[me.plan]}</p><h1>${esc(me.name)}님,<br>${todayDone ? '오늘 미션 끝! 👏' : '오늘도 한 걸음'}</h1></div>
      <div class="streak ${me.streak ? 'on' : ''}" title="연속 학습일"><b>🔥</b>${me.streak}<small>일 연속</small></div>
    </header>
    <h2 class="section">오늘의 미션</h2>
    <div class="missions">${mission('word', me)}${mission('grammar', me)}</div>
    <a class="card diary-card ${me.diaryToday ? 'done' : ''}" href="#/diary"><span class="mtag">${me.diaryToday ? 'DONE' : 'BONUS'}</span><div class="grow"><b>오늘의 영어 일기</b><p class="small">${me.diaryToday ? '오늘 일기 작성 완료 · 친구 댓글 확인하기' : '3줄이면 충분해요 · AI 첨삭 · 친구와 댓글'}</p></div><span class="go">${me.diaryToday ? '보기 →' : '쓰기 →'}</span></a>
    <div class="card stats">
      ${stat(me.learned, '학습한 문제')}${stat(me.mastered, '완전 암기')}${stat(me.wrongNote, '오답노트')}${stat(me.accuracy7 == null ? '–' : me.accuracy7 + '%', '7일 정답률')}
    </div>
    <div class="card"><h3>최근 2주</h3>${heat(me.history)}</div>
    ${friend ? friendMini(friend, board.together) : ''}
  </section>
  ${tabs('home')}`;
}
const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;

function mission(kind, me) {
  const p = me.preview[kind];
  const t = me.today[kind];
  const left = p.new + p.review;
  const doneCount = t.new + t.review;
  const pct = left + doneCount ? Math.round((doneCount / (left + doneCount)) * 100) : t.done ? 100 : 0;
  const finished = !left && (t.done || doneCount);
  const desc = kind === 'word' ? '빈칸에 들어갈 단어 맞히기' : '빈칸에 문장 채우기';
  return `
  <a class="mission m-${kind} ${finished ? 'done' : ''}" href="${left ? `#/quiz/${kind}` : '#/home'}">
    <div class="mtop"><span class="mtag">${kind === 'word' ? 'VOCA' : 'GRAMMAR'}</span>${finished ? '<span class="check">✓</span>' : ''}</div>
    <h3>${KIND_NAMES[kind]}</h3>
    <p>${desc}</p>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="mfoot">${
      left ? `<span>새 문제 <b>${p.new}</b> · 복습 <b>${p.review}</b></span><span class="go">시작 →</span>` : `<span>${finished ? '오늘 완료!' : '오늘은 쉬어가요'}</span>`
    }</div>
  </a>`;
}

function friendMini(f, together) {
  const s = k => (f.today[k].done ? '<span class="pill ok">완료</span>' : f.today[k].answered ? `<span class="pill">${f.today[k].answered}문제</span>` : '<span class="pill off">아직</span>');
  return `
  <a class="card friend-mini" href="#/friends">
    <div class="avatar">${esc(f.name.slice(0, 1))}</div>
    <div class="grow"><b>${esc(f.name)}</b> <span class="sub">🔥 ${f.streak}일</span>
      <div class="row">단어 ${s('word')} 문법 ${s('grammar')} 일기 ${f.diaryToday ? '<span class="pill ok">완료</span>' : '<span class="pill off">아직</span>'}</div></div>
    <div class="together"><b>${together}</b><span>함께 연속</span></div>
  </a>`;
}

// ---------- 퀴즈 ----------
async function quiz(kind, mode) {
  if (!KIND_NAMES[kind]) return go('#/home');
  const { items, headwords } = await api(`session?kind=${kind}${mode ? '&mode=' + mode : ''}`);
  const known = new Set(headwords.map(norm));
  if (!items.length) {
    if (!mode) await api('finish', { kind });
    app.innerHTML = `<section class="page center"><div class="big-emoji">🌿</div><h1>지금은 풀 문제가 없어요</h1><p class="sub">내일 복습할 문제가 다시 찾아와요.</p><a class="btn primary big" href="#/home">홈으로</a></section>`;
    return;
  }

  const q = [...items];
  const seen = new Set();
  const misses = new Map(); // 이번 세션에서 문제별로 틀린 횟수 — 2번 틀리면 오늘은 그만(내일 복습에 이미 들어가 있음)
  const MAX_MISSES = 2;
  const right = [];
  const wrong = [];
  let attempts = 0;

  next();

  // 문제 종류 뱃지: 방금 틀려서 다시 나온 문제 > 오답노트 > 지난 복습 > 오늘 새 문제
  function badge(it) {
    if (misses.get(it.id)) return '<span class="chip warn">틀린 문제 · 다시</span>';
    if (mode === 'wrong') return `<span class="chip warn">오답 복습${it.wrongCount ? ` · ${it.wrongCount}번 틀림` : ''}</span>`;
    if (it.isNew) return '<span class="chip new">새 문제</span>';
    return `<span class="chip">복습</span>${it.wrongCount ? `<span class="chip warn">${it.wrongCount}번 틀렸던 문제</span>` : ''}`;
  }

  function next() {
    if (!q.length) return finish();
    const it = q[0];
    // 기본은 말해보카식 빈칸 문장(타자·음성). 복습 1·3단계에서만 4지선다로 환기
    // 문법은 단어 블록 배열이 기본(직접 쓰기는 선택)
    const type = kind === 'grammar' ? (pref.get('grammarTyping') ? 'cloze' : 'blocks') : it.box === 1 ? 'en2ko' : it.box === 3 ? 'ko2en' : 'cloze';
    const pct = Math.round((attempts / (attempts + q.length)) * 100);
    app.innerHTML = `
    <section class="quiz">
      <div class="qbar">
        <a href="#/home" class="iconbtn" aria-label="그만하기">${icon('close')}</a>
        <div class="bar grow"><i style="width:${pct}%"></i></div>
        <span class="count">${q.length}개 남음</span>
      </div>
      <div class="qbody">
        <div class="qmeta">${badge(it)}${it.tag ? `<span class="chip soft">${esc(it.tag)}</span>` : ''}</div>
        ${type === 'cloze' ? clozeView(it, kind) : type === 'blocks' ? blocksView(it) : choiceView(it, type)}
      </div>
      <div class="sheet" id="sheet"></div>
    </section>`;
    ({ cloze: bindCloze, blocks: bindBlocks }[type] || bindChoice)(it, type);
  }

  function choiceView(it, type) {
    const opts = shuffle([{ en: it.en, ko: it.ko, ok: 1 }, ...it.distractors]);
    const prompt = type === 'en2ko' ? '이 단어의 뜻은?' : '이 뜻의 영어 단어는?';
    const head =
      type === 'en2ko'
        ? `<div class="word">${esc(it.en)} <button class="iconbtn" id="say" aria-label="발음 듣기">${icon('speaker')}</button></div>`
        : `<div class="word ko">${esc(it.ko)}</div>`;
    return `<p class="prompt">${prompt}</p>${head}${it.pos ? `<p class="pos">${esc(POS[it.pos] || it.pos)}</p>` : ''}
      <div class="choices">${opts
        .map((o, i) => `<button class="choice" data-ok="${o.ok ? 1 : ''}"><kbd>${i + 1}</kbd>${esc(type === 'en2ko' ? o.ko : o.en)}</button>`)
        .join('')}</div>`;
  }

  function bindChoice(it, type) {
    if (type === 'en2ko') speak(it.en);
    $('#say')?.addEventListener('click', () => speak(it.en));
    const btns = [...document.querySelectorAll('.choice')];
    const pick = b => {
      if (btns[0].disabled) return;
      btns.forEach(x => (x.disabled = true));
      const ok = !!b.dataset.ok;
      btns.forEach(x => x.dataset.ok && x.classList.add('right'));
      if (!ok) b.classList.add('wrong');
      result(it, ok ? 'ok' : 'bad');
    };
    btns.forEach(b => (b.onclick = () => pick(b)));
    document.onkeydown = e => {
      if (btns[e.key - 1]) pick(btns[e.key - 1]);
    };
  }

  function clozeView(it, kind) {
    const src = kind === 'word' ? it.ex : it.s;
    const [before, ans, after] = blankParts(src);
    const ko = kind === 'word' ? it.exKo : it.ko;
    return `
      <p class="prompt">${kind === 'word' ? '빈칸에 알맞은 단어를 쓰세요' : '빈칸을 채워 문장을 완성하세요'}</p>
      <p class="ko-sentence">${esc(ko)}</p>
      <div class="sentence">${esc(before)}<input id="blank" class="blank" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(ans.length, 4) + 1}ch" placeholder="${kind === 'word' ? maskAnswer(ans) : ''}" aria-label="빈칸">${esc(after)}</div>
      ${kind === 'word' ? `<p class="hint-line">뜻: <b>${esc(it.ko)}</b></p>` : ''}
      <p class="hint-line" id="hint"></p>
      <div class="actions">
        ${SR ? `<button class="btn mic" id="mic">${icon('mic', 18)} 말로 답하기</button>` : ''}
        <button class="btn ghost" id="hintBtn">힌트 보기</button>
        ${kind === 'grammar' ? '<button class="btn ghost" id="blockMode">🧩 블록으로 풀기</button>' : ''}
        <button class="btn ghost" id="giveup">정답 보기</button>
      </div>
      <button class="btn primary big" id="check">확인</button>`;
  }

  // 문법: 단어 블록을 눌러 빈칸을 채운다(정답 단어 + 헷갈리는 오답 블록)
  function blocksView(it) {
    const [before, ans, after] = blankParts(it.s);
    return `
      <p class="prompt">블록을 순서대로 눌러 빈칸을 채우세요</p>
      <p class="ko-sentence">${esc(it.ko)}</p>
      <div class="sentence">${esc(before)}<span class="slots" id="slots"></span>${esc(after)}</div>
      <p class="hint-line" id="hint">빈칸에 들어갈 단어 ${ans.split(' ').length}개</p>
      <div class="bank" id="bank"></div>
      <div class="actions">
        <button class="btn ghost" id="hintBtn">첫 글자 힌트</button>
        <button class="btn ghost" id="typeMode">⌨️ 직접 쓰기</button>
        <button class="btn ghost" id="giveup">정답 보기</button>
      </div>
      <button class="btn primary big" id="check" disabled>확인</button>`;
  }

  function bindBlocks(it) {
    const ans = blankParts(it.s)[1];
    const words = ans.split(' ');
    const tiles = shuffle([...words, ...(it.bank || [])]);
    const placed = words.map(() => null); // 칸마다 놓인 블록 번호
    let hinted = false;
    let done = false;
    const render = () => {
      $('#slots').innerHTML = words
        .map((w, k) =>
          placed[k] != null
            ? `<button class="tile in" data-k="${k}">${esc(tiles[placed[k]])}</button>`
            : `<span class="slot">${hinted ? esc(w[0]) + '·' : ''}</span>`,
        )
        .join('');
      $('#bank').innerHTML = tiles
        .map((t, j) => `<button class="tile ${placed.includes(j) ? 'used' : ''}" data-j="${j}" ${placed.includes(j) ? 'disabled' : ''}>${esc(t)}</button>`)
        .join('');
      $('#check').disabled = placed.includes(null);
    };
    const put = j => {
      const k = placed.indexOf(null);
      if (k < 0 || done) return;
      placed[k] = j;
      render();
    };
    const take = k => {
      if (done) return;
      placed[k] = null;
      render();
    };
    $('#bank').onclick = e => {
      const b = e.target.closest('[data-j]');
      if (b) put(+b.dataset.j);
    };
    $('#slots').onclick = e => {
      const b = e.target.closest('[data-k]');
      if (b) take(+b.dataset.k);
    };
    $('#hintBtn').onclick = () => {
      hinted = true;
      $('#hintBtn').disabled = true;
      render();
    };
    $('#typeMode').onclick = () => {
      pref.set('grammarTyping', '1');
      next();
    };
    const check = () => {
      if (done || placed.includes(null)) return;
      done = true;
      const text = placed.map(j => tiles[j]).join(' ');
      const ok = grade(text, [ans, ...(it.alt || [])]) === 'ok';
      $('#slots').classList.add(ok ? 'right' : 'wrong');
      result(it, ok ? 'ok' : 'bad', text);
    };
    $('#check').onclick = check;
    $('#giveup').onclick = () => {
      if (done) return;
      done = true;
      words.forEach((w, k) => (placed[k] = tiles.indexOf(w, 0)));
      render();
      $('#slots').classList.add('wrong');
      result(it, 'reveal');
    };
    document.onkeydown = e => {
      if (e.key === 'Enter') check();
      if (e.key === 'Backspace') {
        const k = placed.findLastIndex(x => x != null);
        if (k >= 0) take(k);
      }
    };
    render();
  }

  // 음성 입력: 빈칸 단어만 말해도, 문장 전체를 말해도 된다
  function listen(before, answers, after, onText) {
    const mic = $('#mic');
    const rec = new SR();
    rec.lang = 'en-US';
    rec.maxAlternatives = 5;
    rec.interimResults = false;
    mic.classList.add('on');
    mic.disabled = true;
    $('#hint').textContent = '듣고 있어요… 빈칸 단어나 문장 전체를 말해 보세요';
    rec.onresult = e => {
      const heard = [...e.results[0]].map(r => r.transcript);
      $('#hint').textContent = `들린 말: "${heard[0]}"`;
      onText(fromSpeech(heard, answers, before, after));
    };
    rec.onerror = e => {
      $('#hint').textContent =
        e.error === 'not-allowed' || e.error === 'service-not-allowed' ? '마이크 권한을 허용해 주세요' : '잘 못 들었어요. 다시 말해 볼까요?';
    };
    rec.onend = () => {
      mic.classList.remove('on');
      mic.disabled = false;
    };
    rec.start();
  }

  function bindCloze(it) {
    const src = kind === 'word' ? it.ex : it.s;
    const ans = blankParts(src)[1];
    const input = $('#blank');
    input.focus();
    // 입력 길이에 맞춰 빈칸이 늘어난다
    input.oninput = () => (input.style.width = Math.max(ans.length, input.value.length, 4) + 1 + 'ch');
    let hintLv = 0;
    $('#hintBtn').onclick = () => {
      hintLv++;
      const n = hintLv === 1 ? 1 : 2;
      $('#hint').textContent = '힌트: ' + ans.split(' ').map(w => w.slice(0, n) + '·'.repeat(Math.max(w.length - n, 0))).join(' ');
      if (hintLv >= 2) $('#hintBtn').disabled = true;
      input.focus();
    };
    let retried = false;
    const check = () => {
      if (input.disabled) return;
      if (!input.value.trim()) return input.focus();
      const g = grade(input.value, [ans, ...(it.alt || [])]);
      // 한 번은 오답 대신 다시 기회: ① 표제어 그대로 썼는데 문장은 다른 형태가 필요 ② 빈칸 단어 수가 다름(앞뒤 말까지 씀) ③ 다른 실제 단어·같은 뜻 표현
      const typed = norm(input.value);
      if (g !== 'ok' && !retried) {
        const core = kind === 'word' ? norm(it.en) : norm(ans);
        const ansWords = ans.split(' ').length;
        const after = blankParts(src)[2].trim().split(' ')[0];
        // 긴 단어는 비슷한 동의어와 갈리도록 앞 3글자까지 보여 준다
        const first = '힌트: ' + ans.split(' ').map(w => { const n = w.length >= 8 ? 3 : 1; return w.slice(0, n) + '·'.repeat(w.length - n); }).join(' ');
        let hint = '';
        if (kind === 'word' && typed === core && norm(ans) !== core)
          hint = `단어는 맞았어요! 이 문장에는 ${formName(ans, it.en)}${josa(formName(ans, it.en), '이', '가')} 들어가요(${ans.replace(/ /g, '').length}글자). 문장의 시제·수를 보고 형태를 바꿔 보세요.`;
        else if (typed.split(' ').length !== ansWords && (typed.includes(core) || typed.includes(norm(ans))))
          hint = `빈칸에는 ${ansWords}단어만 들어가요. 앞뒤에 이미 있는 말${after ? `('${after}' 등)` : ''}은 빼고 써 보세요.`;
        else if (g === 'bad' && (known.has(typed) || (it.near || []).some(n => norm(n) === typed))) hint = `말이 되는 표현이지만, 지금 연습하는 단어는 따로 있어요. ${first}`;
        if (hint) {
          retried = true;
          $('#hint').textContent = hint;
          input.select();
          return;
        }
      }
      input.disabled = true;
      input.classList.add(g === 'ok' ? 'right' : 'wrong');
      result(it, g, input.value);
    };
    $('#check').onclick = check;
    $('#blockMode')?.addEventListener('click', () => {
      pref.set('grammarTyping', '');
      next();
    });
    $('#mic')?.addEventListener('click', () => {
      const [before, , after] = blankParts(src);
      listen(before, [ans, ...(it.alt || [])], after, text => {
        if (input.disabled) return;
        input.value = text;
        input.oninput();
        check();
      });
    });
    $('#giveup').onclick = () => {
      input.disabled = true;
      input.value = ans;
      input.classList.add('wrong');
      result(it, 'reveal');
    };
    // 핸들러가 false를 반환하면 입력이 막히므로 블록 본문으로 쓴다
    document.onkeydown = e => {
      if (e.key === 'Enter') check();
    };
  }

  function result(it, g, typed) {
    const ok = g === 'ok';
    attempts++;
    const missed = ok ? misses.get(it.id) ?? 0 : (misses.get(it.id) ?? 0) + 1;
    if (!ok) misses.set(it.id, missed);
    if (!seen.has(it.id)) {
      seen.add(it.id);
      (ok ? right : wrong).push(it);
      api('answer', { id: it.id, correct: ok }).catch(() => {});
    }
    beep(ok);
    const full = plain(kind === 'word' ? it.ex : it.s);
    const ans = blankParts(kind === 'word' ? it.ex : it.s)[1];
    // 단어는 맞는데 문장에 맞는 형태(과거형 등)가 아닌 경우는 철자 실수와 다르게 안내한다
    const form = kind === 'word' ? formName(ans, it.en) : '';
    const formMiss = !ok && form && typed && norm(typed) === norm(it.en);
    const title = {
      ok: '정답이에요!',
      close: formMiss ? '단어는 맞는데, 형태가 달라요' : '거의 맞았어요! 한 글자 차이예요',
      bad: formMiss ? '단어는 맞는데, 형태가 달라요' : '아쉬워요',
      reveal: '정답을 확인해요',
    }[g];
    const posTag = it.pos ? `<i>${esc(POS[it.pos] || it.pos)}</i>` : '';
    const wordAns = form
      ? `<p class="ans">정답: <b>${esc(ans)}</b> <span class="gloss">${esc(it.en)}의 ${esc(form)}</span></p><p class="ans"><b>${esc(it.en)}</b> ${posTag} ${esc(it.ko)}</p>`
      : `<p class="ans">정답: <b>${esc(it.en)}</b> ${posTag} ${esc(it.ko)}</p>`;
    const sheet = $('#sheet');
    sheet.className = 'sheet show ' + (ok ? 'ok' : 'bad');
    sheet.innerHTML = `
      <div class="sheet-in">
        <h3>${ok ? '✓' : '✕'} ${title}</h3>
        ${kind === 'word' ? wordAns : `<p class="ans">정답: <b>${esc(ans)}</b></p>`}
        ${(g === 'close' || g === 'bad') && typed ? `<p class="small">내 답: <s>${esc(typed)}</s>${formMiss ? ` → 이 문장에서는 <b>${esc(ans)}</b>(${esc(form)})${josa(ans, '이', '가')} 들어가요.` : ''}</p>` : ''}
        <p class="full"><button class="iconbtn" id="sayFull" aria-label="문장 듣기">${icon('speaker', 18)}</button>${esc(full)}</p>
        ${it.tip ? `<p class="tip">💡 ${esc(it.tip)}</p>` : ''}
        ${ok ? '' : `<p class="small">${missed < MAX_MISSES ? '이 문제는 잠시 뒤에 한 번 더, 그리고 내일 다시 나와요.' : '오늘은 여기까지! 이 문제는 내일 복습에서 다시 만나요.'}</p>`}
        <button class="btn big ${ok ? 'success' : 'danger'}" id="cont">계속하기</button>
      </div>`;
    speak(full);
    $('#sayFull').onclick = () => speak(full);
    let moved = false;
    const cont = () => {
      if (moved) return; // 버튼 클릭 + Enter가 겹쳐 두 문제를 건너뛰지 않게
      moved = true;
      q.shift();
      // 틀린 문제는 3문제 뒤에 한 번만 다시. 두 번 틀리면 오늘은 넘어간다(내일 복습에 이미 잡혀 있음)
      if (!ok && missed < MAX_MISSES) q.splice(Math.min(3, q.length), 0, it);
      next();
    };
    $('#cont').onclick = cont;
    setTimeout(() => {
      document.onkeydown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          cont();
        }
      };
    }, 50);
  }

  async function finish() {
    document.onkeydown = null;
    if (!mode) await api('finish', { kind });
    const total = right.length + wrong.length;
    const acc = total ? Math.round((right.length / total) * 100) : 0;
    app.innerHTML = `
    <section class="page center done-page">
      <div class="big-emoji">${acc >= 80 ? '🎉' : acc >= 50 ? '💪' : '🌱'}</div>
      <h1>${mode ? '오답 복습' : KIND_NAMES[kind]} 완료!</h1>
      <p class="sub">${acc >= 80 ? '완벽에 가까워요' : acc >= 50 ? '좋아요, 틀린 건 내일 또 만나요' : '틀린 만큼 기억에 남아요'}</p>
      <div class="card stats">${stat(acc + '%', '첫 시도 정답률')}${stat(right.length, '맞힘')}${stat(wrong.length, '틀림')}</div>
      ${
        wrong.length
          ? `<div class="card left"><h3>내일 다시 나올 문제</h3><ul class="list">${wrong
              .map(it => `<li>${kind === 'word' ? `<b>${esc(it.en)}</b><span>${esc(it.ko)}</span>` : `<span>${esc(plain(it.s))}</span>`}</li>`)
              .join('')}</ul></div>`
          : ''
      }
      <a class="btn primary big" href="#/home">홈으로</a>
    </section>`;
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- 오답노트 ----------
async function wrongs(kind = 'word') {
  const { items } = await api('wrongs');
  const list = items.filter(x => x.kind === kind);
  const count = k => items.filter(x => x.kind === k).length;
  app.innerHTML = `
  <section class="page">
    <header class="top"><div><p class="sub">틀린 문제는 맞힐 때까지 매일 돌아와요</p><h1>오답노트</h1></div></header>
    <div class="seg">${['word', 'grammar']
      .map(k => `<a href="#/wrongs/${k}" class="${k === kind ? 'on' : ''}">${KIND_NAMES[k]} <b>${count(k)}</b></a>`)
      .join('')}</div>
    ${
      list.length
        ? `<a class="btn primary big" href="#/quiz/${kind}/wrong">오답 ${list.length}개 지금 다시 풀기</a>
      <ul class="card list wrong-list">${list
        .map(
          x => `<li>
          <div class="grow">${
            kind === 'word'
              ? `<b>${esc(x.en)}</b> <span class="sub">${esc(x.ko)}</span>`
              : `<span>${esc(blankParts(x.s)[0])}<u>${esc(blankParts(x.s)[1])}</u>${esc(blankParts(x.s)[2])}</span><br><span class="sub">${esc(x.ko)}</span>`
          }</div>
          <div class="wmeta">${x.leech ? '<span class="chip warn">약점</span>' : ''}<span class="chip">${x.wrong}회</span><small>다음 ${x.due.slice(5).replace('-', '/')}</small></div>
        </li>`,
        )
        .join('')}</ul>`
        : `<div class="card center empty"><div class="big-emoji">✨</div><p>틀린 ${KIND_NAMES[kind]} 문제가 없어요</p></div>`
    }
  </section>
  ${tabs('wrongs')}`;
}

// ---------- 친구 ----------
async function friends() {
  const { me, users, together } = await api('board');
  users.sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0));
  const status = (u, k) =>
    u.today[k].done ? '<span class="pill ok">완료</span>' : u.today[k].answered ? `<span class="pill">${u.today[k].answered}문제 진행</span>` : '<span class="pill off">아직</span>';
  app.innerHTML = `
  <section class="page">
    <header class="top"><div><p class="sub">서로의 공부를 확인해요</p><h1>친구</h1></div></header>
    <div class="card together-card">
      <div><b>🤝 ${together}일</b><span>둘 다 미션을 끝낸 연속 일수</span></div>
      <p class="sub">${users.every(u => u.today.word.done && u.today.grammar.done) ? '오늘 둘 다 완료! 최고예요' : '둘 다 오늘 미션을 끝내면 +1'}</p>
    </div>
    ${users
      .map(
        u => `
      <div class="card person ${u.id === me ? 'me' : ''}">
        <div class="phead">
          <div class="avatar">${esc(u.name.slice(0, 1))}</div>
          <div class="grow"><b>${esc(u.name)}</b>${u.id === me ? ' <span class="chip">나</span>' : ''}<p class="sub">${LEVELS[u.level][0]} · ${PLAN_NAMES[u.plan]}</p></div>
          <div class="streak ${u.streak ? 'on' : ''}"><b>🔥</b>${u.streak}<small>일</small></div>
        </div>
        <div class="row today-row"><span>오늘 단어 ${status(u, 'word')}</span><span>문법 ${status(u, 'grammar')}</span><span>일기 ${u.diaryToday ? '<span class="pill ok">완료</span>' : '<span class="pill off">아직</span>'}</span></div>
        <div class="stats">${stat(u.learned, '학습')}${stat(u.mastered, '암기')}${stat(u.wrongNote, '오답')}${stat(u.accuracy7 == null ? '–' : u.accuracy7 + '%', '7일 정답률')}</div>
        ${heat(u.history)}
      </div>`,
      )
      .join('')}
  </section>
  ${tabs('friends')}`;
}

// ---------- 설정 ----------
async function settings() {
  const me = await api('me');
  let level = me.level;
  let plan = me.plan;
  app.innerHTML = `
  <section class="page">
    <header class="top"><div><p class="sub">${esc(me.name)} · ${esc(me.id)}</p><h1>설정</h1></div></header>
    <h2 class="section">내 레벨</h2>
    <div class="options" id="levels">${Object.entries(LEVELS)
      .map(([k, [name, d]]) => `<button class="option ${+k === level ? 'on' : ''}" data-v="${k}"><b>${name}</b><span>${d}</span></button>`)
      .join('')}</div>
    <h2 class="section">하루 학습량</h2>
    <div class="options three" id="plans">${Object.entries(me.plans)
      .map(([k, p]) => `<button class="option ${k === plan ? 'on' : ''}" data-v="${k}"><b>${PLAN_NAMES[k]}</b><span>단어 ${p.word} · 문장 ${p.grammar}<br>+ 복습</span></button>`)
      .join('')}</div>
    <p class="sub note">새 문제 수 기준이에요. 틀린 문제·복습은 따로 쌓여서 함께 나와요.</p>
    <button class="btn primary big" id="save">저장</button>
    <p class="ok-msg" id="saved" role="status"></p>
    <h2 class="section">비밀번호 변경</h2>
    <form class="card" id="pwf"><label>새 비밀번호<input type="password" name="pw" minlength="4" autocomplete="new-password" required></label><button class="btn">변경</button><p class="sub" id="pwmsg" role="status"></p></form>
    <h2 class="section">알림</h2>
    <div class="card"><p class="sub" id="pushMsg">확인 중…</p>
      <div class="actions"><button class="btn primary" id="pushOn" hidden>🔔 알림 켜기</button><button class="btn ghost" id="pushOff" hidden>알림 끄기</button><button class="btn ghost" id="pushTest" hidden>테스트 알림</button></div></div>
    <a class="btn big" href="#/placement">레벨 테스트 다시 보기</a>
    <button class="btn ghost big" id="logout">로그아웃</button>
  </section>
  ${tabs('settings')}`;
  const pickIn = (id, set) =>
    $(id).addEventListener('click', e => {
      const b = e.target.closest('.option');
      if (!b) return;
      $(id).querySelectorAll('.option').forEach(x => x.classList.toggle('on', x === b));
      set(b.dataset.v);
    });
  pickIn('#levels', v => (level = +v));
  pickIn('#plans', v => (plan = v));
  $('#save').onclick = async () => {
    await api('settings', { level, plan });
    $('#saved').textContent = '저장했어요 ✓';
  };
  $('#pwf').onsubmit = async e => {
    e.preventDefault();
    try {
      await api('password', { pw: new FormData(e.target).get('pw') });
      $('#pwmsg').textContent = '변경했어요 ✓';
      e.target.reset();
    } catch (x) {
      $('#pwmsg').textContent = x.message;
    }
  };
  $('#logout').onclick = async () => {
    await api('logout', {});
    go('#/login');
  };

  // 푸시 알림: 서비스 워커가 있는 앱 사이트(홈 화면 앱·갤럭시 앱)에서만 켤 수 있다
  const pushUI = async () => {
    const msg = $('#pushMsg');
    const [on, off, test] = ['#pushOn', '#pushOff', '#pushTest'].map(s => $(s));
    [on, off, test].forEach(b => (b.hidden = true));
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    // 서비스 워커가 아직 준비 중일 수 있으니 잠깐(3초) 기다린다. 웹 사이트(서비스 워커 없음)에서는 null
    const reg =
      'serviceWorker' in navigator
        ? await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]).catch(() => null)
        : null;
    if (!reg || !('PushManager' in window) || !('Notification' in window)) {
      msg.textContent =
        ios && !standalone
          ? '아이폰: 앱 주소를 Safari로 연 뒤 공유 → 홈 화면에 추가하고, 홈 화면의 앱을 열어 여기서 켜 주세요. (iOS 16.4 이상)'
          : ios
            ? '이 홈 화면 앱은 알림을 지원하지 않는 주소로 추가됐어요. 앱 주소로 다시 추가해 주세요. (iOS 16.4 이상)'
            : '알림은 앱(홈 화면 앱 또는 갤럭시 앱)에서 켤 수 있어요.';
      return;
    }
    const keyP = api('push/key').catch(() => ({ key: '' })); // 탭 전에 미리 받아 둔다(iOS는 탭 직후에 구독해야 함)
    const sub = await reg.pushManager.getSubscription().catch(() => null);
    // 앱(TWA)에서는 Notification.permission이 실제와 다르게 'default'로 보이는 경우가 있어 푸시 권한 상태를 함께 본다
    const pstate = await reg.pushManager.permissionState({ userVisibleOnly: true }).catch(() => Notification.permission);
    const granted = (pstate === 'granted' || Notification.permission === 'granted') && !!sub;
    // 갤럭시 앱이 삼성 인터넷으로 열리면 알림 권한이 저장되지 않아 알림이 표시되지 않는다
    const samsungApp = /SamsungBrowser/.test(navigator.userAgent) && standalone;
    // 기기별 문제를 원격으로 진단하려고 단계 기록을 서버에 남긴다(비밀번호·개인정보 없음)
    const plog = (step, detail = '') =>
      api('push/log', { step, detail: String(detail).slice(0, 200), perm: Notification.permission, standalone, ua: navigator.userAgent.slice(0, 160) }).catch(() => {});
    plog('view', `sub=${!!sub} pstate=${pstate}`);
    const wait = (p, ms, label) => Promise.race([p, new Promise(r => setTimeout(() => r(label), ms))]);
    msg.textContent = samsungApp
      ? '이 앱이 삼성 인터넷으로 열려 있어 알림이 표시되지 않아요. 크롬(Chrome)을 설치·사용 설정한 뒤 최신 앱(1.2.0)으로 업데이트해 주세요.'
      : granted
      ? '이 기기로 알림을 받아요: 댓글·답글, 친구의 미션 완료, 저녁 8시 미션 리마인더'
      : Notification.permission === 'denied'
        ? '알림이 차단돼 있어요. 기기 설정 → 알림에서 이 앱을 허용한 뒤 다시 눌러 주세요.'
        : '댓글·답글, 친구의 미션 완료, 저녁 8시 미션 리마인더를 받아요.';
    on.hidden = granted || Notification.permission === 'denied';
    off.hidden = !granted;
    test.hidden = !granted;
    const SETTINGS_HINT = ios ? '아이폰 설정 → 알림 → 보카데이에서 알림을 허용한 뒤 다시 눌러 주세요.' : '휴대폰 설정 → 애플리케이션 → 보카데이 → 알림을 켠 뒤 다시 눌러 주세요.';
    on.onclick = async () => {
      on.disabled = true;
      msg.classList.add('loud');
      msg.textContent = '알림 권한을 요청하는 중… 허용 창이 뜨면 "허용"을 눌러 주세요.';
      plog('click');
      try {
        let perm = Notification.permission;
        if (perm !== 'granted') {
          // 갤럭시 앱(TWA)에서는 권한 창이 늦거나 안 뜨는 경우가 있어 8초까지만 기다린다
          perm = await wait(Notification.requestPermission(), 8000, 'timeout');
          plog('permission', perm);
        }
        if (perm === 'denied') {
          msg.textContent = '알림이 꺼져 있어요. ' + SETTINGS_HINT;
          return;
        }
        // 권한 창이 응답이 없으면 구독을 바로 시도한다(크롬은 구독하면서 권한을 확인한다)
        const { key } = await keyP;
        if (!key) throw new Error('서버 키를 받지 못했어요');
        msg.textContent = '알림을 연결하는 중…';
        const s = await wait(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), 15000, null);
        if (!s) throw Object.assign(new Error('응답이 없어요'), { name: 'TimeoutError' });
        plog('subscribed', new URL(s.endpoint).host);
        await api('push/subscribe', { subscription: s.toJSON() });
        msg.classList.remove('loud');
        pushUI();
      } catch (e) {
        plog('error', `${e.name}: ${e.message}`);
        msg.textContent =
          e.name === 'NotAllowedError' || e.name === 'TimeoutError'
            ? '알림 권한을 받지 못했어요. ' + SETTINGS_HINT
            : '알림을 켜지 못했어요: ' + (e.message || e);
      } finally {
        on.disabled = false;
      }
    };
    off.onclick = async () => {
      msg.textContent = '알림을 끄는 중…';
      try {
        const s = await reg.pushManager.getSubscription();
        if (s) {
          await api('push/unsubscribe', { endpoint: s.endpoint });
          await s.unsubscribe();
        }
        pushUI();
      } catch (e) {
        msg.textContent = '알림을 끄지 못했어요: ' + (e.message || e);
      }
    };
    test.onclick = async () => {
      msg.textContent = '테스트 알림을 보내는 중…';
      try {
        await api('push/test', {});
        msg.textContent = '테스트 알림을 보냈어요. 잠시 뒤 알림이 와요(안 오면 기기 알림 설정을 확인해 주세요).';
      } catch (e) {
        msg.textContent = '보내지 못했어요: ' + (e.message || e);
      }
    };
  };
  pushUI();
}

// ---------- 레벨 테스트 ----------
async function placement() {
  const { items, pass } = await api('placement'); // pass: 한 단계 '통과' 정답률(서버 채점 기준과 동일)
  const answers = {};
  const results = {}; // 문항별 정답 여부(즉시 피드백·조기 종료용)
  let i = 0;
  const levelOf = lv => items.filter(p => p.lv === lv);

  app.innerHTML = `
  <section class="page center">
    <div class="big-emoji">🧭</div>
    <h1>레벨 테스트</h1>
    <p class="sub">${items.length}문제 · 약 5분<br>단어와 문법을 쉬운 것부터 차례로 물어봐요.<br>모르면 찍지 말고 <b>모르겠어요</b>를 눌러 주세요. 그래야 정확해요.</p>
    <button class="btn primary big" id="start">시작하기</button>
  </section>`;
  $('#start').onclick = show;

  function show() {
    const p = items[i];
    const [before, after] = p.q.split('___');
    app.innerHTML = `
    <section class="quiz">
      <div class="qbar"><a href="#/settings" class="iconbtn" aria-label="그만하기">${icon('close')}</a><div class="bar grow"><i style="width:${Math.round((i / items.length) * 100)}%"></i></div><span class="count">${i + 1}/${items.length}</span></div>
      <div class="qbody">
        <div class="qmeta"><span class="chip soft">${p.skill === 'vocab' ? '어휘' : '문법·표현'}</span></div>
        <p class="prompt">빈칸에 가장 알맞은 것을 고르세요</p>
        ${p.ko ? `<p class="ko-sentence">${esc(p.ko)}</p>` : ''}
        <div class="sentence">${esc(before)}<span class="gap">?</span>${esc(after)}</div>
        <div class="choices">${p.options.map((o, k) => `<button class="choice" data-k="${k}"><kbd>${k + 1}</kbd>${esc(o)}</button>`).join('')}
          <button class="choice idk" data-k="-1">모르겠어요</button></div>
      </div>
      <div class="sheet" id="sheet"></div>
    </section>`;
    const btns = [...document.querySelectorAll('.choice')];
    let done = false;
    // 고르면 바로 채점: 정답은 초록, 틀리게 고른 건 빨강으로 표시하고 빈칸에 정답을 채워 준다
    const pick = async k => {
      if (done) return;
      done = true;
      answers[p.id] = k;
      btns.forEach(b => (b.disabled = true));
      const { correct, answer, answerKo, pickKo } = await api('placement/check', { id: p.id, pick: k });
      results[p.id] = correct;
      btns.find(b => +b.dataset.k === answer).classList.add('right');
      if (!correct && k >= 0) btns.find(b => +b.dataset.k === k).classList.add('wrong');
      const gap = $('.gap');
      gap.textContent = p.options[answer];
      gap.classList.add('ok');
      beep(correct);
      const title = correct ? '정답이에요!' : k < 0 ? '정답을 확인해요' : '아쉬워요';
      const sheet = $('#sheet');
      sheet.className = 'sheet show ' + (correct ? 'ok' : 'bad');
      sheet.innerHTML = `
        <div class="sheet-in">
          <h3>${correct ? '✓' : '✕'} ${title}</h3>
          <p class="ans">정답: <b>${esc(p.options[answer])}</b>${answerKo ? ` <span class="gloss">${esc(answerKo)}</span>` : ''}</p>
          ${!correct && k >= 0 ? `<p class="ans">내가 고른 답: <s>${esc(p.options[k])}</s>${pickKo ? ` <span class="gloss">${esc(pickKo)}</span>` : ''}</p>` : ''}
          <p class="full">${esc(p.q.replace('___', p.options[answer]))}</p>
          <button class="btn big ${correct ? 'success' : 'danger'}" id="cont">계속하기</button>
        </div>`;
      $('#cont').onclick = next;
      document.onkeydown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          next();
        }
      };
    };
    let moved = false;
    const next = () => {
      if (moved) return;
      moved = true;
      i++;
      // 한 단계를 통과하지 못하면 결과가 정해진 것이니(아래 단계까지가 내 레벨) 윗 단계는 생략
      const lvItems = levelOf(p.lv);
      const lastOfLevel = lvItems[lvItems.length - 1] === p;
      const correctCount = lvItems.filter(x => results[x.id]).length;
      if (i >= items.length || (lastOfLevel && p.lv < 4 && correctCount / lvItems.length < pass - 1e-9)) return submit();
      show();
    };
    btns.forEach(b => (b.onclick = () => pick(+b.dataset.k)));
    document.onkeydown = e => {
      if (p.options[e.key - 1] != null) pick(e.key - 1);
    };
  }

  // 왜 이 레벨인지 점수로 풀어서 설명
  function explain(r) {
    const L = lv => LEVELS[lv][0];
    const s = lv => r.perLevel[lv];
    const attempted = lv => levelOf(lv).some(x => answers[x.id] != null);
    const prev = r.level - 1;
    if (prev >= 1 && s(prev).correct === s(prev).total) return `${L(prev)} 문제를 전부 맞혀서 ${L(prev)}에서는 더 배울 게 없어요. ${L(r.level)}부터 시작해요.`;
    const me = s(r.level);
    if (me.correct / me.total >= pass - 1e-9) {
      const next = r.level + 1;
      const tail = next <= 4 && attempted(next) ? ` ${L(next)}은 아직 조금 버거워요(${s(next).correct}/${s(next).total}).` : '';
      return `${L(r.level)} 문제를 ${me.correct}/${me.total} 맞혔어요. ${L(r.level)}이 딱 맞아요.${tail}`;
    }
    return `${L(1)} 문제가 아직 익숙하지 않아요(${me.correct}/${me.total}). 기초부터 차근차근 시작해요.`;
  }

  async function submit() {
    document.onkeydown = null;
    const r = await api('placement', { answers });
    app.innerHTML = `
    <section class="page center done-page">
      <div class="big-emoji">🎯</div>
      <p class="sub">추천 레벨</p>
      <h1 class="level-big">${LEVELS[r.level][0]}</h1>
      <p class="sub">${LEVELS[r.level][1]}</p>
      <p class="sub">${esc(explain(r))}</p>
      <div class="card left">${[1, 2, 3, 4]
        .map(lv => {
          const x = r.perLevel[lv];
          const pct = Math.round((x.correct / x.total) * 100);
          return `<div class="lvrow"><span>${LEVELS[lv][0]}</span><div class="bar grow"><i style="width:${pct}%"></i></div><b>${x.correct}/${x.total}</b></div>`;
        })
        .join('')}</div>
      <p class="sub note">레벨은 설정에서 언제든 바꿀 수 있어요.</p>
      <a class="btn primary big" href="#/home">이 레벨로 시작하기</a>
    </section>`;
  }
}

// ---------- 오늘의 영어 일기 ----------
// 단어 단위 차이(원문 → 첨삭문): 지운 건 취소선, 추가한 건 강조
function wordDiff(a, b) {
  const x = a.split(/\s+/).filter(Boolean);
  const y = b.split(/\s+/).filter(Boolean);
  const L = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) out.push(esc(x[i++])), j++;
    else if (i < x.length && (j >= y.length || L[i + 1][j] >= L[i][j + 1])) out.push(`<del>${esc(x[i++])}</del>`); // 지운 말 먼저
    else out.push(`<ins>${esc(y[j++])}</ins>`);
  }
  return out.join(' ');
}

// 처리 중: 누른 버튼은 로딩 표시, 같은 영역(scope)의 다른 버튼·입력은 끝날 때까지 잠근다 → 여러 번 눌러도 한 번만 처리.
// disabled 대신 aria-disabled를 써서 포커스가 사라지지 않게 한다(스크린리더·키보드).
async function pending(btn, scope, fn) {
  if (scope.dataset.busy) return;
  scope.dataset.busy = '1';
  btn.classList.add('busy');
  btn.setAttribute('aria-busy', 'true');
  const others = [...scope.querySelectorAll('button')].filter(b => b !== btn);
  const fields = [...scope.querySelectorAll('textarea')];
  others.forEach(b => b.setAttribute('aria-disabled', 'true'));
  fields.forEach(t => (t.readOnly = true));
  // 키보드(Enter·Space)로 누르는 것까지 막는다 — CSS pointer-events는 마우스·터치만 막음
  const block = e => e.target.closest('button') && e.target.closest('button') !== btn && (e.preventDefault(), e.stopPropagation());
  scope.addEventListener('click', block, true);
  try {
    return await fn();
  } finally {
    delete scope.dataset.busy;
    scope.removeEventListener('click', block, true);
    btn.classList.remove('busy');
    btn.removeAttribute('aria-busy');
    others.forEach(b => b.removeAttribute('aria-disabled'));
    fields.forEach(t => (t.readOnly = false));
  }
}

const EDIT_TYPES = { spelling: ['맞춤법', 'sp'], grammar: ['문법', 'gr'], natural: ['더 자연스럽게', 'na'] };

function reviewView(text, r) {
  if (!r) return '';
  const edits = r.edits.map(
    (e, i) => `<li class="edit ${EDIT_TYPES[e.type][1]} ${i >= 3 ? 'more' : ''}"><span class="etype">${EDIT_TYPES[e.type][0]}</span>
      <div><p><s>${esc(e.from)}</s> → <b>${esc(e.to)}</b></p><p class="small">${esc(e.why)}</p></div></li>`,
  );
  return `
  <div class="review">
    ${r.praise ? `<p class="praise">👏 ${esc(r.praise)}</p>` : ''}
    ${r.corrected && r.corrected !== text ? `<p class="diff">${wordDiff(text, r.corrected)}</p>` : '<p class="praise">고칠 곳이 없어요. 완벽해요! ✨</p>'}
    ${edits.length ? `<ul class="edits">${edits.join('')}</ul>${edits.length > 3 ? `<button class="btn ghost more-btn">수정 ${edits.length - 3}개 더 보기</button>` : ''}` : ''}
    ${r.translations.length ? `<div class="box"><h4>🗣️ 이렇게 말하면 돼요</h4>${r.translations.map(t => `<p>(${esc(t.ko)}) → <b>${esc(t.en)}</b></p>`).join('')}</div>` : ''}
    ${r.better.length ? `<div class="box"><h4>✨ 원어민 추천 표현</h4>${r.better.map(b => `<p><b>${esc(b.en)}</b><br><span class="small">${esc(b.ko)}</span></p>`).join('')}</div>` : ''}
    ${r.practice.length ? `<p class="small">📌 내 실수로 만든 복습 문제 ${r.practice.length}개가 내일 문법 복습에 나와요.</p>` : ''}
    ${r.corrected && r.corrected !== text ? '<button class="btn" id="useFix">✍️ 첨삭문으로 고쳐 쓰기</button>' : ''}
    <p class="small">첨삭은 지금만 보여요. 고쳐서 저장하면 사라져요.</p>
  </div>`;
}

async function diary(date) {
  const d = await api('diary' + (date ? `?date=${date}` : ''));
  const isToday = d.date === d.today;
  const me = d.entries.find(e => e.uid === d.me);
  const others = d.entries.filter(e => e.uid !== d.me);
  const md = s => `${+s.slice(5, 7)}월 ${+s.slice(8)}일`;
  const hm = t => new Date(t).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  app.innerHTML = `
  <section class="page">
    <header class="top with-back">
      <a class="iconbtn back" href="${isToday ? '#/home' : '#/diary'}" aria-label="뒤로">${icon('back', 26)}</a>
      <div><p class="sub">${isToday ? '오늘의 영어 일기' : md(d.date) + ' 일기'}</p><h1>3줄 영어 일기</h1></div>
    </header>
    <div class="days">${d.days
      .map(
        x => `<a href="#/diary/${x.date}" class="day ${x.date === d.date ? 'on' : ''}"><span>${+x.date.slice(8)}</span>
        <i class="${x.by.includes(d.me) ? 'me' : ''}"></i><i class="${x.by.some(u => u !== d.me) ? 'fr' : ''}"></i></a>`,
      )
      .join('')}</div>
    <div class="card prompt-card"><p class="small">오늘의 질문</p><b>${esc(d.prompt.ko)}</b><p class="small en">${esc(d.prompt.en)}</p></div>
    <div class="card entry mine">
      <div class="ehead"><div class="avatar">${esc(me.name[0])}</div><b>${esc(me.name)}</b>${isToday ? '' : '<span class="sub">지난 일기는 읽기만 돼요</span>'}<span class="sub" id="when">${me.updatedAt ? hm(me.updatedAt) : ''}</span></div>
      <div id="mine"></div>
      <div id="review"></div>
      ${comments(me, d.me)}
    </div>
    ${others
      .map(
        o => `<div class="card entry">
      <div class="ehead"><div class="avatar">${esc(o.name[0])}</div><b>${esc(o.name)}</b>${o.updatedAt ? `<span class="sub">${hm(o.updatedAt)}</span>` : ''}</div>
      ${o.text ? `<p class="entry-text">${esc(o.text)}</p>${comments(o, d.me)}` : `<p class="sub">아직 ${isToday ? '오늘 ' : ''}일기를 안 썼어요</p>`}
    </div>`,
      )
      .join('')}
  </section>
  ${tabs('diary')}`;

  // 댓글: 서버 응답(댓글 목록)으로 그 칸만 다시 그린다 — 화면 전체를 다시 불러오지 않아 빠르다
  // 처리 중에는 그 댓글 칸 전체를 잠근다(pending) — 실패하면 쓰던 글은 그대로 남는다
  const bindComments = box => {
    const uid = box.dataset.uid;
    const msg = box.querySelector('.cmsg');
    const send = (path, body, btn) =>
      pending(btn, box, async () => {
        msg.textContent = '';
        try {
          const r = await api(path, { uid, date: d.date, ...body });
          const fresh = document.createElement('div');
          fresh.innerHTML = comments({ uid, text: 'x', comments: r.comments }, d.me);
          const nb = fresh.firstElementChild;
          box.replaceWith(nb);
          bindComments(nb);
          return nb;
        } catch (e) {
          msg.textContent = e.message;
        }
      });
    const form = (cls, placeholder, label, value = '') => {
      const f = document.createElement('form');
      f.className = 'cform ' + cls;
      f.innerHTML = `<textarea rows="1" maxlength="300" aria-label="${placeholder}" placeholder="${placeholder}"></textarea>
        <div class="cbtns"><button type="button" class="btn ghost sm c-cancel">취소</button><button class="btn primary sm">${label}</button></div>`;
      f.querySelector('textarea').value = value;
      return f;
    };
    const submitOf = (f, path, body) => e => {
      e.preventDefault();
      const ta = f.querySelector('textarea');
      const t = ta.value.trim();
      if (!t) return ta.focus();
      send(path, { ...body, text: t }, f.querySelector('button:not([type])')).then(nb => {
        if (nb && path === 'diary/comment' && !body.parent) nb.querySelector(':scope > .cform textarea').focus(); // 이어서 쓰기 편하게
      });
    };
    const main = box.querySelector(':scope > .cform');
    main.onsubmit = submitOf(main, 'diary/comment', {});
    // 입력창은 쓰는 만큼 늘어난다(최대 5줄쯤, CSS max-height)
    box.addEventListener('input', e => {
      if (e.target.tagName !== 'TEXTAREA') return;
      const t = e.target;
      t.style.height = '';
      t.style.height = t.scrollHeight + t.offsetHeight - t.clientHeight + 'px'; // 테두리 두께까지
    });
    // 답글 · 내 댓글 수정 · 삭제(두 번 눌러 확정, 3초 지나면 원래대로)
    box.addEventListener('click', ev => {
      const b = ev.target.closest('.cactions button');
      if (!b) return;
      const c = b.closest('.comment');
      const id = c.dataset.id;
      if (b.classList.contains('c-reply')) {
        const th = c.closest('.cthread');
        const open = th.querySelector('.reply-form');
        if (open) return open.querySelector('textarea').focus();
        const f = form('reply-form', `${esc(c.dataset.name)}님에게 답글`, '답글');
        f.querySelector('.c-cancel').onclick = () => f.remove();
        f.onsubmit = submitOf(f, 'diary/comment', { parent: id });
        th.append(f); // 답글이 실제로 붙을 자리(스레드 맨 아래)에 연다
        f.querySelector('textarea').focus();
      } else if (b.classList.contains('c-edit')) {
        const body = c.querySelector('.cbody');
        const f = form('edit-form', '댓글 수정', '저장', c.querySelector('.ctext').textContent);
        body.classList.add('editing');
        f.querySelector('.c-cancel').onclick = () => (f.remove(), body.classList.remove('editing'));
        f.onsubmit = submitOf(f, 'diary/comment/edit', { id });
        body.append(f);
        const ta = f.querySelector('textarea');
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (b.classList.contains('c-del')) {
        if (!b.dataset.armed) {
          b.dataset.armed = '1';
          b.textContent = '정말 삭제할까요?';
          b.classList.add('danger');
          setTimeout(() => b.isConnected && !box.dataset.busy && (delete b.dataset.armed, (b.textContent = '삭제'), b.classList.remove('danger')), 3000);
          return;
        }
        send('diary/comment/delete', { id }, b);
      }
    });
  };
  document.querySelectorAll('.comments').forEach(bindComments);

  // 내 일기: 저장된 글은 게시글처럼 보이고 '수정'을 눌러야 입력창이 열린다.
  // 첨삭은 '첨삭 받기'를 누른 동안만 보이고, 고쳐서 저장하면 사라진다(다시 들어와도 안 보임).
  let text = me.text;
  let draft = null; // '첨삭문으로 고쳐 쓰기'를 눌렀을 때 입력창에 미리 넣을 글
  let checksLeft = d.checksLeft;
  const render = mode => {
    const box = $('#mine');
    if (!isToday) {
      box.innerHTML = `<p class="entry-text">${text ? esc(text) : '<span class="sub">이 날은 일기가 없어요</span>'}</p>`;
      return;
    }
    const checkBtn = `<button class="btn primary" id="check" ${checksLeft > 0 ? '' : 'disabled'}>✏️ 첨삭 받기 <small>(${checksLeft}회 남음)</small></button>`;
    if (mode === 'post') {
      box.innerHTML = `<p class="entry-text">${esc(text)}</p>
        <div class="row between"><span></span><span class="small" id="msg" role="status"></span></div>
        <div class="actions"><button class="btn" id="edit">✏️ 수정</button></div>`; // 완료된 글에는 '수정'만. 첨삭 받기는 입력창이 열렸을 때만
      $('#edit').onclick = () => render('edit');
    } else {
      const v = draft ?? text;
      box.innerHTML = `<textarea id="text" rows="4" maxlength="${d.maxLen}" lang="en" spellcheck="true" autocapitalize="sentences" placeholder="Today I ...\n막히는 단어는 (한국어)로 써도 돼요">${esc(v)}</textarea>
        <div class="row between"><span class="small" id="cnt">${v.length}/${d.maxLen}</span><span class="small" id="msg" role="status"></span></div>
        <div class="actions"><button class="btn primary" id="save">저장</button>${text ? '<button class="btn ghost" id="cancel">취소</button>' : ''}${checkBtn}</div>`;
      const ta = $('#text');
      ta.oninput = () => ($('#cnt').textContent = `${ta.value.length}/${d.maxLen}`);
      $('#save').onclick = e => pending(e.currentTarget, box, () => save().catch(e => ($('#msg').textContent = e.message)));
      $('#cancel')?.addEventListener('click', () => {
        draft = null;
        render('post');
      });
      $('#check').onclick = e => pending(e.currentTarget, box, check);
    }
  };
  const showReview = r => {
    $('#review').innerHTML = r ? reviewView(text, r) : '';
    if (!r) return;
    document.querySelectorAll('.more-btn').forEach(b => (b.onclick = () => (b.previousElementSibling.classList.add('all'), b.remove())));
    $('#useFix')?.addEventListener('click', () => {
      draft = r.corrected;
      render('edit');
      $('#text').focus();
      $('#msg').textContent = '고친 문장을 넣었어요. 다듬고 저장하세요';
    });
  };
  const save = async () => {
    const ta = $('#text');
    const v = ta.value.trim();
    if (!v) {
      $('#msg').textContent = '일기를 써 주세요';
      ta.focus();
      return false;
    }
    await api('diary', { text: v });
    text = v;
    draft = null;
    $('#when').textContent = hm(Date.now());
    showReview(null); // 저장하면 첨삭은 사라진다
    render('post');
    $('#msg').textContent = '저장했어요 ✓';
    return true;
  };
  const check = async () => {
    try {
      if ($('#text') && !(await save())) return render('edit'); // 쓰던 글은 먼저 저장
      $('#review').innerHTML = '<div class="review loading"><span class="dots"></span> 선생님이 첨삭하고 있어요… (20초쯤)</div>';
      const r = await api('diary/check', {});
      checksLeft = r.checksLeft;
      render('post');
      showReview(r.review);
    } catch (e) {
      $('#review').innerHTML = '';
      render(text ? 'post' : 'edit');
      $('#msg').textContent = e.message;
    }
  };
  render(text ? 'post' : 'edit');
}

// 댓글: 댓글 → 답글 한 단계. 내 댓글은 수정·삭제 가능
// 한 줄 머리(아바타 · 이름 · 시간) → 본문 → 글자 버튼(답글·수정·삭제). 답글은 부모 본문 줄에 맞춰 들여쓴다
const ago = t => {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 24 * 60) return `${Math.floor(m / 60)}시간 전`;
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
function comments(e, me) {
  if (!e.text) return '';
  const cs = e.comments;
  const one = c =>
    c.deleted
      ? `<div class="comment deleted" data-id="${c.id}"><div class="avatar sm">·</div><div class="cbody"><p class="ctext">삭제된 댓글이에요</p></div></div>`
      : `<div class="comment ${c.by === me ? 'mine' : ''}" data-id="${c.id}" data-name="${esc(c.name)}">
        <div class="avatar sm" aria-hidden="true">${esc(c.name[0])}</div>
        <div class="cbody">
          <p class="cmeta"><b>${esc(c.name)}</b><time datetime="${new Date(c.at).toISOString()}">${ago(c.at)}</time>${c.editedAt ? '<span>수정됨</span>' : ''}</p>
          <p class="ctext">${esc(c.text)}</p>
          <div class="cactions">${!c.parent ? '<button type="button" class="c-reply">답글</button>' : ''}${c.by === me ? '<button type="button" class="c-edit">수정</button><button type="button" class="c-del">삭제</button>' : ''}</div>
        </div></div>`;
  const thread = cs
    .filter(c => !c.parent && (!c.deleted || cs.some(r => r.parent === c.id))) // 답글 없는 삭제 자리는 숨김
    .map(c => `<div class="cthread">${one(c)}${cs.filter(r => r.parent === c.id).map(r => `<div class="creply">${one(r)}</div>`).join('')}</div>`)
    .join('');
  const n = cs.filter(c => !c.deleted).length;
  return `<div class="comments" data-uid="${e.uid}">
    <p class="chead">댓글${n ? ` <b>${n}</b>` : ''}</p>${thread}
    <form class="cform"><textarea rows="1" maxlength="300" placeholder="댓글을 남겨 보세요" aria-label="댓글"></textarea><div class="cbtns"><button class="btn primary sm">등록</button></div></form>
    <p class="small cmsg" role="status"></p></div>`;
}

addEventListener('hashchange', route);
route();
