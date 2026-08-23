import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import request from 'supertest';

const databasePath = path.join(os.tmpdir(), `local-tasks-${process.pid}-${Date.now()}.sqlite3`);
process.env.DATABASE_PATH = databasePath;
process.env.NTFY_TOPIC = 'local-tasks-test-topic';
process.env.APP_TIMEZONE = 'Europe/Istanbul';
delete process.env.HOST;

let app;
let dbModule;
let parseQuickAdd;
let recurrenceModule;
let reminders;

before(async () => {
  ({ parseQuickAdd } = await import('../src/parser.js'));
  recurrenceModule = await import('../src/recurrence.js');
  dbModule = await import('../src/db.js');
  ({ createApp: app } = await import('../src/app.js'));
  app = app();
  reminders = await import('../src/reminders.js');
});

after(() => {
  dbModule.db.close();
  fs.rmSync(databasePath, { force: true });
});

test('quick-add parses date, project, and priority from one line', () => {
  const reference = new Date('2026-08-23T10:00:00+03:00');
  const parsed = parseQuickAdd('call Sam tomorrow 4pm #home p2', reference);

  assert.equal(parsed.title, 'call Sam');
  assert.equal(parsed.project, 'home');
  assert.equal(parsed.priority, 2);
  assert.equal(parsed.dueAt, '2026-08-24T13:00:00.000Z');
});

test('Türkçe hızlı ekleme tarih, proje ve önceliği ayırır', () => {
  const reference = new Date('2026-08-23T10:00:00+03:00');
  const parsed = parseQuickAdd('Raporu yarın 16:00 gönder #finans p1', reference);

  assert.equal(parsed.title, 'Raporu gönder');
  assert.equal(parsed.project, 'finans');
  assert.equal(parsed.priority, 1);
  assert.equal(parsed.dueAt, '2026-08-24T13:00:00.000Z');
});

test('natural repeat phrases become standard RRULE strings', () => {
  assert.equal(
    recurrenceModule.parseRecurrence('every 1st').rrule,
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=1',
  );
  assert.equal(
    recurrenceModule.parseRecurrence('every mon,thu').rrule,
    'RRULE:FREQ=WEEKLY;BYDAY=MO,TH',
  );
});

test('a recurring quick-add receives its first matching due date', () => {
  const reference = new Date('2026-08-23T10:00:00+03:00'); // Sunday
  const parsed = parseQuickAdd('Water plants every mon,thu 9am #home', reference);

  assert.equal(parsed.recurrence, 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH');
  assert.equal(parsed.dueAt, '2026-08-24T06:00:00.000Z');
});

test('Türkçe tekrar ifadesi RRULE üretir', () => {
  const reference = new Date('2026-08-23T10:00:00+03:00');
  const parsed = parseQuickAdd('Toplantı her pazartesi,perşembe 09:00 #operasyon p2', reference);

  assert.equal(parsed.title, 'Toplantı');
  assert.equal(parsed.recurrence, 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH');
  assert.equal(parsed.dueAt, '2026-08-24T06:00:00.000Z');
});

test('server-rendered inbox accepts quick capture', async () => {
  await request(app)
    .post('/tasks')
    .type('form')
    .send({ quick: 'Buy coffee beans #home p3', returnTo: '/inbox' })
    .expect(302)
    .expect('Location', '/inbox');

  const response = await request(app).get('/inbox').expect(200);
  assert.match(response.text, /Buy coffee beans/);
  assert.match(response.text, /#home/);
  assert.match(response.text, /P3/);
});

test('search includes task notes', async () => {
  dbModule.addTask({ title: 'Book train', notes: 'Use the window-seat voucher' });
  const response = await request(app).get('/search?q=window-seat').expect(200);
  assert.match(response.text, /Book train/);
});

test('completing a recurring task schedules its next occurrence', () => {
  const task = dbModule.addTask({
    title: 'Water plants',
    dueAt: '2026-08-24T06:00:00.000Z',
    recurrence: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH',
  });

  const result = dbModule.completeTask(task.id);
  assert.equal(result.completed.id, task.id);
  assert.equal(result.nextTask.dueAt, '2026-08-27T06:00:00.000Z');
  assert.equal(result.nextTask.recurrence, task.recurrence);
});

test('tamamlanan iş arşivde görünür ve yeniden açılabilir', async () => {
  const task = dbModule.addTask({ title: 'Sunumu tamamla', notes: 'Son kontrol' });

  await request(app)
    .post(`/tasks/${task.id}/complete`)
    .type('form')
    .send({ returnTo: '/completed' })
    .expect(302)
    .expect('Location', '/completed');

  const archive = await request(app).get('/completed').expect(200);
  assert.match(archive.text, /Sunumu tamamla/);
  assert.match(archive.text, /İşi yeniden aç/);

  await request(app)
    .post(`/tasks/${task.id}/reopen`)
    .type('form')
    .send({ returnTo: '/inbox' })
    .expect(302)
    .expect('Location', '/inbox');

  const inbox = await request(app).get('/inbox').expect(200);
  assert.match(inbox.text, /Sunumu tamamla/);
});

test('bir iş tüm ayrıntılarıyla kopyalanabilir', () => {
  const original = dbModule.addTask({
    title: 'Bütçe kontrolü',
    notes: 'Q3 dosyası',
    project: 'finans',
    priority: 2,
  });
  const copy = dbModule.duplicateTask(original.id);

  assert.notEqual(copy.id, original.id);
  assert.equal(copy.title, original.title);
  assert.equal(copy.notes, original.notes);
  assert.equal(copy.project, original.project);
  assert.equal(copy.priority, original.priority);
});

test('due reminders are sent once and then marked', async () => {
  const task = dbModule.addTask({
    title: 'Call the dentist',
    dueAt: '2026-08-23T06:00:00.000Z',
    priority: 1,
  });
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response('{}', { status: 200 });
  };

  try {
    assert.equal(await reminders.checkDueTasks(new Date('2026-08-23T07:00:00.000Z')), 1);
    assert.equal(await reminders.checkDueTasks(new Date('2026-08-23T07:01:00.000Z')), 0);
    assert.equal(calls.length, 1);
    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.topic, 'local-tasks-test-topic');
    assert.equal(payload.message, task.title);
    assert.equal(payload.priority, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('the default web host is localhost only', async () => {
  const { config } = await import('../src/config.js');
  assert.equal(config.host, '127.0.0.1');
});

test('sağlık kontrolü veritabanı durumunu bildirir', async () => {
  const response = await request(app).get('/healthz').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'gerit');
});
