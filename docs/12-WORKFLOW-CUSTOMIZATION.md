# Workflow Customization Guide

## Overview

The Event Manager includes a powerful workflow engine that allows you to create custom multi-step approval processes for any entity type.

## Table of Contents

1. [Workflow Concepts](#workflow-concepts)
2. [Creating Workflows](#creating-workflows)
3. [Step Configuration](#step-configuration)
4. [Transitions & Conditions](#transitions--conditions)
5. [Workflow Execution](#workflow-execution)
6. [Monitoring Workflows](#monitoring-workflows)
7. [Best Practices](#best-practices)
8. [Example Workflows](#example-workflows)

## Workflow Concepts

### Key Terms

- **Workflow Template**: Reusable definition of a process
- **Workflow Step**: Individual stage in the process
- **Transition**: Connection between steps
- **Workflow Instance**: Active execution of a template
- **Step Execution**: Record of completing a step

### Workflow Lifecycle

1. **Design**: Create template with steps and transitions
2. **Activate**: Enable template for use
3. **Instantiate**: Start workflow for specific entity
4. **Execute**: Progress through steps
5. **Complete**: Workflow reaches final state

## Creating Workflows

### Via UI

1. Navigate to **Admin → Workflows**
2. Click **Create Workflow**
3. Fill in template details:
   - Name
   - Description
   - Entity Type (USER, CONTESTANT, EVENT, etc.)
4. Click **Save Template**

### Via API

```javascript
POST /api/workflows/templates
Content-Type: application/json

{
  "name": "Contestant Approval",
  "description": "Multi-step approval for contestants",
  "entityType": "CONTESTANT",
  "active": true
}
```

## Step Configuration

### Creating Steps

Each step represents a stage in your workflow:

```javascript
POST /api/workflows/templates/{templateId}/steps
Content-Type: application/json

{
  "name": "Initial Review",
  "description": "Organizer reviews application",
  "stepOrder": 1,
  "requiredRole": "ORGANIZER",
  "actions": ["APPROVE", "REJECT", "REQUEST_CHANGES"],
  "autoAdvance": false,
  "timeoutHours": 48,
  "notifyRoles": ["ORGANIZER", "ADMIN"]
}
```

### Step Properties

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| name | string | Step name | Yes |
| description | string | What happens in this step | No |
| stepOrder | number | Order in sequence (1, 2, 3...) | Yes |
| requiredRole | string | Who can complete this step | Yes |
| actions | array | Available actions | Yes |
| autoAdvance | boolean | Automatically move to next step | No |
| timeoutHours | number | Hours before timeout warning | No |
| notifyRoles | array | Roles to notify when step starts | No |

### Available Roles

- ADMIN
- ORGANIZER
- BOARD
- JUDGE
- CONTESTANT
- EMCEE
- AUDITOR
- TALLY_MASTER

### Common Actions

- APPROVE: Move forward
- REJECT: Terminate workflow
- REQUEST_CHANGES: Send back for revision
- COMPLETE: Mark as done
- ESCALATE: Send to higher authority

## Transitions & Conditions

### Creating Transitions

Transitions define how workflow moves between steps:

```javascript
POST /api/workflows/templates/{templateId}/transitions
Content-Type: application/json

{
  "fromStepId": "step-1-id",
  "toStepId": "step-2-id",
  "condition": "APPROVE",
  "priority": 1,
  "requiresComment": false,
  "metadata": {
    "notifyNext": true
  }
}
```

### Conditional Routing

```javascript
// Approval path
{
  "fromStepId": "review-step",
  "toStepId": "approval-step",
  "condition": "APPROVE"
}

// Rejection path
{
  "fromStepId": "review-step",
  "toStepId": "rejection-step",
  "condition": "REJECT"
}

// Changes requested path
{
  "fromStepId": "review-step",
  "toStepId": "revision-step",
  "condition": "REQUEST_CHANGES"
}
```

### Multiple Paths

A step can have multiple outgoing transitions based on different conditions.

## Workflow Execution

### Starting a Workflow

```javascript
POST /api/workflows/instances
Content-Type: application/json

{
  "templateId": "workflow-template-id",
  "entityType": "CONTESTANT",
  "entityId": "contestant-id",
  "initiatedBy": "user-id",
  "metadata": {
    "priority": "high"
  }
}
```

### Advancing Steps

```javascript
POST /api/workflows/instances/{instanceId}/advance
Content-Type: application/json

{
  "action": "APPROVE",
  "comments": "Application looks good",
  "metadata": {
    "reviewedBy": "John Doe",
    "reviewDate": "2025-01-15"
  }
}
```

### Checking Status

```javascript
GET /api/workflows/instances/{instanceId}
```

Response:
```json
{
  "id": "instance-id",
  "template": { "name": "Contestant Approval" },
  "entityType": "CONTESTANT",
  "entityId": "contestant-123",
  "status": "IN_PROGRESS",
  "currentStep": 2,
  "startedAt": "2025-01-15T10:00:00Z",
  "executions": [
    {
      "stepName": "Initial Review",
      "action": "APPROVE",
      "completedBy": "user-123",
      "completedAt": "2025-01-15T11:30:00Z",
      "comments": "Approved"
    }
  ]
}
```

## Monitoring Workflows

### Workflow Dashboard

Access at: **Admin → Workflows → Dashboard**

**Metrics**:
- Active workflows
- Pending steps
- Completion rate
- Average completion time
- Bottlenecks

### Analytics

```javascript
GET /api/workflows/metrics
?templateId=template-id
&startDate=2025-01-01
&endDate=2025-01-31
```

Response:
```json
{
  "totalInstances": 150,
  "completed": 120,
  "inProgress": 25,
  "failed": 5,
  "completionRate": 0.80,
  "avgCompletionTime": 48.5,
  "bottlenecks": [
    {
      "stepName": "Board Approval",
      "avgTime": 72,
      "instances": 30
    }
  ]
}
```

## Best Practices

### 1. Keep Steps Simple

Each step should have a single, clear purpose:
- ✅ "Organizer Review"
- ❌ "Review, Approve, and Register"

### 2. Define Clear Actions

Use explicit action names:
- ✅ "APPROVE", "REJECT", "REQUEST_CHANGES"
- ❌ "OK", "YES", "MAYBE"

### 3. Set Appropriate Timeouts

- Critical steps: 24-48 hours
- Standard steps: 3-5 days
- Low priority: 1-2 weeks

### 4. Use Role-Based Access

Assign steps to specific roles, not individuals:
- ✅ requiredRole: "ORGANIZER"
- ❌ requiredUser: "john@example.com"

### 5. Add Helpful Descriptions

```javascript
{
  "name": "Financial Review",
  "description": "Treasurer verifies all fees are paid and documentation is complete"
}
```

### 6. Plan for Exceptions

Always include paths for:
- Approvals
- Rejections
- Revisions/changes
- Escalations

### 7. Test Workflows

Before activating:
1. Create test instances
2. Execute all paths
3. Verify notifications
4. Check timing
5. Review audit trail

## Example Workflows

### 1. Contestant Registration

```javascript
// Template
{
  "name": "Contestant Registration",
  "entityType": "CONTESTANT"
}

// Steps
[
  {
    "name": "Application Submitted",
    "stepOrder": 1,
    "requiredRole": "SYSTEM",
    "actions": ["AUTO_ADVANCE"],
    "autoAdvance": true
  },
  {
    "name": "Organizer Review",
    "stepOrder": 2,
    "requiredRole": "ORGANIZER",
    "actions": ["APPROVE", "REJECT", "REQUEST_MORE_INFO"],
    "timeoutHours": 48
  },
  {
    "name": "Payment Verification",
    "stepOrder": 3,
    "requiredRole": "TREASURER",
    "actions": ["CONFIRM_PAYMENT", "PAYMENT_PENDING"],
    "timeoutHours": 24
  },
  {
    "name": "Final Approval",
    "stepOrder": 4,
    "requiredRole": "BOARD",
    "actions": ["APPROVE", "REJECT"],
    "timeoutHours": 72
  },
  {
    "name": "Registration Complete",
    "stepOrder": 5,
    "requiredRole": "SYSTEM",
    "actions": ["COMPLETE"],
    "autoAdvance": true
  }
]
```

### 2. Judge Assignment

```javascript
{
  "name": "Judge Assignment",
  "entityType": "JUDGE",
  "steps": [
    {
      "name": "Judge Application",
      "requiredRole": "JUDGE",
      "actions": ["SUBMIT_APPLICATION"]
    },
    {
      "name": "Credentials Review",
      "requiredRole": "ORGANIZER",
      "actions": ["VERIFY", "REQUEST_MORE_INFO"]
    },
    {
      "name": "Background Check",
      "requiredRole": "ADMIN",
      "actions": ["PASS", "FAIL"]
    },
    {
      "name": "Category Assignment",
      "requiredRole": "ORGANIZER",
      "actions": ["ASSIGN_CATEGORIES"]
    },
    {
      "name": "Judge Confirmed",
      "requiredRole": "SYSTEM",
      "actions": ["COMPLETE"],
      "autoAdvance": true
    }
  ]
}
```

### 3. Contest Certification

```javascript
{
  "name": "Contest Certification",
  "entityType": "CONTEST",
  "steps": [
    {
      "name": "Scoring Complete",
      "requiredRole": "TALLY_MASTER",
      "actions": ["CERTIFY_SCORES"]
    },
    {
      "name": "Auditor Review",
      "requiredRole": "AUDITOR",
      "actions": ["APPROVE", "FLAG_ISSUES"]
    },
    {
      "name": "Board Certification",
      "requiredRole": "BOARD",
      "actions": ["CERTIFY", "REJECT"]
    },
    {
      "name": "Results Published",
      "requiredRole": "SYSTEM",
      "actions": ["PUBLISH"],
      "autoAdvance": true
    }
  ]
}
```

### 4. Event Approval

```javascript
{
  "name": "Event Creation",
  "entityType": "EVENT",
  "steps": [
    {
      "name": "Event Proposed",
      "requiredRole": "ORGANIZER",
      "actions": ["SUBMIT_PROPOSAL"]
    },
    {
      "name": "Budget Review",
      "requiredRole": "TREASURER",
      "actions": ["APPROVE_BUDGET", "REJECT_BUDGET"]
    },
    {
      "name": "Board Approval",
      "requiredRole": "BOARD",
      "actions": ["APPROVE", "REJECT", "REQUEST_CHANGES"]
    },
    {
      "name": "Event Active",
      "requiredRole": "SYSTEM",
      "actions": ["ACTIVATE"],
      "autoAdvance": true
    }
  ]
}
```

## Troubleshooting

### Workflow Stuck

**Symptom**: Workflow not progressing

**Solutions**:
1. Check user has required role
2. Verify step hasn't timed out
3. Review transition conditions
4. Check for system errors

### Invalid Transitions

**Symptom**: Cannot advance workflow

**Solutions**:
1. Verify transition exists for action
2. Check condition matches
3. Ensure step order is correct
4. Review workflow template

### Notifications Not Sent

**Symptom**: Users not notified

**Solutions**:
1. Check `notifyRoles` configuration
2. Verify email settings
3. Review notification logs
4. Test email delivery

## API Reference

### List Templates
```http
GET /api/workflows/templates
```

### Create Template
```http
POST /api/workflows/templates
```

### Add Step
```http
POST /api/workflows/templates/{id}/steps
```

### Create Transition
```http
POST /api/workflows/templates/{id}/transitions
```

### Start Instance
```http
POST /api/workflows/instances
```

### Advance Instance
```http
POST /api/workflows/instances/{id}/advance
```

### Get Instance History
```http
GET /api/workflows/instances/{id}/history
```

## Additional Resources

- Visual Workflow Designer: `/admin/workflows/designer`
- Workflow Templates Library: `/admin/workflows/templates`
- Workflow Analytics: `/admin/workflows/analytics`
