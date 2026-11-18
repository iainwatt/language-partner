import React, { createContext, useContext } from "react";
import { Text, type TextProps } from "react-native";
import { useFonts } from "expo-font";
import { fonts } from "./fonts";

// Keep the display experiment separate from body text, controls and the compact
// grammar guide. All faces are bundled, so opening the app needs no font download.
const displayFonts = {
  PartnerDisplay: require("../../assets/fonts/playfair-display/PlayfairDisplay-Regular.ttf"),
  PartnerDisplayMedium: require("../../assets/fonts/playfair-display/PlayfairDisplay-Medium.ttf"),
  PartnerDisplayItalic: require("../../assets/fonts/playfair-display/PlayfairDisplay-Italic.ttf"),
};
const DisplayFontsLoaded = createContext(false);

export function DisplayTypography({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts(displayFonts);
  // Font loading must never hold up authentication or access to saved lessons.
  // A failed load leaves the existing system serif in place.
  return <DisplayFontsLoaded.Provider value={loaded}>{children}</DisplayFontsLoaded.Provider>;
}

export function DisplayText({
  italic = false,
  medium = false,
  style,
  ...props
}: TextProps & { italic?: boolean; medium?: boolean }) {
  const loaded = useContext(DisplayFontsLoaded);
  return <Text {...props} style={[
    style,
    {
      fontFamily: loaded
        ? italic ? "PartnerDisplayItalic" : medium ? "PartnerDisplayMedium" : "PartnerDisplay"
        : fonts.serif,
      // Each alias loads a specific face, including its actual weight.
      fontWeight: !loaded && medium ? "500" : "400",
      // The bundled italic face contains its own slant; don't synthesise one.
      fontStyle: !loaded && italic ? "italic" : "normal",
    },
  ]} />;
}
