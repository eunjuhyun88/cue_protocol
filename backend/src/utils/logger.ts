// ============================================================================
// 📁 backend/src/utils/logger.ts
// 📝 백엔드 통합 로깅 시스템 - 서버 사이드 로깅 및 모니터링
// ============================================================================
// 이 로거는 백엔드 서비스들의 로그를 관리하고 파일에 저장합니다.
// 개발/프로덕션 환경에 따라 다른 로그 레벨을 적용하며,
// 에러 추적, 성능 모니터링, API 호출 로깅을 제공합니다.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  error?: any;
  requestId?: string;
  userId?: string;
  duration?: number;
}

interface LoggerConfig {
  enableConsole: boolean;
  enableFile: boolean;
  logLevel: LogLevel;
  logDirectory: string;
  maxFileSize: number; // MB
  maxFiles: number;
  enableStructuredLogging: boolean;
}

export class Logger {
  private service: string;
  private config: LoggerConfig;
  private fileStream: WriteStream | null = null;
  private static globalConfig: LoggerConfig;
  private static logQueue: LogEntry[] = [];
  private static isInitialized = false;

  constructor(service: string) {
    this.service = service;
    this.config = Logger.globalConfig || this.getDefaultConfig();
    
    if (!Logger.isInitialized) {
      this.initializeLogger();
    }
  }

  // ============================================================================
  // 🎯 메인 로깅 메서드들
  // ============================================================================

  /**
   * 디버그 로그 (개발 환경에서만)
   */
  debug(message: string, data?: any, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.writeLog('debug', message, data, undefined, context);
    }
  }

  /**
   * 일반 정보 로그
   */
  info(message: string, data?: any, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.writeLog('info', message, data, undefined, context);
    }
  }

  /**
   * 성공 로그
   */
  success(message: string, data?: any, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.writeLog('success', message, data, undefined, context);
    }
  }

  /**
   * 경고 로그
   */
  warn(message: string, data?: any, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.writeLog('warn', message, data, undefined, context);
    }
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.writeLog('error', message, undefined, error, context);
    }
  }

  // ============================================================================
  // 🎯 특수 로깅 메서드들
  // ============================================================================

  /**
   * API 요청 로그
   */
  apiRequest(method: string, path: string, context?: ApiContext): void {
    const message = `${method} ${path}`;
    this.info(`🌐 API Request: ${message}`, {
      method,
      path,
      userAgent: context?.userAgent,
      ip: context?.ip,
      query: context?.query,
      body: this.sanitizeBody(context?.body)
    }, context);
  }

  /**
   * API 응답 로그
   */
  apiResponse(method: string, path: string, statusCode: number, duration: number, context?: ApiContext): void {
    const message = `${method} ${path} → ${statusCode} (${duration}ms)`;
    
    if (statusCode >= 200 && statusCode < 300) {
      this.success(`📡 API Success: ${message}`, { statusCode, duration }, context);
    } else if (statusCode >= 400 && statusCode < 500) {
      this.warn(`⚠️ API Client Error: ${message}`, { statusCode, duration }, context);
    } else if (statusCode >= 500) {
      this.error(`❌ API Server Error: ${message}`, { statusCode, duration }, context);
    } else {
      this.info(`📡 API Response: ${message}`, { statusCode, duration }, context);
    }
  }

  /**
   * 데이터베이스 쿼리 로그
   */
  dbQuery(query: string, duration?: number, context?: LogContext): void {
    const sanitizedQuery = this.sanitizeQuery(query);
    this.debug(`🗄️ DB Query: ${sanitizedQuery}`, { 
      duration,
      queryLength: query.length 
    }, context);
  }

  /**
   * 데이터베이스 에러 로그
   */
  dbError(query: string, error: any, context?: LogContext): void {
    const sanitizedQuery = this.sanitizeQuery(query);
    this.error(`💥 DB Error: ${sanitizedQuery}`, error, context);
  }

  /**
   * 인증 로그
   */
  auth(action: string, userId?: string, success: boolean = true, context?: LogContext): void {
    const message = `🔐 Auth ${action}: ${success ? 'Success' : 'Failed'}`;
    
    if (success) {
      this.info(message, { userId, action }, context);
    } else {
      this.warn(message, { userId, action }, context);
    }
  }

  /**
   * 성능 측정 시작
   */
  startTimer(label: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(`⏱️ Timer ${label}: ${duration}ms`, { duration, label });
      return duration;
    };
  }

  /**
   * 메모리 사용량 로그
   */
  memory(label?: string): void {
    const usage = process.memoryUsage();
    const formatMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    this.debug(`💾 Memory ${label || 'Usage'}:`, {
      rss: `${formatMB(usage.rss)}MB`,
      heapTotal: `${formatMB(usage.heapTotal)}MB`,
      heapUsed: `${formatMB(usage.heapUsed)}MB`,
      external: `${formatMB(usage.external)}MB`
    });
  }

  // ============================================================================
  // 🔧 내부 구현 메서드들
  // ============================================================================

  private writeLog(
    level: LogLevel, 
    message: string, 
    data?: any, 
    error?: any, 
    context?: LogContext
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      service: this.service,
      message,
      data,
      error: error ? this.serializeError(error) : undefined,
      requestId: context?.requestId,
      userId: context?.userId,
      duration: context?.duration
    };

    // 콘솔 출력
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // 파일 출력
    if (this.config.enableFile) {
      this.writeToFile(entry);
    }

    // 큐에 추가 (메모리 로그용)
    Logger.logQueue.push(entry);
    if (Logger.logQueue.length > 1000) {
      Logger.logQueue = Logger.logQueue.slice(-1000);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.service}]`;
    
    let color = '';
    let emoji = '';
    
    switch (entry.level) {
      case 'debug':
        color = '\x1b[36m'; // Cyan
        emoji = '🔍';
        break;
      case 'info':
        color = '\x1b[34m'; // Blue
        emoji = 'ℹ️';
        break;
      case 'success':
        color = '\x1b[32m'; // Green
        emoji = '✅';
        break;
      case 'warn':
        color = '\x1b[33m'; // Yellow
        emoji = '⚠️';
        break;
      case 'error':
        color = '\x1b[31m'; // Red
        emoji = '❌';
        break;
    }

    const resetColor = '\x1b[0m';
    const logMessage = `${color}${emoji} ${prefix} ${entry.message}${resetColor}`;
    
    if (entry.level === 'error') {
      console.error(logMessage, entry.data || '', entry.error || '');
    } else if (entry.level === 'warn') {
      console.warn(logMessage, entry.data || '');
    } else {
      console.log(logMessage, entry.data || '');
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.fileStream) {
      this.createFileStream();
    }

    if (this.fileStream) {
      const logLine = this.config.enableStructuredLogging 
        ? JSON.stringify(entry) + '\n'
        : this.formatLogLine(entry) + '\n';
      
      this.fileStream.write(logLine);
    }
  }

  private formatLogLine(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(7);
    const service = entry.service.padEnd(15);
    
    let line = `[${timestamp}] ${level} [${service}] ${entry.message}`;
    
    if (entry.requestId) {
      line += ` [${entry.requestId}]`;
    }
    
    if (entry.userId) {
      line += ` [User: ${entry.userId}]`;
    }
    
    if (entry.duration) {
      line += ` [${entry.duration}ms]`;
    }
    
    if (entry.data) {
      line += ` Data: ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      line += ` Error: ${JSON.stringify(entry.error)}`;
    }
    
    return line;
  }

  private createFileStream(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const filename = `${this.service}-${date}.log`;
    const filepath = path.join(this.config.logDirectory, filename);
    
    this.fileStream = createWriteStream(filepath, { flags: 'a' });
    
    this.fileStream.on('error', (error) => {
      console.error('Log file write error:', error);
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        statusCode: (error as any).statusCode
      };
    }
    return error;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeQuery(query: string): string {
    // SQL 쿼리에서 민감한 정보 제거
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .substring(0, 200); // 쿼리 길이 제한
  }

  private initializeLogger(): void {
    if (Logger.isInitialized) return;
    
    // 프로세스 종료시 로그 파일 정리
    process.on('SIGINT', this.cleanup.bind(this));
    process.on('SIGTERM', this.cleanup.bind(this));
    process.on('exit', this.cleanup.bind(this));
    
    // 처리되지 않은 에러 로깅
    process.on('uncaughtException', (error) => {
      this.error('Uncaught Exception', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Promise Rejection', { reason, promise });
    });
    
    Logger.isInitialized = true;
  }

  private cleanup(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }

  private getDefaultConfig(): LoggerConfig {
    return {
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      logLevel: (process.env.LOG_LEVEL as LogLevel) || 
                (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      logDirectory: process.env.LOG_DIRECTORY || './logs',
      maxFileSize: 50, // 50MB
      maxFiles: 10,
      enableStructuredLogging: process.env.STRUCTURED_LOGGING === 'true'
    };
  }

  // ============================================================================
  // 🎯 정적 메서드들
  // ============================================================================

  public static configure(config: Partial<LoggerConfig>): void {
    Logger.globalConfig = {
      ...new Logger('').getDefaultConfig(),
      ...config
    };
  }

  public static getRecentLogs(count: number = 100): LogEntry[] {
    return Logger.logQueue.slice(-count);
  }

  public static getLogsByLevel(level: LogLevel): LogEntry[] {
    return Logger.logQueue.filter(log => log.level === level);
  }

  public static getLogsByService(service: string): LogEntry[] {
    return Logger.logQueue.filter(log => log.service === service);
  }

  public static clearLogs(): void {
    Logger.logQueue = [];
  }

  public static getStats(): LogStats {
    const stats: LogStats = {
      total: Logger.logQueue.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0, success: 0 },
      byService: {},
      timeRange: {
        oldest: Logger.logQueue[0]?.timestamp,
        newest: Logger.logQueue[Logger.logQueue.length - 1]?.timestamp
      }
    };

    Logger.logQueue.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;
    });

    return stats;
  }
}

// ============================================================================
// 🎯 타입 정의들
// ============================================================================

interface LogContext {
  requestId?: string;
  userId?: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
}

interface ApiContext extends LogContext {
  method?: string;
  path?: string;
  query?: any;
  body?: any;
  statusCode?: number;
}

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byService: Record<string, number>;
  timeRange: {
    oldest?: Date;
    newest?: Date;
  };
}

// ============================================================================
// 🎯 팩토리 함수 및 유틸리티
// ============================================================================

/**
 * 새로운 로거 인스턴스 생성
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}

/**
 * Express 미들웨어용 로거
 */
export function createRequestLogger(service: string = 'HTTP') {
  const logger = new Logger(service);
  
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    req.requestId = requestId;
    req.logger = logger;
    
    // 요청 로그
    logger.apiRequest(req.method, req.path, {
      requestId,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      query: req.query,
      body: req.body
    });
    
    // 응답 로그
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - start;
      
      logger.apiResponse(req.method, req.path, res.statusCode, duration, {
        requestId,
        userId: req.user?.id
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// 사전 정의된 로거들
export const appLogger = createLogger('App');
export const dbLogger = createLogger('Database');
export const authLogger = createLogger('Auth');
export const aiLogger = createLogger('AI');
export const cueLogger = createLogger('CUE');

export default Logger;