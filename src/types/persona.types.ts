/** 페르소나 모드 */
export type PersonaMode = 'luna' | 'counselor' | 'friend' | 'panel' | 'tarot';

/** 3인 전문가 패널 응답 구조 */
export interface PanelResponse {
  counselor: { message: string };
  analyst: { message: string };
  coach: { message: string };
  suggestions?: string[];
}

/** 페르소나별 표시 정보 */
export const PERSONA_INFO: Record<PersonaMode, {
  icon: string;
  label: string;
  description: string;
  headerSubtext: string;
}> = {
  luna: {
    icon: '🦊',
    label: '루나 모드',
    description: '편한 언니처럼 연애 고민 들어줄게',
    headerSubtext: '뭐든 편하게 말해봐 🦊',
  },
  counselor: {
    icon: '👩‍⚕️',
    label: '상담사 모드',
    description: '따뜻한 전문가의 상담을 받아요',
    headerSubtext: '당신의 이야기에 집중하고 있어요',
  },
  friend: {
    icon: '👫',
    label: '친구 모드',
    description: '편한 절친처럼 이야기해봐요',
    headerSubtext: '뭐든 편하게 말해~',
  },
  panel: {
    icon: '🧑‍🔬',
    label: '전문가 패널',
    description: '3명의 전문가가 각자 조언해줘요',
    headerSubtext: '전문가 팀이 함께 고민해요',
  },
  tarot: {
    icon: '🔮',
    label: '타로냥 모드',
    description: '타로카드로 마음을 비춰드려요',
    headerSubtext: '카드가 네 마음을 읽고 있어... 🃏',
  },
};
