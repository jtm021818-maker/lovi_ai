export interface TarotCard {
  id: string;
  name: string;
  nameEn: string;
  arcana: 'major' | 'minor';
  suit?: 'cups' | 'swords' | 'wands' | 'pentacles';
  number: number;
  emoji: string;
  keywords: string[];
  loveUpright: string;
  loveReversed: string;
  advice: string;
}

export const TAROT_CARDS: TarotCard[] = [
  // ============================================
  // MAJOR ARCANA (22장)
  // ============================================
  {
    id: 'major_0',
    name: '바보',
    nameEn: 'The Fool',
    arcana: 'major',
    number: 0,
    emoji: '🃏',
    keywords: ['새로운 시작', '순수함', '모험', '자유'],
    loveUpright:
      '새로운 사랑이 시작될 수 있는 시기야. 두려워하지 말고 마음을 열어봐. 예상치 못한 만남이 기다리고 있을지도 몰라.',
    loveReversed:
      '무모한 결정은 조심해야 해. 감정에 휩쓸려서 중요한 걸 놓치고 있진 않은지... 한 발 물러서서 생각해봐.',
    advice: '냥~ 모험을 두려워하지 마. 카드가 새로운 길을 비추고 있어 🔮',
  },
  {
    id: 'major_1',
    name: '마법사',
    nameEn: 'The Magician',
    arcana: 'major',
    number: 1,
    emoji: '🪄',
    keywords: ['의지력', '실행', '매력', '자신감'],
    loveUpright:
      '네 안에 있는 매력이 빛을 발하는 시기야. 원하는 사람에게 적극적으로 다가가면 좋은 결과가 있을 거야. 지금이 바로 행동할 때야.',
    loveReversed:
      '말과 행동이 다르거나 상대를 조종하려는 마음이 있진 않은지 돌아봐. 진심 없는 관계는 오래 가지 않아.',
    advice: '냥~ 네 안의 힘을 믿어봐. 진심으로 다가가면 마법처럼 이루어질 거야 🔮',
  },
  {
    id: 'major_2',
    name: '여교황',
    nameEn: 'The High Priestess',
    arcana: 'major',
    number: 2,
    emoji: '🌙',
    keywords: ['직관', '신비', '내면의 목소리', '기다림'],
    loveUpright:
      '지금은 드러나지 않은 감정들이 있어. 상대의 속마음을 파악하려면 직관을 믿어봐. 서두르지 말고 자연스럽게 흐르도록 두는 게 좋아.',
    loveReversed:
      '억누른 감정이나 비밀이 관계를 막고 있을 수 있어. 솔직하게 마음을 표현하지 않으면 오해가 쌓일 거야.',
    advice: '냥~ 마음의 소리에 귀 기울여봐. 달빛처럼 은은하게 진실이 드러날 거야 🔮',
  },
  {
    id: 'major_3',
    name: '여황제',
    nameEn: 'The Empress',
    arcana: 'major',
    number: 3,
    emoji: '🌸',
    keywords: ['풍요', '사랑', '여성성', '관계 성장'],
    loveUpright:
      '사랑이 꽃피는 시기야. 관계가 깊어지고 따뜻한 감정이 넘치는 시간이 될 거야. 자신을 사랑하는 만큼 상대도 아껴줘.',
    loveReversed:
      '지나치게 의존하거나 집착하는 경향이 있진 않아? 자기 자신을 먼저 돌봐야 건강한 관계가 만들어져.',
    advice: '냥~ 네 자신을 충분히 사랑해줘. 그게 바로 좋은 관계의 씨앗이야 🔮',
  },
  {
    id: 'major_4',
    name: '황제',
    nameEn: 'The Emperor',
    arcana: 'major',
    number: 4,
    emoji: '👑',
    keywords: ['안정', '책임', '리더십', '신뢰'],
    loveUpright:
      '안정적이고 믿음직한 사랑을 원하는 시기야. 서로에 대한 책임감과 신뢰가 관계의 기반이 될 거야. 든든한 파트너십이 형성될 수 있어.',
    loveReversed:
      '통제하려는 마음이나 고집이 관계를 힘들게 하고 있어. 상대의 자유도 존중해줘야 해.',
    advice: '냥~ 강함은 배려에서 나와. 진짜 든든한 사람이 되어줘 🔮',
  },
  {
    id: 'major_5',
    name: '교황',
    nameEn: 'The Hierophant',
    arcana: 'major',
    number: 5,
    emoji: '⛪',
    keywords: ['전통', '약속', '헌신', '관습'],
    loveUpright:
      '진지하고 헌신적인 관계로 발전할 수 있는 시기야. 결혼이나 공식적인 약속에 대한 이야기가 나올 수도 있어. 가족이나 주변의 인정도 받을 수 있어.',
    loveReversed:
      '기존 관습이나 주변 압박이 관계를 답답하게 만들고 있어. 서로의 진짜 마음에 집중해봐.',
    advice: '냥~ 진심 어린 약속은 영원히 빛나. 가슴으로 느끼는 관계를 만들어가 🔮',
  },
  {
    id: 'major_6',
    name: '연인',
    nameEn: 'The Lovers',
    arcana: 'major',
    number: 6,
    emoji: '💑',
    keywords: ['선택', '사랑', '조화', '결합'],
    loveUpright:
      '운명적인 만남이나 깊은 연결이 이루어지는 시기야. 진정한 사랑의 선택을 해야 할 순간이 올 수 있어. 마음이 통하는 관계가 형성될 거야.',
    loveReversed:
      '갈등이나 잘못된 선택으로 관계가 흔들릴 수 있어. 충동적인 결정보다는 진심에서 우러난 선택을 해.',
    advice: '냥~ 카드가 진심을 선택하라고 말하고 있어. 후회 없는 사랑을 해 🔮',
  },
  {
    id: 'major_7',
    name: '전차',
    nameEn: 'The Chariot',
    arcana: 'major',
    number: 7,
    emoji: '🏆',
    keywords: ['승리', '의지', '극복', '전진'],
    loveUpright:
      '어떤 장애물도 이겨낼 수 있는 강한 의지가 있어. 어려운 관계도 노력으로 극복할 수 있는 시기야. 자신감을 가지고 앞으로 나아가봐.',
    loveReversed:
      '지나친 통제욕이나 감정 억압이 관계를 망치고 있어. 힘으로 모든 걸 해결하려 하지 말고 부드러움도 배워봐.',
    advice: '냥~ 사랑도 전투야. 하지만 가장 중요한 건 내 마음을 이기는 것이야 🔮',
  },
  {
    id: 'major_8',
    name: '힘',
    nameEn: 'Strength',
    arcana: 'major',
    number: 8,
    emoji: '🦁',
    keywords: ['용기', '인내', '내면의 힘', '온화함'],
    loveUpright:
      '상냥하면서도 강한 마음이 관계를 빛나게 해. 인내심을 가지고 상대를 이해하는 노력이 큰 결실을 맺을 거야. 진정한 사랑은 힘이 아닌 온화함으로 이루어져.',
    loveReversed:
      '감정을 억누르거나 자존감이 낮아진 상태야. 나 자신을 먼저 사랑하는 힘이 필요해.',
    advice: '냥~ 진짜 강함은 부드러움이야. 마음으로 다가가봐 🔮',
  },
  {
    id: 'major_9',
    name: '은둔자',
    nameEn: 'The Hermit',
    arcana: 'major',
    number: 9,
    emoji: '🕯️',
    keywords: ['성찰', '고독', '내면 탐구', '지혜'],
    loveUpright:
      '혼자만의 시간이 필요한 시기야. 관계에 대해 깊이 생각해볼 필요가 있어. 내면의 목소리를 들어야 진정한 사랑을 찾을 수 있어.',
    loveReversed:
      '너무 오랫동안 마음을 닫아두고 있어. 고립이 외로움을 만들고 있진 않은지 돌아봐.',
    advice: '냥~ 때로는 혼자 있는 시간이 가장 좋은 답을 줘. 내면의 빛을 따라가봐 🔮',
  },
  {
    id: 'major_10',
    name: '운명의 수레바퀴',
    nameEn: 'Wheel of Fortune',
    arcana: 'major',
    number: 10,
    emoji: '🎡',
    keywords: ['운명', '전환점', '기회', '순환'],
    loveUpright:
      '운명적인 전환점이 다가오고 있어. 새로운 인연이 시작되거나 기존 관계가 새로운 국면을 맞이할 거야. 이 흐름을 잘 타봐.',
    loveReversed:
      '불운이 반복되는 것 같은 느낌이 들지? 패턴을 바꿔야 할 때야. 같은 실수를 반복하지 않도록 해.',
    advice: '냥~ 운명은 변해. 지금 이 순간을 잘 잡아봐 🔮',
  },
  {
    id: 'major_11',
    name: '정의',
    nameEn: 'Justice',
    arcana: 'major',
    number: 11,
    emoji: '⚖️',
    keywords: ['균형', '공정', '진실', '책임'],
    loveUpright:
      '관계에서 공평함과 균형이 중요한 시기야. 솔직한 대화와 서로에 대한 공정한 시각이 관계를 건강하게 만들 거야.',
    loveReversed:
      '불공평한 관계가 계속되고 있어. 한쪽만 희생하거나 불균형이 쌓이면 언젠가 터질 수 있어.',
    advice: '냥~ 사랑도 균형이 필요해. 주는 만큼 받을 수 있어야 해 🔮',
  },
  {
    id: 'major_12',
    name: '매달린 남자',
    nameEn: 'The Hanged Man',
    arcana: 'major',
    number: 12,
    emoji: '🙃',
    keywords: ['대기', '희생', '다른 시각', '내려놓음'],
    loveUpright:
      '지금은 기다려야 할 시기야. 관계에서 한 발 물러서서 다른 각도로 바라보면 새로운 깨달음을 얻을 수 있어. 서두르지 마.',
    loveReversed:
      '희생만 하고 있진 않아? 일방적인 헌신은 관계를 지치게 만들어. 이제는 자신을 위한 선택도 해봐.',
    advice: '냥~ 세상을 거꾸로 보면 보이지 않던 게 보여. 잠시 멈춰봐 🔮',
  },
  {
    id: 'major_13',
    name: '죽음',
    nameEn: 'Death',
    arcana: 'major',
    number: 13,
    emoji: '🌑',
    keywords: ['변화', '끝과 시작', '전환', '탈바꿈'],
    loveUpright:
      '한 챕터가 끝나고 새로운 시작이 다가오고 있어. 낡은 관계 패턴을 내려놓고 변화를 받아들여야 해. 끝이 아니라 새로운 시작이야.',
    loveReversed:
      '변화를 거부하며 낡은 관계에 매달리고 있어. 놓아야 할 것을 붙잡고 있으면 새로운 것이 들어오지 못해.',
    advice: '냥~ 끝은 항상 새로운 시작이야. 두려워하지 말고 변화를 맞이해 🔮',
  },
  {
    id: 'major_14',
    name: '절제',
    nameEn: 'Temperance',
    arcana: 'major',
    number: 14,
    emoji: '🌈',
    keywords: ['균형', '조화', '인내', '치유'],
    loveUpright:
      '관계에 균형과 조화가 찾아오는 시기야. 서로 다른 점을 받아들이고 중간 지점을 찾아가는 과정이 관계를 성숙하게 만들어.',
    loveReversed:
      '극단적인 감정이나 충동적인 행동이 관계를 해치고 있어. 잠시 냉정해질 필요가 있어.',
    advice: '냥~ 사랑은 천천히 익어가는 거야. 서두르지 않아도 괜찮아 🔮',
  },
  {
    id: 'major_15',
    name: '악마',
    nameEn: 'The Devil',
    arcana: 'major',
    number: 15,
    emoji: '⛓️',
    keywords: ['집착', '속박', '욕망', '의존'],
    loveUpright:
      '서로에게 집착하거나 건강하지 않은 의존 관계가 형성되어 있을 수 있어. 유혹과 욕망이 판단력을 흐리게 만들고 있어.',
    loveReversed:
      '속박에서 벗어나려는 용기가 생기고 있어. 독성 관계를 끊고 자유로워질 수 있는 기회야.',
    advice: '냥~ 진짜 사랑은 자유롭게 해줘야 해. 놓아주는 것도 사랑이야 🔮',
  },
  {
    id: 'major_16',
    name: '탑',
    nameEn: 'The Tower',
    arcana: 'major',
    number: 16,
    emoji: '⚡',
    keywords: ['충격', '붕괴', '깨달음', '변혁'],
    loveUpright:
      '갑작스러운 변화나 충격적인 사건이 관계를 흔들 수 있어. 하지만 무너진 후에야 더 단단한 걸 세울 수 있어. 진실이 밝혀지는 시기야.',
    loveReversed:
      '변화를 두려워하며 무너져가는 관계를 붙잡고 있어. 때로는 새로 시작하는 게 최선이야.',
    advice: '냥~ 번개처럼 오는 진실을 피하지 마. 무너진 자리에 더 좋은 게 세워져 🔮',
  },
  {
    id: 'major_17',
    name: '별',
    nameEn: 'The Star',
    arcana: 'major',
    number: 17,
    emoji: '⭐',
    keywords: ['희망', '치유', '영감', '소망'],
    loveUpright:
      '희망과 치유의 에너지가 가득한 시기야. 상처받은 마음이 회복되고 새로운 사랑에 대한 믿음이 생겨날 거야. 좋은 인연이 다가오고 있어.',
    loveReversed:
      '희망을 잃고 사랑에 대한 믿음이 흔들리고 있어. 아직 포기하지 마. 별은 여전히 빛나고 있어.',
    advice: '냥~ 어둠 속에서도 별은 빛나. 네 사랑도 분명히 빛날 거야 🔮',
  },
  {
    id: 'major_18',
    name: '달',
    nameEn: 'The Moon',
    arcana: 'major',
    number: 18,
    emoji: '🌕',
    keywords: ['환상', '불안', '직관', '무의식'],
    loveUpright:
      '상대의 진심을 파악하기 어려운 시기야. 환상이나 착각이 판단을 흐리게 만들 수 있어. 직관을 믿되 확인하는 과정이 필요해.',
    loveReversed:
      '혼란이 걷히고 진실이 드러나기 시작해. 불안과 공포에서 벗어나 명확하게 볼 수 있게 될 거야.',
    advice: '냥~ 달빛은 아름답지만 착각을 만들어. 눈을 크게 뜨고 진실을 봐 🔮',
  },
  {
    id: 'major_19',
    name: '태양',
    nameEn: 'The Sun',
    arcana: 'major',
    number: 19,
    emoji: '☀️',
    keywords: ['기쁨', '성공', '활력', '행복'],
    loveUpright:
      '밝고 따뜻한 사랑이 가득한 최고의 시기야. 관계에서 순수한 기쁨과 행복이 넘칠 거야. 새로운 사랑의 시작이나 기존 관계의 황금기일 수 있어.',
    loveReversed:
      '겉으로는 밝아 보이지만 내면에 불안이 있어. 진짜 행복한지 자신에게 솔직하게 물어봐.',
    advice: '냥~ 태양처럼 밝게 빛나는 사랑이 네 것이야. 마음껏 기뻐해도 돼 🔮',
  },
  {
    id: 'major_20',
    name: '심판',
    nameEn: 'Judgement',
    arcana: 'major',
    number: 20,
    emoji: '📯',
    keywords: ['재탄생', '용서', '각성', '소명'],
    loveUpright:
      '과거의 상처를 용서하고 새롭게 시작할 수 있는 시기야. 오래된 관계가 다시 살아나거나 과거의 인연이 돌아올 수도 있어.',
    loveReversed:
      '과거에 얽매여 앞으로 나아가지 못하고 있어. 자기 자신을 용서하는 것부터 시작해봐.',
    advice: '냥~ 과거는 과거야. 지금 이 순간 새로 태어날 수 있어 🔮',
  },
  {
    id: 'major_21',
    name: '세계',
    nameEn: 'The World',
    arcana: 'major',
    number: 21,
    emoji: '🌍',
    keywords: ['완성', '성취', '조화', '완전함'],
    loveUpright:
      '사랑의 완성과 성취를 이루는 아름다운 시기야. 오랜 노력 끝에 진정한 사랑을 찾거나 관계가 완성에 가까워지고 있어. 온 세상이 응원하고 있어.',
    loveReversed:
      '끝이 보이지 않는 것 같지? 아직 완성되지 않았을 뿐이야. 마지막 한 걸음이 남아 있어.',
    advice: '냥~ 세상의 모든 사랑이 네 편이야. 완성을 향해 한 걸음 더 내딛어봐 🔮',
  },

  // ============================================
  // MINOR ARCANA - CUPS (컵, 14장)
  // ============================================
  {
    id: 'cups_1',
    name: '컵 에이스',
    nameEn: 'Ace of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 1,
    emoji: '🥂',
    keywords: ['새로운 감정', '사랑의 시작', '순수함', '감성'],
    loveUpright:
      '새로운 사랑이 넘치는 감정과 함께 시작될 거야. 순수하고 진심 어린 감정의 물결이 찾아오고 있어. 마음을 활짝 열어봐.',
    loveReversed:
      '감정을 억누르거나 사랑을 받아들이지 못하고 있어. 마음의 방어막을 조금씩 낮춰봐.',
    advice: '냥~ 넘치는 컵처럼 사랑이 가득 차고 있어. 받아들일 준비를 해 🔮',
  },
  {
    id: 'cups_2',
    name: '컵 2',
    nameEn: 'Two of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 2,
    emoji: '💞',
    keywords: ['파트너십', '상호 감정', '조화', '결합'],
    loveUpright:
      '서로의 감정이 완벽하게 맞아떨어지는 아름다운 순간이야. 진정한 파트너십이 형성되고 있어. 이 사람이 네 인연일 수 있어.',
    loveReversed:
      '감정의 불균형이나 오해가 생기고 있어. 서로의 마음을 다시 확인해봐.',
    advice: '냥~ 두 개의 컵이 만나는 순간은 마법이야. 이 만남을 소중히 여겨 🔮',
  },
  {
    id: 'cups_3',
    name: '컵 3',
    nameEn: 'Three of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 3,
    emoji: '🎉',
    keywords: ['축하', '우정', '기쁨', '공동체'],
    loveUpright:
      '사랑하는 사람과 함께 기쁨을 나누는 행복한 시기야. 주변의 따뜻한 지지 속에서 관계가 빛나고 있어. 함께 축하할 일이 생길 수도 있어.',
    loveReversed:
      '제3자의 개입이나 삼각관계로 복잡해질 수 있어. 관계에 명확한 경계를 그어봐.',
    advice: '냥~ 함께 웃을 수 있는 사람이 진짜 인연이야. 그 기쁨을 나눠봐 🔮',
  },
  {
    id: 'cups_4',
    name: '컵 4',
    nameEn: 'Four of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 4,
    emoji: '😔',
    keywords: ['지루함', '무관심', '성찰', '기회 놓침'],
    loveUpright:
      '관계에 권태나 무감각함이 찾아온 것 같아. 눈앞에 있는 사랑의 기회를 놓치고 있지 않은지 살펴봐. 작은 것에 감사하는 마음이 필요해.',
    loveReversed:
      '마음이 열리기 시작했어. 새로운 감정을 받아들일 준비가 되어가고 있어.',
    advice: '냥~ 무관심하게 지나치는 사이 소중한 것이 사라질 수 있어. 눈을 들어봐 🔮',
  },
  {
    id: 'cups_5',
    name: '컵 5',
    nameEn: 'Five of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 5,
    emoji: '😢',
    keywords: ['상실', '슬픔', '후회', '희망'],
    loveUpright:
      '상실감과 슬픔이 가득한 시기야. 이별이나 실망으로 마음이 아프지? 하지만 뒤에 아직 남아 있는 것들도 있어. 다 잃은 게 아니야.',
    loveReversed:
      '서서히 슬픔에서 회복되고 있어. 과거의 상처를 뒤로하고 앞을 바라볼 준비가 되어가고 있어.',
    advice: '냥~ 흘린 눈물은 새로운 씨앗이야. 뒤에 남아 있는 것들을 봐줘 🔮',
  },
  {
    id: 'cups_6',
    name: '컵 6',
    nameEn: 'Six of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 6,
    emoji: '🌼',
    keywords: ['향수', '순수한 사랑', '과거', '추억'],
    loveUpright:
      '순수했던 사랑의 감정이 되살아나는 시기야. 과거의 인연이 돌아오거나 첫사랑 같은 감정이 느껴질 수 있어. 순수한 마음으로 다가가봐.',
    loveReversed:
      '과거에 너무 집착하고 있어. 현재의 사랑을 놓치고 있진 않은지 생각해봐.',
    advice: '냥~ 순수했던 그 마음을 기억해. 그게 바로 진짜 사랑의 씨앗이야 🔮',
  },
  {
    id: 'cups_7',
    name: '컵 7',
    nameEn: 'Seven of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 7,
    emoji: '🌠',
    keywords: ['환상', '선택', '상상', '꿈'],
    loveUpright:
      '사랑에 대한 환상이 가득한 시기야. 여러 가능성 중에서 무엇이 진짜인지 구별해야 해. 현실과 이상을 잘 분리해서 생각해봐.',
    loveReversed:
      '환상에서 깨어나 현실을 직면하고 있어. 진짜 원하는 게 무엇인지 명확해지기 시작해.',
    advice: '냥~ 꿈꾸는 건 좋지만 눈을 뜨는 것도 필요해. 진짜를 골라봐 🔮',
  },
  {
    id: 'cups_8',
    name: '컵 8',
    nameEn: 'Eight of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 8,
    emoji: '🚶',
    keywords: ['떠남', '더 깊은 것 추구', '포기', '영적 성장'],
    loveUpright:
      '현재의 관계에서 무언가 부족함을 느끼고 있어. 더 깊은 의미를 찾아 떠나야 할 때가 온 것 같아. 용감한 결정이 필요해.',
    loveReversed:
      '떠나야 할 것을 알면서도 머물고 있어. 두려움이 발목을 잡고 있는 건 아닐까?',
    advice: '냥~ 더 좋은 걸 찾아 떠나는 것도 용기야. 카드가 앞길을 비추고 있어 🔮',
  },
  {
    id: 'cups_9',
    name: '컵 9',
    nameEn: 'Nine of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 9,
    emoji: '✨',
    keywords: ['소원 성취', '만족', '행복', '풍요'],
    loveUpright:
      '사랑에 관한 소원이 이루어지는 시기야. 감정적으로 풍요롭고 만족스러운 관계가 펼쳐질 거야. 진심으로 원하는 것이 현실이 될 거야.',
    loveReversed:
      '겉으로는 완벽해 보여도 내면에 공허함이 있어. 진정한 행복이 뭔지 다시 생각해봐.',
    advice: '냥~ 소원이 이루어지고 있어. 감사한 마음으로 받아들여봐 🔮',
  },
  {
    id: 'cups_10',
    name: '컵 10',
    nameEn: 'Ten of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 10,
    emoji: '🌈',
    keywords: ['완전한 행복', '가족', '조화', '축복'],
    loveUpright:
      '완전한 사랑의 행복이 찾아오는 최고의 카드야. 진정한 사랑과 따뜻한 가정의 에너지가 느껴져. 오래오래 행복한 관계가 될 거야.',
    loveReversed:
      '겉보기엔 완벽해도 내부에 균열이 생기고 있어. 소통과 노력으로 다시 회복할 수 있어.',
    advice: '냥~ 무지개 너머 완전한 행복이 기다리고 있어. 조금만 더 가봐 🔮',
  },
  {
    id: 'cups_page',
    name: '컵 페이지',
    nameEn: 'Page of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 11,
    emoji: '💌',
    keywords: ['감수성', '새로운 감정', '창의성', '메시지'],
    loveUpright:
      '새로운 감정이나 고백의 메시지가 올 수 있어. 감수성이 풍부한 사람과의 만남이 기다리고 있을 수도 있어. 마음이 두근거리는 새로운 시작이야.',
    loveReversed:
      '감정적으로 미성숙하거나 실망스러운 메시지를 받을 수 있어. 기대를 조금 낮춰봐.',
    advice: '냥~ 두근거리는 편지가 오고 있어. 마음 준비를 해봐 🔮',
  },
  {
    id: 'cups_knight',
    name: '컵 나이트',
    nameEn: 'Knight of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 12,
    emoji: '🤴',
    keywords: ['낭만', '매력', '구애', '감성'],
    loveUpright:
      '낭만적이고 매력적인 사람이 나타날 수 있어. 꿈꿔왔던 사랑을 현실로 만들 수 있는 시기야. 설레는 감정에 솔직해져봐.',
    loveReversed:
      '달콤한 말에 속지 않도록 조심해. 감정에만 치우쳐 현실을 놓치고 있을 수 있어.',
    advice: '냥~ 백마 탄 왕자가 오고 있어. 하지만 마음의 눈으로 잘 봐야 해 🔮',
  },
  {
    id: 'cups_queen',
    name: '컵 퀸',
    nameEn: 'Queen of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 13,
    emoji: '👸',
    keywords: ['공감', '직관', '감성적 성숙', '돌봄'],
    loveUpright:
      '깊은 공감 능력으로 상대를 이해하고 돌보는 시기야. 감정적으로 성숙한 관계가 형성되고 있어. 상대의 마음을 직관적으로 읽을 수 있어.',
    loveReversed:
      '감정에 지나치게 빠져들거나 의존적이 되고 있어. 자기 자신을 잃지 않도록 주의해.',
    advice: '냥~ 깊은 공감이 진짜 사랑을 만들어. 마음으로 느껴봐 🔮',
  },
  {
    id: 'cups_king',
    name: '컵 킹',
    nameEn: 'King of Cups',
    arcana: 'minor',
    suit: 'cups',
    number: 14,
    emoji: '🧔',
    keywords: ['감정적 성숙', '지혜', '균형', '배려'],
    loveUpright:
      '감정과 이성의 균형을 잘 잡는 성숙한 사랑의 시기야. 상대를 배려하면서도 자신을 잃지 않는 건강한 관계가 형성되고 있어.',
    loveReversed:
      '감정을 지나치게 억누르거나 냉정해지고 있어. 마음의 온기를 유지해봐.',
    advice: '냥~ 지혜롭게 사랑하는 것도 능력이야. 마음의 왕이 되어봐 🔮',
  },

  // ============================================
  // MINOR ARCANA - SWORDS (소드, 14장)
  // ============================================
  {
    id: 'swords_1',
    name: '소드 에이스',
    nameEn: 'Ace of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 1,
    emoji: '⚔️',
    keywords: ['진실', '명확함', '결단', '돌파구'],
    loveUpright:
      '관계에서 명확한 진실이 드러나는 시기야. 솔직한 대화나 결단이 새로운 돌파구를 만들어줄 거야. 진실만이 관계를 살릴 수 있어.',
    loveReversed:
      '오해나 거짓말이 관계를 혼탁하게 만들고 있어. 진실을 말할 용기가 필요한 시기야.',
    advice: '냥~ 칼날처럼 날카로운 진실이 때로는 가장 큰 선물이야 🔮',
  },
  {
    id: 'swords_2',
    name: '소드 2',
    nameEn: 'Two of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 2,
    emoji: '🤔',
    keywords: ['결정 장애', '교착 상태', '균형', '선택'],
    loveUpright:
      '결정을 내리지 못하고 마음의 눈을 가린 채 있어. 선택을 회피하면 상황은 더 나빠질 거야. 용기 내어 결정을 내려봐.',
    loveReversed:
      '눈가리개가 벗겨지고 진실을 볼 수 있게 됐어. 이제 현명한 선택을 할 수 있을 거야.',
    advice: '냥~ 결정하지 않는 것도 결정이야. 마음의 눈을 뜨고 선택해봐 🔮',
  },
  {
    id: 'swords_3',
    name: '소드 3',
    nameEn: 'Three of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 3,
    emoji: '💔',
    keywords: ['이별', '상처', '슬픔', '배신'],
    loveUpright:
      '마음이 깊이 상처받는 시기야. 이별이나 배신의 고통이 있을 수 있어. 이 아픔은 영원하지 않아. 눈물을 흘려도 괜찮아.',
    loveReversed:
      '상처에서 천천히 회복되고 있어. 용서와 치유가 시작되는 시기야.',
    advice: '냥~ 찔린 심장도 시간이 지나면 낫는 거야. 지금 아픔은 곧 지나갈 거야 🔮',
  },
  {
    id: 'swords_4',
    name: '소드 4',
    nameEn: 'Four of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 4,
    emoji: '😴',
    keywords: ['휴식', '회복', '명상', '평화'],
    loveUpright:
      '잠시 관계에서 물러나 쉬어갈 필요가 있어. 싸움이나 갈등 후에 냉각기를 갖는 것이 오히려 관계에 도움이 될 거야.',
    loveReversed:
      '너무 오래 방어적인 상태로 있었어. 이제 다시 세상으로 나올 준비가 됐어.',
    advice: '냥~ 쉬는 것도 전략이야. 충분히 쉬고 나서 더 강하게 돌아와봐 🔮',
  },
  {
    id: 'swords_5',
    name: '소드 5',
    nameEn: 'Five of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 5,
    emoji: '😤',
    keywords: ['갈등', '패배', '자존심', '굴욕'],
    loveUpright:
      '이겨도 잃는 싸움을 하고 있어. 자존심 싸움이 관계를 망치고 있어. 이길 것인가, 관계를 지킬 것인가 선택해야 해.',
    loveReversed:
      '갈등이 수그러들고 화해의 분위기가 찾아오고 있어. 먼저 손을 내밀어봐.',
    advice: '냥~ 싸움에서 이기는 것보다 관계를 지키는 게 더 중요해 🔮',
  },
  {
    id: 'swords_6',
    name: '소드 6',
    nameEn: 'Six of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 6,
    emoji: '⛵',
    keywords: ['이동', '전환', '회복', '앞으로 나아감'],
    loveUpright:
      '힘든 시간을 뒤로하고 더 평화로운 곳으로 나아가고 있어. 관계의 폭풍이 잦아들고 안정을 찾아가고 있어.',
    loveReversed:
      '앞으로 나아가고 싶어도 발이 묶인 것 같아. 무엇이 당신을 붙잡고 있는지 살펴봐.',
    advice: '냥~ 배가 잔잔한 물로 향하고 있어. 조금만 더 버텨봐 🔮',
  },
  {
    id: 'swords_7',
    name: '소드 7',
    nameEn: 'Seven of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 7,
    emoji: '🤫',
    keywords: ['속임수', '회피', '비밀', '영리함'],
    loveUpright:
      '상대방이 솔직하지 않거나 뭔가 숨기는 것이 있을 수 있어. 혹은 네가 스스로 회피하고 있는 것은 없는지 돌아봐.',
    loveReversed:
      '숨겨진 진실이 드러나고 있어. 솔직함으로 돌아가는 것이 최선이야.',
    advice: '냥~ 숨겨진 칼이 있어. 눈을 크게 뜨고 진실을 봐봐 🔮',
  },
  {
    id: 'swords_8',
    name: '소드 8',
    nameEn: 'Eight of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 8,
    emoji: '🙈',
    keywords: ['자기 제한', '두려움', '속박', '혼란'],
    loveUpright:
      '스스로 만든 감옥에 갇혀 있어. 두려움이나 부정적인 생각이 좋은 관계를 막고 있어. 실제로는 더 자유롭게 움직일 수 있어.',
    loveReversed:
      '자신을 가두던 속박에서 벗어나고 있어. 두려움을 이겨내면 더 넓은 세상이 펼쳐져.',
    advice: '냥~ 눈을 가린 건 네 두려움이야. 천천히 눈을 떠봐 🔮',
  },
  {
    id: 'swords_9',
    name: '소드 9',
    nameEn: 'Nine of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 9,
    emoji: '😰',
    keywords: ['불안', '걱정', '악몽', '죄책감'],
    loveUpright:
      '과도한 걱정과 불안이 관계를 힘들게 하고 있어. 상상 속의 최악의 시나리오에 사로잡혀 있지 않아? 지금 이 순간에 집중해봐.',
    loveReversed:
      '불안과 걱정이 서서히 줄어들고 있어. 최악의 상황은 생각만큼 나쁘지 않을 수 있어.',
    advice: '냥~ 새벽 3시의 걱정은 대부분 아침이 되면 사라져. 지금은 쉬어봐 🔮',
  },
  {
    id: 'swords_10',
    name: '소드 10',
    nameEn: 'Ten of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 10,
    emoji: '🌅',
    keywords: ['끝', '패배', '변화', '새로운 새벽'],
    loveUpright:
      '고통스럽지만 완전한 끝이 찾아왔어. 더 이상 나빠질 수 없을 정도의 바닥이야. 하지만 이제 새벽이 밝아오기 시작해.',
    loveReversed:
      '최악의 상황을 견뎌내고 회복이 시작되고 있어. 이제는 위로 올라갈 일만 남았어.',
    advice: '냥~ 가장 어두운 밤이 지나면 가장 밝은 새벽이 와. 조금만 더 버텨봐 🔮',
  },
  {
    id: 'swords_page',
    name: '소드 페이지',
    nameEn: 'Page of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 11,
    emoji: '🕵️',
    keywords: ['호기심', '경계', '솔직함', '새로운 정보'],
    loveUpright:
      '새로운 정보나 소식이 관계에 영향을 줄 수 있어. 경계심을 갖되 너무 의심하지는 마. 솔직한 대화가 문제를 해결해줄 거야.',
    loveReversed:
      '험담이나 오해가 관계를 복잡하게 만들고 있어. 정확한 사실을 확인해봐.',
    advice: '냥~ 진실을 찾는 눈이 중요해. 하지만 지나친 의심은 독이야 🔮',
  },
  {
    id: 'swords_knight',
    name: '소드 나이트',
    nameEn: 'Knight of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 12,
    emoji: '🏇',
    keywords: ['빠른 행동', '직접적', '충동적', '결단'],
    loveUpright:
      '빠르고 직접적으로 움직여야 할 때야. 하고 싶은 말이 있다면 지금 바로 해봐. 망설임 없는 행동이 관계를 바꿀 수 있어.',
    loveReversed:
      '너무 충동적인 행동이 관계를 망치고 있어. 말하기 전에 한 번 더 생각해봐.',
    advice: '냥~ 용감하게 달려가되 방향을 잘 정해. 무작정 달리는 건 위험해 🔮',
  },
  {
    id: 'swords_queen',
    name: '소드 퀸',
    nameEn: 'Queen of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 13,
    emoji: '👩‍⚖️',
    keywords: ['독립심', '명석함', '솔직함', '냉철함'],
    loveUpright:
      '독립적이고 명석한 관점으로 관계를 바라보는 시기야. 감정에 치우치지 않고 냉철하게 판단할 수 있어. 솔직함이 최고의 무기야.',
    loveReversed:
      '너무 냉정하거나 차갑게 굴어 상대를 밀어내고 있어. 마음의 온기도 필요해.',
    advice: '냥~ 지혜롭고 솔직한 여왕처럼. 하지만 마음도 잊지 마 🔮',
  },
  {
    id: 'swords_king',
    name: '소드 킹',
    nameEn: 'King of Swords',
    arcana: 'minor',
    suit: 'swords',
    number: 14,
    emoji: '👨‍⚖️',
    keywords: ['권위', '논리', '공정', '명확함'],
    loveUpright:
      '공정하고 명확한 판단이 관계를 이끌어가는 시기야. 감정보다 이성적인 접근이 문제를 해결해줄 거야. 진실과 공정함을 중시해.',
    loveReversed:
      '지나치게 냉정하고 권위적인 태도가 관계를 소원하게 만들고 있어. 따뜻함도 함께 필요해.',
    advice: '냥~ 공정한 판단이 진정한 힘이야. 하지만 마음도 열어두어야 해 🔮',
  },

  // ============================================
  // MINOR ARCANA - WANDS (완드, 14장)
  // ============================================
  {
    id: 'wands_1',
    name: '완드 에이스',
    nameEn: 'Ace of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 1,
    emoji: '🔥',
    keywords: ['열정', '새로운 시작', '영감', '활력'],
    loveUpright:
      '불타는 열정과 함께 새로운 사랑이 시작되는 시기야. 강렬한 매력과 에너지가 넘쳐흘러. 이 불꽃을 잘 활용해봐.',
    loveReversed:
      '열정이 식어가거나 시작의 에너지가 부족해. 다시 내면의 불씨를 찾아봐.',
    advice: '냥~ 사랑의 불꽃이 타오르고 있어. 꺼지기 전에 잘 지펴줘 🔮',
  },
  {
    id: 'wands_2',
    name: '완드 2',
    nameEn: 'Two of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 2,
    emoji: '🌍',
    keywords: ['계획', '미래 비전', '용기', '탐험'],
    loveUpright:
      '미래를 함께 그려볼 수 있는 시기야. 관계의 가능성을 넓게 바라보고 새로운 계획을 세워봐. 함께 멀리 바라보는 것이 관계를 단단하게 해.',
    loveReversed:
      '미래에 대한 불확실성이나 두려움이 있어. 한 발씩 내딛어가면 돼.',
    advice: '냥~ 세상은 넓어. 함께 더 큰 세상을 향해 걸어가봐 🔮',
  },
  {
    id: 'wands_3',
    name: '완드 3',
    nameEn: 'Three of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 3,
    emoji: '⛵',
    keywords: ['기다림', '진전', '확장', '기회'],
    loveUpright:
      '뿌린 씨앗이 싹을 틔우는 것을 기다리는 시기야. 멀리서 오는 인연이나 기회가 있을 수 있어. 조금만 더 기다려봐.',
    loveReversed:
      '기다림이 지쳐 조급해지고 있어. 인내심이 필요한 시기야.',
    advice: '냥~ 배가 돌아오고 있어. 조금만 더 기다려봐 🔮',
  },
  {
    id: 'wands_4',
    name: '완드 4',
    nameEn: 'Four of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 4,
    emoji: '🎊',
    keywords: ['축하', '안정', '가정', '이정표'],
    loveUpright:
      '관계에서 중요한 이정표를 맞이하는 축하할 시기야. 약혼이나 결혼, 동거 등 새로운 단계로 나아갈 수 있어. 함께하는 기쁨이 넘쳐.',
    loveReversed:
      '축하할 일이 연기되거나 계획이 틀어질 수 있어. 조금 더 준비가 필요해.',
    advice: '냥~ 축제의 문이 열리고 있어. 함께 춤을 춰봐 🔮',
  },
  {
    id: 'wands_5',
    name: '완드 5',
    nameEn: 'Five of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 5,
    emoji: '⚡',
    keywords: ['갈등', '경쟁', '혼란', '도전'],
    loveUpright:
      '관계에서 사소한 다툼이나 갈등이 잦은 시기야. 경쟁심이나 의견 충돌이 있을 수 있어. 이 갈등이 성장의 기회가 될 수 있어.',
    loveReversed:
      '갈등이 해소되고 합의점을 찾아가고 있어. 서로를 이해하는 기회야.',
    advice: '냥~ 작은 싸움이 관계를 더 단단하게 만들 수도 있어. 잘 풀어봐 🔮',
  },
  {
    id: 'wands_6',
    name: '완드 6',
    nameEn: 'Six of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 6,
    emoji: '🏅',
    keywords: ['승리', '성공', '자신감', '인정'],
    loveUpright:
      '사랑에서 승리하는 기분 좋은 시기야. 노력이 결실을 맺고 상대로부터 인정과 사랑을 받을 수 있어. 자신감을 가지고 당당하게 나아가봐.',
    loveReversed:
      '인정받지 못하거나 관계에서 불안감을 느끼고 있어. 자존감을 회복하는 것이 먼저야.',
    advice: '냥~ 승리의 월계관이 네 것이야. 당당하게 받아들여봐 🔮',
  },
  {
    id: 'wands_7',
    name: '완드 7',
    nameEn: 'Seven of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 7,
    emoji: '🛡️',
    keywords: ['방어', '도전', '입장 고수', '경쟁'],
    loveUpright:
      '관계를 지키기 위해 싸워야 할 상황이야. 외부의 압박이나 경쟁자가 있을 수 있어. 자신이 원하는 것을 위해 굳건히 서봐.',
    loveReversed:
      '지나치게 방어적이어서 관계를 막고 있어. 때로는 내려놓는 것도 필요해.',
    advice: '냥~ 네 사랑을 지켜. 포기하기엔 아직 일러 🔮',
  },
  {
    id: 'wands_8',
    name: '완드 8',
    nameEn: 'Eight of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 8,
    emoji: '💨',
    keywords: ['빠른 진전', '소식', '이동', '속도'],
    loveUpright:
      '관계가 빠르게 진전되는 흥미진진한 시기야. 반가운 연락이 오거나 예상치 못한 빠른 발전이 있을 거야. 이 속도를 즐겨봐.',
    loveReversed:
      '너무 빠르게 진행되어 정리가 필요해. 잠시 속도를 늦추고 정리해봐.',
    advice: '냥~ 화살처럼 빠르게 날아오고 있어. 받을 준비를 해봐 🔮',
  },
  {
    id: 'wands_9',
    name: '완드 9',
    nameEn: 'Nine of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 9,
    emoji: '💪',
    keywords: ['회복력', '방어', '인내', '마지막 힘'],
    loveUpright:
      '힘들었지만 여기까지 버텨온 네가 대단해. 마지막 힘을 모아 조금만 더 가봐. 포기하기 직전이 가장 가까운 거야.',
    loveReversed:
      '너무 지쳐서 방어막을 내리고 싶어. 잠시 쉬어가도 괜찮아.',
    advice: '냥~ 가장 힘든 지점이 가장 가까운 지점이야. 조금만 더 🔮',
  },
  {
    id: 'wands_10',
    name: '완드 10',
    nameEn: 'Ten of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 10,
    emoji: '😓',
    keywords: ['과부하', '책임', '부담', '헌신'],
    loveUpright:
      '관계에서 너무 많은 짐을 혼자 지고 있어. 책임감이 지나쳐 관계가 부담스러워지고 있어. 짐을 나눌 필요가 있어.',
    loveReversed:
      '짐을 내려놓을 용기가 생기고 있어. 완벽하지 않아도 괜찮아.',
    advice: '냥~ 혼자 다 지려 하지 마. 나눠 가지면 더 멀리 갈 수 있어 🔮',
  },
  {
    id: 'wands_page',
    name: '완드 페이지',
    nameEn: 'Page of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 11,
    emoji: '🌱',
    keywords: ['열정적 시작', '탐험', '자유로운 영혼', '모험'],
    loveUpright:
      '자유롭고 열정적인 새로운 만남이 있을 수 있어. 불꽃 같은 에너지를 가진 사람이 나타날 거야. 이 신선한 에너지를 즐겨봐.',
    loveReversed:
      '변덕스럽거나 무책임한 행동이 관계를 불안하게 만들고 있어. 좀 더 신중해질 필요가 있어.',
    advice: '냥~ 자유로운 불꽃이 타오르고 있어. 하지만 방향도 중요해 🔮',
  },
  {
    id: 'wands_knight',
    name: '완드 나이트',
    nameEn: 'Knight of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 12,
    emoji: '🏄',
    keywords: ['열정', '모험', '자신감', '충동'],
    loveUpright:
      '뜨거운 열정과 자신감으로 사랑을 쟁취하는 시기야. 대담하게 행동하면 원하는 것을 얻을 수 있어. 이 에너지를 사랑에 쏟아봐.',
    loveReversed:
      '충동적이고 성급한 행동이 관계를 복잡하게 만들고 있어. 불꽃이 너무 세면 타버릴 수 있어.',
    advice: '냥~ 불꽃 같은 사랑이 타오르고 있어. 방향을 잘 잡고 달려봐 🔮',
  },
  {
    id: 'wands_queen',
    name: '완드 퀸',
    nameEn: 'Queen of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 13,
    emoji: '🌻',
    keywords: ['카리스마', '활력', '독립', '열정'],
    loveUpright:
      '강한 카리스마와 열정으로 빛나는 시기야. 자신감 넘치는 모습이 상대를 매료시킬 거야. 네 자신의 빛을 마음껏 발해봐.',
    loveReversed:
      '질투심이나 자기중심적인 행동이 관계를 힘들게 하고 있어. 상대방도 배려해봐.',
    advice: '냥~ 해바라기처럼 밝게 빛나봐. 그 빛이 좋은 인연을 불러올 거야 🔮',
  },
  {
    id: 'wands_king',
    name: '완드 킹',
    nameEn: 'King of Wands',
    arcana: 'minor',
    suit: 'wands',
    number: 14,
    emoji: '🦁',
    keywords: ['리더십', '비전', '열정적 리더', '영감'],
    loveUpright:
      '열정적이고 카리스마 넘치는 사랑의 리더가 되는 시기야. 비전을 가지고 관계를 이끌어가봐. 상대에게 영감을 줄 수 있는 멋진 사람이 될 거야.',
    loveReversed:
      '지나치게 지배적이거나 독단적인 행동이 문제를 만들고 있어. 상대의 의견도 들어봐.',
    advice: '냥~ 진짜 왕은 군림하지 않고 함께해. 파트너를 이끌어봐 🔮',
  },

  // ============================================
  // MINOR ARCANA - PENTACLES (펜타클, 14장)
  // ============================================
  {
    id: 'pentacles_1',
    name: '펜타클 에이스',
    nameEn: 'Ace of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 1,
    emoji: '💰',
    keywords: ['새로운 기회', '안정', '물질적 시작', '현실'],
    loveUpright:
      '안정적이고 현실적인 사랑의 기회가 찾아오고 있어. 말뿐이 아닌 행동으로 보여주는 사랑이 시작될 거야. 현실적인 관계의 토대가 만들어지고 있어.',
    loveReversed:
      '물질적인 문제나 현실적인 장벽이 관계를 막고 있어. 기반을 다시 점검해봐.',
    advice: '냥~ 진짜 사랑은 말이 아닌 행동으로 증명돼. 현실에 발을 딛어봐 🔮',
  },
  {
    id: 'pentacles_2',
    name: '펜타클 2',
    nameEn: 'Two of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 2,
    emoji: '🤹',
    keywords: ['균형', '적응', '유연성', '저글링'],
    loveUpright:
      '여러 가지를 동시에 조율하며 균형을 맞추는 시기야. 바쁜 일상 속에서도 관계에 시간과 에너지를 투자해봐.',
    loveReversed:
      '너무 많은 것을 한꺼번에 처리하려다 관계가 소홀해지고 있어. 우선순위를 정해봐.',
    advice: '냥~ 균형이 곧 행복이야. 사랑도 일상도 잘 저글링해봐 🔮',
  },
  {
    id: 'pentacles_3',
    name: '펜타클 3',
    nameEn: 'Three of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 3,
    emoji: '🏗️',
    keywords: ['협력', '기술', '팀워크', '발전'],
    loveUpright:
      '함께 무언가를 만들어가는 협력의 시기야. 서로의 강점을 살려 관계를 더욱 단단하게 쌓아올릴 수 있어. 함께하는 노력이 빛을 발해.',
    loveReversed:
      '협력이 부족하거나 역할 분담이 제대로 되지 않아 갈등이 생기고 있어. 소통이 필요해.',
    advice: '냥~ 좋은 관계는 두 사람이 함께 짓는 집이야. 같이 벽돌을 쌓아봐 🔮',
  },
  {
    id: 'pentacles_4',
    name: '펜타클 4',
    nameEn: 'Four of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 4,
    emoji: '🤑',
    keywords: ['집착', '안전 추구', '통제', '소유'],
    loveUpright:
      '관계에서 안정을 너무 강하게 추구하거나 상대를 소유하려는 마음이 있어. 사랑은 통제가 아닌 자유임을 기억해.',
    loveReversed:
      '집착에서 벗어나 더 자유로운 관계로 나아가고 있어. 손을 조금씩 펴봐.',
    advice: '냥~ 꽉 쥔 손에는 새로운 것이 들어오지 못해. 살짝 놔줘봐 🔮',
  },
  {
    id: 'pentacles_5',
    name: '펜타클 5',
    nameEn: 'Five of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 5,
    emoji: '❄️',
    keywords: ['외로움', '결핍', '고난', '도움 필요'],
    loveUpright:
      '외롭고 힘든 시기를 지나고 있어. 사랑에서 소외감이나 결핍을 느끼고 있지? 주변에 도움을 청하는 것이 괜찮아.',
    loveReversed:
      '힘든 시기가 지나가고 회복의 기회가 찾아오고 있어. 혼자가 아니야.',
    advice: '냥~ 차가운 눈 속에서도 따뜻한 불빛이 있어. 찾아봐 🔮',
  },
  {
    id: 'pentacles_6',
    name: '펜타클 6',
    nameEn: 'Six of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 6,
    emoji: '🎁',
    keywords: ['관대함', '나눔', '균형', '주고받음'],
    loveUpright:
      '관계에서 아낌없이 주고받는 균형 잡힌 관계가 만들어지고 있어. 사랑과 관심을 나누는 것이 관계를 풍요롭게 해.',
    loveReversed:
      '주고받음의 불균형이 관계를 힘들게 하고 있어. 일방적인 관계는 지속되기 어려워.',
    advice: '냥~ 사랑은 주는 것과 받는 것의 춤이야. 함께 춤춰봐 🔮',
  },
  {
    id: 'pentacles_7',
    name: '펜타클 7',
    nameEn: 'Seven of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 7,
    emoji: '🌱',
    keywords: ['인내', '기다림', '평가', '장기적 관점'],
    loveUpright:
      '열심히 가꿔온 관계의 결실이 나타나기를 기다리는 시기야. 시간을 들여 키워온 것들이 결실을 맺기 시작할 거야. 조금만 더 기다려.',
    loveReversed:
      '노력에 비해 결과가 나오지 않아 지치고 있어. 방향을 다시 점검해봐.',
    advice: '냥~ 심은 씨앗이 자라고 있어. 조금만 더 기다려봐 🔮',
  },
  {
    id: 'pentacles_8',
    name: '펜타클 8',
    nameEn: 'Eight of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 8,
    emoji: '⚒️',
    keywords: ['노력', '기술 향상', '헌신', '완성도'],
    loveUpright:
      '관계를 위해 꾸준히 노력하고 성장하는 시기야. 작은 것들을 정성껏 다듬어가는 과정이 관계를 아름답게 만들어.',
    loveReversed:
      '노력이 부족하거나 완벽주의가 관계를 힘들게 하고 있어. 적당함을 인정하는 것도 필요해.',
    advice: '냥~ 매일 조금씩 더 좋은 연인이 되어가봐. 그게 바로 사랑이야 🔮',
  },
  {
    id: 'pentacles_9',
    name: '펜타클 9',
    nameEn: 'Nine of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 9,
    emoji: '🌿',
    keywords: ['독립', '자급자족', '풍요', '자아 완성'],
    loveUpright:
      '스스로가 완전하고 풍요로운 상태에서 만나는 사랑이 가장 건강해. 자기 자신을 먼저 완성시킨 후 찾아오는 인연이 진짜야.',
    loveReversed:
      '물질적 풍요 뒤에 숨겨진 외로움이 있어. 진정한 연결을 원하고 있어.',
    advice: '냥~ 나 자신이 완전할 때 진짜 사랑이 찾아와. 먼저 스스로를 사랑해줘 🔮',
  },
  {
    id: 'pentacles_10',
    name: '펜타클 10',
    nameEn: 'Ten of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 10,
    emoji: '🏡',
    keywords: ['영속성', '가족', '풍요', '유산'],
    loveUpright:
      '오래도록 함께할 수 있는 깊고 안정적인 사랑의 에너지야. 가정을 이루거나 오래된 관계가 더욱 단단해지는 시기야. 행복한 미래가 그려져.',
    loveReversed:
      '가족 문제나 재정 문제가 관계에 영향을 미치고 있어. 함께 해결해나가봐.',
    advice: '냥~ 시간이 지나도 변하지 않는 사랑이 이루어지고 있어. 소중히 여겨 🔮',
  },
  {
    id: 'pentacles_page',
    name: '펜타클 페이지',
    nameEn: 'Page of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 11,
    emoji: '📚',
    keywords: ['배움', '실용성', '새로운 기회', '탐구'],
    loveUpright:
      '사랑에 대해 배우고 성장하는 시기야. 새로운 관계에서 많은 것을 배울 수 있어. 현실적이고 실용적인 접근이 도움이 될 거야.',
    loveReversed:
      '비현실적인 기대나 미성숙한 접근이 관계를 어렵게 만들고 있어. 현실을 직면해봐.',
    advice: '냥~ 사랑도 배우면서 성장하는 거야. 매 순간이 수업이야 🔮',
  },
  {
    id: 'pentacles_knight',
    name: '펜타클 나이트',
    nameEn: 'Knight of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 12,
    emoji: '🐎',
    keywords: ['신뢰', '인내', '현실적', '꾸준함'],
    loveUpright:
      '믿음직하고 꾸준한 사람이 나타나거나 그런 모습을 보여줄 시기야. 화려하지 않아도 일관된 사랑이 더 오래 간다는 걸 알게 될 거야.',
    loveReversed:
      '너무 보수적이거나 변화를 거부하는 태도가 관계를 정체시키고 있어. 조금은 유연해져봐.',
    advice: '냥~ 천천히 그러나 꾸준하게. 그게 가장 강한 사랑의 방식이야 🔮',
  },
  {
    id: 'pentacles_queen',
    name: '펜타클 퀸',
    nameEn: 'Queen of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 13,
    emoji: '🌺',
    keywords: ['돌봄', '실용성', '풍요로움', '현실적 사랑'],
    loveUpright:
      '따뜻하고 현실적인 사랑으로 상대를 보살피는 시기야. 말보다 행동으로 사랑을 표현하는 것이 더 효과적이야. 안정적이고 풍요로운 관계가 형성되고 있어.',
    loveReversed:
      '지나치게 물질적이거나 현실적인 면에만 치우쳐 감정을 잊고 있어. 마음도 돌봐줘.',
    advice: '냥~ 따뜻한 밥 한 끼, 따뜻한 말 한마디가 가장 좋은 사랑 표현이야 🔮',
  },
  {
    id: 'pentacles_king',
    name: '펜타클 킹',
    nameEn: 'King of Pentacles',
    arcana: 'minor',
    suit: 'pentacles',
    number: 14,
    emoji: '🏰',
    keywords: ['안정', '성공', '신뢰', '관대함'],
    loveUpright:
      '안정적이고 믿음직한 사랑의 파트너를 만나거나 그런 모습이 될 시기야. 물질적으로나 감정적으로 든든한 사람이 될 수 있어. 오래가는 사랑의 기반이 만들어져.',
    loveReversed:
      '물질적 성공 뒤에 감정적 공허함이 있어. 진정한 연결이 필요한 시기야.',
    advice: '냥~ 든든한 성처럼 상대를 지켜줄 수 있는 사람이 되어봐 🔮',
  },
];
