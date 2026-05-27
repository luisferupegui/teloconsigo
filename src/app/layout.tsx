import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/components/toast";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { WishlistProvider } from "@/lib/wishlist";
import { CompareProvider } from "@/lib/compare";
import { CompareBar } from "@/components/compare-bar";
import { ScrollToTop } from "@/components/scroll-to-top";

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
    title: "Te lo Consigo",
    description:
      "Tecnología con atención personalizada. Te lo conseguimos.",
    type: "website",
    locale: "es_CO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CO"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e8edf5] text-zinc-900 font-sans">
        <ToastProvider>
          <WishlistProvider>
            <CompareProvider>
              <CartProvider>
                <ScrollToTop />
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
                <FloatingWhatsApp />
                <CompareBar />
              </CartProvider>
            </CompareProvider>
          </WishlistProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
