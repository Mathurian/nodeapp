# Workflow Customization Guide

## Overview

The current workflow system is a template-and-instance model for role-based process progression. It is not a general-purpose BPM engine and it should not be documented as one.

What the current product supports well:
- workflow templates with ordered steps
- role-based responsibility for each step
- active and inactive template management
- workflow instances tied to specific entities
- explicit advancement through UI or API actions
- optional winner-unlock configuration stored with the template

What the current product does not present as a full feature set:
- a generic transition designer in the main UI
- a broad background automation engine
- arbitrary role examples outside the product’s real role set
- a dedicated `Admin -> Workflows -> Dashboard` surface

## Access Model

Workflow management access is currently limited to:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`
- `BOARD`

Templates and instances are exposed through the authenticated workflow routes and the workflow management UI.

## Current Workflow Model

### Workflow Template

A workflow template is the reusable definition of a process. The current template model is centered on:

- `name`
- `description`
- `type`
- `isActive`
- ordered `steps`
- optional `winnerUnlock` configuration in `config`

### Workflow Step

The current step model is centered on:

- `name`
- `description`
- `stepOrder`
- `requiredRole`
- `requireApproval`
- `autoAdvance`

Use those fields as the primary documentation model. Older examples that rely on generic transition objects, timeout engines, or unsupported step metadata should be treated as legacy examples, not current product truth.

### Workflow Instance

A workflow instance is a live execution of a template for a specific entity. The current routes support instances tied to entity types such as:

- `EVENT`
- `CONTEST`
- `CERTIFICATION`
- `CATEGORY`

## Current API Surface

### Templates

```text
GET    /api/workflows/templates
POST   /api/workflows/templates
GET    /api/workflows/templates/:id
PUT    /api/workflows/templates/:id
DELETE /api/workflows/templates/:id
```

### Instances

```text
POST   /api/workflows/instances
GET    /api/workflows/instances/:id
POST   /api/workflows/instances/:id/advance
GET    /api/workflows/instances/:entityType/:entityId
```

## Creating Templates

### Via UI

Use the authenticated workflow management page to:

1. create a template
2. set a name, description, and type
3. define ordered steps
4. assign each step to a supported role
5. enable or disable the template
6. optionally configure winner unlock behavior when that template is intended to drive results visibility timing

Avoid documenting the UI as `Admin -> Workflows -> Dashboard`. The current product exposes workflow management, not a separate dashboard-style workflow console.

### Via API

Example template payload aligned with the current route and page model:

```json
{
  "name": "Contest Certification Workflow",
  "description": "Progresses a contest through review and approval steps.",
  "type": "custom",
  "isActive": true,
  "steps": [
    {
      "name": "Tally Review",
      "description": "Tally staff review final score state.",
      "stepOrder": 1,
      "requiredRole": "TALLY_MASTER",
      "requireApproval": true,
      "autoAdvance": false
    },
    {
      "name": "Auditor Review",
      "description": "Auditor validates score integrity.",
      "stepOrder": 2,
      "requiredRole": "AUDITOR",
      "requireApproval": true,
      "autoAdvance": false
    },
    {
      "name": "Board Approval",
      "description": "Board completes final approval.",
      "stepOrder": 3,
      "requiredRole": "BOARD",
      "requireApproval": true,
      "autoAdvance": false
    }
  ]
}
```

## Supported Roles For Steps

The current workflow-management UI exposes these role options:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`
- `BOARD`
- `TALLY_MASTER`
- `AUDITOR`
- `JUDGE`
- `EMCEE`
- `CONTESTANT`

Do not use placeholder roles such as `SYSTEM` or unsupported examples such as `TREASURER` in current user-facing workflow documentation.

## Winner Unlock Configuration

Templates can also carry a `winnerUnlock` configuration object. In the current UI this is used to model winner publication timing behavior tied to:

- a selected contest
- a mode of `trigger` or `scheduled`
- either a trigger event or a scheduled unlock time

This is a specialized configuration inside the broader workflow template model, not a generic workflow transition engine.

## Starting And Advancing Instances

### Start An Instance

```json
{
  "templateId": "workflow-template-id",
  "entityType": "CONTEST",
  "entityId": "contest-id",
  "metadata": {
    "source": "manual"
  }
}
```

### Advance An Instance

```json
{
  "action": "APPROVE",
  "comment": "Reviewed and approved."
}
```

The current API documents workflow advancement around explicit action calls such as `APPROVE`, `REJECT`, `REVIEW`, and `CERTIFY`. Document the instance model as explicitly advanced, not as background automation.

## Monitoring And Review

The product supports listing templates and reviewing instances by entity. It does not currently present the richer metrics and dashboard model that older docs implied.

Practical operator and admin review should focus on:

- whether the template is active
- whether steps are ordered correctly
- which role is responsible for the current step
- whether the instance advanced successfully for the target entity

## Best Practices

### Keep Step Design Narrow

- Give each step one clear purpose.
- Avoid combining multiple responsibilities into one step.

### Use Real Product Roles

- Assign steps only to roles the product actually exposes.
- Keep role assignment aligned with the rest of the app’s access model.

### Prefer Explicit Names

- use names like `Board Approval` or `Auditor Review`
- avoid generic names that hide who is responsible

### Test Templates Before Relying On Them

- create a template
- start a test instance
- advance it through each expected step
- confirm the entity and role flow are understandable to operators

## Example Templates

### Contest Certification

```json
{
  "name": "Contest Certification Workflow",
  "type": "custom",
  "isActive": true,
  "steps": [
    {
      "name": "Tally Review",
      "stepOrder": 1,
      "requiredRole": "TALLY_MASTER",
      "requireApproval": true,
      "autoAdvance": false
    },
    {
      "name": "Auditor Review",
      "stepOrder": 2,
      "requiredRole": "AUDITOR",
      "requireApproval": true,
      "autoAdvance": false
    },
    {
      "name": "Board Approval",
      "stepOrder": 3,
      "requiredRole": "BOARD",
      "requireApproval": true,
      "autoAdvance": false
    }
  ]
}
```

### Winner Unlock Schedule

```json
{
  "name": "Winner Release Workflow",
  "type": "custom",
  "isActive": true,
  "steps": [
    {
      "name": "Board Approval",
      "stepOrder": 1,
      "requiredRole": "BOARD",
      "requireApproval": true,
      "autoAdvance": false
    }
  ],
  "config": {
    "winnerUnlock": {
      "enabled": true,
      "contestId": "contest-id",
      "mode": "scheduled",
      "unlockAt": "2026-05-31T20:00:00.000Z"
    }
  }
}
```

## Troubleshooting

### Template Cannot Be Used

Check:
- whether the template is active
- whether steps are present and ordered
- whether required roles are valid current product roles

### Instance Does Not Advance

Check:
- that the acting user has the correct role for the current step
- that the requested action is valid for the current state
- that the instance is tied to the intended entity

### Workflow Guidance Looks Different Than Older Docs

That is expected. Older docs described a more generic workflow and BPM model than the current product exposes. Use this guide and the live routes as the current source of truth.

## Related Documentation

- [13-ADMIN-GUIDE.md](./13-ADMIN-GUIDE.md)
- [03-FEATURES.md](./03-FEATURES.md)
