import { Router } from 'express';
import { 
  getAccommodations, 
  getAccommodationById, 
  createAccommodation,
  getAmenities 
} from '../controllers/accommodationController';
import { authenticate, requireHost } from '../middleware/auth';

const router = Router();

router.get('/', getAccommodations);
router.get('/amenities', getAmenities);
router.get('/:id', getAccommodationById);
router.post('/', authenticate, requireHost, createAccommodation);

export default router;
