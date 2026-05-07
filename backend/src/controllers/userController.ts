import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  profilePicture: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  languages: z.array(z.string()).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

const becomeHostSchema = z.object({
  agreeToTerms: z.literal(true),
});

// Get user profile
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const [rows] = await pool.execute(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.profile_picture, 
            u.is_host, u.created_at,
            (SELECT COUNT(*) FROM accommodations WHERE host_id = u.id) as property_count,
            (SELECT COUNT(*) FROM bookings WHERE guest_id = u.id) as trip_count
     FROM users u
     WHERE u.id = ?`,
    [userId]
  );

  const users = rows as any[];
  if (users.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = users[0];

  res.json({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    profilePicture: user.profile_picture,
    isHost: user.is_host,
    joinedAt: user.created_at,
    stats: {
      propertyCount: user.property_count,
      tripCount: user.trip_count,
    },
  });
});

// Update user profile
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const data = updateProfileSchema.parse(req.body);

  const updates: string[] = [];
  const values: any[] = [];

  if (data.firstName) {
    updates.push('first_name = ?');
    values.push(data.firstName);
  }
  if (data.lastName) {
    updates.push('last_name = ?');
    values.push(data.lastName);
  }
  if (data.phone !== undefined) {
    updates.push('phone = ?');
    values.push(data.phone);
  }
  if (data.profilePicture !== undefined) {
    updates.push('profile_picture = ?');
    values.push(data.profilePicture);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = NOW()');
  values.push(userId);

  await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  res.json({ message: 'Profile updated successfully' });
});

// Change password
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const data = changePasswordSchema.parse(req.body);

  // Get current password hash
  const [rows] = await pool.execute(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  );

  const users = rows as any[];
  if (users.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Verify current password
  const isValid = await bcrypt.compare(data.currentPassword, users[0].password_hash);
  if (!isValid) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

  await pool.execute(
    'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [newPasswordHash, userId]
  );

  res.json({ message: 'Password changed successfully' });
});

// Become a host
export const becomeHost = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  becomeHostSchema.parse(req.body);

  await pool.execute(
    'UPDATE users SET is_host = true, updated_at = NOW() WHERE id = ?',
    [userId]
  );

  res.json({ message: 'You are now a host!' });
});

// Get user's reviews (as a guest)
export const getMyReviews = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const [rows] = await pool.execute(
    `SELECT r.*,
            a.title as accommodation_title,
            a.city as accommodation_city,
            u.first_name as host_first_name
     FROM reviews r
     JOIN bookings b ON r.booking_id = b.id
     JOIN accommodations a ON b.accommodation_id = a.id
     JOIN users u ON a.host_id = u.id
     WHERE b.guest_id = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );

  res.json(rows);
});

// Delete my account
export const deleteAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  // Verify password
  const [rows] = await pool.execute(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  );

  const users = rows as any[];
  const isValid = await bcrypt.compare(password, users[0].password_hash);

  if (!isValid) {
    res.status(400).json({ error: 'Incorrect password' });
    return;
  }

  // Check for active bookings as guest
  const [activeBookings] = await pool.execute(
    `SELECT id FROM bookings 
     WHERE guest_id = ? AND status IN ('pending', 'confirmed')`,
    [userId]
  );

  if ((activeBookings as any[]).length > 0) {
    res.status(400).json({ error: 'Cannot delete account with active bookings' });
    return;
  }

  // Check for active bookings as host
  const [hostBookings] = await pool.execute(
    `SELECT b.id FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE a.host_id = ? AND b.status IN ('pending', 'confirmed')`,
    [userId]
  );

  if ((hostBookings as any[]).length > 0) {
    res.status(400).json({ error: 'Cannot delete account with active guest bookings' });
    return;
  }

  // Soft delete - anonymize user data
  await pool.execute(
    `UPDATE users 
     SET email = CONCAT('deleted_', id, '@deleted.com'),
         first_name = 'Deleted',
         last_name = 'User',
         phone = NULL,
         profile_picture = NULL,
         password_hash = '',
         is_active = false,
         updated_at = NOW()
     WHERE id = ?`,
    [userId]
  );

  res.json({ message: 'Account deleted successfully' });
});

// Upload profile picture (placeholder - would integrate with cloud storage)
export const uploadProfilePicture = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // In a real implementation, this would handle file upload to S3/Cloudinary/etc.
  // For now, we just accept a URL
  const { imageUrl } = req.body;

  if (!imageUrl || !imageUrl.startsWith('http')) {
    res.status(400).json({ error: 'Valid image URL required' });
    return;
  }

  const userId = req.user!.id;

  await pool.execute(
    'UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?',
    [imageUrl, userId]
  );

  res.json({ message: 'Profile picture updated', url: imageUrl });
});
