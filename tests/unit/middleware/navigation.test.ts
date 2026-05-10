import { Request, Response } from 'express';
import {
  getNavigationData,
  getNavigationItems,
} from '../../../src/middleware/navigation';

describe('navigation middleware', () => {
  describe('getNavigationItems', () => {
    it('returns canonical emcee navigation entries without dead legacy targets', () => {
      const items = getNavigationItems('EMCEE');

      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'emcee',
            path: '/emcee',
          }),
          expect.objectContaining({
            id: 'scripts',
            path: '/emcee?tab=scripts',
          }),
          expect.objectContaining({
            id: 'bios',
            path: '/bios',
          }),
        ])
      );

      expect(items).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'contestant-bios' }),
          expect.objectContaining({ id: 'judge-bios' }),
          expect.objectContaining({ id: 'event-management' }),
        ])
      );
    });

    it('keeps board emcee script navigation on the canonical emcee scripts tab', () => {
      const items = getNavigationItems('BOARD');
      const emceeScripts = items.find((item) => item.id === 'emcee-scripts');

      expect(emceeScripts).toEqual(
        expect.objectContaining({
          path: '/emcee?tab=scripts',
        })
      );
    });
  });

  describe('getNavigationData', () => {
    it('returns 401 when the user role is missing', async () => {
      const req = {
        user: undefined,
      } as Partial<Request> as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as Partial<Response> as Response;

      await getNavigationData(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('returns navigation payload for authenticated users', async () => {
      const req = {
        user: { role: 'EMCEE' },
      } as Partial<Request> as Request;
      const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
      } as Partial<Response> as Response;

      await getNavigationData(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'EMCEE',
          navigation: expect.arrayContaining([
            expect.objectContaining({ id: 'scripts', path: '/emcee?tab=scripts' }),
            expect.objectContaining({ id: 'bios', path: '/bios' }),
          ]),
        })
      );
    });
  });
});
