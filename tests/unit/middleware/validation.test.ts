import {
  createCategoryFromTemplateSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../../../src/middleware/validation';

describe('validation middleware', () => {
  it('allows commentaryMode in category create payloads', async () => {
    await expect(
      createCategorySchema.parseAsync({
        contestId: 'cm9z6g0sh0001uoxxabcdef12',
        name: 'Formal Wear',
        commentaryMode: 'PER_CATEGORY',
        commentaryScope: 'CONTEST',
      }),
    ).resolves.toMatchObject({
      commentaryMode: 'PER_CATEGORY',
      commentaryScope: 'CONTEST',
    });
  });

  it('allows commentaryMode in category update payloads', async () => {
    await expect(
      updateCategorySchema.parseAsync({
        commentaryMode: 'HYBRID',
        commentaryScope: 'EVENT',
      }),
    ).resolves.toMatchObject({
      commentaryMode: 'HYBRID',
      commentaryScope: 'EVENT',
    });
  });

  it('allows commentaryMode when creating a category from a template', async () => {
    await expect(
      createCategoryFromTemplateSchema.parseAsync({
        contestId: 'cm9z6g0sh0001uoxxabcdef12',
        commentaryMode: 'PER_CATEGORY',
        commentaryScope: 'CONTEST',
      }),
    ).resolves.toMatchObject({
      commentaryMode: 'PER_CATEGORY',
      commentaryScope: 'CONTEST',
    });
  });

  it('rejects invalid commentaryMode or commentaryScope values', async () => {
    await expect(
      updateCategorySchema.parseAsync({
        commentaryMode: 'BY_CATEGORY',
      }),
    ).rejects.toThrow();

    await expect(
      updateCategorySchema.parseAsync({
        commentaryScope: 'GLOBAL',
      }),
    ).rejects.toThrow();
  });
});
