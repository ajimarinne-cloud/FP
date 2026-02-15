/**
 * Google Calendar integration for confirmed plans.
 */
function getCalendar() {
  const calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  if (calendarId) return CalendarApp.getCalendarById(calendarId);
  return CalendarApp.getDefaultCalendar();
}

function syncPlanToCalendar(planRow) {
  if (planRow.status !== '確定') return { ok: true, skipped: true };

  const cal = getCalendar();
  const title = `予定 ${planRow.user_id} アポ${planRow.appt_plan_count} / AC${planRow.ac_plan_count}（確定）`;
  const start = new Date(`${planRow.date}T09:00:00+09:00`);
  const end = new Date(`${planRow.date}T10:00:00+09:00`);

  let event;
  if (planRow.calendar_event_id) {
    event = cal.getEventById(planRow.calendar_event_id);
    if (event) {
      event.setTitle(title);
      event.setTime(start, end);
      return { ok: true, eventId: event.getId(), updated: true };
    }
  }

  event = cal.createEvent(title, start, end, {
    description: `user_id=${planRow.user_id}\nappt=${planRow.appt_plan_count}\nac=${planRow.ac_plan_count}`
  });
  return { ok: true, eventId: event.getId(), created: true };
}

function syncAllConfirmedPlansToCalendar() {
  const requester = getCurrentUserId();
  if (requester) assertCanManageAdminOnly(requester);

  const plans = filterRows(APP_CONFIG.SHEETS.PLANS, (p) => p.status === '確定');
  const results = [];
  plans.forEach((p) => {
    const res = syncPlanToCalendar(p);
    if (res.eventId && res.eventId !== p.calendar_event_id) {
      p.calendar_event_id = res.eventId;
      p.updated_at = new Date();
      updateRowByIndex(APP_CONFIG.SHEETS.PLANS, p.__rowIndex, p);
    }
    results.push({ key: `${p.date}_${p.user_id}`, ...res });
  });
  return { ok: true, count: results.length, results };
}
