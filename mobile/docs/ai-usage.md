# AI usage accounting

Each partner card has a model picker and estimated USD totals for the signed-in
account, summed across that provider's models. Selecting a model is applied only
after the connection check succeeds. Choices are remembered per partner locally.

The server records every paid request (including connection tests, translations,
summaries, and truncated/empty replies) in
`privateAiUsage/{uid}/requests/{eventId}`. These records contain metadata and token
counts, never prompts or replies. Per-partner aggregates are updated atomically.
Before dispatch, a pending event is persisted so a timeout or process failure
leaves an explicitly incomplete estimate. Finalization is idempotent. A recording
failure after generation does not discard a successful answer or trigger another
paid call. Server logs retain the event ID for investigation.

The authenticated `usage` callable reads only the caller's totals. Firestore's
existing deny-all rule protects the ledger, counters and aggregates from direct
client access. Client-supplied prices cannot change totals. An optional account
assertion rejects in-flight syncs if the signed-in account has changed. The existing
request allowance remains separate from usage reporting.

Practice time is foreground chat time with the selected API partner, including
reading, typing, listening and the translation/reminder trays. It excludes sample
replies, empty chats, settings, navigation and background time. It is not a measure
of voiced seconds. Cumulative per-install counters are saved locally every 15s,
and synced each minute and when opening the partner screen. Retries and stale
requests cannot double-count time. Multiple installations contribute to the
account total; simultaneous practice on two devices counts both sessions. An
abrupt app termination can lose the last 15s; a delayed timer is capped at 30s.

Per-hour cost is tracked spend / tracked practice hours. Only requests from builds
that report practice time contribute to its numerator, so older installations
cannot inflate it with spend that has no matching time tracking. Zero time or
missing cost data shows a dash. Total cost includes all requests after the server
update. Historical token counts were not retained and cannot be backfilled.

## Rate card, verified 3 November 2026

Standard paid text API prices per million tokens (input / cached input / output):

- GPT-5.4 mini: $0.75 / $0.075 / $4.50.
  https://developers.openai.com/api/docs/models/gpt-5.4-mini
- GPT-5.4: $2.50 / $0.25 / $15; above 272K input tokens, 2x input and 1.5x output.
  https://developers.openai.com/api/docs/models/gpt-5.4
- Claude Sonnet 5: $2 / $0.20 / $10. Haiku 4.5: $1 / $0.10 / $5.
  Cache creation: 1.25x input for 5m, 2x input for 1h.
  https://platform.claude.com/docs/en/about-claude/pricing
- Gemini 3.8 Flash: $0.75 / $0.075 / $3.75 until 31 December 2026;
  $1.50 / $0.15 / $7.50 from 1 January 2027.
- Gemini 2.5 Flash: $0.30 / $0.03 / $2.50 until 30 November 2026.
  From 1 December its alias redirects to another model. Estimates deliberately
  become unavailable until the replacement rate is verified and added.
  https://aistudio.google.com/docs/pricing

Rates live in `server/pricing.ts`; each request retains its rate-card version and
computed cost in integer billionths of a dollar. Existing totals are never
repriced when the card changes. Recheck rates when adding or migrating models.
These are list-price estimates, not invoices: they exclude account credits,
discounts, free tiers, taxes, Firebase/hosting and platform speech services.
Unknown usage/pricing is not treated as zero.

OpenAI and Claude output counts already include reasoning/thinking. Gemini's
`thoughtsTokenCount` is added to `candidatesTokenCount`. Cached tokens are a subset
of input for OpenAI/Gemini, but separate from Claude's ordinary `input_tokens`.

References:
https://developers.openai.com/api/docs/guides/token-counting
https://developers.openai.com/api/docs/guides/prompt-caching
https://platform.claude.com/docs/en/api/messages/create
https://aistudio.google.com/api-reference/generate-content#UsageMetadata
