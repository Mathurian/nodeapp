import path from 'path';
import os from 'os';
import fsp from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const uploadToRuntimeRemoteTarget = async (
  filepath: string,
  runtimeSettings: Record<string, string>
): Promise<{ success: boolean; error?: string }> => {
  const remoteType = String(runtimeSettings['backup_remote_type'] || '').trim().toLowerCase();
  if (remoteType === 'rclone') {
    const remote = String(runtimeSettings['backup_rclone_remote'] || '').trim();
    if (!remote) {
      return { success: false, error: 'RCLONE_REMOTE is not configured' };
    }

    let tempDir: string | null = null;
    try {
      await execFileAsync('rclone', ['version'], { timeout: 10000 });
      const args = ['copy', path.resolve(filepath), `${remote}/${path.basename(filepath)}`];
      const provider = String(runtimeSettings['backup_rclone_provider'] || 'generic').trim().toLowerCase();
      const authMode = String(runtimeSettings['backup_rclone_auth_mode'] || 'existing_remote').trim().toLowerCase();
      const remoteName = remote.includes(':') ? remote.split(':')[0]?.trim() : '';

      if (provider === 'google_drive' && remoteName) {
        tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'backup-rclone-'));
        const configPath = path.join(tempDir, 'rclone.conf');
        const configLines: string[] = [`[${remoteName}]`, 'type = drive', 'scope = drive'];

        if (authMode === 'oauth_connect') {
          const tokenPayload = String(runtimeSettings['backup_google_drive_oauth_tokens'] || '').trim();
          if (!tokenPayload) {
            return { success: false, error: 'Google Drive OAuth token is missing' };
          }
          let parsedToken: Record<string, unknown>;
          try {
            parsedToken = JSON.parse(tokenPayload) as Record<string, unknown>;
          } catch {
            return { success: false, error: 'Google Drive OAuth token is invalid. Reconnect Google Drive in Backup Settings.' };
          }
          const refreshToken = String(parsedToken['refresh_token'] || '').trim();
          const accessToken = String(parsedToken['access_token'] || '').trim();
          if (!refreshToken && !accessToken) {
            return { success: false, error: 'Google Drive OAuth token is incomplete. Reconnect Google Drive in Backup Settings.' };
          }
          if (!refreshToken) {
            return { success: false, error: 'Google Drive OAuth refresh token is missing. Reconnect Google Drive to enable off-site backups.' };
          }
          const clientId = String(runtimeSettings['backup_google_oauth_client_id'] || '').trim();
          const clientSecret = String(runtimeSettings['backup_google_oauth_client_secret'] || '').trim();
          if (clientId) configLines.push(`client_id = ${clientId}`);
          if (clientSecret) configLines.push(`client_secret = ${clientSecret}`);
          configLines.push(`token = ${JSON.stringify(parsedToken)}`);
        } else if (authMode === 'service_account') {
          const serviceAccountJson = String(runtimeSettings['backup_rclone_service_account_json'] || '').trim();
          if (!serviceAccountJson) {
            return { success: false, error: 'Google service account JSON is missing' };
          }
          const serviceAccountPath = path.join(tempDir, 'service-account.json');
          await fsp.writeFile(serviceAccountPath, serviceAccountJson, { encoding: 'utf-8', mode: 0o600 });
          await fsp.chmod(serviceAccountPath, 0o600);
          configLines.push(`service_account_file = ${serviceAccountPath}`);
        }

        const rootFolderId = String(runtimeSettings['backup_rclone_drive_root_folder_id'] || '').trim();
        const teamDrive = String(runtimeSettings['backup_rclone_drive_team_drive'] || '').trim();
        if (rootFolderId) configLines.push(`root_folder_id = ${rootFolderId}`);
        if (teamDrive) configLines.push(`team_drive = ${teamDrive}`);

        await fsp.writeFile(configPath, `${configLines.join('\n')}\n`, { encoding: 'utf-8', mode: 0o600 });
        await fsp.chmod(configPath, 0o600);
        args.push('--config', configPath);
      }

      await execFileAsync('rclone', args, { timeout: 120000 });
      return { success: true };
    } catch (error: unknown) {
      const err = error as { stderr?: string; stdout?: string; message?: string };
      const details = String(err?.stderr || err?.stdout || err?.message || 'Unknown error').trim();
      return { success: false, error: details || 'rclone upload failed' };
    } finally {
      if (tempDir) {
        await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  const configPath = path.resolve(process.cwd(), 'config/backup.config.sh');
  const absoluteFilePath = path.resolve(filepath);
  const remotePath = path.basename(filepath);
  const envMap: Record<string, string> = {
    REMOTE_BACKUP_ENABLED: String(runtimeSettings['backup_remote_enabled'] || 'false'),
    REMOTE_BACKUP_TYPE: String(runtimeSettings['backup_remote_type'] || ''),
    REMOTE_BACKUP_HOST: String(runtimeSettings['backup_remote_host'] || ''),
    REMOTE_BACKUP_PORT: String(runtimeSettings['backup_remote_port'] || ''),
    REMOTE_BACKUP_USER: String(runtimeSettings['backup_remote_user'] || ''),
    REMOTE_BACKUP_PATH: String(runtimeSettings['backup_remote_path'] || ''),
    RCLONE_REMOTE: String(runtimeSettings['backup_rclone_remote'] || ''),
    S3_BUCKET: String(runtimeSettings['backup_s3_bucket'] || ''),
    S3_REGION: String(runtimeSettings['backup_s3_region'] || ''),
    AWS_ACCESS_KEY_ID: String(runtimeSettings['backup_s3_access_key_id'] || ''),
    AWS_SECRET_ACCESS_KEY: String(runtimeSettings['backup_s3_secret_access_key'] || ''),
  };
  const exportLines = Object.entries(envMap)
    .map(([key, value]) => `export ${key}=${JSON.stringify(value)}`)
    .join('\n');
  const bashScript = [
    'set -euo pipefail',
    `source ${JSON.stringify(configPath)}`,
    exportLines,
    'if [[ "${REMOTE_BACKUP_ENABLED:-false}" != "true" ]]; then',
    '  echo "REMOTE_BACKUP_ENABLED is false" >&2',
    '  exit 2',
    'fi',
    `upload_to_remote ${JSON.stringify(absoluteFilePath)} ${JSON.stringify(remotePath)}`,
  ].join('\n');

  try {
    await execFileAsync('/bin/bash', ['-lc', bashScript], { timeout: 120000 });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    const details = String(err?.stderr || err?.stdout || err?.message || 'Unknown error').trim();
    return { success: false, error: details || 'Runtime remote upload failed' };
  }
};
