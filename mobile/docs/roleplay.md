# Roleplay practice

Six scenarios cover a café order, hotel check-in and a room problem, train ticket, shop return, dinner plans and a short bookshop job interview.

Each scenario in `src/core/roleplay.ts` defines the learner's role, partner's role, setting, three objectives, an opening line and partner instructions. Authored openings cover English, French, Spanish, German, Italian and Russian. For other supported languages, the API translates the marked English fallback before starting.

Roleplay appears in the navigation drawer. Selecting a scenario creates a conversation using the active conversation's language pair. The briefing remains above the transcript. The scenario is saved with the conversation and sent with each reply; reopening the conversation retains it. Starting again from the list creates a fresh attempt. A failed opening can be retried without creating another conversation.

The partner stays in character, asks one question at a time, responds to the learner's choices, gives brief corrections and closes with a short recap once the goals are addressed. Completion is conversational; there are no automatically checked goal boxes or objective grades.

Scenarios are bundled in the app; there is no new Firestore collection. The `llm` function accepts an optional validated roleplay snapshot. Legacy conversations remain compatible. Roleplay cannot be combined with a grammar lesson or saved-vocabulary practice in one generation request. Saving a roleplay recap still uses the existing saved-conversation flow; a vocabulary practice session based on that recap remains vocabulary practice.

In sample mode, authored openings are available for the six languages above; later replies explicitly request a connected AI partner. Live roleplay uses the existing configured partner, account and conversation allowance. Scenarios use fictional details and do not make real bookings, payments or hiring decisions.

Verification covers schema/persistence, six-language openings, server instructions on opening and continuation turns, incompatible modes and a narrow-screen preview of cards and selection.
