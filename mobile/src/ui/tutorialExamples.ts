// Bundled examples: the walkthrough works offline and never sends a message,
// records audio, or changes the learner's dictionary.
export type TutorialExample = {
  language: string;
  question: string;
  answer: string;
  phrase: string;
  weekend: string;
};

const examples: Record<string, TutorialExample> = {
  ru: {
    language: "Russian",
    question: "Что вы хотите делать в эти выходные?",
    answer: "Я хочу погулять в парке.",
    phrase: "погулять в парке",
    weekend: "в эти выходные",
  },
  es: {
    language: "Spanish",
    question: "¿Qué quieres hacer este fin de semana?",
    answer: "Quiero dar un paseo por el parque.",
    phrase: "dar un paseo por el parque",
    weekend: "este fin de semana",
  },
  fr: {
    language: "French",
    question: "Que veux-tu faire ce week-end ?",
    answer: "Je veux me promener dans le parc.",
    phrase: "me promener dans le parc",
    weekend: "ce week-end",
  },
  de: {
    language: "German",
    question: "Was möchtest du dieses Wochenende machen?",
    answer: "Ich möchte im Park spazieren gehen.",
    phrase: "im Park spazieren gehen",
    weekend: "dieses Wochenende",
  },
  it: {
    language: "Italian",
    question: "Che cosa vuoi fare questo fine settimana?",
    answer: "Voglio fare una passeggiata nel parco.",
    phrase: "fare una passeggiata nel parco",
    weekend: "questo fine settimana",
  },
  pt: {
    language: "Portuguese",
    question: "O que você quer fazer neste fim de semana?",
    answer: "Quero passear no parque.",
    phrase: "passear no parque",
    weekend: "neste fim de semana",
  },
  ja: {
    language: "Japanese",
    question: "今週末は何をしたいですか？",
    answer: "公園を散歩したいです。",
    phrase: "公園を散歩する",
    weekend: "今週末",
  },
  en: {
    language: "English",
    question: "What would you like to do this weekend?",
    answer: "I want to go for a walk in the park.",
    phrase: "go for a walk in the park",
    weekend: "this weekend",
  },
};

export const tutorialExample = (targetLanguage: string) =>
  examples[targetLanguage.split("-")[0]] ?? examples.ru;
