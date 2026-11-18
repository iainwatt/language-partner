# Language Partner frontend

Next.js + TypeScript homepage for the standalone Language Partner app. The mobile
app lives in `../mobile`. The homepage is hosted on Cloudflare Pages at
[language-partner-homepage.pages.dev](https://language-partner-homepage.pages.dev/).

## Develop and check

```sh
npm install
npm run dev
npm run check
npm start # serve the production export from out/
```

## November 2026 direction

The page introduces natural conversation practice, saved vocabulary, grammar
practice and returning to saved topics. The previous IELTS cohort, calendar,
teacher package and $50 enrolment offer have been removed from the application.

The visual reference is [Line Run](https://linerunapp.com/): warm paper, a centred
masthead, fine rules, generous vertical spacing and serif headings. Copy and app
illustrations are specific to Language Partner. The standard App Store download
badge matches the reference. No Line Run product images, endorsements, prices,
privacy promises or brand assets are reused.

The homepage begins with the automated conversation slider, followed by “You know
more than you can say,” Create / Save / Repeat, the lesson library, feature details,
the founder story, free trial, FAQs and closing. The standalone Weekend plans phone
below the slider is omitted for now; its component is retained for possible reuse.
Dictionary and Russian past-tense phone illustrations remain in the feature section.
All previews run locally without AI calls, microphone access or account writes.

The Create / Save / Repeat section is a local, interactive illustration of an
interview lesson. Its tabs show the requested brief, a recap and a return to the
same question with saved vocabulary. Pronunciation is shown as a practice goal;
the preview does not analyse audio or claim an implemented accent score. All
conversation text and the before/after comparison are illustrative.

Immediately after that walkthrough, the lesson library shows how prepared grammar
topics and role plays can become personal, free-flowing conversations. Switch
between categories and select any of six illustrative topics to change the prompt
and learner reply. These are local examples, not a live catalogue or AI session.

## Access button and release status

The hero, trial section and closing invitation use the same App Store download
badge as the reference. At the owner's request these are intentionally inactive
native disabled buttons: no navigation, checkout, signup or click handler. They
retain the normal badge appearance and have an accessible “coming soon” label.
Neither `APP_ACCESS_URL` nor the old `COHORT_SIGNUP_URL` is read.

The FAQ explains that the iPhone app is in private testing. The one-time 15-minute
free trial is the planned launch offer; subscription prices and monthly allowances
remain unconfirmed. No invented store listing, purchase link or numerical paid
plan is shown.

The draft remains `noindex`. Confirm access, live billing, public terms/privacy
links and language availability before a public launch. The frontend never reads
the repository-root or mobile `.env`.

## Typography and assets

Playfair Display regular and italic are bundled locally, matching the app’s
display family. IBM Plex Sans supplies body text. Fonts and their licenses live in
`src/app/fonts`. App previews are HTML/CSS/SVG; no remote image or font requests are
required. The locally stored standard download badge is in
`public/images/app-store-badge.svg`, sourced from the reference's
`https://linerunapp.com/img/app-store-badge.svg`. Earlier portrait/community placeholder assets are archived locally in
`artifacts/previous-homepage` and are no longer served as public assets.

## Content

- `src/content/landing.ts`: main copy and questions.
- `src/app/page.tsx`: editorial page structure and feature copy.
- `src/components/ProductPreview.tsx`: interactive example and phone illustrations.
- `src/components/LessonJourney.tsx`: Create / Save / Repeat interview walkthrough.
- `src/components/LessonLibrary.tsx`: interactive grammar and role-play examples.
- `design-system.md`: current typography, colour, layout and interaction rules.
- `copy.md`: current editorial inventory.
- `landing-page-plan.md` and `design-brief.md`: earlier planning documents,
  superseded by this standalone-app direction where they differ.

## Cloudflare Pages deployment

Published 5 November 2026 as the `language-partner-homepage` Pages project. No custom domain is attached. The site retains `noindex, nofollow` and the inactive App Store badges while the app is in private testing.

`next.config.mjs` uses `output: "export"`. `npm run build` produces the complete static site in `out/`, including locally bundled fonts and images. There is no server runtime, API configuration or mobile/Firebase environment needed for this site. `npm start` serves that export locally.

To update the current direct-upload project:

1. Run `npm ci` if dependencies are not installed, then `npm run check`.
2. Open the Cloudflare dashboard → Workers & Pages → `language-partner-homepage` → Create deployment.
3. Upload the contents of `out/` (or a ZIP whose root contains `index.html`, `_next/` and the other exported assets), then deploy to production.
4. Verify the published page, interactive examples, fonts and images.

Upload only `out/`; never upload the repository, `.env` files or mobile app configuration. The first deployment used the dashboard's direct-upload workflow. Future uploads can also use Wrangler; this project does not currently auto-deploy from Git. Cloudflare requires a separate Git-integrated Pages project to switch to that workflow.

Cloudflare guidance: [static Next.js exports](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [direct uploads](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Blog

The blog is available only at `/blog/`, linked from the homepage footer. Its centred italic headings, fine rules and spacing follow the Line Run blog reference. Post titles live in `src/content/blog.ts`; the section is `src/components/BlogSection.tsx`.

The two planned posts are marked “Coming soon”. There are no article bodies, placeholder article routes, publication dates or reading times. Once a post is written, add its article page and update its list entry to link to the published text.
