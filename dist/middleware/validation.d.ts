import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
type ValidationTarget = 'body' | 'query' | 'params';
export declare function validate(schema: ZodSchema, target?: ValidationTarget): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function validateMultiple(schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const idParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
}, {
    id?: string;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    page?: number;
}, {
    limit?: number;
    page?: number;
}>;
export declare const createUserSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodEnum<["ADMIN", "EVENT_MANAGER", "JUDGE", "CONTESTANT", "EMCEE", "TALLY_MASTER", "AUDITOR", "BOARD_MEMBER"]>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    role?: "ADMIN" | "JUDGE" | "CONTESTANT" | "EMCEE" | "TALLY_MASTER" | "AUDITOR" | "EVENT_MANAGER" | "BOARD_MEMBER";
    username?: string;
    firstName?: string;
    lastName?: string;
}, {
    email?: string;
    password?: string;
    role?: "ADMIN" | "JUDGE" | "CONTESTANT" | "EMCEE" | "TALLY_MASTER" | "AUDITOR" | "EVENT_MANAGER" | "BOARD_MEMBER";
    username?: string;
    firstName?: string;
    lastName?: string;
}>;
export declare const updateUserSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "EVENT_MANAGER", "JUDGE", "CONTESTANT", "EMCEE", "TALLY_MASTER", "AUDITOR", "BOARD_MEMBER"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    role?: "ADMIN" | "JUDGE" | "CONTESTANT" | "EMCEE" | "TALLY_MASTER" | "AUDITOR" | "EVENT_MANAGER" | "BOARD_MEMBER";
    isActive?: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
}, {
    email?: string;
    role?: "ADMIN" | "JUDGE" | "CONTESTANT" | "EMCEE" | "TALLY_MASTER" | "AUDITOR" | "EVENT_MANAGER" | "BOARD_MEMBER";
    isActive?: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
}>;
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password?: string;
    username?: string;
}, {
    password?: string;
    username?: string;
}>;
export declare const changePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword?: string;
    currentPassword?: string;
    confirmPassword?: string;
}, {
    newPassword?: string;
    currentPassword?: string;
    confirmPassword?: string;
}>, {
    newPassword?: string;
    currentPassword?: string;
    confirmPassword?: string;
}, {
    newPassword?: string;
    currentPassword?: string;
    confirmPassword?: string;
}>;
export declare const createEventSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    endDate: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    location: z.ZodOptional<z.ZodString>;
    maxContestants: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    location?: string;
    maxContestants?: number;
}, {
    name?: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    location?: string;
    maxContestants?: number;
}>, {
    name?: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    location?: string;
    maxContestants?: number;
}, {
    name?: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    location?: string;
    maxContestants?: number;
}>;
export declare const updateEventSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    location: z.ZodOptional<z.ZodString>;
    maxContestants: z.ZodOptional<z.ZodNumber>;
    archived: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    archived?: boolean;
    location?: string;
    maxContestants?: number;
}, {
    name?: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    archived?: boolean;
    location?: string;
    maxContestants?: number;
}>;
export declare const createScoreSchema: z.ZodObject<{
    judgeId: z.ZodString;
    contestantId: z.ZodString;
    categoryId: z.ZodString;
    contestId: z.ZodString;
    value: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    judgeId?: string;
    contestantId?: string;
    categoryId?: string;
    contestId?: string;
    value?: number;
}, {
    judgeId?: string;
    contestantId?: string;
    categoryId?: string;
    contestId?: string;
    value?: number;
}>;
export declare const updateScoreSchema: z.ZodObject<{
    value: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    value?: number;
}, {
    value?: number;
}>;
export declare const searchQuerySchema: z.ZodObject<{
    q: z.ZodString;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    page?: number;
    q?: string;
}, {
    limit?: number;
    page?: number;
    q?: string;
}>;
export declare const dateRangeSchema: z.ZodEffects<z.ZodObject<{
    startDate: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    endDate: z.ZodUnion<[z.ZodString, z.ZodDate]>;
}, "strip", z.ZodTypeAny, {
    startDate?: string | Date;
    endDate?: string | Date;
}, {
    startDate?: string | Date;
    endDate?: string | Date;
}>, {
    startDate?: string | Date;
    endDate?: string | Date;
}, {
    startDate?: string | Date;
    endDate?: string | Date;
}>;
export declare const createContestSchema: z.ZodObject<{
    eventId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    archived: z.ZodOptional<z.ZodBoolean>;
    contestantNumberingMode: z.ZodOptional<z.ZodEnum<["MANUAL", "AUTOMATIC"]>>;
    nextContestantNumber: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    archived?: boolean;
    contestantNumberingMode?: "MANUAL" | "AUTOMATIC";
    eventId?: string;
    nextContestantNumber?: number;
}, {
    name?: string;
    description?: string;
    archived?: boolean;
    contestantNumberingMode?: "MANUAL" | "AUTOMATIC";
    eventId?: string;
    nextContestantNumber?: number;
}>;
export declare const updateContestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    archived: z.ZodOptional<z.ZodBoolean>;
    contestantNumberingMode: z.ZodOptional<z.ZodEnum<["MANUAL", "AUTOMATIC"]>>;
    nextContestantNumber: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    archived?: boolean;
    contestantNumberingMode?: "MANUAL" | "AUTOMATIC";
    nextContestantNumber?: number;
}, {
    name?: string;
    description?: string;
    archived?: boolean;
    contestantNumberingMode?: "MANUAL" | "AUTOMATIC";
    nextContestantNumber?: number;
}>;
export declare const createCategorySchema: z.ZodObject<{
    contestId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    scoreCap: z.ZodOptional<z.ZodNumber>;
    timeLimit: z.ZodOptional<z.ZodNumber>;
    contestantMin: z.ZodOptional<z.ZodNumber>;
    contestantMax: z.ZodOptional<z.ZodNumber>;
    totalsCertified: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    contestId?: string;
    scoreCap?: number;
    timeLimit?: number;
    contestantMin?: number;
    contestantMax?: number;
    totalsCertified?: boolean;
}, {
    name?: string;
    description?: string;
    contestId?: string;
    scoreCap?: number;
    timeLimit?: number;
    contestantMin?: number;
    contestantMax?: number;
    totalsCertified?: boolean;
}>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    scoreCap: z.ZodOptional<z.ZodNumber>;
    timeLimit: z.ZodOptional<z.ZodNumber>;
    contestantMin: z.ZodOptional<z.ZodNumber>;
    contestantMax: z.ZodOptional<z.ZodNumber>;
    totalsCertified: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    scoreCap?: number;
    timeLimit?: number;
    contestantMin?: number;
    contestantMax?: number;
    totalsCertified?: boolean;
}, {
    name?: string;
    description?: string;
    scoreCap?: number;
    timeLimit?: number;
    contestantMin?: number;
    contestantMax?: number;
    totalsCertified?: boolean;
}>;
export {};
//# sourceMappingURL=validation.d.ts.map