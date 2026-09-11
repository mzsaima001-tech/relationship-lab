import {
  DimensionScores, SignalMap, Answer, Question,
} from "./types";

// ============================================================
// 信号引擎 V2.0
// 检测隐藏模式和信号
// ============================================================

export function deriveSignals(
  scores: DimensionScores,
  questions: Question[],
  answers: Answer[]
): SignalMap {
  const signals: SignalMap = {};
  const answerMap = new Map(answers.map(a => [a.questionId, a.value]));

  // 检查带 signalTags 的题目答案
  const signalEvidence: Record<string, string[]> = {};
  for (const q of questions) {
    if (!q.signalTags) continue;
    const val = answerMap.get(q.id);
    if (val === undefined) continue;
    for (const tag of q.signalTags) {
      if (!signalEvidence[tag]) signalEvidence[tag] = [];
      signalEvidence[tag].push(q.id);
    }
  }

  // ========== 来自题目标签的信号 ==========
  for (const [tag, qids] of Object.entries(signalEvidence)) {
    let confirmed = false;
    let confidence = 50;
    const signalQuestions = questions.filter(q => qids.includes(q.id));
    let highCount = 0;
    for (const q of signalQuestions) {
      const val = answerMap.get(q.id);
      if (val === undefined) continue;
      const isReverse = q.scoreDirection === "reverse" || q.reverse;
      const effective = isReverse ? 6 - val : val;
      if (effective >= 4) highCount++;
    }
    if (highCount > 0) {
      confirmed = true;
      confidence = Math.min(50 + highCount * 15, 95);
    }
    signals[tag] = {
      value: confirmed,
      confidence,
      supportingQuestionIds: qids,
    };
  }

  // ========== 组合信号 ==========
  if (scores.emotional_sensitivity >= 70 && scores.expression <= 45) {
    signals["silent_monitor"] = {
      value: true,
      confidence: Math.min(60 + (scores.emotional_sensitivity - 70) + (45 - scores.expression), 90),
      supportingQuestionIds: getQuestionIds(questions, ["ES-01", "ES-06", "EX-03", "EX-09"]),
    };
    signals["high_sensitivity_low_expression"] = signals["silent_monitor"];
  }

  if (scores.response_need >= 70 && scores.space_need >= 65) {
    signals["autonomy_with_reassurance"] = {
      value: true,
      confidence: Math.min(60 + (scores.response_need - 70) + (scores.space_need - 65), 90),
      supportingQuestionIds: getQuestionIds(questions, ["RN-08", "SP-06"]),
    };
    signals["high_need_high_space"] = signals["autonomy_with_reassurance"];
  }

  if (scores.response_need >= 65 && scores.conflict_urgency >= 65) {
    signals["approach_under_stress"] = {
      value: true,
      confidence: Math.min(55 + (scores.response_need - 65) + (scores.conflict_urgency - 65), 88),
      supportingQuestionIds: getQuestionIds(questions, ["CU-05", "CU-09"]),
    };
  }

  if (scores.space_need >= 65 && scores.conflict_urgency <= 40) {
    signals["withdraw_under_stress"] = {
      value: true,
      confidence: Math.min(55 + (scores.space_need - 65) + (40 - scores.conflict_urgency), 88),
      supportingQuestionIds: getQuestionIds(questions, ["CU-03", "SP-02"]),
    };
  }

  // uncertainty_sensitive: RN-08 高分
  const rn08 = answerMap.get("RN-08");
  if (rn08 !== undefined && rn08 >= 4) {
    signals["uncertainty_sensitive"] = {
      value: true,
      confidence: Math.min(60 + rn08 * 8, 90),
      supportingQuestionIds: ["RN-08"],
    };
  }

  // needs_reconnection_time: CU-10 高分 (reverse scored)
  const cu10 = answerMap.get("CU-10");
  if (cu10 !== undefined && cu10 >= 4) {
    signals["needs_reconnection_time"] = {
      value: true,
      confidence: Math.min(60 + cu10 * 8, 88),
      supportingQuestionIds: ["CU-10"],
    };
  }

  // repair_with_boundaries: RP-06 + RP-09 高分
  const rp06 = answerMap.get("RP-06");
  const rp09 = answerMap.get("RP-09");
  if (rp06 !== undefined && rp06 >= 4 && rp09 !== undefined && rp09 >= 4) {
    signals["repair_with_boundaries"] = {
      value: true,
      confidence: 88,
      supportingQuestionIds: ["RP-06", "RP-09"],
    };
  }

  // perceptive_without_personalizing: ES-10 高分
  const es10 = answerMap.get("ES-10");
  if (es10 !== undefined && es10 >= 4) {
    signals["perceptive_without_personalizing"] = {
      value: true,
      confidence: Math.min(60 + es10 * 8, 90),
      supportingQuestionIds: ["ES-10"],
    };
  }

  // communication_futility: EX-09 高分 (reverse)
  const ex09 = answerMap.get("EX-09");
  if (ex09 !== undefined && ex09 >= 4) {
    signals["communication_futility"] = {
      value: true,
      confidence: 75,
      supportingQuestionIds: ["EX-09"],
    };
  }

  // relief_in_disconnection / sharing_withdrawal (tense)
  if (scores.space_need >= 70 && scores.repair_orientation <= 45) {
    signals["relief_in_disconnection"] = {
      value: true,
      confidence: 70,
      supportingQuestionIds: [],
    };
    signals["sharing_withdrawal"] = {
      value: true,
      confidence: 65,
      supportingQuestionIds: [],
    };
  }

  return signals;
}

function getQuestionIds(questions: Question[], ids: string[]): string[] {
  return questions.filter(q => ids.includes(q.id)).map(q => q.id);
}

export function getSignalDescriptions(signals: SignalMap): Array<{ tag: string; description: string }> {
  const descriptions: Record<string, string> = {
    silent_monitor: "你倾向于默默观察对方的变化，但不太主动表达自己的在意",
    autonomy_with_reassurance: "你需要空间，但你不希望空间意味着关系不安全",
    high_need_high_space: "你同时需要回应和空间，需要先确认关系是安全的",
    approach_under_stress: "压力出现时，你更倾向于靠近、追问、尽快解决",
    withdraw_under_stress: "压力出现时，你更倾向于先退一步、需要空间消化",
    reassurance_then_calm: "你容易被一句简单的确认安抚",
    uncertainty_sensitive: "真正敏感的不是联系频率，而是不确定本身",
    needs_reconnection_time: "可以暂停，但必须知道什么时候回来",
    repair_with_boundaries: "愿意修复，但需要行为改变",
    perceptive_without_personalizing: "能察觉变化，但不自动归因到自己",
    clarity_over_frequency: "更重视关系确定性，而非联系频率",
    emotional_contagion: "对方情绪容易进入你的状态",
    fear_of_burdening: "担心说出需求会给别人增加压力",
    behavior_change_required: "真正的修复需要行为变化",
    repeated_pattern_erosion: "同一个问题重复会降低修复信心",
    concrete_repair_preference: "更安心于具体约定而非情绪和好",
    pause_with_reconnection: "可以接受暂停，只要确定会回来",
    communication_futility: "觉得说了也没用",
    relief_in_disconnection: "远离 TA 反而更轻松",
    sharing_withdrawal: "正在减少联系和分享",
    high_awareness_with_interpretive_restraint: "知道变化但不下结论",
    restorative_space: "需要空间是恢复，不是退出关系",
    verbal_reassurance_need: "需要明确的言语确认",
  };

  return Object.entries(signals)
    .filter(([_, entry]) => entry.value)
    .map(([tag, _]) => ({
      tag,
      description: descriptions[tag] || tag,
    }));
}
