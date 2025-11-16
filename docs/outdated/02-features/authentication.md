# Authentication & Session Management

**Feature Category:** Security
**Status:** ✅ Complete
**Version:** 2.0

---

## Overview

The Event Manager implements a comprehensive JWT-based authentication system with role-based access control, session management, and security best practices.

---

## Authentication Methods

### 1. Email/Password Authentication

**Primary authentication method** for all users.

**Process:**
1. User provides email and password
2. Server validates credentials
3. Password is compared using bcrypt
4. JWT token generated on successful authentication
5. Token and user data returned to client

**API Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clxxx123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "JUDGE",
      "sessionVersion": 1
    }
  }
}
```

---

## JWT Token Structure

### Token Composition

Tokens contain:
- **User ID**: Unique identifier
- **Email**: User's email address
- **Role**: User's primary role
- **Session Version**: For token invalidation
- **Issued At (iat)**: Token creation timestamp
- **Expires At (exp)**: Token expiration timestamp

**Example Token Payload:**
```json
{
  "id": "clxxx123",
  "email": "user@example.com",
  "role": "JUDGE",
  "sessionVersion": 1,
  "iat": 1699800000,
  "exp": 1699803600
}
```

### Token Expiration

- **Lifetime:** 1 hour
- **Refresh:** Use refresh endpoint before expiration
- **Grace Period:** 5 minutes before hard expiration

---

## Token Refresh

### Automatic Token Refresh

**API Endpoint:** `POST /api/auth/refresh`

**Headers:**
```
Authorization: Bearer <current-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { /* user object */ }
  }
}
```

**Frontend Implementation:**
```typescript
// Automatically refresh token before expiration
const tokenExpiryTime = parseJwt(token).exp * 1000;
const refreshTime = tokenExpiryTime - (5 * 60 * 1000);  // 5 min before expiry

setTimeout(async () => {
  const newToken = await refreshToken();
  localStorage.setItem('token', newToken);
}, refreshTime - Date.now());
```

---

## Session Management

### Session Versioning

Each user has a `sessionVersion` field that increments on:
- Password change
- Forced logout
- Security-related updates

**Purpose:** Invalidate all existing tokens

**Validation:**
```typescript
// Token payload contains sessionVersion
const tokenVersion = decodedToken.sessionVersion;

// Compare with database version
const user = await prisma.user.findUnique({ where: { id } });

if (user.sessionVersion !== tokenVersion) {
  throw new Error('Session invalid - please login again');
}
```

### Session Invalidation

**Scenarios:**
1. **User logout** - Client discards token
2. **Password change** - Session version incremented
3. **Forced logout** - Admin increments session version
4. **Security breach** - All users' session versions incremented

**API Endpoint:** `POST /api/admin/force-logout`

---

## Role-Based Access Control (RBAC)

### Available Roles

| Role | Code | Description | Typical Use Case |
|------|------|-------------|------------------|
| **Admin** | `ADMIN` | Full system access | System administration |
| **Organizer** | `ORGANIZER` | Event management | Event coordinators |
| **Board** | `BOARD` | Final approvals | Board members |
| **Tally Master** | `TALLY_MASTER` | Score tallying | Score aggregation |
| **Auditor** | `AUDITOR` | Verification | Quality control |
| **Judge** | `JUDGE` | Score submission | Judging contests |
| **Contestant** | `CONTESTANT` | View own scores | Participants |

### Permission Hierarchy

```
ADMIN (Full Access)
  └─ ORGANIZER (Event Management)
      ├─ BOARD (Final Certification)
      ├─ TALLY_MASTER (Score Aggregation)
      └─ AUDITOR (Verification)
          └─ JUDGE (Score Entry)
              └─ CONTESTANT (View Only)
```

### Role Checking

**Backend Middleware:**
```typescript
// Require specific roles
router.post('/events',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  createEvent
);
```

**Frontend Component:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user, hasRole } = useAuth();

if (hasRole(['ADMIN', 'ORGANIZER'])) {
  return <CreateEventButton />;
}
```

---

## Password Security

### Password Requirements

- **Minimum length:** 8 characters
- **Complexity:** Must include:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - Special characters recommended

**Validation:**
```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');
```

### Password Hashing

**Algorithm:** bcrypt with salt rounds

**Implementation:**
```typescript
import bcrypt from 'bcrypt';

// Hashing (on registration/password change)
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verification (on login)
const isValid = await bcrypt.compare(password, user.password);
```

### Password Change

**API Endpoint:** `POST /api/auth/change-password`

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Side Effects:**
- Session version incremented
- All existing tokens invalidated
- User must re-login

---

## Account Lockout

### Failed Login Protection

**Policy:**
- **Max attempts:** 5 failed logins
- **Lockout duration:** 15 minutes
- **Reset:** Successful login or timeout

**Implementation:**
```typescript
// Track failed attempts
if (loginFailed) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: { increment: 1 },
      lastFailedLogin: new Date()
    }
  });

  if (user.failedLoginAttempts >= 5) {
    throw new Error('Account locked due to multiple failed attempts');
  }
}

// Reset on success
if (loginSuccess) {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lastLoginAt: new Date()
    }
  });
}
```

---

## Multi-Factor Authentication (MFA)

**Status:** 🚧 Planned for v2.1

**Planned Features:**
- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification codes
- Backup codes

---

## API Authentication

### Request Authentication

All protected API endpoints require authentication:

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Middleware Flow:**
1. Extract token from Authorization header
2. Verify token signature
3. Decode token payload
4. Check expiration
5. Validate session version
6. Attach user to request object

**Implementation:**
```typescript
export const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || user.sessionVersion !== decoded.sessionVersion) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## Frontend Authentication

### Auth Context

**Location:** `frontend/src/contexts/AuthContext.tsx`

**Provides:**
- `user` - Current user object
- `token` - JWT token
- `login()` - Login function
- `logout()` - Logout function
- `refreshToken()` - Token refresh function
- `hasRole()` - Role checking function
- `isAuthenticated` - Authentication status

**Usage:**
```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, hasRole, logout } = useAuth();

  if (!user) return <LoginPrompt />;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      {hasRole(['ADMIN']) && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected Routes

**Implementation:**
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}
```

**Usage:**
```typescript
<Route path="/admin" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <AdminPage />
  </ProtectedRoute>
} />
```

---

## Security Best Practices

### 1. Token Storage

**Frontend:**
- ✅ Store in memory (React state) for maximum security
- ⚠️ Store in localStorage for persistence (current implementation)
- ❌ Never store in cookies without httpOnly flag
- ❌ Never store in sessionStorage if not needed

### 2. Token Transmission

- ✅ Always use HTTPS in production
- ✅ Include token in Authorization header
- ❌ Never include token in URL parameters
- ❌ Never log tokens

### 3. Password Handling

- ✅ Hash passwords with bcrypt
- ✅ Use salt rounds >= 10
- ✅ Never store plaintext passwords
- ❌ Never log passwords
- ❌ Never transmit passwords over HTTP

### 4. Session Management

- ✅ Implement session versioning
- ✅ Expire tokens after reasonable time
- ✅ Provide token refresh mechanism
- ✅ Invalidate on password change
- ❌ Never allow infinite token lifetime

---

## Common Issues & Solutions

### Issue: "Token expired"

**Solution:** Use the refresh token endpoint:
```typescript
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${currentToken}`
  }
});
```

### Issue: "Session mismatch"

**Cause:** User's session version changed (password change, forced logout)

**Solution:** Clear local token and redirect to login:
```typescript
localStorage.removeItem('token');
window.location.href = '/login';
```

### Issue: "Account locked"

**Cause:** Too many failed login attempts

**Solution:** Wait 15 minutes or contact administrator for manual unlock

---

## Testing Authentication

### Test Users (Development Only)

```javascript
// Available in LoginPage.tsx during development
const testUsers = [
  { email: 'admin@eventmanager.com', password: 'password123', role: 'ADMIN' },
  { email: 'judge@eventmanager.com', password: 'password123', role: 'JUDGE' },
  // ... more test users
];
```

**⚠️ WARNING:** Remove test credentials before production deployment!

---

## API Endpoints Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/login` | POST | User login | No |
| `/api/auth/logout` | POST | User logout | Yes |
| `/api/auth/refresh` | POST | Refresh token | Yes |
| `/api/auth/profile` | GET | Get current user | Yes |
| `/api/auth/change-password` | POST | Change password | Yes |
| `/api/admin/force-logout` | POST | Force user logout | Yes (Admin) |

---

## Future Enhancements

### Planned for v2.1
- Multi-factor authentication (MFA)
- OAuth2 integration (Google, Microsoft)
- SSO (Single Sign-On) support
- Biometric authentication

### Under Consideration
- Passwordless authentication (magic links)
- Hardware token support (YubiKey)
- IP-based access restrictions
- Geolocation-based security

---

## Related Documentation

- [Authorization](./authorization.md) - Role-based permissions
- [Security Policy](../../SECURITY.md) - Security best practices
- [API Reference](../07-api/rest-api.md#authentication) - API endpoints

---

**Last Updated:** November 12, 2025
**Version:** 2.0
