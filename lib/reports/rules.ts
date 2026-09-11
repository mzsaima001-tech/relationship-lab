import type { ReportRule, RuleCondition } from "@/lib/assessment/types";

const condition = (
  source: RuleCondition["source"],
  key: string,
  operator: RuleCondition["operator"],
  value?: RuleCondition["value"],
): RuleCondition => ({ source, key, operator, ...(value === undefined ? {} : { value }) });

const dimension = (key: string, operator: RuleCondition["operator"], value: RuleCondition["value"]) =>
  condition("dimension", key, operator, value);
const signal = (key: string, operator: RuleCondition["operator"] = "==", value: RuleCondition["value"] = 1) =>
  condition("signal", key, operator, value);
const state = (key: string, operator: RuleCondition["operator"], value: RuleCondition["value"]) =>
  condition("relationship_state", key, operator, value);
const context = (key: string, operator: RuleCondition["operator"], value: RuleCondition["value"]) =>
  condition("context", key, operator, value);

/**
 * V2.0 的确定性报告规则资产。规则只决定“说什么”，叙事层只负责“怎么说”。
 * 布尔信号以 1/0 表示，执行器会对 boolean 与 1/0 做等价归一化。
 */
export const REPORT_RULES: readonly ReportRule[] = [
  // 回应与确定感需求
  {
    id: "RRE-RN-01", version: "1.0", category: "need", priority: 56,
    conditions: [dimension("response_need", "<=", 35)], minConfidence: 70,
    semanticGroup: "low_response_need",
    output: {
      headline: "稳定关系里，你能容纳各自的生活节奏",
      evidence: ["response_need<=35"],
      meaning: "你通常不需要通过高频联系持续确认一段关系是否稳定。",
      strength: "关系明确时，你能够容纳相对独立的生活节奏。",
      risk: "如果对方回应需求较高，你的“没问题”可能被体验成“你不在意”。",
    },
  },
  {
    id: "RRE-RN-02", version: "1.0", category: "need", priority: 45,
    conditions: [dimension("response_need", "between", [36, 69])],
    semanticGroup: "moderate_response_need",
    output: {
      headline: "你的回应需求会随情境调整",
      evidence: ["response_need=36..69"],
      meaning: "你对联系频率没有特别固定的单一倾向，具体关系情境可能更重要。",
    },
  },
  {
    id: "RRE-RN-03", version: "1.0", category: "need", priority: 80,
    conditions: [dimension("response_need", ">=", 70)], minConfidence: 70,
    semanticGroup: "high_response_need",
    output: {
      headline: "回应和连接变化对你比较重要",
      evidence: ["response_need>=70"],
      meaning: "关系中的回应和连接变化，对你的影响通常比较明显。",
    },
  },
  {
    id: "RRE-RN-04", version: "1.2", category: "need", priority: 88,
    conditions: [
      dimension("response_need", ">=", 70), dimension("space_need", ">=", 60),
      signal("clarity_over_frequency"), signal("reassurance_then_calm"),
    ], minConfidence: 70, semanticGroup: "security_before_autonomy",
    output: {
      headline: "你需要的不是更黏，而是更确定",
      evidence: ["response_need>=70", "space_need>=60", "clarity_over_frequency", "reassurance_then_calm"],
      meaning: "你真正需要的可能不是更多联系，而是更少的不确定；关系状态明确、变化有解释时，你能够接受彼此各自生活。",
      recommendationIds: ["REC-SECURITY-TIMELINE"], scriptIds: ["SCRIPT-SECURITY-SPACE"],
    },
  },
  {
    id: "RRE-RN-05", version: "1.0", category: "need", priority: 83,
    conditions: [dimension("response_need", ">=", 70), signal("clarity_over_frequency", "==", 0), signal("persistent_contact_need")],
    minConfidence: 70, semanticGroup: "persistent_connection_need",
    output: {
      headline: "高频连接本身对你有价值",
      evidence: ["response_need>=70", "clarity_over_frequency=false", "persistent_contact_need"],
      meaning: "即使关系本身很稳定，高频连接对你来说仍然具有真实价值。",
    },
  },
  {
    id: "RRE-RN-06", version: "1.0", category: "need", priority: 84,
    conditions: [signal("priority_sensitivity", ">=", 70), signal("priority_over_immediacy")],
    semanticGroup: "priority_in_real_life",
    output: {
      headline: "你在意的是有没有被放进现实安排",
      evidence: ["priority_sensitivity=high", "priority_over_immediacy"],
      meaning: "你真正关注的可能不是回复快不快，而是自己有没有被放进对方的现实安排里。",
    },
  },

  // 表达
  {
    id: "RRE-EX-01", version: "1.0", category: "strength", priority: 62,
    conditions: [dimension("expression", ">=", 70)], minConfidence: 70,
    semanticGroup: "willing_to_express",
    output: {
      headline: "你愿意把需求和感受说出来",
      evidence: ["expression>=70"],
      meaning: "你通常比较愿意把自己的需求和感受说出来。",
      strength: "主动表达能够降低关系中的猜测成本。",
    },
  },
  {
    id: "RRE-EX-02", version: "1.0", category: "stress", priority: 57,
    conditions: [dimension("expression", "<=", 45)], minConfidence: 70,
    semanticGroup: "low_expression",
    output: {
      headline: "你更常先整理，再决定是否开口",
      evidence: ["expression<=45"],
      meaning: "你的表达启动得相对慢，但这不等于你没有需求或不善沟通。",
    },
  },
  {
    id: "RRE-EX-03", version: "1.0", category: "need", priority: 76,
    conditions: [signal("expression_block_source", "==", "fear_of_burdening")],
    semanticGroup: "fear_of_burdening",
    output: {
      headline: "你会先担心表达是否给人压力",
      evidence: ["expression_block_source=fear_of_burdening"],
      meaning: "你不是没有需求，而是经常会先判断，说出来会不会给对方增加负担。",
      scriptIds: ["SCRIPT-LOW-EXPRESSION"],
    },
  },
  {
    id: "RRE-EX-04", version: "1.0", category: "risk", priority: 73,
    conditions: [signal("mind_reading_expectation", ">=", 70)],
    semanticGroup: "mind_reading_expectation",
    output: {
      headline: "越重要的人，你越可能期待对方自己懂",
      evidence: ["mind_reading_expectation=high"],
      meaning: "越是重要的人，你有时越容易期待对方应该能看出来。",
      risk: "熟悉感可能替代真实表达。",
    },
  },
  {
    id: "RRE-EX-05", version: "1.0", category: "relationship_state", priority: 91,
    conditions: [signal("expression_block_source", "==", "communication_futility")],
    semanticGroup: "communication_futility",
    output: {
      headline: "低表达可能来自“说了也没用”的关系经验",
      evidence: ["expression_block_source=communication_futility"],
      meaning: "你减少表达可能不是稳定偏好，而是当前关系中对沟通有效性的信心正在下降。",
      risk: "需要优先恢复沟通的可回应性，而不是要求你表达更多。",
    },
  },
  {
    id: "RRE-EX-06", version: "1.0", category: "stress", priority: 68,
    conditions: [dimension("expression", ">=", 70), signal("expression_specificity", "<", 45)],
    semanticGroup: "expression_without_specificity",
    output: {
      headline: "你愿意表达，但具体需求有时会被情绪盖住",
      evidence: ["expression>=70", "expression_specificity<45"],
      meaning: "情绪强的时候，你的表达可能容易停留在评价，而不是具体需求。",
    },
  },

  // 空间
  {
    id: "RRE-SP-01", version: "1.0", category: "need", priority: 70,
    conditions: [dimension("space_need", ">=", 70)], minConfidence: 70,
    semanticGroup: "high_space_need",
    output: {
      headline: "亲密关系里，你仍需要明显的个人空间",
      evidence: ["space_need>=70"],
      meaning: "你在亲密关系中仍然需要明显的个人空间，这不等于回避亲密。",
    },
  },
  {
    id: "RRE-SP-02", version: "1.0", category: "need", priority: 75,
    conditions: [signal("restorative_space")], semanticGroup: "restorative_space",
    output: {
      headline: "你的空间需求更像恢复，而不是退出",
      evidence: ["restorative_space"],
      meaning: "独处帮助你恢复状态，并不自动意味着你想退出关系。",
    },
  },
  {
    id: "RRE-SP-03", version: "1.0", category: "need", priority: 86,
    conditions: [signal("autonomy_with_reassurance")], semanticGroup: "security_before_autonomy",
    output: {
      headline: "确定以后，你才能更自在地拥有空间",
      evidence: ["autonomy_with_reassurance"],
      meaning: "对你来说，空间最舒服的前提是，你知道这段距离不会被误解成关系变化。",
      scriptIds: ["SCRIPT-SECURITY-SPACE"],
    },
  },
  {
    id: "RRE-SP-04", version: "1.0", category: "relationship_state", priority: 92,
    conditions: [dimension("space_need", ">=", 70), signal("relief_in_disconnection", ">=", 70), signal("active_connection_withdrawal", ">=", 70)],
    semanticGroup: "relationship_withdrawal",
    output: {
      headline: "当前的距离不只是恢复，也可能在减少连接",
      evidence: ["space_need>=70", "relief_in_disconnection=high", "active_connection_withdrawal=high"],
      meaning: "你现在对距离的需要可能已经超出一般的独处恢复，关系参与正在下降。",
      risk: "不应只把这个模式解释为独立偏好。",
    },
  },

  // 情绪感知
  {
    id: "RRE-ES-01", version: "1.0", category: "need", priority: 72,
    conditions: [dimension("emotional_sensitivity", ">=", 70)], minConfidence: 70,
    semanticGroup: "high_emotional_sensitivity",
    output: {
      headline: "你很容易捕捉关系里的细微变化",
      evidence: ["emotional_sensitivity>=70"],
      meaning: "你通常很容易捕捉关系里的细微变化。",
    },
  },
  {
    id: "RRE-ES-02", version: "1.0", category: "strength", priority: 69,
    conditions: [signal("perceptive_without_personalizing")],
    semanticGroup: "perception_without_personalizing",
    output: {
      headline: "你能发现变化，而不急着归因于自己",
      evidence: ["perceptive_without_personalizing"],
      meaning: "你能够发现变化，但不一定马上把变化解释成都是因为自己。",
      strength: "这能减少关系中的过早归因。",
    },
  },
  {
    id: "RRE-ES-03", version: "1.0", category: "stress", priority: 87,
    conditions: [dimension("emotional_sensitivity", ">=", 70), dimension("expression", "<=", 45), signal("silent_monitor")],
    semanticGroup: "sensitive_but_silent",
    output: {
      headline: "你通常比别人更早察觉，却更晚开口",
      evidence: ["emotional_sensitivity>=70", "expression<=45", "silent_monitor"],
      meaning: "你容易先察觉并继续观察，因为不愿显得太在意而暂不开口；信息不足时，猜测可能随之增加。",
      risk: "察觉变化—继续观察—信息不足—猜测增加，可能形成反复循环。",
      scriptIds: ["SCRIPT-LOW-EXPRESSION"],
    },
  },
  {
    id: "RRE-ES-04", version: "1.0", category: "stress", priority: 74,
    conditions: [signal("emotional_contagion", ">=", 70)],
    semanticGroup: "emotional_contagion",
    output: {
      headline: "对方的情绪容易进入你的状态",
      evidence: ["emotional_contagion=high"],
      meaning: "对方的情绪比较容易影响你的状态。",
    },
  },
  {
    id: "RRE-ES-05", version: "1.0", category: "risk", priority: 78,
    conditions: [signal("emotional_contagion", ">=", 70), signal("responsibility_for_partner_emotion", ">=", 70)],
    semanticGroup: "responsible_for_partner_emotion",
    output: {
      headline: "你可能会把对方的情绪也变成自己的责任",
      evidence: ["emotional_contagion=high", "responsibility_for_partner_emotion=high"],
      meaning: "你不仅容易感受到对方的情绪，还可能习惯性地觉得自己需要负责让对方好起来。",
    },
  },

  // 冲突节奏
  {
    id: "RRE-CU-01", version: "1.0", category: "stress", priority: 71,
    conditions: [dimension("conflict_urgency", ">=", 70)], minConfidence: 70,
    semanticGroup: "high_conflict_urgency",
    output: {
      headline: "冲突悬而未决时，你较难放松",
      evidence: ["conflict_urgency>=70"],
      meaning: "发生冲突后，你通常更希望尽快重新进入问题。",
    },
  },
  {
    id: "RRE-CU-02", version: "1.0", category: "need", priority: 85,
    conditions: [dimension("conflict_urgency", ">=", 70), signal("uncertain_reconnection_trigger")],
    semanticGroup: "reconnection_certainty",
    output: {
      headline: "你怕的未必是暂停，而是不知道还会不会继续",
      evidence: ["conflict_urgency>=70", "uncertain_reconnection_trigger"],
      meaning: "你未必需要所有问题立刻解决；真正难承受的可能是暂停以后，不知道双方会不会回来继续。",
      recommendationIds: ["REC-PAUSE-RETURN-TIME"], scriptIds: ["SCRIPT-PAUSE-RETURN"],
    },
  },
  {
    id: "RRE-CU-03", version: "1.0", category: "need", priority: 82,
    conditions: [dimension("conflict_urgency", ">=", 70), signal("true_immediate_resolution_need")],
    semanticGroup: "true_immediate_resolution",
    output: {
      headline: "把问题处理清楚本身会帮助你恢复稳定",
      evidence: ["conflict_urgency>=70", "true_immediate_resolution_need"],
      meaning: "即使你知道关系仍然稳定，你也更倾向尽快把问题处理清楚。",
    },
  },
  {
    id: "RRE-CU-04", version: "1.0", category: "strength", priority: 67,
    conditions: [dimension("conflict_urgency", "<=", 40), signal("healthy_pause_return")],
    semanticGroup: "healthy_pause_return",
    output: {
      headline: "你能先整理自己，也会回来处理问题",
      evidence: ["conflict_urgency<=40", "healthy_pause_return"],
      meaning: "你更倾向先整理自己，但不会把暂停变成逃避。",
      strength: "你有在情绪高点暂停并重新进入问题的能力。",
    },
  },
  {
    id: "RRE-CU-05", version: "1.0", category: "risk", priority: 72,
    conditions: [dimension("conflict_urgency", "<=", 40), signal("healthy_pause_return", "==", 0)],
    semanticGroup: "pause_may_become_avoidance",
    output: {
      headline: "暂停之后是否回来，比暂停本身更重要",
      evidence: ["conflict_urgency<=40", "healthy_pause_return=false"],
      meaning: "你在压力中倾向退开，真正需要留意的是冷静以后有没有主动回到问题里。",
      recommendationIds: ["REC-PAUSE-RETURN-TIME"],
    },
  },

  // 修复
  {
    id: "RRE-RP-01", version: "1.0", category: "repair", priority: 65,
    conditions: [dimension("repair_orientation", ">=", 70)], minConfidence: 70,
    semanticGroup: "repair_orientation_strength",
    output: {
      headline: "你愿意重新进入问题",
      evidence: ["repair_orientation>=70"],
      meaning: "你通常不会把一次冲突自动理解成关系结束。",
      strength: "你愿意给关系修复空间。",
    },
  },
  {
    id: "RRE-RP-02", version: "1.0", category: "repair", priority: 76,
    conditions: [dimension("repair_orientation", ">=", 70), signal("repair_with_boundaries")],
    semanticGroup: "repair_with_boundaries",
    output: {
      headline: "你愿意修复，也保留对重复问题的边界",
      evidence: ["repair_orientation>=70", "repair_with_boundaries"],
      meaning: "你愿意给关系修复空间，但不认为愿意原谅等于同一个问题可以无限重复。",
      strength: "修复意愿与边界感能够同时存在。",
    },
  },
  {
    id: "RRE-RP-03", version: "1.0", category: "risk", priority: 79,
    conditions: [dimension("repair_orientation", ">=", 70), signal("repair_with_boundaries", "==", 0), signal("repeated_pattern_erosion", ">=", 70)],
    semanticGroup: "repair_without_change",
    output: {
      headline: "能和好，不一定代表问题正在改善",
      evidence: ["repair_orientation>=70", "repair_with_boundaries=false", "repeated_pattern_erosion=high"],
      meaning: "你的修复能力可能很强，但需要区分还能和好与问题正在改善。",
      risk: "反复修复若没有行为变化，仍可能持续消耗关系。",
      scriptIds: ["SCRIPT-REPAIR-FATIGUE"],
    },
  },
  {
    id: "RRE-RP-04", version: "1.0", category: "repair", priority: 74,
    conditions: [signal("behavior_change_required", ">=", 70)],
    semanticGroup: "behavior_change_repair",
    output: {
      headline: "真正的道歉需要落到行为变化",
      evidence: ["behavior_change_required=high"],
      meaning: "对你来说，真正的道歉最终需要落到行为变化上。",
      scriptIds: ["SCRIPT-REPAIR-FATIGUE"],
    },
  },

  // 五个内部矛盾
  {
    id: "TENSION-01", version: "1.0", category: "tension", priority: 88,
    conditions: [dimension("response_need", ">=", 70), dimension("space_need", ">=", 70), signal("autonomy_with_reassurance")],
    semanticGroup: "security_before_autonomy",
    output: {
      headline: "你需要空间，但不喜欢突然被留下",
      evidence: ["response_need>=70", "space_need>=70", "autonomy_with_reassurance"],
      meaning: "关系确定时，你能很好地拥有自己的生活；真正让你不舒服的是不知道距离意味着什么。",
      scriptIds: ["SCRIPT-SECURITY-SPACE"],
    },
  },
  {
    id: "TENSION-02", version: "1.0", category: "tension", priority: 86,
    conditions: [dimension("emotional_sensitivity", ">=", 70), dimension("expression", "<=", 45)],
    semanticGroup: "sensitive_but_silent",
    output: {
      headline: "你经常更早发现变化，却未必更早说出来",
      evidence: ["emotional_sensitivity>=70", "expression<=45"],
      meaning: "你对变化的察觉速度，可能快于你把感受组织成表达的速度。",
      scriptIds: ["SCRIPT-LOW-EXPRESSION"],
    },
  },
  {
    id: "TENSION-03", version: "1.0", category: "tension", priority: 85,
    conditions: [dimension("repair_orientation", ">=", 70), signal("repair_fatigue", ">=", 70)],
    semanticGroup: "repair_fatigue",
    output: {
      headline: "你不轻易放弃，但“再谈一次”已越来越难恢复信心",
      evidence: ["repair_orientation>=70", "repair_fatigue=high"],
      meaning: "你并不是一个轻易放弃的人，但因为已经修复过很多次，可能越来越难仅靠再谈一次恢复信心。",
      scriptIds: ["SCRIPT-REPAIR-FATIGUE"],
    },
  },
  {
    id: "TENSION-04", version: "1.0", category: "tension", priority: 83,
    conditions: [dimension("space_need", ">=", 70), signal("future_clarity_need", ">=", 70)],
    semanticGroup: "commitment_without_fusion",
    output: {
      headline: "你想要高度承诺，但不过度融合",
      evidence: ["space_need>=70", "future_clarity_need=high"],
      meaning: "想保留自己的生活并不等于不认真；你更理想的关系可能是高度承诺，但不过度融合。",
    },
  },
  {
    id: "TENSION-05", version: "1.0", category: "tension", priority: 80,
    conditions: [signal("jealousy", ">=", 70), signal("trust", ">=", 70)],
    semanticGroup: "jealousy_with_trust",
    output: {
      headline: "你可以会吃醋，同时仍然相信对方",
      evidence: ["jealousy=high", "trust=high"],
      meaning: "情绪本身并不自动等于不信任。",
    },
  },

  // 五个优势
  {
    id: "STRENGTH-01", version: "1.0", category: "strength", priority: 69,
    conditions: [dimension("emotional_sensitivity", ">=", 70), signal("perceptive_without_premature_interpretation")],
    semanticGroup: "perceptive_and_restrained",
    output: {
      headline: "你既能捕捉变化，也会检验第一解释",
      evidence: ["emotional_sensitivity>=70", "perceptive_without_premature_interpretation"],
      meaning: "你既能捕捉变化，又能提醒自己第一解释不一定就是事实。",
      strength: "感知力与解释克制同时存在。",
    },
  },
  {
    id: "STRENGTH-02", version: "1.0", category: "strength", priority: 68,
    conditions: [dimension("expression", ">=", 65), signal("expression_without_control", ">=", 70)],
    semanticGroup: "expression_with_boundaries",
    output: {
      headline: "你能表达需求，也允许对方不同意",
      evidence: ["expression>=65", "expression_without_control=high"],
      meaning: "你能够表达自己的需要，同时接受表达清楚不意味着对方必须同意。",
      strength: "你的表达与边界能够同时存在。",
    },
  },
  {
    id: "STRENGTH-03", version: "1.0", category: "strength", priority: 68,
    conditions: [dimension("repair_orientation", ">=", 65), signal("behavior_change_required", ">=", 70)],
    semanticGroup: "repair_and_change",
    output: {
      headline: "你既愿意修复，也重视真正改变",
      evidence: ["repair_orientation>=65", "behavior_change_required=high"],
      meaning: "你既愿意修复，也重视后续是否真正发生行为变化。",
      strength: "修复不会只停留在口头和好。",
    },
  },
  {
    id: "STRENGTH-04", version: "1.0", category: "strength", priority: 67,
    conditions: [dimension("space_need", ">=", 65), signal("autonomy_with_commitment", ">=", 70)],
    semanticGroup: "autonomy_and_commitment",
    output: {
      headline: "你能同时容纳亲密、承诺与独立",
      evidence: ["space_need>=65", "autonomy_with_commitment=high"],
      meaning: "你比较能够同时容纳我们很重要和我们不需要时时刻刻黏在一起。",
      strength: "独立不会自动削弱你的关系承诺。",
    },
  },
  {
    id: "STRENGTH-05", version: "1.0", category: "strength", priority: 66,
    conditions: [dimension("conflict_urgency", "<=", 55), signal("healthy_pause_return", ">=", 70)],
    semanticGroup: "healthy_pause_return",
    output: {
      headline: "你能在情绪高点暂停，并在之后回来",
      evidence: ["conflict_urgency<=55", "healthy_pause_return=high"],
      meaning: "你具备在情绪高点暂停、之后仍然回来处理问题的能力。",
      strength: "暂停对你而言可以是调节，而非逃避。",
    },
  },

  // 关系紧张状态：阶段条件确保状态优先于基础人格解释
  {
    id: "STATE-01", version: "1.0", category: "relationship_state", priority: 96,
    conditions: [context("relationshipStage", "==", "tense"), state("relationship_exhaustion", ">=", 70), state("connection_remaining", ">=", 65), state("repair_capacity", ">=", 65)],
    relationshipStages: ["tense"], semanticGroup: "tense_connected_exhaustion",
    output: {
      headline: "高疲劳，但连接和修复意愿仍在",
      evidence: ["relationship_exhaustion>=70", "connection_remaining>=65", "repair_capacity>=65"],
      meaning: "现在的问题更像方法失效，而不是关系完全失去连接。",
    },
  },
  {
    id: "STATE-02", version: "1.0", category: "relationship_state", priority: 95,
    conditions: [context("relationshipStage", "==", "tense"), state("connection_remaining", ">=", 65), state("trust_stability", "<=", 45)],
    relationshipStages: ["tense"], semanticGroup: "connection_with_damaged_trust",
    output: {
      headline: "连接仍在，但信任稳定性下降",
      evidence: ["connection_remaining>=65", "trust_stability<=45"],
      meaning: "当前重点不是确认是否还有感情，而是让承诺重新获得可观察的行为稳定性。",
    },
  },
  {
    id: "STATE-03", version: "1.0", category: "relationship_state", priority: 97,
    conditions: [context("relationshipStage", "==", "tense"), state("mutuality", "<=", 40), state("one_sided_repair", ">=", 70)],
    relationshipStages: ["tense"], semanticGroup: "one_sided_repair",
    output: {
      headline: "关系维护正在明显集中在一方",
      evidence: ["mutuality<=40", "one_sided_repair=high"],
      meaning: "当前修复投入呈现明显单边化，需要先确认双方是否都愿意承担关系维护。",
      risk: "继续只要求投入更多的一方努力，可能加重关系消耗。",
    },
  },
  {
    id: "STATE-04", version: "1.0", category: "relationship_state", priority: 94,
    conditions: [context("relationshipStage", "==", "tense"), state("sharing_withdrawal", ">=", 70), state("relief_in_disconnection", ">=", 70), state("desire_after_problem_resolution", ">=", 65)],
    relationshipStages: ["tense"], semanticGroup: "protective_withdrawal",
    output: {
      headline: "当前撤离更像保护，而非明确失去继续的意愿",
      evidence: ["sharing_withdrawal=high", "relief_in_disconnection=high", "desire_after_problem_resolution>=65"],
      meaning: "减少分享可能是在高压中保护自己，问题缓解后仍存在重新连接的意愿。",
    },
  },
  {
    id: "STATE-05", version: "1.0", category: "relationship_state", priority: 98,
    conditions: [context("relationshipStage", "==", "tense"), state("sharing_withdrawal", ">=", 70), state("shared_future_imagery", "<=", 40), state("desire_after_problem_resolution", "<=", 40), state("positive_connection_remaining", "<=", 40)],
    relationshipStages: ["tense"], semanticGroup: "emotional_disengagement",
    output: {
      headline: "当前的关系参与感正在明显下降",
      evidence: ["sharing_withdrawal=high", "shared_future_imagery=low", "desire_after_problem_resolution=low", "positive_connection_remaining=low"],
      meaning: "多项关系状态指标同时显示参与感和未来想象正在减少；这描述当前状态，不预测关系结局。",
      risk: "不应据此直接给出分开或继续的结论。",
    },
  },

  // 双人主循环（输入 pairPatterns 中命中）
  {
    id: "PAIR-RULE-01", version: "1.0", category: "pair_pattern", priority: 95,
    conditions: [condition("pair_pattern", "APPROACH_WITHDRAW", "exists")], minConfidence: 70,
    semanticGroup: "approach_withdraw",
    output: {
      headline: "一个人在寻找确定，一个人在寻找空间",
      evidence: ["pair_pattern=APPROACH_WITHDRAW"],
      meaning: "一方察觉距离后增加靠近，另一方在压力中后退；后退又会放大前者的不确定，形成重复循环。",
      risk: "双方若只判断谁有问题，循环会更难被看见。",
      recommendationIds: ["REC-PAUSE-RETURN-TIME"], scriptIds: ["SCRIPT-PAUSE-RETURN"],
    },
  },

  // 可执行建议与沟通脚本
  {
    id: "REC-SECURITY-TIMELINE", version: "1.0", category: "recommendation", priority: 61,
    conditions: [signal("autonomy_with_reassurance")], semanticGroup: "recommend_security_timeline",
    output: {
      headline: "距离变化时，同时说明含义和下一次连接时间",
      evidence: ["autonomy_with_reassurance"],
      meaning: "当需要独处时，避免只说“让我静静”；改为说明这不是关系变化，并给出下一次联系的大致时间。",
    },
  },
  {
    id: "REC-PAUSE-RETURN-TIME", version: "1.0", category: "recommendation", priority: 64,
    conditions: [signal("uncertain_reconnection_trigger")], semanticGroup: "recommend_pause_return_time",
    output: {
      headline: "把无期限暂停替换为有返回点的暂停",
      evidence: ["uncertain_reconnection_trigger"],
      meaning: "当你发现自己第二次追问同一问题时，停止继续追问，改为请对方给出双方重新讨论的具体时间。",
    },
  },
  {
    id: "SCRIPT-SECURITY-SPACE", version: "1.0", category: "script", priority: 60,
    conditions: [signal("autonomy_with_reassurance")], semanticGroup: "script_security_space",
    output: {
      headline: "我不是需要我们一直联系。我更需要知道，如果你暂时想自己待着，这不是因为我们的关系出了问题。",
      evidence: ["autonomy_with_reassurance"], meaning: "关系稳定确认话术",
    },
  },
  {
    id: "SCRIPT-PAUSE-RETURN", version: "1.0", category: "script", priority: 60,
    conditions: [signal("uncertain_reconnection_trigger")], semanticGroup: "script_pause_return",
    output: {
      headline: "我现在有点想马上说清楚，但我知道你可能需要时间。你能告诉我什么时候我们继续吗？有这个时间点，我会更容易先停下来。",
      evidence: ["uncertain_reconnection_trigger"], meaning: "冲突暂停话术",
    },
  },
  {
    id: "SCRIPT-LOW-EXPRESSION", version: "1.0", category: "script", priority: 60,
    conditions: [dimension("expression", "<=", 45)], semanticGroup: "script_low_expression",
    output: {
      headline: "我还没有完全想明白，但这件事确实让我有感觉。我不想等到情绪积累以后才告诉你。",
      evidence: ["expression<=45"], meaning: "低表达启动话术",
    },
  },
  {
    id: "SCRIPT-REPAIR-FATIGUE", version: "1.0", category: "script", priority: 60,
    conditions: [signal("repair_fatigue", ">=", 70)], semanticGroup: "script_repair_fatigue",
    output: {
      headline: "我愿意继续谈，但这一次我需要的不只是道歉。我更想知道，我们之后具体会怎么做得不一样。",
      evidence: ["repair_fatigue=high"], meaning: "修复疲劳话术",
    },
  },

  // suppression 规则也作为可审计规则存在；执行器据此执行禁止输出策略
  {
    id: "SUPPRESS-01", version: "1.0", category: "suppression", priority: 99,
    conditions: [context("relationshipStage", "==", "tense"), signal("active_connection_withdrawal", ">=", 70)],
    semanticGroup: "suppress_space_as_trait",
    output: { headline: "不把关系撤离解释为独立偏好", evidence: ["relationshipStage=tense", "active_connection_withdrawal=high"], meaning: "抑制一般高空间需求结论。" },
  },
  {
    id: "SUPPRESS-02", version: "1.0", category: "suppression", priority: 100,
    conditions: [condition("quality", "confidence", "<", 55)], semanticGroup: "suppress_low_confidence",
    output: { headline: "低置信度不进入主报告", evidence: ["confidence<55"], meaning: "仅保留为辅助观察。" },
  },
  {
    id: "SUPPRESS-03", version: "1.0", category: "suppression", priority: 100,
    conditions: [condition("quality", "rqi", "<", 55)], semanticGroup: "suppress_low_rqi_detail",
    output: { headline: "低 RQI 禁止精细人格解释", evidence: ["rqi<55"], meaning: "只保留安全或高层次观察。" },
  },

  // 安全风险：任一风险信号命中即进入 SAFETY_PRIORITY_MODE
  ...["intimidation", "violence", "coercion", "persistent_control", "personal_safety_risk"].map(
    (key, index): ReportRule => ({
      id: `SAFETY-${String(index + 1).padStart(2, "0")}`,
      version: "1.0", category: "risk", priority: 100,
      conditions: [signal(key, "!=", 0)], semanticGroup: "safety_priority_mode",
      output: {
        headline: "优先关注现实安全与可信赖支持",
        evidence: [key],
        meaning: "你的回答中出现了一些可能超出普通关系磨合范围的情况。当关系涉及恐吓、暴力、强迫或持续控制时，重点不是提高默契，而是优先考虑现实安全和可信赖支持。",
        risk: "禁止匹配评分、双方责任平衡分析，以及把直接共同沟通作为默认建议。",
      },
    }),
  ),
];

export const reportRules = REPORT_RULES;
