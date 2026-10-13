// 단어마다 오답 후보 6개를 뽑아 content/distractors.json에 고정한다(이후 블라인드 감수로 검증)
// node test/build-distractors.mjs            → 없는 단어만 새로 채움
// node test/build-distractors.mjs <flags...> → 감수에서 지적된 후보만 교체
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { makePicker, makeRelated } from '../src/distractors.js';
const url = f => new URL('../content/' + f, import.meta.url);
const load = f => JSON.parse(readFileSync(url(f), 'utf8'));
const WORDS = [1, 2, 3, 4].flatMap(n => load(`words_lv${n}.json`));
const pick = makePicker(WORDS, load('confusables.json'));
const related = makeRelated(WORDS, load('confusables.json'));
const EN = new Map(WORDS.map(w => [w.en, w]));
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const out = existsSync(url('distractors.json')) ? load('distractors.json') : {};
// 감수 지적: "<id> | <보기 en> | 이유" → 그 후보를 빼고 새로 채운다
for (const f of process.argv.slice(2))
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^(w\d-\d{3})\s*\|\s*([^|]+?)\s*\|/.exec(line.trim());
    if (m && out[m[1]]) out[m[1]] = out[m[1]].filter(en => en !== m[2]);
  }
for (const w of WORDS) {
  // 유의어 묶음이 늘었으면 기존 후보도 다시 걸러 낸다
  const have = (out[w.id] ?? []).filter(en => EN.has(en) && !related(w, EN.get(en)));
  if (have.length >= 6) continue;
  const extra = pick(w, shuffle, null, 12).map(o => o.en).filter(en => !have.includes(en));
  out[w.id] = [...have, ...extra].slice(0, 6);
}
writeFileSync(url('distractors.json'), '{\n' + Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
console.log('words', Object.keys(out).length, 'min candidates', Math.min(...Object.values(out).map(v => v.length)));
