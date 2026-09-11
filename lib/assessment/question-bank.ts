import { Question } from "./types";
import { CORE_QUESTIONS } from "./bank/core";
import { FOLLOWUP_QUESTIONS } from "./bank/followup";
import {
  CONSISTENCY_QUESTIONS,
  SOCIAL_DESIRABILITY_QUESTIONS,
  CONSISTENCY_PAIRS,
} from "./bank/consistency";
import {
  ALL_SCENARIO_QUESTIONS,
  AMBIGUOUS_QUESTIONS,
  NEW_RELATIONSHIP_QUESTIONS,
  STABLE_QUESTIONS,
  LDR_QUESTIONS,
  MARRIED_QUESTIONS,
  TENSE_QUESTIONS,
  FRIEND_QUESTIONS,
  LIFE_STAGE_QUESTIONS,
} from "./bank/scenarios";

// 兼容旧调用命名，同时统一切换到 V2.0 资产。
export const coreQuestions = CORE_QUESTIONS;
export const followupQuestions = FOLLOWUP_QUESTIONS;
export const consistencyQuestions = CONSISTENCY_QUESTIONS;
export const socialDesirabilityQuestions = SOCIAL_DESIRABILITY_QUESTIONS;
export const relationshipQuestions = ALL_SCENARIO_QUESTIONS.filter(
  question => question.phase === "relationship"
);
export const lifeStageQuestions = LIFE_STAGE_QUESTIONS;

export {
  CORE_QUESTIONS,
  FOLLOWUP_QUESTIONS,
  CONSISTENCY_QUESTIONS,
  SOCIAL_DESIRABILITY_QUESTIONS,
  CONSISTENCY_PAIRS,
  ALL_SCENARIO_QUESTIONS,
  AMBIGUOUS_QUESTIONS,
  NEW_RELATIONSHIP_QUESTIONS,
  STABLE_QUESTIONS,
  LDR_QUESTIONS,
  MARRIED_QUESTIONS,
  TENSE_QUESTIONS,
  FRIEND_QUESTIONS,
  LIFE_STAGE_QUESTIONS,
};

export const allQuestions: Question[] = [
  ...CORE_QUESTIONS,
  ...ALL_SCENARIO_QUESTIONS,
  ...FOLLOWUP_QUESTIONS,
  ...CONSISTENCY_QUESTIONS,
  ...SOCIAL_DESIRABILITY_QUESTIONS,
];

export function getQuestionById(id: string): Question | undefined {
  return allQuestions.find(question => question.id === id);
}
