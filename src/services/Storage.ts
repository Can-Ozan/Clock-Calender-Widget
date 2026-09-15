export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class Storage {
  private backend: StorageBackend | null;
  private memory = new Map<string, string>();
  private warned = false;
  persistent = true;

  constructor(
    private report: (message: string) => void = () => {},
    backend?: StorageBackend | null,
  ) {
    try {
      this.backend = backend === undefined ? globalThis.localStorage : backend;
    } catch {
      this.backend = null;
    }
    if (!this.backend) this.fail();
  }

  private fail(): void {
    this.persistent = false;
    if (!this.warned) {
      this.warned = true;
      this.report('Storage is unavailable or full. Changes are kept for this session only.');
    }
  }

  readText(key: string): string | null {
    if (this.memory.has(key)) return this.memory.get(key) ?? null;
    try {
      return this.backend?.getItem(key) ?? null;
    } catch {
      this.fail();
      return null;
    }
  }

  read<T>(key: string, decode: (value: unknown) => T | null, fallback: T): T {
    const raw = this.readText(key);
    if (raw === null) return structuredClone(fallback);
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!isRecord(envelope) || envelope.version !== 1) throw new Error('Unknown data version');
      const data = decode(envelope.data);
      if (data === null) throw new Error('Invalid data');
      return data;
    } catch {
      this.report(
        `Saved data (${key}) could not be read. The original is preserved until you save a change.`,
      );
      return structuredClone(fallback);
    }
  }

  write(key: string, data: unknown): void {
    const raw = JSON.stringify({ version: 1, data });
    try {
      if (!this.backend) throw new Error('Unavailable storage');
      this.backend.setItem(key, raw);
      this.memory.delete(key);
    } catch {
      this.memory.set(key, raw);
      this.fail();
    }
  }
}
