import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Warkop QR Ordering",
  description: "Sistem pemesanan QR untuk warkop dan kafe",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif' }}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg">Lewati ke konten utama</a>
        <AuthProvider>
          <CartProvider>
            <main id="main-content" className="flex-1">{children}</main>
            <Toaster position="top-center" richColors duration={3000} closeButton />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
