// AI 문제가 끝까지 도는지(출제 → 채점 → 오답노트 → 🚩 신고 → 제거) 실행 중인 로컬 서버에 대고 확인한다.
// 생성 자체(Workers AI)는 건너뛰고, 생성기가 만든 모양 그대로의 문제 하나를 D1 gen 표에 직접 넣는다.
// 사용: npx wrangler dev --env app --persist-to <dir> 를 띄운 뒤  node test/gen-e2e.mjs [baseURL] [persistDir]
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const USERS = JSON.parse(/^USERS=(.*)$/m.exec(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8'))[1]);
const [[ID, { pw: PW }]] = Object.entries(USERS);
const BASE = process.argv[2] || 'http://localhost:8787';
const PERSIST = process.argv[3] || '.wrangler/e2e';
let cookie = '';
async function call(path, body) {
  const r = await fetch(BASE + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body && JSON.stringify(body) });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: r.status, data: await r.json() };
}

// 생성기 출력과 같은 모양(src/generate.js) — 사람이 검수한 문장
const item = {
  id: 'aw4-e2e' + Date.now().toString(36), kind: 'word', lv: 4, en: 'zqwindfall', ko: '뜻밖의 횡재', pos: '명',
  ex: 'The lottery win was a {zqwindfall} for the small family.', exKo: '복권 당첨은 그 작은 가족에게 뜻밖의 횡재였다.', alt: [], near: [],
  distractors: [{ en: 'zqwindmill', ko: '풍차' }, { en: 'zqwindow', ko: '창문' }, { en: 'zqwinter', ko: '겨울' }, { en: 'zqwinner', ko: '우승자' }, { en: 'zqwinding', ko: '구불구불한' }, { en: 'zqwindy', ko: '바람 부는' }],
};
// 첫 요청 전에 넣는다(서버는 요청마다 gen 표를 1분 캐시하므로, 뒤에 넣으면 1분을 기다려야 함). 표는 아직 없을 수 있어 같이 만든다
const sql = `CREATE TABLE IF NOT EXISTS gen (id TEXT PRIMARY KEY, kind TEXT NOT NULL, lv INTEGER NOT NULL, v TEXT NOT NULL); INSERT INTO gen (id, kind, lv, v) VALUES ('${item.id}', 'word', 4, '${JSON.stringify(item).replace(/'/g, "''")}')`;
const sqlFile = join(tmpdir(), `vocaday-gen-e2e-${process.pid}.sql`);
writeFileSync(sqlFile, sql + ';\n');
try {
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', 'd1', 'execute', 'vocaday', '--local', '--env', 'app', '--persist-to', PERSIST, '--file', sqlFile], { stdio: 'pipe', shell: process.platform === 'win32' });
} finally {
  unlinkSync(sqlFile);
}

assert.equal((await call('login', { id: ID, pw: PW })).status, 200);
await call('settings', { level: 4, plan: 'hard' });
// 1분 캐시가 있어도 /api/report가 아닌 첫 로드는 새 표를 읽는다 → 출제 가능해야 한다
assert.equal((await call('answer', { id: item.id, correct: false })).status, 200, 'AI 문제를 채점하지 못함');
const wrong = (await call('session?kind=word&mode=wrong')).data.items.find(x => x.id === item.id);
assert.ok(wrong, 'AI 문제가 오답 복습에 안 나옴');
assert.equal(wrong.en, item.en);
assert.equal(wrong.distractors.length, 3, '4지선다 보기가 고정 후보에서 3개 나와야 함');
assert.ok(wrong.distractors.every(d => item.distractors.some(x => x.en === d.en && x.ko === d.ko)), '보기가 AI 문제의 후보 밖에서 나옴');
assert.ok((await call('wrongs')).data.items.some(x => x.id === item.id), 'AI 문제가 오답노트에 없음');
assert.equal((await call('report', { id: 'w2-001' })).status, 404, '고정 문제는 신고 대상이 아님');
assert.equal((await call('report', { id: item.id })).status, 200);
assert.ok(!(await call('wrongs')).data.items.some(x => x.id === item.id), '신고한 AI 문제가 오답노트에 남아 있음');
assert.ok(!(await call('session?kind=word&mode=wrong')).data.items.some(x => x.id === item.id), '신고한 AI 문제가 복습에 또 나옴');
assert.equal((await call('report', { id: item.id })).status, 404, '신고된 문제는 더 이상 없는 문제');
console.log('gen e2e ok');
