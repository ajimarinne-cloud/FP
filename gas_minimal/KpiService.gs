/**
 * KPI utilities.
 */
function safeDivide(n, d) {
  if (!d || Number(d) === 0) return null;
  return Number(n) / Number(d);
}

function toPercent(v) {
  if (v === null || v === undefined) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function calculateKpis(total, goal) {
  const apptCutRate = safeDivide(total.appt_cut_count, goal.appt_cut_goal);
  const apptDoneRate = safeDivide(total.appt_done_count, Number(total.appt_plan_count) + 0.33);
  const lineRate = safeDivide(total.line_count, total.appt_done_count);
  return {
    appt_cut_rate: toPercent(apptCutRate),
    appt_done_rate: toPercent(apptDoneRate),
    line_rate: toPercent(lineRate)
  };
}

function sumDailyLogs(rows) {
  return rows.reduce((acc, r) => {
    acc.list_count += Number(r.list_count || 0);
    acc.appt_cut_count += Number(r.appt_cut_count || 0);
    acc.appt_plan_count += Number(r.appt_plan_count || 0);
    acc.appt_done_count += Number(r.appt_done_count || 0);
    acc.line_count += Number(r.line_count || 0);
    acc.ac_plan_count += Number(r.ac_plan_count || 0);
    acc.ac_done_count += Number(r.ac_done_count || 0);
    return acc;
  }, {
    list_count: 0,
    appt_cut_count: 0,
    appt_plan_count: 0,
    appt_done_count: 0,
    line_count: 0,
    ac_plan_count: 0,
    ac_done_count: 0
  });
}
