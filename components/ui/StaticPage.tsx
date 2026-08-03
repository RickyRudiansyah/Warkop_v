import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Footer } from '@/components/ui/Footer';

// Shell halaman statis (FAQ, Refund, S&K, Kontak) — mengikuti pola header
// glass sticky + brand + ThemeToggle yang sama dengan halaman customer lain.
export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-2 flex flex-col">
      <header className="glass sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3">
        <Link
          href="/order"
          aria-label="Kembali ke menu"
          className="p-1 -ml-1 rounded-lg hover:bg-surface-3 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link href="/order" className="text-lg font-bold text-text">Rumipang</Link>
        <ThemeToggle className="ml-auto" />
      </header>

      <article className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">{title}</h1>
        {children}
      </article>

      <Footer />
    </div>
  );
}
