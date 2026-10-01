import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ZoomLock } from "../components/ZoomLock";
import { Haptics } from "../components/Haptics";
// Bundled at build time so the offline PWA never fetches fonts.
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});
const title = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-title",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Làng Trăng — Sổ tay quản trò Ma Sói",
  description:
    "Bộ nhớ thứ hai của quản trò. Điều hành Ma Sói, lưu diễn biến, kể chuyện cuối ván. Hoạt động offline.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Làng Trăng",
  },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#101a25",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${body.variable} ${title.variable}`}>
      <body>
        <ZoomLock />
        <Haptics />
        {children}
      </body>
    </html>
  );
}
