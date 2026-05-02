import { Router } from 'express';
import {
  clearSearchHistory,
  deleteSavedSearch,
  executeSavedSearch,
  getPopularSearches,
  getSavedSearches,
  getSearchHistory,
  getSuggestions,
  getTrendingSearches,
  saveSearch,
  search,
  searchByType,
} from '../controllers/searchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', search);
router.post('/saved', saveSearch);
router.get('/saved', getSavedSearches);
router.post('/saved/:id/execute', executeSavedSearch);
router.delete('/saved/:id', deleteSavedSearch);
router.get('/history', getSearchHistory);
router.delete('/history', clearSearchHistory);
router.get('/suggestions', getSuggestions);
router.get('/popular', getPopularSearches);
router.get('/trending', getTrendingSearches);
router.post('/:type', searchByType);

export default router;
