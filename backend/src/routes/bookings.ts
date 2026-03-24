import { Router } from 'express';
import { 
  getMyBookings, 
  createBooking, 
  cancelBooking,
  createReview 
} from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMyBookings);
router.post('/', authenticate, createBooking);
router.post('/review', authenticate, createReview);
router.patch('/:id/cancel', authenticate, cancelBooking);

export default router;
