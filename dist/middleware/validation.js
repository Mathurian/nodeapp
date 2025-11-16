"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorySchema = exports.createCategorySchema = exports.updateContestSchema = exports.createContestSchema = exports.dateRangeSchema = exports.searchQuerySchema = exports.updateScoreSchema = exports.createScoreSchema = exports.updateEventSchema = exports.createEventSchema = exports.changePasswordSchema = exports.loginSchema = exports.updateUserSchema = exports.createUserSchema = exports.paginationSchema = exports.idParamSchema = void 0;
exports.validate = validate;
exports.validateMultiple = validateMultiple;
const zod_1 = require("zod");
const responseHelpers_1 = require("../utils/responseHelpers");
function validate(schema, target = 'body') {
    return async (req, res, next) => {
        try {
            const data = req[target];
            const validated = await schema.parseAsync(data);
            req[target] = validated;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const validationErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    value: err.path.reduce((obj, key) => obj?.[key], req[target]),
                    rule: err.code
                }));
                (0, responseHelpers_1.sendValidationError)(res, validationErrors);
                return;
            }
            next(error);
        }
    };
}
function validateMultiple(schemas) {
    return async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const validationErrors = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    rule: err.code
                }));
                (0, responseHelpers_1.sendValidationError)(res, validationErrors);
                return;
            }
            next(error);
        }
    };
}
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().cuid('Invalid ID format')
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10)
});
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1).max(50),
    lastName: zod_1.z.string().min(1).max(50),
    role: zod_1.z.enum(['ADMIN', 'EVENT_MANAGER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD_MEMBER'])
});
exports.updateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
    email: zod_1.z.string().email().optional(),
    firstName: zod_1.z.string().min(1).max(50).optional(),
    lastName: zod_1.z.string().min(1).max(50).optional(),
    role: zod_1.z.enum(['ADMIN', 'EVENT_MANAGER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD_MEMBER']).optional(),
    isActive: zod_1.z.boolean().optional()
});
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: zod_1.z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});
exports.createEventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    endDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    location: zod_1.z.string().optional(),
    maxContestants: zod_1.z.number().int().positive().optional()
}).refine(data => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
}, {
    message: 'End date must be after start date',
    path: ['endDate']
});
exports.updateEventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    endDate: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    location: zod_1.z.string().optional(),
    maxContestants: zod_1.z.number().int().positive().optional(),
    archived: zod_1.z.boolean().optional()
});
exports.createScoreSchema = zod_1.z.object({
    judgeId: zod_1.z.string().cuid(),
    contestantId: zod_1.z.string().cuid(),
    categoryId: zod_1.z.string().cuid(),
    contestId: zod_1.z.string().cuid(),
    value: zod_1.z.number().min(0).max(100)
});
exports.updateScoreSchema = zod_1.z.object({
    value: zod_1.z.number().min(0).max(100)
});
exports.searchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(1, 'Search query is required'),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10)
});
exports.dateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().or(zod_1.z.date()),
    endDate: zod_1.z.string().datetime().or(zod_1.z.date())
}).refine(data => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
}, {
    message: 'End date must be after start date',
    path: ['endDate']
});
exports.createContestSchema = zod_1.z.object({
    eventId: zod_1.z.string().cuid('Invalid event ID format'),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    archived: zod_1.z.boolean().optional(),
    contestantNumberingMode: zod_1.z.enum(['MANUAL', 'AUTOMATIC']).optional(),
    nextContestantNumber: zod_1.z.number().int().positive().optional()
});
exports.updateContestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    archived: zod_1.z.boolean().optional(),
    contestantNumberingMode: zod_1.z.enum(['MANUAL', 'AUTOMATIC']).optional(),
    nextContestantNumber: zod_1.z.number().int().positive().optional()
});
exports.createCategorySchema = zod_1.z.object({
    contestId: zod_1.z.string().cuid('Invalid contest ID format'),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    scoreCap: zod_1.z.number().int().positive().optional(),
    timeLimit: zod_1.z.number().int().positive().optional(),
    contestantMin: zod_1.z.number().int().positive().optional(),
    contestantMax: zod_1.z.number().int().positive().optional(),
    totalsCertified: zod_1.z.boolean().optional()
});
exports.updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    scoreCap: zod_1.z.number().int().positive().optional(),
    timeLimit: zod_1.z.number().int().positive().optional(),
    contestantMin: zod_1.z.number().int().positive().optional(),
    contestantMax: zod_1.z.number().int().positive().optional(),
    totalsCertified: zod_1.z.boolean().optional()
});
//# sourceMappingURL=validation.js.map