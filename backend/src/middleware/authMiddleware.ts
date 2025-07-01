// backend/src/middleware/authMiddleware.ts
//  실제 백엔드 API 클라이언트 (WebAuthn + DB 연동)
//  ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database/DatabaseService';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // 사용자 확인
    const db = DatabaseService.getInstance();
    const { data: user, error } = await db.getClient()
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};
