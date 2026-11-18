import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";
import { ArrowUp, BookOpen, BookmarkPlus, Check, ChevronLeft, Languages, Mic, RotateCcw, Square, X, type LucideIcon } from "lucide-react-native";
import { c, fonts } from "./components";
import { DisplayText } from "./DisplayText";
import { tutorialExample, type TutorialExample } from "./tutorialExamples";

const titles = ["Make time\nto talk.", "Say it\nout loud.", "Keep the words\nyou need.", "Pick up where\nyou left off.", "Give grammar\na little practice.", "Help make this\nbetter."];

/** A self-contained walkthrough. Every interaction is a local demonstration. */
export function Tutorial({ targetLanguage, onExit, onFinish }: {
  targetLanguage: string;
  onExit: () => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const { width } = useWindowDimensions();
  const example = tutorialExample(targetLanguage);
  const narrow = width < 360;
  return <View style={styles.screen}>
    <View style={styles.navigation}>
      {step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Previous tutorial step" onPress={() => setStep(step - 1)} style={pressStyle(styles.navigationButton)}>
        <ChevronLeft color={c.accent} size={20} strokeWidth={1.8} />
        <Text style={styles.navigationText}>Back</Text>
      </Pressable> : <View />}
      <Pressable accessibilityRole="button" accessibilityLabel="Skip tutorial and return to settings" onPress={onExit} style={pressStyle(styles.navigationButton)}>
        <Text style={styles.navigationText}>Skip</Text>
      </Pressable>
    </View>
    <ScrollView key={step} style={styles.scroll} contentContainerStyle={[styles.content, narrow && styles.narrowContent]}>
      <Text accessibilityLiveRegion="polite" style={styles.eyebrow}>A quick tour · {step + 1} of {titles.length}</Text>
      <DisplayText accessibilityRole="header" italic={step === 0} style={[styles.title, step === 0 && styles.openingTitle, narrow && styles.narrowTitle]}>{titles[step]}</DisplayText>
      {step === 0 && <ConversationDemo example={example} />}
      {step === 1 && <VoiceDemo example={example} />}
      {step === 2 && <WordsDemo example={example} />}
      {step === 3 && <SavedDemo example={example} />}
      {step === 4 && <GrammarDemo />}
      {step === 5 && <View style={styles.section}>
        <Copy>You’re helping test Language Partner. Please give lots of feedback: what you enjoyed, what confused you, what broke, and what you wish it could do.</Copy>
        <View style={styles.ruledExample}>
          <Caption>Look for Feedback at the top of the app</Caption>
          <Copy>Speak in your native language or type. Check your transcript, then submit it. Even a quick observation is useful.</Copy>
        </View>
        <Copy>We save only the text you submit, never an audio recording. Your feedback is translated into English for Iain to review.</Copy>
        <Caption>This tutorial is a demonstration. Use the Feedback button in the app to send a real report.</Caption>
      </View>}
    </ScrollView>
    <View style={[styles.footer, narrow && styles.narrowContent]}>
      <Pressable accessibilityRole="button" onPress={() => step === titles.length - 1 ? onFinish() : setStep(step + 1)} style={pressStyle(styles.continueButton)}>
        <Text style={styles.continueText}>{step === titles.length - 1 ? "Finish tutorial" : "Continue"}</Text>
      </Pressable>
      <View accessible accessibilityLabel={`Tutorial step ${step + 1} of ${titles.length}`} style={styles.progress}>
        {titles.map((_, index) => <View key={index} style={[styles.dot, index === step && styles.currentDot]} />)}
      </View>
    </View>
  </View>;
}

function Copy({ children }: { children: React.ReactNode }) {
  return <Text style={styles.copy}>{children}</Text>;
}
function Caption({ children }: { children: React.ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}
function Pair({ text, translation, highlight = false }: { text: string; translation: string; highlight?: boolean }) {
  return <View style={styles.pair}>
    <Text style={styles.sampleText}><Text style={highlight && styles.highlight}>{text}</Text></Text>
    {text !== translation && <Text style={styles.translation}>{translation}</Text>}
  </View>;
}
function DemoButton({ icon: Icon, children, label, onPress, active = false }: {
  icon: LucideIcon;
  children?: React.ReactNode;
  label?: string;
  onPress: () => void;
  active?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={pressStyle([styles.demoButton, active && styles.activeDemoButton])}>
    <Icon size={19} strokeWidth={1.7} color={active ? c.paper : c.accentText} />
    {!!children && <Text style={[styles.demoButtonText, active && { color: c.paper }]}>{children}</Text>}
  </Pressable>;
}

function ConversationDemo({ example }: { example: TutorialExample }) {
  const [mode, setMode] = useState<"talk" | "grammar">("talk");
  return <View style={styles.section}>
    <Copy>You’ve learned the language. Now make it part of your day, one conversation at a time.</Copy>
    <View accessibilityRole="tablist" style={styles.segments}>
      {([['talk', 'Free talk'], ['grammar', 'Grammar']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: mode === key }} onPress={() => setMode(key)} style={pressStyle([styles.segment, mode === key && styles.activeSegment])}>
        <Text style={[styles.segmentText, mode === key && styles.activeSegmentText]}>{label}</Text>
      </Pressable>)}
    </View>
    <View style={styles.section} accessibilityLiveRegion="polite">
      <DisplayText style={styles.subheading}>{mode === "talk" ? "Talk about your world." : "Put a familiar rule to work."}</DisplayText>
      <Copy>{mode === "talk" ? "Your day, your plans, a story worth telling. Start anywhere and let your AI partner keep the conversation going." : "Choose a topic you already know. Your partner gives you a short reminder, then a prompt to get you talking."}</Copy>
      <View style={styles.ruledExample}>
        <Caption>{mode === "talk" ? `${example.language} example` : "For example · past tense"}</Caption>
        {mode === "talk" ? <Pair text={example.question} translation="What would you like to do this weekend?" /> : <Text style={styles.sampleText}>Tell a story about yesterday. What happened, and who was with you?</Text>}
      </View>
    </View>
  </View>;
}

function VoiceDemo({ example }: { example: TutorialExample }) {
  const [stage, setStage] = useState<"idle" | "listening" | "draft" | "sent">("idle");
  return <View style={styles.section}>
    <Copy>Tap the microphone and speak. Stop when you’re ready, check your words, then tap the arrow to send. You can type, too.</Copy>
    <View style={styles.demo}>
      <Caption>Try the controls · sample conversation</Caption>
      <Pair text={example.question} translation="What would you like to do this weekend?" />
      <View style={styles.composer}>
        <Text accessibilityLiveRegion="polite" style={[styles.sampleText, (stage === "idle" || stage === "listening") && { color: c.muted }]}>
          {stage === "idle" ? "Message your partner…" : stage === "listening" ? "Listening…" : example.answer}
        </Text>
        <View style={styles.composerActions}>
          <Text style={styles.demoStatus}>{stage === "sent" ? "Example sent" : stage === "listening" ? "Tap stop to finish" : stage === "draft" ? "Check, then send" : "Tap the microphone"}</Text>
          {stage === "sent" ? <DemoButton icon={RotateCcw} label="Replay speaking demonstration" onPress={() => setStage("idle")} /> : <>
            <DemoButton icon={stage === "listening" ? Square : Mic} label={stage === "listening" ? "Stop sample recording" : "Try sample microphone"} active={stage === "listening"} onPress={() => setStage(stage === "listening" ? "draft" : "listening")} />
            {stage === "draft" && <DemoButton icon={ArrowUp} label="Send example message" active onPress={() => setStage("sent")} />}
          </>}
        </View>
      </View>
      <Text style={styles.finePrint}>A demonstration only. Your microphone stays off.</Text>
    </View>
    <View style={styles.ruledExample}>
      <DisplayText style={styles.subheading}>Listen, then try again.</DisplayText>
      <Copy>Use the speaker beside a reply to hear it aloud. Turn on “Read replies aloud” in Settings for replies after you speak.</Copy>
    </View>
  </View>;
}

function WordsDemo({ example }: { example: TutorialExample }) {
  const [translated, setTranslated] = useState(false);
  const [saved, setSaved] = useState(false);
  return <View style={styles.section}>
    <Copy>Missing a word? Open Translate without leaving your conversation. Save useful phrases to your Dictionary.</Copy>
    <View style={styles.demo}>
      <Caption>Try it · translate & save</Caption>
      <Text style={styles.sampleText}>go for a walk in the park</Text>
      <View style={styles.demoActions}>
        <DemoButton icon={Languages} onPress={() => setTranslated(true)}>Translate</DemoButton>
      </View>
      {translated && <View style={styles.result} accessibilityLiveRegion="polite">
        <Pair text={example.phrase} translation="go for a walk in the park" highlight />
        <DemoButton icon={saved ? Check : BookmarkPlus} active={saved} label={saved ? "Example saved in this tutorial" : "Save example phrase"} onPress={() => setSaved(true)}>{saved ? "Saved" : "Save phrase"}</DemoButton>
      </View>}
      <Text style={styles.finePrint}>{saved ? "Example saved here only. Your Dictionary hasn’t changed." : "Try this example without adding anything to your Dictionary."}</Text>
    </View>
    <View style={styles.ruledExample}>
      <DisplayText style={styles.subheading}>Found a phrase in a reply?</DisplayText>
      <Copy>Press and hold the text, select the words you want, then choose Save phrase. Open a Dictionary item to see its saved example.</Copy>
    </View>
  </View>;
}

function SavedDemo({ example }: { example: TutorialExample }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.section}>
    <Copy>Save a conversation you’d like to revisit. Find it in Saved conversations in the side menu, then practise that topic again.</Copy>
    <View style={styles.savedDemo}>
      <Caption>Sample saved conversation</Caption>
      <DisplayText medium style={styles.conversationTitle}>Weekend plans</DisplayText>
      <Text style={styles.centeredCopy}>The words you saved stay close by.</Text>
      <View><DemoButton icon={open ? X : BookOpen} label={open ? "Close sample saved words" : "Open sample saved words"} onPress={() => setOpen(!open)}>{open ? "Close saved words" : "Saved words"}</DemoButton></View>
      {open && <View style={styles.miniTray} accessibilityLiveRegion="polite">
        <Caption>Saved words</Caption>
        <Pair text={example.phrase} translation="go for a walk in the park" />
        <Pair text={example.weekend} translation="this weekend" />
      </View>}
    </View>
    <View style={styles.ruledExample}>
      <View style={styles.inlineHeading}><BookOpen size={21} strokeWidth={1.7} color={c.accent} /><DisplayText style={[styles.subheading, { flex: 1 }]}>A little help, within reach.</DisplayText></View>
      <Copy>In a saved conversation, the book beside Translate opens your compact word list. Glance at it whenever you need a reminder.</Copy>
    </View>
  </View>;
}

function GrammarDemo() {
  const [open, setOpen] = useState(false);
  return <View style={styles.section}>
    <Copy>Choose Grammar in the side menu. Pick a topic you’ve learned, read the brief guide, then practise it in conversation.</Copy>
    <View style={styles.demo}>
      <Caption>Russian example · past tense</Caption>
      {open ? <View style={styles.miniTray} accessibilityLiveRegion="polite">
        <Text style={styles.smallHeading}>Past tense reminder</Text>
        <Text style={styles.translation}>The ending agrees with gender and number.</Text>
        <View style={styles.forms}>
          <Text style={styles.form}>он работа<Text style={styles.ending}>л</Text></Text>
          <Text style={styles.form}>она работа<Text style={styles.ending}>ла</Text></Text>
          <Text style={styles.form}>они работа<Text style={styles.ending}>ли</Text></Text>
          <Text style={styles.form}>оно работа<Text style={styles.ending}>ло</Text></Text>
        </View>
      </View> : <Pair text="Расскажите, что вы делали вчера вечером." translation="Tell me what you did yesterday evening." />}
      <DemoButton icon={open ? X : BookOpen} label={open ? "Close sample grammar reminder" : "Open sample grammar reminder"} onPress={() => setOpen(!open)}>{open ? "Back to the prompt" : "Grammar reminder"}</DemoButton>
    </View>
    <Copy>English sits directly below each Russian prompt. The book icon brings back the guide; red endings show what to focus on.</Copy>
    <View style={styles.ruledExample}>
      <DisplayText style={styles.subheading}>Your words. Your pace.</DisplayText>
      <Copy>Keep talking, ask for a hint, or try another example. You can replay this tour from Settings → Help at any time.</Copy>
    </View>
  </View>;
}

const pressStyle = (style: StyleProp<ViewStyle>) => ({ pressed }: { pressed: boolean }) => [style, pressed && { opacity: 0.6 }];
const styles = StyleSheet.create({
  screen: { flex: 1 },
  navigation: { minHeight: 48, paddingHorizontal: 18, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navigationButton: { minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 2 },
  navigationText: { fontFamily: fonts.sans, fontSize: 15, color: c.accentText },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 36, paddingTop: 12, paddingBottom: 24, gap: 18 },
  narrowContent: { paddingHorizontal: 24 },
  eyebrow: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 16, letterSpacing: 1.6, textTransform: "uppercase", color: c.accentText },
  title: { fontSize: 36, lineHeight: 44, letterSpacing: -0.8, color: c.ink, paddingBottom: 2 },
  openingTitle: { fontSize: 43, lineHeight: 51 },
  narrowTitle: { fontSize: 32, lineHeight: 39 },
  section: { gap: 20 },
  copy: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: c.muted },
  subheading: { fontSize: 23, lineHeight: 30, letterSpacing: -0.25, color: c.ink },
  segments: { flexDirection: "row", borderWidth: 1, borderColor: c.line, borderRadius: 15, padding: 3 },
  segment: { flex: 1, minHeight: 40, paddingVertical: 8, paddingHorizontal: 4, justifyContent: "center", alignItems: "center", borderRadius: 12 },
  activeSegment: { backgroundColor: c.ink },
  segmentText: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, textTransform: "uppercase", letterSpacing: 0.8, color: c.muted },
  activeSegmentText: { color: c.accent },
  ruledExample: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line, paddingTop: 18, gap: 10 },
  caption: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 16, letterSpacing: 1, textTransform: "uppercase", color: c.muted },
  pair: { gap: 5 },
  sampleText: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, color: c.ink },
  translation: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: c.muted },
  demo: { gap: 15, backgroundColor: c.bubble, borderRadius: 14, padding: 16, marginHorizontal: -10 },
  demoButton: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, minWidth: 44, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.bg },
  activeDemoButton: { backgroundColor: c.ink, borderColor: c.ink },
  demoButtonText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: c.ink },
  composer: { backgroundColor: c.paper, borderRadius: 12, padding: 12, gap: 14, borderWidth: 1, borderColor: c.line },
  composerActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  demoStatus: { flex: 1, fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: c.accentText },
  finePrint: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: c.muted },
  demoActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  result: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line, paddingTop: 12, gap: 12 },
  highlight: { backgroundColor: c.yellow },
  savedDemo: { alignItems: "center", gap: 14, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  conversationTitle: { textAlign: "center", fontSize: 30, lineHeight: 38, color: c.ink },
  centeredCopy: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: c.muted, textAlign: "center" },
  miniTray: { alignSelf: "stretch", backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 13, gap: 12 },
  inlineHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  smallHeading: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.ink },
  forms: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 7 },
  form: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: c.ink },
  ending: { color: c.grammar, fontWeight: "600" },
  footer: { paddingTop: 12, paddingHorizontal: 36, backgroundColor: c.bg },
  continueButton: { minHeight: 46, padding: 12, borderRadius: 9, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" },
  continueText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: c.paper },
  progress: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 32 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.line },
  currentDot: { backgroundColor: c.accent },
});
