import { Request, Response, NextFunction } from 'express';
export declare class SearchController {
    private searchService;
    constructor();
    search: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    searchByType: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSuggestions: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getPopularSearches: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getTrendingSearches: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    saveSearch: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSavedSearches: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteSavedSearch: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    executeSavedSearch: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSearchHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    clearSearchHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const search: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const searchByType: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getSuggestions: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getPopularSearches: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getTrendingSearches: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const saveSearch: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getSavedSearches: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deleteSavedSearch: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const executeSavedSearch: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getSearchHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const clearSearchHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=searchController.d.ts.map