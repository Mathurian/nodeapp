import { Request, Response, NextFunction } from 'express';
declare const validateAssignmentCreation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const validateAssignmentUpdate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const validateAssignmentDeletion: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const validateBulkAssignmentOperation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const validateAssignmentQuery: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export { validateAssignmentCreation, validateAssignmentUpdate, validateAssignmentDeletion, validateBulkAssignmentOperation, validateAssignmentQuery };
//# sourceMappingURL=assignmentValidation.d.ts.map