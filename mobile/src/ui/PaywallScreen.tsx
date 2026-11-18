import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BookOpen, Check, MessagesSquare, Sparkles, X } from "lucide-react-native";
import { conversationTimeLabel, type ConversationAccess } from "../core/conversationAccess";
import { purchaseSubscription, restoreSubscription, subscriptionPlans, subscriptionsConfigured, subscriptionPrivacyUrl, subscriptionTermsUrl, type SubscriptionPlan } from "../services/subscriptions";
import { SettingsModal } from "./SettingsPage";
import { DisplayText } from "./DisplayText";
import { Button, c, fonts } from "./components";

export function PaywallScreen({ uid, access, onClose, onUnlocked }: {
  uid?: string;
  access: ConversationAccess;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true); setError("");
    if (!uid || !subscriptionsConfigured) { setLoading(false); return; }
    subscriptionPlans(uid).then((value) => {
      if (!current) return;
      setPlans(value); setSelected(value[0]?.id ?? "");
      if (!value.length) setError("Plans couldn’t be loaded. Please try again.");
    }).catch(() => { if (current) setError("Plans couldn’t be loaded. Check your connection and try again."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [uid, reload]);
  async function buy(restore: boolean) {
    if (!uid || busy) return;
    setBusy(true); setError("");
    try {
      const confirmed = restore ? await restoreSubscription(uid) : await purchaseSubscription(uid, selected);
      if (confirmed) onUnlocked();
      else setError(restore ? "No active subscription was found for this account." : "Your purchase is processing. Use Restore purchases in a moment to check again.");
    } catch (issue: any) {
      if (!issue.userCancelled) setError(issue.message ?? "The purchase couldn’t be completed. Please try again.");
    } finally { setBusy(false); }
  }
  const close = () => { if (!busy) onClose(); };
  return <SettingsModal onClose={close}>
    <PaywallContent access={access} plans={plans} selected={selected} loading={loading} busy={busy} error={error}
      available={subscriptionsConfigured && !!uid} onSelect={setSelected} onClose={close} onBuy={() => void buy(false)} onRestore={() => void buy(true)} onRetry={() => setReload(reload + 1)} />
  </SettingsModal>;
}

/** Pure presentation, also used to review the paywall with sample store plans. */
export function PaywallContent({ access, plans, selected, loading, busy, error, available, onSelect, onClose, onBuy, onRestore, onRetry }: {
  access: ConversationAccess;
  plans: SubscriptionPlan[];
  selected: string;
  loading: boolean;
  busy: boolean;
  error: string;
  available: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onBuy: () => void;
  onRestore: () => void;
  onRetry: () => void;
}) {
  const plan = plans.find((p) => p.id === selected);
  const exhausted = access.remainingMs <= 0;
  return <>
    <View style={styles.navigation}><Button small icon={X} label="Close subscription screen" disabled={busy} onPress={onClose} style={styles.close} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Language Partner Plus</Text>
      <DisplayText accessibilityRole="header" style={styles.title}>{access.subscribed ? "More time\nfor your words." : "Keep the\nconversation going."}</DisplayText>
      <Text style={styles.copy}>{access.subscribed ? "Your subscription is active. Your next conversation is waiting." : exhausted ? "You’ve used your 15 free conversation minutes. Subscribe to keep practising with your AI partner." : `You have ${conversationTimeLabel(access.remainingMs)} of free conversation time. Your one-time allowance pauses when you leave the conversation.`}</Text>
      <View style={styles.benefits}>
        {[[MessagesSquare, "More conversation practice", "Talk about your day, plans and ideas."], [Sparkles, "Grammar, put into practice", "Focused topics with a guide close by."], [BookOpen, "Words that stay with you", "Build on the vocabulary you’ve saved."]] .map(([Icon, title, body], index) => {
          const Symbol = Icon as typeof BookOpen;
          return <View key={index} style={styles.benefit}><Symbol color={c.accent} size={20} strokeWidth={1.6} /><View style={{ flex: 1, gap: 3 }}><Text style={styles.benefitTitle}>{title as string}</Text><Text style={styles.smallCopy}>{body as string}</Text></View></View>;
        })}
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Loading subscription plans" color={c.accent} /> : access.subscribed ? <View style={styles.confirmation}><Check size={18} color={c.accentText} /><Text style={styles.benefitTitle}>Subscription active</Text></View> : !available ? <View style={styles.notice}><Text style={styles.smallCopy}>Subscriptions are coming soon. Your saved words and conversations are still available.</Text></View> : <View style={styles.plans}>
        {plans.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id, disabled: busy }} accessibilityLabel={`${item.title}, ${item.price} per ${item.period}`} disabled={busy} onPress={() => onSelect(item.id)} style={[styles.plan, selected === item.id && styles.selectedPlan]}>
          <View style={{ flex: 1, gap: 3 }}><Text style={styles.benefitTitle}>{item.title}</Text><Text style={styles.smallCopy}>{item.price} / {item.period}</Text></View>
          <View style={[styles.radio, selected === item.id && { borderColor: c.accent }]}>{selected === item.id && <View style={styles.radioDot} />}</View>
        </Pressable>)}
      </View>}
      {!!error && <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><Text style={[styles.smallCopy, { color: c.danger }]}>{error}</Text>{!plans.length && available && <Button small disabled={busy || loading} onPress={onRetry}>Reload plans</Button>}</View>}
    </ScrollView>
    <View style={styles.footer}>
      {!access.subscribed && available && !!plan && <>
        <Button primary disabled={busy || loading} onPress={onBuy} style={{ borderRadius: 10 }}>{busy ? "Confirming…" : `Subscribe · ${plan.price} / ${plan.period}`}</Button>
        <Text style={styles.terms}>Renews automatically until cancelled. Manage or cancel in your store account.</Text>
      </>}
      {(access.subscribed || !available || !exhausted) && <Button primary={access.subscribed || !available} disabled={busy} onPress={onClose}>{access.subscribed ? "Continue practising" : exhausted ? "Back to the app" : "Continue with free time"}</Button>}
      {available && <Pressable accessibilityRole="button" disabled={busy} onPress={onRestore} style={styles.linkButton}><Text style={styles.link}>Restore purchases</Text></Pressable>}
      {!!subscriptionTermsUrl && !!subscriptionPrivacyUrl && <View style={styles.legal}>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(subscriptionTermsUrl).catch(() => {})} style={styles.linkButton}><Text style={styles.legalText}>Terms of Use</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(subscriptionPrivacyUrl).catch(() => {})} style={styles.linkButton}><Text style={styles.legalText}>Privacy Policy</Text></Pressable>
      </View>}
      <Text style={styles.terms}>Your Dictionary and saved conversations stay yours.</Text>
    </View>
  </>;
}

const styles = StyleSheet.create({
  navigation: { alignItems: "flex-end", paddingHorizontal: 18, paddingTop: 8 },
  close: { minHeight: 44, width: 44, backgroundColor: "transparent", borderWidth: 0 },
  content: { paddingHorizontal: 30, paddingTop: 8, paddingBottom: 20, gap: 18 },
  eyebrow: { fontFamily: fonts.sans, color: c.accentText, fontSize: 10, lineHeight: 16, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { color: c.ink, fontSize: 35, lineHeight: 43, letterSpacing: -0.8 },
  copy: { fontFamily: fonts.sans, color: c.muted, fontSize: 15, lineHeight: 22 },
  smallCopy: { fontFamily: fonts.sans, color: c.muted, fontSize: 13, lineHeight: 19 },
  benefits: { gap: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line, paddingTop: 18 },
  benefit: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  benefitTitle: { fontFamily: fonts.sans, color: c.ink, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  notice: { backgroundColor: c.pale, padding: 14, borderRadius: 12 },
  plans: { gap: 10 },
  plan: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: c.line },
  selectedPlan: { borderColor: c.accent, backgroundColor: c.pale },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  confirmation: { flexDirection: "row", gap: 8, alignItems: "center" },
  footer: { paddingHorizontal: 30, paddingTop: 10, gap: 8 },
  terms: { fontFamily: fonts.sans, color: c.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  linkButton: { minHeight: 36, justifyContent: "center", alignItems: "center", paddingHorizontal: 8 },
  link: { fontFamily: fonts.sans, color: c.accentText, fontSize: 13, lineHeight: 19 },
  legal: { flexDirection: "row", justifyContent: "center", gap: 12 },
  legalText: { fontFamily: fonts.sans, color: c.muted, fontSize: 11, lineHeight: 16 },
});
