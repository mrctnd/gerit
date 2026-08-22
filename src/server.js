import { createApp } from './app.js';
import { config } from './config.js';
import { startReminders } from './reminders.js';

const app = createApp();
const server = app.listen(config.port, config.host, () => {
  console.log(`TodoSlate hazır: http://${config.host}:${config.port}`);
  console.log(`Veritabanı: ${config.databasePath}`);
});

const scheduledJobs = startReminders();

function shutdown() {
  for (const job of scheduledJobs) job.stop();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
