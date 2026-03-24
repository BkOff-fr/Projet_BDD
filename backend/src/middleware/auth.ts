import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import pool from '../config/database';
import { User } from '../types';

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Get user from database
    const [rows] = await pool.execute(
      'SELECT id, email, first_name, last_name, phone, profile_picture, is_host, created_at, updated_at FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    const users = rows as User[];
    
    if (users.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = users[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireHost = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.is_host) {
    res.status(403).json({ error: 'Access denied. Host privileges required.' });
    return;
  }
  next();
};
