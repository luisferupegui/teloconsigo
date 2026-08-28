import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, Bebas_Neue } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { loadCategories } from "@/lib/categories";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/components/toast";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { WishlistProvider } from "@/lib/wishlist";
import { CompareProvider } from "@/lib/compare";
import { CompareBar } from "@/components/compare-bar";
import { ScrollToTop } from "@/components/scroll-to-top";
import { JsonLd } from "@/components/json-ld";
import { WebMcpTools } from "@/components/webmcp-tools";
import { organizationSchema, websiteSchema } from "@/lib/seo";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-nav",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://teloconsigo.co"),
  title: {
    default: "Te lo Consigo — Tecnología con atención personalizada",
    template: "%s | Te lo Consigo",
  },
  description:
    "Tienda de tecnología en Colombia. Componentes para PC, periféricos y asesor IA para armar tu equipo. Si no lo encuentras, te lo conseguimos.",
  keywords: [
    "tecnología Colombia",
    "componentes PC",
    "armar PC",
    "procesadores",
    "tarjetas gráficas",
    "memoria RAM",
    "teloconsigo",
  ],
  openGraph: {
    title: "Te lo Consigo — Tecnología con atención personalizada",
    description:
      "Tecnología con atención personalizada. Componentes, periféricos y equipos para empresas. Si no lo encuentras, te lo conseguimos.",
    type: "website",
    locale: "es_CO",
    url: "https://teloconsigo.co",
    siteName: "Te lo Consigo",
    images: [
      {
        url: "/hero-banner.png",
        width: 1200,
        height: 630,
        alt: "Te lo Consigo — Tecnología con atención personalizada",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Te lo Consigo — Tecnología con atención personalizada",
    description: "Tecnología con atención personalizada. Si no lo encuentras, te lo conseguimos.",
    images: ["/hero-banner.png"],
  },
  // Sin canonical el mismo contenido servido desde varias URLs (con y sin www,
  // con parámetros de campaña) se cuenta como contenido duplicado.
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html
      lang="es-CO"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e8edf5] text-zinc-900 font-sans">
        {/* Identidad del negocio para Google: quiénes somos, dónde estamos, cómo
            contactarnos y cuál es el buscador del sitio. Va una sola vez, aquí:
            las páginas concretas solo añaden lo suyo (Product, ItemList…). */}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        {/* Herramientas del sitio para un agente en el navegador (solo lectura). */}
        <WebMcpTools />
        <ToastProvider>
          <WishlistProvider>
            <CompareProvider>
              <CartProvider>
                <ScrollToTop />
                {!isAdmin && <Navbar categories={loadCategories()} />}
                <main className="flex-1">{children}</main>
                {!isAdmin && <Footer />}
                {!isAdmin && <FloatingWhatsApp />}
                {!isAdmin && <CompareBar />}
              </CartProvider>
            </CompareProvider>
          </WishlistProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
