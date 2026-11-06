import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SmartHub AgroChain | Agricultural Sourcing in Nigeria", template: "%s | SmartHub AgroChain" },
  description: "SmartHub AgroChain is building an organised approach to connecting agricultural supply with real market demand in Nigeria.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <head>
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap" />
    </head>
    <body className="font-sans">{children}</body>
  </html>;
}
