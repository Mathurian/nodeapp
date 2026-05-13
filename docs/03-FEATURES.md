# Features Guide

Complete documentation of all Event Manager features organized by user role and functionality.

## Table of Contents

- [User Roles](#user-roles)
- [Event Management](#event-management)
- [Contest & Category Management](#contest--category-management)
- [Contestant Management](#contestant-management)
- [Judge Management](#judge-management)
- [Scoring System](#scoring-system)
- [Certification Workflow](#certification-workflow)
- [Results & Winners](#results--winners)
- [Reporting & Analytics](#reporting--analytics)
- [User Management](#user-management)
- [System Administration](#system-administration)
- [Real-Time Features](#real-time-features)
- [Accessibility Features](#accessibility-features)

## User Roles

Event Manager supports 9 distinct user roles with specific capabilities:

### 1. SUPER_ADMIN
**Platform-Wide Administrative Access**

Capabilities:
- All ADMIN capabilities across all tenants
- Multi-tenant management and oversight
- Platform-level configuration
- Unrestricted access to all tenant data
- System-wide security controls
- Global user management
- Cross-tenant operations
- Platform monitoring and metrics
- Tenant creation and deletion
- Bypass tenant isolation for support purposes

**Note:** SUPER_ADMIN is the highest privilege level in the system, typically used for platform administrators managing the multi-tenant SaaS environment.

### 2. ADMIN
**Tenant-Level Full System Access**

Capabilities:
- All ORGANIZER capabilities within tenant
- System configuration and settings
- User management within tenant
- Database browser access
- Cache management
- Log file access
- Backup management
- Security settings
- Theme customization
- Bulk operations
- Data wipe capabilities

### 3. ORGANIZER
**Event Management**

Capabilities:
- Create and manage events
- Create and manage contests
- Configure categories and scoring criteria
- Assign judges to categories
- Manage contestants
- Override certifications
- View all reports
- Export data
- Configure event templates
- Manage event restrictions

### 4. BOARD
**Final Approval Authority**

Capabilities:
- View all events and contests
- Final approval in certification workflow
- Sign off on winners
- View comprehensive reports
- Access audit logs
- Approve deductions
- Request score uncertifications

### 5. JUDGE
**Score Entry**

Capabilities:
- View assigned categories
- Enter scores for contestants
- Add scoring comments
- Certify own scores
- View contestant bios
- Access emcee scripts (if also EMCEE)
- Request score edits

### 6. TALLY_MASTER
**Score Verification**

Capabilities:
- View all scores
- Verify calculations
- Certify tallied results
- Approve score totals
- Generate tally reports
- Flag discrepancies
- Review judge certifications

### 7. AUDITOR
**Independent Audit**

Capabilities:
- Audit certified scores
- Review certification workflow
- Access detailed audit logs
- Flag issues for review
- Generate audit reports
- Approve final tallies
- Request uncertifications

### 8. EMCEE
**Event Presentation**

Capabilities:
- View event schedule
- Access emcee scripts
- View contestant bios for announcements
- View only published winners/progress views intended for announcement
- Manage script templates
- Print announcements

### 9. CONTESTANT
**Participant View**

Capabilities:
- View assigned events/contests
- View own profile
- View results (when released)
- Update bio information
- Upload profile picture
- View score detail only when the event visibility policy exposes it

## Event Management

### Creating Events

**Steps**:
1. Navigate to Events page
2. Click "Create Event"
3. Fill in details:
   - Event name
   - Description
   - Start/end dates
   - Location
   - Max contestants (optional)
4. Configure settings:
   - Contestant numbering mode (Manual/Auto/Optional)
   - View restrictions
   - Lock settings

**Features**:
- Multiple contests per event
- Archive old events
- Clone events from templates
- Lock events after completion
- Set view restrictions with release dates

### Event Templates

**Purpose**: Quickly create events with predefined structure

**Features**:
- Save event structure as template
- Include contests and categories
- Include scoring criteria
- Apply template to new events
- Share templates across organization

### Event Locking

**Security Feature**: Prevent modifications after completion

**Process**:
1. Admin/Organizer initiates lock
2. Requires verification signature
3. Locks all related data
4. Prevents score changes
5. Maintains audit trail

## Contest & Category Management

### Contests

**Structure**: Events contain one or more contests

**Features**:
- Multiple categories per contest
- Independent scoring systems
- Contestant assignment
- Judge assignment
- Contest-level certifications
- Contest-specific numbering
- Clone contest structure into another event
- Create a contest directly from an event template
- Open a post-clone review flow before adding fresh assignments

### Categories

**Scoring Units**: Where actual scoring occurs

**Configuration**:
- Category name and description
- Score cap (maximum possible score)
- Time limit for performances
- Min/max contestants
- Custom scoring criteria
- Clone category structure into another contest
- Create a category directly from a saved category template
- Import criteria from another category or saved template

### Scoring Criteria

**Flexible Rubrics**: Define how contestants are scored

**Setup**:
- Multiple criteria per category
- Individual max scores per criterion
- Weighted or equal criteria
- Custom criterion names

**Examples**:
- Technique (50 points)
- Presentation (30 points)
- Creativity (20 points)

### Category Templates

**Reusable Rubrics**: Save and reuse scoring structures

**Benefits**:
- Consistency across categories
- Quick category setup
- Standardized scoring
- Shareable templates

**Current reuse flows**:
- Save a live category as a template
- Import template criteria into an existing category
- Append imported criteria without deleting existing criteria

See [Structure Reuse Guide](15-STRUCTURE-REUSE-GUIDE.md) for the full workflow and guardrails.

## Contestant Management

### Registration

**Methods**:
1. Manual entry
2. Bulk CSV import
3. Invite-only registration completion (tokenized flow)

**Information Tracked**:
- Name and email
- Gender and pronouns
- Contestant number
- Bio and profile picture
- Age, school (optional)
- Custom fields

### Assignment

**Category Assignment**:
- Assign to specific categories
- Multiple category participation
- Auto-number assignment
- Conflict checking

### Bio Management

**Features**:
- Rich text bio editing
- Uploaded bio file support (document formats)
- Image upload
- Role-scoped bio visibility
- Unified `/bios` page with role-separated views
- Print-friendly formats

## Judge Management

### Judge Profiles

**Information**:
- Name and contact
- Gender and pronouns
- Bio and expertise
- Profile picture
- Specialties and certifications

### Judge Assignment

**Assignment System**:
- Assign to specific categories
- Head judge designation
- Multiple category assignments
- Workload balancing
- Conflict of interest flagging

### Judge Workspace

**Dedicated Interface**:
- View assigned categories
- Score entry interface
- Contestant bio viewer
- Real-time score tracking
- Certification workflow

## Scoring System

### Score Entry

**Interface**:
- Category-based scoring
- Criterion-by-criterion entry
- Real-time validation
- Score cap enforcement
- Comment support

**Features**:
- Auto-save functionality
- Bulk score entry
- Score templates
- Calculator integration

### Score Validation

**Automatic Checks**:
- Score range validation (0 to max)
- Total score cap enforcement
- Required field validation
- Duplicate entry prevention
- Data type validation

### Score Comments

**Commentary System**:
- Per-contestant comments
- Per-criterion comments
- Private judge notes
- Public feedback
- Rich text support

### Deductions

**Category + General Deductions**: Apply deductions tied to category criteria or general category context.

**Process**:
1. Request deduction (with reason)
2. Multi-level approval required (governance workflow)
3. Documented justification
4. Reflected in final scores
5. Audit trail maintained

**Typical Approval Stages**:
- Initiator certification
- Additional cross-role approvals per configured policy

### Score Management

**Admin Features**:
- View all scores
- Edit scores (with audit trail)
- Delete scores (with approval workflow)
- Lock scores
- Uncertify scores
- Score history tracking

## Certification Workflow

**4-Stage Process**: Ensures accuracy and accountability

### Stage 1: Judge Certification

**Judge Responsibilities**:
- Review all entered scores
- Verify accuracy
- Add final comments
- Sign/certify the currently selected contestant from within scoring

**Per-Contestant Certification**:
- Certify each contestant individually
- Score values lock immediately when submitted/certified
- Commentary remains editable after certification
- Digital signature capture
- Timestamp recorded

### Stage 2: Tally Master Certification

**Tally Master Responsibilities**:
- Verify score calculations
- Check for discrepancies
- Validate totals
- Certify tallied results

**Checks Performed**:
- Score arithmetic
- Cap compliance
- Deduction application
- Ranking calculations

### Stage 3: Auditor Review

**Auditor Responsibilities**:
- Independent score audit
- Verify previous certifications
- Check for irregularities
- Final score validation

**Audit Process**:
- Review all scores
- Cross-check calculations
- Verify deductions
- Approve for board

### Stage 4: Board Approval

**Board Responsibilities**:
- Final approval authority
- Review complete workflow
- Approve winners
- Sign off on results

**Final Sign-Off**:
- Digital signature
- Timestamp and IP logging
- Immutable after approval
- Full audit trail

### Uncertification Workflow

**Reverting Certifications**: When changes needed

**Process**:
1. Request uncertification (with reason)
2. Governance approval flow (not immediate action)
3. Uncertify stage-by-stage (reverse order)
4. Edit scores
5. Re-certify through workflow

## Results & Winners

### Results Calculation

**Automatic Calculation**:
- Total scores per contestant
- Rankings within category
- Tie-breaking rules
- Deduction application
- Real-time updates

### Winner Selection

**Process**:
- Automatic ranking
- Top N selection
- Tie handling
- Multiple winner support
- Award levels (1st, 2nd, 3rd, etc.)

### Winner Certification

**Final Step**: Board approval of winners

**Features**:
- Digital signatures
- Multiple approver support
- Timestamp tracking
- Certificate generation
- Public announcement preparation

### Results Display

**Views**:
- Category-specific results
- Contest-wide standings and overall ordering
- Event-level rankings
- Filtered views
- Print-friendly formats

**Visibility Notes**:
- Judge and contestant access to `/results` is conditional and can be blocked entirely when no accessible published scope exists.
- Contestant result visibility depends on event/contest release settings plus contestant visibility controls.
- Emcee result access is limited to published presentation views rather than unrestricted detailed results.

## Reporting & Analytics

### Standard Reports

**Available Reports**:
1. **Score Summary** - All scores for category/contest
2. **Judge Performance** - Judge statistics
3. **Contestant Results** - Individual results
4. **Category Report** - Complete category data
5. **Certification Status** - Workflow progress
6. **Audit Report** - Complete audit trail
7. **Deduction Report** - All deductions applied

### Advanced Reporting

**Custom Reports**:
- Filter by multiple criteria
- Date range selection
- Export formats (PDF, Excel, CSV)
- Scheduled generation
- Email delivery

### Analytics Dashboard

**Metrics**:
- Event participation stats
- Score distributions
- Judge workload
- Certification progress
- Timeline analytics

### Export Capabilities

**Formats**:
- PDF (formatted reports)
- Excel (raw data + analysis)
- CSV (bulk data export)
- JSON (API integration)

## User Management

### User Creation

**Methods**:
1. Manual creation by admin
2. Bulk CSV import
3. Self-registration (if enabled)
4. SSO integration (if configured)

### Role Assignment

**Flexible Roles**:
- Single role per user
- Role change capability
- Role-based dashboards
- Permission inheritance

### User Profiles

**Information**:
- Basic info (name, email)
- Contact details
- Profile picture
- Timezone and language
- Notification preferences
- Custom fields

### Account Security

**Features**:
- Strong password requirements
- Password expiration
- Multi-factor authentication (MFA)
- Session management
- Login attempt limits
- Account lockout protection

## System Administration

### Settings Management

**System Settings**:
1. **Email Settings** - SMTP configuration, sender name/address, optional reply-to routing, and tenant-specific overrides
2. **Security Settings** - Password policies, MFA
3. **Backup Settings** - Automated backups
4. **Theme Settings** - Branding and colors
5. **Logging Settings** - Log levels and retention
6. **Notification Settings** - Email/push preferences

### Backup & Recovery

**Automated Backups**:
- Scheduled database backups
- File system backups
- Point-in-time recovery
- Backup verification
- Restore capabilities

**Backup Types**:
- Full backups
- Incremental backups
- On-demand backups
- Pre-migration backups

### Audit Logging

**Complete Audit Trail**:
- All user actions logged
- IP address tracking
- Timestamp precision
- Change tracking (before/after)
- Searchable logs
- Export capabilities

### System Monitoring

**Health Checks**:
- Database connectivity
- Redis connection
- Disk space
- Memory usage
- API response times
- Error rates

**Metrics**:
- Prometheus metrics endpoint
- Custom dashboards
- Alert configuration
- Performance tracking

## Real-Time Features

### WebSocket Updates

**Live Updates For**:
- Score changes
- Certification status updates
- New notifications
- User status changes
- Contest updates

### Notifications

**Real-Time Notifications**:
- In-app notifications
- Email notifications
- Desktop push (PWA)
- Notification center
- Read/unread tracking
- Notification preferences

### Live Dashboards

**Real-Time Data**:
- Active users
- Current scores
- Certification progress
- System status
- Recent activity

## Accessibility Features

### WCAG 2.1 AA Compliance

**Accessibility Features**:
- Full keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- ARIA labels
- Alt text for images
- Skip navigation links
- Accessible forms

### Keyboard Shortcuts

**Common Shortcuts**:
- `Ctrl+/` - Show shortcuts
- `Ctrl+S` - Save
- `Ctrl+K` - Command palette
- Arrow keys - Navigation
- Enter - Activate
- Escape - Close dialogs

### Mobile Accessibility

**Mobile Features**:
- Touch-friendly targets
- Responsive design
- Swipe gestures
- Bottom navigation
- Pull-to-refresh
- Progressive enhancement support (network-dependent features may require connectivity)

---

**Next**: [API Reference](04-API-REFERENCE.md)
