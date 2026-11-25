export type ReviewCase = {
  id: string;
  about: string;
  phrase: string;
  meaning: string;
  example?: string;
  expectSuggestion: boolean;
  // Expected substrings when a suggestion is required.
  expectedAny?: string[];
};

export const russianReviewCases: ReviewCase[] = [
  {
    id: "ok-idiomatic",
    about: "Natural conversational phrase that should pass without a suggestion.",
    phrase: "побыть рядом с родителями",
    meaning: "to spend time close to parents",
    expectSuggestion: false,
  },
  {
    id: "ok-everyday",
    about: "Simple everyday expression that needs no change.",
    phrase: "на выходных",
    meaning: "at the weekend",
    example: "На выходных мы поедем на дачу.",
    expectSuggestion: false,
  },
  {
    id: "ok-collocation",
    about: "Natural collocation in the right case.",
    phrase: "принимать решение",
    meaning: "to make a decision",
    expectSuggestion: false,
  },
  {
    id: "bad-calque-closeness",
    about: "Literal textbook translation of 'a moment of closeness with a parent'.",
    phrase: "момент близости с родителем",
    meaning: "a moment of closeness with a parent",
    example: "Ей нравится момент близости с родителем.",
    expectSuggestion: true,
    expectedAny: ["побыть", "рядом", "время", "ближе"],
  },
  {
    id: "bad-calque-take-shower",
    about: "English calque 'брать душ' instead of 'принимать душ'.",
    phrase: "брать душ",
    meaning: "to take a shower",
    expectSuggestion: true,
    expectedAny: ["принимать", "принять", "сходить в душ"],
  },
  {
    id: "bad-calque-make-mistake",
    about: "English calque 'делать ошибку' instead of 'допускать / совершать ошибку' or 'ошибаться'.",
    phrase: "делать ошибку",
    meaning: "to make a mistake",
    expectSuggestion: true,
    expectedAny: ["допускать", "допустить", "совершать", "совершить", "ошибаться", "сделать ошибку"],
  },
  {
    id: "bad-preposition-case",
    about: "Wrong case after 'нет' saved as a reusable chunk.",
    phrase: "у меня нет время",
    meaning: "I don't have time",
    expectSuggestion: true,
    expectedAny: ["времени"],
  },
];
