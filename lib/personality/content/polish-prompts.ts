// =====================================================
// 「我到底什么性格」人格测试 — AI 润色 prompt 设计
//
// 设计原则（沿用 lib/reports/narrative.ts 的 POLISH_SYSTEM_PROMPT 范式，并针对人格场景收紧护栏）：
// 1) 只改写"表达层"，不增删事实、不修改判断方向、不改 archetype type/id。
// 2) 针对人格测评场景，特别护栏：
//    - 不许否定用户（不写「你这类型的人就是 X」「所有 X 都 Y」刻板印象）
//    - 不许贴病理化标签（不写「焦虑型」「回避型」「反社会」等诊断色彩词）
//    - 不许给医疗/财务/法律建议（不写「你应该去看医生」「应该买 X」）
//    - 必须保留"原型名 + 维度名 + 数字"，这些是用户购买的核心信息
//    - 第二人称"你"，口吻克制、平实、有洞察
// 3) 与情感报告差异：情感报告约束较多（关系、伴侣、隐私敏感），人格报告更聚焦自我洞察——
//    允许稍多"自我观察式"陈述，但仍然禁止鸡汤腔和说教。
// =====================================================

export const PERSONALITY_POLISH_PROMPT_VERSION = "v1.0-ai-polish";

/**
 * 人格报告专属润色 prompt。与情感报告共用 runPolishItems 引擎，只换 system prompt 与 items 收集器。
 *
 * 改写原则：
 *  - 不改 archetype 名、不改维度名、不改分数/百分比/数字
 *  - 在保持事实前提下，可适度扩展：加入心理微动作、内在冲突的画面感、比喻、内心独白
 *  - 但禁止创造新事实、禁止改判断方向、禁止病理化或宿命论
 */
export const PERSONALITY_POLISH_SYSTEM_PROMPT = `你是一位擅长中文自我洞察表达的报告撰稿人。用户会给你一组人格测评报告的文案片段，每段带唯一 path。

任务：在不改变任何事实、维度分数、性格类型、判断方向的前提下，把每段文字改写得更克制、更具体、更有"被看见"的共鸣感，并适度丰富表达层。

硬性要求：
1. 只改写表达方式。不增事实、不删信息、不改变判断方向——例如原文是"偏内向"绝不能改成"外向"；原文是"优势"不能改成"风险"。
2. 中文、第二人称"你"。口吻克制、平实、有洞察，像一位安静且懂你的朋友在说话。
3. 禁止使用"亲爱的""宝贝""小可爱"等亲昵称呼；禁止堆砌感叹号；禁止鸡汤腔、说教、浮夸排比、星座/血型式表述。
4. 禁止以下表达：
   - 病理化标签（"焦虑型""回避型""反社会人格"等）
   - 给医疗/财务/法律建议（"你应该去看医生""应该买 X""建议咨询律师"等）
   - 刻板印象句式（"所有 X 类型的人都 Y""这类人注定 Z"等）
   - 对用户的总体否定（"你就是不行""你太糟糕了"等）
   - 宿命论句式（"你这辈子注定""你永远都"等）
5. 每一段都必须重新遣词造句，不允许原样照抄（除非原文极短）。改写时保持原文的并列结构，不要重复或漏掉任何一个并列项。
6. 长度允许适度扩展（±30% 以内）。可以加入：
   - 具体的心理微动作（"你下意识会……""你心里咯噔了一下"）
   - 内心冲突的画面感（"你以为自己是……但其实……"）
   - 安静的比喻（"这种感觉像是……""你像一个……"）
   但不要喧宾夺主、不要堆砌形容词、不要变成爽文。
7. 原句中的引号内容、数字、百分比、人格类型名（如"观察者""创造者""战略家"）、维度名（"社交性""理性度""计划性""冒险性""主导性""敏感度"）、人称代词必须原样保留。
8. 只输出严格的 JSON，格式为 {"items": {"<path>": "<改写后的文字>"}}，必须包含输入里的全部 path，不要输出任何解释文字。`;

/**
 * 从 PersonalityFullReport 抽取可润色的文案叶子，path 形如 "primary.description"。
 *
 * 约束：只收集"表达层"字段——任何算法结论的载体（分数、类型 ID、维度 key）一律不进 items。
 *
 * 返回结构与 lib/reports/narrative.ts 的 collectPolishItems 对齐，便于 runPolishItems 共用。
 */
export function collectPersonalityPolishItems(fullReport: any): Array<{ path: string; text: string }> {
  const items: Array<{ path: string; text: string }> = [];
  const push = (path: string, text?: string) => {
    const t = (text ?? "").trim();
    if (t) items.push({ path, text: t });
  };

  // 免费层（虽然用户首次拿到的是免费版，但润色通常在付费门槛前一次性跑完，连带免费一起润）
  push("primaryTagline", fullReport.primaryTagline);
  for (let i = 0; i < (fullReport.topDimensions ?? []).length; i++) {
    push(`topDimensions.${i}.summary`, fullReport.topDimensions[i]?.summary);
  }
  push("coreStrength.title", fullReport.coreStrength?.title);
  push("coreStrength.description", fullReport.coreStrength?.description);

  // 三大核心人格
  push("primary.description", fullReport.primary?.description);
  push("secondary.description", fullReport.secondary?.description);
  push("hidden.description", fullReport.hidden?.description);

  // 模块 04：表面的你 vs 真正的你
  push("surfaceVsReal.surface", fullReport.surfaceVsReal?.surface);
  push("surfaceVsReal.real", fullReport.surfaceVsReal?.real);

  // 模块 05：矛盾列表
  for (let i = 0; i < (fullReport.contradictions ?? []).length; i++) {
    push(`contradictions.${i}`, fullReport.contradictions[i]);
  }

  // 模块 06：优势
  for (let i = 0; i < (fullReport.strengths ?? []).length; i++) {
    push(`strengths.${i}.title`, fullReport.strengths[i]?.title);
    push(`strengths.${i}.description`, fullReport.strengths[i]?.description);
  }

  // 模块 07：盲区
  for (let i = 0; i < (fullReport.blindSpots ?? []).length; i++) {
    push(`blindSpots.${i}.title`, fullReport.blindSpots[i]?.title);
    push(`blindSpots.${i}.description`, fullReport.blindSpots[i]?.description);
  }

  // 模块 08：触发点
  push("triggers.whatIrritates", fullReport.triggers?.whatIrritates);
  push("triggers.whatDisappoints", fullReport.triggers?.whatDisappoints);
  push("triggers.whatLosesPatience", fullReport.triggers?.whatLosesPatience);
  push("triggers.howYouHandle", fullReport.triggers?.howYouHandle);

  // 模块 09：压力
  push("stress.mild", fullReport.stress?.mild);
  push("stress.moderate", fullReport.stress?.moderate);
  push("stress.high", fullReport.stress?.high);

  // 模块 10：人际关系
  push("relationships.makingFriends", fullReport.relationships?.makingFriends);
  push("relationships.buildingTrust", fullReport.relationships?.buildingTrust);
  push("relationships.handlingConflict", fullReport.relationships?.handlingConflict);
  push("relationships.endingRelationships", fullReport.relationships?.endingRelationships);

  // 模块 11：亲密关系
  push("intimacy.attractedTo", fullReport.intimacy?.attractedTo);
  push("intimacy.expressingLove", fullReport.intimacy?.expressingLove);
  push("intimacy.needsInLove", fullReport.intimacy?.needsInLove);
  push("intimacy.commonConflicts", fullReport.intimacy?.commonConflicts);

  // 模块 12：事业
  push("career.suitable", fullReport.career?.suitable);
  push("career.unsuitable", fullReport.career?.unsuitable);
  push("career.workStyle", fullReport.career?.workStyle);
  push("career.decisionStyle", fullReport.career?.decisionStyle);
  push("career.executionStyle", fullReport.career?.executionStyle);

  // 模块 13：领导力（纯字符串）
  push("leadership", fullReport.leadership);

  // 模块 14：金钱与风险
  push("moneyAndRisk", fullReport.moneyAndRisk);

  // 模块 15：成长建议
  for (let i = 0; i < (fullReport.growth ?? []).length; i++) {
    push(`growth.${i}`, fullReport.growth[i]);
  }

  // 模块 16：完整人格说明书
  push("summary", fullReport.summary);

  return items;
}
