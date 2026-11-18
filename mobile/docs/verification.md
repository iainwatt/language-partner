# Verification

## Managed service, tester feedback and Google sign-in — November 5, 2026

- Removed the app's provider/model picker and connection screen. Signed-in profiles migrate to managed OpenAI practice, preserving languages and history; guests retain samples. The backend overrides caller-supplied provider/model settings for generated replies, translations and summaries. Managed service errors no longer tell users to choose a different provider or configure access.
- Added Feedback to the header and Settings, plus a sixth tutorial page encouraging frequent tester feedback. Dictation uses the selected native language and shares the existing audio coordinator; users stop, review/edit and submit the text. Speech recognition explicitly disables recording persistence. No audio upload/storage fields or storage bucket are introduced.
- The deployed `submitFeedback` callable requires a verified Firebase account, applies separate rate limits, derives the owner UID from authentication, and writes private reports before attempting English translation. Client report reads/writes are denied by the deployed catch-all Firestore rules. Duplicate retries retain one report. Translation failures retain the original with `translationStatus=pending`.
- Firebase's Google provider was already enabled. Registered the iOS app for `com.iainwatt.languagepartner`, configured its public iOS/web client IDs and reversed-client callback, added the native SDK/config plugin, and installed its Pods. Native account linking checks the current account and matching email before linking; Firebase UID-based saved data stays associated with that account. Web uses Firebase popup sign-in/linking. Android still needs the actual Firebase Android app/signing-fingerprint setup before native device acceptance.
- TypeScript and all 80 automated tests pass. Final Expo exports succeed for iOS, Android and web. An unsigned iOS Release simulator build succeeds, including Google sign-in, and the compiled plist/Hermes bundle contains its callback/client configuration, Google button, feedback form and tester tutorial. This is not a signed physical-phone or TestFlight build.
- A deployed English-feedback smoke test passed authenticated save, English passthrough, duplicate retry, rejection of audio and caller UID fields, client-read denial and signed-out denial. The disposable test account/report were removed. A French smoke test confirmed original-text retention, but English translation remained pending: OpenAI rejects both the currently configured cloud credential and the existing local credential with `401 invalid_api_key`. No credentials were logged. A valid backend `LLM_API_KEYS.openai` secret and function refresh are needed before live AI/translation acceptance can pass.
- Browser QA of the actual components with a simulated dictation driver confirms stop/edit/submit states, language choice, the six-step tutorial and Google/email sign-in choices at phone width. This does not verify physical microphone permissions, native speech recognition or an actual Google OAuth sign-in on a phone. Those checks require installing the rebuilt app.
- No dashboard or behaviour-event collection was added; those remain the next planning step. Unsent feedback drafts are account-scoped in memory and are not retained through an app restart.

## Stats, conversation crib sheet and grammar lessons — September 18, 2026

- My stats now retains daily talk-time history and shows today, the last seven days, the current month and the lifetime total. A compact bar chart switches between seven daily bars, six calendar weeks and six months. Existing lifetime time is preserved; period history starts with this build. Saved-word and saved-conversation totals remain below the speaking chart.
- Saved and repeat-practice conversations now show a book icon beside Translate. It opens a 76%-height saved-words sheet for that conversation. The sheet uses a compact two-column word/translation layout, smaller type, six-point row padding and one scrolling surface for long lists.
- Grammar appears immediately below Saved conversations in the drawer. The screen reads language-specific topics from `grammar/{language}/topics`, falls back to bundled starter topics while Firebase connects, and creates a focused chat carrying the selected title, description and private lesson prompt on every AI turn. Client requests cannot write curriculum documents.
- `npm run check` passes TypeScript and all 42 unit tests. Tests cover legacy stats migration, day/week/month aggregation, chart series, starter topics for all eight languages, grammar conversation creation and keeping the internal lesson prompt out of the visible user-message input. `npx expo export --platform all` succeeds for iOS, Android and web. The Firestore emulator rule test confirms signed-in shared reads, signed-out denial and denial of client curriculum writes. The older callable-auth integration scenario still returns an emulator-only `internal [0]` before reaching its first unauthenticated assertion; this also occurs with an isolated fresh Functions emulator and is unrelated to the new grammar rule assertions.
- Mobile web review at 390×844 confirms the navigation order, grammar cards and the day/week/month stats views fit without horizontal overflow. The signed Release iPhone build succeeds, its Hermes bundle contains the new grammar, vocabulary and chart content, and signature verification passes. The build was installed over `com.iainwatt.languagepartner` on the paired iPhone 17 Pro. Automatic launch was denied because the phone was locked; open it manually to review.
- Production grammar support is deployed to `languagepartner-23507`: the reviewed Firestore rules and Node.js 22 `llm` function are live, and the five Russian curriculum documents have been seeded and read back successfully. Grammar lessons send their private structured curriculum on every AI turn; the first reply opens with a compact reference and every learner-facing exercise is followed by a translation in the learner's native language.

## Speech text cleanup — September 17, 2026

- All `AudioCoordinator.play` calls prepare a separate spoken copy before sending text to the platform voice. Russian guillemets, ASCII double-angle quote pairs, typographic double quotes and paired straight double quotes are removed. Common Markdown emphasis, headings, bullets, dividers and backticks are removed while keeping their words. Normal sentence punctuation, paragraph breaks, apostrophes, numbers and single comparison signs remain. Displayed/stored text and phrase-selection offsets are unchanged.
- Empty or decorative-only text releases existing audio and returns to the paused state without starting an empty utterance. Both chat and translator playback use the shared cleanup, including existing conversation/dictionary text.
- TypeScript and all 38 tests pass, including six new tests covering Russian/ASCII/nested quotes and formatting, Unicode, meaningful punctuation/numbers/symbols, shared playback and empty-output audio state. The Release iPhone build and signature verification pass; its Hermes bundle contains the cleanup and retains the connection notice and cloud configuration. Audible pronunciation still needs a check on the phone's selected voice.
- Installed the signed update over the existing app on the paired iPhone 17 Pro. The first transfer lost its device connection; the retry completed successfully.

## Saved-data connection message — September 17, 2026

- Added a persistent connection notice on the main screens and in the navigation drawer while either the dictionary or saved-conversation listener is disconnected. It asks the user to check Wi-Fi or mobile data and clears once both listeners receive server data. Unloaded dictionary/stat totals use loading placeholders, and practice does not show its first-phrase prompt before the dictionary loads.
- `npm run check` passes TypeScript and all 32 existing tests. Built and signed the Release iPhone app; verified that its bundled JavaScript contains the connection message and the cloud Firebase project configuration. Signature verification passes with access to the Mac's trust settings.
- Installed the update over `com.iainwatt.languagepartner` on the paired iPhone 17 Pro using `devicectl`. Installation succeeded. The subsequent launch command failed because the device tunnel timed out, so opening the updated app and checking the notice with mobile data/Wi-Fi disabled remain on-device checks. This is a standalone installed build; source edits require rebuilding and installing the app, not merely reloading it.

## Short source examples — September 15, 2026

- Selecting a word or phrase suggests a literal excerpt from that occurrence, with up to two words on either side and sentence/clause boundaries respected. The excerpt can be shortened while retaining the selected occurrence, or removed. Word and example translations are separate, editable results from the existing translation endpoint, using the selected excerpt for disambiguation.
- Firebase entries optionally contain `example: { text, translation }`, bounded to 600/2000 characters. Dictionary cards and saved-topic word lists display the example; recall cards show it only after revealing the answer. Plain repeat saves and reviews preserve examples, while an explicitly saved replacement changes the example without resetting the review history. Dictionary editing supports adding, editing and removing the pair.
- TypeScript and 30 unit tests pass; both Firebase emulator integration tests pass. Coverage includes Russian and Unicode excerpts, repeated occurrences, multiword selection, clause boundaries, duplicate saves, review preservation, example removal via REST field masks, local-storage exclusion, field validation and account isolation. The updated Firestore rules are deployed to the existing cloud project; no API or native module change was needed.
- Native live check: selected `уважительным` in the original employee chat. The app suggested `вежливым и уважительным к коллегам`; shortened it to `уважительным к коллегам`. OpenAI returned `respectful` for the word and `respectful toward colleagues` for the example. Saving completed with the normal Firebase confirmation and linked the new entry to the employee topic. The form's text fields were compacted after visual inspection to keep the save action easier to reach.
- After a cold restart, the native dictionary loaded nine entries from Firebase and displayed the new word with `уважительным к коллегам` and `respectful toward colleagues` underneath. The word is emphasized in the excerpt, and its employee-topic link remains present. Final type checking and whitespace checks pass.

## Saved conversation context — September 15, 2026

- Added account-owned Firebase topic documents with a title, description, optional native-language summary, and source-summary revision. Dictionary entries link to one or more topics; repeat sessions retain their topic ID. Original transcripts and settings remain on the device, while summaries and dictionary entries are stripped from local persistence.
- TypeScript and 26 unit tests pass. Added tests for repeat-session identity, legacy unlinked words, duplicate links preserving review progress, cloud-only summaries and vocabulary, atomic context/word writes, and native-language summary/recall instructions.
- Both Firebase integration tests pass with added coverage for topic ownership, invalid fields/size rejection, atomic word/topic commits, and parallel REST appends retaining both conversation links. Deployed the rules and updated `language-partner:llm` function to the existing cloud project successfully.
- On the iPhone 17 simulator, generated an English summary of the existing employee-qualities conversation through the deployed OpenAI function. Verified the editable title, description and summary screen. The owner saved the topic, linked six existing phrases, and opened **Practise again** while testing: the observed recap screen displayed the English summary and six English meanings only, with the Russian answers hidden. This also verified the native cloud topic/word flow. No native module or Xcode rebuild was required.
- New saves create/link their topic automatically. Older words require explicit association through **Add words**; no source conversation is inferred from phrase text. Saved topic details include pronunciation, access to the original local transcript and a topic-only recall preview. Live Claude/Gemini requests and Android UI remain unverified.
- Final cold restart restored the signed-in account, the active employee practice session, its saved title and English recap, and all six linked meanings from Firebase. The initial recap stays at the top, and the composer suggests trying a phrase or asking for a hint. The original transcript remains separate. Final type checking passes after the UI refinements.

## Current Firebase build — September 15, 2026

- `npm run check`: TypeScript and 21 automated tests pass. Added coverage for large Unicode Keychain sessions, interrupted credential writes, sign-out cleanup, Firebase-only dictionary serialization, account-scoped conversation storage, private tester access, selected-provider routing, real-request error handling and translation context. Removed the old custom account lifecycle and local dictionary persistence tests along with those implementations.
- Two Firebase emulator integration tests pass against Auth, Firestore and the callable function. They exercise account registration, wrong-password rejection, email verification, password reset, sign-out, reading a saved dictionary after login, authenticated REST commits, cross-user read/write/delete denial, invalid document rejection, protected server usage counters and rejection of unsigned or uninvited AI requests.
- Web UI: created and verified a disposable local account, signed in, translated a known demo phrase and saved it through Firebase. The app reported the save only after the server confirmed it. OpenAI, Claude and Gemini buttons display availability from the authenticated backend. Before key configuration, all providers were correctly unavailable.
- iPhone 17 / iOS 26.3 simulator: the new Firebase sign-in screen renders correctly. Signed in with the same test account and verified that its dictionary displays `С нетерпением жду.` → `I'm looking forward to it.`, saved from the web preview. This verifies account sign-in and cross-client Firebase dictionary retrieval on native iOS. A full native app relaunch also restored the signed-in session without entering credentials again. A stale React Native startup error after a long idle period cleared on a clean app restart.
- Expo exports passed for iOS, Android and web. Firebase Cloud Functions bundling passed. The native build used the already-installed SecureStore module; Firebase is the JavaScript SDK.
- Dictionary documents use Firestore memory caching only; writes are authenticated REST commits without an offline write queue. The local repository strips dictionary entries on both read and write. Local storage remains for conversations and preferences, and Keychain/Keystore stores native auth sessions. There is no dictionary import or export workflow.
- Live OpenAI: the owner added an API key to the ignored, mode-600 `functions/.secret.local`. Rebuilding Functions reloaded the backend worker without restarting Auth or Firestore. In the iPhone simulator, OpenAI became available and **Use OpenAI** completed its real connection probe, displaying **OpenAI connected.** A chat message was sent through the native composer, and the owner then exercised phrase selection and live translation.
- Authenticated backend checks with `gpt-5.4-mini`: a Russian message about blue kitchen cabinets received a Russian reply. A second turn asking for the previously chosen colour correctly returned `Ты выбрал синий цвет для шкафов.` Translation of `синие шкафы` returned `blue cabinets`. These used real OpenAI requests through the local Firebase callable function, including its normal tester authorization and request allowance.
- Cloud Firebase setup: the owner entered the Web app configuration and tester email in ignored local files. Validated their format without printing the values, refreshed Firebase CLI authentication through the owner's browser login, and confirmed the default Firestore database is Native mode in `eur3`. The rules compiled and the dictionary rules and indexes deployed successfully. TypeScript and all 21 unit tests passed again before deployment.
- Cloud Functions deployment: the owner uploaded `LLM_API_KEYS` to Secret Manager. Checked only its metadata and confirmed an enabled version; the agent did not retrieve its value or upload the key. The Node.js 22 `llm` function deployed successfully in `europe-west2`, with access to that secret and the configured tester email. The CLI initially returned a nonzero exit after successful function creation because build-image cleanup was unset; a seven-day cleanup policy was then successfully configured for the new `gcf-artifacts` repository in that region.
- Cloud access checks: a Firestore dictionary request without credentials returned HTTP 403 `PERMISSION_DENIED`. A callable AI request without credentials returned HTTP 401 `UNAUTHENTICATED` with the app's sign-in message. Neither check wrote dictionary data or made a paid AI request.
- Cloud simulator: restarted Metro using `npm start` and `.env`, rebuilt the iOS JavaScript bundle, and relaunched the existing iPhone 17 app. The owner created and verified a cloud account. Its initial settings used Demo mode; the provider panel correctly reported OpenAI available and the account eligible. **Use OpenAI** completed the real cloud connection probe and displayed **OpenAI connected.** A message about the qualities of a good employee then received a relevant Russian response with a follow-up question.
- Native dictionary timeout fix: the installed React Native build provides the `abort-controller` polyfill, which has no `AbortSignal.timeout`. The dictionary save used that unavailable method inside its fetch error handler, producing a misleading connection error before sending a request. Replaced it with `AbortController` and a twenty-second timer cleared in `finally`. TypeScript and all 21 tests pass. With the updated bundle, a live cloud translation of `Reliable` returned `Надёжный`; **Save phrase** completed and the app displayed **Saved to your Firebase dictionary.** A cold app launch restored the signed-in account and conversation; the owner continued using native phrase selection afterward.

- Russian input check: pasted two lines of Cyrillic into the browser chat input and verified the exact text and enabled Send button without sending the test draft. Confirmed Simulator `PasteboardAutomaticSync = 1`. The native app subsequently displayed the user's Russian message about renovating their apartment. Direct native automation of Mac clipboard paste timed out, so this does not establish that every simulator paste shortcut is reliable. No input filtering or clipboard-blocking code was found, and no app code change was needed for Cyrillic support.

The dated sections below record earlier builds. Their descriptions of local dictionary storage and custom account authentication have been superseded by the Firebase implementation above.

## Simulator launch — September 11, 2026

- The user installed a development build in the iPhone 17 simulator running iOS 26.3. Its launcher displayed **No development servers found** because Metro was not running.
- Started Metro on port 8081, verified `packager-status:running`, and opened the installed `com.languagepartner.app` through its `languagepartner://expo-development-client/` link. The iOS bundle completed successfully, and a simulator screenshot confirms the native app displaying its Dictionary navigation drawer. Screenshot: `/private/tmp/language-partner-iphone17-connected.png`.
- This verifies the installed app launches in the simulator. The earlier Xcode/platform failures below are historical; real-device signing, native gesture/audio acceptance checks and live provider authentication remain separate checks.

## iOS visual redesign — September 10, 2026

- Used the [official Claude iOS screenshots](https://apps.apple.com/us/app/claude-by-anthropic/id6473753684) as the visual reference. Reduced the header to navigation and conversation controls, removed the large language banner and chat labels, added serif replies without enclosing cards, and placed Translate/model/voice/send controls inside a rounded composer. The palette uses off-white, charcoal and muted teal. The drawer and sheets share the revised typography and spacing.
- Translation slides over the current chat without a separate recent-message card. At 390 × 844, verified the initial panel and translated result layout, then inserted `С нетерпением жду.` into an existing `Сегодня я` draft without sending. Reloaded afterward to clear the test draft. Verified highlighting `Давай` exposes the save action with the new serif text. Dictionary persistence and selection offsets remain unchanged.
- `npm run check` passes all 20 tests; the final TypeScript check and web/iOS/Android bundle exports pass. The updated iOS `PhraseSelection` Pod target compiles successfully, including its serif-font property. Build log: `/private/tmp/language-partner-typography-pod-build.log`. Android typography is included in the JavaScript export; Kotlin compilation and on-device visual checks remain subject to the existing toolchain limits below.
- The typeface is a close system-font approximation: Georgia on iOS/web and system serif on Android. Native touch, keyboard and drawer behavior still require device testing.

## Navigation drawer update — September 10, 2026

- Replaced bottom navigation with a top-left menu that slides in from the left. It contains Dictionary and Recents, with titles derived from the first user message when no custom title exists and ordered by the latest turn. New chat stays in the header; Translate stays beside the composer. Practice remains accessible from Dictionary.
- Browser-verified Dictionary navigation with all five saved entries preserved, switching between the Spanish and Russian recent conversations, Escape dismissal, and tapping the backdrop to dismiss. Checked the chat and drawer at 390 × 844, including the visible Translate button, and restored the normal viewport. Left the Russian conversation active.
- `npm run check` passes TypeScript and all 20 tests. Native drawer animation, safe-area behavior and Android Back still need a device/development-build check.

## Local dictionary update — September 10, 2026

- The workspace loads exclusively from the existing on-device key. Dictionary storage no longer imports the account API, restores remote state, switches dictionaries at sign-in, or sends sync requests. Optional AI login is separate and hidden under connection settings.
- New dictionary saves contain the phrase and translation plus internal language/review fields; no transcript copy, source IDs or offsets are added. Dictionary cards show the phrase and translation with pronounce/edit controls. Existing saved records remain readable.
- Stopped the development backend and restarted the preview without a backend URL. Saved `Привет!` → `Hi!`, reloaded the app, and verified it persisted alongside all four previous entries. Verified settings show local storage and no login or sync requirement.
- `npm run check` passes 19 tests, including queued offline edits, reopening the existing local dictionary, omitted transcript fields and recovery after a failed device write.

## Native build attempt

### Direct phrase selection update — September 10, 2026

- Removed per-message selection buttons. Browser text highlighting now exposes a floating **Save phrase** action; the save panel receives the exact selected offsets without a second selection step. Verified highlighting a word, dragging across `Как прошёл твой день?` within a longer reply, contextual translation, explicit dictionary save of that question, and dismissal of the action when the highlight collapses. Checked the layout at 390 × 844 and restored the normal viewport.
- `npm run check` passes all 17 tests. JavaScript/Hermes exports for web, iOS and Android succeed.
- Both native platforms resolve the local `phrase-selection` module through Expo autolinking. CocoaPods installs it and the generated `ExpoModulesProvider.swift` registers `PhraseSelectionModule`.
- The iOS `PhraseSelection` Pod target **compiles successfully** for the arm64 simulator SDK, including its Expo/React dependencies. Build log: `/private/tmp/language-partner-selection-pod-build.log`.
- The complete app's simulator build cannot select a destination: Xcode reports that its required iOS 26.2 platform is not installed. This is separate from the successful module compilation. Native touch handles/menu behavior still needs a running development build on a device or configured simulator; it has not been verified through the browser preview.
- Android native compilation was not run: this machine has Android SDK platforms through API 33, while the Expo 55 native toolchain requires API 36. Android autolinking and the JavaScript bundle are verified, but the Kotlin view and touch interaction still require an Android development build.

### Earlier full-app attempt

The original machine had Xcode 26.3 and CocoaPods 1.12.1. SDK 55 was selected to fit Xcode; the original CocoaPods failed on `visionos`. A current CocoaPods was installed in an isolated temporary location:

```sh
env -u RUBYOPT \
  GEM_HOME=/private/tmp/language-partner-gems \
  GEM_PATH=/private/tmp/language-partner-gems \
  GEM_SPEC_CACHE=/private/tmp/language-partner-gems/specs \
  /opt/homebrew/opt/ruby/bin/ruby /opt/homebrew/opt/ruby/bin/gem \
  install cocoapods -v 1.16.2 --no-document

cd /Users/iainwatt/Projects/ReactNative/language-partner/mobile/ios
env -u RUBYOPT \
  GEM_HOME=/private/tmp/language-partner-gems \
  GEM_PATH=/private/tmp/language-partner-gems \
  GEM_SPEC_CACHE=/private/tmp/language-partner-gems/specs \
  CP_HOME_DIR=/private/tmp/language-partner-cocoapods \
  CP_CACHE_DIR=/private/tmp/language-partner-cocoapods-cache \
  /opt/homebrew/opt/ruby/bin/ruby /private/tmp/language-partner-gems/bin/pod install
```

The simulator service reports a refused/invalid CoreSimulator connection in this session even after its filesystem paths were granted. Native microphone input, audible TTS, selection handles, permission prompts and operating-system interruptions therefore must not be considered device-verified from the browser preview. The native build was not completed. Both the generic simulator build and a read-only workspace listing failed with `xcodebuild: error: ...LanguagePartner.xcworkspace is not a workspace file`, alongside CoreSimulator/XPC failures. The workspace XML and Pods project are present, but native compilation must be rerun outside this restricted session. This is not a successful native build.

## Remaining acceptance checks / scope limits

1. On an iOS/Android development build, grant/deny mic and speech permissions; dictate a long turn; pause/restart; correct a final transcription; select a substring using native handles from each speaker.
2. While chat listens, type a translation (chat should continue); then speak a translation (chat capture must stop); play pronunciation (no transcript echo); close and resume the existing draft in the target language. Test backgrounding and recognition service/network interruption.
3. Verify a real due-card review after the next local date and a full app restart. Calendar/scheduling logic is tested; preview intentionally cannot advance the schedule early.
4. Live OpenAI connection, Russian replies and translation are verified through the deployed cloud backend on native iOS; an explicit two-turn context-recall check also passed through the local backend. Claude and Gemini still require separately configured keys and live testing.
5. The 15-minute account allowance and RevenueCat subscription integration are implemented but staged with enforcement disabled. Store products, billing credentials and live purchase/restore verification remain outstanding; see [paywall setup](paywall.md). The current production private test still uses server-held provider API keys with a verified-email tester allowlist; provider buttons are not consumer account OAuth buttons.
6. Cloud Firestore rules, indexes and the AI function are deployed. Cloud email verification, signed-in AI, native dictionary saving and account/session restoration are verified. Google sign-in still needs implementation in the app.
7. First voice mode is push-to-talk-style dictation plus send/reply/playback. Full-duplex native realtime sessions, automatic pronunciation grading and automatic vocabulary mastery tracking remain future enhancements. Saved-topic practice now supplies the topic and linked words on every AI turn. Android 12 and older cannot support continuous recognition through the chosen speech module; device recognition can pause at service-defined limits.
8. Dictionary saves, edits and reviews require a Firebase connection. Recent conversations and settings remain account-scoped on the device; there is no dictionary disk cache, import or export. Browser offline reopening is not a PWA claim.

## Dependency audit

The Expo dependency compatibility check passed in the earlier build. Installing Firebase tooling reported 24 moderate advisories in the root dependency tree and 8 moderate advisories in the functions package (no high or critical findings reported). No forced upgrades or incompatible Expo downgrade were applied. Reassess the dependency advisories before distribution.

## Build-output isolation

The TypeScript project explicitly includes application, server and test sources and excludes generated `dist/`, `ios/`, `android/` and `artifacts/`. This prevents Expo’s minified export from being reprocessed by the checker.
