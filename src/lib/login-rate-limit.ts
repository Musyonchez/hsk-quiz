// In-memory per-username lockout for POST /api/auth/login. Deliberately simple for a small,
// single-instance personal site — an in-process Map, not a shared/persisted store, so it resets
// on every server restart and doesn't coordinate across multiple instances. Revisit with a real
// store (e.g. a DB table or Redis) if this ever runs behind more than one process.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Entry {
  count: number;
  firstAttemptAt: number;
}

const failuresByUsername = new Map<string, Entry>();

function key(username: string): string {
  return username.toLowerCase();
}

export function isLoginLocked(username: string): boolean {
  const entry = failuresByUsername.get(key(username));
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > WINDOW_MS) {
    failuresByUsername.delete(key(username));
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(username: string): void {
  const k = key(username);
  const entry = failuresByUsername.get(k);
  if (!entry || Date.now() - entry.firstAttemptAt > WINDOW_MS) {
    failuresByUsername.set(k, { count: 1, firstAttemptAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(username: string): void {
  failuresByUsername.delete(key(username));
}
