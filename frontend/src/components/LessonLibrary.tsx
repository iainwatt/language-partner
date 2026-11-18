"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Phone } from "./ProductPreview";
import { PracticeIcon } from "./PracticeIcon";

const collections = [
  {
    id: "grammar",
    label: "Grammar topics",
    heading: "Give the grammar a story.",
    description: "Choose a topic you’ve already learned and put it into practice. Past tense can become a story about your weekend. Future tense can become a conversation about something you’re looking forward to.",
    note: "The grammar gives you a focus. Your life gives you something to say.",
    next: "Explore the role plays",
    examples: [
      {
        id: "past",
        title: "Past tense",
        detail: "Memories, mishaps and stories",
        prompt: "Tell me about a day that didn’t go to plan. What happened?",
        reply: "Last weekend I cooked for friends. I burned the dinner, but we laughed about it and ordered pizza.",
      },
      {
        id: "future",
        title: "Future tense",
        detail: "Plans, hopes and possibilities",
        prompt: "What’s something you’re looking forward to? Tell me what you’ll do.",
        reply: "I’m visiting my sister next month. We’ll cook together and talk for hours. I haven’t seen her in a year.",
      },
      {
        id: "conditionals",
        title: "Conditionals",
        detail: "A little room for “what if?”",
        prompt: "If you could change one thing about your working week, what would it be?",
        reply: "I’d work four days a week. I’d spend Fridays with my daughter. We’d go to the beach, even in the rain.",
      },
    ],
  },
  {
    id: "role-plays",
    label: "Role plays",
    heading: "Bring your world into the scene.",
    description: "Start with a familiar situation: a school meeting, a conversation with your landlord, a meal out. Add what’s really on your mind—how you feel, what happened and what you want to say. Your partner takes the other role.",
    note: "The scene is ready. The conversation is yours to shape.",
    next: "Explore the grammar topics",
    examples: [
      {
        id: "school",
        title: "A school meeting",
        detail: "Talk with your child’s teacher",
        prompt: "How has your daughter been feeling about school lately?",
        reply: "She loves reading, but she’s nervous about speaking in class. I was the same at her age, and I want to help.",
      },
      {
        id: "landlord",
        title: "Talk to your landlord",
        detail: "Explain a problem at home",
        prompt: "You mentioned there’s a problem in the flat. What’s happening?",
        reply: "The heating’s been broken for days. I’m frustrated because I work from home. Could we agree on a time to fix it?",
      },
      {
        id: "restaurant",
        title: "At a restaurant",
        detail: "Order, ask and discover",
        prompt: "Welcome! Have you decided what you’d like, or can I help you choose?",
        reply: "It’s my first evening here. I’d love to try something local. What’s a dish you grew up eating?",
      },
    ],
  },
];

export function LessonLibrary() {
  const [activeCollection, setActiveCollection] = useState(0);
  const [selectedExamples, setSelectedExamples] = useState([0, 0]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function selectCollection(index: number, focus = false) {
    setActiveCollection(index);
    if (focus) tabs.current[index]?.focus({ preventScroll: true });
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % collections.length;
    else if (event.key === "ArrowLeft") next = (index + collections.length - 1) % collections.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = collections.length - 1;
    else return;
    event.preventDefault();
    selectCollection(next, true);
  }

  return <section className="lesson-library section-rule page-shell" id="lesson-library" aria-labelledby="library-title">
    <div className="reading-column">
      <h2 id="library-title">A starting point.<br/>A conversation of your own.</h2>
      <p>Explore an extensive library of grammar topics and role plays, ready whenever you are. Bring your own experiences, opinions and feelings to every lesson.</p>
    </div>
    <div className="lesson-journey__tabs" role="tablist" aria-label="Explore the lesson library">
      {collections.map((collection, index) => <button
        key={collection.id}
        ref={element => { tabs.current[index] = element; }}
        type="button"
        role="tab"
        id={`library-tab-${collection.id}`}
        aria-controls={`library-panel-${collection.id}`}
        aria-selected={activeCollection === index}
        tabIndex={activeCollection === index ? 0 : -1}
        onClick={() => selectCollection(index)}
        onKeyDown={event => handleKey(event, index)}
      >{collection.label}</button>)}
    </div>
    {collections.map((collection, index) => {
      const example = collection.examples[selectedExamples[index]];
      return <div
        key={collection.id}
        className="lesson-journey__panel lesson-library__panel"
        role="tabpanel"
        id={`library-panel-${collection.id}`}
        aria-labelledby={`library-tab-${collection.id}`}
        hidden={activeCollection !== index}
      >
        <div className="lesson-journey__copy">
          <p className="screen-kicker">{collection.label}</p>
          <h3>{collection.heading}</h3>
          <p>{collection.description}</p>
          <p className="lesson-journey__note">{collection.note}</p>
          <button className="lesson-journey__next text-link" type="button" onClick={() => selectCollection((index + 1) % collections.length, true)}>{collection.next}<PracticeIcon name="arrow"/></button>
        </div>
        <figure className="lesson-journey__preview">
          <Phone title="Lesson library" className="phone--journey phone--library">
            <div className="phone__language">{collection.label} · English</div>
            <div className="journey-screen library-screen" tabIndex={0} role="region" aria-label={`${collection.label} preview`}>
              <p className="journey-screen__eyebrow">A few places to begin</p>
              <div className="library-topics" role="group" aria-label={`Sample ${collection.label.toLowerCase()}`}>
                {collection.examples.map((topic, topicIndex) => <button
                  key={topic.id}
                  type="button"
                  className="library-topic"
                  aria-pressed={selectedExamples[index] === topicIndex}
                  aria-controls={`library-exchange-${collection.id}`}
                  onClick={() => setSelectedExamples(current => current.map((selected, collectionIndex) => collectionIndex === index ? topicIndex : selected))}
                ><span><strong>{topic.title}</strong><small>{topic.detail}</small></span><PracticeIcon name={selectedExamples[index] === topicIndex ? "check" : "arrow"}/></button>)}
              </div>
              <div id={`library-exchange-${collection.id}`} className="library-exchange" aria-live="polite" aria-atomic="true">
                <div className="library-prompt">
                  <span className="message__speaker">Your partner gets you started</span>
                  <p>{example.prompt}</p>
                </div>
                <div className="library-reply">
                  <span className="message__speaker">You make it personal</span>
                  <p>{example.reply}</p>
                </div>
              </div>
            </div>
            <div className="journey-phone-footer"><PracticeIcon name="microphone"/>See where the conversation takes you.</div>
          </Phone>
          <figcaption>Illustrative lesson screens · Tap a topic to explore</figcaption>
        </figure>
      </div>;
    })}
  </section>;
}
