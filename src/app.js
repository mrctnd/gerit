import path from 'node:path';
import express from 'express';
import { appRoot, config } from './config.js';
import {
  getAppearancePreferences,
  addPresalesCase,
  addPresalesAction,
  addPresalesRecord,
  addPresalesStakeholder,
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
  getPresalesActions,
  getPresalesAttentionItems,
  getPresalesCaseMetrics,
  getPresalesCases,
  getPresalesDashboardSummary,
  getPresalesExport,
  getPresalesRecord,
  getPresalesRecords,
  getPresalesQualification,
  getPresalesStakeholders,
  getNotificationPreferences,
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
  saveNotificationPreferences,
  savePresalesQualification,
  deletePresalesAction,
  deletePresalesCase,
  deletePresalesRecord,
  deletePresalesStakeholder,
  updatePresalesAction,
  updatePresalesCase,
  updatePresalesRecord,
  updatePresalesStakeholder,
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
  CURRENCIES,
  OFFERABILITY_STATUSES,
  OPPORTUNITY_TYPES,
  PRESALES_ACTION_STATUSES,
  PRESALES_PRIORITIES,
  PRESALES_RECORD_TYPES,
  PRESALES_STAGES,
  QUALIFICATION_DIMENSIONS,
  QUALIFICATION_STATUSES,
  RESPONSE_MODES,
  STAKEHOLDER_INFLUENCE,
  STAKEHOLDER_ROLES,
  STAKEHOLDER_STANCES,
  complianceStatusMeta,
  offerabilityMeta,
  opportunityTypeMeta,
  presalesActionStatusMeta,
  presalesPriorityMeta,
  presalesRecordTypeMeta,
  presalesStageMeta,
  qualificationStatusMeta,
  riskMeta,
  stakeholderRoleMeta,
  stakeholderStanceMeta,
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
    res.locals.attentionItems = getPresalesAttentionItems(
      reference.toUTC().toISO(),
      reference.plus({ days: 7 }).toUTC().toISO(),
    );
    res.locals.attentionCount = res.locals.attentionItems.length;
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
    res.locals.opportunityTypes = OPPORTUNITY_TYPES;
    res.locals.presalesPriorities = PRESALES_PRIORITIES;
    res.locals.currencies = CURRENCIES;
    res.locals.qualificationDimensions = QUALIFICATION_DIMENSIONS;
    res.locals.qualificationStatuses = QUALIFICATION_STATUSES;
    res.locals.stakeholderRoles = STAKEHOLDER_ROLES;
    res.locals.stakeholderInfluence = STAKEHOLDER_INFLUENCE;
    res.locals.stakeholderStances = STAKEHOLDER_STANCES;
    res.locals.presalesActionStatuses = PRESALES_ACTION_STATUSES;
    res.locals.notificationPreferences = getNotificationPreferences();
    res.locals.complianceStatuses = COMPLIANCE_STATUSES;
    res.locals.confidenceLevels = CONFIDENCE_LEVELS;
    res.locals.responseModes = RESPONSE_MODES;
    res.locals.assetVersion = assetVersion;
    res.locals.encodeURIComponent = encodeURIComponent;
    res.locals.toDateTimeInput = toDateTimeInput;
    res.locals.describeRecurrence = describeRecurrence;
    res.locals.formatMoney = formatMoney;
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

  app.post('/notifications/settings', (req, res, next) => {
    try {
      saveNotificationPreferences({
        dailyDigest: req.body.dailyDigest === 'on',
        digestHour: req.body.digestHour,
        includePresales: req.body.includePresales === 'on',
        quietHoursEnabled: req.body.quietHoursEnabled === 'on',
        quietStart: req.body.quietStart,
        quietEnd: req.body.quietEnd,
      });
      res.redirect(safeReturnTo(req.body.returnTo, '/presales/attention'));
    } catch (error) {
      next(error);
    }
  });

  app.get('/presales/attention', (_req, res) => {
    renderPage(res, {
      title: 'Aksiyon ve Uyarı Merkezi',
      kicker: 'Termin, risk, teyit ve sorumluluk kuyruğu',
      kind: 'presales-attention',
      items: res.locals.attentionItems.map(decorateAttentionItem),
    });
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
      validateInternalDeadline(payload.internalDeadline, payload.deadline);
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
      qualification: decorateQualification(getPresalesQualification(presalesCase.id)),
      stakeholders: getPresalesStakeholders(presalesCase.id).map(decorateStakeholder),
      actions: getPresalesActions(presalesCase.id).map(decoratePresalesAction),
    });
  });

  app.post('/presales/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const payload = presalesCasePayload(req.body);
      validateReminder(payload.reminderAt, payload.deadline, 'Dosya hatırlatması');
      validateInternalDeadline(payload.internalDeadline, payload.deadline);
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

  app.post('/presales/:id/qualification', (req, res, next) => {
    try {
      const caseId = Number(req.params.id);
      const updated = savePresalesQualification(caseId, qualificationPayload(req.body));
      if (!updated) return next();
      res.redirect(`/presales/${caseId}#qualification`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:id/stakeholders', (req, res, next) => {
    try {
      const caseId = Number(req.params.id);
      const stakeholder = addPresalesStakeholder(caseId, stakeholderPayload(req.body));
      if (!stakeholder) return next();
      res.redirect(`/presales/${caseId}#stakeholders`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:caseId/stakeholders/:stakeholderId', (req, res, next) => {
    try {
      const caseId = Number(req.params.caseId);
      if (!getPresalesCase(caseId)) return next();
      updatePresalesStakeholder(caseId, Number(req.params.stakeholderId), stakeholderPayload(req.body));
      res.redirect(`/presales/${caseId}#stakeholders`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:caseId/stakeholders/:stakeholderId/delete', (req, res, next) => {
    try {
      const caseId = Number(req.params.caseId);
      deletePresalesStakeholder(caseId, Number(req.params.stakeholderId));
      res.redirect(`/presales/${caseId}#stakeholders`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:id/actions', (req, res, next) => {
    try {
      const caseId = Number(req.params.id);
      const payload = presalesActionPayload(req.body);
      validateReminder(payload.reminderAt, payload.dueAt, 'Aksiyon hatırlatması');
      const action = addPresalesAction(caseId, payload);
      if (!action) return next();
      res.redirect(`/presales/${caseId}#action-${action.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:caseId/actions/:actionId', (req, res, next) => {
    try {
      const caseId = Number(req.params.caseId);
      const payload = presalesActionPayload(req.body);
      validateReminder(payload.reminderAt, payload.dueAt, 'Aksiyon hatırlatması');
      const action = updatePresalesAction(caseId, Number(req.params.actionId), payload);
      if (!action || action.caseId !== caseId) return next();
      res.redirect(`/presales/${caseId}#action-${action.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/presales/:caseId/actions/:actionId/delete', (req, res, next) => {
    try {
      const caseId = Number(req.params.caseId);
      deletePresalesAction(caseId, Number(req.params.actionId));
      res.redirect(`/presales/${caseId}#actions`);
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
      || message.includes('önce olmalı')
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
  const estimatedValue = Number(presalesCase.estimatedValue) || 0;
  const estimatedCost = Number(presalesCase.estimatedCost) || 0;
  return {
    ...presalesCase,
    deadlineMeta: dueMeta(presalesCase.deadline),
    reminderMeta: dueMeta(presalesCase.reminderAt),
    stageMeta: presalesStageMeta(presalesCase.stage),
    offerabilityMeta: offerabilityMeta(presalesCase.offerability),
    priorityMeta: presalesPriorityMeta(presalesCase.priority),
    opportunityTypeMeta: opportunityTypeMeta(presalesCase.opportunityType),
    internalDeadlineMeta: dueMeta(presalesCase.internalDeadline),
    weightedValue: estimatedValue * (presalesCase.winProbability || 0) / 100,
    grossMargin: estimatedValue && estimatedCost ? estimatedValue - estimatedCost : null,
    grossMarginPercent: estimatedValue && estimatedCost
      ? Math.round(((estimatedValue - estimatedCost) / estimatedValue) * 1000) / 10
      : null,
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

function decorateQualification(qualification) {
  return {
    ...qualification,
    items: qualification.items.map((item) => ({
      ...item,
      statusMeta: qualificationStatusMeta(item.status),
    })),
  };
}

function decorateStakeholder(stakeholder) {
  return {
    ...stakeholder,
    roleMeta: stakeholderRoleMeta(stakeholder.role),
    stanceMeta: stakeholderStanceMeta(stakeholder.stance),
  };
}

function decoratePresalesAction(action) {
  return {
    ...action,
    statusMeta: presalesActionStatusMeta(action.status),
    dueMeta: dueMeta(action.dueAt),
    reminderMeta: dueMeta(action.reminderAt),
  };
}

function decorateAttentionItem(item) {
  const typeLabels = {
    deadline: 'Müşteri termini',
    action: 'Proje aksiyonu',
    finding: 'Teknik / ticari bulgu',
    qualification: 'Yeterlilik engeli',
  };
  const dimension = QUALIFICATION_DIMENSIONS.find((entry) => entry.value === item.title);
  return {
    ...item,
    title: dimension?.label || item.title,
    typeLabel: typeLabels[item.type] || 'Uyarı',
    dueMeta: dueMeta(item.dueAt),
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
    opportunityType: body.opportunityType,
    priority: body.priority,
    currency: body.currency,
    estimatedValue: body.estimatedValue,
    estimatedCost: body.estimatedCost,
    winProbability: body.winProbability,
    internalDeadline: toUtcIso(body.internalDeadline),
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

function qualificationPayload(body) {
  const dimensions = formValues(body.qualificationDimension);
  const statuses = formValues(body.qualificationStatus);
  const notes = formValues(body.qualificationNotes);
  return dimensions.map((dimension, index) => ({
    dimension,
    status: statuses[index],
    notes: notes[index],
  }));
}

function stakeholderPayload(body) {
  return {
    name: body.name,
    organization: body.organization,
    role: body.role,
    influence: body.influence,
    stance: body.stance,
    contact: body.contact,
    notes: body.notes,
  };
}

function presalesActionPayload(body) {
  return {
    title: body.title,
    owner: body.owner,
    status: body.status,
    priority: body.priority,
    dueAt: toUtcIso(body.dueAt),
    reminderAt: toUtcIso(body.reminderAt),
    notes: body.notes,
  };
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

function validateInternalDeadline(internalDeadline, customerDeadline) {
  if (internalDeadline && customerDeadline && internalDeadline >= customerDeadline) {
    throw new Error('İç teslim tarihi müşteri son teslim tarihinden önce olmalı.');
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

function formatMoney(value, currency = 'TRY') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
