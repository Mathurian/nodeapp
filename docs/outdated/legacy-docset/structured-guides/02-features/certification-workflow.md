# Certification Workflow

**Feature Category:** Core Functionality
**Status:** ✅ Complete
**Version:** 2.0

---

## Overview

The Event Manager implements a comprehensive multi-stage certification workflow that ensures score accuracy and integrity through progressive verification by different roles. The certification process proceeds from individual score certification through final board approval, with each stage validated by appropriate personnel.

---

## Certification Philosophy

### Purpose

The multi-stage certification ensures:
- **Accuracy** - Multiple reviewers verify calculations
- **Integrity** - No single person controls the entire process
- **Auditability** - Complete trail of who certified what and when
- **Accountability** - Each role has specific certification responsibilities
- **Compliance** - Meets requirements for official competitions

### Key Principles

1. **Progressive Certification** - Each stage builds on the previous
2. **Role-Based Validation** - Different roles verify different aspects
3. **Non-Repudiation** - Certifications cannot be undone except by authorized personnel
4. **Transparency** - Full visibility of certification status
5. **Granular Control** - Certification at multiple levels (score, judge, category, contest)

---

## Certification Levels

### 1. Score-Level Certification

Individual scores certified by the submitting judge.

**Model:** Score
**Fields:**
- `certifiedAt` - Certification timestamp
- `certifiedBy` - User ID who certified
- `isCertified` - Boolean flag

**Who Can Certify:** JUDGE (own scores), TALLY_MASTER, AUDITOR, BOARD

**Purpose:** Judge confirms their score submission is final

---

### 2. Judge-Contestant Certification

Judge certifies their scoring for a specific contestant in a category.

**Model:** JudgeContestantCertification
**Fields:**
- `id` - Certification ID
- `categoryId` - Category reference
- `judgeId` - Judge reference
- `contestantId` - Contestant reference
- `certifiedAt` - Timestamp
- `comments` - Optional notes

**Unique Constraint:** `(categoryId, judgeId, contestantId)`

**Who Can Certify:** JUDGE (own certifications), TALLY_MASTER

**Purpose:** Judge confirms all scoring for a contestant is complete and accurate

---

### 3. Judge Category Certification

Judge certifies ALL their work for a category (all contestants).

**Model:** JudgeCertification
**Fields:**
- `id` - Certification ID
- `categoryId` - Category reference
- `judgeId` - Judge reference
- `signatureName` - Judge's signature
- `certifiedAt` - Timestamp

**Unique Constraint:** `(categoryId, judgeId)`

**Who Can Certify:** JUDGE (own category work)

**Purpose:** Judge affirms completion of all judging duties for a category

---

### 4. Category Role Certification

Role-based certification at the category level.

**Model:** CategoryCertification
**Fields:**
- `id` - Certification ID
- `categoryId` - Category reference
- `role` - Certifying role (TALLY_MASTER, AUDITOR, BOARD, etc.)
- `userId` - User who certified
- `signatureName` - Optional signature
- `certifiedAt` - Timestamp
- `comments` - Optional notes

**Unique Constraint:** `(categoryId, role)`

**Required Roles:**
1. **TALLY_MASTER** - Verifies score calculations and totals
2. **AUDITOR** - Reviews for accuracy and compliance
3. **BOARD/ORGANIZER/ADMIN** - Final approval

**Purpose:** Progressive verification by senior roles

---

### 5. Contest Role Certification

Role-based certification at the contest level.

**Model:** ContestCertification
**Fields:**
- `id` - Certification ID
- `contestId` - Contest reference
- `role` - Certifying role
- `userId` - User who certified
- `certifiedAt` - Timestamp
- `comments` - Optional notes

**Unique Constraint:** `(contestId, role)`

**Who Can Certify:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER

**Purpose:** Certify entire contest completion

---

### 6. Overall Certification Tracking

Comprehensive certification status tracking.

**Model:** Certification
**Fields:**
- `status` - PENDING, IN_PROGRESS, COMPLETED, REJECTED
- `currentStep` - Current step number (1-4)
- `totalSteps` - Total steps required (default: 4)
- `judgeCertified` - Boolean flag
- `tallyCertified` - Boolean flag
- `auditorCertified` - Boolean flag
- `boardApproved` - Boolean flag
- `certifiedAt` - Completion timestamp
- `certifiedBy` - Final certifier
- `rejectionReason` - If rejected, reason why

**Purpose:** Track overall certification progress across all stages

---

## Certification Workflow

### Stage 1: Judge Certification

**Participants:** Judges

**Process:**
1. Judge completes all scoring for assigned contestants
2. Judge reviews their submitted scores
3. Judge certifies each contestant's scores individually
4. Judge signs category completion

**API Endpoints:**

#### Certify Judge-Contestant Scoring
```http
POST /api/certifications/judge-contestant
Content-Type: application/json
Authorization: Bearer <token>

{
  "judgeId": "clxxx123",
  "categoryId": "clxxx456",
  "contestantId": "clxxx789",
  "comments": "All scores verified and complete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Judge-contestant certification created",
  "data": {
    "id": "clxxx999",
    "judgeId": "clxxx123",
    "categoryId": "clxxx456",
    "contestantId": "clxxx789",
    "certifiedAt": "2025-11-12T10:30:00.000Z",
    "judge": { "id": "clxxx123", "name": "Jane Judge" },
    "contestant": { "id": "clxxx789", "name": "John Contestant" },
    "category": { "id": "clxxx456", "name": "Vocal Performance" }
  }
}
```

#### Certify Judge Category Work
```http
POST /api/certifications/judge-category
Content-Type: application/json
Authorization: Bearer <token>

{
  "judgeId": "clxxx123",
  "categoryId": "clxxx456",
  "signatureName": "Jane Judge"
}
```

**Validation:**
- All contestants must have judge-contestant certifications
- Cannot certify if any scores are missing
- Cannot certify category already certified by this judge

---

### Stage 2: Tally Master Verification

**Participants:** Tally Master

**Responsibilities:**
1. Verify all judges have completed their certifications
2. Check score calculations and totals
3. Confirm no missing scores
4. Validate final scores against raw scores
5. Certify category calculations

**API Endpoints:**

#### Get Category Certification Progress
```http
GET /api/certifications/categories/:categoryId/progress
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "clxxx456",
    "judgeProgress": {
      "contestantsCertified": 25,
      "totalContestants": 30,
      "isCategoryCertified": false
    },
    "tallyMasterProgress": {
      "isCategoryCertified": false
    },
    "auditorProgress": {
      "isCategoryCertified": false
    },
    "boardProgress": {
      "isCategoryCertified": false
    }
  }
}
```

#### Certify Category (Tally Master)
```http
POST /api/certifications/categories/:categoryId
Content-Type: application/json
Authorization: Bearer <token>

{
  "signatureName": "Tally Master Name",
  "comments": "All calculations verified and accurate"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category certified successfully",
  "data": {
    "id": "clxxx888",
    "categoryId": "clxxx456",
    "role": "TALLY_MASTER",
    "userId": "clxxx111",
    "signatureName": "Tally Master Name",
    "certifiedAt": "2025-11-12T11:00:00.000Z"
  }
}
```

**Validation:**
- Requires TALLY_MASTER role
- All judges must have certified their work
- Cannot certify if already certified by TALLY_MASTER

---

### Stage 3: Auditor Review

**Participants:** Auditor

**Responsibilities:**
1. Review tally master's verification
2. Audit random sample of scores for accuracy
3. Check for anomalies or discrepancies
4. Verify compliance with scoring rules
5. Certify category audit

**API Endpoints:**

#### Certify Category (Auditor)
```http
POST /api/certifications/categories/:categoryId
Content-Type: application/json
Authorization: Bearer <token>

{
  "signatureName": "Auditor Name",
  "comments": "Audit complete, all scores verified"
}
```

**Validation:**
- Requires AUDITOR role
- Tally Master must have certified first
- Cannot certify if already certified by AUDITOR

---

### Stage 4: Board Final Approval

**Participants:** Board Members, Organizers, Administrators

**Responsibilities:**
1. Review all previous certifications
2. Authorize official result publication
3. Sign off on final results
4. Approve winner declarations

**API Endpoints:**

#### Certify Category (Board)
```http
POST /api/certifications/categories/:categoryId
Content-Type: application/json
Authorization: Bearer <token>

{
  "signatureName": "Board Member Name",
  "comments": "Final approval granted"
}
```

**Validation:**
- Requires BOARD, ORGANIZER, or ADMIN role
- Auditor must have certified first
- Cannot certify if already certified by BOARD

---

## Certification Status Tracking

### Check Category Certification Status

**Endpoint:** `GET /api/certifications/categories/:categoryId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "clxxx456",
    "categoryName": "Vocal Performance",
    "judgeProgress": {
      "totalJudges": 3,
      "totalContestants": 30,
      "expectedCertifications": 90,
      "completedCertifications": 90,
      "percentage": 100,
      "isCertified": true
    },
    "roleProgress": {
      "tallyMaster": {
        "isCertified": true,
        "certifiedAt": "2025-11-12T11:00:00.000Z",
        "certifiedBy": "Tally Master Name"
      },
      "auditor": {
        "isCertified": true,
        "certifiedAt": "2025-11-12T11:30:00.000Z",
        "certifiedBy": "Auditor Name"
      },
      "board": {
        "isCertified": true,
        "certifiedAt": "2025-11-12T12:00:00.000Z",
        "certifiedBy": "Board Member Name"
      }
    },
    "overallStatus": "COMPLETED",
    "currentStep": 4,
    "totalSteps": 4,
    "isFullyCertified": true
  }
}
```

### Check Contest Certification Status

**Endpoint:** `GET /api/certifications/contests/:contestId/progress`

**Response:**
```json
{
  "success": true,
  "data": {
    "contestId": "clxxx123",
    "tallyMaster": true,
    "auditor": true,
    "board": true,
    "organizer": false,
    "certifications": [
      {
        "id": "clxxx111",
        "role": "TALLY_MASTER",
        "userId": "clxxx222",
        "certifiedAt": "2025-11-12T11:00:00.000Z"
      },
      {
        "id": "clxxx333",
        "role": "AUDITOR",
        "userId": "clxxx444",
        "certifiedAt": "2025-11-12T11:30:00.000Z"
      },
      {
        "id": "clxxx555",
        "role": "BOARD",
        "userId": "clxxx666",
        "certifiedAt": "2025-11-12T12:00:00.000Z"
      }
    ]
  }
}
```

### Check Overall Event Status

**Endpoint:** `GET /api/certifications/events/:eventId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "event": "Summer Festival 2025",
    "contests": [
      {
        "id": "clxxx123",
        "name": "Vocal Performance",
        "categories": [
          {
            "id": "clxxx456",
            "name": "Teen Vocal",
            "certified": true
          },
          {
            "id": "clxxx789",
            "name": "Adult Vocal",
            "certified": false
          }
        ]
      }
    ]
  }
}
```

---

## Certification Requirements

### Judge Certification Requirements

**Before certifying:**
- ✅ All assigned contestants scored
- ✅ All scores reviewed for accuracy
- ✅ All mandatory fields completed
- ✅ No missing or incomplete scores

**Prevented if:**
- ❌ Any contestant has no score
- ❌ Scores are below minimum or above maximum
- ❌ Required comments missing (if configured)

### Tally Master Requirements

**Before certifying:**
- ✅ All judges have certified their categories
- ✅ All score calculations verified
- ✅ Final totals match sum of scores
- ✅ Deductions properly applied
- ✅ Ties identified and noted

**Prevented if:**
- ❌ Any judge has not certified
- ❌ Calculation errors detected
- ❌ Missing judge-contestant certifications

### Auditor Requirements

**Before certifying:**
- ✅ Tally Master has certified
- ✅ Random sample audit completed
- ✅ No discrepancies found
- ✅ Rules compliance verified
- ✅ Documentation complete

**Prevented if:**
- ❌ Tally Master not certified
- ❌ Audit findings unresolved

### Board Requirements

**Before certifying:**
- ✅ Auditor has certified
- ✅ No outstanding issues
- ✅ Results ready for publication
- ✅ Winner eligibility verified

**Prevented if:**
- ❌ Auditor not certified
- ❌ Unresolved disputes or appeals

---

## Uncertification (Rollback)

### Uncertify Judge-Contestant Certification

Remove a judge-contestant certification.

**Endpoint:** `DELETE /api/certifications/judge-contestant/:id`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ADMIN

**Use Cases:**
- Score needs correction
- Judge made an error
- Re-judging required

**Effects:**
- Certification record deleted
- Judge must re-certify after corrections
- Downstream certifications may need re-validation

**Response:**
```json
{
  "success": true,
  "message": "Certification removed successfully"
}
```

### Uncertify Category Role

Remove role-based category certification.

**Endpoint:** `DELETE /api/certifications/categories/:categoryId/role/:role`

**Required Role:** BOARD, ADMIN

**Use Cases:**
- Certification was premature
- Errors discovered after certification
- Process needs to restart

**Effects:**
- Role certification removed
- Subsequent certifications may be invalidated
- Category returns to previous step

---

## Bulk Certification

### Certify All Categories in Contest

**Endpoint:** `POST /api/certifications/contests/:contestId/certify-all`

**Required Role:** ADMIN, ORGANIZER

**Request Body:**
```json
{
  "role": "TALLY_MASTER",
  "signatureName": "Mass Certification - Tally Master"
}
```

**Use Cases:**
- All categories ready for certification
- Streamline certification process
- Administrative approval

**Warning:** Use with caution - bypasses individual verification

---

## Real-Time Certification Updates

### WebSocket Events

#### Certification Created
```typescript
socket.on('certification:created', (data) => {
  console.log('New certification:', data);
  // {
  //   type: 'JUDGE_CONTESTANT',
  //   categoryId: 'clxxx456',
  //   judgeId: 'clxxx123',
  //   contestantId: 'clxxx789'
  // }
});
```

#### Category Certified
```typescript
socket.on('category:certified', (data) => {
  console.log('Category certified:', data);
  // {
  //   categoryId: 'clxxx456',
  //   role: 'TALLY_MASTER',
  //   certifiedBy: 'Tally Master Name'
  // }
});
```

#### Contest Certified
```typescript
socket.on('contest:certified', (data) => {
  console.log('Contest certified:', data);
  // {
  //   contestId: 'clxxx123',
  //   role: 'BOARD',
  //   certifiedBy: 'Board Member'
  // }
});
```

#### Certification Final
```typescript
socket.on('certification:final', (data) => {
  console.log('Final certification complete:', data);
  // {
  //   eventId: 'clxxx000',
  //   contestId: 'clxxx123',
  //   categoryId: 'clxxx456',
  //   completedAt: '2025-11-12T12:00:00.000Z'
  // }
});
```

---

## Common Workflows

### 1. Judge Certification Workflow

```typescript
// 1. Judge completes scoring
for (const contestant of contestants) {
  await submitScore(categoryId, contestant.id, score);
}

// 2. Review all scores
const myScores = await fetch(`/api/scoring/judges/${judgeId}/scores`);
console.log(`Submitted ${myScores.length} scores`);

// 3. Certify each contestant
for (const contestant of contestants) {
  await fetch('/api/certifications/judge-contestant', {
    method: 'POST',
    body: JSON.stringify({
      judgeId,
      categoryId,
      contestantId: contestant.id
    })
  });
}

// 4. Sign category completion
await fetch('/api/certifications/judge-category', {
  method: 'POST',
  body: JSON.stringify({
    judgeId,
    categoryId,
    signatureName: 'Jane Judge'
  })
});
```

### 2. Tally Master Verification Workflow

```typescript
// 1. Check judge certification status
const progress = await fetch(
  `/api/certifications/categories/${categoryId}/progress`
);

if (!progress.judgeProgress.isCategoryCertified) {
  console.log('Waiting for judges to complete certification');
  return;
}

// 2. Verify calculations
const scores = await fetch(`/api/scoring/categories/${categoryId}/scores`);
const calculatedTotals = calculateTotals(scores);
const storedTotals = await fetch(`/api/categories/${categoryId}/totals`);

if (!totalsMatch(calculatedTotals, storedTotals)) {
  console.error('Calculation mismatch detected!');
  return;
}

// 3. Certify category
await fetch(`/api/certifications/categories/${categoryId}`, {
  method: 'POST',
  body: JSON.stringify({
    signatureName: 'Tally Master',
    comments: 'All calculations verified'
  })
});
```

### 3. Auditor Review Workflow

```typescript
// 1. Verify tally master certification
const status = await fetch(
  `/api/certifications/categories/${categoryId}/status`
);

if (!status.roleProgress.tallyMaster.isCertified) {
  console.log('Waiting for tally master certification');
  return;
}

// 2. Perform random audit
const auditSample = selectRandomScores(scores, 0.1); // 10% sample

for (const score of auditSample) {
  const verified = await verifyScore(score);
  if (!verified) {
    await reportDiscrepancy(score);
    return;
  }
}

// 3. Certify after successful audit
await fetch(`/api/certifications/categories/${categoryId}`, {
  method: 'POST',
  body: JSON.stringify({
    signatureName: 'Auditor',
    comments: 'Audit complete, 10% sample verified'
  })
});
```

---

## Security & Compliance

### Audit Trail

All certifications logged with:
- User ID
- Role
- Timestamp
- IP address
- Signature (if provided)
- Comments

**Query Audit Trail:**
```sql
SELECT
  cc.certifiedAt,
  cc.role,
  u.name,
  u.email,
  cc.signatureName,
  cc.comments
FROM category_certifications cc
JOIN users u ON cc.userId = u.id
WHERE cc.categoryId = 'clxxx456'
ORDER BY cc.certifiedAt ASC;
```

### Non-Repudiation

Once certified, records cannot be modified or deleted without:
- Appropriate administrative role
- Documented reason
- Approval workflow
- Audit log entry

### Compliance Features

- ✅ Multi-level verification
- ✅ Role-based separation of duties
- ✅ Complete audit trail
- ✅ Timestamp verification
- ✅ Digital signatures
- ✅ Rollback capability with logging

---

## Troubleshooting

### Issue: "Category already certified for this role"

**Cause:** Attempting to certify a category that has already been certified by the specified role.

**Solution:**
- Check certification status: `GET /api/certifications/categories/:id/progress`
- If incorrect, uncertify first (requires admin approval)
- Then re-certify

### Issue: "Tally Master must certify first"

**Cause:** Attempting auditor or board certification before tally master.

**Solution:**
- Verify workflow sequence
- Ensure tally master has certified
- Cannot skip certification stages

### Issue: "Not all judges have certified"

**Cause:** Tally Master attempting certification before all judges complete their certifications.

**Solution:**
- Check judge progress: `GET /api/certifications/categories/:id/progress`
- Identify judges who haven't certified
- Contact judges to complete certifications

---

## API Endpoints Summary

| Endpoint | Method | Description | Required Role |
|----------|--------|-------------|---------------|
| `/api/certifications/judge-contestant` | POST | Certify judge-contestant | JUDGE |
| `/api/certifications/judge-contestant/:id` | DELETE | Uncertify judge-contestant | TALLY_MASTER+ |
| `/api/certifications/judge-category` | POST | Certify judge category | JUDGE |
| `/api/certifications/categories/:id` | POST | Certify category (role-based) | TALLY_MASTER, AUDITOR, BOARD |
| `/api/certifications/categories/:id/progress` | GET | Get certification progress | Any |
| `/api/certifications/categories/:id/status` | GET | Get certification status | Any |
| `/api/certifications/contests/:id` | POST | Certify contest | TALLY_MASTER+ |
| `/api/certifications/contests/:id/progress` | GET | Get contest progress | Any |
| `/api/certifications/events/:id/status` | GET | Get event certification status | Any |
| `/api/certifications/contests/:id/certify-all` | POST | Bulk certify all categories | ADMIN |

---

## Related Documentation

- [Scoring System](./scoring-system.md) - Score submission and management
- [Authorization](./authorization.md) - Role-based access control
- [Audit Log](./audit-log.md) - Audit trail and compliance
- [Real-Time Updates](./real-time-updates.md) - WebSocket events
- [API Reference](../07-api/rest-api.md#certification) - Complete API documentation

---

**Last Updated:** November 12, 2025
**Version:** 2.0
