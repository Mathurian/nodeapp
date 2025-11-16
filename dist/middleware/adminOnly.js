"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const userRole = String(req.user.role).trim().toUpperCase();
    if (userRole === 'ADMIN') {
        next();
        return;
    }
    res.status(403).json({ error: 'Admin access required' });
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=adminOnly.js.map