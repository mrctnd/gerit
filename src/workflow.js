export const TASK_STATUSES = Object.freeze([
  { value: 'planned', label: 'Yapılacak', shortLabel: 'Yapılacak', tone: 'planned' },
  { value: 'in_progress', label: 'Devam ediyor', shortLabel: 'Devam ediyor', tone: 'active' },
  { value: 'waiting', label: 'Beklemede', shortLabel: 'Beklemede', tone: 'waiting' },
  { value: 'blocked', label: 'Engellendi', shortLabel: 'Engellendi', tone: 'blocked' },
]);

const statusValues = new Set(TASK_STATUSES.map((status) => status.value));

export function normalizeTaskStatus(value, completed = false) {
  if (completed) return 'completed';
  return statusValues.has(value) ? value : 'planned';
}

export function normalizeProgress(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function taskStatusMeta(value, completedAt = null) {
  if (completedAt || value === 'completed') {
    return { value: 'completed', label: 'Tamamlandı', shortLabel: 'Tamamlandı', tone: 'completed' };
  }
  return TASK_STATUSES.find((status) => status.value === value) || TASK_STATUSES[0];
}
