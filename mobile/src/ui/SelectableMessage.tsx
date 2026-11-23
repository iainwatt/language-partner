import React, { useState } from "react";
import { useWindowDimensions, type ViewProps } from "react-native";
import { requireNativeViewManager } from "expo-modules-core";
import { type Message } from "../core/domain";
import {
  phraseRange,
  type PhraseRange,
  type PhraseSelectionEvent,
} from "../core/selection";
import type { TextAccentRange } from "../core/grammarAccent";

export type SelectableMessageProps = {
  message: Message;
  enabled: boolean;
  compact?: boolean;
  accentRanges?: TextAccentRange[];
  // Colours for text on a dark background, as "#RRGGBB".
  textColor?: string;
  accentColor?: string;
  // Called as the learner starts and stops highlighting words.
  onSelecting?: (active: boolean) => void;
  // A short tap on the text. A long press still starts a selection.
  onPress?: () => void;
  onSelect: (range: PhraseRange) => void;
};
type NativeProps = ViewProps & {
  text: string;
  selectionEnabled: boolean;
  fontScale: number;
  serif: boolean;
  accentRanges: string;
  textColor: string;
  accentColor: string;
  onSelecting: (event: { nativeEvent: { active: boolean } }) => void;
  onTap: () => void;
  onSavePhrase: (event: { nativeEvent: PhraseSelectionEvent }) => void;
  onContentHeight: (event: { nativeEvent: { height: number } }) => void;
};
const NativeMessage = requireNativeViewManager<NativeProps>("PhraseSelection");

export function SelectableMessage({
  message,
  enabled,
  compact = false,
  accentRanges = [],
  textColor = "",
  accentColor = "",
  onSelecting,
  onPress,
  onSelect,
}: SelectableMessageProps) {
  const { fontScale } = useWindowDimensions();
  const typographyScale = fontScale * (compact ? 0.9 : 1);
  const [height, setHeight] = useState(27 * typographyScale);
  return (
    <NativeMessage
      style={{ width: "100%", height }}
      text={message.text}
      selectionEnabled={enabled && message.final}
      fontScale={typographyScale}
      serif={message.role === "assistant"}
      accentRanges={JSON.stringify(accentRanges)}
      textColor={textColor}
      accentColor={accentColor}
      onSelecting={({ nativeEvent }) => onSelecting?.(nativeEvent.active)}
      onTap={() => onPress?.()}
      onContentHeight={({ nativeEvent }) => {
        if (Number.isFinite(nativeEvent.height) && nativeEvent.height > 0)
          setHeight(Math.ceil(nativeEvent.height));
      }}
      onSavePhrase={({ nativeEvent }) => {
        if (!enabled) return;
        const range = phraseRange(message, nativeEvent);
        if (range) onSelect(range);
      }}
    />
  );
}
