import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface LogFileInfo {
  name: string;
  folder: string;
  size: number;
  sizeFormatted: string;
  modifiedAt: string; // Changed to string for JSON serialization
  path: string; // Relative path from logs directory (e.g., 'api/app-api-2025-11-22.log')
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
    // Allow forward slashes for subfolder paths (e.g., 'api/app-api-2025-11-22.log')
    // But prevent directory traversal
    if (filename.includes('..') || filename.startsWith('/') || filename.includes('\\')) {
      throw this.badRequestError('Invalid filename');
    }
  }
  
  private sanitizePath(filePath: string): string {
    // Remove any directory traversal attempts
    const normalized = path.normalize(filePath);
    if (normalized.includes('..')) {
      throw this.badRequestError('Invalid file path');
    }
    return normalized;
  }

  async getLogFiles(category?: string): Promise<{ files: LogFileInfo[]; folders: string[]; directory: string }> {
    await this.ensureLogDirectory();
    
    const files: LogFileInfo[] = [];
    const folders: string[] = [];
    
    // Read main directory
    const entries = await fs.readdir(this.LOG_DIRECTORY, { withFileTypes: true });
    
    // Process directories and files
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip if filtering by category and this isn't the category folder
        if (category && entry.name !== category) {
          continue;
        }
        
        folders.push(entry.name);
        const subDirPath = path.join(this.LOG_DIRECTORY, entry.name);
        
        try {
          const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });
          
          for (const subEntry of subEntries) {
            if (subEntry.isFile() && subEntry.name.endsWith('.log')) {
              const filePath = path.join(subDirPath, subEntry.name);
              const stats = await fs.stat(filePath);
              files.push({
                name: subEntry.name,
                folder: entry.name,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                modifiedAt: stats.mtime.toISOString(),
                path: path.join(entry.name, subEntry.name) // Relative path
              });
            }
          }
        } catch (error: any) {
          // Skip directories we can't read
          this.logWarn(`Failed to read log subdirectory ${entry.name}: ${error.message}`);
        }
      } else if (entry.isFile() && entry.name.endsWith('.log')) {
        // Handle legacy log files in root directory (for backward compatibility)
        const filePath = path.join(this.LOG_DIRECTORY, entry.name);
        const stats = await fs.stat(filePath);
        files.push({
          name: entry.name,
          folder: 'general', // Legacy files go to general folder
          size: stats.size,
          sizeFormatted: this.formatFileSize(stats.size),
          modifiedAt: stats.mtime.toISOString(),
          path: entry.name // Relative path
        });
      }
    }
    
    // Sort by modified date (newest first)
    files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    
    // Sort folders alphabetically
    folders.sort();
    
    return { files, folders, directory: this.LOG_DIRECTORY };
  }

  async getLogFileContents(filename: string, lines: number = 500): Promise<any> {
    this.validateFilename(filename);
    
    // Handle both relative paths (e.g., 'api/app-api-2025-11-22.log') and simple filenames
    let filePath: string;
    if (filename.includes('/')) {
      // Relative path from logs directory
      filePath = path.join(this.LOG_DIRECTORY, this.sanitizePath(filename));
    } else {
      // Simple filename - search in all subdirectories
      filePath = path.join(this.LOG_DIRECTORY, filename);
      
      // Try to find the file in subdirectories
      try {
        await fs.access(filePath);
      } catch {
        // File not in root, search subdirectories
        const entries = await fs.readdir(this.LOG_DIRECTORY, { withFileTypes: true });
        let found = false;
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subFilePath = path.join(this.LOG_DIRECTORY, entry.name, filename);
            try {
              await fs.access(subFilePath);
              filePath = subFilePath;
              found = true;
              break;
            } catch {
              // Continue searching
            }
          }
        }
        
        if (!found) {
          throw this.notFoundError('Log file', filename);
        }
      }
    }

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
      filename: path.basename(filePath),
      folder: path.dirname(filePath).replace(this.LOG_DIRECTORY + path.sep, '') || 'general',
      content: lastLines.join('\n'),
      totalLines: allLines.length,
      displayedLines: lastLines.length
    };
  }

  async getLogFilePath(filename: string): Promise<string> {
    this.validateFilename(filename);
    
    // Handle both relative paths (e.g., 'api/app-api-2025-11-22.log') and simple filenames
    let filePath: string;
    if (filename.includes('/')) {
      // Relative path from logs directory
      filePath = path.join(this.LOG_DIRECTORY, this.sanitizePath(filename));
    } else {
      // Simple filename - search in all subdirectories
      filePath = path.join(this.LOG_DIRECTORY, filename);
      
      // Try to find the file in subdirectories
      try {
        await fs.access(filePath);
      } catch {
        // File not in root, search subdirectories
        const entries = await fs.readdir(this.LOG_DIRECTORY, { withFileTypes: true });
        let found = false;
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subFilePath = path.join(this.LOG_DIRECTORY, entry.name, filename);
            try {
              await fs.access(subFilePath);
              filePath = subFilePath;
              found = true;
              break;
            } catch {
              // Continue searching
            }
          }
        }
        
        if (!found) {
          throw this.notFoundError('Log file', filename);
        }
      }
    }

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

    let deletedCount = 0;
    let deletedSize = 0;

    // Process root directory files (legacy)
    const rootEntries = await fs.readdir(this.LOG_DIRECTORY, { withFileTypes: true });
    
    for (const entry of rootEntries) {
      if (entry.isFile() && entry.name.endsWith('.log')) {
        const filePath = path.join(this.LOG_DIRECTORY, entry.name);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          deletedSize += stats.size;
        }
      } else if (entry.isDirectory()) {
        // Process subdirectory
        const subDirPath = path.join(this.LOG_DIRECTORY, entry.name);
        try {
          const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });
          
          for (const subEntry of subEntries) {
            if (subEntry.isFile() && subEntry.name.endsWith('.log')) {
              const filePath = path.join(subDirPath, subEntry.name);
              const stats = await fs.stat(filePath);

              if (stats.mtime < cutoffDate) {
                await fs.unlink(filePath);
                deletedCount++;
                deletedSize += stats.size;
              }
            }
          }
        } catch (error: any) {
          // Skip directories we can't read
          this.logWarn(`Failed to cleanup logs in ${entry.name}: ${error.message}`);
        }
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
    
    // Handle both relative paths (e.g., 'api/app-api-2025-11-22.log') and simple filenames
    let filePath: string;
    if (filename.includes('/')) {
      // Relative path from logs directory
      filePath = path.join(this.LOG_DIRECTORY, this.sanitizePath(filename));
    } else {
      // Simple filename - search in all subdirectories
      filePath = path.join(this.LOG_DIRECTORY, filename);
      
      // Try to find the file in subdirectories
      try {
        await fs.access(filePath);
      } catch {
        // File not in root, search subdirectories
        const entries = await fs.readdir(this.LOG_DIRECTORY, { withFileTypes: true });
        let found = false;
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subFilePath = path.join(this.LOG_DIRECTORY, entry.name, filename);
            try {
              await fs.access(subFilePath);
              filePath = subFilePath;
              found = true;
              break;
            } catch {
              // Continue searching
            }
          }
        }
        
        if (!found) {
          throw this.notFoundError('Log file', filename);
        }
      }
    }

    try {
      await fs.access(filePath);
    } catch {
      throw this.notFoundError('Log file', filename);
    }

    await fs.unlink(filePath);
  }
}
