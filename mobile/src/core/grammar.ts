import { languageStarterTopics } from "./grammarCurricula";
import { z } from "zod";
import {
  documentIdSchema,
  languageName,
  languages,
  makeConversation,
  type Conversation,
} from "./domain";

const languageCodeSchema = z.enum(languages.map(({ code }) => code));

export const grammarTopicSchema = z.object({
  id: documentIdSchema,
  language: languageCodeSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  reminder: z.string().trim().min(1).max(2000),
  prompt: z.string().trim().min(1).max(10000),
  openingPrompt: z.string().trim().min(1).max(240).optional(),
  openingTranslation: z.string().trim().min(1).max(240).optional(),
  sources: z.array(z.string().url()).max(8).optional(),
  order: z.number().int().min(0).max(10000).default(0),
});
export type GrammarTopic = z.infer<typeof grammarTopicSchema>;

export const grammarPracticeSchema = grammarTopicSchema.pick({
  id: true,
  title: true,
  description: true,
  reminder: true,
  prompt: true,
  openingPrompt: true,
  openingTranslation: true,
});
export type GrammarPractice = z.infer<typeof grammarPracticeSchema>;

export function makeGrammarConversation(
  topic: GrammarTopic,
  native: string,
  target: string,
): Conversation {
  if (topic.language !== target)
    throw new Error(
      `Choose a grammar topic for ${languageName(target)} before starting.`,
    );
  return {
    ...makeConversation(native, target, false),
    title: topic.title,
    grammar: grammarPracticeSchema.parse(topic),
  };
}

const starterTopics = [
  {
    id: "past-events",
    title: "Talking about the past",
    description:
      "Practise describing things that happened earlier today, yesterday and further in the past.",
    reminder:
      "Past forms describe completed events, repeated actions or background activity.\nKeep the verb consistent with the subject and the intended time.\nUse a clear past-time expression when the context is not obvious.",
    prompt:
      "Prompt the learner to talk about this morning, yesterday, last week, last year and a long time ago. Gradually ask about second and third person subjects. Keep corrections focused on past-tense formation, time expressions and the correct person. Ask one short question at a time.",
    order: 10,
  },
  {
    id: "questions",
    title: "Asking questions",
    description:
      "Build natural questions and use follow-ups to keep a conversation moving.",
    reminder:
      "Yes/no question — ask for confirmation.\nOpen question — use who, what, where, when, why or how.\nFollow-up — ask for one relevant detail from the answer.",
    prompt:
      "Give the learner everyday situations that require a question. Practise yes-no questions, open questions and one relevant follow-up. Focus corrections on word order, question words and natural intonation. Ask one short question at a time.",
    order: 20,
  },
  {
    id: "plans-intentions",
    title: "Plans and intentions",
    description:
      "Talk about plans for later today, the weekend and the longer term.",
    reminder:
      "Choose the natural future form for a plan, intention or prediction.\nKeep the verb consistent with the subject.\nAdd a time expression when it makes the plan clearer.",
    prompt:
      "Prompt the learner to discuss plans at several future time horizons and to ask another person about their plans. Focus corrections on the natural future forms, time expressions and person. Ask one short question at a time.",
    order: 30,
  },
] as const;

const russianStarterTopics = [
  {
    id: "past-events",
    title: "Past Tense",
    description:
      "Practise forming Russian past-tense verbs and keeping gender, number and subject perspective consistent.",
    reminder: `Past stem + -л / -ла / -ло / -ли.
он работал · она работала.
оно работало · они работали.
Reflexive: он встречался · она встречалась.
Russian past forms agree with gender/number, not grammatical person.`,
    prompt: `LESSON GOAL AND SCOPE
Assume the learner has already studied the Russian past tense; this is guided speaking practice, not a first explanation. Build fluency in forming past-tense verbs and using them naturally in stories. Russian past-tense verbs do not change for first, second or third person: they agree with the subject's gender in the singular and with number in the plural. Practise all subject perspectives while keeping that distinction accurate.

LEARNER CONTEXT
Assume approximately CEFR B1 unless separate learner context says otherwise. The learner can use common verbs learned through B1. When an active-vocabulary list is supplied, reuse suitable verbs from it naturally, but do not force every word into the lesson.

FIRST ASSISTANT TURN — COMPACT REFERENCE
Before the first question, show a very small, screen-sized reminder in English. Write all headings, labels and rule explanations in English; keep Russian verb forms and examples in Russian. Keep it to at most 6 short lines and do not repeat it later unless asked. Include:
• Most verbs: infinitive without -ть + -л/-ла/-ло/-ли.
• читать / прочитать → он читал / прочитал; она читала / прочитала; они читали / прочитали.
• Reflexive: встречаться → он встречался; она встречалась; они встречались.
Briefly label imperfective as process/repeated/background and perfective as completed result. Then give one simple exercise in Russian about what the learner did this morning or yesterday, using the required bilingual exercise format.

INITIAL EXERCISE EXAMPLES
Choose or adapt one example; never present several exercises at once.
Example A:
Exercise:
Что вы делали вчера утром? Назовите три действия и используйте форму «я».
What did you do yesterday morning? Name three actions and use the “I” form.
Example B:
Exercise:
Представьте, что ваш друг забыл вчерашний день. Расскажите ему, что он делал утром и вечером.
Imagine your friend has forgotten yesterday. Tell him what he did in the morning and evening.

PRACTICE FLOW
1. Begin with free first-person speech: this morning, yesterday, last week, last year, a long time ago, or a memory from school or university.
2. Move to мы and contrast a completed event with a habit or background activity.
3. Practise ты/вы through a scenario: a friend spent yesterday with the learner but remembers nothing, so the learner must tell the friend what the friend did.
4. Practise он/она/они by asking what a friend, parent, child or group did. Vary subject gender and number deliberately.
5. For a harder task, give 3–5 brief facts about a familiar historical or public event in the learner's native language, then ask the learner to retell them in Russian.
Ask one short question or give one task at a time. Let the learner produce several connected sentences when comfortable.

EXERCISE VARIATIONS
Vary regular, irregular and reflexive verbs; imperfective/perfective pairs; affirmative, negative and question forms; subject gender and number; first, second and third-person perspectives; and time distance from earlier today to long ago. Alternate free stories with constrained tasks. For constrained tasks, offer 4–7 useful Russian infinitives with native-language meanings so recall does not obscure the grammar target.

CORRECTION GUIDE
Concentrate corrections on past-tense verb formation, gender/number agreement, reflexive endings, aspect when it changes the intended past meaning, and consistency between the stated subject and verb form. Do not claim that Russian past forms conjugate for person. Ignore unrelated errors unless they block understanding. After an error, give a brief correction, explain only the relevant pattern, and invite one immediate retry before continuing.

PROMPTING GUIDE
Start open and simple. After one or two stories, increase control: specify the subject, time frame, aspect contrast or a small verb bank. If the learner stalls, offer two possible situations or the first clause rather than answering for them. Keep explanations brief, maintain a natural conversation, and gradually reduce support when forms become accurate.`,
    order: 10,
  },
  {
    id: "plans-intentions",
    title: "Future Tense",
    description:
      "Practise Russian compound and simple future forms while talking about plans, predictions and intentions.",
    reminder: `Imperfective: conjugated быть + unchanged infinitive.
я буду читать · ты будешь читать.
мы будем читать · они будут читать.
Perfective: conjugate the verb for a completed result.
прочитаю · прочитаешь · прочитает.
прочитаем · прочитаете · прочитают.`,
    prompt: `LESSON GOAL AND SCOPE
Assume the learner has already studied the Russian future tense; this is guided speaking practice. Build confident use of both future patterns: imperfective буду + infinitive for an ongoing/repeated process, and the conjugated perfective verb for a completed future result. Keep the lesson centred on future meaning, person/number and aspect choice.

LEARNER CONTEXT
Assume approximately CEFR B1 unless separate learner context says otherwise. Use suitable items from any supplied active-vocabulary list. Introduce only a few extra verbs at a time and give native-language meanings when supplying a verb bank.

FIRST ASSISTANT TURN — COMPACT REFERENCE
Show an English reminder of at most 6 short lines. Write all headings, labels and rule explanations in English; keep Russian conjugations and examples in Russian. Then do not repeat it unless asked:
• Imperfective: буду/будешь/будет/будем/будете/будут + infinitive: Я буду читать.
• Perfective: conjugate the verb: Я прочитаю. Они закончат.
• Imperfective = process/repetition; perfective = completed result.
Include one paired example such as завтра я буду читать книгу / завтра я прочитаю книгу. Then give one easy Russian exercise about a plan for later today or tomorrow, using the required bilingual exercise format.

INITIAL EXERCISE EXAMPLES
Choose or adapt one example; never present several exercises at once.
Example A:
Exercise:
Расскажите, что вы будете делать завтра и что обязательно сделаете до вечера. Используйте один глагол несовершенного вида и один глагол совершенного вида.
Say what you will be doing tomorrow and what you will definitely complete by the evening. Use one imperfective verb and one perfective verb.
Example B:
Exercise:
Что вы будете делать завтра в восемь часов, и что вы сделаете к десяти часам?
What will you be doing tomorrow at eight o’clock, and what will you have completed by ten o’clock?

PRACTICE FLOW
1. Ask about the learner's plans later today, tomorrow and this weekend using я and мы.
2. Ask what a friend or family member will do, deliberately rotating он, она and они.
3. Practise ты/вы by asking the learner to predict or explain another person's future actions.
4. Contrast process and result: what will the learner be doing at a stated time, and what will they have completed by another time.
5. Progress to promises, predictions, intentions, negative plans and future questions.
Ask one short question at a time. Encourage connected answers once the learner is comfortable.

EXERCISE VARIATIONS
Vary near and distant time frames; first, second and third-person subjects; singular/plural; statements, negatives and questions; plans, schedules, predictions and promises; and imperfective/perfective pairs. Alternate free answers with sentence transformations and mini-scenarios. Occasionally give 4–7 infinitives or aspect pairs with native-language meanings and require the learner to choose and form the appropriate future.

CORRECTION GUIDE
Correct the form of быть in the compound future, leaving its following infinitive unchanged, the person/number ending of simple perfective futures, aspect choices that change the intended meaning, and subject consistency. Ignore unrelated errors unless they block meaning. Correct briefly, contrast the two future patterns only when useful, and ask for an immediate retry.

PROMPTING GUIDE
Begin with concrete personal plans, then add less predictable scenarios and explicit aspect contrasts. If answers stay short, ask for a reason, sequence or consequence. If the learner struggles, supply a subject, time expression and small verb bank; if they succeed, remove those supports and vary the perspective.`,
    order: 20,
  },
  {
    id: "verb-aspects",
    title: "Verb Aspects (Perfective/Imperfective)",
    description:
      "Choose between imperfective and perfective Russian verbs according to process, repetition and completed result.",
    reminder: `Imperfective = process or repetition · Perfective = completed result.
читать → прочитать.
делать → сделать.
решать → решить (the stem changes).
Я читал два часа. → Я прочитал книгу.
Perfective non-past normally means future: Я прочитаю книгу завтра.`,
    prompt: `LESSON GOAL AND SCOPE
Assume the learner has already studied Russian verb aspect and is at A2 level or above. This is supported free conversation, not a quiz or a first explanation. Help the learner choose aspect from intended meaning: imperfective presents an action as a process, repeated activity, general experience or background; perfective presents one bounded event, completion or result. Do not reduce aspect to an English tense rule, and clarify the intended viewpoint before correcting a choice that could be valid in context.

LEARNER CONTEXT
Assume the learner understands grammar at approximately A2 level or above unless separate learner context says otherwise. Do not limit verb choices to an A2–B1 vocabulary list. Prefer useful pairs from the learner's active vocabulary when suitable, then choose relatively common Russian verbs from a broad range of subjects, actions and constructions so the learner gains exposure to new verbs. Give the native-language meaning of every supplied pair so unfamiliar vocabulary does not block the grammar practice. Treat pairs as related meanings, not mechanically interchangeable words, and explain a lexical difference only when it affects the exercise.

FIRST ASSISTANT TURN — COMPACT REFERENCE
Show at most 6 short lines in English. Keep Russian forms and examples in Russian. Then immediately give Initial Prompt A below in the required prompt format:
• Imperfective = process or repetition; perfective = completed result.
• читать → прочитать; делать → сделать.
• решать → решить (the stem changes).
• Я читал два часа. → Я прочитал книгу.
• Perfective non-past normally refers to the future — Я прочитаю книгу завтра.
Do not repeat the reference later unless asked.

VERB-PAIR POLICY
Supply 6–8 aspect pairs with every main speaking prompt, before the learner responds. Vary the bank from one main prompt to the next so the learner gets broad exposure; do not repeat the same bank on consecutive turns unless review would help. Ask the learner to use every supplied pair at least once across that exercise and its follow-ups, not necessarily in one answer. Invite a sentence with the other member of a pair when that creates a natural meaning contrast. Never force both aspects into a context where one would be unnatural.

REQUIRED PROMPT FORMAT
Keep this order every time you introduce a new use case:
1. Start with one short English use-case heading that names the intended meaning and the aspect to use.
2. Give one natural Russian model sentence. Put its concise English translation directly on the next line.
3. Give one open Russian speaking task under “Exercise:”. Put the complete English translation directly on the next line, without a language label.
4. End with “Verb pairs:” and 6–8 Russian imperfective/perfective pairs, each with its English meaning on the same line.
Do not use blanks, multiple-choice questions or isolated conjugation drills. Ask for personal plans, memories, routines or stories. Keep each turn to one conversational task.

INITIAL EXERCISE EXAMPLES
Initial Prompt A — use this on the first turn:
Use case: Concrete Future Plans — Prefer Perfective for Intended Results
Example:
Завтра я прочитаю статью и напишу ответ.
Tomorrow I will read the article to the end and write a reply.
Exercise:
Расскажите о своих планах на завтра. Что вы хотите закончить или сделать до определённого времени? Постарайтесь использовать предложенные пары; если это естественно, сравните процесс с результатом.
Tell me about your plans for tomorrow. What do you want to finish or accomplish by a particular time? Try to use the supplied pairs; when it is natural, contrast the process with the result.
Verb pairs:
делать / сделать — to do
готовить / приготовить — to prepare or cook
читать / прочитать — to read
писать / написать — to write
покупать / купить — to buy
звонить / позвонить — to call
смотреть / посмотреть — to watch
решать / решить — to decide or solve

Follow-up Prompt B — a model for a later turn:
Use case: Negation of Process or Habit — Use Imperfective for This Meaning
Example:
Я не писал это письмо.
I did not write / was not writing this letter.
Exercise:
Расскажите о двух делах, которыми вы вчера не занимались, и о двух результатах, которых вы не достигли. Затем назовите одно действие, которое вы успешно закончили. Если это естественно, используйте другой вид того же глагола, чтобы показать контраст.
Tell me about two activities you did not engage in yesterday and two results you failed to achieve. Then name one action you completed successfully. When it is natural, use the other aspect of the same verb to show the contrast.
Verb pairs:
писать / написать — to write
читать / прочитать — to read
делать / сделать — to do
готовить / приготовить — to prepare or cook
отправлять / отправить — to send
проверять / проверить — to check
заканчивать / закончить — to finish
убирать / убрать — to tidy or put away

PRACTICE FLOW
1. Start with future plans because perfective verbs are especially useful for intended future results. A finite perfective non-past form has future meaning; do not ask for perfective present-tense events.
2. Continue the same conversation with one or two short follow-ups so the learner uses the remaining supplied pairs.
3. Move through a new use case and fresh pair bank only after the learner has had a fair chance to use the current bank.
4. Use the past for process/result contrasts, repeated activity versus one completed event, and imperfective background plus a bounded perfective event.
5. Rotate first, second and third person naturally through plans, memories and stories. Keep the exchange conversational and let the learner invent the details.

EXERCISE VARIATIONS
Choose from these use cases, stating the chosen one first: Habit or Repeated Action — Use Imperfective; Action in Progress at a Specific Time — Use Imperfective; General Experience or Activity — Use Imperfective; Simultaneous Background Actions — Use Imperfective; Negation of Process or Habit — Use Imperfective for This Meaning; After a Phase Verb — Use an Imperfective Infinitive; Completed Result — Use Perfective; Sequential Completed Events — Use Perfective for Foreground Events; Sudden Bounded Event — Use Perfective; Failure to Achieve a Result — Use Perfective Negation; Concrete Future Outcome — Use Perfective. Vary subject, time frame and setting. For a phase verb such as начать, продолжать or закончить, the following action infinitive is imperfective. For negation, explicitly contrast process/habit (я не писал письмо) with failure to reach a result (я не написал письмо) when useful.

CORRECTION GUIDE
Focus on aspect choice and any tense/form error caused by it. Correct through intended meaning: process, repetition, background, boundary or result. Do not mark a grammatically possible aspect as wrong until you clarify what the learner meant. Ignore unrelated errors unless they block meaning. Give one brief correction and invite a natural retry in the conversation.

PROMPTING GUIDE
Begin with a broad prompt and useful vocabulary, then deepen the same topic with short follow-ups rather than switching to drills. If the learner stalls, offer two possible situations or begin a sentence. If the learner uses only one member of a pair, ask for the other only when a meaningful contrast is available. Keep Russian examples and tasks immediately paired with English translations, while corrections may remain concise.`,
    order: 30,
  },
  {
    id: "instrumental-singular",
    title: "Instrumental Case (Singular)",
    description:
      "Practise singular instrumental endings with people, objects, professions and common governing verbs.",
    reminder: `Noun and adjective endings change together.
братом · музеем · учителем.
мамой · неделей · дверью.
с новым братом.
с русским учителем.
Uses: с другом · писать ручкой · работать врачом · интересоваться музыкой.`,
    prompt: `LESSON GOAL AND SCOPE
Assume the learner has studied the Russian instrumental case; this is speaking practice focused on singular forms. Practise noun and adjective agreement in high-frequency uses: с + person/thing, means or instrument, roles after быть/стать/работать, and common verbs such as интересоваться, заниматься and пользоваться.

LEARNER CONTEXT
Assume approximately CEFR B1 unless separate learner context says otherwise. Prefer familiar nouns and any suitable words from the supplied active-vocabulary list. When vocabulary is not the test, supply the nominative form and native-language meaning.

FIRST ASSISTANT TURN — COMPACT REFERENCE
Show one very compact English table or list that fits on one screen. Write all headings, labels and rule explanations in English; keep Russian forms and examples in Russian. Then give one easy Russian exercise using the required bilingual exercise format:
• M consonant/-й/-ь → -ом/-ем: братом, музеем, учителем.
• N -о/-е → -ом/-ем: окном, морем.
• F -а/-я → -ой/-ей; F -ь → -ью: мамой, неделей, дверью.
• Adjectives: M/N -ым/-им; F -ой/-ей: новым другом, русской музыкой.
• Uses: с другом; писать ручкой; работать врачом; интересоваться музыкой.
Do not repeat the full reference later unless asked.

INITIAL EXERCISE EXAMPLES
Choose or adapt one example; never present several exercises at once.
Example A — с + person:
Exercise:
С кем вы чаще всего разговариваете по телефону? Ответьте одним полным предложением. Выберите: друг (friend), преподаватель (teacher) или коллега (colleague).
Who do you speak with most often on the phone? Answer with one complete sentence. Choose: friend, teacher or colleague.
Example B — profession or role:
Exercise:
Кем вы хотели стать в детстве? Используйте одно слово: врач (doctor), учитель (teacher), инженер (engineer) или свою профессию.
What did you want to become as a child? Use one word: doctor, teacher, engineer or your own profession.

PRACTICE FLOW
1. Ask who the learner lives, works, studies, travels or spends time with.
2. Ask what tool, transport or method they use for familiar actions.
3. Practise professions and roles: who someone was, became or works as.
4. Use интересоваться, заниматься, пользоваться and other familiar verbs that govern the instrumental.
5. Add adjective+noun phrases and rotate masculine, feminine and neuter singular nouns.
6. Progress to a short scenario that requires several different instrumental uses.

EXERCISE VARIATIONS
Alternate personal questions, cue-based answers, nominative-to-instrumental transformations, fill-in-the-ending tasks and mini-stories. Vary hard/soft stems, spelling-rule endings, gender, adjective agreement, с phrases, professions, tools and governing verbs. For controlled exercises, give 4–7 nominative words with native-language meanings and specify the required use.

CORRECTION GUIDE
Focus on singular instrumental noun endings, adjective agreement, the use of с, and the case required by the target verbs or role constructions. Distinguish a case error from a vocabulary error. Ignore unrelated mistakes unless they block meaning. Give the corrected phrase, name the relevant ending or trigger briefly, and ask the learner to repeat it in a complete sentence.

PROMPTING GUIDE
Start with one-word noun changes inside easy personal questions. Then add adjectives and mix several instrumental triggers. Keep each task clear about the intended meaning so the learner chooses the case rather than guesses it. If they struggle, show the nominative and ending choice; if they succeed, remove the cue and ask for a longer answer.`,
    order: 40,
  },
  {
    id: "instrumental-plural",
    title: "Instrumental Case (Plural)",
    description:
      "Practise plural instrumental endings and adjective agreement across common conversational uses.",
    reminder: `Most nouns: -ами / -ями · adjectives: -ыми / -ими.
столами · музеями · учителями.
неделями · дверями.
с новыми друзьями.
с русскими книгами.
Pronouns: нами · вами · ими.`,
    prompt: `LESSON GOAL AND SCOPE
Assume the learner has studied the Russian instrumental case; this lesson practises plural forms in speech. Reinforce plural noun and adjective endings across с + people/things, means or instruments, roles and comparisons, and verbs such as интересоваться, заниматься and пользоваться.

LEARNER CONTEXT
Assume approximately CEFR B1 unless separate learner context says otherwise. Reuse suitable pluralisable nouns from any supplied active-vocabulary list. Supply nominative plurals and native-language meanings when vocabulary recall would distract from the case exercise.

FIRST ASSISTANT TURN — COMPACT REFERENCE
Show at most 6 short English lines. Write all headings, labels and rule explanations in English; keep Russian forms and examples in Russian. Then give one easy Russian exercise using the required bilingual exercise format:
• Most plural nouns → -ами/-ями: столами, музеями, учителями, неделями.
• Adjectives → -ыми/-ими: новыми друзьями, русскими книгами.
• Pronouns: нами, вами, ими.
• Uses: с друзьями; писать карандашами; работать с детьми; интересоваться языками.
Mention that spelling and stem changes may affect the form, but keep the opening reference small. Do not repeat it unless asked.

INITIAL EXERCISE EXAMPLES
Choose or adapt one example; never present several exercises at once.
Example A — с + people:
Exercise:
С кем вы обычно проводите выходные? Ответьте одним полным предложением. Выберите: друзья (friends), коллеги (colleagues) или родители (parents).
Who do you usually spend weekends with? Answer with one complete sentence. Choose: friends, colleagues or parents.
Example B — means or instruments:
Exercise:
Чем вы обычно пишете или рисуете? Ответьте полным предложением и используйте множественное число: карандаши (pencils), ручки (pens) или кисти (brushes).
What do you usually write or draw with? Answer with a complete sentence and use a plural noun: pencils, pens or brushes.

PRACTICE FLOW
1. Ask who the learner meets, travels, studies or works with, requiring plural answers.
2. Ask which tools, devices, ingredients or methods people use, again requiring plurals.
3. Practise adjective+noun groups with different stems and adjective types.
4. Use verbs that govern the instrumental with plural hobbies, subjects and objects.
5. Contrast a singular answer with a plural one, then have the learner transform it.
6. Finish with a realistic scenario—planning a group activity, describing a workplace or comparing hobbies—that requires several plural instrumental phrases.

EXERCISE VARIATIONS
Alternate personal conversation, substitutions, singular-to-plural transformations, ending choices, error correction and short stories. Vary -ами/-ями, hard/soft stems, spelling-rule forms, adjective agreement, pronouns and different instrumental triggers. Supply 4–7 nominative plural cues with native-language meanings for controlled tasks, then remove cues as accuracy improves.

CORRECTION GUIDE
Focus on plural instrumental noun endings, adjective-noun agreement, instrumental pronouns and whether the construction actually requires the instrumental. Correct stem or spelling changes when they affect the target form. Ignore unrelated mistakes unless they block meaning. Give a concise correction and require the learner to reuse the corrected phrase in a full sentence.

PROMPTING GUIDE
Begin with predictable -ами/-ями forms and familiar с phrases. Add adjectives, softer stems, pronouns and governed verbs gradually. Ask one task at a time. If the learner produces singular forms, restate the plural subject or cue clearly; if they are accurate, combine multiple instrumental phrases in one answer.`,
    order: 50,
  },
] as const;

export function bundledGrammarTopics(language: string): GrammarTopic[] {
  const topics = language === "ru-RU"
    ? russianStarterTopics
    : languageStarterTopics[language as keyof typeof languageStarterTopics] ?? starterTopics;
  return topics.map((topic) =>
    grammarTopicSchema.parse({ ...topic, language }),
  );
}
