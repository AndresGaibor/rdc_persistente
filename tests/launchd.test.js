import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLaunchAgents } from '../src/launchd.js';

test('remote launch agent is persistent and watchdog runs every 60 seconds', () => {
  const { remote, watchdog } = renderLaunchAgents({ home: '/Users/tester', nodePath: '/opt/homebrew/bin/node' });
  assert.match(remote, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(remote, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(remote, /\/Users\/tester\/\.local\/share\/rdc-persistente\/app\/bin\/remote\.js/);
  assert.match(watchdog, /<key>StartInterval<\/key>\s*<integer>60<\/integer>/);
  assert.match(remote, /<key>PATH<\/key><string>[^<]*\/opt\/homebrew\/bin/);
  assert.doesNotMatch(remote + watchdog, /andresgaibor|com\.andres/);
  assert.equal((remote.match(/<string>\/dev\/null<\/string>/g) || []).length, 2);
  assert.equal((watchdog.match(/<string>\/dev\/null<\/string>/g) || []).length, 2);
});