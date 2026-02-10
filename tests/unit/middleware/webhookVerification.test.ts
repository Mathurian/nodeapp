/**
 * Webhook Verification Middleware Tests
 *
 * Tests for HMAC-SHA256 signature verification, timestamp validation,
 * and replay attack prevention.
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import {
  calculateWebhookSignature,
  verifyWebhookSignature,
  verifyWebhook,
  createWebhookVerifier,
  signWebhookPayload
} from '../../../src/middleware/webhookVerification';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('Webhook Verification Middleware', () => {
  const testSecret = 'test-webhook-secret-12345';
  const testPayload = { event: 'test.event', data: { id: '123' } };
  const testPayloadString = JSON.stringify(testPayload);

  describe('calculateWebhookSignature', () => {
    it('should generate a signature in the correct format', () => {
      const timestamp = '1704067200000';
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate consistent signatures for the same inputs', () => {
      const timestamp = '1704067200000';
      const sig1 = calculateWebhookSignature(testPayloadString, timestamp, testSecret);
      const sig2 = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const sig1 = calculateWebhookSignature(testPayloadString, '1704067200000', testSecret);
      const sig2 = calculateWebhookSignature(testPayloadString, '1704067200001', testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const timestamp = '1704067200000';
      const sig1 = calculateWebhookSignature('{"a":1}', timestamp, testSecret);
      const sig2 = calculateWebhookSignature('{"a":2}', timestamp, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const timestamp = '1704067200000';
      const sig1 = calculateWebhookSignature(testPayloadString, timestamp, 'secret1');
      const sig2 = calculateWebhookSignature(testPayloadString, timestamp, 'secret2');

      expect(sig1).not.toBe(sig2);
    });

    it('should match Node.js crypto HMAC output', () => {
      const timestamp = '1704067200000';
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      // Manually compute expected signature
      const signedPayload = `${timestamp}.${testPayloadString}`;
      const expectedHmac = crypto.createHmac('sha256', testSecret).update(signedPayload).digest('hex');

      expect(signature).toBe(`sha256=${expectedHmac}`);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify a valid signature', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      const result = verifyWebhookSignature(testPayloadString, signature, timestamp, testSecret);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing signature', () => {
      const timestamp = Date.now().toString();

      const result = verifyWebhookSignature(testPayloadString, '', timestamp, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing signature');
    });

    it('should reject missing timestamp', () => {
      const signature = 'sha256=abc123';

      const result = verifyWebhookSignature(testPayloadString, signature, '', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing timestamp');
    });

    it('should reject missing secret', () => {
      const timestamp = Date.now().toString();
      const signature = 'sha256=abc123';

      const result = verifyWebhookSignature(testPayloadString, signature, timestamp, '');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing secret');
    });

    it('should reject invalid signature format (no sha256= prefix)', () => {
      const timestamp = Date.now().toString();
      const signature = 'abc123def456'; // Missing sha256= prefix

      const result = verifyWebhookSignature(testPayloadString, signature, timestamp, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature format: must start with sha256=');
    });

    it('should reject invalid timestamp format', () => {
      const signature = 'sha256=abc123';

      const result = verifyWebhookSignature(testPayloadString, signature, 'not-a-number', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timestamp format');
    });

    it('should reject negative timestamp', () => {
      const signature = 'sha256=abc123';

      const result = verifyWebhookSignature(testPayloadString, signature, '-1', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timestamp format');
    });

    it('should reject expired timestamp (too old)', () => {
      const oldTimestamp = (Date.now() - 400000).toString(); // 6+ minutes ago
      const signature = calculateWebhookSignature(testPayloadString, oldTimestamp, testSecret);

      const result = verifyWebhookSignature(testPayloadString, signature, oldTimestamp, testSecret, 300000);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Timestamp expired/);
    });

    it('should reject future timestamp (too far ahead)', () => {
      const futureTimestamp = (Date.now() + 400000).toString(); // 6+ minutes ahead
      const signature = calculateWebhookSignature(testPayloadString, futureTimestamp, testSecret);

      const result = verifyWebhookSignature(testPayloadString, signature, futureTimestamp, testSecret, 300000);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Timestamp expired/);
    });

    it('should accept timestamp within tolerance', () => {
      const recentTimestamp = (Date.now() - 60000).toString(); // 1 minute ago
      const signature = calculateWebhookSignature(testPayloadString, recentTimestamp, testSecret);

      const result = verifyWebhookSignature(testPayloadString, signature, recentTimestamp, testSecret, 300000);

      expect(result.valid).toBe(true);
    });

    it('should reject signature mismatch', () => {
      const timestamp = Date.now().toString();
      const validSignature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);
      // Tamper with the signature
      const tamperedSignature = validSignature.slice(0, -1) + '0';

      const result = verifyWebhookSignature(testPayloadString, tamperedSignature, timestamp, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature mismatch');
    });

    it('should reject when payload has been tampered', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);
      const tamperedPayload = JSON.stringify({ event: 'test.event', data: { id: '456' } });

      const result = verifyWebhookSignature(tamperedPayload, signature, timestamp, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature mismatch');
    });

    it('should reject when using wrong secret', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      const result = verifyWebhookSignature(testPayloadString, signature, timestamp, 'wrong-secret');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature mismatch');
    });

    it('should handle custom tolerance', () => {
      const timestamp = (Date.now() - 120000).toString(); // 2 minutes ago
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      // Should fail with 1 minute tolerance
      const result1 = verifyWebhookSignature(testPayloadString, signature, timestamp, testSecret, 60000);
      expect(result1.valid).toBe(false);

      // Should pass with 5 minute tolerance
      const result2 = verifyWebhookSignature(testPayloadString, signature, timestamp, testSecret, 300000);
      expect(result2.valid).toBe(true);
    });

    it('should handle non-hex signature gracefully', () => {
      const timestamp = Date.now().toString();
      const badSignature = 'sha256=not-valid-hex-ghij';

      const result = verifyWebhookSignature(testPayloadString, badSignature, timestamp, testSecret);

      expect(result.valid).toBe(false);
      // Should handle this gracefully (either length mismatch or encoding error)
    });
  });

  describe('verifyWebhook middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock<NextFunction>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      mockRes = {
        status: statusMock,
        json: jsonMock
      };
      mockNext = jest.fn();
    });

    it('should call next() for valid signature', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 for missing signature', () => {
      mockReq = {
        headers: {
          'x-webhook-timestamp': Date.now().toString()
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Missing webhook signature'
      }));
    });

    it('should return 401 for missing timestamp', () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'sha256=abc123'
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Missing webhook timestamp'
      }));
    });

    it('should return 401 for invalid signature', () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'sha256=invalid',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle string body', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp
        },
        body: testPayloadString, // String instead of parsed object
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle Buffer body', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp
        },
        body: Buffer.from(testPayloadString), // Buffer instead of parsed object
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom header names', () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      mockReq = {
        headers: {
          'x-custom-sig': signature,
          'x-custom-ts': timestamp
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret, {
        signatureHeader: 'x-custom-sig',
        timestampHeader: 'x-custom-ts'
      });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom tolerance', () => {
      const oldTimestamp = (Date.now() - 120000).toString(); // 2 minutes ago
      const signature = calculateWebhookSignature(testPayloadString, oldTimestamp, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': oldTimestamp
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      // Should fail with 1 minute tolerance
      const middleware1 = verifyWebhook(testSecret, { toleranceMs: 60000 });
      middleware1(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).not.toHaveBeenCalled();

      // Reset mocks
      mockNext.mockClear();
      statusMock.mockClear();

      // Should pass with 5 minute tolerance
      const middleware2 = verifyWebhook(testSecret, { toleranceMs: 300000 });
      middleware2(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom error handler', () => {
      const customHandler = jest.fn();

      mockReq = {
        headers: {},
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const middleware = verifyWebhook(testSecret, { onError: customHandler });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(customHandler).toHaveBeenCalledWith(mockRes, 'Missing webhook signature');
      expect(statusMock).not.toHaveBeenCalled(); // Default handler not used
    });
  });

  describe('createWebhookVerifier middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock<NextFunction>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      mockRes = {
        status: statusMock,
        json: jsonMock
      };
      mockNext = jest.fn();
    });

    it('should call next() when secret getter returns valid secret', async () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1',
        params: { id: '123' }
      };

      const secretGetter = jest.fn().mockResolvedValue(testSecret);
      const middleware = createWebhookVerifier(secretGetter);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(secretGetter).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 when secret getter returns null', async () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'sha256=abc',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1',
        params: { id: 'nonexistent' }
      };

      const secretGetter = jest.fn().mockResolvedValue(null);
      const middleware = createWebhookVerifier(secretGetter);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Webhook not configured'
      }));
    });

    it('should return 404 when secret getter returns undefined', async () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'sha256=abc',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const secretGetter = jest.fn().mockResolvedValue(undefined);
      const middleware = createWebhookVerifier(secretGetter);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 500 when secret getter throws', async () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'sha256=abc',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      const secretGetter = jest.fn().mockRejectedValue(new Error('Database error'));
      const middleware = createWebhookVerifier(secretGetter);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Webhook verification error'
      }));
    });

    it('should work with synchronous secret getter', async () => {
      const timestamp = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp
        },
        body: testPayload,
        path: '/webhook',
        method: 'POST',
        ip: '127.0.0.1'
      };

      // Synchronous getter
      const secretGetter = () => testSecret;
      const middleware = createWebhookVerifier(secretGetter);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('signWebhookPayload utility', () => {
    it('should generate signature and timestamp', () => {
      const result = signWebhookPayload(testPayload, testSecret);

      expect(result.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(result.timestamp).toMatch(/^\d+$/);
    });

    it('should use provided timestamp', () => {
      const customTimestamp = '1704067200000';
      const result = signWebhookPayload(testPayload, testSecret, customTimestamp);

      expect(result.timestamp).toBe(customTimestamp);
    });

    it('should generate verifiable signatures', () => {
      const { signature, timestamp } = signWebhookPayload(testPayload, testSecret);

      const verifyResult = verifyWebhookSignature(
        testPayloadString,
        signature,
        timestamp,
        testSecret,
        Infinity // Ignore tolerance for this test
      );

      expect(verifyResult.valid).toBe(true);
    });

    it('should work with string payload', () => {
      const { signature, timestamp } = signWebhookPayload(testPayloadString, testSecret);

      const verifyResult = verifyWebhookSignature(
        testPayloadString,
        signature,
        timestamp,
        testSecret,
        Infinity
      );

      expect(verifyResult.valid).toBe(true);
    });
  });

  describe('Timing attack prevention', () => {
    it('should use constant-time comparison', () => {
      const timestamp = Date.now().toString();
      const validSignature = calculateWebhookSignature(testPayloadString, timestamp, testSecret);

      // Create signatures that differ at different positions
      const hash = validSignature.substring(7);
      const wrongFirst = `sha256=0${hash.substring(1)}`;
      const wrongLast = `sha256=${hash.substring(0, hash.length - 1)}0`;

      // Both should fail, and timing should be similar
      // (We can't easily test timing in unit tests, but we verify both fail)
      const result1 = verifyWebhookSignature(testPayloadString, wrongFirst, timestamp, testSecret);
      const result2 = verifyWebhookSignature(testPayloadString, wrongLast, timestamp, testSecret);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });

  describe('Replay attack prevention', () => {
    it('should reject replayed webhooks after timestamp expires', async () => {
      // First request - valid
      const timestamp1 = Date.now().toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp1, testSecret);

      const result1 = verifyWebhookSignature(testPayloadString, signature, timestamp1, testSecret);
      expect(result1.valid).toBe(true);

      // Simulate time passing - use a timestamp from 10 minutes ago
      const oldTimestamp = (Date.now() - 600000).toString();
      const oldSignature = calculateWebhookSignature(testPayloadString, oldTimestamp, testSecret);

      const result2 = verifyWebhookSignature(testPayloadString, oldSignature, oldTimestamp, testSecret);
      expect(result2.valid).toBe(false);
      expect(result2.error).toMatch(/Timestamp expired/);
    });

    it('should bind signature to specific timestamp', () => {
      const timestamp1 = Date.now().toString();
      const timestamp2 = (Date.now() + 1).toString();
      const signature = calculateWebhookSignature(testPayloadString, timestamp1, testSecret);

      // Valid with original timestamp
      const result1 = verifyWebhookSignature(testPayloadString, signature, timestamp1, testSecret);
      expect(result1.valid).toBe(true);

      // Invalid with different timestamp (even if within tolerance)
      const result2 = verifyWebhookSignature(testPayloadString, signature, timestamp2, testSecret);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Signature mismatch');
    });
  });
});
