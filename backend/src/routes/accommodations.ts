import { Router } from 'express';
import {
  getAccommodations,
  getAccommodationById,
  createAccommodation,
  getAmenities,
  getCancellationPolicies,
} from '../controllers/accommodationController';
import { authenticate, requireHost } from '../middleware/auth';

const router = Router();

router.get('/', getAccommodations);
router.get('/amenities', getAmenities);
router.get('/cancellation-policies', getCancellationPolicies);
router.get('/:id', getAccommodationById);
router.post('/', authenticate, requireHost, createAccommodation);

export default router;
