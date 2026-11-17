import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "Студенческий портал",
    template: "%s · Студенческий портал",
  },
  description:
    "Единый студенческий портал безбумажного вуза (Student Super-App), Республика Казахстан",
  applicationName: "Student Super-App",
  keywords: [
    "студенческий портал",
    "вуз",
    "Казахстан",
    "расписание",
    "оценки",
    "общежитие",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
