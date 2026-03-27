import routeFixtures from '../../../shared/idempotency/routeCanonicalizer.fixtures.json';
import requestFixtures from '../../../shared/idempotency/requestHashCanonicalizer.fixtures.json';
import {
  canonicalizeRouteParts,
} from '../../../src/generated/idempotency/routeCanonicalizer';
import {
  serializeCanonicalIdempotencyRequest,
} from '../../../src/generated/idempotency/requestHashCanonicalizer';

describe('shared idempotency canonicalizers', () => {
  it('matches the shared route canonicalizer fixtures', () => {
    for (const fixture of routeFixtures) {
      expect(canonicalizeRouteParts(fixture.input)).toEqual(fixture.output);
    }
  });

  it('matches the shared request canonicalizer fixtures', () => {
    for (const fixture of requestFixtures) {
      expect(serializeCanonicalIdempotencyRequest(fixture.input)).toBe(fixture.serialized);
    }
  });
});
