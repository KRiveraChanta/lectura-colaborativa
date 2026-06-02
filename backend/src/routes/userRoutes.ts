import { Router } from 'express';
import { getAllUsers, updateUser, deleteUser } from '../controllers/userController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authenticateJWT as any);

router.get('/', getAllUsers as any);
router.put('/:id', updateUser as any);
router.delete('/:id', deleteUser as any);

export default router;
