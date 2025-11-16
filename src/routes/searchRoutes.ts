/**
 * Search Routes
 */

import { Router } from 'express';
import {
  search,
  searchByType,
  getSuggestions,
  getPopularSearches,
  getTrendingSearches,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  executeSavedSearch,
  getSearchHistory,
  clearSearchHistory,
} from '../controllers/searchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Global search
router.get('/', search);

// Search suggestions
router.get('/suggestions', getSuggestions);

// Popular and trending searches
router.get('/popular', getPopularSearches);
router.get('/trending', getTrendingSearches);

// Saved searches
router.post('/saved', saveSearch);
router.get('/saved', getSavedSearches);
router.delete('/saved/:id', deleteSavedSearch);
router.post('/saved/:id/execute', executeSavedSearch);

// Search history
router.get('/history', getSearchHistory);
router.delete('/history', clearSearchHistory);

// Search by entity type
router.get('/:type', searchByType);

export default router;
