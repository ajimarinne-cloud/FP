/**
 * Reminder notification logic.
 */
function getTodayMissingUsers() {
  const today = formatDateJst(nowJst());
  const users = getUserMaster().filter((u) => String(u.role || 'member') !== 'admin');
  const logs = filterRows(APP_CONFIG.SHEETS.DAILY_LOGS, (r) => r.date === today);
  const submittedSet = new Set(logs.map((r) => String(r.user_id)));
  return users.filter((u) => !submittedSet.has(String(u.user_id)));
}

function sendReminderNotifications() {
  const missingUsers = getTodayMissingUsers();
  const results = [];

  missingUsers.forEach((u) => {
    const email = u.notify_email || u.email;
    if (!email) {
      results.push({ user_id: u.user_id, ok: false, message: 'notify email missing' });
      return;
    }
    try {
      MailApp.sendEmail({
        to: email,
        subject: '日報リマインド',
        body: APP_CONFIG.REMINDER_MESSAGE
      });
      results.push({ user_id: u.user_id, ok: true });
    } catch (err) {
      results.push({ user_id: u.user_id, ok: false, message: err.message });
    }
  });

  return { ok: true, sent: results.length, results };
}

function cronSendReminder() {
  return sendReminderNotifications();
}
