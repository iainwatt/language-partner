"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PracticeIcon } from "./PracticeIcon";

const words = [
  ["провести время", "to spend time"],
  ["на свежем воздухе", "in the fresh air"],
  ["прогуляться", "to go for a walk"],
  ["не торопиться", "to take your time"],
  ["отдохнуть", "to have a rest"],
];

export function Phone({title, children, className = ""}: {title:string;children:ReactNode;className?:string}) {
  return <div className={`phone ${className}`}>
    <div className="phone__screen">
      <div className="phone__status" aria-hidden="true"><span>9:41</span><span className="phone__island"/><span className="phone__indicators"><svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor"><rect x="0" y="8" width="2" height="4" rx=".5"/><rect x="4" y="5" width="2" height="7" rx=".5"/><rect x="8" y="2" width="2" height="10" rx=".5"/></svg><span className="phone__battery"/></span></div>
      <div className="phone__toolbar" aria-hidden="true"><PracticeIcon name="menu"/><span>Language Partner</span><PracticeIcon name="settings"/></div>
      <div className="phone__heading">{title}</div>
      {children}
      <div className="phone__home" aria-hidden="true"/>
    </div>
  </div>;
}

export function ConversationPreview() {
  const [tray, setTray] = useState<"translation" | "words" | null>(null);
  const [saved, setSaved] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (tray) closeButton.current?.focus({preventScroll:true}); }, [tray]);
  function close() { setTray(null); trigger.current?.focus({preventScroll:true}); }
  function open(next: "translation" | "words", button: HTMLButtonElement) { trigger.current = button; setTray(next); }
  return <figure className="product-preview" id="practice">
    <Phone title="Weekend plans" className="phone--conversation">
      <div className="phone__language">Russian · English</div>
      <div className="conversation-content">
        <div className="message message--partner"><span className="message__speaker">Your partner</span><p lang="ru">Что ты хочешь делать в выходные?</p><p className="message__translation">What would you like to do at the weekend?</p></div>
        <div className="message message--you"><span className="message__speaker">You</span><p lang="ru">Я хочу провести больше времени на улице.</p></div>
        <div className="message message--partner"><span className="message__speaker">Your partner</span><p lang="ru">Отличная идея. Можно погулять в парке или <button className="phrase-highlight" aria-label="Look up выбраться за город" aria-expanded={tray === "translation"} aria-controls="preview-tray" onClick={e=>open("translation",e.currentTarget)}>выбраться за город</button>.</p><p className="message__translation">Great idea. You could walk in the park or get out of the city.</p></div>
      </div>
      <div className="composer"><span className="composer__placeholder">Message your partner…</span><div className="composer__tools"><button onClick={e=>open("translation",e.currentTarget)} aria-expanded={tray === "translation"} aria-controls="preview-tray"><PracticeIcon name="translate"/>Translate</button><button aria-label="Open saved words" aria-expanded={tray === "words"} aria-controls="preview-tray" onClick={e=>open("words",e.currentTarget)}><PracticeIcon name="book"/></button><span className="composer__mic" aria-hidden="true"><PracticeIcon name="microphone"/></span><span className="composer__send" aria-hidden="true">↑</span></div></div>
      {tray && <div className="phone__shade" onClick={close} aria-hidden="true"/>}
      {tray && <section id="preview-tray" className="preview-tray" aria-label={tray === "words" ? "Saved words preview" : "Translation preview"} onKeyDown={e=>{if(e.key === "Escape") {e.preventDefault();close();}}}>
        <div className="preview-tray__handle" aria-hidden="true"/>
        <header><h3>{tray === "words" ? "Your saved words" : "Translate"}</h3><button ref={closeButton} aria-label="Close preview tray" onClick={close}><PracticeIcon name="close"/></button></header>
        {tray === "translation" ? <>
          <p className="translation-direction">Russian <span aria-hidden="true">→</span> English</p>
          <div className="translated-phrase"><p lang="ru">выбраться за город</p><p>to get out of the city</p></div>
          <p className="translation-context">A useful phrase for your next weekend away.</p>
          <button className="save-word" onClick={()=>setSaved(!saved)}><PracticeIcon name={saved ? "check" : "bookmark"}/>{saved ? "Saved · tap to undo" : "Save to Dictionary"}</button>
          <p className="preview-only" role="status">{saved ? "Added to this preview’s saved words." : "Try saving this phrase."}</p>
        </> : <>
          <p className="word-tray-context">Weekend plans · {words.length + Number(saved)} phrases</p>
          <dl className="crib-sheet">{[...words,...(saved ? [["выбраться за город","to get out of the city"]] : [])].map(([word,meaning])=><div key={word}><dt lang="ru">{word}</dt><dd>{meaning}</dd></div>)}</dl>
          <p className="preview-only">Keep your words beside the conversation.</p>
        </>}
      </section>}
    </Phone>
    <figcaption>Example conversation · Russian with English translations<span>Tap the highlighted phrase, Translate or the book to explore.</span></figcaption>
  </figure>;
}

export function DictionaryPreview() {
  return <figure className="feature-preview"><Phone title="Dictionary" className="phone--detail">
    <div className="dictionary-content"><p className="screen-intro">A few words worth keeping.</p><div className="dictionary-search" aria-hidden="true"><span>⌕</span> Find a word or meaning…</div>
      <div className="dictionary-words">{[["выбраться за город","to get out of the city"],...words.slice(0,4)].map(([word,meaning])=><div className="dictionary-word" key={word}><div><p lang="ru">{word}</p><span>{meaning}</span><small>Weekend plans <span aria-hidden="true">↗</span></small></div><PracticeIcon name="sound"/></div>)}</div>
    </div>
  </Phone><figcaption>Useful words, with their meaning and a way back to the conversation.</figcaption></figure>;
}

export function GrammarPreview() {
  return <figure className="feature-preview"><Phone title="Past tense" className="phone--detail">
    <div className="grammar-content"><p className="screen-intro">A little reminder. Then it’s your turn.</p>
      <section className="grammar-guide" aria-label="Russian past tense reminder"><span className="screen-kicker">Your quick reminder</span><h4>Match the ending to the person.</h4><dl><div><dt>He</dt><dd lang="ru">он работа<span>л</span></dd></div><div><dt>She</dt><dd lang="ru">она работа<span>ла</span></dd></div><div><dt>We / they</dt><dd lang="ru">мы / они работа<span>ли</span></dd></div></dl><p>Past tense changes for gender and number.</p></section>
      <div className="grammar-prompt"><span className="message__speaker">Your partner</span><p lang="ru">Расскажи, как прошли твои выходные. Что ты делал? А твои друзья?</p><p className="message__translation">Tell me about your weekend. What did you do? And your friends?</p></div>
      <div className="grammar-verbs"><span className="screen-kicker">A few verbs to help</span><p><span lang="ru">гулять</span> <span>to go for a walk</span></p><p><span lang="ru">готовить</span> <span>to cook</span></p><p><span lang="ru">встречаться</span> <span>to meet up</span></p></div>
    </div>
    <div className="grammar-composer" aria-hidden="true">Tell your story…<PracticeIcon name="microphone"/></div>
  </Phone><figcaption>Grammar you’ve learned, in a conversation that helps you use it.</figcaption></figure>;
}
