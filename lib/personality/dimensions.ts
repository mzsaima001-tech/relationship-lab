// 6 维度定义 + 中文 / 两端描述 re-export（实际定义见 types.ts）
export {
  PERSONALITY_DIMENSIONS,
  PERSONALITY_DIMENSION_META,
  type PersonalityDimension,
  type PersonalityBand,
  PERSONALITY_BAND_LABELS_CN,
} from "./types";

// 旧名兼容层（保留这些 alias，让 cards/scoring/match/questions.ts 不用改 import）
export { PERSONALITY_DIMENSIONS as DIMENSIONS } from "./types";
export type { PersonalityDimension as Dimension } from "./types";
