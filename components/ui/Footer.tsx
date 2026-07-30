import Link from 'next/link';

const links = [
  { href: '/order', label: 'Menu' },
  { href: '/faq', label: 'FAQ' },
  { href: '/refund-policy', label: 'Kebijakan Refund' },
  { href: '/terms-and-conditions', label: 'Syarat & Ketentuan' },
  { href: '/kontak', label: 'Kontak' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-lg font-bold text-primary">Rumipang</p>
        <p className="text-sm text-text-secondary mt-1">
          Pesan lewat QR di meja, tanpa antri ke kasir.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-text-secondary hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-text-secondary mt-6">
          © {new Date().getFullYear()} Rumipang. Semua hak dilindungi.
        </p>
      </div>
    </footer>
  );
}
