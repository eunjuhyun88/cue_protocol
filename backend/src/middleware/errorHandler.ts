// ============================================================================
// 🚨 에러 핸들러 미들웨어
// 경로: backend/src/middleware/errorHandler.ts
// ============================================================================

// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 Error Handler:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export default { asyncHandler, errorHandler };