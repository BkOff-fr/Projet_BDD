import { Router } from 'express';
import { 
  getConversations, 
  getConversation, 
  sendMessage,
  getUnreadCount 
} from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getConversations);
router.get('/unread', authenticate, getUnreadCount);
router.get('/:userId', authenticate, getConversation);
router.post('/', authenticate, sendMessage);

export default router;
