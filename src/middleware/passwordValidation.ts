import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
const prisma = require('../utils/prisma')

/**
 * Zod-based password validation schema (static, always enforced)
 * Provides immediate validation without database lookups
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Static password validation using Zod schema
 * Returns validation result without requiring database access
 */
export const validatePasswordStatic = (password: string): { valid: boolean; errors: string[] } => {
  try {
    passwordSchema.parse(password);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => e.message)
      };
    }
    return { valid: false, errors: ['Invalid password'] };
  }
};

/**
 * Express middleware for static password validation (Zod-based)
 * Use this for immediate validation without database policy lookups
 */
export const validatePasswordStaticMiddleware = (passwordField: string = 'password') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const password = req.body[passwordField];

    if (!password) {
      res.status(400).json({
        success: false,
        error: `${passwordField} is required`
      });
      return;
    }

    const validation = validatePasswordStatic(password);

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

/**
 * Database-based password validation middleware (original)
 * Validates password against active database policy
 */
const validatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password } = req.body

    if (!password) {
      res.status(400).json({ error: 'Password is required' }); return;
    }

    // Get active password policy
    const policy = await prisma.passwordPolicy.findFirst({
      where: { isActive: true }
    })

    if (!policy) {
      // No policy set, allow any password
      next();
      return;
    }

    const errors = []

    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    }

    // Check for uppercase letters
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    // Check for lowercase letters
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    // Check for numbers
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    // Check for special characters
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    if (errors.length > 0) {
      res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: errors
      }); return;
    }

    next()
  } catch (error) {
    console.error('Password validation error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const getPasswordPolicy = async (_req: Request, res: Response): Promise<void> => {
  try {
    const policy = await prisma.passwordPolicy.findFirst({
      where: { isActive: true }
    })

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
    })
  } catch (error) {
    console.error('Get password policy error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const updatePasswordPolicy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars, isActive } = req.body

    // Deactivate all existing policies
    await prisma.passwordPolicy.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new policy
    const policy = await prisma.passwordPolicy.create({
      data: {
        minLength: minLength || 8,
        requireUppercase: requireUppercase !== false,
        requireLowercase: requireLowercase !== false,
        requireNumbers: requireNumbers !== false,
        requireSpecialChars: requireSpecialChars !== false,
        isActive: isActive !== false
      }
    })

    res.json({
      id: policy.id,
      minLength: policy.minLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumbers: policy.requireNumbers,
      requireSpecialChars: policy.requireSpecialChars,
      isActive: policy.isActive,
      createdAt: policy.createdAt
    })
  } catch (error) {
    console.error('Update password policy error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export {
  validatePassword,
  getPasswordPolicy,
  updatePasswordPolicy
 }
