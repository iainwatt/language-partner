import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogSection } from "@/components/BlogSection";

export const metadata: Metadata = {
  title: "Notes on learning languages · Language Partner",
  description: "Upcoming writing on emotion, memory and making repetition interesting.",
};

export default function Blog() {
  return <div id="top"><Header/><main id="main-content"><BlogSection standalone/></main><Footer/></div>;
}
