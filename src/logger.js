import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_ERRORS = new Set(['ENOSPC', 'EDQUOT', 'EROFS', 'EACCES']);

export function shouldLogRemoteLine(line) {
  const value = String(line).trim();
  if (!value) return false;
  if (value.includes('🔧 Received tool call')) return false;
  if (value.includes('✅ Tool call')) return false;
  if (value.includes('{"content":')) return false;
  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)) return false;
  return true;
}

export class RotatingLogger {
  constructor(file, { maxBytes = 5 * 1024 * 1024, backups = 2 } = {}) {
    this.file = file; this.maxBytes = maxBytes; this.backups = backups;
  }
  async rotateIfNeeded(extraBytes) {
    let size = 0;
    try { size = (await stat(this.file)).size; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (size + extraBytes <= this.maxBytes) return;
    for (let i = this.backups; i >= 1; i -= 1) {
      if (i === this.backups) await rm(`${this.file}.${i}`, { force: true });
      const source = i === 1 ? this.file : `${this.file}.${i - 1}`;
      try { await rename(source, `${this.file}.${i}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  async log(line) {
    const output = `${String(line)}\n`;
    try {
      await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
      await this.rotateIfNeeded(Buffer.byteLength(output));
      await appendFile(this.file, output, { mode: 0o600 });
      return true;
    } catch (error) {
      if (STORAGE_ERRORS.has(error?.code)) return false;
      throw error;
    }
  }
}
