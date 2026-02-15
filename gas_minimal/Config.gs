/**
 * Global configuration helpers.
 */
const APP_CONFIG = {
  TZ: 'Asia/Tokyo',
  SHEETS: {
    USERS: 'Users',
    DAILY_LOGS: 'DailyLogs',
    PLANS: 'Plans',
    MONTHLY_GOALS: 'MonthlyGoals',
    WEEKLY_SNAPSHOTS: 'WeeklySnapshots'
  },
  FIXED_MEMBER_ORDER: ['りか', 'かほ', 'かすみ', 'ひなこ'],
  FIXED_TAGS: ['#気づき', '#改善', '#感情', '#予定・時間', '#相談'],
  REMINDER_MESSAGE: '🌼 今日の入力、抜けてないかな？ 3:00までに数字＋感謝ひとことだけお願い！ いつもありがとう。'
};

function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function nowJst() {
  return new Date(Utilities.formatDate(new Date(), APP_CONFIG.TZ, 'yyyy-MM-dd\'T\'HH:mm:ssXXX'));
}

function formatDateJst(dateObj, fmt) {
  return Utilities.formatDate(dateObj, APP_CONFIG.TZ, fmt || 'yyyy-MM-dd');
}
