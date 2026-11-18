# Language Partner

An Expo SDK 55 / React Native app for Russian conversation, translation, selected phrases and dictionary practice.

The app now uses **Firebase Authentication** for accounts and **Cloud Firestore** for dictionaries. Sign-up, email verification, sign-in, password recovery, session restoration and sign-out are implemented. The old custom authentication server and local dictionary-saving workflow have been removed.

Dictionary entries are stored only at `users/{uid}/dictionary/{entryId}` in Firebase. They contain the word, translation, language pair, practice schedule, links to saved conversations and an optional short example with its own translation. Topic titles, descriptions and native-language summaries are stored at `users/{uid}/savedConversations/{conversationId}`. There is no dictionary or saved-topic disk cache, offline save queue, import or export flow. Reading fresh cloud data and saving/editing/deleting/reviewing words require a connection. The app retains account-specific chat transcripts and settings on the device for Recents. Native login sessions use Keychain/Keystore; web login persistence uses Firebase's browser persistence.

Shared grammar curriculum lives at `grammar/{language}/topics/{topicId}`. Each topic has `title`, `description`, `reminder`, `prompt` and `order` fields. Signed-in clients can read these documents; only trusted Admin SDK tooling can write them. The app includes the same starter lessons locally so the grammar screen remains usable while Firebase connects. To create or refresh all starter documents, authenticate the Admin SDK, then run `npm run seed:grammar -- PROJECT_ID`. Add a language code to update one curriculum only, for example `npm run seed:grammar -- PROJECT_ID ru-RU`. For the emulator, set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180` before running the command.

**Current deployment status:** Firestore rules, indexes and the `llm` Cloud Function are deployed to the owner's Firebase project. The owner uploaded the OpenAI secret to Secret Manager. Metro and the iPhone simulator use the cloud configuration from the ignored `.env` file. Verified cloud account sign-in, a live OpenAI connection and Russian reply, translation, a native dictionary save, and restoration of the account and conversation after an app restart. Cloud dictionary and AI endpoints reject signed-out requests. Local emulator accounts are separate from cloud accounts.

## Run on the iPhone simulator

Use Node 22 LTS, Java 21+ for Firebase emulators, and the existing iOS development build. Firebase is the JavaScript SDK, so these changes do not require a new native module or Xcode project.

```sh
cd /Users/iainwatt/Projects/ReactNative/language-partner/mobile
npm ci
```

The shared `.env` file lives one directory above this app, at the repository
root. This checkout has `mobile/.env` linked to `../.env`. On a fresh clone,
create `../.env` from `.env.example`, enter the configuration, then run
`ln -s ../.env .env` from this directory before starting Expo or building iOS.

Start Firebase in one terminal (on this Mac, put `/opt/homebrew/opt/openjdk@21/bin` first in `PATH` to use the installed Java 21+ runtime):

```sh
cp functions/.secret.local.example functions/.secret.local
cp functions/.env.example functions/.env.local
npm run emulators
```

Do not overwrite those local files if they already contain your settings. For account and dictionary testing, the secret JSON can contain empty strings. The emulator uses Auth port 9099, Firestore 8180, Functions 5001 and its browser UI at `http://127.0.0.1:4000`.

Start the app in a second terminal:

```sh
npm run start:local
```

Press **i** to open the installed iPhone simulator app. If it shows **No development servers found**, choose **Enter URL manually** and enter `http://127.0.0.1:8081`. Keep both terminals running. With `CI=1`, file watching is disabled, so restart Metro after edits. The local script uses a `demo-` Firebase project and cannot silently connect to a production database. These loopback settings are for the simulator on the same Mac; use a real Firebase project for testing on a physical phone.

Create a test Language Partner account in the app. The Auth emulator prints its verification link in the Firebase terminal instead of sending email. Open that link, then tap **I’ve verified my email**. The emulator also provides password-reset links. Test accounts and dictionaries disappear when emulators are restarted unless you explicitly use Firebase emulator export/import for the server's test data; there is no dictionary import in the app.

## Managed AI for testers

Language Partner manages AI access using the owner's API credits on the backend. Signed-in testers automatically use the managed OpenAI service for chat, grammar, roleplay, translation and recaps. There is no user-facing provider/model selector, API-key entry or connection step. Signed-out guests can explore samples. The backend controls the model and continues to enforce verified-email tester access and request limits.

Existing signed-in profiles are migrated from sample/previous-provider settings to managed live practice without changing their language preferences or conversation history. Google sign-in and verified email/password accounts use the same Firebase UID-based data model.

For local testing, edit the ignored `functions/.secret.local` file privately:

```dotenv
LLM_API_KEYS={"openai":"YOUR_OPENAI_API_KEY","claude":"","gemini":""}
```

Set your verified test account's email in `functions/.env.local`:

```dotenv
TESTER_EMAILS=your-test-email@example.com
DAILY_AI_REQUEST_LIMIT=1000
PER_MINUTE_AI_REQUEST_LIMIT=60
```

With the emulators already running, run `npm run build:functions` after changing these files. The Functions emulator reloads its worker and configuration while Auth and Firestore keep their test data. Live practice uses the managed provider; configuration is maintained by the owner. No provider secret belongs in `.env` public app settings or an `EXPO_PUBLIC_` variable. A cloud Firebase project is not required for live AI testing on the simulator.

The callable Firebase function validates the signed-in user and restricts paid requests to verified, invited tester emails. Firestore transactions enforce a per-account daily allowance and per-minute allowance across instances. Connection probes, translations, summaries and failed attempts count toward the allowance. Input size and output limits are also enforced; this is a request allowance, not a currency-denominated spending cap. Provider errors surface in the app without replacing them with demo replies.

The server uses OpenAI Responses, Anthropic Messages, and Gemini `generateContent`. Model IDs in `src/core/domain.ts` were checked on 7 September 2026; access still depends on the API account. The managed provider handles chat, translations and native-language recaps, using up to 40 recent chat turns or 8 translation-context turns. Recaps incorporate an existing summary when available. Repeat practice sends the saved topic and vocabulary with every turn, independently of the rolling chat history. Audio remains device text-to-speech through `expo-speech`.

AI access is managed by Language Partner. Testers do not need a personal AI subscription or API key. See [provider research](docs/provider-support.md) for the separate subscription-authentication investigation.

## Connect a real Firebase project

1. In the Firebase console, create/select a project, enable **Authentication → Email/Password**, and create **Cloud Firestore**. Choose the database location deliberately; functions currently run in `europe-west2`.
2. Register a **Web app** in Firebase project settings to get the JavaScript SDK configuration. If the repository-root `../.env` does not exist, copy `.env.example` to `../.env`, enter that Firebase configuration, and create the local `.env` symlink described above. Keep `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` unset for cloud use. Add the web preview hostname to Authentication's authorized domains if testing in a browser.
3. Enable the desired Firebase password policy (the sign-up UI requires at least 12 characters), email enumeration protection, and configure verification/reset email templates in the console.
4. Sign into the Firebase CLI with `npx firebase login`, then select the intended project with `npx firebase use --add`. Cloud Functions deployment requires Firebase's Blaze plan.
5. Create `functions/.env.PROJECT_ID` with `TESTER_EMAILS`, `DAILY_AI_REQUEST_LIMIT` and `PER_MINUTE_AI_REQUEST_LIMIT`. Store the provider JSON in Secret Manager through the private prompt from `npx firebase functions:secrets:set LLM_API_KEYS --project PROJECT_ID`. Do not put real keys in a command argument or checked-in file.
6. Deploy the reviewed rules and backend:

   ```sh
   npm run check
   npx firebase deploy --only firestore,functions --project PROJECT_ID
   npm start
   ```

Use `npm start` for the real project, **not** `start:local`. Restart Metro whenever public Firebase configuration changes. Firebase ID tokens authenticate both callable AI requests and Firestore writes. The server never accepts a caller-supplied UID/email for authorization, and Firestore rules deny access to another user's dictionary and server usage records.

This is a private testing configuration. Broad release still needs a product decision on AI billing/entitlements and its supported subscription or hosted-service model. No consumer provider passwords, browser cookies or extracted OAuth tokens are collected.

## Learning flow

- In a new unsaved chat, tap **Save** in the composer to keep the conversation as a topic. The slide-up editor opens with a drafted title, description and summary in the learner’s native language; when an AI partner is connected, the summary draft is prepared from the chat. Saved conversations no longer has a separate create-topic button.
- Every new dictionary save automatically links to the current conversation and creates its saved topic if needed. Re-saving an existing phrase in a different conversation adds another link while retaining its translation and review schedule. Older words have no reliable source information; use **Add words** to associate them explicitly.
- **Practise again** opens a fresh chat while retaining the original in Recents. It displays a native-language recap and only the meanings of linked phrases, leaving the learning-language answers hidden. **Show translation** reveals the full phrases, meanings, and any saved examples in a plain list; **Hide translation** returns to recall practice. Answers start hidden in each practice chat. A changed previous chat refreshes its summary first; errors remain visible and do not silently start a context-free chat. **Review these words** provides repeatable recall cards for that topic without changing their schedule in preview mode.
- Saved topic metadata and vocabulary are available from Firebase on another device. Full original transcripts remain on the device where they were written; **Open original chat** appears when that transcript is available. The recap and meanings are rendered from cloud memory and are never copied into local chat storage. A practice request supports at most 200 linked phrases and a bounded text size; larger topics can still use word review.

- The top-left menu starts with **New chat** (pen-and-paper icon), followed by Dictionary, Saved conversations, My stats and saved recent conversation titles. Drafts stay out of Recents until they are saved as a topic. My stats shows saved talk time for chat windows, saved words and saved conversations. New chat closes the drawer and opens a fresh conversation. Translate slides over the chat; inserting a translation preserves the draft and does not send it.
- Press and hold in a chat, adjust the native text-selection handles, then choose **Save phrase**. The selected text stays the dictionary headword. The sheet also suggests an exact excerpt with up to two nearby words on either side, stopping at sentence/clause boundaries. You can shorten it or remove it. **Find translation** translates the word and example separately using that excerpt as context. Both translations are editable, and a retained example requires its own translation before saving.
- Examples appear below dictionary entries and saved-topic vocabulary, and only after revealing a recall answer. They are stored as `example: { text, translation }` in Firebase (600/2000 character limits), never in the local dictionary. Re-saving an existing word with a chosen example replaces its example without resetting its review schedule; ordinary saves preserve it. Standalone translations have no source excerpt, so no example is invented. Older entries can be reselected in a chat or given an example through dictionary editing.
- Dictionary offers pronunciation, editing and deletion; Practice stores review scheduling in the same Firebase entry. Saved phrases become due on the next local calendar date.
- The microphone uses platform speech recognition. Spoken replies use the device voice for the entry/conversation language. This is turn-based speech, text and device TTS.
- Speech playback removes quotation wrappers such as `«…»` and `<<…>>` and common Markdown formatting (emphasis, heading/list markers and backticks) from a separate spoken copy. The chat and saved phrases retain the original text. Sentence punctuation, contractions, numbers and meaningful symbols are preserved. This also applies when replaying existing messages or hearing translations and dictionary phrases.
- **Explore demo** works without an account for sample conversations and known phrase translations. Saving words requires sign-in. Unknown demo translations are never invented.

## Paste Russian text while testing

The chat and translation inputs accept Unicode and multiline pasted text without an app-specific clipboard permission. In the browser, click the input and press Command-V (Control-V on Windows). In Simulator, enable **Edit → Automatically Sync Pasteboard**, click the chat input, then paste; the iOS press-and-hold **Paste** menu is also available when text is on the device clipboard. This simulator setting is currently enabled on the development Mac.

If Simulator fails to transfer the Mac clipboard, copy the desired text and run `pbpaste | xcrun simctl pbcopy booted`, then use Paste inside the simulated app. This transfers text to the simulator clipboard without sending a chat message. See [Apple’s Simulator clipboard guidance](https://developer.apple.com/library/archive/documentation/IDEs/Conceptual/simulator_help_topics/Chapter/Chapter.html).

## Verification

```sh
npm run check
npm run test:firebase     # starts temporary emulators; stop any existing ones first
npx expo export --platform all
```

The Firebase integration tests use only the `demo-language-partner` emulator project. They check real account creation, verification, recovery, signed-in cloud writes, reopening a dictionary after login, callable authentication, cross-account access denial, schema validation and protection of server counters. Adapter tests use injected HTTP responses; real paid provider calls still need a key.

See [verification and known limits](docs/verification.md) for recorded results, including the live OpenAI checks, and native build history. The native development build includes `expo-speech-recognition` and the local `phrase-selection` module; use it instead of Expo Go.

### Language-specific starter lessons

English (`en-US`), French (`fr-FR`), Spanish (`es-ES`), German (`de-DE`) and Italian (`it-IT`) each include twelve focused practice topics. Each assumes prior study, supplies a four-line reference card and opens a conversation with a specific starter rather than a lecture. Their source is `src/core/grammarCurricula.ts`; Russian keeps its existing curriculum in `src/core/grammar.ts`. Other supported languages keep the generic starter topics.

The app bundles these lessons as a fallback. A non-empty Firestore curriculum takes precedence, so run the seed command to refresh existing cloud lessons after editing the bundled content. Seeding merges documents by stable topic ID and does not delete custom topics or change saved conversations. Existing grammar conversations retain the lesson snapshot they started with; start a new lesson to use refreshed content.

Language settings are applied only when “Start with these languages” is pressed. Closing the screen discards pending choices; applying creates a new conversation without changing previous conversations or saved words. The native and practice languages must differ. The interface remains in English.

See [curriculum sources and scope](docs/grammar-curriculum.md) for the topic selection, source links and card constraints.

### Roleplay

Open **Roleplay** in the navigation drawer for six scenarios with clear roles, goals and opening prompts. Scenarios are bundled locally and saved with each conversation. See [roleplay behaviour and storage](docs/roleplay.md).

## Tester feedback and Google sign-in

The header and Settings include **Feedback**. Testers can dictate in their native language or type, review/edit the transcript, then submit. The app never persists feedback audio (`recordingOptions.persist=false`) and the callable endpoint rejects audio fields. Only submitted text and limited context (language pair, screen, app version/build and platform) are sent. Closing the sheet retains an unsent draft in memory for this account; restarting the app clears that unsent draft.

The authenticated `submitFeedback` callable stores the original in the private `feedback/{serverGeneratedKey}` collection before translating to English. Translation failure leaves a saved `pending` report. Identical retries reuse the report; conflicting content cannot overwrite an existing report. Feedback has separate request limits and does not require remaining conversation time. Clients cannot read, edit or delete reports; the future owner dashboard will use authenticated server access. No dashboard or behaviour-tracking feature is added in this change.

**Continue with Google** uses the native Google Sign-In SDK on iOS/Android and Firebase popup auth on web. Existing signed-in users can link Google in Settings; native linking requires the same email and keeps the existing Firebase UID. A provider-conflict error directs users to sign in with their existing password and link Google. Sign-out clears both Firebase and the native Google session.

The public OAuth client IDs are documented in `.env.example`. iOS needs a registered Firebase iOS app for `com.iainwatt.languagepartner`, its iOS client ID and reversed-ID callback scheme; `app.config.js` configures the plugin for future builds. The existing native iOS project is configured with the same scheme. Install Pods and rebuild after adding this native dependency; a JavaScript reload of an older installed build cannot add Google sign-in. Android additionally requires a Firebase Android registration and OAuth signing fingerprints for the actual test/release certificate before native sign-in can be accepted. Web requires its hosting origin in Firebase Authentication authorized domains.
