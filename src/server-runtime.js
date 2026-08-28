import { createApp } from './app.js';
import { config } from './config.js';
import { startReminders } from './reminders.js';

export async function startGeritServer({
  host = config.host,
  port = config.port,
  reminders = true,
  reminderPublisher,
  log = true,
} = {}) {
  const webApp = createApp({ notificationPublisher: reminderPublisher });
  const server = await listen(webApp, port, host);
  const address = server.address();

  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Gerit yerel sunucu adresini belirleyemedi.');
  }

  const url = `http://${host}:${address.port}`;
  const scheduledJobs = reminders
    ? startReminders({ publisher: reminderPublisher })
    : [];

  if (log) {
    console.log(`Gerit hazır: ${url}`);
    console.log(`Veritabanı: ${config.databasePath}`);
  }

  let closed = false;
  return {
    app: webApp,
    server,
    host,
    port: address.port,
    url,
    databasePath: config.databasePath,
    async close() {
      if (closed) return;
      closed = true;
      for (const job of scheduledJobs) job.stop();
      await closeServer(server);
    },
  };
}

function listen(webApp, port, host) {
  return new Promise((resolve, reject) => {
    const server = webApp.listen(port, host, () => {
      server.off('error', reject);
      resolve(server);
    });
    server.once('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
