> Historical planning document. The standalone-app homepage rebuilt on 4 November 2026 supersedes this proposal where it differs. See README.md, copy.md and design-system.md for the current implementation.

# Language Partner landing-page plan

Status: planning only. Copy is placeholder text; visual directions and launch assumptions are proposals. No website, form service or deployment has been created.

## 1. Purpose and working assumptions

The page should help a visitor understand the actual learning workflow: have a conversation, translate and save a useful phrase, review it, and revisit its topic. The product demonstration should carry much of the explanation while the founder's positioning and story are still placeholders.

Provisional audience: self-directed adult learners who want more opportunities to practise a language and remember useful expressions from their conversations. This is a hypothesis for the first layout, not established customer research. Use an English-language page with Russian/English examples initially because that is the best-documented app experience. Do not infer that Russian is the product's only supported language.

Provisional conversion: request early access. The repository describes a private testing setup, and no public store listing, price or public onboarding route has been supplied. Use one primary action with the same purpose throughout the page. If the launch route becomes a store listing or direct trial, update its wording, destination, availability details and tracking together.

Success criteria for the design: a visitor can identify the product, follow the learning workflow and understand the next step. Measure completed access requests once a real collection service exists; do not invent a conversion-rate target.

## 2. Product facts and boundaries

| Grounded in the current app | Consequence for the page |
| --- | --- |
| Typed conversations and turn-based speech input/output | Show a real conversation screen; a voice demonstration must reflect dictation, sending and reply playback. |
| Translate text, select a phrase, save its meaning and optional translated example | Make phrase selection and contextual saving a central part of the tour. |
| Personal dictionary and scheduled recall practice | Show the exact phrase moving from a conversation into review. |
| Saved topics with summaries and linked vocabulary; practise a topic again | End the tour by returning to the same topic with its saved words. |
| Dictionary and saved-topic metadata are stored in the account's cloud data | Explain account and connection requirements in practical details. |
| Full original transcripts and settings remain on their originating device | Do not promise that complete chat history follows users across devices. |
| The app lists eight language choices; the documented live checks focus on Russian/English | Review the public language list before using it as a launch promise. |
| Native iPhone build exists; Android acceptance checks remain incomplete | Do not imply an Android or App Store launch from the presence of source code. |

Do not add fluency deadlines, guaranteed outcomes, customer counts, ratings, testimonials, real-time calling, pronunciation scoring, offline cloud access, or consumer AI-subscription integration. Price, launch date and commercial access terms remain unspecified. Treat live provider availability as a product-release decision; the page does not need a provider-logo strip.

Sources: [mobile product documentation](../mobile/README.md), [verification and limits](../mobile/docs/verification.md), [implemented language choices](../mobile/src/core/domain.ts), and [existing visual tokens](../mobile/src/ui/components.tsx).

## 3. Copy ownership

Use [copy.md](copy.md) as the content inventory. All persuasive or personal copy is Lorem ipsum: headline, pitch, audience/problem description, benefit statements, founder story, access explanation and FAQ wording. Field IDs and writing prompts are editorial notes and must not render on the page.

The product name, existing app interface labels and ordinary controls such as Email, Next, Previous, Play and Close can remain real text. Proposed navigation labels and the functional Request access button are provisional interface text, not approved marketing claims. Pricing and availability must never be inferred from placeholder copy.

After the founder replaces the placeholders, review each proposed edit with its original line, issue and replacement. Check confusing or repeated material, unsupported abstractions, unnecessary contrasts, repetitive three-part slogans, empty introductions and inflated vocabulary. Approved wording then becomes the implementation source; flag any necessary additions instead of silently writing them.

Keep preview pages out of search indexing. Public launch requires replacement or removal of every placeholder, including metadata and image captions. Do not create placeholder testimonials that could be mistaken for evidence.

## 4. Page sequence and section specifications

### A. Header

A compact Language Partner wordmark on the left, up to three anchor links and one primary action. Proposed anchors: How it works, About and Questions. The action goes to `#access`. Use the existing mark if it works at this size; a new logo is not required for V1.

On small screens, keep the product name and primary action visible. If navigation needs a menu, it must support keyboard focus, Escape and returning focus to its trigger. Avoid a second sticky CTA initially.

### B. Hero

Job: establish what the product is and show evidence of the experience immediately.

Desktop: an asymmetric two-column composition, approximately 45% text and 55% demonstration. Use the placeholder headline and introduction, one filled primary action, and a quiet text link to the tour. Reserve one factual availability line for confirmed information; omit it until known.

Visual: one upright app screenshot showing a readable conversation with a selected phrase. Include a magnified crop only where it makes the interaction clearer. Avoid multiple tiny floating screens, invented notifications and decorative statistics.

Mobile: headline, short introduction, primary action, then the screenshot. Preserve readable text and a reachable CTA rather than trying to squeeze the entire screenshot into the first screen. Target 6–12 headline words and 25–45 introduction words when real copy arrives.

### C. Who this is for

Job: let visitors recognise their learning situation.

Use a brief editorial section with one small heading and two short passages: the present difficulty and the desired practice experience. All copy is placeholder text. Do not assume language level, a daily commitment or a measured outcome. Keep this section compact so visitors reach the demonstration quickly.

### D. Product walkthrough — the main section

Use one coherent, deliberately prepared example across four states:

1. Start a conversation about an everyday topic.
2. Select a useful phrase, inspect its translation/example and save it.
3. Find that same phrase in the dictionary and reveal its recall answer.
4. Revisit the saved topic using its recap and linked vocabulary.

Each state has a short placeholder explanation and a genuine screenshot or a faithful crop of the actual interface. The phrase, meaning and topic must match throughout. Use a dedicated demonstration account or synthetic demonstration content rather than the owner's private conversations.

Desktop: a large visual area paired with four selectable step labels. A click changes the visual and associated explanation. No automatic cycling, scroll trapping or dependence on hover. Each step remains understandable without animation.

Mobile: stack the same four steps vertically with readable crops. Avoid a miniature desktop phone and tiny side tabs. Navigation and meaningful text must remain available if client-side JavaScript fails.

Optional enhancement after the static tour works: a short user-initiated screen recording with captions and a poster frame. No autoplay sound. Do not add a live paid LLM demo to the public page for V1.

### E. Practical questions

Job: answer the questions needed to decide whether to try the app. Use accessible disclosure rows; do not invent customer research or describe these as frequently asked unless they actually are.

Editorial topics: available devices and access route; supported language pairs; what voice mode does; account/connection requirements; what follows the user across devices; price/access terms; what happens after requesting access. The public-facing questions and answers remain Lorem ipsum until supplied. Implemented facts in section 2 should guide those eventual answers.

Use ordinary text for details that need constant visibility, such as important access limitations. Do not bury essential offer terms inside collapsed rows.

### F. Founder section

Job: give the founder space to explain why Language Partner exists.

Use a small genuine portrait if supplied, a name/byline slot and a 60–100 word story. Placeholder text occupies these fields for now. No invented experience, credentials, signatures or personal anecdotes. Keep the founder section in proportion to the product demonstration.

### G. Customer proof — conditional

Omit from V1 until real, usable testimonials or documented results are supplied. Product screenshots provide evidence of functionality in the meantime. If genuine proof becomes available, show the quote, attribution and relevant context without fabricated stars or aggregate statistics.

### H. Access section

Job: provide a clear next action with an honest explanation of what follows.

Reserve a placeholder heading, short explanation and access-terms line. Proposed form: email, with language interest optional only if there is a concrete use for collecting it. Keep the form compact. Do not promise immediate access, a free trial or a response date without confirmed terms.

For the local placeholder prototype, show an explicit preview state and do not collect or transmit addresses. Before public launch, choose the real destination and implement validation, submitting, confirmed success, duplicate submission and recoverable failure states. Report success only after the receiving service confirms it. Provide a relevant published privacy notice before collecting addresses.

If the eventual destination is an app listing, replace the form with the verified store link and adapt the explanation. A store badge must correspond to a real public listing.

### I. Footer

Language Partner identity, working contact route and applicable policy links. Add copyright ownership/year only with correct details. Do not fill space with invented company addresses, unused social networks or empty legal pages.

## 5. Visual development process

Start with [design-brief.md](design-brief.md), which proposes three directions without treating any as approved. Collect up to ten reference screenshots in a short, bounded session; identify the specific characteristics to keep or avoid. If no references are supplied, the three directions are sufficient to start the comparison.

Produce a hero, one walkthrough state and an access section for each direction. Use exactly the same placeholder content, images and section order across all three. Show desktop and mobile samples. Choose the strongest direction, then produce small refinements to it rather than combining all three styles.

Save the chosen visual sheet and explicit typography, colour, spacing, radius, layout, motion and supporting-detail rules in `design-system.md`. This file is created after selection; the present brief is not a final system.

## 6. Assets and interactions

Asset checklist: usable wordmark/icon; matched conversation/selection/dictionary/recall/topic screenshots; optional portrait; optional captioned screen recording; and a social-share image once real headline copy exists. Prefer product assets over generic language-learning stock photos, flags, AI illustrations or decorative globes.

Crop screenshots around the behaviour they demonstrate. Keep visible app text genuine and readable; provide semantic text descriptions alongside visual content. Do not replace app-interface text with marketing Lorem ipsum or imply a redesigned screen already exists in the mobile product.

Use quiet hover/focus transitions. Respect reduced-motion preferences. Any walkthrough animation must be decorative rather than the only way to understand the product. Buttons, navigation, disclosures and form controls must work with keyboard and touch. Plan visible focus, labelled fields, logical heading order, useful error messages and sufficient text contrast.

Check layouts at roughly 360, 390, 768, 1280 and 1440 pixels, plus long text and zoom. Narrow-screen changes should preserve the intended desktop composition.

## 7. Frontend implementation proposal

Use a separate Astro + TypeScript site in `frontend`, with authored CSS and explicit design tokens. This is a content-led page with a small amount of interaction; Astro's default output pre-renders pages into static HTML. Add a small client-side controller for the tour and form only when needed. See [Astro rendering documentation](https://docs.astro.build/en/guides/on-demand-rendering/).

Keep the mobile app, its package tree and its deployment independent. Do not introduce a shared dependency or authentication layer solely for this page. The frontend must not automatically load or publish the repository-root `.env`; provide only the specific frontend settings required by its chosen signup service.

Proposed files after implementation:

```text
frontend/
  landing-page-plan.md
  copy.md
  design-brief.md
  design-system.md             # Final system after visual selection
  package.json
  astro.config.mjs
  src/
    pages/index.astro
    layouts/SiteLayout.astro
    components/
      Header.astro
      Hero.astro
      ProductTour.astro
      Questions.astro
      Founder.astro
      AccessForm.astro
      Footer.astro
    content/landing.ts         # Structured copy, IDs and placeholder flags
    styles/tokens.css
    styles/global.css
    assets/
  public/
```

Keep all page text in the content source with stable field IDs from `copy.md`. Include `isPlaceholder` markers. The build should allow a clearly marked preview and prevent accidental production output while required placeholder fields or a real CTA destination remain missing.

Use optimized responsive images with declared dimensions; load below-fold media on demand; keep video out of the initial download. Plan semantic metadata, social previews, canonical URL, sitemap, crawl settings and favicon when the public domain and real copy are known. Do not add rating/review structured data without the underlying evidence.

Vercel is a proposed host following the article, not an already connected service. If selected, use this existing repository and set the Vercel project's Root Directory to `frontend`. See [Vercel monorepo deployment documentation](https://vercel.com/docs/monorepos). No hosting project or domain change is part of this planning task.

## 8. Work sequence and review outputs

| Stage | Work | Concrete review output |
| --- | --- | --- |
| 1. Content map | Use the placeholder inventory, provisional audience/access goal and product facts. | Complete low-fidelity desktop/mobile page; no copy-writing dependency. |
| 2. Visual options | Compare three directions using the same content and assets. | Three hero/tour/access samples with their design tokens. |
| 3. Refined system | Refine the selected direction and settle responsive behaviour. | Visual sheet and `design-system.md`. |
| 4. Functional local V1 | Build the page, navigation, tour, disclosures and preview-only access state. | Locally reviewable page on desktop and phone-sized layouts. |
| 5. Product visuals | Capture a consistent prepared scenario and optional recording. | Readable, accurate screenshots integrated into the tour. |
| 6. Real copy and offer | Replace Lorem ipsum; edit with the article's five checks; set access terms and destination. | Final content source and working signup/store route. |
| 7. Quality review | Check copy parity, UI behaviour, responsive layouts, keyboard access, contrast, assets and loading. | Reviewed preview with documented remaining issues, if any. |
| 8. Publication | Configure selected hosting/domain, deploy the reviewed version and verify it signed out. | Public HTTPS page with verified actions and no placeholders. |

Stages 1–5 can proceed with Lorem ipsum. Later content should trigger a layout pass because real wording will wrap differently. Revisit the page with fresh eyes after the first review; make bounded changes and check affected interactions again.

## 9. Completion checks and remaining inputs

The finished page must explain a real product workflow, preserve approved copy, contain no invented evidence, avoid duplicate competing primary actions, work on small screens and keyboard, and handle submission failures truthfully. Confirm successful builds, no broken links/assets, no accidental environment exposure, appropriate public indexing, and an actual successful CTA path. Check the live deployment while signed out and test HTTPS at the custom domain. Preserve existing email DNS records during any later domain work.

If analytics are added, measure CTA location and confirmed signup completion rather than treating every button click as a conversion. Do not put email addresses or typed form content in event payloads. Decide the analytics service and privacy behaviour before enabling collection.

Inputs needed before launch, without blocking the placeholder design: founder-authored copy; audience/positioning choice; available platforms/languages; access route and terms; price if applicable; screenshot scenario/assets; genuine founder details; contact and privacy information; selected design direction; domain and hosting destination. Customer proof is optional and stays omitted when unavailable.
