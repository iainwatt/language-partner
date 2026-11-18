import { questions } from "@/content/landing";
export function QuestionList() {
  return <div className="question-list">{questions.map(({question,answer}) => <details key={question}><summary>{question}<span aria-hidden="true" className="question-plus"/></summary><p>{answer}</p></details>)}</div>;
}
