export declare const hasCategoryAssignment: (userId: string, role: string, categoryId: string) => Promise<boolean>;
export declare const hasContestAssignment: (userId: string, role: string, contestId: string) => Promise<boolean>;
export declare const hasEventAssignment: (userId: string, role: string, eventId: string) => Promise<boolean>;
export declare const validateCategoryAssignment: (userId: string, userRole: string, categoryId: string) => Promise<void>;
export declare const validateContestAssignment: (userId: string, userRole: string, contestId: string) => Promise<void>;
//# sourceMappingURL=roleAssignmentCheck.d.ts.map