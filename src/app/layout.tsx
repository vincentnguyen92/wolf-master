import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ZoomLock } from "../components/ZoomLock";
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
    <html lang="vi">
      <body>
        <ZoomLock />
        {children}
      </body>
    </html>
  );
}
