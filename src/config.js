import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(appRoot, '.env'), quiet: true });

const configuredDatabase = process.env.DATABASE_PATH || './data/tasks.sqlite3';

export const config = {
  host: process.env.HOST?.trim() || '127.0.0.1',
  port: Number.parseInt(process.env.PORT || '3030', 10),
  timezone: process.env.APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  desktopApp: process.env.GERIT_DESKTOP === '1',
  databasePath: path.isAbsolute(configuredDatabase)
    ? configuredDatabase
    : path.resolve(appRoot, configuredDatabase),
  ntfyTopic: process.env.NTFY_TOPIC?.trim() || '',
  ntfyServer: (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/$/, ''),
};
