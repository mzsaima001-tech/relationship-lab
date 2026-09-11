// 1000 个虚拟用户的随机答题 → 统计 29 原型命中分布
import { computeDimensionScores } from "../lib/personality/scoring";
import { matchArchetypes } from "../lib/personality/archetypes";
import { PERSONALITY_QUESTIONS } from "../lib/personality/questions";

// 用确定性 PRNG（mulberry32）保证每次可复现
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const letters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

function randomAnswers(rng: () => number) {
  const r: Record<string, "A" | "B" | "C" | "D"> = {};
  PERSONALITY_QUESTIONS.forEach(q => r[q.id] = letters[Math.floor(rng() * 4)]);
  return r;
}

// 生成 N 个用户（每用户会经 8 次「均匀」模拟 + 多次「偏画像」模拟）
interface User { name: string; primary: string; secondary: string; hidden: string; scores: any; }

const users: User[] = [];
const rng = mulberry32(20260911);

// 700 随机用户（占总样本 70%）
for (let i = 1; i <= 700; i++) {
  const ans = randomAnswers(rng);
  const scores = computeDimensionScores(ans, PERSONALITY_QUESTIONS);
  const top = matchArchetypes(scores);
  users.push({ name: `随机${i}`, primary: top[0].type, secondary: top[1].type, hidden: top[2].type, scores });
}

// 100 高敏用户（社交 A + 敏 A + 计划 D + 风 D）
for (let i = 1; i <= 100; i++) {
  const ans: Record<string, "A" | "B" | "C" | "D"> = {};
  PERSONALITY_QUESTIONS.forEach(q => {
    if (q.dimension === "sensitivity") ans[q.id] = q.reverse ? "D" : "A";
    else if (q.dimension === "social") ans[q.id] = q.reverse ? "D" : "A";
    else if (q.dimension === "planning") ans[q.id] = q.reverse ? "A" : "D";
    else if (q.dimension === "risk") ans[q.id] = q.reverse ? "A" : "D";
    else ans[q.id] = letters[Math.floor(rng() * 4)];
  });
  const scores = computeDimensionScores(ans, PERSONALITY_QUESTIONS);
  const top = matchArchetypes(scores);
  users.push({ name: `高敏${i}`, primary: top[0].type, secondary: top[1].type, hidden: top[2].type, scores });
}

// 100 低社高计划用户
for (let i = 1; i <= 100; i++) {
  const ans: Record<string, "A" | "B" | "C" | "D"> = {};
  PERSONALITY_QUESTIONS.forEach(q => {
    if (q.dimension === "social") ans[q.id] = q.reverse ? "A" : "D";
    else if (q.dimension === "planning") ans[q.id] = q.reverse ? "D" : "A";
    else if (q.dimension === "rationality") ans[q.id] = q.reverse ? "D" : "A";
    else ans[q.id] = letters[Math.floor(rng() * 4)];
  });
  const scores = computeDimensionScores(ans, PERSONALITY_QUESTIONS);
  const top = matchArchetypes(scores);
  users.push({ name: `低社计划${i}`, primary: top[0].type, secondary: top[1].type, hidden: top[2].type, scores });
}

// 100 高主高社领导用户
for (let i = 1; i <= 100; i++) {
  const ans: Record<string, "A" | "B" | "C" | "D"> = {};
  PERSONALITY_QUESTIONS.forEach(q => {
    if (q.dimension === "dominance") ans[q.id] = q.reverse ? "D" : "A";
    else if (q.dimension === "social") ans[q.id] = q.reverse ? "D" : "A";
    else if (q.dimension === "risk") ans[q.id] = q.reverse ? "D" : "A";
    else ans[q.id] = letters[Math.floor(rng() * 4)];
  });
  const scores = computeDimensionScores(ans, PERSONALITY_QUESTIONS);
  const top = matchArchetypes(scores);
  users.push({ name: `领导${i}`, primary: top[0].type, secondary: top[1].type, hidden: top[2].type, scores });
}

const TOTAL = users.length;
const primaryCount: Record<string, number> = {};
const allAppear: Set<string> = new Set();

users.forEach(u => {
  primaryCount[u.primary] = (primaryCount[u.primary] ?? 0) + 1;
  allAppear.add(u.primary);
  allAppear.add(u.secondary);
  allAppear.add(u.hidden);
});

const sorted = Object.entries(primaryCount).sort((a, b) => b[1] - a[1]);

console.log(`\n=== 总样本 ${TOTAL} 个用户 ===`);
console.log(`\nPrimary 命中分布（共 ${sorted.length} 种不同 primary）：\n`);
sorted.forEach(([t, c], i) => {
  const pct = (c / TOTAL * 100).toFixed(1);
  const bar = "█".repeat(Math.round(c / TOTAL * 50));
  console.log(`  ${(i+1).toString().padStart(2)}. ${t.padEnd(30)} ${c.toString().padStart(4)} (${pct}%) ${bar}`);
});

const top3Sum = sorted.slice(0, 3).reduce((s, [, c]) => s + c, 0);
const top5Sum = sorted.slice(0, 5).reduce((s, [, c]) => s + c, 0);
const top10Sum = sorted.slice(0, 10).reduce((s, [, c]) => s + c, 0);

console.log(`\n=== 集中度分析 ===`);
console.log(`Top 3 原型累计命中: ${top3Sum}/${TOTAL} (${(top3Sum/TOTAL*100).toFixed(1)}%)`);
console.log(`Top 5 原型累计命中: ${top5Sum}/${TOTAL} (${(top5Sum/TOTAL*100).toFixed(1)}%)`);
console.log(`Top 10 原型累计命中: ${top10Sum}/${TOTAL} (${(top10Sum/TOTAL*100).toFixed(1)}%)`);

console.log(`\n=== Top3 累计覆盖率 ===`);
console.log(`出现在所有 Top3 中的不同原型数: ${allAppear.size}/29`);
console.log(`出现过的原型: ${Array.from(allAppear).sort().join(", ")}`);

console.log(`\n=== 用户独立结果分析 ===`);
// 检查"每次测得出不同 primary 的比例"
const uniqueUsers = new Set(users.map(u => u.primary));
console.log(`不同的 primary 数: ${uniqueUsers.size}/29`);

// 看用户实际分布是否合理
const over20 = sorted.filter(([, c]) => c / TOTAL > 0.10).length;
const over10 = sorted.filter(([, c]) => c / TOTAL > 0.05).length;
console.log(`Primary 单占比 >10% 的原型数: ${over20}`);
console.log(`Primary 单占比 >5% 的原型数: ${over10}`);

// 列出从未出现的原型
const allTypes = ['dark_reef', 'spark', 'departure', 'scout', 'drifter', 'glimmer',
  'strategist', 'observer', 'guardian', 'coordinator', 'creator', 'explorer',
  'doer', 'leader', 'whole',
  'dark_reef__spark', 'spark__departure', 'departure__scout', 'scout__drifter',
  'drifter__glimmer', 'glimmer__strategist', 'strategist__observer',
  'observer__guardian', 'guardian__coordinator', 'coordinator__creator',
  'creator__explorer', 'explorer__doer', 'doer__leader', 'leader__whole'];
const deadTypes = allTypes.filter(t => !primaryCount[t]);
console.log(`\nPrimary 未被命中的原型: ${deadTypes.length === 0 ? "无" : deadTypes.join(", ")}`);
