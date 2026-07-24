import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { GardenProvider } from "@/components/garden-provider";
import { PwaSetup } from "@/components/pwa-setup";

export const metadata: Metadata = {
  title: "Plantemon",
  description: "Scan real plants, turn them into creatures, and battle with them.",
  applicationName: "Plantemon",
  appleWebApp: {
    // Lets an installed iOS PWA run without Safari chrome.
    capable: true,
    title: "Plantemon",
    statusBarStyle: "black-translucent",
  },
  // iOS ignores the manifest's icons for the home screen; it needs apple-touch-icon.
  icons: {
    icon: "/img/app_logo.png",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
  other: {
    // Next emits the standardized `mobile-web-app-capable`, but iOS Safari has
    // long keyed off this legacy tag to launch without browser chrome. Both are
    // declared so full-screen mode does not depend on alias support.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Sprout brand green, replacing the purple carried over from the Android theme.
  themeColor: "#203727",
  width: "device-width",
  initialScale: 1,
  // Required for the layout to extend behind the notch and home indicator.
  viewportFit: "cover",
  // Blocks the double-tap zoom that makes tapping game buttons feel broken.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body className="min-h-full antialiased">
          <GardenProvider>
            {children}
            <PwaSetup />
          </GardenProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
