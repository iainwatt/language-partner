import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check, Flame, MessageCircle, MonitorPlay } from "lucide-react-native";
import { type Badge, nextBadges, shadowingMsForDay, spokenTurnsForDay } from "../core/streaks";
import { Button, c, fonts, Label, s } from "./components";
import { DisplayText } from "./DisplayText";

type Streak = { current: number; best: number; doneToday: boolean };
const minutes = (ms: number) => {
  const whole = Math.floor(ms / 60000);
  return whole ? `${whole} min` : ms > 0 ? "<1 min" : "0 min";
};
// A length of time as it is said: "45 min", "3 h 20 min".
const total = (ms: number) => {
  const whole = Math.floor(ms / 60000);
  if (whole < 60) return whole ? `${whole} min` : ms > 0 ? "under a minute" : "no time yet";
  return whole % 60 ? `${Math.floor(whole / 60)} h ${whole % 60} min` : `${Math.floor(whole / 60)} h`;
};
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function StreakCard({ title, streak, progress, share }: { title: string; streak: Streak; progress: string; share: number }) {
  return (
    <View style={[s.card, styles.streak]}>
      <View style={styles.streakTop}>
        <Flame color={streak.current ? c.accent : c.muted} size={22} strokeWidth={1.8} />
        <Text style={styles.streakCount}>{streak.current}</Text>
        {streak.doneToday && <View style={styles.tick}><Check color="#FFFFFF" size={14} strokeWidth={3} /></View>}
      </View>
      <Text style={styles.streakTitle}>{title}</Text>
      <Label muted style={styles.small}>
        {streak.doneToday ? "Done for today" : streak.current ? "Do it today to keep it" : streak.best ? "Start a new one today" : "Start it today"}
      </Label>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(Math.min(1, share) * 100)}%` }]} /></View>
      <Label muted style={styles.small}>{progress} · best {streak.best}</Label>
    </View>
  );
}

// The page the app opens on: the two streaks, what to do next to keep them,
// today's numbers, and badges. The streaks are for the two things that show
// real practice: recording yourself shadowing a video, and talking out loud.
export function TodayScreen({ pageTitleStyle, account, shadowing, conversation, shadowedMs, spokenTurns, wordsToday, watchedMs, talkedMs, allTime, badges, onShadow, onTalk, onSignIn }: {
  pageTitleStyle: object;
  account: boolean;
  shadowing: Streak;
  conversation: Streak;
  // Today so far.
  shadowedMs: number;
  spokenTurns: number;
  wordsToday: number;
  watchedMs: number;
  talkedMs: number;
  // Everything so far, which a missed day takes nothing away from.
  allTime: { talkedMs: number; shadowedMs: number; recordings: number; words: number };
  badges: Badge[];
  onShadow: () => void;
  onTalk: () => void;
  onSignIn: () => void;
}) {
  const earned = badges.filter((badge) => badge.earned);
  const next = nextBadges(badges);
  const bothDone = shadowing.doneToday && conversation.doneToday;
  // A streak that has run and ended. The totals are what the learner still has.
  const lapsed = [shadowing, conversation].some((item) => !item.current && item.best > 0);
  const practised = allTime.talkedMs > 0 || allTime.shadowedMs > 0;
  return (
    <>
      <Text style={s.eyebrow}>Your practice</Text>
      <DisplayText style={pageTitleStyle}>Today.</DisplayText>
      {!account ? (
        <>
          <Label muted>Sign in to keep streaks, and to have your practice counted from one day to the next.</Label>
          <Button primary onPress={onSignIn}>Sign in</Button>
          <Button icon={MessageCircle} onPress={onTalk}>Start talking</Button>
        </>
      ) : (
        <>
          <View style={styles.streaks}>
            <StreakCard title="Shadowing" streak={shadowing} share={shadowedMs / shadowingMsForDay}
              progress={`${clock(Math.min(shadowedMs, shadowingMsForDay))} of 1:00 recorded`} />
            <StreakCard title="Talking" streak={conversation} share={spokenTurns / spokenTurnsForDay}
              progress={`${Math.min(spokenTurns, spokenTurnsForDay)} of ${spokenTurnsForDay} turns spoken`} />
          </View>

          {lapsed && practised && (
            <View style={[s.card, { backgroundColor: c.pale, gap: 6 }]}>
              <Label style={styles.nextTitle}>A streak ends. The practice stays.</Label>
              <Label muted>
                So far you have spent {total(allTime.talkedMs)} in conversation and {total(allTime.shadowedMs)} recorded shadowing videos. None of that goes anywhere. Today is day one of the next run.
              </Label>
            </View>
          )}

          <Text style={s.eyebrow}>{bothDone ? "Done for today" : "Next"}</Text>
          {bothDone && <Label muted>Both streaks are safe. Anything more today is extra.</Label>}
          {!shadowing.doneToday && (
            <View style={[s.card, styles.next]}>
              <Label style={styles.nextTitle}>Record yourself shadowing a video</Label>
              <Label muted>
                {shadowing.current
                  ? `One minute keeps your ${shadowing.current}-day streak. Press Record on a video, or do a live reading.`
                  : "One minute counts. Press Record on a video, or do a live reading."}
              </Label>
              <Button primary icon={MonitorPlay} onPress={onShadow}>Shadow a video</Button>
            </View>
          )}
          {!conversation.doneToday && (
            <View style={[s.card, styles.next]}>
              <Label style={styles.nextTitle}>Talk with your partner</Label>
              <Label muted>
                {conversation.current
                  ? `Say ${spokenTurnsForDay} things out loud to keep your ${conversation.current}-day streak. Typing does not count.`
                  : `Say ${spokenTurnsForDay} things out loud. Typing does not count.`}
              </Label>
              <Button primary={shadowing.doneToday} icon={MessageCircle} onPress={onTalk}>Start talking</Button>
            </View>
          )}
          {bothDone && (
            <View style={s.wrap}>
              <Button icon={MessageCircle} onPress={onTalk}>Talk some more</Button>
              <Button icon={MonitorPlay} onPress={onShadow}>Watch and repeat</Button>
            </View>
          )}

          <Text style={s.eyebrow}>Today so far</Text>
          <View style={[s.card, styles.numbers]}>
            {([
              [String(wordsToday), wordsToday === 1 ? "word saved" : "words saved"],
              [minutes(watchedMs), "watching"],
              [minutes(talkedMs), "in conversation"],
            ] as const).map(([value, label]) => (
              <View key={label} style={styles.number}>
                <Text style={styles.numberValue}>{value}</Text>
                <Label muted style={styles.small}>{label}</Label>
              </View>
            ))}
          </View>

          <Text style={s.eyebrow}>All your practice</Text>
          <View style={[s.card, { gap: 8 }]}>
            {([
              ["In conversation", total(allTime.talkedMs)],
              ["Shadowing videos, recorded", total(allTime.shadowedMs)],
              ["Recordings and live readings", String(allTime.recordings)],
              ["Words and phrases saved", String(allTime.words)],
            ] as const).map(([label, value]) => (
              <View key={label} style={styles.reach}>
                <Label style={{ flex: 1 }}>{label}</Label>
                <Label style={{ fontWeight: "600" }}>{value}</Label>
              </View>
            ))}
          </View>

          <Text style={s.eyebrow}>Badges</Text>
          {earned.length > 0 ? (
            <View style={s.wrap}>
              {earned.map((badge) => (
                <View key={badge.id} style={styles.badge}><Text style={styles.badgeText}>{badge.label}</Text></View>
              ))}
            </View>
          ) : (
            <Label muted>None yet. The first ones are close.</Label>
          )}
          {next.length > 0 && (
            <View style={[s.card, { gap: 8 }]}>
              <Label muted style={styles.small}>WITHIN REACH</Label>
              {next.map((badge) => (
                <View key={badge.id} style={styles.reach}>
                  <Label style={{ flex: 1 }}>{badge.label}</Label>
                  <Label muted>{Math.floor(badge.have)} of {badge.goal}</Label>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  streaks: { flexDirection: "row", gap: 10 },
  streak: { flex: 1, padding: 14, gap: 4 },
  streakTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakCount: { flex: 1, color: c.ink, fontFamily: fonts.serif, fontSize: 34, lineHeight: 40 },
  streakTitle: { color: c.ink, fontFamily: fonts.sans, fontSize: 16, fontWeight: "600" },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: c.accent },
  small: { fontSize: 13, lineHeight: 18 },
  track: { height: 6, borderRadius: 3, marginTop: 4, backgroundColor: c.pale, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
  next: { gap: 8 },
  nextTitle: { fontSize: 17, fontWeight: "600" },
  numbers: { flexDirection: "row", padding: 14 },
  number: { flex: 1, alignItems: "center", gap: 2 },
  numberValue: { color: c.ink, fontFamily: fonts.serif, fontSize: 22, lineHeight: 28 },
  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.pale },
  badgeText: { color: c.ink, fontFamily: fonts.sans, fontSize: 13, fontWeight: "600" },
  reach: { flexDirection: "row", alignItems: "center", gap: 10 },
});
