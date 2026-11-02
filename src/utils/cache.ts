/**
 * Process-wide cache for a value that is expensive to fetch and changes rarely
 * (reference lists, registers). Two things it does that a bare `x ??= await f()`
 * does not: the value expires, so a server that stays up for weeks does not
 * serve a stale register forever, and concurrent callers share one in-flight
 * request instead of each starting their own. A rejected load is not cached.
 */
export interface CachedValue<T> {
  get(): Promise<T>;
  clear(): void;
}

export function cached<T>(ttlMs: number, load: () => Promise<T>): CachedValue<T> {
  let entry: { value: T; at: number } | null = null;
  let pending: Promise<T> | null = null;

  return {
    get(): Promise<T> {
      if (entry && Date.now() - entry.at < ttlMs) return Promise.resolve(entry.value);
      pending ??= load()
        .then((value) => {
          entry = { value, at: Date.now() };
          return value;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    clear(): void {
      entry = null;
      pending = null;
    },
  };
}
