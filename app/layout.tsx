import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { DevToolsProtection } from "@/components/dev-tools-protection";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScreenScape - Free Movies & Series API | Stream Movies Online | Movie Database API",
  description: "ScreenScape provides free APIs for movies, TV series, and anime streaming. Access comprehensive movie database, episode links, video streaming APIs, and download links. Perfect for developers building movie apps, streaming platforms, and entertainment websites.",
  keywords: [
    "free movie API",
    "streaming API",
    "movie database API",
    "TV series API",
    "anime API",
    "video streaming",
    "movie download API",
    "episode API",
    "entertainment API",
    "media API",
    "movies online",
    "series streaming",
    "movie metadata",
    "IMDb alternative",
    "streaming platform",
    "video links API",
    "movie information API",
    "developer API",
    "REST API movies",
    "JSON movie data"
  ].join(", "),
  authors: [{ name: "ScreenScape Team" }],
  creator: "ScreenScape",
  publisher: "ScreenScape",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://totu.me'), // Replace with your actual domain
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "ScreenScape - Free Movies & Series API Platform",
    description: "Access free APIs for movies, TV series, and anime. Get streaming links, metadata, and episode information for your applications.",
    url: "https://totu.me", // Replace with your actual domain
    siteName: "ScreenScape",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Additional protection script that runs before React
              (function() {
                // Disable right-click immediately
                document.addEventListener('contextmenu', function(e) {
                  e.preventDefault();
                  return false;
                });
                
                // Disable key combinations immediately
                document.addEventListener('keydown', function(e) {
                  // F12
                  if (e.keyCode === 123) {
                    e.preventDefault();
                    window.location.href = 'about:blank';
                    return false;
                  }
                  
                  // Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
                  if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) {
                    e.preventDefault();
                    window.location.href = 'about:blank';
                    return false;
                  }
                  
                  // Ctrl+U
                  if (e.ctrlKey && e.keyCode === 85) {
                    e.preventDefault();
                    window.location.href = 'about:blank';
                    return false;
                  }
                });
                
                // Console detection
                var devtools = {open: false, orientation: null};
                var threshold = 160;
                
                setInterval(function() {
                  if (window.outerHeight - window.innerHeight > threshold || 
                      window.outerWidth - window.innerWidth > threshold) {
                    if (!devtools.open) {
                      devtools.open = true;
                      window.location.href = 'about:blank';
                    }
                  } else {
                    devtools.open = false;
                  }
                }, 500);
                
                // Disable text selection
                document.onselectstart = function() { return false; };
                document.ondragstart = function() { return false; };
                
                // Clear console periodically
                setInterval(function() {
                  console.clear();
                }, 1000);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DevToolsProtection />
            <div className="flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
