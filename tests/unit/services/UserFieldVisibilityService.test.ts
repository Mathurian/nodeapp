import 'reflect-metadata';
import { UserFieldVisibilityService } from '../../../src/services/UserFieldVisibilityService';
import prisma from '../../../src/utils/prisma';

describe('UserFieldVisibilityService', () => {
  let service: UserFieldVisibilityService;
  let systemSettingFindManySpy: jest.SpyInstance;
  let systemSettingFindFirstSpy: jest.SpyInstance;
  let systemSettingCreateSpy: jest.SpyInstance;
  let systemSettingDeleteManySpy: jest.SpyInstance;
  let customFieldFindManySpy: jest.SpyInstance;

  beforeEach(() => {
    service = new UserFieldVisibilityService();
    systemSettingFindManySpy = jest.spyOn(prisma.systemSetting, 'findMany');
    systemSettingFindFirstSpy = jest.spyOn(prisma.systemSetting, 'findFirst');
    systemSettingCreateSpy = jest.spyOn(prisma.systemSetting, 'create');
    systemSettingDeleteManySpy = jest.spyOn(prisma.systemSetting, 'deleteMany');
    customFieldFindManySpy = jest.spyOn(prisma.customField, 'findMany');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('merges global and tenant field visibility with tenant precedence', async () => {
    systemSettingFindManySpy
      .mockResolvedValueOnce([
        {
          key: 'user_field_visibility_email',
          value: JSON.stringify({ visible: true, required: true }),
        },
        {
          key: 'user_field_visibility_phone',
          value: JSON.stringify({ visible: false, required: false }),
        },
      ] as any)
      .mockResolvedValueOnce([
        {
          key: 'user_field_visibility_email',
          value: JSON.stringify({ visible: false, required: true }),
        },
      ] as any);

    customFieldFindManySpy.mockResolvedValueOnce([
      {
        id: 'cf-1',
        key: 'board_role',
        required: true,
        label: 'Board Role',
        name: 'Board Role',
        type: 'TEXT',
      },
    ] as any);

    const result = await service.getFieldVisibilitySettings('tenant-1');

    expect(systemSettingFindManySpy).toHaveBeenNthCalledWith(1, {
      where: { key: { startsWith: 'user_field_visibility_' }, tenantId: null },
    });
    expect(systemSettingFindManySpy).toHaveBeenNthCalledWith(2, {
      where: { key: { startsWith: 'user_field_visibility_' }, tenantId: 'tenant-1' },
    });
    expect(customFieldFindManySpy).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', entityType: 'USER', active: true },
      orderBy: { order: 'asc' },
    });

    expect(result.email).toEqual({ visible: false, required: true });
    expect(result.phone).toEqual({ visible: false, required: false });
    expect(result.custom_board_role).toMatchObject({
      visible: true,
      required: true,
      isCustomField: true,
      customFieldId: 'cf-1',
      label: 'Board Role',
      type: 'TEXT',
    });
  });

  it('loads only global settings when tenant scope is not provided', async () => {
    systemSettingFindManySpy.mockResolvedValueOnce([
      {
        key: 'user_field_visibility_email',
        value: JSON.stringify({ visible: true, required: true }),
      },
    ] as any);

    const result = await service.getFieldVisibilitySettings(null);

    expect(systemSettingFindManySpy).toHaveBeenCalledTimes(1);
    expect(systemSettingFindManySpy).toHaveBeenCalledWith({
      where: { key: { startsWith: 'user_field_visibility_' }, tenantId: null },
    });
    expect(customFieldFindManySpy).not.toHaveBeenCalled();
    expect(result.email).toEqual({ visible: true, required: true });
  });

  it('falls back to legacy table when scoped system settings are not present', async () => {
    systemSettingFindManySpy
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);
    customFieldFindManySpy.mockResolvedValueOnce([] as any);
    const legacySpy = jest
      .spyOn(service as any, 'loadLegacyFieldVisibilityRows')
      .mockResolvedValueOnce([
        { fieldName: 'phone', isVisible: false, isRequired: true },
      ]);

    const result = await service.getFieldVisibilitySettings('tenant-legacy');

    expect(result.phone).toEqual({ visible: false, required: true });
    expect(legacySpy).toHaveBeenCalledWith('tenant-legacy');
  });

  it('creates tenant-scoped visibility settings during update', async () => {
    systemSettingFindFirstSpy.mockResolvedValueOnce(null);
    systemSettingCreateSpy.mockResolvedValueOnce({ id: 's-1' } as any);

    const result = await service.updateFieldVisibility('email', false, true, 'user-1', 'tenant-7');

    expect(systemSettingFindFirstSpy).toHaveBeenCalledWith({
      where: {
        key: 'user_field_visibility_email',
        tenantId: 'tenant-7',
      },
    });
    expect(systemSettingCreateSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: 'user_field_visibility_email',
        value: JSON.stringify({ visible: false, required: true }),
        tenantId: 'tenant-7',
        updatedBy: 'user-1',
      }),
    });
    expect(result.scope).toBe('tenant');
  });

  it('resets field visibility within the tenant scope only', async () => {
    systemSettingDeleteManySpy.mockResolvedValueOnce({ count: 4 } as any);

    const result = await service.resetFieldVisibility('tenant-9');

    expect(systemSettingDeleteManySpy).toHaveBeenCalledWith({
      where: {
        key: { startsWith: 'user_field_visibility_' },
        tenantId: 'tenant-9',
      },
    });
    expect(result.scope).toBe('tenant');
  });
});
