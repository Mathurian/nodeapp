--
-- PostgreSQL database dump
--

\restrict novbgRRqskKthP1fGMBNH5WwgvMb24dWO9ITiHTzFZcfDfinhVwaKb3GucKunKu

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: event_manager
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO event_manager;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: event_manager
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssignmentStatus; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."AssignmentStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."AssignmentStatus" OWNER TO event_manager;

--
-- Name: BackupFrequency; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."BackupFrequency" AS ENUM (
    'MINUTES',
    'HOURS',
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);


ALTER TYPE public."BackupFrequency" OWNER TO event_manager;

--
-- Name: BackupStatus; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."BackupStatus" AS ENUM (
    'SUCCESS',
    'FAILED',
    'IN_PROGRESS'
);


ALTER TYPE public."BackupStatus" OWNER TO event_manager;

--
-- Name: BackupType; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."BackupType" AS ENUM (
    'SCHEMA',
    'FULL',
    'SCHEDULED'
);


ALTER TYPE public."BackupType" OWNER TO event_manager;

--
-- Name: CertificationStatus; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."CertificationStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'CERTIFIED',
    'REJECTED'
);


ALTER TYPE public."CertificationStatus" OWNER TO event_manager;

--
-- Name: ContestantNumberingMode; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."ContestantNumberingMode" AS ENUM (
    'MANUAL',
    'AUTO_INDEXED',
    'OPTIONAL'
);


ALTER TYPE public."ContestantNumberingMode" OWNER TO event_manager;

--
-- Name: CustomFieldType; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."CustomFieldType" AS ENUM (
    'TEXT',
    'TEXT_AREA',
    'NUMBER',
    'DATE',
    'BOOLEAN',
    'SELECT',
    'MULTI_SELECT',
    'EMAIL',
    'URL',
    'PHONE'
);


ALTER TYPE public."CustomFieldType" OWNER TO event_manager;

--
-- Name: DeductionStatus; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."DeductionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."DeductionStatus" OWNER TO event_manager;

--
-- Name: EmailStatus; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."EmailStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'QUEUED',
    'BOUNCED',
    'DELIVERED'
);


ALTER TYPE public."EmailStatus" OWNER TO event_manager;

--
-- Name: FileCategory; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."FileCategory" AS ENUM (
    'CONTESTANT_IMAGE',
    'JUDGE_IMAGE',
    'DOCUMENT',
    'TEMPLATE',
    'REPORT',
    'BACKUP',
    'OTHER'
);


ALTER TYPE public."FileCategory" OWNER TO event_manager;

--
-- Name: LogLevel; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."LogLevel" AS ENUM (
    'ERROR',
    'WARN',
    'INFO',
    'DEBUG'
);


ALTER TYPE public."LogLevel" OWNER TO event_manager;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."NotificationType" AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'ERROR',
    'SYSTEM'
);


ALTER TYPE public."NotificationType" OWNER TO event_manager;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."RequestStatus" OWNER TO event_manager;

--
-- Name: ScoringType; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."ScoringType" AS ENUM (
    'STRAIGHT',
    'OLYMPIC'
);


ALTER TYPE public."ScoringType" OWNER TO event_manager;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: event_manager
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'ORGANIZER',
    'BOARD',
    'JUDGE',
    'CONTESTANT',
    'EMCEE',
    'TALLY_MASTER',
    'AUDITOR'
);


ALTER TYPE public."UserRole" OWNER TO event_manager;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.activity_logs (
    id text NOT NULL,
    "userId" text,
    "userName" text,
    "userRole" text,
    action text NOT NULL,
    "resourceType" text,
    "resourceId" text,
    "ipAddress" text,
    "userAgent" text,
    "logLevel" public."LogLevel" DEFAULT 'INFO'::public."LogLevel" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details jsonb,
    "tenantId" text
);


ALTER TABLE public.activity_logs OWNER TO event_manager;

--
-- Name: archived_events; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.archived_events (
    id text NOT NULL,
    "eventId" text NOT NULL,
    name text NOT NULL,
    description text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "archivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "archivedById" text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.archived_events OWNER TO event_manager;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.assignments (
    id text NOT NULL,
    "judgeId" text NOT NULL,
    "categoryId" text,
    "contestId" text NOT NULL,
    "eventId" text NOT NULL,
    status public."AssignmentStatus" DEFAULT 'PENDING'::public."AssignmentStatus" NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text NOT NULL,
    notes text,
    priority integer DEFAULT 1 NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.assignments OWNER TO event_manager;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    "userName" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    changes jsonb,
    "ipAddress" text,
    "userAgent" text,
    metadata jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO event_manager;

--
-- Name: auditor_assignments; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.auditor_assignments (
    id text NOT NULL,
    "userId" text NOT NULL,
    "categoryId" text,
    "contestId" text,
    "eventId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text NOT NULL,
    notes text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.auditor_assignments OWNER TO event_manager;

--
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.backup_logs (
    id text NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    size bigint,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "errorMessage" text,
    type text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    "tenantId" text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    duration integer,
    metadata jsonb
);


ALTER TABLE public.backup_logs OWNER TO event_manager;

--
-- Name: backup_schedules; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.backup_schedules (
    id text NOT NULL,
    "tenantId" text,
    name text NOT NULL,
    "backupType" text DEFAULT 'full'::text NOT NULL,
    frequency text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "retentionDays" integer DEFAULT 30 NOT NULL,
    "nextRunAt" timestamp(3) without time zone,
    "lastRunAt" timestamp(3) without time zone,
    "lastStatus" text DEFAULT 'pending'::text,
    targets jsonb DEFAULT '[]'::jsonb NOT NULL,
    compression boolean DEFAULT true NOT NULL,
    encryption boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.backup_schedules OWNER TO event_manager;

--
-- Name: backup_settings; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.backup_settings (
    id text NOT NULL,
    "retentionDays" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "backupType" text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    frequency text NOT NULL,
    "frequencyValue" integer
);


ALTER TABLE public.backup_settings OWNER TO event_manager;

--
-- Name: backup_targets; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.backup_targets (
    id text NOT NULL,
    "tenantId" text,
    name text NOT NULL,
    type text NOT NULL,
    config jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "lastVerified" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.backup_targets OWNER TO event_manager;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.categories (
    id text NOT NULL,
    "contestId" text NOT NULL,
    name text NOT NULL,
    description text,
    "scoreCap" integer,
    "timeLimit" integer,
    "contestantMin" integer,
    "contestantMax" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "totalsCertified" boolean DEFAULT false NOT NULL,
    "tenantId" text NOT NULL,
    "boardApproved" boolean DEFAULT false NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text
);


ALTER TABLE public.categories OWNER TO event_manager;

--
-- Name: category_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    role text NOT NULL,
    "userId" text NOT NULL,
    "signatureName" text,
    "certifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.category_certifications OWNER TO event_manager;

--
-- Name: category_contestants; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_contestants (
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.category_contestants OWNER TO event_manager;

--
-- Name: category_judges; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_judges (
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.category_judges OWNER TO event_manager;

--
-- Name: category_templates; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.category_templates OWNER TO event_manager;

--
-- Name: category_types; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_types (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.category_types OWNER TO event_manager;

--
-- Name: certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestId" text NOT NULL,
    "eventId" text NOT NULL,
    "userId" text,
    status public."CertificationStatus" DEFAULT 'PENDING'::public."CertificationStatus" NOT NULL,
    "currentStep" integer DEFAULT 1 NOT NULL,
    "totalSteps" integer DEFAULT 4 NOT NULL,
    "judgeCertified" boolean DEFAULT false NOT NULL,
    "tallyCertified" boolean DEFAULT false NOT NULL,
    "auditorCertified" boolean DEFAULT false NOT NULL,
    "boardApproved" boolean DEFAULT false NOT NULL,
    "certifiedAt" timestamp(3) without time zone,
    "certifiedBy" text,
    "rejectionReason" text,
    comments text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.certifications OWNER TO event_manager;

--
-- Name: contest_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contest_certifications (
    id text NOT NULL,
    "contestId" text NOT NULL,
    role text NOT NULL,
    "userId" text NOT NULL,
    "certifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.contest_certifications OWNER TO event_manager;

--
-- Name: contest_contestants; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contest_contestants (
    "contestId" text NOT NULL,
    "contestantId" text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.contest_contestants OWNER TO event_manager;

--
-- Name: contest_judges; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contest_judges (
    "contestId" text NOT NULL,
    "judgeId" text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.contest_judges OWNER TO event_manager;

--
-- Name: contestants; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contestants (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    gender text,
    pronouns text,
    "contestantNumber" integer,
    bio text,
    "imagePath" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.contestants OWNER TO event_manager;

--
-- Name: contests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contests (
    id text NOT NULL,
    "eventId" text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contestantNumberingMode" public."ContestantNumberingMode" DEFAULT 'MANUAL'::public."ContestantNumberingMode" NOT NULL,
    "nextContestantNumber" integer DEFAULT 1,
    archived boolean DEFAULT false NOT NULL,
    "contestantViewRestricted" boolean DEFAULT false NOT NULL,
    "contestantViewReleaseDate" timestamp(3) without time zone,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lockVerifiedBy" text,
    "scoringType" public."ScoringType",
    "tenantId" text NOT NULL,
    "winnersPublished" boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "publishedBy" text,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text
);


ALTER TABLE public.contests OWNER TO event_manager;

--
-- Name: criteria; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.criteria (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    name text NOT NULL,
    "maxScore" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.criteria OWNER TO event_manager;

--
-- Name: custom_field_values; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.custom_field_values (
    id text NOT NULL,
    "customFieldId" text NOT NULL,
    "entityId" text NOT NULL,
    value text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.custom_field_values OWNER TO event_manager;

--
-- Name: custom_fields; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.custom_fields (
    id text NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    type public."CustomFieldType" NOT NULL,
    "entityType" text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "defaultValue" text,
    options jsonb,
    validation jsonb,
    "order" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.custom_fields OWNER TO event_manager;

--
-- Name: deduction_approvals; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.deduction_approvals (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "approvedById" text NOT NULL,
    role text NOT NULL,
    "isHeadJudge" boolean DEFAULT false NOT NULL,
    "approvedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.deduction_approvals OWNER TO event_manager;

--
-- Name: deduction_requests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.deduction_requests (
    id text NOT NULL,
    "contestantId" text NOT NULL,
    "categoryId" text NOT NULL,
    amount double precision NOT NULL,
    reason text NOT NULL,
    "requestedById" text NOT NULL,
    status public."DeductionStatus" DEFAULT 'PENDING'::public."DeductionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.deduction_requests OWNER TO event_manager;

--
-- Name: dr_configs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.dr_configs (
    id text NOT NULL,
    "tenantId" text,
    "backupFrequency" text DEFAULT 'daily'::text NOT NULL,
    "backupRetentionDays" integer DEFAULT 30 NOT NULL,
    "enableAutoBackup" boolean DEFAULT true NOT NULL,
    "enablePITR" boolean DEFAULT false NOT NULL,
    "enableDRTesting" boolean DEFAULT true NOT NULL,
    "drTestFrequency" text DEFAULT 'weekly'::text NOT NULL,
    "backupLocations" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "rtoMinutes" integer DEFAULT 240 NOT NULL,
    "rpoMinutes" integer DEFAULT 60 NOT NULL,
    "alertEmail" text,
    "enableFailover" boolean DEFAULT false NOT NULL,
    "healthCheckInterval" integer DEFAULT 5 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dr_configs OWNER TO event_manager;

--
-- Name: dr_metrics; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.dr_metrics (
    id text NOT NULL,
    "tenantId" text,
    "metricType" text NOT NULL,
    value double precision NOT NULL,
    unit text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb
);


ALTER TABLE public.dr_metrics OWNER TO event_manager;

--
-- Name: dr_test_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.dr_test_logs (
    id text NOT NULL,
    "tenantId" text,
    "testType" text DEFAULT 'restore'::text NOT NULL,
    "backupId" text,
    status text DEFAULT 'running'::text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    duration integer,
    "testResults" jsonb,
    "errorMessage" text,
    "automatedTest" boolean DEFAULT true NOT NULL,
    "testedBy" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.dr_test_logs OWNER TO event_manager;

--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.email_logs (
    id text NOT NULL,
    "to" text NOT NULL,
    "from" text,
    subject text NOT NULL,
    template text,
    status text DEFAULT 'pending'::text NOT NULL,
    "messageId" text,
    "errorMessage" text,
    "sentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text,
    "userId" text,
    metadata jsonb
);


ALTER TABLE public.email_logs OWNER TO event_manager;

--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.email_settings (
    id text NOT NULL,
    "smtpHost" text,
    "smtpPort" integer DEFAULT 587 NOT NULL,
    "smtpSecure" boolean DEFAULT false NOT NULL,
    "smtpUser" text,
    "smtpPassword" text,
    "fromEmail" text,
    "fromName" text,
    "enableEmail" boolean DEFAULT false NOT NULL,
    "enableNotifications" boolean DEFAULT true NOT NULL,
    "enableReports" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.email_settings OWNER TO event_manager;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.email_templates (
    id text NOT NULL,
    name text,
    subject text,
    body text,
    type text DEFAULT 'CUSTOM'::text,
    "eventId" text,
    variables text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "headerHtml" text,
    "footerHtml" text,
    "logoUrl" text,
    "logoPosition" text,
    "backgroundColor" text,
    "primaryColor" text,
    "textColor" text,
    "fontFamily" text,
    "fontSize" text,
    "layoutType" text,
    "contentWrapper" text,
    "borderStyle" text,
    "borderColor" text,
    "borderWidth" text,
    "borderRadius" text,
    padding text,
    margin text,
    "templateData" text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.email_templates OWNER TO event_manager;

--
-- Name: emcee_scripts; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.emcee_scripts (
    id text NOT NULL,
    "eventId" text,
    "contestId" text,
    "categoryId" text,
    title text NOT NULL,
    content text NOT NULL,
    "order" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    file_path text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.emcee_scripts OWNER TO event_manager;

--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.error_logs (
    id text NOT NULL,
    message text NOT NULL,
    stack text,
    level public."LogLevel" DEFAULT 'ERROR'::public."LogLevel" NOT NULL,
    context text,
    "userId" text,
    path text,
    method text,
    "statusCode" integer,
    metadata jsonb,
    resolved boolean DEFAULT false NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text
);


ALTER TABLE public.error_logs OWNER TO event_manager;

--
-- Name: event_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.event_logs (
    id text NOT NULL,
    "tenantId" text,
    "eventType" text NOT NULL,
    "entityType" text,
    "entityId" text,
    payload jsonb NOT NULL,
    "userId" text,
    source text DEFAULT 'system'::text NOT NULL,
    "correlationId" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "lastError" text,
    metadata jsonb
);


ALTER TABLE public.event_logs OWNER TO event_manager;

--
-- Name: event_templates; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.event_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    contests jsonb NOT NULL,
    categories jsonb NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.event_templates OWNER TO event_manager;

--
-- Name: events; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.events (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    location text,
    "maxContestants" integer,
    "contestantNumberingMode" public."ContestantNumberingMode" DEFAULT 'MANUAL'::public."ContestantNumberingMode" NOT NULL,
    "contestantViewRestricted" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "contestantViewReleaseDate" timestamp(3) without time zone,
    "lockedAt" timestamp(3) without time zone,
    "lockVerifiedBy" text,
    "scoringType" public."ScoringType",
    "tenantId" text NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text
);


ALTER TABLE public.events OWNER TO event_manager;

--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.feature_flags (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    strategy text DEFAULT 'OFF'::text NOT NULL,
    percentage integer,
    "userIds" text[],
    "tenantIds" text[],
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "targetPercentage" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public.feature_flags OWNER TO event_manager;

--
-- Name: files; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.files (
    id text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    path text NOT NULL,
    category public."FileCategory" NOT NULL,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    metadata text,
    checksum text,
    "eventId" text,
    "contestId" text,
    "categoryId" text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.files OWNER TO event_manager;

--
-- Name: judge_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judge_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "signatureName" text NOT NULL,
    "certifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.judge_certifications OWNER TO event_manager;

--
-- Name: judge_comments; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judge_comments (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "judgeId" text NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.judge_comments OWNER TO event_manager;

--
-- Name: judge_contestant_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judge_contestant_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "contestantId" text NOT NULL,
    "certifiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.judge_contestant_certifications OWNER TO event_manager;

--
-- Name: judge_score_removal_requests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judge_score_removal_requests (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "judgeId" text NOT NULL,
    "scoreId" text,
    reason text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedById" text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.judge_score_removal_requests OWNER TO event_manager;

--
-- Name: judge_uncertification_requests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judge_uncertification_requests (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    reason text NOT NULL,
    "requestedBy" text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.judge_uncertification_requests OWNER TO event_manager;

--
-- Name: judges; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judges (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    gender text,
    pronouns text,
    bio text,
    "imagePath" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isHeadJudge" boolean DEFAULT false NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.judges OWNER TO event_manager;

--
-- Name: logging_settings; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.logging_settings (
    id text NOT NULL,
    level public."LogLevel" DEFAULT 'INFO'::public."LogLevel" NOT NULL,
    "enableAudit" boolean DEFAULT true NOT NULL,
    "enableActivity" boolean DEFAULT true NOT NULL,
    "enableError" boolean DEFAULT true NOT NULL,
    "maxLogAge" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.logging_settings OWNER TO event_manager;

--
-- Name: notification_digests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.notification_digests (
    id text NOT NULL,
    "userId" text NOT NULL,
    frequency text NOT NULL,
    "lastSentAt" timestamp(3) without time zone,
    "nextSendAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.notification_digests OWNER TO event_manager;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.notification_preferences (
    id text NOT NULL,
    "userId" text NOT NULL,
    "emailEnabled" boolean DEFAULT true NOT NULL,
    "pushEnabled" boolean DEFAULT true NOT NULL,
    "inAppEnabled" boolean DEFAULT true NOT NULL,
    "emailDigestFrequency" text DEFAULT 'daily'::text NOT NULL,
    "emailTypes" text,
    "pushTypes" text,
    "inAppTypes" text,
    "quietHoursStart" text,
    "quietHoursEnd" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO event_manager;

--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.notification_templates (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "emailSubject" text,
    "emailBody" text,
    variables text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.notification_templates OWNER TO event_manager;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" DEFAULT 'INFO'::public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    read boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL,
    "emailSent" boolean DEFAULT false NOT NULL,
    "emailSentAt" timestamp(3) without time zone,
    "pushSent" boolean DEFAULT false NOT NULL,
    "pushSentAt" timestamp(3) without time zone,
    "templateId" text,
    "sentBy" text,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.notifications OWNER TO event_manager;

--
-- Name: overall_deductions; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.overall_deductions (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    deduction double precision NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.overall_deductions OWNER TO event_manager;

--
-- Name: password_histories; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.password_histories (
    id text NOT NULL,
    "userId" text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_histories OWNER TO event_manager;

--
-- Name: password_policies; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.password_policies (
    id text NOT NULL,
    "minLength" integer DEFAULT 8 NOT NULL,
    "requireUppercase" boolean DEFAULT true NOT NULL,
    "requireLowercase" boolean DEFAULT true NOT NULL,
    "requireNumbers" boolean DEFAULT true NOT NULL,
    "requireSpecialChars" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.password_policies OWNER TO event_manager;

--
-- Name: performance_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.performance_logs (
    id text NOT NULL,
    endpoint text NOT NULL,
    method text NOT NULL,
    "responseTime" integer NOT NULL,
    "statusCode" integer NOT NULL,
    "userId" text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eventId" text,
    "contestId" text,
    "categoryId" text
);


ALTER TABLE public.performance_logs OWNER TO event_manager;

--
-- Name: permission_audit_logs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.permission_audit_logs (
    id text NOT NULL,
    role public."UserRole" NOT NULL,
    resource text NOT NULL,
    operation text NOT NULL,
    "previousVal" boolean,
    "newVal" boolean NOT NULL,
    "changedBy" text NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.permission_audit_logs OWNER TO event_manager;

--
-- Name: rate_limit_configs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.rate_limit_configs (
    id text NOT NULL,
    name text NOT NULL,
    tier text,
    "tenantId" text,
    "userId" text,
    endpoint text,
    "requestsPerHour" integer DEFAULT 1000 NOT NULL,
    "requestsPerMinute" integer DEFAULT 50 NOT NULL,
    "burstLimit" integer DEFAULT 100 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public.rate_limit_configs OWNER TO event_manager;

--
-- Name: report_instances; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.report_instances (
    id text NOT NULL,
    "templateId" text DEFAULT 'default'::text,
    "generatedById" text NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data text,
    format text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.report_instances OWNER TO event_manager;

--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.report_templates (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    template text NOT NULL,
    parameters text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.report_templates OWNER TO event_manager;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.reports (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    parameters text NOT NULL,
    format text NOT NULL,
    "generatedBy" text NOT NULL,
    "filePath" text,
    "fileSize" integer,
    status text DEFAULT 'GENERATED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.reports OWNER TO event_manager;

--
-- Name: review_contestant_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.review_contestant_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "reviewedBy" text NOT NULL,
    "reviewerRole" text NOT NULL,
    "reviewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.review_contestant_certifications OWNER TO event_manager;

--
-- Name: review_judge_score_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.review_judge_score_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "reviewedBy" text NOT NULL,
    "reviewerRole" text NOT NULL,
    "reviewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.review_judge_score_certifications OWNER TO event_manager;

--
-- Name: role_assignments; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.role_assignments (
    id text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    "contestId" text,
    "eventId" text,
    "categoryId" text,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text NOT NULL,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.role_assignments OWNER TO event_manager;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    role public."UserRole" NOT NULL,
    resource text NOT NULL,
    operation text NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO event_manager;

--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.saved_searches (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    query text NOT NULL,
    filters text,
    "entityTypes" text,
    "isPublic" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.saved_searches OWNER TO event_manager;

--
-- Name: score_comments; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.score_comments (
    id text NOT NULL,
    "scoreId" text NOT NULL,
    "criterionId" text NOT NULL,
    "contestantId" text NOT NULL,
    "judgeId" text NOT NULL,
    comment text NOT NULL,
    "isPrivate" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.score_comments OWNER TO event_manager;

--
-- Name: score_files; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.score_files (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "contestantId" text,
    "fileName" text NOT NULL,
    "fileType" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "uploadedById" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.score_files OWNER TO event_manager;

--
-- Name: score_governance_approvals; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.score_governance_approvals (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "approvedById" text NOT NULL,
    "approverRole" text NOT NULL,
    "typedSignature" text,
    "drawnSignatureData" text,
    "signatureFilePath" text,
    "approvedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.score_governance_approvals OWNER TO event_manager;

--
-- Name: score_governance_requests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.score_governance_requests (
    id text NOT NULL,
    "actionType" text NOT NULL,
    "scopeType" text NOT NULL,
    "targetCertificationLevel" text,
    "eventId" text,
    "contestId" text,
    "categoryId" text,
    "contestantId" text,
    "judgeId" text,
    "scoreId" text,
    reason text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "requestedById" text NOT NULL,
    "requesterRole" text NOT NULL,
    "initiatorTypedSignature" text,
    "initiatorDrawnSignatureData" text,
    "initiatorSignatureFilePath" text,
    "requiredAdditionalApprovals" integer DEFAULT 2 NOT NULL,
    "executedAt" timestamp(3) without time zone,
    "executedById" text,
    "executionSummary" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.score_governance_requests OWNER TO event_manager;

--
-- Name: score_removal_requests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.score_removal_requests (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    reason text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "requestedBy" text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tallySignature" text,
    "tallySignedAt" timestamp(3) without time zone,
    "tallySignedBy" text,
    "auditorSignature" text,
    "auditorSignedAt" timestamp(3) without time zone,
    "auditorSignedBy" text,
    "boardSignature" text,
    "boardSignedAt" timestamp(3) without time zone,
    "boardSignedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.score_removal_requests OWNER TO event_manager;

--
-- Name: scores; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.scores (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "judgeId" text NOT NULL,
    "criterionId" text,
    score integer,
    deduction integer DEFAULT 0,
    "deductionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "allowCommentEdit" boolean DEFAULT true NOT NULL,
    "certifiedAt" timestamp(3) without time zone,
    "certifiedBy" text,
    comment text,
    "isCertified" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lockedBy" text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.scores OWNER TO event_manager;

--
-- Name: search_analytics; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.search_analytics (
    id text NOT NULL,
    query text NOT NULL,
    "resultCount" integer NOT NULL,
    "avgResponseTime" integer NOT NULL,
    "searchCount" integer DEFAULT 1 NOT NULL,
    "lastSearched" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.search_analytics OWNER TO event_manager;

--
-- Name: search_history; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.search_history (
    id text NOT NULL,
    "userId" text NOT NULL,
    query text NOT NULL,
    filters text,
    "entityTypes" text,
    "resultCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.search_history OWNER TO event_manager;

--
-- Name: security_settings; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.security_settings (
    id text NOT NULL,
    "passwordMinLength" integer DEFAULT 8 NOT NULL,
    "passwordRequireUppercase" boolean DEFAULT true NOT NULL,
    "passwordRequireLowercase" boolean DEFAULT true NOT NULL,
    "passwordRequireNumbers" boolean DEFAULT true NOT NULL,
    "passwordRequireSymbols" boolean DEFAULT false NOT NULL,
    "passwordExpiryDays" integer DEFAULT 90 NOT NULL,
    "maxLoginAttempts" integer DEFAULT 5 NOT NULL,
    "lockoutDurationMinutes" integer DEFAULT 30 NOT NULL,
    "requireTwoFactor" boolean DEFAULT false NOT NULL,
    "sessionTimeoutMinutes" integer DEFAULT 480 NOT NULL,
    "enableIpWhitelist" boolean DEFAULT false NOT NULL,
    "allowedIps" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.security_settings OWNER TO event_manager;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.system_settings (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    category text,
    "tenantId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "updatedBy" text
);


ALTER TABLE public.system_settings OWNER TO event_manager;

--
-- Name: tally_master_assignments; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.tally_master_assignments (
    id text NOT NULL,
    "userId" text NOT NULL,
    "categoryId" text,
    "contestId" text,
    "eventId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text NOT NULL,
    notes text,
    "tenantId" text NOT NULL
);


ALTER TABLE public.tally_master_assignments OWNER TO event_manager;

--
-- Name: template_criteria; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.template_criteria (
    id text NOT NULL,
    "templateId" text NOT NULL,
    name text NOT NULL,
    "maxScore" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.template_criteria OWNER TO event_manager;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    domain text,
    "isActive" boolean DEFAULT true NOT NULL,
    settings jsonb,
    "maxUsers" integer,
    "maxEvents" integer,
    "maxStorage" bigint,
    "planType" text DEFAULT 'free'::text NOT NULL,
    "subscriptionStatus" text DEFAULT 'active'::text NOT NULL,
    "subscriptionEndsAt" timestamp(3) without time zone,
    "scoringType" public."ScoringType" DEFAULT 'STRAIGHT'::public."ScoringType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tenants OWNER TO event_manager;

--
-- Name: theme_settings; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.theme_settings (
    id text NOT NULL,
    "primaryColor" text DEFAULT '#2563eb'::text NOT NULL,
    "secondaryColor" text DEFAULT '#1e40af'::text NOT NULL,
    "logoPath" text,
    "faviconPath" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.theme_settings OWNER TO event_manager;

--
-- Name: user_field_configurations; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.user_field_configurations (
    id text NOT NULL,
    "fieldName" text NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.user_field_configurations OWNER TO event_manager;

--
-- Name: users; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    "preferredName" text,
    email text NOT NULL,
    password text NOT NULL,
    role public."UserRole" NOT NULL,
    gender text,
    pronouns text,
    "judgeId" text,
    "contestantId" text,
    "sessionVersion" integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "judgeBio" text,
    "judgeSpecialties" text,
    "judgeCertifications" text,
    "contestantBio" text,
    "contestantNumber" text,
    "contestantAge" integer,
    "contestantSchool" text,
    bio text,
    "imagePath" text,
    phone text,
    address text,
    timezone text DEFAULT 'UTC'::text,
    language text DEFAULT 'en'::text,
    "notificationSettings" text,
    "smsPhone" text,
    "smsEnabled" boolean DEFAULT false NOT NULL,
    privacy text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "navigationPreferences" jsonb,
    city text,
    state text,
    country text,
    "tenantId" text NOT NULL,
    "isSuperAdmin" boolean DEFAULT false NOT NULL,
    "mfaBackupCodes" text,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaEnrolledAt" timestamp(3) without time zone,
    "mfaMethod" text DEFAULT 'totp'::text,
    "mfaSecret" text
);


ALTER TABLE public.users OWNER TO event_manager;

--
-- Name: webhook_configs; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.webhook_configs (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    events jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    secret text,
    headers jsonb,
    "retryAttempts" integer DEFAULT 3 NOT NULL,
    timeout integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.webhook_configs OWNER TO event_manager;

--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.webhook_deliveries (
    id text NOT NULL,
    "webhookId" text NOT NULL,
    "eventId" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "lastAttemptAt" timestamp(3) without time zone,
    "responseStatus" integer,
    "responseBody" text,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.webhook_deliveries OWNER TO event_manager;

--
-- Name: winner_signatures; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.winner_signatures (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestId" text NOT NULL,
    "eventId" text NOT NULL,
    "userId" text NOT NULL,
    "userRole" text NOT NULL,
    signature text NOT NULL,
    "signedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.winner_signatures OWNER TO event_manager;

--
-- Name: workflow_instances; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.workflow_instances (
    id text NOT NULL,
    "templateId" text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "currentStepId" text,
    status text DEFAULT 'active'::text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    metadata jsonb
);


ALTER TABLE public.workflow_instances OWNER TO event_manager;

--
-- Name: workflow_step_executions; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.workflow_step_executions (
    id text NOT NULL,
    "instanceId" text NOT NULL,
    "stepId" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "completedBy" text,
    "approvalStatus" text,
    comments text,
    metadata jsonb,
    "tenantId" text NOT NULL
);


ALTER TABLE public.workflow_step_executions OWNER TO event_manager;

--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.workflow_steps (
    id text NOT NULL,
    "templateId" text NOT NULL,
    name text NOT NULL,
    description text,
    "stepOrder" integer NOT NULL,
    "requiredRole" text,
    "autoAdvance" boolean DEFAULT false NOT NULL,
    "requireApproval" boolean DEFAULT true NOT NULL,
    conditions jsonb,
    actions jsonb,
    "notifyRoles" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.workflow_steps OWNER TO event_manager;

--
-- Name: workflow_templates; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.workflow_templates (
    id text NOT NULL,
    "tenantId" text,
    name text NOT NULL,
    description text,
    type text DEFAULT 'certification'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    config jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.workflow_templates OWNER TO event_manager;

--
-- Name: workflow_transitions; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.workflow_transitions (
    id text NOT NULL,
    "fromStepId" text NOT NULL,
    "toStepId" text NOT NULL,
    condition text DEFAULT 'approved'::text,
    "transitionType" text DEFAULT 'sequential'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);


ALTER TABLE public.workflow_transitions OWNER TO event_manager;

--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.activity_logs (id, "userId", "userName", "userRole", action, "resourceType", "resourceId", "ipAddress", "userAgent", "logLevel", "createdAt", details, "tenantId") FROM stdin;
cmli80bsn000o1266m245h6zf	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-11 16:04:42.552	"{\\"timestamp\\":\\"2026-02-11T16:04:42.550Z\\",\\"email\\":\\"admin@eventmanager.com\\"}"	\N
cmli865vq001c1266ccp4f4a6	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-11 16:09:14.822	"{\\"timestamp\\":\\"2026-02-11T16:09:14.821Z\\",\\"email\\":\\"admin@eventmanager.com\\"}"	\N
cmlj59a980001ntdzssci39nw	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	INFO	2026-02-12 07:35:27.788	"{\\"timestamp\\":\\"2026-02-12T07:35:27.787Z\\",\\"email\\":\\"admin@eventmanager.com\\"}"	\N
cmljkxvbh00046gb5tx3mpjup	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-12 14:54:29.069	"{\\"timestamp\\":\\"2026-02-12T14:54:29.067Z\\",\\"email\\":\\"admin@eventmanager.com\\"}"	\N
cmljkygon00086gb5y7qpfi0v	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	UPLOAD_USER_IMAGE	USER	cmlhmo05t000113i25pe4ao5e	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-12 14:54:56.759	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmlhmo05t000113i25pe4ao5e/image\\",\\"timestamp\\":\\"2026-02-12T14:54:56.644Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlhmo05t000113i25pe4ao5e\\"}}"	\N
cmljlis1i0048ob68wnbyn5qt	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	CREATE_TEST_EVENT	EVENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-12 15:10:44.599	"{\\"method\\":\\"POST\\",\\"path\\":\\"/\\",\\"timestamp\\":\\"2026-02-12T15:10:44.486Z\\",\\"body\\":{\\"eventName\\":\\"Test Event 2/12/2026\\",\\"contestCount\\":2,\\"contestNames\\":[],\\"categoriesPerContest\\":2,\\"contestantsPerCategory\\":3,\\"judgesPerCategory\\":3,\\"tallyMastersPerContest\\":2,\\"auditorsPerContest\\":2,\\"boardUsers\\":1,\\"organizers\\":1,\\"emcees\\":1,\\"admins\\":0,\\"assignJudgesToCategories\\":true,\\"assignContestantsToCategories\\":true,\\"defaultPassword\\":\\"[REDACTED]\\",\\"createNewTenant\\":true,\\"tenantName\\":\\"FebTest1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmljqdpm3004cob686y6un3n2	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:26:46.251	"{\\"timestamp\\":\\"2026-02-12T17:26:46.250Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmljqfaf0004lob684tc0zulq	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:27:59.868	"{\\"timestamp\\":\\"2026-02-12T17:27:59.867Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmljqg424004tob68i5maxo0p	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:28:38.284	"{\\"timestamp\\":\\"2026-02-12T17:28:38.283Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmljqgwex0053ob68u09oeox1	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:29:15.033	"{\\"timestamp\\":\\"2026-02-12T17:29:15.032Z\\",\\"email\\":\\"admin@eventmanager.com\\"}"	\N
cmljqk24k0059ob68ej8yfuhw	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:31:42.404	"{\\"timestamp\\":\\"2026-02-12T17:31:42.403Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmljqkjyv005eob68rtp9gyhh	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:32:05.527	"{\\"timestamp\\":\\"2026-02-12T17:32:05.526Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmljql3zf005job68azzo76xi	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:32:31.467	"{\\"timestamp\\":\\"2026-02-12T17:32:31.466Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmljqsgjy000cicfr55fe4gv7	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 17:38:14.35	"{\\"timestamp\\":\\"2026-02-12T17:38:14.349Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmljqu3b9000kicfryalkmi1p	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-12 17:39:30.501	"{\\"timestamp\\":\\"2026-02-12T17:39:30.500Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmljz6xyn001in3b21srj45b2	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 21:33:27.024	"{\\"timestamp\\":\\"2026-02-12T21:33:27.022Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlk0ovpb0005ne1tm6e3ur4z	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirqb001eob68rgz3sgrq\\",\\"timestamp\\":\\"2026-02-12T22:15:23.409Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirqb001eob68rgz3sgrq\\"}}"	\N
cmlk0ovrp0009ne1t4ous9vq8	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirsy0022ob68fq9xcihn\\",\\"timestamp\\":\\"2026-02-12T22:15:23.437Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirsy0022ob68fq9xcihn\\"}}"	\N
cmlk0ovrq000bne1t0hzsaktj	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirx9003xob68r3rmw43a\\",\\"timestamp\\":\\"2026-02-12T22:15:23.494Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirx9003xob68r3rmw43a\\"}}"	\N
cmlk0ovru000dne1tq0o3rlnj	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.521	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirvx003bob68hcygkm7y\\",\\"timestamp\\":\\"2026-02-12T22:15:23.513Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirvx003bob68hcygkm7y\\"}}"	\N
cmlkg2x1k0001n31oqe58duur	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:26:12.68	"{\\"timestamp\\":\\"2026-02-13T05:26:12.679Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmlk0ovs7000fne1tiii3947z	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirw0003dob684r6hotvu\\",\\"timestamp\\":\\"2026-02-12T22:15:23.471Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirw0003dob684r6hotvu\\"}}"	\N
cmlk0ovrh0007ne1t6efa8g03	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirqq001iob68phzkj6ma\\",\\"timestamp\\":\\"2026-02-12T22:15:23.410Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirqq001iob68phzkj6ma\\"}}"	\N
cmlk0ovs9000jne1t3gw4t887	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirqm001gob68di2ibyha\\",\\"timestamp\\":\\"2026-02-12T22:15:23.408Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirqm001gob68di2ibyha\\"}}"	\N
cmlk0ovsb000lne1t6jzvtxr1	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.538	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirx6003vob68yvmmaioq\\",\\"timestamp\\":\\"2026-02-12T22:15:23.534Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirx6003vob68yvmmaioq\\"}}"	\N
cmlk0ovsc000nne1t735zdq85	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirvu0039ob68hy1hwdri\\",\\"timestamp\\":\\"2026-02-12T22:15:23.438Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirvu0039ob68hy1hwdri\\"}}"	\N
cmlk0ovs8000hne1t6bve9tzc	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirsr001yob6873j28q6s\\",\\"timestamp\\":\\"2026-02-12T22:15:23.484Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirsr001yob6873j28q6s\\"}}"	\N
cmlk0ovsm000pne1t5o382p67	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.524	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirsv0020ob68nnavhyh4\\",\\"timestamp\\":\\"2026-02-12T22:15:23.523Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirsv0020ob68nnavhyh4\\"}}"	\N
cmlk0ovsn000rne1txmw0iapt	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:15:23.52	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmljlirx3003tob68oj3d6ypf\\",\\"timestamp\\":\\"2026-02-12T22:15:23.505Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmljlirx3003tob68oj3d6ypf\\"}}"	\N
cmlk0qqiz0011ne1tmyu6cso2	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:16:50.123	"{\\"timestamp\\":\\"2026-02-12T22:16:50.122Z\\",\\"email\\":\\"admin@eventmanager.com\\"}"	\N
cmlk0rdl2001lne1tfci90jxn	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.006	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/contestant/cmljlirs3001pob68yvuy06zq\\",\\"timestamp\\":\\"2026-02-12T22:17:20.004Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\",\\"contestantId\\":\\"cmljlirs3001pob68yvuy06zq\\"}}"	\N
cmlk0rdl2001nne1te0zgjxcb	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.006	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/contestant/cmljlirqt001job681aanlcf9\\",\\"timestamp\\":\\"2026-02-12T22:17:20.005Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\",\\"contestantId\\":\\"cmljlirqt001job681aanlcf9\\"}}"	\N
cmlk0rdls001pne1t22706wxp	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirsl001tob68g5doaqiz	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.032	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirsl001tob68g5doaqiz/contestant/cmljlirtc0026ob68oeivfue8\\",\\"timestamp\\":\\"2026-02-12T22:17:20.031Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirsl001tob68g5doaqiz\\",\\"contestantId\\":\\"cmljlirtc0026ob68oeivfue8\\"}}"	\N
cmlk0rdmd001rne1tn6gpv0mq	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.054	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/contestant/cmljlirrn001mob68njh1kfxa\\",\\"timestamp\\":\\"2026-02-12T22:17:20.053Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\",\\"contestantId\\":\\"cmljlirrn001mob68njh1kfxa\\"}}"	\N
cmlk0rdmz001tne1tixtxavn5	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirsl001tob68g5doaqiz	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.075	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirsl001tob68g5doaqiz/contestant/cmljlirt10023ob68i95s91j9\\",\\"timestamp\\":\\"2026-02-12T22:17:20.074Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirsl001tob68g5doaqiz\\",\\"contestantId\\":\\"cmljlirt10023ob68i95s91j9\\"}}"	\N
cmlk0rdnq001wne1t2mt4davn	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirsl001tob68g5doaqiz	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.102	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirsl001tob68g5doaqiz/contestant/cmljlirtq0029ob686m2zddk0\\",\\"timestamp\\":\\"2026-02-12T22:17:20.101Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirsl001tob68g5doaqiz\\",\\"contestantId\\":\\"cmljlirtq0029ob686m2zddk0\\"}}"	\N
cmlk0rdoa001yne1t8l5krxaw	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.122	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirwe003hob68s8ytekgz\\",\\"timestamp\\":\\"2026-02-12T22:17:20.121Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\",\\"contestantId\\":\\"cmljlirwe003hob68s8ytekgz\\"}}"	\N
cmlk0rdot0020ne1tdi6rl2eo	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.141	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirwo003kob6814xf7nic\\",\\"timestamp\\":\\"2026-02-12T22:17:20.140Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\",\\"contestantId\\":\\"cmljlirwo003kob6814xf7nic\\"}}"	\N
cmlk0rdp70022ne1tje12ygil	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.156	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirw2003eob68xso9tgw4\\",\\"timestamp\\":\\"2026-02-12T22:17:20.155Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\",\\"contestantId\\":\\"cmljlirw2003eob68xso9tgw4\\"}}"	\N
cmlk0rdpl0024ne1t79jq3v8a	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.169	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirwy003oob68mlnuivt0/contestant/cmljlirxa003yob680qcbsklm\\",\\"timestamp\\":\\"2026-02-12T22:17:20.168Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\",\\"contestantId\\":\\"cmljlirxa003yob680qcbsklm\\"}}"	\N
cmlk0rdpt0026ne1tentoluzb	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.178	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirwy003oob68mlnuivt0/contestant/cmljlirxu0044ob68fxovv5kp\\",\\"timestamp\\":\\"2026-02-12T22:17:20.176Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\",\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\"}}"	\N
cmlk0rdq30028ne1tvyy2huy7	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_CONTESTANT	ASSIGNMENT	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:17:20.187	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/category/cmljlirwy003oob68mlnuivt0/contestant/cmljlirxk0041ob68v1skg631\\",\\"timestamp\\":\\"2026-02-12T22:17:20.186Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\",\\"contestantId\\":\\"cmljlirxk0041ob68v1skg631\\"}}"	\N
cmlk16m0z0002mg6pgrv1vdul	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.787	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirph0019ob68twuglukq_cmljlirp00015ob68hyms1aec\\",\\"timestamp\\":\\"2026-02-12T22:29:10.674Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirph0019ob68twuglukq_cmljlirp00015ob68hyms1aec\\"}}"	\N
cmlk16m1k0004mg6pfn7dfhdy	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.808	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljlirv1002xob688e4krg32\\",\\"timestamp\\":\\"2026-02-12T22:29:10.807Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljlirv1002xob688e4krg32\\"}}"	\N
cmlk16m1w0007mg6pwq5dv3ni	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.82	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirwy003oob68mlnuivt0_cmljlirvd0030ob68c9i8i2mg\\",\\"timestamp\\":\\"2026-02-12T22:29:10.817Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirwy003oob68mlnuivt0_cmljlirvd0030ob68c9i8i2mg\\"}}"	\N
cmlk16m290009mg6pm9zs74f9	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.833	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirwy003oob68mlnuivt0_cmljliruq002uob681ke92klv\\",\\"timestamp\\":\\"2026-02-12T22:29:10.832Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirwy003oob68mlnuivt0_cmljliruq002uob681ke92klv\\"}}"	\N
cmlk16m2b000bmg6poq6b9fta	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.787	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirph0019ob68twuglukq_cmljlirnx000zob680q6vc92v\\",\\"timestamp\\":\\"2026-02-12T22:29:10.673Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirph0019ob68twuglukq_cmljlirnx000zob680q6vc92v\\"}}"	\N
cmlk16m2r000dmg6prw03p864	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.787	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirsl001tob68g5doaqiz_cmljlirp00015ob68hyms1aec\\",\\"timestamp\\":\\"2026-02-12T22:29:10.746Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirsl001tob68g5doaqiz_cmljlirp00015ob68hyms1aec\\"}}"	\N
cmlk16m30000img6pcjn4h62z	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.789	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirph0019ob68twuglukq_cmljliroo0012ob68f825shsg\\",\\"timestamp\\":\\"2026-02-12T22:29:10.702Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirph0019ob68twuglukq_cmljliroo0012ob68f825shsg\\"}}"	\N
cmlk16m2z000fmg6piyhhd9je	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.788	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljlirvd0030ob68c9i8i2mg\\",\\"timestamp\\":\\"2026-02-12T22:29:10.777Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljlirvd0030ob68c9i8i2mg\\"}}"	\N
cmlk16m30000jmg6pw2k3tsqf	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.787	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirsl001tob68g5doaqiz_cmljliroo0012ob68f825shsg\\",\\"timestamp\\":\\"2026-02-12T22:29:10.702Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirsl001tob68g5doaqiz_cmljliroo0012ob68f825shsg\\"}}"	\N
cmlk16m35000lmg6prvfxsb52	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.788	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirsl001tob68g5doaqiz_cmljlirnx000zob680q6vc92v\\",\\"timestamp\\":\\"2026-02-12T22:29:10.674Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirsl001tob68g5doaqiz_cmljlirnx000zob680q6vc92v\\"}}"	\N
cmlk16m3c000nmg6ptj0dncj4	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.794	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljliruq002uob681ke92klv\\",\\"timestamp\\":\\"2026-02-12T22:29:10.792Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljliruq002uob681ke92klv\\"}}"	\N
cmlk16m40000pmg6pe0dvcb9x	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:29:10.83	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/categoryJudge_cmljlirwy003oob68mlnuivt0_cmljlirv1002xob688e4krg32\\",\\"timestamp\\":\\"2026-02-12T22:29:10.826Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"categoryJudge_cmljlirwy003oob68mlnuivt0_cmljlirv1002xob688e4krg32\\"}}"	\N
cmlk1fhxj000a5qlqogu37meu	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	ASSIGN_JUDGE	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:36:05.384	"{\\"method\\":\\"POST\\",\\"path\\":\\"/judge\\",\\"timestamp\\":\\"2026-02-12T22:36:05.269Z\\",\\"body\\":{\\"judgeId\\":\\"cmljlirnx000zob680q6vc92v\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1fhyh000c5qlqpgvpbufe	cmlhmo05t000113i25pe4ao5e	Admin User	SUPER_ADMIN	ASSIGN_JUDGE	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:36:05.384	"{\\"method\\":\\"POST\\",\\"path\\":\\"/judge\\",\\"timestamp\\":\\"2026-02-12T22:36:05.305Z\\",\\"body\\":{\\"judgeId\\":\\"cmljliroo0012ob68f825shsg\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1l8s6000j5qlq3kv7etpg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:33.462	"{\\"timestamp\\":\\"2026-02-12T22:40:33.461Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlk1lo2p000o5qlqr4942qgy	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:53.28	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:40:53.278Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirqt001job681aanlcf9\\",\\"categoryId\\":\\"cmljlirsl001tob68g5doaqiz\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1lo2p000q5qlqtbtwtx2j	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:53.28	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:40:53.279Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirqt001job681aanlcf9\\",\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1lo2y000s5qlqg7tkzn41	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:53.291	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:40:53.290Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirxa003yob680qcbsklm\\",\\"categoryId\\":\\"cmljlirsl001tob68g5doaqiz\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1lo2z000u5qlq3mqqplpg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:53.291	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:40:53.290Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirxk0041ob68v1skg631\\",\\"categoryId\\":\\"cmljlirsl001tob68g5doaqiz\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1lo38000y5qlqrjvtv82l	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:53.301	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:40:53.299Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirxa003yob680qcbsklm\\",\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1lo3m00125qlq89dmyry0	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:40:53.314	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:40:53.313Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirxk0041ob68v1skg631\\",\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1m1iz00155qlqaf158pgi	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:41:10.671	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:41:10.669Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\",\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1m1j400175qlq3mlch1zq	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:41:10.67	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:41:10.668Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\",\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1m1jn001b5qlqdfcu9s8p	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:41:10.672	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:41:10.670Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirrn001mob68njh1kfxa\\",\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1m1jk00195qlqvf6te255	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:41:10.682	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:41:10.680Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirrn001mob68njh1kfxa\\",\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1m1ju001d5qlqo5bll0fl	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:41:10.746	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:41:10.744Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirs3001pob68yvuy06zq\\",\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1m1k5001f5qlqyx60hhbw	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_CONTESTANT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:41:10.757	"{\\"method\\":\\"POST\\",\\"path\\":\\"/contestants\\",\\"timestamp\\":\\"2026-02-12T22:41:10.756Z\\",\\"body\\":{\\"contestantId\\":\\"cmljlirs3001pob68yvuy06zq\\",\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1nn99001q5qlq1k8nyvx1	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_TALLY_MASTER	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:42:25.533	"{\\"method\\":\\"POST\\",\\"path\\":\\"/tally-masters\\",\\"timestamp\\":\\"2026-02-12T22:42:25.532Z\\",\\"body\\":{\\"userId\\":\\"cmljlirua002job689fk5gquu\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmllqw1tx0006t11z0c09e6kf	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 03:16:34.246	"{\\"timestamp\\":\\"2026-02-14T03:16:34.245Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlk1nn9c001s5qlqeu8bb9cn	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_TALLY_MASTER	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:42:25.537	"{\\"method\\":\\"POST\\",\\"path\\":\\"/tally-masters\\",\\"timestamp\\":\\"2026-02-12T22:42:25.535Z\\",\\"body\\":{\\"userId\\":\\"cmljliru5002fob686k6uth1t\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1nzsv001z5qlq3ihugfpo	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_TALLY_MASTER	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:42:41.791	"{\\"method\\":\\"POST\\",\\"path\\":\\"/tally-masters\\",\\"timestamp\\":\\"2026-02-12T22:42:41.790Z\\",\\"body\\":{\\"userId\\":\\"cmljlirmz000kob68oyxznmzh\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljliru3002dob68d2n822p1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1oelo002j5qlqjuqzrt1b	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_AUDITOR	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:43:00.972	"{\\"method\\":\\"POST\\",\\"path\\":\\"/auditors\\",\\"timestamp\\":\\"2026-02-12T22:43:00.970Z\\",\\"body\\":{\\"userId\\":\\"cmljlirns000wob68z2ljsw06\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljliru3002dob68d2n822p1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1nzsw00215qlqaavis9ji	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_TALLY_MASTER	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:42:41.792	"{\\"method\\":\\"POST\\",\\"path\\":\\"/tally-masters\\",\\"timestamp\\":\\"2026-02-12T22:42:41.790Z\\",\\"body\\":{\\"userId\\":\\"cmljlirna000oob68cn4w7bsj\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljliru3002dob68d2n822p1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1o8p000285qlq57skarz9	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_AUDITOR	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:42:53.316	"{\\"method\\":\\"POST\\",\\"path\\":\\"/auditors\\",\\"timestamp\\":\\"2026-02-12T22:42:53.315Z\\",\\"body\\":{\\"userId\\":\\"cmljliruf002nob68irq7g7a5\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1o8p2002a5qlq4kpsbc9i	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_AUDITOR	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:42:53.319	"{\\"method\\":\\"POST\\",\\"path\\":\\"/auditors\\",\\"timestamp\\":\\"2026-02-12T22:42:53.317Z\\",\\"body\\":{\\"userId\\":\\"cmljlirul002rob680lp6t95y\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1oeln002h5qlqcnvjjpu9	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_AUDITOR	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 22:43:00.97	"{\\"method\\":\\"POST\\",\\"path\\":\\"/auditors\\",\\"timestamp\\":\\"2026-02-12T22:43:00.969Z\\",\\"body\\":{\\"userId\\":\\"cmljlirnl000sob68a6phas6e\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\",\\"contestId\\":\\"cmljliru3002dob68d2n822p1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk1wdvt003m5qlqieri3zqn	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-12 22:49:13.29	"{\\"timestamp\\":\\"2026-02-12T22:49:13.288Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmlk3335q000edr28rwhk2ofn	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPLOAD_EMCEE_SCRIPT	EMCEE	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 23:22:25.598	"{\\"method\\":\\"POST\\",\\"path\\":\\"/scripts\\",\\"timestamp\\":\\"2026-02-12T23:22:25.489Z\\",\\"body\\":{\\"title\\":\\"test1\\",\\"description\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlk33561000gdr28ocheamqx	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	TOGGLE_EMCEE_SCRIPT	EMCEE	cmlk3332a000cdr28396ujcqf	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 23:22:28.201	"{\\"method\\":\\"PATCH\\",\\"path\\":\\"/scripts/cmlk3332a000cdr28396ujcqf/toggle\\",\\"timestamp\\":\\"2026-02-12T23:22:28.200Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlk3332a000cdr28396ujcqf\\"}}"	\N
cmlk33hhu000idr284hj2qqan	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	TOGGLE_EMCEE_SCRIPT	EMCEE	cmlk3332a000cdr28396ujcqf	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 23:22:44.178	"{\\"method\\":\\"PATCH\\",\\"path\\":\\"/scripts/cmlk3332a000cdr28396ujcqf/toggle\\",\\"timestamp\\":\\"2026-02-12T23:22:44.177Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlk3332a000cdr28396ujcqf\\"}}"	\N
cmlk33jbe000kdr284napya2j	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	TOGGLE_EMCEE_SCRIPT	EMCEE	cmlk3332a000cdr28396ujcqf	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 23:22:46.539	"{\\"method\\":\\"PATCH\\",\\"path\\":\\"/scripts/cmlk3332a000cdr28396ujcqf/toggle\\",\\"timestamp\\":\\"2026-02-12T23:22:46.538Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlk3332a000cdr28396ujcqf\\"}}"	\N
cmlk34s1s000odr28p8tdmb7l	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_USER	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 23:23:44.512	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg\\",\\"timestamp\\":\\"2026-02-12T23:23:44.510Z\\",\\"body\\":{\\"name\\":\\"Test Contestant 12\\",\\"preferredName\\":\\"\\",\\"email\\":\\"contestant12@febtest1.com\\",\\"role\\":\\"CONTESTANT\\",\\"gender\\":\\"\\",\\"pronouns\\":\\"\\",\\"phone\\":\\"\\",\\"bio\\":\\"\\",\\"isActive\\":true},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlk34sav000qdr28n1k81zmc	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPLOAD_USER_IMAGE	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-12 23:23:44.839	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg/image\\",\\"timestamp\\":\\"2026-02-12T23:23:44.838Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlkdtcus00027gqpffmgvcdw	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 04:22:47.38	"{\\"timestamp\\":\\"2026-02-13T04:22:47.379Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmlkdxnz1000f7gqphdmoqns5	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:26:08.414	"{\\"timestamp\\":\\"2026-02-13T04:26:08.412Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlkdz4ge000r7gqp7oqawmp7	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:27:16.43	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmlk1fhtq00045qlqa3zqcbzt\\",\\"timestamp\\":\\"2026-02-13T04:27:16.318Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmlk1fhtq00045qlqa3zqcbzt\\"}}"	\N
cmlkdzjqb000w7gqpka3auahj	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:27:36.227	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmlk1fhtq00035qlqn8wk2328\\",\\"timestamp\\":\\"2026-02-13T04:27:36.226Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmlk1fhtq00035qlqn8wk2328\\"}}"	\N
cmlkecf3z000codtxy6sowuum	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_JUDGE	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:37:36.767	"{\\"method\\":\\"POST\\",\\"path\\":\\"/judge\\",\\"timestamp\\":\\"2026-02-13T04:37:36.656Z\\",\\"body\\":{\\"judgeId\\":\\"cmljlirnx000zob680q6vc92v\\",\\"contestId\\":\\"cmljlirlz000iob68vgxu6sxk\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlkecpfg000fodtx67f6x4gf	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:37:50.141	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmlkecf0f000aodtx6uspffqq\\",\\"timestamp\\":\\"2026-02-13T04:37:50.140Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmlkecf0f000aodtx6uspffqq\\"}}"	\N
cmllr76th000414d5b006xd0e	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 03:25:13.925	"{\\"timestamp\\":\\"2026-02-14T03:25:13.924Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlkecpge000hodtxtbm15lqp	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	REMOVE_ASSIGNMENT	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:37:50.141	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/remove/cmlkecf0f0009odtxjiv5ec9w\\",\\"timestamp\\":\\"2026-02-13T04:37:50.140Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"assignmentId\\":\\"cmlkecf0f0009odtxjiv5ec9w\\"}}"	\N
cmlkecwmo000oodtxnqgctcqv	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_JUDGE	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:37:59.473	"{\\"method\\":\\"POST\\",\\"path\\":\\"/judge\\",\\"timestamp\\":\\"2026-02-13T04:37:59.471Z\\",\\"body\\":{\\"judgeId\\":\\"cmljlirnx000zob680q6vc92v\\",\\"contestId\\":\\"cmljliru3002dob68d2n822p1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlkeuswj000beqlnaczltge1	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	SUBMIT_SCORE	SCORE	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 04:51:54.451	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp\\",\\"timestamp\\":\\"2026-02-13T04:51:54.327Z\\",\\"body\\":{\\"score\\":20,\\"criteriaId\\":\\"cmljlirvq0035ob68kwn6vf3i\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\",\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\"}}"	\N
cmlkeusxx000deqlnxsna9980	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	SUBMIT_SCORE	SCORE	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 04:51:54.451	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp\\",\\"timestamp\\":\\"2026-02-13T04:51:54.336Z\\",\\"body\\":{\\"score\\":30,\\"criteriaId\\":\\"cmljlirvr0036ob68yadc79kx\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\",\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\"}}"	\N
cmlkeusy0000feqlnnu8ps0nx	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	SUBMIT_SCORE	SCORE	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 04:51:54.451	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp\\",\\"timestamp\\":\\"2026-02-13T04:51:54.352Z\\",\\"body\\":{\\"score\\":15,\\"criteriaId\\":\\"cmljlirvr0037ob68wwmdcu1b\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\",\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\"}}"	\N
cmlkf31p5000bzuta6ptskfwv	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_USER	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:58:19.097	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg\\",\\"timestamp\\":\\"2026-02-13T04:58:18.988Z\\",\\"body\\":{\\"name\\":\\"Test Contestant 12\\",\\"preferredName\\":\\"\\",\\"email\\":\\"contestant12@febtest1.com\\",\\"role\\":\\"CONTESTANT\\",\\"gender\\":\\"\\",\\"pronouns\\":\\"\\",\\"phone\\":\\"\\",\\"bio\\":\\"\\",\\"isActive\\":true},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlkf31ws000dzutatmajkpjt	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPLOAD_USER_IMAGE	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:58:19.373	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg/image\\",\\"timestamp\\":\\"2026-02-13T04:58:19.372Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlkf3koe000gzutar1mks725	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_USER	USER	cmljlirrs001oob68mrcy0j72	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:58:43.694	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirrs001oob68mrcy0j72\\",\\"timestamp\\":\\"2026-02-13T04:58:43.692Z\\",\\"body\\":{\\"name\\":\\"Test Contestant 2\\",\\"preferredName\\":\\"\\",\\"email\\":\\"contestant2@febtest1.com\\",\\"role\\":\\"CONTESTANT\\",\\"gender\\":\\"\\",\\"pronouns\\":\\"\\",\\"phone\\":\\"\\",\\"bio\\":\\"\\",\\"isActive\\":true},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirrs001oob68mrcy0j72\\"}}"	\N
cmlkf3kx8000izutaie9ylxao	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPLOAD_USER_BIO_FILE	USER	cmljlirrs001oob68mrcy0j72	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 04:58:44.012	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmljlirrs001oob68mrcy0j72/bio-file\\",\\"timestamp\\":\\"2026-02-13T04:58:44.011Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirrs001oob68mrcy0j72\\"}}"	\N
cmlkfb5iz0006vgv7bmlmlnwv	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_USER	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:04:37.307	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg\\",\\"timestamp\\":\\"2026-02-13T05:04:37.191Z\\",\\"body\\":{\\"name\\":\\"Test Contestant 12\\",\\"preferredName\\":\\"\\",\\"email\\":\\"contestant12@febtest1.com\\",\\"role\\":\\"CONTESTANT\\",\\"gender\\":\\"\\",\\"pronouns\\":\\"\\",\\"phone\\":\\"\\",\\"bio\\":\\"\\",\\"isActive\\":true},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlkfb5r40008vgv7h2ccvy70	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPLOAD_USER_IMAGE	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:04:37.6	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg/image\\",\\"timestamp\\":\\"2026-02-13T05:04:37.599Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlkfctcn000dvgv7kf8qy865	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_USER	USER	cmljlirxw0046ob689rtkcnzg	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:05:54.838	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirxw0046ob689rtkcnzg\\",\\"timestamp\\":\\"2026-02-13T05:05:54.836Z\\",\\"body\\":{\\"name\\":\\"Test Contestant 12\\",\\"preferredName\\":\\"\\",\\"email\\":\\"contestant12@febtest1.com\\",\\"role\\":\\"CONTESTANT\\",\\"gender\\":\\"\\",\\"pronouns\\":\\"\\",\\"phone\\":\\"\\",\\"bio\\":\\"test bio text entry\\",\\"isActive\\":true},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirxw0046ob689rtkcnzg\\"}}"	\N
cmlkg0jqw00138k7wjkg8c5wg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_CONTEST	CONTEST	cmljlirlz000iob68vgxu6sxk	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:24:22.136	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirlz000iob68vgxu6sxk\\",\\"timestamp\\":\\"2026-02-13T05:24:22.134Z\\",\\"body\\":{\\"name\\":\\"Bear\\",\\"description\\":\\"Test Contest 1 description\\"},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirlz000iob68vgxu6sxk\\"}}"	\N
cmlkg0osu00158k7wzi4ftcir	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_CONTEST	CONTEST	cmljliru3002dob68d2n822p1	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:24:28.686	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljliru3002dob68d2n822p1\\",\\"timestamp\\":\\"2026-02-13T05:24:28.685Z\\",\\"body\\":{\\"name\\":\\"Pet\\",\\"description\\":\\"Test Contest 2 description\\"},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljliru3002dob68d2n822p1\\"}}"	\N
cmlkg54tg000rn31o7mgf0v33	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeuss00002eqlnhi814ubo	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:27:56.068	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeuss00002eqlnhi814ubo\\",\\"timestamp\\":\\"2026-02-13T05:27:55.937Z\\",\\"body\\":{\\"score\\":30,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeuss00002eqlnhi814ubo\\"}}"	\N
cmlkg54uk000tn31ok8130gqy	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeuss00004eqlnp2qcl0bp	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:27:56.068	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeuss00004eqlnp2qcl0bp\\",\\"timestamp\\":\\"2026-02-13T05:27:55.935Z\\",\\"body\\":{\\"score\\":20,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeuss00004eqlnp2qcl0bp\\"}}"	\N
cmlkg54ul000vn31o4zsoy3gp	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeusso0006eqlnbc2wpty6	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:27:56.068	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeusso0006eqlnbc2wpty6\\",\\"timestamp\\":\\"2026-02-13T05:27:55.955Z\\",\\"body\\":{\\"score\\":10,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeusso0006eqlnbc2wpty6\\"}}"	\N
cmlkg54um000xn31o1my6s9mi	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	CERTIFY_SCORES	SCORE	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:27:56.068	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/certify\\",\\"timestamp\\":\\"2026-02-13T05:27:56.056Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\"}}"	\N
cmlkg5hta0013n31objaues9p	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeuss00002eqlnhi814ubo	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:28:12.91	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeuss00002eqlnhi814ubo\\",\\"timestamp\\":\\"2026-02-13T05:28:12.909Z\\",\\"body\\":{\\"score\\":30,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeuss00002eqlnhi814ubo\\"}}"	\N
cmlkg5htf0015n31oacf5jxwa	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeusso0006eqlnbc2wpty6	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:28:12.915	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeusso0006eqlnbc2wpty6\\",\\"timestamp\\":\\"2026-02-13T05:28:12.914Z\\",\\"body\\":{\\"score\\":10,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeusso0006eqlnbc2wpty6\\"}}"	\N
cmlkg5uow0018n31oij2pkucl	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeuss00004eqlnp2qcl0bp	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:28:29.6	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeuss00004eqlnp2qcl0bp\\",\\"timestamp\\":\\"2026-02-13T05:28:29.599Z\\",\\"body\\":{\\"score\\":20,\\"comments\\":\\"test post-cert comment\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeuss00004eqlnp2qcl0bp\\"}}"	\N
cmlkg5uox001an31ovx7lnnkt	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeuss00002eqlnhi814ubo	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:28:29.601	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeuss00002eqlnhi814ubo\\",\\"timestamp\\":\\"2026-02-13T05:28:29.600Z\\",\\"body\\":{\\"score\\":30,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeuss00002eqlnhi814ubo\\"}}"	\N
cmlkg5uoy001cn31otw29u14m	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmlkeusso0006eqlnbc2wpty6	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:28:29.602	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmlkeusso0006eqlnbc2wpty6\\",\\"timestamp\\":\\"2026-02-13T05:28:29.601Z\\",\\"body\\":{\\"score\\":10,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmlkeusso0006eqlnbc2wpty6\\"}}"	\N
cmlkg5uri001fn31o96ym1uvo	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	CERTIFY_SCORES	SCORE	cmljlirvn0034ob68j0fq4d2t	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 05:28:29.693	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirvn0034ob68j0fq4d2t/certify\\",\\"timestamp\\":\\"2026-02-13T05:28:29.692Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirvn0034ob68j0fq4d2t\\"}}"	\N
cmlkg6iku001mn31ozq4vy9fb	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:29:00.558	"{\\"timestamp\\":\\"2026-02-13T05:29:00.557Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlkh359s0006bqx2hoe190wg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_CATEGORY	CATEGORY	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:54:22.96	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirwy003oob68mlnuivt0\\",\\"timestamp\\":\\"2026-02-13T05:54:22.839Z\\",\\"body\\":{\\"name\\":\\"PubIm\\",\\"description\\":\\"Test category 2-2 description\\",\\"scoreCap\\":100},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirwy003oob68mlnuivt0\\"}}"	\N
cmlkh3sb60009bqx2lyyukqmg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_CATEGORY	CATEGORY	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:54:52.818	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmljlirwy003oob68mlnuivt0\\",\\"timestamp\\":\\"2026-02-13T05:54:52.816Z\\",\\"body\\":{\\"name\\":\\"PubIm\\",\\"description\\":\\"Test category 2-2 description\\",\\"scoreCap\\":30},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmljlirwy003oob68mlnuivt0\\"}}"	\N
cmlkh3sdf000cbqx2gqafq96x	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	DELETE_CRITERION	CRITERION	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:54:52.899	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/criteria/cmljlirx0003rob68nglxcjhi\\",\\"timestamp\\":\\"2026-02-13T05:54:52.898Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"criterionId\\":\\"cmljlirx0003rob68nglxcjhi\\"}}"	\N
cmlkh3seh000ebqx2y9znyika	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	DELETE_CRITERION	CRITERION	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 05:54:52.9	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/criteria/cmljlirx0003qob68l0opkge5\\",\\"timestamp\\":\\"2026-02-13T05:54:52.897Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"criterionId\\":\\"cmljlirx0003qob68l0opkge5\\"}}"	\N
cmlkhbgsy000lbqx2mjogogmw	cmljlirxw0046ob689rtkcnzg	Test Contestant 12	CONTESTANT	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 06:00:51.155	"{\\"timestamp\\":\\"2026-02-13T06:00:51.154Z\\",\\"email\\":\\"contestant12@febtest1.com\\"}"	\N
cmlkheloq0010bqx2da45rhxo	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 06:03:17.45	"{\\"timestamp\\":\\"2026-02-13T06:03:17.449Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmlkhf1640015bqx2suek0t9z	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 06:03:37.517	"{\\"timestamp\\":\\"2026-02-13T06:03:37.516Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmlkhiw2r001dbqx2rkuhqvp3	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 06:06:37.539	"{\\"timestamp\\":\\"2026-02-13T06:06:37.538Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmlkjkt690020bqx2v8t6090d	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 07:04:06.322	"{\\"timestamp\\":\\"2026-02-13T07:04:06.321Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlkkj8ik0009dy5b8iqfudnc	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 07:30:52.509	"{\\"timestamp\\":\\"2026-02-13T07:30:52.507Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmll5xcgq00015x9rg2vsareh	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 17:29:42.746	"{\\"timestamp\\":\\"2026-02-13T17:29:42.745Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmll5y29500065x9rrd0hm3fw	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 17:30:16.169	"{\\"timestamp\\":\\"2026-02-13T17:30:16.168Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmll6024t000i5x9rjz1asfrt	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 17:31:49.325	"{\\"timestamp\\":\\"2026-02-13T17:31:49.324Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmll6721j001d5x9ro1bp289g	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 17:37:15.799	"{\\"timestamp\\":\\"2026-02-13T17:37:15.798Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmll7qnwv0003uikq50kuxvtu	cmljliror0014ob68xdcfhymw	Test Judge 2	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:20:30.223	"{\\"timestamp\\":\\"2026-02-13T18:20:30.222Z\\",\\"email\\":\\"judge2@febtest1.com\\"}"	\N
cmll7r898000juikqg7w4m9ty	cmljliror0014ob68xdcfhymw	Test Judge 2	JUDGE	SUBMIT_SCORE	SCORE	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:20:56.589	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/contestant/cmljlirqt001job681aanlcf9\\",\\"timestamp\\":\\"2026-02-13T18:20:56.475Z\\",\\"body\\":{\\"score\\":20,\\"criteriaId\\":\\"cmljlirpm001aob68zz80a4eb\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\",\\"contestantId\\":\\"cmljlirqt001job681aanlcf9\\"}}"	\N
cmll7r8a8000muikqnvf2lpqq	cmljliror0014ob68xdcfhymw	Test Judge 2	JUDGE	SUBMIT_SCORE	SCORE	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:20:56.589	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/contestant/cmljlirqt001job681aanlcf9\\",\\"timestamp\\":\\"2026-02-13T18:20:56.478Z\\",\\"body\\":{\\"score\\":4,\\"criteriaId\\":\\"cmljlirpn001cob68xdna25fr\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\",\\"contestantId\\":\\"cmljlirqt001job681aanlcf9\\"}}"	\N
cmll7r8ae000quikqa7tf7zzn	cmljliror0014ob68xdcfhymw	Test Judge 2	JUDGE	CERTIFY_SCORES	SCORE	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:20:56.63	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/certify\\",\\"timestamp\\":\\"2026-02-13T18:20:56.628Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\"}}"	\N
cmll7r8ac000ouikqbhg4rcpd	cmljliror0014ob68xdcfhymw	Test Judge 2	JUDGE	SUBMIT_SCORE	SCORE	cmljlirph0019ob68twuglukq	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:20:56.589	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirph0019ob68twuglukq/contestant/cmljlirqt001job681aanlcf9\\",\\"timestamp\\":\\"2026-02-13T18:20:56.477Z\\",\\"body\\":{\\"score\\":10,\\"criteriaId\\":\\"cmljlirpn001bob68e1pz5l4z\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\",\\"contestantId\\":\\"cmljlirqt001job681aanlcf9\\"}}"	\N
cmll7sbny0012uikq00otpql5	cmljlirna000oob68cn4w7bsj	Test Tally Master 2	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:21:47.662	"{\\"timestamp\\":\\"2026-02-13T18:21:47.661Z\\",\\"email\\":\\"tally2@febtest1.com\\"}"	\N
cmll7v2c80019uikqbei9pcmr	cmljlirna000oob68cn4w7bsj	Test Tally Master 2	TALLY_MASTER	CERTIFY_TOTALS	CATEGORY	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 18:23:55.544	"{\\"method\\":\\"POST\\",\\"path\\":\\"/certify-totals\\",\\"timestamp\\":\\"2026-02-13T18:23:55.542Z\\",\\"body\\":{\\"categoryId\\":\\"cmljlirph0019ob68twuglukq\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmllbfbvy000g115l2vpicsld	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 20:03:39.886	"{\\"timestamp\\":\\"2026-02-13T20:03:39.884Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllbg3f1000m115ltyj7zqsk	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPLOAD_SCORE_FILE	SCORE	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 20:04:15.565	"{\\"method\\":\\"POST\\",\\"path\\":\\"/\\",\\"timestamp\\":\\"2026-02-13T20:04:15.460Z\\",\\"body\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\",\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmllbga78000r115le75j0nqk	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	SUBMIT_SCORE	SCORE	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 20:04:24.357	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirwy003oob68mlnuivt0/contestant/cmljlirxu0044ob68fxovv5kp\\",\\"timestamp\\":\\"2026-02-13T20:04:24.355Z\\",\\"body\\":{\\"score\\":10,\\"criteriaId\\":\\"cmljlirx0003pob68guobnzjy\\",\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\",\\"contestantId\\":\\"cmljlirxu0044ob68fxovv5kp\\"}}"	\N
cmllbgfpr000w115l6d65rinr	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	CERTIFY_SCORES	SCORE	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 20:04:31.503	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirwy003oob68mlnuivt0/certify\\",\\"timestamp\\":\\"2026-02-13T20:04:31.501Z\\",\\"body\\":{\\"typedSignature\\":\\"[REDACTED]\\",\\"drawnSignatureData\\":\\"[REDACTED]\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\"}}"	\N
cmllbh3pb000z115l6lycvq1e	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 20:05:02.591	"{\\"timestamp\\":\\"2026-02-13T20:05:02.590Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllbo83t001f115lyqijkl7f	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	UPDATE_SCORE	SCORE	cmllbga6p000o115lqj9dlxe5	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 20:10:34.855	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/cmllbga6p000o115lqj9dlxe5\\",\\"timestamp\\":\\"2026-02-13T20:10:34.853Z\\",\\"body\\":{\\"score\\":1,\\"comments\\":\\"\\"},\\"query\\":{},\\"params\\":{\\"scoreId\\":\\"cmllbga6p000o115lqj9dlxe5\\"}}"	\N
cmllboc0y001k115ljnd5ptze	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	CERTIFY_SCORES	SCORE	cmljlirwy003oob68mlnuivt0	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 20:10:39.97	"{\\"method\\":\\"POST\\",\\"path\\":\\"/category/cmljlirwy003oob68mlnuivt0/certify\\",\\"timestamp\\":\\"2026-02-13T20:10:39.969Z\\",\\"body\\":{\\"drawnSignatureData\\":\\"[REDACTED]\\"},\\"query\\":{},\\"params\\":{\\"categoryId\\":\\"cmljlirwy003oob68mlnuivt0\\"}}"	\N
cmlle26i50001jp4izlig6wbi	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-13 21:17:25.229	"{\\"timestamp\\":\\"2026-02-13T21:17:25.228Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmlle2kr30005jp4i03rtpq8r	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 21:17:43.696	"{\\"timestamp\\":\\"2026-02-13T21:17:43.695Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlle3ojp000fjp4ikenbe9oy	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	ASSIGN_JUDGE	ASSIGNMENT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-13 21:18:35.269	"{\\"method\\":\\"POST\\",\\"path\\":\\"/judge\\",\\"timestamp\\":\\"2026-02-13T21:18:35.164Z\\",\\"body\\":{\\"judgeId\\":\\"cmljlirp00015ob68hyms1aec\\",\\"contestId\\":\\"cmljliru3002dob68d2n822p1\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmllpuo7r0006jx0wh98xnt42	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 02:47:30.327	"{\\"timestamp\\":\\"2026-02-14T02:47:30.326Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllpz363000jjx0w37udn7eo	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:50:56.331	"{\\"timestamp\\":\\"2026-02-14T02:50:56.330Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllpzrf0000wjx0wutvf4xtn	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	CREATE_EVENT_TEMPLATE	EVENT_TEMPLATE	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:51:27.756	"{\\"method\\":\\"POST\\",\\"path\\":\\"/\\",\\"timestamp\\":\\"2026-02-14T02:51:27.635Z\\",\\"body\\":{\\"name\\":\\"UAT Event Template\\",\\"description\\":\\"Focused pass\\",\\"contests\\":[{\\"id\\":\\"contestA\\",\\"name\\":\\"Contest A\\"}],\\"categories\\":[{\\"contestId\\":\\"contestA\\",\\"name\\":\\"Category A\\",\\"criteria\\":[{\\"name\\":\\"Presence\\",\\"maxScore\\":10}]}]},\\"query\\":{},\\"params\\":{}}"	\N
cmllq15sm0002n8b4tohl0erw	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:52:33.046	"{\\"timestamp\\":\\"2026-02-14T02:52:33.045Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllq160j000jn8b482rdin3y	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	CREATE_EVENT_TEMPLATE	EVENT_TEMPLATE	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:52:33.331	"{\\"method\\":\\"POST\\",\\"path\\":\\"/\\",\\"timestamp\\":\\"2026-02-14T02:52:33.223Z\\",\\"body\\":{\\"name\\":\\"UAT Event Template\\",\\"description\\":\\"Focused pass\\",\\"contests\\":[{\\"id\\":\\"contestA\\",\\"name\\":\\"Contest A\\"}],\\"categories\\":[{\\"contestId\\":\\"contestA\\",\\"name\\":\\"Category A\\",\\"criteria\\":[{\\"name\\":\\"Presence\\",\\"maxScore\\":10}]}]},\\"query\\":{},\\"params\\":{}}"	\N
cmllq161g000mn8b41hvfox8o	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	CREATE_EVENT_FROM_TEMPLATE	EVENT_TEMPLATE	cmllq15xd000bn8b484elw56g	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:52:33.331	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmllq15xd000bn8b484elw56g/create-event\\",\\"timestamp\\":\\"2026-02-14T02:52:33.300Z\\",\\"body\\":{\\"eventName\\":\\"UAT Generated Event\\",\\"eventDescription\\":\\"from template\\",\\"startDate\\":\\"2026-02-14\\",\\"endDate\\":\\"2026-02-15\\"},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllq15xd000bn8b484elw56g\\"}}"	\N
cmllq165u000pn8b4h9qn3mxx	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	DELETE_EVENT_TEMPLATE	EVENT_TEMPLATE	cmllq15xd000bn8b484elw56g	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:52:33.522	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/cmllq15xd000bn8b484elw56g\\",\\"timestamp\\":\\"2026-02-14T02:52:33.521Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllq15xd000bn8b484elw56g\\"}}"	\N
cmllq1s2h000un8b4jtvt8zu7	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:53:01.913	"{\\"timestamp\\":\\"2026-02-14T02:53:01.912Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllq3jf60009kgz2h4t6vabc	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:54:24.019	"{\\"timestamp\\":\\"2026-02-14T02:54:24.017Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllq4wdm000ekgz2d5mjhqb7	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:55:27.466	"{\\"timestamp\\":\\"2026-02-14T02:55:27.465Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllq5btl000jkgz25b479ag6	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	DELETE_EVENT_TEMPLATE	EVENT_TEMPLATE	cmllpzrbh000sjx0w0je30x34	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:55:47.481	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/cmllpzrbh000sjx0w0je30x34\\",\\"timestamp\\":\\"2026-02-14T02:55:47.480Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllpzrbh000sjx0w0je30x34\\"}}"	\N
cmllq5m46000nkgz29jxqf22c	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	DELETE_EVENT	EVENT	cmllq15z1000cn8b4fuo5mlyn	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 02:56:00.823	"{\\"method\\":\\"DELETE\\",\\"path\\":\\"/cmllq15z1000cn8b4fuo5mlyn\\",\\"timestamp\\":\\"2026-02-14T02:56:00.821Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllq15z1000cn8b4fuo5mlyn\\"}}"	\N
cmllqltuv000rkgz20k0ia6cw	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	TOGGLE_EMCEE_SCRIPT	EMCEE	cmlk3332a000cdr28396ujcqf	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:08:37.318	"{\\"method\\":\\"PATCH\\",\\"path\\":\\"/scripts/cmlk3332a000cdr28396ujcqf/toggle\\",\\"timestamp\\":\\"2026-02-14T03:08:37.317Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlk3332a000cdr28396ujcqf\\"}}"	\N
cmllqlxmq000tkgz2fm7erpeb	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	TOGGLE_EMCEE_SCRIPT	EMCEE	cmlk3332a000cdr28396ujcqf	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:08:42.243	"{\\"method\\":\\"PATCH\\",\\"path\\":\\"/scripts/cmlk3332a000cdr28396ujcqf/toggle\\",\\"timestamp\\":\\"2026-02-14T03:08:42.241Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlk3332a000cdr28396ujcqf\\"}}"	\N
cmllre498000d14d545pk4hmr	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	INFO	2026-02-14 03:30:37.196	"{\\"timestamp\\":\\"2026-02-14T03:30:37.195Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllrzfmv0007msw57eihk2kw	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 03:47:11.72	"{\\"timestamp\\":\\"2026-02-14T03:47:11.718Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlls17o0000cmsw5f7x16jpy	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	GENERATE_REPORT	REPORT	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 03:48:34.704	"{\\"method\\":\\"POST\\",\\"path\\":\\"/generate\\",\\"timestamp\\":\\"2026-02-14T03:48:34.600Z\\",\\"body\\":{\\"type\\":\\"event\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlls3snf0003znhgjie9tfno	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	GENERATE_REPORT	REPORT	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 03:50:35.211	"{\\"method\\":\\"POST\\",\\"path\\":\\"/generate\\",\\"timestamp\\":\\"2026-02-14T03:50:35.102Z\\",\\"body\\":{\\"type\\":\\"event\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlls8r9l000lcs2ysht9ro3j	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:54:26.697	"{\\"timestamp\\":\\"2026-02-14T03:54:26.696Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllsdi8r0013cs2y0mk7p2dm	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	GENERATE_REPORT	REPORT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:58:08.283	"{\\"method\\":\\"POST\\",\\"path\\":\\"/generate\\",\\"timestamp\\":\\"2026-02-14T03:58:08.178Z\\",\\"body\\":{\\"type\\":\\"system\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmllsdk4r0015cs2y74tndmrh	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	EXPORT_REPORT_PDF	REPORT	cmllsdi5p0011cs2y596t2uwa	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:58:10.731	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmllsdi5p0011cs2y596t2uwa/export/pdf\\",\\"timestamp\\":\\"2026-02-14T03:58:10.730Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllsdi5p0011cs2y596t2uwa\\"}}"	\N
cmllsdo360017cs2y52w94yup	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	EXPORT_REPORT_PDF	REPORT	cmlls3sk20001znhgidk0zys1	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:58:15.858	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmlls3sk20001znhgidk0zys1/export/pdf\\",\\"timestamp\\":\\"2026-02-14T03:58:15.857Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmlls3sk20001znhgidk0zys1\\"}}"	\N
cmllsectb001bcs2yb04dcd0s	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	GENERATE_REPORT	REPORT	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:58:47.903	"{\\"method\\":\\"POST\\",\\"path\\":\\"/generate\\",\\"timestamp\\":\\"2026-02-14T03:58:47.902Z\\",\\"body\\":{\\"type\\":\\"event\\",\\"eventId\\":\\"cmljlirjf0008ob68pb9qdz8h\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmllseh3n001ecs2yy65n3haj	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	EXPORT_REPORT_EXCEL	REPORT	cmllsect40019cs2y8f9s1c5b	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 03:58:53.459	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmllsect40019cs2y8f9s1c5b/export/excel\\",\\"timestamp\\":\\"2026-02-14T03:58:53.458Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllsect40019cs2y8f9s1c5b\\"}}"	\N
cmllsiyaw001vcs2yw02un78e	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_CONTESTANT_VISIBILITY_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 04:02:22.376	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/contestant-visibility\\",\\"timestamp\\":\\"2026-02-14T04:02:22.375Z\\",\\"body\\":{\\"canViewWinners\\":false,\\"canViewOverallResults\\":false},\\"query\\":{},\\"params\\":{}}"	\N
cmllskage002kcs2ycy4pl97g	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 04:03:24.749	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/\\",\\"timestamp\\":\\"2026-02-14T04:03:24.747Z\\",\\"body\\":{\\"siteName\\":\\"ConMGR\\",\\"siteDescription\\":\\"\\",\\"contactEmail\\":\\"\\",\\"allowRegistration\\":true,\\"requireEmailVerification\\":false,\\"enableNotifications\\":true,\\"maintenanceMode\\":false,\\"defaultLanguage\\":\\"en\\",\\"defaultTimezone\\":\\"America/Chicago\\",\\"maxUploadSize\\":10,\\"sessionTimeout\\":24},\\"query\\":{},\\"params\\":{}}"	\N
cmllsp5b9002qcs2ynek4gkvk	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_CONTESTANT_VISIBILITY_SETTINGS	SETTINGS	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 04:07:11.396	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/contestant-visibility\\",\\"timestamp\\":\\"2026-02-14T04:07:11.395Z\\",\\"body\\":{\\"canViewWinners\\":true,\\"canViewOverallResults\\":true},\\"query\\":{},\\"params\\":{}}"	\N
cmllu0pqz0001v25azw5cpkc3	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 04:44:10.715	"{\\"timestamp\\":\\"2026-02-14T04:44:10.714Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllwmyq60023v25axle1lzj8	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:28.014	"{\\"timestamp\\":\\"2026-02-14T05:57:28.013Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllwmyw20026v25a6brh3hxi	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:28.227	"{\\"timestamp\\":\\"2026-02-14T05:57:28.226Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllwmz1r002bv25axvzbd9yy	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:28.431	"{\\"timestamp\\":\\"2026-02-14T05:57:28.430Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllwmz7f002ev25a88sg4x70	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:28.635	"{\\"timestamp\\":\\"2026-02-14T05:57:28.634Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmllwmzd5002hv25abqax4ibt	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:28.842	"{\\"timestamp\\":\\"2026-02-14T05:57:28.841Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmllwmziu002kv25ak4jk5ns6	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:29.047	"{\\"timestamp\\":\\"2026-02-14T05:57:29.046Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmllwmzok002nv25aqpa40lwj	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 05:57:29.252	"{\\"timestamp\\":\\"2026-02-14T05:57:29.251Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmllwul040001cas3r33880ta	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:23.476	"{\\"timestamp\\":\\"2026-02-14T06:03:23.474Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllwul5n0005cas39l2rx7i8	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:23.676	"{\\"timestamp\\":\\"2026-02-14T06:03:23.674Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllwulb90008cas3st4o0y17	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:23.877	"{\\"timestamp\\":\\"2026-02-14T06:03:23.876Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllwulgq000bcas3nj4hhcve	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:24.074	"{\\"timestamp\\":\\"2026-02-14T06:03:24.073Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmllwulm8000ecas3hmg98y9m	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:24.272	"{\\"timestamp\\":\\"2026-02-14T06:03:24.271Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmllwulrq000hcas34j58wu6v	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:24.471	"{\\"timestamp\\":\\"2026-02-14T06:03:24.470Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmllwulx3000kcas36n8y3ycq	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:03:24.663	"{\\"timestamp\\":\\"2026-02-14T06:03:24.662Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmllxn7cf001bcas3fbrlc9at	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:38.799	"{\\"timestamp\\":\\"2026-02-14T06:25:38.798Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllxn85g001fcas3z6x687dr	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:39.844	"{\\"timestamp\\":\\"2026-02-14T06:25:39.843Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllxn8t0001mcas3rnjtej0a	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:40.692	"{\\"timestamp\\":\\"2026-02-14T06:25:40.691Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllxn9h8001scas38hpfudb2	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:41.564	"{\\"timestamp\\":\\"2026-02-14T06:25:41.563Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmllxna5a001xcas3jfqcl1u4	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:42.43	"{\\"timestamp\\":\\"2026-02-14T06:25:42.429Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmllxnau30023cas3du40ytut	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:43.323	"{\\"timestamp\\":\\"2026-02-14T06:25:43.322Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmllxnbfx0028cas3f68oauzo	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:25:44.11	"{\\"timestamp\\":\\"2026-02-14T06:25:44.109Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmllxqzr8002gcas34b8mm2av	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:35.588	"{\\"timestamp\\":\\"2026-02-14T06:28:35.587Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllxr0h4002mcas39gh8f25f	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:36.52	"{\\"timestamp\\":\\"2026-02-14T06:28:36.519Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllxr15g002scas3vmqhqxp4	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:37.396	"{\\"timestamp\\":\\"2026-02-14T06:28:37.395Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllxr1tn002zcas3jy18kt2f	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:38.268	"{\\"timestamp\\":\\"2026-02-14T06:28:38.267Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmllxr2g70037cas3veu74aw3	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:39.079	"{\\"timestamp\\":\\"2026-02-14T06:28:39.078Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmllxr32u003ecas31a4h0lbf	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:39.894	"{\\"timestamp\\":\\"2026-02-14T06:28:39.894Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmllxr3p4003kcas362f25kdi	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:40.696	"{\\"timestamp\\":\\"2026-02-14T06:28:40.695Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmllxrcrj0001ng157i2vonub	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:52.447	"{\\"timestamp\\":\\"2026-02-14T06:28:52.446Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllxrdk80006ng15gks7rnn7	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:53.481	"{\\"timestamp\\":\\"2026-02-14T06:28:53.480Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllxre7s000cng15bopjpxu2	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:54.329	"{\\"timestamp\\":\\"2026-02-14T06:28:54.328Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllxrex5000hng15f3seeq3b	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:55.241	"{\\"timestamp\\":\\"2026-02-14T06:28:55.240Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmllxrfjc000nng15lqimkwg9	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:56.04	"{\\"timestamp\\":\\"2026-02-14T06:28:56.039Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmllxrg4m000sng15e2czl3jr	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:56.806	"{\\"timestamp\\":\\"2026-02-14T06:28:56.805Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmllxrgqw0010ng15z4y37eh6	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:28:57.608	"{\\"timestamp\\":\\"2026-02-14T06:28:57.607Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmllxzxw00001btn51r9ju6ot	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:33.073	"{\\"timestamp\\":\\"2026-02-14T06:35:33.071Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllxzyq60007btn5i2a51lsc	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:34.158	"{\\"timestamp\\":\\"2026-02-14T06:35:34.157Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllxzzdg000cbtn56ia5lxrm	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:34.996	"{\\"timestamp\\":\\"2026-02-14T06:35:34.995Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllxzzyx000ibtn52g8nzmh7	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:35.769	"{\\"timestamp\\":\\"2026-02-14T06:35:35.768Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmlly00m7000obtn56bgtqceu	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:36.607	"{\\"timestamp\\":\\"2026-02-14T06:35:36.606Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmlly019e000tbtn55j4tscp4	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:37.442	"{\\"timestamp\\":\\"2026-02-14T06:35:37.441Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmlly01w2000xbtn5g7rtg014	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:35:38.259	"{\\"timestamp\\":\\"2026-02-14T06:35:38.257Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmlly46yv0015btn5ghtxmleb	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 06:38:51.463	"{\\"timestamp\\":\\"2026-02-14T06:38:51.462Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllybneh001ubtn5co9fy9hg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 06:44:39.353	"{\\"timestamp\\":\\"2026-02-14T06:44:39.352Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllyj4qd00023e8aed946ot6	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:28.406	"{\\"timestamp\\":\\"2026-02-14T06:50:28.404Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllyj5j8000a3e8aadgx1n6p	cmljliro40011ob68rvlxi3jv	Test Judge 1	JUDGE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:29.444	"{\\"timestamp\\":\\"2026-02-14T06:50:29.443Z\\",\\"email\\":\\"judge1@febtest1.com\\"}"	\N
cmllyj682000f3e8a47ko3vlm	cmljlirmz000kob68oyxznmzh	Test Tally Master 1	TALLY_MASTER	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:30.339	"{\\"timestamp\\":\\"2026-02-14T06:50:30.338Z\\",\\"email\\":\\"tally1@febtest1.com\\"}"	\N
cmllyj6wb000l3e8aydlj72kh	cmljlirnl000sob68a6phas6e	Test Auditor 1	AUDITOR	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:31.212	"{\\"timestamp\\":\\"2026-02-14T06:50:31.211Z\\",\\"email\\":\\"auditor1@febtest1.com\\"}"	\N
cmllyj7ki000t3e8ara7ln0bu	cmljlirlw000gob68u4qq1mj1	Test Board 1	BOARD	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:32.082	"{\\"timestamp\\":\\"2026-02-14T06:50:32.081Z\\",\\"email\\":\\"board1@febtest1.com\\"}"	\N
cmllyj88m00113e8au65ifbb6	cmljlirkm000aob68y6pykq2w	Test Emcee 1	EMCEE	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:32.95	"{\\"timestamp\\":\\"2026-02-14T06:50:32.949Z\\",\\"email\\":\\"emcee1@febtest1.com\\"}"	\N
cmllyj8zn00153e8aeabf0lyi	cmljlirqy001lob68xujtv9oi	Test Contestant 1	CONTESTANT	LOGIN	AUTH	\N	::ffff:127.0.0.1	curl/8.5.0	INFO	2026-02-14 06:50:33.923	"{\\"timestamp\\":\\"2026-02-14T06:50:33.922Z\\",\\"email\\":\\"contestant1@febtest1.com\\"}"	\N
cmllyjqwh001f3e8aeveruz9u	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	curl/8.5.0	INFO	2026-02-14 06:50:57.137	"{\\"timestamp\\":\\"2026-02-14T06:50:57.136Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllywb4t002f3e8a9aqred3m	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 07:00:43.229	"{\\"timestamp\\":\\"2026-02-14T07:00:43.228Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllz8ndh00089u0c57v2mjow	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 07:10:18.965	"{\\"timestamp\\":\\"2026-02-14T07:10:18.964Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmllzkuad000212tncyl53bf0	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 07:19:47.797	"{\\"timestamp\\":\\"2026-02-14T07:19:47.796Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlm023mq000v12tnjne1ed6w	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 07:33:13.058	"{\\"timestamp\\":\\"2026-02-14T07:33:13.057Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlmpvcv9001zyb8bwki0hd63	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:35:48.453	"{\\"timestamp\\":\\"2026-02-14T19:35:48.452Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlmpxml8002cyb8bxjmutggg	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:37:34.365	"{\\"timestamp\\":\\"2026-02-14T19:37:34.364Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlmq2x020033yb8b0zb8784k	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	LOGIN	AUTH	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:41:41.138	"{\\"timestamp\\":\\"2026-02-14T19:41:41.137Z\\",\\"email\\":\\"organizer1@febtest1.com\\"}"	\N
cmlmq46wm003fyb8b1z0okjy2	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	EXPORT_REPORT_PDF	REPORT	cmllsect40019cs2y8f9s1c5b	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:42:40.63	"{\\"method\\":\\"POST\\",\\"path\\":\\"/cmllsect40019cs2y8f9s1c5b/export/pdf\\",\\"timestamp\\":\\"2026-02-14T19:42:40.629Z\\",\\"body\\":{},\\"query\\":{},\\"params\\":{\\"id\\":\\"cmllsect40019cs2y8f9s1c5b\\"}}"	\N
cmlmqib9c004gyb8bfnjddoah	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_THEME_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:53:39.423	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/theme\\",\\"timestamp\\":\\"2026-02-14T19:53:39.421Z\\",\\"body\\":{\\"theme_primaryColor\\":\\"#00088a\\",\\"theme_secondaryColor\\":\\"#8b5cf6\\",\\"theme_logoPath\\":\\"\\",\\"theme_faviconPath\\":\\"\\",\\"app_name\\":\\"ConMGR\\",\\"app_subtitle\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlmqicu2004vyb8bwcqye353	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_THEME_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:53:41.498	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/theme\\",\\"timestamp\\":\\"2026-02-14T19:53:41.496Z\\",\\"body\\":{\\"theme_primaryColor\\":\\"#00088a\\",\\"theme_secondaryColor\\":\\"#8b5cf6\\",\\"theme_logoPath\\":\\"\\",\\"theme_faviconPath\\":\\"\\",\\"app_name\\":\\"ConMGR\\",\\"app_subtitle\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlmqiy19005ayb8blqfolvbj	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_THEME_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:54:08.973	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/theme\\",\\"timestamp\\":\\"2026-02-14T19:54:08.972Z\\",\\"body\\":{\\"theme_primaryColor\\":\\"#00088a\\",\\"theme_secondaryColor\\":\\"#8b5cf6\\",\\"theme_logoPath\\":\\"\\",\\"theme_faviconPath\\":\\"\\",\\"app_name\\":\\"ConMGR\\",\\"app_subtitle\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlmqj4nn005oyb8bdxlgtucr	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_THEME_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:54:17.555	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/theme\\",\\"timestamp\\":\\"2026-02-14T19:54:17.553Z\\",\\"body\\":{\\"theme_primaryColor\\":\\"#8b5cf6\\",\\"theme_secondaryColor\\":\\"#8b5cf6\\",\\"theme_logoPath\\":\\"\\",\\"theme_faviconPath\\":\\"\\",\\"app_name\\":\\"ConMGR\\",\\"app_subtitle\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlmqj5wp0063yb8bs2al2a1m	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_THEME_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:54:19.177	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/theme\\",\\"timestamp\\":\\"2026-02-14T19:54:19.176Z\\",\\"body\\":{\\"theme_primaryColor\\":\\"#8b5cf6\\",\\"theme_secondaryColor\\":\\"#8b5cf6\\",\\"theme_logoPath\\":\\"\\",\\"theme_faviconPath\\":\\"\\",\\"app_name\\":\\"ConMGR\\",\\"app_subtitle\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
cmlmqk4e6006hyb8bbektq79q	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	ORGANIZER	UPDATE_THEME_SETTINGS	SETTINGS	\N	192.168.80.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	INFO	2026-02-14 19:55:03.87	"{\\"method\\":\\"PUT\\",\\"path\\":\\"/theme\\",\\"timestamp\\":\\"2026-02-14T19:55:03.868Z\\",\\"body\\":{\\"theme_primaryColor\\":\\"#00088a\\",\\"theme_secondaryColor\\":\\"#8b5cf6\\",\\"theme_logoPath\\":\\"\\",\\"theme_faviconPath\\":\\"\\",\\"app_name\\":\\"ConMGR\\",\\"app_subtitle\\":\\"\\"},\\"query\\":{},\\"params\\":{}}"	\N
\.


--
-- Data for Name: archived_events; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.archived_events (id, "eventId", name, description, "startDate", "endDate", "archivedAt", "archivedById", "tenantId") FROM stdin;
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.assignments (id, "judgeId", "categoryId", "contestId", "eventId", status, "assignedAt", "assignedBy", notes, priority, "tenantId") FROM stdin;
cmlk1fhtr00065qlq0it5ghwf	cmljliroo0012ob68f825shsg	cmljlirsl001tob68g5doaqiz	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:36:05.246	cmlhmo05t000113i25pe4ao5e	\N	0	cmljlirfs0006ob68ahx75qyt
cmlk1fhur00085qlqrzm6fnob	cmljliroo0012ob68f825shsg	cmljlirph0019ob68twuglukq	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:36:05.245	cmlhmo05t000113i25pe4ao5e	\N	0	cmljlirfs0006ob68ahx75qyt
cmlkecwmb000kodtxo8n5541z	cmljlirnx000zob680q6vc92v	cmljlirvn0034ob68j0fq4d2t	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-13 04:37:59.457	cmljlirlq000eob68ct4hsyx2	\N	0	cmljlirfs0006ob68ahx75qyt
cmlkecwmb000modtxqbwyxe89	cmljlirnx000zob680q6vc92v	cmljlirwy003oob68mlnuivt0	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-13 04:37:59.458	cmljlirlq000eob68ct4hsyx2	\N	0	cmljlirfs0006ob68ahx75qyt
cmlle3ogf000djp4ihnzmqlab	cmljlirp00015ob68hyms1aec	\N	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-13 21:18:35.15	cmljlirlq000eob68ct4hsyx2	\N	0	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.audit_logs (id, "userId", "userName", action, "entityType", "entityId", changes, "ipAddress", "userAgent", metadata, "timestamp", "tenantId") FROM stdin;
cmlhn3ce200051266vythmq90	\N	admin@eventmanager.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"reason": "Invalid credentials"}	2026-02-11 06:19:11.354	default-tenant
cmlhn3f6d00081266snhefxe8	\N	admin@eventmanager.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"reason": "Invalid credentials"}	2026-02-11 06:19:14.965	default-tenant
cmlhn3kmy000a126676gwrbt6	\N	admin@eventmanager.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"reason": "Invalid credentials"}	2026-02-11 06:19:22.043	default-tenant
cmli7ym4n000m1266pbsev7pa	\N	admin@eventmanager.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"reason": "Invalid credentials"}	2026-02-11 16:03:22.632	default-tenant
cmli80bst000p12660x0fvo29	cmlhmo05t000113i25pe4ao5e	admin@eventmanager.com	auth.login	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "SUPER_ADMIN"}	2026-02-11 16:04:42.557	default-tenant
cmli865vu001d1266amcfqq9h	cmlhmo05t000113i25pe4ao5e	admin@eventmanager.com	auth.login	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "SUPER_ADMIN"}	2026-02-11 16:09:14.826	default-tenant
cmlj59a9e0002ntdz6nnf6w73	cmlhmo05t000113i25pe4ao5e	admin@eventmanager.com	auth.login	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	{"role": "SUPER_ADMIN"}	2026-02-12 07:35:27.794	default-tenant
cmljkxvbq00056gb5wcb58yax	cmlhmo05t000113i25pe4ao5e	admin@eventmanager.com	auth.login	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "SUPER_ADMIN"}	2026-02-12 14:54:29.078	default-tenant
cmljqdpm9004dob68eumugyz8	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "CONTESTANT"}	2026-02-12 17:26:46.257	default-tenant
cmljqeva6004iob68fxesmily	cmljlirqy001lob68xujtv9oi	\N	auth.logout	User	cmljlirqy001lob68xujtv9oi	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:27:40.255	cmljlirfs0006ob68ahx75qyt
cmljqfaf3004mob68mmj3kx3o	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "JUDGE"}	2026-02-12 17:27:59.871	default-tenant
cmljqfr87004qob68dzyyx3px	cmljliro40011ob68rvlxi3jv	\N	auth.logout	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:28:21.655	cmljlirfs0006ob68ahx75qyt
cmljqg428004uob68yvcbtzqz	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "AUDITOR"}	2026-02-12 17:28:38.289	default-tenant
cmljqg9fs004zob685k8y165h	cmljlirnl000sob68a6phas6e	\N	auth.logout	User	cmljlirnl000sob68a6phas6e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:28:45.257	cmljlirfs0006ob68ahx75qyt
cmljqgovp0051ob68ovj6b6uu	\N	admin@eventmangaer.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"reason": "Invalid credentials"}	2026-02-12 17:29:05.27	default-tenant
cmljqgwf00054ob68mwubgdlb	cmlhmo05t000113i25pe4ao5e	admin@eventmanager.com	auth.login	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "SUPER_ADMIN"}	2026-02-12 17:29:15.036	default-tenant
cmljqjqks0056ob68n9cc1kdo	cmlhmo05t000113i25pe4ao5e	\N	auth.logout	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:31:27.437	default-tenant
cmljqk24p005aob68p5ivjtsk	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "BOARD"}	2026-02-12 17:31:42.41	default-tenant
cmljqk5t0005cob68hrwc02po	cmljlirlw000gob68u4qq1mj1	\N	auth.logout	User	cmljlirlw000gob68u4qq1mj1	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:31:47.172	cmljlirfs0006ob68ahx75qyt
cmljqkjz0005fob68mskpm0au	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "EMCEE"}	2026-02-12 17:32:05.532	default-tenant
cmljqks54005gob686vlzteak	cmljlirkm000aob68y6pykq2w	\N	auth.logout	User	cmljlirkm000aob68y6pykq2w	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:32:16.121	cmljlirfs0006ob68ahx75qyt
cmljql3zi005kob682ssm68x9	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "TALLY_MASTER"}	2026-02-12 17:32:31.47	default-tenant
cmljqs1gl0008icfr2grdeb20	cmljlirmz000kob68oyxznmzh	\N	auth.logout	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 17:37:54.79	cmljlirfs0006ob68ahx75qyt
cmljqsgk2000dicfru6yt0il8	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "CONTESTANT"}	2026-02-12 17:38:14.354	default-tenant
cmljqu3bd000licfrme2ydxgj	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-12 17:39:30.506	default-tenant
cmljz6tub001gn3b26ylyb5c5	\N	organizer@febtest1.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"reason": "Invalid credentials"}	2026-02-12 21:33:21.683	default-tenant
cmljz6xys001jn3b2c309u1py	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "ORGANIZER"}	2026-02-12 21:33:27.028	default-tenant
cmlk0qqj60012ne1tkmc1j1yl	cmlhmo05t000113i25pe4ao5e	admin@eventmanager.com	auth.login	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "SUPER_ADMIN"}	2026-02-12 22:16:50.131	default-tenant
cmlk1ktzu000f5qlq3cyqri3a	cmlhmo05t000113i25pe4ao5e	\N	auth.logout	User	cmlhmo05t000113i25pe4ao5e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-12 22:40:14.299	default-tenant
cmlk1l8sb000k5qlq5p48s12w	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "ORGANIZER"}	2026-02-12 22:40:33.467	default-tenant
cmlk1wdvz003n5qlqojkw9h59	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "JUDGE"}	2026-02-12 22:49:13.295	default-tenant
cmlk34s1l000mdr28orwgxkbx	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	user.updated	User	cmljlirxw0046ob689rtkcnzg	{"bio": {"to": "", "from": null}, "judge": {"to": null}, "phone": {"to": "", "from": null}, "gender": {"to": "", "from": null}, "pronouns": {"to": "", "from": null}, "contestant": {"to": {"id": "cmljlirxu0044ob68fxovv5kp", "bio": "Test contestant bio 12", "name": "Test Contestant 12", "email": "contestant12@febtest1.com", "gender": null, "pronouns": null, "tenantId": "cmljlirfs0006ob68ahx75qyt", "createdAt": "2026-02-12T15:10:44.467Z", "imagePath": null, "updatedAt": "2026-02-12T15:10:44.467Z", "contestantNumber": 12}}, "contestantBio": {"to": "", "from": null}, "preferredName": {"to": "", "from": null}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	\N	2026-02-12 23:23:44.505	cmljlirfs0006ob68ahx75qyt
cmlkdtcuy00037gqp62z9maj8	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "JUDGE"}	2026-02-13 04:22:47.387	default-tenant
cmlkdxnz5000g7gqp6nt8j3vr	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-13 04:26:08.418	default-tenant
cmlkeussv0008eqln9jtcutih	cmljliro40011ob68rvlxi3jv	Test Judge 1	score.submitted	Score	cmlkeuss00002eqlnhi814ubo	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"score": 30, "judgeId": "cmljliro40011ob68rvlxi3jv", "categoryId": "cmljlirvn0034ob68j0fq4d2t", "criteriaId": "cmljlirvr0036ob68yadc79kx", "contestantId": "cmljlirxu0044ob68fxovv5kp"}	2026-02-13 04:51:54.32	cmljlirfs0006ob68ahx75qyt
cmlkeussv0007eqlnnl2jxur0	cmljliro40011ob68rvlxi3jv	Test Judge 1	score.submitted	Score	cmlkeuss00004eqlnp2qcl0bp	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"score": 20, "judgeId": "cmljliro40011ob68rvlxi3jv", "categoryId": "cmljlirvn0034ob68j0fq4d2t", "criteriaId": "cmljlirvq0035ob68kwn6vf3i", "contestantId": "cmljlirxu0044ob68fxovv5kp"}	2026-02-13 04:51:54.32	cmljlirfs0006ob68ahx75qyt
cmlkeustl0009eqlnrrnlqtb2	cmljliro40011ob68rvlxi3jv	Test Judge 1	score.submitted	Score	cmlkeusso0006eqlnbc2wpty6	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"score": 15, "judgeId": "cmljliro40011ob68rvlxi3jv", "categoryId": "cmljlirvn0034ob68j0fq4d2t", "criteriaId": "cmljlirvr0037ob68wwmdcu1b", "contestantId": "cmljlirxu0044ob68fxovv5kp"}	2026-02-13 04:51:54.345	cmljlirfs0006ob68ahx75qyt
cmlkf31lz0009zutazjmhbfyx	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	user.updated	User	cmljlirxw0046ob689rtkcnzg	{"judge": {"to": null}, "contestant": {"to": {"id": "cmljlirxu0044ob68fxovv5kp", "bio": "Test contestant bio 12", "name": "Test Contestant 12", "email": "contestant12@febtest1.com", "gender": null, "pronouns": null, "tenantId": "cmljlirfs0006ob68ahx75qyt", "createdAt": "2026-02-12T15:10:44.467Z", "imagePath": null, "updatedAt": "2026-02-12T15:10:44.467Z", "contestantNumber": 12}}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	\N	2026-02-13 04:58:18.983	cmljlirfs0006ob68ahx75qyt
cmlkf3ko7000ezutaukl7db22	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	user.updated	User	cmljlirrs001oob68mrcy0j72	{"bio": {"to": "", "from": null}, "judge": {"to": null}, "phone": {"to": "", "from": null}, "gender": {"to": "", "from": null}, "pronouns": {"to": "", "from": null}, "contestant": {"to": {"id": "cmljlirrn001mob68njh1kfxa", "bio": "Test contestant bio 2", "name": "Test Contestant 2", "email": "contestant2@febtest1.com", "gender": null, "pronouns": null, "tenantId": "cmljlirfs0006ob68ahx75qyt", "createdAt": "2026-02-12T15:10:44.244Z", "imagePath": null, "updatedAt": "2026-02-12T15:10:44.244Z", "contestantNumber": 2}}, "contestantBio": {"to": "", "from": null}, "preferredName": {"to": "", "from": null}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	\N	2026-02-13 04:58:43.687	cmljlirfs0006ob68ahx75qyt
cmlkfb5fk0004vgv7rckge1up	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	user.updated	User	cmljlirxw0046ob689rtkcnzg	{"judge": {"to": null}, "contestant": {"to": {"id": "cmljlirxu0044ob68fxovv5kp", "bio": "Test contestant bio 12", "name": "Test Contestant 12", "email": "contestant12@febtest1.com", "gender": null, "pronouns": null, "tenantId": "cmljlirfs0006ob68ahx75qyt", "createdAt": "2026-02-12T15:10:44.467Z", "imagePath": null, "updatedAt": "2026-02-12T15:10:44.467Z", "contestantNumber": 12}}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	\N	2026-02-13 05:04:37.184	cmljlirfs0006ob68ahx75qyt
cmlkfctcf000bvgv7wi4tkn2n	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	user.updated	User	cmljlirxw0046ob689rtkcnzg	{"bio": {"to": "test bio text entry", "from": ""}, "judge": {"to": null}, "contestant": {"to": {"id": "cmljlirxu0044ob68fxovv5kp", "bio": "Test contestant bio 12", "name": "Test Contestant 12", "email": "contestant12@febtest1.com", "gender": null, "pronouns": null, "tenantId": "cmljlirfs0006ob68ahx75qyt", "createdAt": "2026-02-12T15:10:44.467Z", "imagePath": null, "updatedAt": "2026-02-12T15:10:44.467Z", "contestantNumber": 12}}, "contestantBio": {"to": "test bio text entry", "from": ""}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	\N	2026-02-13 05:05:54.831	cmljlirfs0006ob68ahx75qyt
cmlkg2x1q0002n31ow2zq0g3g	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "JUDGE"}	2026-02-13 05:26:12.686	default-tenant
cmlkg54q1000pn31o9090idho	cmljliro40011ob68rvlxi3jv	Test Judge 1	score.updated	Score	cmlkeusso0006eqlnbc2wpty6	{"id": {"to": "cmlkeusso0006eqlnbc2wpty6"}, "judge": {"to": {"id": "cmljlirnx000zob680q6vc92v", "name": "Test Judge 1"}}, "score": {"to": 10}, "comment": {"to": ""}, "judgeId": {"to": "cmljlirnx000zob680q6vc92v"}, "category": {"to": {"id": "cmljlirvn0034ob68j0fq4d2t", "name": "Test Category 2-1", "scoreCap": 100}}, "isLocked": {"to": false}, "lockedAt": {"to": null}, "lockedBy": {"to": null}, "tenantId": {"to": "cmljlirfs0006ob68ahx75qyt"}, "deduction": {"to": 0}, "categoryId": {"to": "cmljlirvn0034ob68j0fq4d2t"}, "contestant": {"to": {"id": "cmljlirxu0044ob68fxovv5kp", "name": "Test Contestant 12", "contestantNumber": 12}}, "certifiedAt": {"to": null}, "certifiedBy": {"to": null}, "criterionId": {"to": "cmljlirvr0037ob68wwmdcu1b"}, "isCertified": {"to": false}, "contestantId": {"to": "cmljlirxu0044ob68fxovv5kp"}, "deductionReason": {"to": null}, "allowCommentEdit": {"to": true}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	\N	2026-02-13 05:27:55.945	cmljlirfs0006ob68ahx75qyt
cmlkg6iky001nn31otfy40twd	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-13 05:29:00.562	default-tenant
cmlkhb9ax000jbqx2p8hcdbj2	cmljliro40011ob68rvlxi3jv	\N	auth.logout	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-13 06:00:41.433	cmljlirfs0006ob68ahx75qyt
cmlkhbgt4000mbqx2bk0k34hd	cmljlirxw0046ob689rtkcnzg	contestant12@febtest1.com	auth.login	User	cmljlirxw0046ob689rtkcnzg	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "CONTESTANT"}	2026-02-13 06:00:51.16	default-tenant
cmlkhecvt000xbqx25a5zli31	cmljlirxw0046ob689rtkcnzg	\N	auth.logout	User	cmljlirxw0046ob689rtkcnzg	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-13 06:03:06.042	cmljlirfs0006ob68ahx75qyt
cmlkhelou0011bqx22bnoljon	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "JUDGE"}	2026-02-13 06:03:17.454	default-tenant
cmlkhetgu0012bqx26ed4xdgd	cmljliro40011ob68rvlxi3jv	\N	auth.logout	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-13 06:03:27.535	cmljlirfs0006ob68ahx75qyt
cmlkhf1670016bqx2jc4klr51	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "TALLY_MASTER"}	2026-02-13 06:03:37.52	default-tenant
cmlkhin0l0019bqx2n2gkfhx0	cmljlirmz000kob68oyxznmzh	\N	auth.logout	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{}	2026-02-13 06:06:25.797	cmljlirfs0006ob68ahx75qyt
cmlkhiw2w001ebqx2wkj6ouvb	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "AUDITOR"}	2026-02-13 06:06:37.545	default-tenant
cmlkjkt6e0021bqx2lamm589w	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-13 07:04:06.327	default-tenant
cmlkkj8iq000ady5bmpmpohsp	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "AUDITOR"}	2026-02-13 07:30:52.514	default-tenant
cmll5xcgw00025x9roj2dhlbb	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "JUDGE"}	2026-02-13 17:29:42.753	default-tenant
cmll5y29800075x9rkzc6648l	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "JUDGE"}	2026-02-13 17:30:16.173	default-tenant
cmll5ztpw000f5x9roy7twkl6	cmljliro40011ob68rvlxi3jv	\N	auth.logout	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-13 17:31:38.42	cmljlirfs0006ob68ahx75qyt
cmll6024y000j5x9r2r2s33zz	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "TALLY_MASTER"}	2026-02-13 17:31:49.33	default-tenant
cmll66taj001a5x9rkht44e5y	cmljlirmz000kob68oyxznmzh	\N	auth.logout	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-13 17:37:04.46	cmljlirfs0006ob68ahx75qyt
cmll6721n001e5x9rt3l9ui1l	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "AUDITOR"}	2026-02-13 17:37:15.804	default-tenant
cmll6brbc001q5x9rrwy2muic	cmljlirnl000sob68a6phas6e	\N	auth.logout	User	cmljlirnl000sob68a6phas6e	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-13 17:40:55.176	cmljlirfs0006ob68ahx75qyt
cmll7qnx10004uikqcu5iqc78	cmljliror0014ob68xdcfhymw	judge2@febtest1.com	auth.login	User	cmljliror0014ob68xdcfhymw	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "JUDGE"}	2026-02-13 18:20:30.229	default-tenant
cmll7r85p000duikqrh6k364e	cmljliror0014ob68xdcfhymw	Test Judge 2	score.submitted	Score	cmll7r84y0007uikqfiw7ogdx	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"score": 20, "judgeId": "cmljliror0014ob68xdcfhymw", "categoryId": "cmljlirph0019ob68twuglukq", "criteriaId": "cmljlirpm001aob68zz80a4eb", "contestantId": "cmljlirqt001job681aanlcf9"}	2026-02-13 18:20:56.462	cmljlirfs0006ob68ahx75qyt
cmll7sbo10013uikqy4pc6d50	cmljlirna000oob68cn4w7bsj	tally2@febtest1.com	auth.login	User	cmljlirna000oob68cn4w7bsj	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "TALLY_MASTER"}	2026-02-13 18:21:47.666	default-tenant
cmll7r85p000cuikqka1cy7uw	cmljliror0014ob68xdcfhymw	Test Judge 2	score.submitted	Score	cmll7r84z0009uikq5hy87vsx	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"score": 10, "judgeId": "cmljliror0014ob68xdcfhymw", "categoryId": "cmljlirph0019ob68twuglukq", "criteriaId": "cmljlirpn001bob68e1pz5l4z", "contestantId": "cmljlirqt001job681aanlcf9"}	2026-02-13 18:20:56.462	cmljlirfs0006ob68ahx75qyt
cmll7r85v000euikq6m53262l	cmljliror0014ob68xdcfhymw	Test Judge 2	score.submitted	Score	cmll7r855000buikql6yoec8q	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"score": 4, "judgeId": "cmljliror0014ob68xdcfhymw", "categoryId": "cmljlirph0019ob68twuglukq", "criteriaId": "cmljlirpn001cob68xdna25fr", "contestantId": "cmljlirqt001job681aanlcf9"}	2026-02-13 18:20:56.467	cmljlirfs0006ob68ahx75qyt
cmll7s2gw000yuikqdwy692th	cmljliror0014ob68xdcfhymw	\N	auth.logout	User	cmljliror0014ob68xdcfhymw	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-13 18:21:35.744	cmljlirfs0006ob68ahx75qyt
cmllbfbw5000h115lq2z97juc	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "JUDGE"}	2026-02-13 20:03:39.893	default-tenant
cmllbga72000p115l286u04gg	cmljliro40011ob68rvlxi3jv	Test Judge 1	score.submitted	Score	cmllbga6p000o115lqj9dlxe5	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"score": 10, "judgeId": "cmljliro40011ob68rvlxi3jv", "categoryId": "cmljlirwy003oob68mlnuivt0", "criteriaId": "cmljlirx0003pob68guobnzjy", "contestantId": "cmljlirxu0044ob68fxovv5kp"}	2026-02-13 20:04:24.35	cmljlirfs0006ob68ahx75qyt
cmllbh3pf0010115lst2zuy16	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "TALLY_MASTER"}	2026-02-13 20:05:02.596	default-tenant
cmllbo82o001d115lu1874o0l	cmljliro40011ob68rvlxi3jv	Test Judge 1	score.updated	Score	cmllbga6p000o115lqj9dlxe5	{"id": {"to": "cmllbga6p000o115lqj9dlxe5"}, "judge": {"to": {"id": "cmljlirnx000zob680q6vc92v", "name": "Test Judge 1"}}, "score": {"to": 1}, "comment": {"to": ""}, "judgeId": {"to": "cmljlirnx000zob680q6vc92v"}, "category": {"to": {"id": "cmljlirwy003oob68mlnuivt0", "name": "PubIm", "scoreCap": 30}}, "isLocked": {"to": false}, "lockedAt": {"to": null}, "lockedBy": {"to": null}, "tenantId": {"to": "cmljlirfs0006ob68ahx75qyt"}, "deduction": {"to": 0}, "categoryId": {"to": "cmljlirwy003oob68mlnuivt0"}, "contestant": {"to": {"id": "cmljlirxu0044ob68fxovv5kp", "name": "Test Contestant 12", "contestantNumber": 12}}, "certifiedAt": {"to": null}, "certifiedBy": {"to": null}, "criterionId": {"to": "cmljlirx0003pob68guobnzjy"}, "isCertified": {"to": false}, "contestantId": {"to": "cmljlirxu0044ob68fxovv5kp"}, "deductionReason": {"to": null}, "allowCommentEdit": {"to": true}}	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	\N	2026-02-13 20:10:34.848	cmljlirfs0006ob68ahx75qyt
cmlle26ib0002jp4i4wt6ew6i	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "TALLY_MASTER"}	2026-02-13 21:17:25.235	default-tenant
cmlle2kr70006jp4iz1u9sx0q	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-13 21:17:43.7	default-tenant
cmllpuo7x0007jx0w1a2nuez2	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 02:47:30.333	default-tenant
cmllpypxn000hjx0wxmpvj3t9	\N	organizer1@febtest1.com	auth.failed_login	User	\N	\N	::ffff:127.0.0.1	curl/8.5.0	{"reason": "Invalid credentials"}	2026-02-14 02:50:39.179	cmljlirfs0006ob68ahx75qyt
cmllpz36a000kjx0wmr1kwuy2	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 02:50:56.338	cmljlirfs0006ob68ahx75qyt
cmllq15sr0003n8b46m6heefj	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 02:52:33.052	cmljlirfs0006ob68ahx75qyt
cmllq1s2l000vn8b4ghr4bu8n	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 02:53:01.918	cmljlirfs0006ob68ahx75qyt
cmllq3jfc000akgz2crfmlaav	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 02:54:24.024	cmljlirfs0006ob68ahx75qyt
cmllq4wdp000fkgz2wkww29rp	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 02:55:27.47	cmljlirfs0006ob68ahx75qyt
cmllq5m3z000kkgz2bhzhnxgb	cmljlirlq000eob68ct4hsyx2	Test Organizer 1	event.deleted	Event	cmllq15z1000cn8b4fuo5mlyn	\N	::ffff:127.0.0.1	curl/8.5.0	{"name": "UAT Generated Event", "endDate": "2026-02-15T00:00:00.000Z", "deletedBy": "cmljlirlq000eob68ct4hsyx2", "startDate": "2026-02-14T00:00:00.000Z"}	2026-02-14 02:56:00.815	cmljlirfs0006ob68ahx75qyt
cmllqw1u30007t11zgyg63od7	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 03:16:34.251	cmljlirfs0006ob68ahx75qyt
cmllr6unj000214d57jfe5tml	\N	organizer1@febtest1.com	auth.failed_login	User	\N	\N	::ffff:127.0.0.1	curl/8.5.0	{"reason": "Invalid credentials"}	2026-02-14 03:24:58.16	cmljlirfs0006ob68ahx75qyt
cmllr76tm000514d5noyvakxc	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 03:25:13.93	cmljlirfs0006ob68ahx75qyt
cmllre49f000e14d5g1n9hnhc	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0	{"role": "TALLY_MASTER"}	2026-02-14 03:30:37.203	default-tenant
cmllrzfn10008msw56qg55u5k	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 03:47:11.725	cmljlirfs0006ob68ahx75qyt
cmlls8r9s000mcs2y3sxjc7b7	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 03:54:26.704	default-tenant
cmlltfo1x0036cs2ya4cawrxr	cmljlirlq000eob68ct4hsyx2	\N	auth.logout	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-14 04:27:48.741	cmljlirfs0006ob68ahx75qyt
cmllu0pr50002v25adzdq78ka	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 04:44:10.721	default-tenant
cmlluzdu6000pv25arl95k0gn	cmljlirlq000eob68ct4hsyx2	\N	auth.logout	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-14 05:11:08.238	cmljlirfs0006ob68ahx75qyt
cmllwmyqb0024v25a8bexa85e	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 05:57:28.02	cmljlirfs0006ob68ahx75qyt
cmllwmyw50027v25awoynv94w	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 05:57:28.23	cmljlirfs0006ob68ahx75qyt
cmllwmz1u002cv25a07s23se0	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 05:57:28.434	cmljlirfs0006ob68ahx75qyt
cmllwmz7h002fv25ax4ue2r2h	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 05:57:28.638	cmljlirfs0006ob68ahx75qyt
cmllwmzd8002iv25a54a38fem	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 05:57:28.844	cmljlirfs0006ob68ahx75qyt
cmllwmziy002lv25atypo3df7	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 05:57:29.05	cmljlirfs0006ob68ahx75qyt
cmllwmzom002ov25a9htrwyyf	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 05:57:29.255	cmljlirfs0006ob68ahx75qyt
cmllwul090002cas33lajxbvp	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:03:23.481	cmljlirfs0006ob68ahx75qyt
cmllwul5s0006cas3avna14he	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 06:03:23.681	cmljlirfs0006ob68ahx75qyt
cmllwulbe0009cas3gvn9jdjo	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 06:03:23.882	cmljlirfs0006ob68ahx75qyt
cmllwulgt000ccas3yhtw79kc	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 06:03:24.077	cmljlirfs0006ob68ahx75qyt
cmllwulmb000fcas32v6ppbj0	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 06:03:24.275	cmljlirfs0006ob68ahx75qyt
cmllwulrt000icas3adsoeo7k	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 06:03:24.474	cmljlirfs0006ob68ahx75qyt
cmllwulx6000lcas312djuh3z	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 06:03:24.667	cmljlirfs0006ob68ahx75qyt
cmllxn7cl001ccas3wi96mcom	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:25:38.805	cmljlirfs0006ob68ahx75qyt
cmllxn85k001gcas3ilkc5ivb	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 06:25:39.849	cmljlirfs0006ob68ahx75qyt
cmllxn8t4001ncas3begy0xsv	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 06:25:40.696	cmljlirfs0006ob68ahx75qyt
cmllxn9ha001tcas3s1yrnd4m	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 06:25:41.567	cmljlirfs0006ob68ahx75qyt
cmllxna5e001ycas37munczrf	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 06:25:42.434	cmljlirfs0006ob68ahx75qyt
cmllxnau60024cas3spmg0h56	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 06:25:43.326	cmljlirfs0006ob68ahx75qyt
cmllxnbg00029cas3lk7kdanc	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 06:25:44.113	cmljlirfs0006ob68ahx75qyt
cmllxqzrb002hcas3y1j9k8ng	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:28:35.591	cmljlirfs0006ob68ahx75qyt
cmllxr0h6002ncas3crtqk81z	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 06:28:36.523	cmljlirfs0006ob68ahx75qyt
cmllxr15i002tcas3h3kxrw4v	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 06:28:37.399	cmljlirfs0006ob68ahx75qyt
cmllxr1tq0030cas3r7usaqlo	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 06:28:38.271	cmljlirfs0006ob68ahx75qyt
cmllxr2ga0038cas3sybalm47	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 06:28:39.082	cmljlirfs0006ob68ahx75qyt
cmllxr32x003fcas392fms5z3	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 06:28:39.897	cmljlirfs0006ob68ahx75qyt
cmllxr3p6003lcas35jfoysju	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 06:28:40.698	cmljlirfs0006ob68ahx75qyt
cmllxrcrp0002ng154deaaf2s	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:28:52.453	cmljlirfs0006ob68ahx75qyt
cmllxrdkd0007ng150eqbgm3t	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 06:28:53.485	cmljlirfs0006ob68ahx75qyt
cmllxre7w000dng1593nvn5tz	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 06:28:54.333	cmljlirfs0006ob68ahx75qyt
cmllxrex9000ing15p2lyzke4	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 06:28:55.245	cmljlirfs0006ob68ahx75qyt
cmllxrfjf000ong15l8wdgu5z	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 06:28:56.043	cmljlirfs0006ob68ahx75qyt
cmllxrg4p000tng15z8mvunn8	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 06:28:56.809	cmljlirfs0006ob68ahx75qyt
cmllxrgqy0011ng15wcb2b8au	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 06:28:57.611	cmljlirfs0006ob68ahx75qyt
cmllxzxw60002btn5f1mfxkqt	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:35:33.079	cmljlirfs0006ob68ahx75qyt
cmllxzyqa0008btn5o5jvj1to	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 06:35:34.163	cmljlirfs0006ob68ahx75qyt
cmllxzzdj000dbtn5j2yk6qr5	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 06:35:35	cmljlirfs0006ob68ahx75qyt
cmllxzzyz000jbtn5hon8deht	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 06:35:35.772	cmljlirfs0006ob68ahx75qyt
cmlly00ma000pbtn5wrlgxkxj	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 06:35:36.61	cmljlirfs0006ob68ahx75qyt
cmlly019g000ubtn5swsmpy2r	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 06:35:37.445	cmljlirfs0006ob68ahx75qyt
cmlly01w6000ybtn5j2dlrxoz	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 06:35:38.262	cmljlirfs0006ob68ahx75qyt
cmlly46yz0016btn5hz1yyyaz	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 06:38:51.467	default-tenant
cmllybnel001vbtn5cfvtadd5	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 06:44:39.358	default-tenant
cmllyj4qk00033e8airnw2zch	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:50:28.412	cmljlirfs0006ob68ahx75qyt
cmllyj5jc000b3e8ak50qdnda	cmljliro40011ob68rvlxi3jv	judge1@febtest1.com	auth.login	User	cmljliro40011ob68rvlxi3jv	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "JUDGE"}	2026-02-14 06:50:29.448	cmljlirfs0006ob68ahx75qyt
cmllyj686000g3e8akg0wwbat	cmljlirmz000kob68oyxznmzh	tally1@febtest1.com	auth.login	User	cmljlirmz000kob68oyxznmzh	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "TALLY_MASTER"}	2026-02-14 06:50:30.343	cmljlirfs0006ob68ahx75qyt
cmllyj6we000m3e8a6lwc38dz	cmljlirnl000sob68a6phas6e	auditor1@febtest1.com	auth.login	User	cmljlirnl000sob68a6phas6e	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "AUDITOR"}	2026-02-14 06:50:31.215	cmljlirfs0006ob68ahx75qyt
cmllyj7kk000u3e8amvqt2y9r	cmljlirlw000gob68u4qq1mj1	board1@febtest1.com	auth.login	User	cmljlirlw000gob68u4qq1mj1	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "BOARD"}	2026-02-14 06:50:32.085	cmljlirfs0006ob68ahx75qyt
cmllyj88p00123e8ayftzoelk	cmljlirkm000aob68y6pykq2w	emcee1@febtest1.com	auth.login	User	cmljlirkm000aob68y6pykq2w	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "EMCEE"}	2026-02-14 06:50:32.954	cmljlirfs0006ob68ahx75qyt
cmllyj8zq00163e8aieogtilg	cmljlirqy001lob68xujtv9oi	contestant1@febtest1.com	auth.login	User	cmljlirqy001lob68xujtv9oi	\N	::ffff:127.0.0.1	curl/8.5.0	{"role": "CONTESTANT"}	2026-02-14 06:50:33.926	cmljlirfs0006ob68ahx75qyt
cmllyjqwk001g3e8af4d91thv	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	curl/8.5.0	{"role": "ORGANIZER"}	2026-02-14 06:50:57.141	cmljlirfs0006ob68ahx75qyt
cmllywb4x002g3e8a78eqbz94	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 07:00:43.234	default-tenant
cmllz8ndn00099u0c6fnlstsw	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 07:10:18.972	default-tenant
cmllzkuai000312tntfyl7zat	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 07:19:47.803	default-tenant
cmlm023mv000w12tnruepga4p	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 07:33:13.063	default-tenant
cmlmpur5p001qyb8bqat7morm	\N	Organizer1@febtest1.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"reason": "Invalid credentials"}	2026-02-14 19:35:20.318	default-tenant
cmlmpuyhj001syb8bmmm20mgs	\N	Organizer1@febtest1.com	auth.failed_login	User	\N	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"reason": "Invalid credentials"}	2026-02-14 19:35:29.815	default-tenant
cmlmpvcve0020yb8brzjc47vi	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 19:35:48.459	cmljlirfs0006ob68ahx75qyt
cmlmpvwqj0024yb8brun5tgth	cmljlirlq000eob68ct4hsyx2	\N	auth.logout	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-14 19:36:14.204	cmljlirfs0006ob68ahx75qyt
cmlmpxmld002dyb8bedwhsnt1	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 19:37:34.369	default-tenant
cmlmpy1tb002gyb8b5e4sj8y7	cmljlirlq000eob68ct4hsyx2	\N	auth.logout	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{}	2026-02-14 19:37:54.095	cmljlirfs0006ob68ahx75qyt
cmlmq2x070034yb8bwlk5qg8u	cmljlirlq000eob68ct4hsyx2	organizer1@febtest1.com	auth.login	User	cmljlirlq000eob68ct4hsyx2	\N	107.221.153.49	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	{"role": "ORGANIZER"}	2026-02-14 19:41:41.143	default-tenant
\.


--
-- Data for Name: auditor_assignments; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.auditor_assignments (id, "userId", "categoryId", "contestId", "eventId", status, "assignedAt", "assignedBy", notes, "tenantId") FROM stdin;
cmlk1o8oq00245qlq0kxlgsu0	cmljlirul002rob680lp6t95y	\N	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:42:53.306	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
cmlk1o8oq00265qlqzap4zdr8	cmljliruf002nob68irq7g7a5	\N	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:42:53.307	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
cmlk1oelb002d5qlqsbbnywqj	cmljlirnl000sob68a6phas6e	\N	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:43:00.959	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
cmlk1oelc002f5qlq5m3ojm8c	cmljlirns000wob68z2ljsw06	\N	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:43:00.96	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: backup_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.backup_logs (id, location, size, "createdAt", "errorMessage", type, status, "tenantId", "startedAt", "completedAt", duration, metadata) FROM stdin;
cmlmqmaul006vyb8bjut69t8z	backups/backup-full-2026-02-14T19-56-45-548Z.sql	0	2026-02-14 19:56:45.549	\N	FULL	IN_PROGRESS	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:56:45.548	\N	\N	{}
\.


--
-- Data for Name: backup_schedules; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.backup_schedules (id, "tenantId", name, "backupType", frequency, enabled, "retentionDays", "nextRunAt", "lastRunAt", "lastStatus", targets, compression, encryption, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: backup_settings; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.backup_settings (id, "retentionDays", "createdAt", "updatedAt", "backupType", enabled, frequency, "frequencyValue") FROM stdin;
\.


--
-- Data for Name: backup_targets; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.backup_targets (id, "tenantId", name, type, config, enabled, priority, verified, "lastVerified", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.categories (id, "contestId", name, description, "scoreCap", "timeLimit", "contestantMin", "contestantMax", "createdAt", "updatedAt", "totalsCertified", "tenantId", "boardApproved", "approvedAt", "approvedBy", "deletedAt", "deletedBy") FROM stdin;
cmljlirsl001tob68g5doaqiz	cmljlirlz000iob68vgxu6sxk	Test Category 1-2	Test category 1-2 description	100	\N	\N	\N	2026-02-12 15:10:44.278	2026-02-12 15:10:44.278	f	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
cmljlirvn0034ob68j0fq4d2t	cmljliru3002dob68d2n822p1	Test Category 2-1	Test category 2-1 description	100	\N	\N	\N	2026-02-12 15:10:44.388	2026-02-12 15:10:44.388	f	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
cmljlirph0019ob68twuglukq	cmljlirlz000iob68vgxu6sxk	Test Category 1-1	Test category 1-1 description	100	\N	\N	\N	2026-02-12 15:10:44.165	2026-02-13 18:23:55.503	t	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
cmljlirwy003oob68mlnuivt0	cmljliru3002dob68d2n822p1	PubIm	Test category 2-2 description	30	\N	\N	\N	2026-02-12 15:10:44.434	2026-02-13 21:18:50.362	t	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
cmllq15zb000gn8b4a4daxvzh	cmllq15z6000en8b4doeewt67	Category A	\N	\N	\N	\N	\N	2026-02-14 02:52:33.287	2026-02-14 02:52:33.287	f	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
\.


--
-- Data for Name: category_certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.category_certifications (id, "categoryId", role, "userId", "signatureName", "certifiedAt", comments, "tenantId") FROM stdin;
cmlle4075000hjp4i19g0xic0	cmljlirwy003oob68mlnuivt0	TALLY_MASTER	cmljlirmz000kob68oyxznmzh	DRAWN_SIGNATURE	2026-02-13 21:18:50.369	\N	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: category_contestants; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.category_contestants ("categoryId", "contestantId", "tenantId") FROM stdin;
cmljlirsl001tob68g5doaqiz	cmljlirqt001job681aanlcf9	cmljlirfs0006ob68ahx75qyt
cmljlirph0019ob68twuglukq	cmljlirqt001job681aanlcf9	cmljlirfs0006ob68ahx75qyt
cmljlirsl001tob68g5doaqiz	cmljlirxa003yob680qcbsklm	cmljlirfs0006ob68ahx75qyt
cmljlirsl001tob68g5doaqiz	cmljlirxk0041ob68v1skg631	cmljlirfs0006ob68ahx75qyt
cmljlirph0019ob68twuglukq	cmljlirxa003yob680qcbsklm	cmljlirfs0006ob68ahx75qyt
cmljlirph0019ob68twuglukq	cmljlirxk0041ob68v1skg631	cmljlirfs0006ob68ahx75qyt
cmljlirvn0034ob68j0fq4d2t	cmljlirxu0044ob68fxovv5kp	cmljlirfs0006ob68ahx75qyt
cmljlirwy003oob68mlnuivt0	cmljlirxu0044ob68fxovv5kp	cmljlirfs0006ob68ahx75qyt
cmljlirvn0034ob68j0fq4d2t	cmljlirrn001mob68njh1kfxa	cmljlirfs0006ob68ahx75qyt
cmljlirwy003oob68mlnuivt0	cmljlirrn001mob68njh1kfxa	cmljlirfs0006ob68ahx75qyt
cmljlirwy003oob68mlnuivt0	cmljlirs3001pob68yvuy06zq	cmljlirfs0006ob68ahx75qyt
cmljlirvn0034ob68j0fq4d2t	cmljlirs3001pob68yvuy06zq	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: category_judges; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.category_judges ("categoryId", "judgeId", "tenantId") FROM stdin;
\.


--
-- Data for Name: category_templates; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.category_templates (id, name, description, "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: category_types; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.category_types (id, name, description, "isSystem", "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.certifications (id, "categoryId", "contestId", "eventId", "userId", status, "currentStep", "totalSteps", "judgeCertified", "tallyCertified", "auditorCertified", "boardApproved", "certifiedAt", "certifiedBy", "rejectionReason", comments, "createdAt", "updatedAt", "tenantId") FROM stdin;
cmllboc0g001i115lzl531ol2	cmljlirwy003oob68mlnuivt0	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	\N	PENDING	1	4	f	f	f	f	\N	\N	\N	\N	2026-02-13 20:10:39.952	2026-02-13 21:18:50.4	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: contest_certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.contest_certifications (id, "contestId", role, "userId", "certifiedAt", comments, "tenantId") FROM stdin;
\.


--
-- Data for Name: contest_contestants; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.contest_contestants ("contestId", "contestantId", "tenantId") FROM stdin;
cmljlirlz000iob68vgxu6sxk	cmljlirqt001job681aanlcf9	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljlirrn001mob68njh1kfxa	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljlirs3001pob68yvuy06zq	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljlirt10023ob68i95s91j9	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljlirtc0026ob68oeivfue8	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljlirtq0029ob686m2zddk0	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirw2003eob68xso9tgw4	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirwe003hob68s8ytekgz	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirwo003kob6814xf7nic	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirxa003yob680qcbsklm	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirxk0041ob68v1skg631	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirxu0044ob68fxovv5kp	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: contest_judges; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.contest_judges ("contestId", "judgeId", "tenantId") FROM stdin;
cmljlirlz000iob68vgxu6sxk	cmljlirnx000zob680q6vc92v	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljliroo0012ob68f825shsg	cmljlirfs0006ob68ahx75qyt
cmljlirlz000iob68vgxu6sxk	cmljlirp00015ob68hyms1aec	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljliruq002uob681ke92klv	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirv1002xob688e4krg32	cmljlirfs0006ob68ahx75qyt
cmljliru3002dob68d2n822p1	cmljlirvd0030ob68c9i8i2mg	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: contestants; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.contestants (id, name, email, gender, pronouns, "contestantNumber", bio, "imagePath", "createdAt", "updatedAt", "tenantId") FROM stdin;
cmljlirqt001job681aanlcf9	Test Contestant 1	contestant1@febtest1.com	\N	\N	1	Test contestant bio 1	\N	2026-02-12 15:10:44.213	2026-02-12 15:10:44.213	cmljlirfs0006ob68ahx75qyt
cmljlirrn001mob68njh1kfxa	Test Contestant 2	contestant2@febtest1.com	\N	\N	2	[Bio file: /uploads/bios/bio-1770958723974-299340977.pdf]	\N	2026-02-12 15:10:44.244	2026-02-12 15:10:44.244	cmljlirfs0006ob68ahx75qyt
cmljlirs3001pob68yvuy06zq	Test Contestant 3	contestant3@febtest1.com	\N	\N	3	Test contestant bio 3	\N	2026-02-12 15:10:44.259	2026-02-12 15:10:44.259	cmljlirfs0006ob68ahx75qyt
cmljlirt10023ob68i95s91j9	Test Contestant 4	contestant4@febtest1.com	\N	\N	4	Test contestant bio 4	\N	2026-02-12 15:10:44.293	2026-02-12 15:10:44.293	cmljlirfs0006ob68ahx75qyt
cmljlirtc0026ob68oeivfue8	Test Contestant 5	contestant5@febtest1.com	\N	\N	5	Test contestant bio 5	\N	2026-02-12 15:10:44.304	2026-02-12 15:10:44.304	cmljlirfs0006ob68ahx75qyt
cmljlirtq0029ob686m2zddk0	Test Contestant 6	contestant6@febtest1.com	\N	\N	6	Test contestant bio 6	\N	2026-02-12 15:10:44.319	2026-02-12 15:10:44.319	cmljlirfs0006ob68ahx75qyt
cmljlirw2003eob68xso9tgw4	Test Contestant 7	contestant7@febtest1.com	\N	\N	7	Test contestant bio 7	\N	2026-02-12 15:10:44.402	2026-02-12 15:10:44.402	cmljlirfs0006ob68ahx75qyt
cmljlirwe003hob68s8ytekgz	Test Contestant 8	contestant8@febtest1.com	\N	\N	8	Test contestant bio 8	\N	2026-02-12 15:10:44.414	2026-02-12 15:10:44.414	cmljlirfs0006ob68ahx75qyt
cmljlirwo003kob6814xf7nic	Test Contestant 9	contestant9@febtest1.com	\N	\N	9	Test contestant bio 9	\N	2026-02-12 15:10:44.424	2026-02-12 15:10:44.424	cmljlirfs0006ob68ahx75qyt
cmljlirxa003yob680qcbsklm	Test Contestant 10	contestant10@febtest1.com	\N	\N	10	Test contestant bio 10	\N	2026-02-12 15:10:44.447	2026-02-12 15:10:44.447	cmljlirfs0006ob68ahx75qyt
cmljlirxk0041ob68v1skg631	Test Contestant 11	contestant11@febtest1.com	\N	\N	11	Test contestant bio 11	\N	2026-02-12 15:10:44.457	2026-02-12 15:10:44.457	cmljlirfs0006ob68ahx75qyt
cmljlirxu0044ob68fxovv5kp	Test Contestant 12	contestant12@febtest1.com	\N	\N	12	test bio text entry	\N	2026-02-12 15:10:44.467	2026-02-12 15:10:44.467	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: contests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.contests (id, "eventId", name, description, "createdAt", "updatedAt", "contestantNumberingMode", "nextContestantNumber", archived, "contestantViewRestricted", "contestantViewReleaseDate", "isLocked", "lockedAt", "lockVerifiedBy", "scoringType", "tenantId", "winnersPublished", "publishedAt", "publishedBy", "deletedAt", "deletedBy") FROM stdin;
cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	Bear	Test Contest 1 description	2026-02-12 15:10:44.039	2026-02-13 05:24:22.122	MANUAL	1	f	f	\N	f	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	Pet	Test Contest 2 description	2026-02-12 15:10:44.331	2026-02-13 05:24:28.678	MANUAL	1	f	f	\N	f	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	\N	\N	\N
cmllq15z6000en8b4doeewt67	cmllq15z1000cn8b4fuo5mlyn	Contest A	\N	2026-02-14 02:52:33.283	2026-02-14 02:52:33.283	MANUAL	1	t	f	\N	f	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	\N	2026-02-13 22:13:31.35	\N
\.


--
-- Data for Name: criteria; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.criteria (id, "categoryId", name, "maxScore", "createdAt", "updatedAt", "tenantId") FROM stdin;
cmljlirpm001aob68zz80a4eb	cmljlirph0019ob68twuglukq	Criterion 1	30	2026-02-12 15:10:44.171	2026-02-12 15:10:44.171	cmljlirfs0006ob68ahx75qyt
cmljlirpn001bob68e1pz5l4z	cmljlirph0019ob68twuglukq	Criterion 2	40	2026-02-12 15:10:44.171	2026-02-12 15:10:44.171	cmljlirfs0006ob68ahx75qyt
cmljlirpn001cob68xdna25fr	cmljlirph0019ob68twuglukq	Criterion 3	30	2026-02-12 15:10:44.171	2026-02-12 15:10:44.171	cmljlirfs0006ob68ahx75qyt
cmljlirsn001uob68nys56c1c	cmljlirsl001tob68g5doaqiz	Criterion 1	30	2026-02-12 15:10:44.279	2026-02-12 15:10:44.279	cmljlirfs0006ob68ahx75qyt
cmljlirsn001vob68i57ubwxu	cmljlirsl001tob68g5doaqiz	Criterion 2	40	2026-02-12 15:10:44.279	2026-02-12 15:10:44.279	cmljlirfs0006ob68ahx75qyt
cmljlirsn001wob68lzqdodan	cmljlirsl001tob68g5doaqiz	Criterion 3	30	2026-02-12 15:10:44.279	2026-02-12 15:10:44.279	cmljlirfs0006ob68ahx75qyt
cmljlirvq0035ob68kwn6vf3i	cmljlirvn0034ob68j0fq4d2t	Criterion 1	30	2026-02-12 15:10:44.39	2026-02-12 15:10:44.39	cmljlirfs0006ob68ahx75qyt
cmljlirvr0036ob68yadc79kx	cmljlirvn0034ob68j0fq4d2t	Criterion 2	40	2026-02-12 15:10:44.39	2026-02-12 15:10:44.39	cmljlirfs0006ob68ahx75qyt
cmljlirvr0037ob68wwmdcu1b	cmljlirvn0034ob68j0fq4d2t	Criterion 3	30	2026-02-12 15:10:44.39	2026-02-12 15:10:44.39	cmljlirfs0006ob68ahx75qyt
cmljlirx0003pob68guobnzjy	cmljlirwy003oob68mlnuivt0	Criterion 1	30	2026-02-12 15:10:44.436	2026-02-12 15:10:44.436	cmljlirfs0006ob68ahx75qyt
cmllq15zh000hn8b4rgr0yj8m	cmllq15zb000gn8b4a4daxvzh	Presence	10	2026-02-14 02:52:33.293	2026-02-14 02:52:33.293	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: custom_field_values; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.custom_field_values (id, "customFieldId", "entityId", value, "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: custom_fields; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.custom_fields (id, name, key, type, "entityType", required, "defaultValue", options, validation, "order", active, "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: deduction_approvals; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.deduction_approvals (id, "requestId", "approvedById", role, "isHeadJudge", "approvedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: deduction_requests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.deduction_requests (id, "contestantId", "categoryId", amount, reason, "requestedById", status, "createdAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: dr_configs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.dr_configs (id, "tenantId", "backupFrequency", "backupRetentionDays", "enableAutoBackup", "enablePITR", "enableDRTesting", "drTestFrequency", "backupLocations", "rtoMinutes", "rpoMinutes", "alertEmail", "enableFailover", "healthCheckInterval", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dr_metrics; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.dr_metrics (id, "tenantId", "metricType", value, unit, "timestamp", metadata) FROM stdin;
\.


--
-- Data for Name: dr_test_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.dr_test_logs (id, "tenantId", "testType", "backupId", status, "startedAt", "completedAt", duration, "testResults", "errorMessage", "automatedTest", "testedBy", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.email_logs (id, "to", "from", subject, template, status, "messageId", "errorMessage", "sentAt", "createdAt", "updatedAt", "tenantId", "userId", metadata) FROM stdin;
\.


--
-- Data for Name: email_settings; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.email_settings (id, "smtpHost", "smtpPort", "smtpSecure", "smtpUser", "smtpPassword", "fromEmail", "fromName", "enableEmail", "enableNotifications", "enableReports", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.email_templates (id, name, subject, body, type, "eventId", variables, "createdBy", "createdAt", "updatedAt", "headerHtml", "footerHtml", "logoUrl", "logoPosition", "backgroundColor", "primaryColor", "textColor", "fontFamily", "fontSize", "layoutType", "contentWrapper", "borderStyle", "borderColor", "borderWidth", "borderRadius", padding, margin, "templateData", "tenantId") FROM stdin;
cmllqtwih000zkgz228o0puis	email template test	test template email	test email template	NOTIFICATION	\N	\N	cmljlirlq000eob68ct4hsyx2	2026-02-14 03:14:54.041	2026-02-14 03:14:54.041	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: emcee_scripts; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.emcee_scripts (id, "eventId", "contestId", "categoryId", title, content, "order", "createdAt", "updatedAt", file_path, "tenantId") FROM stdin;
cmlk3332a000cdr28396ujcqf	\N	\N	\N	test1	Script file: /uploads/emcee/script-1770938545449-285112982.pdf	0	2026-02-12 23:22:25.474	2026-02-12 23:22:25.474	/uploads/emcee/script-1770938545449-285112982.pdf	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: error_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.error_logs (id, message, stack, level, context, "userId", path, method, "statusCode", metadata, resolved, "resolvedAt", "resolvedBy", "createdAt", "tenantId") FROM stdin;
cmlhmqpql0000r6196gk0tbxc	Bad escaped character in JSON at position 51	SyntaxError: Bad escaped character in JSON at position 51\n    at JSON.parse (<anonymous>)\n    at parse (/var/www/event-manager/node_modules/body-parser/lib/types/json.js:92:19)\n    at /var/www/event-manager/node_modules/body-parser/lib/read.js:128:18\n    at AsyncResource.runInAsyncScope (node:async_hooks:206:9)\n    at invokeCallback (/var/www/event-manager/node_modules/raw-body/index.js:238:16)\n    at done (/var/www/event-manager/node_modules/raw-body/index.js:227:7)\n    at IncomingMessage.onEnd (/var/www/event-manager/node_modules/raw-body/index.js:287:7)\n    at IncomingMessage.emit (node:events:524:28)\n    at endReadableNT (node:internal/streams/readable:1698:12)\n    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)	ERROR	\N	\N	/api/v1/auth/login	POST	400	{"query": {}, "params": {}, "ipAddress": "::1", "requestId": null, "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-11 06:09:22.125	default_tenant
cmlhmrb7o00001266x76qtqem	Bad escaped character in JSON at position 51	SyntaxError: Bad escaped character in JSON at position 51\n    at JSON.parse (<anonymous>)\n    at parse (/var/www/event-manager/node_modules/body-parser/lib/types/json.js:92:19)\n    at /var/www/event-manager/node_modules/body-parser/lib/read.js:128:18\n    at AsyncResource.runInAsyncScope (node:async_hooks:206:9)\n    at invokeCallback (/var/www/event-manager/node_modules/raw-body/index.js:238:16)\n    at done (/var/www/event-manager/node_modules/raw-body/index.js:227:7)\n    at IncomingMessage.onEnd (/var/www/event-manager/node_modules/raw-body/index.js:287:7)\n    at IncomingMessage.emit (node:events:524:28)\n    at endReadableNT (node:internal/streams/readable:1698:12)\n    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)	ERROR	\N	\N	/api/v1/auth/login	POST	400	{"query": {}, "params": {}, "ipAddress": "::1", "requestId": null, "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-11 06:09:49.957	default_tenant
cmlhn3cdu0004126619vv0cho	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "admin@eventmanager.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-11 06:19:11.347	default-tenant
cmlhn3f69000712665lzl7kc8	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "admin@eventmanager.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-11 06:19:14.961	default-tenant
cmlhn3kmt00091266ktqc16uu	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "admin@eventmanager.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-11 06:19:22.038	default-tenant
cmli7ym4g000l1266nua39q6v	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "admin@eventmanager.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-11 16:03:22.625	default-tenant
cmli8k9gl0020126627i6dwp1	EACCES: permission denied, open 'uploads/users/image-1770826812627-273133665.jpeg'	Error: EACCES: permission denied, open 'uploads/users/image-1770826812627-273133665.jpeg'	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/users/cmlhmo05t000113i25pe4ao5e/image	POST	500	{"query": {}, "params": {}, "errorCode": "EACCES", "ipAddress": "192.168.80.140", "requestId": "22d4d205-fa68-4565-9e18-a914fa13501d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-11 16:20:12.645	default-tenant
cmlj23k3e0000nyzrd53jga54	Bad escaped character in JSON at position 51	SyntaxError: Bad escaped character in JSON at position 51\n    at JSON.parse (<anonymous>)\n    at parse (/var/www/event-manager/node_modules/body-parser/lib/types/json.js:92:19)\n    at /var/www/event-manager/node_modules/body-parser/lib/read.js:128:18\n    at AsyncResource.runInAsyncScope (node:async_hooks:206:9)\n    at invokeCallback (/var/www/event-manager/node_modules/raw-body/index.js:238:16)\n    at done (/var/www/event-manager/node_modules/raw-body/index.js:227:7)\n    at IncomingMessage.onEnd (/var/www/event-manager/node_modules/raw-body/index.js:287:7)\n    at IncomingMessage.emit (node:events:524:28)\n    at endReadableNT (node:internal/streams/readable:1698:12)\n    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)	ERROR	\N	\N	/api/v1/auth/login	POST	400	{"query": {}, "params": {}, "ipAddress": "::1", "requestId": null, "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-12 06:07:01.754	default_tenant
cmlj24hnu0001nyzr15ya6n8w	Bad escaped character in JSON at position 51	SyntaxError: Bad escaped character in JSON at position 51\n    at JSON.parse (<anonymous>)\n    at parse (/var/www/event-manager/node_modules/body-parser/lib/types/json.js:92:19)\n    at /var/www/event-manager/node_modules/body-parser/lib/read.js:128:18\n    at AsyncResource.runInAsyncScope (node:async_hooks:206:9)\n    at invokeCallback (/var/www/event-manager/node_modules/raw-body/index.js:238:16)\n    at done (/var/www/event-manager/node_modules/raw-body/index.js:227:7)\n    at IncomingMessage.onEnd (/var/www/event-manager/node_modules/raw-body/index.js:287:7)\n    at IncomingMessage.emit (node:events:524:28)\n    at endReadableNT (node:internal/streams/readable:1698:12)\n    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)	ERROR	\N	\N	/api/v1/auth/login	POST	400	{"query": {}, "params": {}, "ipAddress": "::1", "requestId": null, "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-12 06:07:45.256	default_tenant
cmljqgovk0050ob685ah3djsx	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "admin@eventmangaer.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 17:29:05.265	default-tenant
cmljz6tu3001fn3b2vnyv5v75	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "organizer@febtest1.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:33:21.675	default-tenant
cmlk00ron001yn3b20mtiszbf	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqm001gob68di2ibyha	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "f2dec244-f108-434a-9439-1fe011c8c6b7", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.567	cmljlirfs0006ob68ahx75qyt
cmlk00rom001xn3b2wmbtgldb	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqb001eob68rgz3sgrq	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "01790494-572c-4765-bc47-52b65f30f0fc", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.567	cmljlirfs0006ob68ahx75qyt
cmlk00rp9001zn3b2bg5yafdj	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqq001iob68phzkj6ma	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "67e47931-e372-4e52-9670-d6849e171d5d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.589	cmljlirfs0006ob68ahx75qyt
cmlk00rpr0020n3b21y17xl13	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirsr001yob6873j28q6s	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "b3088d2e-546c-410a-b937-74974fd51ebc", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.607	cmljlirfs0006ob68ahx75qyt
cmlk00rqc0021n3b2p07decf4	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirsv0020ob68nnavhyh4	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "31a61a71-fe7d-49b3-ae89-507aef7bb2bd", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.629	cmljlirfs0006ob68ahx75qyt
cmlk0r5660016ne1taximlmuv	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirph0019ob68twuglukq_cmljlirnx000zob680q6vc92v	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "d604accf-e350-474c-91a4-4bb5ad3476a8", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.102	default-tenant
cmlk00rrl0022n3b2kq9gvca4	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirsy0022ob68fq9xcihn	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "91976965-b67d-417d-b63f-7401e4436280", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.673	cmljlirfs0006ob68ahx75qyt
cmlk00rsn0024n3b202pox65k	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirvu0039ob68hy1hwdri	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "ab5f9123-79b0-419a-aed7-b7cd2d5e203d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.711	cmljlirfs0006ob68ahx75qyt
cmlk00rt20025n3b2lus630qz	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirvx003bob68hcygkm7y	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "472d6c82-cc1b-4cac-9845-7bda50fbdf9e", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.727	cmljlirfs0006ob68ahx75qyt
cmlk00rs50023n3b27ustcjhd	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirw0003dob684r6hotvu	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "c94d1c50-f5b0-41e1-981b-bd3bb4905d42", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.693	cmljlirfs0006ob68ahx75qyt
cmlk00rtg0027n3b23g0vqjzk	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirx9003xob68r3rmw43a	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "5c19c019-232f-444a-ae52-dd8c0e95cd03", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.74	cmljlirfs0006ob68ahx75qyt
cmlk00rts0028n3b2vh174r1p	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirx6003vob68yvmmaioq	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "fcea6103-f37b-4754-9d1d-14dc3f7c4ce2", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.753	cmljlirfs0006ob68ahx75qyt
cmlk00ru20029n3b2ijm6ah63	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirx3003tob68oj3d6ypf	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "35c8de80-ebc5-402b-b3de-37c227549e56", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:56:38.762	cmljlirfs0006ob68ahx75qyt
cmlk048x0002qn3b26vjsa4s2	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqb001eob68rgz3sgrq	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "b30e3404-014a-4f35-aef3-4e9408dcef24", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:20.869	cmljlirfs0006ob68ahx75qyt
cmlk04c8m002rn3b2p316vuge	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqm001gob68di2ibyha	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "82f786ee-13b2-4d2c-b0ee-b247f2dd25eb", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.175	cmljlirfs0006ob68ahx75qyt
cmlk04c8n002sn3b2d6cmjuy5	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqq001iob68phzkj6ma	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "448dc496-f349-443b-879f-e6b4aa3998aa", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.175	cmljlirfs0006ob68ahx75qyt
cmlk04c9r002un3b2k7mnx2ca	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirsv0020ob68nnavhyh4	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "95117721-5c93-44db-ab5d-ae1b0f5cfce4", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.216	cmljlirfs0006ob68ahx75qyt
cmlk04cb1002wn3b24jkws4t0	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirsy0022ob68fq9xcihn	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "2f62a920-f226-4dd1-87e9-6b8061eaf8d7", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.261	cmljlirfs0006ob68ahx75qyt
cmlk04cbj002xn3b2if1l7h72	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirsr001yob6873j28q6s	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "8dfef7c7-b4e9-4ee2-94d7-ae1fee745db7", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.28	cmljlirfs0006ob68ahx75qyt
cmlk04ccd002zn3b2pq7ngyic	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirvx003bob68hcygkm7y	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "4ed1e09b-7414-4874-acbe-8ba01f09dc62", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.309	cmljlirfs0006ob68ahx75qyt
cmlk04c97002tn3b277piasfu	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirqb001eob68rgz3sgrq	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "380aabf1-cad4-4b0f-b4f1-1f41e09dedd8", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.195	cmljlirfs0006ob68ahx75qyt
cmlk04caf002vn3b28b79jezr	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirvu0039ob68hy1hwdri	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "36508850-a628-4448-9332-a5a439aca4d1", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.239	cmljlirfs0006ob68ahx75qyt
cmlk04cc0002yn3b23tsibdh5	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirx6003vob68yvmmaioq	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "3156a2c0-99a9-4014-9798-d4bc7f866133", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.297	cmljlirfs0006ob68ahx75qyt
cmlk04ccq0031n3b2w016gfvh	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirw0003dob684r6hotvu	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "6cc17f93-1911-4754-8c46-0734ff10963c", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.322	cmljlirfs0006ob68ahx75qyt
cmlk04ccz0032n3b2qv2e2rx1	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirx3003tob68oj3d6ypf	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "57edfdf3-1498-419f-9432-b1042b477bc3", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.331	cmljlirfs0006ob68ahx75qyt
cmlk04cd70033n3b2o1jzlo7h	Required route parameter 'id' is missing	Error: Required route parameter 'id' is missing\n    at getRequiredParam (/var/www/event-manager/dist/utils/routeHelpers.js:15:15)\n    at AssignmentsController.deleteAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:62:60)\n    at removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:148:25)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/auth.js:277:21	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/assignments/remove/cmljlirx9003xob68r3rmw43a	PUT	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "65f5d7c1-a730-4c0a-8926-ec9f2ac99f24", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 21:59:25.34	cmljlirfs0006ob68ahx75qyt
cmlk0r5660017ne1t8f5up3w1	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirsl001tob68g5doaqiz_cmljlirnx000zob680q6vc92v	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "febc542e-39f0-4db4-960d-01d70d798ccc", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.103	default-tenant
cmlk0r588001ane1ts65b1zt8	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirsl001tob68g5doaqiz_cmljliroo0012ob68f825shsg	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "872884a2-263e-4405-a3e2-78fc4569330f", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.176	default-tenant
cmlk0r56u0018ne1tjiqhkara	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirph0019ob68twuglukq_cmljliroo0012ob68f825shsg	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "686befff-e6de-4112-801c-3b6a427655a4", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.126	default-tenant
cmlk0r57i0019ne1tns24lmc7	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirph0019ob68twuglukq_cmljlirp00015ob68hyms1aec	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "121ca81a-87a6-4f84-ac10-6a73df381e99", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.151	default-tenant
cmlk0r58p001bne1txue2x4ba	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirwy003oob68mlnuivt0_cmljlirv1002xob688e4krg32	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "f0c8dde0-75f7-4e9e-a9f4-c861a561016d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.193	default-tenant
cmlk0r59a001cne1td8e21i2z	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirwy003oob68mlnuivt0_cmljlirvd0030ob68c9i8i2mg	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "3b12011d-4eda-4b70-a828-e473f29a745b", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.215	default-tenant
cmlk0r59o001dne1t4qpkkmyv	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirsl001tob68g5doaqiz_cmljlirp00015ob68hyms1aec	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "65b4a666-3c15-4192-b293-4d95ceab5d9d", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.229	default-tenant
cmlk0r5a3001fne1tvq64ti65	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljlirv1002xob688e4krg32	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "0837bc2d-2458-4370-81d2-b32286538acb", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.243	default-tenant
cmlk0r5ad001gne1tzl15d0id	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljliruq002uob681ke92klv	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "d0bfaaa7-0b2d-4303-b69b-1d1594dbe6c3", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.254	default-tenant
cmlk0r5an001hne1t5bficdw9	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirvn0034ob68j0fq4d2t_cmljlirvd0030ob68c9i8i2mg	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "569b76f8-007d-4f41-9be0-029d9372a524", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.264	default-tenant
cmlk0r5ay001ine1t1c0napwr	Assignment not found	NotFoundError: Assignment not found\n    at AssignmentService.createNotFoundError (/var/www/event-manager/dist/services/BaseService.js:69:16)\n    at AssignmentService.deleteAssignment (/var/www/event-manager/dist/services/AssignmentService.js:518:24)\n    at async removeAssignment (/var/www/event-manager/dist/controllers/assignmentsController.js:151:13)	ERROR	\N	cmlhmo05t000113i25pe4ao5e	/api/v1/assignments/remove/categoryJudge_cmljlirwy003oob68mlnuivt0_cmljliruq002uob681ke92klv	PUT	404	{"query": {}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "dec6d8df-72ac-4660-9ff3-3f69b3e35552", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:17:09.274	default-tenant
cmlk1sqe300305qlquj5yhpur	\nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "Test workflow",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770936366078",\n        type: "UPDATE_STATUS",\n        config: {},\n        order: 0\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "Test workflow",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770936366078",\n        type: "UPDATE_STATUS",\n        config: {},\n        order: 0\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async WorkflowService.createTemplate (/var/www/event-manager/dist/services/WorkflowService.js:48:30)\n    at async createTemplate (/var/www/event-manager/dist/controllers/workflowController.js:9:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/workflows/templates	POST	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "ef2b2437-06fa-4c55-a8a5-6fc4e9003d09", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:46:22.875	cmljlirfs0006ob68ahx75qyt
cmlk1ssqh00345qlqkgw988ci	\nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "Test workflow",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770936366078",\n        type: "UPDATE_STATUS",\n        config: {},\n        order: 0\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "Test workflow",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770936366078",\n        type: "UPDATE_STATUS",\n        config: {},\n        order: 0\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async WorkflowService.createTemplate (/var/www/event-manager/dist/services/WorkflowService.js:48:30)\n    at async createTemplate (/var/www/event-manager/dist/controllers/workflowController.js:9:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/workflows/templates	POST	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "e9375000-b4b2-48e5-a48f-cd30fbf851a7", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:46:25.913	cmljlirfs0006ob68ahx75qyt
cmlk1szh000385qlqn1q0wsje	\nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "Test workflow",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770936366078",\n        type: "UPDATE_STATUS",\n        config: {},\n        order: 0\n      },\n      {\n        id: "temp-1770936389711",\n        type: "SEND_EMAIL",\n        config: {},\n        order: 1\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "Test workflow",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770936366078",\n        type: "UPDATE_STATUS",\n        config: {},\n        order: 0\n      },\n      {\n        id: "temp-1770936389711",\n        type: "SEND_EMAIL",\n        config: {},\n        order: 1\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async WorkflowService.createTemplate (/var/www/event-manager/dist/services/WorkflowService.js:48:30)\n    at async createTemplate (/var/www/event-manager/dist/controllers/workflowController.js:9:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/workflows/templates	POST	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "ac9b653a-3b58-4df5-92fa-fc12e9cf3dac", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:46:34.645	cmljlirfs0006ob68ahx75qyt
cmlk1uw2z003c5qlq9z7659ok	Missing required fields: tenantId	ValidationError: Missing required fields: tenantId\n    at EmceeService.validateRequired (/var/www/event-manager/dist/services/BaseService.js:47:19)\n    at EmceeService.uploadScript (/var/www/event-manager/dist/services/EmceeService.js:432:14)\n    at uploadScript (/var/www/event-manager/dist/controllers/emceeController.js:164:52)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at done (/var/www/event-manager/node_modules/multer/lib/make-middleware.js:47:7)\n    at indicateDone (/var/www/event-manager/node_modules/multer/lib/make-middleware.js:51:68)\n    at /var/www/event-manager/node_modules/multer/lib/make-middleware.js:157:11\n    at WriteStream.<anonymous> (/var/www/event-manager/node_modules/multer/storage/disk.js:43:9)\n    at WriteStream.emit (node:events:536:35)\n    at finish (node:internal/streams/writable:955:10)\n    at node:internal/streams/writable:936:13\n    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/emcee/scripts	POST	400	{"query": {}, "params": {}, "errorCode": "VALIDATION_ERROR", "ipAddress": "192.168.80.140", "requestId": "cdb6f429-4533-46b7-bd22-92b7321a2e79", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:48:03.563	cmljlirfs0006ob68ahx75qyt
cmlkfpbv600088k7wiasaeeg5	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "ec6099f2-fb3d-46f7-ac76-2bac68e470ce", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:15:38.707	cmljlirfs0006ob68ahx75qyt
cmlk23cx900082la3z8cumobj	Missing required fields: tenantId	ValidationError: Missing required fields: tenantId\n    at EmceeService.validateRequired (/var/www/event-manager/dist/services/BaseService.js:47:19)\n    at EmceeService.uploadScript (/var/www/event-manager/dist/services/EmceeService.js:432:14)\n    at uploadScript (/var/www/event-manager/dist/controllers/emceeController.js:164:52)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at /var/www/event-manager/dist/middleware/errorHandler.js:99:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at done (/var/www/event-manager/node_modules/multer/lib/make-middleware.js:47:7)\n    at indicateDone (/var/www/event-manager/node_modules/multer/lib/make-middleware.js:51:68)\n    at /var/www/event-manager/node_modules/multer/lib/make-middleware.js:157:11\n    at WriteStream.<anonymous> (/var/www/event-manager/node_modules/multer/storage/disk.js:43:9)\n    at WriteStream.emit (node:events:536:35)\n    at finish (node:internal/streams/writable:955:10)\n    at node:internal/streams/writable:936:13\n    at process.processTicksAndRejections (node:internal/process/task_queues:82:21)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/emcee/scripts	POST	400	{"query": {}, "params": {}, "errorCode": "VALIDATION_ERROR", "ipAddress": "192.168.80.140", "requestId": "fa82f441-3d37-4094-96e0-cd575cb7917e", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:54:38.638	cmljlirfs0006ob68ahx75qyt
cmlk27xxc00092la3lwvy6ix5	User with identifier 'csv-template' not found	NotFoundError: User with identifier 'csv-template' not found\n    at UserService.assertExists (/var/www/event-manager/dist/services/BaseService.js:59:19)\n    at UserService.getUserByIdWithRelations (/var/www/event-manager/dist/services/UserService.js:595:18)\n    at async getUserById (/var/www/event-manager/dist/controllers/usersController.js:88:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/users/csv-template	GET	404	{"query": {"userType": "CONTESTANT"}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "af452a28-926a-4434-bb7c-395ec18061ab", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 22:58:12.481	cmljlirfs0006ob68ahx75qyt
cmlk37pvb000zdr28a0ixg3n1	\nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "test wf",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770938758419",\n        type: "SEND_EMAIL",\n        config: {},\n        order: 0\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.workflowTemplate.create()` invocation:\n\n{\n  data: {\n    name: "test wf",\n    description: "",\n    trigger: "MANUAL",\n    ~~~~~~~\n    actions: [\n      {\n        id: "temp-1770938758419",\n        type: "SEND_EMAIL",\n        config: {},\n        order: 0\n      }\n    ],\n    tenantId: "cmljlirfs0006ob68ahx75qyt",\n?   id?: String,\n?   type?: String,\n?   isDefault?: Boolean,\n?   isActive?: Boolean,\n?   config?: NullableJsonNullValueInput | Json,\n?   createdAt?: DateTime,\n?   updatedAt?: DateTime\n  }\n}\n\nUnknown argument `trigger`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async WorkflowService.createTemplate (/var/www/event-manager/dist/services/WorkflowService.js:48:30)\n    at async createTemplate (/var/www/event-manager/dist/controllers/workflowController.js:9:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/workflows/templates	POST	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "2d15e697-74ca-4d10-b38a-e97aa829c9dd", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-12 23:26:01.656	cmljlirfs0006ob68ahx75qyt
cmlkf3v9j000vzutaqwlmh3is	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "75bbb894-f268-43c3-99c5-7dc88b665c14", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 04:58:57.415	cmljlirfs0006ob68ahx75qyt
cmlkf3v9k000wzutau30c7fe2	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "c8c2bba0-9777-4e61-9652-5d90aaffcb4f", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 04:58:57.416	cmljlirfs0006ob68ahx75qyt
cmlkf3v9w000xzutawj4d6fnt	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "7b623572-1a3f-46a5-991c-2ee3cf1e70a6", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 04:58:57.429	cmljlirfs0006ob68ahx75qyt
cmlkfpbv600078k7wiapxg5ib	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "b6dc4a52-31d9-4548-ada6-8632baf3ed40", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:15:38.706	cmljlirfs0006ob68ahx75qyt
cmlkfpbvn00098k7w6a2t8jw1	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "663180b5-b287-4f3e-a2c9-46b955f8e40b", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:15:38.723	cmljlirfs0006ob68ahx75qyt
cmlkg35ux0008n31o73o84wvk	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "31b53f3d-4d06-47f9-a49c-346edad79914", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:26:24.105	cmljlirfs0006ob68ahx75qyt
cmlkg35ux0009n31o072zx3yj	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "d0c794b1-37db-4d19-9387-f23839041343", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:26:24.106	cmljlirfs0006ob68ahx75qyt
cmlkg35vk000dn31okm2ifd80	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "ee798a7b-244e-4a52-9549-2e251b991352", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:26:24.128	cmljlirfs0006ob68ahx75qyt
cmlkg4uks000mn31oa9b4s8qq	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "625fc0c8-8127-4b72-b2eb-8fc393395ac9", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:27:42.797	cmljlirfs0006ob68ahx75qyt
cmlkg4ukt000nn31oecojt51v	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "8240c370-0885-4da4-958f-d05fbe5a4fba", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:27:42.798	cmljlirfs0006ob68ahx75qyt
cmlkg4ulb000on31o24vtijhi	Score already exists for this judge and contestant	ConflictError: Score already exists for this judge and contestant\n    at ScoringService.submitScore (/var/www/event-manager/dist/services/ScoringService.js:187:27)\n    at async submitScore (/var/www/event-manager/dist/controllers/scoringController.js:78:30)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/contestant/cmljlirxu0044ob68fxovv5kp	POST	409	{"query": {}, "params": {}, "errorCode": "CONFLICT", "ipAddress": "192.168.80.140", "requestId": "94ce0799-54fe-4d25-8f91-708d4c2e45cf", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 05:27:42.815	cmljlirfs0006ob68ahx75qyt
cmlkjlkk00027bqx2kr2e6uk5	User with identifier 'csv-template' not found	NotFoundError: User with identifier 'csv-template' not found\n    at UserService.assertExists (/var/www/event-manager/dist/services/BaseService.js:59:19)\n    at UserService.getUserByIdWithRelations (/var/www/event-manager/dist/services/UserService.js:600:18)\n    at async getUserById (/var/www/event-manager/dist/controllers/usersController.js:88:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/users/csv-template	GET	404	{"query": {"userType": "CONTESTANT"}, "params": {}, "errorCode": "RESOURCE_NOT_FOUND", "ipAddress": "192.168.80.140", "requestId": "bda75bb8-cf6b-42c1-9447-9ea3ace3f53e", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-13 07:04:41.808	cmljlirfs0006ob68ahx75qyt
cmll66nkt00155x9r36kb8fcs	Winners have not been published yet. Only Board members and administrators can view unpublished results.	AuthorizationError: Winners have not been published yet. Only Board members and administrators can view unpublished results.\n    at WinnerService.forbiddenError (/var/www/event-manager/dist/services/BaseService.js:81:16)\n    at WinnerService.getWinnersByContest (/var/www/event-manager/dist/services/WinnerService.js:259:24)\n    at async getWinnersByContest (/var/www/event-manager/dist/controllers/winnersController.js:50:28)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/winners/contest/cmljlirlz000iob68vgxu6sxk	GET	403	{"query": {}, "params": {}, "errorCode": "AUTHORIZATION_ERROR", "ipAddress": "192.168.80.140", "requestId": "1b1cbe70-2a6b-4efb-92a0-f66d2e8cbc23", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-13 17:36:57.054	cmljlirfs0006ob68ahx75qyt
cmll66ofb00165x9roegwzs33	Winners have not been published yet. Only Board members and administrators can view unpublished results.	AuthorizationError: Winners have not been published yet. Only Board members and administrators can view unpublished results.\n    at WinnerService.forbiddenError (/var/www/event-manager/dist/services/BaseService.js:81:16)\n    at WinnerService.getWinnersByContest (/var/www/event-manager/dist/services/WinnerService.js:259:24)\n    at async getWinnersByContest (/var/www/event-manager/dist/controllers/winnersController.js:50:28)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/winners/contest/cmljlirlz000iob68vgxu6sxk	GET	403	{"query": {}, "params": {}, "errorCode": "AUTHORIZATION_ERROR", "ipAddress": "192.168.80.140", "requestId": "3662e1d2-5a7d-4065-a89b-51e5f2c4ae51", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-13 17:36:58.151	cmljlirfs0006ob68ahx75qyt
cmll66ox500185x9r2cvccj07	Winners have not been published yet. Only Board members and administrators can view unpublished results.	AuthorizationError: Winners have not been published yet. Only Board members and administrators can view unpublished results.\n    at WinnerService.forbiddenError (/var/www/event-manager/dist/services/BaseService.js:81:16)\n    at WinnerService.getWinnersByContest (/var/www/event-manager/dist/services/WinnerService.js:259:24)\n    at async getWinnersByContest (/var/www/event-manager/dist/controllers/winnersController.js:50:28)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/winners/contest/cmljliru3002dob68d2n822p1	GET	403	{"query": {}, "params": {}, "errorCode": "AUTHORIZATION_ERROR", "ipAddress": "192.168.80.140", "requestId": "28ddd505-b902-4734-86b6-16ab87b1a732", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-13 17:36:58.793	cmljlirfs0006ob68ahx75qyt
cmll66pqe00195x9rn0wdhmk2	Winners have not been published yet. Only Board members and administrators can view unpublished results.	AuthorizationError: Winners have not been published yet. Only Board members and administrators can view unpublished results.\n    at WinnerService.forbiddenError (/var/www/event-manager/dist/services/BaseService.js:81:16)\n    at WinnerService.getWinnersByContest (/var/www/event-manager/dist/services/WinnerService.js:259:24)\n    at async getWinnersByContest (/var/www/event-manager/dist/controllers/winnersController.js:50:28)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/winners/contest/cmljliru3002dob68d2n822p1	GET	403	{"query": {}, "params": {}, "errorCode": "AUTHORIZATION_ERROR", "ipAddress": "192.168.80.140", "requestId": "07ba46b2-5f0c-404d-ae58-60b947e210a8", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-13 17:36:59.846	cmljlirfs0006ob68ahx75qyt
cmll9om8d0009115lcyjc4usg	\nInvalid `prisma.$executeRaw()` invocation:\n\n\nRaw query failed. Code: `42804`. Message: `ERROR: column "status" is of type "RequestStatus" but expression is of type text\nHINT: You will need to rewrite or cast the expression.`	PrismaClientKnownRequestError: \nInvalid `prisma.$executeRaw()` invocation:\n\n\nRaw query failed. Code: `42804`. Message: `ERROR: column "status" is of type "RequestStatus" but expression is of type text\nHINT: You will need to rewrite or cast the expression.`\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:7315)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async /var/www/event-manager/dist/services/ScoreGovernanceService.js:240:13\n    at async Proxy._transactionWithCallback (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:8000)\n    at async ScoreGovernanceService.createRequest (/var/www/event-manager/dist/services/ScoreGovernanceService.js:239:9)\n    at async createRequest (/var/www/event-manager/dist/controllers/scoreGovernanceController.js:69:29)	ERROR	\N	cmljlirna000oob68cn4w7bsj	/api/v1/score-governance/requests	POST	500	{"query": {}, "params": {}, "errorCode": "P2010", "ipAddress": "192.168.80.140", "requestId": "0d963ed6-f857-4c81-bd02-4387d2f5613e", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-13 19:14:53.965	cmljlirfs0006ob68ahx75qyt
cmlle408d000kjp4iypju90fm	Judge certification must be completed first	Error: Judge certification must be completed first\n    at applyCertificationStage (/var/www/event-manager/dist/utils/certificationPipeline.js:138:19)\n    at async TallyMasterService.certifyTotals (/var/www/event-manager/dist/services/TallyMasterService.js:290:9)\n    at async certifyTotals (/var/www/event-manager/dist/controllers/tallyMasterController.js:99:28)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/tally-master/certify-totals	POST	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "c2173b0b-c9f7-4e21-8e8a-e71af3b1d164", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:147.0) Gecko/20100101 Firefox/147.0"}	f	\N	\N	2026-02-13 21:18:50.413	cmljlirfs0006ob68ahx75qyt
cmllpypwp000gjx0wvbrcehtj	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "organizer1@febtest1.com", "reason": "invalid_credentials", "tenantId": "cmljlirfs0006ob68ahx75qyt", "ipAddress": "::ffff:127.0.0.1", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 02:50:39.143	cmljlirfs0006ob68ahx75qyt
cmllr6unc000114d5c4b9p9mp	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "organizer1@febtest1.com", "reason": "invalid_credentials", "tenantId": "cmljlirfs0006ob68ahx75qyt", "ipAddress": "::ffff:127.0.0.1", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 03:24:58.153	cmljlirfs0006ob68ahx75qyt
cmllsbe72000wcs2y9jygozew	Role ORGANIZER is not allowed to advance this step	Error: Role ORGANIZER is not allowed to advance this step\n    at WorkflowService.advanceWorkflow (/var/www/event-manager/dist/services/WorkflowService.js:384:23)\n    at async advanceWorkflow (/var/www/event-manager/dist/controllers/workflowController.js:163:26)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/workflows/instances/cmllsb4or000qcs2yw6hiwate/advance	POST	500	{"query": {}, "params": {}, "ipAddress": "192.168.80.140", "requestId": "07e4dc81-3dd0-493d-a7df-21c2c8ff9e7a", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-14 03:56:29.726	cmljlirfs0006ob68ahx75qyt
cmllwpold002tv25ao3axcalz	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "43c4e004-bfcb-4645-852d-a8402b8fa37c", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:34.849	cmljlirfs0006ob68ahx75qyt
cmllwpp01002uv25aheo2l7no	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "4ceef32f-b985-4318-94e1-bd67d53aabc8", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:35.377	cmljlirfs0006ob68ahx75qyt
cmllwpped002zv25aii29t32t	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "0d3e9369-98fb-4171-a05e-b4a5f9ea8016", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:35.893	cmljlirfs0006ob68ahx75qyt
cmllwppry0033v25a5njm0jkv	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirnl000sob68a6phas6e	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "031e406d-1a4e-4b5f-a6de-8c4e8ce8b561", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:36.382	cmljlirfs0006ob68ahx75qyt
cmllwpq5z0038v25anquvg2bd	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirlw000gob68u4qq1mj1	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "50b82b49-4f96-468f-8704-7723da9956e9", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:36.887	cmljlirfs0006ob68ahx75qyt
cmllwpquv003cv25aauer30ih	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirqy001lob68xujtv9oi	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "b17d7d39-629b-4858-b734-d4224a91b811", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:37.783	cmljlirfs0006ob68ahx75qyt
cmllwq9wg003hv25aa24z3whb	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljliro40011ob68rvlxi3jv	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "d7904022-a19f-43c4-a78e-9058965db032", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.464	cmljlirfs0006ob68ahx75qyt
cmllwq9xl003iv25a6xtxe80v	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirmz000kob68oyxznmzh	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "1e7fa15c-1574-412b-bcac-77789b0ab927", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.506	cmljlirfs0006ob68ahx75qyt
cmllwpqb4003av25axembm4d2	Insufficient permissions	Error: Insufficient permissions\n    at ResultsService.getAllResults (/var/www/event-manager/dist/services/ResultsService.js:165:23)\n    at getAllResults (/var/www/event-manager/dist/controllers/resultsController.js:24:66)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at Route.dispatch (/var/www/event-manager/node_modules/express/lib/router/route.js:119:3)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at /var/www/event-manager/node_modules/express/lib/router/index.js:284:15\n    at Function.process_params (/var/www/event-manager/node_modules/express/lib/router/index.js:346:12)\n    at next (/var/www/event-manager/node_modules/express/lib/router/index.js:280:10)\n    at /var/www/event-manager/dist/middleware/auth.js:342:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at trim_prefix (/var/www/event-manager/node_modules/express/lib/router/index.js:328:13)\n    at /var/www/event-manager/node_modules/express/lib/router/index.js:286:9\n    at Function.process_params (/var/www/event-manager/node_modules/express/lib/router/index.js:346:12)\n    at next (/var/www/event-manager/node_modules/express/lib/router/index.js:280:10)\n    at authenticateToken (/var/www/event-manager/dist/middleware/auth.js:167:9)	ERROR	\N	cmljlirkm000aob68y6pykq2w	/api/v1/results	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "f0e7844c-9c08-46f0-8f37-f99bf5dfb437", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:37.072	cmljlirfs0006ob68ahx75qyt
cmllwpqi9003bv25av24lap9o	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirkm000aob68y6pykq2w	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "9e1e33e6-e50a-47b5-b13d-51d27de8946e", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 05:59:37.329	cmljlirfs0006ob68ahx75qyt
cmllwq9um003fv25asgmuijs1	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirlq000eob68ct4hsyx2	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "d821e688-58e8-4c22-be60-7813595b7c7e", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.399	cmljlirfs0006ob68ahx75qyt
cmllwq9yv003jv25a90hhoze0	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirnl000sob68a6phas6e	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "e6e85a31-1ef5-49c1-9e3a-cf8ae045518c", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.552	cmljlirfs0006ob68ahx75qyt
cmllwqa0d003kv25aexbw67s8	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirlw000gob68u4qq1mj1	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "f34f308a-ca33-43d6-966e-0e40da9a395d", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.606	cmljlirfs0006ob68ahx75qyt
cmllwqa25003lv25aiilucukt	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirkm000aob68y6pykq2w	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "42234d42-a46a-42b2-a2cf-4f2e9f6d9194", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.67	cmljlirfs0006ob68ahx75qyt
cmllwqa3q003mv25aroktk6a2	\nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.	PrismaClientValidationError: \nInvalid `prisma.deductionRequest.findMany()` invocation:\n\n{\n  where: {\n    status: "PENDING",\n    tenantId: "cmljlirfs0006ob68ahx75qyt"\n  },\n  include: {\n    contestant: {\n      select: {\n        id: true,\n        name: true,\n        email: true\n      }\n    },\n    category: {\n      select: {\n        id: true,\n        name: true\n      }\n    },\n    requestedBy: {\n      select: {\n        id: true,\n        name: true,\n        email: true,\n        role: true\n      }\n    },\n    approvals: {\n      include: {\n        approver: {\n        ~~~~~~~~\n          select: {\n            id: true,\n            name: true,\n            email: true,\n            role: true\n          }\n        },\n?       request?: true\n      }\n    }\n  },\n  orderBy: {\n    createdAt: "desc"\n  }\n}\n\nUnknown field `approver` for include statement on model `DeductionApproval`. Available options are marked with ?.\n    at wn (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:29:1363)\n    at $n.handleRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6958)\n    at $n.handleAndLogRequestError (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6623)\n    at $n.request (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:121:6307)\n    at async l (/var/www/event-manager/node_modules/@prisma/client/runtime/library.js:130:9633)\n    at async /var/www/event-manager/dist/middleware/queryMonitoring.js:14:28\n    at async DeductionService.getPendingDeductions (/var/www/event-manager/dist/services/DeductionService.js:76:28)\n    at async getPendingDeductions (/var/www/event-manager/dist/controllers/deductionController.js:42:32)	ERROR	\N	cmljlirqy001lob68xujtv9oi	/api/v1/deductions/pending	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "78797655-9b1b-4182-b634-1d592c4a244b", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.726	cmljlirfs0006ob68ahx75qyt
cmllwqa5i003nv25a5gnta0z4	Insufficient permissions	Error: Insufficient permissions\n    at ResultsService.getAllResults (/var/www/event-manager/dist/services/ResultsService.js:165:23)\n    at getAllResults (/var/www/event-manager/dist/controllers/resultsController.js:24:66)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at next (/var/www/event-manager/node_modules/express/lib/router/route.js:149:13)\n    at Route.dispatch (/var/www/event-manager/node_modules/express/lib/router/route.js:119:3)\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at /var/www/event-manager/node_modules/express/lib/router/index.js:284:15\n    at Function.process_params (/var/www/event-manager/node_modules/express/lib/router/index.js:346:12)\n    at next (/var/www/event-manager/node_modules/express/lib/router/index.js:280:10)\n    at /var/www/event-manager/dist/middleware/auth.js:342:9\n    at Layer.handle [as handle_request] (/var/www/event-manager/node_modules/express/lib/router/layer.js:95:5)\n    at trim_prefix (/var/www/event-manager/node_modules/express/lib/router/index.js:328:13)\n    at /var/www/event-manager/node_modules/express/lib/router/index.js:286:9\n    at Function.process_params (/var/www/event-manager/node_modules/express/lib/router/index.js:346:12)\n    at next (/var/www/event-manager/node_modules/express/lib/router/index.js:280:10)\n    at authenticateToken (/var/www/event-manager/dist/middleware/auth.js:167:9)	ERROR	\N	cmljlirkm000aob68y6pykq2w	/api/v1/results	GET	500	{"query": {}, "params": {}, "ipAddress": "::ffff:127.0.0.1", "requestId": "3015d259-070c-4a8f-ba25-d0181b426bd4", "userAgent": "curl/8.5.0"}	f	\N	\N	2026-02-14 06:00:02.79	cmljlirfs0006ob68ahx75qyt
cmlmpur5j001pyb8beh0brgli	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "Organizer1@febtest1.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-14 19:35:20.311	default-tenant
cmlmpuyhe001ryb8bfxkmx9ws	Invalid credentials	Error: Invalid credentials\n    at AuthService.login (/var/www/event-manager/dist/services/AuthService.js:165:52)\n    at async login (/var/www/event-manager/dist/controllers/authController.js:41:28)	ERROR	AuthService:login	\N	\N	\N	\N	{"email": "Organizer1@febtest1.com", "reason": "invalid_credentials", "tenantId": "default-tenant", "ipAddress": "192.168.80.140", "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"}	f	\N	\N	2026-02-14 19:35:29.81	default-tenant
\.


--
-- Data for Name: event_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.event_logs (id, "tenantId", "eventType", "entityType", "entityId", payload, "userId", source, "correlationId", "timestamp", processed, "processedAt", "retryCount", "lastError", metadata) FROM stdin;
\.


--
-- Data for Name: event_templates; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.event_templates (id, name, description, contests, categories, "createdBy", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.events (id, name, description, "startDate", "endDate", "createdAt", "updatedAt", archived, location, "maxContestants", "contestantNumberingMode", "contestantViewRestricted", "isLocked", "contestantViewReleaseDate", "lockedAt", "lockVerifiedBy", "scoringType", "tenantId", "deletedAt", "deletedBy") FROM stdin;
cmljlirjf0008ob68pb9qdz8h	Test Event 2/12/2026	Test event created by test setup service	2026-02-12 15:10:43.928	2026-02-19 15:10:43.928	2026-02-12 15:10:43.945	2026-02-12 15:10:43.945	f	Test Location	\N	MANUAL	f	f	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	\N	\N
cmllq15z1000cn8b4fuo5mlyn	UAT Generated Event	from template	2026-02-14 00:00:00	2026-02-15 00:00:00	2026-02-14 02:52:33.277	2026-02-14 02:56:00.809	f	\N	\N	MANUAL	f	f	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	2026-02-14 02:56:00.807	cmljlirlq000eob68ct4hsyx2
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.feature_flags (id, name, description, enabled, strategy, percentage, "userIds", "tenantIds", "startDate", "endDate", "targetPercentage", "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.files (id, filename, "originalName", "mimeType", size, path, category, "uploadedBy", "uploadedAt", "isPublic", metadata, checksum, "eventId", "contestId", "categoryId", "tenantId") FROM stdin;
\.


--
-- Data for Name: judge_certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.judge_certifications (id, "categoryId", "judgeId", "signatureName", "certifiedAt", "tenantId") FROM stdin;
cmllboc08001h115ld0cbe770	cmljlirwy003oob68mlnuivt0	cmljlirnx000zob680q6vc92v	Test Judge 1	2026-02-13 20:10:39.944	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: judge_comments; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.judge_comments (id, "categoryId", "contestantId", "judgeId", comment, "createdAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: judge_contestant_certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.judge_contestant_certifications (id, "categoryId", "judgeId", "contestantId", "certifiedAt", comments, "tenantId") FROM stdin;
\.


--
-- Data for Name: judge_score_removal_requests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.judge_score_removal_requests (id, "categoryId", "contestantId", "judgeId", "scoreId", reason, status, "requestedAt", "reviewedAt", "reviewedById", "tenantId") FROM stdin;
\.


--
-- Data for Name: judge_uncertification_requests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.judge_uncertification_requests (id, "categoryId", "judgeId", reason, "requestedBy", "requestedAt", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "createdAt", "updatedAt", status, "tenantId") FROM stdin;
\.


--
-- Data for Name: judges; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.judges (id, name, email, gender, pronouns, bio, "imagePath", "createdAt", "updatedAt", "isHeadJudge", "tenantId") FROM stdin;
cmljlirnx000zob680q6vc92v	Test Judge 1	judge1@febtest1.com	\N	\N	Test judge bio 1	\N	2026-02-12 15:10:44.109	2026-02-12 15:10:44.109	f	cmljlirfs0006ob68ahx75qyt
cmljliroo0012ob68f825shsg	Test Judge 2	judge2@febtest1.com	\N	\N	Test judge bio 2	\N	2026-02-12 15:10:44.136	2026-02-12 15:10:44.136	f	cmljlirfs0006ob68ahx75qyt
cmljlirp00015ob68hyms1aec	Test Judge 3	judge3@febtest1.com	\N	\N	Test judge bio 3	\N	2026-02-12 15:10:44.149	2026-02-12 15:10:44.149	f	cmljlirfs0006ob68ahx75qyt
cmljliruq002uob681ke92klv	Test Judge 4	judge4@febtest1.com	\N	\N	Test judge bio 4	\N	2026-02-12 15:10:44.354	2026-02-12 15:10:44.354	f	cmljlirfs0006ob68ahx75qyt
cmljlirv1002xob688e4krg32	Test Judge 5	judge5@febtest1.com	\N	\N	Test judge bio 5	\N	2026-02-12 15:10:44.366	2026-02-12 15:10:44.366	f	cmljlirfs0006ob68ahx75qyt
cmljlirvd0030ob68c9i8i2mg	Test Judge 6	judge6@febtest1.com	\N	\N	Test judge bio 6	\N	2026-02-12 15:10:44.378	2026-02-12 15:10:44.378	f	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: logging_settings; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.logging_settings (id, level, "enableAudit", "enableActivity", "enableError", "maxLogAge", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notification_digests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.notification_digests (id, "userId", frequency, "lastSentAt", "nextSendAt", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.notification_preferences (id, "userId", "emailEnabled", "pushEnabled", "inAppEnabled", "emailDigestFrequency", "emailTypes", "pushTypes", "inAppTypes", "quietHoursStart", "quietHoursEnd", "createdAt", "updatedAt", "tenantId") FROM stdin;
cmli819pb000t1266hqw1d7iz	cmlhmo05t000113i25pe4ao5e	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-11 16:05:26.495	2026-02-11 16:05:26.495	default-tenant
cmljqqswt0003icfr3gqs3djo	cmljlirmz000kob68oyxznmzh	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-12 17:36:57.054	2026-02-12 17:36:57.054	cmljlirfs0006ob68ahx75qyt
cmlk1xl1b003t5qlqdv5fr1bz	cmljliro40011ob68rvlxi3jv	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-12 22:50:09.215	2026-02-12 22:50:09.215	cmljlirfs0006ob68ahx75qyt
cmlkhdj1m000ubqx289eqa1ho	cmljlirxw0046ob689rtkcnzg	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-13 06:02:27.37	2026-02-13 06:02:27.37	cmljlirfs0006ob68ahx75qyt
cmll67cjx001j5x9rvblwr0m2	cmljlirnl000sob68a6phas6e	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-13 17:37:29.421	2026-02-13 17:37:29.421	cmljlirfs0006ob68ahx75qyt
cmll7rt05000wuikqo7y62mcc	cmljliror0014ob68xdcfhymw	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-13 18:21:23.478	2026-02-13 18:21:23.478	cmljlirfs0006ob68ahx75qyt
cmllqvg4z0003t11zun6h00r5	cmljlirlq000eob68ct4hsyx2	t	f	t	daily	\N	\N	\N	\N	\N	2026-02-14 03:16:06.132	2026-02-14 03:16:06.132	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.notification_templates (id, name, type, title, body, "emailSubject", "emailBody", variables, "isActive", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.notifications (id, "userId", type, title, message, link, read, "readAt", metadata, "createdAt", "updatedAt", "tenantId", "emailSent", "emailSentAt", "pushSent", "pushSentAt", "templateId", "sentBy", "deletedAt") FROM stdin;
\.


--
-- Data for Name: overall_deductions; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.overall_deductions (id, "categoryId", "contestantId", deduction, reason, "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: password_histories; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.password_histories (id, "userId", password, "createdAt") FROM stdin;
\.


--
-- Data for Name: password_policies; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.password_policies (id, "minLength", "requireUppercase", "requireLowercase", "requireNumbers", "requireSpecialChars", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: performance_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.performance_logs (id, endpoint, method, "responseTime", "statusCode", "userId", "ipAddress", "userAgent", "createdAt", "eventId", "contestId", "categoryId") FROM stdin;
cmlhn2v7x00011266129ne7la	/api/v1/csrf-token	GET	6	200	\N	\N	\N	2026-02-11 06:18:49.101	\N	\N	\N
cmlhn2vem00021266ew25fj41	/theme	GET	34	200	\N	\N	\N	2026-02-11 06:18:49.342	\N	\N	\N
cmlhn2vg4000312661ah6jk8a	/theme	GET	46	200	\N	\N	\N	2026-02-11 06:18:49.396	\N	\N	\N
cmlhn3cea00061266ufxtef47	/login	POST	54	401	\N	\N	\N	2026-02-11 06:19:11.362	\N	\N	\N
cmlhngorp000b126659fuot2k	/theme	GET	60	200	\N	\N	\N	2026-02-11 06:29:33.926	\N	\N	\N
cmlhngot9000c1266sdp883c6	/profile	GET	13	429	\N	\N	\N	2026-02-11 06:29:33.982	\N	\N	\N
cmlhnhp5o000d1266dgw2o2d7	/theme	GET	55	200	\N	\N	\N	2026-02-11 06:30:21.084	\N	\N	\N
cmlhni1nz000e1266wfo813s6	/theme	GET	40	200	\N	\N	\N	2026-02-11 06:30:37.296	\N	\N	\N
cmlhni1qe000f12664yoxk1mm	/slug/:slug	GET	26	200	\N	\N	\N	2026-02-11 06:30:37.383	\N	\N	\N
cmlhni6sh000g1266th2afq46	/slug/:slug	GET	20	200	\N	\N	\N	2026-02-11 06:30:43.937	\N	\N	\N
cmlhni6uj000h1266g6tfiy6u	/profile	GET	17	429	\N	\N	\N	2026-02-11 06:30:44.012	\N	\N	\N
cmlhniod8000i12663qzoljwy	/profile	GET	22	429	\N	\N	\N	2026-02-11 06:31:06.716	\N	\N	\N
cmlhoy3jf000j1266mhgqn49m	/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php	GET	8	404	\N	\N	\N	2026-02-11 07:11:05.835	\N	\N	\N
cmlhvgliz000k1266xi3l4ygi	/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php	GET	7	404	\N	\N	\N	2026-02-11 10:13:26.651	\N	\N	\N
cmli813il000q1266fh4knbd0	/	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:05:18.477	\N	\N	\N
cmli813j9000r12665x2iuc0e	/stats	GET	45	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:05:18.501	\N	\N	\N
cmli81bdk000u1266or23nus3	/theme	GET	76	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:05:28.665	\N	\N	\N
cmli82t4z000v1266dlzrtjg4	/	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:06:38.34	\N	\N	\N
cmli82t67000w1266touz2nnb	/theme	GET	87	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:06:38.383	\N	\N	\N
cmli82x0w000x1266gmo19srp	/security	GET	55	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:06:43.376	\N	\N	\N
cmli82x4d000y1266yp5euphg	/theme	GET	157	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:06:43.502	\N	\N	\N
cmli82x5z000z1266ip7eq834	/email	GET	245	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:06:43.559	\N	\N	\N
cmli83kpc001012662mx3752t	/security	GET	47	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:14.064	\N	\N	\N
cmli83kr100111266up90pgyq	/password-policy	GET	52	200	\N	\N	\N	2026-02-11 16:07:14.126	\N	\N	\N
cmli83ktl0012126698ocqoig	/theme	GET	132	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:14.218	\N	\N	\N
cmli83ktt00131266gdw0crax	/general	GET	229	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:14.226	\N	\N	\N
cmli83miz001412660ksm1jrw	/password-policy	GET	38	200	\N	\N	\N	2026-02-11 16:07:16.428	\N	\N	\N
cmli83mky00151266vjco2yfw	/contestant-visibility	GET	63	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:16.498	\N	\N	\N
cmli83mmk00161266v0vycyum	/security	GET	77	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:16.555	\N	\N	\N
cmli83moi00171266gpxyo59s	/theme	GET	164	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:16.626	\N	\N	\N
cmli83vvf00181266ss6gg5yj	/theme	GET	43	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:07:28.539	\N	\N	\N
cmli85z2u00191266yhijved9	/profile	GET	15	401	\N	\N	\N	2026-02-11 16:09:06.006	\N	\N	\N
cmli85z44001a1266jcgn6oyw	/theme	GET	50	200	\N	\N	\N	2026-02-11 16:09:06.052	\N	\N	\N
cmli8661g001e12664ud07sff	/logs	GET	49	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:09:15.029	\N	\N	\N
cmli86hxt001f12664e0l8fh3	/theme	GET	31	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:09:30.449	\N	\N	\N
cmli87gk6001g1266ctaqdp7l	/logs	GET	28	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:10:15.318	\N	\N	\N
cmli87q6s001h1266je755m8p	/	GET	52	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:10:27.796	\N	\N	\N
cmli87t8a001i1266fqkindlt	/logs	GET	26	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:10:31.738	\N	\N	\N
cmli89qzk001j1266uoc7sav7	/logs	GET	84	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:02.145	\N	\N	\N
cmli8a0pj001k1266puxcwtkb	/theme	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:14.743	\N	\N	\N
cmli8a2lp001l1266s0ox6sgl	/logs	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:17.197	\N	\N	\N
cmli8a2n8001m1266n9idsurd	/theme	GET	46	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:17.253	\N	\N	\N
cmli8aayh001n1266s8xsjmtf	/theme	GET	73	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:28.025	\N	\N	\N
cmli8ac6o001o1266x0hc99uo	/theme	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:29.617	\N	\N	\N
cmli8acas001p1266j6o5jlrn	/security	GET	61	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:29.764	\N	\N	\N
cmli8acdm001q1266fhb22as3	/theme	GET	160	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:29.866	\N	\N	\N
cmli8acfo001r1266p87o470t	/email	GET	226	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:12:29.94	\N	\N	\N
cmli8cbae001s1266ku1agzs8	/stats	GET	72	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:14:01.766	\N	\N	\N
cmli8dltb001t1266d0vrs3ii	/stats	GET	110	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:15:02.063	\N	\N	\N
cmli8e8yy001u12664sjxeqzj	/logs	GET	28	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:15:32.074	\N	\N	\N
cmli8fiqu001v1266zr9t2l19	/stats	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:16:31.399	\N	\N	\N
cmli8fjg1001w12661d0n0hik	/logs	GET	27	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:16:32.306	\N	\N	\N
cmli8hh6f001x12667glupiul	/stats	GET	40	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:18:02.68	\N	\N	\N
cmli8irlv001y1266daidgyha	/stats	GET	71	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:19:02.851	\N	\N	\N
cmli8jetz001z126619fdsq5a	/logs	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:19:32.951	\N	\N	\N
cmli8kg0a002112662gerc978	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-11 16:20:21.13	\N	\N	\N
cmli8kg0q00221266cegq4cc5	/slug/:slug	GET	33	200	\N	\N	\N	2026-02-11 16:20:21.146	\N	\N	\N
cmli8kg22002312662rsf4rci	/profile	GET	31	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:20:21.194	\N	\N	\N
cmli8kpbg002412665rc0r9r5	/logs	GET	26	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:20:33.196	\N	\N	\N
cmli8lcok002512666ydnqrs7	/	GET	18	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:21:03.477	\N	\N	\N
cmli8ltr800261266ickjv8fw	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-11 16:21:25.605	\N	\N	\N
cmli8m28900271266glrwf2gt	/theme	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:21:36.585	\N	\N	\N
cmli8mar10028126684e8b1wr	/stats	GET	52	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:21:47.63	\N	\N	\N
cmli8nl8n00291266t37mwrdp	/stats	GET	30	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:22:47.879	\N	\N	\N
cmli8o8ep002a1266yabz0a8y	/logs	GET	24	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:23:17.905	\N	\N	\N
cmli8piw5002b1266l95354fv	/stats	GET	83	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:24:18.15	\N	\N	\N
cmli8te8v002c12660uvtzqwz	/logs	GET	20	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:27:18.751	\N	\N	\N
cmli8u1i5002d1266pjfs3xvm	/stats	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:27:48.894	\N	\N	\N
cmli8vbxe002e1266mx0a5vy9	/logs	GET	27	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:28:49.058	\N	\N	\N
cmli8wmeo002f12668973yr53	/logs	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:29:49.297	\N	\N	\N
cmlkdxo51000h7gqpdr84s78d	/slug/:slug	GET	19	200	\N	\N	\N	2026-02-13 04:26:08.629	\N	\N	\N
cmli8z7hx002g1266viqmwujw	/logs	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:31:49.941	\N	\N	\N
cmli8z7ib002h1266ho7ivsc0	/stats	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:31:49.955	\N	\N	\N
cmli91sfr002i1266kx8vah63	/stats	GET	50	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:33:50.392	\N	\N	\N
cmli932z9002j1266dm81rbox	/logs	GET	27	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:34:50.709	\N	\N	\N
cmli932zk002k1266a7svabqz	/stats	GET	43	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:34:50.72	\N	\N	\N
cmli95nwc002l1266lofxu3ih	/logs	GET	21	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:36:51.133	\N	\N	\N
cmli96b75002m1266y84djrir	/logs	GET	83	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:37:21.329	\N	\N	\N
cmli96yfo002n1266ddtw9npx	/stats	GET	45	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:37:51.444	\N	\N	\N
cmli97lor002o12661jht129u	/stats	GET	77	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:38:21.58	\N	\N	\N
cmli99jfk002p1266gz4unwzn	/logs	GET	75	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:39:51.968	\N	\N	\N
cmli9dew2002q126615h87vss	/stats	GET	42	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:42:52.706	\N	\N	\N
cmli9e259002r1266dame7lcp	/logs	GET	29	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:43:22.845	\N	\N	\N
cmli9e26i002s1266mkth0t2w	/stats	GET	80	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:43:22.89	\N	\N	\N
cmli9epdc002t1266ydsyf3qa	/logs	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:43:52.944	\N	\N	\N
cmli9epdy002u1266x4t89zgj	/stats	GET	40	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:43:52.966	\N	\N	\N
cmli9fcmq002v1266t9pp08ay	/logs	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:44:23.091	\N	\N	\N
cmli9fzv9002w1266myt353b1	/logs	GET	24	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:44:53.205	\N	\N	\N
cmli9fzwm002x1266n5ga58fd	/stats	GET	79	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:44:53.255	\N	\N	\N
cmli9iktt002y12662m1cdt0s	/stats	GET	39	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:46:53.681	\N	\N	\N
cmli9kik7002z1266g201pioo	/stats	GET	77	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:48:24.055	\N	\N	\N
cmli9n3kv00301266c9kentke	/stats	GET	75	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:50:24.607	\N	\N	\N
cmli9oe2g003112667jgpva4r	/logs	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:51:24.856	\N	\N	\N
cmli9qyy400321266yzm2ruqr	/logs	GET	20	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:53:25.228	\N	\N	\N
cmli9u79100331266vzli3ilh	/logs	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:55:55.957	\N	\N	\N
cmli9ypva00341266253oxczp	/stats	GET	41	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:59:26.71	\N	\N	\N
cmli9zd3t0035126623tfr5gx	/logs	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 16:59:56.826	\N	\N	\N
cmlia0nnl00361266agb6ua8r	/stats	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:00:57.154	\N	\N	\N
cmlia1asq00371266w5znae7n	/logs	GET	22	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:01:27.147	\N	\N	\N
cmlia1aur00381266eg6j3ql4	/stats	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:01:27.219	\N	\N	\N
cmlia4iys00391266dnwlbou8	/logs	GET	31	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:03:57.7	\N	\N	\N
cmlia566w003a1266chupl1za	/logs	GET	28	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:04:27.8	\N	\N	\N
cmlia6gsq003b1266zgl3f1b9	/stats	GET	89	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:05:28.202	\N	\N	\N
cmliaac9b003c12661dn28dc1	/stats	GET	96	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-11 17:08:28.943	\N	\N	\N
cmliabmq3003d1266fm4qjwzm	/stats	GET	27	401	\N	\N	\N	2026-02-11 17:09:29.163	\N	\N	\N
cmliabmq7003e1266nuizt6hw	/logs	GET	26	401	\N	\N	\N	2026-02-11 17:09:29.168	\N	\N	\N
cmliabmy7003f1266qppleyaf	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-11 17:09:29.455	\N	\N	\N
cmliabmyx003g1266sz9o1s3k	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-11 17:09:29.482	\N	\N	\N
cmliabn0l003h1266obrnmyhl	/profile	GET	19	401	\N	\N	\N	2026-02-11 17:09:29.541	\N	\N	\N
cmlidz1ew003i1266duinwqni	/slug/:slug	GET	29	200	\N	\N	\N	2026-02-11 18:51:40.136	\N	\N	\N
cmlidz1gf003j1266w38mj192	/theme	GET	74	200	\N	\N	\N	2026-02-11 18:51:40.191	\N	\N	\N
cmlidz1kh003k1266ip84ngm8	/profile	GET	14	401	\N	\N	\N	2026-02-11 18:51:40.337	\N	\N	\N
cmlidz1pl003l1266y9freqnf	/slug/:slug	GET	21	200	\N	\N	\N	2026-02-11 18:51:40.521	\N	\N	\N
cmlj4y6nn0000lzsxgz8js13b	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-12 07:26:49.907	\N	\N	\N
cmlj52h4i0000mecb2pvw5d4s	/api/v1/csrf-token	GET	8	200	\N	\N	\N	2026-02-12 07:30:10.097	\N	\N	\N
cmlj52h9g0001mecbfcqjkxdu	/profile	GET	61	401	\N	\N	\N	2026-02-12 07:30:10.276	\N	\N	\N
cmlj530pt0002mecbl8dihkil	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-12 07:30:35.489	\N	\N	\N
cmlj530qn0003mecbhc6ipnjr	/theme	GET	68	200	\N	\N	\N	2026-02-12 07:30:35.519	\N	\N	\N
cmlj59adv0003ntdzuxev1eob	/theme	GET	58	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:35:27.956	\N	\N	\N
cmlj5aazr0004ntdzx8s8pg7n	/	GET	18	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:36:15.399	\N	\N	\N
cmlj5acgy0005ntdz4jy43ymm	/theme	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:36:17.315	\N	\N	\N
cmlj5adqf0006ntdzfxhqxyl2	/theme	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:36:18.952	\N	\N	\N
cmlj5asnt0007ntdz7m617t8c	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-12 07:36:38.298	\N	\N	\N
cmlj5astj0008ntdzdk6e631r	/logs	GET	78	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:36:38.503	\N	\N	\N
cmlj5awlz0009ntdzcctdmjnn	/	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:36:43.415	\N	\N	\N
cmlj5b2d7000antdzq4ja0e2e	/theme	GET	165	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:36:50.876	\N	\N	\N
cmlj5bmdp000bntdzn9csze75	/theme	GET	27	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:16.813	\N	\N	\N
cmlj5bmex000cntdzdher392x	/	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:16.857	\N	\N	\N
cmlj5bw3q000dntdznz3qyej7	/	GET	127	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:29.414	\N	\N	\N
cmlj5by5w000entdzee7vhtq4	/audit-logs	GET	20	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:32.085	\N	\N	\N
cmlj5bzgo000fntdz6rhwdydj	/profile	GET	21	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:33.768	\N	\N	\N
cmlj5bzgv000gntdz1nhj5b23	/theme	GET	63	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:33.775	\N	\N	\N
cmlj5bzk2000hntdzxrmhnesx	/stats	GET	50	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:33.89	\N	\N	\N
cmlj5c6u3000intdznp0hdqnm	/	GET	19	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:43.323	\N	\N	\N
cmlj5c88l000jntdz1aiuom7i	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-12 07:37:45.142	\N	\N	\N
cmlj5cduc000kntdzpotm4oxy	/theme	GET	58	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:52.405	\N	\N	\N
cmlj5chgs000lntdzfwldbv9p	/theme	GET	39	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:57.101	\N	\N	\N
cmlj5ciuq000mntdzk7zyvftv	/	GET	40	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:58.898	\N	\N	\N
cmlj5civ6000nntdzkwyza2qh	/stats	GET	50	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:37:58.914	\N	\N	\N
cmlj5ckuq000ontdzelbrnq0x	/api/v1/mfa/settings	GET	23	404	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:38:01.49	\N	\N	\N
cmlj5crpl000pntdzisr2a9qu	/stats	GET	30	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:38:10.378	\N	\N	\N
cmlj5e25e000qntdzca60r7i1	/stats	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:39:10.563	\N	\N	\N
cmlj5nr4s000rntdzz7u826rh	/stats	GET	111	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:46:42.845	\N	\N	\N
cmlj5powd000sntdzd2dgqvfn	/stats	GET	42	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:48:13.262	\N	\N	\N
cmlj5s9wq000tntdzxlkb2f81	/stats	GET	108	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:50:13.803	\N	\N	\N
cmlj5tkfz000untdzn6hawwpx	/stats	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:51:14.111	\N	\N	\N
cmlj5yqep000vntdzc09jl88l	/stats	GET	89	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:55:15.121	\N	\N	\N
cmlj600zx000wntdzpdvceubb	/stats	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 07:56:15.501	\N	\N	\N
cmlj6571n000xntdzgwutb9hu	/stats	GET	112	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:00:16.619	\N	\N	\N
cmlj674v6000yntdzpqu213t8	/stats	GET	87	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:01:47.107	\N	\N	\N
cmlj6bnl4000zntdz0puez51j	/stats	GET	117	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:05:17.992	\N	\N	\N
cmlj6dler0010ntdzik1ilt3u	/stats	GET	92	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:06:48.484	\N	\N	\N
cmlj6evxa0011ntdzkw70l6pu	/stats	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:07:48.766	\N	\N	\N
cmlj6kp740012ntdzdbaxjhmq	/stats	GET	39	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:12:19.984	\N	\N	\N
cmlj6lcfl0013ntdz68sp0n6i	/stats	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:12:50.098	\N	\N	\N
cmlj6mmx30014ntdz9gco47ak	/stats	GET	40	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:13:50.344	\N	\N	\N
cmlj6pv8o0015ntdzb6qowadk	/stats	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:16:21.096	\N	\N	\N
cmlj6rszj0016ntdzopio4mi1	/stats	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:17:51.488	\N	\N	\N
cmlj6sg8o0017ntdz0u2pume6	/stats	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:18:21.624	\N	\N	\N
cmlj7ch2w0018ntdz5m7kguk8	/stats	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 08:33:55.832	\N	\N	\N
cmlj7f20j0019ntdzr0sxqfwd	/stats	GET	25	401	\N	\N	\N	2026-02-12 08:35:56.275	\N	\N	\N
cmlj7f279001antdzs7r46gfs	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 08:35:56.518	\N	\N	\N
cmlj7f27q001bntdzdhwthjt8	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-12 08:35:56.535	\N	\N	\N
cmljkr3wh00006gb59y62jzr9	/api/v1/csrf-token	GET	6	200	\N	\N	\N	2026-02-12 14:49:13.562	\N	\N	\N
cmljkr3xy00016gb5cg9414em	/profile	GET	24	401	\N	\N	\N	2026-02-12 14:49:13.655	\N	\N	\N
cmljkr3y300026gb5hbag3gum	/slug/:slug	GET	145	200	\N	\N	\N	2026-02-12 14:49:13.659	\N	\N	\N
cmljkxvg100066gb5jknalf3l	/theme	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:54:29.234	\N	\N	\N
cmljkyiky00096gb5dxqtd97s	/stats	GET	74	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:54:59.219	\N	\N	\N
cmljkyilg000a6gb54irrokkz	/theme	GET	113	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:54:59.236	\N	\N	\N
cmljkz0z2000b6gb5sr0p0c2x	/theme	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:55:23.054	\N	\N	\N
cmljkzavn000c6gb5ghji3dhk	/theme	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:55:35.891	\N	\N	\N
cmljkzwlg000d6gb5ehu7sh2m	/dashboard	GET	57	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:56:04.036	\N	\N	\N
cmljl085j000e6gb5lh0gebrg	/dashboard	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:56:19.016	\N	\N	\N
cmljl0c0k000f6gb5esjq6iz8	/dashboard	GET	41	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:56:24.021	\N	\N	\N
cmljl0fvj000g6gb5rluemdwc	/dashboard	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:56:29.023	\N	\N	\N
cmljl1u0y000h6gb5ygo7ahtm	/dashboard	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:57:34.018	\N	\N	\N
cmljl1xvv000i6gb5n7fltvu2	/dashboard	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:57:39.019	\N	\N	\N
cmljl2dbg000j6gb5k7d53sm7	/dashboard	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:57:59.02	\N	\N	\N
cmljl2owe000k6gb5cletb884	/dashboard	GET	41	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:58:14.03	\N	\N	\N
cmljl3c1f000l6gb5079hdqib	/dashboard	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:58:44.019	\N	\N	\N
cmljl3z7g000m6gb59wpw1wbh	/dashboard	GET	62	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:59:14.044	\N	\N	\N
cmljl4u1w000n6gb51z2okq3o	/dashboard	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 14:59:54.02	\N	\N	\N
cmljl60hp000o6gb55vuw1r0a	/dashboard	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:00:49.021	\N	\N	\N
cmljl687f000p6gb514tvwbq7	/dashboard	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:00:59.019	\N	\N	\N
cmljl6z7j000q6gb5pau6xoyi	/dashboard	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:01:34.016	\N	\N	\N
cmljl7md0000r6gb507896dg7	/dashboard	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:02:04.02	\N	\N	\N
cmljl7xxr000s6gb5owvzgvby	/dashboard	GET	40	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:02:19.024	\N	\N	\N
cmljl94dv000t6gb5poeznof2	/dashboard	GET	49	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:03:14.035	\N	\N	\N
cmljl9c38000u6gb59q5947l8	/dashboard	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:03:24.021	\N	\N	\N
cmljl9fy4000v6gb5vsyzz2tc	/dashboard	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:03:29.02	\N	\N	\N
cmljlaij4000w6gb5lbt7xf1z	/dashboard	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:19.024	\N	\N	\N
cmljlamdt000x6gb5pctfa1yq	/dashboard	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:24.017	\N	\N	\N
cmljlaq8t000y6gb5iz7e0r76	/dashboard	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:29.021	\N	\N	\N
cmljlau3m000z6gb552ko3py7	/dashboard	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:34.018	\N	\N	\N
cmljlaxyd00106gb5wk0l412h	/dashboard	GET	29	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:39.014	\N	\N	\N
cmljlb5oi00116gb5uo1a8xab	/dashboard	GET	40	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:49.027	\N	\N	\N
cmljlbde200126gb5befuo5ul	/dashboard	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:04:59.019	\N	\N	\N
cmljlbstx00136gb5jbni3i7r	/dashboard	GET	44	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:05:19.029	\N	\N	\N
cmljleh9v00146gb52hfz4va9	/dashboard	GET	33	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:07:24.019	\N	\N	\N
cmljlf0ko00156gb5czqw9qo1	/dashboard	GET	38	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:07:49.032	\N	\N	\N
cmljlf4fd00166gb5nbte29n8	/dashboard	GET	34	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:07:54.025	\N	\N	\N
cmljlg7080000ob68tcpadmmm	/dashboard	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:08:44.024	\N	\N	\N
cmljlgav50001ob686h4b0ekw	/dashboard	GET	35	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:08:49.026	\N	\N	\N
cmljlgxly0002ob68cl9gx35u	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-12 15:09:18.502	\N	\N	\N
cmljlgxnu0003ob689h1mr5oe	/profile	GET	29	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:09:18.57	\N	\N	\N
cmljlh1kn0004ob68icu71t0r	/theme	GET	32	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:09:23.64	\N	\N	\N
cmljlhasa0005ob685uzf9hqg	/	GET	18	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 15:09:35.578	\N	\N	\N
cmljqcpgl0049ob68kasqhxvh	/theme	GET	51	200	\N	\N	\N	2026-02-12 17:25:59.397	\N	\N	\N
cmljqdpep004aob68gtt1gh6a	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 17:26:45.985	\N	\N	\N
cmljqdpmg004eob68ps2qfcku	/login	POST	152	200	\N	\N	\N	2026-02-12 17:26:46.264	\N	\N	\N
cmljqdvw3004hob68n3lhpf7v	/logs	GET	16	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:26:54.388	\N	\N	\N
cmljqfa8m004job685lmhgjk2	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 17:27:59.638	\N	\N	\N
cmljqfnyr004oob68ou3i8zgp	/profile	GET	20	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 17:28:17.427	\N	\N	\N
cmljqgwih0055ob682ymz9jw2	/logs	GET	77	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 17:29:15.162	\N	\N	\N
cmllybnim001wbtn5oqxj5iit	/theme	GET	56	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:44:39.503	\N	\N	\N
cmllylllp001n3e8a9q2p1p4k	/theme	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:23.581	\N	\N	\N
cmllyllls001o3e8acctdjk34	/theme	GET	63	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:23.584	\N	\N	\N
cmllz7whb00019u0cevrm4gr5	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-14 07:09:44.111	\N	\N	\N
cmllz7wir00029u0c55ra92ll	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-14 07:09:44.164	\N	\N	\N
cmllz7wjq00039u0cp3y7yrmi	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-14 07:09:44.199	\N	\N	\N
cmllzla5f000412tnyidxgowq	/profile	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:20:08.355	\N	\N	\N
cmllzzatk000n12tnnvg2mtsv	/logs	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:31:02.408	\N	\N	\N
cmlm00k34000o12tnifdwdn0i	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 07:32:01.073	\N	\N	\N
cmlm00k3i000p12tn8qvk9qg0	/slug/:slug	GET	20	200	\N	\N	\N	2026-02-14 07:32:01.086	\N	\N	\N
cmlm01657000q12tnkv2o7wl0	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 07:32:29.659	\N	\N	\N
cmlm0165y000r12tnujmnyxq4	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-14 07:32:29.687	\N	\N	\N
cmlm0166v000s12tnzm7kx9sh	/theme	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:32:29.719	\N	\N	\N
cmlm0osjl0001yb8b8npfgqnq	/directory	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:50:51.777	\N	\N	\N
cmlm1aj6b000fyb8bwx1n1epb	/stats	GET	88	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:07:46.067	\N	\N	\N
cmlm1b66o000gyb8brv5b3sge	/logs	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:08:15.889	\N	\N	\N
cmlm1twfz000syb8b6rh24rdo	/stats	GET	91	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:22:49.728	\N	\N	\N
cmlm1wy8z000wyb8b28m6ns16	/files/upload	POST	6	404	\N	\N	\N	2026-02-14 08:25:12.036	\N	\N	\N
cmlm1x1n5000xyb8bru0l81j3	/profile/photo	POST	6	404	\N	\N	\N	2026-02-14 08:25:16.433	\N	\N	\N
cmlm1x2s0000yyb8bceftdqn1	/media	POST	6	404	\N	\N	\N	2026-02-14 08:25:17.904	\N	\N	\N
cmlm1x35k000zyb8b8hnj5hk5	/media/upload	POST	5	404	\N	\N	\N	2026-02-14 08:25:18.393	\N	\N	\N
cmlm1x3j60010yb8b2fd21upx	/images	POST	7	404	\N	\N	\N	2026-02-14 08:25:18.883	\N	\N	\N
cmlm27gxr001lyb8b0vz8fofa	/theme	GET	60	200	\N	\N	\N	2026-02-14 08:33:22.815	\N	\N	\N
cmlmpzmsl002jyb8bdbc8wh1c	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:39:07.941	\N	\N	\N
cmlmpzodv002qyb8bqbtc5tv1	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 19:39:10.003	\N	\N	\N
cmlmpzrx0002syb8buelykzsq	/profile	GET	10	401	\N	\N	\N	2026-02-14 19:39:14.58	\N	\N	\N
cmlmqapv9003uyb8bwwlzshaf	/category/:categoryId	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:47:45.141	\N	\N	\N
cmlmqarfr003vyb8bybh2pyue	/category/:categoryId	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:47:47.175	\N	\N	\N
cmljqdprm004fob689wifon9a	/theme	GET	90	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:26:46.45	\N	\N	\N
cmljqduv1004gob68xlzs15l3	/theme	GET	27	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:26:53.053	\N	\N	\N
cmljqfnxw004nob68079tx1kz	/slug/:slug	GET	27	200	\N	\N	\N	2026-02-12 17:28:17.396	\N	\N	\N
cmljqfo2w004pob68tijko86l	/logs	GET	18	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 17:28:17.577	\N	\N	\N
cmljqfreg004rob68h7qtfh4s	/theme	GET	52	200	\N	\N	\N	2026-02-12 17:28:21.88	\N	\N	\N
cmljqg44q004vob68cbzdjfku	/stats	GET	28	403	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-12 17:28:38.379	\N	\N	\N
cmljqg458004wob68q5w4p8ae	/logs	GET	23	403	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-12 17:28:38.397	\N	\N	\N
cmljqg45e004xob68ica3i24r	/slug/:slug	GET	43	200	\N	\N	\N	2026-02-12 17:28:38.402	\N	\N	\N
cmljqg46a004yob681d9eecnp	/theme	GET	88	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-12 17:28:38.435	\N	\N	\N
cmljqjqkz0057ob686u79nbea	/logout	POST	20	200	\N	\N	\N	2026-02-12 17:31:27.444	\N	\N	\N
cmljqk286005bob68eldc4u7r	/logs	GET	48	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-12 17:31:42.534	\N	\N	\N
cmljqks96005hob68rc2u1oh0	/theme	GET	67	200	\N	\N	\N	2026-02-12 17:32:16.266	\N	\N	\N
cmljql4vk005lob689tiziytl	/stats	GET	17	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:32:32.625	\N	\N	\N
cmljql4vw005mob682cugkhh9	/logs	GET	21	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:32:32.636	\N	\N	\N
cmljqlsxo005nob680excut2m	/logs	GET	18	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:33:03.804	\N	\N	\N
cmljqmg1v005oob68s3iwk8im	/stats	GET	17	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:33:33.764	\N	\N	\N
cmljqnt11005pob68s0whb51y	/logs	GET	18	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:34:37.237	\N	\N	\N
cmljqog5u005qob68sh6yextf	/stats	GET	18	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:35:07.218	\N	\N	\N
cmljqpt4a0000icfry5axoo3n	/logs	GET	25	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:36:10.666	\N	\N	\N
cmljqqm2s0001icfrsqmj37sl	/profile	GET	15	401	\N	\N	\N	2026-02-12 17:36:48.197	\N	\N	\N
cmljqqv4w0004icfrabaqq1xo	/theme	GET	36	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:36:59.936	\N	\N	\N
cmljqr6qz0005icfrkvm4uyrg	/	GET	21	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:37:14.988	\N	\N	\N
cmljqr8t00006icfrha15g76p	/events	GET	14	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:37:17.652	\N	\N	\N
cmljqr9me0007icfr7oktv2sf	/events	GET	15	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-12 17:37:18.711	\N	\N	\N
cmljqs1nn0009icfrqa058gvc	/slug/:slug	GET	38	200	\N	\N	\N	2026-02-12 17:37:55.044	\N	\N	\N
cmljqs1pp000aicfr0av0iwxq	/theme	GET	102	200	\N	\N	\N	2026-02-12 17:37:55.118	\N	\N	\N
cmljqsgnx000eicfr7jdn4aa3	/theme	GET	59	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:38:14.493	\N	\N	\N
cmljqsohf000ficfr37b4k4ju	/	GET	23	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:38:24.627	\N	\N	\N
cmljqt0iv000gicfray520f6n	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-12 17:38:40.232	\N	\N	\N
cmljqt1g5000hicfr0l7nudmu	/stats	GET	21	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:38:41.429	\N	\N	\N
cmljqtor7000iicfrxyumnd62	/logs	GET	33	401	\N	\N	\N	2026-02-12 17:39:11.635	\N	\N	\N
cmljquos3000micfr5zhza506	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-12 17:39:58.324	\N	\N	\N
cmljquqpg000nicfr3y0ypln5	/logs	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:40:00.821	\N	\N	\N
cmljqustm000oicfras5ug7o0	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:40:03.563	\N	\N	\N
cmljqusw5000picfrk12udbp2	/	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:40:03.653	\N	\N	\N
cmljqvci9000qicfrrp4hkqgh	/	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:40:29.074	\N	\N	\N
cmljqwg2c000ricfrl8i06woc	/	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:41:20.34	\N	\N	\N
cmljqydr1000sicfr5z9ql2fl	/	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:42:50.653	\N	\N	\N
cmljr1tun000ticfrd7daetkb	/	GET	23	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:45:31.487	\N	\N	\N
cmljr4u1w000uicfrlvk4yvwz	/	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:47:51.716	\N	\N	\N
cmljr7eyb0000n3b2xkpy9mah	/	GET	58	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:49:52.115	\N	\N	\N
cmljr825x0001n3b2w4k4nhv9	/	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:50:22.197	\N	\N	\N
cmljr9mfn0002n3b21cmu4yxr	/	GET	18	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:51:35.123	\N	\N	\N
cmljr9ztw0003n3b2mwp9pkb7	/	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:51:52.484	\N	\N	\N
cmljrawyv0004n3b2rprfxmxi	/	GET	20	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:52:35.431	\N	\N	\N
cmljrbk780005n3b2hwvsjsze	/	GET	19	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:53:05.54	\N	\N	\N
cmljrdhxr0006n3b24uefiypo	/	GET	17	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:54:35.92	\N	\N	\N
cmljreic00007n3b2i4amk4t1	/	GET	16	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:55:23.089	\N	\N	\N
cmljrf5jn0008n3b22rpnlqxn	/	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:55:53.171	\N	\N	\N
cmljrg5n20009n3b2diy1zzv7	/	GET	19	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:56:39.95	\N	\N	\N
cmljrhkxf000an3b2hyjm1czn	/theme	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:57:46.42	\N	\N	\N
cmljrhkxv000bn3b2edgazhx3	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-12 17:57:46.435	\N	\N	\N
cmljri4xn000cn3b2hfiz89k3	/theme	GET	50	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:58:12.347	\N	\N	\N
cmljri6yf000dn3b2kxf9fby4	/	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:58:14.968	\N	\N	\N
cmljriv53000en3b2h2mtpm7z	/judges	GET	44	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:58:46.312	\N	\N	\N
cmljrj4c4000fn3b22ln87fz9	/stats	GET	45	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:58:58.229	\N	\N	\N
cmljrj4cc000gn3b2wq2uxbib	/theme	GET	62	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:58:58.236	\N	\N	\N
cmljrj9ct000hn3b2184ujyyy	/judges	GET	69	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:59:04.733	\N	\N	\N
cmljrj9do000in3b26htmdodk	/contestants	GET	96	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:59:04.765	\N	\N	\N
cmljrj9du000jn3b23ondgt58	/contestants/assignments	GET	84	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 17:59:04.77	\N	\N	\N
cmljrjfe1000kn3b2g9awk11x	/	GET	16	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 17:59:12.554	\N	\N	\N
cmljrld3t000ln3b250i356gg	/	GET	17	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:00:42.905	\N	\N	\N
cmljrm0dl000mn3b2sul4mt56	/	GET	17	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:01:13.066	\N	\N	\N
cmljrmnm4000nn3b21an8idiq	/	GET	19	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:01:43.18	\N	\N	\N
cmljrom8t000on3b2lc555fne	/	GET	63	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:03:14.718	\N	\N	\N
cmljrpa82000pn3b2gt3wiuok	/	GET	21	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:03:45.795	\N	\N	\N
cmljrpxft000qn3b2kyyv0blk	/	GET	19	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:04:15.882	\N	\N	\N
cmljrr7xt000rn3b2lep0nzj3	/	GET	19	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:05:16.146	\N	\N	\N
cmljrsieg000sn3b23mla8g8o	/	GET	23	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:06:16.36	\N	\N	\N
cmljrtsv4000tn3b2pfrmzcha	/	GET	18	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:07:16.577	\N	\N	\N
cmljrwiwq000un3b2j1ao23eg	/profile	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:09:23.643	\N	\N	\N
cmljrwj0e000vn3b2wqfcsfpc	/contestants/assignments	GET	57	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:09:23.774	\N	\N	\N
cmljrwm7x000wn3b21kq0u4jw	/contestants	GET	131	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:09:27.933	\N	\N	\N
cmljrz0c8000xn3b2qtami2jg	/	GET	34	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:11:19.544	\N	\N	\N
cmljs0baw000yn3b2vsouo1yq	/	GET	27	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:12:20.408	\N	\N	\N
cmljs1lov000zn3b2fterpm1t	/theme	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:13:20.527	\N	\N	\N
cmljs1lsf0010n3b2b90g76vk	/judges	GET	88	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:13:20.656	\N	\N	\N
cmljs1lvz0011n3b2m8uegd4a	/contestants/assignments	GET	104	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:13:20.782	\N	\N	\N
cmljs2co50012n3b2dqrv7u1s	/role/:role	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 18:13:55.494	\N	\N	\N
cmljs4vnq0013n3b2ocyushuo	/	GET	28	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:15:53.414	\N	\N	\N
cmljs5iww0014n3b2ghkspyn1	/	GET	27	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:16:23.553	\N	\N	\N
cmljsf7la0015n3b2ys484amj	/	GET	18	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:23:55.436	\N	\N	\N
cmljsgi5j0016n3b228mf4mf4	/	GET	59	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:24:55.784	\N	\N	\N
cmljshtdt0017n3b211b9fa88	/	GET	21	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:25:56.993	\N	\N	\N
cmljslpo30018n3b2ms80yfyg	/	GET	25	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:28:58.803	\N	\N	\N
cmljsmcw20019n3b2wynsf79k	/	GET	15	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:29:28.899	\N	\N	\N
cmljsritc001an3b24v8fiuhf	/	GET	20	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:33:29.856	\N	\N	\N
cmljsu4m5001bn3b2tqzcl3br	/	GET	24	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:35:31.422	\N	\N	\N
cmljsw2bm001cn3b29fcqlnr0	/	GET	16	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:37:01.763	\N	\N	\N
cmljsxcu3001dn3b2ea9wg07i	/	GET	18	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-12 18:38:02.043	\N	\N	\N
cmljsy0cu001en3b21p1adwku	/theme	GET	43	200	\N	\N	\N	2026-02-12 18:38:32.527	\N	\N	\N
cmljz6xyx001kn3b2k2uf2734	/login	POST	148	200	\N	\N	\N	2026-02-12 21:33:27.033	\N	\N	\N
cmljz73o7001ln3b2uxypelb7	/theme	GET	59	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:33:34.423	\N	\N	\N
cmljz762d001mn3b2v2dx211a	/values/:entityId	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:33:37.525	\N	\N	\N
cmljz7uau001nn3b2ejbzkyxh	/theme	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:34:08.934	\N	\N	\N
cmljzcoys001on3b2uwyt0owk	/profile	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:37:55.3	\N	\N	\N
cmljzcp5y001pn3b2ufgbhpc1	/contestants/assignments	GET	104	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:37:55.558	\N	\N	\N
cmljzcxj9001qn3b24z5k08cu	/contest/:contestId	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:38:06.405	\N	\N	\N
cmljzen1o001rn3b213c0bi1r	/role/:role	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:39:26.124	\N	\N	\N
cmljzfzes001sn3b25hj9vcdf	/role/:role	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:40:28.804	\N	\N	\N
cmljzg53x001tn3b2iuxrynqp	/category/:categoryId/contestant/:contestantId	DELETE	128	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:40:36.189	\N	\N	\N
cmljzg557001un3b22d68284e	/category/:categoryId/contestant/:contestantId	DELETE	97	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:40:36.235	\N	\N	\N
cmlk00nc3001vn3b2fy8bu63r	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 21:56:32.932	\N	\N	\N
cmlk00nhd001wn3b27g7g3gwt	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:33.122	\N	\N	\N
cmlk00rt60026n3b2to8umyc0	/remove/:assignmentId	PUT	104	500	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:38.73	\N	\N	\N
cmlk00vr9002an3b2klz11vxi	/category/:categoryId/contestant/:contestantId	DELETE	105	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:43.845	\N	\N	\N
cmlk00vsb002bn3b23mfdie96	/category/:categoryId/contestant/:contestantId	DELETE	107	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:43.883	\N	\N	\N
cmlk00y8o002cn3b29qlspox7	/slug/:slug	GET	27	200	\N	\N	\N	2026-02-12 21:56:47.064	\N	\N	\N
cmlk00ya8002dn3b2yp7ctog4	/profile	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:47.12	\N	\N	\N
cmlk00yhq002en3b28alrl8fp	/judges	GET	64	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:47.391	\N	\N	\N
cmlk00yj3002fn3b2hdxx2jb5	/contestants/assignments	GET	118	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:47.44	\N	\N	\N
cmlk00yjx002gn3b2w0ibfixn	/contestants	GET	101	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:47.469	\N	\N	\N
cmlk00zf6002hn3b2qyzihzgf	/role/:role	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:48.595	\N	\N	\N
cmlk015ax002in3b2c5s83ql0	/tally-masters	POST	23	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:56:56.217	\N	\N	\N
cmlk03tve002jn3b2h7kc75ql	/role/:role	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:01.37	\N	\N	\N
cmlk03yyc002kn3b2xiujd0yc	/auditors	POST	35	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:07.956	\N	\N	\N
cmlk04694002ln3b2l9qc851s	/category/:categoryId/contestant/:contestantId	DELETE	35	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:17.416	\N	\N	\N
cmlk04696002mn3b2u55i4sdm	/category/:categoryId/contestant/:contestantId	DELETE	34	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:17.418	\N	\N	\N
cmlk046cj002nn3b2rlk3ed31	/category/:categoryId/contestant/:contestantId	DELETE	93	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:17.54	\N	\N	\N
cmlk046d5002on3b2e80el2z3	/category/:categoryId/contestant/:contestantId	DELETE	100	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:17.561	\N	\N	\N
cmlk046ep002pn3b26t1a33n6	/category/:categoryId/contestant/:contestantId	DELETE	85	403	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:17.617	\N	\N	\N
cmlk04ccf0030n3b2i6vgw84a	/remove/:assignmentId	PUT	99	500	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 21:59:25.312	\N	\N	\N
cmlk0oiin0000ne1trz1egkga	/theme	GET	145	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:15:06.432	\N	\N	\N
cmlk0oisu0001ne1taq4iqzr0	/contestants/assignments	GET	106	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:15:06.798	\N	\N	\N
cmlk0ovm20002ne1ttlrhpp64	/remove/:assignmentId	PUT	209	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:15:23.402	\N	\N	\N
cmlk0ovox0003ne1tkuy1shw8	/remove/:assignmentId	PUT	185	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:15:23.505	\N	\N	\N
cmlk0pnll000sne1ti366xy4o	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 22:15:59.674	\N	\N	\N
cmlk0prq7000tne1tmx0mqal7	/theme	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:16:05.023	\N	\N	\N
cmlk0ptto000une1temqbay0j	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-12 22:16:07.741	\N	\N	\N
cmlk0ptuk000vne1t3q4b4ir5	/theme	GET	61	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:16:07.772	\N	\N	\N
cmlk0pu1a000wne1t0nbp13vw	/judges	GET	69	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:16:08.015	\N	\N	\N
cmlk0qgwa000xne1tdhlqtbuy	/slug/:slug	GET	35	200	\N	\N	\N	2026-02-12 22:16:37.643	\N	\N	\N
cmlk0qh3e000yne1tnsjc9p86	/slug/:slug	GET	41	200	\N	\N	\N	2026-02-12 22:16:37.899	\N	\N	\N
cmlk0qqar000zne1tkc17116t	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-12 22:16:49.827	\N	\N	\N
cmlk0qwnv0013ne1tmwbiwlej	/	GET	106	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:16:58.076	\N	\N	\N
cmlk0qwo60014ne1t6labln5r	/	GET	74	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:16:58.086	\N	\N	\N
cmlk0qwoi0015ne1t3debeeny	/judges	GET	69	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:16:58.099	\N	\N	\N
cmlk0r59u001ene1tjcvv79xy	/remove/:assignmentId	PUT	136	404	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:17:09.234	\N	\N	\N
cmlk0rdkj001jne1tai0fqb0j	/category/:categoryId/contestant/:contestantId	DELETE	96	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:17:19.988	\N	\N	\N
cmlk0rdn6001une1twwwt39hb	/category/:categoryId/contestant/:contestantId	DELETE	123	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:17:20.083	\N	\N	\N
cmlk0rg7i0029ne1trrbgz1wf	/role/:role	GET	20	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:17:23.407	\N	\N	\N
cmlk0rr9t002ane1tmyn26iav	/auditors	GET	36	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:17:37.745	\N	\N	\N
cmlk16hxk0000mg6ppfpel7ms	/theme	GET	42	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:29:05.48	\N	\N	\N
cmlk16m1t0005mg6pjv3l7a6r	/remove/:assignmentId	PUT	217	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:29:10.818	\N	\N	\N
cmlk16n8e000qmg6pi8tn9i1u	/role/:role	GET	25	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:29:12.351	\N	\N	\N
cmlk17pq1000rmg6phph5i4v2	/judges	GET	81	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:30:02.234	\N	\N	\N
cmlk17sef000smg6prb4xtzme	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-12 22:30:05.703	\N	\N	\N
cmlk1f8z300005qlqcna344dw	/slug/:slug	GET	38	200	\N	\N	\N	2026-02-12 22:35:53.775	\N	\N	\N
cmlk1g06d000d5qlqc1wzfg6x	/role/:role	GET	31	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:36:29.03	\N	\N	\N
cmlk1gb95000e5qlq6gwh41xc	/	GET	37	200	cmlhmo05t000113i25pe4ao5e	\N	\N	2026-02-12 22:36:43.386	\N	\N	\N
cmlk1ku4d000g5qlqxe4e95bi	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-12 22:40:14.461	\N	\N	\N
cmlk1ku4u000h5qlq27z46g01	/theme	GET	55	200	\N	\N	\N	2026-02-12 22:40:14.478	\N	\N	\N
cmlk1l8vt000l5qlqkmu5hg2d	/slug/:slug	GET	56	200	\N	\N	\N	2026-02-12 22:40:33.593	\N	\N	\N
cmlk1l8yy000m5qlqo9zyuf2s	/logs	GET	75	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:40:33.706	\N	\N	\N
cmlk1lo34000v5qlq96zh1c1s	/contestants	POST	160	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:40:53.296	\N	\N	\N
cmlk1lo35000w5qlqcamjtqsb	/contestants	POST	166	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:40:53.297	\N	\N	\N
cmlk1lo3c000z5qlqerolt7mx	/contestants	POST	141	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:40:53.305	\N	\N	\N
cmlk1lo3h00105qlqifjhopbk	/contestants	POST	124	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:40:53.309	\N	\N	\N
cmlk1lzs700135qlq0lku6cqr	/event/:eventId	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:41:08.455	\N	\N	\N
cmlk1m91o001g5qlqm5bmmop3	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 22:41:20.46	\N	\N	\N
cmlk1m93d001h5qlqarwkq214	/theme	GET	70	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:41:20.521	\N	\N	\N
cmlk1m98j001i5qlqz75d03ot	/theme	GET	149	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:41:20.707	\N	\N	\N
cmlk1maom001j5qlq4i76zhnz	/role/:role	GET	66	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:41:22.582	\N	\N	\N
cmlk1mb5y001k5qlqvupci3a9	/role/:role	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:41:23.207	\N	\N	\N
cmlk1ntr3001t5qlq2f3xslmy	/role/:role	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:42:33.952	\N	\N	\N
cmlk1o21r00225qlqjswo2non	/role/:role	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:42:44.703	\N	\N	\N
cmlk1o8qo002b5qlqi8aadix4	/auditors	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:42:53.376	\N	\N	\N
cmlk1ow3h002k5qlqz3s4l109	/logs	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:43:23.645	\N	\N	\N
cmlk1oyxt002l5qlqp22hpogf	/	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:43:27.329	\N	\N	\N
cmlk1p1dh002m5qlql2or5eki	/	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:43:30.486	\N	\N	\N
cmlk1p5yk002n5qlqk1ym0g36	/theme	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:43:36.429	\N	\N	\N
cmlk1p6ut002o5qlqbaeiyn4u	/	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:43:37.589	\N	\N	\N
cmlk1p7pi002p5qlq8zbzap90	/theme	GET	65	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:43:38.695	\N	\N	\N
cmlk1prhu002q5qlq2k2flasb	/	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:44:04.339	\N	\N	\N
cmlk1ptl8002r5qlqti0w18c3	/:id/olympic-scoring-validation	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:44:07.053	\N	\N	\N
cmlk1qcwz002s5qlq4go2wrg8	/theme	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:44:32.1	\N	\N	\N
cmlk1qg0m002t5qlqmg3qmngq	/	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:44:36.119	\N	\N	\N
cmlk1qrim002u5qlqgq5l8rz0	/values/:entityId	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:44:51.022	\N	\N	\N
cmlk1rm40002v5qlqrgz4mol0	/password-policy	GET	51	200	\N	\N	\N	2026-02-12 22:45:30.672	\N	\N	\N
cmlk1rm4u002w5qlqn0x74g0w	/database-connection-info	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:45:30.702	\N	\N	\N
cmlk1s928002x5qlqnsud6ktj	/theme	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:46:00.417	\N	\N	\N
cmlk1ssqe00335qlqzc9kjsat	/templates	POST	18	500	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:46:25.91	\N	\N	\N
cmlk1szh000375qlqrqk2gv6r	/templates	POST	23	500	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:46:34.644	\N	\N	\N
cmlk1tu8i00395qlq7rx7b16o	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 22:47:14.515	\N	\N	\N
cmlk1twfu003a5qlqfmh0bu2s	/theme	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:47:17.37	\N	\N	\N
cmlk1u07v003b5qlq034mlioi	/theme	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:47:22.268	\N	\N	\N
cmlk1v9jj003d5qlqis5mn105	/	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:48:21.008	\N	\N	\N
cmlk1vgjw003e5qlqd717bhml	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	38	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:48:30.092	\N	\N	\N
cmlk1vs77003f5qlqeyadq60t	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	26	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:48:45.188	\N	\N	\N
cmlk1vw34003g5qlq792g70xt	/slug/:slug	GET	32	200	\N	\N	\N	2026-02-12 22:48:50.225	\N	\N	\N
cmlk1vw3y003h5qlq1thv776p	/profile	GET	17	401	\N	\N	\N	2026-02-12 22:48:50.254	\N	\N	\N
cmlk1vw58003i5qlqya5s0wyh	/theme	GET	51	200	\N	\N	\N	2026-02-12 22:48:50.3	\N	\N	\N
cmlk1w1m5003j5qlqthud4k8f	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	25	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:48:57.39	\N	\N	\N
cmlk1w8lc003k5qlqewthaty7	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	29	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:49:06.432	\N	\N	\N
cmlk1wtiu003o5qlqn6olf18n	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	24	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:49:33.558	\N	\N	\N
cmlk1x2ys003p5qlqo9fkrznp	/theme	GET	40	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:49:45.796	\N	\N	\N
cmlk1xd1v003q5qlqetq7r2to	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 22:49:58.868	\N	\N	\N
cmlk1xd3o003r5qlqascy927o	/profile	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:49:58.933	\N	\N	\N
cmlk1xmwc003u5qlql5m73e5o	/events	GET	17	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:50:11.629	\N	\N	\N
cmlk1xnpf003v5qlqs82d76r5	/events	GET	16	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:50:12.676	\N	\N	\N
cmlk1xtmx003w5qlq7nbxixf7	/categories	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:50:20.362	\N	\N	\N
cmlk1zh7c00002la34z6jmlt6	/theme	GET	63	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:51:37.56	\N	\N	\N
cmlk1zvay00012la36v4g37gn	/theme	GET	76	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:51:55.834	\N	\N	\N
cmlk2076e00022la3vg544frf	/slug/:slug	GET	26	200	\N	\N	\N	2026-02-12 22:52:11.222	\N	\N	\N
cmlk207ge00032la32qjou8p4	/	GET	157	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:52:11.582	\N	\N	\N
cmlk207gl00042la3ah65vy55	/contestants	GET	121	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:52:11.589	\N	\N	\N
cmlk20bp400052la33499upct	/auditors	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:52:17.08	\N	\N	\N
cmlk2200600062la3mb25agae	/contest/:contestId	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:53:35.238	\N	\N	\N
cmlk2303500072la3axclqr3f	/scripts	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 22:54:22.002	\N	\N	\N
cmlk284ec000a2la3avez3ly6	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 22:58:20.868	\N	\N	\N
cmlk2oa2q0000dr286yqj3lq3	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:10:54.722	\N	\N	\N
cmlk2rial0001dr28xfu386pf	/categories	GET	73	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:13:25.342	\N	\N	\N
cmlk2sst30002dr28w2gxtn7r	/categories	GET	31	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:14:25.624	\N	\N	\N
cmlk2ylvz0003dr28lj1nhmmp	/categories	GET	33	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:18:56.592	\N	\N	\N
cmlk2zwcz0004dr28r9hfvuh6	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:19:56.819	\N	\N	\N
cmlk31etd0005dr28crvxw0ll	/theme	GET	36	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:21:07.393	\N	\N	\N
cmlk31kit0006dr284p56znby	/theme	GET	67	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:21:14.789	\N	\N	\N
cmlk329fb0007dr28kj5jk6s0	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-12 23:21:47.063	\N	\N	\N
cmlk329j20008dr28m2tu506e	/categories	GET	19	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:21:47.198	\N	\N	\N
cmlk32m0v0009dr28vklyz44y	/	GET	54	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:22:03.391	\N	\N	\N
cmlk32p0w000adr28wst8lj6i	/contest/:contestId	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:22:07.28	\N	\N	\N
cmlk33jyf000ldr28jx1bsv5i	/categories	GET	22	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:22:47.368	\N	\N	\N
cmlk35fqc000rdr28l0n7va22	/	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:24:15.205	\N	\N	\N
cmlk35hmf000sdr28jfqy40sh	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:24:17.655	\N	\N	\N
cmlk362yr000tdr28ue85kzuv	/	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:24:45.316	\N	\N	\N
cmlk36l5r000udr28namqiuxu	/api/v1/scoring/category/cmljlirsl001tob68g5doaqiz/criteria	GET	37	404	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:25:08.896	\N	\N	\N
cmlk36lir000vdr28rns83qnj	/api/v1/scoring/category/cmljlirvn0034ob68j0fq4d2t/criteria	GET	29	404	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:25:09.364	\N	\N	\N
cmlk373pn000wdr28bda8ec3s	/theme	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:25:32.939	\N	\N	\N
cmlk3850i0010dr28cl5eogmx	/files	GET	22	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:26:21.283	\N	\N	\N
cmlk38uht0011dr288wugvdkd	/logs	GET	58	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:26:54.305	\N	\N	\N
cmlk39hpi0012dr28w3awmo1p	/logs	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:27:24.39	\N	\N	\N
cmlk3anja0013dr28ip14pr18	/categories	GET	44	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:28:18.598	\N	\N	\N
cmlk3barl0014dr285sfvwt3y	/categories	GET	32	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:28:48.705	\N	\N	\N
cmlk3bff20015dr28pdb415ty	/logs	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:28:54.734	\N	\N	\N
cmlk3c2p50016dr28xffmlykd	/logs	GET	66	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:29:24.906	\N	\N	\N
cmlk3f66z0017dr28z5om7cch	/categories	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:31:49.403	\N	\N	\N
cmlk3faxl0018dr28xe1k7av1	/logs	GET	91	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:31:55.545	\N	\N	\N
cmlk3gld40019dr288j8xu7sw	/logs	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:32:55.72	\N	\N	\N
cmlk3gldc001adr288tv52fx2	/stats	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:32:55.729	\N	\N	\N
cmlk3h8kn001bdr28dema02sr	/logs	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:33:25.8	\N	\N	\N
cmlk3ij2l001cdr28q8sy0j71	/stats	GET	45	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:34:26.061	\N	\N	\N
cmlk3j1j1001ddr28b7u7hvso	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:34:49.981	\N	\N	\N
cmlk3j6b2001edr288co45y5c	/logs	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:34:56.174	\N	\N	\N
cmlk3kgyc001fdr28vqb1i9ti	/stats	GET	95	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:35:56.628	\N	\N	\N
cmlk3l46p001gdr28ccb5kv3x	/stats	GET	70	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:36:26.737	\N	\N	\N
cmlk3lmi6001hdr28ruy59dok	/categories	GET	33	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:36:50.479	\N	\N	\N
cmlk3m9q9001idr28klj6q7ql	/categories	GET	31	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:37:20.578	\N	\N	\N
cmlk3meqk001jdr28mx2fdop6	/logs	GET	66	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:37:27.069	\N	\N	\N
cmlk3nk7p001kdr28546d1uyx	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:38:20.821	\N	\N	\N
cmlk3np8l001ldr2859d74ipw	/logs	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:38:27.333	\N	\N	\N
cmlk3och7001mdr28xqr9t1j7	/logs	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:38:57.452	\N	\N	\N
cmlk3q540001ndr28tpyeqsxh	/categories	GET	29	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:40:21.216	\N	\N	\N
cmlk3qa7p001odr28m3lh3x5m	/stats	GET	47	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-12 23:40:27.83	\N	\N	\N
cmlk3qxfp001pdr28kqeiwot1	/stats	GET	26	401	\N	\N	\N	2026-02-12 23:40:57.926	\N	\N	\N
cmlk3qxqe001qdr28l6ui6bqe	/theme	GET	38	200	\N	\N	\N	2026-02-12 23:40:58.31	\N	\N	\N
cmlk3s2th001rdr28ncbh99vz	/categories	GET	30	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:41:51.557	\N	\N	\N
cmlk3u0il001sdr287rydunlg	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:43:21.886	\N	\N	\N
cmlk3vy6k001tdr28rhu5fun1	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:44:52.173	\N	\N	\N
cmlk3x8my001udr28oaj8yn70	/categories	GET	21	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-12 23:45:52.378	\N	\N	\N
cmlk5sdaj001vdr28mevmfdjy	/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php	GET	6	404	\N	\N	\N	2026-02-13 00:38:04.364	\N	\N	\N
cmlkdnwll00007gqpu67os49v	/api/v1/csrf-token	GET	5	200	\N	\N	\N	2026-02-13 04:18:33.033	\N	\N	\N
cmlkdtczr00047gqpksyzjh5w	/theme	GET	35	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:22:47.56	\N	\N	\N
cmlkdujvu00057gqp1cl7oh9g	/theme	GET	50	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:23:43.146	\N	\N	\N
cmlkdwgmk00067gqpf9oretid	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-13 04:25:12.237	\N	\N	\N
cmlkdwgmt00077gqp4ou4703o	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-13 04:25:12.246	\N	\N	\N
cmlkdwgtf00087gqpry7ugey7	/theme	GET	34	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:25:12.483	\N	\N	\N
cmlkdwjgn00097gqpiqh3b05h	/:categoryId/criteria	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:25:15.911	\N	\N	\N
cmlkdwnp5000a7gqpdhbsecoe	/:categoryId/criteria	GET	18	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:25:21.401	\N	\N	\N
cmlkdwpb9000b7gqp15ul6qud	/deductions	GET	21	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:25:23.494	\N	\N	\N
cmlkdws9e000c7gqp9tkhkmqy	/events	GET	15	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:25:27.315	\N	\N	\N
cmlkdwvqa000d7gqpp0tlsy7t	/theme	GET	34	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:25:31.81	\N	\N	\N
cmlkdxo5d000i7gqpi1rfpues	/theme	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:08.641	\N	\N	\N
cmlkdxtkr000j7gqpqgqwzuyr	/theme	GET	58	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:15.675	\N	\N	\N
cmlkdxtpz000k7gqpresl08to	/	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:15.864	\N	\N	\N
cmlkdxwbr000l7gqpjzxt7sg5	/	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:19.239	\N	\N	\N
cmlkdxwbw000m7gqpnsndz9lk	/	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:19.244	\N	\N	\N
cmlkdyfo5000n7gqpw2ln99sg	/profile	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:44.31	\N	\N	\N
cmlkdyfr2000o7gqprdddpn15	/theme	GET	56	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:26:44.414	\N	\N	\N
cmlkdyw59000p7gqpezfkdfi1	/event/:eventId	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:27:05.661	\N	\N	\N
cmlkdza3s000s7gqpk8ml3scb	/slug/:slug	GET	19	200	\N	\N	\N	2026-02-13 04:27:23.752	\N	\N	\N
cmlkdza6v000t7gqp0xpitsjy	/profile	GET	20	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:27:23.863	\N	\N	\N
cmlkdzcjd000u7gqpd9fa859j	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 04:27:26.905	\N	\N	\N
cmlkdzov8000x7gqppmxqn4ro	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-13 04:27:42.884	\N	\N	\N
cmlkdzovs000y7gqpccckzw0x	/theme	GET	40	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:27:42.904	\N	\N	\N
cmlkdzoyx000z7gqpg7h9rbq6	/profile	GET	18	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:27:43.018	\N	\N	\N
cmlke1nqa00107gqp4x1zqix6	/categories	GET	22	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:29:14.722	\N	\N	\N
cmlke67wg00117gqpxy3xvunm	/categories	GET	22	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:32:47.488	\N	\N	\N
cmlke6v6100127gqpzf3vo1x2	/categories	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:33:17.642	\N	\N	\N
cmlke7km900137gqp4rucmv82	/theme	GET	35	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:33:50.626	\N	\N	\N
cmlke7kn700147gqpj4uhgk1k	/slug/:slug	GET	17	200	\N	\N	\N	2026-02-13 04:33:50.659	\N	\N	\N
cmlke7ky300157gqpy31jdg8b	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:33:51.052	\N	\N	\N
cmlke887k00167gqpvnlz6okj	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:34:21.2	\N	\N	\N
cmlkeau1p0000odtxwaxgec4j	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:36:22.814	\N	\N	\N
cmlkebz2p0001odtx4c8ps33p	/profile	GET	36	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:37:15.985	\N	\N	\N
cmlkec4p60002odtxc5iw9evo	/profile	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:23.274	\N	\N	\N
cmlkec4w20003odtxfag1g73m	/	GET	100	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:23.522	\N	\N	\N
cmlkec4wa0004odtxru5xjo6o	/	GET	97	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:23.53	\N	\N	\N
cmlkec4x00005odtxwc8drhxc	/judges	GET	76	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:23.556	\N	\N	\N
cmlkecacx0006odtx9ejbkawd	/event/:eventId	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:30.609	\N	\N	\N
cmlkecpfg000dodtxo5ivfb5v	/remove/:assignmentId	PUT	60	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:50.14	\N	\N	\N
cmlkecphc000iodtxn4gyicf6	/	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:50.208	\N	\N	\N
cmlkecwmr000podtxp459epmq	/judge	POST	52	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:59.475	\N	\N	\N
cmlkecwop000qodtx1gizysqa	/	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:37:59.545	\N	\N	\N
cmlked1mf000rodtx2ekh8hzp	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-13 04:38:05.944	\N	\N	\N
cmlked3z0000sodtx3y029i8t	/categories	GET	18	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:08.988	\N	\N	\N
cmlkedas4000todtxtfg97vvn	/theme	GET	39	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:17.812	\N	\N	\N
cmlkedblb000uodtx21iix7ul	/	GET	42	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:18.864	\N	\N	\N
cmlkedcyt000vodtxay3rb9ws	/categories	GET	29	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:20.645	\N	\N	\N
cmlkedcz9000wodtxendn5gvf	/theme	GET	50	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:20.661	\N	\N	\N
cmlkedetg000xodtx2ibi5uzy	/profile	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:23.044	\N	\N	\N
cmlkedevc000yodtx63ljkxxo	/theme	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:38:23.112	\N	\N	\N
cmlkeez9j000zodtx4bxbgf3e	/profile	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:39:36.2	\N	\N	\N
cmlkeezex0010odtxe7z9c8e4	/	GET	56	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:39:36.394	\N	\N	\N
cmlkehdgt0011odtx41e1xumg	/event/:eventId	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:41:27.917	\N	\N	\N
cmlkej8d90012odtxi260xyka	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:42:54.622	\N	\N	\N
cmlkepnsa0013odtxrfzwasb7	/categories	GET	35	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:47:54.539	\N	\N	\N
cmlkeq4mu0014odtx4w5ev18m	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 04:48:16.374	\N	\N	\N
cmlkeq4n90015odtx48ght24q	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-13 04:48:16.389	\N	\N	\N
cmlkeq4u30016odtxt256klrs	/categories	GET	20	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:48:16.636	\N	\N	\N
cmlkeqpsn0017odtxyh1w1h13	/categories	GET	21	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:48:43.799	\N	\N	\N
cmlkerd0x0000eqln3w36kv5x	/categories	GET	59	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:49:13.905	\N	\N	\N
cmlkeuziq000geqln0d80wxjs	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-13 04:52:03.027	\N	\N	\N
cmlkf05oi000heqlnth0fz3qh	/categories	GET	37	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:56:04.291	\N	\N	\N
cmlkf23pc0000zuta2iukzo9t	/	GET	145	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:35.04	\N	\N	\N
cmlkf26a80001zuta1sys1pml	/	GET	100	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:38.384	\N	\N	\N
cmlkf26aj0002zuta4u9u4z1t	/contestants	GET	97	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:38.396	\N	\N	\N
cmlkf26g30003zutahpos39ri	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-13 04:57:38.593	\N	\N	\N
cmlkf26hf0004zutahk8c9155	/slug/:slug	GET	33	200	\N	\N	\N	2026-02-13 04:57:38.643	\N	\N	\N
cmlkf26n00005zuta8yhmj80b	/	GET	122	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:38.844	\N	\N	\N
cmlkf26n90006zutai3y6l524	/	GET	61	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:38.853	\N	\N	\N
cmlkf26ng0007zutac2e87aee	/contestants/assignments	GET	129	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:38.86	\N	\N	\N
cmlkf2ioy0008zutac1kfcos8	/	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 04:57:54.466	\N	\N	\N
cmlkf3pa5000jzuta3g030vxp	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-13 04:58:49.661	\N	\N	\N
cmlkf3pah000kzuta17a9bzud	/profile	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:58:49.673	\N	\N	\N
cmlkf3pj8000lzutaw9hkp5u3	/categories	GET	29	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:58:49.988	\N	\N	\N
cmlkf3rih000mzutatok5rize	/:categoryId/criteria	GET	19	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:58:52.553	\N	\N	\N
cmllyd58m001xbtn56w1pipw3	/theme	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:45:49.127	\N	\N	\N
cmllylw4h001u3e8af3xb028m	/theme	GET	92	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:37.217	\N	\N	\N
cmllz7ymn00049u0cnd9s0r2m	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 07:09:46.896	\N	\N	\N
cmllz86un00059u0cpqjmbwij	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 07:09:57.551	\N	\N	\N
cmllz8bhx00069u0cncqrz9xm	/theme	GET	36	200	\N	\N	\N	2026-02-14 07:10:03.573	\N	\N	\N
cmllzlno9000512tnut89ycet	/theme	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:20:25.881	\N	\N	\N
cmllzlxky000612tn0fu11lqx	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-14 07:20:38.722	\N	\N	\N
cmlm01tda000t12tn12or6n7f	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 07:32:59.758	\N	\N	\N
cmlm0ud0c0002yb8b939sfklw	/theme	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:55:11.581	\N	\N	\N
cmlm0ud230003yb8b4gycxbg2	/public	GET	37	200	\N	\N	\N	2026-02-14 07:55:11.644	\N	\N	\N
cmlm1b6eo000hyb8byp8n45wt	/stats	GET	74	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:08:16.177	\N	\N	\N
cmlm1ujod000tyb8b544xseza	/stats	GET	73	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:23:19.837	\N	\N	\N
cmlm1yf5f0013yb8bh2l7zodj	/stats	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:26:20.596	\N	\N	\N
cmlm5bmdc001myb8b7fy4mbzx	/sonicos/is-sslvpn-enabled	GET	20	401	\N	\N	\N	2026-02-14 10:00:35.328	\N	\N	\N
cmlmq2g8n002wyb8buz1n1t0h	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:41:19.416	\N	\N	\N
cmlmq2ppd002zyb8bdpq1jmdi	/theme	GET	55	200	\N	\N	\N	2026-02-14 19:41:31.681	\N	\N	\N
cmlmq38tf0038yb8bbbbvajku	/logs	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:41:56.451	\N	\N	\N
cmlmq7ky3003oyb8bjlsafjhw	/directory	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:45:18.795	\N	\N	\N
cmlmqecuh003xyb8bs5samvpj	/	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:50:34.889	\N	\N	\N
cmlmqeguc003yyb8bkvxhclk5	/theme	GET	61	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:50:40.068	\N	\N	\N
cmlmqez6u003zyb8blp37vntl	/judges	GET	59	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:51:03.847	\N	\N	\N
cmlmqf1510040yb8bokd9jyga	/tally-masters	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:51:06.374	\N	\N	\N
cmlmqf2ck0041yb8bcznsc74s	/role/:role	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:51:07.94	\N	\N	\N
cmlkf3v98000rzutajh0ni34z	/category/:categoryId/contestant/:contestantId	POST	69	409	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:58:57.404	\N	\N	\N
cmlkf3v9g000szutarynhye97	/category/:categoryId/contestant/:contestantId	POST	72	409	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 04:58:57.412	\N	\N	\N
cmllyd5ck001ybtn5bmtbgen4	/logs	GET	89	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:45:49.269	\N	\N	\N
cmllyf73o0021btn5l6ki3jiu	/directory	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:47:24.852	\N	\N	\N
cmllym530001v3e8agp32t8t6	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:52:48.828	\N	\N	\N
cmllym8mw001y3e8a7pswdeby	/stats	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:53.432	\N	\N	\N
cmllymbfv00213e8a9pngezvt	/theme	GET	77	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:57.067	\N	\N	\N
cmllyn85d00263e8au5rkwb97	/stats	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:53:39.457	\N	\N	\N
cmllyn86c00273e8ax7l3u1me	/logs	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:53:39.493	\N	\N	\N
cmllyr3t800293e8abcaabx1l	/stats	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:56:40.461	\N	\N	\N
cmllz9auu000a9u0cqv75vsqs	/logs	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:10:49.398	\N	\N	\N
cmllzmpqz000712tnfyh2ra6c	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 07:21:15.228	\N	\N	\N
cmllzohth000912tnk1bu9wi5	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 07:22:38.261	\N	\N	\N
cmllzor10000a12tn4u5loxns	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 07:22:50.197	\N	\N	\N
cmlm023tz000x12tn8hze8k5p	/stats	GET	104	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:33:13.319	\N	\N	\N
cmlm02agp000y12tngv7dv2e1	/theme	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:33:21.914	\N	\N	\N
cmlm02ah9000z12tncafqn02g	/profile	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:33:21.933	\N	\N	\N
cmlm02ctu001012tnc5yuvz3k	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-14 07:33:24.979	\N	\N	\N
cmlm02e0z001212tnj34oy4q6	/theme	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:33:26.531	\N	\N	\N
cmlm0ud2j0004yb8b5snbem79	/profile	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:55:11.66	\N	\N	\N
cmlm0ud5k0005yb8bhry2x3ym	/theme	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:55:11.768	\N	\N	\N
cmlm1d41c000iyb8bq3hk3nsl	/stats	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:09:46.416	\N	\N	\N
cmlm1f1n1000jyb8byal9qxrm	/logs	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:11:16.621	\N	\N	\N
cmlm1v6un000uyb8b7bdyyoz6	/logs	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:23:49.871	\N	\N	\N
cmlmas1u5001nyb8btp3m2yzq	/.env	GET	24	401	\N	\N	\N	2026-02-14 12:33:19.95	\N	\N	\N
cmlmq2pos002yyb8b0c3ypbzh	/slug/:slug	GET	33	200	\N	\N	\N	2026-02-14 19:41:31.661	\N	\N	\N
cmlmq4jf9003hyb8ba8pxky4d	/logs	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:42:56.853	\N	\N	\N
cmlmq4jfm003iyb8b1x4ubijk	/theme	GET	56	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:42:56.866	\N	\N	\N
cmlmq4mrk003jyb8b7b9qwr9u	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:43:01.185	\N	\N	\N
cmlmqhzcj0042yb8bmezr4qle	/password-policy	GET	51	200	\N	\N	\N	2026-02-14 19:53:24.02	\N	\N	\N
cmlmqiba1004hyb8bcccypuqw	/theme	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:53:39.481	\N	\N	\N
cmlkf5wfh000yzutao69k49mg	/profile	GET	22	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:00:32.237	\N	\N	\N
cmlkf620b000zzutaxde80jvi	/theme	GET	33	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:00:39.468	\N	\N	\N
cmlkf631n0010zutahqq3d9r9	/:categoryId/criteria	GET	26	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:00:40.811	\N	\N	\N
cmlkf84pz0011zutaudlqdvmb	/	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:02:16.296	\N	\N	\N
cmlkf8s180012zuta9m0vw9jn	/	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:02:46.509	\N	\N	\N
cmlkfag6p0000vgv7sikwvl0q	/:categoryId/criteria	GET	31	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:04:04.465	\N	\N	\N
cmlkfagru0001vgv7o82y9w7n	/category/:categoryId/contestant/:contestantId	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:04:05.227	\N	\N	\N
cmlkfakow0002vgv7m81f5uuv	/category/:categoryId/contestant/:contestantId	GET	26	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:04:10.305	\N	\N	\N
cmlkfaux30003vgv7qko1uuja	/theme	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:04:23.559	\N	\N	\N
cmlkfbepy0009vgv7ry273wso	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:04:49.222	\N	\N	\N
cmlkfcn8b000avgv7n9f43lot	/values/:entityId	GET	19	304	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:05:46.908	\N	\N	\N
cmlkfcvkf000evgv7nx0lp12s	/category/:categoryId/contestant/:contestantId	GET	18	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:05:57.711	\N	\N	\N
cmlkfe936000fvgv7gcr75fib	/categories	GET	26	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:07:01.891	\N	\N	\N
cmlkfewds000gvgv76ajqm6v1	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:07:32.08	\N	\N	\N
cmlkfg1ux000hvgv7kxe2l9o8	/	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:08:25.833	\N	\N	\N
cmlkfg6wj000ivgv73x1x41tb	/categories	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:08:32.372	\N	\N	\N
cmlkfhcgd000jvgv748lt2e3z	/	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:09:26.222	\N	\N	\N
cmlkfhhfk000kvgv7oyd6o5ng	/categories	GET	30	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:09:32.672	\N	\N	\N
cmlkfjabc000lvgv7tpiygt9y	/	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:10:56.76	\N	\N	\N
cmlkfmiuz000mvgv7jax71wx2	/	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:13:27.804	\N	\N	\N
cmlkfnygg00008k7wfcjmvyrq	/categories	GET	39	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:14:34.673	\N	\N	\N
cmlkfpbxg000a8k7ww3wda0xg	/category/:categoryId/contestant/:contestantId	GET	40	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:15:38.788	\N	\N	\N
cmlkfprav000b8k7wa8y66vyd	/	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:15:58.712	\N	\N	\N
cmlkfpzbq000c8k7wl12m4sus	/categories	GET	33	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:16:09.111	\N	\N	\N
cmlkfqy6m000d8k7wnt55l2ga	/profile	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:16:54.287	\N	\N	\N
cmlkfr3kq000e8k7w4ntxb094	/theme	GET	58	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:17:01.274	\N	\N	\N
cmlkfr3qy000f8k7w50colxax	/:entityType	GET	31	304	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:17:01.499	\N	\N	\N
cmlkfrlz0000g8k7we26dj0o1	/theme	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:17:25.116	\N	\N	\N
cmlkfrn6w000h8k7wrtjl54yi	/logs	GET	89	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:17:26.697	\N	\N	\N
cmlkfrvd1000i8k7wa6esjkh7	/	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:17:37.286	\N	\N	\N
cmlkfs3wl000j8k7w31pn1wu1	/events	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:17:48.358	\N	\N	\N
cmlkfv8mx000k8k7wlr1wn7ho	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	25	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:20:14.458	\N	\N	\N
cmlkfvkbi000l8k7wrqlivyov	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	21	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:20:29.598	\N	\N	\N
cmlkfvy3m000m8k7w6wzqosod	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	25	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:20:47.458	\N	\N	\N
cmlkfw2q8000n8k7w7mwvvgpn	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	24	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:20:53.456	\N	\N	\N
cmlkfweaz000o8k7wndxdlmtc	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	22	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:21:08.459	\N	\N	\N
cmlkfwnk6000p8k7wppund74i	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	22	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:21:20.455	\N	\N	\N
cmlkfxd1t000q8k7w6vh1yvjr	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	25	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:21:53.489	\N	\N	\N
cmlkfxvjm000r8k7w3p6yqa5o	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	27	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:22:17.459	\N	\N	\N
cmlkfy068000s8k7wwvmg2e2f	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	23	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:22:23.457	\N	\N	\N
cmlkfy4sx000t8k7w5y8lsroz	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	23	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:22:29.458	\N	\N	\N
cmlkfz12y000u8k7wctsco4l6	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 05:23:11.291	\N	\N	\N
cmlkfz16x000v8k7wxmxui3vw	/theme	GET	36	200	\N	\N	\N	2026-02-13 05:23:11.434	\N	\N	\N
cmlkfz3ir000w8k7witypswdk	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	21	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:23:14.451	\N	\N	\N
cmlkfzf3t000x8k7wdrbh2g4m	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	32	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:23:29.466	\N	\N	\N
cmlkfzvax000y8k7w2q5za8h2	/api/v1/commentary/cmljlirjf0008ob68pb9qdz8h	GET	23	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:23:50.458	\N	\N	\N
cmlkg078i000z8k7w2zal7hxp	/	GET	141	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:24:05.923	\N	\N	\N
cmlkg0ea900108k7wape2kqlk	/theme	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:24:15.057	\N	\N	\N
cmlkg0jqt00118k7wd8vagnsl	/:id	PUT	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:24:22.134	\N	\N	\N
cmlkg0q8600168k7wmpi12pv7	/theme	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:24:30.534	\N	\N	\N
cmlkg30jv0003n31o75490c79	/categories	GET	37	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:26:17.227	\N	\N	\N
cmlkg35vj000cn31o3kxzj8w1	/category/:categoryId/contestant/:contestantId	POST	109	409	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:26:24.127	\N	\N	\N
cmlkg35xd000en31otobxtjqy	/category/:categoryId/contestant/:contestantId	GET	53	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:26:24.193	\N	\N	\N
cmlkg3cgb000fn31osth18qz1	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 05:26:32.649	\N	\N	\N
cmlkg5b5a000yn31ofucjx7zq	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-13 05:28:04.27	\N	\N	\N
cmlkg5b5w000zn31oy8khd3xm	/theme	GET	54	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:04.292	\N	\N	\N
cmlkg5bqp0010n31o6jsfoi0m	/categories	GET	45	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:05.042	\N	\N	\N
cmlkg5ht10011n31ojakkg43a	/:scoreId	PUT	42	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:12.901	\N	\N	\N
cmlkg5uor0016n31odcz6vq9m	/:scoreId	PUT	55	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:29.596	\N	\N	\N
cmlkg5ur7001dn31ofdgkofs8	/category/:categoryId/contestant/:contestantId	GET	39	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:29.683	\N	\N	\N
cmlkg5y9s001gn31oh2cwrj7f	/category/:categoryId/contestant/:contestantId	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:34.239	\N	\N	\N
cmlkg5z8f001hn31omk76hgsi	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-13 05:28:35.487	\N	\N	\N
cmlkg5zsk001jn31od2hzzfls	/categories	GET	35	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:36.212	\N	\N	\N
cmlkg609a001kn31o040u4ggw	/category/:categoryId/contestant/:contestantId	GET	19	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:36.814	\N	\N	\N
cmllyd95c001zbtn5cer0gomi	/directory	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:45:54.193	\N	\N	\N
cmllyn42m00243e8a132uttng	/profile	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:53:34.174	\N	\N	\N
cmllyn44i00253e8aeme18ar4	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:53:34.243	\N	\N	\N
cmllz9i28000b9u0ce8boa67o	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-14 07:10:58.736	\N	\N	\N
cmllz9i2p000c9u0chvwcrgu6	/theme	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:10:58.754	\N	\N	\N
cmllz9i2x000d9u0csjrk0y0u	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 07:10:58.762	\N	\N	\N
cmllz9i4l000e9u0ch1dwqtm5	/profile	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:10:58.821	\N	\N	\N
cmllza1vs000f9u0c2ok14nie	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 07:11:24.424	\N	\N	\N
cmllza1wr000g9u0c1a7llluv	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-14 07:11:24.459	\N	\N	\N
cmllzutzy000d12tn5fw7oaem	/slug/:slug	GET	20	200	\N	\N	\N	2026-02-14 07:27:33.982	\N	\N	\N
cmlm02cx4001112tnvdlriybk	/theme	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:33:25.096	\N	\N	\N
cmlm0vns20006yb8btwrw4n4x	/logs	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:56:12.195	\N	\N	\N
cmlm0vnsa0007yb8b6mjtaqyw	/stats	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:56:12.202	\N	\N	\N
cmlm1f1pc000kyb8bm8mlt7h4	/stats	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:11:16.704	\N	\N	\N
cmlm1w92g000vyb8bl7bg92yz	/.env	GET	8	404	\N	\N	\N	2026-02-14 08:24:39.401	\N	\N	\N
cmlm211es0015yb8bqc9ksl1e	/users/avatar	POST	14	403	\N	\N	\N	2026-02-14 08:28:22.757	\N	\N	\N
cmlm211oa0016yb8bpf5dddep	/profile/photo	POST	12	403	\N	\N	\N	2026-02-14 08:28:23.098	\N	\N	\N
cmlm212bw0017yb8bdyd7beiy	/media	POST	17	403	\N	\N	\N	2026-02-14 08:28:23.949	\N	\N	\N
cmlm214ya0018yb8b0fg4ap50	/assets	POST	11	403	\N	\N	\N	2026-02-14 08:28:27.347	\N	\N	\N
cmlm215oz0019yb8bkk2o7kws	/products/upload	POST	12	403	\N	\N	\N	2026-02-14 08:28:28.308	\N	\N	\N
cmlm215to001ayb8bdzqyf3t5	/catalog/images	POST	13	403	\N	\N	\N	2026-02-14 08:28:28.476	\N	\N	\N
cmlm216bk001byb8bqrc140la	/blob	POST	10	403	\N	\N	\N	2026-02-14 08:28:29.121	\N	\N	\N
cmlm217lj001cyb8bm6rovjxd	/v2/files	POST	13	403	\N	\N	\N	2026-02-14 08:28:30.776	\N	\N	\N
cmlm218cy001dyb8b8pr6ol52	/storage/local	POST	11	403	\N	\N	\N	2026-02-14 08:28:31.762	\N	\N	\N
cmlmpufjy001oyb8baa75dfzz	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-14 19:35:05.279	\N	\N	\N
cmlmpv4xg001tyb8bth7iu772	/slug/:slug	GET	17	200	\N	\N	\N	2026-02-14 19:35:38.164	\N	\N	\N
cmlmpv4za001vyb8bf15pfg9w	/slug/:slug	GET	32	200	\N	\N	\N	2026-02-14 19:35:38.23	\N	\N	\N
cmlmpv51g001wyb8bjryibmgn	/public	GET	61	200	\N	\N	\N	2026-02-14 19:35:38.308	\N	\N	\N
cmlmpvcp6001xyb8bumf1p48h	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:35:48.234	\N	\N	\N
cmlmpvv0h0023yb8b8gugubh3	/theme	GET	105	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:36:11.969	\N	\N	\N
cmlmq2ppg0030yb8b33zwolie	/theme	GET	53	200	\N	\N	\N	2026-02-14 19:41:31.684	\N	\N	\N
cmlmq2wtv0031yb8bhcqaijbe	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:41:40.915	\N	\N	\N
cmlmq4hw2003gyb8buvwze0gz	/theme	GET	66	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:42:54.866	\N	\N	\N
cmlmqiy180058yb8b4uxjtt0y	/theme	PUT	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:54:08.972	\N	\N	\N
cmlkg5zs9001in31od3bfzm9k	/:categoryId/criteria	GET	20	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:28:36.201	\N	\N	\N
cmlkg6iv8001on31oabtuyvoz	/theme	GET	104	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:29:00.932	\N	\N	\N
cmlkg9hqi001pn31ojf3wek1p	/	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:31:19.434	\N	\N	\N
cmlkgaizk001qn31oe8ccwshs	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:32:07.712	\N	\N	\N
cmlkgcgra001rn31obfsetbl0	/categories	GET	23	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:33:38.135	\N	\N	\N
cmlkgglnf001sn31omucd8cu9	/	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:36:51.099	\N	\N	\N
cmlkgh8va001tn31o35anfdo3	/	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:37:21.19	\N	\N	\N
cmlkghnvz001un31ortj31o59	/categories	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:37:40.655	\N	\N	\N
cmlkgib4m001vn31otuybz5gd	/categories	GET	29	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:38:10.774	\N	\N	\N
cmlkgije7001wn31own8gqizo	/	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:38:21.487	\N	\N	\N
cmlkgju0x001xn31os660f3u6	/	GET	62	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:39:21.922	\N	\N	\N
cmlkgk8wo001yn31ou9udiv9x	/categories	GET	35	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:39:41.209	\N	\N	\N
cmlkgo4fn001zn31ouwinz94a	/categories	GET	29	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:42:42.035	\N	\N	\N
cmlkgp0cn0020n31okubidvro	/	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:43:23.4	\N	\N	\N
cmlkgpey20021n31ogu96y4th	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:43:42.315	\N	\N	\N
cmlkgvh5g0022n31odyip8cy8	/	GET	17	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:48:25.109	\N	\N	\N
cmlkgwja30023n31ohrnd0r8n	/categories	GET	26	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:49:14.523	\N	\N	\N
cmlkgx6i20024n31opsdkrsoz	/categories	GET	34	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:49:44.619	\N	\N	\N
cmlkh2iz60000bqx2ezdcotjs	/theme	GET	37	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:53:54.067	\N	\N	\N
cmlkh2j380001bqx2ewdme5j7	/categories	GET	33	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:53:54.212	\N	\N	\N
cmlkh2k5u0002bqx2o9pdf2ov	/:categoryId/criteria	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:53:55.602	\N	\N	\N
cmlkh2p930003bqx239mygwl2	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:54:02.199	\N	\N	\N
cmlkh356f0004bqx2otvukad1	/:id	PUT	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:54:22.839	\N	\N	\N
cmlkh3cup0007bqx2dzjqtrld	/:categoryId/criteria	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:54:32.785	\N	\N	\N
cmlkh3sd9000abqx2y1w1snmz	/criteria/:criterionId	DELETE	42	204	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:54:52.893	\N	\N	\N
cmlkh3ybh000fbqx2w0gxoktn	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 05:55:00.605	\N	\N	\N
cmlkh3yd8000gbqx2bj1s1ny5	/profile	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:55:00.668	\N	\N	\N
cmlkh4k98000hbqx221hydchg	/category/:categoryId/contestant/:contestantId	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 05:55:29.036	\N	\N	\N
cmlkh9kay000ibqx2md1kqid4	/	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 05:59:22.378	\N	\N	\N
cmlkhbjy6000nbqx2g0b8h031	/	GET	24	200	cmljlirxw0046ob689rtkcnzg	\N	\N	2026-02-13 06:00:55.231	\N	\N	\N
cmlkhbop5000obqx2bps2lpul	/	GET	29	200	cmljlirxw0046ob689rtkcnzg	\N	\N	2026-02-13 06:01:01.386	\N	\N	\N
cmlkhbsy4000pbqx2atc5esn6	/	GET	40	200	cmljlirxw0046ob689rtkcnzg	\N	\N	2026-02-13 06:01:06.892	\N	\N	\N
cmlkhc5gy000qbqx2wz6u4tkv	/	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:01:23.123	\N	\N	\N
cmlkhcstp000rbqx2chy2dsrg	/	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:01:53.39	\N	\N	\N
cmlkhdiyh000sbqx2ggkzvadr	/theme	GET	30	200	cmljlirxw0046ob689rtkcnzg	\N	\N	2026-02-13 06:02:27.258	\N	\N	\N
cmlkhdj1p000vbqx2t9kao3va	/	GET	46	200	cmljlirxw0046ob689rtkcnzg	\N	\N	2026-02-13 06:02:27.374	\N	\N	\N
cmlkhe3dz000wbqx28sb398ex	/	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:02:53.735	\N	\N	\N
cmlkhecyp000ybqx2l8rra7b8	/theme	GET	49	200	\N	\N	\N	2026-02-13 06:03:06.145	\N	\N	\N
cmlkhf1070013bqx26s2po1dd	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-13 06:03:37.303	\N	\N	\N
cmlkhf16c0017bqx2u9ixiz6q	/login	POST	136	200	\N	\N	\N	2026-02-13 06:03:37.524	\N	\N	\N
cmlkhgpb00018bqx2j7rp8epi	/theme	GET	42	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 06:04:55.451	\N	\N	\N
cmlkhin0r001abqx2orvtnypz	/logout	POST	19	200	\N	\N	\N	2026-02-13 06:06:25.803	\N	\N	\N
cmlkhin36001bbqx2m7ct3iax	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-13 06:06:25.889	\N	\N	\N
cmlkhiw69001fbqx24s5apahb	/theme	GET	61	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:06:37.665	\N	\N	\N
cmlkhiycv001gbqx29g5hm0xq	/theme	GET	31	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:06:40.496	\N	\N	\N
cmlkhj2f7001hbqx2mpkrkj0c	/pending-audits	GET	41	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:06:45.763	\N	\N	\N
cmlkhj2ff001ibqx2zzu0t2qe	/	GET	43	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:06:45.771	\N	\N	\N
cmlkhj5c6001jbqx2zjcptlen	/theme	GET	31	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:06:49.542	\N	\N	\N
cmlkhj5cr001kbqx2y9vwlsz3	/	GET	17	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:06:49.564	\N	\N	\N
cmlkhk8hz001lbqx26kbiwed3	/theme	GET	41	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:07:40.295	\N	\N	\N
cmlkhknfy001mbqx26atp22sm	/theme	GET	31	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:07:59.662	\N	\N	\N
cmlkhqdyo001nbqx27cmixl23	/	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:12:27.313	\N	\N	\N
cmlkhtman001obqx256n6n2b8	/	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:14:58.079	\N	\N	\N
cmlkhu9ik001pbqx2hsnyixqw	/	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:15:28.172	\N	\N	\N
cmlkhuwtd001qbqx2rc5odfpw	/	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:15:58.37	\N	\N	\N
cmlkhxhw0001rbqx2k66m4g2g	/	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:17:58.992	\N	\N	\N
cmlki3b92001sbqx2a5m7aj1j	/	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:22:30.327	\N	\N	\N
cmlki595g001tbqx2i4nlszu0	/	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:24:00.917	\N	\N	\N
cmlki7u7y001ubqx20aebjisc	/	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:26:01.534	\N	\N	\N
cmlkib2sl001vbqx2bdy997a1	/	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 06:28:32.613	\N	\N	\N
cmlkj721c001wbqx2lf38nnvu	/theme	GET	32	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 06:53:24.624	\N	\N	\N
cmlkjc0pl001xbqx2qvy51j9o	/slug/:slug	GET	31	200	\N	\N	\N	2026-02-13 06:57:16.186	\N	\N	\N
cmlkjc0rr001ybqx2wwxw0yfh	/profile	GET	12	401	\N	\N	\N	2026-02-13 06:57:16.264	\N	\N	\N
cmlkjkta00022bqx2030qdwcd	/theme	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:04:06.457	\N	\N	\N
cmlkjktl60023bqx2jav5kakz	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-13 07:04:06.859	\N	\N	\N
cmlkjktnl0024bqx2kvntq6lq	/profile	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:04:06.945	\N	\N	\N
cmlkjktpt0025bqx2a70mzz9s	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:04:07.026	\N	\N	\N
cmlkjlkjw0026bqx28jkfutfg	/:id	GET	38	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:04:41.805	\N	\N	\N
cmlksbvo000066thcznq3szh7	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-13 11:09:06.193	\N	\N	\N
cmlkjnlys0028bqx2z6l79jui	/stats	GET	44	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:06:16.948	\N	\N	\N
cmlkjo9ag0029bqx2q46llc5w	/logs	GET	74	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:06:47.177	\N	\N	\N
cmlkjpjvx002abqx2e36rc5e1	/stats	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:07:47.566	\N	\N	\N
cmlkjrhzh002bbqx24hzxxkf3	/logs	GET	85	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:09:18.414	\N	\N	\N
cmlkjs5c9002cbqx2gohhacp5	/stats	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:09:48.681	\N	\N	\N
cmlkjtfxk002dbqx2vyosm2p7	/stats	GET	127	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:10:49.064	\N	\N	\N
cmlkju37x002ebqx2nlp0u86e	/logs	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:11:19.246	\N	\N	\N
cmlkjvdt6002fbqx2sugo6v7x	/stats	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:12:19.626	\N	\N	\N
cmlkjw11x002gbqx2yxxx0s1f	/stats	GET	41	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:12:49.75	\N	\N	\N
cmlkjxywg002hbqx247y7cl6f	/stats	GET	81	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:14:20.272	\N	\N	\N
cmlkjz9ie002ibqx2twzfu6nx	/stats	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:15:20.678	\N	\N	\N
cmlkk0k91002jbqx2x17ab7vx	/logs	GET	48	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:16:21.254	\N	\N	\N
cmlkk17j5002kbqx2wk7nt22y	/logs	GET	55	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:16:51.425	\N	\N	\N
cmlkk3sr9002lbqx23n4p53aw	/stats	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:18:52.246	\N	\N	\N
cmlkk5qq5002mbqx2gdnqbm1a	/logs	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:20:22.926	\N	\N	\N
cmlkk71eh002nbqx2vjyo1rhg	/stats	GET	48	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:21:23.418	\N	\N	\N
cmlkk7orc002obqx2jpe3rjic	/stats	GET	79	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:21:53.688	\N	\N	\N
cmlkk8zcy0000inyksnbh8n72	/stats	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:22:54.082	\N	\N	\N
cmlkkc7jy0000m9aq5sldvtel	/logs	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:25:24.67	\N	\N	\N
cmlkkcuxm0001m9aq56tcu6lm	/stats	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:25:54.97	\N	\N	\N
cmlkkd1jd0002m9aqhz91ot4p	/theme	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:26:03.53	\N	\N	\N
cmlkkd1om0003m9aqbd1zpanj	/stats	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:26:03.718	\N	\N	\N
cmlkkdb820004m9aqx61zbq84	/	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:26:16.082	\N	\N	\N
cmlkkdbdq0005m9aqwwqbry5w	/categories	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:26:16.286	\N	\N	\N
cmlkkdgc60006m9aqlr8iriyl	/theme	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:26:22.711	\N	\N	\N
cmlkkdr0z0007m9aqjxx51vyc	/theme	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:26:36.563	\N	\N	\N
cmlkkfha60000dy5bz1b8m9a6	/theme	GET	123	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:27:57.247	\N	\N	\N
cmlkkfhig0001dy5bsxnxhvum	/api/v1/category-certification/category/cmljlirph0019ob68twuglukq/progress	GET	31	404	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:27:57.543	\N	\N	\N
cmlkkfr5g0002dy5bqtfr72vv	/categories	GET	22	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:28:10.036	\N	\N	\N
cmlkkfxas0003dy5bhgiqkhap	/	GET	56	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:28:18.005	\N	\N	\N
cmlkkiuq90004dy5b4u75atcl	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-13 07:30:34.641	\N	\N	\N
cmlkkiv120005dy5boo4gjf3s	/theme	GET	49	200	\N	\N	\N	2026-02-13 07:30:35.03	\N	\N	\N
cmlkkiv3y0006dy5bqd0c7v95	/theme	GET	48	200	\N	\N	\N	2026-02-13 07:30:35.134	\N	\N	\N
cmlkkj8b60007dy5bdacs1rav	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 07:30:52.242	\N	\N	\N
cmlkkj8iw000bdy5bkdw24w1x	/login	POST	154	200	\N	\N	\N	2026-02-13 07:30:52.521	\N	\N	\N
cmlkkj8mf000cdy5bt27gbknd	/theme	GET	49	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:30:52.648	\N	\N	\N
cmlkkjaem000ddy5bckua3tem	/	GET	35	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:30:54.958	\N	\N	\N
cmlkkje0s000edy5bxf2oi9op	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-13 07:30:59.645	\N	\N	\N
cmlkkjerj000fdy5b15gpim3j	/categories	GET	26	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:31:00.608	\N	\N	\N
cmlkkjitq000gdy5bfndr57w2	/theme	GET	29	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:31:05.871	\N	\N	\N
cmlkkjum1000hdy5bsxkzaz4j	/pending-audits	GET	35	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:31:21.145	\N	\N	\N
cmlkkjvtp000idy5bklriyyqw	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 07:31:22.717	\N	\N	\N
cmlkkjvul000jdy5bgol78wcy	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-13 07:31:22.749	\N	\N	\N
cmlkkjw2k000kdy5b3hcyobe5	/theme	GET	33	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:31:23.037	\N	\N	\N
cmlkkmq55000ldy5bzhvzwjpf	/theme	GET	38	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 07:33:35.322	\N	\N	\N
cmlkkn5fu000mdy5bo45cn9ky	/slug/:slug	GET	38	200	\N	\N	\N	2026-02-13 07:33:55.147	\N	\N	\N
cmlkkn5hh000ndy5b88ign9wd	/theme	GET	81	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:33:55.205	\N	\N	\N
cmlkkn5ke000ody5bz7s2f7n6	/categories	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:33:55.311	\N	\N	\N
cmlkkn9jp000pdy5bat9dhfkw	/theme	GET	45	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:34:00.469	\N	\N	\N
cmlkkudus000qdy5b4sr3v70b	/directory	GET	44	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:39:32.644	\N	\N	\N
cmlkkv147000rdy5b5dc6ohr6	/directory	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:40:02.791	\N	\N	\N
cmlkkvoc9000sdy5behl2vm8y	/directory	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:40:32.889	\N	\N	\N
cmlkkxm68000tdy5b49nl2itn	/directory	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:42:03.393	\N	\N	\N
cmlkkywq0000udy5bhvg5otrw	/directory	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:43:03.72	\N	\N	\N
cmlkl0ujs000010lb11t7q4gn	/directory	GET	56	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:44:34.216	\N	\N	\N
cmlkl1htm000110lbp9hi2u6k	/directory	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:45:04.378	\N	\N	\N
cmlkl4q22000210lb2bmk7fop	/directory	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:47:35.019	\N	\N	\N
cmlkl5da3000310lbsgh7gniz	/directory	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:48:05.115	\N	\N	\N
cmlklajg0000410lbza4uno5g	/directory	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:52:06.384	\N	\N	\N
cmlkld4j8000510lbo9ghyr3f	/directory	GET	110	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:54:07.029	\N	\N	\N
cmlkleezr000610lbeku1dk7a	/directory	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:55:07.239	\N	\N	\N
cmlklfpgo000710lbcc2da80g	/directory	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:56:07.465	\N	\N	\N
cmlklh0um00006thcz2gott0c	/directory	GET	84	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:57:08.879	\N	\N	\N
cmlkljlwv00016thcsgy46h9g	/directory	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 07:59:09.488	\N	\N	\N
cmlklljmt00026thc6dteswjt	/directory	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 08:00:39.846	\N	\N	\N
cmlklq2o800036thc8cql5kvr	/slug/:slug	GET	43	200	\N	\N	\N	2026-02-13 08:04:11.144	\N	\N	\N
cmlksbv6q00046thcnrxjc8af	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-13 11:09:05.57	\N	\N	\N
cmlksbv9f00056thc5a7u2ybd	/profile	GET	17	401	\N	\N	\N	2026-02-13 11:09:05.667	\N	\N	\N
cmlksbvuc00076thc01rft4vf	/theme	GET	40	200	\N	\N	\N	2026-02-13 11:09:06.421	\N	\N	\N
cmll5xi2w00035x9rpb8cnyjc	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-13 17:29:50.024	\N	\N	\N
cmll5xqg300045x9rcx72qi90	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-13 17:30:00.867	\N	\N	\N
cmll5y2df00085x9r012xuwk0	/theme	GET	66	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 17:30:16.323	\N	\N	\N
cmll5y5pp00095x9rativ0a1y	/slug/:slug	GET	21	200	\N	\N	\N	2026-02-13 17:30:20.654	\N	\N	\N
cmll5ywjt000a5x9rw8djlwkc	/category/:categoryId/contestant/:contestantId	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 17:30:55.434	\N	\N	\N
cmll5z9r6000b5x9rarwe9xd5	/theme	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 17:31:12.547	\N	\N	\N
cmll5zdl1000c5x9raqzghngp	/categories	GET	30	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 17:31:17.51	\N	\N	\N
cmll5zhek000d5x9rzuvrsyzd	/categories	GET	41	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 17:31:22.46	\N	\N	\N
cmll5zk69000e5x9rxnsmv792	/categories	GET	32	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 17:31:26.05	\N	\N	\N
cmll5zts3000g5x9rpjducolr	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-13 17:31:38.5	\N	\N	\N
cmll60856000k5x9r32adq1cq	/slug/:slug	GET	31	200	\N	\N	\N	2026-02-13 17:31:57.115	\N	\N	\N
cmll6085o000l5x9rd9cxrzc3	/theme	GET	78	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:31:57.133	\N	\N	\N
cmll608za000m5x9r4eykj8n1	/theme	GET	36	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:31:58.198	\N	\N	\N
cmll609hg000n5x9rz30a7ewf	/theme	GET	32	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:31:58.852	\N	\N	\N
cmll609ji000o5x9rl6t57rd3	/	GET	23	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:31:58.926	\N	\N	\N
cmll61r9e000p5x9rrkgvscdn	/	GET	18	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:08.546	\N	\N	\N
cmll61rd8000q5x9rk86evz6i	/api/v1/category-certification/category/cmljlirwy003oob68mlnuivt0/progress	GET	50	404	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:08.684	\N	\N	\N
cmll61ry7000r5x9rzg2yaeea	/api/v1/category-certification/category/cmljlirvn0034ob68j0fq4d2t/progress	GET	47	404	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:09.44	\N	\N	\N
cmll61scx000s5x9rp60qpdri	/	GET	20	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:09.969	\N	\N	\N
cmll61sth000t5x9rmu44bld0	/	GET	16	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:10.565	\N	\N	\N
cmll61wo3000u5x9rqd4bqmjp	/	GET	29	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:15.556	\N	\N	\N
cmll622wb000v5x9rd5vbbubb	/deductions	GET	33	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:33:23.627	\N	\N	\N
cmll637f1000w5x9racoe7dmm	/	GET	24	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:34:16.141	\N	\N	\N
cmll63a2g000x5x9r2mmowvgo	/category/:categoryId/contestant/:contestantId	GET	17	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:34:19.576	\N	\N	\N
cmll63ciw000y5x9rxtn3wqp8	/	GET	29	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:34:22.761	\N	\N	\N
cmll63d5b000z5x9r93u3gjar	/	GET	22	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:34:23.567	\N	\N	\N
cmll63d5d00105x9rcez1ki0x	/category/:categoryId/contestant/:contestantId	GET	20	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:34:23.569	\N	\N	\N
cmll65m6f00115x9ryf0g7amn	/categories	GET	39	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:36:08.583	\N	\N	\N
cmll65t4c00125x9rdtcu2epp	/	GET	20	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:36:17.581	\N	\N	\N
cmll65t4s00135x9r0nq2pat7	/theme	GET	39	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:36:17.597	\N	\N	\N
cmll65u7g00145x9r5ov94ida	/stats	GET	35	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:36:18.988	\N	\N	\N
cmll66ox400175x9r07ilttew	/contest/:contestId	GET	21	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 17:36:58.792	\N	\N	\N
cmll671v4001b5x9rrt4u8x3c	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-13 17:37:15.568	\N	\N	\N
cmll6723z001f5x9r7pgp8p67	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-13 17:37:15.887	\N	\N	\N
cmll6724m001g5x9r3i7nohtg	/theme	GET	45	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:37:15.91	\N	\N	\N
cmll6726e001h5x9rkgi5z7qx	/stats	GET	33	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:37:15.974	\N	\N	\N
cmll67jpk001k5x9rfiv07vfz	/slug/:slug	GET	16	200	\N	\N	\N	2026-02-13 17:37:38.697	\N	\N	\N
cmll67o1e001l5x9rnpnky12g	/theme	GET	31	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:37:44.307	\N	\N	\N
cmll67q4y001m5x9rfskkm8bj	/stats	GET	23	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:37:47.026	\N	\N	\N
cmll67q5d001n5x9r420t0jsw	/theme	GET	43	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:37:47.041	\N	\N	\N
cmll68725001o5x9rbsxpj4fs	/stats	GET	22	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:38:08.957	\N	\N	\N
cmll68ub8001p5x9rrr7hcgdk	/stats	GET	25	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-13 17:38:39.092	\N	\N	\N
cmll7lr5b0000hcl9ar6b8fie	/phpinfo	GET	37	401	\N	\N	\N	2026-02-13 18:16:41.135	\N	\N	\N
cmll7lrkk0001hcl9fm5yo1n3	/info	GET	23	401	\N	\N	\N	2026-02-13 18:16:41.685	\N	\N	\N
cmll7qdif0000uikqkyye59f8	/api/v1/csrf-token	GET	5	200	\N	\N	\N	2026-02-13 18:20:16.744	\N	\N	\N
cmll7qdmm0001uikqp93e67dc	/theme	GET	45	200	\N	\N	\N	2026-02-13 18:20:16.894	\N	\N	\N
cmll7qo0o0005uikq9k3gb7ol	/theme	GET	50	200	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:20:30.36	\N	\N	\N
cmll7r863000fuikq434ypzxw	/category/:categoryId/contestant/:contestantId	POST	85	201	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:20:56.475	\N	\N	\N
cmll7re7k000ruikqx2y9hvew	/categories	GET	32	200	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:21:04.305	\N	\N	\N
cmll7rkfm000suikq3jheridt	/	GET	29	200	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:21:12.371	\N	\N	\N
cmll7rkfz000tuikqxe6nl27e	/category/:categoryId	GET	36	200	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:21:12.384	\N	\N	\N
cmll7rt05000uuikqy2px5k26	/	GET	45	200	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:21:23.477	\N	\N	\N
cmll7rtut000xuikqk9hp7wer	/theme	GET	29	200	cmljliror0014ob68xdcfhymw	\N	\N	2026-02-13 18:21:24.581	\N	\N	\N
cmll7s2jw000zuikq1j2tcc2a	/theme	GET	60	200	\N	\N	\N	2026-02-13 18:21:35.853	\N	\N	\N
cmll7sbhw0010uikqea1lccjz	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 18:21:47.445	\N	\N	\N
cmll7v2ca001auikq6wi1qoqm	/certify-totals	POST	69	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 18:23:55.546	\N	\N	\N
cmll7y4ww001buikq1loanenv	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 18:26:18.849	\N	\N	\N
cmll9n4df0000115l0q3raw7l	/api/v1/csrf-token	GET	5	200	\N	\N	\N	2026-02-13 19:13:44.164	\N	\N	\N
cmll9n4lo0001115laz2w1pj1	/overview	GET	94	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:13:44.461	\N	\N	\N
cmll9n9vq0002115lq2evqsos	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-13 19:13:51.303	\N	\N	\N
cmll9n9x90003115luzshsxqz	/theme	GET	66	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:13:51.357	\N	\N	\N
cmll9n9xy0004115lulvut6d6	/profile	GET	21	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:13:51.382	\N	\N	\N
cmll9n9zr0005115lz3pk11zj	/theme	GET	29	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:13:51.448	\N	\N	\N
cmll9nkfz0006115l6nfqwywp	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-13 19:14:04.991	\N	\N	\N
cmll9o02k0007115ldq8ejl3e	/review	GET	64	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:14:25.244	\N	\N	\N
cmll9otvc000a115ltjohc9q9	/overview	GET	40	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:15:03.864	\N	\N	\N
cmll9qi9v000b115lxup5bbe3	/requests	GET	45	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:16:22.147	\N	\N	\N
cmll9vxld000c115lkhyisrt2	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-13 19:20:35.281	\N	\N	\N
cmll9vxmr000d115l5ciemba1	/theme	GET	34	200	cmljlirna000oob68cn4w7bsj	\N	\N	2026-02-13 19:20:35.332	\N	\N	\N
cmll9yose000e115lzf8l2goq	/theme	GET	33	200	\N	\N	\N	2026-02-13 19:22:43.838	\N	\N	\N
cmllbfia1000i115ll3k9o0t0	/categories	GET	45	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:03:48.169	\N	\N	\N
cmllbgu2v000x115lojqqz0cg	/theme	GET	49	200	\N	\N	\N	2026-02-13 20:04:50.12	\N	\N	\N
cmllbh5br0011115l5vbc6ac9	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-13 20:05:04.695	\N	\N	\N
cmllbhac70012115la9y9524v	/theme	GET	37	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:11.192	\N	\N	\N
cmllbhc2a0013115lybiblko1	/	GET	22	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:13.427	\N	\N	\N
cmllbhc2g0014115lyffpdpdb	/category/:categoryId/contestant/:contestantId	GET	24	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:13.433	\N	\N	\N
cmllbhlr50015115l39a6wf8t	/overview	GET	38	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:25.985	\N	\N	\N
cmllbhz570016115lgq1wai76	/slug/:slug	GET	21	200	\N	\N	\N	2026-02-13 20:05:43.339	\N	\N	\N
cmllbhz800017115lebxbqv5r	/overview	GET	28	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:43.441	\N	\N	\N
cmllbiawr0018115lflz98u8j	/overview	GET	27	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:58.588	\N	\N	\N
cmllbib1m0019115lhv4hue1q	/overview	GET	32	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:05:58.762	\N	\N	\N
cmllbmqmk001a115l1icjj12a	/categories	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:09:25.581	\N	\N	\N
cmllbnwn6001b115l5dy7pv7k	/theme	GET	49	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:10:20.034	\N	\N	\N
cmllbnwp1001c115lumbkl25d	/overview	GET	94	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:10:20.101	\N	\N	\N
cmllbotpe001l115ln0lqk11v	/	GET	20	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:11:02.882	\N	\N	\N
cmllbovbu001m115ljp1dsieg	/categories	GET	28	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:11:04.986	\N	\N	\N
cmllbyn0c000066a7zdoihzv6	/theme	GET	86	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:18:40.765	\N	\N	\N
cmllbyn0i000166a7mj5osnfw	/slug/:slug	GET	33	200	\N	\N	\N	2026-02-13 20:18:40.77	\N	\N	\N
cmllbyz1d000266a7wr8nfr0c	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-13 20:18:56.352	\N	\N	\N
cmllbyz3x000366a78f4d51cp	/slug/:slug	GET	42	200	\N	\N	\N	2026-02-13 20:18:56.445	\N	\N	\N
cmllbyz4p000466a7j4i7opuu	/theme	GET	63	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:18:56.474	\N	\N	\N
cmllbyz6m000566a71mhm7qom	/theme	GET	43	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 20:18:56.542	\N	\N	\N
cmllbzduy000666a7kzrylpqo	/	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:19:15.562	\N	\N	\N
cmllc2g5t000766a7fjl7h41v	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:21:38.513	\N	\N	\N
cmllcdf9g000866a7vk5uxyfb	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:30:10.564	\N	\N	\N
cmllce2h7000966a7dke28vlk	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:30:40.652	\N	\N	\N
cmllchxtu000a66a7yj9rvunv	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:33:41.25	\N	\N	\N
cmllcn3pe000b66a71tse1tk6	/categories	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:37:42.147	\N	\N	\N
cmllcp1wi000c66a7nvg3d4ja	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:39:13.122	\N	\N	\N
cmllcxg3k000d66a7im5uyqgi	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:45:44.769	\N	\N	\N
cmllcy3cw000e66a7vdg81nf7	/categories	GET	36	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:46:14.912	\N	\N	\N
cmlld3whj000f66a7wre4u4y7	/categories	GET	34	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:50:45.944	\N	\N	\N
cmlld5u5z000g66a7uq4dh08l	/categories	GET	26	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:52:16.248	\N	\N	\N
cmlld74mr000h66a7wti9rbfr	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:53:16.468	\N	\N	\N
cmlldacu2000i66a7lhbhu47c	/categories	GET	24	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:55:47.067	\N	\N	\N
cmlldb03f000j66a7158wx2eq	/categories	GET	32	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 20:56:17.211	\N	\N	\N
cmlldiqut000k66a7iwdu8zai	/categories	GET	43	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-13 21:02:18.485	\N	\N	\N
cmlldkotc000l66a70vvj6mr7	/profile	GET	25	401	\N	\N	\N	2026-02-13 21:03:49.153	\N	\N	\N
cmlldkotp000m66a7xbdmrpa1	/theme	GET	99	200	\N	\N	\N	2026-02-13 21:03:49.166	\N	\N	\N
cmlle07af000n66a7sf0h34xm	/api/v1/csrf-token	GET	4	200	\N	\N	\N	2026-02-13 21:15:52.935	\N	\N	\N
cmlle07cl000o66a78wbx4es2	/theme	GET	39	200	\N	\N	\N	2026-02-13 21:15:53.013	\N	\N	\N
cmlle26qu0003jp4ipjh5jslw	/overview	GET	155	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 21:17:25.543	\N	\N	\N
cmlle2kvz0007jp4idj8n89im	/slug/:slug	GET	41	200	\N	\N	\N	2026-02-13 21:17:43.871	\N	\N	\N
cmlle2v3v0008jp4i9rd40j8v	/theme	GET	50	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:17:57.116	\N	\N	\N
cmlle32ru0009jp4i61mmn8vi	/theme	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:18:07.051	\N	\N	\N
cmlle32wg000ajp4is2z99e94	/	GET	75	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:18:07.217	\N	\N	\N
cmlle32wl000bjp4ignl89un8	/contestants	GET	97	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:18:07.221	\N	\N	\N
cmlleki7d0000mpb6832rc3gl	/theme	GET	117	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 21:31:40.202	\N	\N	\N
cmllekiae0001mpb6hggbthu6	/theme	GET	38	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-13 21:31:40.311	\N	\N	\N
cmllel4eh0002mpb6p761t1rm	/contestant-visibility	GET	61	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:32:08.969	\N	\N	\N
cmllel9dv0003mpb6xmz4il0b	/theme	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:32:15.427	\N	\N	\N
cmlleldbj0004mpb6mvnbz5f4	/theme	GET	59	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:32:20.528	\N	\N	\N
cmlleldbu0005mpb6zaq10ot1	/metrics	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:32:20.538	\N	\N	\N
cmllelhr10006mpb6x6j49e4r	/theme	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:32:26.269	\N	\N	\N
cmlleum55000013re560pe968	/slug/:slug	GET	75	200	\N	\N	\N	2026-02-13 21:39:31.866	\N	\N	\N
cmlleuogt000113reu34f3wmv	/profile	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:39:34.878	\N	\N	\N
cmlleuql4000213re3yi1ecm8	/theme	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:39:37.624	\N	\N	\N
cmlleuy9s000313remmrnddsi	/theme	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-13 21:39:47.584	\N	\N	\N
cmllplzdu0000jx0wv8bjknjq	/theme	GET	128	200	\N	\N	\N	2026-02-14 02:40:44.898	\N	\N	\N
cmllpug7p0001jx0wr4vv4fec	/theme	GET	52	200	\N	\N	\N	2026-02-14 02:47:19.958	\N	\N	\N
cmllpugh50002jx0wgko6rb2o	/profile	GET	13	401	\N	\N	\N	2026-02-14 02:47:20.298	\N	\N	\N
cmllpughc0003jx0wfkf74us2	/theme	GET	51	200	\N	\N	\N	2026-02-14 02:47:20.304	\N	\N	\N
cmllpuo100004jx0wwuywzac1	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 02:47:30.084	\N	\N	\N
cmllpuqwy0008jx0wecbilaa8	/keys	GET	128	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:47:33.827	\N	\N	\N
cmllpurab0009jx0wcf8enz6r	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:47:34.307	\N	\N	\N
cmlls01v70009msw5dxne4oei	/slug/:slug	GET	27	200	\N	\N	\N	2026-02-14 03:47:40.531	\N	\N	\N
cmllpuu07000ajx0wltd7vspl	/security	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:47:37.831	\N	\N	\N
cmllpv4tt000bjx0wifaxlsjt	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:47:51.857	\N	\N	\N
cmllpvutg000cjx0wf4eeojm8	/stats	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:48:25.54	\N	\N	\N
cmllpwi4b000djx0wm0ljebf3	/logs	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:48:55.74	\N	\N	\N
cmllpxgvz000ejx0wuaovxf4d	/health	GET	8	401	\N	\N	\N	2026-02-14 02:49:40.799	\N	\N	\N
cmllpyh02000fjx0w2wew8zdv	/api/csrf-token	GET	7	200	\N	\N	\N	2026-02-14 02:50:27.602	\N	\N	\N
cmllpzqn2000ljx0wi9sja4ll	/stats	GET	45	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:51:26.75	\N	\N	\N
cmllpzr69000mjx0ww1379h5k	/email-templates	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:51:27.441	\N	\N	\N
cmllpzrbn000tjx0wrs0fyjct	/	POST	21	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:51:27.635	\N	\N	\N
cmllpzrgf000xjx0wsz10l42n	/templates/:id	DELETE	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:51:27.807	\N	\N	\N
cmllq0e260000n8b4iqjjud0h	/logs	GET	80	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:51:57.103	\N	\N	\N
cmllq15uj0008n8b4di1n7alf	/templates	POST	32	201	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:52:33.115	\N	\N	\N
cmllq1msi000qn8b43825sli6	/keys	GET	146	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:52:55.075	\N	\N	\N
cmllq1nk1000rn8b4cn31gfxn	/	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:52:56.065	\N	\N	\N
cmllq1per000sn8b4bf5r8bkg	/contestant-visibility	GET	74	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:52:58.467	\N	\N	\N
cmllq1s6g000wn8b4ku26f041	/email-templates	GET	17	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 02:53:02.057	\N	\N	\N
cmllq37560000kgz21x54015g	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:08.107	\N	\N	\N
cmllq39as0001kgz274z5gbd2	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:10.9	\N	\N	\N
cmllq39e00002kgz27ne3r6fo	/schedules	GET	17	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:11.016	\N	\N	\N
cmllq3ajp0003kgz2en6bdp3n	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:12.517	\N	\N	\N
cmllq3c3e0004kgz2sjzvhel5	/current	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:14.522	\N	\N	\N
cmllq3c5o0005kgz2hs92w3t6	/email	GET	169	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:14.605	\N	\N	\N
cmllq3ehk0006kgz2py63d9g1	/theme	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:17.624	\N	\N	\N
cmllq3f700007kgz2vcc8frq3	/files	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:54:18.541	\N	\N	\N
cmllq3jk0000bkgz2jkpbmqb7	/	GET	13	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 02:54:24.192	\N	\N	\N
cmllq4w99000ckgz2y6y8dlsq	/api/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 02:55:27.309	\N	\N	\N
cmllq4wf1000gkgz2szsv5vks	/templates	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:55:27.517	\N	\N	\N
cmllq4wg4000hkgz2royaljje	/	GET	16	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:55:27.556	\N	\N	\N
cmllq5m44000lkgz2stt937y0	/:id	DELETE	36	204	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 02:56:00.821	\N	\N	\N
cmllqls81000okgz233cql77w	/theme	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:08:35.234	\N	\N	\N
cmllqlttx000pkgz2ji46zsai	/scripts/:id/toggle	PATCH	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:08:37.317	\N	\N	\N
cmllqlzy8000ukgz2m65r25c9	/scripts/:scriptId/view-url	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:08:45.249	\N	\N	\N
cmllqq5bu000vkgz2drvc3lbk	/stats	GET	109	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:11:58.842	\N	\N	\N
cmllqq7hl000wkgz295bijayu	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-14 03:12:01.641	\N	\N	\N
cmllqqkrl000xkgz2m6ektj0i	/templates	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:12:18.85	\N	\N	\N
cmllqt32y000ykgz2y2pf4ip1	/theme	GET	137	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:14:15.898	\N	\N	\N
cmllqubq20000t11z1aemd0yr	/theme	GET	84	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:15:13.754	\N	\N	\N
cmllqvg1x0001t11zdy28en7p	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:16:06.021	\N	\N	\N
cmllqvo160004t11ztwcml7kt	/	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:16:16.362	\N	\N	\N
cmllqw1ub0008t11z98vevjc9	/login	POST	150	200	\N	\N	\N	2026-02-14 03:16:34.259	\N	\N	\N
cmllqy4fd002ft11zroctznmj	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:18:10.921	\N	\N	\N
cmllr0yye002gt11zvesrljbg	/database-connection-info	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:20:23.798	\N	\N	\N
cmllr0z39002ht11z5ip5hu3u	/general	GET	123	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:20:23.973	\N	\N	\N
cmllr104m002it11zvzpc9c1x	/	GET	133	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:20:25.319	\N	\N	\N
cmllr1evk002jt11zqzg00qko	/settings	GET	67	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:20:44.432	\N	\N	\N
cmllr6ibg000014d5vr3oga5k	/api/csrf-token	GET	12	200	\N	\N	\N	2026-02-14 03:24:42.172	\N	\N	\N
cmllrc1nf000614d58ebct9yi	/directory	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:29:00.507	\N	\N	\N
cmllrc3c6000714d5bczi0x9k	/logs	GET	106	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:29:02.695	\N	\N	\N
cmllrddxt000814d55nkdblq7	/logs	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:30:03.09	\N	\N	\N
cmllrddz6000914d59z1dwnmj	/stats	GET	87	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:30:03.139	\N	\N	\N
cmllrdx7f000a14d5i72rsc0v	/profile	GET	18	401	\N	\N	\N	2026-02-14 03:30:28.06	\N	\N	\N
cmllrdxg7000b14d5mj5dzayo	/slug/:slug	GET	19	200	\N	\N	\N	2026-02-14 03:30:28.375	\N	\N	\N
cmllre9lb000f14d592qdb4zc	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-14 03:30:44.112	\N	\N	\N
cmllre9lw000g14d510mw7yvj	/theme	GET	52	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 03:30:44.133	\N	\N	\N
cmllree7a000h14d5orm7zepo	/theme	GET	36	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 03:30:50.086	\N	\N	\N
cmllrefo2000i14d5kfumrxs7	/slug/:slug	GET	15	200	\N	\N	\N	2026-02-14 03:30:51.986	\N	\N	\N
cmllreft2000j14d577vdl5i8	/profile	GET	17	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 03:30:52.166	\N	\N	\N
cmllrefv6000k14d5slamaafi	/theme	GET	28	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 03:30:52.243	\N	\N	\N
cmllrgmim000l14d5djv66pbs	/stats	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:32:34.175	\N	\N	\N
cmllrhx10000m14d5vlxex79i	/logs	GET	42	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:33:34.453	\N	\N	\N
cmllrj7px000n14d5abhdsdvi	/stats	GET	138	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:34:34.965	\N	\N	\N
cmllrjuz1000o14d5k52x95wi	/logs	GET	80	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:35:05.101	\N	\N	\N
cmllrl5lr0000msw53fx0pljg	/logs	GET	78	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:36:05.536	\N	\N	\N
cmllrmgaj0001msw5g98go6t6	/stats	GET	50	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:37:06.044	\N	\N	\N
cmllrnqy00002msw5bl3ht33q	/logs	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:38:06.505	\N	\N	\N
cmllrvif90003msw5yb4dousv	/stats	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:44:08.71	\N	\N	\N
cmllrxgbm0004msw57tavfbdg	/stats	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:45:39.298	\N	\N	\N
cmllrzebw0005msw5jy9ta6a0	/stats	GET	45	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:47:10.028	\N	\N	\N
cmlls01vo000amsw5p7s6ku0n	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 03:47:40.548	\N	\N	\N
cmlls47h30004znhgqavf9c3j	/templates	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:50:54.424	\N	\N	\N
cmlls5e66000ccs2yn34cim4c	/templates	GET	66	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:51:49.759	\N	\N	\N
cmlls5ogf000ics2ybnxbcr3a	/instances/:entityType/:entityId	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:52:03.088	\N	\N	\N
cmlls8hh6000jcs2ykvrba1gt	/slug/:slug	GET	19	200	\N	\N	\N	2026-02-14 03:54:14.011	\N	\N	\N
cmlls8rcu000ncs2ygaxzf8yn	/theme	GET	44	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:54:26.814	\N	\N	\N
cmlls8z5v000ocs2ywpt3oiek	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 03:54:36.931	\N	\N	\N
cmlls8z7m000pcs2y31hecz5f	/profile	GET	27	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 03:54:36.994	\N	\N	\N
cmllsb7v9000vcs2yxuxa7q5k	/instances/:entityType/:entityId	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:56:21.525	\N	\N	\N
cmllsbhdw000xcs2yofto6v8f	/slug/:slug	GET	26	200	\N	\N	\N	2026-02-14 03:56:33.86	\N	\N	\N
cmllsd94y000ycs2yi47909gt	/theme	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:57:56.483	\N	\N	\N
cmllsdcxk000zcs2y4v0ueair	/	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:58:01.401	\N	\N	\N
cmllseh3m001ccs2yxssl7c08	/:id/export/excel	POST	119	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:58:53.458	\N	\N	\N
cmllsekqn001fcs2yedblk0yu	/logs	GET	57	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:58:58.176	\N	\N	\N
cmllseqhw001gcs2yai43j2bw	/theme	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:59:05.637	\N	\N	\N
cmllseqoy001hcs2ywer932sa	/categories	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:59:05.89	\N	\N	\N
cmllsew1q001ics2yc0ard3me	/category/:categoryId	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:59:12.83	\N	\N	\N
cmllsf1o6001jcs2yvkd9enp9	/categories	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:59:20.118	\N	\N	\N
cmllsf3un001kcs2yzw42le3x	/category/:categoryId	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:59:22.943	\N	\N	\N
cmllsfj92001lcs2y95bctr99	/	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 03:59:42.902	\N	\N	\N
cmllsgcme001mcs2yyrre75rj	/theme	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:00:20.967	\N	\N	\N
cmllsgcrn001ncs2yot0ijbga	/stats	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:00:21.155	\N	\N	\N
cmllshw1m001ocs2ymnp57kqk	/	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:01:32.795	\N	\N	\N
cmllshxfc001pcs2ybk81wcrv	/password-policy	GET	25	200	\N	\N	\N	2026-02-14 04:01:34.585	\N	\N	\N
cmllskaff002ics2yvhwck66s	/	PUT	42	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:03:24.747	\N	\N	\N
cmlltcwb2002rcs2yz2eo7seg	/stats	GET	183	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:25:39.471	\N	\N	\N
cmlltdjk5002scs2yd35bqxfp	/logs	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:26:09.605	\N	\N	\N
cmllteubb002tcs2yuqanrc49	/theme	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:10.199	\N	\N	\N
cmllteuz8002ucs2ycx7akbdw	/stats	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:11.06	\N	\N	\N
cmllteuzb002vcs2yp7rk7d69	/theme	GET	54	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:11.064	\N	\N	\N
cmlltey6f002wcs2y46rf3e2a	/theme	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:15.208	\N	\N	\N
cmllteydy002xcs2ys9upvea3	/logs	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:15.479	\N	\N	\N
cmlltf3mv002ycs2yb5yakckn	/theme	GET	61	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:22.279	\N	\N	\N
cmlltf929002zcs2y4pa47drq	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 04:27:29.314	\N	\N	\N
cmlltfdbw0030cs2yzyrwisl5	/logs	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:34.845	\N	\N	\N
cmlltfdc50031cs2y1pwzk4u5	/stats	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:34.854	\N	\N	\N
cmlltfgz40032cs2yo3z37ibk	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-14 04:27:39.569	\N	\N	\N
cmlltfh090033cs2ybtrgitcr	/profile	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:39.61	\N	\N	\N
cmlltfh3e0034cs2yfj2f1k9m	/theme	GET	53	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:39.722	\N	\N	\N
cmlltfh3o0035cs2yvxmlp103	/theme	GET	55	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:27:39.732	\N	\N	\N
cmlltfo9n0037cs2ynzvfmsjl	/theme	GET	50	200	\N	\N	\N	2026-02-14 04:27:49.019	\N	\N	\N
cmlltnyh50038cs2yq7uyqlkz	/public	GET	26	200	\N	\N	\N	2026-02-14 04:34:15.498	\N	\N	\N
cmlltnyno0039cs2ys989l7xn	/public	GET	42	200	\N	\N	\N	2026-02-14 04:34:15.732	\N	\N	\N
cmlltnzfv003acs2ydmhrd741	/theme	GET	37	200	\N	\N	\N	2026-02-14 04:34:16.747	\N	\N	\N
cmlltnzq9003bcs2yunop2fj6	/profile	GET	15	401	\N	\N	\N	2026-02-14 04:34:17.121	\N	\N	\N
cmlltnzr5003ccs2yuxyvpfk9	/theme	GET	38	200	\N	\N	\N	2026-02-14 04:34:17.154	\N	\N	\N
cmllto0o7003dcs2ykewafz73	/theme	GET	39	200	\N	\N	\N	2026-02-14 04:34:18.343	\N	\N	\N
cmllto3as003ecs2y9lf26an8	/theme	GET	30	200	\N	\N	\N	2026-02-14 04:34:21.748	\N	\N	\N
cmlltpvtc003fcs2ymq546yy5	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 04:35:45.36	\N	\N	\N
cmllu0q2z0003v25akz5cjibw	/theme	GET	145	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:44:11.147	\N	\N	\N
cmllu1bj10004v25at6rajbj5	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:44:38.942	\N	\N	\N
cmllu1boc0005v25a52mbuqq5	/current	GET	53	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:44:39.133	\N	\N	\N
cmllu1boo0006v25a9aogkfgw	/password-policy	GET	51	200	\N	\N	\N	2026-02-14 04:44:39.145	\N	\N	\N
cmllu1bos0007v25ar6jv5wrn	/database-connection-info	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:44:39.148	\N	\N	\N
cmllu1bpa0008v25a2p4v515w	/security	GET	43	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:44:39.167	\N	\N	\N
cmllugqnw0009v25adsy88lzq	/current	GET	54	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:56:38.397	\N	\N	\N
cmllugqq5000av25atr2gjb1e	/email	GET	212	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:56:38.477	\N	\N	\N
cmlluh23f000bv25a4r42ylto	/stats	GET	111	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 04:56:53.211	\N	\N	\N
cmllum8qe000cv25a08dczr89	/stats	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:00:55.095	\N	\N	\N
cmlluphfo000dv25aeae8oqw3	/logs	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:03:26.34	\N	\N	\N
cmlluqs4q000ev25aopw8smfk	/logs	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:04:26.859	\N	\N	\N
cmllutdb1000fv25a73p4soez	/stats	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:06:27.613	\N	\N	\N
cmlluu0pw000gv25a3i2nlzvp	/logs	GET	62	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:06:57.956	\N	\N	\N
cmlluunz3000hv25ag5gmelpq	/logs	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:07:28.095	\N	\N	\N
cmlluvynp000iv25a96ogdcpi	/logs	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:08:28.598	\N	\N	\N
cmlluwlw4000jv25awy2gqi3r	/stats	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:08:58.709	\N	\N	\N
cmlluyjp1000kv25aw10dfrgj	/logs	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:10:29.173	\N	\N	\N
cmlluz6yc000lv25avhmwfw9x	/logs	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:10:59.316	\N	\N	\N
cmlluz7bi000mv25af073veo2	/logs	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:10:59.791	\N	\N	\N
cmlluzduc000qv25anccbmwqw	/logout	POST	17	200	\N	\N	\N	2026-02-14 05:11:08.244	\N	\N	\N
cmlluzb8b000nv25a943oby8j	/theme	GET	44	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:11:04.859	\N	\N	\N
cmlluzbc3000ov25ars2x8mub	/theme	GET	71	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:11:04.996	\N	\N	\N
cmlluzhoc000rv25aemiowkf9	/theme	GET	39	200	\N	\N	\N	2026-02-14 05:11:13.212	\N	\N	\N
cmlluzhu1000sv25azhbdllav	/theme	GET	58	200	\N	\N	\N	2026-02-14 05:11:13.417	\N	\N	\N
cmllyejvf0020btn5xr1wfnkv	/directory	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:46:54.748	\N	\N	\N
cmllyt1rh002a3e8aunllswzz	/logs	GET	110	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:58:11.117	\N	\N	\N
cmllza1zm000h9u0cmakj136l	/theme	GET	28	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:11:24.563	\N	\N	\N
cmllzuwu5000e12tnsm6xci2r	/profile	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:27:37.662	\N	\N	\N
cmllzv6pu000f12tnd67oss4n	/logs	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:27:50.466	\N	\N	\N
cmlm04yyk000020wxdw8gs6c6	/theme	GET	79	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:35:26.972	\N	\N	\N
cmlm10u1m0008yb8bn1dlia29	/logs	GET	67	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:00:13.595	\N	\N	\N
cmlm1gzef000lyb8b1m1thqcw	/logs	GET	70	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:12:47.032	\N	\N	\N
cmlm1x51i0011yb8bmad6xfhl	/documents	POST	7	404	\N	\N	\N	2026-02-14 08:25:20.838	\N	\N	\N
cmlm1xg1c0012yb8bn8uw4ppu	/multipart	POST	5	404	\N	\N	\N	2026-02-14 08:25:35.089	\N	\N	\N
cmlmpv4yk001uyb8bfcc0t5wj	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:35:38.204	\N	\N	\N
cmlmpy1wm002iyb8be8kt04c1	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-14 19:37:54.214	\N	\N	\N
cmlmpzngw002kyb8b1f3i3dwc	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 19:39:08.816	\N	\N	\N
cmlmpzni7002lyb8b7yko59s5	/profile	GET	16	401	\N	\N	\N	2026-02-14 19:39:08.864	\N	\N	\N
cmlmq36p40035yb8bppw3kbzd	/stats	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:41:53.704	\N	\N	\N
cmlmq4sju003kyb8bq55b1bys	/theme	GET	59	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:43:08.682	\N	\N	\N
cmlmq7kvo003nyb8be75rcesy	/theme	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:45:18.709	\N	\N	\N
cmlmq85n0003pyb8bj4f4m6xg	/theme	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:45:45.612	\N	\N	\N
cmlmqj4pd005pyb8bgt7iyqjj	/theme	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:54:17.618	\N	\N	\N
cmlmqk6si006jyb8bswwv9whc	/email	GET	145	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:55:06.978	\N	\N	\N
cmlmql5f8006kyb8bztv6jk1c	/theme	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:55:51.86	\N	\N	\N
cmlmqlnrt006nyb8briwiji0t	/	PUT	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:56:15.641	\N	\N	\N
cmlmqm654006tyb8brzytawsj	/theme	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:56:39.448	\N	\N	\N
cmlmqm67d006uyb8bfji8fz5p	/	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:56:39.53	\N	\N	\N
cmlluzjvg000tv25a0g8pjecw	/slug/:slug	GET	37	200	\N	\N	\N	2026-02-14 05:11:16.06	\N	\N	\N
cmllyj2ta00003e8a5iqanzu7	/directory	GET	130	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:25.918	\N	\N	\N
cmllyj52u00053e8ariht89qs	/stats	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:28.855	\N	\N	\N
cmllyj54p00063e8a19oco8dq	/stats	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:28.921	\N	\N	\N
cmllyj56g00073e8acsufl9o8	/stats	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:28.984	\N	\N	\N
cmllyj6z6000n3e8ag9icrrtk	/	GET	20	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:50:31.314	\N	\N	\N
cmllyj83b000z3e8ajyj48gpi	/	GET	16	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:50:32.759	\N	\N	\N
cmllyj95100193e8aauqfv3n8	/directory	GET	46	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:50:34.118	\N	\N	\N
cmllyj9b4001a3e8aouteaq1u	/stats	GET	12	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:50:34.337	\N	\N	\N
cmllyj9e1001b3e8a0mjlwdmf	/scripts	GET	18	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:50:34.441	\N	\N	\N
cmllyjgp5001c3e8ae9xs5ju7	/files/:filename	HEAD	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:43.913	\N	\N	\N
cmllylki5001j3e8apd6gfsht	/logs	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:22.157	\N	\N	\N
cmllyp5vs00283e8ar3n8yns6	/logs	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:55:09.833	\N	\N	\N
cmllyvn0c002b3e8adczo1xye	/stats	GET	73	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:00:11.964	\N	\N	\N
cmllyw0qh002c3e8aprbfj7gr	/theme	GET	51	200	\N	\N	\N	2026-02-14 07:00:29.754	\N	\N	\N
cmllzabav000i9u0cqes910pp	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 07:11:36.631	\N	\N	\N
cmllzabia000k9u0cn33d0vau	/theme	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:11:36.898	\N	\N	\N
cmllzv6rq000g12tnwhdbnvct	/stats	GET	99	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:27:50.535	\N	\N	\N
cmllzv9eo000h12tncfmyrrdt	/theme	GET	45	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:27:53.952	\N	\N	\N
cmlm05fbu000120wxfleqzium	/:entityType	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:35:48.186	\N	\N	\N
cmlm11hbl0009yb8b5hdy6itn	/logs	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:00:43.761	\N	\N	\N
cmlm1hmpu000myb8bhk8jhep8	/stats	GET	73	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:13:17.251	\N	\N	\N
cmlm2104h0014yb8b36zf7ta8	/v1/media	POST	15	403	\N	\N	\N	2026-02-14 08:28:21.089	\N	\N	\N
cmlmpvrll0021yb8bbe557x52	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-14 19:36:07.545	\N	\N	\N
cmlmpw0ex0025yb8bgedrgosi	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 19:36:18.97	\N	\N	\N
cmlmq36p80036yb8bbia7q06q	/theme	GET	58	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:41:53.709	\N	\N	\N
cmlmq37cs0037yb8b9y0suizz	/	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:41:54.557	\N	\N	\N
cmlmq3c4m003byb8b65iwsvc5	/theme	GET	88	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:42:00.742	\N	\N	\N
cmlmq3cuw003cyb8bstyi3htu	/:id/download	GET	131	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:42:01.689	\N	\N	\N
cmlmq3gb4003dyb8b9flirngr	/:id/download	GET	16	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:42:06.16	\N	\N	\N
cmlmqk6o2006iyb8b4n13db92	/contestant-visibility	GET	29	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:55:06.819	\N	\N	\N
cmllv06rx000uv25asubs0d5x	/theme	GET	29	200	\N	\N	\N	2026-02-14 05:11:45.741	\N	\N	\N
cmllv073y000vv25a47wf8mtd	/profile	GET	15	401	\N	\N	\N	2026-02-14 05:11:46.175	\N	\N	\N
cmllv7034000wv25acv83ufiq	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 05:17:03.664	\N	\N	\N
cmllv70gm000xv25afcjtlkj6	/slug/:slug	GET	23	200	\N	\N	\N	2026-02-14 05:17:04.151	\N	\N	\N
cmllv70in000yv25axqq8lt0d	/theme	GET	56	200	\N	\N	\N	2026-02-14 05:17:04.224	\N	\N	\N
cmllv75dx000zv25amcztdoc4	/theme	GET	78	200	\N	\N	\N	2026-02-14 05:17:10.533	\N	\N	\N
cmllv78vp0010v25axttfu6uy	/slug/:slug	GET	26	200	\N	\N	\N	2026-02-14 05:17:15.061	\N	\N	\N
cmllv78wa0011v25ak6x4m67y	/theme	GET	57	200	\N	\N	\N	2026-02-14 05:17:15.082	\N	\N	\N
cmllv78wf0012v25azj19egei	/profile	GET	15	401	\N	\N	\N	2026-02-14 05:17:15.087	\N	\N	\N
cmllv79100013v25a8eexfrnq	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 05:17:15.253	\N	\N	\N
cmllv8sq00014v25amqxu5k8m	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 05:18:27.432	\N	\N	\N
cmllv8sql0015v25a6elvalq2	/slug/:slug	GET	25	200	\N	\N	\N	2026-02-14 05:18:27.453	\N	\N	\N
cmllv8ssg0016v25a9hztjjsn	/profile	GET	30	401	\N	\N	\N	2026-02-14 05:18:27.52	\N	\N	\N
cmllv8sty0017v25a3nmx29vx	/theme	GET	99	200	\N	\N	\N	2026-02-14 05:18:27.574	\N	\N	\N
cmllv8viu0018v25abb43kggq	/theme	GET	44	200	\N	\N	\N	2026-02-14 05:18:31.062	\N	\N	\N
cmllv8voi0019v25axwgoq9j0	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-14 05:18:31.266	\N	\N	\N
cmllv8vur001av25aqrey9kc5	/profile	GET	57	401	\N	\N	\N	2026-02-14 05:18:31.491	\N	\N	\N
cmllv9811001bv25a27vwwdn1	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 05:18:47.269	\N	\N	\N
cmllv982i001cv25a6yw4r7ts	/profile	GET	16	401	\N	\N	\N	2026-02-14 05:18:47.323	\N	\N	\N
cmllv9837001dv25am8mru2zj	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-14 05:18:47.347	\N	\N	\N
cmllvbbho001ev25an0gvqqmg	/slug/:slug	GET	27	200	\N	\N	\N	2026-02-14 05:20:25.068	\N	\N	\N
cmllvbbqg001fv25ahkr855ib	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 05:20:25.385	\N	\N	\N
cmllvbbrz001gv25av27ahp31	/profile	GET	15	401	\N	\N	\N	2026-02-14 05:20:25.44	\N	\N	\N
cmllvbbur001hv25aasvlh5mv	/public	GET	53	200	\N	\N	\N	2026-02-14 05:20:25.54	\N	\N	\N
cmllvc4ub001iv25anfx9wujt	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 05:21:03.108	\N	\N	\N
cmllvc5sn001jv25aeaz9a9ku	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 05:21:04.344	\N	\N	\N
cmllvc5u7001kv25ap534itj2	/slug/:slug	GET	42	200	\N	\N	\N	2026-02-14 05:21:04.4	\N	\N	\N
cmllvgurq001lv25adgkas20z	/slug/:slug	GET	49	200	\N	\N	\N	2026-02-14 05:24:43.334	\N	\N	\N
cmllvgusu001mv25ae5dxypd0	/slug/:slug	GET	55	200	\N	\N	\N	2026-02-14 05:24:43.375	\N	\N	\N
cmllvguuh001nv25ayj47agze	/profile	GET	74	401	\N	\N	\N	2026-02-14 05:24:43.434	\N	\N	\N
cmllvmiy9001ov25al03sh7k3	/public	GET	27	200	\N	\N	\N	2026-02-14 05:29:07.954	\N	\N	\N
cmllvmne7001pv25akalcaset	/theme	GET	28	200	\N	\N	\N	2026-02-14 05:29:13.711	\N	\N	\N
cmllvmsbr001qv25a1mrpl0ck	/public	GET	36	200	\N	\N	\N	2026-02-14 05:29:20.104	\N	\N	\N
cmllvuzd7001rv25axr3zepar	/profile	GET	11	401	\N	\N	\N	2026-02-14 05:35:42.475	\N	\N	\N
cmllw445k001sv25awut6scp0	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-14 05:42:48.585	\N	\N	\N
cmllw446d001tv25adlxqfwge	/profile	GET	14	401	\N	\N	\N	2026-02-14 05:42:48.613	\N	\N	\N
cmllw4476001uv25at5c9c294	/theme	GET	86	200	\N	\N	\N	2026-02-14 05:42:48.643	\N	\N	\N
cmllw45p6001vv25a1yfiwzxy	/slug/:slug	GET	54	200	\N	\N	\N	2026-02-14 05:42:50.587	\N	\N	\N
cmllw4c6d001wv25adtpyssb8	/theme	GET	37	200	\N	\N	\N	2026-02-14 05:42:58.981	\N	\N	\N
cmllw4gat001xv25apk0gx06n	/profile	GET	11	401	\N	\N	\N	2026-02-14 05:43:04.326	\N	\N	\N
cmllw4gaw001yv25asem8qubp	/theme	GET	55	200	\N	\N	\N	2026-02-14 05:43:04.328	\N	\N	\N
cmllw4qew001zv25a8nc8x30g	/slug/:slug	GET	23	200	\N	\N	\N	2026-02-14 05:43:17.433	\N	\N	\N
cmllwmhtp0020v25acttf8v71	/v1/auth/login	POST	10	403	\N	\N	\N	2026-02-14 05:57:06.11	\N	\N	\N
cmllwmhww0021v25aia04uhko	/v1/auth/login	POST	12	403	\N	\N	\N	2026-02-14 05:57:06.224	\N	\N	\N
cmllwmyw90028v25al320uq9t	/login	POST	129	200	\N	\N	\N	2026-02-14 05:57:28.234	\N	\N	\N
cmllwmyxi0029v25a97o3cgla	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 05:57:28.279	\N	\N	\N
cmllwpo64002pv25a8l6b0v06	/	GET	61	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:59:34.298	\N	\N	\N
cmllwpo8s002qv25auffffuf8	/directory	GET	77	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:59:34.397	\N	\N	\N
cmllwpobp002rv25a1y0uv3pb	/categories	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:59:34.501	\N	\N	\N
cmllwpody002sv25azfyq1hka	/stats	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 05:59:34.582	\N	\N	\N
cmllwpp1z002vv25a78n0v8dy	/	GET	13	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 05:59:35.448	\N	\N	\N
cmllwpp4j002wv25alhqkeh3w	/directory	GET	29	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 05:59:35.54	\N	\N	\N
cmllwpp62002xv25a6xy2am9m	/	GET	33	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 05:59:35.594	\N	\N	\N
cmllwpp7d002yv25acgzapdng	/categories	GET	26	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 05:59:35.641	\N	\N	\N
cmllwpphk0030v25ahwpy1bsl	/	GET	22	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 05:59:36.009	\N	\N	\N
cmllwppiw0031v25awfs7pkcu	/directory	GET	26	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 05:59:36.057	\N	\N	\N
cmllwppox0032v25a5b18zck8	/stats	GET	12	403	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 05:59:36.273	\N	\N	\N
cmllwppuv0034v25aw3wo0t1v	/	GET	18	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 05:59:36.487	\N	\N	\N
cmllwpq200035v25a0s5uvfz2	/stats	GET	17	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 05:59:36.745	\N	\N	\N
cmllwpq2z0036v25ar7h06o18	/stats	GET	17	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 05:59:36.78	\N	\N	\N
cmllwpq4y0037v25a68cguunj	/overview	GET	22	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 05:59:36.85	\N	\N	\N
cmllwpqa60039v25aimw3jeqh	/directory	GET	24	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 05:59:37.039	\N	\N	\N
cmllwpqvr003dv25aqxkccsyr	/	GET	13	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 05:59:37.815	\N	\N	\N
cmllwpyzd003ev25an1jqngdd	/directory	GET	36	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 05:59:48.313	\N	\N	\N
cmllwq9wc003gv25ac0aqb21r	/pending	GET	30	500	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:00:02.461	\N	\N	\N
cmllwul170003cas3n7qdlm7v	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 06:03:23.516	\N	\N	\N
cmllwuuhx000mcas3bolfrv8z	/pending	GET	19	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:03:35.782	\N	\N	\N
cmllwuujg000ncas3mxrjyqgh	/	GET	35	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:03:35.836	\N	\N	\N
cmllwuuou000ocas3b54omgg4	/	GET	35	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:03:36.03	\N	\N	\N
cmllwv1fd000pcas30mk1v9wr	/assignments	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:03:44.761	\N	\N	\N
cmllwv1hr000qcas38682ifi9	/stats	GET	22	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:03:44.847	\N	\N	\N
cmllwv1np000rcas3d28thrwq	/pending	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:03:45.061	\N	\N	\N
cmllwv1vb000scas3zk5wvw9t	/categories	GET	26	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:03:45.336	\N	\N	\N
cmllwv1yo000tcas351n8e10p	/stats	GET	15	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:03:45.457	\N	\N	\N
cmllwv25e000ucas3ia73k8vp	/	GET	13	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:03:45.699	\N	\N	\N
cmllwv2wy000vcas3gyjrx3hm	/pending	GET	15	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:03:46.69	\N	\N	\N
cmllwv32z000wcas3ascy2jcd	/	GET	29	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:03:46.908	\N	\N	\N
cmllwv35g000xcas3sd1o6ofb	/assignments	GET	19	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:03:46.996	\N	\N	\N
cmllyj4wf00043e8acfvl0zx6	/directory	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:28.624	\N	\N	\N
cmllyj5xg000d3e8a1h7tbkus	/stats	GET	14	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:50:29.956	\N	\N	\N
cmllyj6kj000j3e8aeae8bipm	/stats	GET	12	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:50:30.787	\N	\N	\N
cmllyj70s000o3e8ah2v9v5ty	/directory	GET	27	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:50:31.372	\N	\N	\N
cmllyj73u000p3e8a0t8qlt77	/categories	GET	23	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:50:31.483	\N	\N	\N
cmllyj78v000q3e8axnqnp9k7	/stats	GET	14	403	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:50:31.663	\N	\N	\N
cmllyj7by000r3e8a2qidlsxw	/overview	GET	35	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:50:31.774	\N	\N	\N
cmllyj7ko000v3e8afp4opl2f	/login	POST	129	200	\N	\N	\N	2026-02-14 06:50:32.088	\N	\N	\N
cmllyj7na000w3e8a9ryr9k9q	/	GET	23	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:50:32.182	\N	\N	\N
cmllyw106002d3e8az49k5ujp	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-14 07:00:30.102	\N	\N	\N
cmllywjwr002i3e8anuf7q7vv	/theme	GET	44	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:00:54.603	\N	\N	\N
cmllywjyx002j3e8aelyfsjbb	/theme	GET	27	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:00:54.681	\N	\N	\N
cmllzabc8000j9u0cxtfied65	/slug/:slug	GET	19	200	\N	\N	\N	2026-02-14 07:11:36.681	\N	\N	\N
cmllzaeek000m9u0cc8n5mcz0	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 07:11:40.652	\N	\N	\N
cmllzaeez000n9u0cptw4s45n	/slug/:slug	GET	35	200	\N	\N	\N	2026-02-14 07:11:40.668	\N	\N	\N
cmllzci4f000o9u0cnyerk7n0	/	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:13:18.783	\N	\N	\N
cmllze5zu000r9u0cw7fq31f0	/profile	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:14:36.379	\N	\N	\N
cmllzvjsb000i12tneexync9y	/profile	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:28:07.404	\N	\N	\N
cmlm0bw2a000220wxjaw8oo6b	/	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:40:49.81	\N	\N	\N
cmlm12ry2000ayb8b23lcuodk	/stats	GET	34	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:01:44.186	\N	\N	\N
cmlm1jkdp000nyb8blwnhlfap	/logs	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:14:47.533	\N	\N	\N
cmlm22art001eyb8b9pf1n9mb	/stats	GET	89	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:29:21.546	\N	\N	\N
cmlmpvrp80022yb8bg1z7u5f0	/theme	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:36:07.676	\N	\N	\N
cmlmq39n60039yb8bkntbi1hc	/slug/:slug	GET	22	200	\N	\N	\N	2026-02-14 19:41:57.522	\N	\N	\N
cmlmq5fts003lyb8b5ezw0xmf	/logs	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:43:38.848	\N	\N	\N
cmlmqlnty006oyb8bondq9smr	/stats	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:56:15.718	\N	\N	\N
cmlmqlnu0006pyb8b57ybms64	/	GET	39	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:56:15.72	\N	\N	\N
cmlmqlt4f006qyb8b0fc2isil	/profile	GET	21	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:56:22.575	\N	\N	\N
cmllwv3eg000ycas34lmqwdsc	/	GET	23	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:03:47.32	\N	\N	\N
cmllwv3ul0011cas36s9uryee	/	GET	32	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:03:47.9	\N	\N	\N
cmllwv3vj0012cas37nw6jx7m	/categories	GET	14	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:03:47.935	\N	\N	\N
cmllwv3zw0013cas38t5f4q2r	/stats	GET	13	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:03:48.093	\N	\N	\N
cmllyj5as00083e8atb4dwgqf	/overview	GET	70	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:29.141	\N	\N	\N
cmllyj5ji000c3e8ai3npn1rw	/login	POST	134	200	\N	\N	\N	2026-02-14 06:50:29.454	\N	\N	\N
cmllyj6cj000h3e8a4dwq7xor	/directory	GET	29	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:50:30.5	\N	\N	\N
cmllyj6e8000i3e8au2tu3fjy	/	GET	30	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:50:30.561	\N	\N	\N
cmllyj7wg000x3e8ae6s5f1qi	/stats	GET	18	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:50:32.513	\N	\N	\N
cmllyj7y4000y3e8amj7c2j6k	/stats	GET	23	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:50:32.572	\N	\N	\N
cmllyj8v100133e8aqker56gl	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:50:33.758	\N	\N	\N
cmllyj8zu00173e8aurgvk6ze	/login	POST	131	200	\N	\N	\N	2026-02-14 06:50:33.93	\N	\N	\N
cmllyj91700183e8aos2lr03m	/	GET	18	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:50:33.98	\N	\N	\N
cmllyjq1e001d3e8aqia61mlf	/directory	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:56.018	\N	\N	\N
cmllyjr1m001h3e8andx6j9o1	/files/:filename	HEAD	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:50:57.323	\N	\N	\N
cmllykddj001i3e8anzxc5zom	/directory	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:51:26.264	\N	\N	\N
cmllylsuo001q3e8a8hhpmf22	/stats	GET	53	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:32.977	\N	\N	\N
cmllylvz8001s3e8a0q973dxc	/slug/:slug	GET	31	200	\N	\N	\N	2026-02-14 06:52:37.028	\N	\N	\N
cmllylw26001t3e8a3sg00ir3	/v1/settings/public	GET	15	404	\N	\N	\N	2026-02-14 06:52:37.134	\N	\N	\N
cmllywjvs002h3e8anbh21q4a	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 07:00:54.568	\N	\N	\N
cmllyymgo002k3e8alcg9202g	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 07:02:31.224	\N	\N	\N
cmllyymk3002l3e8agnqsiwpw	/theme	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:02:31.347	\N	\N	\N
cmllzabiz000l9u0cc80292c6	/directory	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:11:36.924	\N	\N	\N
cmllzd1sg000p9u0czs160bj2	/scripts/:scriptId/view-url	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:13:44.272	\N	\N	\N
cmllzd1vd000q9u0cig2pc41h	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 07:13:44.377	\N	\N	\N
cmllzxcvh000j12tnvtiytv54	/slug/:slug	GET	16	200	\N	\N	\N	2026-02-14 07:29:31.758	\N	\N	\N
cmllzxcx6000k12tnr90jjqzo	/slug/:slug	GET	20	200	\N	\N	\N	2026-02-14 07:29:31.818	\N	\N	\N
cmlm0jy4f0000v98un54oq8yx	/slug/:slug	GET	23	200	\N	\N	\N	2026-02-14 07:47:05.727	\N	\N	\N
cmlm0jy7g0001v98uk09eg8py	/profile	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:47:05.836	\N	\N	\N
cmlm13f7j000byb8b30npyxg2	/stats	GET	71	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:02:14.335	\N	\N	\N
cmlm17apb000dyb8biq2tunjs	/logs	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:05:15.119	\N	\N	\N
cmlm1k7nb000oyb8b6laq95ze	/stats	GET	70	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:15:17.687	\N	\N	\N
cmlm23l82001fyb8byqd6z7r6	/stats	GET	41	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:30:21.746	\N	\N	\N
cmlmpw0fs0026yb8b4uu0feue	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-14 19:36:19	\N	\N	\N
cmlmpw0gg0027yb8bw4e70g65	/profile	GET	17	401	\N	\N	\N	2026-02-14 19:36:19.024	\N	\N	\N
cmlmpw9ih0029yb8bdjqx06jj	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:36:30.761	\N	\N	\N
cmlmpw9k0002ayb8bwn1w8v9g	/profile	GET	11	401	\N	\N	\N	2026-02-14 19:36:30.817	\N	\N	\N
cmlmpxmpo002eyb8bbfkt8avp	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 19:37:34.524	\N	\N	\N
cmlmq3c2y003ayb8b76j0aa7g	/slug/:slug	GET	39	200	\N	\N	\N	2026-02-14 19:42:00.683	\N	\N	\N
cmlmq5fu1003myb8bdqkc2tr6	/stats	GET	49	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:43:38.857	\N	\N	\N
cmllwv3gz000zcas33ew455nf	/	GET	22	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:03:47.411	\N	\N	\N
cmllwv3rh0010cas32r1cckzf	/	GET	25	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:03:47.79	\N	\N	\N
cmllxlwuw0014cas3oz534zer	/v1/csrf/token	GET	13	401	\N	\N	\N	2026-02-14 06:24:38.552	\N	\N	\N
cmllxm0f40015cas3faveqh3w	/v1/csrf/token	GET	10	401	\N	\N	\N	2026-02-14 06:24:43.168	\N	\N	\N
cmllxm6we0016cas3qunbvwck	/v1/csrf/token	GET	10	401	\N	\N	\N	2026-02-14 06:24:51.566	\N	\N	\N
cmllxm8ib0017cas3qua0ytcr	/v1/csrf/token	GET	11	401	\N	\N	\N	2026-02-14 06:24:53.651	\N	\N	\N
cmllxm9xp0018cas3knhgdzdn	/v1/csrf/token	GET	9	401	\N	\N	\N	2026-02-14 06:24:55.501	\N	\N	\N
cmllxmdoz0019cas3xy297ur9	/v1/csrf/token	GET	11	401	\N	\N	\N	2026-02-14 06:25:00.371	\N	\N	\N
cmllxn7tv001dcas3pl630mn9	/scripts	GET	17	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:25:39.428	\N	\N	\N
cmllxn8dn001hcas3gvjdvpzh	/categories	GET	27	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:25:40.14	\N	\N	\N
cmllxn8ij001icas3ynddqea5	/stats	GET	13	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:25:40.315	\N	\N	\N
cmllxn8ky001jcas35jvs7vp8	/overview	GET	12	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:25:40.403	\N	\N	\N
cmllxn8ok001kcas3nqk7g83f	/api/v1/csrf-token	GET	1	200	\N	\N	\N	2026-02-14 06:25:40.533	\N	\N	\N
cmllxn8w5001ocas39p5zb6ji	/	GET	27	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:25:40.805	\N	\N	\N
cmllxn97j001pcas3fhgoc7ft	/scripts	GET	12	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:25:41.215	\N	\N	\N
cmllxn9cr001qcas3c9e79y9p	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:25:41.404	\N	\N	\N
cmllxn9nl001ucas34tm3jsz8	/	GET	30	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:25:41.794	\N	\N	\N
cmllxn9tl001vcas364xjwm6k	/stats	GET	17	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:25:42.01	\N	\N	\N
cmllxna6p001zcas3f780taq2	/	GET	13	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:25:42.481	\N	\N	\N
cmllxnahe0020cas3y4c35frv	/stats	GET	19	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:25:42.866	\N	\N	\N
cmllxnaog0021cas3rjkwjmdc	/	GET	18	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:25:43.12	\N	\N	\N
cmllxnayi0025cas3tt60n4oz	/directory	GET	27	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:25:43.482	\N	\N	\N
cmllxnb2h0026cas3ywnamdti	/assignments	GET	15	403	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:25:43.625	\N	\N	\N
cmllxnbpi002acas3urds7u9w	/stats	GET	12	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:25:44.454	\N	\N	\N
cmllxnbt3002bcas32xxhbat9	/scripts	GET	12	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:25:44.583	\N	\N	\N
cmllxo9zs002ccas3hy9xyt2f	/	GET	14	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:26:28.888	\N	\N	\N
cmllxob8t002dcas31r3nd0ms	/	GET	15	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:26:30.509	\N	\N	\N
cmllxobb9002ecas3fthj0z6g	/	GET	13	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:26:30.597	\N	\N	\N
cmllxqzwb002icas3u66tq5lb	/directory	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:28:35.771	\N	\N	\N
cmllxr055002jcas37ktu91no	/stats	GET	23	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:28:36.09	\N	\N	\N
cmllxr0b2002kcas3r8tb091x	/	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:28:36.302	\N	\N	\N
cmllxr0st002ocas3vcibzqpy	/stats	GET	12	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:28:36.941	\N	\N	\N
cmllxr0yq002pcas3sd0btmow	/pending	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:28:37.155	\N	\N	\N
cmllxr114002qcas3q8m8q84l	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:28:37.24	\N	\N	\N
cmllxr18e002ucas32plgv18l	/	GET	23	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:28:37.503	\N	\N	\N
cmllxr1fh002vcas3uafg8pu5	/stats	GET	15	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:28:37.758	\N	\N	\N
cmllxr1gx002wcas38io6tevn	/stats	GET	17	403	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:28:37.809	\N	\N	\N
cmllxr1ly002xcas3rlzev6v8	/overview	GET	41	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:28:37.991	\N	\N	\N
cmllxr1tu0031cas3yjibz8t2	/login	POST	126	200	\N	\N	\N	2026-02-14 06:28:38.275	\N	\N	\N
cmllxr1za0032cas320qkfsjn	/	GET	23	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:28:38.47	\N	\N	\N
cmllxr2260033cas3hsuits8n	/assignments	GET	12	403	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:28:38.574	\N	\N	\N
cmllxr23h0034cas38qc6j86f	/stats	GET	17	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:28:38.621	\N	\N	\N
cmllxr2bu0035cas3comhvjv4	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:28:38.922	\N	\N	\N
cmllxr2gd0039cas3pi6fb8j2	/login	POST	126	200	\N	\N	\N	2026-02-14 06:28:39.085	\N	\N	\N
cmllxr2m0003acas34587w550	/	GET	22	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:28:39.289	\N	\N	\N
cmllxr2px003bcas3a0jiq6nl	/stats	GET	14	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:28:39.43	\N	\N	\N
cmllxr2v8003ccas32qrqpo7r	/overview	GET	21	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:28:39.62	\N	\N	\N
cmllxr35q003gcas3p4f26jvz	/	GET	23	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:28:39.998	\N	\N	\N
cmllxr393003hcas34nsecm12	/	GET	28	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:28:40.119	\N	\N	\N
cmllxr3ju003icas3eit5pcyh	/	GET	13	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:28:40.506	\N	\N	\N
cmllxr3v9003mcas37en81yn8	/	GET	30	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:40.918	\N	\N	\N
cmllxr3xq003ncas32ptd6y2j	/assignments	GET	14	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:41.006	\N	\N	\N
cmllxr42l003ocas3rmvan5mf	/scripts	GET	12	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:41.181	\N	\N	\N
cmllxrcrw0003ng15vf4kvaum	/login	POST	166	200	\N	\N	\N	2026-02-14 06:28:52.46	\N	\N	\N
cmllxrdbs0004ng15gj69umev	/overview	GET	66	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:28:53.177	\N	\N	\N
cmllxrdsm0008ng15id7hoftp	/categories	GET	29	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:28:53.782	\N	\N	\N
cmllxrdyq0009ng15275dmk11	/scripts	GET	13	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:28:54.002	\N	\N	\N
cmllxre2j000ang15wjcldrig	/	GET	16	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:28:54.14	\N	\N	\N
cmllxreok000eng150eyexlt5	/overview	GET	34	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:28:54.932	\N	\N	\N
cmllxresg000fng15773oqxj6	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:28:55.072	\N	\N	\N
cmllxrf4p000jng15t2iq0ikg	/categories	GET	23	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:28:55.514	\N	\N	\N
cmllxrf5w000kng154ulzdg6t	/assignments	GET	13	403	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:28:55.556	\N	\N	\N
cmllxrfdd000lng15fnujga9o	/pending	GET	15	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:28:55.825	\N	\N	\N
cmllxrfqi000png15evs9ch9d	/categories	GET	23	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:28:56.298	\N	\N	\N
cmllxrfyr000qng15uzdsiaiy	/pending	GET	14	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:28:56.596	\N	\N	\N
cmllxrg4t000ung15dg9x1l8h	/login	POST	113	200	\N	\N	\N	2026-02-14 06:28:56.813	\N	\N	\N
cmllxrg8u000vng15yjs1weab	/directory	GET	24	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:28:56.958	\N	\N	\N
cmllxrgf6000wng15r9lng0cr	/stats	GET	14	403	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:28:57.186	\N	\N	\N
cmllxrglg000xng15ylehxde1	/	GET	16	200	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:28:57.412	\N	\N	\N
cmllxrgmj000yng15elk3p3wn	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 06:28:57.451	\N	\N	\N
cmllxrgs90012ng15r8rk7c9k	/	GET	15	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:57.658	\N	\N	\N
cmllxrgtl0013ng15ke1eso42	/	GET	19	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:57.705	\N	\N	\N
cmllxsgsp0017ng15gvl6g843	/	GET	25	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:29:44.329	\N	\N	\N
cmllylklq001k3e8a1y09uond	/stats	GET	103	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:22.287	\N	\N	\N
cmllylvyj001r3e8a2n24j12c	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:52:37.004	\N	\N	\N
cmllymb6u001z3e8a6lojqm53	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:52:56.743	\N	\N	\N
cmllymb8400203e8awvyv16wv	/theme	GET	59	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:56.788	\N	\N	\N
cmllymg2100223e8a54td7ok2	/stats	GET	64	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:53:03.05	\N	\N	\N
cmllymg2r00233e8a44zsj0cu	/theme	GET	102	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:53:03.075	\N	\N	\N
cmllyz26f002m3e8an2plh7cx	/directory	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:02:51.591	\N	\N	\N
cmllzfqap000s9u0ci86p37uw	/theme	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:15:49.345	\N	\N	\N
cmllzfqbj000t9u0c1iw397r1	/profile	GET	20	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:15:49.376	\N	\N	\N
cmllzfqgo000u9u0ct1ongs4y	/theme	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:15:49.561	\N	\N	\N
cmllzxcy6000l12tnntueujj2	/profile	GET	24	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:29:31.855	\N	\N	\N
cmlm0jy7q0002v98uyws59omd	/theme	GET	72	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:47:05.846	\N	\N	\N
cmlm160kc000cyb8byql855ai	/stats	GET	36	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:04:15.324	\N	\N	\N
cmlm1nfwl000pyb8bqrv6ezqj	/stats	GET	97	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:17:48.357	\N	\N	\N
cmlm1pdnl000ryb8bhnkb2etq	/stats	GET	42	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:19:18.754	\N	\N	\N
cmlm24vpv001gyb8bmtsrpxng	/logs	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:31:22.003	\N	\N	\N
cmlm24vpz001hyb8b39gdokj4	/stats	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:31:22.007	\N	\N	\N
cmlmpw1h00028yb8bs2p5m81w	/public	GET	56	200	\N	\N	\N	2026-02-14 19:36:20.34	\N	\N	\N
cmlmpxmr4002fyb8bctzibdaf	/theme	GET	76	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:37:34.577	\N	\N	\N
cmlmpznxs002oyb8bsdzb9jjq	/theme	GET	59	200	\N	\N	\N	2026-02-14 19:39:09.424	\N	\N	\N
cmlmpzo7p002pyb8b9sma2ivo	/slug/:slug	GET	24	200	\N	\N	\N	2026-02-14 19:39:09.781	\N	\N	\N
cmlmq19nw002uyb8b0dktdtyn	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 19:40:24.236	\N	\N	\N
cmlmq19os002vyb8b9zx32ate	/theme	GET	29	200	\N	\N	\N	2026-02-14 19:40:24.268	\N	\N	\N
cmlmq8zh5003qyb8bdn92ugbv	/categories	GET	41	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:46:24.281	\N	\N	\N
cmllxrgxe0014ng15k4ryqxq7	/	GET	35	200	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:57.843	\N	\N	\N
cmllxrgyj0015ng15rjmh3dpx	/categories	GET	12	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:57.884	\N	\N	\N
cmllxrh0y0016ng15gep2x50e	/stats	GET	12	403	cmljlirqy001lob68xujtv9oi	\N	\N	2026-02-14 06:28:57.971	\N	\N	\N
cmllxzy6j0003btn5wkisq5a6	/categories	GET	33	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:35:33.452	\N	\N	\N
cmllxzy9n0004btn5pw8320cd	/stats	GET	19	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:35:33.564	\N	\N	\N
cmllxzyja0005btn5azt963do	/pending	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:35:33.911	\N	\N	\N
cmllxzyrt0009btn5uytfiqyu	/	GET	18	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:35:34.217	\N	\N	\N
cmllxzz5y000abtn5w2vt6h3j	/overview	GET	11	403	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:35:34.726	\N	\N	\N
cmllxzzdp000ebtn5qom1pvy7	/login	POST	121	200	\N	\N	\N	2026-02-14 06:35:35.005	\N	\N	\N
cmllxzzhj000fbtn55bquagnh	/directory	GET	26	200	cmljlirmz000kob68oyxznmzh	\N	\N	2026-02-14 06:35:35.143	\N	\N	\N
cmllxzzuu000gbtn5tlr99q9k	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:35:35.622	\N	\N	\N
cmlly000d000kbtn5yjqus7u2	/	GET	15	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:35:35.822	\N	\N	\N
cmlly006e000lbtn5si4na9r6	/categories	GET	22	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:35:36.038	\N	\N	\N
cmlly00gx000mbtn5dq1vh4yj	/	GET	16	200	cmljlirnl000sob68a6phas6e	\N	\N	2026-02-14 06:35:36.418	\N	\N	\N
cmlly00qm000qbtn5wxsvew1d	/directory	GET	27	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:35:36.767	\N	\N	\N
cmlly00xi000rbtn5bi7sqc6c	/stats	GET	20	200	cmljlirlw000gob68u4qq1mj1	\N	\N	2026-02-14 06:35:37.014	\N	\N	\N
cmlly01ge000vbtn5ebu81pun	/categories	GET	13	403	cmljlirkm000aob68y6pykq2w	\N	\N	2026-02-14 06:35:37.695	\N	\N	\N
cmlly01w9000zbtn5ween6cyf	/login	POST	129	200	\N	\N	\N	2026-02-14 06:35:38.266	\N	\N	\N
cmlly0b5b0010btn5qlpo9977	/	GET	21	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:35:50.255	\N	\N	\N
cmlly0h660011btn5djygmtr8	/profile	GET	22	200	cmljliro40011ob68rvlxi3jv	\N	\N	2026-02-14 06:35:58.063	\N	\N	\N
cmlly3z7h0012btn56it4kqvw	/slug/:slug	GET	41	200	\N	\N	\N	2026-02-14 06:38:41.405	\N	\N	\N
cmlly3z8a0013btn57a69zds5	/theme	GET	74	200	\N	\N	\N	2026-02-14 06:38:41.435	\N	\N	\N
cmlly46z50017btn5ezlpgcxb	/login	POST	143	200	\N	\N	\N	2026-02-14 06:38:51.473	\N	\N	\N
cmlly4el90018btn5bcofmqlb	/stats	GET	53	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:01.341	\N	\N	\N
cmlly4kkm0019btn53e1jwu0k	/theme	GET	30	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:09.094	\N	\N	\N
cmlly4m8d001abtn5l32ceq7h	/theme	GET	62	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:11.246	\N	\N	\N
cmlly4p5r001bbtn53n05vphj	/api/v1/csrf-token	GET	3	200	\N	\N	\N	2026-02-14 06:39:15.039	\N	\N	\N
cmlly4q9d001cbtn5jam7sfdi	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:39:16.465	\N	\N	\N
cmlly53h1001dbtn5z4y3j1zx	/files/:filename	GET	42	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:33.59	\N	\N	\N
cmlly5881001ebtn5lez7md2n	/theme	GET	35	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:39.745	\N	\N	\N
cmlly5992001fbtn5p6nmleio	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:39:41.079	\N	\N	\N
cmlly5998001gbtn5n5psrlr8	/slug/:slug	GET	18	404	\N	\N	\N	2026-02-14 06:39:41.085	\N	\N	\N
cmlly59ca001hbtn5l8ehkotw	/theme	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:41.195	\N	\N	\N
cmlly59da001ibtn5kei1b5lg	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:39:41.231	\N	\N	\N
cmlly59e3001jbtn55nv232l6	/theme	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:39:41.26	\N	\N	\N
cmlly9qei001kbtn5g08s2xak	/directory	GET	81	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:43:09.931	\N	\N	\N
cmlly9rxs001lbtn5isbzywy6	/slug/:slug	GET	28	200	\N	\N	\N	2026-02-14 06:43:11.921	\N	\N	\N
cmlly9ry9001mbtn51cnrzm9j	/theme	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:43:11.937	\N	\N	\N
cmlly9s1k001nbtn5qabxvsuw	/theme	GET	31	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:43:12.056	\N	\N	\N
cmllya422001obtn5oebbjjss	/profile	GET	18	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:43:27.627	\N	\N	\N
cmllyare5001pbtn5rbb7dofs	/directory	GET	32	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:43:57.87	\N	\N	\N
cmllyasup001qbtn5l3l0cxsp	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 06:43:59.761	\N	\N	\N
cmllyat30001rbtn505he3lpu	/api/v1/csrf-token	GET	2	200	\N	\N	\N	2026-02-14 06:44:00.06	\N	\N	\N
cmllybeym001sbtn5bp08piv1	/slug/:slug	GET	33	200	\N	\N	\N	2026-02-14 06:44:28.414	\N	\N	\N
cmllylli5001l3e8a7xo56rbr	/v1/settings/public	GET	6	404	\N	\N	\N	2026-02-14 06:52:23.453	\N	\N	\N
cmllyllii001m3e8afo64cqqt	/theme	GET	57	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:23.467	\N	\N	\N
cmllylo04001p3e8al2vvq3gz	/theme	GET	93	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:26.693	\N	\N	\N
cmllym5bp001w3e8agv02fmwn	/theme	GET	64	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:49.141	\N	\N	\N
cmllym5bt001x3e8ags5ck0lp	/logs	GET	37	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 06:52:49.145	\N	\N	\N
cmllz105x00009u0cs3u3c7dz	/directory	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:04:22.293	\N	\N	\N
cmllzkjw8000012tnw1tka4j7	/public	GET	42	200	\N	\N	\N	2026-02-14 07:19:34.328	\N	\N	\N
cmllzmprm000812tnmrmldq96	/theme	GET	46	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:21:15.25	\N	\N	\N
cmllzor1n000b12tnqzfvcx0u	/theme	GET	47	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:22:50.22	\N	\N	\N
cmllzor2g000c12tndrivzstd	/profile	GET	22	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:22:50.248	\N	\N	\N
cmllzynlk000m12tnozw6nmhu	/stats	GET	40	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:30:32.312	\N	\N	\N
cmlm0ljy10000yb8b9ttp7a7u	/directory	GET	51	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 07:48:20.665	\N	\N	\N
cmlm19vo8000eyb8bl223fpzz	/logs	GET	25	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:07:15.608	\N	\N	\N
cmlm1o32w000qyb8b1gxrd3bi	/logs	GET	38	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:18:18.392	\N	\N	\N
cmlm26tix001iyb8bdz7u0522	/stats	GET	87	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 08:32:52.474	\N	\N	\N
cmlm27gpq001jyb8bffkuk657	/logs	GET	33	401	\N	\N	\N	2026-02-14 08:33:22.527	\N	\N	\N
cmlm27gwv001kyb8ba6zo11b3	/slug/:slug	GET	34	200	\N	\N	\N	2026-02-14 08:33:22.783	\N	\N	\N
cmlmpy1th002hyb8by9kl67ug	/logout	POST	19	200	\N	\N	\N	2026-02-14 19:37:54.101	\N	\N	\N
cmlmpznwx002myb8b89ewq9e5	/slug/:slug	GET	30	200	\N	\N	\N	2026-02-14 19:39:09.394	\N	\N	\N
cmlmpznx0002nyb8bud6dwvi8	/profile	GET	20	401	\N	\N	\N	2026-02-14 19:39:09.397	\N	\N	\N
cmlmpzofi002ryb8bsrwfjzc2	/profile	GET	17	401	\N	\N	\N	2026-02-14 19:39:10.062	\N	\N	\N
cmlmq01l0002tyb8bkrlwdeqy	/profile	GET	13	401	\N	\N	\N	2026-02-14 19:39:27.108	\N	\N	\N
cmlmq2hpo002xyb8bic2i35ja	/slug/:slug	GET	23	200	\N	\N	\N	2026-02-14 19:41:21.325	\N	\N	\N
cmlmqafk9003ryb8br9ipnfyw	/contest/:contestId	GET	53	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:47:31.786	\N	\N	\N
cmlmqalbi003syb8benzxytho	/categories	GET	41	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:47:39.246	\N	\N	\N
cmlmqalbk003tyb8bfst6wqz3	/contest/:contestId	GET	48	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:47:39.248	\N	\N	\N
cmlmqay11003wyb8bwq40puus	/contest/:contestId	GET	26	200	cmljlirlq000eob68ct4hsyx2	\N	\N	2026-02-14 19:47:55.717	\N	\N	\N
\.


--
-- Data for Name: permission_audit_logs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.permission_audit_logs (id, role, resource, operation, "previousVal", "newVal", "changedBy", "changedAt", reason, "tenantId") FROM stdin;
cmlmqlnrj006myb8bbk30kdir	CONTESTANT	scores	read	t	f	cmljlirlq000eob68ct4hsyx2	2026-02-14 19:56:15.631		cmljlirfs0006ob68ahx75qyt
cmlmqm07t006syb8bup9janr1	CONTESTANT	scores	read	f	t	cmljlirlq000eob68ct4hsyx2	2026-02-14 19:56:31.769		cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: rate_limit_configs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.rate_limit_configs (id, name, tier, "tenantId", "userId", endpoint, "requestsPerHour", "requestsPerMinute", "burstLimit", enabled, priority, description, "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: report_instances; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.report_instances (id, "templateId", "generatedById", "generatedAt", data, format, name, type, "tenantId") FROM stdin;
cmlls3sk20001znhgidk0zys1	default	cmljlirlq000eob68ct4hsyx2	2026-02-14 03:50:35.09	{"event":{"id":"cmljlirjf0008ob68pb9qdz8h","name":"Test Event 2/12/2026","startDate":"2026-02-12T15:10:43.928Z","endDate":"2026-02-19T15:10:43.928Z","contests":[{"id":"cmljlirlz000iob68vgxu6sxk","name":"Bear","categories":[{"id":"cmljlirsl001tob68g5doaqiz","name":"Test Category 1-2","scoreCap":100,"scores":[]},{"id":"cmljlirph0019ob68twuglukq","name":"Test Category 1-1","scoreCap":100,"scores":[{"id":"cmll7r84y0007uikqfiw7ogdx","contestantId":"cmljlirqt001job681aanlcf9","judgeId":"cmljliroo0012ob68f825shsg","categoryId":"cmljlirph0019ob68twuglukq","score":null,"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"judge":{"id":"cmljliroo0012ob68f825shsg","name":"Test Judge 2"},"criterion":{"id":"cmljlirpm001aob68zz80a4eb","maxScore":30}},{"id":"cmll7r84z0009uikq5hy87vsx","contestantId":"cmljlirqt001job681aanlcf9","judgeId":"cmljliroo0012ob68f825shsg","categoryId":"cmljlirph0019ob68twuglukq","score":null,"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"judge":{"id":"cmljliroo0012ob68f825shsg","name":"Test Judge 2"},"criterion":{"id":"cmljlirpn001bob68e1pz5l4z","maxScore":40}},{"id":"cmll7r855000buikql6yoec8q","contestantId":"cmljlirqt001job681aanlcf9","judgeId":"cmljliroo0012ob68f825shsg","categoryId":"cmljlirph0019ob68twuglukq","score":null,"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"judge":{"id":"cmljliroo0012ob68f825shsg","name":"Test Judge 2"},"criterion":{"id":"cmljlirpn001cob68xdna25fr","maxScore":30}}]}],"winners":[{"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"totalScore":0,"totalPossibleScore":null,"categoriesParticipated":1}]},{"id":"cmljliru3002dob68d2n822p1","name":"Pet","categories":[{"id":"cmljlirvn0034ob68j0fq4d2t","name":"Test Category 2-1","scoreCap":100,"scores":[{"id":"cmlkeuss00002eqlnhi814ubo","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirvn0034ob68j0fq4d2t","score":null,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirvr0036ob68yadc79kx","maxScore":40}},{"id":"cmlkeuss00004eqlnp2qcl0bp","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirvn0034ob68j0fq4d2t","score":null,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirvq0035ob68kwn6vf3i","maxScore":30}},{"id":"cmlkeusso0006eqlnbc2wpty6","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirvn0034ob68j0fq4d2t","score":null,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirvr0037ob68wwmdcu1b","maxScore":30}}]},{"id":"cmljlirwy003oob68mlnuivt0","name":"PubIm","scoreCap":30,"scores":[{"id":"cmllbga6p000o115lqj9dlxe5","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirwy003oob68mlnuivt0","score":1,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirx0003pob68guobnzjy","maxScore":30}}]}],"winners":[{"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"totalScore":1,"totalPossibleScore":30,"categoriesParticipated":2}]}]},"metadata":{"generatedAt":"2026-02-14T03:50:35.089Z","generatedBy":"cmljlirlq000eob68ct4hsyx2","reportType":"event_comprehensive"}}	PDF	Event Summary Report	event	cmljlirfs0006ob68ahx75qyt
cmllsdi5p0011cs2y596t2uwa	default	cmljlirlq000eob68ct4hsyx2	2026-02-14 03:58:08.173	{"statistics":{"totalEvents":1,"activeEvents":1,"archivedEvents":0,"totalContests":3,"totalCategories":5,"totalScores":7,"totalUsers":29,"averageScoresPerEvent":7,"averageContestsPerEvent":3},"metadata":{"generatedAt":"2026-02-14T03:58:08.171Z","generatedBy":"cmljlirlq000eob68ct4hsyx2","reportType":"system_analytics"}}	PDF	System Analytics Report	system	cmljlirfs0006ob68ahx75qyt
cmllsect40019cs2y8f9s1c5b	default	cmljlirlq000eob68ct4hsyx2	2026-02-14 03:58:47.896	{"event":{"id":"cmljlirjf0008ob68pb9qdz8h","name":"Test Event 2/12/2026","startDate":"2026-02-12T15:10:43.928Z","endDate":"2026-02-19T15:10:43.928Z","contests":[{"id":"cmljlirlz000iob68vgxu6sxk","name":"Bear","categories":[{"id":"cmljlirsl001tob68g5doaqiz","name":"Test Category 1-2","scoreCap":100,"scores":[]},{"id":"cmljlirph0019ob68twuglukq","name":"Test Category 1-1","scoreCap":100,"scores":[{"id":"cmll7r84y0007uikqfiw7ogdx","contestantId":"cmljlirqt001job681aanlcf9","judgeId":"cmljliroo0012ob68f825shsg","categoryId":"cmljlirph0019ob68twuglukq","score":null,"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"judge":{"id":"cmljliroo0012ob68f825shsg","name":"Test Judge 2"},"criterion":{"id":"cmljlirpm001aob68zz80a4eb","maxScore":30}},{"id":"cmll7r84z0009uikq5hy87vsx","contestantId":"cmljlirqt001job681aanlcf9","judgeId":"cmljliroo0012ob68f825shsg","categoryId":"cmljlirph0019ob68twuglukq","score":null,"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"judge":{"id":"cmljliroo0012ob68f825shsg","name":"Test Judge 2"},"criterion":{"id":"cmljlirpn001bob68e1pz5l4z","maxScore":40}},{"id":"cmll7r855000buikql6yoec8q","contestantId":"cmljlirqt001job681aanlcf9","judgeId":"cmljliroo0012ob68f825shsg","categoryId":"cmljlirph0019ob68twuglukq","score":null,"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"judge":{"id":"cmljliroo0012ob68f825shsg","name":"Test Judge 2"},"criterion":{"id":"cmljlirpn001cob68xdna25fr","maxScore":30}}]}],"winners":[{"contestant":{"id":"cmljlirqt001job681aanlcf9","name":"Test Contestant 1","contestantNumber":1},"totalScore":0,"totalPossibleScore":null,"categoriesParticipated":1}]},{"id":"cmljliru3002dob68d2n822p1","name":"Pet","categories":[{"id":"cmljlirvn0034ob68j0fq4d2t","name":"Test Category 2-1","scoreCap":100,"scores":[{"id":"cmlkeuss00002eqlnhi814ubo","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirvn0034ob68j0fq4d2t","score":null,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirvr0036ob68yadc79kx","maxScore":40}},{"id":"cmlkeuss00004eqlnp2qcl0bp","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirvn0034ob68j0fq4d2t","score":null,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirvq0035ob68kwn6vf3i","maxScore":30}},{"id":"cmlkeusso0006eqlnbc2wpty6","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirvn0034ob68j0fq4d2t","score":null,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirvr0037ob68wwmdcu1b","maxScore":30}}]},{"id":"cmljlirwy003oob68mlnuivt0","name":"PubIm","scoreCap":30,"scores":[{"id":"cmllbga6p000o115lqj9dlxe5","contestantId":"cmljlirxu0044ob68fxovv5kp","judgeId":"cmljlirnx000zob680q6vc92v","categoryId":"cmljlirwy003oob68mlnuivt0","score":1,"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"judge":{"id":"cmljlirnx000zob680q6vc92v","name":"Test Judge 1"},"criterion":{"id":"cmljlirx0003pob68guobnzjy","maxScore":30}}]}],"winners":[{"contestant":{"id":"cmljlirxu0044ob68fxovv5kp","name":"Test Contestant 12","contestantNumber":12},"totalScore":1,"totalPossibleScore":30,"categoriesParticipated":2}]}]},"metadata":{"generatedAt":"2026-02-14T03:58:47.895Z","generatedBy":"cmljlirlq000eob68ct4hsyx2","reportType":"event_comprehensive"}}	PDF	Event Summary Report	event	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.report_templates (id, name, type, template, parameters, "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.reports (id, name, type, parameters, format, "generatedBy", "filePath", "fileSize", status, "createdAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: review_contestant_certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.review_contestant_certifications (id, "categoryId", "contestantId", "reviewedBy", "reviewerRole", "reviewedAt", comments, "tenantId") FROM stdin;
\.


--
-- Data for Name: review_judge_score_certifications; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.review_judge_score_certifications (id, "categoryId", "judgeId", "reviewedBy", "reviewerRole", "reviewedAt", comments, "tenantId") FROM stdin;
\.


--
-- Data for Name: role_assignments; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.role_assignments (id, "userId", role, "contestId", "eventId", "categoryId", "assignedAt", "assignedBy", notes, "isActive", "tenantId") FROM stdin;
cmljlirkx000cob68z0tu7noj	cmljlirkm000aob68y6pykq2w	EMCEE	\N	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.002	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljlirn4000mob686kwb3r30	cmljlirmz000kob68oyxznmzh	TALLY_MASTER	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.081	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljlirni000qob68gpfkud5g	cmljlirna000oob68cn4w7bsj	TALLY_MASTER	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.094	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljlirno000uob68fqtbnpp5	cmljlirnl000sob68a6phas6e	AUDITOR	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.101	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljlirnu000yob68emiuh2v7	cmljlirns000wob68z2ljsw06	AUDITOR	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.107	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljliru7002hob68lm6z19ez	cmljliru5002fob686k6uth1t	TALLY_MASTER	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.336	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljliruc002lob6880d64r1l	cmljlirua002job689fk5gquu	TALLY_MASTER	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.341	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljlirui002pob681hb76o3k	cmljliruf002nob68irq7g7a5	AUDITOR	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.347	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
cmljliruo002tob681ey6k7i8	cmljlirul002rob680lp6t95y	AUDITOR	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	\N	2026-02-12 15:10:44.352	cmlhmo05t000113i25pe4ao5e	\N	t	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.role_permissions (id, role, resource, operation, allowed, "createdAt", "updatedAt", "createdBy", "tenantId") FROM stdin;
cmllqw1vq0009t11z8j7vy32v	SUPER_ADMIN	*	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000at11z31mi666k	ADMIN	*	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000bt11zj1pk2qbn	ORGANIZER	events	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000ct11z9w8xxn9n	ORGANIZER	contests	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000dt11zi8w946r5	ORGANIZER	categories	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000et11ztdst4ll1	ORGANIZER	users	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000ft11z7mc9cnkl	ORGANIZER	reports	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000gt11zsrlfwscr	ORGANIZER	templates	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000ht11zdx8do891	ORGANIZER	settings	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000it11zi3oxnq2l	ORGANIZER	backup	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000jt11zaxsh3q8w	ORGANIZER	emcee	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000kt11zq2dthbh0	ORGANIZER	category-types	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000lt11z9s001qfk	ORGANIZER	assignments	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000mt11zjoudggdk	ORGANIZER	results	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000nt11zsaqf3gjy	ORGANIZER	contestants	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000ot11zj67m7h7d	ORGANIZER	criteria	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000pt11zk821rc13	ORGANIZER	approvals	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000qt11zs5k0kile	ORGANIZER	tracker	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000rt11zn81po74z	ORGANIZER	scores	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000st11zfw72wb4n	ORGANIZER	commentary	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000tt11z5nj90t8o	ORGANIZER	profile	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000ut11zpndwpf5l	BOARD	events	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000vt11zvjaaae8j	BOARD	contests	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000wt11z8txmuv4r	BOARD	categories	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000xt11zbiltw7qn	BOARD	results	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000yt11z1tvxh0rt	BOARD	reports	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq000zt11zdg3vqg7l	BOARD	approvals	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq0010t11zb7ngy45l	BOARD	users	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq0011t11zujzr65m8	BOARD	settings	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq0012t11zu0yn05xp	BOARD	emcee	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq0013t11zcqqj4ceg	BOARD	category-types	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vq0014t11z2vq2ok32	BOARD	assignments	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0015t11zpfhyqnmp	BOARD	scores	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0016t11zc1loim81	BOARD	contestants	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0017t11z5xo5j5q5	BOARD	criteria	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0018t11zdkj0ktmn	BOARD	tracker	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0019t11zgtwav9jx	BOARD	commentary	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001at11z6q16eauk	BOARD	profile	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001bt11zlokhqlg8	JUDGE	scores	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001ct11z7yqrbdzd	JUDGE	scores	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001dt11zm583y94k	JUDGE	results	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001et11zd5jnvkmh	JUDGE	commentary	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001ft11zxveawubw	JUDGE	events	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001gt11zhzibj5kc	JUDGE	contests	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001ht11zifhmy0ps	JUDGE	categories	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001it11z8qj3ynm0	CONTESTANT	events	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001jt11zy1vgi7ju	CONTESTANT	contests	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001kt11zwhdx9khs	CONTESTANT	categories	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001lt11zw2djeo5b	CONTESTANT	results	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001nt11z2fzp03fe	CONTESTANT	commentary	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001ot11zhrews1nx	CONTESTANT	profile	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001pt11z3bho3e54	CONTESTANT	profile	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001qt11z4f18i8lu	EMCEE	events	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001rt11zs8844qql	EMCEE	contests	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001st11zsiexd0yd	EMCEE	categories	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001tt11zq2jc1hmo	EMCEE	results	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001ut11z99vd2vsl	EMCEE	scores	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001vt11zioz5jxxq	EMCEE	announcements	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001wt11zwyeskdpa	TALLY_MASTER	scores	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001xt11zmx34no6d	TALLY_MASTER	results	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001yt11z9tull9on	TALLY_MASTER	events	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001zt11zl6wd25nz	TALLY_MASTER	contests	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0020t11zzfk9thw2	TALLY_MASTER	categories	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0021t11zg3epkc68	TALLY_MASTER	reports	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0022t11zwujhxp7m	TALLY_MASTER	tracker	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0023t11zze2ovyw5	TALLY_MASTER	certifications	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0024t11zu0z3apxt	AUDITOR	events	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr0025t11zh9e15u26	AUDITOR	contests	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs0026t11z6apite0q	AUDITOR	categories	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs0027t11ze31kvhgw	AUDITOR	results	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs0028t11ztsj9c1uv	AUDITOR	scores	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs0029t11zaaoyc13l	AUDITOR	reports	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs002at11zgwjujper	AUDITOR	activity-logs	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs002bt11zw2ehafcv	AUDITOR	audit-logs	read	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs002ct11z1hjf6ewd	AUDITOR	tracker	*	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs002dt11z0hecpw36	AUDITOR	approvals	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vs002et11zh7p9d5gr	AUDITOR	certifications	write	t	2026-02-14 03:16:34.309	2026-02-14 03:16:34.309	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
cmllqw1vr001mt11zzqn4s78y	CONTESTANT	scores	read	t	2026-02-14 03:16:34.309	2026-02-14 19:56:31.767	cmljlirlq000eob68ct4hsyx2	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: saved_searches; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.saved_searches (id, "userId", name, query, filters, "entityTypes", "isPublic", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: score_comments; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.score_comments (id, "scoreId", "criterionId", "contestantId", "judgeId", comment, "isPrivate", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: score_files; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.score_files (id, "categoryId", "judgeId", "contestantId", "fileName", "fileType", "filePath", "fileSize", "uploadedById", status, notes, "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: score_governance_approvals; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.score_governance_approvals (id, "requestId", "approvedById", "approverRole", "typedSignature", "drawnSignatureData", "signatureFilePath", "approvedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: score_governance_requests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.score_governance_requests (id, "actionType", "scopeType", "targetCertificationLevel", "eventId", "contestId", "categoryId", "contestantId", "judgeId", "scoreId", reason, status, "requestedById", "requesterRole", "initiatorTypedSignature", "initiatorDrawnSignatureData", "initiatorSignatureFilePath", "requiredAdditionalApprovals", "executedAt", "executedById", "executionSummary", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: score_removal_requests; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.score_removal_requests (id, "categoryId", "judgeId", reason, status, "requestedBy", "requestedAt", "tallySignature", "tallySignedAt", "tallySignedBy", "auditorSignature", "auditorSignedAt", "auditorSignedBy", "boardSignature", "boardSignedAt", "boardSignedBy", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: scores; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.scores (id, "categoryId", "contestantId", "judgeId", "criterionId", score, deduction, "deductionReason", "createdAt", "updatedAt", "allowCommentEdit", "certifiedAt", "certifiedBy", comment, "isCertified", "isLocked", "lockedAt", "lockedBy", "tenantId") FROM stdin;
cmlkeuss00002eqlnhi814ubo	cmljlirvn0034ob68j0fq4d2t	cmljlirxu0044ob68fxovv5kp	cmljlirnx000zob680q6vc92v	cmljlirvr0036ob68yadc79kx	\N	0	\N	2026-02-13 04:51:54.288	2026-02-13 14:09:43.924	t	\N	\N	\N	f	f	\N	\N	cmljlirfs0006ob68ahx75qyt
cmlkeuss00004eqlnp2qcl0bp	cmljlirvn0034ob68j0fq4d2t	cmljlirxu0044ob68fxovv5kp	cmljlirnx000zob680q6vc92v	cmljlirvq0035ob68kwn6vf3i	\N	0	\N	2026-02-13 04:51:54.289	2026-02-13 14:09:43.924	t	\N	\N	\N	f	f	\N	\N	cmljlirfs0006ob68ahx75qyt
cmlkeusso0006eqlnbc2wpty6	cmljlirvn0034ob68j0fq4d2t	cmljlirxu0044ob68fxovv5kp	cmljlirnx000zob680q6vc92v	cmljlirvr0037ob68wwmdcu1b	\N	0	\N	2026-02-13 04:51:54.312	2026-02-13 14:09:43.924	t	\N	\N	\N	f	f	\N	\N	cmljlirfs0006ob68ahx75qyt
cmll7r84y0007uikqfiw7ogdx	cmljlirph0019ob68twuglukq	cmljlirqt001job681aanlcf9	cmljliroo0012ob68f825shsg	cmljlirpm001aob68zz80a4eb	\N	0	\N	2026-02-13 18:20:56.434	2026-02-13 14:09:43.924	t	\N	\N	\N	f	f	\N	\N	cmljlirfs0006ob68ahx75qyt
cmll7r84z0009uikq5hy87vsx	cmljlirph0019ob68twuglukq	cmljlirqt001job681aanlcf9	cmljliroo0012ob68f825shsg	cmljlirpn001bob68e1pz5l4z	\N	0	\N	2026-02-13 18:20:56.435	2026-02-13 14:09:43.924	t	\N	\N	\N	f	f	\N	\N	cmljlirfs0006ob68ahx75qyt
cmll7r855000buikql6yoec8q	cmljlirph0019ob68twuglukq	cmljlirqt001job681aanlcf9	cmljliroo0012ob68f825shsg	cmljlirpn001cob68xdna25fr	\N	0	\N	2026-02-13 18:20:56.441	2026-02-13 14:09:43.924	t	\N	\N	\N	f	f	\N	\N	cmljlirfs0006ob68ahx75qyt
cmllbga6p000o115lqj9dlxe5	cmljlirwy003oob68mlnuivt0	cmljlirxu0044ob68fxovv5kp	cmljlirnx000zob680q6vc92v	cmljlirx0003pob68guobnzjy	1	0	\N	2026-02-13 20:04:24.337	2026-02-13 20:10:39.938	t	2026-02-13 20:10:39.937	cmljliro40011ob68rvlxi3jv		t	t	2026-02-13 20:10:39.937	cmljliro40011ob68rvlxi3jv	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: search_analytics; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.search_analytics (id, query, "resultCount", "avgResponseTime", "searchCount", "lastSearched", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: search_history; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.search_history (id, "userId", query, filters, "entityTypes", "resultCount", "createdAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: security_settings; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.security_settings (id, "passwordMinLength", "passwordRequireUppercase", "passwordRequireLowercase", "passwordRequireNumbers", "passwordRequireSymbols", "passwordExpiryDays", "maxLoginAttempts", "lockoutDurationMinutes", "requireTwoFactor", "sessionTimeoutMinutes", "enableIpWhitelist", "allowedIps", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.system_settings (id, key, value, description, category, "tenantId", "updatedAt", "updatedBy") FROM stdin;
cmllskaes001zcs2ymtpvr3jn	app_description		Setting for app_description	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.725	cmljlirlq000eob68ct4hsyx2
cmllskaeu0021cs2ymw3qjr43	footer_contactEmail		Setting for footer_contactEmail	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.727	cmljlirlq000eob68ct4hsyx2
cmllskaex0023cs2yw7xpmqt5	allow_registration	true	Setting for allow_registration	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.729	cmljlirlq000eob68ct4hsyx2
cmllskaez0025cs2ydl8t8qtv	require_email_verification	false	Setting for require_email_verification	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.731	cmljlirlq000eob68ct4hsyx2
cmllskaf10027cs2yzle6iie5	notification_email_enabled	true	Setting for notification_email_enabled	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.733	cmljlirlq000eob68ct4hsyx2
cmllskaf30029cs2ycbph64vh	maintenance_mode	false	Setting for maintenance_mode	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.735	cmljlirlq000eob68ct4hsyx2
cmllskaf5002bcs2y2qx3peyd	default_language	en	Setting for default_language	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.737	cmljlirlq000eob68ct4hsyx2
cmllskaf7002dcs2y16v37g1p	default_timezone	America/Chicago	Setting for default_timezone	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.739	cmljlirlq000eob68ct4hsyx2
cmllskaf9002fcs2yknry7uf8	max_file_size	10485760	Setting for max_file_size	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.741	cmljlirlq000eob68ct4hsyx2
cmllskafb002hcs2ykfrvv4h9	session_timeout	86400	Setting for session_timeout	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:03:24.744	cmljlirlq000eob68ct4hsyx2
cmllsiyal001rcs2y2osivyi8	contestant_visibility_canViewWinners	true	Setting for contestant_visibility_canViewWinners	privacy	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:07:11.386	cmljlirlq000eob68ct4hsyx2
cmllsiyar001tcs2yw74l4a23	contestant_visibility_canViewOverallResults	true	Setting for contestant_visibility_canViewOverallResults	privacy	cmljlirfs0006ob68ahx75qyt	2026-02-14 04:07:11.391	cmljlirlq000eob68ct4hsyx2
cmlmqib7x0044yb8b1zwi4q4n	theme_primaryColor	#00088a	Setting for theme_primaryColor	theme	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:55:03.856	cmljlirlq000eob68ct4hsyx2
cmlmqib800046yb8b6rpxu2aa	theme_secondaryColor	#8b5cf6	Setting for theme_secondaryColor	theme	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:55:03.858	cmljlirlq000eob68ct4hsyx2
cmlmqib830048yb8b1jn9r1rs	theme_logoPath		Setting for theme_logoPath	theme	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:55:03.86	cmljlirlq000eob68ct4hsyx2
cmlmqib85004ayb8b797v49d3	theme_faviconPath		Setting for theme_faviconPath	theme	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:55:03.862	cmljlirlq000eob68ct4hsyx2
cmllskaeq001xcs2yzi62rll0	app_name	ConMGR	Setting for app_name	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:55:03.864	cmljlirlq000eob68ct4hsyx2
cmlmqib89004eyb8bmmz8xyfm	app_subtitle		Setting for app_subtitle	general	cmljlirfs0006ob68ahx75qyt	2026-02-14 19:55:03.866	cmljlirlq000eob68ct4hsyx2
\.


--
-- Data for Name: tally_master_assignments; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.tally_master_assignments (id, "userId", "categoryId", "contestId", "eventId", status, "assignedAt", "assignedBy", notes, "tenantId") FROM stdin;
cmlk1nn8x001m5qlqb6g5zyxs	cmljlirua002job689fk5gquu	\N	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:42:25.522	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
cmlk1nn8y001o5qlqlhrkbb67	cmljliru5002fob686k6uth1t	\N	cmljlirlz000iob68vgxu6sxk	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:42:25.522	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
cmlk1nzsk001v5qlqh57bkax2	cmljlirmz000kob68oyxznmzh	\N	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:42:41.781	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
cmlk1nzsl001x5qlq8pv5e1ue	cmljlirna000oob68cn4w7bsj	\N	cmljliru3002dob68d2n822p1	cmljlirjf0008ob68pb9qdz8h	ACTIVE	2026-02-12 22:42:41.781	cmljlirlq000eob68ct4hsyx2	\N	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: template_criteria; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.template_criteria (id, "templateId", name, "maxScore", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.tenants (id, name, slug, domain, "isActive", settings, "maxUsers", "maxEvents", "maxStorage", "planType", "subscriptionStatus", "subscriptionEndsAt", "scoringType", "createdAt", "updatedAt") FROM stdin;
default-tenant	Default Tenant	default	localhost	t	{}	\N	\N	\N	free	active	\N	STRAIGHT	2026-02-11 06:07:15.546	2026-02-11 06:07:15.546
cmljlirfs0006ob68ahx75qyt	FebTest1	febtest1	\N	t	\N	\N	\N	\N	internal	active	\N	STRAIGHT	2026-02-12 15:10:43.817	2026-02-12 15:10:43.817
\.


--
-- Data for Name: theme_settings; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.theme_settings (id, "primaryColor", "secondaryColor", "logoPath", "faviconPath", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: user_field_configurations; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.user_field_configurations (id, "fieldName", "isVisible", "isRequired", "order") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.users (id, name, "preferredName", email, password, role, gender, pronouns, "judgeId", "contestantId", "sessionVersion", "isActive", "lastLoginAt", "judgeBio", "judgeSpecialties", "judgeCertifications", "contestantBio", "contestantNumber", "contestantAge", "contestantSchool", bio, "imagePath", phone, address, timezone, language, "notificationSettings", "smsPhone", "smsEnabled", privacy, "createdAt", "updatedAt", "navigationPreferences", city, state, country, "tenantId", "isSuperAdmin", "mfaBackupCodes", "mfaEnabled", "mfaEnrolledAt", "mfaMethod", "mfaSecret") FROM stdin;
cmljliro40011ob68rvlxi3jv	Test Judge 1	\N	judge1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	JUDGE	\N	\N	cmljlirnx000zob680q6vc92v	\N	1	t	2026-02-14 06:50:29.436	Test judge bio 1	\N	\N	\N	\N	\N	\N	Test judge bio 1	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.117	2026-02-14 06:50:29.437	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljliru5002fob686k6uth1t	Test Tally Master 3	\N	tally3@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	TALLY_MASTER	\N	\N	\N	\N	1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.333	2026-02-12 15:10:44.333	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirua002job689fk5gquu	Test Tally Master 4	\N	tally4@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	TALLY_MASTER	\N	\N	\N	\N	1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.338	2026-02-12 15:10:44.338	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljliruf002nob68irq7g7a5	Test Auditor 3	\N	auditor3@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	AUDITOR	\N	\N	\N	\N	1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.343	2026-02-12 15:10:44.343	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirmz000kob68oyxznmzh	Test Tally Master 1	\N	tally1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	TALLY_MASTER	\N	\N	\N	\N	1	t	2026-02-14 06:50:30.331	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.075	2026-02-14 06:50:30.332	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirns000wob68z2ljsw06	Test Auditor 2	\N	auditor2@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	AUDITOR	\N	\N	\N	\N	1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.104	2026-02-12 15:10:44.104	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljliror0014ob68xdcfhymw	Test Judge 2	\N	judge2@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	JUDGE	\N	\N	cmljliroo0012ob68f825shsg	\N	1	t	2026-02-13 18:20:30.209	Test judge bio 2	\N	\N	\N	\N	\N	\N	Test judge bio 2	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.139	2026-02-13 18:20:30.21	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirp40017ob68x31yixap	Test Judge 3	\N	judge3@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	JUDGE	\N	\N	cmljlirp00015ob68hyms1aec	\N	1	t	\N	Test judge bio 3	\N	\N	\N	\N	\N	\N	Test judge bio 3	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.153	2026-02-12 15:10:44.157	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirnl000sob68a6phas6e	Test Auditor 1	\N	auditor1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	AUDITOR	\N	\N	\N	\N	1	t	2026-02-14 06:50:31.204	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.098	2026-02-14 06:50:31.206	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirlw000gob68u4qq1mj1	Test Board 1	\N	board1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	BOARD	\N	\N	\N	\N	1	t	2026-02-14 06:50:32.075	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.036	2026-02-14 06:50:32.076	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirut002wob68lha0bjlz	Test Judge 4	\N	judge4@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	JUDGE	\N	\N	cmljliruq002uob681ke92klv	\N	1	t	\N	Test judge bio 4	\N	\N	\N	\N	\N	\N	Test judge bio 4	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.357	2026-02-12 15:10:44.36	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirul002rob680lp6t95y	Test Auditor 4	\N	auditor4@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	AUDITOR	\N	\N	\N	\N	1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.349	2026-02-12 15:10:44.349	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirlq000eob68ct4hsyx2	Test Organizer 1	\N	organizer1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	ORGANIZER	\N	\N	\N	\N	1	t	2026-02-14 19:41:41.129	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.03	2026-02-14 19:41:41.13	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirkm000aob68y6pykq2w	Test Emcee 1	\N	emcee1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	EMCEE	\N	\N	\N	\N	1	t	2026-02-14 06:50:32.943	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:43.99	2026-02-14 06:50:32.944	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirna000oob68cn4w7bsj	Test Tally Master 2	\N	tally2@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	TALLY_MASTER	\N	\N	\N	\N	1	t	2026-02-13 18:21:47.654	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.086	2026-02-13 18:21:47.656	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmlhmo05t000113i25pe4ao5e	Admin User	\N	admin@eventmanager.com	$2b$10$xot3hJO.za1lmNzbe1DuwO8H.1PB22b46EClMQNNDUjvjyhgEsXcW	SUPER_ADMIN	\N	\N	\N	\N	1	t	2026-02-12 22:16:50.113	\N	\N	\N	\N	\N	\N	\N	\N	/uploads/users/image-1770908096618-121650849.jpeg	\N	\N	UTC	en	\N	\N	f	\N	2026-02-11 06:07:15.663	2026-02-12 22:16:50.114	\N	\N	\N	\N	default-tenant	f	\N	f	\N	totp	\N
cmljlirqy001lob68xujtv9oi	Test Contestant 1	\N	contestant1@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirqt001job681aanlcf9	1	t	2026-02-14 06:50:33.915	\N	\N	\N	Test contestant bio 1	\N	\N	\N	Test contestant bio 1	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.219	2026-02-14 06:50:33.916	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirrs001oob68mrcy0j72	Test Contestant 2		contestant2@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT			\N	cmljlirrn001mob68njh1kfxa	1	t	\N	\N	\N	\N	[Bio file: /uploads/bios/bio-1770958723974-299340977.pdf]	\N	\N	\N	[Bio file uploaded: /uploads/bios/bio-1770958723974-299340977.pdf]	\N		\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.248	2026-02-13 04:58:44.004	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirs9001rob68ac7hn4ai	Test Contestant 3	\N	contestant3@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirs3001pob68yvuy06zq	1	t	\N	\N	\N	\N	Test contestant bio 3	\N	\N	\N	Test contestant bio 3	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.265	2026-02-12 15:10:44.27	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirv4002zob68a0z8thb1	Test Judge 5	\N	judge5@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	JUDGE	\N	\N	cmljlirv1002xob688e4krg32	\N	1	t	\N	Test judge bio 5	\N	\N	\N	\N	\N	\N	Test judge bio 5	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.368	2026-02-12 15:10:44.372	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirvf0032ob68c240a7vy	Test Judge 6	\N	judge6@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	JUDGE	\N	\N	cmljlirvd0030ob68c9i8i2mg	\N	1	t	\N	Test judge bio 6	\N	\N	\N	\N	\N	\N	Test judge bio 6	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.38	2026-02-12 15:10:44.382	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirt30025ob68sq9w46qs	Test Contestant 4	\N	contestant4@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirt10023ob68i95s91j9	1	t	\N	\N	\N	\N	Test contestant bio 4	\N	\N	\N	Test contestant bio 4	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.295	2026-02-12 15:10:44.298	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirtf0028ob68x6v0s4cv	Test Contestant 5	\N	contestant5@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirtc0026ob68oeivfue8	1	t	\N	\N	\N	\N	Test contestant bio 5	\N	\N	\N	Test contestant bio 5	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.307	2026-02-12 15:10:44.312	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirtt002bob68uvhn8bvr	Test Contestant 6	\N	contestant6@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirtq0029ob686m2zddk0	1	t	\N	\N	\N	\N	Test contestant bio 6	\N	\N	\N	Test contestant bio 6	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.321	2026-02-12 15:10:44.325	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirw4003gob680757qobq	Test Contestant 7	\N	contestant7@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirw2003eob68xso9tgw4	1	t	\N	\N	\N	\N	Test contestant bio 7	\N	\N	\N	Test contestant bio 7	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.404	2026-02-12 15:10:44.407	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirwg003job685hjzh0ap	Test Contestant 8	\N	contestant8@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirwe003hob68s8ytekgz	1	t	\N	\N	\N	\N	Test contestant bio 8	\N	\N	\N	Test contestant bio 8	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.416	2026-02-12 15:10:44.418	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirwq003mob68u3mydxnr	Test Contestant 9	\N	contestant9@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirwo003kob6814xf7nic	1	t	\N	\N	\N	\N	Test contestant bio 9	\N	\N	\N	Test contestant bio 9	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.426	2026-02-12 15:10:44.428	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirxc0040ob68jtxvriau	Test Contestant 10	\N	contestant10@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirxa003yob680qcbsklm	1	t	\N	\N	\N	\N	Test contestant bio 10	\N	\N	\N	Test contestant bio 10	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.449	2026-02-12 15:10:44.451	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirxm0043ob68r6661aec	Test Contestant 11	\N	contestant11@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT	\N	\N	\N	cmljlirxk0041ob68v1skg631	1	t	\N	\N	\N	\N	Test contestant bio 11	\N	\N	\N	Test contestant bio 11	\N	\N	\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.458	2026-02-12 15:10:44.461	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
cmljlirxw0046ob689rtkcnzg	Test Contestant 12		contestant12@febtest1.com	$2b$10$53a.dFMtCCypLHN8GP2/iOhngqbzcTH0Fju8kRfv/GkPokk9ySBOK	CONTESTANT			\N	cmljlirxu0044ob68fxovv5kp	1	t	2026-02-13 06:00:51.144	\N	\N	\N	test bio text entry	\N	\N	\N	test bio text entry	/uploads/users/image-1770959077571-829649186.png		\N	UTC	en	\N	\N	f	\N	2026-02-12 15:10:44.468	2026-02-13 06:00:51.145	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt	f	\N	f	\N	totp	\N
\.


--
-- Data for Name: webhook_configs; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.webhook_configs (id, "tenantId", name, url, events, enabled, secret, headers, "retryAttempts", timeout, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: webhook_deliveries; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.webhook_deliveries (id, "webhookId", "eventId", status, "attemptCount", "lastAttemptAt", "responseStatus", "responseBody", "errorMessage", "createdAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: winner_signatures; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.winner_signatures (id, "categoryId", "contestId", "eventId", "userId", "userRole", signature, "signedAt", "ipAddress", "userAgent", "createdAt", "updatedAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: workflow_instances; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.workflow_instances (id, "templateId", "tenantId", "entityType", "entityId", "currentStepId", status, "startedAt", "completedAt", metadata) FROM stdin;
cmlls5nxt000dcs2y2mejvlze	cmlls5e5p0007cs2y5d22xqyq	cmljlirfs0006ob68ahx75qyt	MANUAL_EXECUTION	manual-ux-check	cmlls5e5r0008cs2y3xk7oayb	active	2026-02-14 03:52:02.418	\N	\N
cmllsb4or000qcs2yw6hiwate	cmlls5e5p0007cs2y5d22xqyq	cmljlirfs0006ob68ahx75qyt	CONTEST	manual-1771041377203	cmlls5e5r0008cs2y3xk7oayb	active	2026-02-14 03:56:17.404	\N	\N
\.


--
-- Data for Name: workflow_step_executions; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.workflow_step_executions (id, "instanceId", "stepId", status, "startedAt", "completedAt", "completedBy", "approvalStatus", comments, metadata, "tenantId") FROM stdin;
cmlls5nxy000ecs2ye31r93oy	cmlls5nxt000dcs2y2mejvlze	cmlls5e5r0008cs2y3xk7oayb	in_progress	2026-02-14 03:52:02.421	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmlls5nxy000fcs2yvyvkjio6	cmlls5nxt000dcs2y2mejvlze	cmlls5e5r0009cs2yyepcq3xd	pending	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmlls5nxy000gcs2y6n1t5h9s	cmlls5nxt000dcs2y2mejvlze	cmlls5e5r000acs2ywcmao86n	pending	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmlls5nxy000hcs2ypqhzstia	cmlls5nxt000dcs2y2mejvlze	cmlls5e5r000bcs2yk7otlbal	pending	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmllsb4ov000rcs2y9y7h6689	cmllsb4or000qcs2yw6hiwate	cmlls5e5r0008cs2y3xk7oayb	in_progress	2026-02-14 03:56:17.406	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmllsb4ov000scs2y1w15fr5t	cmllsb4or000qcs2yw6hiwate	cmlls5e5r0009cs2yyepcq3xd	pending	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmllsb4ov000tcs2y7p05o7nc	cmllsb4or000qcs2yw6hiwate	cmlls5e5r000acs2ywcmao86n	pending	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
cmllsb4ov000ucs2ywgsts20h	cmllsb4or000qcs2yw6hiwate	cmlls5e5r000bcs2yk7otlbal	pending	\N	\N	\N	\N	\N	\N	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: workflow_steps; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.workflow_steps (id, "templateId", name, description, "stepOrder", "requiredRole", "autoAdvance", "requireApproval", conditions, actions, "notifyRoles", "createdAt", "updatedAt", "tenantId") FROM stdin;
cmllpzr8m000pjx0w7eoj7qme	cmllpzr8i000ojx0w36dbku84	Judge Submit	\N	1	JUDGE	f	t	\N	\N	[]	2026-02-14 02:51:27.526	2026-02-14 02:51:27.526	cmljlirfs0006ob68ahx75qyt
cmllpzr8m000qjx0waql4oxha	cmllpzr8i000ojx0w36dbku84	Tally Review	\N	2	TALLY_MASTER	f	t	\N	\N	[]	2026-02-14 02:51:27.526	2026-02-14 02:51:27.526	cmljlirfs0006ob68ahx75qyt
cmlls5e5h0002cs2y8v0hqpn2	cmlls5e5d0001cs2y4420c7iw	Judge Certification	\N	1	JUDGE	f	t	\N	\N	[]	2026-02-14 03:51:49.733	2026-02-14 03:51:49.733	cmljlirfs0006ob68ahx75qyt
cmlls5e5h0003cs2ykslom5gd	cmlls5e5d0001cs2y4420c7iw	Tally Review	\N	2	TALLY_MASTER	f	t	\N	\N	[]	2026-02-14 03:51:49.733	2026-02-14 03:51:49.733	cmljlirfs0006ob68ahx75qyt
cmlls5e5h0004cs2y5x6uw51m	cmlls5e5d0001cs2y4420c7iw	Auditor Review	\N	3	AUDITOR	f	t	\N	\N	[]	2026-02-14 03:51:49.733	2026-02-14 03:51:49.733	cmljlirfs0006ob68ahx75qyt
cmlls5e5h0005cs2ywq3omb19	cmlls5e5d0001cs2y4420c7iw	Board/Organizer Final	\N	4	ORGANIZER	f	t	\N	\N	[]	2026-02-14 03:51:49.733	2026-02-14 03:51:49.733	cmljlirfs0006ob68ahx75qyt
cmlls5e5r0008cs2y3xk7oayb	cmlls5e5p0007cs2y5d22xqyq	Request Submitted	\N	1	JUDGE	f	t	\N	\N	[]	2026-02-14 03:51:49.744	2026-02-14 03:51:49.744	cmljlirfs0006ob68ahx75qyt
cmlls5e5r0009cs2yyepcq3xd	cmlls5e5p0007cs2y5d22xqyq	Primary Review	\N	2	TALLY_MASTER	f	t	\N	\N	[]	2026-02-14 03:51:49.744	2026-02-14 03:51:49.744	cmljlirfs0006ob68ahx75qyt
cmlls5e5r000acs2ywcmao86n	cmlls5e5p0007cs2y5d22xqyq	Secondary Approval	\N	3	AUDITOR	f	t	\N	\N	[]	2026-02-14 03:51:49.744	2026-02-14 03:51:49.744	cmljlirfs0006ob68ahx75qyt
cmlls5e5r000bcs2yk7otlbal	cmlls5e5p0007cs2y5d22xqyq	Final Authorization	\N	4	ADMIN	f	t	\N	\N	[]	2026-02-14 03:51:49.744	2026-02-14 03:51:49.744	cmljlirfs0006ob68ahx75qyt
\.


--
-- Data for Name: workflow_templates; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.workflow_templates (id, "tenantId", name, description, type, "isDefault", "isActive", config, "createdAt", "updatedAt") FROM stdin;
cmlls5e5d0001cs2y4420c7iw	cmljlirfs0006ob68ahx75qyt	Score Certification Pipeline	Judge -> Tally -> Auditor -> Board/Organizer multi-step certification workflow	certification	t	t	{"steps": [{"name": "Judge Certification", "stepOrder": 1, "requiredRole": "JUDGE", "requireApproval": true}, {"name": "Tally Review", "stepOrder": 2, "requiredRole": "TALLY_MASTER", "requireApproval": true}, {"name": "Auditor Review", "stepOrder": 3, "requiredRole": "AUDITOR", "requireApproval": true}, {"name": "Board/Organizer Final", "stepOrder": 4, "requiredRole": "ORGANIZER", "requireApproval": true}]}	2026-02-14 03:51:49.73	2026-02-14 03:51:49.73
cmlls5e5p0007cs2y5d22xqyq	cmljlirfs0006ob68ahx75qyt	Score Governance Request Flow	Governed request/approval flow for score removals or uncertifications	governance	t	t	{"steps": [{"name": "Request Submitted", "stepOrder": 1, "requiredRole": "JUDGE", "requireApproval": true}, {"name": "Primary Review", "stepOrder": 2, "requiredRole": "TALLY_MASTER", "requireApproval": true}, {"name": "Secondary Approval", "stepOrder": 3, "requiredRole": "AUDITOR", "requireApproval": true}, {"name": "Final Authorization", "stepOrder": 4, "requiredRole": "ADMIN", "requireApproval": true}]}	2026-02-14 03:51:49.742	2026-02-14 03:51:49.742
\.


--
-- Data for Name: workflow_transitions; Type: TABLE DATA; Schema: public; Owner: event_manager
--

COPY public.workflow_transitions (id, "fromStepId", "toStepId", condition, "transitionType", priority, "createdAt", "tenantId") FROM stdin;
\.


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: archived_events archived_events_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.archived_events
    ADD CONSTRAINT archived_events_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auditor_assignments auditor_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.auditor_assignments
    ADD CONSTRAINT auditor_assignments_pkey PRIMARY KEY (id);


--
-- Name: backup_logs backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);


--
-- Name: backup_schedules backup_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_pkey PRIMARY KEY (id);


--
-- Name: backup_settings backup_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.backup_settings
    ADD CONSTRAINT backup_settings_pkey PRIMARY KEY (id);


--
-- Name: backup_targets backup_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.backup_targets
    ADD CONSTRAINT backup_targets_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_certifications category_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_certifications
    ADD CONSTRAINT category_certifications_pkey PRIMARY KEY (id);


--
-- Name: category_contestants category_contestants_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_contestants
    ADD CONSTRAINT category_contestants_pkey PRIMARY KEY ("categoryId", "contestantId");


--
-- Name: category_judges category_judges_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_judges
    ADD CONSTRAINT category_judges_pkey PRIMARY KEY ("categoryId", "judgeId");


--
-- Name: category_templates category_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_templates
    ADD CONSTRAINT category_templates_pkey PRIMARY KEY (id);


--
-- Name: category_types category_types_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_types
    ADD CONSTRAINT category_types_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: contest_certifications contest_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_certifications
    ADD CONSTRAINT contest_certifications_pkey PRIMARY KEY (id);


--
-- Name: contest_contestants contest_contestants_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_contestants
    ADD CONSTRAINT contest_contestants_pkey PRIMARY KEY ("contestId", "contestantId");


--
-- Name: contest_judges contest_judges_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_judges
    ADD CONSTRAINT contest_judges_pkey PRIMARY KEY ("contestId", "judgeId");


--
-- Name: contestants contestants_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contestants
    ADD CONSTRAINT contestants_pkey PRIMARY KEY (id);


--
-- Name: contests contests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contests
    ADD CONSTRAINT contests_pkey PRIMARY KEY (id);


--
-- Name: criteria criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.criteria
    ADD CONSTRAINT criteria_pkey PRIMARY KEY (id);


--
-- Name: custom_field_values custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: custom_fields custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.custom_fields
    ADD CONSTRAINT custom_fields_pkey PRIMARY KEY (id);


--
-- Name: deduction_approvals deduction_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.deduction_approvals
    ADD CONSTRAINT deduction_approvals_pkey PRIMARY KEY (id);


--
-- Name: deduction_requests deduction_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.deduction_requests
    ADD CONSTRAINT deduction_requests_pkey PRIMARY KEY (id);


--
-- Name: dr_configs dr_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.dr_configs
    ADD CONSTRAINT dr_configs_pkey PRIMARY KEY (id);


--
-- Name: dr_metrics dr_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.dr_metrics
    ADD CONSTRAINT dr_metrics_pkey PRIMARY KEY (id);


--
-- Name: dr_test_logs dr_test_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.dr_test_logs
    ADD CONSTRAINT dr_test_logs_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: emcee_scripts emcee_scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.emcee_scripts
    ADD CONSTRAINT emcee_scripts_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: event_logs event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.event_logs
    ADD CONSTRAINT event_logs_pkey PRIMARY KEY (id);


--
-- Name: event_templates event_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.event_templates
    ADD CONSTRAINT event_templates_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: judge_certifications judge_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_certifications
    ADD CONSTRAINT judge_certifications_pkey PRIMARY KEY (id);


--
-- Name: judge_comments judge_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_comments
    ADD CONSTRAINT judge_comments_pkey PRIMARY KEY (id);


--
-- Name: judge_contestant_certifications judge_contestant_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_contestant_certifications
    ADD CONSTRAINT judge_contestant_certifications_pkey PRIMARY KEY (id);


--
-- Name: judge_score_removal_requests judge_score_removal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_score_removal_requests
    ADD CONSTRAINT judge_score_removal_requests_pkey PRIMARY KEY (id);


--
-- Name: judge_uncertification_requests judge_uncertification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_uncertification_requests
    ADD CONSTRAINT judge_uncertification_requests_pkey PRIMARY KEY (id);


--
-- Name: judges judges_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judges
    ADD CONSTRAINT judges_pkey PRIMARY KEY (id);


--
-- Name: logging_settings logging_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.logging_settings
    ADD CONSTRAINT logging_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_digests notification_digests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notification_digests
    ADD CONSTRAINT notification_digests_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: overall_deductions overall_deductions_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.overall_deductions
    ADD CONSTRAINT overall_deductions_pkey PRIMARY KEY (id);


--
-- Name: password_histories password_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.password_histories
    ADD CONSTRAINT password_histories_pkey PRIMARY KEY (id);


--
-- Name: password_policies password_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.password_policies
    ADD CONSTRAINT password_policies_pkey PRIMARY KEY (id);


--
-- Name: performance_logs performance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.performance_logs
    ADD CONSTRAINT performance_logs_pkey PRIMARY KEY (id);


--
-- Name: permission_audit_logs permission_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_configs rate_limit_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.rate_limit_configs
    ADD CONSTRAINT rate_limit_configs_pkey PRIMARY KEY (id);


--
-- Name: report_instances report_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.report_instances
    ADD CONSTRAINT report_instances_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: review_contestant_certifications review_contestant_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_contestant_certifications
    ADD CONSTRAINT review_contestant_certifications_pkey PRIMARY KEY (id);


--
-- Name: review_judge_score_certifications review_judge_score_certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_judge_score_certifications
    ADD CONSTRAINT review_judge_score_certifications_pkey PRIMARY KEY (id);


--
-- Name: role_assignments role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT role_assignments_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: score_comments score_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_comments
    ADD CONSTRAINT score_comments_pkey PRIMARY KEY (id);


--
-- Name: score_files score_files_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_files
    ADD CONSTRAINT score_files_pkey PRIMARY KEY (id);


--
-- Name: score_governance_approvals score_governance_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_approvals
    ADD CONSTRAINT score_governance_approvals_pkey PRIMARY KEY (id);


--
-- Name: score_governance_requests score_governance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT score_governance_requests_pkey PRIMARY KEY (id);


--
-- Name: score_removal_requests score_removal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_removal_requests
    ADD CONSTRAINT score_removal_requests_pkey PRIMARY KEY (id);


--
-- Name: scores scores_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT scores_pkey PRIMARY KEY (id);


--
-- Name: search_analytics search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: security_settings security_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.security_settings
    ADD CONSTRAINT security_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tally_master_assignments tally_master_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tally_master_assignments
    ADD CONSTRAINT tally_master_assignments_pkey PRIMARY KEY (id);


--
-- Name: template_criteria template_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.template_criteria
    ADD CONSTRAINT template_criteria_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: theme_settings theme_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.theme_settings
    ADD CONSTRAINT theme_settings_pkey PRIMARY KEY (id);


--
-- Name: user_field_configurations user_field_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.user_field_configurations
    ADD CONSTRAINT user_field_configurations_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_configs webhook_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.webhook_configs
    ADD CONSTRAINT webhook_configs_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: winner_signatures winner_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.winner_signatures
    ADD CONSTRAINT winner_signatures_pkey PRIMARY KEY (id);


--
-- Name: workflow_instances workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.workflow_instances
    ADD CONSTRAINT workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: workflow_step_executions workflow_step_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.workflow_step_executions
    ADD CONSTRAINT workflow_step_executions_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: workflow_templates workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: workflow_transitions workflow_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT workflow_transitions_pkey PRIMARY KEY (id);


--
-- Name: activity_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "activity_logs_createdAt_idx" ON public.activity_logs USING btree ("createdAt");


--
-- Name: activity_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "activity_logs_tenantId_idx" ON public.activity_logs USING btree ("tenantId");


--
-- Name: activity_logs_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "activity_logs_userId_idx" ON public.activity_logs USING btree ("userId");


--
-- Name: archived_events_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "archived_events_eventId_idx" ON public.archived_events USING btree ("eventId");


--
-- Name: archived_events_tenantId_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "archived_events_tenantId_eventId_idx" ON public.archived_events USING btree ("tenantId", "eventId");


--
-- Name: archived_events_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "archived_events_tenantId_idx" ON public.archived_events USING btree ("tenantId");


--
-- Name: assignments_contestId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "assignments_contestId_categoryId_idx" ON public.assignments USING btree ("contestId", "categoryId");


--
-- Name: assignments_judgeId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "assignments_judgeId_status_idx" ON public.assignments USING btree ("judgeId", status);


--
-- Name: assignments_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "assignments_tenantId_idx" ON public.assignments USING btree ("tenantId");


--
-- Name: assignments_tenantId_judgeId_categoryId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "assignments_tenantId_judgeId_categoryId_key" ON public.assignments USING btree ("tenantId", "judgeId", "categoryId");


--
-- Name: assignments_tenantId_judgeId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "assignments_tenantId_judgeId_status_idx" ON public.assignments USING btree ("tenantId", "judgeId", status);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: audit_logs_tenantId_action_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "audit_logs_tenantId_action_idx" ON public.audit_logs USING btree ("tenantId", action);


--
-- Name: audit_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "audit_logs_tenantId_idx" ON public.audit_logs USING btree ("tenantId");


--
-- Name: audit_logs_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "audit_logs_tenantId_userId_idx" ON public.audit_logs USING btree ("tenantId", "userId");


--
-- Name: audit_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX audit_logs_timestamp_idx ON public.audit_logs USING btree ("timestamp");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: auditor_assignments_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "auditor_assignments_eventId_idx" ON public.auditor_assignments USING btree ("eventId");


--
-- Name: auditor_assignments_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "auditor_assignments_tenantId_idx" ON public.auditor_assignments USING btree ("tenantId");


--
-- Name: auditor_assignments_tenantId_userId_categoryId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "auditor_assignments_tenantId_userId_categoryId_key" ON public.auditor_assignments USING btree ("tenantId", "userId", "categoryId");


--
-- Name: auditor_assignments_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "auditor_assignments_userId_idx" ON public.auditor_assignments USING btree ("userId");


--
-- Name: backup_logs_startedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "backup_logs_startedAt_idx" ON public.backup_logs USING btree ("startedAt");


--
-- Name: backup_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "backup_logs_tenantId_idx" ON public.backup_logs USING btree ("tenantId");


--
-- Name: backup_logs_tenantId_type_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "backup_logs_tenantId_type_status_idx" ON public.backup_logs USING btree ("tenantId", type, status);


--
-- Name: backup_logs_type_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX backup_logs_type_status_idx ON public.backup_logs USING btree (type, status);


--
-- Name: backup_schedules_enabled_nextRunAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "backup_schedules_enabled_nextRunAt_idx" ON public.backup_schedules USING btree (enabled, "nextRunAt");


--
-- Name: backup_schedules_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "backup_schedules_tenantId_idx" ON public.backup_schedules USING btree ("tenantId");


--
-- Name: backup_targets_enabled_priority_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX backup_targets_enabled_priority_idx ON public.backup_targets USING btree (enabled, priority);


--
-- Name: backup_targets_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "backup_targets_tenantId_idx" ON public.backup_targets USING btree ("tenantId");


--
-- Name: categories_contestId_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "categories_contestId_createdAt_idx" ON public.categories USING btree ("contestId", "createdAt");


--
-- Name: categories_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "categories_contestId_idx" ON public.categories USING btree ("contestId");


--
-- Name: categories_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "categories_tenantId_contestId_idx" ON public.categories USING btree ("tenantId", "contestId");


--
-- Name: categories_tenantId_deletedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "categories_tenantId_deletedAt_idx" ON public.categories USING btree ("tenantId", "deletedAt");


--
-- Name: categories_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "categories_tenantId_idx" ON public.categories USING btree ("tenantId");


--
-- Name: category_certifications_categoryId_role_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_certifications_categoryId_role_idx" ON public.category_certifications USING btree ("categoryId", role);


--
-- Name: category_certifications_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_certifications_tenantId_categoryId_idx" ON public.category_certifications USING btree ("tenantId", "categoryId");


--
-- Name: category_certifications_tenantId_categoryId_role_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "category_certifications_tenantId_categoryId_role_key" ON public.category_certifications USING btree ("tenantId", "categoryId", role);


--
-- Name: category_certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_certifications_tenantId_idx" ON public.category_certifications USING btree ("tenantId");


--
-- Name: category_contestants_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_contestants_categoryId_idx" ON public.category_contestants USING btree ("categoryId");


--
-- Name: category_contestants_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_contestants_tenantId_categoryId_idx" ON public.category_contestants USING btree ("tenantId", "categoryId");


--
-- Name: category_contestants_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_contestants_tenantId_idx" ON public.category_contestants USING btree ("tenantId");


--
-- Name: category_judges_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_judges_categoryId_idx" ON public.category_judges USING btree ("categoryId");


--
-- Name: category_judges_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_judges_tenantId_categoryId_idx" ON public.category_judges USING btree ("tenantId", "categoryId");


--
-- Name: category_judges_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_judges_tenantId_idx" ON public.category_judges USING btree ("tenantId");


--
-- Name: category_templates_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_templates_tenantId_idx" ON public.category_templates USING btree ("tenantId");


--
-- Name: category_templates_tenantId_name_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "category_templates_tenantId_name_idx" ON public.category_templates USING btree ("tenantId", name);


--
-- Name: category_types_name_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX category_types_name_key ON public.category_types USING btree (name);


--
-- Name: certifications_tenantId_categoryId_contestId_eventId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "certifications_tenantId_categoryId_contestId_eventId_key" ON public.certifications USING btree ("tenantId", "categoryId", "contestId", "eventId");


--
-- Name: certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "certifications_tenantId_idx" ON public.certifications USING btree ("tenantId");


--
-- Name: certifications_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "certifications_tenantId_status_idx" ON public.certifications USING btree ("tenantId", status);


--
-- Name: contest_certifications_contestId_role_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_certifications_contestId_role_idx" ON public.contest_certifications USING btree ("contestId", role);


--
-- Name: contest_certifications_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_certifications_tenantId_contestId_idx" ON public.contest_certifications USING btree ("tenantId", "contestId");


--
-- Name: contest_certifications_tenantId_contestId_role_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "contest_certifications_tenantId_contestId_role_key" ON public.contest_certifications USING btree ("tenantId", "contestId", role);


--
-- Name: contest_certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_certifications_tenantId_idx" ON public.contest_certifications USING btree ("tenantId");


--
-- Name: contest_contestants_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_contestants_contestId_idx" ON public.contest_contestants USING btree ("contestId");


--
-- Name: contest_contestants_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_contestants_tenantId_contestId_idx" ON public.contest_contestants USING btree ("tenantId", "contestId");


--
-- Name: contest_contestants_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_contestants_tenantId_idx" ON public.contest_contestants USING btree ("tenantId");


--
-- Name: contest_judges_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_judges_contestId_idx" ON public.contest_judges USING btree ("contestId");


--
-- Name: contest_judges_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_judges_tenantId_contestId_idx" ON public.contest_judges USING btree ("tenantId", "contestId");


--
-- Name: contest_judges_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contest_judges_tenantId_idx" ON public.contest_judges USING btree ("tenantId");


--
-- Name: contestants_tenantId_contestantNumber_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contestants_tenantId_contestantNumber_idx" ON public.contestants USING btree ("tenantId", "contestantNumber");


--
-- Name: contestants_tenantId_email_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "contestants_tenantId_email_key" ON public.contestants USING btree ("tenantId", email);


--
-- Name: contestants_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contestants_tenantId_idx" ON public.contestants USING btree ("tenantId");


--
-- Name: contests_eventId_archived_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contests_eventId_archived_idx" ON public.contests USING btree ("eventId", archived);


--
-- Name: contests_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contests_eventId_idx" ON public.contests USING btree ("eventId");


--
-- Name: contests_tenantId_deletedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contests_tenantId_deletedAt_idx" ON public.contests USING btree ("tenantId", "deletedAt");


--
-- Name: contests_tenantId_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contests_tenantId_eventId_idx" ON public.contests USING btree ("tenantId", "eventId");


--
-- Name: contests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "contests_tenantId_idx" ON public.contests USING btree ("tenantId");


--
-- Name: criteria_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "criteria_categoryId_idx" ON public.criteria USING btree ("categoryId");


--
-- Name: criteria_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "criteria_tenantId_categoryId_idx" ON public.criteria USING btree ("tenantId", "categoryId");


--
-- Name: criteria_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "criteria_tenantId_idx" ON public.criteria USING btree ("tenantId");


--
-- Name: custom_field_values_customFieldId_entityId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_field_values_customFieldId_entityId_idx" ON public.custom_field_values USING btree ("customFieldId", "entityId");


--
-- Name: custom_field_values_entityId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_field_values_entityId_idx" ON public.custom_field_values USING btree ("entityId");


--
-- Name: custom_field_values_tenantId_customFieldId_entityId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "custom_field_values_tenantId_customFieldId_entityId_key" ON public.custom_field_values USING btree ("tenantId", "customFieldId", "entityId");


--
-- Name: custom_field_values_tenantId_entityId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_field_values_tenantId_entityId_idx" ON public.custom_field_values USING btree ("tenantId", "entityId");


--
-- Name: custom_field_values_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_field_values_tenantId_idx" ON public.custom_field_values USING btree ("tenantId");


--
-- Name: custom_fields_entityType_active_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_fields_entityType_active_idx" ON public.custom_fields USING btree ("entityType", active);


--
-- Name: custom_fields_key_entityType_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_fields_key_entityType_idx" ON public.custom_fields USING btree (key, "entityType");


--
-- Name: custom_fields_tenantId_entityType_active_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_fields_tenantId_entityType_active_idx" ON public.custom_fields USING btree ("tenantId", "entityType", active);


--
-- Name: custom_fields_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "custom_fields_tenantId_idx" ON public.custom_fields USING btree ("tenantId");


--
-- Name: custom_fields_tenantId_key_entityType_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "custom_fields_tenantId_key_entityType_key" ON public.custom_fields USING btree ("tenantId", key, "entityType");


--
-- Name: deduction_approvals_requestId_approvedById_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_approvals_requestId_approvedById_idx" ON public.deduction_approvals USING btree ("requestId", "approvedById");


--
-- Name: deduction_approvals_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_approvals_tenantId_idx" ON public.deduction_approvals USING btree ("tenantId");


--
-- Name: deduction_approvals_tenantId_requestId_approvedById_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "deduction_approvals_tenantId_requestId_approvedById_key" ON public.deduction_approvals USING btree ("tenantId", "requestId", "approvedById");


--
-- Name: deduction_approvals_tenantId_requestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_approvals_tenantId_requestId_idx" ON public.deduction_approvals USING btree ("tenantId", "requestId");


--
-- Name: deduction_requests_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_requests_categoryId_idx" ON public.deduction_requests USING btree ("categoryId");


--
-- Name: deduction_requests_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_requests_tenantId_categoryId_idx" ON public.deduction_requests USING btree ("tenantId", "categoryId");


--
-- Name: deduction_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_requests_tenantId_idx" ON public.deduction_requests USING btree ("tenantId");


--
-- Name: deduction_requests_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "deduction_requests_tenantId_status_idx" ON public.deduction_requests USING btree ("tenantId", status);


--
-- Name: dr_configs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_configs_tenantId_idx" ON public.dr_configs USING btree ("tenantId");


--
-- Name: dr_metrics_metricType_timestamp_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_metrics_metricType_timestamp_idx" ON public.dr_metrics USING btree ("metricType", "timestamp");


--
-- Name: dr_metrics_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_metrics_tenantId_idx" ON public.dr_metrics USING btree ("tenantId");


--
-- Name: dr_metrics_tenantId_metricType_timestamp_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_metrics_tenantId_metricType_timestamp_idx" ON public.dr_metrics USING btree ("tenantId", "metricType", "timestamp");


--
-- Name: dr_test_logs_startedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_test_logs_startedAt_idx" ON public.dr_test_logs USING btree ("startedAt");


--
-- Name: dr_test_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_test_logs_tenantId_idx" ON public.dr_test_logs USING btree ("tenantId");


--
-- Name: dr_test_logs_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "dr_test_logs_tenantId_status_idx" ON public.dr_test_logs USING btree ("tenantId", status);


--
-- Name: email_logs_sentAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_logs_sentAt_idx" ON public.email_logs USING btree ("sentAt");


--
-- Name: email_logs_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX email_logs_status_idx ON public.email_logs USING btree (status);


--
-- Name: email_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_logs_tenantId_idx" ON public.email_logs USING btree ("tenantId");


--
-- Name: email_logs_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_logs_tenantId_status_idx" ON public.email_logs USING btree ("tenantId", status);


--
-- Name: email_logs_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_logs_tenantId_userId_idx" ON public.email_logs USING btree ("tenantId", "userId");


--
-- Name: email_templates_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_templates_eventId_idx" ON public.email_templates USING btree ("eventId");


--
-- Name: email_templates_tenantId_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_templates_tenantId_eventId_idx" ON public.email_templates USING btree ("tenantId", "eventId");


--
-- Name: email_templates_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_templates_tenantId_idx" ON public.email_templates USING btree ("tenantId");


--
-- Name: email_templates_tenantId_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "email_templates_tenantId_type_idx" ON public.email_templates USING btree ("tenantId", type);


--
-- Name: email_templates_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX email_templates_type_idx ON public.email_templates USING btree (type);


--
-- Name: emcee_scripts_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_categoryId_idx" ON public.emcee_scripts USING btree ("categoryId");


--
-- Name: emcee_scripts_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_contestId_idx" ON public.emcee_scripts USING btree ("contestId");


--
-- Name: emcee_scripts_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_eventId_idx" ON public.emcee_scripts USING btree ("eventId");


--
-- Name: emcee_scripts_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_tenantId_categoryId_idx" ON public.emcee_scripts USING btree ("tenantId", "categoryId");


--
-- Name: emcee_scripts_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_tenantId_contestId_idx" ON public.emcee_scripts USING btree ("tenantId", "contestId");


--
-- Name: emcee_scripts_tenantId_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_tenantId_eventId_idx" ON public.emcee_scripts USING btree ("tenantId", "eventId");


--
-- Name: emcee_scripts_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "emcee_scripts_tenantId_idx" ON public.emcee_scripts USING btree ("tenantId");


--
-- Name: error_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "error_logs_createdAt_idx" ON public.error_logs USING btree ("createdAt");


--
-- Name: error_logs_level_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX error_logs_level_idx ON public.error_logs USING btree (level);


--
-- Name: error_logs_resolved_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX error_logs_resolved_idx ON public.error_logs USING btree (resolved);


--
-- Name: error_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "error_logs_tenantId_idx" ON public.error_logs USING btree ("tenantId");


--
-- Name: error_logs_tenantId_level_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "error_logs_tenantId_level_idx" ON public.error_logs USING btree ("tenantId", level);


--
-- Name: event_logs_correlationId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "event_logs_correlationId_idx" ON public.event_logs USING btree ("correlationId");


--
-- Name: event_logs_eventType_timestamp_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "event_logs_eventType_timestamp_idx" ON public.event_logs USING btree ("eventType", "timestamp");


--
-- Name: event_logs_processed_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX event_logs_processed_idx ON public.event_logs USING btree (processed);


--
-- Name: event_logs_tenantId_eventType_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "event_logs_tenantId_eventType_idx" ON public.event_logs USING btree ("tenantId", "eventType");


--
-- Name: event_logs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "event_logs_tenantId_idx" ON public.event_logs USING btree ("tenantId");


--
-- Name: event_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX event_logs_timestamp_idx ON public.event_logs USING btree ("timestamp");


--
-- Name: event_templates_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "event_templates_tenantId_idx" ON public.event_templates USING btree ("tenantId");


--
-- Name: event_templates_tenantId_name_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "event_templates_tenantId_name_idx" ON public.event_templates USING btree ("tenantId", name);


--
-- Name: events_tenantId_archived_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "events_tenantId_archived_idx" ON public.events USING btree ("tenantId", archived);


--
-- Name: events_tenantId_deletedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "events_tenantId_deletedAt_idx" ON public.events USING btree ("tenantId", "deletedAt");


--
-- Name: events_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "events_tenantId_idx" ON public.events USING btree ("tenantId");


--
-- Name: feature_flags_enabled_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX feature_flags_enabled_idx ON public.feature_flags USING btree (enabled);


--
-- Name: feature_flags_name_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX feature_flags_name_idx ON public.feature_flags USING btree (name);


--
-- Name: feature_flags_name_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name);


--
-- Name: files_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_categoryId_idx" ON public.files USING btree ("categoryId");


--
-- Name: files_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_contestId_idx" ON public.files USING btree ("contestId");


--
-- Name: files_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_eventId_idx" ON public.files USING btree ("eventId");


--
-- Name: files_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_tenantId_categoryId_idx" ON public.files USING btree ("tenantId", "categoryId");


--
-- Name: files_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_tenantId_contestId_idx" ON public.files USING btree ("tenantId", "contestId");


--
-- Name: files_tenantId_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_tenantId_eventId_idx" ON public.files USING btree ("tenantId", "eventId");


--
-- Name: files_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_tenantId_idx" ON public.files USING btree ("tenantId");


--
-- Name: files_tenantId_uploadedBy_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "files_tenantId_uploadedBy_idx" ON public.files USING btree ("tenantId", "uploadedBy");


--
-- Name: idx_categories_contest_id; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX idx_categories_contest_id ON public.categories USING btree ("contestId");


--
-- Name: idx_contestant_number; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX idx_contestant_number ON public.contestants USING btree ("contestantNumber");


--
-- Name: idx_contests_event_archived; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX idx_contests_event_archived ON public.contests USING btree ("eventId", archived);


--
-- Name: idx_contests_event_id; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX idx_contests_event_id ON public.contests USING btree ("eventId");


--
-- Name: judge_certifications_categoryId_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_certifications_categoryId_judgeId_idx" ON public.judge_certifications USING btree ("categoryId", "judgeId");


--
-- Name: judge_certifications_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_certifications_tenantId_categoryId_idx" ON public.judge_certifications USING btree ("tenantId", "categoryId");


--
-- Name: judge_certifications_tenantId_categoryId_judgeId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "judge_certifications_tenantId_categoryId_judgeId_key" ON public.judge_certifications USING btree ("tenantId", "categoryId", "judgeId");


--
-- Name: judge_certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_certifications_tenantId_idx" ON public.judge_certifications USING btree ("tenantId");


--
-- Name: judge_comments_categoryId_contestantId_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_comments_categoryId_contestantId_judgeId_idx" ON public.judge_comments USING btree ("categoryId", "contestantId", "judgeId");


--
-- Name: judge_comments_tenantId_categoryId_contestantId_judgeId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "judge_comments_tenantId_categoryId_contestantId_judgeId_key" ON public.judge_comments USING btree ("tenantId", "categoryId", "contestantId", "judgeId");


--
-- Name: judge_comments_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_comments_tenantId_categoryId_idx" ON public.judge_comments USING btree ("tenantId", "categoryId");


--
-- Name: judge_comments_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_comments_tenantId_idx" ON public.judge_comments USING btree ("tenantId");


--
-- Name: judge_contestant_certifications_categoryId_judgeId_contesta_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_contestant_certifications_categoryId_judgeId_contesta_idx" ON public.judge_contestant_certifications USING btree ("categoryId", "judgeId", "contestantId");


--
-- Name: judge_contestant_certifications_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_contestant_certifications_tenantId_categoryId_idx" ON public.judge_contestant_certifications USING btree ("tenantId", "categoryId");


--
-- Name: judge_contestant_certifications_tenantId_categoryId_judgeId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "judge_contestant_certifications_tenantId_categoryId_judgeId_key" ON public.judge_contestant_certifications USING btree ("tenantId", "categoryId", "judgeId", "contestantId");


--
-- Name: judge_contestant_certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_contestant_certifications_tenantId_idx" ON public.judge_contestant_certifications USING btree ("tenantId");


--
-- Name: judge_score_removal_requests_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_score_removal_requests_categoryId_idx" ON public.judge_score_removal_requests USING btree ("categoryId");


--
-- Name: judge_score_removal_requests_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_score_removal_requests_tenantId_categoryId_idx" ON public.judge_score_removal_requests USING btree ("tenantId", "categoryId");


--
-- Name: judge_score_removal_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_score_removal_requests_tenantId_idx" ON public.judge_score_removal_requests USING btree ("tenantId");


--
-- Name: judge_score_removal_requests_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_score_removal_requests_tenantId_status_idx" ON public.judge_score_removal_requests USING btree ("tenantId", status);


--
-- Name: judge_uncertification_requests_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_uncertification_requests_categoryId_idx" ON public.judge_uncertification_requests USING btree ("categoryId");


--
-- Name: judge_uncertification_requests_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_uncertification_requests_tenantId_categoryId_idx" ON public.judge_uncertification_requests USING btree ("tenantId", "categoryId");


--
-- Name: judge_uncertification_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_uncertification_requests_tenantId_idx" ON public.judge_uncertification_requests USING btree ("tenantId");


--
-- Name: judge_uncertification_requests_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judge_uncertification_requests_tenantId_status_idx" ON public.judge_uncertification_requests USING btree ("tenantId", status);


--
-- Name: judges_tenantId_email_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "judges_tenantId_email_key" ON public.judges USING btree ("tenantId", email);


--
-- Name: judges_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "judges_tenantId_idx" ON public.judges USING btree ("tenantId");


--
-- Name: notification_digests_nextSendAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_digests_nextSendAt_idx" ON public.notification_digests USING btree ("nextSendAt");


--
-- Name: notification_digests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_digests_tenantId_idx" ON public.notification_digests USING btree ("tenantId");


--
-- Name: notification_digests_tenantId_nextSendAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_digests_tenantId_nextSendAt_idx" ON public.notification_digests USING btree ("tenantId", "nextSendAt");


--
-- Name: notification_digests_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_digests_tenantId_userId_idx" ON public.notification_digests USING btree ("tenantId", "userId");


--
-- Name: notification_digests_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_digests_userId_idx" ON public.notification_digests USING btree ("userId");


--
-- Name: notification_preferences_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_preferences_tenantId_idx" ON public.notification_preferences USING btree ("tenantId");


--
-- Name: notification_preferences_tenantId_userId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "notification_preferences_tenantId_userId_key" ON public.notification_preferences USING btree ("tenantId", "userId");


--
-- Name: notification_preferences_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_preferences_userId_idx" ON public.notification_preferences USING btree ("userId");


--
-- Name: notification_templates_name_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX notification_templates_name_idx ON public.notification_templates USING btree (name);


--
-- Name: notification_templates_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_templates_tenantId_idx" ON public.notification_templates USING btree ("tenantId");


--
-- Name: notification_templates_tenantId_name_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "notification_templates_tenantId_name_key" ON public.notification_templates USING btree ("tenantId", name);


--
-- Name: notification_templates_tenantId_type_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_templates_tenantId_type_isActive_idx" ON public.notification_templates USING btree ("tenantId", type, "isActive");


--
-- Name: notification_templates_type_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notification_templates_type_isActive_idx" ON public.notification_templates USING btree (type, "isActive");


--
-- Name: notifications_deletedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_deletedAt_idx" ON public.notifications USING btree ("deletedAt");


--
-- Name: notifications_sentBy_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_sentBy_createdAt_idx" ON public.notifications USING btree ("sentBy", "createdAt");


--
-- Name: notifications_templateId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_templateId_idx" ON public.notifications USING btree ("templateId");


--
-- Name: notifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_tenantId_idx" ON public.notifications USING btree ("tenantId");


--
-- Name: notifications_tenantId_userId_read_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_tenantId_userId_read_idx" ON public.notifications USING btree ("tenantId", "userId", read);


--
-- Name: notifications_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_userId_createdAt_idx" ON public.notifications USING btree ("userId", "createdAt");


--
-- Name: notifications_userId_read_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "notifications_userId_read_idx" ON public.notifications USING btree ("userId", read);


--
-- Name: overall_deductions_categoryId_contestantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "overall_deductions_categoryId_contestantId_idx" ON public.overall_deductions USING btree ("categoryId", "contestantId");


--
-- Name: overall_deductions_tenantId_categoryId_contestantId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "overall_deductions_tenantId_categoryId_contestantId_key" ON public.overall_deductions USING btree ("tenantId", "categoryId", "contestantId");


--
-- Name: overall_deductions_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "overall_deductions_tenantId_categoryId_idx" ON public.overall_deductions USING btree ("tenantId", "categoryId");


--
-- Name: overall_deductions_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "overall_deductions_tenantId_idx" ON public.overall_deductions USING btree ("tenantId");


--
-- Name: password_histories_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "password_histories_createdAt_idx" ON public.password_histories USING btree ("createdAt");


--
-- Name: password_histories_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "password_histories_userId_idx" ON public.password_histories USING btree ("userId");


--
-- Name: permission_audit_logs_tenantId_changedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "permission_audit_logs_tenantId_changedAt_idx" ON public.permission_audit_logs USING btree ("tenantId", "changedAt");


--
-- Name: rate_limit_configs_enabled_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX rate_limit_configs_enabled_idx ON public.rate_limit_configs USING btree (enabled);


--
-- Name: rate_limit_configs_endpoint_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX rate_limit_configs_endpoint_idx ON public.rate_limit_configs USING btree (endpoint);


--
-- Name: rate_limit_configs_tenantId_endpoint_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "rate_limit_configs_tenantId_endpoint_idx" ON public.rate_limit_configs USING btree ("tenantId", endpoint);


--
-- Name: rate_limit_configs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "rate_limit_configs_tenantId_idx" ON public.rate_limit_configs USING btree ("tenantId");


--
-- Name: rate_limit_configs_tenantId_userId_endpoint_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "rate_limit_configs_tenantId_userId_endpoint_key" ON public.rate_limit_configs USING btree ("tenantId", "userId", endpoint);


--
-- Name: rate_limit_configs_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "rate_limit_configs_tenantId_userId_idx" ON public.rate_limit_configs USING btree ("tenantId", "userId");


--
-- Name: rate_limit_configs_tier_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX rate_limit_configs_tier_idx ON public.rate_limit_configs USING btree (tier);


--
-- Name: rate_limit_configs_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "rate_limit_configs_userId_idx" ON public.rate_limit_configs USING btree ("userId");


--
-- Name: report_instances_tenantId_generatedAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "report_instances_tenantId_generatedAt_idx" ON public.report_instances USING btree ("tenantId", "generatedAt");


--
-- Name: report_instances_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "report_instances_tenantId_idx" ON public.report_instances USING btree ("tenantId");


--
-- Name: report_instances_tenantId_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "report_instances_tenantId_type_idx" ON public.report_instances USING btree ("tenantId", type);


--
-- Name: report_instances_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX report_instances_type_idx ON public.report_instances USING btree (type);


--
-- Name: report_templates_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "report_templates_tenantId_idx" ON public.report_templates USING btree ("tenantId");


--
-- Name: report_templates_tenantId_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "report_templates_tenantId_type_idx" ON public.report_templates USING btree ("tenantId", type);


--
-- Name: report_templates_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX report_templates_type_idx ON public.report_templates USING btree (type);


--
-- Name: reports_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "reports_tenantId_createdAt_idx" ON public.reports USING btree ("tenantId", "createdAt");


--
-- Name: reports_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "reports_tenantId_idx" ON public.reports USING btree ("tenantId");


--
-- Name: reports_tenantId_type_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "reports_tenantId_type_idx" ON public.reports USING btree ("tenantId", type);


--
-- Name: review_contestant_certifications_categoryId_contestantId_re_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "review_contestant_certifications_categoryId_contestantId_re_idx" ON public.review_contestant_certifications USING btree ("categoryId", "contestantId", "reviewedBy");


--
-- Name: review_contestant_certifications_tenantId_categoryId_contes_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "review_contestant_certifications_tenantId_categoryId_contes_key" ON public.review_contestant_certifications USING btree ("tenantId", "categoryId", "contestantId", "reviewedBy");


--
-- Name: review_contestant_certifications_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "review_contestant_certifications_tenantId_categoryId_idx" ON public.review_contestant_certifications USING btree ("tenantId", "categoryId");


--
-- Name: review_contestant_certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "review_contestant_certifications_tenantId_idx" ON public.review_contestant_certifications USING btree ("tenantId");


--
-- Name: review_judge_score_certifications_categoryId_judgeId_review_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "review_judge_score_certifications_categoryId_judgeId_review_idx" ON public.review_judge_score_certifications USING btree ("categoryId", "judgeId", "reviewedBy");


--
-- Name: review_judge_score_certifications_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "review_judge_score_certifications_tenantId_categoryId_idx" ON public.review_judge_score_certifications USING btree ("tenantId", "categoryId");


--
-- Name: review_judge_score_certifications_tenantId_categoryId_judge_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "review_judge_score_certifications_tenantId_categoryId_judge_key" ON public.review_judge_score_certifications USING btree ("tenantId", "categoryId", "judgeId", "reviewedBy");


--
-- Name: review_judge_score_certifications_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "review_judge_score_certifications_tenantId_idx" ON public.review_judge_score_certifications USING btree ("tenantId");


--
-- Name: role_assignments_categoryId_role_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_assignments_categoryId_role_isActive_idx" ON public.role_assignments USING btree ("categoryId", role, "isActive");


--
-- Name: role_assignments_tenantId_categoryId_role_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_assignments_tenantId_categoryId_role_isActive_idx" ON public.role_assignments USING btree ("tenantId", "categoryId", role, "isActive");


--
-- Name: role_assignments_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_assignments_tenantId_idx" ON public.role_assignments USING btree ("tenantId");


--
-- Name: role_assignments_tenantId_userId_role_contestId_eventId_cat_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "role_assignments_tenantId_userId_role_contestId_eventId_cat_key" ON public.role_assignments USING btree ("tenantId", "userId", role, "contestId", "eventId", "categoryId");


--
-- Name: role_assignments_tenantId_userId_role_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_assignments_tenantId_userId_role_isActive_idx" ON public.role_assignments USING btree ("tenantId", "userId", role, "isActive");


--
-- Name: role_assignments_userId_role_contestId_eventId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_assignments_userId_role_contestId_eventId_categoryId_idx" ON public.role_assignments USING btree ("userId", role, "contestId", "eventId", "categoryId");


--
-- Name: role_assignments_userId_role_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_assignments_userId_role_isActive_idx" ON public.role_assignments USING btree ("userId", role, "isActive");


--
-- Name: role_permissions_resource_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX role_permissions_resource_idx ON public.role_permissions USING btree (resource);


--
-- Name: role_permissions_tenantId_role_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "role_permissions_tenantId_role_idx" ON public.role_permissions USING btree ("tenantId", role);


--
-- Name: role_permissions_tenantId_role_resource_operation_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "role_permissions_tenantId_role_resource_operation_key" ON public.role_permissions USING btree ("tenantId", role, resource, operation);


--
-- Name: saved_searches_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "saved_searches_tenantId_idx" ON public.saved_searches USING btree ("tenantId");


--
-- Name: saved_searches_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "saved_searches_tenantId_userId_idx" ON public.saved_searches USING btree ("tenantId", "userId");


--
-- Name: saved_searches_tenantId_userId_isPublic_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "saved_searches_tenantId_userId_isPublic_idx" ON public.saved_searches USING btree ("tenantId", "userId", "isPublic");


--
-- Name: saved_searches_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "saved_searches_userId_idx" ON public.saved_searches USING btree ("userId");


--
-- Name: saved_searches_userId_isPublic_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "saved_searches_userId_isPublic_idx" ON public.saved_searches USING btree ("userId", "isPublic");


--
-- Name: score_comments_scoreId_criterionId_contestantId_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_comments_scoreId_criterionId_contestantId_judgeId_idx" ON public.score_comments USING btree ("scoreId", "criterionId", "contestantId", "judgeId");


--
-- Name: score_comments_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_comments_tenantId_idx" ON public.score_comments USING btree ("tenantId");


--
-- Name: score_comments_tenantId_scoreId_criterionId_contestantId_ju_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "score_comments_tenantId_scoreId_criterionId_contestantId_ju_key" ON public.score_comments USING btree ("tenantId", "scoreId", "criterionId", "contestantId", "judgeId");


--
-- Name: score_comments_tenantId_scoreId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_comments_tenantId_scoreId_idx" ON public.score_comments USING btree ("tenantId", "scoreId");


--
-- Name: score_files_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_categoryId_idx" ON public.score_files USING btree ("categoryId");


--
-- Name: score_files_contestantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_contestantId_idx" ON public.score_files USING btree ("contestantId");


--
-- Name: score_files_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_judgeId_idx" ON public.score_files USING btree ("judgeId");


--
-- Name: score_files_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX score_files_status_idx ON public.score_files USING btree (status);


--
-- Name: score_files_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_tenantId_categoryId_idx" ON public.score_files USING btree ("tenantId", "categoryId");


--
-- Name: score_files_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_tenantId_idx" ON public.score_files USING btree ("tenantId");


--
-- Name: score_files_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_tenantId_status_idx" ON public.score_files USING btree ("tenantId", status);


--
-- Name: score_files_tenantId_uploadedById_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_tenantId_uploadedById_idx" ON public.score_files USING btree ("tenantId", "uploadedById");


--
-- Name: score_files_uploadedById_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_files_uploadedById_idx" ON public.score_files USING btree ("uploadedById");


--
-- Name: score_governance_approvals_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_approvals_tenantId_idx" ON public.score_governance_approvals USING btree ("tenantId");


--
-- Name: score_governance_approvals_tenantId_requestId_approvedById_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "score_governance_approvals_tenantId_requestId_approvedById_key" ON public.score_governance_approvals USING btree ("tenantId", "requestId", "approvedById");


--
-- Name: score_governance_approvals_tenantId_requestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_approvals_tenantId_requestId_idx" ON public.score_governance_approvals USING btree ("tenantId", "requestId");


--
-- Name: score_governance_requests_tenantId_actionType_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_actionType_idx" ON public.score_governance_requests USING btree ("tenantId", "actionType");


--
-- Name: score_governance_requests_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_categoryId_idx" ON public.score_governance_requests USING btree ("tenantId", "categoryId");


--
-- Name: score_governance_requests_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_contestId_idx" ON public.score_governance_requests USING btree ("tenantId", "contestId");


--
-- Name: score_governance_requests_tenantId_contestantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_contestantId_idx" ON public.score_governance_requests USING btree ("tenantId", "contestantId");


--
-- Name: score_governance_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_idx" ON public.score_governance_requests USING btree ("tenantId");


--
-- Name: score_governance_requests_tenantId_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_judgeId_idx" ON public.score_governance_requests USING btree ("tenantId", "judgeId");


--
-- Name: score_governance_requests_tenantId_scopeType_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_scopeType_idx" ON public.score_governance_requests USING btree ("tenantId", "scopeType");


--
-- Name: score_governance_requests_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_governance_requests_tenantId_status_idx" ON public.score_governance_requests USING btree ("tenantId", status);


--
-- Name: score_removal_requests_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_removal_requests_categoryId_idx" ON public.score_removal_requests USING btree ("categoryId");


--
-- Name: score_removal_requests_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX score_removal_requests_status_idx ON public.score_removal_requests USING btree (status);


--
-- Name: score_removal_requests_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_removal_requests_tenantId_categoryId_idx" ON public.score_removal_requests USING btree ("tenantId", "categoryId");


--
-- Name: score_removal_requests_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_removal_requests_tenantId_idx" ON public.score_removal_requests USING btree ("tenantId");


--
-- Name: score_removal_requests_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "score_removal_requests_tenantId_status_idx" ON public.score_removal_requests USING btree ("tenantId", status);


--
-- Name: scores_categoryId_contestantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_categoryId_contestantId_idx" ON public.scores USING btree ("categoryId", "contestantId");


--
-- Name: scores_categoryId_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_categoryId_judgeId_idx" ON public.scores USING btree ("categoryId", "judgeId");


--
-- Name: scores_isCertified_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_isCertified_categoryId_idx" ON public.scores USING btree ("isCertified", "categoryId");


--
-- Name: scores_tenantId_categoryId_contestantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_tenantId_categoryId_contestantId_idx" ON public.scores USING btree ("tenantId", "categoryId", "contestantId");


--
-- Name: scores_tenantId_categoryId_contestantId_judgeId_criterionId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "scores_tenantId_categoryId_contestantId_judgeId_criterionId_key" ON public.scores USING btree ("tenantId", "categoryId", "contestantId", "judgeId", "criterionId");


--
-- Name: scores_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_tenantId_categoryId_idx" ON public.scores USING btree ("tenantId", "categoryId");


--
-- Name: scores_tenantId_categoryId_judgeId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_tenantId_categoryId_judgeId_idx" ON public.scores USING btree ("tenantId", "categoryId", "judgeId");


--
-- Name: scores_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_tenantId_idx" ON public.scores USING btree ("tenantId");


--
-- Name: scores_tenantId_isCertified_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "scores_tenantId_isCertified_categoryId_idx" ON public.scores USING btree ("tenantId", "isCertified", "categoryId");


--
-- Name: search_analytics_query_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX search_analytics_query_idx ON public.search_analytics USING btree (query);


--
-- Name: search_analytics_searchCount_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "search_analytics_searchCount_idx" ON public.search_analytics USING btree ("searchCount");


--
-- Name: search_history_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "search_history_tenantId_idx" ON public.search_history USING btree ("tenantId");


--
-- Name: search_history_tenantId_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "search_history_tenantId_userId_createdAt_idx" ON public.search_history USING btree ("tenantId", "userId", "createdAt");


--
-- Name: search_history_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "search_history_tenantId_userId_idx" ON public.search_history USING btree ("tenantId", "userId");


--
-- Name: search_history_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "search_history_userId_createdAt_idx" ON public.search_history USING btree ("userId", "createdAt");


--
-- Name: system_settings_category_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX system_settings_category_idx ON public.system_settings USING btree (category);


--
-- Name: system_settings_key_tenantId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "system_settings_key_tenantId_key" ON public.system_settings USING btree (key, "tenantId");


--
-- Name: system_settings_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "system_settings_tenantId_idx" ON public.system_settings USING btree ("tenantId");


--
-- Name: tally_master_assignments_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "tally_master_assignments_eventId_idx" ON public.tally_master_assignments USING btree ("eventId");


--
-- Name: tally_master_assignments_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "tally_master_assignments_tenantId_idx" ON public.tally_master_assignments USING btree ("tenantId");


--
-- Name: tally_master_assignments_tenantId_userId_categoryId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "tally_master_assignments_tenantId_userId_categoryId_key" ON public.tally_master_assignments USING btree ("tenantId", "userId", "categoryId");


--
-- Name: tally_master_assignments_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "tally_master_assignments_userId_idx" ON public.tally_master_assignments USING btree ("userId");


--
-- Name: template_criteria_templateId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "template_criteria_templateId_idx" ON public.template_criteria USING btree ("templateId");


--
-- Name: template_criteria_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "template_criteria_tenantId_idx" ON public.template_criteria USING btree ("tenantId");


--
-- Name: template_criteria_tenantId_templateId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "template_criteria_tenantId_templateId_idx" ON public.template_criteria USING btree ("tenantId", "templateId");


--
-- Name: tenants_domain_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX tenants_domain_idx ON public.tenants USING btree (domain);


--
-- Name: tenants_domain_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX tenants_domain_key ON public.tenants USING btree (domain);


--
-- Name: tenants_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "tenants_isActive_idx" ON public.tenants USING btree ("isActive");


--
-- Name: tenants_slug_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX tenants_slug_idx ON public.tenants USING btree (slug);


--
-- Name: tenants_slug_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug);


--
-- Name: theme_settings_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "theme_settings_tenantId_idx" ON public.theme_settings USING btree ("tenantId");


--
-- Name: theme_settings_tenantId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "theme_settings_tenantId_key" ON public.theme_settings USING btree ("tenantId");


--
-- Name: user_field_configurations_fieldName_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "user_field_configurations_fieldName_key" ON public.user_field_configurations USING btree ("fieldName");


--
-- Name: users_tenantId_email_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "users_tenantId_email_key" ON public.users USING btree ("tenantId", email);


--
-- Name: users_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "users_tenantId_idx" ON public.users USING btree ("tenantId");


--
-- Name: users_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "users_tenantId_isActive_idx" ON public.users USING btree ("tenantId", "isActive");


--
-- Name: users_tenantId_role_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "users_tenantId_role_idx" ON public.users USING btree ("tenantId", role);


--
-- Name: webhook_configs_enabled_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX webhook_configs_enabled_idx ON public.webhook_configs USING btree (enabled);


--
-- Name: webhook_configs_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "webhook_configs_tenantId_idx" ON public.webhook_configs USING btree ("tenantId");


--
-- Name: webhook_deliveries_createdAt_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "webhook_deliveries_createdAt_idx" ON public.webhook_deliveries USING btree ("createdAt");


--
-- Name: webhook_deliveries_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX webhook_deliveries_status_idx ON public.webhook_deliveries USING btree (status);


--
-- Name: webhook_deliveries_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "webhook_deliveries_tenantId_idx" ON public.webhook_deliveries USING btree ("tenantId");


--
-- Name: webhook_deliveries_tenantId_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "webhook_deliveries_tenantId_status_idx" ON public.webhook_deliveries USING btree ("tenantId", status);


--
-- Name: webhook_deliveries_tenantId_webhookId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "webhook_deliveries_tenantId_webhookId_idx" ON public.webhook_deliveries USING btree ("tenantId", "webhookId");


--
-- Name: webhook_deliveries_webhookId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "webhook_deliveries_webhookId_idx" ON public.webhook_deliveries USING btree ("webhookId");


--
-- Name: winner_signatures_categoryId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "winner_signatures_categoryId_userId_idx" ON public.winner_signatures USING btree ("categoryId", "userId");


--
-- Name: winner_signatures_tenantId_categoryId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "winner_signatures_tenantId_categoryId_idx" ON public.winner_signatures USING btree ("tenantId", "categoryId");


--
-- Name: winner_signatures_tenantId_categoryId_userId_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "winner_signatures_tenantId_categoryId_userId_key" ON public.winner_signatures USING btree ("tenantId", "categoryId", "userId");


--
-- Name: winner_signatures_tenantId_contestId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "winner_signatures_tenantId_contestId_idx" ON public.winner_signatures USING btree ("tenantId", "contestId");


--
-- Name: winner_signatures_tenantId_eventId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "winner_signatures_tenantId_eventId_idx" ON public.winner_signatures USING btree ("tenantId", "eventId");


--
-- Name: winner_signatures_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "winner_signatures_tenantId_idx" ON public.winner_signatures USING btree ("tenantId");


--
-- Name: workflow_instances_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX workflow_instances_status_idx ON public.workflow_instances USING btree (status);


--
-- Name: workflow_instances_tenantId_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_instances_tenantId_entityType_entityId_idx" ON public.workflow_instances USING btree ("tenantId", "entityType", "entityId");


--
-- Name: workflow_instances_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_instances_tenantId_idx" ON public.workflow_instances USING btree ("tenantId");


--
-- Name: workflow_step_executions_instanceId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_step_executions_instanceId_idx" ON public.workflow_step_executions USING btree ("instanceId");


--
-- Name: workflow_step_executions_status_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX workflow_step_executions_status_idx ON public.workflow_step_executions USING btree (status);


--
-- Name: workflow_step_executions_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_step_executions_tenantId_idx" ON public.workflow_step_executions USING btree ("tenantId");


--
-- Name: workflow_step_executions_tenantId_instanceId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_step_executions_tenantId_instanceId_idx" ON public.workflow_step_executions USING btree ("tenantId", "instanceId");


--
-- Name: workflow_steps_templateId_stepOrder_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_steps_templateId_stepOrder_idx" ON public.workflow_steps USING btree ("templateId", "stepOrder");


--
-- Name: workflow_steps_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_steps_tenantId_idx" ON public.workflow_steps USING btree ("tenantId");


--
-- Name: workflow_steps_tenantId_templateId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_steps_tenantId_templateId_idx" ON public.workflow_steps USING btree ("tenantId", "templateId");


--
-- Name: workflow_templates_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_templates_tenantId_idx" ON public.workflow_templates USING btree ("tenantId");


--
-- Name: workflow_templates_tenantId_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_templates_tenantId_isActive_idx" ON public.workflow_templates USING btree ("tenantId", "isActive");


--
-- Name: workflow_templates_type_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_templates_type_isActive_idx" ON public.workflow_templates USING btree (type, "isActive");


--
-- Name: workflow_transitions_fromStepId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_transitions_fromStepId_idx" ON public.workflow_transitions USING btree ("fromStepId");


--
-- Name: workflow_transitions_tenantId_fromStepId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_transitions_tenantId_fromStepId_idx" ON public.workflow_transitions USING btree ("tenantId", "fromStepId");


--
-- Name: workflow_transitions_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_transitions_tenantId_idx" ON public.workflow_transitions USING btree ("tenantId");


--
-- Name: workflow_transitions_toStepId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "workflow_transitions_toStepId_idx" ON public.workflow_transitions USING btree ("toStepId");


--
-- Name: activity_logs activity_logs_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: archived_events archived_events_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.archived_events
    ADD CONSTRAINT "archived_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT "assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT "assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT "assignments_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT "assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT "assignments_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auditor_assignments auditor_assignments_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.auditor_assignments
    ADD CONSTRAINT "auditor_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: auditor_assignments auditor_assignments_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.auditor_assignments
    ADD CONSTRAINT "auditor_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auditor_assignments auditor_assignments_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.auditor_assignments
    ADD CONSTRAINT "auditor_assignments_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auditor_assignments auditor_assignments_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.auditor_assignments
    ADD CONSTRAINT "auditor_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auditor_assignments auditor_assignments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.auditor_assignments
    ADD CONSTRAINT "auditor_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: category_certifications category_certifications_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_certifications
    ADD CONSTRAINT "category_certifications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: category_contestants category_contestants_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_contestants
    ADD CONSTRAINT "category_contestants_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: category_contestants category_contestants_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_contestants
    ADD CONSTRAINT "category_contestants_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: category_judges category_judges_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_judges
    ADD CONSTRAINT "category_judges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: category_judges category_judges_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.category_judges
    ADD CONSTRAINT "category_judges_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contest_certifications contest_certifications_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_certifications
    ADD CONSTRAINT "contest_certifications_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contest_certifications contest_certifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_certifications
    ADD CONSTRAINT "contest_certifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contest_contestants contest_contestants_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_contestants
    ADD CONSTRAINT "contest_contestants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contest_contestants contest_contestants_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_contestants
    ADD CONSTRAINT "contest_contestants_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contest_judges contest_judges_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_judges
    ADD CONSTRAINT "contest_judges_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contest_judges contest_judges_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contest_judges
    ADD CONSTRAINT "contest_judges_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contests contests_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.contests
    ADD CONSTRAINT "contests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: criteria criteria_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.criteria
    ADD CONSTRAINT "criteria_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: custom_field_values custom_field_values_customFieldId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT "custom_field_values_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES public.custom_fields(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deduction_approvals deduction_approvals_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.deduction_approvals
    ADD CONSTRAINT "deduction_approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.deduction_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deduction_requests deduction_requests_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.deduction_requests
    ADD CONSTRAINT "deduction_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deduction_requests deduction_requests_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.deduction_requests
    ADD CONSTRAINT "deduction_requests_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: deduction_requests deduction_requests_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.deduction_requests
    ADD CONSTRAINT "deduction_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: emcee_scripts emcee_scripts_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.emcee_scripts
    ADD CONSTRAINT "emcee_scripts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: emcee_scripts emcee_scripts_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.emcee_scripts
    ADD CONSTRAINT "emcee_scripts_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: emcee_scripts emcee_scripts_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.emcee_scripts
    ADD CONSTRAINT "emcee_scripts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: event_templates event_templates_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.event_templates
    ADD CONSTRAINT "event_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: judge_certifications judge_certifications_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_certifications
    ADD CONSTRAINT "judge_certifications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_certifications judge_certifications_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_certifications
    ADD CONSTRAINT "judge_certifications_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_comments judge_comments_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_comments
    ADD CONSTRAINT "judge_comments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_comments judge_comments_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_comments
    ADD CONSTRAINT "judge_comments_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_comments judge_comments_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_comments
    ADD CONSTRAINT "judge_comments_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_contestant_certifications judge_contestant_certifications_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_contestant_certifications
    ADD CONSTRAINT "judge_contestant_certifications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_contestant_certifications judge_contestant_certifications_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_contestant_certifications
    ADD CONSTRAINT "judge_contestant_certifications_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_contestant_certifications judge_contestant_certifications_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_contestant_certifications
    ADD CONSTRAINT "judge_contestant_certifications_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_score_removal_requests judge_score_removal_requests_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_score_removal_requests
    ADD CONSTRAINT "judge_score_removal_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_score_removal_requests judge_score_removal_requests_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_score_removal_requests
    ADD CONSTRAINT "judge_score_removal_requests_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_score_removal_requests judge_score_removal_requests_scoreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_score_removal_requests
    ADD CONSTRAINT "judge_score_removal_requests_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES public.scores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_uncertification_requests judge_uncertification_requests_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_uncertification_requests
    ADD CONSTRAINT "judge_uncertification_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_uncertification_requests judge_uncertification_requests_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_uncertification_requests
    ADD CONSTRAINT "judge_uncertification_requests_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: judge_uncertification_requests judge_uncertification_requests_requestedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.judge_uncertification_requests
    ADD CONSTRAINT "judge_uncertification_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notification_digests notification_digests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notification_digests
    ADD CONSTRAINT "notification_digests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: overall_deductions overall_deductions_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.overall_deductions
    ADD CONSTRAINT "overall_deductions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: overall_deductions overall_deductions_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.overall_deductions
    ADD CONSTRAINT "overall_deductions_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_histories password_histories_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.password_histories
    ADD CONSTRAINT "password_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rate_limit_configs rate_limit_configs_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.rate_limit_configs
    ADD CONSTRAINT "rate_limit_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rate_limit_configs rate_limit_configs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.rate_limit_configs
    ADD CONSTRAINT "rate_limit_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_instances report_instances_generatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.report_instances
    ADD CONSTRAINT "report_instances_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: review_contestant_certifications review_contestant_certifications_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_contestant_certifications
    ADD CONSTRAINT "review_contestant_certifications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: review_contestant_certifications review_contestant_certifications_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_contestant_certifications
    ADD CONSTRAINT "review_contestant_certifications_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: review_contestant_certifications review_contestant_certifications_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_contestant_certifications
    ADD CONSTRAINT "review_contestant_certifications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: review_judge_score_certifications review_judge_score_certifications_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_judge_score_certifications
    ADD CONSTRAINT "review_judge_score_certifications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: review_judge_score_certifications review_judge_score_certifications_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_judge_score_certifications
    ADD CONSTRAINT "review_judge_score_certifications_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: review_judge_score_certifications review_judge_score_certifications_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.review_judge_score_certifications
    ADD CONSTRAINT "review_judge_score_certifications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_assignments role_assignments_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT "role_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_assignments role_assignments_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT "role_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_assignments role_assignments_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT "role_assignments_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_assignments role_assignments_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT "role_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_assignments role_assignments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.role_assignments
    ADD CONSTRAINT "role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: saved_searches saved_searches_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_comments score_comments_criterionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_comments
    ADD CONSTRAINT "score_comments_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES public.criteria(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_comments score_comments_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_comments
    ADD CONSTRAINT "score_comments_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_comments score_comments_scoreId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_comments
    ADD CONSTRAINT "score_comments_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES public.scores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_files score_files_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_files
    ADD CONSTRAINT "score_files_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_files score_files_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_files
    ADD CONSTRAINT "score_files_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_files score_files_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_files
    ADD CONSTRAINT "score_files_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_files score_files_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_files
    ADD CONSTRAINT "score_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: score_governance_approvals score_governance_approvals_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_approvals
    ADD CONSTRAINT "score_governance_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_governance_approvals score_governance_approvals_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_approvals
    ADD CONSTRAINT "score_governance_approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.score_governance_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_governance_requests score_governance_requests_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT "score_governance_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: score_governance_requests score_governance_requests_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT "score_governance_requests_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: score_governance_requests score_governance_requests_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT "score_governance_requests_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: score_governance_requests score_governance_requests_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT "score_governance_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: score_governance_requests score_governance_requests_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT "score_governance_requests_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: score_governance_requests score_governance_requests_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_governance_requests
    ADD CONSTRAINT "score_governance_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_removal_requests score_removal_requests_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_removal_requests
    ADD CONSTRAINT "score_removal_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_removal_requests score_removal_requests_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_removal_requests
    ADD CONSTRAINT "score_removal_requests_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: score_removal_requests score_removal_requests_requestedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.score_removal_requests
    ADD CONSTRAINT "score_removal_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: scores scores_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT "scores_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scores scores_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT "scores_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scores scores_criterionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT "scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES public.criteria(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scores scores_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.scores
    ADD CONSTRAINT "scores_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: search_history search_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: system_settings system_settings_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT "system_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tally_master_assignments tally_master_assignments_assignedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tally_master_assignments
    ADD CONSTRAINT "tally_master_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tally_master_assignments tally_master_assignments_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tally_master_assignments
    ADD CONSTRAINT "tally_master_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tally_master_assignments tally_master_assignments_contestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tally_master_assignments
    ADD CONSTRAINT "tally_master_assignments_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES public.contests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tally_master_assignments tally_master_assignments_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tally_master_assignments
    ADD CONSTRAINT "tally_master_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tally_master_assignments tally_master_assignments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.tally_master_assignments
    ADD CONSTRAINT "tally_master_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_criteria template_criteria_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.template_criteria
    ADD CONSTRAINT "template_criteria_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.category_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_contestantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES public.contestants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_judgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES public.judges(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: event_manager
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict novbgRRqskKthP1fGMBNH5WwgvMb24dWO9ITiHTzFZcfDfinhVwaKb3GucKunKu

