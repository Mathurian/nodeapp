import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { LogFilesService } from '../services/LogFilesService';
import { sendSuccess } from '../utils/responseHelpers';

export class LogFilesController {
  private logFilesService: LogFilesService;

  constructor() {
    this.logFilesService = container.resolve(LogFilesService);
  }

  getLogFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const result = await this.logFilesService.getLogFiles(category);
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getLogFileContents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const { lines } = req.query;
      const result = await this.logFilesService.getLogFileContents(
        filename!,
        lines ? parseInt(lines as string) : 500
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  downloadLogFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      const filePath = await this.logFilesService.getLogFilePath(filename!);
      res.download(filePath, filename!);
    } catch (error) {
      return next(error);
    }
  };

  cleanupOldLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { daysToKeep } = req.body;
      const result = await this.logFilesService.cleanupOldLogs(daysToKeep);
      return sendSuccess(res, result, `Deleted ${result.deletedCount} log file(s)`);
    } catch (error) {
      return next(error);
    }
  };

  deleteLogFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename } = req.params;
      await this.logFilesService.deleteLogFile(filename!);
      return sendSuccess(res, null, `Log file "${filename}" deleted successfully`);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new LogFilesController();
export const getLogFiles = controller.getLogFiles;
export const getLogFileContents = controller.getLogFileContents;
export const downloadLogFile = controller.downloadLogFile;
export const cleanupOldLogs = controller.cleanupOldLogs;
export const deleteLogFile = controller.deleteLogFile;
