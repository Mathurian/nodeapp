# Tenant Public Landing Content Implementation Plan

## Goal
Allow tenant-aware public landing pages to vary their content by tenant slug/domain without creating tenant-specific code forks. Keep the implementation structured, safe, and maintainable by storing validated content blocks in tenant-scoped `system_settings` and rendering them through the shared `PublicLandingPage`.

## Scope
- Add tenant-scoped structured landing-page content storage using `system_settings`
- Expose public read API through the existing public settings path
- Add authenticated admin/organizer settings UI for editing landing content
- Update `PublicLandingPage` to render tenant content blocks dynamically with safe fallbacks
- Keep branding/theme behavior intact
- Do not introduce raw HTML/CMS editing

## Data Model
Use a single tenant-scoped setting key:
- `public_landing_content`

Store JSON with validated structure. Example shape:
```json
{
  "announcement": {
    "enabled": true,
    "text": "Registration closes April 15"
  },
  "hero": {
    "badge": "Official Event Portal",
    "title": "Welcome to Kink Weekend",
    "highlight": "Live event information",
    "description": "Schedules, scoring access, certifications, and updates in one place.",
    "primaryCtaLabel": "Sign In",
    "primaryCtaUrl": "/login",
    "secondaryCtaLabel": "View Events",
    "secondaryCtaUrl": "/events"
  },
  "featureSection": {
    "enabled": true,
    "title": "What You Can Do Here",
    "subtitle": "The tools your staff and participants use throughout the event.",
    "items": [
      {
        "icon": "calendar",
        "title": "Manage Events",
        "description": "Create and oversee event operations."
      },
      {
        "icon": "trophy",
        "title": "Score Competitions",
        "description": "Track judging and results securely."
      },
      {
        "icon": "shield",
        "title": "Certify Outcomes",
        "description": "Handle review and publication workflows."
      }
    ]
  },
  "ctaSection": {
    "enabled": true,
    "title": "Need Access?",
    "description": "Contact your organizer for an invited account.",
    "primaryCtaLabel": "Organizer Login",
    "primaryCtaUrl": "/login"
  },
  "footer": {
    "tagline": "All access is tenant-managed and invitation-based."
  }
}
```

## Safety Rules
- No raw HTML rendering
- All content is plain text
- URLs restricted to relative paths or `https://`, `mailto:`, `tel:`
- Feature item count fixed to 3 for first implementation
- Feature icons selected from an allowlist
- Missing/invalid config falls back to defaults

## Backend Changes
1. Add typed normalization helpers in `SettingsService`
2. Extend `getPublicSettings(...)` to include `landingPage`
3. Add authenticated `GET /settings/public-content` and `PUT /settings/public-content`
4. Keep public unauthenticated route on `/settings/public`
5. Reuse tenant/global settings resolution already used by theme/public settings

## Frontend Changes
1. Add landing-page content types to `frontend/src/services/api.ts`
2. Add settings API methods for public-content read/write
3. Add a new `Public Landing Page` section to `SettingsPage`
4. Update `PublicLandingPage` to render:
   - optional announcement banner
   - hero text/CTAs
   - feature section title/subtitle/items
   - CTA section
   - footer tagline
5. Preserve current default experience when no tenant override exists

## Validation
- Backend build passes
- Frontend build passes
- Public landing page still loads for default and slug paths
- Tenant admin can save content and see it reflected on `/:slug`
- Invalid URL/icon/input is normalized or rejected safely

## Non-Goals
- Full page-builder UI
- Arbitrary HTML content
- Per-tenant React component overrides
- Custom event/contest data-driven public microsites
