import cron from 'node-cron';
import { config } from './config.js';
import { dueMeta, now, todayRange, digestDate } from './dates.js';
import { getDueForReminder, getTodayTasks, markReminded } from './db.js';

export function startReminders() {
  if (!config.ntfyTopic) {
    console.log('ntfy hatırlatıcıları kapalı. Etkinleştirmek için .env dosyasına NTFY_TOPIC ekleyin.');
    return [];
  }

  const tasks = [
    cron.schedule('* * * * *', checkDueTasks, {
      timezone: config.timezone,
      noOverlap: true,
    }),
    cron.schedule('0 7 * * *', sendMorningDigest, {
      timezone: config.timezone,
      noOverlap: true,
    }),
  ];

  checkDueTasks().catch((error) => console.error('İlk hatırlatıcı kontrolü başarısız:', error.message));
  console.log('ntfy hatırlatıcıları etkin.');
  return tasks;
}

export async function checkDueTasks(reference = new Date()) {
  if (!config.ntfyTopic) return 0;
  const tasks = getDueForReminder(reference.toISOString());
  let sent = 0;

  for (const task of tasks) {
    const due = dueMeta(task.dueAt);
    const suffix = [task.project ? `#${task.project}` : '', due.label].filter(Boolean).join(' · ');
    await publish({
      title: suffix ? `İşin zamanı geldi · ${suffix}` : 'İşin zamanı geldi',
      message: task.notes ? `${task.title}\n${task.notes}` : task.title,
      priority: task.priority === 1 ? '5' : task.priority === 2 ? '4' : '3',
      tags: 'alarm_clock,white_check_mark',
    });
    markReminded(task.id);
    sent += 1;
  }

  return sent;
}

export async function sendMorningDigest(reference = now()) {
  if (!config.ntfyTopic) return false;
  const range = todayRange(reference);
  const tasks = getTodayTasks(range.start, range.end);
  const visibleTasks = tasks.slice(0, 25);
  const lines = visibleTasks.map((task) => {
    const due = dueMeta(task.dueAt, reference);
    const details = [due.overdue ? 'gecikmiş' : due.short, task.project ? `#${task.project}` : '']
      .filter(Boolean)
      .join(' · ');
    return `• ${task.title}${details ? ` — ${details}` : ''}`;
  });

  if (tasks.length > visibleTasks.length) lines.push(`…ve ${tasks.length - visibleTasks.length} iş daha`);
  if (!lines.length) lines.push('Bugün için planlanmış iş yok. Günün açık.');

  await publish({
    title: `TodoSlate · ${digestDate(reference)} · ${tasks.length} iş`,
    message: lines.join('\n'),
    priority: '3',
    tags: 'sunrise,clipboard',
  });
  return true;
}

async function publish({ title, message, priority, tags }) {
  const response = await fetch(config.ntfyServer, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      topic: config.ntfyTopic,
      title,
      message,
      priority: Number(priority),
      tags: tags.split(','),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`ntfy ${response.status} durum kodu döndürdü`);
  }
}
