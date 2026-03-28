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
import { CACHE_TTL } from '../config/constants';
import {
  canAccessPublishedDoc,
  getPublishedDocPolicy,
  getPublishedDocsSections,
  isPublishedDocPath,
} from '../config/docsAccessPolicy';

const log = createLogger('docsController');

// Documentation root directory
const DOCS_ROOT = path.join(__dirname, '../../docs');

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.md', '.txt'];

// Cache for documentation metadata
let docsMetadataCache: DocMetadata[] | null = null;
let docsCacheTime: number = 0;

interface DocMetadata {
  path: string;
  name: string;
  title: string;
  description: string;
  size: number;
  modified: Date;
  category: string;
  order: number;
  sectionId: string;
  sectionTitle: string;
  sectionOrder: number;
  requiredRoles?: string[];
  isRestricted: boolean;
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
  const validPaths = ['testing', 'operations', ''];

  const pathParts = sanitized.split('/').filter(p => p);
  if (pathParts.length > 0) {
    const topLevel = pathParts[0]!;
    // Allow root-level markdown files (numbered docs like 01-ARCHITECTURE.md, INDEX.md, README.md, etc)
    const isRootFile = pathParts.length === 1 && topLevel.match(/\.(md|txt)$/i);
    // Allow numbered documentation files (e.g., 01-ARCHITECTURE, 13-ADMIN-GUIDE)
    const isNumberedDoc = topLevel.match(/^\d{2}-[A-Z-]+$/i);
    if (!isRootFile && !isNumberedDoc && !validPaths.includes(topLevel)) {
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
 * Recursively scan documentation directory
 */
async function scanDirectory(
  dir: string,
  relativePath: string = '',
  role?: string,
): Promise<DocNode[]> {
  const nodes: DocNode[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      // Skip hidden files, dependencies, and archived docs
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'outdated'
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        const children = await scanDirectory(fullPath, relPath, role);
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            path: relPath,
            type: 'folder',
            children,
          });
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ALLOWED_EXTENSIONS.includes(ext) && isPublishedDocPath(relPath) && canAccessPublishedDoc(relPath, role)) {
          const stats = await fs.stat(fullPath);
          const policy = getPublishedDocPolicy(relPath);
          if (!policy) {
            continue;
          }

          nodes.push({
            name: entry.name,
            path: relPath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime,
            title: policy.title,
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
  if (docsMetadataCache && now - docsCacheTime < CACHE_TTL.SHORT) {
    return docsMetadataCache;
  }

  const metadata: DocMetadata[] = [];

  async function traverse(dir: string, relativePath: string = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'outdated'
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await traverse(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ALLOWED_EXTENSIONS.includes(ext) && isPublishedDocPath(relPath)) {
          const policy = getPublishedDocPolicy(relPath);
          if (!policy) {
            continue;
          }
          const stats = await fs.stat(fullPath);
          const category = relativePath.split('/')[0] || 'root';

          metadata.push({
            path: relPath,
            name: entry.name,
            title: policy.title,
            description: policy.description,
            size: stats.size,
            modified: stats.mtime,
            category,
            order: policy.order,
            sectionId: policy.sectionId,
            sectionTitle: policy.sectionTitle,
            sectionOrder: policy.sectionOrder,
            requiredRoles: policy.requiredRoles,
            isRestricted: Boolean(policy.requiredRoles && policy.requiredRoles.length > 0),
          });
        }
      }
    }
  }

  await traverse(DOCS_ROOT);

  // Sort by section order, then doc order, then path
  metadata.sort((a, b) => {
    if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
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

    const role = req.user?.role;
    const tree = await scanDirectory(DOCS_ROOT, '', role);
    const metadata = (await getDocsMetadata()).filter((doc) =>
      canAccessPublishedDoc(doc.path, role),
    );
    const visibleSectionIds = new Set(metadata.map((doc) => doc.sectionId));
    const sections = getPublishedDocsSections().filter((section) =>
      visibleSectionIds.has(section.id),
    );

    res.json({
      success: true,
      data: {
        tree,
        flat: metadata,
        totalFiles: metadata.length,
        categories: Array.from(new Set(metadata.map(m => m.category))),
        sections,
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
    const policy = getPublishedDocPolicy(filePath);

    log.info('Retrieving documentation', {
      path: filePath,
      userId: req.user?.id
    });

    if (!policy) {
      res.status(404).json({
        success: false,
        message: 'Documentation file not found',
      });
      return;
    }

    if (!canAccessPublishedDoc(filePath, req.user?.role)) {
      const isAuthenticated = Boolean(req.user);
      res.status(isAuthenticated ? 403 : 401).json({
        success: false,
        message: isAuthenticated ? 'Access denied' : 'Authentication required',
      });
      return;
    }

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

    res.json({
      success: true,
      data: {
        path: filePath,
        title: policy.title || extractTitle(content),
        content,
        description: policy.description,
        sectionId: policy.sectionId,
        sectionTitle: policy.sectionTitle,
        requiredRoles: policy.requiredRoles || [],
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

    const metadata = (await getDocsMetadata()).filter((doc) =>
      canAccessPublishedDoc(doc.path, req.user?.role),
    );
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
          sectionId: doc.sectionId,
          sectionTitle: doc.sectionTitle,
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

    const metadata = (await getDocsMetadata()).filter((doc) =>
      canAccessPublishedDoc(doc.path, req.user?.role),
    );
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
