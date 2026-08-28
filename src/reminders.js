import cron from 'node-cron';
import { config } from './config.js';
import { dueMeta, now, todayRange, digestDate } from './dates.js';
import {
  getAppPreference,
  getCustomReminders,
  getDueForReminder,
  getTodayTasks,
  markCustomReminded,
  markReminded,
  saveAppPreference,
} from './db.js';
import { taskStatusMeta } from './workflow.js';

const DAILY_DIGEST_KEY = 'notifications.dailyDigest';

export function startReminders({ publisher } = {}) {
  const activePublisher = resolvePublisher(publisher);
  if (!activePublisher) {
    console.log('ntfy hatırlatıcıları kapalı. Etkinleştirmek için .env dosyasına NTFY_TOPIC ekleyin.');
    return [];
  }

  const runDueCheck = () => {
    checkDueTasks(new Date(), activePublisher)
      .catch((error) => console.error('Hatırlatıcı kontrolü başarısız:', error.message));
  };
  const runDigest = (reference = now()) => {
    sendMorningDigestOnce(reference, activePublisher)
      .catch((error) => console.error('Günlük özet bildirimi başarısız:', error.message));
  };

  const tasks = [
    cron.schedule('* * * * *', runDueCheck, {
      timezone: config.timezone,
      noOverlap: true,
    }),
    cron.schedule('0 7 * * *', () => runDigest(now()), {
      timezone: config.timezone,
      noOverlap: true,
    }),
  ];

  runDueCheck();
  const startupReference = now();
  if (startupReference.hour >= 7) runDigest(startupReference);

  console.log(publisher ? 'Yerel masaüstü hatırlatıcıları etkin.' : 'ntfy hatırlatıcıları etkin.');
  return tasks;
}

export async function publishNotification(payload, publisher) {
  const activePublisher = resolvePublisher(publisher);
  if (!activePublisher) return false;
  const result = await activePublisher(payload);
  return result !== false;
}

export async function checkDueTasks(reference = new Date(), publisher) {
  const activePublisher = resolvePublisher(publisher);
  if (!activePublisher) return 0;
  const referenceIso = reference.toISOString();
  const customReminders = getCustomReminders(referenceIso);
  const customTaskIds = new Set(customReminders.map((task) => task.id));
  const dueTasks = getDueForReminder(referenceIso).filter((task) => !customTaskIds.has(task.id));
  let sent = 0;

  for (const task of customReminders) {
    const due = dueMeta(task.dueAt);
    const status = taskStatusMeta(task.status, task.completedAt);
    const suffix = [task.project ? `#${task.project}` : '', due.label].filter(Boolean).join(' · ');
    const details = [`${status.label} · %${task.progress}`, task.notes].filter(Boolean).join('\n');
    await deliverNotification({
      title: suffix ? `Gerit hatırlatması · ${suffix}` : 'Gerit hatırlatması',
      message: details ? `${task.title}\n${details}` : task.title,
      priority: task.priority === 1 ? '5' : task.priority === 2 ? '4' : '3',
      tags: 'bell,clipboard',
    }, activePublisher);
    markCustomReminded(task.id);
    if (task.dueAt && task.dueAt <= referenceIso) markReminded(task.id);
    sent += 1;
  }

  for (const task of dueTasks) {
    const due = dueMeta(task.dueAt);
    const status = taskStatusMeta(task.status, task.completedAt);
    const suffix = [task.project ? `#${task.project}` : '', due.label].filter(Boolean).join(' · ');
    const details = [`${status.label} · %${task.progress}`, task.notes].filter(Boolean).join('\n');
    await deliverNotification({
      title: suffix ? `İşin zamanı geldi · ${suffix}` : 'İşin zamanı geldi',
      message: details ? `${task.title}\n${details}` : task.title,
      priority: task.priority === 1 ? '5' : task.priority === 2 ? '4' : '3',
      tags: 'alarm_clock,white_check_mark',
    }, activePublisher);
    markReminded(task.id);
    sent += 1;
  }

  return sent;
}

export async function sendMorningDigestOnce(reference = now(), publisher) {
  const activePublisher = resolvePublisher(publisher);
  if (!activePublisher) return false;

  const currentDate = reference.toISODate();
  const sentDate = getAppPreference(DAILY_DIGEST_KEY, {})?.sentDate;
  if (sentDate === currentDate) return false;

  const sent = await sendMorningDigest(reference, activePublisher);
  if (sent) saveAppPreference(DAILY_DIGEST_KEY, { sentDate: currentDate });
  return sent;
}

export async function sendMorningDigest(reference = now(), publisher) {
  const activePublisher = resolvePublisher(publisher);
  if (!activePublisher) return false;
  const range = todayRange(reference);
  const tasks = getTodayTasks(range.start, range.end);
  const visibleTasks = tasks.slice(0, 25);
  const lines = visibleTasks.map((task) => {
    const due = dueMeta(task.dueAt, reference);
    const details = [due.overdue ? 'gecikmiş' : due.short, task.project ? `#${task.project}` : '']
      .filter(Boolean)
      .join(' · ');
    return `• ${task.title}${details ? ` - ${details}` : ''}`;
  });

  if (tasks.length > visibleTasks.length) lines.push(`...ve ${tasks.length - visibleTasks.length} iş daha`);
  if (!lines.length) lines.push('Bugün için planlanmış iş yok. Günün açık.');

  await deliverNotification({
    title: `Gerit · ${digestDate(reference)} · ${tasks.length} iş`,
    message: lines.join('\n'),
    priority: '3',
    tags: 'sunrise,clipboard',
  }, activePublisher);
  return true;
}

async function deliverNotification(payload, publisher) {
  const sent = await publishNotification(payload, publisher);
  if (!sent) throw new Error('Bildirim gönderilemedi.');
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

function resolvePublisher(publisher) {
  if (publisher) return publisher;
  return config.ntfyTopic ? publish : null;
}
