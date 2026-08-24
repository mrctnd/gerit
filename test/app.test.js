import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import request from 'supertest';

process.env.TZ = 'UTC';
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
  const { default: Database } = await import('better-sqlite3');
  const legacyDb = new Database(databasePath);
  legacyDb.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      project TEXT,
      priority INTEGER,
      due_at TEXT,
      recurrence TEXT,
      reminded_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO tasks (
      title, notes, completed_at, created_at, updated_at
    ) VALUES (
      'Eski tamamlanmış iş', '', '2026-08-22T09:00:00.000Z',
      '2026-08-20T09:00:00.000Z', '2026-08-22T09:00:00.000Z'
    );
  `);
  legacyDb.close();

  ({ parseQuickAdd } = await import('../src/parser.js'));
  recurrenceModule = await import('../src/recurrence.js');
  dbModule = await import('../src/db.js');
  ({ createApp: app } = await import('../src/app.js'));
  app = app();
  reminders = await import('../src/reminders.js');
});

test('eski veritabanı yeni iş akışı alanlarına veri kaybetmeden taşınır', () => {
  const migrated = dbModule.getTask(1);

  assert.equal(migrated.title, 'Eski tamamlanmış iş');
  assert.equal(migrated.status, 'completed');
  assert.equal(migrated.progress, 100);
  assert.equal(migrated.reminderAt, null);
  assert.deepEqual(dbModule.getTaskNotes(migrated.id), []);
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

test('iş aşaması, ilerleme ve özel hatırlatma ayrıntılarda saklanır', async () => {
  const task = dbModule.addTask({
    title: 'Yönetim sunumunu hazırla',
    notes: 'Son rakamları doğrula',
    project: 'yönetim',
    priority: 1,
    dueAt: '2026-08-28T13:00:00.000Z',
    reminderAt: '2026-08-27T06:00:00.000Z',
    status: 'in_progress',
    progress: 45,
  });

  assert.equal(task.status, 'in_progress');
  assert.equal(task.progress, 45);
  assert.equal(task.reminderAt, '2026-08-27T06:00:00.000Z');

  const workflow = await request(app).get('/workflow').expect(200);
  assert.match(workflow.text, /İş Akışı/);
  assert.match(workflow.text, /Yönetim sunumunu hazırla/);
  assert.match(workflow.text, /%45/);
  assert.match(workflow.text, /Devam ediyor/);
});

test('zaman damgalı çalışma notu eklenir ve aramada bulunur', async () => {
  const task = dbModule.addTask({ title: 'Tedarikçi görüşmesi', status: 'waiting' });

  await request(app)
    .post(`/tasks/${task.id}/notes`)
    .type('form')
    .send({ content: 'Revize fiyat tablosu cuma günü gelecek', returnTo: '/workflow' })
    .expect(302)
    .expect('Location', `/tasks/${task.id}/edit?from=%2Fworkflow`);

  const detail = await request(app).get(`/tasks/${task.id}/edit?from=/workflow`).expect(200);
  assert.match(detail.text, /Çalışma günlüğü/);
  assert.match(detail.text, /Revize fiyat tablosu cuma günü gelecek/);

  const search = await request(app).get('/search?q=Revize%20fiyat').expect(200);
  assert.match(search.text, /Tedarikçi görüşmesi/);
});

test('hatırlatma son tarihten sonra planlanamaz', async () => {
  const task = dbModule.addTask({ title: 'Teslim kontrolü' });

  const response = await request(app)
    .post(`/tasks/${task.id}`)
    .type('form')
    .send({
      title: task.title,
      dueAt: '2026-08-30T10:00',
      reminderAt: '2026-08-30T11:00',
      returnTo: '/workflow',
    })
    .expect(400);

  assert.match(response.text, /Hatırlatma zamanı son tarihten önce olmalı/);
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
    assert.match(payload.message, new RegExp(`^${task.title}`));
    assert.match(payload.message, /Planlandı · %0/);
    assert.equal(payload.priority, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('özel hatırlatma zamanı geldiğinde bildirim yalnızca bir kez gönderilir', async () => {
  const task = dbModule.addTask({
    title: 'Teklif dosyasını gözden geçir',
    dueAt: '2026-08-26T12:00:00.000Z',
    reminderAt: '2026-08-25T06:00:00.000Z',
    status: 'in_progress',
    progress: 70,
    priority: 2,
  });
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response('{}', { status: 200 });
  };

  try {
    assert.equal(await reminders.checkDueTasks(new Date('2026-08-25T06:00:00.000Z')), 1);
    assert.equal(await reminders.checkDueTasks(new Date('2026-08-25T06:01:00.000Z')), 0);
    assert.equal(calls.length, 1);
    assert.match(calls[0].title, /Gerit hatırlatması/);
    assert.match(calls[0].message, new RegExp(task.title));
    assert.match(calls[0].message, /Devam ediyor · %70/);
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

test('görünüm paneli yerel tema, font ve hareket seçeneklerini sunar', async () => {
  const response = await request(app).get('/today').expect(200);

  assert.match(response.text, /id="appearance-dialog"/);
  assert.match(response.text, /data-theme-option="forest"/);
  assert.match(response.text, /data-font-option="editorial"/);
  assert.match(response.text, /data-motion-option="reduced"/);
  assert.match(response.text, /src="\/preferences\.js\?v=[^"]+"/);
});

test('Gerit logosu uygulamanın kendi statik dosyası olarak sunulur', async () => {
  const response = await request(app).get('/brand/gerit-mark.png').expect(200);

  assert.match(response.headers['content-type'], /^image\/png/);
  assert.ok(response.body.length > 100_000);
});

test('görünüm değişimleri gecikmeli sayfa giriş animasyonu çalıştırmaz', () => {
  const clientScript = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.doesNotMatch(clientScript, /runEntranceSequence|page-transition|window\.location\.assign/);
});

test('arayüz dosyaları eski animasyon kodunu önbellekten kullanmaz', async () => {
  const response = await request(app).get('/app.js').expect(200);

  assert.match(response.headers['cache-control'], /no-cache/);
});
