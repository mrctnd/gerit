import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';
import { nextOccurrence } from './recurrence.js';
import { normalizeProgress, normalizeTaskStatus } from './workflow.js';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
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
`);

ensureColumn('tasks', 'status', "TEXT NOT NULL DEFAULT 'planned'");
ensureColumn('tasks', 'progress', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('tasks', 'reminder_at', 'TEXT');
ensureColumn('tasks', 'reminder_sent_at', 'TEXT');

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

  UPDATE tasks
  SET status = 'completed', progress = 100
  WHERE completed_at IS NOT NULL AND (status <> 'completed' OR progress <> 100);
`);
db.pragma('optimize');

function ensureColumn(table, column, definition) {
  const columns = db.pragma(`table_info(${table})`);
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

export const completeTask = db.transaction((id) => {
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

function nextReminderAt(task, nextDue) {
  if (!task.reminderAt || !task.dueAt) return null;
  const dueTime = new Date(task.dueAt).getTime();
  const reminderTime = new Date(task.reminderAt).getTime();
  if (!Number.isFinite(dueTime) || !Number.isFinite(reminderTime)) return null;
  return new Date(nextDue.getTime() - (dueTime - reminderTime)).toISOString();
}
