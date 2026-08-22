import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';
import { nextOccurrence } from './recurrence.js';

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
db.pragma('optimize');

const selectColumns = `
  id, title, notes, project, priority, due_at AS dueAt,
  recurrence, reminded_at AS remindedAt, completed_at AS completedAt,
  created_at AS createdAt, updated_at AS updatedAt
`;

const insertStatement = db.prepare(`
  INSERT INTO tasks (title, notes, project, priority, due_at, recurrence, created_at, updated_at)
  VALUES (@title, @notes, @project, @priority, @dueAt, @recurrence, @createdAt, @updatedAt)
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
    updatedAt: timestamp,
  });
  return getTask(id);
}

export const completeTask = db.transaction((id) => {
  const task = db.prepare(`SELECT ${selectColumns} FROM tasks WHERE id = ? AND completed_at IS NULL`).get(id);
  if (!task) return null;

  const completedAt = new Date().toISOString();
  db.prepare('UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?')
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
    SET completed_at = NULL, reminded_at = NULL, updated_at = ?
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
      AND (title LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\' OR project LIKE ? ESCAPE '\\')
    ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at ASC,
      CASE WHEN priority IS NULL THEN 1 ELSE 0 END, priority ASC
    LIMIT 100
  `).all(needle, needle, needle);
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
