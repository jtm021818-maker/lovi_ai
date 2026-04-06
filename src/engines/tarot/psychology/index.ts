/**
 * 🧠 psychology/ barrel exports
 */

export { generateColdReading, composeColdReadingMessage } from './barnum-generator';
export type { ColdReadingOutput } from './barnum-generator';

export {
  detectEmotionCategory,
  getEmpathyPhrase,
  getGenZExpression,
  buildEmpathyResponse,
} from './empathy-library';
export type { EmpathyLevel, EmotionCategory } from './empathy-library';

export { generateMirror, generateMirrorByType, decideMirrorType } from './mirroring-engine';
export type { MirrorType, MirrorInput, MirrorOutput } from './mirroring-engine';

export {
  generateReframe,
  getCardReframe,
  getReversedReframe,
  NEGATIVE_CARD_REFRAMES,
} from './reframing-engine';
export type { ReframeType, SFBTType, ReframeOutput } from './reframing-engine';

export {
  getArchetypeInsight,
  extractArchetypeInsights,
  getProjectionQuestion,
  getCardProjectionQuestion,
} from './archetype-mapper';
export type { ArchetypeInsight } from './archetype-mapper';
