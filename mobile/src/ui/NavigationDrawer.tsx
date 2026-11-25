import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Flame,
  BookOpen,
  BookOpenText,
  ChartNoAxesColumnIncreasing,
  ListChecks,
  MonitorPlay,
  MessagesSquare,
  SquarePen,
  X,
} from "lucide-react-native";
import type { Conversation } from "../core/domain";
import {
  conversationTitle,
  recentConversationThreads,
} from "../core/conversations";
import { Button, c, fonts } from "./components";
import { SavedDataNotice } from "./SavedDataNotice";

export function NavigationDrawer({
  conversations,
  savedConversationIds,
  activeConversationId,
  dictionarySelected,
  conversationsSelected,
  grammarSelected,
  roleplaySelected,
  statsSelected,
  issuesSelected,
  videosSelected,
  homeSelected,
  onHome,
  savedDataStatus,
  onClose,
  onNewChat,
  onDictionary,
  onSavedConversations,
  onGrammar,
  onRoleplay,
  onStats,
  onIssues,
  onVideos,
  onConversation,
}: {
  conversations: Conversation[];
  savedConversationIds: string[];
  activeConversationId?: string;
  dictionarySelected: boolean;
  conversationsSelected: boolean;
  grammarSelected: boolean;
  roleplaySelected: boolean;
  statsSelected: boolean;
  issuesSelected: boolean;
  videosSelected: boolean;
  homeSelected: boolean;
  onHome: () => void;
  savedDataStatus?: { loaded: boolean };
  onClose: () => void;
  onNewChat: () => void;
  onDictionary: () => void;
  onSavedConversations: () => void;
  onGrammar: () => void;
  onRoleplay: () => void;
  onStats: () => void;
  onIssues: () => void;
  onVideos: () => void;
  onConversation: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drawerWidth = Math.min(320, width * 0.86);
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  useEffect(() => () => progress.stopAnimation(), [progress]);

  function animate(toValue: number, after?: () => void) {
    Animated.timing(progress, {
      toValue,
      duration: toValue ? 230 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished) after?.();
    });
  }
  function close(after?: () => void) {
    if (closing.current) return;
    closing.current = true;
    animate(0, () => {
      onClose();
      after?.();
    });
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onShow={() => {
        if (!closing.current) animate(1);
      }}
      onRequestClose={() => close()}
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: c.shadow,
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.28],
              }),
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss navigation menu"
            style={StyleSheet.absoluteFill}
            onPress={() => close()}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drawerWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            <View style={styles.header}>
              <Text style={styles.brand}>Language Partner</Text>
              <Button
                small
                icon={X}
                label="Close menu"
                onPress={() => close()}
                style={styles.iconButton}
              />
            </View>
            <View style={{ paddingHorizontal: 14 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Today"
                accessibilityState={{ selected: homeSelected }}
                onPress={() => close(onHome)}
                style={({ pressed }) => [styles.item, (homeSelected || pressed) && styles.selected]}
              >
                <Flame color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Today</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New chat"
                onPress={() => close(onNewChat)}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.selected,
                ]}
              >
                <SquarePen color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>New chat</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dictionary"
                accessibilityState={{ selected: dictionarySelected }}
                onPress={() => close(onDictionary)}
                style={({ pressed }) => [
                  styles.item,
                  (dictionarySelected || pressed) && styles.selected,
                ]}
              >
                <BookOpen color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Dictionary</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Saved conversations"
                accessibilityState={{ selected: conversationsSelected }}
                onPress={() => close(onSavedConversations)}
                style={({ pressed }) => [
                  styles.item,
                  (conversationsSelected || pressed) && styles.selected,
                ]}
              >
                <MessagesSquare color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Saved conversations</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Roleplay"
                accessibilityState={{ selected: roleplaySelected }}
                onPress={() => close(onRoleplay)}
                style={({ pressed }) => [styles.item, (roleplaySelected || pressed) && styles.selected]}
              >
                <MessagesSquare color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Roleplay</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Grammar"
                accessibilityState={{ selected: grammarSelected }}
                onPress={() => close(onGrammar)}
                style={({ pressed }) => [
                  styles.item,
                  (grammarSelected || pressed) && styles.selected,
                ]}
              >
                <BookOpenText color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Grammar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Watch and repeat"
                accessibilityState={{ selected: videosSelected }}
                onPress={() => close(onVideos)}
                style={({ pressed }) => [styles.item, (videosSelected || pressed) && styles.selected]}
              >
                <MonitorPlay color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Watch and repeat</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Things to work on"
                accessibilityState={{ selected: issuesSelected }}
                onPress={() => close(onIssues)}
                style={({ pressed }) => [styles.item, (issuesSelected || pressed) && styles.selected]}
              >
                <ListChecks color={c.accent} size={20} strokeWidth={1.8} />
                <Text style={styles.itemText}>Things to work on</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="My stats"
                accessibilityState={{ selected: statsSelected }}
                onPress={() => close(onStats)}
                style={({ pressed }) => [
                  styles.item,
                  (statsSelected || pressed) && styles.selected,
                ]}
              >
                <ChartNoAxesColumnIncreasing
                  color={c.accent}
                  size={20}
                  strokeWidth={1.8}
                />
                <Text style={styles.itemText}>My stats</Text>
              </Pressable>
            </View>
            <Text accessibilityRole="header" style={styles.recents}>
              Recents
            </Text>
            <ScrollView
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            >
              {savedDataStatus && (
                <SavedDataNotice loaded={savedDataStatus.loaded} />
              )}
              {recentConversationThreads(
                conversations,
                savedConversationIds,
              ).map((conversation) => {
                const title = conversationTitle(conversation);
                const selected = conversation.id === activeConversationId;
                return (
                  <Pressable
                    key={conversation.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open conversation: ${title}`}
                    accessibilityState={{ selected }}
                    onPress={() => close(() => onConversation(conversation.id))}
                    style={({ pressed }) => [
                      styles.item,
                      (selected || pressed) && styles.selected,
                    ]}
                  >
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.itemText,
                        { fontWeight: selected ? "500" : "400" },
                      ]}
                    >
                      {title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: c.paper,
    borderRightWidth: 1,
    borderColor: c.line,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  brand: {
    flex: 1,
    color: c.ink,
    fontFamily: fonts.serif,
    fontSize: 23,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  item: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
  },
  itemText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    color: c.ink,
    fontWeight: "500",
  },
  selected: { backgroundColor: c.pale },
  recents: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: c.muted,
    marginTop: 30,
    marginBottom: 10,
    marginHorizontal: 28,
  },
  list: { paddingHorizontal: 14, paddingBottom: 24, gap: 4 },
});
