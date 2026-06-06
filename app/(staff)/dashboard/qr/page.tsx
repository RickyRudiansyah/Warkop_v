'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@/types';

export default function QRPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNumber, setNewNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTables = useCallback(() => {
    fetch('/api/tables')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { setTables(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const orderUrl = baseUrl + '/order';

  const downloadQR = () => {
    const svg = document.getElementById('qr-general');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'qr-warkop.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    try {
      const bytes = new TextEncoder().encode(svgData);
      const binary = String.fromCharCode(...bytes);
      img.src = 'data:image/svg+xml;base64,' + btoa(binary);
    } catch {
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    }
  };

  const handleAddTable = async () => {
    const num = parseInt(newNumber);
    if (!num || num <= 0) { toast.error('Masukkan nomor meja yang valid'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: num }),
      });
      if (res.ok) {
        const created = await res.json();
        setTables(prev => [...prev.filter(t => t.id !== created.id), created].sort((a, b) => a.table_number - b.table_number));
        setNewNumber('');
        toast.success('Meja ' + num + ' ditambahkan');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Gagal menambah meja');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setAdding(false);
  };

  const handleDeleteTable = async (id: string, number: number) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/tables?id=' + id, { method: 'DELETE' });
      if (res.ok) {
        setTables(prev => prev.filter(t => t.id !== id));
        toast.success('Meja ' + number + ' dihapus');
      } else {
        toast.error('Gagal menghapus meja');
      }
    } catch { toast.error('Gagal menghubungi server'); }
    setDeletingId(null);
  };

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">QR Code & Meja</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6 flex flex-col items-center text-center">
          <h3 className="font-semibold mb-1">QR Code Pemesanan</h3>
          <p className="text-sm text-text-secondary mb-4">Cetak satu QR ini untuk seluruh warung. Pelanggan memilih nomor meja saat checkout.</p>
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG id="qr-general" value={orderUrl} size={220} />
          </div>
          <p className="text-xs text-text-secondary mt-3 break-all">{orderUrl}</p>
          <Button variant="primary" className="mt-4" onClick={downloadQR}>
            <Download className="w-4 h-4 mr-1" />Download QR
          </Button>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-1">Kelola Meja</h3>
          <p className="text-sm text-text-secondary mb-4">Daftar meja yang bisa dipilih pelanggan saat checkout.</p>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              min={1}
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTable(); }}
              placeholder="Nomor meja baru"
              className="flex-1 px-3 py-2 border rounded-lg bg-surface"
              aria-label="Nomor meja baru"
            />
            <Button onClick={handleAddTable} disabled={adding} loading={adding}>
              <Plus className="w-4 h-4 mr-1" />Tambah
            </Button>
          </div>
          {tables.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-6">Belum ada meja. Tambahkan minimal satu meja.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tables.map(table => (
                <div key={table.id} className="flex items-center justify-between px-3 py-2 border rounded-lg bg-surface-2">
                  <span className="font-medium text-sm">{table.label || 'Meja ' + table.table_number}</span>
                  <button
                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                    disabled={deletingId === table.id}
                    className="p-1 text-danger disabled:opacity-50"
                    aria-label={'Hapus meja ' + table.table_number}
                  >
                    {deletingId === table.id ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
