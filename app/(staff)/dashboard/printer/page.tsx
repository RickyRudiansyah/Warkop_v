'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PrintJob, PrintJobStatus } from '@/types';
import { Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<PrintJobStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'info' }> = {
  PENDING: { label: 'Menunggu Printer', variant: 'warning' },
  PRINTING: { label: 'Sedang Dicetak', variant: 'info' },
  PRINTED: { label: 'Tercetak', variant: 'success' },
  FAILED: { label: 'Gagal', variant: 'danger' },
};

const triggerLabel: Record<string, string> = {
  QRIS_SETTLED: 'QRIS lunas otomatis',
  CASH_VERIFIED: 'Cash diverifikasi kasir',
  CASHIER_PAID_ORDER: 'Order manual kasir (lunas)',
  STAFF_REPRINT: 'Cetak ulang manual',
};

export default function PrinterPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Isi struk TIDAK ikut di daftar (lihat catatan di app/api/print/jobs/route.ts).
  // Ditarik saat tombolnya ditekan, satu job saja.
  const [preview, setPreview] = useState<PrintJob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/print/jobs', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      else toast.error(data.error || 'Gagal memuat antrian cetak');
    } catch { toast.error('Gagal menghubungi server'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
    const channel = supabase
      .channel('print-jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_jobs' }, () => { fetchJobs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchJobs]);

  const openPreview = async (job: PrintJob) => {
    setPreview(job);
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/print/jobs?id=' + job.id, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.job) setPreview(data.job as PrintJob);
      else toast.error(data.error || 'Gagal memuat isi struk');
    } catch { toast.error('Gagal menghubungi server'); }
    setPreviewLoading(false);
  };

  const handleRetry = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/print/jobs/' + id + '/retry', { method: 'POST' });
      if (res.ok) { toast.success('Job dikembalikan ke antrian'); await fetchJobs(); }
      else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal mengulang cetak');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setBusyId(null);
  };

  const pendingCount = jobs.filter(j => j.status === 'PENDING' || j.status === 'PRINTING').length;
  const failedCount = jobs.filter(j => j.status === 'FAILED').length;

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Antrian Printer</h2>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Badge variant="warning">{pendingCount} antri</Badge>}
          {failedCount > 0 && <Badge variant="danger">{failedCount} gagal</Badge>}
          <Button variant="ghost" size="sm" onClick={fetchJobs} aria-label="Muat ulang">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4">
        Struk otomatis masuk antrian saat pembayaran QRIS lunas, atau saat kasir memverifikasi
        pembayaran cash. Aplikasi printer Android menarik antrian ini lalu mencetak ke printer Bluetooth.
      </p>

      {jobs.length === 0 ? (
        <EmptyState icon={<Printer className="w-12 h-12" />} title="Belum ada struk" description="Struk akan muncul di sini setelah ada pembayaran lunas" />
      ) : (
        <div className="space-y-3" aria-live="polite">
          {jobs.map(job => {
            const config = statusConfig[job.status] || { label: job.status, variant: 'default' as const };
            const payload = job.payload as { order_no?: string; table_label?: string; total?: number };
            return (
              <div key={job.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold">
                      #{payload.order_no || job.order_id.slice(0, 8)}
                      <span className="text-text-secondary font-normal"> · {payload.table_label || '-'}</span>
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {triggerLabel[job.trigger ?? ''] || job.trigger || '-'} · {formatDate(job.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {job.kind === 'REPRINT' && <Badge variant="default">Cetak Ulang</Badge>}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-primary">{formatCurrency(payload.total ?? 0)}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openPreview(job)}>Lihat Struk</Button>
                    {(job.status === 'FAILED' || job.status === 'PRINTED') && (
                      <Button variant="secondary" size="sm" loading={busyId === job.id} disabled={busyId === job.id} onClick={() => handleRetry(job.id)}>
                        Cetak Lagi
                      </Button>
                    )}
                  </div>
                </div>

                {job.last_error && (
                  <p className="text-sm text-danger mt-2 bg-danger/5 rounded-lg px-3 py-2">
                    {job.last_error} (percobaan ke-{job.attempts})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
          <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <h3 id="preview-title" className="text-lg font-bold mb-3">Pratinjau Struk</h3>
            {previewLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <pre className="text-xs font-mono whitespace-pre overflow-x-auto bg-surface-2 rounded-lg p-3 mb-4">{preview.text_body}</pre>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setPreview(null)}>Tutup</Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
