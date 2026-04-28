#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Module = require('module');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-jwt-secret';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'smoke-csrf-secret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'smoke-session-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://smoke:smoke@127.0.0.1:5432/smoke';
process.env.SMTP_ENABLED = 'false';

const rootDir = path.resolve(__dirname, '../..');
const emailServicePath = path.join(rootDir, 'dist/services/EmailService.js');
const settingsServicePath = path.join(rootDir, 'dist/services/SettingsService.js');

if (!fs.existsSync(emailServicePath) || !fs.existsSync(settingsServicePath)) {
  console.error('Compiled services are missing. Run `npm run build` before this smoke script.');
  process.exit(1);
}

const sentMail = [];
const transports = [];
const nodemailerMock = {
  createTransport(options) {
    transports.push(options);
    return {
      verify: async () => true,
      sendMail: async (mailOptions) => {
        sentMail.push(mailOptions);
        return { messageId: `smoke-${sentMail.length}`, response: '250 OK' };
      },
    };
  },
};
const databaseMock = {
  systemSetting: {
    findMany: async () => [],
  },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'nodemailer') {
    return nodemailerMock;
  }
  if (String(request).endsWith('/config/database') || request === '../config/database') {
    return { __esModule: true, default: databaseMock };
  }
  return originalLoad.apply(this, arguments);
};

require('reflect-metadata');

const { EmailService } = require(emailServicePath);
const { SettingsService } = require(settingsServicePath);

const tenantId = 'tenant-smoke-email-settings';
const settingRows = [
  { key: 'email_enabled', value: 'true', tenantId },
  { key: 'email_smtp_host', value: 'smtp.smoke.test', tenantId },
  { key: 'email_smtp_port', value: '587', tenantId },
  { key: 'email_smtp_secure', value: 'false', tenantId },
  { key: 'email_smtp_user', value: 'smtp-user', tenantId },
  { key: 'email_smtp_pass', value: 'smtp-pass', tenantId },
  { key: 'email_from_address', value: 'sender@smoke.test', tenantId },
  { key: 'email_from_name', value: 'Smoke Sender', tenantId },
  { key: 'email_replyToEmail', value: 'replies@smoke.test', tenantId },
  { key: 'email_replyToName', value: 'Smoke Replies', tenantId },
];
const settingByKey = new Map(settingRows.map((row) => [`${row.tenantId || 'global'}:${row.key}`, row]));

const prisma = {
  systemSetting: {
    findMany: async ({ where, select } = {}) => {
      const keyFilter = where?.key?.in || null;
      const requestedTenantId = Object.prototype.hasOwnProperty.call(where || {}, 'tenantId')
        ? where.tenantId
        : undefined;
      return settingRows
        .filter((row) => requestedTenantId === undefined || row.tenantId === requestedTenantId)
        .filter((row) => !keyFilter || keyFilter.includes(row.key))
        .map((row) => {
          if (!select) return row;
          return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
        });
    },
    findFirst: async ({ where } = {}) => {
      const requestedTenantId = Object.prototype.hasOwnProperty.call(where || {}, 'tenantId')
        ? where.tenantId
        : undefined;
      if (requestedTenantId === undefined) return null;
      return settingByKey.get(`${requestedTenantId || 'global'}:${where.key}`) || null;
    },
  },
  emailLog: {
    create: async () => ({}),
  },
};

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

(async () => {
  const emailService = new EmailService(prisma);
  const sendResult = await emailService.sendEmail(
    'recipient@smoke.test',
    'Smoke Runtime Header Test',
    'Smoke body',
    { tenantId }
  );

  assertEqual(sendResult.success, true, 'EmailService send result');
  const runtimeMail = sentMail[0];
  assertEqual(runtimeMail.from, '"Smoke Sender" <sender@smoke.test>', 'EmailService From header');
  assertEqual(runtimeMail.replyTo, '"Smoke Replies" <replies@smoke.test>', 'EmailService Reply-To header');

  const settingsService = new SettingsService(prisma);
  const testResult = await settingsService.testEmailSettings(' recipient@smoke.test ', tenantId);

  assertEqual(testResult, true, 'SettingsService test-email result');
  const testMail = sentMail[1];
  assertEqual(testMail.from, '"Smoke Sender" <sender@smoke.test>', 'SettingsService From header');
  assertEqual(testMail.replyTo, '"Smoke Replies" <replies@smoke.test>', 'SettingsService Reply-To header');
  assertEqual(testMail.to, 'recipient@smoke.test', 'SettingsService test recipient normalization');

  console.log('Email settings header smoke passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
