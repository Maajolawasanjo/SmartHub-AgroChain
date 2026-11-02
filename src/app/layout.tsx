import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SmartHub AgroChain | Agricultural Sourcing in Nigeria", template: "%s | SmartHub AgroChain" },
  description: "SmartHub AgroChain is building an organised approach to connecting agricultural supply with real market demand in Nigeria.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
