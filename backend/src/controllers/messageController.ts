import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const sendMessageSchema = z.object({
  receiverId: z.number().int().positive(),
  accommodationId: z.number().int().positive().optional(),
  content: z.string().min(1).max(2000),
});

// Get user's conversations
export const getConversations = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const [rows] = await pool.execute(
    `WITH latest_messages AS (
      SELECT 
        CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as other_user_id,
        MAX(created_at) as latest_date
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY other_user_id
    )
    SELECT 
      m.*,
      u.first_name as other_first_name,
      u.last_name as other_last_name,
      u.profile_picture as other_profile_picture,
      a.title as accommodation_title
    FROM messages m
    JOIN latest_messages lm ON 
      ((m.sender_id = ? AND m.receiver_id = lm.other_user_id) OR 
       (m.sender_id = lm.other_user_id AND m.receiver_id = ?))
      AND m.created_at = lm.latest_date
    JOIN users u ON u.id = lm.other_user_id
    LEFT JOIN accommodations a ON m.accommodation_id = a.id
    ORDER BY m.created_at DESC`,
    [userId, userId, userId, userId, userId]
  );

  const conversations = (rows as any[]).map(m => ({
    id: m.id,
    otherUser: {
      id: m.sender_id === userId ? m.receiver_id : m.sender_id,
      firstName: m.other_first_name,
      lastName: m.other_last_name,
      profilePicture: m.other_profile_picture,
    },
    accommodation: m.accommodation_title ? {
      id: m.accommodation_id,
      title: m.accommodation_title,
    } : null,
    lastMessage: {
      content: m.content,
      isFromMe: m.sender_id === userId,
      createdAt: m.created_at,
      isRead: m.is_read,
    },
  }));

  res.json(conversations);
});

// Get conversation with a specific user
export const getConversation = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const otherUserId = parseInt(req.params.userId);

  if (isNaN(otherUserId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  // Get messages
  const [messageRows] = await pool.execute(
    `SELECT m.*, 
            s.first_name as sender_first_name, 
            s.last_name as sender_last_name,
            r.first_name as receiver_first_name,
            r.last_name as receiver_last_name
     FROM messages m
     JOIN users s ON m.sender_id = s.id
     JOIN users r ON m.receiver_id = r.id
     WHERE (m.sender_id = ? AND m.receiver_id = ?) 
        OR (m.sender_id = ? AND m.receiver_id = ?)
     ORDER BY m.created_at ASC`,
    [userId, otherUserId, otherUserId, userId]
  );

  // Mark messages as read
  await pool.execute(
    'UPDATE messages SET is_read = true WHERE sender_id = ? AND receiver_id = ? AND is_read = false',
    [otherUserId, userId]
  );

  // Get other user info
  const [userRows] = await pool.execute(
    'SELECT id, first_name, last_name, profile_picture FROM users WHERE id = ?',
    [otherUserId]
  );

  const otherUser = (userRows as any[])[0];

  if (!otherUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    otherUser: {
      id: otherUser.id,
      firstName: otherUser.first_name,
      lastName: otherUser.last_name,
      profilePicture: otherUser.profile_picture,
    },
    messages: (messageRows as any[]).map(m => ({
      id: m.id,
      content: m.content,
      isFromMe: m.sender_id === userId,
      sender: {
        firstName: m.sender_first_name,
        lastName: m.sender_last_name,
      },
      createdAt: m.created_at,
      isRead: m.is_read,
    })),
  });
});

// Send message
export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const data = sendMessageSchema.parse(req.body);
  const senderId = req.user!.id;

  // Check if receiver exists
  const [userRows] = await pool.execute(
    'SELECT id FROM users WHERE id = ?',
    [data.receiverId]
  );

  if ((userRows as any[]).length === 0) {
    res.status(404).json({ error: 'Receiver not found' });
    return;
  }

  // Check if accommodation exists (if provided)
  if (data.accommodationId) {
    const [accRows] = await pool.execute(
      'SELECT id FROM accommodations WHERE id = ?',
      [data.accommodationId]
    );

    if ((accRows as any[]).length === 0) {
      res.status(404).json({ error: 'Accommodation not found' });
      return;
    }
  }

  const [result] = await pool.execute(
    `INSERT INTO messages (sender_id, receiver_id, accommodation_id, content, is_read, created_at)
     VALUES (?, ?, ?, ?, false, NOW())`,
    [senderId, data.receiverId, data.accommodationId || null, data.content]
  );

  res.status(201).json({
    message: 'Message sent successfully',
    id: (result as any).insertId,
  });
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = false',
    [userId]
  );

  res.json({ count: (rows as any[])[0].count });
});
