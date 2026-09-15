const RECOVERABLE_STATE_ERRORS = new Set(['ENOSPC', 'EROFS', 'EACCES', 'EDQUOT']);

async function tolerateStorageFailure(operation) {
  try { await operation(); }
  catch (error) { if (!RECOVERABLE_STATE_ERRORS.has(error?.code)) throw error; }
}

export async function parseDesktopCommanderLine(rawLine, state, now = Math.floor(Date.now() / 1000)) {
  const line = String(rawLine).trim();
  const set = (key, value) => tolerateStorageFailure(() => state.set(key, value));
  const del = (key) => tolerateStorageFailure(() => state.delete(key));

  if (line.startsWith('🚀 Starting MCP Device...')) { await set('status', 'starting'); await set('started_at', now); }
  if (line.startsWith('✅ Device ready:')) {
    await set('status', 'ready'); await set('ready_at', now);
    for (const key of ['auth_url', 'auth_code', 'auth_ttl_seconds', 'auth_started_at']) await del(key);
  }
  if (/^https:\/\/mcp\.desktopcommander\.app\/device\/verify/.test(line)) await set('auth_url', line);
  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(line)) {
    await set('auth_code', line); await set('auth_started_at', now); await set('status', 'auth_required');
  }
  const ttl = line.match(/Code expires in (\d+) minutes?\./i); if (ttl) await set('auth_ttl_seconds', Number(ttl[1]) * 60);
  const user = line.match(/^-\s*User:\s+([^\s]+@[^\s]+)$/); if (user) await set('user_email', user[1]);
  if (line.includes('Persisted session invalid:')) { await set('status', 'starting'); await set('last_error', 'persisted_session_invalid'); }
  if (line.includes('Device startup failed:')) {
    await set('status', 'failed'); await set('last_error', 'device_startup_failed'); await set('failure_at', now);
  }
}
