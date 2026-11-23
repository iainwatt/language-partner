import type { ScriptCase } from "./script.checks";

// Russian conversations for an English-speaking learner, with the learner's
// turns as dictation delivers them, mistakes included. Each is taken through
// the outline, an optional change request, and the script.
export const russianScriptCases: ScriptCase[] = [
  {
    id: "daughter",
    about: "A daughter called Skye and the family cat; the learner then asks to drop the cat and lead with her character.",
    turns: [
      { role: "assistant", text: "Привет! О чём ты хочешь поговорить сегодня?" },
      { role: "user", text: "я хочу поговорить о моей дочери её зовут скай ей три года" },
      { role: "assistant", text: "Какое красивое имя! Что Скай любит делать?" },
      { role: "user", text: "она очень любит сказки я рассказываю её сказки каждый вечер" },
      { role: "assistant", text: "Как мило! А какой у неё характер?" },
      { role: "user", text: "она смешная девушка и дерзкая она убегает от меня когда я одеваю её" },
      { role: "assistant", text: "Ха-ха, знакомо! А есть ли у вас домашние животные?" },
      { role: "user", text: "да у нас есть кошка она постоянно забирается на дерево в саду" },
    ],
    saved: [
      { phrase: "сказка", meaning: "fairy tale" },
      { phrase: "дерзкий", meaning: "cheeky" },
      { phrase: "убегать", meaning: "to run away" },
    ],
    dictionary: [
      { phrase: "смеяться", meaning: "to laugh" },
      { phrase: "вместе", meaning: "together" },
    ],
    outlineCovers: [["daughter"], ["Skye", "Sky"], ["three"], ["fairy tale", "stories", "story"], ["cat"], ["tree"]],
    feedback: {
      text: "Leave out the cat, and start with the fact that she is cheeky and runs away when I dress her.",
      gone: ["cat"],
      before: [["cheeky", "runs away", "run away"], ["fairy tale", "stories", "story"]],
    },
    scriptCovers: ["доч", "скай", "сказ", "убега"],
    scriptGone: ["кошк"],
  },
  {
    id: "weekend",
    about: "Weekend plans with the in-laws; no changes requested.",
    turns: [
      { role: "assistant", text: "Привет! Какие у тебя планы на выходные?" },
      { role: "user", text: "в субботу мы с женой поедем к её родителям на дачу" },
      { role: "assistant", text: "Отлично! Что вы будете там делать?" },
      { role: "user", text: "мы будем жарить шашлык и я хочу помогать её отец в саду" },
      { role: "assistant", text: "Звучит здорово! А в воскресенье?" },
      { role: "user", text: "в воскресенье я иду в спортзал а потом буду смотреть футбол по телевизор" },
    ],
    saved: [
      { phrase: "дача", meaning: "country house" },
      { phrase: "шашлык", meaning: "barbecue" },
      { phrase: "помогать", meaning: "to help" },
    ],
    dictionary: [
      { phrase: "погода", meaning: "weather" },
      { phrase: "вместе", meaning: "together" },
    ],
    outlineCovers: [["Saturday"], ["wife"], ["parents"], ["barbecue", "shashlik", "kebab"], ["garden"], ["gym"], ["football", "soccer"]],
    scriptCovers: ["суббот", "жен", "родител", "шашлык", "сад", "спортзал", "футбол"],
  },
  {
    id: "work",
    about: "Work as a programmer in Edinburgh; the learner asks for the after-work part to come first.",
    turns: [
      { role: "assistant", text: "Привет! Расскажи о своей работе." },
      { role: "user", text: "я работаю программистом уже десять лет" },
      { role: "assistant", text: "Интересно! Где ты работаешь?" },
      { role: "user", text: "я работаю в большой компании в edinburgh мы делаем приложение для банки" },
      { role: "assistant", text: "А что тебе нравится в работе?" },
      { role: "user", text: "мне нравится мои коллеги но я не люблю длинные совещание" },
      { role: "assistant", text: "Понимаю! А чем ты занимаешься после работы?" },
      { role: "user", text: "после работы я учу русский язык и гуляю с собакой" },
    ],
    saved: [
      { phrase: "совещание", meaning: "meeting" },
      { phrase: "коллега", meaning: "colleague" },
      { phrase: "приложение", meaning: "app" },
    ],
    dictionary: [
      { phrase: "опыт", meaning: "experience" },
      { phrase: "каждый день", meaning: "every day" },
    ],
    outlineCovers: [["programmer", "developer", "software"], ["ten"], ["Edinburgh"], ["bank"], ["colleague"], ["meeting"], ["Russian"], ["dog"]],
    feedback: {
      text: "Put what I do after work first.",
      before: [["dog", "Russian"], ["programmer", "developer", "software"]],
    },
    scriptCovers: ["программист", "эдинбург", "банк", "коллег", "совещан", "русск", "собак"],
    scriptBefore: [["собак", "русск"], ["программист"]],
  },
  {
    id: "family-house",
    about: "A family story with several people. The facts are easy to get wrong: it is the wife's father who bought the house, and Dan is the husband of the wife's sister, Rodica.",
    turns: [
      { role: "assistant", text: "Привет! О чём ты хочешь рассказать сегодня?" },
      { role: "user", text: "я хочу рассказать о дане и родике родика это сестра моей жены а дан муж родики" },
      { role: "assistant", text: "Понятно! Что случилось?" },
      { role: "user", text: "отец моей жены илларион купил маленький дом шесть или семь месяцев назад он примерно шестьдесят метров от их главного дома" },
      { role: "assistant", text: "Интересно. И что было дальше?" },
      { role: "user", text: "мы с женой живём в одной комнате и мы надеялись жить в этом доме но потом я увидел дан работает в саду" },
      { role: "assistant", text: "Ох. А что вам сказали?" },
      { role: "user", text: "никто нам ничего не сказал потом мы узнали что илларион дал дом дану и родике я думаю моя тёща сказала нам" },
    ],
    saved: [
      { phrase: "тёща", meaning: "mother-in-law" },
      { phrase: "надеяться", meaning: "to hope" },
      { phrase: "узнать", meaning: "to find out" },
    ],
    dictionary: [
      { phrase: "сад", meaning: "garden" },
      { phrase: "вместе", meaning: "together" },
    ],
    outlineCovers: [
      ["Rodica"], ["Dan"], ["wife's sister", "sister-in-law"], ["wife's father", "father-in-law"],
      ["Ilarion", "Illarion", "Hilarion"], ["garden"], ["one room", "single room"], ["mother-in-law", "wife's mother"],
    ],
    outlineGone: ["my father bought", "my own father", "my sister", "my mother told", "my mom", "my mum"],
    scriptCovers: ["родик", "дан", "жен", "дом", "сад", "тёщ"],
    scriptGone: ["мой отец", "моя сестра", "моя мама", "моя мать"],
  },
];
