"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDocs = listDocs;
exports.getDoc = getDoc;
exports.searchDocs = searchDocs;
exports.getDocsByCategory = getDocsByCategory;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('docsController');
const DOCS_ROOT = path_1.default.join(__dirname, '../../docs');
const ALLOWED_EXTENSIONS = ['.md', '.txt'];
let docsMetadataCache = null;
let docsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;
function sanitizePath(userPath) {
    const sanitized = userPath.replace(/\.\./g, '').replace(/\/\//g, '/');
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
        const topLevel = pathParts[0];
        const isRootFile = pathParts.length === 1 && topLevel.match(/\.(md|txt)$/i);
        if (!isRootFile && !validPaths.includes(topLevel)) {
            throw new Error('Invalid documentation path');
        }
    }
    return sanitized;
}
function extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
        return match[1].trim();
    }
    return 'Untitled';
}
function getCategoryOrder(category) {
    const order = {
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
async function scanDirectory(dir, relativePath = '') {
    const nodes = [];
    try {
        const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
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
            }
            else if (entry.isFile()) {
                const ext = path_1.default.extname(entry.name);
                if (ALLOWED_EXTENSIONS.includes(ext)) {
                    const stats = await fs_1.promises.stat(fullPath);
                    const content = await fs_1.promises.readFile(fullPath, 'utf-8');
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
    }
    catch (error) {
        log.error('Error scanning directory', { dir, error });
    }
    return nodes.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}
async function getDocsMetadata() {
    const now = Date.now();
    if (docsMetadataCache && now - docsCacheTime < CACHE_TTL) {
        return docsMetadataCache;
    }
    const metadata = [];
    async function traverse(dir, relativePath = '') {
        const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }
            if (entry.isDirectory()) {
                await traverse(fullPath, relPath);
            }
            else if (entry.isFile()) {
                const ext = path_1.default.extname(entry.name);
                if (ALLOWED_EXTENSIONS.includes(ext)) {
                    const stats = await fs_1.promises.stat(fullPath);
                    const content = await fs_1.promises.readFile(fullPath, 'utf-8');
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
    metadata.sort((a, b) => {
        if (a.order !== b.order)
            return a.order - b.order;
        return a.path.localeCompare(b.path);
    });
    docsMetadataCache = metadata;
    docsCacheTime = now;
    return metadata;
}
async function listDocs(req, res) {
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
    }
    catch (error) {
        log.error('Error listing documentation', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to list documentation files',
        });
    }
}
async function getDoc(req, res) {
    try {
        const userPath = req.params.path || req.params[0] || '';
        const sanitized = sanitizePath(userPath);
        const filePath = sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`;
        const fullPath = path_1.default.join(DOCS_ROOT, filePath);
        log.info('Retrieving documentation', {
            path: filePath,
            userId: req.user?.id
        });
        const realPath = await fs_1.promises.realpath(fullPath);
        const realDocsRoot = await fs_1.promises.realpath(DOCS_ROOT);
        if (!realPath.startsWith(realDocsRoot)) {
            res.status(403).json({
                success: false,
                message: 'Access denied',
            });
            return;
        }
        const content = await fs_1.promises.readFile(fullPath, 'utf-8');
        const stats = await fs_1.promises.stat(fullPath);
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
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({
                success: false,
                message: 'Documentation file not found',
            });
        }
        else {
            log.error('Error retrieving documentation', { error });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve documentation',
            });
        }
    }
}
async function searchDocs(req, res) {
    try {
        const query = req.query.q;
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
        const results = [];
        for (const doc of metadata) {
            const fullPath = path_1.default.join(DOCS_ROOT, doc.path);
            const content = await fs_1.promises.readFile(fullPath, 'utf-8');
            const titleMatch = doc.title.toLowerCase().includes(searchLower);
            const contentLower = content.toLowerCase();
            const contentMatch = contentLower.includes(searchLower);
            if (titleMatch || contentMatch) {
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
        results.sort((a, b) => b.relevance - a.relevance);
        res.json({
            success: true,
            data: {
                query,
                results,
                totalResults: results.length,
            },
        });
    }
    catch (error) {
        log.error('Error searching documentation', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to search documentation',
        });
    }
}
async function getDocsByCategory(req, res) {
    try {
        const category = req.params.category;
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
    }
    catch (error) {
        log.error('Error retrieving documentation by category', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve documentation',
        });
    }
}
//# sourceMappingURL=docsController.js.map