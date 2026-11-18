import React from "react";
import { Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { languageName } from "../core/domain";
import { roleplayScenarios, roleplayForLanguage, type RoleplayScenario } from "../core/roleplay";
import type { RoleplayPractice } from "../core/roleplayTypes";
import { Button, Label, s } from "./components";
import { DisplayText } from "./DisplayText";

export function RoleplayBrief({ scenario, showOpening = false }: { scenario: RoleplayPractice; showOpening?: boolean }) {
  return <View style={s.card}>
    <Text style={s.eyebrow}>Roleplay · {scenario.title}</Text>
    <Label>{scenario.setting}</Label>
    <Label><Text style={{ fontWeight: "600" }}>You:</Text> {scenario.learnerRole}</Label>
    <Label><Text style={{ fontWeight: "600" }}>Partner:</Text> {scenario.partnerRole}</Label>
    <Label muted>Your goals</Label>
    {scenario.objectives.map((objective) => <Label key={objective}>• {objective}</Label>)}
    {showOpening && <>
      <Label muted>Your partner starts with</Label>
      <Label>{scenario.openingPrompt}</Label>
    </>}
  </View>;
}

export function RoleplayScreen({ language, account, busy, onSignIn, onStart }: {
  language: string;
  account: boolean;
  busy: boolean;
  onSignIn: () => void;
  onStart: (scenario: RoleplayScenario) => void;
}) {
  return <>
    <Text style={s.eyebrow}>{languageName(language)}</Text>
    <DisplayText style={s.title}>Put yourself in the conversation.</DisplayText>
    <Label muted>Pick a situation, take your role and work towards a few practical goals. You can use invented details.</Label>
    {!account && <View style={s.card}>
      <Label>Sign in to start a roleplay with your partner.</Label>
      <Button primary onPress={onSignIn}>Sign in</Button>
    </View>}
    {roleplayScenarios.map((scenario) => <View key={scenario.id} style={{ gap: 8 }}>
      <RoleplayBrief scenario={roleplayForLanguage(scenario, language)} showOpening />
      <Button primary icon={ArrowRight} disabled={!account || busy} onPress={() => onStart(scenario)} label={`Start roleplay: ${scenario.title}`}>Start roleplay</Button>
    </View>)}
  </>;
}
