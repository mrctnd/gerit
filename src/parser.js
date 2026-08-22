import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';
import { config } from './config.js';
import { fromJsDate } from './dates.js';
import { nextOccurrence, parseRecurrence } from './recurrence.js';

const turkishWeekdays = {
  pazartesi: 1,
  salı: 2,
  sali: 2,
  çarşamba: 3,
  carsamba: 3,
  perşembe: 4,
  persembe: 4,
  cuma: 5,
  cumartesi: 6,
  pazar: 7,
};

export function parseQuickAdd(raw, referenceDate = new Date()) {
  const original = String(raw || '').trim();
  let working = original;

  const projectMatch = working.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u);
  const project = projectMatch?.[1] || null;
  if (projectMatch) working = working.replace(projectMatch[0], ' ');

  const priorityMatch = working.match(/(?:^|\s)p([1-3])(?=\s|$)/i);
  const priority = priorityMatch ? Number(priorityMatch[1]) : null;
  if (priorityMatch) working = working.replace(priorityMatch[0], ' ');

  const recurrence = parseRecurrence(working);
  if (recurrence.match) working = working.replace(recurrence.match, ' ');

  const turkishDate = parseTurkishDate(working, referenceDate);
  const dateResult = turkishDate || chrono.casual.parse(working, referenceDate, { forwardDate: true })[0];
  let dueDate = dateResult
    ? (dateResult.date instanceof Date ? dateResult.date : dateResult.start.date())
    : null;
  if (dateResult) {
    working = `${working.slice(0, dateResult.index)} ${working.slice(dateResult.index + dateResult.text.length)}`;
  }

  if (recurrence.rrule) {
    dueDate = dueDate
      ? nextOccurrence(recurrence.rrule, dueDate, true)
      : nextOccurrence(recurrence.rrule, referenceDate);
  }

  const title = working.replace(/\s+/g, ' ').trim();

  return {
    title: title || original,
    project,
    priority,
    dueAt: fromJsDate(dueDate),
    recurrence: recurrence.rrule,
  };
}

function parseTurkishDate(source, referenceDate) {
  const reference = DateTime.fromJSDate(referenceDate).setZone(config.timezone).setLocale('tr-TR');
  const timePart = '(?:\\s+(?:saat\\s*)?([01]?\\d|2[0-3])(?:(?::|\\.)([0-5]\\d))?)?';

  const explicit = source.match(new RegExp(
    `(?:^|\\s)(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{4}))?${timePart}(?=\\s|$)`,
    'iu',
  ));
  if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]);
    const year = explicit[3] ? Number(explicit[3]) : reference.year;
    const hour = explicit[4] === undefined ? 12 : Number(explicit[4]);
    const minute = explicit[5] === undefined ? 0 : Number(explicit[5]);
    let date = DateTime.fromObject({ year, month, day, hour, minute }, { zone: config.timezone });
    if (!explicit[3] && date.isValid && date < reference.startOf('day')) date = date.plus({ years: 1 });
    if (date.isValid) return asDateMatch(explicit, date);
  }

  const relative = source.match(new RegExp(
    `(?:^|\\s)(yarından\\s+sonra|öbür\\s+gün|bugün|yarın)${timePart}(?=\\s|$)`,
    'iu',
  ));
  if (relative) {
    const phrase = relative[1].toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
    const days = phrase === 'bugün' ? 0 : phrase === 'yarın' ? 1 : 2;
    const hour = relative[2] === undefined ? 12 : Number(relative[2]);
    const minute = relative[3] === undefined ? 0 : Number(relative[3]);
    const date = reference.startOf('day').plus({ days }).set({ hour, minute });
    return asDateMatch(relative, date);
  }

  const weekday = source.match(new RegExp(
    `(?:^|\\s)(?:gelecek\\s+)?(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)${timePart}(?=\\s|$)`,
    'iu',
  ));
  if (weekday) {
    const targetWeekday = turkishWeekdays[weekday[1].toLocaleLowerCase('tr-TR')];
    const hour = weekday[2] === undefined ? 12 : Number(weekday[2]);
    const minute = weekday[3] === undefined ? 0 : Number(weekday[3]);
    let daysAhead = (targetWeekday - reference.weekday + 7) % 7;
    let date = reference.startOf('day').plus({ days: daysAhead }).set({ hour, minute });
    if (daysAhead === 0 && date <= reference) date = date.plus({ days: 7 });
    return asDateMatch(weekday, date);
  }

  return null;
}

function asDateMatch(match, date) {
  return {
    date: date.toJSDate(),
    index: match.index,
    text: match[0],
  };
}
