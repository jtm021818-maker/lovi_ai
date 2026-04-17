/**
 * 📝 LogCollector: 요청 단위로 엔진 로그를 수집하기 위한 유틸리티
 *
 * v61: 구조화된 로그 지원 — { category, message, data } 형태 반환
 * 기존 log(string) API 호환성 유지 — "[CATEGORY] 메시지" 패턴을 자동 파싱해 카테고리 추출.
 */

export interface StructuredLog {
  /** 대분류 — 'LEFT_BRAIN', 'RIGHT_BRAIN', 'ACC', 'LIMBIC', 'DUAL', 'PIPELINE', 'HLRE', 'ACE', 'GENERAL' */
  category: string;
  /** 메시지 본문 */
  message: string;
  /** 선택적 구조화 데이터 */
  data?: Record<string, any>;
  /** ISO 시각 */
  timestamp: string;
}

export class LogCollector {
  private logs: StructuredLog[] = [];

  /**
   * 문자열 로그 (legacy API). "[CATEGORY] 메시지" 패턴이면 카테고리 자동 추출.
   * 아니면 category='GENERAL' 로 저장.
   */
  log(message: string) {
    const match = message.match(/^\[([^\]]+)\]\s*(.*)/);
    const category = match ? match[1].toUpperCase() : 'GENERAL';
    const msg = match ? match[2] : message;

    this.logs.push({
      category,
      message: msg,
      timestamp: new Date().toISOString(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(message);
    }
  }

  /**
   * 구조화 로그 — category 명시 + data 포함 가능
   */
  record(category: string, message: string, data?: Record<string, any>) {
    this.logs.push({
      category: category.toUpperCase(),
      message,
      data,
      timestamp: new Date().toISOString(),
    });

    if (process.env.NODE_ENV === 'development') {
      const dataStr = data ? ` ${JSON.stringify(data).slice(0, 200)}` : '';
      console.log(`[${category.toUpperCase()}] ${message}${dataStr}`);
    }
  }

  /** 구조화 로그 배열 반환 (client 에서 category/message/data 접근 가능) */
  getLogs(): StructuredLog[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

/**
 * 전역 로그 컬렉터는 서버 공유 상태가 될 수 있으므로,
 * 가급적 요청마다 인스턴스를 생성해서 전달하는 방식을 권장합니다.
 */
