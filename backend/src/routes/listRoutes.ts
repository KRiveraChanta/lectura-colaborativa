import { Router } from 'express';
import { createList, getMyLists, getPublicLists, updateList, deleteList, addBookToList, removeBookFromList } from '../controllers/listController';
import { authenticateJWT, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/user/:userId', optionalAuth as any, getPublicLists as any);

router.use(authenticateJWT as any);
router.post('/', createList as any);
router.get('/', getMyLists as any);
router.put('/:id', updateList as any);
router.delete('/:id', deleteList as any);
router.post('/:id/books/:bookId', addBookToList as any);
router.delete('/:id/books/:bookId', removeBookFromList as any);

export default router;
