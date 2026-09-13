// Re-export 数据层从 questionsData.ts（types PersonalityQuestion 集中在 types.ts）
export {
  PERSONALITY_PAPERS,
  PERSONALITY_QUESTIONS_1,
  PERSONALITY_QUESTIONS_2,
  PERSONALITY_QUESTIONS_3,
  PERSONALITY_QUESTIONS_4,
  PERSONALITY_QUESTIONS_5,
  PERSONALITY_ALL_QUESTIONS,
  pickPaperId,
  getQuestionsByPaperAndDim,
  findByMotherId,
  type PaperId,
} from "./questionsData";

// 兼容旧命名 PERSONALITY_QUESTIONS_P1 = PERSONALITY_QUESTIONS_1 等
import {
  PERSONALITY_QUESTIONS_1 as _P1,
  PERSONALITY_QUESTIONS_2 as _P2,
  PERSONALITY_QUESTIONS_3 as _P3,
  PERSONALITY_QUESTIONS_4 as _P4,
  PERSONALITY_QUESTIONS_5 as _P5,
  type PaperId as _PaperId,
} from "./questionsData";
export const PERSONALITY_QUESTIONS_P1 = _P1;
export const PERSONALITY_QUESTIONS_P2 = _P2;
export const PERSONALITY_QUESTIONS_P3 = _P3;
export const PERSONALITY_QUESTIONS_P4 = _P4;
export const PERSONALITY_QUESTIONS_P5 = _P5;

export const PERSONALITY_QUESTIONS_PER_DIM_PER_PAPER = 6 as const;
export const PERSONALITY_TOTAL_QUESTIONS_PER_PAPER = 36 as const;

/** 按卷号快速索引 36 道题（API / UI 用） */
export const PERSONALITY_QUESTIONS_BY_PAPER: Record<_PaperId, typeof _P1> = {
  P1: _P1,
  P2: _P2,
  P3: _P3,
  P4: _P4,
  P5: _P5,
};
