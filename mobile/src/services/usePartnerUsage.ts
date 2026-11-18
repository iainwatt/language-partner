import { useCallback, useEffect, useRef, useState } from "react";
import { id, type Snapshot, type Provider, type PracticeCounter } from "../core/domain";
import type { UsageOverview } from "../core/usage";
import { partnerUsage } from "./api";

type Mutate = (change: (previous: Snapshot) => Snapshot) => Promise<unknown>;
export function usePartnerUsage(data: Snapshot | undefined, mutate: Mutate, provider: Provider | null, visible: boolean, uid?: string) {
  const latest = useRef(data);
  const save = useRef(mutate);
  latest.current = data;
  save.current = mutate;
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const clock = useRef<{ provider: Provider; at: number } | null>(null);
  const pending = useRef({ openai: 0, claude: 0, gemini: 0 });
  const flight = useRef<Promise<UsageOverview> | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const flush = useCallback(async () => {
    if (clock.current) {
      const now = Date.now();
      // A suspended JS timer must never count hours spent in the background.
      const elapsed = Math.min(30000, Math.max(0, now - clock.current.at));
      pending.current[clock.current.provider] += elapsed;
      clock.current.at = now;
    }
    // Opening settings can race the timer's last disk write. Queue flushes so
    // the usage refresh waits for that write instead of displaying stale hours.
    const task = writes.current.catch(() => {}).then(async () => {
      if (!latest.current || !Object.values(pending.current).some(Boolean)) return;
      const elapsed = pending.current;
      pending.current = { openai: 0, claude: 0, gemini: 0 };
      try {
      let committed: PracticeCounter | undefined;
      await save.current((previous) => {
        const old = previous.partnerPractice ?? { id: id(), openai: 0, claude: 0, gemini: 0 };
        const next = { ...previous, partnerPractice: {
          id: old.id,
          openai: old.openai + elapsed.openai,
          claude: old.claude + elapsed.claude,
          gemini: old.gemini + elapsed.gemini,
        } };
        committed = next.partnerPractice;
        return next;
      });
      // The commit has finished even if React has not rendered its state yet.
      if (latest.current && committed) latest.current = { ...latest.current, partnerPractice: committed };
      } catch (e) {
        for (const key of ["openai", "claude", "gemini"] as const) pending.current[key] += elapsed[key];
        throw e;
      }
    });
    writes.current = task;
    return task;
  }, []);

  const refresh = useCallback(() => {
    if (flight.current) return flight.current;
    if (mounted.current) setLoading(true);
    const request = (async () => {
      await flush();
      if (!mounted.current || !uid) throw new Error("The account has changed.");
      const value = await partnerUsage(uid, latest.current?.partnerPractice);
      if (mounted.current) { setOverview(value); setError(""); }
      return value;
    })().catch((e) => {
      if (mounted.current) setError("Usage couldn’t refresh. Check your connection and try again.");
      throw e;
    }).finally(() => {
      flight.current = null;
      if (mounted.current) setLoading(false);
    });
    flight.current = request;
    return request;
  }, [flush, uid]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!provider) return;
    clock.current = { provider, at: Date.now() };
    let ticks = 0;
    const timer = setInterval(() => {
      void (++ticks % 4 === 0 ? refresh() : flush()).catch(() => {});
    }, 15000);
    return () => {
      clearInterval(timer);
      void flush().catch(() => {});
      clock.current = null;
    };
  }, [provider, flush, refresh]);
  useEffect(() => { if (visible) void refresh().catch(() => {}); }, [visible, refresh]);
  return { overview, error, loading, refresh };
}
