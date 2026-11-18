> Historical planning document. The standalone-app homepage rebuilt on 4 November 2026 supersedes this proposal where it differs. See README.md, copy.md and design-system.md for the current implementation.

# Language Partner design brief

Status: three proposed directions for comparison. No direction has been selected and no reference screenshots have been supplied.

## Shared intent

Make the actual learning experience easy to inspect. Prioritise readable product screenshots, thoughtful typography and a clear route through the page. All options use the same copy placeholders and prepared demonstration scenario.

Existing mobile colours provide a useful starting reference: background `#F7F7F2`, paper `#FEFEFC`, ink `#292D2A`, green `#52776D`, pale green `#E8EDE7`, and line `#DEDFD8`. These are references, not a requirement to copy every native interface treatment onto the website.

## Three comparison directions

| Element | A — Conversation desk | B — Reading room | C — Language studio |
| --- | --- | --- | --- |
| Character | Quiet, practical and closely related to the app | Warm, literary and spacious | Crisp, energetic and strongly structured |
| Typography | IBM Plex Sans for headings/body; screenshot typography remains native | Source Serif 4 for upright headings; system sans-serif body | IBM Plex Sans Condensed headings; IBM Plex Sans body |
| Background / text | `#F7F7F2` / `#292D2A` | `#FFF8EF` / `#342E29` | `#FFFFFF` / `#122C2A` |
| Main accent | `#426459` | `#9C4E30` | `#174F48` |
| Supporting surface | `#E8EDE7` | `#EBDDCB` | `#E5F0EB` |
| Corners and borders | 6px buttons; 12px screenshot surfaces; clear fine borders | 2px buttons; rule lines; flat paper-like sections | 4px buttons; squared panels; occasional 2px structural rules |
| Hero | Left-aligned text alongside one large app view | Text-led left column with an enlarged phrase crop and app view | Broad type block paired with a strongly aligned product panel |
| Main walkthrough | Step list beside a generous visual area | Editorial sequence with large crops and margin labels | Four selectable states in one substantial demonstration panel |
| Small details | Functional captions only | Captions that clarify the excerpt or action | Clear step controls; no decorative badges |

Start comparisons with A because it carries forward the app's palette. It remains a proposal; B and C should be genuinely distinct alternatives with the same content, not changes to a single accent colour.

Typeface references: [IBM Plex family](https://github.com/IBM/plex) and [Adobe Source Serif](https://github.com/adobe-fonts/source-serif). Check the chosen webfont files, needed character sets and licence files during implementation. Prefer a small self-hosted font selection with a usable fallback.

## Layout rules to compare

- Desktop maximum content width around 1180px, with generous outer margins.
- Desktop hero heading approximately 56–68px; mobile approximately 34–42px. Adjust against actual line wrapping rather than a fixed screenshot.
- Body approximately 17–18px with comfortable line spacing; avoid tiny grey supporting text.
- Desktop section gaps approximately 80–104px; mobile approximately 48–64px.
- Single-column mobile narrative; no sideways scrolling to discover the main product flow.
- Preserve screenshot aspect ratios. Enlarge relevant details instead of shrinking an entire screen until it is illegible.
- Buttons should be comfortable to tap, with a target height around 48px. Check contrast and visible keyboard focus in every state.
- Reserve motion for short state changes. No autoplay audio, perpetual floating phones, unnecessary parallax or scroll-controlled reading.

## Details that require a reason

Avoid a default purple/blue gradient, compulsory italic headline accents, a row of invented statistics, three interchangeable feature cards, pill labels above every heading, faint borders everywhere and unexplained reassurance beneath buttons. Use supporting text only when it helps the visitor understand that section or action.

Do not use generic language-themed stock art as the main evidence. The dominant visual should demonstrate Language Partner itself.

## Selection process and deliverables

1. Collect up to ten references, or proceed with these proposals if references are not supplied.
2. Identify specific preferences for fonts, colour, surfaces, layout and captions; do not assume every part of a reference is liked.
3. Render the same hero, walkthrough state and access section in all three directions, at desktop and mobile sizes.
4. Pick one direction and refine specific characteristics with a small set of variants.
5. Save a visual design sheet and the chosen rules in `design-system.md`, including type, colour, spacing, borders, radii, breakpoints and interaction states.

Copy approval is separate from visual selection. Placeholder wording is permitted in the local design exercise and must be replaced or removed before a public launch.
