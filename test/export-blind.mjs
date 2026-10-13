// 블라인드 풀이용 문제지(정답 없음)를 만든다: node test/export-blind.mjs <out.txt> <파일...>
import { readFileSync, writeFileSync } from 'node:fs';
import { blankParts, maskAnswer } from '../public/grade.js';
const [out, ...files] = process.argv.slice(2);
const lines = files.flatMap(f => JSON.parse(readFileSync(new URL('../content/' + f, import.meta.url), 'utf8'))).map(x => {
  const [b, ans, a] = blankParts(x.ex || x.s);
  // 실제 화면처럼 단어 빈칸은 글자 수를 점으로 보여 준다(공백은 단어 경계)
  return x.ex
    ? `${x.id}\t뜻: ${x.ko}\t해석: ${x.exKo}\t문장: ${b}[${maskAnswer(ans)}]${a}\t(빈칸 글자 수 ${ans.replace(/ /g, '').length})`
    : `${x.id}\t패턴: ${x.tag}\t해석: ${x.ko}\t문장: ${b}___${a}`;
});
writeFileSync(out, lines.join('\n') + '\n');
console.log(out, lines.length);
