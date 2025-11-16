import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';
import * as path from 'path';

@injectable()
export class FileService extends BaseService {
  private readonly UPLOAD_DIR = path.join(__dirname, '../../uploads');

  async listFiles(directory?: string) {
    const targetDir = directory ? path.join(this.UPLOAD_DIR, directory) : this.UPLOAD_DIR;
    
    try {
      const files = await fs.readdir(targetDir, { withFileTypes: true });
      return files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
        path: path.join(directory || '', file.name)
      }));
    } catch (error: any) {
      throw this.badRequestError(`Failed to list files: ${error.message}`);
    }
  }

  async getFilePath(filename: string) {
    const filePath = path.join(this.UPLOAD_DIR, filename);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      throw this.notFoundError('File', filename);
    }
  }

  async deleteFile(filename: string) {
    const filePath = await this.getFilePath(filename);
    await fs.unlink(filePath);
  }
}
