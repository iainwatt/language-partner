import { randomUUID } from "node:crypto";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { providers, type Provider, type PracticeCounter } from "../src/core/domain";
import { emptyPartnerUsage, practiceDelta, type PartnerUsage, type UsageOverview } from "../src/core/usage";
import { estimateCostNanos, PRICING_VERSION } from "./pricing";
import type { UsageObservation } from "./providers";

const partnerList = Object.keys(providers) as Provider[];
const root = (uid: string) => `privateAiUsage/${uid}`;

// Create a durable pending record BEFORE making a potentially billable request.
// If the process dies or the provider times out, the UI reports an incomplete
// estimate, rather than silently counting that request as free.
export async function beginUsage(uid: string, provider: Provider, model: string, action: string, tracked: boolean, db = getFirestore()) {
  const eventId = randomUUID();
  const event = db.doc(`${root(uid)}/requests/${eventId}`);
  const summary = db.doc(`${root(uid)}/partners/${provider}`);
  const at = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const data = { ...emptyPartnerUsage(), ...(await tx.get(summary)).data() } as PartnerUsage;
    tx.set(summary, {
      ...data, startedAt: data.startedAt ?? at,
      requests: data.requests + 1, unknownRequests: data.unknownRequests + 1,
      trackedRequests: data.trackedRequests + Number(tracked),
      trackedUnknownRequests: data.trackedUnknownRequests + Number(tracked),
    });
    tx.create(event, { provider, model, action, tracked, at, status: "pending", pricingVersion: PRICING_VERSION });
  });
  return eventId;
}

export async function finishUsage(uid: string, eventId: string, observation: UsageObservation | undefined, failed: boolean, db = getFirestore()) {
  const event = db.doc(`${root(uid)}/requests/${eventId}`);
  await db.runTransaction(async (tx) => {
    const saved = (await tx.get(event)).data();
    if (!saved || saved.status !== "pending") return;
    const summary = db.doc(`${root(uid)}/partners/${saved.provider}`);
    const data = { ...emptyPartnerUsage(), ...(await tx.get(summary)).data() } as PartnerUsage;
    const tokens = observation?.tokens ?? null;
    const cost = estimateCostNanos(saved.provider, saved.model, tokens, saved.at);
    const known = cost !== null;
    tx.set(summary, {
      ...data,
      pricedRequests: data.pricedRequests + Number(known),
      unknownRequests: data.unknownRequests - Number(known),
      inputTokens: data.inputTokens + (tokens?.input ?? 0),
      outputTokens: data.outputTokens + (tokens?.output ?? 0),
      cachedInputTokens: data.cachedInputTokens + (tokens?.cachedInput ?? 0),
      estimatedCostNanos: data.estimatedCostNanos + (cost ?? 0),
      trackedCostNanos: data.trackedCostNanos + (saved.tracked ? cost ?? 0 : 0),
      trackedUnknownRequests: data.trackedUnknownRequests - Number(known && saved.tracked),
    });
    tx.update(event, {
      status: failed ? "failed" : "completed", tokens,
      estimatedCostNanos: cost,
      responseId: observation?.responseId ?? null,
      responseModel: observation?.responseModel ?? null,
    });
  });
}

export async function usageOverview(uid: string, practice?: PracticeCounter, db: Firestore = getFirestore()): Promise<UsageOverview> {
  const refs = partnerList.map((p) => db.doc(`${root(uid)}/partners/${p}`));
  return db.runTransaction(async (tx) => {
    const docs = await tx.getAll(...refs);
    const overview = Object.fromEntries(partnerList.map((p, i) => [p, {
      ...emptyPartnerUsage(), ...docs[i].data(),
    }])) as UsageOverview;
    if (practice) {
      const device = db.doc(`${root(uid)}/devices/${practice.id}`);
      const previous = (await tx.get(device)).data() as PracticeCounter | undefined;
      const delta = practiceDelta(previous, practice);
      const merged = { ...practice };
      partnerList.forEach((p, i) => {
        merged[p] = Math.max(practice[p], previous?.[p] ?? 0);
        if (!delta[p]) return;
        overview[p].practiceMs += delta[p];
        // Practice on an older/offline chat needn't create a billing start date.
        tx.set(refs[i], overview[p]);
      });
      if (!previous || partnerList.some((p) => delta[p])) tx.set(device, merged);
    }
    return overview;
  });
}
