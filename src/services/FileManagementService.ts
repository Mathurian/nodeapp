import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';

@injectable()
export class FileManagementService extends BaseService {
  private readonly UPLOAD_DIR = path.join(__dirname, '../../uploads');

  async getFileInfo(filename: string) {
    const filePath = path.join(this.UPLOAD_DIR, filename);
    try {
      const stats = await fs.stat(filePath);
      return {
        name: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch {
      throw this.notFoundError('File', filename);
    }
  }

  async moveFile(filename: string, newPath: string) {
    const oldPath = path.join(this.UPLOAD_DIR, filename);
    const targetPath = path.join(this.UPLOAD_DIR, newPath);
    
    try {
      await fs.rename(oldPath, targetPath);
      return { success: true, newPath };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw this.badRequestError(`Move failed: ${errorMessage}`);
    }
  }

  async copyFile(filename: string, newPath: string) {
    const srcPath = path.join(this.UPLOAD_DIR, filename);
    const destPath = path.join(this.UPLOAD_DIR, newPath);
    
    try {
      await fs.copyFile(srcPath, destPath);
      return { success: true, newPath };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw this.badRequestError(`Copy failed: ${errorMessage}`);
    }
  }
}
