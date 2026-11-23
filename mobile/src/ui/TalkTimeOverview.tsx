import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { languageName, type Stats } from "../core/domain";
import {
  talkTimeByLanguage,
  talkTimeSeries,
  talkTimeSummary,
  type TalkTimeRange,
} from "../core/stats";
import { c, fonts, Label, s } from "./components";
import { readingTotals, type Reading } from "../core/reading";
import { wordLevelNames } from "../core/practice";
import { practiceLevel, practiceTotals, type Activity } from "../core/activity";

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  if (!minutes) return ms > 0 ? "<1m" : "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function Rows({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <View style={[s.card, styles.languageCard]}>
      <Text style={styles.chartTitle}>{title}</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.languageRow}>
          <Label style={{ flex: 1 }}>{label}</Label>
          <Label>{value}</Label>
        </View>
      ))}
    </View>
  );
}
function Progress({ label, share, done }: { label: string; share: number; done: string }) {
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.languageRow}>
        <Label style={{ flex: 1 }}>{label}</Label>
        <Label muted>{done}</Label>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} /></View>
    </View>
  );
}
// The learner's level, earned by live reading: so many minutes of videos and
// as many of their own scripts, finished readings only.
export function LevelCard({ readings }: { readings: Reading[] }) {
  const progress = practiceLevel(readings);
  const minutes = (ms: number) => `${Math.floor(ms / 60000)} of ${progress.next?.minutes} min`;
  return (
    <View style={[s.card, styles.languageCard]}>
      <Text style={styles.chartTitle}>{progress.level ? `Level ${progress.level}` : "Not on a level yet"}</Text>
      {progress.next ? (
        <>
          <Label muted>
            Level {progress.next.level}: finish {progress.next.minutes} minutes of live reading from videos, and {progress.next.minutes} from your own scripts. Short ones add up.
          </Label>
          <Progress label="Videos" share={progress.next.video} done={minutes(progress.videoMs)} />
          <Progress label="Your scripts" share={progress.next.script} done={minutes(progress.scriptMs)} />
        </>
      ) : (
        <Label muted>You have reached the top level.</Label>
      )}
    </View>
  );
}
// What the learner has done with videos and with their own conversations,
// besides talking: watching, live reading and recording.
export function PracticeOverview({ readings, activity }: { readings: Reading[]; activity: Activity[] }) {
  const totals = practiceTotals(readings, activity);
  const accuracy = readingTotals(readings).levels.filter((item) => item.accuracy !== undefined);
  return (
    <>
      <Rows title="Videos" rows={[
        ["Time watching", formatDuration(totals.video.watchMs)],
        ["Time live reading", formatDuration(totals.video.readingMs)],
        ["Live readings completed", `${totals.video.completed} of ${totals.video.readings}`],
      ]} />
      <Rows title="Your conversations" rows={[
        ["Time live reading scripts", formatDuration(totals.lesson.readingMs)],
        ["Live readings completed", `${totals.lesson.completed} of ${totals.lesson.readings}`],
        ["Time recording", formatDuration(totals.recordingMs)],
        ["Recordings", String(totals.recordings)],
      ]} />
      {(totals.wordsSpoken > 0 || accuracy.length > 0) && (
        <Rows title="Live reading" rows={[
          ["Words spoken", totals.wordsSpoken.toLocaleString()],
          ...accuracy.map((item): [string, string] => [`Accuracy · ${wordLevelNames[item.level]}`, `${item.accuracy}% over ${item.attempts}`]),
        ]} />
      )}
    </>
  );
}

const ranges: { key: TalkTimeRange; label: string }[] = [
  { key: "daily", label: "Day" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
];

export function TalkTimeOverview({
  stats,
  today,
  language,
  onAssignEarlier,
}: {
  stats: Stats;
  today: string;
  // The language being practised, which earlier untracked time can be counted as.
  language?: string;
  onAssignEarlier?: () => void;
}) {
  const [range, setRange] = useState<TalkTimeRange>("daily");
  const summary = talkTimeSummary(stats, today);
  const series = talkTimeSeries(stats, range, today);
  const maximum = Math.max(...series.map(({ ms }) => ms), 1);
  const byLanguage = talkTimeByLanguage(stats);
  const totals = [
    ["Today", summary.day],
    ["Last 7 days", summary.week],
    ["This month", summary.month],
    ["All time", summary.total],
  ] as const;

  return (
    <>
      <View style={styles.summaryGrid}>
        {totals.map(([label, value]) => (
          <View key={label} style={[s.card, styles.summaryCard]}>
            <Text style={styles.summaryValue}>{formatDuration(value)}</Text>
            <Label muted style={styles.summaryLabel}>
              {label}
            </Label>
          </View>
        ))}
      </View>
      {(byLanguage.languages.length > 0 || byLanguage.earlier > 0) && (
        <View style={[s.card, styles.languageCard]}>
          <Text style={styles.chartTitle}>By language</Text>
          {byLanguage.languages.map(({ language, ms }) => (
            <View key={language} style={styles.languageRow}>
              <Label style={{ flex: 1 }}>{languageName(language)}</Label>
              <Label>{formatDuration(ms)}</Label>
            </View>
          ))}
          {byLanguage.earlier > 0 && (
            <View style={styles.languageRow}>
              <Label muted style={{ flex: 1 }}>Before languages were tracked</Label>
              <Label muted>{formatDuration(byLanguage.earlier)}</Label>
            </View>
          )}
          {byLanguage.earlier > 0 && !!language && !!onAssignEarlier && (
            <Pressable accessibilityRole="button" onPress={onAssignEarlier} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Label style={{ color: c.accent, fontWeight: "600" }}>Count that time as {languageName(language)}</Label>
            </Pressable>
          )}
          <View style={[styles.languageRow, styles.languageTotal]}>
            <Label style={{ flex: 1, fontWeight: "600" }}>Total</Label>
            <Label style={{ fontWeight: "600" }}>{formatDuration(summary.total)}</Label>
          </View>
        </View>
      )}
      <View style={[s.card, styles.chartCard]}>
        <View style={styles.chartHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chartTitle}>Speaking activity</Text>
            <Label muted style={{ fontSize: 12 }}>
              {range === "daily"
                ? "Last 7 days"
                : range === "weekly"
                  ? "Last 6 weeks"
                  : "Last 6 months"}
            </Label>
          </View>
          <View style={styles.rangePicker}>
            {ranges.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: range === item.key }}
                onPress={() => setRange(item.key)}
                style={[
                  styles.rangeButton,
                  range === item.key && styles.rangeButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.rangeText,
                    range === item.key && styles.rangeTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.chart}>
          {series.map((point) => {
            const height = point.ms
              ? Math.max(8, Math.round((point.ms / maximum) * 106))
              : 2;
            return (
              <View key={point.key} style={styles.column}>
                <Text numberOfLines={1} style={styles.barValue}>
                  {point.ms ? formatDuration(point.ms) : ""}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    accessibilityLabel={`${point.label}: ${formatDuration(point.ms)}`}
                    style={[
                      styles.bar,
                      { height },
                      !point.ms && styles.emptyBar,
                    ]}
                  />
                </View>
                <Text numberOfLines={1} style={styles.axisLabel}>
                  {point.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "48%",
    minWidth: 135,
    flexGrow: 1,
    padding: 16,
    gap: 2,
  },
  summaryValue: {
    color: c.ink,
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 33,
  },
  summaryLabel: { fontSize: 12 },
  languageCard: { padding: 16, gap: 10 },
  track: { height: 8, borderRadius: 4, backgroundColor: c.pale, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.accent },
  languageRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  languageTotal: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
  chartCard: { padding: 16, gap: 16 },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chartTitle: {
    color: c.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: "600",
  },
  rangePicker: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    backgroundColor: c.bubble,
  },
  rangeButton: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  rangeButtonSelected: { backgroundColor: c.ink },
  rangeText: {
    color: c.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: "600",
  },
  rangeTextSelected: { color: c.accent },
  chart: {
    height: 158,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  column: { flex: 1, minWidth: 0, alignItems: "center" },
  barValue: {
    width: "100%",
    height: 17,
    textAlign: "center",
    color: c.muted,
    fontFamily: fonts.sans,
    fontSize: 9,
  },
  barTrack: {
    height: 106,
    width: "68%",
    minWidth: 15,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 6,
    backgroundColor: c.accent,
  },
  emptyBar: { backgroundColor: c.line },
  axisLabel: {
    width: "100%",
    marginTop: 6,
    textAlign: "center",
    color: c.muted,
    fontFamily: fonts.sans,
    fontSize: 9,
  },
});
