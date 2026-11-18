# Language Partner homepage design system

Updated 5 November 2026. Reference: https://linerunapp.com/.

## Direction

A centred, editorial page on warm paper. A narrow reading column and generous
vertical space carry the story. Phone illustrations demonstrate the app. Keep
cohort, classroom, calendar and teacher-package messaging out of this homepage.

## Type

- Display: locally bundled Playfair Display Regular. Hero 84–90px desktop,
  55px phone, 47px at 320px. Main headings 49px desktop and 35px phone.
- Italic: only the hero’s “Naturally.” and the closing invitation. App screen
  titles and other headings remain upright.
- Body: locally bundled IBM Plex Sans, 18px/1.7 desktop and 16px/1.75 mobile.
- Small labels use restrained letter spacing. Only short metadata is uppercase.
- Russian examples use readable sans serif. Grammar emphasis colours only the
  changed ending, with an accompanying English explanation.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Canvas | #F7F5F0 | Continuous warm background |
| Ink | #302F2A | Headings, primary buttons |
| Muted | #6C6962 | Body text, captions |
| Gold | #A58A24 | Decorative icons and rules |
| Gold text | #796114 | Links and small labels |
| Line | #D6D1C6 | Section and screen dividers |
| Paper | #FFFDF9 | Phone cards and fields |
| Pale | #EEE9DB | Supporting app surfaces |
| Grammar emphasis | #A8443D | Conjugated endings |

## Layout

- Main width 880px (900px on large screens), reading width 570–650px.
- Masthead between two hairline rules, centred name and short descriptor.
- Hero copy centred above the App Store badge and automated conversation slider.
  The standalone Weekend plans phone preview is omitted for now.
- Page order: hero and slider; “You know more than you can say”; Create / Save /
  Repeat; lesson library; feature details; founder story; free trial; FAQs; closing.
- Beneath the badge, four everyday exchanges use speech bubbles labelled “You”
  and “Your AI partner.” Each shows three seconds of speaking with a voice
  waveform, 0.9 seconds of thinking dots, then a relevant reply for 3.5 seconds.
  English leads in upright Playfair Display; smaller, muted translations use
  sans serif (Spanish, French, Mandarin and Russian, one per exchange).
  Both learner and AI rows reserve room for their longest content, avoiding jumps.
- Section padding 112px desktop, 69–80px phone/tablet.
- Dictionary and grammar previews share two columns on desktop, stack below 760px.
- Create / Save / Repeat replaces the short saved-topic section. Three tabs follow
  one illustrative interview lesson, with explanatory copy beside a shared phone
  frame. Mobile stacks the copy and phone. Screens include a specific lesson brief,
  recap with saved words and grammar, and a qualitative before/after answer. Accent
  work is a requested practice focus, not a claim of implemented pronunciation scoring.
- The lesson library follows Create / Save / Repeat and mirrors its desktop layout:
  phone left, editorial copy right. Grammar topics and Role plays tabs each offer
  three selectable sample lessons. Each pairs a prepared prompt with a personal
  learner response, making the freedom within a lesson visible. Mobile keeps copy
  above the phone. Use the existing cream, gold, upright serif and compact app text.
- No gradients, stock photography, invented testimonials, awards or decorative
  statistic cards. No sticky desktop navigation or obstructive mobile CTA.

## Behaviour and accessibility

- Main navigation is via named page anchors; the skip link goes to main content.
- The unused Weekend plans component retains its local translation and saved-word
  tray interactions for possible reuse, but is not rendered on the homepage.
- Questions use native HTML details/summary, available without JavaScript.
- Lesson journey tabs support Left/Right arrows, Home and End. Each step also offers
  a labelled next-step button. Mock screens are labelled illustrations; their
  microphone symbols are decorative and never request audio access.
- Library category tabs use the same keyboard controls. Topic buttons expose their
  selection with `aria-pressed` and update a politely announced example exchange.
  Each category remembers its selected topic during the current browser render.
  These are illustrative local examples, not live lessons or catalogue data.
- Completed replies stay on screen while hovered. Keyboard focus and the pause
  control freeze the sequence; manual selection shows the chosen full exchange.
  Playback stops offscreen and in background tabs. Reduced-motion preferences
  show the full exchange without autoplay or animation; manual selection still
  works. Automatic changes are not announced by screen readers. This is a labelled
  demonstration with no microphone access, recorded audio or AI requests.
- Focus states are visible. Reduced-motion users get no smooth scrolling or hover
  motion. Decorative app controls are noninteractive and hidden from accessibility.
- Download badges match the reference at 144×48px and repeat in the hero, trial
  section and closing invitation. They are intentionally disabled placeholders
  with no navigation or side effects, normal visual opacity and an accessible
  “coming soon” label.
