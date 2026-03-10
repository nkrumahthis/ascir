import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ascir.org"),
  title: "ASCIR | China-Africa Research and Policy Analysis from Accra",
  description:
    "The Afro-Sino Centre of International Relations (ASCIR) publishes research, policy analysis, and institutional updates on Africa-China engagement from Accra, Ghana.",
  openGraph: {
    title: "ASCIR | China-Africa Research and Policy Analysis from Accra",
    description:
      "Independent Africa-China research, policy briefs, and institutional updates from the Afro-Sino Centre of International Relations.",
    url: "https://ascir.org",
    siteName: "ASCIR",
    locale: "en_GH",
    type: "website",
    images: [
      {
        url: "/ascir/logo.png",
        width: 1200,
        height: 630,
        alt: "ASCIR logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCIR | China-Africa Research and Policy Analysis from Accra",
    description:
      "Independent Africa-China research, policy briefs, and institutional updates from ASCIR.",
    images: ["/ascir/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
