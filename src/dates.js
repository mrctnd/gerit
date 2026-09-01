import { DateTime } from 'luxon';
import { config } from './config.js';

export function now() {
  return DateTime.now().setZone(config.timezone).setLocale('tr-TR');
}

export function todayRange(reference = now()) {
  const start = reference.startOf('day');
  return {
    start: start.toUTC().toISO(),
    end: start.plus({ days: 1 }).toUTC().toISO(),
  };
}

export function upcomingRange(reference = now()) {
  const start = reference.startOf('day');
  return {
    start: start.toUTC().toISO(),
    end: start.plus({ days: 7 }).toUTC().toISO(),
  };
}

export function calendarMonth(value, reference = now()) {
  const requested = String(value || '');
  let month = /^\d{4}-\d{2}$/.test(requested)
    ? DateTime.fromFormat(requested, 'yyyy-LL', { zone: config.timezone, locale: 'tr-TR' })
    : reference;
  if (!month.isValid || (requested && month.toFormat('yyyy-LL') !== requested)) month = reference;

  const monthStart = month.startOf('month');
  const monthEnd = month.endOf('month');
  const gridStart = monthStart.startOf('week');
  const gridEnd = monthEnd.endOf('week').plus({ milliseconds: 1 });
  const days = [];

  for (let cursor = gridStart; cursor < gridEnd; cursor = cursor.plus({ days: 1 })) {
    days.push({
      dateKey: cursor.toISODate(),
      dayNumber: cursor.day,
      inMonth: cursor.hasSame(monthStart, 'month'),
      isToday: cursor.hasSame(reference, 'day'),
      isWeekend: cursor.weekday > 5,
      ariaLabel: cursor.setLocale('tr-TR').toFormat('d LLLL cccc'),
    });
  }

  return {
    key: monthStart.toFormat('yyyy-LL'),
    title: monthStart.setLocale('tr-TR').toFormat('LLLL yyyy'),
    previousKey: monthStart.minus({ months: 1 }).toFormat('yyyy-LL'),
    nextKey: monthStart.plus({ months: 1 }).toFormat('yyyy-LL'),
    start: gridStart.toUTC().toISO(),
    end: gridEnd.toUTC().toISO(),
    days,
  };
}

export function toUtcIso(value) {
  if (!value) return null;
  const parsed = DateTime.fromISO(value, { zone: config.timezone });
  return parsed.isValid ? parsed.toUTC().toISO() : null;
}

export function fromJsDate(value) {
  if (!value) return null;
  return DateTime.fromJSDate(value).toUTC().toISO();
}

export function toDateTimeInput(value) {
  if (!value) return '';
  return DateTime.fromISO(value, { zone: 'utc' })
    .setZone(config.timezone)
    .toFormat("yyyy-LL-dd'T'HH:mm");
}

export function dueMeta(value, reference = now()) {
  if (!value) return { label: '', short: '', dateKey: '', overdue: false, isToday: false };

  const due = DateTime.fromISO(value, { zone: 'utc' }).setZone(config.timezone);
  const start = reference.startOf('day');
  const hasTime = !(due.hour === 12 && due.minute === 0);
  const isToday = due.hasSame(reference, 'day');
  const overdue = hasTime ? due < reference : due < start;

  due.setLocale('tr-TR');
  let label = due.setLocale('tr-TR').toFormat('ccc, d LLL');
  if (isToday) label = 'Bugün';
  else if (due.hasSame(start.plus({ days: 1 }), 'day')) label = 'Yarın';

  if (hasTime) label += ` · ${due.toFormat('HH:mm')}`;

  return {
    label,
    short: hasTime ? due.toFormat('HH:mm') : '',
    dateKey: due.toISODate(),
    overdue,
    isToday,
  };
}

export function dayHeading(isoDate, reference = now()) {
  const date = DateTime.fromISO(isoDate, { zone: config.timezone }).setLocale('tr-TR');
  if (date.hasSame(reference, 'day')) return 'Bugün';
  if (date.hasSame(reference.plus({ days: 1 }), 'day')) return 'Yarın';
  return date.toFormat('d LLLL cccc');
}

export function digestDate(reference = now()) {
  return reference.setLocale('tr-TR').toFormat('d LLLL cccc');
}

export function completedLabel(value, reference = now()) {
  if (!value) return '';
  const date = DateTime.fromISO(value, { zone: 'utc' }).setZone(config.timezone).setLocale('tr-TR');
  if (date.hasSame(reference, 'day')) return `Bugün · ${date.toFormat('HH:mm')}`;
  if (date.hasSame(reference.minus({ days: 1 }), 'day')) return `Dün · ${date.toFormat('HH:mm')}`;
  return date.toFormat('d LLL yyyy · HH:mm');
}

export function activityLabel(value, reference = now()) {
  if (!value) return '';
  const date = DateTime.fromISO(value, { zone: 'utc' }).setZone(config.timezone).setLocale('tr-TR');
  if (date.hasSame(reference, 'day')) return `Bugün ${date.toFormat('HH:mm')}`;
  if (date.hasSame(reference.minus({ days: 1 }), 'day')) return `Dün ${date.toFormat('HH:mm')}`;
  return date.toFormat('d LLL yyyy · HH:mm');
}
