/**
 * API Test Helpers
 * Helpers for testing API endpoints with supertest
 */

import request, { SuperTest, Test, Response } from 'supertest';
import { Express } from 'express';

/**
 * Create API test client
 */
export const createApiClient = (app: Express): SuperTest<Test> => {
  return request(app);
};

/**
 * Make authenticated GET request
 */
export const authenticatedGet = (
  app: Express,
  path: string,
  token: string
): Test => {
  return request(app)
    .get(path)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json');
};

/**
 * Make authenticated POST request
 */
export const authenticatedPost = (
  app: Express,
  path: string,
  token: string,
  body: any
): Test => {
  return request(app)
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .send(body);
};

/**
 * Make authenticated PUT request
 */
export const authenticatedPut = (
  app: Express,
  path: string,
  token: string,
  body: any
): Test => {
  return request(app)
    .put(path)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .send(body);
};

/**
 * Make authenticated PATCH request
 */
export const authenticatedPatch = (
  app: Express,
  path: string,
  token: string,
  body: any
): Test => {
  return request(app)
    .patch(path)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .send(body);
};

/**
 * Make authenticated DELETE request
 */
export const authenticatedDelete = (
  app: Express,
  path: string,
  token: string
): Test => {
  return request(app)
    .delete(path)
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'application/json');
};

/**
 * Make file upload request
 */
export const uploadFile = (
  app: Express,
  path: string,
  token: string,
  fieldName: string,
  filePath: string,
  additionalFields: Record<string, string> = {}
): Test => {
  let req = request(app)
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .attach(fieldName, filePath);

  Object.entries(additionalFields).forEach(([key, value]) => {
    req = req.field(key, value);
  });

  return req;
};

/**
 * Assert successful API response
 */
export const assertSuccess = (response: Response, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(true);
};

/**
 * Assert error API response
 */
export const assertError = (
  response: Response,
  expectedStatus: number,
  expectedMessage?: string
) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(false);
  expect(response.body).toHaveProperty('error');

  if (expectedMessage) {
    expect(response.body.error).toContain(expectedMessage);
  }
};

/**
 * Assert validation error
 */
export const assertValidationError = (response: Response, field?: string) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(false);
  expect(response.body).toHaveProperty('errors');

  if (field) {
    expect(response.body.errors).toHaveProperty(field);
  }
};

/**
 * Assert unauthorized response
 */
export const assertUnauthorized = (response: Response) => {
  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(false);
};

/**
 * Assert forbidden response
 */
export const assertForbidden = (response: Response) => {
  expect(response.status).toBe(403);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(false);
};

/**
 * Assert not found response
 */
export const assertNotFound = (response: Response) => {
  expect(response.status).toBe(404);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(false);
};

/**
 * Assert response has data
 */
export const assertHasData = (response: Response, dataKey?: string) => {
  expect(response.body).toHaveProperty('data');

  if (dataKey) {
    expect(response.body.data).toHaveProperty(dataKey);
  }
};

/**
 * Assert response is paginated
 */
export const assertPaginated = (response: Response) => {
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('pagination');
  expect(response.body.pagination).toHaveProperty('page');
  expect(response.body.pagination).toHaveProperty('limit');
  expect(response.body.pagination).toHaveProperty('total');
  expect(response.body.pagination).toHaveProperty('totalPages');
};

/**
 * Assert array response
 */
export const assertArrayResponse = (
  response: Response,
  minLength: number = 0,
  maxLength?: number
) => {
  expect(response.body).toHaveProperty('data');
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data.length).toBeGreaterThanOrEqual(minLength);

  if (maxLength !== undefined) {
    expect(response.body.data.length).toBeLessThanOrEqual(maxLength);
  }
};

/**
 * Assert response headers
 */
export const assertHeaders = (
  response: Response,
  expectedHeaders: Record<string, string>
) => {
  Object.entries(expectedHeaders).forEach(([key, value]) => {
    expect(response.headers[key.toLowerCase()]).toBe(value);
  });
};

/**
 * Assert CORS headers
 */
export const assertCorsHeaders = (response: Response) => {
  expect(response.headers).toHaveProperty('access-control-allow-origin');
};

/**
 * Assert rate limit headers
 */
export const assertRateLimitHeaders = (response: Response) => {
  expect(response.headers).toHaveProperty('x-ratelimit-limit');
  expect(response.headers).toHaveProperty('x-ratelimit-remaining');
  expect(response.headers).toHaveProperty('x-ratelimit-reset');
};

/**
 * Extract data from response
 */
export const extractData = <T = any>(response: Response): T => {
  return response.body.data;
};

/**
 * Extract error from response
 */
export const extractError = (response: Response): string => {
  return response.body.error || response.body.message;
};

/**
 * Make batch requests
 */
export const batchRequests = async (
  requests: Test[]
): Promise<Response[]> => {
  return Promise.all(requests);
};

/**
 * Test API endpoint with multiple roles
 */
export const testEndpointWithRoles = async (
  app: Express,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  tokens: { role: string; token: string }[],
  body?: any
) => {
  const results: { role: string; response: Response }[] = [];

  for (const { role, token } of tokens) {
    let req: Test;

    switch (method) {
      case 'get':
        req = authenticatedGet(app, path, token);
        break;
      case 'post':
        req = authenticatedPost(app, path, token, body);
        break;
      case 'put':
        req = authenticatedPut(app, path, token, body);
        break;
      case 'patch':
        req = authenticatedPatch(app, path, token, body);
        break;
      case 'delete':
        req = authenticatedDelete(app, path, token);
        break;
    }

    const response = await req;
    results.push({ role, response });
  }

  return results;
};

/**
 * Common API test scenarios
 */
export const apiTestScenarios = {
  /**
   * Test endpoint requires authentication
   */
  requiresAuth: async (app: Express, method: string, path: string) => {
    const response = await request(app)[method.toLowerCase()](path);
    assertUnauthorized(response);
  },

  /**
   * Test endpoint requires specific role
   */
  requiresRole: async (
    app: Express,
    method: string,
    path: string,
    unauthorizedToken: string
  ) => {
    const response = await request(app)
      [method.toLowerCase()](path)
      .set('Authorization', `Bearer ${unauthorizedToken}`);
    assertForbidden(response);
  },

  /**
   * Test endpoint handles not found
   */
  handlesNotFound: async (
    app: Express,
    path: string,
    token: string
  ) => {
    const response = await authenticatedGet(app, path, token);
    assertNotFound(response);
  },

  /**
   * Test endpoint validates input
   */
  validatesInput: async (
    app: Express,
    path: string,
    token: string,
    invalidBody: any
  ) => {
    const response = await authenticatedPost(app, path, token, invalidBody);
    assertValidationError(response);
  },
};

/**
 * Response time assertion
 */
export const assertResponseTime = (response: Response, maxMs: number) => {
  const responseTime = parseInt(response.headers['x-response-time'] || '0');
  expect(responseTime).toBeLessThan(maxMs);
};

/**
 * Create test query string
 */
export const createQueryString = (params: Record<string, any>): string => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
};
