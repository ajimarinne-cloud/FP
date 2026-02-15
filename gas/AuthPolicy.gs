/**
 * Authorization helpers.
 */
function getCurrentEmail() {
  return Session.getActiveUser().getEmail() || '';
}

function normalizeUserIdFromEmail(email) {
  if (!email) return '';
  return email.split('@')[0].toLowerCase();
}

function getCurrentUserId(optionalParamUserId) {
  const email = getCurrentEmail();
  if (email) {
    // Prefer explicit mapping by Users.email first (safer than local-part guessing).
    try {
      const userByEmail = findOne(APP_CONFIG.SHEETS.USERS, (u) => String(u.email || '').toLowerCase() === String(email).toLowerCase());
      if (userByEmail && userByEmail.user_id) return String(userByEmail.user_id);
    } catch (err) {
      // Users sheet may not be initialized yet.
    }

    const fromMail = normalizeUserIdFromEmail(email);
    try {
      const userById = findOne(APP_CONFIG.SHEETS.USERS, (u) => String(u.user_id) === String(fromMail));
      if (userById) return String(userById.user_id);
    } catch (err) {
      // Fallback below.
    }
  }

  // Fallback for explicit parameter usage in web app (e.g. ?user_id=rika)
  return optionalParamUserId || '';
}

function getUserMaster() {
  return getSheetData(APP_CONFIG.SHEETS.USERS);
}

function resolveUserById(userId) {
  return findOne(APP_CONFIG.SHEETS.USERS, (u) => String(u.user_id) === String(userId));
}

function isAdminUserId(userId) {
  const user = resolveUserById(userId);
  return !!user && String(user.role).toLowerCase() === 'admin';
}

function assertCanViewUser(requesterUserId, targetUserId) {
  if (!requesterUserId) throw new Error('認証ユーザーIDが取得できません');
  if (requesterUserId === targetUserId) return true;
  if (isAdminUserId(requesterUserId)) return true;
  throw new Error('他ユーザーのデータを閲覧できません');
}

function assertCanManageAdminOnly(requesterUserId) {
  if (!isAdminUserId(requesterUserId)) {
    throw new Error('管理者のみ実行できます');
  }
}
