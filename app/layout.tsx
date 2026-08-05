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
  title: "Helm",
  description: "Linear Solutions internal operations",
  applicationName: "Helm",
  appleWebApp: {
    capable: true,
    title: "Helm",
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
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";
  const collapsed =
    cookieStore.get("sidebar")?.value === "collapsed" ? "sidebar-collapsed" : "";
  return (
    <html
      lang="en"
      className={`${theme === "dark" ? "dark" : ""} ${collapsed} ${geistSans.variable} ${geistMono.variable} h-full antialiased`.trim()}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
