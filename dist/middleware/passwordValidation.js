"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePasswordPolicy = exports.getPasswordPolicy = exports.validatePassword = exports.validatePasswordStaticMiddleware = exports.validatePasswordStatic = exports.passwordSchema = void 0;
const zod_1 = require("zod");
const prisma = require('../utils/prisma');
exports.passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
const validatePasswordStatic = (password) => {
    try {
        exports.passwordSchema.parse(password);
        return { valid: true, errors: [] };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                valid: false,
                errors: error.errors.map(e => e.message)
            };
        }
        return { valid: false, errors: ['Invalid password'] };
    }
};
exports.validatePasswordStatic = validatePasswordStatic;
const validatePasswordStaticMiddleware = (passwordField = 'password') => {
    return (req, res, next) => {
        const password = req.body[passwordField];
        if (!password) {
            res.status(400).json({
                success: false,
                error: `${passwordField} is required`
            });
            return;
        }
        const validation = (0, exports.validatePasswordStatic)(password);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                error: 'Password does not meet security requirements',
                details: validation.errors
            });
            return;
        }
        next();
    };
};
exports.validatePasswordStaticMiddleware = validatePasswordStaticMiddleware;
const validatePassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password) {
            res.status(400).json({ error: 'Password is required' });
            return;
        }
        const policy = await prisma.passwordPolicy.findFirst({
            where: { isActive: true }
        });
        if (!policy) {
            next();
            return;
        }
        const errors = [];
        if (password.length < policy.minLength) {
            errors.push(`Password must be at least ${policy.minLength} characters long`);
        }
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (policy.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        if (errors.length > 0) {
            res.status(400).json({
                error: 'Password does not meet requirements',
                details: errors
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Password validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.validatePassword = validatePassword;
const getPasswordPolicy = async (req, res) => {
    try {
        const policy = await prisma.passwordPolicy.findFirst({
            where: { isActive: true }
        });
        if (!policy) {
            res.json({
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                isActive: false
            });
            return;
        }
        res.json({
            minLength: policy.minLength,
            requireUppercase: policy.requireUppercase,
            requireLowercase: policy.requireLowercase,
            requireNumbers: policy.requireNumbers,
            requireSpecialChars: policy.requireSpecialChars,
            isActive: policy.isActive
        });
    }
    catch (error) {
        console.error('Get password policy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPasswordPolicy = getPasswordPolicy;
const updatePasswordPolicy = async (req, res) => {
    try {
        const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars, isActive } = req.body;
        await prisma.passwordPolicy.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        });
        const policy = await prisma.passwordPolicy.create({
            data: {
                minLength: minLength || 8,
                requireUppercase: requireUppercase !== false,
                requireLowercase: requireLowercase !== false,
                requireNumbers: requireNumbers !== false,
                requireSpecialChars: requireSpecialChars !== false,
                isActive: isActive !== false
            }
        });
        res.json({
            id: policy.id,
            minLength: policy.minLength,
            requireUppercase: policy.requireUppercase,
            requireLowercase: policy.requireLowercase,
            requireNumbers: policy.requireNumbers,
            requireSpecialChars: policy.requireSpecialChars,
            isActive: policy.isActive,
            createdAt: policy.createdAt
        });
    }
    catch (error) {
        console.error('Update password policy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updatePasswordPolicy = updatePasswordPolicy;
//# sourceMappingURL=passwordValidation.js.map