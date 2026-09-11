// =====================================================
// 人格测试报告内容占位类型（待 content/ 目录填充）
// =====================================================

export interface PersonalityFreeReport {
  /** 核心人格一句话 */
  primaryTagline: string;
  /** 六维分数 */
  scores: {
    social: number;
    rationality: number;
    planning: number;
    risk: number;
    dominance: number;
    sensitivity: number;
  };
  /** 两个突出维度（按 |score-50| 降序） */
  topDimensions: Array<{
    key: "social" | "rationality" | "planning" | "risk" | "dominance" | "sensitivity";
    score: number;
    summary: string;
  }>;
  /** 一个核心优势 */
  coreStrength: {
    title: string;
    description: string;
  };
}

export interface PersonalityFullReport extends PersonalityFreeReport {
  /** 模块 01-03：核心人格 / 第二人格 / 隐藏人格 */
  primary: { name: string; description: string };
  secondary: { name: string; description: string };
  hidden: { name: string; description: string };

  /** 模块 04：表面的你 vs 真正的你 */
  surfaceVsReal: {
    surface: string;
    real: string;
  };

  /** 模块 05：性格矛盾（3-5 项） */
  contradictions: string[];

  /** 模块 06：核心优势（≥5 项，每项带解释） */
  strengths: Array<{ title: string; description: string }>;

  /** 模块 07：性格盲区（≥5 项，温和表述） */
  blindSpots: Array<{ title: string; description: string }>;

  /** 模块 08：情绪触发点 */
  triggers: {
    whatIrritates: string;
    whatDisappoints: string;
    whatLosesPatience: string;
    howYouHandle: string;
  };

  /** 模块 09：压力状态下的你 */
  stress: {
    mild: string;
    moderate: string;
    high: string;
  };

  /** 模块 10：人际关系模式 */
  relationships: {
    makingFriends: string;
    buildingTrust: string;
    handlingConflict: string;
    endingRelationships: string;
  };

  /** 模块 11：亲密关系模式 */
  intimacy: {
    attractedTo: string;
    expressingLove: string;
    needsInLove: string;
    commonConflicts: string;
  };

  /** 模块 12：事业人格 */
  career: {
    suitable: string;
    unsuitable: string;
    workStyle: string;
    decisionStyle: string;
    executionStyle: string;
  };

  /** 模块 13：领导风格（基于 dominance 分数动态） */
  leadership: string;

  /** 模块 14：金钱与风险模式（基于 risk/planning/rationality/dominance 组合） */
  moneyAndRisk: string;

  /** 模块 15：成长建议（≥5 条） */
  growth: string[];

  /** 模块 16：完整人格总结（"我的人格说明书"，500-800 字） */
  summary: string;
}