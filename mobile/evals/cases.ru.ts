import type { EvalCase } from "./checks";

// Russian test conversations for an English-speaking learner. Each plants one
// known situation in the learner's last turn, written as a speech recogniser
// would deliver it: no capitals, little punctuation.
//   slip      a recognition slip that must not be corrected or mentioned
//   error     a real mistake that must be corrected
//   clean     a correct turn that must draw no corrections
//   ambiguous a form that could be either; nothing is scored, the outcome is reported
//   stuck     the learner says they do not know a word; the partner must supply one
const hello = { role: "assistant" as const, text: "Привет! О чём ты хочешь поговорить сегодня?" };

export const russianCases: EvalCase[] = [
  {
    id: "slip-name",
    kind: "slip",
    about: "The daughter's name Skye, established earlier, arrives as the English word 'sky'.",
    history: [
      hello,
      { role: "user", text: "Я хочу поговорить о моей дочери. Её зовут Скай." },
      { role: "assistant", text: "Какое красивое имя! Сколько лет Скай?" },
    ],
    turn: "sky три года и она очень любит сказки",
    slips: ["sky"],
  },
  {
    id: "slip-non-word",
    kind: "slip",
    about: "'постоянно' is recognised as the non-word 'пятная'; the rest of the sentence is correct.",
    history: [
      hello,
      { role: "user", text: "У меня есть кошка." },
      { role: "assistant", text: "Как здорово! Что она любит делать?" },
    ],
    turn: "она пятная забирается на дерево",
    slips: ["пятная"],
  },
  {
    id: "slip-repeated-words",
    kind: "slip",
    about: "Words repeated by a restart in speech; the sentence is otherwise correct.",
    history: [hello],
    turn: "вчера я я ходил ходил в магазин и купил хлеб",
    slips: ["ходил ходил"],
  },
  {
    id: "slip-latin-place",
    kind: "slip",
    about: "A place name is written in the Latin alphabet by the recogniser.",
    history: [hello, { role: "user", text: "Я хочу рассказать о моём городе." }, { role: "assistant", text: "С удовольствием послушаю! Где ты живёшь?" }],
    turn: "я живу в edinburgh уже пять лет",
    slips: ["edinburgh"],
  },
  {
    id: "slip-split-word",
    kind: "slip",
    about: "'напиток' is split into two words, 'на питок'.",
    history: [hello],
    turn: "я люблю кофе с молоком это мой любимый на питок",
    slips: ["на питок"],
  },
  {
    id: "error-prepositional",
    kind: "error",
    about: "Location after 'в' needs the prepositional case.",
    history: [hello],
    turn: "я живу в лондон уже десять лет",
    errors: [{ said: "лондон", better: ["лондоне"] }],
  },
  {
    id: "error-dative",
    kind: "error",
    about: "'рассказывать' takes the dative: 'ей', not 'её'.",
    history: [hello, { role: "user", text: "У меня есть маленькая дочь." }, { role: "assistant", text: "Как чудесно! Что вы любите делать вместе?" }],
    turn: "я рассказываю её сказки каждый вечер",
    errors: [{ said: "её", better: ["ей"] }],
  },
  {
    id: "error-gender",
    kind: "error",
    about: "The adjective must agree with the feminine noun 'машина'.",
    history: [hello],
    turn: "у меня есть новый машина",
    errors: [{ said: "новый", better: ["новая"] }],
  },
  {
    id: "error-conjugation",
    kind: "error",
    about: "An infinitive is used where a conjugated verb is needed.",
    history: [hello],
    turn: "моя жена работать в школе",
    errors: [{ said: "работать", better: ["работает"] }],
  },
  {
    id: "error-genitive",
    kind: "error",
    about: "'нет' takes the genitive: 'времени'.",
    history: [hello],
    turn: "у меня нет время сегодня",
    errors: [{ said: "время", better: ["времени"] }],
  },
  {
    id: "error-motion-verb",
    kind: "error",
    about: "A repeated trip needs 'хожу', not 'иду'.",
    history: [hello],
    turn: "я иду в спортзал каждый день",
    errors: [{ said: "иду", better: ["хожу"] }],
  },
  {
    id: "error-several",
    kind: "error",
    about: "Three mistakes in one sentence: two infinitives for past tense, and a genitive plural after 'много'.",
    history: [hello],
    turn: "вчера я идти в магазин и купить много продукты",
    errors: [
      { said: "идти", better: ["пошёл", "ходил", "пошла", "ходила"] },
      { said: "купить", better: ["купил", "купила"] },
      { said: "продукты", better: ["продуктов"] },
    ],
  },
  {
    id: "clean-past",
    kind: "clean",
    about: "A correct sentence in the past tense.",
    history: [hello],
    turn: "вчера я ходил в магазин и купил хлеб и молоко",
  },
  {
    id: "clean-instrumental",
    kind: "clean",
    about: "A correct sentence with the instrumental case.",
    history: [hello],
    turn: "мне нравится гулять в парке с собакой по утрам",
  },
  {
    id: "clean-no-punctuation",
    kind: "clean",
    about: "A correct longer sentence with no capitals or punctuation, as dictation delivers it.",
    history: [hello],
    turn: "в субботу мы с женой поедем к её родителям на дачу если будет хорошая погода",
  },
  {
    id: "clean-work",
    kind: "clean",
    about: "A correct sentence about work.",
    history: [hello],
    turn: "я работаю программистом уже десять лет и мне очень нравится моя работа",
  },
  {
    id: "ambiguous-bank",
    kind: "ambiguous",
    about: "'в банки' for 'в банке': the unstressed endings sound the same, so it may be a slip or a case error.",
    history: [hello],
    turn: "мой брат работает в банки",
    watch: "банки",
  },
  {
    id: "ambiguous-building",
    kind: "ambiguous",
    about: "'здания' for 'здание': the unstressed endings sound almost the same.",
    history: [hello],
    turn: "вчера я видел очень красивое здания в центре города",
    watch: "здания",
  },
  {
    id: "stuck-playground",
    kind: "stuck",
    about: "The learner says they do not know what the things in a playground are called. The partner once answered only 'what thing is it?'.",
    history: [
      hello,
      { role: "user", text: "Моя дочь любит детскую площадку." },
      { role: "assistant", text: "Здорово! А во что она любит там играть?" },
    ],
    turn: "да я не знаю я не знаю имя для вещь в детский площадь",
    offers: ["качел", "горк", "песочниц", "карусел"],
  },
  {
    id: "stuck-says-so",
    kind: "stuck",
    about: "The learner says outright, half in English, that they do not know how to say 'to swim'.",
    history: [
      hello,
      { role: "user", text: "Летом мы были на море." },
      { role: "assistant", text: "Как хорошо! Что вы там делали?" },
    ],
    turn: "мы много я не знаю как сказать по-русски swim каждый день",
    offers: ["плава", "купа"],
  },
];
