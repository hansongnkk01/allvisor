import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
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
  const dataNiche = niche === "retail" || niche === "clinic" ? niche : undefined;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html
      className={`${dmSans.variable} h-full`}
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
