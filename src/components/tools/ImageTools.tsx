import React, { useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(parts[1]);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

/* 1. Image Compressor */
export const ImageCompressorTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [quality, setQuality] = useState<number>(75);
  const [compressedUrl, setCompressedUrl] = useState<string>('');
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => setImgSrc(ev.target?.result as string);
    reader.readAsDataURL(selected);
  };

  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const q = Math.max(0.01, Math.min(1, quality / 100));
      const outDataUrl = canvas.toDataURL('image/jpeg', q);
      const blob = dataUrlToBlob(outDataUrl);
      setCompressedUrl(outDataUrl);
      setCompressedSize(blob.size);
    };
    img.src = imgSrc;
  }, [imgSrc, quality]);

  const handleDownload = () => {
    if (!compressedUrl || !file) return;
    const blob = dataUrlToBlob(compressedUrl);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    triggerBlobDownload(blob, `${baseName}-compressed-${quality}q.jpg`);
    showToast('Compressed image downloaded');
  };

  const savedPct =
    file && compressedSize > 0
      ? Math.round(((file.size - compressedSize) / file.size) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Click to choose an image (JPG, PNG, WebP)'}
        </span>
        <span className="text-xs text-slate-500 mt-1">Processed 100% locally in your browser</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div>
        <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
          <label htmlFor="quality-range">Compression Quality</label>
          <span className="font-mono tabular-nums font-semibold text-blue-600">{quality}%</span>
        </div>
        <input
          id="quality-range"
          type="range"
          min={1}
          max={100}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Smallest Size (1%)</span>
          <span>Balanced (75%)</span>
          <span>Best Quality (100%)</span>
        </div>
      </div>

      {file && compressedUrl && (
        <div className="space-y-5 pt-2 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Original Size</div>
              <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {formatBytes(file.size)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Compressed Size</div>
              <div className="text-base font-bold text-blue-600 font-mono tabular-nums mt-0.5">
                {formatBytes(compressedSize)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Size Delta</div>
              <div
                className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                  savedPct >= 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {savedPct >= 0 ? `-${savedPct}% saved` : `+${Math.abs(savedPct)}%`}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
            <img
              src={compressedUrl}
              alt="Compressed preview"
              className="max-h-72 w-auto object-contain rounded"
            />
          </div>

          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Compressed JPG</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* 2. Image Resizer */
export const ImageResizerTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
        setAspectRatio(img.naturalWidth / Math.max(1, img.naturalHeight));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  const handleWidthChange = (val: number) => {
    const safeW = Math.max(1, Math.min(8000, val || 1));
    setWidth(safeW);
    if (lockRatio && imgObj) {
      setHeight(Math.max(1, Math.round(safeW / aspectRatio)));
    }
  };

  const handleHeightChange = (val: number) => {
    const safeH = Math.max(1, Math.min(8000, val || 1));
    setHeight(safeH);
    if (lockRatio && imgObj) {
      setWidth(Math.max(1, Math.round(safeH * aspectRatio)));
    }
  };

  useEffect(() => {
    if (!imgObj) return;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);
    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [imgObj, width, height]);

  const handleDownload = () => {
    if (!previewUrl || !file) return;
    const blob = dataUrlToBlob(previewUrl);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    triggerBlobDownload(blob, `${baseName}-${width}x${height}.png`);
    showToast(`Downloaded ${width}x${height}px image`);
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Upload an image to resize'}
        </span>
        {imgObj && (
          <span className="text-xs text-slate-500 font-mono tabular-nums mt-1">
            Original: {imgObj.naturalWidth} × {imgObj.naturalHeight} px
          </span>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Width (px)</label>
          <input
            type="number"
            min={1}
            max={8000}
            value={width}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Height (px)</label>
          <input
            type="number"
            min={1}
            max={8000}
            value={height}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={lockRatio}
            onChange={(e) => setLockRatio(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span>Lock aspect ratio</span>
        </label>
        {imgObj && (
          <button
            type="button"
            onClick={() => {
              setWidth(imgObj.naturalWidth);
              setHeight(imgObj.naturalHeight);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to original</span>
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
            <img src={previewUrl} alt="Resized preview" className="max-h-72 w-auto object-contain rounded" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Resized Image ({width}×{height})</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* 3. JPG to PNG */
export const JpgToPngTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pngUrl, setPngUrl] = useState<string>('');
  const [pngSize, setPngSize] = useState<number>(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
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
        const out = canvas.toDataURL('image/png');
        setPngUrl(out);
        setPngSize(dataUrlToBlob(out).size);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  const handleDownload = () => {
    if (!pngUrl || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    triggerBlobDownload(dataUrlToBlob(pngUrl), `${baseName}.png`);
    showToast('PNG file downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a JPG / JPEG image to convert to PNG'}
        </span>
        <span className="text-xs text-slate-500 mt-1">Instant lossless PNG canvas export</span>
        <input type="file" accept="image/jpeg,image/jpg,image/*" onChange={handleFile} className="hidden" />
      </label>

      {pngUrl && file && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
            <span>Input: {formatBytes(file.size)}</span>
            <span>·</span>
            <span>Output PNG: {formatBytes(pngSize)}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
            <img src={pngUrl} alt="Converted PNG preview" className="max-h-72 w-auto object-contain rounded" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* 4. Grayscale */
export const GrayscaleTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [grayUrl, setGrayUrl] = useState<string>('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
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
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          data[i] = lum;
          data[i + 1] = lum;
          data[i + 2] = lum;
        }
        ctx.putImageData(imageData, 0, 0);
        setGrayUrl(canvas.toDataURL('image/png'));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  const handleDownload = () => {
    if (!grayUrl || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    triggerBlobDownload(dataUrlToBlob(grayUrl), `${baseName}-grayscale.png`);
    showToast('Grayscale image downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select an image to convert to grayscale'}
        </span>
        <span className="text-xs text-slate-500 mt-1">True luminance pixel-level conversion</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      {grayUrl && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
            <img src={grayUrl} alt="Grayscale preview" className="max-h-72 w-auto object-contain rounded" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Grayscale Image</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* 5. Text on Image */
export const TextOnImageTool: React.FC = () => {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [caption, setCaption] = useState<string>('My Toolset');
  const [fontSize, setFontSize] = useState<number>(48);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [addOutline, setAddOutline] = useState<boolean>(true);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
        setFontSize(Math.max(20, Math.round(img.naturalWidth * 0.06)));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  useEffect(() => {
    if (!imgObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = imgObj.naturalWidth;
    canvas.height = imgObj.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(imgObj, 0, 0);
    if (caption.trim()) {
      ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const x = canvas.width / 2;
      const pad = Math.max(fontSize, canvas.height * 0.08);
      const y =
        position === 'top'
          ? pad
          : position === 'center'
          ? canvas.height / 2
          : canvas.height - pad;

      if (addOutline) {
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
        ctx.strokeStyle = '#0F172A';
        ctx.lineJoin = 'round';
        ctx.strokeText(caption, x, y);
      }
      ctx.fillStyle = textColor;
      ctx.fillText(caption, x, y);
    }
  }, [imgObj, caption, fontSize, textColor, position, addOutline]);

  const handleDownload = () => {
    if (!canvasRef.current || !file) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    triggerBlobDownload(dataUrlToBlob(dataUrl), `${baseName}-captioned.png`);
    showToast('Captioned image downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Upload an image to add custom text'}
        </span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Overlay Text</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Enter caption or watermark..."
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Font Size ({fontSize}px)
          </label>
          <input
            type="range"
            min={14}
            max={200}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Color</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-9 w-16 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as 'top' | 'center' | 'bottom')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={addOutline}
          onChange={(e) => setAddOutline(e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
        />
        <span>High-contrast text outline</span>
      </label>

      {imgObj && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="max-h-80 w-auto max-w-full object-contain rounded" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Image with Text</span>
          </button>
        </div>
      )}
    </div>
  );
};
