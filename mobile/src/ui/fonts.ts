import { Platform } from "react-native";

export const fonts = {
  sans: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  }),
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia, 'Times New Roman', serif",
  }),
};
