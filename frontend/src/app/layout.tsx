import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from '../components/ClientLayout';
import AppProviders from '../components/AppProviders';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Femida Admin",
  description: "Административная панель пансионата Фемида",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} antialiased bg-gray-50`}>
        <AppProviders>
          <ClientLayout>{children}</ClientLayout>
        </AppProviders>
      </body>
    </html>
  );
}
