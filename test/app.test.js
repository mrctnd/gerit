import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, before, test } from 'node:test';
import { DateTime } from 'luxon';
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
let serverRuntime;

before(async () => {
  const legacyDb = new DatabaseSync(databasePath);
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
    CREATE TABLE presales_cases (
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
    INSERT INTO tasks (
      title, notes, completed_at, created_at, updated_at
    ) VALUES (
      'Eski tamamlanmış iş', '', '2026-08-22T09:00:00.000Z',
      '2026-08-20T09:00:00.000Z', '2026-08-22T09:00:00.000Z'
    );
    INSERT INTO presales_cases (
      title, customer, manufacturer, product_family, proposed_model, created_at, updated_at
    ) VALUES (
      'Eski presales dosyası', 'Geçiş Kurumu', 'Lenovo', 'Rack sunucu', 'SR650 V4',
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
  serverRuntime = await import('../src/server-runtime.js');
});

test('eski veritabanı yeni iş akışı alanlarına veri kaybetmeden taşınır', () => {
  const migrated = dbModule.getTask(1);
  const migratedPresales = dbModule.getPresalesCase(1);

  assert.equal(migrated.title, 'Eski tamamlanmış iş');
  assert.equal(migrated.status, 'completed');
  assert.equal(migrated.progress, 100);
  assert.equal(migrated.reminderAt, null);
  assert.deepEqual(dbModule.getTaskNotes(migrated.id), []);
  assert.equal(migratedPresales.title, 'Eski presales dosyası');
  assert.deepEqual(migratedPresales.products.map((product) => ({
    manufacturer: product.manufacturer,
    productFamily: product.productFamily,
    proposedModel: product.proposedModel,
  })), [{ manufacturer: 'Lenovo', productFamily: 'Rack sunucu', proposedModel: 'SR650 V4' }]);
  assert.equal(migratedPresales.opportunityType, 'tender');
  assert.equal(migratedPresales.priority, 'normal');
  assert.equal(migratedPresales.currency, 'TRY');
  assert.equal(dbModule.getPresalesQualification(migratedPresales.id).items.length, 8);
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

test('presales dosyası ve kanıt kapıları yerel veritabanında saklanır', async () => {
  const createResponse = await request(app)
    .post('/presales')
    .type('form')
    .send({
      title: 'Kurum veri merkezi yenileme',
      customer: 'Örnek Kurum',
      tenderReference: '2026/SA-17',
      stage: 'estimated_cost',
      offerability: 'conditional',
      manufacturer: ['Lenovo', 'Cisco'],
      productFamily: ['Rack sunucu', 'Veri merkezi ağı'],
      proposedModel: ['ThinkSystem SR650 V4', 'Nexus 9364C'],
      competitors: 'Dell PowerEdge R770, HPE ProLiant DL380 Gen12',
      deadline: '2026-09-15T17:00',
      internalDeadline: '2026-09-14T12:00',
      opportunityType: 'tender',
      priority: 'critical',
      currency: 'USD',
      estimatedValue: '250000',
      estimatedCost: '210000',
      winProbability: '60',
      nextAction: 'Üreticiden bellek popülasyon teyidi al',
    })
    .expect(302);

  const location = createResponse.headers.location;
  assert.match(location, /^\/presales\/\d+$/);
  const caseId = Number(location.split('/').at(-1));

  await request(app)
    .post(`/presales/${caseId}/records`)
    .type('form')
    .send({
      recordType: 'requirement',
      referenceNo: '3.2.4',
      title: 'İki güç kaynağı teslim edilmesi',
      originalText: 'Sunucu iki adet güç kaynağı ile teslim edilecektir.',
      requirement: 'Cihaz başına iki adet PSU',
      offeredItem: 'ThinkSystem SR650 V4',
      sku: 'PSU-SKU-01',
      quantity: '2 / cihaz, toplam 8',
      complianceStatus: 'conditional',
      capabilityEvidence: 'Ürün kılavuzu iki PSU yuvasını gösteriyor.',
      inclusionEvidence: 'BOM satırında yalnız bir PSU görünüyor.',
      compatibilityEvidence: 'Aynı watt ve tip seçilmeli.',
      entitlementEvidence: 'Servis kapsamı ayrıca teyit edilecek.',
      sourceRef: 'Product Guide, Power supplies, erişim 2026-08-28',
      costImpact: 'İkinci PSU fiyatlandırılmalı.',
      responsibility: 'Güç kablosu ve PDU uyumu yüklenici kapsamında.',
      action: 'BOMa ikinci PSU ve güç kablosu ekle.',
      owner: 'Presales',
      confidence: 'high',
      riskProbability: '3',
      riskImpact: '3',
      evidenceGap: '2',
    })
    .expect(302)
    .expect('Location', new RegExp(`^/presales/${caseId}#record-\\d+$`));

  const presalesCase = dbModule.getPresalesCase(caseId);
  const records = dbModule.getPresalesRecords(caseId);
  assert.equal(presalesCase.customer, 'Örnek Kurum');
  assert.equal(presalesCase.stage, 'estimated_cost');
  assert.equal(presalesCase.priority, 'critical');
  assert.equal(presalesCase.estimatedValue, 250000);
  assert.equal(presalesCase.winProbability, 60);
  assert.equal(presalesCase.products.length, 2);
  assert.deepEqual(presalesCase.products.map((product) => product.manufacturer), ['Lenovo', 'Cisco']);
  assert.equal(presalesCase.products[1].proposedModel, 'Nexus 9364C');
  assert.equal(records.length, 1);
  assert.equal(records[0].complianceStatus, 'conditional');
  assert.match(records[0].inclusionEvidence, /yalnız bir PSU/);
  assert.equal(dbModule.getPresalesCaseMetrics(caseId).types.requirement, 1);

  const page = await request(app).get(`/presales/${caseId}`).expect(200);
  assert.match(page.text, /Kurum veri merkezi yenileme/);
  assert.match(page.text, /Şartlı Uygun/);
  assert.match(page.text, /Yaklaşık maliyet çalışması/);
  assert.match(page.text, /Nexus 9364C/);
  assert.match(page.text, /250\.000/);
  assert.match(page.text, /Karar hazırlığı/);
  assert.match(page.text, /Paydaş haritası/);
  assert.match(page.text, /Proje aksiyonları/);
  assert.match(page.text, /data-add-product/);
  assert.match(page.text, /4\/4 kanıt kapısı/);
  assert.match(page.text, /Kritik · 11/);

  const search = await request(app).get('/search?q=PSU-SKU-01').expect(200);
  assert.match(search.text, /Kurum veri merkezi yenileme/);
  const productSearch = await request(app).get('/search?q=Nexus%209364C').expect(200);
  assert.match(productSearch.text, /Kurum veri merkezi yenileme/);

  const exported = await request(app).get(`/presales/${caseId}/export`).expect(200);
  assert.equal(exported.body.case.id, caseId);
  assert.equal(exported.body.schemaVersion, 3);
  assert.equal(exported.body.case.products.length, 2);
  assert.equal(exported.body.records[0].sku, 'PSU-SKU-01');
  assert.deepEqual(exported.body.qualification.items.length, 8);
  assert.deepEqual(exported.body.stakeholders, []);
  assert.deepEqual(exported.body.actions, []);

  await request(app)
    .post(`/presales/${caseId}`)
    .type('form')
    .send({
      title: 'Kurum veri merkezi yenileme',
      customer: 'Örnek Kurum',
      stage: 'estimated_cost',
      manufacturer: 'HPE',
      productFamily: 'Rack sunucu',
      proposedModel: 'ProLiant DL380 Gen12',
    })
    .expect(302)
    .expect('Location', `/presales/${caseId}`);
  const updatedProducts = dbModule.getPresalesCase(caseId).products;
  assert.equal(updatedProducts.length, 1);
  assert.equal(updatedProducts[0].manufacturer, 'HPE');
});

test('presales yeterlilik, paydaş ve aksiyon planı uçtan uca izlenir', async () => {
  const presalesCase = dbModule.addPresalesCase({
    title: 'Kamu bulut altyapısı',
    customer: 'Karar Kurumu',
    tenderReference: 'SA-CONTROL-1',
    priority: 'high',
    currency: 'EUR',
    estimatedValue: '800000',
    estimatedCost: '650000',
    winProbability: '45',
    deadline: '2026-09-05T14:00:00.000Z',
  });

  await request(app)
    .post(`/presales/${presalesCase.id}/qualification`)
    .type('form')
    .send({
      qualificationDimension: ['metrics', 'economic_buyer', 'decision_criteria', 'decision_process', 'paper_process', 'pain', 'champion', 'competition'],
      qualificationStatus: ['confirmed', 'partial', 'confirmed', 'partial', 'blocked', 'confirmed', 'confirmed', 'partial'],
      qualificationNotes: ['%20 enerji tasarrufu', 'Bütçe sahibiyle toplantı bekleniyor', 'Teknik puanlama alındı', 'Demo sonrası kurul', 'Sözleşme taslağı eksik', 'Kapasite yetersizliği', 'Ayşe Hanım destekliyor', 'Rakip fiyat bekleniyor'],
    })
    .expect(302)
    .expect('Location', `/presales/${presalesCase.id}#qualification`);

  await request(app)
    .post(`/presales/${presalesCase.id}/stakeholders`)
    .type('form')
    .send({
      name: 'Ayşe Karar',
      organization: 'Bilgi İşlem',
      role: 'champion',
      influence: 'high',
      stance: 'supportive',
      contact: 'ayse@example.local',
      notes: 'Teknik değerlendirmeyi koordine ediyor',
    })
    .expect(302);

  const actionResponse = await request(app)
    .post(`/presales/${presalesCase.id}/actions`)
    .type('form')
    .send({
      title: 'Gold review ve son BOM kontrolü',
      owner: 'Presales',
      status: 'in_progress',
      priority: '1',
      dueAt: '2026-09-02T12:00',
      reminderAt: '2026-09-02T09:00',
      notes: 'Fiyat, entitlement ve kablo adetlerini kilitle',
    })
    .expect(302);
  assert.match(actionResponse.headers.location, new RegExp(`^/presales/${presalesCase.id}#action-\\d+$`));

  const qualification = dbModule.getPresalesQualification(presalesCase.id);
  const stakeholders = dbModule.getPresalesStakeholders(presalesCase.id);
  const actions = dbModule.getPresalesActions(presalesCase.id);
  assert.equal(qualification.score, 69);
  assert.equal(qualification.blockers, 1);
  assert.equal(stakeholders[0].role, 'champion');
  assert.equal(actions[0].priority, 1);
  assert.equal(actions[0].status, 'in_progress');

  await request(app)
    .post(`/presales/${presalesCase.id}/stakeholders/${stakeholders[0].id}`)
    .type('form')
    .send({ name: 'Ayşe Karar', organization: 'Bilgi İşlem', role: 'champion', influence: 'high', stance: 'supportive', contact: 'ayse@example.local', notes: 'Teknik ve ticari süreci koordine ediyor' })
    .expect(302);
  await request(app)
    .post(`/presales/${presalesCase.id}/actions/${actions[0].id}`)
    .type('form')
    .send({ title: actions[0].title, owner: 'Presales', status: 'waiting', priority: '1', dueAt: '2026-09-02T12:00', reminderAt: '2026-09-02T09:00', notes: 'Distribütör fiyatı bekleniyor' })
    .expect(302);
  assert.equal(dbModule.getPresalesActions(presalesCase.id)[0].status, 'waiting');

  const page = await request(app).get(`/presales/${presalesCase.id}`).expect(200);
  assert.match(page.text, /Ayşe Karar/);
  assert.match(page.text, /Gold review ve son BOM kontrolü/);
  assert.match(page.text, /%69/);
  assert.match(page.text, /Sözleşme taslağı eksik/);

  const attention = await request(app).get('/presales/attention').expect(200);
  assert.match(attention.text, /Aksiyon ve Uyarı Merkezi/);
  assert.match(attention.text, /Gold review ve son BOM kontrolü/);
  assert.match(attention.text, /Satın alma süreci/);

  const search = await request(app).get('/search?q=Ayşe%20Karar').expect(200);
  assert.match(search.text, /Kamu bulut altyapısı/);
  const actionSearch = await request(app).get('/search?q=Gold%20review').expect(200);
  assert.match(actionSearch.text, /Kamu bulut altyapısı/);

  const exported = await request(app).get(`/presales/${presalesCase.id}/export`).expect(200);
  assert.equal(exported.body.schemaVersion, 3);
  assert.equal(exported.body.qualification.blockers, 1);
  assert.equal(exported.body.stakeholders[0].name, 'Ayşe Karar');
  assert.equal(exported.body.actions[0].title, 'Gold review ve son BOM kontrolü');
});

test('presales hatırlatması terminden sonra planlanamaz', async () => {
  const response = await request(app)
    .post('/presales')
    .type('form')
    .send({
      title: 'Geçersiz termin dosyası',
      deadline: '2026-09-10T10:00',
      reminderAt: '2026-09-10T11:00',
    })
    .expect(400);

  assert.match(response.text, /Dosya hatırlatması zamanı son tarihten önce olmalı/);
});

test('presales iç teslim tarihi müşteri termininden önce olmalıdır', async () => {
  const response = await request(app)
    .post('/presales')
    .type('form')
    .send({
      title: 'Geçersiz iç termin dosyası',
      deadline: '2026-09-10T10:00',
      internalDeadline: '2026-09-10T11:00',
    })
    .expect(400);

  assert.match(response.text, /İç teslim tarihi müşteri son teslim tarihinden önce olmalı/);
});

test('presales dosya hatırlatması yerel bildirim olarak yalnızca bir kez gönderilir', async () => {
  const presalesCase = dbModule.addPresalesCase({
    title: 'Üretici teyit toplantısı',
    customer: 'Yerel Bildirim Kurumu',
    tenderReference: 'SA-NOTIFY-1',
    deadline: '2026-08-21T09:00:00.000Z',
    reminderAt: '2026-08-20T09:00:00.000Z',
    nextAction: 'BOM ve lisans teyitlerini kapat',
  });
  const payloads = [];

  await reminders.checkDueTasks(
    new Date('2026-08-20T09:00:00.000Z'),
    async (payload) => payloads.push(payload),
  );
  await reminders.checkDueTasks(
    new Date('2026-08-20T09:01:00.000Z'),
    async (payload) => payloads.push(payload),
  );

  const matching = payloads.filter((payload) => payload.message.includes(presalesCase.title));
  assert.equal(matching.length, 1);
  assert.match(matching[0].title, /Presales hatırlatması/);
  assert.match(matching[0].message, /BOM ve lisans teyitlerini kapat/);
  assert.ok(dbModule.getPresalesCase(presalesCase.id).reminderSentAt);
});

test('presales aksiyon hatırlatması ilgili proje bağlantısıyla yalnızca bir kez gönderilir', async () => {
  const presalesCase = dbModule.addPresalesCase({
    title: 'Aksiyon bildirim projesi',
    customer: 'Bildirim Kurumu',
  });
  const action = dbModule.addPresalesAction(presalesCase.id, {
    title: 'Teknik uygunluk matrisini kapat',
    status: 'open',
    priority: 1,
    dueAt: '2026-08-31T12:00:00.000Z',
    reminderAt: '2026-08-31T09:00:00.000Z',
  });
  const payloads = [];

  await reminders.checkDueTasks(new Date('2026-08-31T09:00:00.000Z'), async (payload) => payloads.push(payload));
  await reminders.checkDueTasks(new Date('2026-08-31T09:01:00.000Z'), async (payload) => payloads.push(payload));

  const matching = payloads.filter((payload) => payload.message.includes(action.title));
  assert.equal(matching.length, 1);
  assert.equal(matching[0].route, `/presales/${presalesCase.id}#action-${action.id}`);
  assert.ok(dbModule.getPresalesAction(action.id).reminderSentAt);
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

test('masaüstü sürümü hatırlatmayı dış servis olmadan yerel yayıncıya gönderir', async () => {
  const task = dbModule.addTask({
    title: 'Yerel masaüstü bildirimi',
    dueAt: '2026-08-29T12:00:00.000Z',
    reminderAt: '2026-08-28T06:00:00.000Z',
    status: 'planned',
  });
  const payloads = [];

  await reminders.checkDueTasks(
    new Date('2026-08-28T06:00:00.000Z'),
    async (payload) => payloads.push(payload),
  );

  const payload = payloads.find((item) => item.message.includes(task.title));
  assert.ok(payload);
  assert.match(payload.title, /Gerit hatırlatması/);
  assert.ok(dbModule.getTask(task.id).reminderSentAt);
});

test('başarısız bildirim hatırlatmayı gönderilmiş olarak işaretlemez', async () => {
  const task = dbModule.addTask({
    title: 'Gönderilemeyen yerel bildirim',
    dueAt: '2026-08-29T12:00:00.000Z',
    reminderAt: '2026-08-28T06:00:00.000Z',
  });

  await assert.rejects(
    reminders.checkDueTasks(new Date('2026-08-28T06:00:00.000Z'), async () => false),
    /Bildirim gönderilemedi/,
  );

  assert.equal(dbModule.getTask(task.id).reminderSentAt, null);
});

test('günlük özet bildirimi aynı gün yalnızca bir kez gönderilir', async () => {
  dbModule.addTask({
    title: 'Günlük özet kontrolü',
    dueAt: '2026-08-28T08:00:00.000Z',
  });
  const payloads = [];
  const reference = DateTime.fromISO('2026-08-28T10:00:00', { zone: 'Europe/Istanbul' });

  assert.equal(await reminders.sendMorningDigestOnce(reference, async (payload) => payloads.push(payload)), true);
  assert.equal(await reminders.sendMorningDigestOnce(reference.plus({ hours: 1 }), async (payload) => payloads.push(payload)), false);
  assert.equal(payloads.length, 1);
  assert.match(payloads[0].title, /Gerit/);
  assert.match(payloads[0].message, /Günlük özet kontrolü/);
  assert.match(payloads[0].message, /Presales:/);
  assert.equal(payloads[0].route, '/presales/attention');
});

test('bildirim düzeni yerelde saklanır ve sessiz saatler doğru hesaplanır', async () => {
  await request(app)
    .post('/notifications/settings')
    .type('form')
    .send({
      returnTo: '/presales/attention',
      dailyDigest: 'on',
      digestHour: '9',
      includePresales: 'on',
      quietHoursEnabled: 'on',
      quietStart: '22',
      quietEnd: '7',
    })
    .expect(302)
    .expect('Location', '/presales/attention');

  assert.deepEqual(dbModule.getNotificationPreferences(), {
    dailyDigest: true,
    digestHour: 9,
    includePresales: true,
    quietHoursEnabled: true,
    quietStart: 22,
    quietEnd: 7,
  });
  assert.equal(reminders.isQuietHour(new Date('2026-08-30T20:30:00.000Z'), dbModule.getNotificationPreferences()), true);
  assert.equal(reminders.isQuietHour(new Date('2026-08-30T08:00:00.000Z'), dbModule.getNotificationPreferences()), false);

  const page = await request(app).get('/presales/attention').expect(200);
  assert.match(page.text, /name="quietHoursEnabled" checked/);
  assert.match(page.text, /name="digestHour" min="0" max="23" value="9"/);

  dbModule.saveNotificationPreferences({
    dailyDigest: true,
    digestHour: 7,
    includePresales: true,
    quietHoursEnabled: false,
    quietStart: 22,
    quietEnd: 7,
  });
});

test('bildirim deneme aksiyonu yapılandırılmış yayıncıya gönderir', async () => {
  const payloads = [];
  const runtime = await serverRuntime.startGeritServer({
    host: '127.0.0.1',
    port: 0,
    reminders: false,
    reminderPublisher: async (payload) => payloads.push(payload),
    log: false,
  });

  try {
    await request(runtime.app)
      .post('/notifications/test')
      .type('form')
      .send({ returnTo: '/today' })
      .expect(302)
      .expect('Location', '/today');
  } finally {
    await runtime.close();
  }

  assert.equal(payloads.length, 1);
  assert.match(payloads[0].title, /Gerit bildirimi hazır/);
});

test('masaüstü çalışma zamanı boş bir localhost portunda açılıp temiz kapanır', async () => {
  const runtime = await serverRuntime.startGeritServer({
    host: '127.0.0.1',
    port: 0,
    reminders: false,
    log: false,
  });

  try {
    const response = await fetch(`${runtime.url}/healthz`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
    assert.equal(runtime.databasePath, databasePath);
  } finally {
    await runtime.close();
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
  assert.match(response.text, /data-motion-preview-marker/);
  assert.match(response.text, /data-scale-input/);
  assert.match(response.text, /src="\/preferences\.js\?v=[^"]+"/);
  assert.match(response.text, /action="\/notifications\/test"/);
});

test('appearance preferences persist in SQLite and render on the next page load', async () => {
  const saveResponse = await request(app)
    .post('/api/preferences/appearance')
    .send({ theme: 'forest', font: 'mono', motion: 'reduced', scale: 135 })
    .expect(200);

  assert.deepEqual(saveResponse.body.appearance, {
    theme: 'forest',
    font: 'mono',
    motion: 'reduced',
    scale: 135,
  });
  assert.deepEqual(dbModule.getAppearancePreferences(), saveResponse.body.appearance);

  const response = await request(app).get('/today').expect(200);
  assert.match(response.text, /<html lang="tr" data-theme="forest" data-font="mono" data-motion="reduced" data-scale="135">/);
  assert.match(response.text, /data-theme-option="forest" aria-pressed="true"/);
  assert.match(response.text, /data-font-option="mono" aria-pressed="true"/);
  assert.match(response.text, /data-motion-option="reduced" aria-pressed="true"/);
  assert.match(response.text, /data-scale-input type="range" min="80" max="160" step="5" value="135"/);
  assert.match(response.text, /yerel veritaban/);

  const clamped = await request(app)
    .post('/api/preferences/appearance')
    .send({ theme: 'forest', font: 'mono', motion: 'full', scale: 999 })
    .expect(200);
  assert.equal(clamped.body.appearance.scale, 160);
});

test('Gerit logosu uygulamanın kendi statik dosyası olarak sunulur', async () => {
  const response = await request(app).get('/brand/gerit-mark.png').expect(200);

  assert.match(response.headers['content-type'], /^image\/png/);
  assert.ok(response.body.length > 100_000);
});

test('görünüm ölçeği ve hareket profilleri yerel istemcide uygulanır', () => {
  const clientScript = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.match(clientScript, /function applyScale/);
  assert.match(clientScript, /function motionProfile/);
  assert.match(clientScript, /function revealWorkspace/);
  assert.match(clientScript, /data-product-editor/);
  assert.doesNotMatch(clientScript, /page-transition|window\.location\.assign/);
  assert.doesNotMatch(clientScript, /localStorage/);
});

test('arayüz dosyaları eski animasyon kodunu önbellekten kullanmaz', async () => {
  const response = await request(app).get('/app.js').expect(200);

  assert.match(response.headers['cache-control'], /no-cache/);
});
