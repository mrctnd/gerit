import cron from 'node-cron';
import { DateTime } from 'luxon';
import { config } from './config.js';
import { dueMeta, now, todayRange, digestDate } from './dates.js';
import {
  getAppPreference,
  getCustomReminders,
  getDuePresalesReminders,
  getDueForReminder,
  getNotificationPreferences,
  getPresalesAttentionItems,
  getPresalesDashboardSummary,
  getTodayTasks,
  markCustomReminded,
  markPresalesReminded,
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
    cron.schedule('0 * * * *', () => runDigest(now()), {
      timezone: config.timezone,
      noOverlap: true,
    }),
  ];

  runDueCheck();
  const startupReference = now();
  runDigest(startupReference);

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
  const preferences = getNotificationPreferences();
  if (isQuietHour(reference, preferences)) return 0;
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
      route: `/tasks/${task.id}/edit`,
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
      route: `/tasks/${task.id}/edit`,
    }, activePublisher);
    markReminded(task.id);
    sent += 1;
  }

  const presalesReminders = getDuePresalesReminders(referenceIso);
  for (const item of presalesReminders) {
    const due = dueMeta(item.dueAt);
    const suffix = [item.referenceNo, due.label].filter(Boolean).join(' · ');
    const details = [item.customer, item.caseTitle, item.action].filter(Boolean).join('\n');
    await deliverNotification({
      title: suffix ? `Presales hatırlatması · ${suffix}` : 'Presales hatırlatması',
      message: details ? `${item.title}\n${details}` : item.title,
      priority: '4',
      tags: 'briefcase,bell',
      route: item.route,
    }, activePublisher);
    markPresalesReminded(item.kind, item.id);
    sent += 1;
  }

  return sent;
}

export async function sendMorningDigestOnce(reference = now(), publisher) {
  const activePublisher = resolvePublisher(publisher);
  if (!activePublisher) return false;

  const preferences = getNotificationPreferences();
  if (!preferences.dailyDigest || reference.hour < preferences.digestHour
    || isQuietHour(reference.toJSDate(), preferences)) return false;

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

  const preferences = getNotificationPreferences();
  let presalesTitle = '';
  if (preferences.includePresales) {
    const referenceIso = reference.toUTC().toISO();
    const horizonIso = reference.plus({ days: 7 }).toUTC().toISO();
    const summary = getPresalesDashboardSummary(referenceIso, horizonIso);
    const attention = getPresalesAttentionItems(referenceIso, horizonIso);
    const critical = attention.filter((item) => item.severity === 'critical').length;
    lines.push('');
    lines.push(`Presales: ${summary.active} aktif · ${summary.dueSoon} yakın termin · ${summary.overdueActions} geciken aksiyon`);
    if (critical) lines.push(`${critical} kritik konu Aksiyon ve Uyarı Merkezi'nde bekliyor.`);
    presalesTitle = ` · ${critical} kritik`;
  }

  await deliverNotification({
    title: `Gerit · ${digestDate(reference)} · ${tasks.length} iş${presalesTitle}`,
    message: lines.join('\n'),
    priority: '3',
    tags: 'sunrise,clipboard',
    route: '/presales/attention',
  }, activePublisher);
  return true;
}

export function isQuietHour(reference, preferences = getNotificationPreferences()) {
  if (!preferences.quietHoursEnabled) return false;
  const referenceDate = reference instanceof Date ? reference : reference?.toJSDate?.() || new Date();
  const hour = DateTime.fromJSDate(referenceDate).setZone(config.timezone).hour;
  const { quietStart: start, quietEnd: end } = preferences;
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
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
