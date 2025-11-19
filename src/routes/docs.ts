/**
 * Documentation Routes
 * Browser-based documentation viewer for markdown documentation files
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

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: List all documentation files
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     description: Get a list of all available documentation files
 *     responses:
 *       200:
 *         description: List of documentation files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 docs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                         example: "getting-started.md"
 *                       title:
 *                         type: string
 *                         example: "Getting Started"
 *                       category:
 *                         type: string
 *                         example: "User Guide"
 *                       lastModified:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', listDocs);

/**
 * @swagger
 * /api/docs/search:
 *   get:
 *     summary: Search documentation
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     description: Search through documentation content
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "authentication"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       title:
 *                         type: string
 *                       excerpt:
 *                         type: string
 *                         description: Text snippet containing the search term
 *                       relevance:
 *                         type: number
 *                         description: Search relevance score
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Unauthorized
 */
router.get('/search', searchDocs);

/**
 * @swagger
 * /api/docs/category/{category}:
 *   get:
 *     summary: Get documentation by category
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all documentation files in a specific category
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Documentation category
 *         example: "user-guide"
 *     responses:
 *       200:
 *         description: Documentation files in category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 category:
 *                   type: string
 *                 docs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       title:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/category/:category', getDocsByCategory);

/**
 * @swagger
 * /api/docs/{path}:
 *   get:
 *     summary: Get specific documentation file
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve and render a specific documentation file (supports nested paths)
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Path to documentation file (e.g., "user-guide/getting-started.md")
 *         example: "getting-started.md"
 *     responses:
 *       200:
 *         description: Documentation content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 doc:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                       description: Rendered HTML content from markdown
 *                     category:
 *                       type: string
 *                     lastModified:
 *                       type: string
 *                       format: date-time
 *                     tableOfContents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           level:
 *                             type: integer
 *                           text:
 *                             type: string
 *                           id:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Documentation file not found
 */
router.get('/*', getDoc);

export default router;
