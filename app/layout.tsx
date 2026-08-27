import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_PRESET, presetFromSettingsValue, type ThemePreset } from "@/lib/theme";
import { Toaster } from "sonner";

// Preset tema disimpan di database dan diubah owner lewat aplikasi kasir, jadi
// halaman tidak boleh diprerender dengan nilai saat build — nanti tema event
// membeku sampai deploy berikutnya.
export const dynamic = "force-dynamic";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rumipang Ordering",
  description: "Sistem pemesanan QR untuk warkop dan kafe",
};

async function getThemePreset(): Promise<ThemePreset> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_settings").select("value").eq("key", "theme").maybeSingle();
    if (error) return DEFAULT_PRESET;
    return presetFromSettingsValue(data?.value);
  } catch {
    // Database tak terjangkau tidak boleh menjatuhkan seluruh situs hanya karena
    // warna — jatuh ke tampilan normal.
    return DEFAULT_PRESET;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Dirender di server supaya tema event sudah benar pada cat pertama; kalau
  // dipasang dari klien, pengunjung sempat melihat tema normal lebih dulu.
  const preset = await getThemePreset();

  return (
    <html
      lang="id"
      data-preset={preset}
      className={`h-full antialiased ${playfair.variable} ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col bg-surface-2 font-sans">
        <ThemeProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:bg-primary focus:text-[color:var(--color-on-primary)] focus:rounded-lg">Lewati ke konten utama</a>
          <AuthProvider>
            <CartProvider>
              <main id="main-content" className="flex-1">{children}</main>
              <Toaster position="top-center" richColors duration={3000} closeButton />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
