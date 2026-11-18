"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Phone } from "./ProductPreview";
import { PracticeIcon } from "./PracticeIcon";

const steps = [
  {
    id: "create",
    label: "Create",
    title: "Start with what you actually need.",
    description: "An interview next week. A conversation you’ve been putting off. Tell your partner what you want to work on, right down to the words and mistakes that trip you up.",
    note: "Your situation. Your vocabulary. Your focus.",
    next: "See what gets saved",
  },
  {
    id: "save",
    label: "Save",
    title: "Keep what you want to remember.",
    description: "Finish with a short recap of the conversation, the words you saved and the grammar you worked on. Keep them together, ready for the next time you need them.",
    note: "One conversation, with everything worth coming back to.",
    next: "See the next practice",
  },
  {
    id: "repeat",
    label: "Repeat",
    title: "Same conversation. More to say.",
    description: "Come back to the same lesson with your saved words close by. Try the question again, build on your last answer and put what you’ve learned into your own words.",
    note: "A familiar question. A more confident answer.",
    next: "Back to the lesson brief",
  },
];

const savedWords = [
  ["stakeholder", "someone affected by the work"],
  ["deliverables", "the agreed outputs of a project"],
  ["follow up with", "contact someone again"],
  ["bring up", "introduce a topic"],
];

function CreateScreen() {
  return <>
    <div className="phone__language">Your lesson · English</div>
    <div className="journey-screen" tabIndex={0} role="region" aria-label="Example lesson brief">
      <p className="journey-screen__eyebrow">What would you like to practise?</p>
      <div className="journey-brief">
        <span className="message__speaker">Your instructions</span>
        <p>I have an interview next week. I want to use the right business vocabulary in the right context.</p>
        <p>Watch how I use phrasal verbs, and correct my pronunciation — especially words that start with an “h”, like <strong>hire</strong> and <strong>handle</strong>.</p>
      </div>
      <div className="journey-focus">
        <p className="journey-screen__eyebrow">Your focus</p>
        <ul>
          <li><PracticeIcon name="check"/>Business vocabulary in context</li>
          <li><PracticeIcon name="check"/>Using phrasal verbs naturally</li>
          <li><PracticeIcon name="check"/>The /h/ sound in hire and handle</li>
        </ul>
      </div>
      <div className="journey-message">
        <span className="message__speaker">Your partner</span>
        <p>Let’s start with a question you’re likely to hear: tell me about a time you handled a difficult client.</p>
      </div>
    </div>
    <div className="journey-phone-footer"><PracticeIcon name="microphone"/>Ready when you are.</div>
  </>;
}

function SaveScreen() {
  return <>
    <div className="phone__language">Your lesson recap</div>
    <div className="journey-screen" tabIndex={0} role="region" aria-label="Example saved lesson recap">
      <div className="journey-saved-status"><PracticeIcon name="check"/>Saved to your conversations</div>
      <div className="journey-recap-section">
        <h4>What you talked about</h4>
        <p>Introducing yourself, describing a project and handling a difficult client.</p>
      </div>
      <div className="journey-recap-section">
        <h4>Your saved words <span>4</span></h4>
        <dl className="journey-word-list">{savedWords.map(([word, meaning]) =>
          <div key={word}><dt>{word}</dt><dd>{meaning}</dd></div>
        )}</dl>
      </div>
      <div className="journey-recap-section">
        <h4>Your grammar focus</h4>
        <p>Follow up <span className="journey-grammar-key">with</span> someone.</p>
        <p className="journey-example">I’ll follow up <span className="journey-grammar-key">with</span> the client tomorrow.</p>
        <p className="journey-small">Pronoun position: bring <span className="journey-grammar-key">it</span> up.</p>
      </div>
      <div className="journey-recap-section">
        <h4>Pronunciation to practise</h4>
        <p className="journey-pronunciation"><span><strong>h</strong>ire</span><span><strong>h</strong>andle</span><span><strong>h</strong>ead</span></p>
      </div>
    </div>
    <div className="journey-phone-footer"><PracticeIcon name="bookmark"/>Interview prep · Ready to revisit</div>
  </>;
}

function RepeatScreen() {
  return <>
    <div className="phone__language">Same lesson · Next practice</div>
    <div className="journey-screen" tabIndex={0} role="region" aria-label="Example return to a saved lesson">
      <div className="journey-return">
        <PracticeIcon name="book"/>
        <div><span className="journey-screen__eyebrow">Your words are still here</span><p>follow up with · bring up · deliverables</p></div>
      </div>
      <div className="journey-message">
        <span className="message__speaker">Your partner</span>
        <p>Welcome back. Let’s try that question again: how did you handle a difficult client?</p>
      </div>
      <div className="journey-before">
        <span className="message__speaker">Your first practice</span>
        <p>“I followed up the client about the late work.”</p>
      </div>
      <div className="journey-after">
        <span className="message__speaker">This time</span>
        <p>“I <mark>followed up with</mark> the client, <mark>brought up</mark> the delay and agreed on revised <mark>deliverables</mark>.”</p>
      </div>
      <div className="journey-feedback">
        <PracticeIcon name="check"/>
        <p>You used “follow up with” correctly, and “deliverables” fits the context. Let’s build on that.</p>
      </div>
    </div>
    <div className="journey-phone-footer"><PracticeIcon name="microphone"/>Tell me a little more…</div>
  </>;
}

export function LessonJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function selectStep(index: number, focus = false) {
    setActiveStep(index);
    if (focus) tabs.current[index]?.focus({ preventScroll: true });
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % steps.length;
    else if (event.key === "ArrowLeft") next = (index + steps.length - 1) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    selectStep(next, true);
  }

  return <section className="lesson-journey section-rule page-shell" id="how-it-works" aria-labelledby="journey-title">
    <div className="reading-column">
      <h2 id="journey-title">Create. Save. Repeat.</h2>
      <p>Build a lesson around your life.<br/>Keep what you learn. Come back and use it.</p>
    </div>
    <div className="lesson-journey__tabs" role="tablist" aria-label="Explore the lesson steps">
      {steps.map((step, index) => <button
        key={step.id}
        ref={element => { tabs.current[index] = element; }}
        type="button"
        role="tab"
        id={`journey-tab-${step.id}`}
        aria-controls={`journey-panel-${step.id}`}
        aria-selected={activeStep === index}
        tabIndex={activeStep === index ? 0 : -1}
        onClick={() => selectStep(index)}
        onKeyDown={event => handleKey(event, index)}
      ><span aria-hidden="true">0{index + 1}</span>{step.label}</button>)}
    </div>
    {steps.map((step, index) => <div
      key={step.id}
      className="lesson-journey__panel"
      role="tabpanel"
      id={`journey-panel-${step.id}`}
      aria-labelledby={`journey-tab-${step.id}`}
      hidden={activeStep !== index}
    >
      <div className="lesson-journey__copy">
        <p className="screen-kicker">0{index + 1} / {step.label}</p>
        <h3>{step.title}</h3>
        <p>{step.description}</p>
        <p className="lesson-journey__note">{step.note}</p>
        <button className="lesson-journey__next text-link" type="button" onClick={() => selectStep((index + 1) % steps.length, true)}>{step.next}<PracticeIcon name="arrow"/></button>
      </div>
      <figure className="lesson-journey__preview">
        <Phone title="Interview prep" className="phone--journey">
          {index === 0 ? <CreateScreen/> : index === 1 ? <SaveScreen/> : <RepeatScreen/>}
        </Phone>
        <figcaption>Illustrative lesson screens · Interview preparation</figcaption>
      </figure>
    </div>)}
  </section>;
}
