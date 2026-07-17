import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import SupabaseProvider from "@/providers/supabase-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Axiom — API Testing & QA Platform",
  description: "Powerful mobile-first API client and testing suite, now on the web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SupabaseProvider>
            <TooltipProvider>
              {children}
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
