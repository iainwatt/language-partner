# Feature ideas

Ideas for Language Partner that are not built yet. Add new ones at the bottom; move an idea out of this file once it ships.

## 1. Structured replies with corrections shown separately

Have the model return its conversational reply and its corrections as separate parts, instead of one block of text with a bulleted list in it. The app shows the reply as the message and renders each correction as a small card underneath (what you said → a better way to say it).

- Foundation for ideas 2 and 3, so build this first.
- Open question: should the voice read only the reply and skip the corrections, or read the corrections afterwards?

## 2. Smarter handling of misheard speech

The model only sees dictated text, so it sometimes "corrects" a word the speech recogniser got wrong (for example "sky" for the name Скай). Tell the model when a turn was spoken, so that a strange word which sounds like a sensible one is treated as a recognition slip: answer what the learner meant, and correct only grammar and word choice.

- Needs a "this turn was spoken" flag sent with the message, plus a prompt change.

## 3. Catalogue of the learner's errors

Store each correction as data: what the learner said, the better version and a category (case ending, verb aspect, word choice, gender and so on). Show a "My mistakes" list per practice language with counts for repeated errors.

- Depends on idea 1 for the structured corrections.
- Later: steer conversations and grammar practice toward the learner's most frequent errors.

## 4. Natural rewrite of a conversation

After a conversation, summarise what the learner was trying to say and rewrite it in really natural, native-sounding language, so they can study how a native speaker would have told the same story.

- Could sit beside the existing saved-conversation recap.
- Open questions: rewrite only the learner's turns or the whole exchange; and whether phrases from the rewrite can be saved to the dictionary like any other text.
