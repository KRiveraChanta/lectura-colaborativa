import { Router } from 'express';
import { getAllTags, createTag, updateTag, deleteTag } from '../controllers/tagController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT as any, getAllTags as any);
router.post('/', authenticateJWT as any, createTag as any);
router.put('/:id', authenticateJWT as any, updateTag as any);
router.delete('/:id', authenticateJWT as any, deleteTag as any);

export default router;
