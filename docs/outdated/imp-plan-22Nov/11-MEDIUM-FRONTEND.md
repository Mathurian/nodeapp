# Phase 3: Medium Priority - Frontend Improvements

**Priority:** 🟡 MEDIUM
**Timeline:** Week 2-3
**Risk Level:** LOW
**Dependencies:** API type safety improvements

---

## Frontend Issues

### 1. Type Safety (8 hours)

**Share types between frontend and backend:**

```bash
# Create shared types package
mkdir -p shared/types
```

```typescript
// shared/types/api.ts
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  tenantId?: number;
}

export interface Event {
  id: number;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  tenantId: number;
}

// Export all shared types
export * from './user.types';
export * from './event.types';
export * from './contest.types';
```

**Use in frontend:**

```typescript
// frontend/src/services/api.ts
import type { User, Event, ApiResponse } from '../../../shared/types/api';

export async function getUsers(): Promise<ApiResponse<User[]>> {
  const response = await fetch('/api/users');
  return response.json();
}

export async function getEvent(id: number): Promise<ApiResponse<Event>> {
  const response = await fetch(`/api/events/${id}`);
  return response.json();
}
```

### 2. API Client Standardization (6 hours)

**Create type-safe API client:**

```typescript
// frontend/src/services/apiClient.ts
import type { ApiResponse } from '../../../shared/types/api';

class ApiClient {
  private baseURL = '/api';

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',  // Include cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

**Use in components:**

```typescript
// frontend/src/pages/EventsPage.tsx
import { apiClient } from '../services/apiClient';
import type { Event } from '../../../shared/types/api';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    async function loadEvents() {
      const response = await apiClient.get<Event[]>('/events');
      if (response.data) {
        setEvents(response.data);
      }
    }
    loadEvents();
  }, []);

  // Now events is properly typed
  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>{event.name}</div>
      ))}
    </div>
  );
}
```

### 3. Error Handling (4 hours)

**Centralized error handling:**

```typescript
// frontend/src/utils/errorHandler.ts
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
```

**Error boundary component:**

```typescript
// frontend/src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 4. Loading States (3 hours)

**Standard loading pattern:**

```typescript
// frontend/src/hooks/useApi.ts
import { useState, useEffect } from 'react';

export function useApi<T>(
  apiCall: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const result = await apiCall();

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(handleApiError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading, error };
}
```

**Use in components:**

```typescript
function EventsPage() {
  const { data: events, loading, error } = useApi(
    () => apiClient.get<Event[]>('/events'),
    []
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!events) return null;

  return <EventList events={events} />;
}
```

### 5. Form Validation (4 hours)

**Use React Hook Form with Zod:**

```bash
cd frontend
npm install react-hook-form @hookform/resolvers zod
```

```typescript
// frontend/src/components/EventForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const eventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export function EventForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      await apiClient.post('/events', data);
      // Success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name')} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label>Description</label>
        <textarea {...register('description')} />
        {errors.description && <span className="error">{errors.description.message}</span>}
      </div>

      <div>
        <label>Start Date</label>
        <input type="date" {...register('startDate')} />
        {errors.startDate && <span className="error">{errors.startDate.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### 6. Performance Optimization (4 hours)

**React.memo and useMemo:**

```typescript
// Memoize expensive components
export const EventCard = React.memo(({ event }: { event: Event }) => {
  return (
    <div className="event-card">
      <h3>{event.name}</h3>
      <p>{event.description}</p>
    </div>
  );
});

// Memoize expensive calculations
function EventList({ events }: { events: Event[] }) {
  const sortedEvents = useMemo(() => {
    return events.sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [events]);

  return (
    <div>
      {sortedEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

**Code splitting:**

```typescript
// Lazy load pages
import { lazy, Suspense } from 'react';

const EventsPage = lazy(() => import('./pages/EventsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/events" element={<EventsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 7. Accessibility (3 hours)

**Add ARIA labels:**

```typescript
<button
  aria-label="Delete event"
  onClick={() => handleDelete(event.id)}
>
  <TrashIcon />
</button>

<input
  type="text"
  aria-label="Search events"
  aria-describedby="search-help"
  {...register('search')}
/>
<span id="search-help">Enter event name to search</span>
```

**Keyboard navigation:**

```typescript
function Modal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  );
}
```

---

## Estimated Effort

| Task | Time |
|------|------|
| Type safety | 8 hours |
| API client | 6 hours |
| Error handling | 4 hours |
| Loading states | 3 hours |
| Form validation | 4 hours |
| Performance | 4 hours |
| Accessibility | 3 hours |
| **Total** | **32 hours** |

---

**Status:** READY TO IMPLEMENT
**Owner:** Frontend Development Team
