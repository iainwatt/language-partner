// Annotation prompts, version 0. After the script is written as plain text,
// each of these is a separate call that adds one kind of marking to it. The
// app accepts a result only if, with the markings removed, it is exactly the
// text that was sent, so an annotation can never change a word of the script.
// A version is frozen once it has shipped: copy to the next number to change it.
const exact = (target: string) =>
  `You are given a text in ${target}. Return exactly the same text with marks added, and change nothing else: every letter, space, punctuation mark and line break must stay as it is, in the same order. Do not correct, improve, translate or comment on the text. If your result differs from the original by even one character apart from the marks, it is thrown away.`;

export const annotateV0 = {
  // Which words stand in which case, and where each ending begins.
  cases: (target: string, cases: { mark: string; name: string }[]) =>
    `${exact(target)}

YOUR TASK: mark the grammatical case of every noun, pronoun, adjective, participle and numeral that stands in one of these cases, throughout the text: ${cases.map((item) => `${item.mark} for ${item.name.toLowerCase()}`).join(", ")}. Words in the nominative are not marked.

HOW TO MARK: wrap the word in square brackets with the case label and a colon, and put a | between its stem and its case ending, like [gen:дом|а] or [pre:парк|е]. An adjective and its noun can share one pair of brackets, each with its own |, like [gen:больш|ого дом|а]. A word with no separable ending, such as a pronoun, takes no |, like [dat:ей] or [gen:их]; give a pronoun brackets of its own. Leave prepositions, numbers written as digits, and all other words outside the brackets.

The | only shows where the ending begins. The letters on either side of it must spell the word exactly as it is written in the text: "отца" is [gen:отц|а], never anything that would read differently with the | removed. Decide each case from the role the word plays in its sentence, not from the ending alone, since the same ending can belong to several cases.

Return only the marked text.`,

  // Where the stress falls in each word.
  stress: (target: string) =>
    `${exact(target)}

YOUR TASK: show where the stress falls. In every word of two or more syllables, put the combining acute accent (the character U+0301) immediately after the stressed vowel, as in "расска́зывать" or "молоко́". Do not mark words of one syllable. Do not mark a word containing ё, which is always stressed on the ё.

Take the stress from how the word is used in its sentence. Many words are spelt alike and stressed differently depending on their meaning or form: "за́мок" is a castle and "замо́к" a lock; "до́ма" is "at home" and "дома́" is "houses"; "руки́" is "of the hand" and "ру́ки" is "hands". Give names and borrowed words the stress a native speaker would use.

Return only the text with the accents added.`,
};
