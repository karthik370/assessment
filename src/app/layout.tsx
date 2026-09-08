import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PTW — Permit to Work System",
  description: "Permit to Work management module for CMMS. Manage safety permits for hot work, confined space entry, working at height, and electrical isolation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-black text-slate-100 min-h-screen selection:bg-amber-400/20 selection:text-amber-300`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
