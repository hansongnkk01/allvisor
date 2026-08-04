import type { Metadata } from "next";
import { DM_Sans, Fraunces, Source_Serif_4, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Allvisor",
  description: "Multi-niche SaaS for clinics and retail businesses in Malaysia",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const niche = cookieStore.get("allvisor_niche")?.value;
  const { isNiche } = await import("@/lib/niches");
  const { nicheThemeAttr } = await import("@/lib/utils");
  const dataNiche = isNiche(niche) ? nicheThemeAttr(niche) : undefined;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${sourceSerif.variable} ${fraunces.variable} h-full`}
      data-niche={dataNiche}
    >
      <head>
        {supabaseUrl ? (
          <>
            <link rel="dns-prefetch" href={supabaseUrl} />
            <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
          </>
        ) : null}
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
