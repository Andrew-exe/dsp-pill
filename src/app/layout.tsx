import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import "./globals.css";
import { WalkthroughProvider } from "@/components/studio/WalkthroughProvider";

export const metadata: Metadata = {
  title: "dsp-pill Personalized Formulation Studio",
  description: "Synthetic-data hackathon prototype of a personalized formulation walkthrough.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ivory">
      <body className="bg-ivory font-sans text-ink antialiased"><WalkthroughProvider>{children}</WalkthroughProvider></body>
    </html>
  );
}
