import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { getServerSession } from "@/lib/auth/session";
import AuthProvider from "@/components/auth/auth-provider";
import { ConversationProvider } from "@/components/conversation-provider";
import { Suspense } from "react";
import AuthLoading from "@/components/auth/auth-loading";
import { GlobalRecorder } from "@/components/global-recorder";
import { PersistentBackground } from "@/components/ui/persistent-background";
import { PageTransition } from "@/components/ui/page-transition";
import { PersistentSidebar } from "@/components/persistent-sidebar";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "ILoveLawyer - AI Legal Assistant",
  description: "AI Legal Assistant",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    user = await getServerSession();
  } catch (error) {
    console.error("Failed to retrieve session in RootLayout", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className="antialiased bg-background text-on-background font-body-md" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<AuthLoading />}>
            <AuthProvider initialUser={user}>
              <ConversationProvider>
                <PersistentBackground />
                <div className="flex h-screen w-full relative overflow-hidden bg-transparent">
                  <PersistentSidebar />
                  <div className="flex-1 flex flex-col relative h-full overflow-y-auto overflow-x-hidden scrollbar-hide">
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </div>
                </div>
                <GlobalRecorder />
              </ConversationProvider>
            </AuthProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
