import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bitzsol CRM | Enterprise Relationship Management",
  description: "Accelerate your business growth with Bitzsol CRM. The next-generation platform for enterprise-grade customer relationship management.",
  keywords: ["CRM", "Enterprise", "Bitzsol", "Relationship Management", "Business Growth"],
  authors: [{ name: "Bitzsol Team" }],
  openGraph: {
    title: "Bitzsol CRM",
    description: "Enterprise Relationship Management redefined.",
    url: "https://bitzsol-crm.com",
    siteName: "Bitzsol CRM",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${geistMono.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="antialiased selection:bg-primary selection:text-primary-foreground min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
