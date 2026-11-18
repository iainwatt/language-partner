// Do not attach a Google identity to a different signed-in account, or to an
// account which changed while the native account chooser was open.
export function assertGoogleIdentity(expectedUid: string | null, currentUid: string | null, accountEmail: string | null, googleEmail: string) {
  if (expectedUid !== currentUid) throw new Error("Your account changed during sign-in. Please try again.");
  if (expectedUid && accountEmail?.trim().toLowerCase() !== googleEmail.trim().toLowerCase())
    throw new Error("Choose the Google account with the same email as your current Language Partner account.");
}
