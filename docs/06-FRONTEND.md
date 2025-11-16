# Frontend Documentation

Complete frontend architecture documentation for the Event Manager React application.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Application Structure](#application-structure)
- [Pages](#pages)
- [Components](#components)
- [State Management](#state-management)
- [Routing](#routing)
- [API Integration](#api-integration)
- [Real-Time Features](#real-time-features)
- [Styling](#styling)
- [Accessibility](#accessibility)

## Overview

The Event Manager frontend is a modern React 18 single-page application built with TypeScript, Vite, and Tailwind CSS. It provides a responsive, accessible, and performant user interface for all user roles.

**Key Features**:
- Progressive Web App (PWA) with offline support
- Real-time updates via WebSocket
- Role-based UI rendering
- WCAG 2.1 AA accessibility compliance
- Mobile-responsive design
- Dark mode support
- Code splitting and lazy loading

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI library |
| TypeScript | 5.2 | Type safety |
| Vite | 5.0 | Build tool |
| React Router | 6.8 | Routing |
| Tailwind CSS | 3.3 | Styling |
| React Query | 3.39 | Server state |
| Socket.IO Client | 4.7 | Real-time |
| Axios | 1.6 | HTTP client |
| Heroicons | 2.1 | Icons |

## Application Structure

```
frontend/src/
├── App.tsx                 # Root component
├── main.tsx                # Entry point
├── index.css               # Global styles
├── components/             # Reusable components (80+)
├── pages/                  # Page components (40+)
├── contexts/               # React contexts (6)
├── hooks/                  # Custom hooks (10+)
├── services/               # API services
├── utils/                  # Utility functions
├── types/                  # TypeScript types
└── constants/              # Constants
```

## Pages

### Public Pages

**LoginPage** (`/login`)
- Email/password login
- MFA support
- "Remember me" option
- Password strength indicator
- Error handling

**ForgotPasswordPage** (`/forgot-password`)
- Email input for reset
- Rate limiting feedback
- Success confirmation

**ResetPasswordPage** (`/reset-password`)
- Token validation
- Password reset form
- Strength requirements

### Protected Pages

**EventsPage** (`/events`)
- List all events
- Create/edit/delete events
- Search and filter
- Archive management

**ContestsPage** (`/contests/:id`)
- Contest listing
- Create/edit contests
- Assign judges/contestants
- Category management

**CategoriesPage** (`/categories/:id`)
- Category details
- Scoring criteria setup
- Judge/contestant assignment
- Certification status

**ScoringPage** (`/scoring`)
- Judge score entry interface
- Contestant list
- Criteria-based scoring
- Comment entry
- Real-time validation

**ResultsPage** (`/results`)
- View contest results
- Filter by category
- Export options
- Winner display

**AdminPage** (`/admin`)
- System overview
- User management
- Settings configuration
- Database browser
- Cache management

**AuditorPage** (`/auditor`)
- Score audit interface
- Certification workflow
- Discrepancy flagging
- Audit reports

**TallyMasterPage** (`/tally`)
- Score verification
- Calculation checks
- Tally reports
- Certification

**BoardPage** (`/board`)
- Final approval interface
- Winner approval
- Comprehensive reports
- Sign-off workflow

## Components

### Layout Components

**Layout**
Main application shell with navigation

Features:
- Top navigation bar
- Sidebar (desktop)
- Bottom navigation (mobile)
- Breadcrumbs
- User menu

**TopNavigation**
Header with app branding and user actions

**BottomNavigation**
Mobile-friendly bottom nav

**Sidebar**
Desktop navigation sidebar

### Data Display Components

**DataTable**
Reusable table with sorting, filtering, pagination

Props:
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  pagination?: PaginationConfig;
}
```

**ResponsiveDataTable**
Mobile-optimized data table

**Modal**
Accessible modal dialog

Props:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

### Form Components

**FormField**
Standardized form field wrapper

**MobileFormField**
Touch-optimized form field

**PasswordStrengthMeter**
Visual password strength indicator

### Scoring Components

**CategoryEditor**
Category configuration interface

**CertificationWorkflow**
Multi-stage certification display

**CategoryCertificationView**
Certification status view

### Notification Components

**RealTimeNotifications**
Live notification display

**NotificationCenter**
Notification management

## State Management

### Context API

**AuthContext**
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

**ThemeContext**
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}
```

**SocketContext**
```typescript
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
}
```

**ToastContext**
```typescript
interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}
```

### React Query

Server state managed with React Query:

```typescript
// Example: Fetch events
const { data, isLoading, error } = useQuery(
  ['events', tenantId],
  () => fetchEvents(tenantId),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }
);
```

## Routing

### Route Structure

```typescript
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  
  {/* Protected routes */}
  <Route path="/*" element={
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/events" element={<EventsPage />} />
          
          {/* Role-protected routes */}
          <Route path="/admin" element={
            <RoleProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPage />
            </RoleProtectedRoute>
          } />
        </Routes>
      </Layout>
    </ProtectedRoute>
  } />
</Routes>
```

### Route Guards

**ProtectedRoute**
Requires authentication

**RoleProtectedRoute**
Requires specific role(s)

Props:
```typescript
interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}
```

## API Integration

### API Client Setup

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### API Service Pattern

```typescript
// services/eventService.ts
export const eventService = {
  async getAll(tenantId: string) {
    const { data } = await api.get(`/events?tenantId=${tenantId}`);
    return data.data;
  },
  
  async create(eventData: CreateEventDto) {
    const { data } = await api.post('/events', eventData);
    return data.data;
  },
  
  async update(id: string, eventData: UpdateEventDto) {
    const { data } = await api.put(`/events/${id}`, eventData);
    return data.data;
  },
};
```

## Real-Time Features

### Socket Connection

```typescript
// contexts/SocketContext.tsx
const socket = io(import.meta.env.VITE_WS_URL, {
  auth: {
    token: authToken,
  },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('score:updated', (data) => {
  // Handle score update
  queryClient.invalidateQueries(['scores', data.categoryId]);
});
```

### Event Handling

```typescript
// Use in components
const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;
  
  const handleScoreUpdate = (data: ScoreUpdate) => {
    // Update UI
  };
  
  socket.on('score:updated', handleScoreUpdate);
  
  return () => {
    socket.off('score:updated', handleScoreUpdate);
  };
}, [socket]);
```

## Styling

### Tailwind CSS

Utility-first CSS framework

**Configuration** (`tailwind.config.js`):
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...},
      },
    },
  },
  plugins: [],
};
```

### Design System

**Colors**:
- Primary: Blue shades
- Secondary: Indigo shades
- Success: Green
- Warning: Yellow
- Error: Red
- Neutral: Gray scale

**Typography**:
- Font family: Inter (sans-serif)
- Scale: text-xs to text-6xl
- Weights: normal, medium, semibold, bold

**Spacing**:
- Base: 0.25rem (4px)
- Scale: 0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Dark Mode

Toggle via ThemeContext:
```typescript
const { theme, toggleTheme } = useTheme();
```

Implemented with Tailwind's `dark:` variant:
```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

## Accessibility

### WCAG 2.1 AA Compliance

**Features**:
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast (4.5:1 minimum)

### Keyboard Navigation

**Shortcuts**:
```typescript
// hooks/useKeyboardShortcut.ts
useKeyboardShortcut('ctrl+k', openCommandPalette);
useKeyboardShortcut('ctrl+/', showShortcuts);
useKeyboardShortcut('escape', closeModal);
```

### Screen Readers

```jsx
<button
  aria-label="Close modal"
  aria-describedby="modal-description"
  onClick={handleClose}
>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

### Focus Management

```typescript
// hooks/useFocusManagement.ts
const { focusTrap, returnFocus } = useFocusManagement();

// Apply to modals
<Modal ref={focusTrap}>...</Modal>
```

---

**Next**: [Security Documentation](07-SECURITY.md)
