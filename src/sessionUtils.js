// ─── Session Utilities ────────────────────────────────────────────────────────
const SESSION_KEY     = "bloom_session_start";
const TIMEOUT_MS      = 8 * 60 * 60 * 1000; // 8 hours

export function updateSessionMeta() {
  try {
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
  } catch { /* unavailable */ }
}

export function clearSessionMeta() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* unavailable */ }
}

export function checkSessionTimeout() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const elapsed = Date.now() - parseInt(raw, 10);
    return elapsed > TIMEOUT_MS;
  } catch {
    return false;
  }
}