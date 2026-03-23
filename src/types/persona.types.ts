/** 페르소나 모드 */
export type PersonaMode = 'counselor' | 'friend' | 'panel';

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
};
