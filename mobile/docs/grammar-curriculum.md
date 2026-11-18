# Grammar practice curriculum

Reviewed 5 November 2026. The five new language curricula contain 12 topics each. This is an editorial selection of common introductory and intermediate grammar areas, not a complete or accredited CEFR syllabus. Russian retains its existing curriculum.

## Sources used to select topics

The following lists informed topic coverage. The reference text, examples and conversation starters in the app are original, simplified material; the app does not reproduce the linked lessons or exercises.

| Language | Topic-list references | Simplification |
| --- | --- | --- |
| English | [British Council A1–A2](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2), [Ca’ Foscari A1 syllabus](https://www.unive.it/pag/fileadmin/user_upload/centri/CLA/documenti/Sillabi/Inglese/A1_syllabus.pdf) | Everyday tenses, questions, articles, quantities, comparisons, modals, experience, time/place and describing places. |
| French | [Lawless French A1](https://www.lawlessfrench.com/faq/lessons-by-level/a1-grammar/), [FrancoLink grammar list](https://app.francolink.net/library/fr-grammar) | Common present/past/future forms, questions, agreement, negation, food quantities, routines, possessives, direct objects and comparisons. |
| Spanish | [Lingolia topic index](https://espanol.lingolia.com/en/sitemap), [pronouns overview](https://espanol.lingolia.com/en/grammar/pronouns), [reflexive verbs](https://espanol.lingolia.com/en/grammar/verbs/reflexive-verbs) | Common tenses, questions, agreement, ser/estar, reflexives, gustar, direct objects, comparisons and modals. Spain forms are included; subject pronouns remain optional. |
| German | [Lingolia grammar overview](https://deutsch.lingolia.com/en/grammar) | Main clauses/questions, accusative and dative, Perfekt, plans, modals, separable verbs, negation, in/auf, comparisons and short weil clauses. No full declension tables. |
| Italian | [OnlineItalianClub grammar index](https://onlineitalianclub.com/index-of-free-italian-exercises-and-grammar-lessons/), [One World Italiano course and grammar lists](https://oneworlditaliano.com/) | Common tenses, questions, agreement, routines, possessives, direct objects, common location phrases, modals and comparisons. Complex pronoun combinations are omitted. |

Source links are also stored in each Firestore topic's `sources` field as language-level provenance. These are topic-selection references, not per-sentence citations or endorsements.

## Practice contract

Assume prior study. Show the reference in one card, then begin a familiar conversation or role-play. The partner follows the learner's meaning, offers at most one brief relevant correction and asks one natural follow-up. No introductory lecture, conjugation quiz or numbered exercise. Unfamiliar vocabulary is supplied with a short meaning rather than tested.

Each authored `reminder` has at most four lines of at most 90 characters. Each topic also has a short `openingPrompt` in the target language and an `openingTranslation` in English. The reminder panel combines reference and starter in one card. The chat shows the reference card and the partner's conversational opening. The server uses the English starter translation for English-speaking learners and translates it for other native languages.

Cards use 14px text with a 20px line height, wrap without truncation and respect system font scaling. The compact-content budget targets a normal phone screen at default text size. Enlarged accessibility text may require scrolling; text is never shrunk or hidden to force a fit.

## Storage and rollout

The source is `src/core/grammarCurricula.ts`, consumed by both the bundled fallback and `scripts/seed-grammar.ts`. Shared Firestore documents live at `grammar/{language}/topics/{topicId}`. Existing stable IDs remain; seeding merges and does not delete custom topics. `openingPrompt` and `openingTranslation` are optional in schemas so legacy documents and saved conversations still load. Each new conversation snapshots the card and starter; existing conversations retain their original lesson.

Seed the five language codes to update cloud content. Deploy the `llm` function with the matching schema/instructions, and run the updated client to show cards directly in chat. Other supported languages retain their previous generic starters.
