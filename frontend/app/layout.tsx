import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaWall — общая галерея",
  description: "Загружайте и смотрите фотографии и видео вместе",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
