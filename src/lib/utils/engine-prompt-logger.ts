/**
 * 🆕 v64: 엔진 프롬프트 디버그 로거
 *
 * 상담 흐름의 각 LLM 호출에 들어가는 실제 프롬프트와 모델을
 * 통일된 형식으로 콘솔에 출력. 비용/디버깅 가시성 강화.
 *
 * 출력 형식:
 *   ╔══ [ENGINE_NAME] turnIdx=N ══════════════════════════════════
 *   ║ MODEL: provider/modelId
 *   ║ SYSTEM PROMPT (1234자):
 *   ║   [전문]
 *   ║ USER MESSAGE (45자):
 *   ║   [전문]
 *   ╚══════════════════════════════════════════════════════════════
 *
 * 환경변수 ENGINE_PROMPT_LOG=0 으로 비활성화 가능.
 */

const ENABLED = process.env.ENGINE_PROMPT_LOG !== '0';

export interface EnginePromptLogInput {
  /** 엔진 이름: 'LEFT_BRAIN' | 'ACE_V5_RIGHT_BRAIN' | 'KBE' | 'DUAL_BRAIN_BRAIN' */
  engine: string;
  /** 턴 인덱스 */
  turnIdx?: number;
  /** 호출 모델 ID (예: gemini-2.5-flash-lite, claude-sonnet-4-5-20250929) */
  model: string;
  /** 프로바이더 (예: gemini, anthropic) */
  provider?: string;
  /** 시스템 프롬프트 전문 */
  systemPrompt: string;
  /** 유저 메시지 또는 입력 텍스트 */
  userMessage?: string;
  /** 추가 컨텍스트 (선택) */
  extra?: Record<string, any>;
}

export function logEnginePrompt(input: EnginePromptLogInput): void {
  if (!ENABLED) return;

  const {
    engine,
    turnIdx,
    model,
    provider,
    systemPrompt,
    userMessage,
    extra,
  } = input;

  const sysLen = systemPrompt?.length ?? 0;
  const userLen = userMessage?.length ?? 0;
  const turnLabel = turnIdx !== undefined ? `turnIdx=${turnIdx}` : '';
  const providerLabel = provider ? `${provider}/` : '';

  const header = `╔══ [${engine}] ${turnLabel} ═════════════════════════════════════════`;
  const footer = `╚══════════════════════════════════════════════════════════════════`;

  console.log(header);
  console.log(`║ MODEL: ${providerLabel}${model}`);
  if (extra && Object.keys(extra).length > 0) {
    console.log(`║ EXTRA: ${JSON.stringify(extra)}`);
  }
  console.log(`║ SYSTEM PROMPT (${sysLen}자):`);
  console.log(systemPrompt);
  if (userMessage !== undefined) {
    console.log(`║ USER MESSAGE (${userLen}자):`);
    console.log(userMessage);
  }
  console.log(footer);
}

export function logEnginePromptResult(input: {
  engine: string;
  turnIdx?: number;
  rawOutput?: string;
  parsedOK?: boolean;
  latencyMs?: number;
  error?: string;
}): void {
  if (!ENABLED) return;

  const { engine, turnIdx, rawOutput, parsedOK, latencyMs, error } = input;
  const turnLabel = turnIdx !== undefined ? `turnIdx=${turnIdx}` : '';

  console.log(`╠══ [${engine}:RESULT] ${turnLabel} ═══`);
  if (latencyMs !== undefined) console.log(`║ LATENCY: ${latencyMs}ms`);
  if (parsedOK !== undefined) console.log(`║ PARSED: ${parsedOK ? 'OK' : 'FAIL'}`);
  if (error) console.log(`║ ERROR: ${error}`);
  if (rawOutput !== undefined) {
    const len = rawOutput.length;
    console.log(`║ RAW OUTPUT (${len}자):`);
    console.log(rawOutput);
  }
  console.log(`╚══════════════════════════════════════════════════════════════════`);
}
