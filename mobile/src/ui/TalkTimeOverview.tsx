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

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  if (!minutes) return ms > 0 ? "<1m" : "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

const ranges: { key: TalkTimeRange; label: string }[] = [
  { key: "daily", label: "Day" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
];

export function TalkTimeOverview({
  stats,
  today,
}: {
  stats: Stats;
  today: string;
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
      {byLanguage.languages.length > 0 && (
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
