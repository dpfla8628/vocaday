// 4지선다 블라인드 감수 결과(flags)를 유의어 묶음에 반영: node test/add-confusables.mjs <flags.txt...>
// 줄 형식: "<단어id>.<en2ko|ko2en>.<회차> | <번호>) <보기> | 이유"  또는 "| <번호> (<보기>) |"
import { readFileSync, writeFileSync } from 'node:fs';
const load = f => JSON.parse(readFileSync(new URL('../content/' + f, import.meta.url), 'utf8'));
const WORDS = [1, 2, 3, 4].flatMap(n => load(`words_lv${n}.json`));
const byId = new Map(WORDS.map(w => [w.id, w]));
const groups = load('confusables.json');
let added = 0;
for (const f of process.argv.slice(2))
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^(w\d-\d{3})\.(en2ko|ko2en)\.\d+\s*\|\s*([^|]+)\|/.exec(line.trim());
    if (!m) continue;
    const target = byId.get(m[1]);
    // "3) 집" / "3 (세련된, 정교한)" / "4) 편안한" 모두 처리
    const opt = m[3].trim().replace(/^\d+\s*\)\s*/, '').replace(/^\d+\s*\((.*)\)\s*$/, '$1').trim();
    const other = WORDS.find(w => (m[2] === 'en2ko' ? w.ko === opt : w.en === opt) && w.id !== target.id);
    if (!other) {
      console.log('못 찾음:', line.trim().slice(0, 60));
      continue;
    }
    if (groups.some(g => g.includes(target.en) && g.includes(other.en))) continue;
    groups.push([target.en, other.en]);
    added++;
  }
writeFileSync(new URL('../content/confusables.json', import.meta.url), '[\n' + groups.map(g => '  ' + JSON.stringify(g)).join(',\n') + '\n]\n');
console.log('추가된 묶음', added, '전체', groups.length);
