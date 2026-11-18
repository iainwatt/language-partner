import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DownloadButton } from "@/components/DownloadButton";
import { ConversationIdeas } from "@/components/ConversationIdeas";
import { LessonJourney } from "@/components/LessonJourney";
import { LessonLibrary } from "@/components/LessonLibrary";
import { DictionaryPreview, GrammarPreview } from "@/components/ProductPreview";
import { PracticeIcon } from "@/components/PracticeIcon";
import { QuestionList } from "@/components/QuestionList";
import { landingCopy } from "@/content/landing";

export default function Home() {
  return <div id="top">
    <Header/>
    <main id="main-content">
      <section className="hero page-shell" aria-labelledby="hero-title">
        <div className="hero__copy"><h1 id="hero-title">{landingCopy.hero.title}<em>{landingCopy.hero.emphasis}</em></h1><p>{landingCopy.hero.introduction}</p>
          <DownloadButton/>
          <a className="hero__trial" href="#get-started">Start with 15 free minutes</a>
        </div>
        <ConversationIdeas/>
      </section>

      <section className="story section-rule page-shell" aria-labelledby="story-title"><div className="reading-column">
        <h2 id="story-title">{landingCopy.story.title}</h2>
        {landingCopy.story.paragraphs.map(p=><p key={p}>{p}</p>)}
      </div></section>

      <LessonJourney/>
      <LessonLibrary/>

      <section className="features section-rule page-shell" aria-labelledby="features-title">
        <div className="reading-column"><h2 id="features-title">A conversation.<br/>With a little help along the way.</h2><p>Talk about the things that matter to you. Your plans, your opinions, the story you’ve been wanting to tell. Speak or type, and listen to your partner’s reply.</p><p>When you need a word or a reminder, it’s right there.</p></div>
        <div className="feature-pair">
          <article><h3>Find a word.<br/>Make it yours.</h3><p>Translate a phrase, save it to your Dictionary and keep it close while you talk. Come back later and see what you remember.</p><DictionaryPreview/></article>
          <article><h3>Know the rule.<br/>Get a feel for it.</h3><p>Choose a grammar topic you’ve learned. A short guide and a conversation prompt help you put it into practice, in your own words.</p><GrammarPreview/></article>
        </div>
      </section>

      <section className="founder section-rule page-shell" id="about" aria-labelledby="founder-title">
        <div className="reading-column">
          <h2 id="founder-title">{landingCopy.founder.title}</h2>
        </div>
        <div className="founder__layout">
          <div className="founder__portrait" role="img" aria-label="Placeholder for Iain’s portrait"/>
          <div className="founder__story">
            {landingCopy.founder.paragraphs.map(p=><p key={p}>{p}</p>)}
            <p className="founder__signature">Iain<span>Founder, Language Partner</span></p>
          </div>
        </div>
      </section>

      <section className="access section-rule page-shell" id="get-started" aria-labelledby="access-title"><div className="reading-column"><h2 id="access-title">Your first 15 minutes.<br/>On us.</h2><p>Start with a conversation. Find a few useful words.<br className="desktop-break"/> See how a little practice fits into your day.</p></div>
        <div className="access-options">
          <div><p className="screen-kicker">A little time to try</p><h3>15 minutes free</h3><p>A one-time conversation allowance to get to know Language Partner.</p><ul><li><PracticeIcon name="check"/>Conversation with an AI partner</li><li><PracticeIcon name="check"/>Translations and saved words</li><li><PracticeIcon name="check"/>Grammar practice and reminders</li></ul></div>
          <div><p className="screen-kicker">Room to keep going</p><h3>Keep practising</h3><p>Continue with a subscription after your free time. Keep building on your conversations and vocabulary.</p><p className="access-options__note">Plans, prices and monthly allowances will be announced before launch.</p></div>
        </div>
        <div className="access-action"><DownloadButton/></div>
      </section>

      <section className="questions section-rule page-shell" id="questions" aria-labelledby="questions-title"><div className="reading-column"><h2 id="questions-title">A few things<br/>you might be wondering.</h2><QuestionList/></div></section>
      <section className="closing page-shell" aria-labelledby="closing-title"><span className="closing__rule" aria-hidden="true"/><h2 id="closing-title">Make room for<br/><em>a little conversation.</em></h2><DownloadButton/></section>
    </main>
    <Footer/>
  </div>;
}
