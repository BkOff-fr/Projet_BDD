import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  becomeHost,
  getMyReviews,
  deleteAccount,
  uploadProfilePicture,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.post('/me/password', authenticate, changePassword);
router.post('/me/become-host', authenticate, becomeHost);
router.get('/me/reviews', authenticate, getMyReviews);
router.delete('/me', authenticate, deleteAccount);
router.post('/me/picture', authenticate, uploadProfilePicture);

export default router;
