# Frontend Architecture

## Overview

The Event Manager frontend is a modern Single Page Application (SPA) built with React 18, TypeScript, and Vite. It follows component-based architecture with emphasis on reusability, type safety, and responsive design.

## Technology Stack

| Component           | Technology          | Version | Purpose                          |
|--------------------|---------------------|---------|----------------------------------|
| Framework          | React               | 18.2.x  | UI library                       |
| Build Tool         | Vite                | 5.0.x   | Build tool and dev server        |
| Language           | TypeScript          | 5.2.x   | Type-safe JavaScript             |
| Routing            | React Router        | 6.8.x   | Client-side routing              |
| Styling            | Tailwind CSS        | 3.3.x   | Utility-first CSS                |
| HTTP Client        | Axios               | 1.6.x   | API requests                     |
| State Management   | React Query         | 3.39.x  | Server state management          |
| WebSocket          | Socket.IO Client    | 4.7.x   | Real-time communication          |
| Forms              | React Hook Form     | (Context)| Form handling                   |
| Toast Notifications| React Hot Toast     | 2.6.x   | User notifications               |
| Charts             | Recharts            | 3.4.x   | Data visualization               |
| Icons              | Heroicons           | 2.1.x   | Icon library                     |

## Directory Structure

```
frontend/
├── public/                    # Static assets
│   ├── vite.svg
│   └── ...
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Root component
│   ├── index.css             # Global styles
│   ├── vite-env.d.ts         # Vite type definitions
│   │
│   ├── pages/                # Page components (43 pages)
│   │   ├── LoginPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── ScoringPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── ...
│   │
│   ├── components/           # Reusable components (63 components)
│   │   ├── Layout.tsx
│   │   ├── DataTable.tsx
│   │   ├── Modal.tsx
│   │   ├── charts/           # Chart components
│   │   ├── settings/         # Settings components
│   │   ├── bulk/             # Bulk operation components
│   │   └── ...
│   │
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   ├── ThemeContext.tsx  # Theme state
│   │   ├── SocketContext.tsx # WebSocket connection
│   │   └── ToastContext.tsx  # Toast notifications
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useSocket.ts
│   │   └── ...
│   │
│   ├── services/             # API and service layer
│   │   ├── api.ts            # API client configuration
│   │   ├── TourService.ts    # User tour service
│   │   └── tours/            # Tour configurations
│   │
│   ├── utils/                # Utility functions
│   │   ├── helpers.ts        # General helpers
│   │   ├── csrf.ts           # CSRF token handling
│   │   ├── dateUtils.ts      # Date formatting
│   │   ├── permissions.ts    # Permission checking
│   │   ├── roleRoutes.ts     # Role-based routing
│   │   └── ...
│   │
│   ├── types/                # TypeScript type definitions
│   │   └── ...
│   │
│   ├── styles/               # Style utilities
│   │   └── ...
│   │
│   └── constants/            # Application constants
│       └── ...
│
├── index.html                # HTML template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
└── postcss.config.js         # PostCSS config
```

## Architecture Patterns

### 1. Component-Based Architecture

The application is built with 63+ reusable components organized by feature and responsibility.

**Component Categories:**

1. **Page Components** (43 pages)
   - Full-page views
   - Route-level components
   - Feature-specific layouts

2. **Layout Components**
   - `Layout.tsx` - Main application layout
   - `PageSidebarLayout.tsx` - Sidebar layouts
   - `PrintLayout.tsx` - Print-specific layouts

3. **UI Components**
   - `DataTable.tsx` - Data tables with sorting/filtering
   - `Modal.tsx` - Modal dialogs
   - `Accordion.tsx` - Accordion panels
   - `Tooltip.tsx` - Tooltips
   - `LoadingSpinner.tsx` - Loading states

4. **Form Components**
   - `FormField.tsx` - Form input wrapper
   - `MobileFormField.tsx` - Mobile-optimized inputs
   - `PasswordStrengthMeter.tsx` - Password validation

5. **Navigation Components**
   - `TopNavigation.tsx` - Top navigation bar
   - `BottomNavigation.tsx` - Mobile bottom nav
   - `TabNavigation.tsx` - Tab navigation
   - `Breadcrumb.tsx` - Breadcrumb trail

6. **Chart Components**
   - Various chart types using Recharts
   - Responsive data visualization

7. **Feature-Specific Components**
   - `CertificationWorkflow.tsx`
   - `ScoringForm.tsx`
   - `BulkImport.tsx`

### 2. Context-Based State Management

**AuthContext** - Authentication state:
```typescript
export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const login = async (credentials) => {
    const response = await api.post('/api/auth/login', credentials)
    setUser(response.data.user)
    setToken(response.data.token)
    localStorage.setItem('token', response.data.token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**ThemeContext** - Theme management:
```typescript
export const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(null)

  // Load theme from settings
  // Apply theme classes to document
  // Persist theme preference

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

**SocketContext** - WebSocket connection:
```typescript
export const SocketContext = createContext<SocketContextType | null>(null)

export const SocketProvider = ({ children }) => {
  const { token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (token) {
      const newSocket = io(API_URL, { auth: { token } })
      newSocket.on('connect', () => setConnected(true))
      newSocket.on('disconnect', () => setConnected(false))
      setSocket(newSocket)
      return () => newSocket.close()
    }
  }, [token])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}
```

### 3. Custom Hooks

**useAuth** - Authentication hook:
```typescript
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**useApi** - API request hook with React Query:
```typescript
export const useApi = <T,>(
  url: string,
  options?: UseQueryOptions<T>
) => {
  return useQuery<T>(url, () =>
    api.get(url).then(res => res.data),
    options
  )
}
```

**useSocket** - WebSocket hook:
```typescript
export const useSocket = (event: string, handler: Function) => {
  const { socket } = useContext(SocketContext)

  useEffect(() => {
    if (socket) {
      socket.on(event, handler)
      return () => socket.off(event, handler)
    }
  }, [socket, event, handler])
}
```

### 4. Routing Strategy

**React Router v6** with role-based access:

```typescript
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />

            {/* Admin routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Judge routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['JUDGE']} />}>
              <Route path="/scoring" element={<ScoringPage />} />
            </Route>

            {/* Multi-role routes */}
            <Route path="/events" element={<EventsPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### 5. API Client Configuration

**Axios instance** with interceptors:

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add token and CSRF
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add CSRF token for mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
      const csrfToken = await getCSRFToken()
      config.headers['X-CSRF-Token'] = csrfToken
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

## Key Features

### 1. Responsive Design

**Mobile-First Approach:**
- Tailwind CSS responsive utilities
- Mobile-specific components
- Touch-friendly interactions
- Bottom navigation for mobile

**Breakpoints:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    }
  }
}
```

### 2. Real-Time Updates

**Socket.IO Integration:**
- Automatic reconnection
- Event-based updates
- Room-based broadcasts
- Connection status indicators

```typescript
// Example: Real-time score updates
const ScoringPage = () => {
  const [scores, setScores] = useState([])

  useSocket('scores:updated', (data) => {
    setScores(prev => [...prev, data])
    toast.success('New score submitted')
  })

  return <div>{/* Scoring UI */}</div>
}
```

### 3. Progressive Web App (PWA)

**Service Worker** for offline capabilities:
- Asset caching
- Offline fallback
- Update notifications
- Install prompt

### 4. Accessibility

**WCAG 2.1 AA Compliance:**
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management
- Skip navigation links

```typescript
// Example: Accessible modal
<Modal
  isOpen={isOpen}
  onClose={onClose}
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal content</p>
</Modal>
```

### 5. Error Handling

**Error Boundary:**
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

### 6. Form Handling

**Controlled Components** with validation:
```typescript
const EventForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: ''
  })
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate
    const newErrors = validateForm(formData)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit
    try {
      await api.post('/api/events', formData)
      toast.success('Event created')
    } catch (error) {
      toast.error('Failed to create event')
    }
  }

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>
}
```

### 7. Data Tables

**Reusable DataTable component:**
- Sorting
- Filtering
- Pagination
- Column selection
- Export functionality

### 8. Theme Customization

**Dynamic theming:**
- Light/dark mode
- Custom brand colors
- Logo upload
- Font selection
- Persistent preferences

## Performance Optimization

### 1. Code Splitting

**Route-based splitting:**
```typescript
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ScoringPage = lazy(() => import('./pages/ScoringPage'))

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/admin" element={<AdminPage />} />
</Suspense>
```

### 2. Memoization

**React.memo** and **useMemo:**
```typescript
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() =>
    expensiveCalculation(data),
    [data]
  )

  return <div>{processedData}</div>
})
```

### 3. Virtual Scrolling

For large lists (e.g., contestant list with 1000+ items)

### 4. Image Optimization

- Lazy loading
- Responsive images
- WebP format support
- CDN delivery

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    // PWA plugin
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
        }
      }
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Testing Strategy

### 1. Component Tests
- React Testing Library
- User interaction testing
- Accessibility testing

### 2. Integration Tests
- API integration
- Context providers
- Routing

### 3. E2E Tests
- Playwright
- Full user workflows
- Cross-browser testing

## Related Documentation

- [System Architecture Overview](./overview.md)
- [Backend Architecture](./backend-architecture.md)
- [Frontend Optimization](../09-performance/frontend-optimization.md)
- [Accessibility Guide](../08-security/accessibility-wcag-guide.md)
- [Development Getting Started](../04-development/getting-started.md)
