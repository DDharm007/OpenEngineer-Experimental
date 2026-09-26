import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "crust by Craftorā - Ai Website Builder",
  description: "Re-imagine any website in seconds with AI-powered website builder.",
  icons: {
    icon: '/c1logo.png',
    shortcut: '/c1logo.png',
    apple: '/c1logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://kit.fontawesome.com/3932dc5d0a.js" crossOrigin="anonymous"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Calistoga&family=Caveat:wght@500;700&family=Cinzel:wght@500;700&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,400&family=DM+Sans:wght@400;500;700&family=Epilogue:wght@500;700&family=Fira+Code:wght@400;500&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,500;0,600;1,400&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@400;600;700&family=Space+Grotesk:wght@400;500;700&family=Syne:wght@600;700;800&family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/craftoralogo.png" sizes="any" />
        <link rel="icon" href="/craftoralogo.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/craftoralogo.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/craftoralogo.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={poppins.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
