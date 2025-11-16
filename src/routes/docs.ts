/**
 * Documentation Routes
 * Browser-based documentation viewer
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  listDocs,
  getDoc,
  searchDocs,
  getDocsByCategory,
} from '../controllers/docsController';

const router = express.Router();

// All documentation routes require authentication
router.use(authenticateToken);

// List all documentation files
router.get('/', listDocs);

// Search documentation
router.get('/search', searchDocs);

// Get documentation by category
router.get('/category/:category', getDocsByCategory);

// Get specific documentation file (must be last to catch all paths)
router.get('/*', getDoc);

export default router;
