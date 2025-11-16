# Real-Time Updates via WebSocket

## Overview

The Event Manager uses Socket.IO for real-time bidirectional communication between the server and clients. This enables instant updates for scores, certifications, notifications, and system events without polling.

## Architecture

### Server Configuration

```typescript
// Socket.IO server setup with security
import { Server } from 'socket.io'
import { verify } from 'jsonwebtoken'

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  
  if (!token) {
    return next(new Error('Authentication token missing'))
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!)
    socket.data.user = decoded
    next()
  } catch (error) {
    next(new Error('Invalid token'))
  }
})

// Connection handling
io.on('connection', (socket) => {
  const user = socket.data.user
  
  // Join user-specific room
  socket.join(`user:${user.userId}`)
  
  // Join role-specific room
  socket.join(`role:${user.role}`)
  
  // Join event/contest/category rooms based on assignments
  joinAssignedRooms(socket, user)
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${user.userId} disconnected`)
  })
})
```

### Client Configuration

```typescript
// Frontend Socket.IO client
import { io, Socket } from 'socket.io-client'

const socket: Socket = io(API_URL, {
  auth: {
    token: localStorage.getItem('token')
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
})

// Connection events
socket.on('connect', () => {
  console.log('Connected to server')
  setConnectionStatus('connected')
})

socket.on('disconnect', () => {
  console.log('Disconnected from server')
  setConnectionStatus('disconnected')
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error)
  setConnectionStatus('error')
})
```

## Real-Time Events

### Score Updates

**Server-side broadcasting**:
```typescript
// Broadcast score update to relevant users
export const broadcastScoreUpdate = (score: Score) => {
  const { categoryId, contestId, eventId } = score
  
  // Notify admins and organizers
  io.to('role:ADMIN').emit('scores:updated', score)
  io.to('role:ORGANIZER').emit('scores:updated', score)
  
  // Notify tally masters assigned to the category
  io.to(`category:${categoryId}:TALLY_MASTER`).emit('scores:updated', score)
  
  // Notify judges in the same category
  io.to(`category:${categoryId}:JUDGE`).emit('scores:updated', {
    ...score,
    // Mask other judges' scores
    score: score.judgeId === user.id ? score.score : null
  })
}
```

**Client-side handling**:
```typescript
// Listen for score updates
socket.on('scores:updated', (score) => {
  // Update local state
  setScores(prev => {
    const index = prev.findIndex(s => s.id === score.id)
    if (index >= 0) {
      return [...prev.slice(0, index), score, ...prev.slice(index + 1)]
    }
    return [...prev, score]
  })
  
  // Show notification
  toast.success('Score updated')
})
```

### Certification Updates

**Server-side**:
```typescript
export const broadcastCertificationUpdate = (certification: Certification) => {
  const { categoryId, status } = certification
  
  // Notify all relevant roles
  io.to(`category:${categoryId}`).emit('certification:updated', certification)
  
  // Send push notification
  if (status === 'CERTIFIED') {
    io.to('role:BOARD').emit('notification', {
      type: 'success',
      message: 'Category certification completed',
      categoryId
    })
  }
}
```

**Client-side**:
```typescript
socket.on('certification:updated', (certification) => {
  updateCertificationStatus(certification)
  
  if (certification.status === 'CERTIFIED') {
    toast.success('Certification completed!')
  }
})
```

### User Notifications

**Server-side**:
```typescript
export const sendNotification = (userId: string, notification: Notification) => {
  // Save to database
  await prisma.notification.create({ data: notification })
  
  // Send real-time update
  io.to(`user:${userId}`).emit('notification', notification)
}
```

**Client-side**:
```typescript
socket.on('notification', (notification) => {
  // Add to notification list
  setNotifications(prev => [notification, ...prev])
  
  // Show toast
  const toastFn = notification.type === 'error' ? toast.error : toast.success
  toastFn(notification.message)
  
  // Play sound (if enabled)
  if (notificationSettings.soundEnabled) {
    playNotificationSound()
  }
})
```

### System Announcements

**Server-side**:
```typescript
export const broadcastSystemAnnouncement = (message: string, type: string = 'info') => {
  io.emit('system:announcement', {
    message,
    type,
    timestamp: new Date()
  })
}
```

**Client-side**:
```typescript
socket.on('system:announcement', (announcement) => {
  showAnnouncement(announcement.message, announcement.type)
})
```

## Room Management

### Dynamic Room Joining

Rooms are used to target specific groups of users:

```typescript
// Room naming conventions
const rooms = {
  user: `user:${userId}`,                    // Individual user
  role: `role:${role}`,                      // All users with role
  event: `event:${eventId}`,                 // All users in event
  contest: `contest:${contestId}`,           // All users in contest
  category: `category:${categoryId}`,        // All users in category
  categoryRole: `category:${categoryId}:${role}` // Specific role in category
}

// Join rooms based on user assignments
const joinAssignedRooms = async (socket: Socket, user: User) => {
  // Get user's assignments
  const assignments = await prisma.assignment.findMany({
    where: { judgeId: user.id, status: 'ACTIVE' }
  })
  
  // Join category rooms
  for (const assignment of assignments) {
    socket.join(`category:${assignment.categoryId}`)
    socket.join(`category:${assignment.categoryId}:${user.role}`)
  }
}
```

### Room Leave on Update

When assignments change, update rooms:

```typescript
// Remove from old category, add to new
export const updateAssignmentRooms = (socket: Socket, oldCategoryId: string, newCategoryId: string) => {
  socket.leave(`category:${oldCategoryId}`)
  socket.join(`category:${newCategoryId}`)
}
```

## Event Types

### Core Events

| Event Name               | Direction | Purpose                        | Data                      |
|-------------------------|-----------|--------------------------------|---------------------------|
| `connect`               | Both      | Connection established         | -                         |
| `disconnect`            | Both      | Connection closed              | Reason                    |
| `scores:updated`        | S → C     | Score created/updated          | Score object              |
| `scores:deleted`        | S → C     | Score deleted                  | Score ID                  |
| `certification:updated` | S → C     | Certification status changed   | Certification object      |
| `notification`          | S → C     | User notification              | Notification object       |
| `system:announcement`   | S → C     | System-wide message            | Message, type             |
| `user:active`           | C → S     | User activity heartbeat        | User ID                   |
| `contest:locked`        | S → C     | Contest locked                 | Contest ID                |
| `results:published`     | S → C     | Results published              | Category ID               |

### Custom Events

Application-specific events:

```typescript
// Deduction request
socket.on('deduction:requested', (deduction) => {
  // Notify tally masters and auditors
  io.to('role:TALLY_MASTER').emit('deduction:pending', deduction)
  io.to('role:AUDITOR').emit('deduction:pending', deduction)
})

// Judge assignment
socket.on('assignment:created', (assignment) => {
  // Notify the judge
  io.to(`user:${assignment.judgeId}`).emit('assignment:new', assignment)
})

// Score removal request
socket.on('score:removal-requested', (request) => {
  // Notify admins
  io.to('role:ADMIN').emit('score:removal-pending', request)
})
```

## Client Implementation

### React Context

```typescript
// SocketContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false
})

export const SocketProvider = ({ children }) => {
  const { token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) return

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token }
    })

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('Socket connected')
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
      console.log('Socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
```

### Custom Hook

```typescript
// useSocketEvent.ts
export const useSocketEvent = (event: string, handler: (...args: any[]) => void) => {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, handler])
}

// Usage in component
const ScorePage = () => {
  const [scores, setScores] = useState([])

  useSocketEvent('scores:updated', (score) => {
    setScores(prev => updateScoreInList(prev, score))
  })

  return <div>{/* Render scores */}</div>
}
```

## Performance Considerations

### Connection Pooling

Socket.IO automatically handles connection pooling and multiplexing.

### Event Throttling

Prevent flooding with throttling:

```typescript
import { throttle } from 'lodash'

// Throttle score updates to once per second
const throttledScoreUpdate = throttle((score) => {
  io.to('category:${score.categoryId}').emit('scores:updated', score)
}, 1000, { leading: true, trailing: true })
```

### Selective Broadcasting

Only send data to users who need it:

```typescript
// Don't broadcast to everyone
// ❌ Bad
io.emit('scores:updated', score)

// ✓ Good - only to relevant category
io.to(`category:${score.categoryId}`).emit('scores:updated', score)
```

## Error Handling

### Client Reconnection

```typescript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error)
  
  // Show user-friendly message
  toast.error('Connection lost. Reconnecting...')
})

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`)
  toast.success('Connection restored')
  
  // Refresh data
  refreshPageData()
})
```

### Server Error Handling

```typescript
io.on('connection', (socket) => {
  socket.on('error', (error) => {
    logger.error('Socket error', { error, userId: socket.data.user.userId })
  })
  
  // Handle invalid events gracefully
  socket.onAny((event, ...args) => {
    if (!VALID_EVENTS.includes(event)) {
      socket.emit('error', { message: 'Invalid event type' })
    }
  })
})
```

## Security

### Authentication

Every socket connection must be authenticated:

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  
  if (!token) {
    return next(new Error('Authentication required'))
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    socket.data.user = decoded
    next()
  } catch (error) {
    next(new Error('Invalid token'))
  }
})
```

### Authorization

Check permissions before emitting:

```typescript
socket.on('scores:request', async (categoryId) => {
  const user = socket.data.user
  
  // Check if user can view scores for this category
  const canView = await checkViewPermission(user.userId, categoryId)
  
  if (!canView) {
    socket.emit('error', { message: 'Access denied' })
    return
  }
  
  const scores = await getScores(categoryId)
  socket.emit('scores:data', scores)
})
```

### Rate Limiting

Limit socket events per user:

```typescript
const rateLimits = new Map()

socket.on('scores:submit', (data) => {
  const userId = socket.data.user.userId
  const now = Date.now()
  
  const userLimit = rateLimits.get(userId) || { count: 0, reset: now + 60000 }
  
  if (now > userLimit.reset) {
    userLimit.count = 0
    userLimit.reset = now + 60000
  }
  
  if (userLimit.count >= 60) {
    socket.emit('error', { message: 'Rate limit exceeded' })
    return
  }
  
  userLimit.count++
  rateLimits.set(userId, userLimit)
  
  // Process score submission
})
```

## Testing

### Server-Side Tests

```typescript
import { createServer } from 'http'
import { Server } from 'socket.io'
import { io as ioc, Socket } from 'socket.io-client'

describe('Socket.IO Server', () => {
  let io: Server
  let serverSocket: Socket
  let clientSocket: Socket

  beforeAll((done) => {
    const httpServer = createServer()
    io = new Server(httpServer)
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port
      clientSocket = ioc(`http://localhost:${port}`)
      
      io.on('connection', (socket) => {
        serverSocket = socket
      })
      
      clientSocket.on('connect', done)
    })
  })

  afterAll(() => {
    io.close()
    clientSocket.close()
  })

  test('should broadcast score update', (done) => {
    clientSocket.on('scores:updated', (score) => {
      expect(score.id).toBe('123')
      done()
    })

    serverSocket.emit('scores:updated', { id: '123', score: 95 })
  })
})
```

### Client-Side Tests

```typescript
import { render, waitFor } from '@testing-library/react'
import { SocketProvider } from './SocketContext'

test('receives score updates', async () => {
  const { getByText } = render(
    <SocketProvider>
      <ScoreComponent />
    </SocketProvider>
  )

  // Simulate server emit
  mockSocket.emit('scores:updated', { id: '1', score: 95 })

  await waitFor(() => {
    expect(getByText('Score: 95')).toBeInTheDocument()
  })
})
```

## Monitoring

### Connection Metrics

```typescript
// Track active connections
io.on('connection', (socket) => {
  metrics.activeConnections.inc()
  
  socket.on('disconnect', () => {
    metrics.activeConnections.dec()
  })
})

// Track events
socket.onAny((event) => {
  metrics.socketEvents.inc({ event })
})
```

### Health Check

```typescript
app.get('/socket-health', (req, res) => {
  const connectedClients = io.sockets.sockets.size
  
  res.json({
    status: 'ok',
    connectedClients,
    uptime: process.uptime()
  })
})
```

## Related Documentation

- [Backend Architecture](../01-architecture/backend-architecture.md)
- [Frontend Architecture](../01-architecture/frontend-architecture.md)
- [WebSocket API](../07-api/websocket-api.md)
