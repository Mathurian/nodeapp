import { CircuitBreaker, CircuitBreakerRegistry } from '../../../src/utils/circuitBreaker';

describe('CircuitBreaker listener registration', () => {
  afterEach(() => {
    CircuitBreakerRegistry.getAll().clear();
  });

  it('registers keyed listeners only once on a breaker instance', () => {
    const breaker = new CircuitBreaker({
      name: 'listener-idempotency-test',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      windowSize: 1000,
      volumeThreshold: 1,
    });

    const listener = jest.fn();
    for (let index = 0; index < 25; index++) {
      breaker.onUnique('open', 'service-monitor:open', listener);
    }

    expect(breaker.listenerCount('open')).toBe(1);
  });

  it('keeps service listener counts stable when registry breakers are reused', () => {
    const breaker = CircuitBreakerRegistry.get('shared-listener-idempotency-test', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      windowSize: 1000,
      volumeThreshold: 1,
    });

    for (let index = 0; index < 25; index++) {
      const reusedBreaker = CircuitBreakerRegistry.get('shared-listener-idempotency-test');
      reusedBreaker.onUnique('open', 'service-monitor:open', jest.fn());
      reusedBreaker.onUnique('close', 'service-monitor:close', jest.fn());
      reusedBreaker.onUnique('stateChange', 'service-monitor:state-change', jest.fn());
    }

    expect(breaker.listenerCount('open')).toBe(1);
    expect(breaker.listenerCount('close')).toBe(1);
    expect(breaker.listenerCount('stateChange')).toBe(1);
  });
});
