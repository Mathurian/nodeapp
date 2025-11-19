/**
 * Search Routes
 * Global and entity-specific search functionality with saved searches and history
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

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Global search across all entities
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Search across events, contests, users, and other entities
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "championship"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum results per entity type
 *     responses:
 *       200:
 *         description: Search results grouped by entity type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                     contests:
 *                       type: array
 *                       items:
 *                         type: object
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                 totalResults:
 *                   type: integer
 *                   example: 42
 *       400:
 *         description: Missing or invalid search query
 *       401:
 *         description: Unauthorized
 */
router.get('/', search);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Get autocomplete suggestions based on partial query
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query
 *         example: "cham"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: List of search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["championship", "champions league", "chamber music"]
 *       401:
 *         description: Unauthorized
 */
router.get('/suggestions', getSuggestions);

/**
 * @swagger
 * /api/search/popular:
 *   get:
 *     summary: Get popular searches
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Get most frequently searched terms across all users
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of popular searches to return
 *     responses:
 *       200:
 *         description: List of popular search terms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 popular:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: integer
 *                   example:
 *                     - query: "championship"
 *                       count: 127
 *                     - query: "contest results"
 *                       count: 98
 *       401:
 *         description: Unauthorized
 */
router.get('/popular', getPopularSearches);

/**
 * @swagger
 * /api/search/trending:
 *   get:
 *     summary: Get trending searches
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Get searches with recent spikes in frequency
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of trending searches to return
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Time window for trending calculation
 *     responses:
 *       200:
 *         description: List of trending search terms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 trending:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       recentCount:
 *                         type: integer
 *                       growth:
 *                         type: number
 *                         description: Growth percentage
 *       401:
 *         description: Unauthorized
 */
router.get('/trending', getTrendingSearches);

/**
 * @swagger
 * /api/search/saved:
 *   post:
 *     summary: Save a search query
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Save a search query for quick access later
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Friendly name for the saved search
 *                 example: "My Events"
 *               query:
 *                 type: string
 *                 description: Search query string
 *                 example: "championship"
 *               filters:
 *                 type: object
 *                 description: Additional search filters
 *                 properties:
 *                   type:
 *                     type: string
 *                   dateRange:
 *                     type: object
 *     responses:
 *       201:
 *         description: Search saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 savedSearch:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     query:
 *                       type: string
 *       400:
 *         description: Invalid search data
 *       401:
 *         description: Unauthorized
 */
router.post('/saved', saveSearch);

/**
 * @swagger
 * /api/search/saved:
 *   get:
 *     summary: Get user's saved searches
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all saved searches for the authenticated user
 *     responses:
 *       200:
 *         description: List of saved searches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 savedSearches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       query:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/saved', getSavedSearches);

/**
 * @swagger
 * /api/search/saved/{id}:
 *   delete:
 *     summary: Delete a saved search
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Remove a saved search
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID
 *     responses:
 *       200:
 *         description: Saved search deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.delete('/saved/:id', deleteSavedSearch);

/**
 * @swagger
 * /api/search/saved/{id}/execute:
 *   post:
 *     summary: Execute a saved search
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Run a previously saved search query
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved search ID
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.post('/saved/:id/execute', executeSavedSearch);

/**
 * @swagger
 * /api/search/history:
 *   get:
 *     summary: Get user's search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve recent search queries for the authenticated user
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of history entries
 *     responses:
 *       200:
 *         description: List of recent searches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       resultCount:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/history', getSearchHistory);

/**
 * @swagger
 * /api/search/history:
 *   delete:
 *     summary: Clear search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Delete all search history for the authenticated user
 *     responses:
 *       200:
 *         description: Search history cleared successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/history', clearSearchHistory);

/**
 * @swagger
 * /api/search/{type}:
 *   get:
 *     summary: Search within specific entity type
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: Search for specific entity type only
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [events, contests, users, categories, contestants]
 *         description: Entity type to search
 *         example: "events"
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "championship"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results for entity type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         description: Invalid entity type or missing query
 *       401:
 *         description: Unauthorized
 */
router.get('/:type', searchByType);

export default router;
