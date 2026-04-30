/**
 * X-Ray v2 타입 시스템
 * Plan: docs/xray-v2-pro-plan.md §4.2
 *
 * Gemini Vision 응답 → XRayResultV2 (단일 SoT)
 * DB jsonb result 컬럼에 그대로 저장.
 */

export type Sender = 'me' | 'other';

export type RiskLevel = 'safe' | 'caution' | 'conflict' | 'cold';

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

export type RelationshipStage =
  | 'early_dating'
  | 'committed'
  | 'crisis'
  | 'recovery'
  | 'postbreakup';

export type ReplyTone = 'gentle' | 'direct' | 'humor' | 'withdrawn';

/** Gemini 0-1000 정규화 좌표 */
export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface XRayMessageV2 {
  bbox: BoundingBox;
  sender: Sender;
  text: string;
  timestamp: string | null; // "HH:MM"
  surfaceEmotion: string;
  deepEmotion: string;
  intent: string;
  riskLevel: RiskLevel;
  intensity: number;     // 0-100
  temperature: number;   // -100 ~ +100
}

export interface AttachmentRead {
  style: AttachmentStyle;
  confidence: number; // 0-100
}

export interface FlagItem {
  severity?: 'low' | 'med' | 'high';
  label: string;
  why: string;
}

export interface ReplyOption {
  tone: ReplyTone;
  text: string;
  expectedReaction: string;
}

export interface XRayResultV2 {
  messages: XRayMessageV2[];
  emotionArc: { msgIndex: number; valence: number }[];
  powerBalance: number;          // -100 ~ +100
  intimacyScore: number;         // 0-100
  responsivenessScore: number;   // 0-100
  attachmentStyle: {
    user: AttachmentRead;
    partner: AttachmentRead;
  };
  relationshipStage: {
    stage: RelationshipStage;
    confidence: number;
  };
  culturalPatterns: string[];    // ["잠수", "읽씹", ...]
  diagnosis: string;
  keyInsight: string;
  redFlags: FlagItem[];
  greenFlags: FlagItem[];
  reconciliationScore: number;   // 0-100
  reconciliationReasoning: string;
  nextStep: string;
  recommendedReplies: ReplyOption[];
}

/** API 응답 wrapper */
export interface XRayAnalyzeResponseV2 {
  id: string;
  result: XRayResultV2;
  modelUsed: string;
  latencyMs: number;
  imageWidth: number;
  imageHeight: number;
}

/** DB row */
export interface XRayAnalysisRow {
  id: string;
  user_id: string;
  created_at: string;
  image_storage_key: string | null;
  image_width: number;
  image_height: number;
  result: XRayResultV2;
  model_used: string;
  latency_ms: number | null;
  schema_version: number;
}

/** 응답 검증 가드 — 필수 필드 누락 시 false */
export function isValidResultV2(x: unknown): x is XRayResultV2 {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (!Array.isArray(r.messages)) return false;
  if (typeof r.diagnosis !== 'string') return false;
  if (typeof r.keyInsight !== 'string') return false;
  if (typeof r.reconciliationScore !== 'number') return false;
  if (typeof r.nextStep !== 'string') return false;
  if (!Array.isArray(r.recommendedReplies)) return false;
  if (!r.attachmentStyle || typeof r.attachmentStyle !== 'object') return false;
  if (!r.relationshipStage || typeof r.relationshipStage !== 'object') return false;
  return true;
}
