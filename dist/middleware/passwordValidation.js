"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePasswordPolicy = exports.getPasswordPolicy = exports.validatePassword = void 0;
const prisma = require('../utils/prisma');
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