import { mkdir, readFile, rename, rm, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';

const SAFE_KEY = /^[a-z0-9_]+$/;
const FORBIDDEN_KEY = /(token|secret|password)/i;

export function sanitizeLine(line) {
  return String(line).replace(/(\"(?:access_token|refresh_token)\"\s*:\s*)\"[^\"]*\"/gi, '$1\"[REDACTED]\"');
}

export class FileStateStore {
  constructor(dir) { this.dir = dir; }
  validateKey(key) {
    if (!SAFE_KEY.test(key) || FORBIDDEN_KEY.test(key)) throw new Error(`Unsafe state key: ${key}`);
  }
  async ensure() { await mkdir(this.dir, { recursive: true, mode: 0o700 }); }
  async get(key) {
    this.validateKey(key);
    try { return await readFile(path.join(this.dir, key), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
  }
  async set(key, value) {
    this.validateKey(key); await this.ensure();
    const target = path.join(this.dir, key);
    const temp = path.join(this.dir, `.${key}.${process.pid}.${Date.now()}`);
    await writeFile(temp, String(value), { mode: 0o600 }); await chmod(temp, 0o600); await rename(temp, target);
  }
  async delete(key) { this.validateKey(key); await rm(path.join(this.dir, key), { force: true }); }
}
