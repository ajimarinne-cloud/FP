/**
 * Weekly snapshot logic.
 */
function getCurrentWeekRange() {
  const now = nowJst();
  const day = Number(Utilities.formatDate(now, APP_CONFIG.TZ, 'u')); // Mon=1..Sun=7
  // Thursday-start week (Thu->Wed)
  const offsetToThu = (day >= 4) ? (day - 4) : (day + 3);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - offsetToThu);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    week_start: formatDateJst(weekStart),
    week_end: formatDateJst(weekEnd)
  };
}

function generateWeeklySnapshot() {
  const requester = getCurrentUserId();
  if (requester) {
    // Manual call from UI is admin-only.
    assertCanManageAdminOnly(requester);
  }

  const range = getCurrentWeekRange();
  const exists = findOne(APP_CONFIG.SHEETS.WEEKLY_SNAPSHOTS, (r) => r.week_start === range.week_start && r.week_end === range.week_end);
  if (exists) return { ok: true, message: '既に作成済みです', snapshot: exists };

  const logs = filterRows(APP_CONFIG.SHEETS.DAILY_LOGS, (r) => r.date >= range.week_start && r.date <= range.week_end);
  const users = getUserMaster();
  const members = APP_CONFIG.FIXED_MEMBER_ORDER
    .map((name) => users.find((u) => u.name === name))
    .filter(Boolean);

  const teamTotals = sumDailyLogs(logs);

  const goalRows = filterRows(APP_CONFIG.SHEETS.MONTHLY_GOALS, (g) => g.month === range.week_start.slice(0, 7));
  const teamGoal = goalRows.reduce((acc, g) => {
    acc.appt_cut_goal += Number(g.appt_cut_goal || 0);
    return acc;
  }, { appt_cut_goal: 0 });

  const teamKpis = calculateKpis(teamTotals, teamGoal);

  const perUser = members.map((m) => {
    const rows = logs.filter((r) => r.user_id === m.user_id);
    const totals = sumDailyLogs(rows);
    const flower = rows.filter((r) => r.status_text === '🌼').length;
    const bud = rows.filter((r) => r.status_text === '🌱').length;
    const missing = 7 - rows.length;
    const bottleneck = rows.map((r) => r.bottleneck_text).find((x) => x) || '';
    return {
      user_id: m.user_id,
      name: m.name,
      flower,
      bud,
      missing,
      totals,
      bottleneck
    };
  });

  const teamBottleneck = perUser.map((u) => u.bottleneck).find((x) => x) || '';

  const record = {
    week_start: range.week_start,
    week_end: range.week_end,
    team_totals: JSON.stringify(teamTotals),
    team_kpis: JSON.stringify(teamKpis),
    team_bottleneck: teamBottleneck,
    per_user_summary: JSON.stringify(perUser),
    created_at: new Date()
  };

  appendRow(APP_CONFIG.SHEETS.WEEKLY_SNAPSHOTS, record);
  return { ok: true, message: '週次スナップショットを作成しました', snapshot: record };
}

function cronGenerateWeeklySnapshot() {
  return generateWeeklySnapshot();
}
