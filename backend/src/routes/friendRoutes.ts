import { Router } from 'express';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getPendingRequests, getFriendsList, removeFriend } from '../controllers/friendController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT as any);
router.post('/request', sendFriendRequest as any);
router.post('/accept/:requestId', acceptFriendRequest as any);
router.post('/reject/:requestId', rejectFriendRequest as any);
router.get('/pending', getPendingRequests as any);
router.get('/list', getFriendsList as any);
router.delete('/remove/:friendId', removeFriend as any);

export default router;
