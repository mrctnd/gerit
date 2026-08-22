import rrulePackage from 'rrule';

const { RRule } = rrulePackage;

const weekdayCodes = {
  mon: 'MO', monday: 'MO',
  tue: 'TU', tues: 'TU', tuesday: 'TU',
  wed: 'WE', wednesday: 'WE',
  thu: 'TH', thur: 'TH', thurs: 'TH', thursday: 'TH',
  fri: 'FR', friday: 'FR',
  sat: 'SA', saturday: 'SA',
  sun: 'SU', sunday: 'SU',
  pazartesi: 'MO',
  salı: 'TU', sali: 'TU',
  çarşamba: 'WE', carsamba: 'WE',
  perşembe: 'TH', persembe: 'TH',
  cuma: 'FR',
  cumartesi: 'SA',
  pazar: 'SU',
};

function normalizeRRule(value) {
  const trimmed = value.trim().toUpperCase();
  return trimmed.startsWith('RRULE:') ? trimmed : `RRULE:${trimmed}`;
}

export function parseRecurrence(input) {
  if (!input?.trim()) return { rrule: null, text: '', match: null };
  const source = input.trim();

  if (/^(?:RRULE:)?FREQ=/i.test(source)) {
    try {
      const normalized = normalizeRRule(source);
      RRule.parseString(normalized.replace(/^RRULE:/i, ''));
      return { rrule: normalized, text: describeRecurrence(normalized), match: source };
    } catch {
      return { rrule: null, text: '', match: null };
    }
  }

  const patterns = [
    {
      regex: /(?:^|\s)her\s+(?:iş|is)\s+günü(?=\s|$)/iu,
      rule: () => 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      text: 'Her iş günü',
    },
    {
      regex: /(?:^|\s)(?:her\s+gün|günlük)(?=\s|$)/iu,
      rule: () => 'RRULE:FREQ=DAILY',
      text: 'Her gün',
    },
    {
      regex: /(?:^|\s)(?:her\s+hafta|haftalık)(?=\s|$)/iu,
      rule: () => 'RRULE:FREQ=WEEKLY',
      text: 'Her hafta',
    },
    {
      regex: /(?:^|\s)(?:her\s+ay|aylık)(?=\s|$)/iu,
      rule: () => 'RRULE:FREQ=MONTHLY',
      text: 'Her ay',
    },
    {
      regex: /(?:^|\s)(?:her\s+yıl|her\s+yil|yıllık|yillik)(?=\s|$)/iu,
      rule: () => 'RRULE:FREQ=YEARLY',
      text: 'Her yıl',
    },
    {
      regex: /(?:^|\s)her\s+ayın\s+(\d{1,2})(?:\s*['’]?(?:i|ı|u|ü)|\.)?(?:\s*günü)?(?=\s|$)/iu,
      rule: (match) => {
        const day = Number(match[1]);
        return day >= 1 && day <= 31 ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}` : null;
      },
      text: (match) => `Her ayın ${Number(match[1])}. günü`,
    },
    {
      regex: /(?:^|\s)her\s+((?:(?:pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)(?:\s*,\s*|\s+ve\s+)?)+)(?=\s|$)/iu,
      rule: (match) => {
        const days = parseDayList(match[1]);
        return days.length ? `RRULE:FREQ=WEEKLY;BYDAY=${[...new Set(days)].join(',')}` : null;
      },
      text: (match) => `Her ${parseDayList(match[1]).map(shortDay).join(', ')}`,
    },
    {
      regex: /\bevery\s+(weekday|weekdays)\b/i,
      rule: () => 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      text: 'Her iş günü',
    },
    {
      regex: /\b(?:every\s+day|daily)\b/i,
      rule: () => 'RRULE:FREQ=DAILY',
      text: 'Her gün',
    },
    {
      regex: /\b(?:every\s+week|weekly)\b/i,
      rule: () => 'RRULE:FREQ=WEEKLY',
      text: 'Her hafta',
    },
    {
      regex: /\b(?:every\s+month|monthly)\b/i,
      rule: () => 'RRULE:FREQ=MONTHLY',
      text: 'Her ay',
    },
    {
      regex: /\b(?:every\s+year|yearly|annually)\b/i,
      rule: () => 'RRULE:FREQ=YEARLY',
      text: 'Her yıl',
    },
    {
      regex: /\bevery\s+(\d{1,2})(?:st|nd|rd|th)\b/i,
      rule: (match) => {
        const day = Number(match[1]);
        return day >= 1 && day <= 31 ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}` : null;
      },
      text: (match) => `Her ayın ${Number(match[1])}. günü`,
    },
    {
      regex: /\bevery\s+((?:(?:mon(?:day)?|tue(?:s|sday|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|ursday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)(?:\s*,\s*|\s+and\s+)?)+)\b/i,
      rule: (match) => {
        const days = match[1]
          .split(/\s*,\s*|\s+and\s+/)
          .map((day) => weekdayCodes[day.toLowerCase()])
          .filter(Boolean);
        return days.length ? `RRULE:FREQ=WEEKLY;BYDAY=${[...new Set(days)].join(',')}` : null;
      },
      text: (match) => {
        const days = match[1]
          .split(/\s*,\s*|\s+and\s+/)
          .map((day) => weekdayCodes[day.toLowerCase()])
          .filter(Boolean);
        return `Her ${days.map(shortDay).join(', ')}`;
      },
    },
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern.regex);
    if (!match) continue;
    const rrule = pattern.rule(match);
    if (!rrule) continue;
    return {
      rrule,
      text: typeof pattern.text === 'function' ? pattern.text(match) : pattern.text,
      match: match[0],
    };
  }

  return { rrule: null, text: '', match: null };
}

export function nextOccurrence(rule, anchor = new Date(), inclusive = false) {
  if (!rule) return null;
  const options = RRule.parseString(rule.replace(/^RRULE:/i, ''));
  const recurrence = new RRule({ ...options, dtstart: anchor });
  return recurrence.after(anchor, inclusive);
}

export function describeRecurrence(rule) {
  if (!rule) return '';
  const normalized = rule.replace(/^RRULE:/i, '').toUpperCase();
  if (normalized === 'FREQ=DAILY') return 'Her gün';
  if (normalized === 'FREQ=WEEKLY') return 'Her hafta';
  if (normalized === 'FREQ=MONTHLY') return 'Her ay';
  if (normalized === 'FREQ=YEARLY') return 'Her yıl';

  const monthly = normalized.match(/FREQ=MONTHLY;BYMONTHDAY=(\d{1,2})/);
  if (monthly) return `Her ayın ${Number(monthly[1])}. günü`;

  const weekly = normalized.match(/FREQ=WEEKLY;BYDAY=([A-Z,]+)/);
  if (weekly) return `Her ${weekly[1].split(',').map(shortDay).join(', ')}`;

  return 'Tekrarlanıyor';
}

function shortDay(code) {
  return ({ MO: 'Pzt', TU: 'Sal', WE: 'Çar', TH: 'Per', FR: 'Cum', SA: 'Cmt', SU: 'Paz' })[code] || code;
}

function parseDayList(value) {
  return value
    .split(/\s*,\s*|\s+ve\s+/iu)
    .map((day) => weekdayCodes[day.toLocaleLowerCase('tr-TR')])
    .filter(Boolean);
}
