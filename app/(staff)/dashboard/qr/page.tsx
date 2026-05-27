'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';

export default function QRPage() {
  const [tables, setTables] = useState<{ id: string; table_number: number; label: string | null; occupied: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/tables').then(r => r.ok ? r.json() : []),
      fetch('/api/orders').then(r => r.ok ? r.json() : []),
    ]).then(([tablesData, ordersData]) => {
      const activeOrders = ordersData as { table_id?: string }[];
      const occupiedTableIds = new Set(activeOrders.map((o) => o?.table_id).filter(Boolean));
      const tablesWithStatus = (Array.isArray(tablesData) ? tablesData : []).map((t: { id: string; table_number: number; label: string | null }) => ({
        ...t,
        occupied: occupiedTableIds.has(t.id),
      }));
      setTables(tablesWithStatus);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const downloadQR = (tableNumber: number) => {
    const svg = document.getElementById('qr-' + tableNumber);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'qr-meja-' + tableNumber + '.png';
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

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Generate QR Code</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map(table => (
          <div key={table.id} className={'card p-4 flex flex-col items-center ' + (table.occupied ? 'border-warning' : '')}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{table.label || 'Meja ' + table.table_number}</h3>
              <Badge variant={table.occupied ? 'warning' : 'success'}>{table.occupied ? 'Diisi' : 'Kosong'}</Badge>
            </div>
            <QRCodeSVG id={'qr-' + table.table_number} value={baseUrl + '/order?table=' + table.table_number} size={150} />
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => downloadQR(table.table_number)}>
              <Download className="w-4 h-4 mr-1" />Download
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
