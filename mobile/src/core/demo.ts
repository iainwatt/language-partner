import { languageName, type Message } from "./domain";
import type { GrammarPractice } from "./grammar";
const spanishPhrases = [
  ["Tengo muchas ganas.", "I'm looking forward to it."],
  ["¿Qué te apetece hacer allí?", "What do you feel like doing there?"],
  ["te apetece", "you feel like"],
  ["por si acaso", "just in case"],
  [
    "Voy a ir a Madrid este fin de semana.",
    "I'm going to Madrid this weekend.",
  ],
  ["este fin de semana", "this weekend"],
  ["un café", "a coffee"],
  ["Me gustaría probar la comida local.", "I'd like to try the local food."],
  ["¿Puedes hablar más despacio?", "Can you speak more slowly?"],
  ["¡Qué bien!", "How nice!"],
  ["Madrid tiene mucho que ofrecer.", "Madrid has a lot to offer."],
  [
    "Puedes pasear por el Retiro, descubrir un café en Malasaña o visitar el Prado.",
    "You can walk through Retiro, discover a café in Malasaña or visit the Prado.",
  ],
];
const russianPhrases = [
  ["Привет!", "Hi!"],
  ["Я учу русский язык.", "I'm learning Russian."],
  ["Давай практиковаться вместе.", "Let's practise together."],
  ["Как прошёл твой день?", "How was your day?"],
  ["Сегодня я…", "Today I…"],
  ["С нетерпением жду.", "I'm looking forward to it."],
  ["на всякий случай", "just in case"],
  ["в эти выходные", "this weekend"],
  ["Я хочу выпить кофе.", "I want to have a coffee."],
  ["Мне нравится русская кухня.", "I like Russian food."],
  ["Говори, пожалуйста, помедленнее.", "Can you speak more slowly?"],
  ["Что это значит?", "What does that mean?"],
  [
    "Чем ты любишь заниматься в свободное время?",
    "What do you like to do in your free time?",
  ],
];
const phrasebooks: Record<string, string[][]> = {
  es: spanishPhrases,
  ru: russianPhrases,
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[.!?¿¡]/g, "")
    .replace(/[’]/g, "'");
export function demoTranslation(
  text: string,
  source: string,
  target: string,
): string | undefined {
  if (source === target) return text;
  const sourceLanguage = source.split("-")[0];
  const targetLanguage = target.split("-")[0];
  const from = sourceLanguage === "en" ? 1 : 0;
  const phrases =
    sourceLanguage === "en"
      ? phrasebooks[targetLanguage]
      : targetLanguage === "en"
        ? phrasebooks[sourceLanguage]
        : undefined;
  if (!phrases) return undefined;
  return phrases.find((row) => normalize(row[from]) === normalize(text))?.[
    1 - from
  ];
}
export function demoReply(
  messages: Message[],
  target: string,
  grammar?: GrammarPractice,
) {
  const last = messages.at(-1)?.text.toLowerCase() ?? "";
  if (grammar)
    return `Let’s practise ${grammar.title.toLowerCase()}. ${grammar.description} Sign in for guided practice and focused corrections.`;
  if (target === "ru-RU") {
    if (/медлен|slow/.test(last))
      return "Конечно! Давай начнём с коротких фраз.\n\n«Я учу русский язык» — “I'm learning Russian.”\n\nМожно также сказать: «Говори, пожалуйста, помедленнее». Это значит “Can you speak more slowly?”";
    if (/еда|еду|кухн|есть|кофе|food|coffee/.test(last))
      return "Давай поговорим о еде! Например: «Мне нравится русская кухня» — “I like Russian food.”\n\n«Я хочу выпить кофе» — “I want to have a coffee.”\n\nА какое твоё любимое блюдо?";
    return "Давай практиковаться вместе!\n\n«Как прошёл твой день?» — “How was your day?” Можно начать так: «Сегодня я…»\n\nЧем ты любишь заниматься в свободное время?";
  }
  if (target !== "es-ES")
    return `Local demo has example conversations in Russian and Spanish. Your ${languageName(target)} text, dictionary and reviews still work. Sign in for open-ended practice.`;
  if (/comida|comer|tapas/.test(last))
    return "¡Buena idea! Puedes probar unas tapas y pedir una tortilla española. Para pedir con naturalidad, puedes decir: «Me gustaría probar la comida local».\n\n¿Prefieres descubrir un sitio pequeño de barrio o comer en un mercado? Cuéntame qué tipo de comida te gusta.";
  if (/despacio|slow/.test(last))
    return "Claro, vamos poco a poco. «Me gustaría» significa “I would like”. Puedes usarlo para hablar de tus planes: «Me gustaría visitar el Prado».\n\nTómate tu tiempo. ¿Qué te gustaría hacer primero?";
  return "¡Suena bien! Puedes empezar el día con un paseo tranquilo y dejar tiempo para descubrir algo inesperado. Yo llevaría una chaqueta por si acaso.\n\n«Por si acaso» significa “just in case”. No hace falta guardarlo todo: elige solamente las palabras que te resulten útiles.\n\n¿Cómo sería tu día ideal en Madrid? Cuéntamelo con todos los detalles que quieras.";
}
