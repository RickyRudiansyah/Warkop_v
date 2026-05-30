'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';

export default function QRPage() {
  const [loading] = useState(false);

  const downloadQR = () => {
    const svg = document.getElementById('qr-generic');
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

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) return <DashboardLayout><Spinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold mb-4">Generate QR Code</h2>
      <p className="text-text-secondary mb-6">Satu QR untuk semua meja. Customer akan diminta memasukkan nomor meja setelah scan.</p>
      <div className="card p-6 flex flex-col items-center max-w-sm mx-auto">
        <h3 className="font-semibold mb-3">Scan untuk Pesan</h3>
        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG id="qr-generic" value={baseUrl + '/order'} size={200} />
        </div>
        <Button variant="primary" size="lg" className="mt-4 w-full" onClick={downloadQR}>
          <Download className="w-4 h-4 mr-2" />Download QR Code
        </Button>
        <p className="text-xs text-text-secondary mt-3 text-center">
          Tempel QR ini di setiap meja. Customer scan lalu masukkan nomor meja.
        </p>
      </div>
    </DashboardLayout>
  );
}
