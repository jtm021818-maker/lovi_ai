/**
 * 🔮 consultation/ barrel exports
 */

export { TurnOrchestrator } from './turn-orchestrator';
export type {
  ConsultationPhase,
  ColdReadingData,
  TurnOrchestratorConfig,
  TurnContext,
  TurnStrategy,
  TurnResponse,
  SessionSummary,
  SessionMood,
  PowerDynamic,
  AttachmentHint,
} from './turn-orchestrator';

export {
  generateGrounding,
  getNumberEnergyResponse,
  getEmojiEnergyResponse,
  getMoodChoiceResponse,
} from './grounding';
export type { GroundingConfig, GroundingResult, OpenerMood, IcebreakerType } from './grounding';

export {
  detectScenario,
  getIntake1Question,
  buildEmotionFirstResponse,
  buildSituationZoomResponse,
  buildIntuitionHookResponse,
  getEmotionLayeringQuestion,
  getFeelingThermometer,
  getSomaticCheck,
  getRelationDynamicQuestion,
  getRepetitionPatternCheck,
  getTemperatureResponse,
} from './intake';

export {
  generateClosingRitual,
  composeClosingMessage,
  buildClosingConfigFromSummary,
} from './closing-ritual';
export type { ClosingConfig, ClosingResult } from './closing-ritual';
