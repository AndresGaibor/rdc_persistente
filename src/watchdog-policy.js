export function evaluateSupervisor(input) {
  const {
    agentRunning, status = '', now,
    startedAt = now, startupGraceSeconds = 180,
    authStartedAt = now, authTtlSeconds = 900, authGraceSeconds = 30
  } = input;

  if (!agentRunning) return { action: 'restart', reason: 'launchagent_inactive' };
  if (status === 'ready') return { action: 'healthy' };
  if (status === 'auth_required') {
    if (now > Number(authStartedAt) + Number(authTtlSeconds) + Number(authGraceSeconds)) {
      return { action: 'restart', reason: 'auth_expired' };
    }
    return { action: 'auth_required' };
  }
  if (status === 'starting' || status === '') {
    if (now - Number(startedAt) > Number(startupGraceSeconds)) return { action: 'restart', reason: 'startup_stale' };
    return { action: 'starting' };
  }
  if (status === 'failed') return { action: 'restart', reason: input.lastError || 'remote_failed' };
  return { action: 'observe' };
}
