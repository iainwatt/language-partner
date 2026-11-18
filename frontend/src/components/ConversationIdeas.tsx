"use client";

import { useEffect, useRef, useState } from "react";
import { PracticeIcon } from "./PracticeIcon";

const ideas = [
  {
    english: "I want to talk about a problem I’m having with a colleague at work.",
    translation: "Quiero hablar de un problema que estoy teniendo con un compañero de trabajo.",
    language: "Spanish",
    lang: "es",
    reply: "Go on. What happened at work?",
    replyTranslation: "Cuéntame. ¿Qué pasó en el trabajo?",
  },
  {
    english: "I need help practising for an interview.",
    translation: "J’ai besoin d’aide pour préparer un entretien d’embauche.",
    language: "French",
    lang: "fr",
    reply: "Of course. What kind of role are you interviewing for?",
    replyTranslation: "Bien sûr. Pour quel poste passes-tu un entretien ?",
  },
  {
    english: "I need to talk to a teacher at my daughter’s school.",
    translation: "我需要和女儿学校的一位老师谈谈。",
    language: "Mandarin",
    lang: "zh-Hans",
    reply: "Let’s practise. What would you like to discuss with the teacher?",
    replyTranslation: "我们来练习一下。你想和老师谈些什么？",
  },
  {
    english: "I have to give a presentation on leadership and need to perfect it.",
    translation: "Мне нужно выступить с презентацией о лидерстве, и я хочу довести её до совершенства.",
    language: "Russian",
    lang: "ru",
    reply: "Let’s hear your opening. What’s the main idea you want people to remember?",
    replyTranslation: "Давай послушаем твоё вступление. Какую главную мысль должны запомнить слушатели?",
  },
];

type Phase = "speaking" | "thinking" | "reply";
const phaseDuration: Record<Phase, number> = { speaking: 3000, thinking: 900, reply: 3500 };
const waveHeights = [7, 13, 20, 11, 23, 16, 8];

export function ConversationIdeas() {
  const [{ activeIndex, phase }, setScene] = useState<{ activeIndex: number; phase: Phase }>({ activeIndex: 0, phase: "speaking" });
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const displayedPhase = reducedMotion ? "reply" : phase;
  const playing = !paused && !reducedMotion && visible && pageVisible && !(hovered && phase === "reply");

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(preference.matches);
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25),
      { threshold: 0.25 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setScene(current => current.phase === "reply"
        ? { activeIndex: (current.activeIndex + 1) % ideas.length, phase: "speaking" }
        : { ...current, phase: current.phase === "speaking" ? "thinking" : "reply" });
    }, phaseDuration[phase]);
    return () => window.clearTimeout(timer);
  }, [activeIndex, phase, playing]);

  return (
    <div
      ref={sectionRef}
      id="conversation-ideas"
      className="conversation-ideas"
      data-phase={displayedPhase}
      data-playing={playing}
      role="region"
      aria-label="Example conversations with your AI partner"
      aria-roledescription="carousel"
      onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={event => {
        if (event.target.matches(":focus-visible")) setPaused(true);
      }}
    >
      <div className="conversation-ideas__slides" aria-live={paused || reducedMotion ? "polite" : "off"} aria-atomic="true">
        {ideas.map((idea, index) => (
          <div
            key={idea.lang}
            className={`conversation-ideas__slide${index === activeIndex ? " is-active" : ""}`}
            aria-hidden={index !== activeIndex}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${ideas.length}`}
          >
            <div className="conversation-ideas__learner">
              <div className="conversation-ideas__speaker">
                <span><PracticeIcon name="microphone"/>You</span>
                <span className="conversation-ideas__voice">
                  <span>{displayedPhase === "speaking" ? "Speaking" : "Voice message"}</span>
                  <span className="conversation-ideas__wave" aria-hidden="true">
                    {waveHeights.map((height, bar) => <span key={bar} style={{ height, animationDelay: `${bar * -0.13}s` }}/>) }
                  </span>
                </span>
              </div>
              <p className="conversation-ideas__english" lang="en">{idea.english}</p>
              <p className="conversation-ideas__translation" lang={idea.lang}>{idea.translation}</p>
            </div>
            <div className="conversation-ideas__partner">
              <div className="conversation-ideas__speaker">
                <span><span className="conversation-ideas__avatar" aria-hidden="true">LP</span>Your AI partner</span>
              </div>
              <div className="conversation-ideas__reply-body">
                <div className="conversation-ideas__answer" aria-hidden={displayedPhase !== "reply"}>
                  <p lang="en">{idea.reply}</p>
                  <p className="conversation-ideas__reply-translation" lang={idea.lang}>{idea.replyTranslation}</p>
                </div>
                <div className="conversation-ideas__status" aria-hidden={displayedPhase === "reply"}>
                  {displayedPhase === "thinking" && <span className="conversation-ideas__thinking" aria-hidden="true"><span/><span/><span/></span>}
                  <span>{displayedPhase === "thinking" ? "Thinking…" : "Listening…"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="conversation-ideas__controls" aria-label="Choose a conversation example">
        {ideas.map((idea, index) => (
          <button
            key={idea.lang}
            type="button"
            className="conversation-ideas__dot"
            aria-label={`Show example ${index + 1}: ${idea.language}`}
            aria-pressed={index === activeIndex}
            onClick={() => { setScene({ activeIndex: index, phase: "reply" }); setPaused(true); }}
          >
            <span aria-hidden="true"/>
          </button>
        ))}
        {!reducedMotion && (
          <button
            type="button"
            className="conversation-ideas__toggle"
            aria-label={paused ? "Play conversation examples" : "Pause conversation examples"}
            onClick={() => setPaused(value => !value)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              {paused ? <path d="m7 4 9 6-9 6Z"/> : <><rect x="5" y="4" width="3" height="12" rx=".7"/><rect x="12" y="4" width="3" height="12" rx=".7"/></>}
            </svg>
          </button>
        )}
      </div>
      <p className="conversation-ideas__caption">Example conversations. Talk about whatever’s on your mind.</p>
    </div>
  );
}
