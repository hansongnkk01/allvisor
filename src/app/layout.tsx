import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
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
      className={`${plusJakarta.variable} ${instrument.variable} h-full`}
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
