// ============================================================================
// 📁 frontend/src/lib/logger.ts
// 📝 통합 로깅 시스템 - 디버깅 및 모니터링용
// ============================================================================
// 이 로거는 전체 애플리케이션의 로그를 일관된 형식으로 관리합니다.
// 개발 환경에서는 상세한 로그를, 프로덕션에서는 필요한 로그만 출력합니다.
// 각 훅과 서비스에서 사용하여 디버깅과 에러 추적을 용이하게 합니다.
// ============================================================================

'use client';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  prefix: string;
  message: string;
  data?: any;
  error?: any;
}

class Logger {
  private prefix: string;
  private isDevelopment: boolean;
  private isDebugMode: boolean;
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000; // 메모리 관리를 위한 최대 로그 수

  constructor(prefix: string) {
    this.prefix = prefix;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = typeof window !== 'undefined' && 
                      (window.localStorage?.getItem('debug_mode') === 'true' ||
                       process.env.NEXT_PUBLIC_DEBUG === 'true');
  }

  // ============================================================================
  // 🎯 메인 로깅 메서드들
  // ============================================================================

  /**
   * 일반 정보 로그
   */
  info(message: string, data?: any): void {
    const logEntry = this.createLogEntry('info', message, data);
    
    if (this.isDevelopment || this.isDebugMode) {
      console.log(
        `%cℹ️ [${this.prefix}] ${message}`,
        'color: #2563eb; font-weight: 500;',
        data || ''
      );
    }
    
    this.storeLog(logEntry);
  }

  /**
   * 성공 로그 (녹색)
   */
  success(message: string, data?: any): void {
    const logEntry = this.createLogEntry('success', message, data);
    
    if (this.isDevelopment || this.isDebugMode) {
      console.log(
        `%c✅ [${this.prefix}] ${message}`,
        'color: #16a34a; font-weight: 600;',
        data || ''
      );
    }
    
    this.storeLog(logEntry);
  }

  /**
   * 경고 로그 (주황색)
   */
  warn(message: string, data?: any): void {
    const logEntry = this.createLogEntry('warn', message, data);
    
    // 경고는 항상 표시
    console.warn(
      `%c⚠️ [${this.prefix}] ${message}`,
      'color: #d97706; font-weight: 600;',
      data || ''
    );
    
    this.storeLog(logEntry);
  }

  /**
   * 에러 로그 (빨간색)
   */
  error(message: string, error?: any): void {
    const logEntry = this.createLogEntry('error', message, undefined, error);
    
    // 에러는 항상 표시
    console.error(
      `%c❌ [${this.prefix}] ${message}`,
      'color: #dc2626; font-weight: 700;',
      error || ''
    );
    
    this.storeLog(logEntry);
    
    // 에러 추적을 위한 추가 정보
    if (error && this.isDevelopment) {
      console.trace('Error stack trace:');
    }
  }

  /**
   * 디버그 로그 (회색, 개발 환경에서만)
   */
  debug(message: string, data?: any): void {
    if (!this.isDevelopment && !this.isDebugMode) return;

    const logEntry = this.createLogEntry('debug', message, data);
    
    console.debug(
      `%c🔍 [${this.prefix}] ${message}`,
      'color: #6b7280; font-style: italic;',
      data || ''
    );
    
    this.storeLog(logEntry);
  }

  // ============================================================================
  // 🎯 특수 로깅 메서드들
  // ============================================================================

  /**
   * API 호출 로그
   */
  apiCall(method: string, url: string, data?: any): void {
    this.info(`🌐 API ${method} ${url}`, data);
  }

  /**
   * API 응답 로그
   */
  apiResponse(method: string, url: string, status: number, responseTime?: number): void {
    const message = `📡 API ${method} ${url} → ${status}${responseTime ? ` (${responseTime}ms)` : ''}`;
    
    if (status >= 200 && status < 300) {
      this.success(message);
    } else if (status >= 400) {
      this.error(message);
    } else {
      this.info(message);
    }
  }

  /**
   * 상태 변경 로그
   */
  stateChange(stateName: string, oldValue: any, newValue: any): void {
    this.debug(`🔄 State ${stateName}:`, { from: oldValue, to: newValue });
  }

  /**
   * 시간 측정 시작
   */
  time(label: string): void {
    if (this.isDevelopment || this.isDebugMode) {
      console.time(`⏱️ [${this.prefix}] ${label}`);
    }
  }

  /**
   * 시간 측정 종료
   */
  timeEnd(label: string): void {
    if (this.isDevelopment || this.isDebugMode) {
      console.timeEnd(`⏱️ [${this.prefix}] ${label}`);
    }
  }

  /**
   * 그룹 로그 시작
   */
  group(title: string): void {
    if (this.isDevelopment || this.isDebugMode) {
      console.group(`📂 [${this.prefix}] ${title}`);
    }
  }

  /**
   * 그룹 로그 종료
   */
  groupEnd(): void {
    if (this.isDevelopment || this.isDebugMode) {
      console.groupEnd();
    }
  }

  // ============================================================================
  // 🛠️ 내부 헬퍼 메서드들
  // ============================================================================

  private createLogEntry(level: LogLevel, message: string, data?: any, error?: any): LogEntry {
    return {
      timestamp: new Date(),
      level,
      prefix: this.prefix,
      message,
      data,
      error
    };
  }

  private storeLog(entry: LogEntry): void {
    Logger.logs.push(entry);
    
    // 메모리 관리: 최대 로그 수 초과시 오래된 로그 제거
    if (Logger.logs.length > Logger.maxLogs) {
      Logger.logs = Logger.logs.slice(-Logger.maxLogs);
    }
  }

  // ============================================================================
  // 🎯 정적 메서드들 (전역 로그 관리)
  // ============================================================================

  /**
   * 저장된 모든 로그 조회
   */
  static getAllLogs(): LogEntry[] {
    return [...Logger.logs];
  }

  /**
   * 특정 레벨의 로그만 조회
   */
  static getLogsByLevel(level: LogLevel): LogEntry[] {
    return Logger.logs.filter(log => log.level === level);
  }

  /**
   * 특정 prefix의 로그만 조회
   */
  static getLogsByPrefix(prefix: string): LogEntry[] {
    return Logger.logs.filter(log => log.prefix === prefix);
  }

  /**
   * 최근 로그 조회
   */
  static getRecentLogs(count: number = 50): LogEntry[] {
    return Logger.logs.slice(-count);
  }

  /**
   * 로그 통계 조회
   */
  static getLogStats(): Record<LogLevel, number> {
    const stats: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      success: 0
    };

    Logger.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }

  /**
   * 모든 로그 초기화
   */
  static clearLogs(): void {
    Logger.logs = [];
    console.clear();
  }

  /**
   * 로그를 JSON으로 내보내기
   */
  static exportLogs(): string {
    return JSON.stringify(Logger.logs, null, 2);
  }

  /**
   * 로그를 파일로 다운로드
   */
  static downloadLogs(): void {
    if (typeof window === 'undefined') return;

    const logsJson = Logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// 🎯 팩토리 함수
// ============================================================================

/**
 * 새로운 로거 인스턴스 생성
 */
export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix);
};

// ============================================================================
// 🎯 사전 정의된 로거들
// ============================================================================

export const appLogger = createLogger('App');
export const apiLogger = createLogger('API');
export const hookLogger = createLogger('Hook');
export const serviceLogger = createLogger('Service');

// ============================================================================
// 🎯 글로벌 에러 핸들러
// ============================================================================

if (typeof window !== 'undefined') {
  // 처리되지 않은 에러 캐치
  window.addEventListener('error', (event) => {
    appLogger.error('Uncaught Error', {
      message: event.error?.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });

  // 처리되지 않은 Promise rejection 캐치
  window.addEventListener('unhandledrejection', (event) => {
    appLogger.error('Unhandled Promise Rejection', {
      reason: event.reason,
      promise: event.promise
    });
  });

  // 개발 환경에서 디버그 모드 토글 기능
  if (process.env.NODE_ENV === 'development') {
    (window as any).enableDebugMode = () => {
      localStorage.setItem('debug_mode', 'true');
      console.log('🔍 Debug mode enabled');
    };

    (window as any).disableDebugMode = () => {
      localStorage.removeItem('debug_mode');
      console.log('🔍 Debug mode disabled');
    };

    (window as any).showLogs = () => {
      console.table(Logger.getAllLogs());
    };

    (window as any).clearLogs = () => {
      Logger.clearLogs();
      console.log('🗑️ All logs cleared');
    };

    (window as any).downloadLogs = () => {
      Logger.downloadLogs();
      console.log('📁 Logs downloaded');
    };

    console.log(`
🔍 Debug Commands Available:
- enableDebugMode() : 디버그 모드 활성화
- disableDebugMode() : 디버그 모드 비활성화  
- showLogs() : 모든 로그 테이블로 표시
- clearLogs() : 로그 초기화
- downloadLogs() : 로그 파일 다운로드
    `);
  }
}

export default Logger;