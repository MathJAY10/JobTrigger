import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uttarakhand Job Radar | 10:00 AM IST Automated Cron",
  description:
    "Production-ready serverless automated job scraper for Uttarakhand Co-operative, Apex Bank, High Court & UKPSC portals with instant Telegram push alerts.",
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
