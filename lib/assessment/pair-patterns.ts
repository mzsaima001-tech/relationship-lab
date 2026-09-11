import type { PairPattern } from "./types";

const commonAmplifiers = ["疲劳或工作压力增加", "关系处于不确定阶段", "过去的信任损伤尚未修复"];

export const PAIR_PATTERNS: readonly PairPattern[] = [
  {
    id: "APPROACH_WITHDRAW", name: "靠近—撤离循环", category: "difference", priority: 100, minimumConfidence: 70,
    trigger: { aMin: { response_need: 70, conflict_urgency: 60 }, bMin: { space_need: 70 }, bMax: { conflict_urgency: 45 } },
    explanation: {
      personAExperience: "你越不回应，我越需要确认。", personBExperience: "你越逼近，我越需要先离开一点。",
      cycle: ["A 感到不确定并增加联系", "B 感到压力而后退", "A 更不安并进一步靠近", "B 进一步撤离"],
      strength: "A 会主动维护连接，B 能在压力中暂停升级。", risk: "双方的自我保护方式正好互相触发。",
      whenHealthy: "B 能说明暂停多久，A 能理解暂停不等于离开。", amplificationConditions: commonAmplifiers,
      adviceA: ["把追问原因改为确认何时继续沟通。"], adviceB: ["不要只撤离，要给出明确的返回时间。"],
      sharedScript: "我们先停一下，但不是结束。今晚九点我们继续。",
    },
  },
  {
    id: "HIGH_RESPONSE_BOTH", name: "双高回应需求", category: "similarity", priority: 72, minimumConfidence: 68,
    trigger: { aMin: { response_need: 70 }, bMin: { response_need: 70 } },
    explanation: {
      personAExperience: "联系变化会让我在意关系是否稳定。", personBExperience: "我也会从回复和主动程度判断连接感。",
      cycle: ["联系减少", "一方不安", "另一方察觉后也开始不安", "双方反复确认并更依赖稳定联系"],
      strength: "双方连接感强，通常都愿意主动。", risk: "忙碌期的回复变慢容易被理解为关系变化。",
      whenHealthy: "双方能把日程变化与关系信号分开。", amplificationConditions: ["异地", "一方进入忙碌期", "联系规则不明确"],
      adviceA: ["提前说明低联系时段。"], adviceB: ["不要用即时回复作为唯一的在乎证据。"], sharedScript: "今天我们都忙，回复慢不是关系信号。",
    },
  },
  {
    id: "HIGH_SPACE_BOTH", name: "双高空间需求", category: "similarity", priority: 60, minimumConfidence: 68,
    trigger: { aMin: { space_need: 70 }, bMin: { space_need: 70 } },
    explanation: {
      personAExperience: "我需要保留自己的生活节奏。", personBExperience: "我也不希望亲密等于失去空间。",
      cycle: ["A 忙自己的", "B 也忙自己的", "双方都觉得没有问题", "共同经历逐渐减少"],
      strength: "彼此不容易觉得被控制，也能保留个人生活。", risk: "双方都太能独立，可能没人主动创造连接。",
      whenHealthy: "独立之外仍有稳定、主动的共同时间。", amplificationConditions: ["长期忙碌", "共同项目减少", "只在有事时联系"],
      adviceA: ["主动发起固定连接。"], adviceB: ["把共同时间列入日程。"], sharedScript: "我们都很独立，所以更需要主动留一些只属于我们的时间。",
    },
  },
  {
    id: "HIGH_LOW_SENSITIVITY", name: "高敏感 × 低敏感", category: "difference", priority: 78, minimumConfidence: 70,
    trigger: { aMin: { emotional_sensitivity: 75 }, bMax: { emotional_sensitivity: 40 }, minDifference: { emotional_sensitivity: 30 } },
    explanation: {
      personAExperience: "这么明显，你怎么会看不出来？", personBExperience: "你为什么总能从小事情里读出这么多？",
      cycle: ["A 捕捉到细节变化", "B 认为变化并无特殊含义", "A 感到被忽视", "B 感到被过度解读"],
      strength: "A 能捕捉细节，B 不容易被小变化带走。", risk: "A 觉得 B 不在乎，B 觉得 A 过度解读。",
      whenHealthy: "双方愿意先确认事实，并尊重彼此不同的感知阈值。", amplificationConditions: commonAmplifiers,
      adviceA: ["不要把察觉到变化直接升级为一定有问题。"], adviceB: ["不要否定 A 的感知，主动解释变化是否与关系有关。"], sharedScript: "我知道你注意到了变化，我先告诉你它是不是和我们有关。",
    },
  },
  {
    id: "HIGH_SENSITIVITY_BOTH", name: "双高敏感", category: "similarity", priority: 75, minimumConfidence: 72,
    trigger: { aMin: { emotional_sensitivity: 75 }, bMin: { emotional_sensitivity: 75 } },
    explanation: {
      personAExperience: "我很快就能感觉到你的状态变化。", personBExperience: "你的细微变化也会影响我。",
      cycle: ["A 状态变化", "B 察觉并受到影响", "A 又察觉 B 的变化", "情绪互相放大"],
      strength: "双方容易理解细节，共情能力可能很强。", risk: "双方都容易被语气、表情和沉默带动。",
      whenHealthy: "双方能区分事实、感受与解释。", amplificationConditions: ["睡眠不足", "高压时期", "通过文字沟通"],
      adviceA: ["先说可观察事实。"], adviceB: ["在解释含义前确认对方原意。"], sharedScript: "我们先确认发生了什么，再解释它意味着什么。",
    },
  },
  {
    id: "DIRECT_INDIRECT", name: "高表达 × 低表达", category: "difference", priority: 82, minimumConfidence: 70,
    trigger: { aMin: { expression: 70 }, bMax: { expression: 40 }, minDifference: { expression: 30 } },
    explanation: {
      personAExperience: "有问题为什么不能直接说？", personBExperience: "不是所有感受都能马上说清楚。",
      cycle: ["A 追求明确表达", "B 尚未整理好而沉默", "A 认为 B 在隐瞒", "B 因压力更难表达"],
      strength: "A 推动关系明确，B 会给情绪留消化空间。", risk: "A 觉得 B 隐瞒，B 觉得 A 逼迫。",
      whenHealthy: "A 允许不确定答案，B 即使没想清楚也先表达状态。", amplificationConditions: commonAmplifiers,
      adviceA: ["允许对方暂时只有状态、没有结论。"], adviceB: ["先说明需要多久整理，而不是完全沉默。"], sharedScript: "我现在还没想明白，但我不是不想和你谈。",
    },
  },
  {
    id: "LOW_EXPRESSION_BOTH", name: "双低表达", category: "similarity", priority: 77, minimumConfidence: 68,
    trigger: { aMax: { expression: 45 }, bMax: { expression: 45 } },
    explanation: {
      personAExperience: "有些不舒服，我习惯先放着。", personBExperience: "我也不容易主动把问题说出来。",
      cycle: ["A 不舒服但不说", "B 没有察觉且不满也不说", "双方表面正常", "怨气累积后因小事爆发"],
      strength: "双方通常不会因一时情绪立刻升级冲突。", risk: "很多问题不是解决了，而是没人说。",
      whenHealthy: "双方有固定、低压力的关系复盘。", amplificationConditions: ["长期缺少复盘", "害怕冲突", "误以为沉默代表没事"],
      adviceA: ["从小事开始说，不等到积累。"], adviceB: ["定期主动询问未说出口的不适。"], sharedScript: "最近有没有什么小事，其实你一直没说？",
    },
  },
  {
    id: "SOLVE_NOW_PAUSE", name: "立即解决 × 延后处理", category: "difference", priority: 94, minimumConfidence: 72,
    trigger: { aMin: { conflict_urgency: 70 }, bMax: { conflict_urgency: 40 }, minDifference: { conflict_urgency: 30 } },
    explanation: {
      personAExperience: "不解决我根本放不下。", personBExperience: "现在继续只会更糟。",
      cycle: ["A 要求立即解决", "B 需要暂停", "A 把暂停理解为逃避", "B 把继续沟通理解为逼迫"],
      strength: "A 不让问题悬置，B 能避免在情绪高点继续升级。", risk: "处理节奏差异让双方都感到不被理解。",
      whenHealthy: "暂停有明确的结束点，并且双方按时重启。", amplificationConditions: commonAmplifiers,
      adviceA: ["把立即解决改成立即约定重启时间。"], adviceB: ["提出暂停时同时承诺返回。"], sharedScript: "我们不是不谈，是今晚十点继续谈。",
    },
  },
  {
    id: "HIGH_CONFLICT_URGENCY_BOTH", name: "双高冲突紧迫", category: "similarity", priority: 80, minimumConfidence: 70,
    trigger: { aMin: { conflict_urgency: 70 }, bMin: { conflict_urgency: 70 } },
    explanation: {
      personAExperience: "问题出现后，我希望现在就处理。", personBExperience: "我也很难带着未解决的问题离开。",
      cycle: ["双方都要求立即解决", "情绪高点持续沟通", "开始重复或提高音量", "解决问题转为彼此防御"],
      strength: "问题通常不会长期悬着。", risk: "双方在情绪高点都想解决，容易升级。",
      whenHealthy: "双方预先约定并执行暂停阈值。", amplificationConditions: ["深夜沟通", "持续重复观点", "出现人格评价"],
      adviceA: ["识别自己的暂停阈值。"], adviceB: ["同意暂停不代表放弃议题。"], sharedScript: "如果任何一方开始重复、提高音量或攻击人格，我们暂停三十分钟。",
    },
  },
  {
    id: "LOW_CONFLICT_URGENCY_BOTH", name: "双低冲突紧迫", category: "similarity", priority: 62, minimumConfidence: 66,
    trigger: { aMax: { conflict_urgency: 40 }, bMax: { conflict_urgency: 40 } },
    explanation: {
      personAExperience: "现在不谈也没关系，以后再说。", personBExperience: "我也希望等状态合适再处理。",
      cycle: ["问题出现", "双方都选择以后再说", "没人主动回来", "未解决的问题逐渐累积"],
      strength: "双方不容易发生爆炸式争吵。", risk: "暂停很容易变成永久搁置。",
      whenHealthy: "每次暂停都附带具体重启时间。", amplificationConditions: ["生活忙碌", "议题令人不适", "双方都等待对方发起"],
      adviceA: ["暂停后主动登记待处理议题。"], adviceB: ["共同确认重启时间。"], sharedScript: "我们先停，但明晚八点回来把这件事谈完。",
    },
  },
  {
    id: "REPAIR_MISMATCH", name: "高修复 × 低修复", category: "difference", priority: 85, minimumConfidence: 70,
    trigger: { aMin: { repair_orientation: 70 }, bMax: { repair_orientation: 45 }, minDifference: { repair_orientation: 25 } },
    explanation: {
      personAExperience: "有问题就修，我们还能调整。", personBExperience: "发生过的事情不会因为一次沟通就消失。",
      cycle: ["A 快速提出修复", "B 仍在评估损伤", "A 觉得 B 不给机会", "B 觉得 A 在催促翻篇"],
      strength: "A 带来修复动力，B 会认真辨别改变是否真实。", risk: "修复速度被误读为修复意愿。",
      whenHealthy: "A 不催和好，B 明确修复所需条件。", amplificationConditions: commonAmplifiers,
      adviceA: ["关注持续改变，不催促情绪恢复。"], adviceB: ["说清楚重新靠近需要哪些可观察变化。"], sharedScript: "我不是不想修，我需要看到哪些变化以后才能重新靠近。",
    },
  },
  {
    id: "HIGH_REPAIR_BOTH", name: "双高修复", category: "similarity", priority: 73, minimumConfidence: 70,
    trigger: { aMin: { repair_orientation: 70 }, bMin: { repair_orientation: 70 } },
    explanation: {
      personAExperience: "冲突不等于关系结束，我们可以调整。", personBExperience: "我也愿意在问题后重新连接。",
      cycle: ["冲突发生", "双方快速和好", "结构问题未被改变", "同一问题再次出现并再次修复"],
      strength: "双方都没有把冲突自动理解成关系结束，关系韧性强。", risk: "能和好不代表问题已经解决，可能长期容忍同一结构问题。",
      whenHealthy: "每次和好都伴随具体行为调整。", amplificationConditions: ["repeated_pattern_erosion 信号出现", "只道歉不复盘", "用亲密感替代问题解决"],
      adviceA: ["修复后确认具体改变。"], adviceB: ["观察同一模式是否重复。"], sharedScript: "我们能和好是优势，但这次还要确认问题怎样真正改变。",
    },
  },
  {
    id: "WORDS_ACTIONS", name: "安全感来自语言 × 来自行动", category: "difference", priority: 67, minimumConfidence: 65,
    trigger: { aRequiredSignals: ["verbal_reassurance_need"], bRequiredSignals: ["care_action_vs_affection_expression"] },
    explanation: {
      personAExperience: "为什么你从来不说？", personBExperience: "我做这么多，你看不到吗？",
      cycle: ["B 用行动表达在乎", "A 没有听到需要的确认", "A 追问表达", "B 觉得自己的付出被忽视"],
      strength: "双方其实都在表达在乎。", risk: "爱的证据语言不一致。",
      whenHealthy: "双方能识别并翻译彼此的表达方式。", amplificationConditions: ["行动被视为理所当然", "语言表达稀少", "压力期付出减少"],
      adviceA: ["先看见对方已经做出的照顾，再提出语言需要。"], adviceB: ["在行动之外偶尔明确说出在乎。"], sharedScript: "我看见你做的这些事，同时听到你的表达也会让我更安心。",
    },
  },
  {
    id: "RITUAL_MISMATCH", name: "高仪式感 × 低仪式感", category: "difference", priority: 57, minimumConfidence: 65,
    trigger: { aRequiredSignals: ["ritual_need_high"], bRequiredSignals: ["ritual_need_low"] },
    explanation: {
      personAExperience: "这不是礼物，是你有没有把这件事放在心上。", personBExperience: "感情又不是靠节日证明。",
      cycle: ["A 期待被特别记住", "B 认为日常关系已经足够", "仪式缺席", "A 感到不被重视而 B 感到被形式要求"],
      strength: "A 擅长创造共同记忆，B 更重视不依赖形式的日常稳定。", risk: "双方对被记住的意义不同。",
      whenHealthy: "双方定义可持续的最低仪式标准。", amplificationConditions: ["纪念日临近", "对比其他伴侣", "期待从未说清"],
      adviceA: ["表达仪式背后的意义和最低期待。"], adviceB: ["不要把仪式需要简单理解为物质要求。"], sharedScript: "我们一起定义哪些日子、用什么方式被记住就足够。",
    },
  },
  {
    id: "PRIVACY_TRANSPARENCY", name: "高隐私 × 高透明", category: "difference", priority: 74, minimumConfidence: 68,
    trigger: { aRequiredSignals: ["privacy_boundary_high"], bAnySignals: ["transparency_need_high", "social_transparency_need_high"] },
    explanation: {
      personAExperience: "有隐私不代表我有秘密。", personBExperience: "主动分享才让我觉得自己真正进入你的生活。",
      cycle: ["B 请求更多分享", "A 感到边界受压", "A 减少披露", "B 更怀疑存在隐藏"],
      strength: "A 能维护个人边界，B 能推动共同生活的开放度。", risk: "透明被理解成监控，隐私被理解成隐藏。",
      whenHealthy: "双方明确区分隐私、秘密、报备与监控。", amplificationConditions: ["过去有隐瞒经历", "社交边界不清", "异地"],
      adviceA: ["主动说明哪些信息属于个人空间。"], adviceB: ["提出安全感需要时避免要求无限检查。"], sharedScript: "我们可以约定什么属于正常分享，什么属于个人空间。",
    },
  },
  {
    id: "JEALOUS_BUT_TRUSTING", name: "高嫉妒 × 高信任", category: "system", priority: 54, minimumConfidence: 65,
    trigger: { aRequiredSignals: ["jealousy_emotional_reaction", "trust_indicators_high"] },
    explanation: {
      personAExperience: "我会吃醋，但这不等于我认定你会背叛。", personBExperience: "我希望理解你的情绪，而不是被情绪直接限制。",
      cycle: ["嫉妒情绪出现", "情绪被误解成不信任", "双方开始辩护", "原本可被接住的感受变成边界冲突"],
      strength: "情绪敏感与基本信任可以同时存在。", risk: "把一时情绪直接变成对伴侣的限制。",
      whenHealthy: "允许嫉妒被表达，但行为边界仍由双方协商。", amplificationConditions: ["社交情境模糊", "过去关系受伤", "缺少安抚"],
      adviceA: ["描述情绪和需要，不把情绪变成命令。"], adviceB: ["先回应感受，再讨论合理边界。"], sharedScript: "我现在会吃醋，但我想要的是安抚，不是限制你。",
    },
  },
  {
    id: "PRIORITY_EXPECTATION_GAP", name: "关系优先级期待差异", category: "difference", priority: 76, minimumConfidence: 66,
    trigger: { aRequiredSignals: ["relationship_priority_expectation_high"], bRequiredSignals: ["relationship_priority_expectation_low"] },
    explanation: {
      personAExperience: "在一起以后，你的安排应该自然把我放得更前。", personBExperience: "恋爱不应该让朋友、工作和原本生活全部改变。",
      cycle: ["A 期待被优先安排", "B 维持原有生活结构", "A 看成不够重视", "B 看成要求太多"],
      strength: "A 重视共同体，B 能维护多元且完整的生活。", risk: "双方用排序证明爱，却没有定义具体情境。",
      whenHealthy: "不争抽象的第一，而是约定必须优先的情境。", amplificationConditions: ["时间资源紧张", "临时计划冲突", "重要节点被忽略"],
      adviceA: ["把优先期待转成具体情境。"], adviceB: ["主动说明哪些时刻会把关系放在前面。"], sharedScript: "我们不争谁永远第一，先约定哪些情境彼此必须优先。",
    },
  },
  {
    id: "INTEGRATION_AUTONOMY", name: "共同生活融合 × 高独立", category: "difference", priority: 71, minimumConfidence: 66,
    trigger: { aRequiredSignals: ["life_integration_preference_high"], bAnySignals: ["space_need_high", "life_integration_preference_low"] },
    explanation: {
      personAExperience: "长期在一起就应该越来越共享生活。", personBExperience: "长期承诺不等于失去自己的生活结构。",
      cycle: ["A 推动更多生活融合", "B 保护个人结构", "A 感到被排除", "B 感到个人完整性受威胁"],
      strength: "A 能建构共同体，B 能保护个人完整性。", risk: "双方把融合度误当成承诺度。",
      whenHealthy: "共同区和个人区都被明确保留。", amplificationConditions: ["同居前后", "重大生活迁移", "时间与社交全面绑定"],
      adviceA: ["说明最重要的共同生活部分。"], adviceB: ["明确愿意共享的范围，不只强调边界。"], sharedScript: "我们一起划出共同区，也保留各自不会被侵入的个人区。",
    },
  },
  {
    id: "FUTURE_CLARITY_GAP", name: "未来明确需求差异", category: "difference", priority: 84, minimumConfidence: 68,
    trigger: { aAnySignals: ["future_clarity_need_high", "long_horizon_alignment_need_high"], bRequiredSignals: ["future_clarity_need_low"] },
    explanation: {
      personAExperience: "如果不谈未来，我不知道自己为什么继续投入。", personBExperience: "未来变化太多，现在说也没有意义。",
      cycle: ["A 发起未来讨论", "B 避免不确定承诺", "A 感到未被纳入未来", "B 感到被要求保证结果"],
      strength: "A 推动方向一致，B 能提醒双方尊重未来的不确定性。", risk: "愿意讨论被误解为必须保证结果。",
      whenHealthy: "双方区分讨论意愿和结果保证。", amplificationConditions: ["关系进入重大节点", "异地或迁移", "外部时间压力"],
      adviceA: ["说明自己要的是讨论还是保证。"], adviceB: ["无法保证结果时仍可表达思考与意愿。"], sharedScript: "我不要求你保证结果，但我需要知道自己被纳入你的未来思考。",
    },
  },
  {
    id: "FINANCIAL_FAIRNESS_GAP", name: "金钱公平模型冲突", category: "difference", priority: 69, minimumConfidence: 65,
    trigger: { aRequiredSignals: ["financial_fairness_model_gap"], bRequiredSignals: ["financial_fairness_model_gap"] },
    explanation: {
      personAExperience: "平均分担才最清楚、最公平。", personBExperience: "按能力或收入承担才是真正公平。",
      cycle: ["双方按各自模型计算付出", "结果不符合另一方的公平感", "双方都认为自己在追求公平", "数字争议升级为价值判断"],
      strength: "双方都重视关系中的公平。", risk: "公平定义不同，却直接争论具体数字。",
      whenHealthy: "先共同定义公平，再决定分担方案。", amplificationConditions: ["收入差距扩大", "共同支出增加", "财务信息不透明"],
      adviceA: ["解释模型背后的安全感需要。"], adviceB: ["用共同原则检验方案，而非只争数字。"], sharedScript: "我们先谈公平对各自意味着什么，再谈具体数字。",
    },
  },
  {
    id: "HOUSEHOLD_FAIRNESS_GAP", name: "家务公平模型冲突", category: "difference", priority: 70, minimumConfidence: 65,
    trigger: { aRequiredSignals: ["household_fairness_model_gap"], bRequiredSignals: ["household_fairness_model_gap"] },
    explanation: {
      personAExperience: "我明明已经做了很多。", personBExperience: "可为什么所有事情还是我记着？",
      cycle: ["A 按完成数量计算贡献", "B 同时承担规划和提醒", "A 觉得付出未被看见", "B 觉得总负担未被理解"],
      strength: "双方都希望共同生活可持续。", risk: "双方争的不是谁做得多，而是谁负责让整个家正常运转。",
      whenHealthy: "执行劳动与心智负担都被看见和分配。", amplificationConditions: ["家务量增加", "mental_load_awareness 差异", "照护任务出现"],
      adviceA: ["把规划、提醒也纳入工作量。"], adviceB: ["把隐形任务具体化而非笼统指责。"], sharedScript: "我们把执行和负责记住的工作都列出来，再一起分配。",
    },
  },
  {
    id: "EMOTIONAL_LABOR_IMBALANCE", name: "情绪劳动失衡", category: "system", priority: 88, minimumConfidence: 70,
    trigger: { aAnySignals: ["household_emotional_load_high", "support_burden_high"], bRequiredSignals: ["emotional_output_high"] },
    explanation: {
      personAExperience: "为什么每次你的情绪最后都变成我要处理？", personBExperience: "我只是希望最亲近的人支持我。",
      cycle: ["B 输出情绪", "A 持续安抚或解决", "支持逐渐变成责任", "A 耗竭后撤离，B 更缺少支持"],
      strength: "双方有寻求和提供支持的连接基础。", risk: "支持慢慢变成单方必须承担的责任。",
      whenHealthy: "求助者说明需要倾听还是解决，支持者可以表达容量。", amplificationConditions: ["长期压力", "外部支持不足", "照护者从不拒绝"],
      adviceA: ["允许自己说明当前没有足够精力接住。"], adviceB: ["先询问对方容量并说明只需倾听还是需要方案。"], sharedScript: "我只是想被听见，不需要你解决；你现在有精力听吗？",
    },
  },
  {
    id: "REPAIR_LABOR_GAP", name: "主动修复失衡", category: "system", priority: 91, minimumConfidence: 70,
    trigger: { aAnySignals: ["repair_labor_imbalance", "relationship_maintenance_imbalance"] },
    explanation: {
      personAExperience: "所有关系工作好像都是我在做。", personBExperience: "我愿意配合，但不一定知道何时或怎样发起。",
      cycle: ["A 先联系并提出问题", "A 再主动和好", "B 配合但不发起", "A 越来越感到修复劳动全由自己承担"],
      strength: "关系中仍有修复发起和配合的基础。", risk: "长期由一方承担发起、跟进与维护会造成耗竭。",
      whenHealthy: "双方区分不主动发起和不参与修复，并重新分配维护责任。", amplificationConditions: ["同一冲突反复", "A 停止发起后关系停摆", "B 只口头配合"],
      adviceA: ["明确指出希望对方主动承担的具体步骤。"], adviceB: ["主动发起一次完整修复，而不只等待安排。"], sharedScript: "下一次请由你发起、跟进，并和我一起确认改变是否发生。",
    },
  },
  {
    id: "OUTDATED_PARTNER_MODEL", name: "老关系中的旧版本理解", category: "system", priority: 65, minimumConfidence: 66,
    trigger: { relationshipTypes: ["long_term"], aRequiredSignals: ["growth_alignment_need_high"], bRequiredSignals: ["partner_change_acceptance_low"] },
    explanation: {
      personAExperience: "我已经变化了，却仍被过去的版本解释。", personBExperience: "你以前不是这样的，我还没有跟上这些变化。",
      cycle: ["A 发生成长或需求变化", "B 用旧经验预测 A", "A 感到未被真正看见", "B 对变化更加防御"],
      strength: "长期共同经历为重新认识提供了丰富基础。", risk: "双方用过去版本解释现在的人。",
      whenHealthy: "双方允许彼此更新，并定期重新认识。", amplificationConditions: ["人生阶段转换", "职业或身份变化", "长期以固定角色分工"],
      adviceA: ["具体说明自己哪些部分已经改变。"], adviceB: ["用好奇替代你以前不是这样的判断。"], sharedScript: "如果我们今天刚认识，你觉得我现在是一个什么样的人？",
    },
  },
  {
    id: "REPAIR_WINDOW_METHOD_FAILURE", name: "修复窗口仍在，但方法失效", category: "system", priority: 98, minimumConfidence: 75,
    trigger: { relationshipStages: ["tense"], aRequiredSignals: ["repair_willingness_remaining", "baseline_respect_remaining", "communication_futility", "pseudo_repair"], bRequiredSignals: ["repair_willingness_remaining", "baseline_respect_remaining"] },
    explanation: {
      personAExperience: "我还想修，但每次谈完都回到原点。", personBExperience: "我也没有放弃，只是同一种沟通已经让我疲惫。",
      cycle: ["双方再次使用熟悉的修复方式", "短暂缓解或表面和好", "核心结构没有改变", "无效感和疲劳进一步增加"],
      strength: "双方仍保有修复意愿和基本尊重。", risk: "继续再谈一次只会增加疲劳。",
      whenHealthy: "改变修复结构，而不是单纯增加修复次数。", amplificationConditions: ["communication_futility 高", "pseudo_repair 高", "同一话术重复使用"],
      adviceA: ["停止重复已证明无效的沟通流程。"], adviceB: ["共同选择新的时间、媒介、步骤或外部支持。"], sharedScript: "不是再认真一点沟通，而是换一种沟通方式。",
    },
  },
] as const;

export const PAIR_PATTERN_BY_ID: Readonly<Record<string, PairPattern>> = Object.freeze(
  Object.fromEntries(PAIR_PATTERNS.map((pattern) => [pattern.id, pattern]))
);
