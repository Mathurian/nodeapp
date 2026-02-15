# Scoring System

**Feature Category:** Core Functionality
**Status:** ✅ Complete
**Version:** 2.0

---

## Overview

The Event Manager implements a comprehensive scoring system that supports multiple judges scoring contestants across various categories and criteria. The system includes score submission, validation, certification workflows, deductions, and real-time updates.

---

## Score Data Model

### Score Structure

Each score record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique score identifier (CUID) |
| `categoryId` | String | Category being judged |
| `contestantId` | String | Contestant being scored |
| `judgeId` | String | Judge submitting the score |
| `criterionId` | String? | Optional criterion (for criteria-based scoring) |
| `score` | Int | Numeric score value |
| `comment` | String? | Optional judge comments |
| `certifiedAt` | DateTime? | Certification timestamp |
| `certifiedBy` | String? | User who certified the score |
| `isCertified` | Boolean | Certification status (default: false) |
| `isLocked` | Boolean | Lock status (default: false) |
| `lockedAt` | DateTime? | Lock timestamp |
| `lockedBy` | String? | User who locked the score |
| `allowCommentEdit` | Boolean | Allow comment editing (default: true) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Schema Constraints:**
```prisma
@@unique([categoryId, contestantId, judgeId, criterionId])
@@index([categoryId, judgeId])
@@index([categoryId, contestantId])
@@index([isCertified, categoryId])
```

---

## Score Submission

### Submission Process

**1. Prerequisite Validation**

Before a judge can submit a score:
- Judge must be authenticated with a valid JWT token
- Judge must have an active Judge record linked to their User account
- Judge must be assigned to the category (via Assignment table)
- Assignment status must be ACTIVE, COMPLETED, or PENDING
- Category must exist and be active

**2. Score Validation**

```typescript
// Unique constraint check
const existingScore = await prisma.score.findFirst({
  where: {
    categoryId,
    contestantId,
    judgeId,
    criterionId: criteriaId || null
  }
});

if (existingScore) {
  throw new ConflictError('Score already exists for this combination');
}
```

**3. Score Creation**

```typescript
const newScore = await prisma.score.create({
  data: {
    categoryId,
    contestantId,
    criterionId: criteriaId || null,
    judgeId,
    contestId: category.contestId,
    eventId: category.contest.eventId,
    score: score,
    certifiedAt: null,
    certifiedBy: null
  },
  include: {
    contestant: true,
    judge: true,
    category: true
  }
});
```

### API Endpoint

**Submit Score**

**Endpoint:** `POST /api/scoring/categories/:categoryId/contestants/:contestantId/scores`

**Required Role:** JUDGE, TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Request Body:**
```json
{
  "criteriaId": "clxxx456",  // Optional
  "score": 95,
  "comments": "Excellent performance"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "data": {
    "id": "clxxx789",
    "categoryId": "clxxx123",
    "contestantId": "clxxx456",
    "judgeId": "clxxx999",
    "criterionId": "clxxx456",
    "score": 95,
    "comment": null,
    "isCertified": false,
    "isLocked": false,
    "createdAt": "2025-11-12T10:30:00.000Z",
    "contestant": { /* contestant object */ },
    "judge": { /* judge object */ },
    "category": { /* category object */ }
  }
}
```

**Error Responses:**

**401 Unauthorized:** User not authenticated
```json
{
  "success": false,
  "message": "User not authenticated",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

**403 Forbidden:** Not assigned to category
```json
{
  "success": false,
  "message": "Not assigned to this category",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

**404 Not Found:** Category not found
```json
{
  "success": false,
  "message": "Category not found",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

**409 Conflict:** Score already exists
```json
{
  "success": false,
  "message": "Score already exists for this combination",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Score Retrieval

### Get Scores by Category

Retrieve all scores for a specific category, optionally filtered by contestant.

**Endpoint:** `GET /api/scoring/categories/:categoryId/scores?contestantId=xxx`

**Required Role:** Any authenticated user

**Query Parameters:**
- `contestantId` (optional) - Filter scores for specific contestant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx789",
      "categoryId": "clxxx123",
      "contestantId": "clxxx456",
      "judgeId": "clxxx999",
      "score": 95,
      "isCertified": false,
      "contestant": { "id": "clxxx456", "name": "John Doe" },
      "judge": { "id": "clxxx999", "name": "Jane Judge" },
      "category": { "id": "clxxx123", "name": "Vocal Performance" },
      "createdAt": "2025-11-12T10:30:00.000Z"
    }
  ]
}
```

### Get Scores by Judge

Retrieve all scores submitted by a specific judge.

**Endpoint:** `GET /api/scoring/judges/:judgeId/scores`

**Required Role:** JUDGE (own scores), TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Response:** Array of score objects with full relations

### Get Scores by Contestant

Retrieve all scores for a specific contestant across all categories.

**Endpoint:** `GET /api/scoring/contestants/:contestantId/scores`

**Required Role:** CONTESTANT (own scores), JUDGE, TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Response:** Array of score objects grouped by category

### Get Scores by Contest

Retrieve all scores for an entire contest.

**Endpoint:** `GET /api/scoring/contests/:contestId/scores`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Response:** Array of all contest scores with full relations

---

## Score Modification

### Update Score

Judges can update their own scores before certification.

**Endpoint:** `PUT /api/scoring/scores/:scoreId`

**Required Role:** JUDGE (own scores), ADMIN

**Request Body:**
```json
{
  "score": 98,
  "comments": "Updated assessment"
}
```

**Restrictions:**
- Cannot update certified scores
- Cannot update locked scores
- Cannot update another judge's scores (unless ADMIN)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Score updated successfully",
  "data": { /* updated score object */ }
}
```

### Delete Score

Remove a score submission.

**Endpoint:** `DELETE /api/scoring/scores/:scoreId`

**Required Role:** JUDGE (own scores), ADMIN

**Restrictions:**
- Cannot delete certified scores
- Cannot delete locked scores
- Cannot delete another judge's scores (unless ADMIN)

**Success Response (204):** No content

---

## Score Certification

### Certification Workflow

Score certification is a multi-stage process:

1. **Judge Submission** - Judge submits raw scores
2. **Judge Certification** - Judge certifies their own scores
3. **Tally Master Verification** - Tally Master verifies calculations
4. **Auditor Review** - Auditor reviews for accuracy
5. **Board Approval** - Board gives final approval

### Certify Single Score

**Endpoint:** `POST /api/scoring/scores/:scoreId/certify`

**Required Role:** JUDGE, TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Request Body:** None (uses authenticated user ID)

**Implementation:**
```typescript
const certifiedScore = await prisma.score.update({
  where: { id: scoreId },
  data: {
    certifiedAt: new Date(),
    certifiedBy: req.user.id,
    isCertified: true
  }
});
```

**Response:**
```json
{
  "success": true,
  "message": "Score certified successfully",
  "data": {
    "id": "clxxx789",
    "isCertified": true,
    "certifiedAt": "2025-11-12T10:30:00.000Z",
    "certifiedBy": "clxxx111"
  }
}
```

### Certify All Category Scores

Bulk certify all uncertified scores in a category.

**Endpoint:** `POST /api/scoring/categories/:categoryId/certify`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Response:**
```json
{
  "success": true,
  "message": "Category scores certified successfully",
  "data": {
    "certified": 25,
    "categoryId": "clxxx123"
  }
}
```

**Implementation:**
```typescript
const result = await prisma.score.updateMany({
  where: {
    categoryId,
    certifiedAt: null  // Only certify uncertified scores
  },
  data: {
    certifiedAt: new Date(),
    certifiedBy: req.user.id,
    isCertified: true
  }
});
```

### Unsign Score (Remove Certification)

Remove certification from a score.

**Endpoint:** `POST /api/scoring/scores/:scoreId/unsign`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Use Cases:**
- Score needs correction
- Re-tallying required
- Audit findings require changes

**Response:**
```json
{
  "success": true,
  "message": "Score unsigned successfully",
  "data": {
    "id": "clxxx789",
    "isCertified": false,
    "certifiedAt": null,
    "certifiedBy": null
  }
}
```

---

## Deductions System

### Deduction Workflow

The deduction system allows score adjustments with multi-level approval.

**Approval Requirements:**
1. ✅ Head Judge approval
2. ✅ Tally Master approval
3. ✅ Auditor approval
4. ✅ Board/Organizer/Admin approval

**All four approvals required before deduction is applied.**

### Create Deduction Request

**Endpoint:** `POST /api/scoring/deductions`

**Required Role:** JUDGE, TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Request Body:**
```json
{
  "contestantId": "clxxx456",
  "categoryId": "clxxx123",
  "amount": 5,
  "reason": "Late arrival penalty"
}
```

**Validation:**
- Amount must be greater than 0
- Contestant must exist
- Category must exist

**Response:**
```json
{
  "success": true,
  "message": "Deduction request created successfully",
  "data": {
    "id": "clxxx999",
    "contestantId": "clxxx456",
    "categoryId": "clxxx123",
    "amount": 5,
    "reason": "Late arrival penalty",
    "status": "PENDING",
    "requestedBy": "clxxx111",
    "approvals": [],
    "createdAt": "2025-11-12T10:30:00.000Z"
  }
}
```

### Approve Deduction

**Endpoint:** `POST /api/scoring/deductions/:id/approve`

**Required Role:** JUDGE (Head Judge), TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Request Body:**
```json
{
  "signature": "Jane Doe",
  "notes": "Verified late arrival"
}
```

**Approval Logic:**
```typescript
const approvalStatus = {
  hasHeadJudgeApproval: approvals.some(a => a.isHeadJudge),
  hasTallyMasterApproval: approvals.some(a => a.role === 'TALLY_MASTER'),
  hasAuditorApproval: approvals.some(a => a.role === 'AUDITOR'),
  hasBoardApproval: approvals.some(a => ['BOARD', 'ORGANIZER', 'ADMIN'].includes(a.role)),
  requiredApprovals: 4
};

if (approvalStatus.isFullyApproved) {
  // Apply deduction to all scores for contestant in category
  await applyDeductionToScores(contestantId, categoryId, amount, reason);
  await updateStatus(id, 'APPROVED');
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deduction approved successfully",
  "data": {
    "approval": {
      "id": "clxxx888",
      "deductionId": "clxxx999",
      "approvedBy": "clxxx222",
      "role": "TALLY_MASTER",
      "signature": "Jane Doe",
      "approvedAt": "2025-11-12T10:35:00.000Z"
    },
    "isFullyApproved": false,
    "approvalStatus": {
      "hasHeadJudgeApproval": true,
      "hasTallyMasterApproval": true,
      "hasAuditorApproval": false,
      "hasBoardApproval": false,
      "approvalCount": 2,
      "requiredApprovals": 4
    }
  }
}
```

### Reject Deduction

**Endpoint:** `POST /api/scoring/deductions/:id/reject`

**Required Role:** HEAD_JUDGE, TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Request Body:**
```json
{
  "reason": "Contestant arrival time verified, no penalty warranted"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deduction request rejected"
}
```

### Get Pending Deductions

**Endpoint:** `GET /api/scoring/deductions/pending`

**Required Role:** Any authenticated user (filtered by role)

**Role-Based Filtering:**
- **JUDGE:** Only categories assigned to the judge
- **TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN:** All pending deductions

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx999",
      "contestantId": "clxxx456",
      "categoryId": "clxxx123",
      "amount": 5,
      "reason": "Late arrival penalty",
      "status": "PENDING",
      "contestant": { "name": "John Doe" },
      "category": { "name": "Vocal Performance" },
      "approvals": [
        {
          "role": "TALLY_MASTER",
          "signature": "Jane Doe",
          "approvedAt": "2025-11-12T10:35:00.000Z"
        }
      ],
      "approvalStatus": {
        "hasHeadJudgeApproval": false,
        "hasTallyMasterApproval": true,
        "hasAuditorApproval": false,
        "hasBoardApproval": false,
        "approvalCount": 1,
        "requiredApprovals": 4,
        "isFullyApproved": false
      }
    }
  ]
}
```

---

## Score Statistics

### Contest Score Statistics

Get aggregated statistics for all scores in a contest.

**Endpoint:** `GET /api/scoring/contests/:contestId/stats`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Response:**
```json
{
  "success": true,
  "data": {
    "totalScores": 150,
    "certifiedScores": 120,
    "uncertifiedScores": 30,
    "averageScore": 87.5,
    "highestScore": 100,
    "lowestScore": 65,
    "categoryCounts": {
      "Vocal Performance": 50,
      "Dance": 50,
      "Talent": 50
    },
    "judgeCounts": {
      "Judge 1": 30,
      "Judge 2": 30,
      "Judge 3": 30
    }
  }
}
```

### Average Score Calculation

Calculate average score for a contestant in a specific category.

**Implementation:**
```typescript
async function calculateAverageScore(
  contestantId: string,
  categoryId: string
): Promise<number> {
  const scores = await prisma.score.findMany({
    where: { contestantId, categoryId },
    select: { score: true }
  });

  if (scores.length === 0) return 0;

  const sum = scores.reduce((acc, s) => acc + (s.score || 0), 0);
  return sum / scores.length;
}
```

---

## Real-Time Score Updates

### WebSocket Events

The scoring system broadcasts real-time updates via Socket.IO.

**Score Submitted Event:**
```typescript
socket.on('score:submitted', (data) => {
  console.log('New score submitted:', data);
  // {
  //   id: 'clxxx789',
  //   categoryId: 'clxxx123',
  //   contestantId: 'clxxx456',
  //   judgeId: 'clxxx999',
  //   score: 95,
  //   contestant: { name: 'John Doe' },
  //   judge: { name: 'Jane Judge' }
  // }
});
```

**Score Updated Event:**
```typescript
socket.on('score:updated', (data) => {
  console.log('Score updated:', data);
  // Same structure as submitted event
});
```

**Score Deleted Event:**
```typescript
socket.on('score:deleted', (data) => {
  console.log('Score deleted:', data.id);
  // { id: 'clxxx789' }
});
```

**Score Certified Event:**
```typescript
socket.on('score:certified', (data) => {
  console.log('Score certified:', data);
  // {
  //   id: 'clxxx789',
  //   certifiedAt: '2025-11-12T10:30:00.000Z',
  //   certifiedBy: 'clxxx111'
  // }
});
```

### Room-Based Broadcasting

Scores are broadcast to specific rooms:
- `category:${categoryId}` - All users viewing this category
- `contest:${contestId}` - All users viewing this contest
- `judge:${judgeId}` - Judge's personal room for their scores

**Join Category Room:**
```typescript
socket.emit('join:room', {
  room: `category:${categoryId}`
});
```

---

## Score Locking

### Lock Mechanism

Prevent score modifications during critical operations.

**Lock Score:**
```typescript
await prisma.score.update({
  where: { id: scoreId },
  data: {
    isLocked: true,
    lockedAt: new Date(),
    lockedBy: userId
  }
});
```

**Unlock Score:**
```typescript
await prisma.score.update({
  where: { id: scoreId },
  data: {
    isLocked: false,
    lockedAt: null,
    lockedBy: null
  }
});
```

**Use Cases:**
- Final certification in progress
- Report generation
- Audit review
- Data export

---

## Common Use Cases

### 1. Judge Scoring Workflow

```typescript
// 1. Judge logs in
const { token } = await login('judge@example.com', 'password');

// 2. Get assigned categories
const assignments = await fetch('/api/judges/me/assignments', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Submit scores for each contestant
for (const contestant of contestants) {
  await fetch(`/api/scoring/categories/${categoryId}/contestants/${contestant.id}/scores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      score: 95,
      comments: 'Excellent performance'
    })
  });
}

// 4. Certify all scores when complete
await fetch(`/api/scoring/categories/${categoryId}/certify`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 2. Tally Master Review

```typescript
// 1. Get all scores for contest
const scores = await fetch(`/api/scoring/contests/${contestId}/scores`);

// 2. Review scores for accuracy
const stats = await fetch(`/api/scoring/contests/${contestId}/stats`);

// 3. Certify category scores
for (const category of categories) {
  await fetch(`/api/scoring/categories/${category.id}/certify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### 3. Contestant Score Viewing

```typescript
// Contestant can view their own scores
const myScores = await fetch('/api/scoring/contestants/me/scores', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Group by category
const scoresByCategory = myScores.reduce((acc, score) => {
  if (!acc[score.category.name]) {
    acc[score.category.name] = [];
  }
  acc[score.category.name].push(score);
  return acc;
}, {});
```

---

## Security Considerations

### 1. Score Integrity

- ✅ Unique constraint prevents duplicate scores
- ✅ Certification tracking with user ID and timestamp
- ✅ Lock mechanism prevents unauthorized modifications
- ✅ Audit log tracks all score changes

### 2. Access Control

- ✅ Judges can only submit scores for assigned categories
- ✅ Judges can only modify their own uncertified scores
- ✅ Certification requires appropriate role
- ✅ Deduction approval requires multiple roles

### 3. Data Validation

- ✅ Score values validated against criteria max scores
- ✅ Required fields enforced at database level
- ✅ Foreign key constraints ensure referential integrity
- ✅ Transaction support for atomic operations

---

## Performance Optimization

### Database Indexes

The Score model includes optimized indexes:

```prisma
@@index([categoryId, judgeId])          // Judge score lookup
@@index([categoryId, contestantId])     // Contestant score lookup
@@index([isCertified, categoryId])      // Certification queries
```

### Query Optimization

**Efficient Score Retrieval:**
```typescript
// Include relations in single query
const scores = await prisma.score.findMany({
  where: { categoryId },
  include: {
    contestant: { select: { id: true, name: true } },
    judge: { select: { id: true, name: true } },
    category: { select: { id: true, name: true } }
  }
});
```

**Batch Operations:**
```typescript
// Certify multiple scores in single transaction
await prisma.$transaction([
  prisma.score.updateMany({
    where: { categoryId, isCertified: false },
    data: { certifiedAt: new Date(), certifiedBy: userId }
  })
]);
```

---

## Testing

### Test Score Submission

```bash
curl -X POST http://localhost:3000/api/scoring/categories/xxx/contestants/yyy/scores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 95,
    "comments": "Test score submission"
  }'
```

### Test Deduction Request

```bash
curl -X POST http://localhost:3000/api/scoring/deductions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contestantId": "xxx",
    "categoryId": "yyy",
    "amount": 5,
    "reason": "Test deduction"
  }'
```

---

## Troubleshooting

### Issue: "Score already exists"

**Cause:** Attempting to submit duplicate score for same judge/contestant/category/criterion combination.

**Solution:**
- Use update endpoint instead: `PUT /api/scoring/scores/:scoreId`
- Delete existing score first (if uncertified)
- Check for existing scores before submission

### Issue: "Not assigned to this category"

**Cause:** Judge not assigned to category via Assignment table.

**Solution:**
- Verify judge assignment: `GET /api/judges/:judgeId/assignments`
- Create assignment: `POST /api/assignments`
- Check assignment status (must be ACTIVE, COMPLETED, or PENDING)

### Issue: "Cannot modify certified score"

**Cause:** Attempting to update or delete a certified score.

**Solution:**
- Use unsign endpoint first: `POST /api/scoring/scores/:scoreId/unsign`
- Requires TALLY_MASTER or higher role
- Then modify the score
- Re-certify after modifications

---

## API Endpoints Summary

| Endpoint | Method | Description | Required Role |
|----------|--------|-------------|---------------|
| `/api/scoring/categories/:categoryId/scores` | GET | Get category scores | Any |
| `/api/scoring/categories/:categoryId/contestants/:contestantId/scores` | POST | Submit score | JUDGE+ |
| `/api/scoring/scores/:scoreId` | PUT | Update score | JUDGE (own) |
| `/api/scoring/scores/:scoreId` | DELETE | Delete score | JUDGE (own) |
| `/api/scoring/scores/:scoreId/certify` | POST | Certify score | JUDGE+ |
| `/api/scoring/categories/:categoryId/certify` | POST | Certify category | TALLY_MASTER+ |
| `/api/scoring/scores/:scoreId/unsign` | POST | Remove certification | TALLY_MASTER+ |
| `/api/scoring/judges/:judgeId/scores` | GET | Get judge scores | JUDGE (own)+ |
| `/api/scoring/contestants/:contestantId/scores` | GET | Get contestant scores | CONTESTANT (own)+ |
| `/api/scoring/contests/:contestId/scores` | GET | Get contest scores | TALLY_MASTER+ |
| `/api/scoring/contests/:contestId/stats` | GET | Get contest statistics | TALLY_MASTER+ |
| `/api/scoring/deductions` | POST | Create deduction request | JUDGE+ |
| `/api/scoring/deductions/:id/approve` | POST | Approve deduction | HEAD_JUDGE+ |
| `/api/scoring/deductions/:id/reject` | POST | Reject deduction | HEAD_JUDGE+ |
| `/api/scoring/deductions/pending` | GET | Get pending deductions | Any |

---

## Related Documentation

- [Certification Workflow](./certification-workflow.md) - Multi-stage certification process
- [Judge Assignments](./judge-assignments.md) - Judge category assignments
- [Real-Time Updates](./real-time-updates.md) - WebSocket event documentation
- [API Reference](../07-api/rest-api.md#scoring--certification) - Complete API documentation

---

**Last Updated:** November 12, 2025
**Version:** 2.0
