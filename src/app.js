import path from 'node:path';
import express from 'express';
import { appRoot, config } from './config.js';
import {
  getAppearancePreferences,
  addPresalesCase,
  addPresalesRecord,
  addTaskNote,
  addTask,
  completeTask,
  deleteTask,
  duplicateTask,
  getCompletedTasks,
  getCounts,
  getInboxTasks,
  getProjectTasks,
  getProjects,
  getPresalesCase,
  getPresalesCaseMetrics,
  getPresalesCases,
  getPresalesDashboardSummary,
  getPresalesExport,
  getPresalesRecord,
  getPresalesRecords,
  getTask,
  getTodayTasks,
  getUpcomingTasks,
  getWorkflowTasks,
  getWorkSummary,
  getTaskNotes,
  healthCheck,
  reopenTask,
  searchPresales,
  searchTasks,
  saveAppearancePreferences,
  deletePresalesCase,
  deletePresalesRecord,
  updatePresalesCase,
  updatePresalesRecord,
  updateTask,
} from './db.js';
import {
  activityLabel,
  dayHeading,
  completedLabel,
  dueMeta,
  now,
  todayRange,
  toDateTimeInput,
  toUtcIso,
  upcomingRange,
} from './dates.js';
import { parseQuickAdd } from './parser.js';
import { describeRecurrence, parseRecurrence } from './recurrence.js';
import { publishNotification } from './reminders.js';
import {
  COMPLIANCE_STATUSES,
  CONFIDENCE_LEVELS,
  OFFERABILITY_STATUSES,
  PRESALES_RECORD_TYPES,
  PRESALES_STAGES,
  RESPONSE_MODES,
  complianceStatusMeta,
  offerabilityMeta,
  presalesRecordTypeMeta,
  presalesStageMeta,
  riskMeta,
} from './presales.js';
import { TASK_STATUSES, normalizeProgress, taskStatusMeta } from './workflow.js';

export function createApp({ notificationPublisher } = {}) {
  const app = express();
  const assetVersion = Date.now().toString(36);
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(appRoot, 'views'));

  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(express.json({ limit: '8kb' }));
  app.use(express.static(path.join(appRoot, 'public'), {
    maxAge: 0,
    etag: true,
    setHeaders(res, filePath) {
      if (['.js', '.css'].includes(path.extname(filePath).toLowerCase())) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));

  app.get('/healthz', (_req, res) => {
    try {
      healthCheck();
      res.json({ status: 'ok', service: 'gerit', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', service: 'gerit' });
    }
  });

  app.use((req, res, next) => {
    const today = todayRange();
    const upcoming = upcomingRange();
    const reference = now();
    res.locals.projects = getProjects();
    res.locals.counts = getCounts(today.start, upcoming.end);
    res.locals.summary = getWorkSummary(today.start, today.end, new Date().toISOString());
    res.locals.presalesSummary = getPresalesDashboardSummary(
      reference.toUTC().toISO(),
      reference.plus({ days: 7 }).toUTC().toISO(),
    );
    res.locals.currentPath = req.path;
    res.locals.returnPath = req.originalUrl;
    res.locals.appearancePreferences = getAppearancePreferences();
    res.locals.config = {
      timezone: config.timezone,
      notificationsEnabled: config.desktopApp || Boolean(config.ntfyTopic),
      notificationMode: config.desktopApp ? 'desktop' : config.ntfyTopic ? 'ntfy' : 'off',
    };
    res.locals.taskStatuses = TASK_STATUSES;
    res.locals.presalesStages = PRESALES_STAGES;
    res.locals.offerabilityStatuses = OFFERABILITY_STATUSES;
    res.locals.presalesRecordTypes = PRESALES_RECORD_TYPES;
    res.locals.complianceStatuses = COMPLIANCE_STATUSES;
    res.locals.confidenceLevels = CONFIDENCE_LEVELS;
    res.locals.responseModes = RESPONSE_MODES;
    res.locals.assetVersion = assetVersion;
    res.locals.encodeURIComponent = encodeURIComponent;
    res.locals.toDateTimeInput = toDateTimeInput;
    res.locals.describeRecurrence = describeRecurrence;
    next();
  });

  app.get('/', (_req, res) => res.redirect('/today'));

  app.get('/api/preferences/appearance', (_req, res) => {
    res.json({ appearance: getAppearancePreferences() });
  });

  app.post('/api/preferences/appearance', (req, res, next) => {
    try {
      res.json({ appearance: saveAppearancePreferences(req.body) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/notifications/test', async (req, res, next) => {
    try {
      const sent = await publishNotification({
        title: 'Gerit bildirimi hazır',
        message: 'Görev ve presales hatırlatmaları bu bilgisayarda yerel olarak gösterilecek.',
        priority: '3',
        tags: 'bell,clipboard',
      }, notificationPublisher);

      if (!sent) throw new Error('Bildirimler etkin değil.');
      res.redirect(safeReturnTo(req.body.returnTo, '/today'));
    } catch (error) {
      next(error);
    }
  });

  app.get('/presales', (_req, res) => {
    renderPage(res, {
      title: 'Presales Merkezi',
      kicker: 'Fırsat, şartname, BOM ve teklif takibi',
      kind: 'presales-dashboard',
      cases: getPresalesCases().map(decoratePresalesCase),
    });
  });

  app.post('/presales', (req, res, next) => {
    try {
      const payload = presalesCasePayload(req.body);
      validateReminder(payload.reminderAt, payload.deadline, 'Dosya hatırlatması');
      const presalesCase = addPresalesCase(payload);
      res.redirect(`/presales/${presalesCase.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.get('/presales/:id/export', (req, res, next) => {
    const data = getPresalesExport(Number(req.params.id));
    if (!data) return next();
    const name = fileSlug(data.case.title) || `dosya-${data.case.id}`;
    res.setHeader('Content-Disposition', `attachment; filename="gerit-presales-${name}.json"`);
    res.type('application/json').send(JSON.stringify(data, null, 2));
  });

  app.get('/presales/:id', (req, res, next) => {
    const presalesCase = getPresalesCase(Number(req.params.id));
    if (!presalesCase) return next();
    renderPage(res, {
      title: presalesCase.title,
      kicker: [presalesCase.customer, presalesCase.tenderReference].filter(Boolean).join(' · ') || 'Presales dosyası',
      kind: 'presales-case',
      presalesCase: decoratePresalesCase(presalesCase),
      records: getPresalesRecords(presalesCase.id).map(decoratePresalesRecord),
      metrics: getPresalesCaseMetrics(presalesCase.id),
    });
  });

  app.post('/presales/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const payload = presalesCasePayload(req.body);
      validateReminder(payload.reminderAt, payload.deadline, 'Dosya hatırlatması');
      const updated = updatePresalesCase(id, payload);
      if (!updated) return next();
      res.redirect(`/presales/${id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:id/delete', (req, res, next) => {
    try {
      deletePresalesCase(Number(req.params.id));
      res.redirect('/presales');
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:id/records', (req, res, next) => {
    try {
      const caseId = Number(req.params.id);
      const payload = presalesRecordPayload(req.body);
      validateReminder(payload.reminderAt, payload.dueAt, 'Aksiyon hatırlatması');
      const record = addPresalesRecord(caseId, payload);
      if (!record) return next();
      res.redirect(`/presales/${caseId}#record-${record.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:caseId/records/:recordId', (req, res, next) => {
    try {
      const caseId = Number(req.params.caseId);
      const recordId = Number(req.params.recordId);
      const existing = getPresalesRecord(recordId);
      if (!existing || existing.caseId !== caseId) return next();
      const payload = presalesRecordPayload(req.body);
      validateReminder(payload.reminderAt, payload.dueAt, 'Aksiyon hatırlatması');
      updatePresalesRecord(recordId, payload);
      res.redirect(`/presales/${caseId}#record-${recordId}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:caseId/records/:recordId/delete', (req, res, next) => {
    try {
      const caseId = Number(req.params.caseId);
      const record = getPresalesRecord(Number(req.params.recordId));
      if (!record || record.caseId !== caseId) return next();
      deletePresalesRecord(record.id);
      res.redirect(`/presales/${caseId}`);
    } catch (error) {
      next(error);
    }
  });

  app.get('/today', (_req, res) => {
    const range = todayRange();
    const tasks = decorateTasks(getTodayTasks(range.start, range.end));
    const overdue = tasks.filter((task) => task.due.overdue);
    const dueToday = tasks.filter((task) => !task.due.overdue);
    const groups = [];
    if (overdue.length) groups.push({ title: 'Gecikenler', tone: 'danger', tasks: overdue });
    groups.push({ title: 'Bugün', tone: 'default', tasks: dueToday });

    renderPage(res, {
      title: 'Bugün',
      kicker: now().toFormat('d LLLL cccc'),
      kind: 'grouped',
      groups,
      emptyTitle: 'Bugün için iş kalmadı',
      emptyCopy: 'Günün tamamen açık. Yeni bir iş çıktığında yukarıdan hızla ekleyebilirsin.',
    });
  });

  app.get('/upcoming', (_req, res) => {
    const range = upcomingRange();
    const tasks = decorateTasks(getUpcomingTasks(range.start, range.end));
    const byDate = new Map();
    for (const task of tasks) {
      if (!byDate.has(task.due.dateKey)) byDate.set(task.due.dateKey, []);
      byDate.get(task.due.dateKey).push(task);
    }

    renderPage(res, {
      title: 'Yaklaşan',
      kicker: 'Önümüzdeki yedi gün',
      kind: 'grouped',
      groups: [...byDate.entries()].map(([date, dayTasks]) => ({
        title: dayHeading(date),
        tone: 'default',
        tasks: dayTasks,
      })),
      emptyTitle: 'Takvim şimdilik açık',
      emptyCopy: 'Önümüzdeki yedi güne tarih verdiğin işler burada gün gün sıralanacak.',
    });
  });

  app.get('/inbox', (_req, res) => {
    renderPage(res, {
      title: 'Gelen Kutusu',
      kicker: 'Henüz tarih vermediğin işler',
      kind: 'list',
      tasks: decorateTasks(getInboxTasks()),
      emptyTitle: 'Gelen kutusu tertemiz',
      emptyCopy: 'Tarih vermeden hızlıca eklediğin işler burada bekler.',
    });
  });

  app.get('/workflow', (_req, res) => {
    const tasks = decorateTasks(getWorkflowTasks());
    const statusOrder = ['in_progress', 'planned', 'waiting', 'blocked'];
    renderPage(res, {
      title: 'İş Akışı',
      kicker: 'Aşamalar ve ilerleme',
      kind: 'grouped',
      groups: statusOrder.map((status) => {
        const meta = taskStatusMeta(status);
        return {
          title: meta.label,
          tone: status === 'blocked' ? 'danger' : 'default',
          tasks: tasks.filter((task) => task.status === status),
        };
      }),
      emptyTitle: 'Takip edilecek açık iş yok',
      emptyCopy: 'Yeni bir iş eklediğinde aşamasını ve ilerleme yüzdesini buradan izleyebilirsin.',
    });
  });

  app.get('/completed', (_req, res) => {
    renderPage(res, {
      title: 'Tamamlananlar',
      kicker: 'Son tamamlanan 100 iş',
      kind: 'list',
      tasks: decorateTasks(getCompletedTasks()),
      emptyTitle: 'Henüz tamamlanan iş yok',
      emptyCopy: 'Bitirdiğin işler, gerektiğinde yeniden açabilmen için burada saklanır.',
      isArchive: true,
    });
  });

  app.get('/projects/:project', (req, res) => {
    const project = req.params.project;
    renderPage(res, {
      title: `#${project}`,
      kicker: 'Proje',
      kind: 'list',
      tasks: decorateTasks(getProjectTasks(project)),
      emptyTitle: `#${project} projesinde açık iş yok`,
      emptyCopy: 'Hızlı ekleme satırına proje etiketini yazarak yeni bir iş oluşturabilirsin.',
      project,
    });
  });

  app.get('/search', (req, res) => {
    const query = String(req.query.q || '').trim();
    renderPage(res, {
      title: query ? `Arama: ${query}` : 'Arama',
      kicker: query ? 'Aramana uyan açık işler' : 'Başlık, not ve projelerde ara',
      kind: 'list',
      tasks: query ? decorateTasks(searchTasks(query)) : [],
      presalesResults: query ? searchPresales(query).map(decoratePresalesCase) : [],
      searchQuery: query,
      emptyTitle: query ? 'Eşleşme bulunamadı' : 'Yukarıdan aramaya başla',
      emptyCopy: query ? 'Daha kısa bir ifade, not ya da proje adı deneyebilirsin.' : 'Herhangi bir ekranda / tuşuyla aramaya geçebilirsin.',
    });
  });

  app.get('/tasks/:id/edit', (req, res, next) => {
    const task = getTask(Number(req.params.id));
    if (!task) return next();
    renderPage(res, {
      title: 'İşi düzenle',
      kicker: task.completedAt ? 'Tamamlanmış iş' : 'İş ayrıntıları',
      kind: 'edit',
      task: decorateTask(task),
      taskNotes: getTaskNotes(task.id).map((note) => ({
        ...note,
        createdLabel: activityLabel(note.createdAt),
      })),
      returnTo: safeReturnTo(req.query.from, '/today'),
    });
  });

  app.post('/tasks', (req, res, next) => {
    try {
      const parsed = parseQuickAdd(req.body.quick);
      let recurrence = parsed.recurrence;
      if (req.body.repeat?.trim()) {
        const repeat = parseRecurrence(req.body.repeat);
        if (!repeat.rrule) throw new Error('“her ayın 1’i”, “her pazartesi,perşembe” ya da geçerli bir RRULE kullan.');
        recurrence = repeat.rrule;
      }
      const reminderAt = toUtcIso(req.body.reminderAt);
      validateReminder(reminderAt, parsed.dueAt);
      addTask({
        ...parsed,
        notes: req.body.notes,
        recurrence,
        status: req.body.status,
        reminderAt,
      });
      res.redirect(safeReturnTo(req.body.returnTo, '/today'));
    } catch (error) {
      next(error);
    }
  });

  app.post('/tasks/:id/complete', (req, res, next) => {
    try {
      completeTask(Number(req.params.id));
      res.redirect(safeReturnTo(req.body.returnTo, '/today'));
    } catch (error) {
      next(error);
    }
  });

  app.post('/tasks/:id/reopen', (req, res, next) => {
    try {
      reopenTask(Number(req.params.id));
      res.redirect(safeReturnTo(req.body.returnTo, '/completed'));
    } catch (error) {
      next(error);
    }
  });

  app.post('/tasks/:id/duplicate', (req, res, next) => {
    try {
      const copy = duplicateTask(Number(req.params.id));
      if (!copy) return next();
      const returnTo = safeReturnTo(req.body.returnTo, '/today');
      res.redirect(`/tasks/${copy.id}/edit?from=${encodeURIComponent(returnTo)}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/tasks/:id', (req, res, next) => {
    try {
      const recurrenceInput = req.body.recurrence?.trim();
      const recurrence = recurrenceInput ? parseRecurrence(recurrenceInput) : { rrule: null };
      if (recurrenceInput && !recurrence.rrule) {
        throw new Error('“her ayın 1’i”, “her pazartesi,perşembe” ya da geçerli bir RRULE kullan.');
      }

      const dueAt = toUtcIso(req.body.dueAt);
      const reminderAt = toUtcIso(req.body.reminderAt);
      validateReminder(reminderAt, dueAt);
      updateTask(Number(req.params.id), {
        title: req.body.title || '',
        notes: req.body.notes || '',
        project: req.body.project || null,
        priority: req.body.priority || null,
        dueAt,
        recurrence: recurrence.rrule,
        status: req.body.status,
        progress: req.body.progress,
        reminderAt,
      });
      res.redirect(safeReturnTo(req.body.returnTo, '/today'));
    } catch (error) {
      next(error);
    }
  });

  app.post('/tasks/:id/notes', (req, res, next) => {
    try {
      const taskId = Number(req.params.id);
      const note = addTaskNote(taskId, req.body.content);
      if (!note) return next();
      const returnTo = safeReturnTo(req.body.returnTo, '/today');
      res.redirect(`/tasks/${taskId}/edit?from=${encodeURIComponent(returnTo)}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/tasks/:id/delete', (req, res, next) => {
    try {
      deleteTask(Number(req.params.id));
      res.redirect(safeReturnTo(req.body.returnTo, '/today'));
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res) => {
    res.status(404);
    renderPage(res, {
      title: 'Sayfa bulunamadı',
      kicker: '404',
      kind: 'message',
      emptyTitle: 'Bu sayfa yerinde değil',
      emptyCopy: 'Bugün ekranına dönüp işlerine devam edebilirsin.',
    });
  });

  app.use((error, _req, res, _next) => {
    const message = error.message || '';
    const badRequest = message.includes('gerekli')
      || message.includes('RRULE')
      || message.toLocaleLowerCase('tr-TR').includes('hatırlatma')
      || message.includes('Bildirim');
    if (!badRequest) console.error(error);
    res.status(badRequest ? 400 : 500);
    renderPage(res, {
      title: 'Bir şeyler ters gitti',
      kicker: 'Değişiklik kaydedilemedi',
      kind: 'message',
      emptyTitle: error.message || 'Beklenmeyen hata',
      emptyCopy: 'Geri dönüp yeniden deneyebilirsin.',
    });
  });

  return app;
}

function decorateTasks(tasks) {
  return tasks.map(decorateTask);
}

function decorateTask(task) {
  return {
    ...task,
    due: dueMeta(task.dueAt),
    reminder: dueMeta(task.reminderAt),
    repeatLabel: describeRecurrence(task.recurrence),
    completedLabel: completedLabel(task.completedAt),
    statusMeta: taskStatusMeta(task.status, task.completedAt),
    progress: task.completedAt ? 100 : normalizeProgress(task.progress),
  };
}

function decoratePresalesCase(presalesCase) {
  return {
    ...presalesCase,
    deadlineMeta: dueMeta(presalesCase.deadline),
    reminderMeta: dueMeta(presalesCase.reminderAt),
    stageMeta: presalesStageMeta(presalesCase.stage),
    offerabilityMeta: offerabilityMeta(presalesCase.offerability),
  };
}

function decoratePresalesRecord(record) {
  return {
    ...record,
    typeMeta: presalesRecordTypeMeta(record.recordType),
    complianceMeta: complianceStatusMeta(record.complianceStatus),
    risk: riskMeta(record.riskProbability, record.riskImpact, record.evidenceGap),
    dueMeta: dueMeta(record.dueAt),
    reminderMeta: dueMeta(record.reminderAt),
  };
}

function presalesCasePayload(body) {
  return {
    title: body.title,
    customer: body.customer,
    tenderReference: body.tenderReference,
    stage: body.stage,
    offerability: body.offerability,
    owner: body.owner,
    products: presalesProductsPayload(body),
    competitors: body.competitors,
    deadline: toUtcIso(body.deadline),
    reminderAt: toUtcIso(body.reminderAt),
    nextAction: body.nextAction,
    notes: body.notes,
  };
}

function presalesProductsPayload(body) {
  const manufacturers = formValues(body.manufacturer);
  const productFamilies = formValues(body.productFamily);
  const proposedModels = formValues(body.proposedModel);
  const rowCount = Math.max(manufacturers.length, productFamilies.length, proposedModels.length, 1);
  return Array.from({ length: rowCount }, (_, index) => ({
    manufacturer: manufacturers[index] || '',
    productFamily: productFamilies[index] || '',
    proposedModel: proposedModels[index] || '',
  }));
}

function formValues(value) {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function presalesRecordPayload(body) {
  return {
    recordType: body.recordType,
    referenceNo: body.referenceNo,
    title: body.title,
    originalText: body.originalText,
    requirement: body.requirement,
    offeredItem: body.offeredItem,
    sku: body.sku,
    quantity: body.quantity,
    complianceStatus: body.complianceStatus,
    capabilityEvidence: body.capabilityEvidence,
    inclusionEvidence: body.inclusionEvidence,
    compatibilityEvidence: body.compatibilityEvidence,
    entitlementEvidence: body.entitlementEvidence,
    sourceRef: body.sourceRef,
    responseMode: body.responseMode,
    responseText: body.responseText,
    proposedText: body.proposedText,
    costImpact: body.costImpact,
    responsibility: body.responsibility,
    action: body.action,
    owner: body.owner,
    dueAt: toUtcIso(body.dueAt),
    reminderAt: toUtcIso(body.reminderAt),
    confidence: body.confidence,
    riskProbability: body.riskProbability,
    riskImpact: body.riskImpact,
    evidenceGap: body.evidenceGap,
    notes: body.notes,
  };
}

function renderPage(res, view) {
  res.render('index', { view });
}

function safeReturnTo(value, fallback) {
  const pathValue = String(value || '');
  return pathValue.startsWith('/') && !pathValue.startsWith('//') ? pathValue : fallback;
}

function validateReminder(reminderAt, dueAt, label = 'Hatırlatma') {
  if (reminderAt && dueAt && reminderAt >= dueAt) {
    throw new Error(`${label} zamanı son tarihten önce olmalı.`);
  }
}

function fileSlug(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
