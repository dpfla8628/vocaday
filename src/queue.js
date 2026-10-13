// 새 문제를 내는 순서.
// 내 레벨 → 윗 레벨 → 아랫 레벨. 같은 레벨 안에서는 문법 패턴(tag)이 번갈아 나오고(현재완료만 6개 연달아 X),
// 그 안에서는 id 해시 순이라 하루 안에서는 몇 번을 불러도 같은 묶음이 나온다(홈 미리보기 = 실제 세션).
const hash = s => {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n;
};

export function freshOrder(pool, level) {
  const rank = x => (x.lv >= level ? x.lv - level : 10 + level - x.lv);
  const byHash = [...pool].sort((a, b) => hash(a.id) - hash(b.id));
  const idx = new Map(); // (레벨, 패턴) 묶음 안에서 몇 번째인지 → 묶음마다 하나씩 돌아가며 뽑힌다
  const count = new Map();
  for (const x of byHash) {
    const g = `${rank(x)}|${x.tag ?? ''}`;
    idx.set(x.id, count.get(g) ?? 0);
    count.set(g, idx.get(x.id) + 1);
  }
  return byHash.sort((a, b) => rank(a) - rank(b) || idx.get(a.id) - idx.get(b.id) || hash(a.id) - hash(b.id));
}
