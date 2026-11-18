# Conversation allowance and subscriptions

Each verified Firebase account receives **15 minutes once**, shared across free
conversation and grammar practice. The balance does not reset daily, when changing
partner, signing out, or reinstalling. Existing practice statistics are not deducted.

The clock starts after the first successful AI conversation response. It counts
foreground conversation time, including reading, typing, listening and using the
translation or reminder tray. It pauses in Settings, other sections and when the
app backgrounds. It does not measure microphone recording time alone. Failed first
responses and connection tests do not start the clock.

At zero, the app opens the subscription sheet and the backend rejects further AI
requests. Learners can close the sheet to read saved chats and use their Dictionary.
An existing draft or saved message is preserved. Subscription purchase and restore
must be confirmed by the backend before AI access is unlocked.

## Current rollout state

The native UI and backend implementation are ready for configuration. Enforcement
is staged behind `PAYWALL_ENABLED=false`; it has not been activated in production.
An app running against the previous backend continues to work. The subscription
screen displays “coming soon” when store keys or legal links are absent. No live
prices or store products have been invented.

## Configure before activation

1. Agree the monthly and/or annual price, and create the corresponding renewable
   subscription products in App Store Connect (and Google Play for Android).
2. Add the apps/products to RevenueCat. Attach products to the entitlement
   `language_partner_plus`, and put Monthly and/or Annual packages in the current
   offering. The UI uses actual localized store prices.
3. Set the public mobile configuration from `.env.example`:
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, optionally
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_TERMS_URL` and
   `EXPO_PUBLIC_PRIVACY_URL`. Both legal URLs must use HTTPS. Rebuild the native app.
4. Configure the server-only `BILLING_KEYS` secret as JSON with `revenuecat`
   (RevenueCat REST API key) and `webhook` (a random authorization string of at
   least 32 characters). Never place this secret in mobile environment variables.
5. Deploy `conversationAllowance`, `refreshSubscription`, `revenuecatWebhook` and
   the updated `llm` function in an approved rollout. Configure RevenueCat's webhook
   URL and Authorization header to exactly match the server's webhook secret.
   Subscribe to purchase, renewal, cancellation, expiration, refund and transfer
   events. Firebase UID is the RevenueCat App User ID.
6. On a test backend, enable `PAYWALL_ENABLED` and `BILLING_ALLOW_SANDBOX`. Verify
   purchase, cancelled purchase, restore after reinstall, renewal/grace period,
   expiration, refund, account switching and webhook delivery on a real device.
   Confirm the 15-minute boundary and access to saved data after dismissal.
7. Only after the purchase/restore flow works, activate `PAYWALL_ENABLED` for the
   production backend. Set `BILLING_ALLOW_SANDBOX=false` for production billing.
   Do not enable enforcement for builds without a usable checkout.

## Accounting and verification

`privateConversationAccess/{uid}` is writable only by the backend. Transactions use
server timestamps and a renewable 30-second lease; the client sends a session ID
and activity, never elapsed time or credits. The UI refreshes every 10 seconds.
Normal navigation pauses immediately; a crash or lost connection can consume at
most the remainder of a 30-second lease. Only one device can own an active free
conversation. This measures activity in the official client, not proof of speech.

RevenueCat webhooks and Restore purchases fetch authoritative customer state from
the server API. Out-of-order snapshots are ignored. Cancellation keeps access
through the paid expiry; refunds revoke it; grace periods are respected. A mobile
purchase result alone never grants backend access. If confirmation is temporarily
unavailable, Restore purchases retries without buying again.

`react-native-purchases` is pinned to `10.16.0`: version 11.0.0 referenced a native
dependency not available in the CocoaPods index during integration. Reassess the
pin during a later dependency update.

Validation includes unit tests for accounting boundaries and subscription state,
plus Firebase emulator tests for authenticated access, account isolation, denied
client writes, concurrent devices and request-start behavior. Store transactions
still require the configured device acceptance tests above.

### Verification on November 3, 2026

- TypeScript check and all 64 unit tests passed; all four Firebase emulator
  integration tests passed after the final backend change.
- iOS Release build succeeded, and the app was installed and launched on the
  connected iPhone (installation sequence 7408).
- The paywall presentation was checked at 393 × 852 and 320 × 568, including
  plan selection, scrolling, dismissal and the unconfigured state. Preview prices
  are fixture data only; no real purchase or restore transaction was attempted.
- Production enforcement remains disabled; no backend deployment was performed.
