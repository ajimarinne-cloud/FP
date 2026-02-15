/**
 * Entry points and high-level app services.
 */
function doGet(e) {
  const t = HtmlService.createTemplateFromFile('index');
  t.initialUserId = getCurrentUserId(e && e.parameter ? e.parameter.user_id : '');
  return t.evaluate().setTitle('Daily Report App').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBootstrapData(paramUserId) {
  const userId = getCurrentUserId(paramUserId);
  if (!userId) throw new Error('user_id が取得できません。Usersシートとアカウント設定を確認してください。');

  const users = getUserMaster();
  const me = resolveUserById(userId);
  const isAdmin = isAdminUserId(userId);

  if (!me && !isAdmin) {
    throw new Error(`Usersシートに user_id=${userId} が存在しません`);
  }

  return {
    me: me || { user_id: userId, name: userId },
    users: isAdmin ? users : users.filter((u) => String(u.user_id) === String(userId)),
    fixedTags: APP_CONFIG.FIXED_TAGS,
    isAdmin,
    now: formatDateJst(nowJst(), 'yyyy-MM-dd HH:mm:ss')
  };
}

/**
 * Troubleshooting helper for initial setup.
 */
function diagnoseEnvironment(paramUserId) {
  const email = getCurrentEmail();
  const resolvedUserId = getCurrentUserId(paramUserId);
  const users = getUserMaster();
  const me = resolvedUserId ? resolveUserById(resolvedUserId) : null;
  const missingSheets = Object.values(APP_CONFIG.SHEETS).filter((name) => !getSpreadsheet().getSheetByName(name));

  return {
    ok: missingSheets.length === 0,
    email,
    paramUserId: paramUserId || '',
    resolvedUserId,
    userExistsInUsersSheet: !!me,
    missingSheets,
    usersCount: users.length,
    hint: '保存できない場合は、Usersシートのuser_id/email、Webアプリ公開設定、?user_id=... を確認してください。'
  };
}

function determineStatusText(reportDate, submittedAt) {
  const cutoff = new Date(`${reportDate}T03:00:00+09:00`);
  cutoff.setDate(cutoff.getDate() + 1);
  return submittedAt <= cutoff ? '🌼' : '🌱';
}

function saveDailyLog(payload) {
  const requester = getCurrentUserId(payload.user_id);
  assertCanViewUser(requester, payload.user_id);

  if (!payload.date) {
    throw new Error('日付が未入力です');
  }

  if (!payload.gratitude_text || !String(payload.gratitude_text).trim()) {
    throw new Error('感謝ひとことは必須です');
  }
  if (!payload.tags_fixed || !payload.tags_fixed.length) {
    throw new Error('固定タグを1つ以上選択してください');
  }

  const now = nowJst();
  const status = determineStatusText(payload.date, now);
  const existing = findOne(APP_CONFIG.SHEETS.DAILY_LOGS, (r) => r.date === payload.date && String(r.user_id) === String(payload.user_id));

  const record = {
    date: payload.date,
    user_id: payload.user_id,
    list_count: Number(payload.list_count || 0),
    appt_cut_count: Number(payload.appt_cut_count || 0),
    appt_plan_count: Number(payload.appt_plan_count || 0),
    appt_done_count: Number(payload.appt_done_count || 0),
    line_count: Number(payload.line_count || 0),
    ac_plan_count: Number(payload.ac_plan_count || 0),
    ac_done_count: Number(payload.ac_done_count || 0),
    gratitude_text: String(payload.gratitude_text || ''),
    tags_fixed: (payload.tags_fixed || []).join(','),
    tag_custom: payload.tag_custom || '',
    status_text: status,
    bottleneck_text: payload.bottleneck_text || '',
    submitted_at: existing ? existing.submitted_at : now,
    updated_at: now,
    created_by: existing ? existing.created_by : requester,
    updated_by: requester
  };

  if (existing) {
    if (!payload.allow_edit) {
      return { ok: false, needsEdit: true, message: 'この日は既に入力済みです。編集画面に切り替えてください。' };
    }
    updateRowByIndex(APP_CONFIG.SHEETS.DAILY_LOGS, existing.__rowIndex, { ...existing, ...record });
    return { ok: true, edited: true, status_text: status };
  }

  appendRow(APP_CONFIG.SHEETS.DAILY_LOGS, record);
  return { ok: true, created: true, status_text: status };
}

function getDailyLog(date, userId) {
  const requester = getCurrentUserId(userId);
  assertCanViewUser(requester, userId);
  const row = findOne(APP_CONFIG.SHEETS.DAILY_LOGS, (r) => r.date === date && String(r.user_id) === String(userId));
  if (!row) return null;
  return {
    ...row,
    tags_fixed: row.tags_fixed ? String(row.tags_fixed).split(',').filter(Boolean) : []
  };
}

function savePlans(payload) {
  const requester = getCurrentUserId(payload.user_id);
  assertCanViewUser(requester, payload.user_id);

  const result = [];
  (payload.entries || []).forEach((entry) => {
    const existing = findOne(APP_CONFIG.SHEETS.PLANS, (r) => r.date === entry.date && String(r.user_id) === String(payload.user_id));
    const rec = {
      date: entry.date,
      user_id: payload.user_id,
      appt_plan_count: Number(entry.appt_plan_count || 0),
      ac_plan_count: Number(entry.ac_plan_count || 0),
      status: entry.status || '仮',
      calendar_event_id: existing ? existing.calendar_event_id : '',
      updated_at: new Date()
    };

    if (existing) {
      updateRowByIndex(APP_CONFIG.SHEETS.PLANS, existing.__rowIndex, { ...existing, ...rec });
    } else {
      appendRow(APP_CONFIG.SHEETS.PLANS, rec);
    }

    const syncRes = syncPlanToCalendar(rec);
    if (syncRes.eventId) {
      const target = findOne(APP_CONFIG.SHEETS.PLANS, (r) => r.date === entry.date && String(r.user_id) === String(payload.user_id));
      if (target) {
        target.calendar_event_id = syncRes.eventId;
        updateRowByIndex(APP_CONFIG.SHEETS.PLANS, target.__rowIndex, target);
      }
    }

    result.push({ date: entry.date, ...syncRes });
  });

  return { ok: true, result };
}

function getMonthArchive(month, userId) {
  const requester = getCurrentUserId(userId);
  assertCanViewUser(requester, userId);

  const logs = filterRows(APP_CONFIG.SHEETS.DAILY_LOGS, (r) => String(r.user_id) === String(userId) && String(r.date).indexOf(month) === 0);
  const totals = sumDailyLogs(logs);
  const goal = findOne(APP_CONFIG.SHEETS.MONTHLY_GOALS, (g) => g.month === month && String(g.user_id) === String(userId)) || { appt_cut_goal: 0 };
  const kpis = calculateKpis(totals, goal);

  const statusByDate = {};
  logs.forEach((l) => { statusByDate[l.date] = l.status_text; });

  return {
    month,
    logs: logs.map((l) => ({ ...l, tags_fixed: l.tags_fixed ? String(l.tags_fixed).split(',') : [] })),
    totals,
    kpis,
    statusByDate
  };
}

function getPlansByMonth(month, userId) {
  const requester = getCurrentUserId(userId);
  assertCanViewUser(requester, userId);
  return filterRows(APP_CONFIG.SHEETS.PLANS, (r) => String(r.user_id) === String(userId) && String(r.date).indexOf(month) === 0);
}

function getWeeklySnapshots() {
  const requester = getCurrentUserId();
  assertCanManageAdminOnly(requester);
  const rows = getSheetData(APP_CONFIG.SHEETS.WEEKLY_SNAPSHOTS)
    .sort((a, b) => String(b.week_start).localeCompare(String(a.week_start)));
  return rows.map((r) => ({
    ...r,
    team_totals: JSON.parse(r.team_totals || '{}'),
    team_kpis: JSON.parse(r.team_kpis || '{}'),
    per_user_summary: JSON.parse(r.per_user_summary || '[]')
  }));
}

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('cronSendReminder').timeBased().everyDays(1).atHour(2).nearMinute(30).create();
  ScriptApp.newTrigger('cronGenerateWeeklySnapshot').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(3).nearMinute(5).create();

  return { ok: true, message: 'Triggers installed' };
}

/**
 * One-click setup for first-time installation.
 * Safe to run multiple times.
 */
function runInitialSetup(optionalUserId) {
  initializeSpreadsheet();
  const triggerResult = setupTriggers();
  const diag = diagnoseEnvironment(optionalUserId || 'rika');
  return {
    ok: true,
    triggerResult,
    diagnose: diag,
    nextAction: 'Usersシートに user_id/name/role/email を入力してから Webアプリを再デプロイしてください。'
  };
}

/**
 * Helper: create initial Users sample rows when empty.
 */
function seedUsersSampleIfEmpty() {
  const users = getSheetData(APP_CONFIG.SHEETS.USERS);
  if (users.length > 0) {
    return { ok: true, message: 'Usersシートには既にデータがあります', count: users.length };
  }

  const sample = [
    { user_id: 'rika', name: 'りか', role: 'member', email: '', notify_email: '' },
    { user_id: 'kaho', name: 'かほ', role: 'member', email: '', notify_email: '' },
    { user_id: 'kasumi', name: 'かすみ', role: 'member', email: '', notify_email: '' },
    { user_id: 'hinako', name: 'ひなこ', role: 'member', email: '', notify_email: '' },
    { user_id: 'rinne', name: 'りんね', role: 'admin', email: '', notify_email: '' },
    { user_id: 'manager', name: '統括', role: 'admin', email: '', notify_email: '' }
  ];

  sample.forEach((row) => appendRow(APP_CONFIG.SHEETS.USERS, row));
  return { ok: true, message: 'Usersサンプルを追加しました', count: sample.length };
}

/**
 * Members向けの表示専用シートを一括作成する。
 * - シート名: DailyLogs_<user_id>
 * - 内容: DailyLogs を user_id で絞り込み、日付降順で表示
 */
function createMemberViewSheets() {
  const ss = getSpreadsheet();
  const users = getUserMaster().filter((u) => String(u.role || 'member') === 'member');

  users.forEach((u) => {
    const userId = String(u.user_id || '').trim();
    if (!userId) return;

    const sheetName = `DailyLogs_${userId}`;
    const sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    const formula = `=QUERY(${APP_CONFIG.SHEETS.DAILY_LOGS}!A:Z,"select * where B='${userId}' order by A desc",1)`;
    sh.clear();
    sh.getRange(1, 1).setFormula(formula);
    sh.setFrozenRows(1);
  });

  return { ok: true, createdOrUpdated: users.length };
}
