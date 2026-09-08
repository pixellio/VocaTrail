'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2 } from 'lucide-react';

interface LocationQRCodeProps {
  locationId: string;
  locationName: string;
  hasLogo: boolean;
}

const QR_SIZE = 480;
const LOGO_RATIO = 0.2; // logo occupies ~20% of the QR width, safe under 'H' error correction

export default function LocationQRCode({ locationId, locationName, hasLogo }: LocationQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        await QRCode.toCanvas(canvas, locationId, {
          width: QR_SIZE,
          errorCorrectionLevel: 'H',
          margin: 2,
        });

        if (hasLogo) {
          const logo = new window.Image();
          logo.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            logo.onload = () => resolve();
            logo.onerror = () => reject(new Error('Failed to load logo image'));
            logo.src = `/api/locations/${locationId}/logo`;
          });

          if (cancelled) return;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const logoSize = QR_SIZE * LOGO_RATIO;
          const backingSize = logoSize + 16;
          const center = QR_SIZE / 2;

          // White rounded backing square so the logo stays legible against the QR pattern.
          ctx.fillStyle = '#ffffff';
          const radius = 8;
          const x = center - backingSize / 2;
          const y = center - backingSize / 2;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + backingSize, y, x + backingSize, y + backingSize, radius);
          ctx.arcTo(x + backingSize, y + backingSize, x, y + backingSize, radius);
          ctx.arcTo(x, y + backingSize, x, y, radius);
          ctx.arcTo(x, y, x + backingSize, y, radius);
          ctx.closePath();
          ctx.fill();

          ctx.drawImage(logo, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
        }

        if (!cancelled) setIsReady(true);
      } catch (err) {
        console.error('Failed to render QR code:', err);
        if (!cancelled) setError('Failed to render QR code.');
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [locationId, hasLogo]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${locationName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative bg-white p-4 rounded-lg border border-gray-200">
        <canvas ref={canvasRef} width={QR_SIZE} height={QR_SIZE} className="max-w-full h-auto" />
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 size={24} className="animate-spin text-purple-600" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleDownload}
        disabled={!isReady}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        Download QR code
      </button>
    </div>
  );
}
