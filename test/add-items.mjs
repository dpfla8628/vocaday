// 새 문항 묶음을 내용 파일에 붙인다(id는 레벨별 다음 번호로 매김, 이미 있는 단어·문장은 건너뜀)
// 사용: node test/add-items.mjs <chunk.json...> [--content <dir>]   (기본 dir: ../content)
// chunk 형식: {"words":[{lv,en,ko,pos,ex,exKo,alt?,near?,distractors:[{en,ko}×6]}], "grammar":[{lv,tag,s,ko,alt,tip,bank}]}
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { norm, plain } from '../public/grade.js';

const args = process.argv.slice(2);
const at = args.indexOf('--content');
const dir = at >= 0 ? args.splice(at, 2)[1] : fileURLToPath(new URL('../content', import.meta.url));
const read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const write = (f, a) => writeFileSync(join(dir, f), '[\n' + a.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n');

const WFILE = lv => `words_lv${lv}.json`;
const GFILE = lv => (lv <= 2 ? 'grammar_lv12.json' : 'grammar_lv34.json');
const words = Object.fromEntries([1, 2, 3, 4].map(lv => [lv, read(WFILE(lv))]));
const grammar = { 'grammar_lv12.json': read('grammar_lv12.json'), 'grammar_lv34.json': read('grammar_lv34.json') };
const fixed = read('distractors.json');
const ens = new Set(Object.values(words).flat().map(w => norm(w.en)));
const sents = new Set(Object.values(grammar).flat().map(g => norm(plain(g.s))));
const nextNo = (list, prefix) => Math.max(0, ...list.filter(x => x.id.startsWith(prefix)).map(x => +x.id.slice(prefix.length))) + 1;

const added = { words: 0, grammar: 0 };
const skipped = [];
for (const f of args) {
  const chunk = JSON.parse(readFileSync(f, 'utf8'));
  for (const { distractors, ...w } of chunk.words ?? []) {
    if (ens.has(norm(w.en))) {
      skipped.push(`단어 중복 ${w.en}`);
      continue;
    }
    const prefix = `w${w.lv}-`;
    const id = prefix + String(nextNo(words[w.lv], prefix)).padStart(3, '0');
    words[w.lv].push({ id, ...w });
    fixed[id] = distractors;
    ens.add(norm(w.en));
    added.words++;
  }
  for (const g of chunk.grammar ?? []) {
    if (sents.has(norm(plain(g.s)))) {
      skipped.push(`문장 중복 ${g.s}`);
      continue;
    }
    const list = grammar[GFILE(g.lv)];
    const prefix = `g${g.lv}-`;
    list.push({ id: prefix + String(nextNo(list, prefix)).padStart(3, '0'), ...g });
    sents.add(norm(plain(g.s)));
    added.grammar++;
  }
}
for (const lv of [1, 2, 3, 4]) write(WFILE(lv), words[lv]);
for (const [f, a] of Object.entries(grammar)) write(f, a);
writeFileSync(join(dir, 'distractors.json'), '{\n' + Object.entries(fixed).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
console.log('추가', added, skipped.length ? `\n건너뜀 ${skipped.length}:\n` + skipped.join('\n') : '');
