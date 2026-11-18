import { snapshotSchema, type Snapshot } from "../core/domain";
export interface StringStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
export class Repository {
  private writes = Promise.resolve();
  constructor(private store: StringStore) {}
  async load(
    scope: string,
  ): Promise<{ snapshot: Snapshot; revision: number; dirty: boolean } | null> {
    await this.writes.catch(() => {});
    const raw = await this.store.get(`workspace:${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      snapshot: snapshotSchema.parse({
        ...parsed.snapshot,
        entries: [],
        savedConversations: [],
      }),
      revision: parsed.revision ?? 0,
      dirty: parsed.dirty ?? true,
    };
  }
  save(scope: string, snapshot: Snapshot, revision = 0, dirty = true) {
    const payload = JSON.stringify({
      snapshot: snapshotSchema.parse({
        ...snapshot,
        entries: [],
        savedConversations: [],
      }),
      revision,
      dirty,
    });
    const write = this.writes
      .catch(() => {})
      .then(() => this.store.set(`workspace:${scope}`, payload));
    this.writes = write;
    return write;
  }
}
