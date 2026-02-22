export type BackupTypeBase = 'FULL' | 'SCHEMA' | 'DATA';
export type BackupDeliveryMode = 'LOCAL' | 'REMOTE';
export type BackupScheduleFrequency = 'MINUTES' | 'HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BackupScheduleRow {
  id?: string;
  backupType: BackupTypeBase;
  deliveryMode: BackupDeliveryMode;
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  frequencyValue: number | null;
  retentionDays: number;
  createdAt?: string;
  updatedAt?: string;
  inherited?: boolean;
}

export interface ParsedBackupType {
  backupType: BackupTypeBase;
  deliveryMode: BackupDeliveryMode;
}

export interface BackupScheduleOverride {
  enabled?: boolean;
  frequency?: BackupScheduleFrequency;
  frequencyValue?: number | null;
  retentionDays?: number;
}

type ScheduleOverrideField = keyof BackupScheduleOverride;

const SCHEDULE_OVERRIDE_KEY_RE =
  /^backup_schedule_(full|schema|data)_(local|remote)_(enabled|frequency|frequency_value|retention_days)$/;

const validBackupTypes: BackupTypeBase[] = ['FULL', 'SCHEMA', 'DATA'];
const validFrequencies: BackupScheduleFrequency[] = ['MINUTES', 'HOURS', 'DAILY', 'WEEKLY', 'MONTHLY'];

export const SCHEDULE_OVERRIDE_KEY_PREFIX = 'backup_schedule_';

export const isValidBackupTypeBase = (value: string): value is BackupTypeBase =>
  validBackupTypes.includes(String(value || '').toUpperCase() as BackupTypeBase);

export const isValidScheduleFrequency = (value: string): value is BackupScheduleFrequency =>
  validFrequencies.includes(String(value || '').toUpperCase() as BackupScheduleFrequency);

export const normalizeStoredBackupType = (rawType: string): ParsedBackupType => {
  const upper = String(rawType || '').toUpperCase();
  if (upper.endsWith('_REMOTE')) {
    return { backupType: upper.replace(/_REMOTE$/, '') as BackupTypeBase, deliveryMode: 'REMOTE' };
  }
  if (upper.endsWith('_LOCAL')) {
    return { backupType: upper.replace(/_LOCAL$/, '') as BackupTypeBase, deliveryMode: 'LOCAL' };
  }
  return { backupType: upper as BackupTypeBase, deliveryMode: 'LOCAL' };
};

export const encodeStoredBackupType = (
  backupType: BackupTypeBase | string,
  deliveryMode: BackupDeliveryMode | string = 'LOCAL'
): string => {
  const base = String(backupType || '').toUpperCase();
  const mode = String(deliveryMode || 'LOCAL').toUpperCase();
  if (!isValidBackupTypeBase(base)) {
    return base;
  }
  return mode === 'REMOTE' ? `${base}_REMOTE` : `${base}_LOCAL`;
};

export const buildScheduleIdentity = (backupType: string, deliveryMode: string): string =>
  `${String(backupType || '').toUpperCase()}::${String(deliveryMode || 'LOCAL').toUpperCase()}`;

const overrideFieldSuffix: Record<ScheduleOverrideField, string> = {
  enabled: 'enabled',
  frequency: 'frequency',
  frequencyValue: 'frequency_value',
  retentionDays: 'retention_days',
};

export const buildScheduleOverrideKey = (
  storedType: string,
  field: ScheduleOverrideField
): string => {
  const normalized = String(storedType || '').toLowerCase();
  return `${SCHEDULE_OVERRIDE_KEY_PREFIX}${normalized}_${overrideFieldSuffix[field]}`;
};

export const buildAllScheduleOverrideKeys = (storedType: string): string[] => ([
  buildScheduleOverrideKey(storedType, 'enabled'),
  buildScheduleOverrideKey(storedType, 'frequency'),
  buildScheduleOverrideKey(storedType, 'frequencyValue'),
  buildScheduleOverrideKey(storedType, 'retentionDays'),
]);

export const parseScheduleOverrideKey = (
  key: string
): { storedType: string; field: ScheduleOverrideField } | null => {
  const match = String(key || '').match(SCHEDULE_OVERRIDE_KEY_RE);
  if (!match) return null;
  const base = String(match[1] || '').toUpperCase();
  const mode = String(match[2] || '').toUpperCase();
  const suffix = String(match[3] || '');
  const storedType = `${base}_${mode}`;
  let field: ScheduleOverrideField;
  switch (suffix) {
    case 'enabled':
      field = 'enabled';
      break;
    case 'frequency':
      field = 'frequency';
      break;
    case 'frequency_value':
      field = 'frequencyValue';
      break;
    case 'retention_days':
      field = 'retentionDays';
      break;
    default:
      return null;
  }
  return { storedType, field };
};

export const parseScheduleOverrideValue = (
  field: ScheduleOverrideField,
  rawValue: string
): BackupScheduleOverride[ScheduleOverrideField] | undefined => {
  const value = String(rawValue ?? '').trim();
  if (field === 'enabled') {
    return value === 'true';
  }
  if (field === 'frequency') {
    const upper = value.toUpperCase();
    return isValidScheduleFrequency(upper) ? upper : undefined;
  }
  if (field === 'frequencyValue') {
    if (value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (field === 'retentionDays') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const parseScheduleOverrides = (
  rows: Array<{ key: string; value: string }>
): Map<string, BackupScheduleOverride> => {
  const overrides = new Map<string, BackupScheduleOverride>();
  for (const row of rows) {
    const parsedKey = parseScheduleOverrideKey(row.key);
    if (!parsedKey) continue;
    const parsedValue = parseScheduleOverrideValue(parsedKey.field, row.value);
    if (parsedValue === undefined) continue;
    const existing = overrides.get(parsedKey.storedType) || {};
    overrides.set(parsedKey.storedType, {
      ...existing,
      [parsedKey.field]: parsedValue,
    });
  }
  return overrides;
};

export const applyScheduleOverride = (
  baseRow: BackupScheduleRow,
  override: BackupScheduleOverride | undefined
): BackupScheduleRow => {
  if (!override) {
    return { ...baseRow, inherited: true };
  }
  return {
    ...baseRow,
    enabled: override.enabled ?? baseRow.enabled,
    frequency: (override.frequency ?? baseRow.frequency) as BackupScheduleFrequency,
    frequencyValue: override.frequencyValue === undefined ? baseRow.frequencyValue : override.frequencyValue,
    retentionDays: override.retentionDays ?? baseRow.retentionDays,
    inherited: false,
  };
};

export const sortBackupScheduleRows = (rows: BackupScheduleRow[]): BackupScheduleRow[] => {
  const backupOrder: Record<BackupTypeBase, number> = { FULL: 1, SCHEMA: 2, DATA: 3 };
  const modeOrder: Record<BackupDeliveryMode, number> = { LOCAL: 1, REMOTE: 2 };
  return [...rows].sort((a, b) => {
    const byType = (backupOrder[a.backupType] || 99) - (backupOrder[b.backupType] || 99);
    if (byType !== 0) return byType;
    return (modeOrder[a.deliveryMode] || 99) - (modeOrder[b.deliveryMode] || 99);
  });
};
