'use client';

/**
 * 🔍 v85.7: BrowseTogether — 같이 찾기 이벤트 최상위 컨테이너
 *
 * 3상태 분기:
 *   - BROWSE_SEARCHING → BrowseSearchingLive (URL 티커)
 *   - BROWSE_SESSION → ConversationalBrowse (대화형 티키타카)
 *   - BROWSE_FINAL → BrowseFinalCard
 */

import type {
  PhaseEvent,
  BrowseSessionData,
  BrowseSearchingData,
  BrowseFinalData,
  SuggestionMeta,
} from '@/types/engine.types';

import BrowseSearchingLive from './BrowseSearchingLive';
import ConversationalBrowse from './ConversationalBrowse';
import BrowseFinalCard from './BrowseFinalCard';

interface Props {
  event: PhaseEvent;
  onSelect?: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const TOPIC_LABEL: Record<string, string> = {
  gift: '같이 선물 고르는 중',
  'date-spot': '같이 장소 찾는 중',
  activity: '같이 체험 고르는 중',
  movie: '같이 볼 거 찾는 중',
  anniversary: '같이 이벤트 짜는 중',
  general: '같이 둘러보는 중',
};

export default function BrowseTogether({ event, onSelect, disabled }: Props) {
  // ── SEARCHING (라이브 검색 UI)
  if (event.type === 'BROWSE_SEARCHING') {
    const data = event.data as unknown as BrowseSearchingData;
    return <BrowseSearchingLive topic={data.topic} topicLabel={data.topicLabel ?? TOPIC_LABEL[data.topic] ?? '같이 둘러보는 중'} />;
  }

  // ── FINAL (결정 결과)
  if (event.type === 'BROWSE_FINAL') {
    const data = event.data as unknown as BrowseFinalData;
    return (
      <BrowseFinalCard
        topicLabel={data.topicLabel}
        chosen={data.chosen}
        shortlist={data.shortlist}
        lunaWrap={data.lunaWrap}
      />
    );
  }

  // ── SESSION (대화형 브라우징)
  const data = event.data as unknown as BrowseSessionData;
  return <ConversationalBrowse data={data} onSelect={onSelect} disabled={disabled} />;
}

