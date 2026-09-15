import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSupervisor } from '../src/watchdog-policy.js';

test('restarts when launchd says the remote agent is inactive', () => {
  assert.deepEqual(evaluateSupervisor({ agentRunning: false, status: 'ready', now: 1000 }), {
    action: 'restart', reason: 'launchagent_inactive'
  });
});

test('leaves a healthy ready agent alone', () => {
  assert.deepEqual(evaluateSupervisor({ agentRunning: true, status: 'ready', now: 1000 }), { action: 'healthy' });
});

test('restarts a stale startup after grace period', () => {
  assert.deepEqual(evaluateSupervisor({ agentRunning: true, status: 'starting', startedAt: 700, now: 1000, startupGraceSeconds: 180 }), {
    action: 'restart', reason: 'startup_stale'
  });
});

test('does not restart while authentication is still valid', () => {
  assert.deepEqual(evaluateSupervisor({ agentRunning: true, status: 'auth_required', authStartedAt: 900, authTtlSeconds: 900, authGraceSeconds: 30, now: 1000 }), {
    action: 'auth_required'
  });
});

test('restarts after authentication expires', () => {
  assert.deepEqual(evaluateSupervisor({ agentRunning: true, status: 'auth_required', authStartedAt: 10, authTtlSeconds: 100, authGraceSeconds: 30, now: 1000 }), {
    action: 'restart', reason: 'auth_expired'
  });
});
