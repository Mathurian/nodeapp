/**
 * Password Validation and Complexity Enforcement
 * Enforces password complexity requirements based on environment configuration
 */

interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecial: boolean
}

interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'
}

/**
 * Get password requirements from environment variables
 */
export const getPasswordRequirements = (): PasswordRequirements => {
  return {
    minLength: parseInt(env.get('PASSWORD_MIN_LENGTH') || '8', 10),
    requireUppercase: env.get('PASSWORD_REQUIRE_UPPERCASE') === 'true',
    requireLowercase: env.get('PASSWORD_REQUIRE_LOWERCASE') === 'true',
    requireNumber: env.get('PASSWORD_REQUIRE_NUMBER') === 'true',
    requireSpecial: env.get('PASSWORD_REQUIRE_SPECIAL') === 'true'
  }
}

/**
 * Validate password against complexity requirements
 * @param password - The password to validate
 * @param requirements - Password requirements (uses env config if not provided)
 * @returns Validation result with errors and strength assessment
 */
export const validatePassword = (
  password: string,
  requirements?: PasswordRequirements
): PasswordValidationResult => {
  const reqs = requirements || getPasswordRequirements()
  const errors: string[] = []

  // Check if password exists
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 'weak'
    }
  }

  // Check minimum length
  if (password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters long`)
  }

  // Check for uppercase letters
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check for lowercase letters
  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check for numbers
  if (reqs.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check for special characters
  if (reqs.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)')
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password', 'Password', 'password1', 'Password1', 'Password123',
    '12345678', '123456789', 'qwerty', 'abc123', 'letmein', 'welcome',
    'admin', 'Admin123', 'pass123', 'test123'
  ]

  if (weakPasswords.includes(password)) {
    errors.push('Password is too common. Please choose a more unique password')
  }

  // Check for repeated characters (3 or more in a row)
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain 3 or more repeated characters in a row')
  }

  // Calculate password strength
  const strength = calculatePasswordStrength(password)

  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

/**
 * Calculate password strength score
 * @param password - The password to assess
 * @returns Strength rating
 */
export const calculatePasswordStrength = (
  password: string
): 'weak' | 'fair' | 'good' | 'strong' | 'very-strong' => {
  if (!password) return 'weak'

  let score = 0

  // Length score (up to 30 points)
  if (password.length >= 8) score += 10
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10

  // Character variety (up to 40 points)
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/\d/.test(password)) score += 10
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10

  // Complexity bonus (up to 30 points)
  // Mixed case
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10

  // Multiple character types
  const types = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ].filter(Boolean).length

  if (types >= 3) score += 10
  if (types === 4) score += 10

  // Determine strength based on score
  if (score >= 80) return 'very-strong'
  if (score >= 60) return 'strong'
  if (score >= 40) return 'good'
  if (score >= 20) return 'fair'
  return 'weak'
}

/**
 * Check if password is similar to user information
 * @param password - The password to check
 * @param userInfo - User information (name, email, username, etc.)
 * @returns True if password is too similar to user info
 */
export const isPasswordSimilarToUserInfo = (
  password: string,
  userInfo: {
    name?: string
    email?: string
    username?: string
  }
): boolean => {
  if (!password) return false

  const lowerPassword = password.toLowerCase()

  // Check against name
  if (userInfo.name) {
    const nameParts = userInfo.name.toLowerCase().split(/\s+/)
    for (const part of nameParts) {
      if (part.length >= 3 && lowerPassword.includes(part)) {
        return true
      }
    }
  }

  // Check against email (username part)
  if (userInfo.email) {
    const emailUsername = userInfo.email.split('@')[0]?.toLowerCase()
    if (emailUsername.length >= 3 && lowerPassword.includes(emailUsername)) {
      return true
    }
  }

  // Check against username
  if (userInfo.username) {
    const username = userInfo.username.toLowerCase()
    if (username.length >= 3 && lowerPassword.includes(username)) {
      return true
    }
  }

  return false
}

/**
 * Generate a strong random password
 * @param length - Desired password length (default: 16)
 * @returns Randomly generated strong password
 */
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{};\':"|,.<>/?'

  const allChars = uppercase + lowercase + numbers + special

  // Ensure at least one character from each category
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Format password requirements as human-readable message
 * @param requirements - Password requirements
 * @returns Human-readable string
 */
export const formatPasswordRequirements = (
  requirements?: PasswordRequirements
): string => {
  const reqs = requirements || getPasswordRequirements()
  const messages: string[] = []

  messages.push(`At least ${reqs.minLength} characters long`)

  if (reqs.requireUppercase) {
    messages.push('At least one uppercase letter')
  }

  if (reqs.requireLowercase) {
    messages.push('At least one lowercase letter')
  }

  if (reqs.requireNumber) {
    messages.push('At least one number')
  }

  if (reqs.requireSpecial) {
    messages.push('At least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)')
  }

  return 'Password must contain: ' + messages.join(', ')
}

export default {
  validatePassword,
  calculatePasswordStrength,
  isPasswordSimilarToUserInfo,
  generateStrongPassword,
  getPasswordRequirements,
  formatPasswordRequirements
}
