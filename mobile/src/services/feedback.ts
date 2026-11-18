import { httpsCallable } from "firebase/functions";
import { firebase } from "./firebase";
import { feedbackRequestSchema, type FeedbackRequest } from "../core/feedback";

export async function submitFeedback(input: FeedbackRequest) {
  if (!firebase?.auth.currentUser) throw new Error("Sign in to send feedback.");
  const uid = firebase.auth.currentUser.uid;
  const result = await httpsCallable<FeedbackRequest, { saved: true; translationStatus: "pending" | "complete" }>(firebase.functions, "submitFeedback", { timeout: 70000 })(feedbackRequestSchema.parse(input));
  if (firebase.auth.currentUser?.uid !== uid) throw new Error("The account changed. Check which account you’re signed into.");
  return result.data;
}
