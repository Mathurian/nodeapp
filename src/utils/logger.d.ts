/**
 * Type declarations for logger utility
 */

import { Request } from 'express';

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export function createRequestLogger(req: Request, module: string): Logger;
export function createLogger(module: string): Logger;
