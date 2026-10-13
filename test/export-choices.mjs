// 실제 출제 로직(makePicker)으로 4지선다 문제지를 만든다: node test/export-choices.mjs <outDir> [회차]
// 정답 키는 따로 저장 — 풀이자는 문제지만 본다
import { readFileSync, writeFileSync } from 'node:fs';
import { makePicker } from '../src/distractors.js';
const [dir, rounds = 1] = process.argv.slice(2);
const load = f => JSON.parse(readFileSync(new URL('../content/' + f, import.meta.url), 'utf8'));
const WORDS = [1, 2, 3, 4].flatMap(n => load(`words_lv${n}.json`));
const pick = makePicker(WORDS, load('confusables.json'));
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sheets = { en2ko: [], ko2en: [] };
const key = {};
for (let r = 0; r < rounds; r++)
  for (const w of WORDS)
    for (const dir2 of ['en2ko', 'ko2en']) {
      const opts = shuffle([w, ...pick(w, shuffle)]);
      const id = `${w.id}.${dir2}.${r}`;
      key[id] = opts.findIndex(o => o.en === w.en) + 1;
      sheets[dir2].push(dir2 === 'en2ko' ? `${id}\t단어: ${w.en}\t보기: ${opts.map((o, i) => `${i + 1}) ${o.ko}`).join('  ')}` : `${id}\t뜻: ${w.ko}\t보기: ${opts.map((o, i) => `${i + 1}) ${o.en}`).join('  ')}`);
    }
for (const [k, lines] of Object.entries(sheets)) writeFileSync(`${dir}/${k}.txt`, lines.join('\n') + '\n');
writeFileSync(`${dir}/key.json`, JSON.stringify(key));
console.log(Object.fromEntries(Object.entries(sheets).map(([k, v]) => [k, v.length])));
