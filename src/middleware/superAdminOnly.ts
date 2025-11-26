/**
 * Super Admin Only Middleware
 *
 * Ensures only Super Admins can access protected endpoints.
 * Super Admins have platform-wide administrative access.
 */

import { Request, Response, NextFunction } from 'express';

export const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!user.isSuperAdmin) {
    res.status(403).json({
      success: false,
      error: 'Super Admin access required',
      message: 'This operation requires Super Admin privileges',
    });
    return;
  }

  next();
};

export default superAdminOnly;
