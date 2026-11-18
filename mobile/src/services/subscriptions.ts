import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { firebase } from "./firebase";
import { verifySubscription } from "./conversationAccess";
import { subscriptionLegalReady, type SubscriptionPlan } from "./subscriptionTypes";
export { subscriptionTermsUrl, subscriptionPrivacyUrl, subscriptionLegalReady } from "./subscriptionTypes";
export type { SubscriptionPlan } from "./subscriptionTypes";

const key = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
export const subscriptionsConfigured = !!key && subscriptionLegalReady;
let queue: Promise<unknown> = Promise.resolve();
function withPurchases<T>(uid: string, action: () => Promise<T>): Promise<T> {
  const run = queue.catch(() => {}).then(async () => {
    const check = () => { if (firebase?.auth.currentUser?.uid !== uid) throw new Error("Sign in to the account you want to subscribe with."); };
    check();
    if (!subscriptionsConfigured) throw new Error("Subscriptions are not available yet.");
    if (!await Purchases.isConfigured()) Purchases.configure({ apiKey: key!, appUserID: uid });
    else if (await Purchases.getAppUserID() !== uid) await Purchases.logIn(uid);
    check();
    const result = await action();
    check();
    return result;
  });
  queue = run;
  return run;
}
const supported = (p: PurchasesPackage) => p.packageType === "MONTHLY" || p.packageType === "ANNUAL";
export const subscriptionPlans = (uid: string): Promise<SubscriptionPlan[]> => withPurchases(uid, async () =>
  (await Purchases.getOfferings()).current?.availablePackages.filter(supported).map((p) => ({
    id: p.identifier, title: p.packageType === "ANNUAL" ? "Yearly" : "Monthly",
    price: p.product.priceString, period: p.packageType === "ANNUAL" ? "year" : "month",
  })) ?? []);
export const purchaseSubscription = (uid: string, planId: string) => withPurchases(uid, async () => {
  const plan = (await Purchases.getOfferings()).current?.availablePackages.find((p) => p.identifier === planId && supported(p));
  if (!plan) throw new Error("This plan is no longer available. Please reload the plans.");
  await Purchases.purchasePackage(plan);
  // A store success alone never unlocks the API. Verify the same Firebase UID
  // with RevenueCat from our backend before continuing the conversation.
  return verifySubscription(uid);
});
export const restoreSubscription = (uid: string) => withPurchases(uid, async () => {
  await Purchases.restorePurchases();
  return verifySubscription(uid);
});
