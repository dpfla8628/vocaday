// 4지선다 오답 보기 고르기 — 정답과(또는 서로) 뜻이 겹치는 단어는 절대 같이 내지 않는다
export const senses = ko =>
  ko
    .split(/[,·/;]/)
    .map(s => s.replace(/\(.*?\)|~/g, '').replace(/\s+/g, ''))
    .filter(Boolean);

// 같은 뜻이 있거나, 한쪽 뜻이 다른 쪽에 포함되면(나타나다 ⊂ 갑자기 나타나다) 겹친다고 본다
const clash = (a, b) => a.some(x => b.some(y => x === y || (x.length >= 2 && y.includes(x)) || (y.length >= 2 && x.includes(y))));

// groups: content/confusables.json — 뜻이 같다고 볼 만한 표제어 묶음(유의어·구동사 등)
// 두 단어가 보기로 같이 나오면 안 되는 관계인지(뜻 겹침·유의어 묶음)
export function makeRelated(words, groups) {
  const S = new Map(words.map(w => [w.id, senses(w.ko)]));
  const G = new Map();
  groups.forEach((g, i) => g.forEach(en => (G.get(en) ?? G.set(en, new Set()).get(en)).add(i)));
  return (a, b) => a.en === b.en || a.ko === b.ko || clash(S.get(a.id), S.get(b.id)) || [...(G.get(a.en) ?? [])].some(i => G.get(b.en)?.has(i));
}

export function makePicker(words, groups) {
  const related = makeRelated(words, groups);

  // fixed: content/distractors.json — 단어마다 사람이 검수한 오답 후보(6개). 있으면 그중 3개를 무작위로 낸다
  const byEn = new Map(words.map(w => [w.en, w]));
  return (x, shuffle, fixed, n = 3) => {
    if (fixed?.[x.id]) return shuffle([...fixed[x.id]]).slice(0, n).map(en => ({ en, ko: byEn.get(en).ko }));
    const picked = [];
    const fill = pool => {
      for (const w of shuffle([...pool])) {
        if (picked.length === n) return;
        if (!related(w, x) && picked.every(p => !related(w, p))) picked.push(w);
      }
    };
    fill(words.filter(w => w.pos === x.pos && Math.abs(w.lv - x.lv) <= 1)); // 같은 품사·비슷한 레벨 우선
    if (picked.length < n) fill(words);
    return picked.map(w => ({ en: w.en, ko: w.ko }));
  };
}
