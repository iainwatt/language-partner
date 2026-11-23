# Feature ideas

Ideas for Language Partner that are not built yet. Add new ones at the bottom; move an idea out of this file once it ships.

## 1. Hints in the partner's reply

The partner still replies with a question as usual, but may add a short hint or suggestion beside it. One trigger is the most recent error in the learner's turn; there will be others. A hint is visually set apart from the reply, may use the learner's native language, and can include one or two examples to practise.

Example: the learner says "на телефону" for "on the telephone". The hint explains in English that по is used in this context and suggests practising a few before carrying on:

- по телевизору — on TV (смотреть фильм по телевизору — to watch a film on TV)
- по радио — on the radio (слышать по радио — to hear on the radio)
- по интернету — over the internet (найти по интернету — to find online)
- по почте — by post or email (отправить по почте — to send by post or email)

The learner can ignore the hint and continue the conversation, or practise first.

- Fits the existing tagged-section approach: a hint would be its own tagged block, like corrections.
- Open questions: how often a hint appears, so it doesn't interrupt every turn; and whether it is read aloud.

## 2. Saved words suggested in conversation

Give the partner some of the learner's saved words at the start of the prompt: ones saved yesterday, in the last week, or a mix. Where it fits the conversation, the partner suggests the learner try using one of them in their reply. The suggestion is visually set apart, like a hint, and may use the learner's native language.

- Shares the visual marker and tagged-block approach with hints (idea 1); the two could be one "suggestion" block with different triggers.
- Open questions: how words are chosen (most recent, due for review, or least practised); how many are sent; and how often a suggestion appears.
- Later: notice when the learner does use a suggested word, and count that as practice for its review schedule.

## 3. Video to imitate

Videos with subtitles in the app, so the learner can imitate real speakers. The embedded YouTube player is the only permitted way to play YouTube videos; it shows adverts and its subtitles cannot be read by the app. Tappable subtitles and no adverts need content the app has the rights to host.

## 4. Analysis mode: find the learner's level

A separate mode in which the partner assesses the learner instead of chatting. It asks questions and prompts the learner in particular directions, lets them speak, and then analyses everything they said: the mistakes they made and the vocabulary they used. The result is a clear picture of their level, including an estimate of how many words they know, or appear to know from what they said.

- The partner must prompt in several different ways and across different topics. Left to talk freely, a learner may pick a topic they know few words for, and the estimate would come out too low.
- It might show pictures for the learner to describe.
- The result is a short written summary of the learner's level, not a precise score. The word estimate is part of that summary and is worded as an estimate.
- It does not need to be very accurate. Mishearings by the speech recogniser are not filtered out specially: the analysis looks at everything the learner said and categorises the errors.
- A session lasts about ten minutes, though that will vary.
- Connects to other ideas: the result could set the level for configuring the partner (idea 7) and seed the learner's "Things to work on" (idea 6).

## 5. Categorise saved mistakes and find patterns

Mistakes the partner corrects are now saved to the account one by one, with the learner's full sentence. Still to do:

- Categorise them in bulk, with a fixed list of broad types and a per-language list of specific types, and an eval for that step.
- Find themes across many mistakes, as a teacher would ("often uses the accusative where the dative is needed").
- A reference of common learner errors per language, errors typical of speakers of a given native language, and the learner's own notes.
- A screen to review mistakes, discard some and mark others as important.

## 6. Build on "Things to work on"

The learner can now keep their own list of things to work on. Still to do:

- Add items the partner picks up from the learner's saved mistakes, shown separately from the learner's own.
- Turn an item into a personal lesson.
- Give a micro lesson in the chat when the learner makes a mistake that matches an item.
- Mark an item as resolved.

## 7. Configure the partner by level and focus

Let the prompt vary with the learner's level and the focus of the session, so that, for example, a lesson on the dative case looks almost only for dative errors.

## 8. Smaller ideas

- The conversation script is built; its prompt (server/prompts/script.v0.ts) and its look still need work.
- Read-aloud rules for corrections: skip them, or skip them when they run long.
- When a turn has many mistakes, show the most important few and keep the rest expandable.
- Vary the follow-up at certain points, for example work recently saved words into the next question once ten have been saved.
- Check how much the speech recogniser hides case-ending errors before the partner sees them.
