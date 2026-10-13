// 레벨 테스트 채점
// 한 단계는 4/6(⅔) 이상 맞히면 '통과'. 공부할 레벨 = 통과한 가장 높은 단계(편안하게 풀 수 있는 곳에서 시작,
// 앱이 내 레벨을 다 풀면 자동으로 윗 레벨로 넘어간다).
// 단, 그 단계를 전부 맞혔다면 더 배울 게 없으니 한 단계 위로.
//   초등 5/6·중등 5/6·고등 3/6 → 중등   /   초등 6/6·중등 2/6 → 중등   /   전부 6/6 → 실전
export const PASS = 2 / 3;

export function placeLevel(perLevel) {
  let level = 1;
  for (const lv of [1, 2, 3, 4]) {
    const r = perLevel[lv];
    if (!r || r.correct / r.total < PASS - 1e-9) break;
    level = r.correct === r.total && lv < 4 ? lv + 1 : lv;
  }
  return level;
}
