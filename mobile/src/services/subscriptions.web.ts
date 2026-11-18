import type { SubscriptionPlan } from "./subscriptionTypes";
export { subscriptionTermsUrl, subscriptionPrivacyUrl, subscriptionLegalReady } from "./subscriptionTypes";
export type { SubscriptionPlan } from "./subscriptionTypes";
export const subscriptionsConfigured = false;
export async function subscriptionPlans(_uid: string): Promise<SubscriptionPlan[]> { return []; }
export async function purchaseSubscription(_uid: string, _planId: string): Promise<boolean> { throw new Error("Subscribe in the iPhone or Android app."); }
export async function restoreSubscription(_uid: string): Promise<boolean> { throw new Error("Restore purchases in the app where you subscribed."); }
