/**
 * v110 Prompt Cache Builder — Anthropic Claude `cache_control` 블록 조립.
 *
 * Anthropic Prompt Caching:
 *   - cache 읽기: 기본 입력 × 0.10 (90% 할인)
 *   - 5분 TTL 또는 1시간 TTL ('ephemeral' 타입)
 *   - Sonnet 4.6 최소 캐시 토큰 2,048
 *
 * 우리는 시스템 프롬프트(루나 페르소나) + L3 self_state + L2 persona_facts 를 캐시.
 * 캐시 경계 이후에 L1 episodes / L0 chatHistory / 유저 메시지 를 둠.
 */

export type CacheTTL = '5m' | '1h';

export interface CachedTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral'; ttl?: CacheTTL };
}

export interface CacheBuildInput {
  systemPrompt: string;        // 루나 페르소나 (대형, 1h 캐시)
  selfStateBlock?: string;     // L3 (1h 캐시)
  personaFactsBlock?: string;  // L2 (1h 캐시)
  liveBlock: string;           // L1 + L0 + user_msg (캐시 X)
  cacheTTL?: CacheTTL;
}

export interface CacheBuildResult {
  /** Claude messages API system 파라미터에 그대로 넣을 수 있는 배열 */
  systemBlocks: CachedTextBlock[];
  /** Claude messages API messages 의 마지막 user 메시지 content */
  userContent: CachedTextBlock[];
}

/**
 * 캐시 블록은 system 영역에 넣고 (페르소나 + L3 + L2),
 * 매 턴 변하는 부분(L1 + L0 + user_msg)은 user 메시지로.
 *
 * Anthropic SDK 사용 예:
 *   const resp = await anthropic.messages.create({
 *     model: 'claude-sonnet-4-6',
 *     system: result.systemBlocks,
 *     messages: [...history, { role: 'user', content: result.userContent }],
 *   });
 */
export function buildCachedPrompt(input: CacheBuildInput): CacheBuildResult {
  const ttl: CacheTTL = input.cacheTTL ?? '1h';

  const systemBlocks: CachedTextBlock[] = [];

  systemBlocks.push({
    type: 'text',
    text: input.systemPrompt,
    cache_control: { type: 'ephemeral', ttl },
  });

  if (input.selfStateBlock && input.selfStateBlock.trim()) {
    systemBlocks.push({
      type: 'text',
      text: `\n\n[루나 적응 상태]\n${input.selfStateBlock}`,
      cache_control: { type: 'ephemeral', ttl },
    });
  }

  if (input.personaFactsBlock && input.personaFactsBlock.trim()) {
    systemBlocks.push({
      type: 'text',
      text: `\n\n[너에 대해 기억하고 있는 것]\n${input.personaFactsBlock}`,
      cache_control: { type: 'ephemeral', ttl },
    });
  }

  const userContent: CachedTextBlock[] = [
    { type: 'text', text: input.liveBlock },
  ];

  return { systemBlocks, userContent };
}

/** 토큰 추정 (한국어 평균 1글자 ≈ 1.3 토큰 가정) */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length * 1.3);
}
