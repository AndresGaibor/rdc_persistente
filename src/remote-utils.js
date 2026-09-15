import path from 'node:path';

export function resolveDesktopCommanderEntry(runtimeRoot) {
  return path.join(runtimeRoot, 'node_modules', '@wonderwhy-er', 'desktop-commander', 'dist', 'index.js');
}

export function createLineReader(onLine) {
  let buffer = '';
  const flush = () => {
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? '';
    for (const line of parts) onLine(line);
  };
  return {
    push(chunk) { buffer += String(chunk); flush(); },
    end() { if (buffer) onLine(buffer); buffer = ''; }
  };
}
