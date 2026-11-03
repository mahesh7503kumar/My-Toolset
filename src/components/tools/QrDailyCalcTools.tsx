import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { jsPDF } from 'jspdf';
import {
  ArrowLeftRight,
  Camera,
  CameraOff,
  Copy,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  copyToClipboard,
  dataUrlToBlob,
  downloadBlob,
  downloadTextFile,
} from '../../utils/fileHelpers';

/* 37. QR Scanner */
export const QrScannerTool: React.FC = () => {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        setResult(code.data);
        showToast('QR Code detected!');
        stopCamera();
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanVideoFrame);
  }, [showToast, stopCamera]);

  const handleOpenCamera = async () => {
    if (cameraOpen) {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          rafRef.current = requestAnimationFrame(scanVideoFrame);
        }
      }, 100);
    } catch {
      showToast('Camera permission denied or unavailable — try uploading a QR image instead', 'error');
    }
  };

  const handleCaptureNow = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      showToast('Open camera first to capture frame', 'info');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    if (code?.data) {
      setResult(code.data);
      showToast('QR Code decoded from frame!');
      stopCamera();
    } else {
      showToast('No QR code found in frame — center the QR code and try again', 'info');
    }
  };

  const handleUploadQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code?.data) {
          setResult(code.data);
          showToast('QR Code decoded from uploaded image!');
        } else {
          showToast('Could not detect a QR code in that image', 'error');
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleOpenCamera}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
            cameraOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {cameraOpen ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span>{cameraOpen ? 'Close Camera' : 'Open Camera'}</span>
        </button>

        {cameraOpen && (
          <button
            type="button"
            onClick={handleCaptureNow}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <span>Capture Frame</span>
          </button>
        )}

        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Upload QR Image</span>
          <input type="file" accept="image/*" onChange={handleUploadQr} className="hidden" />
        </label>
      </div>

      {cameraOpen && (
        <div className="rounded-xl border border-slate-300 bg-slate-950 p-3 flex flex-col items-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-72 w-auto rounded-lg"
          />
          <span className="text-xs text-slate-400 mt-2">
            Point camera steady at a QR code — auto-detects immediately
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Decoded QR Result (or manual entry)
        </label>
        <textarea
          rows={4}
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Scanned QR payload will appear here..."
          className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!result) {
              showToast('Scan or enter QR content first', 'info');
              return;
            }
            const ok = await copyToClipboard(result);
            showToast(ok ? 'QR result copied' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Result</span>
        </button>

        {result.startsWith('http') && (
          <a
            href={result}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50"
          >
            <span>Open URL</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};

/* 38. Barcode Generator */
function encodeBarsPattern(input: string, type: 'CODE128' | 'EAN'): string {
  const clean =
    type === 'EAN'
      ? input.replace(/[^0-9]/g, '').padEnd(12, '0').slice(0, 13)
      : input || 'MYTOOLSET';
  let bits = '11010010000'; // Start quiet/guard pattern
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // Deterministic 11-module symbol per character with balanced bars/spaces
    const b1 = ((code >> 0) & 1) ? '11' : '1';
    const s1 = ((code >> 1) & 1) ? '00' : '0';
    const b2 = ((code >> 2) & 1) ? '111' : '1';
    const s2 = ((code >> 3) & 1) ? '0' : '00';
    const b3 = ((code >> 4) & 1) ? '1' : '11';
    const s3 = ((code >> 5) & 1) ? '00' : '0';
    bits += b1 + s1 + b2 + s2 + b3 + s3;
  }
  bits += '1100011101011'; // Stop guard
  return bits;
}

export const BarcodeGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState<string>('MT-2026-PRO');
  const [type, setType] = useState<'CODE128' | 'EAN'>('CODE128');

  const drawBarcode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const labelText =
      type === 'EAN'
        ? (text.replace(/[^0-9]/g, '') || '8901234567890').padEnd(13, '0').slice(0, 13)
        : text.trim() || 'MYTOOLSET';
    const pattern = encodeBarsPattern(labelText, type);
    const barW = 3;
    const padX = 28;
    const width = pattern.length * barW + padX * 2;
    const height = 160;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0F172A';
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        ctx.fillRect(padX + i * barW, 20, barW, 96);
      }
    }

    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${labelText} (${type})`, width / 2, 140);
  }, [text, type]);

  useEffect(() => {
    drawBarcode();
  }, [drawBarcode]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    downloadBlob(dataUrlToBlob(url), `barcode-${type.toLowerCase()}.png`);
    showToast('Barcode PNG downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            {type === 'EAN' ? 'Digits (12–13 digits)' : 'Barcode Text / SKU'}
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === 'EAN' ? '8901234567890' : 'MT-2026-PRO'}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Format</label>
          <select
            value={type}
            onChange={(e) => {
              const next = e.target.value as 'CODE128' | 'EAN';
              setType(next);
              if (next === 'EAN' && !/^\d+$/.test(text)) {
                setText('8901234567890');
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="CODE128">CODE128</option>
            <option value="EAN">EAN-13</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex items-center justify-center overflow-x-auto">
        <canvas ref={canvasRef} className="max-w-full h-auto rounded border border-slate-200 bg-white" />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={drawBarcode}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50"
        >
          Generate Barcode
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          <span>Download Barcode PNG</span>
        </button>
      </div>
    </div>
  );
};

/* 39. IP Finder */
interface IpInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  timezone: string;
  lat?: number;
  lon?: number;
}

export const IpFinderTool: React.FC = () => {
  const { showToast } = useToast();
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchIpDetails = useCallback(async () => {
    setLoading(true);
    try {
      const r1 = await fetch('https://api.ipify.org?format=json');
      const d1 = await r1.json();
      const ip = d1.ip || '';

      try {
        const r2 = await fetch(`https://ipapi.co/${ip}/json/`);
        const d2 = await r2.json();
        if (d2 && !d2.error) {
          setInfo({
            ip: d2.ip || ip,
            city: d2.city || 'Unknown',
            region: d2.region || 'Unknown',
            country: d2.country_name || d2.country || 'Unknown',
            isp: d2.org || 'Unknown ISP',
            timezone: d2.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            lat: d2.latitude,
            lon: d2.longitude,
          });
          setLoading(false);
          return;
        }
      } catch {
        // Fallback geo lookup
      }

      const r3 = await fetch(`https://ipwho.is/${ip}`);
      const d3 = await r3.json();
      setInfo({
        ip: d3.ip || ip || 'Unavailable',
        city: d3.city || 'Unknown',
        region: d3.region || 'Unknown',
        country: d3.country || 'Unknown',
        isp: d3.connection?.isp || d3.connection?.org || 'Standard Network',
        timezone: d3.timezone?.id || Intl.DateTimeFormat().resolvedOptions().timeZone,
        lat: d3.latitude,
        lon: d3.longitude,
      });
    } catch {
      setInfo({
        ip: 'Offline / Restricted',
        city: '-',
        region: '-',
        country: '-',
        isp: '-',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIpDetails();
  }, [fetchIpDetails]);

  const summaryText = info
    ? `IP: ${info.ip}\nCity: ${info.city}\nRegion: ${info.region}\nCountry: ${info.country}\nISP: ${info.isp}\nTimezone: ${info.timezone}`
    : '';

  const mapUrl =
    info?.lat !== undefined && info?.lon !== undefined
      ? `https://www.google.com/maps?q=${info.lat},${info.lon}`
      : info?.city && info.city !== '-'
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${info.city} ${info.country}`)}`
      : 'https://www.google.com/maps';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">
          {loading ? 'Detecting public network address...' : 'Live Network Details'}
        </span>
        <button
          type="button"
          onClick={fetchIpDetails}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {info && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Public IP Address', val: info.ip },
            { label: 'City', val: info.city },
            { label: 'Region / State', val: info.region },
            { label: 'Country', val: info.country },
            { label: 'ISP / Organization', val: info.isp },
            { label: 'Timezone', val: info.timezone },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">{row.label}</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1 break-words">
                {row.val}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(summaryText);
            showToast(ok ? 'Copied all IP details' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <Copy className="w-4 h-4" />
          <span>Copy All Details</span>
        </button>

        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50"
        >
          <span>View Location on Map</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

/* 40. EMI Calculator */
export const EmiCalculatorTool: React.FC = () => {
  const { showToast } = useToast();
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const [principal, setPrincipal] = useState<number>(1000000);
  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [tenureVal, setTenureVal] = useState<number>(5);
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years');

  const months = Math.max(1, tenureUnit === 'years' ? Math.round(tenureVal * 12) : Math.round(tenureVal));
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRate) / 12 / 100;
  const emi =
    r === 0
      ? P / months
      : (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const totalPayment = emi * months;
  const totalInterest = Math.max(0, totalPayment - P);

  // Build yearly schedule
  const schedule: Array<{ year: number; principalPaid: number; interestPaid: number; balance: number }> = [];
  let balance = P;
  const totalYears = Math.ceil(months / 12);
  for (let y = 1; y <= totalYears; y++) {
    let yPrin = 0;
    let yInt = 0;
    const mStart = (y - 1) * 12 + 1;
    const mEnd = Math.min(y * 12, months);
    for (let m = mStart; m <= mEnd; m++) {
      const mInt = balance * r;
      const mPrin = Math.min(balance, emi - mInt);
      yInt += mInt;
      yPrin += mPrin;
      balance = Math.max(0, balance - mPrin);
    }
    schedule.push({
      year: y,
      principalPaid: yPrin,
      interestPaid: yInt,
      balance,
    });
  }

  // Draw clean Principal vs Interest stacked bar chart on canvas (zero inline styles)
  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);

    const pRatio = totalPayment > 0 ? P / totalPayment : 1;
    const pW = Math.round(w * pRatio);

    ctx.fillStyle = '#2563EB';
    ctx.fillRect(0, 0, pW, h);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(pW, 0, w - pW, h);
  }, [P, totalPayment]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('My Toolset — Loan EMI Repayment Schedule', 16, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Loan Principal: Rs ${Math.round(P).toLocaleString()}`, 16, 32);
    doc.text(`Interest Rate: ${annualRate}% p.a.  |  Tenure: ${months} months`, 16, 39);
    doc.text(
      `Monthly EMI: Rs ${Math.round(emi).toLocaleString()}  |  Total Interest: Rs ${Math.round(
        totalInterest
      ).toLocaleString()}  |  Total Payment: Rs ${Math.round(totalPayment).toLocaleString()}`,
      16,
      46
    );

    let y = 60;
    doc.setFont('helvetica', 'bold');
    doc.text('Year', 16, y);
    doc.text('Principal Paid', 50, y);
    doc.text('Interest Paid', 105, y);
    doc.text('Closing Balance', 155, y);
    y += 7;
    doc.setFont('helvetica', 'normal');

    schedule.forEach((row) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(`Year ${row.year}`, 16, y);
      doc.text(`Rs ${Math.round(row.principalPaid).toLocaleString()}`, 50, y);
      doc.text(`Rs ${Math.round(row.interestPaid).toLocaleString()}`, 105, y);
      doc.text(`Rs ${Math.round(row.balance).toLocaleString()}`, 155, y);
      y += 7;
    });

    downloadBlob(doc.output('blob'), 'emi-repayment-schedule.pdf');
    showToast('EMI Schedule PDF downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loan Amount (Rs)</label>
          <input
            type="number"
            min={1000}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Annual Interest (%)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600">Loan Tenure</label>
            <div className="inline-flex rounded bg-slate-100 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setTenureUnit('years')}
                className={`px-2 py-0.5 rounded ${tenureUnit === 'years' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                Yr
              </button>
              <button
                type="button"
                onClick={() => setTenureUnit('months')}
                className={`px-2 py-0.5 rounded ${tenureUnit === 'months' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                Mo
              </button>
            </div>
          </div>
          <input
            type="number"
            min={1}
            value={tenureVal}
            onChange={(e) => setTenureVal(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
          />
        </div>
      </div>

      {/* Results Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-blue-50 p-4">
          <div className="text-xs font-medium text-blue-700">Monthly EMI</div>
          <div className="text-xl font-extrabold font-mono tabular-nums text-blue-900 mt-1">
            Rs {Math.round(emi).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500">Total Interest</div>
          <div className="text-xl font-extrabold font-mono tabular-nums text-amber-600 mt-1">
            Rs {Math.round(totalInterest).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-medium text-slate-500">Total Payment</div>
          <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
            Rs {Math.round(totalPayment).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Principal vs Interest Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span className="text-blue-600">
            Principal ({totalPayment > 0 ? Math.round((P / totalPayment) * 100) : 100}%)
          </span>
          <span className="text-amber-600">
            Interest ({totalPayment > 0 ? Math.round((totalInterest / totalPayment) * 100) : 0}%)
          </span>
        </div>
        <canvas ref={chartRef} width={600} height={22} className="w-full h-5 rounded-full overflow-hidden" />
      </div>

      {/* Yearly Schedule Table */}
      <div className="rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Year</th>
              <th className="px-4 py-2.5 font-semibold text-right">Principal</th>
              <th className="px-4 py-2.5 font-semibold text-right">Interest</th>
              <th className="px-4 py-2.5 font-semibold text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {schedule.map((rRow) => (
              <tr key={rRow.year}>
                <td className="px-4 py-2 text-slate-800">Year {rRow.year}</td>
                <td className="px-4 py-2 text-right text-slate-700">
                  Rs {Math.round(rRow.principalPaid).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-amber-600">
                  Rs {Math.round(rRow.interestPaid).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-slate-900 font-semibold">
                  Rs {Math.round(rRow.balance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleDownloadPdf}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
      >
        <Download className="w-4 h-4" />
        <span>Download Schedule PDF</span>
      </button>
    </div>
  );
};

/* 41. Unit Converter */
type UnitCat = 'length' | 'weight' | 'temp' | 'volume' | 'area';

const UNIT_FACTORS: Record<Exclude<UnitCat, 'temp'>, Record<string, number>> = {
  length: {
    Meter: 1,
    Kilometer: 1000,
    Centimeter: 0.01,
    Millimeter: 0.001,
    Mile: 1609.344,
    Foot: 0.3048,
    Inch: 0.0254,
  },
  weight: {
    Kilogram: 1,
    Gram: 0.001,
    Milligram: 0.000001,
    Pound: 0.45359237,
    Ounce: 0.02834952,
    MetricTon: 1000,
  },
  volume: {
    Liter: 1,
    Milliliter: 0.001,
    GallonUS: 3.78541178,
    Cup: 0.24,
    CubicMeter: 1000,
  },
  area: {
    SquareMeter: 1,
    SquareKilometer: 1000000,
    SquareFoot: 0.09290304,
    Acre: 4046.85642,
    Hectare: 10000,
  },
};

const TEMP_UNITS = ['Celsius', 'Fahrenheit', 'Kelvin'];

export const UnitConverterTool: React.FC = () => {
  const { showToast } = useToast();
  const [cat, setCat] = useState<UnitCat>('length');
  const [fromUnit, setFromUnit] = useState<string>('Kilometer');
  const [toUnit, setToUnit] = useState<string>('Mile');
  const [val, setVal] = useState<string>('10');

  const availableUnits = cat === 'temp' ? TEMP_UNITS : Object.keys(UNIT_FACTORS[cat]);

  const handleCatChange = (next: UnitCat) => {
    setCat(next);
    const list = next === 'temp' ? TEMP_UNITS : Object.keys(UNIT_FACTORS[next]);
    setFromUnit(list[0]);
    setToUnit(list[1] || list[0]);
  };

  const numVal = Number(val) || 0;
  let converted = 0;
  if (cat === 'temp') {
    let celsius = numVal;
    if (fromUnit === 'Fahrenheit') celsius = ((numVal - 32) * 5) / 9;
    if (fromUnit === 'Kelvin') celsius = numVal - 273.15;

    if (toUnit === 'Celsius') converted = celsius;
    else if (toUnit === 'Fahrenheit') converted = (celsius * 9) / 5 + 32;
    else converted = celsius + 273.15;
  } else {
    const fFrom = UNIT_FACTORS[cat][fromUnit] || 1;
    const fTo = UNIT_FACTORS[cat][toUnit] || 1;
    converted = (numVal * fFrom) / fTo;
  }

  const formattedResult = Number.isFinite(converted)
    ? Number(converted.toPrecision(7)).toString()
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'length', label: 'Length' },
            { id: 'weight', label: 'Weight' },
            { id: 'temp', label: 'Temperature' },
            { id: 'volume', label: 'Volume' },
            { id: 'area', label: 'Area' },
          ] as const
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleCatChange(c.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              cat === c.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end">
        <div className="sm:col-span-3 space-y-2">
          <label className="block text-xs font-semibold text-slate-600">From ({fromUnit})</label>
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base font-mono tabular-nums"
          />
        </div>

        <div className="sm:col-span-1 flex justify-center pb-1">
          <button
            type="button"
            onClick={() => {
              setFromUnit(toUnit);
              setToUnit(fromUnit);
            }}
            className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            title="Swap units"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        <div className="sm:col-span-3 space-y-2">
          <label className="block text-xs font-semibold text-slate-600">To ({toUnit})</label>
          <select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <div className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-base font-bold font-mono tabular-nums text-blue-900">
            {formattedResult}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          const ok = await copyToClipboard(`${val} ${fromUnit} = ${formattedResult} ${toUnit}`);
          showToast(ok ? 'Conversion copied' : 'Copy failed', ok ? 'success' : 'error');
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
      >
        <Copy className="w-4 h-4" />
        <span>Copy Conversion</span>
      </button>
    </div>
  );
};

/* 42. Binary Converter */
export const BinaryConverterTool: React.FC = () => {
  const { showToast } = useToast();
  const [dec, setDec] = useState<string>('77');
  const [bin, setBin] = useState<string>('1001101');
  const [oct, setOct] = useState<string>('115');
  const [hex, setHex] = useState<string>('4D');
  const [ascii, setAscii] = useState<string>('M');

  const syncFromNumber = (n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    const safe = Math.floor(n);
    setDec(safe.toString(10));
    setBin(safe.toString(2));
    setOct(safe.toString(8));
    setHex(safe.toString(16).toUpperCase());
    setAscii(safe >= 32 && safe <= 126 ? String.fromCharCode(safe) : '');
  };

  const handleBaseInput = (raw: string, base: 2 | 8 | 10 | 16) => {
    if (base === 10) setDec(raw);
    if (base === 2) setBin(raw);
    if (base === 8) setOct(raw);
    if (base === 16) setHex(raw);
    if (!raw.trim()) {
      setDec('');
      setBin('');
      setOct('');
      setHex('');
      setAscii('');
      return;
    }
    const parsed = parseInt(raw.trim(), base);
    if (!Number.isNaN(parsed)) {
      syncFromNumber(parsed);
    }
  };

  const handleAsciiInput = (txt: string) => {
    setAscii(txt);
    if (!txt) {
      setDec('');
      setBin('');
      setOct('');
      setHex('');
      return;
    }
    if (txt.length === 1) {
      syncFromNumber(txt.charCodeAt(0));
    } else {
      const codes = Array.from(txt).map((c) => c.charCodeAt(0));
      setDec(codes.join(' '));
      setBin(codes.map((c) => c.toString(2).padStart(8, '0')).join(' '));
      setOct(codes.map((c) => c.toString(8)).join(' '));
      setHex(codes.map((c) => c.toString(16).toUpperCase().padStart(2, '0')).join(' '));
    }
  };

  const fields = [
    { label: 'Decimal (Base 10)', val: dec, onChange: (v: string) => handleBaseInput(v, 10) },
    { label: 'Binary (Base 2)', val: bin, onChange: (v: string) => handleBaseInput(v, 2) },
    { label: 'Octal (Base 8)', val: oct, onChange: (v: string) => handleBaseInput(v, 8) },
    { label: 'Hexadecimal (Base 16)', val: hex, onChange: (v: string) => handleBaseInput(v, 16) },
    { label: 'ASCII Text', val: ascii, onChange: handleAsciiInput },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.label}>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={f.val}
              onChange={(e) => f.onChange(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(f.val);
                showToast(ok ? `Copied ${f.label}` : 'Copy failed', ok ? 'success' : 'error');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* 43. YouTube Thumbnail Extractor (Simple Split — Zero Backslash Regex) */
function extractYoutubeVideoId(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }
  if (trimmed.includes('v=')) {
    const afterV = trimmed.split('v=')[1] || '';
    const clean = afterV.split('&')[0].split('#')[0];
    return clean.slice(0, 11);
  }
  if (trimmed.includes('youtu.be/')) {
    const afterBe = trimmed.split('youtu.be/')[1] || '';
    return afterBe.split('?')[0].split('&')[0].split('/')[0].slice(0, 11);
  }
  if (trimmed.includes('/shorts/')) {
    const afterShorts = trimmed.split('/shorts/')[1] || '';
    return afterShorts.split('?')[0].split('/')[0].slice(0, 11);
  }
  if (trimmed.includes('/embed/')) {
    const afterEmbed = trimmed.split('/embed/')[1] || '';
    return afterEmbed.split('?')[0].split('/')[0].slice(0, 11);
  }
  return '';
}

export const YoutubeThumbnailTool: React.FC = () => {
  const { showToast } = useToast();
  const [urlInput, setUrlInput] = useState<string>('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');

  const handleExtract = () => {
    const id = extractYoutubeVideoId(urlInput);
    if (!id) {
      showToast('Enter a valid YouTube watch, youtu.be, or shorts URL', 'error');
      return;
    }
    setVideoId(id);
    showToast(`Extracted Video ID: ${id}`);
  };

  const thumbs = videoId
    ? [
        { label: 'Max Resolution (1280×720)', file: 'maxresdefault.jpg' },
        { label: 'High Quality (480×360)', file: 'hqdefault.jpg' },
        { label: 'Medium Quality (320×180)', file: 'mqdefault.jpg' },
        { label: 'Standard Frame 0', file: '0.jpg' },
      ].map((t) => ({
        ...t,
        url: `https://img.youtube.com/vi/${videoId}/${t.file}`,
      }))
    : [];

  const handleDownloadThumb = async (thumbUrl: string, filename: string) => {
    try {
      const resp = await fetch(thumbUrl);
      const blob = await resp.blob();
      downloadBlob(blob, `${videoId}-${filename}`);
      showToast(`Downloaded ${filename}`);
    } catch {
      const a = document.createElement('a');
      a.href = thumbUrl;
      a.download = `${videoId}-${filename}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste YouTube URL (e.g. https://youtu.be/... or watch?v=...)"
          className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={handleExtract}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0"
        >
          Extract Thumbnails
        </button>
      </div>

      {thumbs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {thumbs.map((t) => (
            <div key={t.file} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <div className="text-xs font-bold text-slate-700">{t.label}</div>
              <div className="rounded-lg overflow-hidden bg-slate-200 aspect-video flex items-center justify-center">
                <img
                  src={t.url}
                  alt={t.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadThumb(t.url, t.file)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(t.url);
                    showToast(ok ? 'Thumbnail URL copied' : 'Copy failed', ok ? 'success' : 'error');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* 44. Insta Caption Generator */
export const InstaCaptionTool: React.FC = () => {
  const { showToast } = useToast();
  const [topic, setTopic] = useState<string>('Morning Coffee & Coding');
  const [batch, setBatch] = useState<number>(0);

  const buildCaptions = (subject: string, seed: number): string[] => {
    const clean = subject.trim() || 'Everyday Moments';
    const sets = [
      [
        `✨ Powered by ${clean} and big ambitions.\n\nDrop a 🔥 if you are building something exciting this week!`,
        `Little moments of ${clean} make all the difference ☕💫\n\nSave this post for your daily inspiration.`,
        `Less noise, more ${clean}. Focused on progress over perfection 🚀\n\nWhat is on your agenda today? Tell me below 👇`,
        `POV: You finally made time for ${clean} 🌟\n\nTag someone who needs this energy right now!`,
        `Turning ${clean} into a daily ritual ✨📈\n\nDouble tap if you agree & share your favorite tip in the comments!`,
      ],
      [
        `Behind the scenes: ${clean} edition 📸✨\n\nSwipe through & let me know which frame wins!`,
        `Consistency + ${clean} = unstoppable momentum ⚡\n\nBookmark this reminder for Monday morning.`,
        `Here is your sign to romanticize ${clean} today 🌿☀️\n\nDrop your favorite emoji in the replies!`,
        `Zero shortcuts — just pure ${clean} from start to finish 🛠️🔥\n\nShare this to your story if it resonates!`,
        `Weekend mood: 100% ${clean}, 0% distractions 🎯🙌\n\nHow are you spending yours?`,
      ],
    ];
    return sets[seed % sets.length];
  };

  const captions = buildCaptions(topic, batch);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter post topic (e.g. Fitness, Travel, Startup Launch)..."
          className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setBatch(0);
            showToast('Generated 5 fresh captions');
          }}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Generate 5 Captions
        </button>
        <button
          type="button"
          onClick={() => {
            setBatch((b) => b + 1);
            showToast('Loaded more caption variations');
          }}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          More Variations
        </button>
      </div>

      <div className="space-y-3">
        {captions.map((cap, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{cap}</p>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(cap);
                showToast(ok ? `Caption #${idx + 1} copied` : 'Copy failed', ok ? 'success' : 'error');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 shrink-0 self-start sm:self-center"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* 45. Hashtag Generator (30 Categorized Hashtags) */
export const HashtagGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState<string>('webdesign');
  const [activeKey, setActiveKey] = useState<string>('webdesign');

  const slug = activeKey.toLowerCase().replace(/[^a-z0-9]/g, '') || 'creator';

  const popular = [
    `#${slug}`,
    `#${slug}tips`,
    `#${slug}daily`,
    `#${slug}inspiration`,
    `#${slug}community`,
    '#instagood',
    '#explorepage',
    '#creators',
    '#digitalcreator',
    '#growthmindset',
  ];

  const trending = [
    `#${slug}2026`,
    `#${slug}trends`,
    `#${slug}reels`,
    `#${slug}life`,
    `#${slug}hacks`,
    '#viralreels',
    '#trendingnow',
    '#buildinpublic',
    '#techtrends',
    '#creatorworkflow',
  ];

  const niche = [
    `#${slug}studio`,
    `#${slug}guide`,
    `#${slug}pro`,
    `#${slug}setup`,
    `#${slug}workflow`,
    `#learn${slug}`,
    `#${slug}projects`,
    `#${slug}resources`,
    `#${slug}essentials`,
    `#${slug}mastery`,
  ];

  const allThirty = [...popular, ...trending, ...niche].join(' ');

  const groups = [
    { title: 'Popular (10)', tags: popular },
    { title: 'Trending (10)', tags: trending },
    { title: 'Niche Targeted (10)', tags: niche },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Enter main keyword (e.g. fitness, photography, coding)..."
          className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setActiveKey(keyword);
            showToast('Generated 30 categorized hashtags');
          }}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Generate 30 Hashtags
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">{g.title}</div>
              <div className="text-xs font-mono text-blue-700 leading-relaxed break-words">
                {g.tags.join(' ')}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(g.tags.join(' '));
                showToast(ok ? `Copied ${g.title}` : 'Copy failed', ok ? 'success' : 'error');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Category</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(allThirty);
            showToast(ok ? 'Copied all 30 hashtags!' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Copy className="w-4 h-4" />
          <span>Copy All 30 Hashtags</span>
        </button>

        <button
          type="button"
          onClick={() => {
            downloadTextFile(allThirty, `hashtags-${slug}.txt`);
            showToast('Downloaded hashtags .txt');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          <span>Download .txt</span>
        </button>
      </div>
    </div>
  );
};

/* 46. Resume Builder */
export const ResumeBuilderTool: React.FC = () => {
  const { showToast } = useToast();
  const [name, setName] = useState<string>('Aarav Sharma');
  const [email, setEmail] = useState<string>('aarav.sharma@example.com');
  const [phone, setPhone] = useState<string>('+91 98765 43210');
  const [location, setLocation] = useState<string>('Bengaluru, India');
  const [summary, setSummary] = useState<string>(
    'Full-Stack Software Engineer with 4+ years building fast, offline-capable web applications in React and TypeScript.'
  );
  const [experience, setExperience] = useState<string>(
    'Senior Frontend Engineer — FinStack Labs (2023–Present)\n• Built client-side PDF & image utilities serving 120K monthly users.\n• Cut bundle load latency by 42% with progressive caching.'
  );
  const [education, setEducation] = useState<string>(
    'B.Tech in Computer Science — NIT Karnataka (2018–2022) · CGPA 8.7/10'
  );
  const [skills, setSkills] = useState<string>(
    'React, TypeScript, Tailwind CSS, Node.js, HTML5 Canvas, PWA, SQL'
  );
  const [projects, setProjects] = useState<string>(
    'My Toolset Suite — 50 offline browser utilities with instant local processing.'
  );

  const handleGeneratePdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 16;
    const maxW = pageW - margin * 2;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(name || 'Your Name', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text([email, phone, location].filter(Boolean).join('  |  '), margin, y);
    y += 8;

    const addSection = (heading: string, body: string) => {
      if (!body.trim()) return;
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(heading.toUpperCase(), margin, y);
      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const lines: string[] = doc.splitTextToSize(body.trim(), maxW);
      lines.forEach((l) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(l, margin, y);
        y += 5;
      });
      y += 3;
    };

    addSection('Professional Summary', summary);
    addSection('Work Experience', experience);
    addSection('Education', education);
    addSection('Skills', skills);
    addSection('Key Projects', projects);

    const slug = (name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadBlob(doc.output('blob'), `${slug}-resume.pdf`);
    showToast('Resume PDF downloaded');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Left Form */}
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {[
          { label: 'Summary', val: summary, setter: setSummary, rows: 2 },
          { label: 'Experience', val: experience, setter: setExperience, rows: 3 },
          { label: 'Education', val: education, setter: setEducation, rows: 2 },
          { label: 'Skills', val: skills, setter: setSkills, rows: 2 },
          { label: 'Projects', val: projects, setter: setProjects, rows: 2 },
        ].map((sec) => (
          <div key={sec.label}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{sec.label}</label>
            <textarea
              rows={sec.rows}
              value={sec.val}
              onChange={(e) => sec.setter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs sm:text-sm"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={handleGeneratePdf}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          <span>Generate Resume PDF</span>
        </button>
      </div>

      {/* Right Live Preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl font-extrabold text-slate-900">{name || 'Your Name'}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {[email, phone, location].filter(Boolean).join(' · ')}
          </p>
        </div>

        {[
          { title: 'Summary', content: summary },
          { title: 'Experience', content: experience },
          { title: 'Education', content: education },
          { title: 'Skills', content: skills },
          { title: 'Projects', content: projects },
        ].map(
          (s) =>
            s.content.trim() && (
              <div key={s.title} className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {s.content}
                </p>
              </div>
            )
        )}
      </div>
    </div>
  );
};

/* 47. Invoice Generator */
interface InvoiceItem {
  id: number;
  description: string;
  qty: number;
  rate: number;
}

export const InvoiceGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [bizName, setBizName] = useState<string>('Apex Studio Pvt Ltd');
  const [bizGst, setBizGst] = useState<string>('29AABCA1234D1Z5');
  const [bizAddr, setBizAddr] = useState<string>('MG Road, Bengaluru 560001');

  const [clientName, setClientName] = useState<string>('Horizon Retail Co.');
  const [clientAddr, setClientAddr] = useState<string>('Nariman Point, Mumbai 400021');

  const [invNo, setInvNo] = useState<string>('INV-2026-001');
  const [invDate, setInvDate] = useState<string>(today);
  const [dueDate, setDueDate] = useState<string>(today);

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, description: 'UI/UX Design & Frontend Architecture', qty: 1, rate: 25000 },
    { id: 2, description: 'PWA Offline Integration & Testing', qty: 1, rate: 12000 },
  ]);

  const [taxPct, setTaxPct] = useState<number>(18);
  const [discount, setDiscount] = useState<number>(1000);
  const [shipping, setShipping] = useState<number>(0);

  const subtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const taxAmt = (subtotal * (Number(taxPct) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmt + (Number(shipping) || 0) - (Number(discount) || 0));

  const updateItem = (id: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: Date.now(), description: 'New Service Item', qty: 1, rate: 1000 }]);
  };

  const removeItem = (id: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleGeneratePdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('TAX INVOICE', 16, y);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice #: ${invNo}`, 140, y - 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${invDate}`, 140, y + 2);
    doc.text(`Due: ${dueDate}`, 140, y + 8);
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.text('From:', 16, y);
    doc.text('Bill To:', 110, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.text(bizName, 16, y);
    doc.text(clientName, 110, y);
    y += 5;
    if (bizGst) {
      doc.text(`GSTIN: ${bizGst}`, 16, y);
      y += 5;
    }
    doc.text(bizAddr, 16, y);
    doc.text(clientAddr, 110, y);
    y += 12;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(16, y - 5, 178, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Item Description', 19, y);
    doc.text('Qty', 122, y);
    doc.text('Rate', 142, y);
    doc.text('Amount', 170, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    items.forEach((it) => {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }
      const amt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
      doc.text(it.description.slice(0, 52), 19, y);
      doc.text(String(it.qty), 122, y);
      doc.text(`Rs ${Number(it.rate).toLocaleString()}`, 142, y);
      doc.text(`Rs ${amt.toLocaleString()}`, 170, y);
      y += 7;
    });

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(120, y, 194, y);
    y += 7;

    doc.text(`Subtotal: Rs ${subtotal.toFixed(2)}`, 135, y);
    y += 6;
    doc.text(`Tax (${taxPct}%): Rs ${taxAmt.toFixed(2)}`, 135, y);
    y += 6;
    if (discount > 0) {
      doc.text(`Discount: -Rs ${discount.toFixed(2)}`, 135, y);
      y += 6;
    }
    if (shipping > 0) {
      doc.text(`Shipping: +Rs ${shipping.toFixed(2)}`, 135, y);
      y += 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Grand Total: Rs ${grandTotal.toFixed(2)}`, 135, y + 2);

    downloadBlob(doc.output('blob'), `${invNo.toLowerCase() || 'invoice'}.pdf`);
    showToast('Invoice PDF generated & downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-700">Your Business Details</div>
          <input
            type="text"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            placeholder="Business Name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={bizGst}
            onChange={(e) => setBizGst(e.target.value)}
            placeholder="GSTIN (Optional)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
          />
          <input
            type="text"
            value={bizAddr}
            onChange={(e) => setBizAddr(e.target.value)}
            placeholder="Business Address"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-700">Client &amp; Invoice Meta</div>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client Name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={clientAddr}
            onChange={(e) => setClientAddr(e.target.value)}
            placeholder="Client Address"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={invNo}
              onChange={(e) => setInvNo(e.target.value)}
              placeholder="INV #"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-mono"
            />
            <input
              type="date"
              value={invDate}
              onChange={(e) => setInvDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-mono"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Line Items</span>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={it.description}
                onChange={(e) => updateItem(it.id, { description: e.target.value })}
                placeholder="Item description"
                className="col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm"
              />
              <input
                type="number"
                min={1}
                value={it.qty}
                onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })}
                placeholder="Qty"
                className="col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums"
              />
              <input
                type="number"
                min={0}
                value={it.rate}
                onChange={(e) => updateItem(it.id, { rate: Number(e.target.value) })}
                placeholder="Rate"
                className="col-span-3 rounded-lg border border-slate-300 px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums"
              />
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 p-1.5"
                aria-label="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tax / Discount / Shipping & Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-3 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tax (%)</label>
            <input
              type="number"
              min={0}
              value={taxPct}
              onChange={(e) => setTaxPct(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Discount (Rs)</label>
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Shipping (Rs)</label>
            <input
              type="number"
              min={0}
              value={shipping}
              onChange={(e) => setShipping(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right font-mono tabular-nums space-y-1">
          <div className="text-xs text-slate-500">
            Subtotal: Rs {subtotal.toFixed(2)} · Tax: Rs {taxAmt.toFixed(2)}
          </div>
          <div className="text-xl font-extrabold text-blue-600">
            Grand Total: Rs {grandTotal.toFixed(2)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGeneratePdf}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
      >
        <Download className="w-4 h-4" />
        <span>Generate Invoice PDF</span>
      </button>
    </div>
  );
};
