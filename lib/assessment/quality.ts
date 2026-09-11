import {
  Answer,
  ConsistencyPair,
  ConsistencyResult,
  Question,
  ResponseQuality,
} from "./types";

// ============================================================
// 回答质量引擎 V2.0
// 不判断用户是否诚实，只判断结果应被信任到什么程度。
// ============================================================

export function calculateConsistency(
  answers: Answer[],
  pairs: ConsistencyPair[]
): ConsistencyResult {
  const answerMap = new Map(answers.map(answer => [answer.questionId, answer.value]));
  const evaluatedPairs: ConsistencyResult["pairs"] = [];
  let weightedPenalty = 0;
  let totalWeight = 0;

  for (const pair of pairs) {
    const valueA = answerMap.get(pair.questionA);
    const valueB = answerMap.get(pair.questionB);
    if (valueA === undefined || valueB === undefined) continue;

    const adjustedB = pair.relationship === "opposite_direction" ? 6 - valueB : valueB;
    const difference = Math.abs(valueA - adjustedB);
    const severity =
      difference <= 1 ? "none" :
      difference === 2 ? "acceptable" :
      difference === 3 ? "notable" :
      "strong_conflict";

    evaluatedPairs.push({
      pairId: pair.id,
      questionA: pair.questionA,
      questionB: pair.questionB,
      valueA,
      valueB,
      adjustedB,
      difference,
      relationship: pair.relationship,
      severity,
    });

    // contextual 差异优先作为情境依赖，不直接惩罚语义一致性。
    if (pair.relationship !== "contextual") {
      const effectiveDifference = Math.max(0, difference - pair.expectedTolerance);
      const availableRange = Math.max(1, 4 - pair.expectedTolerance);
      weightedPenalty += (effectiveDifference / availableRange) * pair.severityWeight;
      totalWeight += pair.severityWeight;
    }
  }

  const semanticConsistency = totalWeight > 0
    ? clamp(Math.round(100 * (1 - weightedPenalty / totalWeight)))
    : 80;

  // contextual pair 的差异优先解释为情境依赖，而不是测量失败。
  const contextualPairs = evaluatedPairs.filter(pair => pair.relationship === "contextual");
  const contextCoherence = contextualPairs.length > 0
    ? clamp(Math.round(100 - average(contextualPairs.map(pair => pair.difference)) * 15))
    : 85;

  return {
    pairs: evaluatedPairs,
    semanticConsistency,
    contextCoherence,
  };
}

export function calculateResponseQuality(
  answers: Answer[],
  questions: Question[],
  consistency: ConsistencyResult
): ResponseQuality {
  const values = answers.map(answer => answer.value).filter(value => value >= 1 && value <= 5);
  const longestSameAnswerRun = longestRun(values);
  const extremeResponseRatio = ratio(values.filter(value => value === 1 || value === 5).length, values.length);
  const midpointResponseRatio = ratio(values.filter(value => value === 3).length, values.length);

  const responseTimes = answers
    .map(answer => answer.responseTimeMs)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const personalMedian = median(responseTimes);
  const rapidRun = personalMedian > 0
    ? longestBooleanRun(responseTimes.map(value => value / personalMedian < 0.2))
    : 0;
  // 文档要求检测「连续多题」明显快于个人基准，而不是偶发快速点击。
  const rapidAnsweringFlag = responseTimes.length >= 5 && rapidRun >= 3;

  const half = Math.floor(responseTimes.length / 2);
  const firstHalfMedian = median(responseTimes.slice(0, half));
  const secondHalfMedian = median(responseTimes.slice(half));
  const lateTestFatigue =
    firstHalfMedian > 0 &&
    secondHalfMedian > 0 &&
    secondHalfMedian / firstHalfMedian < 0.3 &&
    longestRun(values.slice(Math.floor(values.length / 2))) >= 4;

  const straightLinePenalty =
    longestSameAnswerRun >= 12 ? 50 :
    longestSameAnswerRun >= 8 ? 25 :
    longestSameAnswerRun >= 6 ? 10 : 0;
  const attentionQuality = clamp(
    100 - straightLinePenalty - (rapidAnsweringFlag ? 30 : 0) - (lateTestFatigue ? 20 : 0)
  );

  const extremePenalty = extremeResponseRatio > 0.9 ? 35 : extremeResponseRatio > 0.75 ? 20 : 0;
  const midpointPenalty = midpointResponseRatio > 0.7 ? 45 : midpointResponseRatio > 0.55 ? 20 : 0;
  const responseVariabilityQuality = clamp(100 - extremePenalty - midpointPenalty);

  const timingQuality = responseTimes.length < 5
    ? 80
    : clamp(100 - (rapidAnsweringFlag ? 45 : 0) - (lateTestFatigue ? 30 : 0));

  const semanticConsistency = consistency.semanticConsistency;
  const contextCoherence = consistency.contextCoherence;

  const rqi = clamp(Math.round(
    semanticConsistency * 0.35 +
    attentionQuality * 0.20 +
    responseVariabilityQuality * 0.15 +
    timingQuality * 0.10 +
    contextCoherence * 0.20
  ));

  const level: ResponseQuality["level"] =
    rqi >= 85 ? "high_confidence" :
    rqi >= 70 ? "good_confidence" :
    rqi >= 55 ? "moderate_confidence" :
    "low_confidence";

  return {
    rqi,
    level,
    semanticConsistency,
    attentionQuality,
    responseVariabilityQuality,
    timingQuality,
    contextCoherence,
    straightLiningScore: longestSameAnswerRun,
    rapidAnsweringFlag,
    extremeResponseRatio: roundRatio(extremeResponseRatio),
    midpointResponseRatio: roundRatio(midpointResponseRatio),
    socialDesirabilityScore: calculateSocialDesirability(answers, questions),
    lateTestFatigue,
  };
}

export function adjustConfidence(
  rawConfidence: number,
  rqi: number,
  evidenceDiversity: number
): number {
  const qualityModifier = 0.65 + clamp(rqi) / 100 * 0.35;
  const diversityModifier = 0.75 + clamp(evidenceDiversity) / 100 * 0.25;
  return clamp(Math.round(rawConfidence * qualityModifier * diversityModifier));
}

function calculateSocialDesirability(answers: Answer[], questions: Question[]): number {
  const questionMap = new Map(questions.map(question => [question.id, question]));
  const maturityCoded = answers.filter(answer => {
    const question = questionMap.get(answer.questionId);
    if (!question) return false;
    if (question.id.startsWith("SD-")) return false;
    // 高表达、高修复、低需要、低嫉妒等“看起来成熟”的固定方向。
    const adjusted = question.scoreDirection === "reverse" ? 6 - answer.value : answer.value;
    return adjusted === 5;
  }).length;

  const total = answers.filter(answer => !answer.questionId.startsWith("SD-")).length;
  if (total === 0) return 0;
  const ratioValue = maturityCoded / total;
  return clamp(Math.round(Math.max(0, ratioValue - 0.55) / 0.45 * 100));
}

function longestRun(values: number[]): number {
  if (values.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] === values[index - 1]) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function longestBooleanRun(values: boolean[]): number {
  let longest = 0;
  let current = 0;
  for (const value of values) {
    current = value ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
