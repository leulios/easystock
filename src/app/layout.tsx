import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "EasyStock | Simple Retail & Shop Management",
  description: "Point of sale, stock tracking, and sales management in English and Amharic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

