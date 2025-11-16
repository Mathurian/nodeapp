/**
 * Search Integration Tests
 * End-to-end tests for advanced search functionality
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';

const prisma = new PrismaClient();

describe('Search Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let eventId: string;
  let contestId: string;
  let savedSearchId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'search-test@example.com',
        password: '$2a$10$hashedpassword',
        name: 'Search Test User',
        role: 'ADMIN',
        isActive: true
      }
    });
    userId = user.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'search-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;

    // Create test data for search
    const event = await prisma.event.create({
      data: {
        name: 'Searchable Test Event 2024',
        description: 'This is a test event for search functionality',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-03'),
        location: 'Test Location',
        status: 'UPCOMING',
        eventYear: 2024,
        organizationId: null
      }
    });
    eventId = event.id;

    const contest = await prisma.contest.create({
      data: {
        name: 'Searchable Test Contest',
        description: 'Test contest for search',
        eventId: event.id,
        contestNumber: 1,
        status: 'ACTIVE'
      }
    });
    contestId = contest.id;
  });

  afterAll(async () => {
    // Cleanup
    if (savedSearchId) {
      await prisma.savedSearch.deleteMany({
        where: { userId }
      });
    }
    await prisma.searchHistory.deleteMany({
      where: { userId }
    });
    await prisma.contest.delete({ where: { id: contestId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/search', () => {
    it('should search across all entities', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Searchable Test',
          limit: 20,
          offset: 0
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body).toHaveProperty('query', 'Searchable Test');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should support faceted search', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test',
          facets: {
            types: true,
            dates: true,
            status: true
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('facets');
      expect(response.body.facets).toHaveProperty('types');
      expect(Array.isArray(response.body.facets.types)).toBe(true);
    });

    it('should filter by entity type', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test',
          entityTypes: ['events']
        })
        .expect(200);

      expect(response.body.results.every((r: any) => r.type === 'events')).toBe(true);
    });

    it('should support pagination', async () => {
      const response1 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test',
          limit: 1,
          offset: 0
        })
        .expect(200);

      const response2 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test',
          limit: 1,
          offset: 1
        })
        .expect(200);

      expect(response1.body.page).toBe(1);
      expect(response2.body.page).toBe(2);
    });

    it('should support filters', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test',
          filters: {
            status: 'UPCOMING'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/search')
        .send({ query: 'test' })
        .expect(401);
    });

    it('should handle empty query', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '',
          limit: 20
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/search/:type', () => {
    it('should search specific entity type - users', async () => {
      const response = await request(app)
        .post('/api/search/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'Test User' })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should search specific entity type - events', async () => {
      const response = await request(app)
        .post('/api/search/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'Searchable Test Event' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0]).toHaveProperty('type', 'events');
    });

    it('should search specific entity type - contests', async () => {
      const response = await request(app)
        .post('/api/search/contests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'Searchable Test Contest' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0]).toHaveProperty('type', 'contests');
    });

    it('should return 400 for invalid entity type', async () => {
      await request(app)
        .post('/api/search/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/search/users')
        .send({ query: 'test' })
        .expect(401);
    });
  });

  describe('Saved Searches', () => {
    describe('POST /api/search/saved', () => {
      it('should save a search', async () => {
        const response = await request(app)
          .post('/api/search/saved')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'My Test Search',
            query: 'test events',
            filters: JSON.stringify({ status: 'UPCOMING' }),
            entityTypes: 'events,contests',
            isPublic: false
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name', 'My Test Search');
        expect(response.body).toHaveProperty('query', 'test events');

        savedSearchId = response.body.id;
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/search/saved')
          .send({
            name: 'Test Search',
            query: 'test'
          })
          .expect(401);
      });

      it('should validate required fields', async () => {
        await request(app)
          .post('/api/search/saved')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'test'
            // Missing name
          })
          .expect(400);
      });
    });

    describe('GET /api/search/saved', () => {
      it('should get saved searches for user', async () => {
        const response = await request(app)
          .get('/api/search/saved')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('query');
      });

      it('should support includePublic parameter', async () => {
        const response = await request(app)
          .get('/api/search/saved?includePublic=true')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/search/saved')
          .expect(401);
      });
    });

    describe('POST /api/search/saved/:id/execute', () => {
      it('should execute a saved search', async () => {
        const response = await request(app)
          .post(`/api/search/saved/${savedSearchId}/execute`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('results');
        expect(response.body).toHaveProperty('query');
      });

      it('should return 404 for non-existent saved search', async () => {
        await request(app)
          .post('/api/search/saved/non-existent-id/execute')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should require authentication', async () => {
        await request(app)
          .post(`/api/search/saved/${savedSearchId}/execute`)
          .expect(401);
      });
    });

    describe('DELETE /api/search/saved/:id', () => {
      it('should delete a saved search', async () => {
        const response = await request(app)
          .delete(`/api/search/saved/${savedSearchId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should return 404 for non-existent saved search', async () => {
        await request(app)
          .delete('/api/search/saved/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should require authentication', async () => {
        await request(app)
          .delete(`/api/search/saved/${savedSearchId}`)
          .expect(401);
      });
    });
  });

  describe('Search History', () => {
    describe('GET /api/search/history', () => {
      it('should get search history for user', async () => {
        // Perform a search first
        await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query: 'history test' });

        const response = await request(app)
          .get('/api/search/history')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('query');
        expect(response.body[0]).toHaveProperty('resultCount');
      });

      it('should support limit parameter', async () => {
        const response = await request(app)
          .get('/api/search/history?limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.length).toBeLessThanOrEqual(5);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/search/history')
          .expect(401);
      });
    });

    describe('DELETE /api/search/history', () => {
      it('should clear search history', async () => {
        const response = await request(app)
          .delete('/api/search/history')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('deletedCount');
        expect(typeof response.body.deletedCount).toBe('number');
      });

      it('should require authentication', async () => {
        await request(app)
          .delete('/api/search/history')
          .expect(401);
      });
    });
  });

  describe('Search Suggestions', () => {
    describe('GET /api/search/suggestions', () => {
      it('should get search suggestions', async () => {
        const response = await request(app)
          .get('/api/search/suggestions?q=tes')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should return empty array for short query', async () => {
        const response = await request(app)
          .get('/api/search/suggestions?q=t')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should support limit parameter', async () => {
        const response = await request(app)
          .get('/api/search/suggestions?q=test&limit=3')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.length).toBeLessThanOrEqual(3);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/search/suggestions?q=test')
          .expect(401);
      });
    });
  });

  describe('Popular and Trending Searches', () => {
    describe('GET /api/search/popular', () => {
      it('should get popular searches', async () => {
        const response = await request(app)
          .get('/api/search/popular')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('query');
          expect(response.body[0]).toHaveProperty('totalSearches');
        }
      });

      it('should support limit parameter', async () => {
        const response = await request(app)
          .get('/api/search/popular?limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.length).toBeLessThanOrEqual(5);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/search/popular')
          .expect(401);
      });
    });

    describe('GET /api/search/trending', () => {
      it('should get trending searches', async () => {
        const response = await request(app)
          .get('/api/search/trending')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should support limit parameter', async () => {
        const response = await request(app)
          .get('/api/search/trending?limit=3')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.length).toBeLessThanOrEqual(3);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/search/trending')
          .expect(401);
      });
    });
  });

  describe('Search Performance', () => {
    it('should complete search within reasonable time', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'performance test',
          limit: 100
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle complex queries', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test event 2024 upcoming active',
          entityTypes: ['events', 'contests', 'categories'],
          filters: {
            status: 'UPCOMING',
            year: 2024
          },
          facets: {
            types: true,
            dates: true,
            status: true
          },
          limit: 50
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('facets');
    });
  });
});
