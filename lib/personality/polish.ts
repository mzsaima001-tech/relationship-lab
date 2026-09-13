// =====================================================
// 人格测试 V3 — 报告润色(复用 v1 单测/双测的 runPolishItems 引擎)
//
// 输入：模板版 PersonalityFreeReport / PersonalityFullReport
// 输出：表达层润色后的报告
// 失败/超时/未开启 → applied=false，原样返回模板版，绝不阻塞出报告
//
// 护栏（算法结论一律不动）：
//   - 卡片 id / name / line / phase / vec / poles
//   - 分数(score) / 分档(band) / similarity
//   - 报告版本号 / 生成时间
//   - V1 兼容字段(secondary / hidden)里直接复用了卡文案，本身不动
// =====================================================

import type { PersonalityFreeReport, PersonalityFullReport } from "./types";
import { runPolishItems, type PolishItem } from "@/lib/reports/narrative";
import type { FullReportWithV1Compat } from "./report-builder";

const PERSONALITY_POLISH_PROMPT_VERSION = "v3.1-moonphase-polish";

/**
 * 月相卡风格的润色 prompt：
 *   - 保留「月相」「判词」「六维」这一套词汇体系
 *   - 不引入星座 / 命理 / 玄学话语
 *   - 强调「不评判、具体场景、可被感知」的口吻
 */
const PERSONALITY_POLISH_SYSTEM_PROMPT = `你是一位擅长中文情感表达的报告撰稿人，专做「人格月相卡」类型的测评报告。用户会给你一组人格测评报告的文案片段，每段带唯一 path。

任务：在不改变任何事实、结论、分数方向、卡片名（"朔 / 蛾眉 / 望 / 盈凸 / 亏凸 / 下弦 / 上弦"等月相词）、维度名（"表达力 / 应对力 / 认可需求 / 方向感 / 自主性 / 情绪觉知"）的前提下，把每段文字改写得更温柔、更具体、更有画面感和共鸣感。

硬性要求：
1. 只改写表达方式。不得新增事实、不得删除信息、不得改变判断方向——例如原句说"偏高"，绝不能改成"偏低"；原句说"需要留意"，不能改成"没问题"。
2. 语言：中文，第二人称"你"。口吻克制、平实、有洞察，像一位懂你的朋友在安静地说话。
3. 禁止使用"亲爱的""宝贝""小可爱"等亲昵称呼；禁止堆砌感叹号；禁止鸡汤腔、说教、浮夸排比。
4. 禁止引入星座 / 命理 / 八字 / 玄学话语；不要用"命中注定""上辈子""业力"等词。
5. 每一段都必须重新遣词造句，不允许原样照抄（除非原文极短）。改写时保持原文的并列结构，不要重复或漏掉任何一个并列项。
6. 长度允许适度扩展（±30% 以内）。可以加入：
   - 具体的心理场景描写（"当对方说这句话时，你的反应是……"）
   - 内心的微动作（"你下意识地想……""你心里咯噔一下"）
   - 比喻或画面（"这种感觉像是……""你像是一个……"）
   但不要喧宾夺主、不要堆砌形容词。
7. 原句中出现的数字、比例、月相名、维度名（六维名 / 英文字母代号 G/X/I/F/S/E）、原型卡名（"知止有度 / 观澜见来 / 破晓即行 / ……）必须原样保留——这些是算法结论的载体。
8. 只输出严格的 JSON，格式为 {"items": {"<path>": "<改写后的文字>"}}，必须包含输入里的全部 path，不要输出任何解释文字。`;

/**
 * 免费版可润色字段：
 *   - narrative：综合叙事
 *   - topDimensions[].summary：两个最高维的简短解读（V1 兼容字段）
 *   - coreStrength.description：一项核心优势的描述
 *   - dimension_summary[].note：六个维度的解读
 *
 * 不润色：main_card.* / top3[] / score / band / similarity / generated_at / report_version /
 *        primaryTagline（直接复用 main_card.line，是算法结论载体）。
 */
function collectFreePolishItems(report: PersonalityFreeReport): PolishItem[] {
  const items: PolishItem[] = [];
  const push = (path: string, text?: string) => {
    const t = (text ?? "").trim();
    if (t) items.push({ path, text: t });
  };

  push("narrative", report.narrative);

  report.topDimensions?.forEach((d, i) => {
    push(`topDimensions.${i}.summary`, d.summary);
  });

  if (report.coreStrength?.description) {
    push("coreStrength.description", report.coreStrength.description);
  }

  // 六维解读（每个维度的 note）
  for (const dim of Object.keys(report.dimension_summary)) {
    const note = report.dimension_summary[dim as keyof typeof report.dimension_summary]?.note;
    push(`dimension_summary.${dim}.note`, note);
  }

  return items;
}

/**
 * 完整版可润色字段：免费版全部 + 16 个 section 的表达层。
 * 不润色：与免费版相同的护栏字段 + secondary/hidden 卡片本体（已是原始卡数据）。
 */
function collectFullPolishItems(report: FullReportWithV1Compat): PolishItem[] {
  // 先收集免费版的（narrative / topDimensions / coreStrength / dimension_summary）
  const items: PolishItem[] = collectFreePolishItems(report as unknown as PersonalityFreeReport);

  const push = (path: string, text?: string) => {
    const t = (text ?? "").trim();
    if (t) items.push({ path, text: t });
  };

  // 顶部 summary（full 报告自己的叙事，可能是 narrative 的别名）
  push("summary", report.summary);

  // 表里不一
  push("surfaceVsReal.surface", report.surfaceVsReal?.surface);
  push("surfaceVsReal.real", report.surfaceVsReal?.real);

  // 性格矛盾（数组）
  report.contradictions?.forEach((t, i) => push(`contradictions.${i}`, t));

  // 优势 / 盲区
  report.strengths?.forEach((s, i) => push(`strengths.${i}.description`, s.description));
  report.blindSpots?.forEach((b, i) => push(`blindSpots.${i}.description`, b.description));

  // 情绪触发
  const tr = report.triggers;
  if (tr) {
    push("triggers.whatIrritates", tr.whatIrritates);
    push("triggers.whatDisappoints", tr.whatDisappoints);
    push("triggers.whatLosesPatience", tr.whatLosesPatience);
    push("triggers.howYouHandle", tr.howYouHandle);
  }

  // 压力下的你
  const st = report.stress;
  if (st) {
    push("stress.mild", st.mild);
    push("stress.moderate", st.moderate);
    push("stress.high", st.high);
  }

  // 人际关系模式
  const rel = report.relationships;
  if (rel) {
    push("relationships.makingFriends", rel.makingFriends);
    push("relationships.buildingTrust", rel.buildingTrust);
    push("relationships.handlingConflict", rel.handlingConflict);
    push("relationships.endingRelationships", rel.endingRelationships);
  }

  // 亲密关系模式
  const im = report.intimacy;
  if (im) {
    push("intimacy.attractedTo", im.attractedTo);
    push("intimacy.expressingLove", im.expressingLove);
    push("intimacy.needsInLove", im.needsInLove);
    push("intimacy.commonConflicts", im.commonConflicts);
  }

  // 事业人格
  const cr = report.career;
  if (cr) {
    push("career.suitable", cr.suitable);
    push("career.unsuitable", cr.unsuitable);
    push("career.workStyle", cr.workStyle);
    push("career.decisionStyle", cr.decisionStyle);
    push("career.executionStyle", cr.executionStyle);
  }

  // 领导风格 / 金钱与风险
  push("leadership", report.leadership);
  push("moneyAndRisk", report.moneyAndRisk);

  // 成长建议（数组）
  report.growth?.forEach((t, i) => push(`growth.${i}`, t));

  return items;
}

export interface PersonalityPolishResult {
  report: PersonalityFreeReport | FullReportWithV1Compat;
  applied: boolean;
  model?: string;
  error?: string;
}

/** 免费版报告润色 */
export async function polishFreeReportWithLLM(
  report: PersonalityFreeReport
): Promise<PersonalityPolishResult> {
  const items = collectFreePolishItems(report);
  const r = await runPolishItems(report, items, PERSONALITY_POLISH_SYSTEM_PROMPT);
  return { report, applied: r.applied, model: r.model, error: r.error };
}

/** 完整版报告润色 */
export async function polishFullReportWithLLM(
  report: FullReportWithV1Compat
): Promise<PersonalityPolishResult> {
  const items = collectFullPolishItems(report);
  const r = await runPolishItems(report, items, PERSONALITY_POLISH_SYSTEM_PROMPT);
  return { report, applied: r.applied, model: r.model, error: r.error };
}

export { PERSONALITY_POLISH_PROMPT_VERSION };
