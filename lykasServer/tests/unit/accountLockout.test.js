const {
  LOCK_THRESHOLD,
  nextFailedAttemptState,
  isWithinLockWindow,
  shouldAutoUnlock,
} = require("../../src/utils/lockoutPolicy");

describe("lockoutPolicy.nextFailedAttemptState", () => {
  it("increments the failed-attempt count without locking below the threshold", () => {
    for (let i = 0; i < LOCK_THRESHOLD - 1; i++) {
      const result = nextFailedAttemptState(i);
      expect(result.failedLoginAttempts).toBe(i + 1);
      expect(result.shouldLock).toBe(false);
      expect(result.lockedUntil).toBeNull();
    }
  });

  it("locks the account exactly at the 5th consecutive failed attempt", () => {
    const result = nextFailedAttemptState(LOCK_THRESHOLD - 1);
    expect(result.failedLoginAttempts).toBe(LOCK_THRESHOLD);
    expect(result.shouldLock).toBe(true);
    expect(result.lockedUntil).toBeInstanceOf(Date);
  });

  it("sets a 30-minute cooldown window on lock", () => {
    const before = Date.now();
    const result = nextFailedAttemptState(LOCK_THRESHOLD - 1);
    const deltaMs = result.lockedUntil.getTime() - before;
    // Allow a little slack for test execution time.
    expect(deltaMs).toBeGreaterThan(29 * 60 * 1000);
    expect(deltaMs).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);
  });

  it("keeps locking (does not reset) on additional failed attempts past the threshold", () => {
    const result = nextFailedAttemptState(LOCK_THRESHOLD + 2);
    expect(result.shouldLock).toBe(true);
  });
});

describe("lockoutPolicy.isWithinLockWindow", () => {
  it("is true when lockedUntil is in the future", () => {
    const future = new Date(Date.now() + 10 * 60 * 1000);
    expect(isWithinLockWindow(future)).toBe(true);
  });

  it("is false when lockedUntil is in the past", () => {
    const past = new Date(Date.now() - 10 * 60 * 1000);
    expect(isWithinLockWindow(past)).toBe(false);
  });

  it("is false when lockedUntil is not set", () => {
    expect(isWithinLockWindow(null)).toBe(false);
    expect(isWithinLockWindow(undefined)).toBe(false);
  });
});

describe("lockoutPolicy.shouldAutoUnlock", () => {
  it("is true once the cooldown has elapsed on a locked account", () => {
    const past = new Date(Date.now() - 1000);
    expect(shouldAutoUnlock("locked", past)).toBe(true);
  });

  it("is false while still within the cooldown window", () => {
    const future = new Date(Date.now() + 10 * 60 * 1000);
    expect(shouldAutoUnlock("locked", future)).toBe(false);
  });

  it("is false for accounts that are not locked at all", () => {
    const past = new Date(Date.now() - 1000);
    expect(shouldAutoUnlock("active", past)).toBe(false);
    expect(shouldAutoUnlock("suspended", past)).toBe(false);
  });
});
