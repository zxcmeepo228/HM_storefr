import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./frontend-polish.css";
import "./violet-electric.css";
import "./mobile-category-menu.css";
import { StorefrontProvider } from "@/components/storefront/storefront-provider";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, siteName } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: { default: "Heymom - товари для здоров’я та турботи про родину", template: "%s | Heymom" },
  description: "Каталог товарів Heymom: ціни, фото, характеристики та актуальна наявність.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "uk_UA", url: "/", siteName, title: "Heymom - товари для здоров’я та турботи про родину", description: "Каталог товарів із фото, характеристиками та цінами." },
  robots: { index: true, follow: true },
};

// Keep the storefront edge-to-edge on phones. People may still zoom in for
// readability, but Chrome cannot zoom out below the designed mobile canvas.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uk" data-scroll-behavior="smooth"><body>
    <JsonLd data={{ "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", "@id": `${absoluteUrl()}/#organization`, name: siteName, url: absoluteUrl() },
      { "@type": "WebSite", "@id": `${absoluteUrl()}/#website`, name: siteName, url: absoluteUrl(), inLanguage: ["uk", "ru"] },
    ] }} />
    <StorefrontProvider><StorefrontShell>{children}</StorefrontShell></StorefrontProvider>
  </body></html>;
}
