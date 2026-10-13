// 문항을 id로 찾아 필드를 덮어쓴다(단어: alt·near 등, 문법: s·ko·bank 등)
// 사용: node test/patch-items.mjs '{"w2-141":{"alt":["towards"]}}'
import { readFileSync, writeFileSync } from 'node:fs';
const patch = JSON.parse(process.argv[2]);
for (const name of ['words_lv1', 'words_lv2', 'words_lv3', 'words_lv4', 'grammar_lv12', 'grammar_lv34']) {
  const f = new URL(`../content/${name}.json`, import.meta.url);
  const a = JSON.parse(readFileSync(f, 'utf8'));
  let hit = 0;
  for (const x of a) if (patch[x.id]) Object.assign(x, patch[x.id]), hit++;
  if (hit) writeFileSync(f, '[\n' + a.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n');
}
console.log('patched', Object.keys(patch).length);
