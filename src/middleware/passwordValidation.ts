import { Request, Response, NextFunction } from 'express';
const prisma = require('../utils/prisma')

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

const getPasswordPolicy = async (req: Request, res: Response): Promise<void> => {
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
