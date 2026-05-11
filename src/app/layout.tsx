import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BrandStyle } from "@/components/brand-style";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { getSessionUser } from "@/lib/auth";
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
  title: {
    default: "time-app.nl",
    template: "%s · time-app.nl",
  },
  description: "Eenvoudig uren bijhouden, klanten en facturen beheren. Zonder gedoe.",
  applicationName: "time-app.nl",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "time-app",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "time-app.nl",
    description: "Eenvoudig uren bijhouden, klanten en facturen beheren. Zonder gedoe.",
    type: "website",
    locale: "nl_NL",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const accent = user?.profile?.accent_kleur ?? "#E8732A";
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <BrandStyle accent={accent} />
        {children}
        <Toaster richColors position="top-right" />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
