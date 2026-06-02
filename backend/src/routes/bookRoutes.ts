import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadBook, getUserBooks, getSection, updateBook, deleteBook, saveHighlight, deleteHighlight, updateHighlightComment, getBookmark, searchBooks, getCollaboratorsProgress, uploadBookCover, getFriendsComments, getAllAnnotations, duplicateBook, addFavorite, removeFavorite, getBookDetails, getBookComments, addBookComment, deleteBookComment, reactToBookComment } from '../controllers/bookController';
import { authenticateJWT, optionalAuth } from '../middleware/auth';

const router = Router();
const bookStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/books');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: bookStorage });

const coverStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/covers');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const coverUpload = multer({ storage: coverStorage });

// Public / Optional Auth routes
router.get('/', optionalAuth as any, getUserBooks as any);
router.get('/search', optionalAuth as any, searchBooks as any);
router.get('/:bookId/sections/:sectionIndex', optionalAuth as any, getSection as any);
router.get('/:id/details', optionalAuth as any, getBookDetails as any);
router.get('/:id/book-comments', optionalAuth as any, getBookComments as any);

// Protected routes
router.use(authenticateJWT as any);

router.post('/:id/book-comments', addBookComment as any);
router.delete('/:id/book-comments/:commentId', deleteBookComment as any);
router.post('/:id/book-comments/:commentId/reaction', reactToBookComment as any);
router.get('/:bookId/collaborators', getCollaboratorsProgress as any);
router.get('/:bookId/friends-comments', getFriendsComments as any);
router.get('/:bookId/annotations', getAllAnnotations as any);
router.get('/:bookId/bookmark', getBookmark as any);
router.post('/:bookId/sections/:sectionId/highlights', saveHighlight as any);
router.delete('/:bookId/highlights/:highlightId', deleteHighlight as any);
router.put('/:bookId/highlights/:highlightId/comment', updateHighlightComment as any);
router.post('/upload', upload.single('file'), uploadBook as any);
router.put('/:id', updateBook as any);
router.post('/:id/cover', coverUpload.single('cover'), uploadBookCover as any);
router.delete('/:id', deleteBook as any);
router.post('/:bookId/duplicate', duplicateBook as any);
router.post('/:id/favorite', addFavorite as any);
router.delete('/:id/favorite', removeFavorite as any);

export default router;
