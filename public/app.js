// 보카데이 프론트엔드 — 프레임워크 없이 해시 라우팅 + 템플릿 문자열
import { plain, blankParts, norm, grade, fromSpeech, maskAnswer } from './grade.js';
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
  const r = await fetch('/api/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
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
      <div class="row">단어 ${s('word')} 문법 ${s('grammar')}</div></div>
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
  const right = [];
  const wrong = [];
  let attempts = 0;

  next();

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
        <div class="qmeta">${it.isNew ? '<span class="chip new">NEW</span>' : '<span class="chip">복습</span>'}${it.tag ? `<span class="chip soft">${esc(it.tag)}</span>` : ''}${it.wrongCount ? `<span class="chip warn">${it.wrongCount}번 틀림</span>` : ''}</div>
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
      // 다른 실제 단어·같은 뜻 표현(near)을 쓴 경우 한 번은 오답 대신 첫 글자 힌트와 함께 다시 기회
      const typed = norm(input.value);
      if (g === 'bad' && !retried && (known.has(typed) || (it.near || []).some(n => norm(n) === typed))) {
        retried = true;
        // 긴 단어는 비슷한 동의어와 갈리도록 앞 3글자까지 보여 준다
        const first = '힌트: ' + ans.split(' ').map(w => { const n = w.length >= 8 ? 3 : 1; return w.slice(0, n) + '·'.repeat(w.length - n); }).join(' ');
        $('#hint').textContent =
          typed === norm(it.en || '')
            ? '단어는 맞았어요! 문장에 맞게 형태(시제·복수 등)를 바꿔 보세요.'
            : `말이 되는 표현이지만, 지금 연습하는 단어는 따로 있어요. ${first}`;
        input.select();
        return;
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
    if (!seen.has(it.id)) {
      seen.add(it.id);
      (ok ? right : wrong).push(it);
      api('answer', { id: it.id, correct: ok }).catch(() => {});
    }
    beep(ok);
    const full = plain(kind === 'word' ? it.ex : it.s);
    const title = { ok: '정답이에요!', close: '아깝다! 철자를 확인해요', bad: '아쉬워요', reveal: '정답을 확인해요' }[g];
    const sheet = $('#sheet');
    sheet.className = 'sheet show ' + (ok ? 'ok' : 'bad');
    sheet.innerHTML = `
      <div class="sheet-in">
        <h3>${ok ? '✓' : '✕'} ${title}</h3>
        ${kind === 'word' ? `<p class="ans"><b>${esc(it.en)}</b> ${it.pos ? `<i>${esc(POS[it.pos] || it.pos)}</i>` : ''} ${esc(it.ko)}</p>` : `<p class="ans">정답: <b>${esc(blankParts(it.s)[1])}</b></p>`}
        ${(g === 'close' || g === 'bad') && typed ? `<p class="small">내 답: <s>${esc(typed)}</s></p>` : ''}
        <p class="full"><button class="iconbtn" id="sayFull" aria-label="문장 듣기">${icon('speaker', 18)}</button>${esc(full)}</p>
        ${it.tip ? `<p class="tip">💡 ${esc(it.tip)}</p>` : ''}
        ${ok ? '' : '<p class="small">이 문제는 잠시 뒤에 한 번 더, 그리고 내일 다시 나와요.</p>'}
        <button class="btn big ${ok ? 'success' : 'danger'}" id="cont">계속하기</button>
      </div>`;
    speak(full);
    $('#sayFull').onclick = () => speak(full);
    let moved = false;
    const cont = () => {
      if (moved) return; // 버튼 클릭 + Enter가 겹쳐 두 문제를 건너뛰지 않게
      moved = true;
      q.shift();
      if (!ok) q.splice(Math.min(3, q.length), 0, it); // 틀린 문제는 최소 3문제 뒤에 다시(바로 연달아 X), 맞힐 때까지
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
        <div class="row today-row"><span>오늘 단어 ${status(u, 'word')}</span><span>문법 ${status(u, 'grammar')}</span></div>
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
      ${comments(me, d.date)}
    </div>
    ${others
      .map(
        o => `<div class="card entry">
      <div class="ehead"><div class="avatar">${esc(o.name[0])}</div><b>${esc(o.name)}</b>${o.updatedAt ? `<span class="sub">${hm(o.updatedAt)}</span>` : ''}</div>
      ${o.text ? `<p class="entry-text">${esc(o.text)}</p>${comments(o, d.date)}` : `<p class="sub">아직 ${isToday ? '오늘 ' : ''}일기를 안 썼어요</p>`}
    </div>`,
      )
      .join('')}
  </section>
  ${tabs('diary')}`;

  document.querySelectorAll('.cform').forEach(f => {
    f.onsubmit = async e => {
      e.preventDefault();
      const input = f.querySelector('input');
      if (!input.value.trim()) return;
      await api('diary/comment', { uid: f.dataset.uid, date: d.date, text: input.value });
      diary(date);
    };
  });

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
      $('#save').onclick = () => save().catch(e => ($('#msg').textContent = e.message));
      $('#cancel')?.addEventListener('click', () => {
        draft = null;
        render('post');
      });
      $('#check').onclick = check;
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
    $('#check').disabled = true;
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

function comments(e, date) {
  if (!e.text) return '';
  return `<div class="comments">${e.comments
    .map(c => `<p class="comment"><b>${esc(c.name)}</b> ${esc(c.text)}</p>`)
    .join('')}<form class="cform" data-uid="${e.uid}"><input placeholder="댓글 달기" maxlength="300" aria-label="댓글"><button class="btn ghost">등록</button></form></div>`;
}

addEventListener('hashchange', route);
route();
