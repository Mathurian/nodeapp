/**
 * Type declarations for logger utility
 */

import { Request } from 'express';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createRequestLogger(req: Request, module: string): Logger;
export function createLogger(module: string): Logger;
