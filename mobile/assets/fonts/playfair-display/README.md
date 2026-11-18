# Display typography trial

Playfair Display Regular and Italic (400), plus Medium (500), are a free visual alternative for the
initial Schotis-style experiment. They are not Schotis. The files are unmodified
static fonts from Expo's Google Fonts distribution:

- https://github.com/expo/google-fonts/tree/main/font-packages/playfair-display/400Regular
- https://github.com/expo/google-fonts/tree/main/font-packages/playfair-display/400Regular_Italic
- https://github.com/expo/google-fonts/tree/main/font-packages/playfair-display/500Medium

Downloaded 3 November 2026. All faces include the Russian alphabet. The SIL Open
Font License is retained in OFL.txt and bundled for offline viewing in the app's
Account → Font licence sheet (src/ui/fontLicense.ts).

DisplayText.tsx centralises the three faces and falls back to the existing system
serif if loading fails. Following the user's upright “Point Break” reference,
the opened conversation title uses upright Medium at 36/44 pt. It stays centred
on its own row, can wrap to two lines, and can shrink to 75% on native devices
for longer titles. Other main/introductory headings use Regular. Italic is
available for occasional emphasis, not the default heading style; existing
short practice examples retain their italic emphasis. Recent conversation
rows use the standard sans-serif app font, including the selected row; the
opened conversation's title uses the display serif. Body text, controls,
grammar reminders, sizes and spacing retain their existing styles. The
experiment can be changed by replacing the font assets and updating that
component and licence together.

Visual comparison: rendered Playfair Display, Instrument Serif and Cormorant
Garamond side by side against the supplied Line Run screenshots. Retained
Playfair Display: its broader proportions and italic swashes (especially the
curled w) provide the closest visual match of these three. Instrument Serif
is noticeably narrower; Cormorant Garamond has different italic forms. The
comparison is saved at artifacts/typography/font-comparison.png. Russian can
use a separate family in a later typography pass; no script split is needed
for this trial because the bundled Playfair faces already include Cyrillic.
