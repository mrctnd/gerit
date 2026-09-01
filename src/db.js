import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { nextOccurrence } from './recurrence.js';
import {
  clampInteger,
  QUALIFICATION_DIMENSIONS,
  QUALIFICATION_STATUSES,
  normalizeCurrency,
  normalizeComplianceStatus,
  normalizeConfidence,
  normalizeOfferability,
  normalizeOpportunityType,
  normalizePresalesActionStatus,
  normalizePresalesPriority,
  normalizePresalesRecordType,
  normalizePresalesStage,
  normalizeQualificationStatus,
  normalizeResponseMode,
  normalizeStakeholderInfluence,
  normalizeStakeholderRole,
  normalizeStakeholderStance,
} from './presales.js';
import { normalizeProgress, normalizeTaskStatus } from './workflow.js';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    project TEXT,
    priority INTEGER CHECK (priority IS NULL OR priority BETWEEN 1 AND 3),
    due_at TEXT,
    recurrence TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    progress INTEGER NOT NULL DEFAULT 0,
    reminder_at TEXT,
    reminder_sent_at TEXT,
    reminded_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_open_due
  ON tasks(due_at)
  WHERE completed_at IS NULL;

  CREATE INDEX IF NOT EXISTS idx_tasks_open_project
  ON tasks(project)
  WHERE completed_at IS NULL;

  CREATE TABLE IF NOT EXISTS presales_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    customer TEXT NOT NULL DEFAULT '',
    tender_reference TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'intake',
    offerability TEXT NOT NULL DEFAULT 'unassessed',
    owner TEXT NOT NULL DEFAULT '',
    manufacturer TEXT NOT NULL DEFAULT '',
    product_family TEXT NOT NULL DEFAULT '',
    proposed_model TEXT NOT NULL DEFAULT '',
    competitors TEXT NOT NULL DEFAULT '',
    deadline TEXT,
    reminder_at TEXT,
    reminder_sent_at TEXT,
    next_action TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_presales_cases_deadline
  ON presales_cases(deadline);

  CREATE INDEX IF NOT EXISTS idx_presales_cases_reminder
  ON presales_cases(reminder_at)
  WHERE reminder_at IS NOT NULL AND reminder_sent_at IS NULL;
`);

ensureColumn('tasks', 'status', "TEXT NOT NULL DEFAULT 'planned'");
ensureColumn('tasks', 'progress', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('tasks', 'reminder_at', 'TEXT');
ensureColumn('tasks', 'reminder_sent_at', 'TEXT');
ensureColumn('presales_cases', 'opportunity_type', "TEXT NOT NULL DEFAULT 'tender'");
ensureColumn('presales_cases', 'priority', "TEXT NOT NULL DEFAULT 'normal'");
ensureColumn('presales_cases', 'currency', "TEXT NOT NULL DEFAULT 'TRY'");
ensureColumn('presales_cases', 'estimated_value', 'REAL');
ensureColumn('presales_cases', 'estimated_cost', 'REAL');
ensureColumn('presales_cases', 'win_probability', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('presales_cases', 'internal_deadline', 'TEXT');

db.exec(`
  CREATE TABLE IF NOT EXISTS task_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_task_notes_task_created
  ON task_notes(task_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_tasks_custom_reminder
  ON tasks(reminder_at)
  WHERE completed_at IS NULL AND reminder_sent_at IS NULL;

  CREATE TABLE IF NOT EXISTS presales_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES presales_cases(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL DEFAULT 'requirement',
    reference_no TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    original_text TEXT NOT NULL DEFAULT '',
    requirement TEXT NOT NULL DEFAULT '',
    offered_item TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    quantity TEXT NOT NULL DEFAULT '',
    compliance_status TEXT NOT NULL DEFAULT 'unreviewed',
    capability_evidence TEXT NOT NULL DEFAULT '',
    inclusion_evidence TEXT NOT NULL DEFAULT '',
    compatibility_evidence TEXT NOT NULL DEFAULT '',
    entitlement_evidence TEXT NOT NULL DEFAULT '',
    source_ref TEXT NOT NULL DEFAULT '',
    response_mode TEXT NOT NULL DEFAULT 'none',
    response_text TEXT NOT NULL DEFAULT '',
    proposed_text TEXT NOT NULL DEFAULT '',
    cost_impact TEXT NOT NULL DEFAULT '',
    responsibility TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    owner TEXT NOT NULL DEFAULT '',
    due_at TEXT,
    reminder_at TEXT,
    reminder_sent_at TEXT,
    confidence TEXT NOT NULL DEFAULT 'medium',
    risk_probability INTEGER NOT NULL DEFAULT 1,
    risk_impact INTEGER NOT NULL DEFAULT 1,
    evidence_gap INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_presales_records_case
  ON presales_records(case_id, record_type, reference_no);

  CREATE INDEX IF NOT EXISTS idx_presales_records_status
  ON presales_records(compliance_status);

  CREATE INDEX IF NOT EXISTS idx_presales_records_reminder
  ON presales_records(reminder_at)
  WHERE reminder_at IS NOT NULL AND reminder_sent_at IS NULL;

  CREATE TABLE IF NOT EXISTS presales_case_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES presales_cases(id) ON DELETE CASCADE,
    manufacturer TEXT NOT NULL DEFAULT '',
    product_family TEXT NOT NULL DEFAULT '',
    proposed_model TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_presales_case_products_case
  ON presales_case_products(case_id, position, id);

  CREATE TABLE IF NOT EXISTS presales_qualification_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES presales_cases(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    UNIQUE(case_id, dimension)
  );

  CREATE INDEX IF NOT EXISTS idx_presales_qualification_case
  ON presales_qualification_items(case_id, dimension);

  CREATE TABLE IF NOT EXISTS presales_stakeholders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES presales_cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    organization TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'other',
    influence TEXT NOT NULL DEFAULT 'medium',
    stance TEXT NOT NULL DEFAULT 'unknown',
    contact TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_presales_stakeholders_case
  ON presales_stakeholders(case_id, role, influence);

  CREATE TABLE IF NOT EXISTS presales_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES presales_cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    priority INTEGER NOT NULL DEFAULT 2,
    due_at TEXT,
    reminder_at TEXT,
    reminder_sent_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_presales_actions_case
  ON presales_actions(case_id, status, due_at);

  CREATE INDEX IF NOT EXISTS idx_presales_actions_reminder
  ON presales_actions(reminder_at)
  WHERE status <> 'done' AND reminder_at IS NOT NULL AND reminder_sent_at IS NULL;

  INSERT INTO presales_case_products (
    case_id, manufacturer, product_family, proposed_model, position, created_at
  )
  SELECT id, manufacturer, product_family, proposed_model, 0, created_at
  FROM presales_cases AS legacy_case
  WHERE (manufacturer <> '' OR product_family <> '' OR proposed_model <> '')
    AND NOT EXISTS (
      SELECT 1 FROM presales_case_products product
      WHERE product.case_id = legacy_case.id
    );

  UPDATE tasks
  SET status = 'completed', progress = 100
  WHERE completed_at IS NOT NULL AND (status <> 'completed' OR progress <> 100);
`);
db.exec('PRAGMA optimize;');

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

const selectColumns = `
  id, title, notes, project, priority, due_at AS dueAt,
  recurrence, status, progress, reminder_at AS reminderAt,
  reminder_sent_at AS reminderSentAt, reminded_at AS remindedAt, completed_at AS completedAt,
  created_at AS createdAt, updated_at AS updatedAt
`;

const presalesCaseColumns = `
  id, title, customer, tender_reference AS tenderReference, stage, offerability,
  owner, manufacturer, product_family AS productFamily, proposed_model AS proposedModel,
  competitors, deadline, reminder_at AS reminderAt, reminder_sent_at AS reminderSentAt,
  opportunity_type AS opportunityType, priority, currency,
  estimated_value AS estimatedValue, estimated_cost AS estimatedCost,
  win_probability AS winProbability, internal_deadline AS internalDeadline,
  next_action AS nextAction, notes, created_at AS createdAt, updated_at AS updatedAt
`;

const presalesRecordColumns = `
  id, case_id AS caseId, record_type AS recordType, reference_no AS referenceNo,
  title, original_text AS originalText, requirement, offered_item AS offeredItem,
  sku, quantity, compliance_status AS complianceStatus,
  capability_evidence AS capabilityEvidence, inclusion_evidence AS inclusionEvidence,
  compatibility_evidence AS compatibilityEvidence, entitlement_evidence AS entitlementEvidence,
  source_ref AS sourceRef, response_mode AS responseMode, response_text AS responseText,
  proposed_text AS proposedText, cost_impact AS costImpact, responsibility, action, owner,
  due_at AS dueAt, reminder_at AS reminderAt, reminder_sent_at AS reminderSentAt,
  confidence, risk_probability AS riskProbability, risk_impact AS riskImpact,
  evidence_gap AS evidenceGap, notes, created_at AS createdAt, updated_at AS updatedAt
`;

const presalesActionColumns = `
  id, case_id AS caseId, title, owner, status, priority, due_at AS dueAt,
  reminder_at AS reminderAt, reminder_sent_at AS reminderSentAt, notes,
  completed_at AS completedAt, created_at AS createdAt, updated_at AS updatedAt
`;

export const APPEARANCE_DEFAULTS = Object.freeze({
  theme: 'atlas',
  font: 'modern',
  motion: 'system',
  scale: 100,
});

const APPEARANCE_ALLOWED = {
  theme: new Set(['atlas', 'forest', 'violet', 'ember']),
  font: new Set(['modern', 'humanist', 'editorial', 'mono']),
  motion: new Set(['system', 'full', 'reduced']),
};

function normalizeAppearanceScale(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return APPEARANCE_DEFAULTS.scale;
  return Math.min(160, Math.max(80, Math.round(parsed / 5) * 5));
}

function normalizeAppearancePreferences(preferences = {}) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};
  return {
    theme: APPEARANCE_ALLOWED.theme.has(source.theme) ? source.theme : APPEARANCE_DEFAULTS.theme,
    font: APPEARANCE_ALLOWED.font.has(source.font) ? source.font : APPEARANCE_DEFAULTS.font,
    motion: APPEARANCE_ALLOWED.motion.has(source.motion) ? source.motion : APPEARANCE_DEFAULTS.motion,
    scale: normalizeAppearanceScale(source.scale),
  };
}

export function getAppearancePreferences() {
  return normalizeAppearancePreferences(getAppPreference('appearance', APPEARANCE_DEFAULTS));
}

export function saveAppearancePreferences(preferences) {
  const normalized = normalizeAppearancePreferences(preferences);
  saveAppPreference('appearance', normalized);
  return normalized;
}

export const NOTIFICATION_DEFAULTS = Object.freeze({
  dailyDigest: true,
  digestHour: 7,
  includePresales: true,
  quietHoursEnabled: false,
  quietStart: 22,
  quietEnd: 7,
});

export function getNotificationPreferences() {
  return normalizeNotificationPreferences(getAppPreference('notifications.settings', NOTIFICATION_DEFAULTS));
}

export function saveNotificationPreferences(preferences) {
  const normalized = normalizeNotificationPreferences(preferences);
  saveAppPreference('notifications.settings', normalized);
  return normalized;
}

function normalizeNotificationPreferences(preferences = {}) {
  const source = preferences && typeof preferences === 'object' ? preferences : {};
  return {
    dailyDigest: source.dailyDigest === undefined ? true : Boolean(source.dailyDigest),
    digestHour: clampInteger(source.digestHour, 0, 23, NOTIFICATION_DEFAULTS.digestHour),
    includePresales: source.includePresales === undefined ? true : Boolean(source.includePresales),
    quietHoursEnabled: Boolean(source.quietHoursEnabled),
    quietStart: clampInteger(source.quietStart, 0, 23, NOTIFICATION_DEFAULTS.quietStart),
    quietEnd: clampInteger(source.quietEnd, 0, 23, NOTIFICATION_DEFAULTS.quietEnd),
  };
}

export function getAppPreference(key, fallback = null) {
  const row = db.prepare('SELECT value FROM app_preferences WHERE key = ?').get(String(key));
  if (!row) return fallback;

  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export function saveAppPreference(key, value) {
  const updatedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_preferences (key, value, updated_at)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run({
    key: String(key),
    value: JSON.stringify(value),
    updatedAt,
  });
  return value;
}

const insertStatement = db.prepare(`
  INSERT INTO tasks (
    title, notes, project, priority, due_at, recurrence, status, progress,
    reminder_at, created_at, updated_at
  )
  VALUES (
    @title, @notes, @project, @priority, @dueAt, @recurrence, @status, @progress,
    @reminderAt, @createdAt, @updatedAt
  )
`);

export function addTask(task) {
  const timestamp = new Date().toISOString();
  const payload = {
    title: task.title.trim(),
    notes: task.notes?.trim() || '',
    project: task.project?.trim().replace(/^#/, '') || null,
    priority: task.priority ? Number(task.priority) : null,
    dueAt: task.dueAt || null,
    recurrence: task.recurrence || null,
    status: normalizeTaskStatus(task.status),
    progress: normalizeProgress(task.progress),
    reminderAt: task.reminderAt || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (!payload.title) throw new Error('İş başlığı gerekli.');
  const result = insertStatement.run(payload);
  return getTask(Number(result.lastInsertRowid));
}

export function getTask(id) {
  return db.prepare(`SELECT ${selectColumns} FROM tasks WHERE id = ?`).get(id);
}

export function updateTask(id, task) {
  const existing = getTask(id);
  if (!existing) return null;
  const timestamp = new Date().toISOString();
  const title = task.title.trim();
  if (!title) throw new Error('İş başlığı gerekli.');
  db.prepare(`
    UPDATE tasks
    SET title = @title,
        notes = @notes,
        project = @project,
        priority = @priority,
        due_at = @dueAt,
        recurrence = @recurrence,
        status = @status,
        progress = @progress,
        reminder_at = @reminderAt,
        reminder_sent_at = CASE WHEN reminder_at IS @reminderAt THEN reminder_sent_at ELSE NULL END,
        reminded_at = CASE WHEN due_at IS @dueAt THEN reminded_at ELSE NULL END,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id,
    title,
    notes: task.notes?.trim() || '',
    project: task.project?.trim().replace(/^#/, '') || null,
    priority: task.priority ? Number(task.priority) : null,
    dueAt: task.dueAt || null,
    recurrence: task.recurrence || null,
    status: normalizeTaskStatus(task.status, Boolean(existing.completedAt)),
    progress: existing.completedAt ? 100 : normalizeProgress(task.progress, existing.progress),
    reminderAt: task.reminderAt || null,
    updatedAt: timestamp,
  });
  return getTask(id);
}

export const completeTask = transaction((id) => {
  const task = db.prepare(`SELECT ${selectColumns} FROM tasks WHERE id = ? AND completed_at IS NULL`).get(id);
  if (!task) return null;

  const completedAt = new Date().toISOString();
  db.prepare("UPDATE tasks SET completed_at = ?, status = 'completed', progress = 100, updated_at = ? WHERE id = ?")
    .run(completedAt, completedAt, id);

  let nextTask = null;
  if (task.recurrence) {
    const anchor = task.dueAt ? new Date(task.dueAt) : new Date();
    const nextDue = nextOccurrence(task.recurrence, anchor);
    if (nextDue) {
      nextTask = addTask({
        title: task.title,
        notes: task.notes,
        project: task.project,
        priority: task.priority,
        dueAt: nextDue.toISOString(),
        recurrence: task.recurrence,
        status: 'planned',
        progress: 0,
        reminderAt: nextReminderAt(task, nextDue),
      });
    }
  }

  return { completed: { ...task, completedAt }, nextTask };
});

function transaction(callback) {
  return (...args) => {
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = callback(...args);
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  };
}

export function deleteTask(id) {
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
}

export function reopenTask(id) {
  const timestamp = new Date().toISOString();
  const result = db.prepare(`
    UPDATE tasks
    SET completed_at = NULL, status = 'in_progress', progress = 90,
        reminded_at = NULL, reminder_sent_at = NULL, updated_at = ?
    WHERE id = ? AND completed_at IS NOT NULL
  `).run(timestamp, id);
  return result.changes ? getTask(id) : null;
}

export function duplicateTask(id) {
  const task = getTask(id);
  if (!task) return null;
  return addTask({
    title: task.title,
    notes: task.notes,
    project: task.project,
    priority: task.priority,
    dueAt: task.dueAt,
    recurrence: task.recurrence,
    status: task.completedAt ? 'planned' : task.status,
    progress: task.completedAt ? 0 : task.progress,
    reminderAt: task.reminderAt,
  });
}

export function getTodayTasks(start, end) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL AND due_at IS NOT NULL AND due_at < ?
    ORDER BY CASE WHEN due_at < ? THEN 0 ELSE 1 END, due_at ASC,
      CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC, created_at ASC
  `).all(end, start);
}

export function getUpcomingTasks(start, end) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL AND due_at >= ? AND due_at < ?
    ORDER BY due_at ASC, CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC, created_at ASC
  `).all(start, end);
}

export function getCalendarTasks(start, end) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE due_at IS NOT NULL AND due_at >= ? AND due_at < ?
    ORDER BY due_at ASC, completed_at IS NOT NULL,
      CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC, created_at ASC
  `).all(start, end);
}

export function getInboxTasks() {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL AND due_at IS NULL
    ORDER BY CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC, created_at DESC
  `).all();
}

export function getProjectTasks(project) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL AND lower(project) = lower(?)
    ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC,
      CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC, created_at ASC
  `).all(project);
}

export function getWorkflowTasks() {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL
    ORDER BY CASE status
      WHEN 'in_progress' THEN 0
      WHEN 'blocked' THEN 1
      WHEN 'waiting' THEN 2
      ELSE 3
    END,
    CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC,
    CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC, created_at ASC
  `).all();
}

export function getCompletedTasks(limit = 100) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT ?
  `).all(limit);
}

export function searchTasks(query) {
  const needle = `%${query}%`;
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL
      AND (
        title LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\' OR project LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM task_notes
          WHERE task_notes.task_id = tasks.id AND task_notes.content LIKE ? ESCAPE '\\'
        )
      )
    ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC,
      CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC
    LIMIT 100
  `).all(needle, needle, needle, needle);
}

export function getProjects() {
  return db.prepare(`
    SELECT project AS name, COUNT(*) AS count
    FROM tasks
    WHERE completed_at IS NULL AND project IS NOT NULL
    GROUP BY lower(project)
    ORDER BY lower(project)
  `).all();
}

export function getCounts(start, end) {
  return {
    today: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND due_at IS NOT NULL AND due_at < ?
    `).get(end).count,
    upcoming: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND due_at >= ? AND due_at < ?
    `).get(start, end).count,
    inbox: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND due_at IS NULL
    `).get().count,
    completed: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NOT NULL
    `).get().count,
    workflow: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND status = 'in_progress'
    `).get().count,
  };
}

export function getWorkSummary(start, end, reference) {
  return {
    open: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL
    `).get().count,
    overdue: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND due_at IS NOT NULL AND due_at < ?
    `).get(reference).count,
    dueToday: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND due_at >= ? AND due_at < ?
    `).get(start, end).count,
    completedToday: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NOT NULL AND completed_at >= ? AND completed_at < ?
    `).get(start, end).count,
    inProgress: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND status = 'in_progress'
    `).get().count,
    blocked: db.prepare(`
      SELECT COUNT(*) AS count FROM tasks
      WHERE completed_at IS NULL AND status = 'blocked'
    `).get().count,
  };
}

export function healthCheck() {
  db.prepare('SELECT 1 AS ok').get();
  return true;
}

export function getDueForReminder(nowIso) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL AND due_at IS NOT NULL AND due_at <= ? AND reminded_at IS NULL
    ORDER BY due_at ASC
  `).all(nowIso);
}

export function markReminded(id, timestamp = new Date().toISOString()) {
  db.prepare('UPDATE tasks SET reminded_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, id);
}

export function getCustomReminders(nowIso) {
  return db.prepare(`
    SELECT ${selectColumns}
    FROM tasks
    WHERE completed_at IS NULL AND reminder_at IS NOT NULL
      AND reminder_at <= ? AND reminder_sent_at IS NULL
    ORDER BY reminder_at ASC
  `).all(nowIso);
}

export function markCustomReminded(id, timestamp = new Date().toISOString()) {
  db.prepare('UPDATE tasks SET reminder_sent_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, id);
}

export function getTaskNotes(taskId) {
  return db.prepare(`
    SELECT id, task_id AS taskId, content, created_at AS createdAt
    FROM task_notes
    WHERE task_id = ?
    ORDER BY created_at DESC, id DESC
  `).all(taskId);
}

export function addTaskNote(taskId, content) {
  const task = getTask(taskId);
  if (!task) return null;
  const cleanContent = String(content || '').trim();
  if (!cleanContent) throw new Error('Not içeriği gerekli.');
  const createdAt = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO task_notes (task_id, content, created_at)
    VALUES (?, ?, ?)
  `).run(taskId, cleanContent, createdAt);
  db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(createdAt, taskId);
  return db.prepare(`
    SELECT id, task_id AS taskId, content, created_at AS createdAt
    FROM task_notes WHERE id = ?
  `).get(Number(result.lastInsertRowid));
}

export const addPresalesCase = transaction((input) => {
  const timestamp = new Date().toISOString();
  const payload = normalizePresalesCasePayload(input, timestamp);
  const { products, ...casePayload } = payload;
  const result = db.prepare(`
    INSERT INTO presales_cases (
      title, customer, tender_reference, stage, offerability, owner, manufacturer,
      product_family, proposed_model, competitors, deadline, reminder_at,
      opportunity_type, priority, currency, estimated_value, estimated_cost,
      win_probability, internal_deadline, next_action, notes, created_at, updated_at
    ) VALUES (
      @title, @customer, @tenderReference, @stage, @offerability, @owner, @manufacturer,
      @productFamily, @proposedModel, @competitors, @deadline, @reminderAt,
      @opportunityType, @priority, @currency, @estimatedValue, @estimatedCost,
      @winProbability, @internalDeadline, @nextAction, @notes, @createdAt, @updatedAt
    )
  `).run(casePayload);
  const caseId = Number(result.lastInsertRowid);
  replacePresalesCaseProducts(caseId, products, timestamp);
  return getPresalesCase(caseId);
});

export function getPresalesCase(id) {
  const presalesCase = db.prepare(`SELECT ${presalesCaseColumns} FROM presales_cases WHERE id = ?`).get(id);
  return presalesCase ? attachPresalesProducts(presalesCase) : undefined;
}

export const updatePresalesCase = transaction((id, input) => {
  const existing = getPresalesCase(id);
  if (!existing) return null;
  const payload = normalizePresalesCasePayload(input, new Date().toISOString());
  const { products, createdAt: _createdAt, ...casePayload } = payload;
  db.prepare(`
    UPDATE presales_cases
    SET title = @title,
        customer = @customer,
        tender_reference = @tenderReference,
        stage = @stage,
        offerability = @offerability,
        owner = @owner,
        manufacturer = @manufacturer,
        product_family = @productFamily,
        proposed_model = @proposedModel,
        competitors = @competitors,
        deadline = @deadline,
        reminder_at = @reminderAt,
        reminder_sent_at = CASE WHEN reminder_at IS @reminderAt THEN reminder_sent_at ELSE NULL END,
        opportunity_type = @opportunityType,
        priority = @priority,
        currency = @currency,
        estimated_value = @estimatedValue,
        estimated_cost = @estimatedCost,
        win_probability = @winProbability,
        internal_deadline = @internalDeadline,
        next_action = @nextAction,
        notes = @notes,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({ id, ...casePayload });
  replacePresalesCaseProducts(id, products, casePayload.updatedAt);
  return getPresalesCase(id);
});

export function deletePresalesCase(id) {
  return db.prepare('DELETE FROM presales_cases WHERE id = ?').run(id).changes > 0;
}

export function getPresalesCases() {
  return db.prepare(`
    SELECT ${presalesCaseColumns},
      (SELECT COUNT(*) FROM presales_records r WHERE r.case_id = presales_cases.id) AS recordCount,
      (SELECT COUNT(*) FROM presales_records r
        WHERE r.case_id = presales_cases.id
          AND r.compliance_status IN ('noncompliant', 'clarification')) AS issueCount,
      (SELECT COUNT(*) FROM presales_records r
        WHERE r.case_id = presales_cases.id
          AND (r.risk_probability * r.risk_impact + r.evidence_gap) >= 8) AS criticalCount,
      (SELECT COUNT(*) FROM presales_stakeholders s
        WHERE s.case_id = presales_cases.id) AS stakeholderCount,
      (SELECT COUNT(*) FROM presales_actions a
        WHERE a.case_id = presales_cases.id AND a.status <> 'done') AS openActionCount,
      (SELECT COUNT(*) FROM presales_actions a
        WHERE a.case_id = presales_cases.id AND a.status <> 'done'
          AND a.due_at IS NOT NULL
          AND a.due_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) AS overdueActionCount,
      COALESCE((SELECT ROUND(SUM(CASE q.status WHEN 'confirmed' THEN 2 WHEN 'partial' THEN 1 ELSE 0 END) * 100.0 / 16)
        FROM presales_qualification_items q WHERE q.case_id = presales_cases.id), 0) AS qualificationScore
    FROM presales_cases
    ORDER BY CASE WHEN stage IN ('won', 'lost') THEN 1 ELSE 0 END,
      CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC, updated_at DESC
  `).all().map(attachPresalesProducts);
}

export function getPresalesDashboardSummary(referenceIso, horizonIso) {
  return {
    active: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_cases WHERE stage NOT IN ('won', 'lost')
    `).get().count,
    dueSoon: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_cases
      WHERE stage NOT IN ('won', 'lost') AND deadline IS NOT NULL AND deadline >= ? AND deadline < ?
    `).get(referenceIso, horizonIso).count,
    overdue: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_cases
      WHERE stage NOT IN ('won', 'lost') AND deadline IS NOT NULL AND deadline < ?
    `).get(referenceIso).count,
    noncompliant: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_records r
      JOIN presales_cases c ON c.id = r.case_id
      WHERE c.stage NOT IN ('won', 'lost') AND r.compliance_status = 'noncompliant'
    `).get().count,
    clarification: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_records r
      JOIN presales_cases c ON c.id = r.case_id
      WHERE c.stage NOT IN ('won', 'lost') AND r.compliance_status = 'clarification'
    `).get().count,
    criticalRisks: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_records r
      JOIN presales_cases c ON c.id = r.case_id
      WHERE c.stage NOT IN ('won', 'lost')
        AND (r.risk_probability * r.risk_impact + r.evidence_gap) >= 8
    `).get().count,
    overdueActions: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_actions a
      JOIN presales_cases c ON c.id = a.case_id
      WHERE c.stage NOT IN ('won', 'lost') AND a.status <> 'done'
        AND a.due_at IS NOT NULL AND a.due_at < ?
    `).get(referenceIso).count,
    openActions: db.prepare(`
      SELECT COUNT(*) AS count FROM presales_actions a
      JOIN presales_cases c ON c.id = a.case_id
      WHERE c.stage NOT IN ('won', 'lost') AND a.status <> 'done'
    `).get().count,
    pipeline: db.prepare(`
      SELECT currency, COALESCE(SUM(estimated_value), 0) AS total,
        COALESCE(SUM(estimated_value * win_probability / 100.0), 0) AS weighted
      FROM presales_cases WHERE stage NOT IN ('won', 'lost') AND estimated_value IS NOT NULL
      GROUP BY currency ORDER BY currency
    `).all(),
  };
}

export function getPresalesCaseMetrics(caseId) {
  const statusRows = db.prepare(`
    SELECT compliance_status AS status, COUNT(*) AS count
    FROM presales_records WHERE case_id = ? GROUP BY compliance_status
  `).all(caseId);
  const typeRows = db.prepare(`
    SELECT record_type AS type, COUNT(*) AS count
    FROM presales_records WHERE case_id = ? GROUP BY record_type
  `).all(caseId);
  const counts = Object.fromEntries(statusRows.map((row) => [row.status, row.count]));
  const types = Object.fromEntries(typeRows.map((row) => [row.type, row.count]));
  const total = statusRows.reduce((sum, row) => sum + row.count, 0);
  const assessed = total - (counts.unreviewed || 0) - (counts.out_of_scope || 0);
  const compliant = (counts.compliant || 0) + (counts.completed || 0);
  const evidence = db.prepare(`
    SELECT COUNT(*) AS records,
      COALESCE(SUM(
        (capability_evidence <> '') + (inclusion_evidence <> '')
        + (compatibility_evidence <> '') + (entitlement_evidence <> '')
      ), 0) AS completed
    FROM presales_records WHERE case_id = ?
  `).get(caseId);
  const actionRows = db.prepare(`
    SELECT status, COUNT(*) AS count FROM presales_actions WHERE case_id = ? GROUP BY status
  `).all(caseId);
  const actionCounts = Object.fromEntries(actionRows.map((row) => [row.status, row.count]));
  const actionTotal = actionRows.reduce((sum, row) => sum + row.count, 0);
  const stakeholderCount = db.prepare(`
    SELECT COUNT(*) AS count FROM presales_stakeholders WHERE case_id = ?
  `).get(caseId).count;
  const qualification = getPresalesQualification(caseId);
  return {
    total,
    assessed,
    compliant,
    compliancePercent: assessed ? Math.round((compliant / assessed) * 100) : 0,
    counts,
    types,
    evidencePercent: evidence.records ? Math.round((evidence.completed / (evidence.records * 4)) * 100) : 0,
    actions: {
      total: actionTotal,
      open: actionTotal - (actionCounts.done || 0),
      done: actionCounts.done || 0,
      percent: actionTotal ? Math.round(((actionCounts.done || 0) / actionTotal) * 100) : 0,
      counts: actionCounts,
    },
    stakeholderCount,
    qualification,
  };
}

export function getPresalesQualification(caseId) {
  const rows = db.prepare(`
    SELECT dimension, status, notes, updated_at AS updatedAt
    FROM presales_qualification_items WHERE case_id = ?
  `).all(caseId);
  const rowMap = new Map(rows.map((row) => [row.dimension, row]));
  const statusWeights = new Map(QUALIFICATION_STATUSES.map((status) => [status.value, status.weight]));
  const items = QUALIFICATION_DIMENSIONS.map((dimension) => {
    const row = rowMap.get(dimension.value);
    return {
      ...dimension,
      status: normalizeQualificationStatus(row?.status),
      notes: row?.notes || '',
      updatedAt: row?.updatedAt || null,
    };
  });
  const points = items.reduce((sum, item) => sum + (statusWeights.get(item.status) || 0), 0);
  return {
    items,
    score: Math.round((points / (QUALIFICATION_DIMENSIONS.length * 2)) * 100),
    confirmed: items.filter((item) => item.status === 'confirmed').length,
    blockers: items.filter((item) => item.status === 'blocked').length,
  };
}

export const savePresalesQualification = transaction((caseId, items) => {
  if (!getPresalesCase(caseId)) return null;
  const timestamp = new Date().toISOString();
  const source = new Map((Array.isArray(items) ? items : []).map((item) => [item.dimension, item]));
  const statement = db.prepare(`
    INSERT INTO presales_qualification_items (case_id, dimension, status, notes, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(case_id, dimension) DO UPDATE SET
      status = excluded.status,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);
  QUALIFICATION_DIMENSIONS.forEach((dimension) => {
    const item = source.get(dimension.value) || {};
    statement.run(
      caseId,
      dimension.value,
      normalizeQualificationStatus(item.status),
      cleanText(item.notes),
      timestamp,
    );
  });
  return getPresalesQualification(caseId);
});

export function getPresalesStakeholders(caseId) {
  return db.prepare(`
    SELECT id, case_id AS caseId, name, organization, role, influence, stance,
      contact, notes, created_at AS createdAt, updated_at AS updatedAt
    FROM presales_stakeholders WHERE case_id = ?
    ORDER BY CASE influence WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      CASE stance WHEN 'blocker' THEN 0 WHEN 'supportive' THEN 1 ELSE 2 END, name
  `).all(caseId);
}

export function addPresalesStakeholder(caseId, input) {
  if (!getPresalesCase(caseId)) return null;
  const timestamp = new Date().toISOString();
  const payload = normalizePresalesStakeholderPayload(input, timestamp);
  const result = db.prepare(`
    INSERT INTO presales_stakeholders (
      case_id, name, organization, role, influence, stance, contact, notes, created_at, updated_at
    ) VALUES (@caseId, @name, @organization, @role, @influence, @stance, @contact, @notes, @createdAt, @updatedAt)
  `).run({ caseId, ...payload });
  return db.prepare(`
    SELECT id, case_id AS caseId, name, organization, role, influence, stance,
      contact, notes, created_at AS createdAt, updated_at AS updatedAt
    FROM presales_stakeholders WHERE id = ?
  `).get(Number(result.lastInsertRowid));
}

export function updatePresalesStakeholder(caseId, id, input) {
  const timestamp = new Date().toISOString();
  const { createdAt: _createdAt, ...payload } = normalizePresalesStakeholderPayload(input, timestamp);
  const result = db.prepare(`
    UPDATE presales_stakeholders SET name = @name, organization = @organization,
      role = @role, influence = @influence, stance = @stance, contact = @contact,
      notes = @notes, updated_at = @updatedAt WHERE id = @id AND case_id = @caseId
  `).run({ caseId, id, ...payload });
  return result.changes > 0;
}

export function deletePresalesStakeholder(caseId, id) {
  return db.prepare('DELETE FROM presales_stakeholders WHERE id = ? AND case_id = ?').run(id, caseId).changes > 0;
}

export function getPresalesActions(caseId) {
  return db.prepare(`
    SELECT ${presalesActionColumns} FROM presales_actions WHERE case_id = ?
    ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'open' THEN 1 WHEN 'waiting' THEN 2 ELSE 3 END,
      CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at, priority, created_at
  `).all(caseId);
}

export function addPresalesAction(caseId, input) {
  if (!getPresalesCase(caseId)) return null;
  const timestamp = new Date().toISOString();
  const payload = normalizePresalesActionPayload(input, timestamp);
  const result = db.prepare(`
    INSERT INTO presales_actions (
      case_id, title, owner, status, priority, due_at, reminder_at, notes,
      completed_at, created_at, updated_at
    ) VALUES (
      @caseId, @title, @owner, @status, @priority, @dueAt, @reminderAt, @notes,
      @completedAt, @createdAt, @updatedAt
    )
  `).run({ caseId, ...payload });
  return getPresalesAction(Number(result.lastInsertRowid));
}

export function getPresalesAction(id) {
  return db.prepare(`SELECT ${presalesActionColumns} FROM presales_actions WHERE id = ?`).get(id);
}

export function updatePresalesAction(caseId, id, input) {
  const existing = getPresalesAction(id);
  if (!existing || existing.caseId !== caseId) return null;
  const { createdAt: _createdAt, ...payload } = normalizePresalesActionPayload(input, new Date().toISOString());
  db.prepare(`
    UPDATE presales_actions SET title = @title, owner = @owner, status = @status,
      priority = @priority, due_at = @dueAt, reminder_at = @reminderAt,
      reminder_sent_at = CASE WHEN reminder_at IS @reminderAt THEN reminder_sent_at ELSE NULL END,
      notes = @notes, completed_at = @completedAt, updated_at = @updatedAt
    WHERE id = @id AND case_id = @caseId
  `).run({ caseId, id, ...payload });
  return getPresalesAction(id);
}

export function deletePresalesAction(caseId, id) {
  return db.prepare('DELETE FROM presales_actions WHERE id = ? AND case_id = ?').run(id, caseId).changes > 0;
}

export function getPresalesAttentionItems(referenceIso, horizonIso) {
  const caseItems = db.prepare(`
    SELECT c.id AS caseId, 'deadline' AS type, c.title, c.customer AS context,
      c.deadline AS dueAt, CASE WHEN c.deadline < ? THEN 'critical' ELSE 'warning' END AS severity,
      '/presales/' || c.id AS href
    FROM presales_cases c
    WHERE c.stage NOT IN ('won', 'lost') AND c.deadline IS NOT NULL AND c.deadline < ?
  `).all(referenceIso, horizonIso);
  const actionItems = db.prepare(`
    SELECT a.case_id AS caseId, 'action' AS type, a.title,
      c.title || CASE WHEN a.owner <> '' THEN ' · ' || a.owner ELSE '' END AS context,
      a.due_at AS dueAt,
      CASE WHEN a.due_at < ? OR a.priority = 1 THEN 'critical' ELSE 'warning' END AS severity,
      '/presales/' || a.case_id || '#action-' || a.id AS href
    FROM presales_actions a JOIN presales_cases c ON c.id = a.case_id
    WHERE c.stage NOT IN ('won', 'lost') AND a.status <> 'done'
      AND a.due_at IS NOT NULL AND a.due_at < ?
  `).all(referenceIso, horizonIso);
  const recordItems = db.prepare(`
    SELECT r.case_id AS caseId, 'finding' AS type, r.title,
      c.title || CASE WHEN r.reference_no <> '' THEN ' · ' || r.reference_no ELSE '' END AS context,
      r.due_at AS dueAt,
      CASE WHEN r.compliance_status = 'noncompliant'
        OR (r.risk_probability * r.risk_impact + r.evidence_gap) >= 8
        THEN 'critical' ELSE 'warning' END AS severity,
      '/presales/' || r.case_id || '#record-' || r.id AS href
    FROM presales_records r JOIN presales_cases c ON c.id = r.case_id
    WHERE c.stage NOT IN ('won', 'lost')
      AND (r.compliance_status IN ('noncompliant', 'clarification')
        OR (r.risk_probability * r.risk_impact + r.evidence_gap) >= 8)
  `).all();
  const qualificationItems = db.prepare(`
    SELECT q.case_id AS caseId, 'qualification' AS type,
      q.dimension AS title, c.title AS context, NULL AS dueAt,
      'critical' AS severity, '/presales/' || q.case_id || '#qualification' AS href
    FROM presales_qualification_items q JOIN presales_cases c ON c.id = q.case_id
    WHERE c.stage NOT IN ('won', 'lost') AND q.status = 'blocked'
  `).all();
  const order = { critical: 0, warning: 1 };
  return [...caseItems, ...actionItems, ...recordItems, ...qualificationItems]
    .sort((left, right) => (order[left.severity] - order[right.severity])
      || String(left.dueAt || '9999').localeCompare(String(right.dueAt || '9999')))
    .slice(0, 100);
}

export function addPresalesRecord(caseId, input) {
  if (!getPresalesCase(caseId)) return null;
  const timestamp = new Date().toISOString();
  const payload = normalizePresalesRecordPayload(input, timestamp);
  const result = db.prepare(`
    INSERT INTO presales_records (
      case_id, record_type, reference_no, title, original_text, requirement,
      offered_item, sku, quantity, compliance_status, capability_evidence,
      inclusion_evidence, compatibility_evidence, entitlement_evidence, source_ref,
      response_mode, response_text, proposed_text, cost_impact, responsibility,
      action, owner, due_at, reminder_at, confidence, risk_probability, risk_impact,
      evidence_gap, notes, created_at, updated_at
    ) VALUES (
      @caseId, @recordType, @referenceNo, @title, @originalText, @requirement,
      @offeredItem, @sku, @quantity, @complianceStatus, @capabilityEvidence,
      @inclusionEvidence, @compatibilityEvidence, @entitlementEvidence, @sourceRef,
      @responseMode, @responseText, @proposedText, @costImpact, @responsibility,
      @action, @owner, @dueAt, @reminderAt, @confidence, @riskProbability, @riskImpact,
      @evidenceGap, @notes, @createdAt, @updatedAt
    )
  `).run({ caseId, ...payload });
  return getPresalesRecord(Number(result.lastInsertRowid));
}

export function getPresalesRecord(id) {
  return db.prepare(`SELECT ${presalesRecordColumns} FROM presales_records WHERE id = ?`).get(id);
}

export function getPresalesRecords(caseId) {
  return db.prepare(`
    SELECT ${presalesRecordColumns}
    FROM presales_records
    WHERE case_id = ?
    ORDER BY CASE record_type
      WHEN 'requirement' THEN 0 WHEN 'bom' THEN 1 WHEN 'product' THEN 2
      WHEN 'competition' THEN 3 WHEN 'change_request' THEN 4 WHEN 'response' THEN 5
      WHEN 'cost_risk' THEN 6 ELSE 7 END,
      CASE WHEN reference_no = '' THEN 1 ELSE 0 END, reference_no, updated_at DESC
  `).all(caseId);
}

export function updatePresalesRecord(id, input) {
  const existing = getPresalesRecord(id);
  if (!existing) return null;
  const payload = normalizePresalesRecordPayload(input, new Date().toISOString());
  db.prepare(`
    UPDATE presales_records
    SET record_type = @recordType,
        reference_no = @referenceNo,
        title = @title,
        original_text = @originalText,
        requirement = @requirement,
        offered_item = @offeredItem,
        sku = @sku,
        quantity = @quantity,
        compliance_status = @complianceStatus,
        capability_evidence = @capabilityEvidence,
        inclusion_evidence = @inclusionEvidence,
        compatibility_evidence = @compatibilityEvidence,
        entitlement_evidence = @entitlementEvidence,
        source_ref = @sourceRef,
        response_mode = @responseMode,
        response_text = @responseText,
        proposed_text = @proposedText,
        cost_impact = @costImpact,
        responsibility = @responsibility,
        action = @action,
        owner = @owner,
        due_at = @dueAt,
        reminder_at = @reminderAt,
        reminder_sent_at = CASE WHEN reminder_at IS @reminderAt THEN reminder_sent_at ELSE NULL END,
        confidence = @confidence,
        risk_probability = @riskProbability,
        risk_impact = @riskImpact,
        evidence_gap = @evidenceGap,
        notes = @notes,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({ id, ...payload });
  return getPresalesRecord(id);
}

export function deletePresalesRecord(id) {
  return db.prepare('DELETE FROM presales_records WHERE id = ?').run(id).changes > 0;
}

export function searchPresales(query) {
  const needle = `%${query}%`;
  const ids = db.prepare(`
    SELECT DISTINCT c.id
    FROM presales_cases c
    LEFT JOIN presales_records r ON r.case_id = c.id
    WHERE c.title LIKE ? OR c.customer LIKE ? OR c.tender_reference LIKE ?
      OR c.manufacturer LIKE ? OR c.product_family LIKE ? OR c.proposed_model LIKE ?
      OR c.competitors LIKE ? OR c.notes LIKE ? OR r.title LIKE ? OR r.reference_no LIKE ?
      OR r.requirement LIKE ? OR r.offered_item LIKE ? OR r.sku LIKE ? OR r.source_ref LIKE ?
      OR EXISTS (
        SELECT 1 FROM presales_case_products product
        WHERE product.case_id = c.id
          AND (product.manufacturer LIKE ? OR product.product_family LIKE ? OR product.proposed_model LIKE ?)
      )
      OR EXISTS (
        SELECT 1 FROM presales_stakeholders stakeholder
        WHERE stakeholder.case_id = c.id
          AND (stakeholder.name LIKE ? OR stakeholder.organization LIKE ?
            OR stakeholder.contact LIKE ? OR stakeholder.notes LIKE ?)
      )
      OR EXISTS (
        SELECT 1 FROM presales_actions action
        WHERE action.case_id = c.id
          AND (action.title LIKE ? OR action.owner LIKE ? OR action.notes LIKE ?)
      )
      OR EXISTS (
        SELECT 1 FROM presales_qualification_items qualification
        WHERE qualification.case_id = c.id AND qualification.notes LIKE ?
      )
    ORDER BY c.updated_at DESC
    LIMIT 50
  `).all(...Array(25).fill(needle)).map((row) => row.id);
  return [...new Set(ids)].map((id) => getPresalesCase(id));
}

export function getPresalesExport(caseId) {
  const presalesCase = getPresalesCase(caseId);
  if (!presalesCase) return null;
  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    case: presalesCase,
    records: getPresalesRecords(caseId),
    qualification: getPresalesQualification(caseId),
    stakeholders: getPresalesStakeholders(caseId),
    actions: getPresalesActions(caseId),
  };
}

export function getDuePresalesReminders(nowIso) {
  const caseRows = db.prepare(`
    SELECT 'case' AS kind, id, id AS caseId, title, customer, NULL AS caseTitle,
      tender_reference AS referenceNo, reminder_at AS reminderAt, deadline AS dueAt,
      next_action AS action, '/presales/' || id AS route
    FROM presales_cases
    WHERE stage NOT IN ('won', 'lost') AND reminder_at IS NOT NULL
      AND reminder_at <= ? AND reminder_sent_at IS NULL
  `).all(nowIso);
  const recordRows = db.prepare(`
    SELECT 'record' AS kind, r.id, r.case_id AS caseId, r.title, c.customer, c.title AS caseTitle,
      r.reference_no AS referenceNo, r.reminder_at AS reminderAt,
      r.due_at AS dueAt, r.action,
      '/presales/' || r.case_id || '#record-' || r.id AS route
    FROM presales_records r
    JOIN presales_cases c ON c.id = r.case_id
    WHERE c.stage NOT IN ('won', 'lost') AND r.reminder_at IS NOT NULL
      AND r.reminder_at <= ? AND r.reminder_sent_at IS NULL
  `).all(nowIso);
  const actionRows = db.prepare(`
    SELECT 'action' AS kind, a.id, a.case_id AS caseId, a.title, c.customer,
      c.title AS caseTitle, NULL AS referenceNo, a.reminder_at AS reminderAt,
      a.due_at AS dueAt, a.notes AS action,
      '/presales/' || a.case_id || '#action-' || a.id AS route
    FROM presales_actions a JOIN presales_cases c ON c.id = a.case_id
    WHERE c.stage NOT IN ('won', 'lost') AND a.status <> 'done'
      AND a.reminder_at IS NOT NULL AND a.reminder_at <= ? AND a.reminder_sent_at IS NULL
  `).all(nowIso);
  return [...caseRows, ...recordRows, ...actionRows]
    .sort((left, right) => String(left.reminderAt).localeCompare(String(right.reminderAt)));
}

export function markPresalesReminded(kind, id, timestamp = new Date().toISOString()) {
  const tables = { case: 'presales_cases', record: 'presales_records', action: 'presales_actions' };
  const table = tables[kind];
  if (!table) throw new Error('Geçersiz presales hatırlatma türü.');
  db.prepare(`UPDATE ${table} SET reminder_sent_at = ?, updated_at = ? WHERE id = ?`)
    .run(timestamp, timestamp, id);
}

function normalizePresalesCasePayload(input, timestamp) {
  const title = cleanText(input.title);
  if (!title) throw new Error('Presales dosya başlığı gerekli.');
  const products = normalizePresalesProducts(input.products, input);
  const primaryProduct = products[0] || { manufacturer: '', productFamily: '', proposedModel: '' };
  return {
    title,
    customer: cleanText(input.customer),
    tenderReference: cleanText(input.tenderReference),
    stage: normalizePresalesStage(input.stage),
    offerability: normalizeOfferability(input.offerability),
    owner: cleanText(input.owner),
    manufacturer: primaryProduct.manufacturer,
    productFamily: primaryProduct.productFamily,
    proposedModel: primaryProduct.proposedModel,
    products,
    competitors: cleanText(input.competitors),
    deadline: input.deadline || null,
    reminderAt: input.reminderAt || null,
    opportunityType: normalizeOpportunityType(input.opportunityType),
    priority: normalizePresalesPriority(input.priority),
    currency: normalizeCurrency(input.currency),
    estimatedValue: normalizeAmount(input.estimatedValue),
    estimatedCost: normalizeAmount(input.estimatedCost),
    winProbability: clampInteger(input.winProbability, 0, 100, 0),
    internalDeadline: input.internalDeadline || null,
    nextAction: cleanText(input.nextAction),
    notes: cleanText(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function attachPresalesProducts(presalesCase) {
  const products = db.prepare(`
    SELECT id, manufacturer, product_family AS productFamily,
      proposed_model AS proposedModel, position
    FROM presales_case_products
    WHERE case_id = ?
    ORDER BY position, id
  `).all(presalesCase.id);

  if (!products.length && (presalesCase.manufacturer || presalesCase.productFamily || presalesCase.proposedModel)) {
    products.push({
      manufacturer: presalesCase.manufacturer,
      productFamily: presalesCase.productFamily,
      proposedModel: presalesCase.proposedModel,
      position: 0,
    });
  }

  return { ...presalesCase, products };
}

function replacePresalesCaseProducts(caseId, products, timestamp) {
  db.prepare('DELETE FROM presales_case_products WHERE case_id = ?').run(caseId);
  const insert = db.prepare(`
    INSERT INTO presales_case_products (
      case_id, manufacturer, product_family, proposed_model, position, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  products.forEach((product, position) => {
    insert.run(
      caseId,
      product.manufacturer,
      product.productFamily,
      product.proposedModel,
      position,
      timestamp,
    );
  });
}

function normalizePresalesProducts(products, legacyInput = {}) {
  const source = Array.isArray(products) ? products : [{
    manufacturer: legacyInput.manufacturer,
    productFamily: legacyInput.productFamily,
    proposedModel: legacyInput.proposedModel,
  }];
  return source
    .slice(0, 30)
    .map((product) => ({
      manufacturer: cleanText(product?.manufacturer),
      productFamily: cleanText(product?.productFamily),
      proposedModel: cleanText(product?.proposedModel),
    }))
    .filter((product) => product.manufacturer || product.productFamily || product.proposedModel);
}

function normalizePresalesRecordPayload(input, timestamp) {
  const title = cleanText(input.title);
  if (!title) throw new Error('Presales kayıt başlığı gerekli.');
  return {
    recordType: normalizePresalesRecordType(input.recordType),
    referenceNo: cleanText(input.referenceNo),
    title,
    originalText: cleanText(input.originalText),
    requirement: cleanText(input.requirement),
    offeredItem: cleanText(input.offeredItem),
    sku: cleanText(input.sku),
    quantity: cleanText(input.quantity),
    complianceStatus: normalizeComplianceStatus(input.complianceStatus),
    capabilityEvidence: cleanText(input.capabilityEvidence),
    inclusionEvidence: cleanText(input.inclusionEvidence),
    compatibilityEvidence: cleanText(input.compatibilityEvidence),
    entitlementEvidence: cleanText(input.entitlementEvidence),
    sourceRef: cleanText(input.sourceRef),
    responseMode: normalizeResponseMode(input.responseMode),
    responseText: cleanText(input.responseText),
    proposedText: cleanText(input.proposedText),
    costImpact: cleanText(input.costImpact),
    responsibility: cleanText(input.responsibility),
    action: cleanText(input.action),
    owner: cleanText(input.owner),
    dueAt: input.dueAt || null,
    reminderAt: input.reminderAt || null,
    confidence: normalizeConfidence(input.confidence),
    riskProbability: clampInteger(input.riskProbability, 1, 3, 1),
    riskImpact: clampInteger(input.riskImpact, 1, 3, 1),
    evidenceGap: clampInteger(input.evidenceGap, 0, 2, 0),
    notes: cleanText(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function normalizePresalesStakeholderPayload(input, timestamp) {
  const name = cleanText(input.name);
  if (!name) throw new Error('Paydaş adı gerekli.');
  return {
    name,
    organization: cleanText(input.organization),
    role: normalizeStakeholderRole(input.role),
    influence: normalizeStakeholderInfluence(input.influence),
    stance: normalizeStakeholderStance(input.stance),
    contact: cleanText(input.contact),
    notes: cleanText(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function normalizePresalesActionPayload(input, timestamp) {
  const title = cleanText(input.title);
  if (!title) throw new Error('Aksiyon başlığı gerekli.');
  const status = normalizePresalesActionStatus(input.status);
  return {
    title,
    owner: cleanText(input.owner),
    status,
    priority: clampInteger(input.priority, 1, 3, 2),
    dueAt: input.dueAt || null,
    reminderAt: input.reminderAt || null,
    notes: cleanText(input.notes),
    completedAt: status === 'done' ? (input.completedAt || timestamp) : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

function nextReminderAt(task, nextDue) {
  if (!task.reminderAt || !task.dueAt) return null;
  const dueTime = new Date(task.dueAt).getTime();
  const reminderTime = new Date(task.reminderAt).getTime();
  if (!Number.isFinite(dueTime) || !Number.isFinite(reminderTime)) return null;
  return new Date(nextDue.getTime() - (dueTime - reminderTime)).toISOString();
}
