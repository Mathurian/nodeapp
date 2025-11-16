import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface LogFileInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  modifiedAt: string; // Changed to string for JSON serialization
  path: string;
}

@injectable()
export class LogFilesService extends BaseService {
  private readonly LOG_DIRECTORY = path.join(__dirname, '../../logs');

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.LOG_DIRECTORY, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create logs directory: ${error.message}`);
    }
  }

  private validateFilename(filename: string): void {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw this.badRequestError('Invalid filename');
    }
  }

  async getLogFiles(): Promise<{ files: LogFileInfo[]; directory: string }> {
    await this.ensureLogDirectory();
    const files = await fs.readdir(this.LOG_DIRECTORY);

    const fileStats = await Promise.all(
      files
        .filter(file => file.endsWith('.log'))
        .map(async (file) => {
          const filePath = path.join(this.LOG_DIRECTORY, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            modifiedAt: stats.mtime.toISOString(), // Convert to ISO string for frontend
            path: filePath
          };
        })
    );

    fileStats.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    return { files: fileStats, directory: this.LOG_DIRECTORY };
  }

  async getLogFileContents(filename: string, lines: number = 500): Promise<any> {
    this.validateFilename(filename);
    const filePath = path.join(this.LOG_DIRECTORY, filename);

    try {
      await fs.access(filePath);
    } catch {
      throw this.notFoundError('Log file', filename);
    }

    const contents = await fs.readFile(filePath, 'utf-8');
    const allLines = contents.split('\n');
    const maxLines = parseInt(String(lines)) || 500;
    const lastLines = allLines.slice(-maxLines);

    return {
      filename,
      contents: lastLines.join('\n'),
      totalLines: allLines.length,
      displayedLines: lastLines.length
    };
  }

  async getLogFilePath(filename: string): Promise<string> {
    this.validateFilename(filename);
    const filePath = path.join(this.LOG_DIRECTORY, filename);

    try {
      await fs.access(filePath);
    } catch {
      throw this.notFoundError('Log file', filename);
    }

    return filePath;
  }

  async cleanupOldLogs(daysToKeep: number): Promise<any> {
    if (!daysToKeep || daysToKeep < 1) {
      throw this.badRequestError('Valid daysToKeep is required (minimum 1)');
    }

    await this.ensureLogDirectory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(String(daysToKeep)));

    const files = await fs.readdir(this.LOG_DIRECTORY);
    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
      if (!file.endsWith('.log')) continue;

      const filePath = path.join(this.LOG_DIRECTORY, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
        deletedSize += stats.size;
      }
    }

    return {
      deletedCount,
      deletedSize,
      deletedSizeFormatted: this.formatFileSize(deletedSize)
    };
  }

  async deleteLogFile(filename: string): Promise<void> {
    this.validateFilename(filename);
    const filePath = path.join(this.LOG_DIRECTORY, filename);

    try {
      await fs.access(filePath);
    } catch {
      throw this.notFoundError('Log file', filename);
    }

    await fs.unlink(filePath);
  }
}
