<!-- Purpose: the agreed discovery brief for the chat-prompt eval suite and saved errors. Input to the build spec. -->
<!-- Limit: one page. Change it by agreement, not by appending. Approved 18 November 2026. -->

# Discovery brief: chat-prompt eval and saved errors

## 1. Problem

The chat prompt is about to change repeatedly. Today the only way to tell whether a version is better is to use the app and go by feel. Alongside that, the errors the partner corrects need saving so patterns can be found later.

## 2. For whom, and what a wrong result costs

For Iain, as the person editing prompts. An eval that passes a worse prompt is expensive: learners get mishearings "corrected" or errors silently not saved. An eval that wrongly flags a good prompt is cheap, because he reads the examples and overrules it.

## 3. How we will know it works

Each prompt version is run several times over hand-written short Russian conversations with a known situation planted in each. Code scores the results as pass rates, and the reply text is saved to read side by side between versions.

## 4. The map

| What we want | What confirms it |
| --- | --- |
| Corrections section well formed | Code: the tag parses and nothing of it leaks into the visible text |
| No strange punctuation | Code: no Markdown, emoji or stray symbols |
| Mishearing left alone (the "Skye" case) | Code: the planted slip is absent from the corrections |
| Real error caught | Code: the planted error is present in the corrections |
| Correct sentence untouched | Code: no corrections section |
| Section lengths and position | Reported per version, not tested |
| Praise and rephrasing feel right | Iain, reading the saved replies |

## 5. Core issues

- **Reply format.** A free reply with one tagged corrections section, included only when something was corrected. It contains the natural rephrasing and the specific fixes, and replaces the hidden log as the single source for what is shown, spoken and saved. Everything else in the reply stays untemplated. Decided by Iain.
- **What a saved error is.** The learner's full sentence plus the correction as made, saved to the account at chat time, uncategorised. Decided by Iain.
- **One eval.** For the chat prompt only. Decided by Iain.
- **Languages.** Russian only for the first cases; more later. Decided by Iain.

## 6. Open questions

None blocking. The number of repeats per case is to be chosen in the spec.

## 7. Assumptions still standing

- Only errors the partner actually corrects are saved.
- Iain writes or approves the test conversations and confirms the Russian is right.
- A case is a short conversation, because context from earlier turns decides the outcome.
- The eval calls the model directly with the prompt file, not through the deployed app.
- Where the corrections section sits in the reply is left to the model and reported.

## 8. Out of scope

- Prompt configuration by level and focus.
- Categorising saved errors, and the eval for that, until a bulk of errors exists.
- Pattern-finding and a "My mistakes" screen.
- Read-aloud rules such as skipping long corrections.
- Testing how much the speech recogniser hides case errors.
