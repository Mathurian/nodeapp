import { Request, Response, NextFunction } from 'express';

/**
 * Admin-only middleware - ensures ADMIN users can access protected endpoints
 * This is a safeguard to prevent ADMIN access issues
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const userRole = String(req.user.role).trim().toUpperCase();
  
  // ADMIN has access to everything
  if (userRole === 'ADMIN') {
    next();
    return;
  }
  
  res.status(403).json({ error: 'Admin access required' });
};

export { requireAdmin };

