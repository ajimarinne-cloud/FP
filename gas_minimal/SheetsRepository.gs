/**
 * Low-level sheet CRUD.
 */
function initializeSpreadsheet() {
  const ss = getSpreadsheet();

  ensureSheet(ss, APP_CONFIG.SHEETS.USERS, [
    'user_id', 'name', 'role', 'email', 'notify_email'
  ]);

  ensureSheet(ss, APP_CONFIG.SHEETS.DAILY_LOGS, [
    'date', 'user_id', 'list_count', 'appt_cut_count', 'appt_plan_count', 'appt_done_count',
    'line_count', 'ac_plan_count', 'ac_done_count', 'gratitude_text', 'tags_fixed',
    'tag_custom', 'status_text', 'bottleneck_text', 'submitted_at', 'updated_at',
    'created_by', 'updated_by'
  ]);

  ensureSheet(ss, APP_CONFIG.SHEETS.PLANS, [
    'date', 'user_id', 'appt_plan_count', 'ac_plan_count', 'status', 'calendar_event_id', 'updated_at'
  ]);

  ensureSheet(ss, APP_CONFIG.SHEETS.MONTHLY_GOALS, [
    'month', 'user_id', 'appt_cut_goal', 'appt_plan_goal', 'appt_done_goal',
    'line_goal', 'ac_plan_goal', 'ac_done_goal'
  ]);

  ensureSheet(ss, APP_CONFIG.SHEETS.WEEKLY_SNAPSHOTS, [
    'week_start', 'week_end', 'team_totals', 'team_kpis', 'team_bottleneck',
    'per_user_summary', 'created_at'
  ]);
}

function ensureSheet(ss, name, headers) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  const firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every((v) => !v);
  if (isEmpty) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
}

function getSheetData(sheetName) {
  const sh = getSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error(`Sheet not found: ${sheetName}`);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map((row, i) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    obj.__rowIndex = i + 2;
    return obj;
  });
}

function appendRow(sheetName, record) {
  const sh = getSpreadsheet().getSheetByName(sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map((h) => record[h] !== undefined ? record[h] : '');
  sh.appendRow(row);
}

function updateRowByIndex(sheetName, rowIndex, record) {
  const sh = getSpreadsheet().getSheetByName(sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map((h) => record[h] !== undefined ? record[h] : '');
  sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}

function findOne(sheetName, predicate) {
  const rows = getSheetData(sheetName);
  return rows.find(predicate) || null;
}

function filterRows(sheetName, predicate) {
  return getSheetData(sheetName).filter(predicate);
}
