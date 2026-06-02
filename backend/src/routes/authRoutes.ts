import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { register, login, updateProfile, searchUsers, getUserProfile, resetPassword, forgotPassword, getMyAnnotations } from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Configuración de multer para guardar en uploads/avatars/ o uploads/covers/
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = file.fieldname === 'cover' 
            ? path.join(__dirname, '../../uploads/covers')
            : path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/profile', authenticateJWT as any, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), updateProfile as any);
router.get('/search', authenticateJWT as any, searchUsers as any);
router.get('/profile/:id', authenticateJWT as any, getUserProfile as any);
router.get('/me/annotations', authenticateJWT as any, getMyAnnotations as any);

export default router;
