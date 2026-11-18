export type SubscriptionPlan = { id: string; title: string; price: string; period: string };
export const subscriptionTermsUrl = process.env.EXPO_PUBLIC_TERMS_URL ?? "";
export const subscriptionPrivacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "";
export const subscriptionLegalReady = /^https:\/\//.test(subscriptionTermsUrl) && /^https:\/\//.test(subscriptionPrivacyUrl);
