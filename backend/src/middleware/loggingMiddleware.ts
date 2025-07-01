// /backend/src/middleware/loggingMiddleware.ts
// ============================================================================ 
// 🚦 로깅 미들웨어
//


import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Request ID 추가
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // 원본 end 메서드 래핑
  const originalEnd = res.end;
  res.end = function(this: Response, ...args: any[]) {
    const duration = Date.now() - startTime;
    
    console.log(`${new Date().toISOString()} [${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    
    originalEnd.apply(this, args);
  };

  next();
};
