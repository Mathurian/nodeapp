import { describe, expect, it } from '@jest/globals';
import {
  parseContestantPrivateDocuments,
  stripContestantPrivateFields,
} from '../../../src/utils/contestantPrivateProfile';

describe('contestantPrivateProfile utils', () => {
  it('strips private contestant fields from generic user payloads', () => {
    const result = stripContestantPrivateFields({
      id: 'user-1',
      name: 'Contestant One',
      contestantAccommodations: 'ADA seating',
      contestantPrivateNotes: 'Internal note',
      contestantRecommendationNotes: 'Letter summary',
      contestantPrivateDocuments: [{ id: 'doc-1' }],
    });

    expect(result).toEqual({
      id: 'user-1',
      name: 'Contestant One',
    });
  });

  it('parses only valid private contestant document records', () => {
    const result = parseContestantPrivateDocuments([
      {
        id: 'doc-1',
        filename: 'stored-file.pdf',
        originalName: 'letter.pdf',
        mimeType: 'application/pdf',
        size: 1234,
        path: 'uploads/users/contestant-private/stored-file.pdf',
        uploadedAt: '2026-05-09T00:00:00.000Z',
        uploadedBy: 'user-2',
      },
      {
        id: 42,
      },
    ]);

    expect(result).toEqual([
      {
        id: 'doc-1',
        filename: 'stored-file.pdf',
        originalName: 'letter.pdf',
        mimeType: 'application/pdf',
        size: 1234,
        path: 'uploads/users/contestant-private/stored-file.pdf',
        uploadedAt: '2026-05-09T00:00:00.000Z',
        uploadedBy: 'user-2',
      },
    ]);
  });
});
