// Firebase sessions can exceed a single Keychain value. Commit a small manifest
// only after every chunk is durable, so a failed write keeps the previous session.
export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
type Manifest = { generation: string; count: number };
export function secureChunks(store: SecretStore) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = queue.catch(() => {}).then(work);
    queue = next;
    return next;
  };
  const name = (key: string) =>
    `lp-auth-${Array.from(key, (c) => c.codePointAt(0)!.toString(16)).join("_")}`;
  async function manifest(base: string): Promise<Manifest | null> {
    const raw = await store.get(base);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      typeof value.generation !== "string" ||
      !Number.isInteger(value.count) ||
      value.count < 0 ||
      value.count > 10000
    )
      throw new Error("Saved login is damaged. Please sign in again.");
    return value;
  }
  async function clean(base: string, previous: Manifest | null) {
    if (previous)
      for (let i = 0; i < previous.count; i++)
        await store
          .remove(`${base}.${previous.generation}.${i}`)
          .catch(() => {});
  }
  return {
    getItem: (key: string) =>
      serial(async () => {
        const base = name(key),
          saved = await manifest(base);
        if (!saved) return null;
        let result = "";
        for (let i = 0; i < saved.count; i++) {
          const chunk = await store.get(`${base}.${saved.generation}.${i}`);
          if (chunk === null)
            throw new Error("Saved login is incomplete. Please sign in again.");
          result += chunk;
        }
        return result;
      }),
    setItem: (key: string, value: string) =>
      serial(async () => {
        const base = name(key),
          previous = await manifest(base);
        const characters = Array.from(value);
        const next = {
          generation: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          count: Math.ceil(characters.length / 400),
        };
        try {
          for (let i = 0; i < next.count; i++)
            await store.set(
              `${base}.${next.generation}.${i}`,
              characters.slice(i * 400, (i + 1) * 400).join(""),
            );
          await store.set(base, JSON.stringify(next));
        } catch (error) {
          await clean(base, next);
          throw error;
        }
        await clean(base, previous);
      }),
    removeItem: (key: string) =>
      serial(async () => {
        const base = name(key),
          previous = await manifest(base);
        await store.remove(base);
        await clean(base, previous);
      }),
  };
}
