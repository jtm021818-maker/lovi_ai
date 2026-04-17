/**
 * 📝 LogCollector: 요청 단위로 엔진 로그를 수집하기 위한 유틸리티
 */
export class LogCollector {
  private logs: string[] = [];

  log(message: string) {
    this.logs.push(message);
    // 개발 모드에서는 서버 콘솔에도 병렬 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(message);
    }
  }

  getLogs(): string[] {
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
