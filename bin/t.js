#!/usr/bin/env node

import { addTask } from '../src/db.js';
import { dueMeta } from '../src/dates.js';
import { parseQuickAdd } from '../src/parser.js';
import { describeRecurrence } from '../src/recurrence.js';

const [command, ...parts] = process.argv.slice(2);

if (command !== 'add' || !parts.length) {
  console.error('Kullanım: t add "Raporu yarın 16:00 gönder #finans p2"');
  process.exitCode = 1;
} else {
  try {
    const task = addTask(parseQuickAdd(parts.join(' ')));
    const details = [
      task.dueAt ? dueMeta(task.dueAt).label : '',
      task.project ? `#${task.project}` : '',
      task.priority ? `p${task.priority}` : '',
      describeRecurrence(task.recurrence),
    ].filter(Boolean);
    console.log(`Eklendi: ${task.title}${details.length ? ` · ${details.join(' · ')}` : ''}`);
  } catch (error) {
    console.error(`İş eklenemedi: ${error.message}`);
    process.exitCode = 1;
  }
}
