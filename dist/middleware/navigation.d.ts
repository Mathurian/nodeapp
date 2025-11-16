import { Request, Response, NextFunction } from 'express';
declare const getNavigationItems: (userRole: string) => any[];
declare const getRoutePermissions: (route: string, userRole: string) => {
    allowed: boolean;
    reason: string;
};
declare const canAccessFeature: (feature: string, userRole: string) => boolean;
declare const getUserFeatures: (userRole: string) => string[];
declare const checkNavigationPermission: (req: Request, res: Response, next: NextFunction) => void;
declare const getNavigationData: (req: Request, res: Response) => Promise<void>;
export { getNavigationItems, getRoutePermissions, canAccessFeature, getUserFeatures, checkNavigationPermission, getNavigationData };
//# sourceMappingURL=navigation.d.ts.map