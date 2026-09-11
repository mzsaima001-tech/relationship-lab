import {
  Question,
  AssessmentContext,
  Dimension,
} from "./types";
import {
  getCoreQuestions,
  getRelationshipQuestions,
  getLifeStageQuestions,
  getConsistencyQuestions,
} from "@/lib/content/store";

// Seeded pseudo-random generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(arr: T[], n: number, random: () => number): T[] {
  const pool = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const idx = Math.floor(random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildInitialQuestions(
  sessionId: string,
  context: AssessmentContext
): Question[] {
  const dimensions: Dimension[] = [
    "response_need",
    "expression",
    "space_need",
    "emotional_sensitivity",
    "conflict_urgency",
    "repair_orientation",
  ];

  // Use sessionId hash as seed for reproducibility
  let seed = 0;
  for (let i = 0; i < sessionId.length; i++) {
    seed = (seed * 31 + sessionId.charCodeAt(i)) | 0;
  }
  const random = mulberry32(seed);

  const coreQuestions = getCoreQuestions();
  const relationshipQuestions = getRelationshipQuestions();
  const lifeStageQuestions = getLifeStageQuestions();
  const consistencyQuestions = getConsistencyQuestions();

  const selected: Question[] = [];
  const usedExclusionGroups = new Set<string>();

  const canUse = (question: Question) =>
    !question.exclusionGroup || !usedExclusionGroups.has(question.exclusionGroup);
  const add = (question: Question) => {
    selected.push(question);
    if (question.exclusionGroup) usedExclusionGroups.add(question.exclusionGroup);
  };

  // Core: 每维度 2 题，优先 1 道正向 + 1 道反向/情境题。
  const selectedCore: Question[] = [];
  for (const dimension of dimensions) {
    const pool = shuffle(
      coreQuestions.filter(question => question.dimension === dimension && question.active !== false),
      random
    );
    const positive = pool.filter(question =>
      question.scoreDirection !== "reverse" && question.kind === "likert"
    );
    const contrast = pool.filter(question =>
      question.scoreDirection === "reverse" || question.kind !== "likert"
    );

    const first = positive.find(canUse) || pool.find(canUse);
    if (first) {
      add(first);
      selectedCore.push(first);
    }

    const second = contrast.find(question => question.id !== first?.id && canUse(question))
      || pool.find(question => question.id !== first?.id && canUse(question));
    if (second) {
      add(second);
      selectedCore.push(second);
    }
  }

  // 关系专属题：关系类型、阶段都要匹配；候选不足时仅放宽阶段，不跨关系类型。
  const relationStrict = relationshipQuestions.filter(question =>
    question.active !== false &&
    (!question.relationshipTypes || question.relationshipTypes.includes(context.relationshipType)) &&
    (!question.relationshipStages || question.relationshipStages.includes(context.relationshipStage))
  );
  const relationFallback = relationshipQuestions.filter(question =>
    question.active !== false &&
    (!question.relationshipTypes || question.relationshipTypes.includes(context.relationshipType))
  );
  const selectedRelation: Question[] = [];
  const relationCandidates = shuffle(relationStrict.length >= 4 ? relationStrict : relationFallback, random);
  for (const question of relationCandidates) {
    if (selectedRelation.length >= 4) break;
    if (canUse(question)) {
      add(question);
      selectedRelation.push(question);
    }
  }

  // 年龄/生活阶段题：lifeStage 优先于 ageBand。
  const stagePool = lifeStageQuestions.filter(question =>
    question.active !== false &&
    context.lifeStage && question.lifeStages?.includes(context.lifeStage)
  );
  const agePool = lifeStageQuestions.filter(question =>
    question.active !== false &&
    (!question.ageBands || question.ageBands.includes(context.ageBand))
  );
  const selectedAge: Question[] = [];
  const ageCandidates = shuffle(stagePool.length >= 4 ? stagePool : agePool, random);
  for (const question of ageCandidates) {
    if (selectedAge.length >= 4) break;
    if (canUse(question)) {
      add(question);
      selectedAge.push(question);
    }
  }

  // 交叉校验题嵌入前 20 题：最多用 2 道，替换同维度核心题，不增加总题数。
  const consistencyPool = shuffle(consistencyQuestions.filter(question => question.active !== false), random);
  const selectedChecks = consistencyPool.filter(canUse).slice(0, 2);
  for (const check of selectedChecks) {
    const replaceIndex = selectedCore.findIndex(question => question.dimension === check.dimension);
    if (replaceIndex >= 0) selectedCore[replaceIndex] = check;
  }

  return shuffle([...selectedCore, ...selectedRelation, ...selectedAge], random);
}

export function buildInitialQuestionsFromSeed(
  seedString: string,
  context: AssessmentContext
): Question[] {
  return buildInitialQuestions(seedString, context);
}
