/**
 * 구독 플랜 상수 (클라이언트 + 서버 공용)
 * 서버 전용 로직은 subscription.ts에 분리
 */

export type SubscriptionTier = 'free' | 'premium';

export type PremiumFeature =
  | 'tts'
  | 'xray_unlimited'
  | 'xray_simulate'
  | 'insights_full'
  | 'all_strategies'
  | 'unlimited_chat'
  | 'full_history';

export const PREMIUM_FEATURES: PremiumFeature[] = [
  'tts', 'xray_unlimited', 'xray_simulate',
  'insights_full', 'all_strategies', 'unlimited_chat', 'full_history',
];

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    nameKo: '무료',
    price: 0,
    dailyChatLimit: 5,
    dailyXrayLimit: 1,
    features: [
      '일일 상담 5회',
      'XRay 분석 1회/일',
      '기본 인사이트 (감정온도)',
      '기본 상담 전략',
    ],
  },
  premium: {
    name: 'Premium',
    nameKo: '프리미엄',
    priceMonthly: 9900,
    priceYearly: 99000,
    dailyChatLimit: Infinity,
    dailyXrayLimit: Infinity,
    features: [
      '무제한 상담',
      'AI 음성 (루나 보이스)',
      'XRay 분석 무제한',
      'XRay 시뮬레이션',
      '전체 인사이트',
      '전체 상담 전략 (CBT, ACT, MI)',
      '전체 세션 히스토리',
    ],
  },
} as const;

export const FREE_DAILY_XRAY_LIMIT = 1;
