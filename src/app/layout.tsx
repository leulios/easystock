import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyStock | Multi-Tenant Inventory & Shop Management SaaS",
  description: "Enterprise-grade inventory, point of sale, and multi-shop operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
