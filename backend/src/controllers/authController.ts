import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import pool from '../config/database';
import { generateToken } from '../utils/jwt';
import { asyncHandler } from '../middleware/errorHandler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  isHost: z.boolean().default(false),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const data = registerSchema.parse(req.body);
  
  // Check if email exists
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [data.email]);
  if ((existing as any[]).length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);
  
  // Insert user
  const [result] = await pool.execute(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_host, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.email, passwordHash, data.firstName, data.lastName, data.phone || null, data.isHost]
  );
  
  const userId = (result as any).insertId;
  
  // Get created user
  const [rows] = await pool.execute(
    'SELECT id, email, first_name, last_name, phone, profile_picture, is_host, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );
  
  const user = (rows as any[])[0];
  const token = generateToken(user);
  
  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      profilePicture: user.profile_picture,
      isHost: user.is_host,
    },
    token,
  });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const data = loginSchema.parse(req.body);
  
  // Get user with password
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ?',
    [data.email]
  );
  
  const users = rows as any[];
  
  if (users.length === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  
  const user = users[0];
  
  // Verify password
  const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
  
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  
  const token = generateToken(user);
  
  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      profilePicture: user.profile_picture,
      isHost: user.is_host,
    },
    token,
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    profilePicture: user.profile_picture,
    isHost: user.is_host,
  });
});
