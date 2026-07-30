const LOCK_THRESHOLD = 5;
const LOCK_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * §5.1 — pure decision logic for the account-lockout counter, pulled out of
 * authController so it can be unit tested in isolation from Mongo. Given the
 * failed-attempt count *before* this attempt, returns the state to apply
 * after one more failed password check.
 */
function nextFailedAttemptState(currentFailedAttempts) {
  const failedLoginAttempts = (currentFailedAttempts || 0) + 1;

  if (failedLoginAttempts >= LOCK_THRESHOLD) {
    return {
      failedLoginAttempts,
      shouldLock: true,
      lockedUntil: new Date(Date.now() + LOCK_WINDOW_MS),
    };
  }

  return { failedLoginAttempts, shouldLock: false, lockedUntil: null };
}

/** True if `lockedUntil` is still in the future relative to `now`. */
function isWithinLockWindow(lockedUntil, now = new Date()) {
  return Boolean(lockedUntil) && lockedUntil > now;
}

/** True if a locked account's cooldown has elapsed and it should auto-unlock. */
function shouldAutoUnlock(status, lockedUntil, now = new Date()) {
  return status === "locked" && Boolean(lockedUntil) && lockedUntil <= now;
}

module.exports = {
  LOCK_THRESHOLD,
  LOCK_WINDOW_MS,
  nextFailedAttemptState,
  isWithinLockWindow,
  shouldAutoUnlock,
};
