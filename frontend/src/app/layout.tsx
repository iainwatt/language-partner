import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { landingCopy } from "@/content/landing";
const sans = localFont({src:[{path:"./fonts/IBMPlexSans-Regular.woff2",weight:"400",style:"normal"},{path:"./fonts/IBMPlexSans-SemiBold.woff2",weight:"600",style:"normal"}],display:"swap",variable:"--font-sans"});
const display = localFont({src:[{path:"./fonts/PlayfairDisplay-Regular.ttf",weight:"400",style:"normal"},{path:"./fonts/PlayfairDisplay-Italic.ttf",weight:"400",style:"italic"}],display:"swap",variable:"--font-display"});
export const metadata: Metadata = {
  title: "Language Partner — Learn languages naturally",
  description: landingCopy.description,
  robots: {index:false,follow:false},
  openGraph: {title:"Language Partner — Learn languages naturally",description:landingCopy.description,type:"website"},
  icons: {icon:"/language-partner-mark.svg",apple:"/language-partner-icon.png"},
};
export const viewport: Viewport = {width:"device-width",initialScale:1,themeColor:"#f7f5f0"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="en" className={`${sans.variable} ${display.variable}`}><body>{children}</body></html>;
}
