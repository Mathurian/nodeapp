/**
 * Documentation Controller
 * Provides browser-based access to application documentation
 *
 * Features:
 * - List all documentation files
 * - Retrieve specific documentation content
 * - Search documentation
 * - Navigate documentation hierarchy
 */

import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';

const log = createLogger('docsController');

// Documentation root directory
const DOCS_ROOT = path.join(__dirname, '../../docs');

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.md', '.txt'];

// Cache for documentation metadata
let docsMetadataCache: DocMetadata[] | null = null;
let docsCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface DocMetadata {
  path: string;
  name: string;
  title: string;
  size: number;
  modified: Date;
  category: string;
  order: number;
}

interface DocNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: DocNode[];
  size?: number;
  modified?: Date;
  title?: string;
}

/**
 * Sanitize and validate file path to prevent directory traversal
 */
function sanitizePath(userPath: string): string {
  // Remove any path traversal attempts
  const sanitized = userPath.replace(/\.\./g, '').replace(/\/\//g, '/');

  // Ensure it starts with a valid category or root
  const validPaths = [
    '00-getting-started',
    '01-architecture',
    '02-features',
    '03-administration',
    '04-development',
    '05-deployment',
    '06-phase-implementations',
    '07-api',
    '08-security',
    '09-performance',
    '10-reference',
    'outmoded',
    '',
  ];

  const pathParts = sanitized.split('/').filter(p => p);
  if (pathParts.length > 0) {
    const topLevel = pathParts[0]!;
    // Allow root-level markdown files (e.g., INDEX.md, README.md)
    const isRootFile = pathParts.length === 1 && topLevel.match(/\.(md|txt)$/i);
    if (!isRootFile && !validPaths.includes(topLevel)) {
      throw new Error('Invalid documentation path');
    }
  }

  return sanitized;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  // Look for first # heading
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'Untitled';
}

/**
 * Get category order (for sorting)
 */
function getCategoryOrder(category: string): number {
  const order: Record<string, number> = {
    '00-getting-started': 0,
    '01-architecture': 1,
    '02-features': 2,
    '03-administration': 3,
    '04-development': 4,
    '05-deployment': 5,
    '06-phase-implementations': 6,
    '07-api': 7,
    '08-security': 8,
    '09-performance': 9,
    '10-reference': 10,
    'outmoded': 99,
  };
  return order[category] ?? 50;
}

/**
 * Recursively scan documentation directory
 */
async function scanDirectory(dir: string, relativePath: string = ''): Promise<DocNode[]> {
  const nodes: DocNode[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      // Skip hidden files and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        const children = await scanDirectory(fullPath, relPath);
        nodes.push({
          name: entry.name,
          path: relPath,
          type: 'folder',
          children,
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const title = extractTitle(content);

          nodes.push({
            name: entry.name,
            path: relPath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime,
            title,
          });
        }
      }
    }
  } catch (error) {
    log.error('Error scanning directory', { dir, error });
  }

  return nodes.sort((a, b) => {
    // Folders first, then files
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Alphabetical within type
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get all documentation metadata
 */
async function getDocsMetadata(): Promise<DocMetadata[]> {
  // Check cache
  const now = Date.now();
  if (docsMetadataCache && now - docsCacheTime < CACHE_TTL) {
    return docsMetadataCache;
  }

  const metadata: DocMetadata[] = [];

  async function traverse(dir: string, relativePath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        await traverse(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ALLOWED_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          const title = extractTitle(content);
          const category = relativePath.split('/')[0] || 'root';

          metadata.push({
            path: relPath,
            name: entry.name,
            title,
            size: stats.size,
            modified: stats.mtime,
            category,
            order: getCategoryOrder(category),
          });
        }
      }
    }
  }

  await traverse(DOCS_ROOT);

  // Sort by category order, then name
  metadata.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.path.localeCompare(b.path);
  });

  // Update cache
  docsMetadataCache = metadata;
  docsCacheTime = now;

  return metadata;
}

/**
 * List all documentation files
 * GET /api/docs
 */
export async function listDocs(req: Request, res: Response): Promise<void> {
  try {
    log.info('Listing documentation files', { userId: req.user?.id });

    const tree = await scanDirectory(DOCS_ROOT);
    const metadata = await getDocsMetadata();

    res.json({
      success: true,
      data: {
        tree,
        flat: metadata,
        totalFiles: metadata.length,
        categories: Array.from(new Set(metadata.map(m => m.category))),
      },
    });
  } catch (error) {
    log.error('Error listing documentation', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to list documentation files',
    });
  }
}

/**
 * Get specific documentation file
 * GET /api/docs/:path(*)
 */
export async function getDoc(req: Request, res: Response): Promise<void> {
  try {
    const userPath = req.params['path'] || req.params[0] || '';
    const sanitized = sanitizePath(userPath);

    // Ensure .md extension if not provided
    const filePath = sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`;
    const fullPath = path.join(DOCS_ROOT, filePath);

    log.info('Retrieving documentation', {
      path: filePath,
      userId: req.user?.id
    });

    // Verify file exists and is within docs directory
    const realPath = await fs.realpath(fullPath);
    const realDocsRoot = await fs.realpath(DOCS_ROOT);

    if (!realPath.startsWith(realDocsRoot)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // Read file
    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const title = extractTitle(content);

    res.json({
      success: true,
      data: {
        path: filePath,
        title,
        content,
        size: stats.size,
        modified: stats.mtime,
      },
    });
  } catch (error: unknown) {
    const errorObj = error as { code?: string };
    if (errorObj.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        message: 'Documentation file not found',
      });
    } else {
      log.error('Error retrieving documentation', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve documentation',
      });
    }
  }
}

/**
 * Search documentation
 * GET /api/docs/search?q=query
 */
export async function searchDocs(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query['q'] as string;

    if (!query || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
      return;
    }

    log.info('Searching documentation', {
      query,
      userId: req.user?.id
    });

    const metadata = await getDocsMetadata();
    const searchLower = query.toLowerCase();
    const results: any[] = [];

    // Search in titles and content
    for (const doc of metadata) {
      const fullPath = path.join(DOCS_ROOT, doc.path);
      const content = await fs.readFile(fullPath, 'utf-8');

      // Check title match
      const titleMatch = doc.title.toLowerCase().includes(searchLower);

      // Check content match
      const contentLower = content.toLowerCase();
      const contentMatch = contentLower.includes(searchLower);

      if (titleMatch || contentMatch) {
        // Extract context around match
        let context = '';
        if (contentMatch) {
          const index = contentLower.indexOf(searchLower);
          const start = Math.max(0, index - 100);
          const end = Math.min(content.length, index + 100);
          context = content.substring(start, end).replace(/\n/g, ' ');
        }

        results.push({
          path: doc.path,
          title: doc.title,
          category: doc.category,
          relevance: titleMatch ? 2 : 1,
          context: context || doc.title,
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    res.json({
      success: true,
      data: {
        query,
        results,
        totalResults: results.length,
      },
    });
  } catch (error) {
    log.error('Error searching documentation', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to search documentation',
    });
  }
}

/**
 * Get documentation by category
 * GET /api/docs/category/:category
 */
export async function getDocsByCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = req.params['category'];

    log.info('Retrieving documentation by category', {
      category,
      userId: req.user?.id
    });

    const metadata = await getDocsMetadata();
    const filtered = metadata.filter(m => m.category === category);

    res.json({
      success: true,
      data: {
        category,
        docs: filtered,
        totalDocs: filtered.length,
      },
    });
  } catch (error) {
    log.error('Error retrieving documentation by category', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documentation',
    });
  }
}
