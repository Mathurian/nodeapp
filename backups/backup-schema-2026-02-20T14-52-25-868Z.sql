--
-- PostgreSQL database dump
--

\restrict EPBmOJlR3NVgiJCov1kuvY1Xf7qUqrYp3bX6Sf2A1LD4wnvHvpPnyBegNMaan5g

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

--
-- Name: app_is_super_admin(); Type: FUNCTION; Schema: public; Owner: event_manager
--

CREATE FUNCTION public.app_is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_super_admin', true), ''), 'false') = 'true'
$$;


ALTER FUNCTION public.app_is_super_admin() OWNER TO event_manager;

--
-- Name: app_rls_mode(); Type: FUNCTION; Schema: public; Owner: event_manager
--

CREATE FUNCTION public.app_rls_mode() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(NULLIF(current_setting('app.tenant_rls_mode', true), ''), 'off')
$$;


ALTER FUNCTION public.app_rls_mode() OWNER TO event_manager;

--
-- Name: app_tenant_id(); Type: FUNCTION; Schema: public; Owner: event_manager
--

CREATE FUNCTION public.app_tenant_id() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$;


ALTER FUNCTION public.app_tenant_id() OWNER TO event_manager;

--
-- Name: enforce_tenant_fk_consistency(); Type: FUNCTION; Schema: public; Owner: event_manager
--

CREATE FUNCTION public.enforce_tenant_fk_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  parent_table_name text := TG_ARGV[0];
  child_fk_column_name text := TG_ARGV[1];
  child_tenant_id text;
  child_fk_value text;
  parent_tenant_id text;
BEGIN
  child_tenant_id := to_jsonb(NEW) ->> 'tenantId';
  IF child_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  child_fk_value := to_jsonb(NEW) ->> child_fk_column_name;
  IF child_fk_value IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT "tenantId"::text FROM %I WHERE id::text = $1 LIMIT 1',
    parent_table_name
  )
  INTO parent_tenant_id
  USING child_fk_value;

  -- Parent existence is already enforced by the regular FK path.
  IF parent_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF parent_tenant_id <> child_tenant_id THEN
    RAISE EXCEPTION
      USING ERRCODE = '23514',
            MESSAGE = format(
              'Tenant consistency violation: %I.%I references %I(id) across tenants (%s != %s)',
              TG_TABLE_NAME,
              child_fk_column_name,
              parent_table_name,
              child_tenant_id,
              parent_tenant_id
            );
  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION public.enforce_tenant_fk_consistency() OWNER TO event_manager;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO event_manager;

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

ALTER TABLE ONLY public.activity_logs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.archived_events FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.assignments FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.audit_logs FORCE ROW LEVEL SECURITY;


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
    "assignedBy" text,
    notes text,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.auditor_assignments FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.backup_logs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.backup_schedules FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.backup_targets FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.categories FORCE ROW LEVEL SECURITY;


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
    "tenantId" text NOT NULL,
    "boardRoleSnapshot" text
);

ALTER TABLE ONLY public.category_certifications FORCE ROW LEVEL SECURITY;


ALTER TABLE public.category_certifications OWNER TO event_manager;

--
-- Name: category_contestants; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_contestants (
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.category_contestants FORCE ROW LEVEL SECURITY;


ALTER TABLE public.category_contestants OWNER TO event_manager;

--
-- Name: category_judges; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.category_judges (
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.category_judges FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.category_templates FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.certifications FORCE ROW LEVEL SECURITY;


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
    "tenantId" text NOT NULL,
    "boardRoleSnapshot" text
);

ALTER TABLE ONLY public.contest_certifications FORCE ROW LEVEL SECURITY;


ALTER TABLE public.contest_certifications OWNER TO event_manager;

--
-- Name: contest_contestants; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contest_contestants (
    "contestId" text NOT NULL,
    "contestantId" text NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.contest_contestants FORCE ROW LEVEL SECURITY;


ALTER TABLE public.contest_contestants OWNER TO event_manager;

--
-- Name: contest_judges; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.contest_judges (
    "contestId" text NOT NULL,
    "judgeId" text NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.contest_judges FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.contestants FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.contests FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.criteria FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.custom_field_values FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.custom_fields FORCE ROW LEVEL SECURITY;


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
    "tenantId" text NOT NULL,
    "boardRoleSnapshot" text
);

ALTER TABLE ONLY public.deduction_approvals FORCE ROW LEVEL SECURITY;


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
    "requestedById" text,
    status public."DeductionStatus" DEFAULT 'PENDING'::public."DeductionStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.deduction_requests FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.dr_configs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.dr_metrics FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.dr_test_logs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.email_logs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.email_templates FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.emcee_scripts FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.error_logs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.event_logs FORCE ROW LEVEL SECURITY;


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
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.event_templates FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.events FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.files FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.judge_certifications FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.judge_comments FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.judge_contestant_certifications FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.judge_score_removal_requests FORCE ROW LEVEL SECURITY;


ALTER TABLE public.judge_score_removal_requests OWNER TO event_manager;

--
-- Name: judge_uncertification_requests; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.judge_uncertification_requests (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    reason text NOT NULL,
    "requestedBy" text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "tenantId" text NOT NULL,
    "requestedByBoardRoleSnapshot" text,
    "approvedByBoardRoleSnapshot" text,
    "rejectedByBoardRoleSnapshot" text
);

ALTER TABLE ONLY public.judge_uncertification_requests FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.judges FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.notification_digests FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.notification_preferences FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.notification_templates FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.notifications FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.overall_deductions FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.permission_audit_logs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.permission_audit_logs OWNER TO event_manager;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.push_subscriptions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "expirationTime" timestamp(3) without time zone,
    "userAgent" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY public.push_subscriptions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.push_subscriptions OWNER TO event_manager;

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

ALTER TABLE ONLY public.rate_limit_configs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.rate_limit_configs OWNER TO event_manager;

--
-- Name: report_instances; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.report_instances (
    id text NOT NULL,
    "templateId" text DEFAULT 'default'::text,
    "generatedById" text,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data text,
    format text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.report_instances FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.report_templates FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.reports FORCE ROW LEVEL SECURITY;


ALTER TABLE public.reports OWNER TO event_manager;

--
-- Name: review_contestant_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.review_contestant_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "contestantId" text NOT NULL,
    "reviewedBy" text,
    "reviewerRole" text NOT NULL,
    "reviewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.review_contestant_certifications FORCE ROW LEVEL SECURITY;


ALTER TABLE public.review_contestant_certifications OWNER TO event_manager;

--
-- Name: review_judge_score_certifications; Type: TABLE; Schema: public; Owner: event_manager
--

CREATE TABLE public.review_judge_score_certifications (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    "judgeId" text NOT NULL,
    "reviewedBy" text,
    "reviewerRole" text NOT NULL,
    "reviewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comments text,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.review_judge_score_certifications FORCE ROW LEVEL SECURITY;


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
    "assignedBy" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.role_assignments FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.role_permissions FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.saved_searches FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.score_comments FORCE ROW LEVEL SECURITY;


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
    "uploadedById" text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.score_files FORCE ROW LEVEL SECURITY;


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
    "tenantId" text NOT NULL,
    "approverBoardRoleSnapshot" text
);

ALTER TABLE ONLY public.score_governance_approvals FORCE ROW LEVEL SECURITY;


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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tenantId" text NOT NULL,
    "requesterBoardRoleSnapshot" text
);

ALTER TABLE ONLY public.score_governance_requests FORCE ROW LEVEL SECURITY;


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
    "requestedBy" text,
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
    "tenantId" text NOT NULL,
    "boardRoleSnapshot" text
);

ALTER TABLE ONLY public.score_removal_requests FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.scores FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.search_history FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.system_settings FORCE ROW LEVEL SECURITY;


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
    "assignedBy" text,
    notes text,
    "tenantId" text NOT NULL
);

ALTER TABLE ONLY public.tally_master_assignments FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.template_criteria FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.theme_settings FORCE ROW LEVEL SECURITY;


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
    "mfaSecret" text,
    "boardRole" text
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.webhook_configs FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.webhook_deliveries FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.winner_signatures FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.workflow_instances FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.workflow_step_executions FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.workflow_steps FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.workflow_templates FORCE ROW LEVEL SECURITY;


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

ALTER TABLE ONLY public.workflow_transitions FORCE ROW LEVEL SECURITY;


ALTER TABLE public.workflow_transitions OWNER TO event_manager;

--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


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
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


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
-- Name: push_subscriptions_tenantId_endpoint_key; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE UNIQUE INDEX "push_subscriptions_tenantId_endpoint_key" ON public.push_subscriptions USING btree ("tenantId", endpoint);


--
-- Name: push_subscriptions_tenantId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "push_subscriptions_tenantId_idx" ON public.push_subscriptions USING btree ("tenantId");


--
-- Name: push_subscriptions_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "push_subscriptions_tenantId_userId_idx" ON public.push_subscriptions USING btree ("tenantId", "userId");


--
-- Name: push_subscriptions_tenantId_userId_isActive_idx; Type: INDEX; Schema: public; Owner: event_manager
--

CREATE INDEX "push_subscriptions_tenantId_userId_isActive_idx" ON public.push_subscriptions USING btree ("tenantId", "userId", "isActive");


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
-- Name: activity_logs tg_tenant_fk_activity_logs_12baedae; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_activity_logs_12baedae BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: archived_events tg_tenant_fk_archived_events_18118ab0; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_archived_events_18118ab0 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.archived_events FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: assignments tg_tenant_fk_assignments_9a796704; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_assignments_9a796704 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: assignments tg_tenant_fk_assignments_bddbc060; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_assignments_bddbc060 BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: assignments tg_tenant_fk_assignments_f317cfe8; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_assignments_f317cfe8 BEFORE INSERT OR UPDATE OF "tenantId", "assignedBy" ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'assignedBy');


--
-- Name: assignments tg_tenant_fk_assignments_f689faa5; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_assignments_f689faa5 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: assignments tg_tenant_fk_assignments_ff610325; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_assignments_ff610325 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: auditor_assignments tg_tenant_fk_auditor_assignment_0a3bf4fc; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_auditor_assignment_0a3bf4fc BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.auditor_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: auditor_assignments tg_tenant_fk_auditor_assignment_0fac2d68; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_auditor_assignment_0fac2d68 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.auditor_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: auditor_assignments tg_tenant_fk_auditor_assignment_a1b3e207; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_auditor_assignment_a1b3e207 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.auditor_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: auditor_assignments tg_tenant_fk_auditor_assignment_a20e6965; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_auditor_assignment_a20e6965 BEFORE INSERT OR UPDATE OF "tenantId", "assignedBy" ON public.auditor_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'assignedBy');


--
-- Name: auditor_assignments tg_tenant_fk_auditor_assignment_f9540764; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_auditor_assignment_f9540764 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.auditor_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: categories tg_tenant_fk_categories_b03cdf53; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_categories_b03cdf53 BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.categories FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: category_certifications tg_tenant_fk_category_certifica_cc26c461; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_category_certifica_cc26c461 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.category_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: category_contestants tg_tenant_fk_category_contestan_0deba566; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_category_contestan_0deba566 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.category_contestants FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: category_contestants tg_tenant_fk_category_contestan_d4dd4da9; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_category_contestan_d4dd4da9 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.category_contestants FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: category_judges tg_tenant_fk_category_judges_63faa391; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_category_judges_63faa391 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.category_judges FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: category_judges tg_tenant_fk_category_judges_6fd73ec7; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_category_judges_6fd73ec7 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.category_judges FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: contest_certifications tg_tenant_fk_contest_certificat_6e335ad6; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contest_certificat_6e335ad6 BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.contest_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: contest_certifications tg_tenant_fk_contest_certificat_f4b18ca0; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contest_certificat_f4b18ca0 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.contest_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: contest_contestants tg_tenant_fk_contest_contestant_00b8c033; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contest_contestant_00b8c033 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.contest_contestants FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: contest_contestants tg_tenant_fk_contest_contestant_d32df22e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contest_contestant_d32df22e BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.contest_contestants FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: contest_judges tg_tenant_fk_contest_judges_1bf24256; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contest_judges_1bf24256 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.contest_judges FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: contest_judges tg_tenant_fk_contest_judges_e8c1671e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contest_judges_e8c1671e BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.contest_judges FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: contests tg_tenant_fk_contests_aa908573; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_contests_aa908573 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.contests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: criteria tg_tenant_fk_criteria_83c67491; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_criteria_83c67491 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.criteria FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: custom_field_values tg_tenant_fk_custom_field_value_4d999d00; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_custom_field_value_4d999d00 BEFORE INSERT OR UPDATE OF "tenantId", "customFieldId" ON public.custom_field_values FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('custom_fields', 'customFieldId');


--
-- Name: deduction_approvals tg_tenant_fk_deduction_approval_4b1fc453; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_deduction_approval_4b1fc453 BEFORE INSERT OR UPDATE OF "tenantId", "requestId" ON public.deduction_approvals FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('deduction_requests', 'requestId');


--
-- Name: deduction_requests tg_tenant_fk_deduction_requests_0a6bcece; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_deduction_requests_0a6bcece BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.deduction_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: deduction_requests tg_tenant_fk_deduction_requests_943e1156; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_deduction_requests_943e1156 BEFORE INSERT OR UPDATE OF "tenantId", "requestedById" ON public.deduction_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'requestedById');


--
-- Name: deduction_requests tg_tenant_fk_deduction_requests_a9a2c8e7; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_deduction_requests_a9a2c8e7 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.deduction_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: emcee_scripts tg_tenant_fk_emcee_scripts_1f2b7706; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_emcee_scripts_1f2b7706 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.emcee_scripts FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: emcee_scripts tg_tenant_fk_emcee_scripts_411b0856; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_emcee_scripts_411b0856 BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.emcee_scripts FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: emcee_scripts tg_tenant_fk_emcee_scripts_b4ced067; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_emcee_scripts_b4ced067 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.emcee_scripts FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: event_templates tg_tenant_fk_event_templates_d9c808f7; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_event_templates_d9c808f7 BEFORE INSERT OR UPDATE OF "tenantId", "createdBy" ON public.event_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'createdBy');


--
-- Name: judge_certifications tg_tenant_fk_judge_certificatio_685f3101; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_certificatio_685f3101 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.judge_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: judge_certifications tg_tenant_fk_judge_certificatio_d6312463; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_certificatio_d6312463 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.judge_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: judge_comments tg_tenant_fk_judge_comments_128aec6e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_comments_128aec6e BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.judge_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: judge_comments tg_tenant_fk_judge_comments_94ab1cbc; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_comments_94ab1cbc BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.judge_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: judge_comments tg_tenant_fk_judge_comments_c28cdef3; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_comments_c28cdef3 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.judge_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: judge_contestant_certifications tg_tenant_fk_judge_contestant_c_6a7fffd2; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_contestant_c_6a7fffd2 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.judge_contestant_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: judge_contestant_certifications tg_tenant_fk_judge_contestant_c_ca202a1e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_contestant_c_ca202a1e BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.judge_contestant_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: judge_contestant_certifications tg_tenant_fk_judge_contestant_c_d49d3f8f; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_contestant_c_d49d3f8f BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.judge_contestant_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: judge_score_removal_requests tg_tenant_fk_judge_score_remova_28a5ac44; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_score_remova_28a5ac44 BEFORE INSERT OR UPDATE OF "tenantId", "scoreId" ON public.judge_score_removal_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('scores', 'scoreId');


--
-- Name: judge_score_removal_requests tg_tenant_fk_judge_score_remova_43405007; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_score_remova_43405007 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.judge_score_removal_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: judge_score_removal_requests tg_tenant_fk_judge_score_remova_bd4384f8; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_score_remova_bd4384f8 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.judge_score_removal_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: judge_uncertification_requests tg_tenant_fk_judge_uncertificat_063a3a20; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_uncertificat_063a3a20 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.judge_uncertification_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: judge_uncertification_requests tg_tenant_fk_judge_uncertificat_1e1e588b; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_uncertificat_1e1e588b BEFORE INSERT OR UPDATE OF "tenantId", "requestedBy" ON public.judge_uncertification_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'requestedBy');


--
-- Name: judge_uncertification_requests tg_tenant_fk_judge_uncertificat_8a1fba9a; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_judge_uncertificat_8a1fba9a BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.judge_uncertification_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: notification_digests tg_tenant_fk_notification_diges_848eeb02; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_notification_diges_848eeb02 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.notification_digests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: notification_preferences tg_tenant_fk_notification_prefe_b8f30d22; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_notification_prefe_b8f30d22 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: notifications tg_tenant_fk_notifications_57d0e42e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_notifications_57d0e42e BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: overall_deductions tg_tenant_fk_overall_deductions_76eba128; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_overall_deductions_76eba128 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.overall_deductions FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: overall_deductions tg_tenant_fk_overall_deductions_cb39693f; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_overall_deductions_cb39693f BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.overall_deductions FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: rate_limit_configs tg_tenant_fk_rate_limit_configs_a14a3f26; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_rate_limit_configs_a14a3f26 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.rate_limit_configs FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: report_instances tg_tenant_fk_report_instances_4dec00dd; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_report_instances_4dec00dd BEFORE INSERT OR UPDATE OF "tenantId", "generatedById" ON public.report_instances FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'generatedById');


--
-- Name: review_contestant_certifications tg_tenant_fk_review_contestant__33576b3f; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_review_contestant__33576b3f BEFORE INSERT OR UPDATE OF "tenantId", "reviewedBy" ON public.review_contestant_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'reviewedBy');


--
-- Name: review_contestant_certifications tg_tenant_fk_review_contestant__72e55893; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_review_contestant__72e55893 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.review_contestant_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: review_contestant_certifications tg_tenant_fk_review_contestant__cd48d408; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_review_contestant__cd48d408 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.review_contestant_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: review_judge_score_certifications tg_tenant_fk_review_judge_score_6fc1b36e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_review_judge_score_6fc1b36e BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.review_judge_score_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: review_judge_score_certifications tg_tenant_fk_review_judge_score_9d165396; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_review_judge_score_9d165396 BEFORE INSERT OR UPDATE OF "tenantId", "reviewedBy" ON public.review_judge_score_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'reviewedBy');


--
-- Name: review_judge_score_certifications tg_tenant_fk_review_judge_score_b9ecd40e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_review_judge_score_b9ecd40e BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.review_judge_score_certifications FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: role_assignments tg_tenant_fk_role_assignments_02d9543a; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_role_assignments_02d9543a BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.role_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: role_assignments tg_tenant_fk_role_assignments_0989ce87; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_role_assignments_0989ce87 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.role_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: role_assignments tg_tenant_fk_role_assignments_20214b56; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_role_assignments_20214b56 BEFORE INSERT OR UPDATE OF "tenantId", "assignedBy" ON public.role_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'assignedBy');


--
-- Name: role_assignments tg_tenant_fk_role_assignments_3d7c6fbe; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_role_assignments_3d7c6fbe BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.role_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: role_assignments tg_tenant_fk_role_assignments_e820e56a; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_role_assignments_e820e56a BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.role_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: saved_searches tg_tenant_fk_saved_searches_b8193807; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_saved_searches_b8193807 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.saved_searches FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: score_comments tg_tenant_fk_score_comments_636c4de2; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_comments_636c4de2 BEFORE INSERT OR UPDATE OF "tenantId", "scoreId" ON public.score_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('scores', 'scoreId');


--
-- Name: score_comments tg_tenant_fk_score_comments_e27a7fbf; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_comments_e27a7fbf BEFORE INSERT OR UPDATE OF "tenantId", "criterionId" ON public.score_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('criteria', 'criterionId');


--
-- Name: score_comments tg_tenant_fk_score_comments_e3cb3dc2; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_comments_e3cb3dc2 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.score_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: score_files tg_tenant_fk_score_files_14798982; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_files_14798982 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.score_files FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: score_files tg_tenant_fk_score_files_1d6115c3; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_files_1d6115c3 BEFORE INSERT OR UPDATE OF "tenantId", "uploadedById" ON public.score_files FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'uploadedById');


--
-- Name: score_files tg_tenant_fk_score_files_2d614bfb; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_files_2d614bfb BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.score_files FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: score_files tg_tenant_fk_score_files_3908851f; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_files_3908851f BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.score_files FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: score_governance_approvals tg_tenant_fk_score_governance_a_23edbbae; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_a_23edbbae BEFORE INSERT OR UPDATE OF "tenantId", "requestId" ON public.score_governance_approvals FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('score_governance_requests', 'requestId');


--
-- Name: score_governance_approvals tg_tenant_fk_score_governance_a_aa804c9d; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_a_aa804c9d BEFORE INSERT OR UPDATE OF "tenantId", "approvedById" ON public.score_governance_approvals FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'approvedById');


--
-- Name: score_governance_requests tg_tenant_fk_score_governance_r_4f2ae17c; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_r_4f2ae17c BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.score_governance_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: score_governance_requests tg_tenant_fk_score_governance_r_78f9cf4e; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_r_78f9cf4e BEFORE INSERT OR UPDATE OF "tenantId", "requestedById" ON public.score_governance_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'requestedById');


--
-- Name: score_governance_requests tg_tenant_fk_score_governance_r_a39edc29; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_r_a39edc29 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.score_governance_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: score_governance_requests tg_tenant_fk_score_governance_r_abcb508a; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_r_abcb508a BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.score_governance_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: score_governance_requests tg_tenant_fk_score_governance_r_dd4b06c6; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_r_dd4b06c6 BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.score_governance_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: score_governance_requests tg_tenant_fk_score_governance_r_fa76f088; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_governance_r_fa76f088 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.score_governance_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: score_removal_requests tg_tenant_fk_score_removal_requ_ab9a62ff; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_removal_requ_ab9a62ff BEFORE INSERT OR UPDATE OF "tenantId", "requestedBy" ON public.score_removal_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'requestedBy');


--
-- Name: score_removal_requests tg_tenant_fk_score_removal_requ_ee174f41; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_removal_requ_ee174f41 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.score_removal_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: score_removal_requests tg_tenant_fk_score_removal_requ_fd3fd0a5; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_score_removal_requ_fd3fd0a5 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.score_removal_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: scores tg_tenant_fk_scores_08e9dee8; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_scores_08e9dee8 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.scores FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: scores tg_tenant_fk_scores_1029a693; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_scores_1029a693 BEFORE INSERT OR UPDATE OF "tenantId", "criterionId" ON public.scores FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('criteria', 'criterionId');


--
-- Name: scores tg_tenant_fk_scores_21f75d31; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_scores_21f75d31 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.scores FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


--
-- Name: scores tg_tenant_fk_scores_36932e38; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_scores_36932e38 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.scores FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: search_history tg_tenant_fk_search_history_15d511f2; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_search_history_15d511f2 BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.search_history FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: tally_master_assignments tg_tenant_fk_tally_master_assig_0b45bba8; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_tally_master_assig_0b45bba8 BEFORE INSERT OR UPDATE OF "tenantId", "categoryId" ON public.tally_master_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('categories', 'categoryId');


--
-- Name: tally_master_assignments tg_tenant_fk_tally_master_assig_2b872026; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_tally_master_assig_2b872026 BEFORE INSERT OR UPDATE OF "tenantId", "eventId" ON public.tally_master_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('events', 'eventId');


--
-- Name: tally_master_assignments tg_tenant_fk_tally_master_assig_33d3b79c; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_tally_master_assig_33d3b79c BEFORE INSERT OR UPDATE OF "tenantId", "userId" ON public.tally_master_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'userId');


--
-- Name: tally_master_assignments tg_tenant_fk_tally_master_assig_493dcf76; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_tally_master_assig_493dcf76 BEFORE INSERT OR UPDATE OF "tenantId", "assignedBy" ON public.tally_master_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('users', 'assignedBy');


--
-- Name: tally_master_assignments tg_tenant_fk_tally_master_assig_f101e3e1; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_tally_master_assig_f101e3e1 BEFORE INSERT OR UPDATE OF "tenantId", "contestId" ON public.tally_master_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contests', 'contestId');


--
-- Name: template_criteria tg_tenant_fk_template_criteria_dee089bd; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_template_criteria_dee089bd BEFORE INSERT OR UPDATE OF "tenantId", "templateId" ON public.template_criteria FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('category_templates', 'templateId');


--
-- Name: users tg_tenant_fk_users_2b9ba480; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_users_2b9ba480 BEFORE INSERT OR UPDATE OF "tenantId", "judgeId" ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('judges', 'judgeId');


--
-- Name: users tg_tenant_fk_users_6e03baf4; Type: TRIGGER; Schema: public; Owner: event_manager
--

CREATE TRIGGER tg_tenant_fk_users_6e03baf4 BEFORE INSERT OR UPDATE OF "tenantId", "contestantId" ON public.users FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_fk_consistency('contestants', 'contestantId');


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
-- Name: push_subscriptions push_subscriptions_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT "push_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: event_manager
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: archived_events; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.archived_events ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: auditor_assignments; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.auditor_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_schedules; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_targets; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.backup_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: category_certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.category_certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: category_contestants; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.category_contestants ENABLE ROW LEVEL SECURITY;

--
-- Name: category_judges; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.category_judges ENABLE ROW LEVEL SECURITY;

--
-- Name: category_templates; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: contest_certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.contest_certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: contest_contestants; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.contest_contestants ENABLE ROW LEVEL SECURITY;

--
-- Name: contest_judges; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.contest_judges ENABLE ROW LEVEL SECURITY;

--
-- Name: contestants; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.contestants ENABLE ROW LEVEL SECURITY;

--
-- Name: contests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

--
-- Name: criteria; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_values; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_fields; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: deduction_approvals; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.deduction_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: deduction_requests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.deduction_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: dr_configs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.dr_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: dr_metrics; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.dr_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: dr_test_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.dr_test_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: emcee_scripts; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.emcee_scripts ENABLE ROW LEVEL SECURITY;

--
-- Name: error_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: event_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: event_templates; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: files; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

--
-- Name: judge_certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.judge_certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: judge_comments; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.judge_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: judge_contestant_certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.judge_contestant_certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: judge_score_removal_requests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.judge_score_removal_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: judge_uncertification_requests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.judge_uncertification_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: judges; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_digests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.notification_digests ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_templates; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: overall_deductions; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.overall_deductions ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_audit_logs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limit_configs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.rate_limit_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: report_instances; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.report_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: report_templates; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: review_contestant_certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.review_contestant_certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: review_judge_score_certifications; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.review_judge_score_certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: role_assignments; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_searches; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: score_comments; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.score_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: score_files; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.score_files ENABLE ROW LEVEL SECURITY;

--
-- Name: score_governance_approvals; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.score_governance_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: score_governance_requests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.score_governance_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: score_removal_requests; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.score_removal_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: scores; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

--
-- Name: search_history; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tally_master_assignments; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.tally_master_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: template_criteria; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.template_criteria ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs tenant_rls_activity_logs_0372b08d; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_activity_logs_0372b08d ON public.activity_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: archived_events tenant_rls_archived_events_64e854ed; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_archived_events_64e854ed ON public.archived_events USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: assignments tenant_rls_assignments_17b32329; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_assignments_17b32329 ON public.assignments USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: audit_logs tenant_rls_audit_logs_409b51e1; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_audit_logs_409b51e1 ON public.audit_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: auditor_assignments tenant_rls_auditor_assignments_654e8cfc; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_auditor_assignments_654e8cfc ON public.auditor_assignments USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: backup_logs tenant_rls_backup_logs_f86686a0; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_backup_logs_f86686a0 ON public.backup_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: backup_schedules tenant_rls_backup_schedules_94c08cfd; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_backup_schedules_94c08cfd ON public.backup_schedules USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: backup_targets tenant_rls_backup_targets_9bbd4bf0; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_backup_targets_9bbd4bf0 ON public.backup_targets USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: categories tenant_rls_categories_b0b5ccb4; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_categories_b0b5ccb4 ON public.categories USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: category_certifications tenant_rls_category_certificati_6a9be5ce; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_category_certificati_6a9be5ce ON public.category_certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: category_contestants tenant_rls_category_contestants_f13d586c; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_category_contestants_f13d586c ON public.category_contestants USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: category_judges tenant_rls_category_judges_26053269; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_category_judges_26053269 ON public.category_judges USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: category_templates tenant_rls_category_templates_9697a578; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_category_templates_9697a578 ON public.category_templates USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: certifications tenant_rls_certifications_5abffac9; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_certifications_5abffac9 ON public.certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: contest_certifications tenant_rls_contest_certificatio_e84cc0dc; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_contest_certificatio_e84cc0dc ON public.contest_certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: contest_contestants tenant_rls_contest_contestants_60005251; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_contest_contestants_60005251 ON public.contest_contestants USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: contest_judges tenant_rls_contest_judges_802ffc37; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_contest_judges_802ffc37 ON public.contest_judges USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: contestants tenant_rls_contestants_6183e6ae; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_contestants_6183e6ae ON public.contestants USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: contests tenant_rls_contests_e7b7736d; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_contests_e7b7736d ON public.contests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: criteria tenant_rls_criteria_15c46c6e; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_criteria_15c46c6e ON public.criteria USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: custom_field_values tenant_rls_custom_field_values_fb9bfe68; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_custom_field_values_fb9bfe68 ON public.custom_field_values USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: custom_fields tenant_rls_custom_fields_b37a7ba8; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_custom_fields_b37a7ba8 ON public.custom_fields USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: deduction_approvals tenant_rls_deduction_approvals_c22d46b2; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_deduction_approvals_c22d46b2 ON public.deduction_approvals USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: deduction_requests tenant_rls_deduction_requests_8cac80d8; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_deduction_requests_8cac80d8 ON public.deduction_requests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: dr_configs tenant_rls_dr_configs_b2feb09d; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_dr_configs_b2feb09d ON public.dr_configs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: dr_metrics tenant_rls_dr_metrics_8f2c1c7e; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_dr_metrics_8f2c1c7e ON public.dr_metrics USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: dr_test_logs tenant_rls_dr_test_logs_7b8c4408; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_dr_test_logs_7b8c4408 ON public.dr_test_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: email_logs tenant_rls_email_logs_963e574a; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_email_logs_963e574a ON public.email_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: email_templates tenant_rls_email_templates_7090c6a4; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_email_templates_7090c6a4 ON public.email_templates USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: emcee_scripts tenant_rls_emcee_scripts_d236dda1; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_emcee_scripts_d236dda1 ON public.emcee_scripts USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: error_logs tenant_rls_error_logs_1ca02483; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_error_logs_1ca02483 ON public.error_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: event_logs tenant_rls_event_logs_cf7d2625; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_event_logs_cf7d2625 ON public.event_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: event_templates tenant_rls_event_templates_efa2b49c; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_event_templates_efa2b49c ON public.event_templates USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: events tenant_rls_events_16908b06; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_events_16908b06 ON public.events USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: files tenant_rls_files_45b96339; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_files_45b96339 ON public.files USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: judge_certifications tenant_rls_judge_certifications_14c05dcd; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_judge_certifications_14c05dcd ON public.judge_certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: judge_comments tenant_rls_judge_comments_f736fa2e; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_judge_comments_f736fa2e ON public.judge_comments USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: judge_contestant_certifications tenant_rls_judge_contestant_cer_4bf262c5; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_judge_contestant_cer_4bf262c5 ON public.judge_contestant_certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: judge_score_removal_requests tenant_rls_judge_score_removal__972a301d; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_judge_score_removal__972a301d ON public.judge_score_removal_requests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: judge_uncertification_requests tenant_rls_judge_uncertificatio_615604eb; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_judge_uncertificatio_615604eb ON public.judge_uncertification_requests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: judges tenant_rls_judges_c761ee51; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_judges_c761ee51 ON public.judges USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: notification_digests tenant_rls_notification_digests_24ae05ae; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_notification_digests_24ae05ae ON public.notification_digests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: notification_preferences tenant_rls_notification_prefere_3ad5ca84; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_notification_prefere_3ad5ca84 ON public.notification_preferences USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: notification_templates tenant_rls_notification_templat_c54c5f77; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_notification_templat_c54c5f77 ON public.notification_templates USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: notifications tenant_rls_notifications_f37bd2f6; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_notifications_f37bd2f6 ON public.notifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: overall_deductions tenant_rls_overall_deductions_fde2f91c; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_overall_deductions_fde2f91c ON public.overall_deductions USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: permission_audit_logs tenant_rls_permission_audit_log_dfbb54da; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_permission_audit_log_dfbb54da ON public.permission_audit_logs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: push_subscriptions tenant_rls_push_subscriptions; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_push_subscriptions ON public.push_subscriptions USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: rate_limit_configs tenant_rls_rate_limit_configs_2c57e4d5; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_rate_limit_configs_2c57e4d5 ON public.rate_limit_configs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: report_instances tenant_rls_report_instances_e9e446b2; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_report_instances_e9e446b2 ON public.report_instances USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: report_templates tenant_rls_report_templates_b3cd796b; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_report_templates_b3cd796b ON public.report_templates USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: reports tenant_rls_reports_a8445719; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_reports_a8445719 ON public.reports USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: review_contestant_certifications tenant_rls_review_contestant_ce_b46ae88b; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_review_contestant_ce_b46ae88b ON public.review_contestant_certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: review_judge_score_certifications tenant_rls_review_judge_score_c_900246f5; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_review_judge_score_c_900246f5 ON public.review_judge_score_certifications USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: role_assignments tenant_rls_role_assignments_c72ebc14; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_role_assignments_c72ebc14 ON public.role_assignments USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: role_permissions tenant_rls_role_permissions_326663a2; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_role_permissions_326663a2 ON public.role_permissions USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: saved_searches tenant_rls_saved_searches_158f934d; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_saved_searches_158f934d ON public.saved_searches USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: score_comments tenant_rls_score_comments_63d3d62a; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_score_comments_63d3d62a ON public.score_comments USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: score_files tenant_rls_score_files_d6c0a3c7; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_score_files_d6c0a3c7 ON public.score_files USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: score_governance_approvals tenant_rls_score_governance_app_f3760892; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_score_governance_app_f3760892 ON public.score_governance_approvals USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: score_governance_requests tenant_rls_score_governance_req_c14993f3; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_score_governance_req_c14993f3 ON public.score_governance_requests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: score_removal_requests tenant_rls_score_removal_reques_64f19e83; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_score_removal_reques_64f19e83 ON public.score_removal_requests USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: scores tenant_rls_scores_e97e07d7; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_scores_e97e07d7 ON public.scores USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: search_history tenant_rls_search_history_0c46c174; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_search_history_0c46c174 ON public.search_history USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: system_settings tenant_rls_system_settings_7241ce06; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_system_settings_7241ce06 ON public.system_settings USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: tally_master_assignments tenant_rls_tally_master_assignm_3e9d259e; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_tally_master_assignm_3e9d259e ON public.tally_master_assignments USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: template_criteria tenant_rls_template_criteria_14d2b82e; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_template_criteria_14d2b82e ON public.template_criteria USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: theme_settings tenant_rls_theme_settings_7cb04d5b; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_theme_settings_7cb04d5b ON public.theme_settings USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: users tenant_rls_users_9bc65c2a; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_users_9bc65c2a ON public.users USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: webhook_configs tenant_rls_webhook_configs_24d1b4a7; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_webhook_configs_24d1b4a7 ON public.webhook_configs USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: webhook_deliveries tenant_rls_webhook_deliveries_4bbbb5e9; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_webhook_deliveries_4bbbb5e9 ON public.webhook_deliveries USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: winner_signatures tenant_rls_winner_signatures_2de64142; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_winner_signatures_2de64142 ON public.winner_signatures USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: workflow_instances tenant_rls_workflow_instances_43f2350e; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_workflow_instances_43f2350e ON public.workflow_instances USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: workflow_step_executions tenant_rls_workflow_step_execut_d2e20370; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_workflow_step_execut_d2e20370 ON public.workflow_step_executions USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: workflow_steps tenant_rls_workflow_steps_46e1ab5b; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_workflow_steps_46e1ab5b ON public.workflow_steps USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: workflow_templates tenant_rls_workflow_templates_53c161ee; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_workflow_templates_53c161ee ON public.workflow_templates USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: workflow_transitions tenant_rls_workflow_transitions_62b5ac8f; Type: POLICY; Schema: public; Owner: event_manager
--

CREATE POLICY tenant_rls_workflow_transitions_62b5ac8f ON public.workflow_transitions USING (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text)))) WITH CHECK (((public.app_rls_mode() <> 'enforce'::text) OR public.app_is_super_admin() OR (COALESCE("tenantId", ''::text) = COALESCE(public.app_tenant_id(), ''::text))));


--
-- Name: theme_settings; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_configs; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: winner_signatures; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.winner_signatures ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_instances; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_step_executions; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.workflow_step_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_steps; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_templates; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_transitions; Type: ROW SECURITY; Schema: public; Owner: event_manager
--

ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO event_manager_app;


--
-- Name: FUNCTION app_is_super_admin(); Type: ACL; Schema: public; Owner: event_manager
--

GRANT ALL ON FUNCTION public.app_is_super_admin() TO event_manager_app;


--
-- Name: FUNCTION app_rls_mode(); Type: ACL; Schema: public; Owner: event_manager
--

GRANT ALL ON FUNCTION public.app_rls_mode() TO event_manager_app;


--
-- Name: FUNCTION app_tenant_id(); Type: ACL; Schema: public; Owner: event_manager
--

GRANT ALL ON FUNCTION public.app_tenant_id() TO event_manager_app;


--
-- Name: FUNCTION enforce_tenant_fk_consistency(); Type: ACL; Schema: public; Owner: event_manager
--

GRANT ALL ON FUNCTION public.enforce_tenant_fk_consistency() TO event_manager_app;


--
-- Name: TABLE _prisma_migrations; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public._prisma_migrations TO event_manager_app;


--
-- Name: TABLE activity_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.activity_logs TO event_manager_app;


--
-- Name: TABLE archived_events; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.archived_events TO event_manager_app;


--
-- Name: TABLE assignments; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignments TO event_manager_app;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_logs TO event_manager_app;


--
-- Name: TABLE auditor_assignments; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.auditor_assignments TO event_manager_app;


--
-- Name: TABLE backup_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.backup_logs TO event_manager_app;


--
-- Name: TABLE backup_schedules; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.backup_schedules TO event_manager_app;


--
-- Name: TABLE backup_settings; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.backup_settings TO event_manager_app;


--
-- Name: TABLE backup_targets; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.backup_targets TO event_manager_app;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO event_manager_app;


--
-- Name: TABLE category_certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category_certifications TO event_manager_app;


--
-- Name: TABLE category_contestants; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category_contestants TO event_manager_app;


--
-- Name: TABLE category_judges; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category_judges TO event_manager_app;


--
-- Name: TABLE category_templates; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category_templates TO event_manager_app;


--
-- Name: TABLE category_types; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category_types TO event_manager_app;


--
-- Name: TABLE certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.certifications TO event_manager_app;


--
-- Name: TABLE contest_certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contest_certifications TO event_manager_app;


--
-- Name: TABLE contest_contestants; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contest_contestants TO event_manager_app;


--
-- Name: TABLE contest_judges; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contest_judges TO event_manager_app;


--
-- Name: TABLE contestants; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contestants TO event_manager_app;


--
-- Name: TABLE contests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contests TO event_manager_app;


--
-- Name: TABLE criteria; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.criteria TO event_manager_app;


--
-- Name: TABLE custom_field_values; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.custom_field_values TO event_manager_app;


--
-- Name: TABLE custom_fields; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.custom_fields TO event_manager_app;


--
-- Name: TABLE deduction_approvals; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.deduction_approvals TO event_manager_app;


--
-- Name: TABLE deduction_requests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.deduction_requests TO event_manager_app;


--
-- Name: TABLE dr_configs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dr_configs TO event_manager_app;


--
-- Name: TABLE dr_metrics; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dr_metrics TO event_manager_app;


--
-- Name: TABLE dr_test_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dr_test_logs TO event_manager_app;


--
-- Name: TABLE email_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.email_logs TO event_manager_app;


--
-- Name: TABLE email_settings; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.email_settings TO event_manager_app;


--
-- Name: TABLE email_templates; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.email_templates TO event_manager_app;


--
-- Name: TABLE emcee_scripts; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.emcee_scripts TO event_manager_app;


--
-- Name: TABLE error_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.error_logs TO event_manager_app;


--
-- Name: TABLE event_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.event_logs TO event_manager_app;


--
-- Name: TABLE event_templates; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.event_templates TO event_manager_app;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.events TO event_manager_app;


--
-- Name: TABLE feature_flags; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feature_flags TO event_manager_app;


--
-- Name: TABLE files; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.files TO event_manager_app;


--
-- Name: TABLE judge_certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.judge_certifications TO event_manager_app;


--
-- Name: TABLE judge_comments; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.judge_comments TO event_manager_app;


--
-- Name: TABLE judge_contestant_certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.judge_contestant_certifications TO event_manager_app;


--
-- Name: TABLE judge_score_removal_requests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.judge_score_removal_requests TO event_manager_app;


--
-- Name: TABLE judge_uncertification_requests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.judge_uncertification_requests TO event_manager_app;


--
-- Name: TABLE judges; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.judges TO event_manager_app;


--
-- Name: TABLE logging_settings; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.logging_settings TO event_manager_app;


--
-- Name: TABLE notification_digests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_digests TO event_manager_app;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_preferences TO event_manager_app;


--
-- Name: TABLE notification_templates; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_templates TO event_manager_app;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO event_manager_app;


--
-- Name: TABLE overall_deductions; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.overall_deductions TO event_manager_app;


--
-- Name: TABLE password_histories; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.password_histories TO event_manager_app;


--
-- Name: TABLE password_policies; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.password_policies TO event_manager_app;


--
-- Name: TABLE performance_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.performance_logs TO event_manager_app;


--
-- Name: TABLE permission_audit_logs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.permission_audit_logs TO event_manager_app;


--
-- Name: TABLE push_subscriptions; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.push_subscriptions TO event_manager_app;


--
-- Name: TABLE rate_limit_configs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.rate_limit_configs TO event_manager_app;


--
-- Name: TABLE report_instances; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.report_instances TO event_manager_app;


--
-- Name: TABLE report_templates; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.report_templates TO event_manager_app;


--
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reports TO event_manager_app;


--
-- Name: TABLE review_contestant_certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.review_contestant_certifications TO event_manager_app;


--
-- Name: TABLE review_judge_score_certifications; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.review_judge_score_certifications TO event_manager_app;


--
-- Name: TABLE role_assignments; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.role_assignments TO event_manager_app;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.role_permissions TO event_manager_app;


--
-- Name: TABLE saved_searches; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.saved_searches TO event_manager_app;


--
-- Name: TABLE score_comments; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.score_comments TO event_manager_app;


--
-- Name: TABLE score_files; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.score_files TO event_manager_app;


--
-- Name: TABLE score_governance_approvals; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.score_governance_approvals TO event_manager_app;


--
-- Name: TABLE score_governance_requests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.score_governance_requests TO event_manager_app;


--
-- Name: TABLE score_removal_requests; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.score_removal_requests TO event_manager_app;


--
-- Name: TABLE scores; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scores TO event_manager_app;


--
-- Name: TABLE search_analytics; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.search_analytics TO event_manager_app;


--
-- Name: TABLE search_history; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.search_history TO event_manager_app;


--
-- Name: TABLE security_settings; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.security_settings TO event_manager_app;


--
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.system_settings TO event_manager_app;


--
-- Name: TABLE tally_master_assignments; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tally_master_assignments TO event_manager_app;


--
-- Name: TABLE template_criteria; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.template_criteria TO event_manager_app;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tenants TO event_manager_app;


--
-- Name: TABLE theme_settings; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.theme_settings TO event_manager_app;


--
-- Name: TABLE user_field_configurations; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_field_configurations TO event_manager_app;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO event_manager_app;


--
-- Name: TABLE webhook_configs; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_configs TO event_manager_app;


--
-- Name: TABLE webhook_deliveries; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_deliveries TO event_manager_app;


--
-- Name: TABLE winner_signatures; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.winner_signatures TO event_manager_app;


--
-- Name: TABLE workflow_instances; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_instances TO event_manager_app;


--
-- Name: TABLE workflow_step_executions; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_step_executions TO event_manager_app;


--
-- Name: TABLE workflow_steps; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_steps TO event_manager_app;


--
-- Name: TABLE workflow_templates; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_templates TO event_manager_app;


--
-- Name: TABLE workflow_transitions; Type: ACL; Schema: public; Owner: event_manager
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_transitions TO event_manager_app;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: event_manager
--

ALTER DEFAULT PRIVILEGES FOR ROLE event_manager IN SCHEMA public GRANT ALL ON SEQUENCES TO event_manager_app;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: event_manager
--

ALTER DEFAULT PRIVILEGES FOR ROLE event_manager IN SCHEMA public GRANT ALL ON FUNCTIONS TO event_manager_app;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: event_manager
--

ALTER DEFAULT PRIVILEGES FOR ROLE event_manager IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO event_manager_app;


--
-- PostgreSQL database dump complete
--

\unrestrict EPBmOJlR3NVgiJCov1kuvY1Xf7qUqrYp3bX6Sf2A1LD4wnvHvpPnyBegNMaan5g

