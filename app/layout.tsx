import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Helm Lite",
  description: "Linear Solutions internal operations",
  applicationName: "Helm Lite",
  appleWebApp: {
    capable: true,
    title: "Helm Lite",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0e0d",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default to dark; "light" only when the user has chosen it.
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html
      lang="en"
      className={`${theme === "dark" ? "dark" : ""} ${geistSans.variable} ${geistMono.variable} h-full antialiased`.trim()}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
