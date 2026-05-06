import { Router } from 'express';
import {
  getHostDashboard,
  getHostProperties,
  getPropertyBookings,
  updateBookingStatus,
  setAvailability,
  getAvailabilityCalendar,
  addPricingRule,
  getPricingRules,
  deletePricingRule,
} from '../controllers/hostController';
import { authenticate, requireHost } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, requireHost, getHostDashboard);
router.get('/properties', authenticate, requireHost, getHostProperties);
router.get('/properties/:propertyId/bookings', authenticate, requireHost, getPropertyBookings);
router.patch('/bookings/:id/status', authenticate, requireHost, updateBookingStatus);
router.post('/properties/:propertyId/availability', authenticate, requireHost, setAvailability);
router.get('/properties/:propertyId/availability', authenticate, requireHost, getAvailabilityCalendar);
router.post('/properties/:propertyId/pricing-rules', authenticate, requireHost, addPricingRule);
router.get('/properties/:propertyId/pricing-rules', authenticate, requireHost, getPricingRules);
router.delete('/pricing-rules/:ruleId', authenticate, requireHost, deletePricingRule);

export default router;
