// Penanda data yang perlu dilengkapi pemilik bisnis sebelum submit ke iPaymu.
// Ganti seluruh teks [ISI_DI_SINI — ...] dengan data asli, lalu boleh hapus komponen ini.
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline rounded bg-warning/20 px-1.5 py-0.5 font-semibold text-text">
      [ISI_DI_SINI — {children}]
    </span>
  );
}
