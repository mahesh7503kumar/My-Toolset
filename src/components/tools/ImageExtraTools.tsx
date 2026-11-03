import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  FlipHorizontal,
  FlipVertical,
  Pipette,
  RotateCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  clamp,
  copyToClipboard,
  dataUrlToBlob,
  downloadBlob,
  downloadTextFile,
  formatBytes,
  hexToRgb,
  HSL,
  hslToRgb,
  RGB,
  rgbToHex,
  rgbToHsl,
} from '../../utils/fileHelpers';

/** Canvas-based color swatch so arbitrary HEX colors render with zero inline styles */
const ColorSwatch: React.FC<{ hex: string; className?: string; onClick?: () => void; title?: string }> = ({
  hex,
  className = 'w-10 h-10 rounded-lg border border-slate-300',
  onClick,
  title,
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = hex || '#2563EB';
    ctx.fillRect(0, 0, c.width, c.height);
  }, [hex]);

  return (
    <canvas
      ref={ref}
      width={64}
      height={64}
      onClick={onClick}
      title={title || hex}
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
    />
  );
};

/* 6. PNG to JPG */
export const PngToJpgTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [jpgUrl, setJpgUrl] = useState<string>('');
  const [jpgSize, setJpgSize] = useState<number>(0);

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
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const out = canvas.toDataURL('image/jpeg', 1.0);
        setJpgUrl(out);
        setJpgSize(dataUrlToBlob(out).size);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  const handleDownload = () => {
    if (!jpgUrl || !file) {
      showToast('Please select an image first', 'info');
      return;
    }
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(dataUrlToBlob(jpgUrl), `${base}.jpg`);
    showToast('Converted JPG downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a PNG or transparent image to convert to JPG'}
        </span>
        <span className="text-xs text-slate-500 mt-1">Exports 100% quality JPEG on clean white canvas</span>
        <input type="file" accept="image/png,image/*" onChange={handleFile} className="hidden" />
      </label>

      {file && jpgUrl && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
            <span>Original: {formatBytes(file.size)}</span>
            <span>·</span>
            <span>Output JPG (1.0 Quality): {formatBytes(jpgSize)}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
            <img src={jpgUrl} alt="JPG output preview" className="max-h-72 w-auto object-contain rounded" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download JPG</span>
      </button>
    </div>
  );
};

/* 7. WebP Converter */
export const WebpConverterTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [quality, setQuality] = useState<number>(85);
  const [webpUrl, setWebpUrl] = useState<string>('');
  const [webpSize, setWebpSize] = useState<number>(0);

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
      ctx.drawImage(img, 0, 0);
      const q = clamp(quality / 100, 0.01, 1);
      const out = canvas.toDataURL('image/webp', q);
      setWebpUrl(out);
      setWebpSize(dataUrlToBlob(out).size);
    };
    img.src = imgSrc;
  }, [imgSrc, quality]);

  const handleDownload = () => {
    if (!webpUrl || !file) {
      showToast('Please select an image first', 'info');
      return;
    }
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(dataUrlToBlob(webpUrl), `${base}.webp`);
    showToast('WebP image downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Choose an image (JPG, PNG) to convert to WebP'}
        </span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div>
        <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
          <span>WebP Quality</span>
          <span className="font-mono tabular-nums font-semibold text-blue-600">{quality}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
      </div>

      {file && webpUrl && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
            <span>Original: {formatBytes(file.size)}</span>
            <span>·</span>
            <span>WebP Size: {formatBytes(webpSize)}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
            <img src={webpUrl} alt="WebP preview" className="max-h-72 w-auto object-contain rounded" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download WebP</span>
      </button>
    </div>
  );
};

/* 8. Background Remover */
export const BgRemoverTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(200);
  const [resultUrl, setResultUrl] = useState<string>('');

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
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > threshold && d[i + 1] > threshold && d[i + 2] > threshold) {
          d[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setResultUrl(canvas.toDataURL('image/png'));
    };
    img.src = imgSrc;
  }, [imgSrc, threshold]);

  const handleDownload = () => {
    if (!resultUrl || !file) {
      showToast('Please upload an image first', 'info');
      return;
    }
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(dataUrlToBlob(resultUrl), `${base}-nobg.png`);
    showToast('Transparent PNG downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Upload an image with a light / white background'}
        </span>
        <span className="text-xs text-slate-500 mt-1">Removes light background pixels into alpha transparency</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div>
        <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
          <span>White / Light Cutoff Threshold (RGB &gt; {threshold})</span>
          <span className="font-mono tabular-nums font-semibold text-blue-600">{threshold}</span>
        </div>
        <input
          type="range"
          min={140}
          max={250}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
      </div>

      {resultUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-200/70 p-4 flex items-center justify-center max-h-80 overflow-hidden">
          <img src={resultUrl} alt="Transparent background preview" className="max-h-72 w-auto object-contain rounded" />
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download Transparent PNG</span>
      </button>
    </div>
  );
};

/* 9. Image Rotator */
export const ImageRotatorTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [angle, setAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [outUrl, setOutUrl] = useState<string>('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setImgObj(img);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  useEffect(() => {
    if (!imgObj) return;
    const rad = (angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = imgObj.naturalWidth;
    const h = imgObj.naturalHeight;
    const newW = Math.max(1, Math.round(w * cos + h * sin));
    const newH = Math.max(1, Math.round(w * sin + h * cos));

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(imgObj, -w / 2, -h / 2);
    setOutUrl(canvas.toDataURL('image/png'));
  }, [imgObj, angle, flipH, flipV]);

  const handleDownload = () => {
    if (!outUrl || !file) {
      showToast('Please upload an image first', 'info');
      return;
    }
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(dataUrlToBlob(outUrl), `${base}-rotated-${angle}deg.png`);
    showToast('Rotated image downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select an image to rotate or flip'}
        </span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span>Rotation Angle</span>
          <span className="font-mono tabular-nums font-semibold text-blue-600">{angle}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setAngle((a) => (a + 90) % 360)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>+90°</span>
          </button>
          <button
            type="button"
            onClick={() => setAngle((a) => (a + 180) % 360)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>+180°</span>
          </button>
          <button
            type="button"
            onClick={() => setFlipH((f) => !f)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold ${
              flipH
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Flip Horizontal</span>
          </button>
          <button
            type="button"
            onClick={() => setFlipV((f) => !f)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold ${
              flipV
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FlipVertical className="w-3.5 h-3.5" />
            <span>Flip Vertical</span>
          </button>
        </div>
      </div>

      {outUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
          <img src={outUrl} alt="Rotated preview" className="max-h-72 w-auto object-contain rounded" />
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download Rotated Image</span>
      </button>
    </div>
  );
};

/* 10. Blur Image */
export const BlurImageTool: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [blur, setBlur] = useState<number>(20);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
      />
      {imageSrc && (
        <>
          <div className="flex justify-between items-center">
            <label className="text-sm text-slate-700 dark:text-slate-300">Blur Radius</label>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{blur} px</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />

          <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
            <img
              src={imageSrc}
              alt="preview"
              style={{
                filter: `blur(${blur}px)`,
                WebkitFilter: `blur(${blur}px)`,
                transition: 'filter 0.1s',
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const hasCanvasFilter =
                  typeof (ctx as Partial<CanvasRenderingContext2D>).filter === 'string';
                if (hasCanvasFilter) {
                  ctx.filter = `blur(${blur}px)`;
                  ctx.drawImage(img, 0, 0);
                } else if (blur > 0) {
                  // WebKit fallback when 2D canvas filter is unavailable
                  const factor = Math.max(2, Math.round(blur / 2));
                  const smallW = Math.max(1, Math.round(img.width / factor));
                  const smallH = Math.max(1, Math.round(img.height / factor));
                  const temp = document.createElement('canvas');
                  temp.width = smallW;
                  temp.height = smallH;
                  const tCtx = temp.getContext('2d');
                  if (tCtx) {
                    tCtx.imageSmoothingEnabled = true;
                    tCtx.drawImage(img, 0, 0, smallW, smallH);
                    ctx.imageSmoothingEnabled = true;
                    ctx.drawImage(temp, 0, 0, smallW, smallH, 0, 0, img.width, img.height);
                  } else {
                    ctx.drawImage(img, 0, 0);
                  }
                } else {
                  ctx.drawImage(img, 0, 0);
                }

                const a = document.createElement('a');
                a.download = `blurred-${Date.now()}.png`;
                a.href = canvas.toDataURL('image/png');
                a.click();
              };
              img.src = imageSrc;
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            Download Blurred Image
          </button>
        </>
      )}
    </div>
  );
};

/* 11. Meme Generator */
export const MemeGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [topText, setTopText] = useState<string>('WHEN ALL 50 TOOLS');
  const [bottomText, setBottomText] = useState<string>('WORK 100% OFFLINE');
  const [fontSize, setFontSize] = useState<number>(44);
  const [textColor, setTextColor] = useState<string>('#FFFFFF');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
        setFontSize(Math.max(24, Math.round(img.naturalWidth * 0.07)));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = imgObj ? imgObj.naturalWidth : 800;
    const h = imgObj ? imgObj.naturalHeight : 500;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0);
    } else {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.font = `900 ${fontSize}px Impact, "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.14));
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = textColor;

    if (topText.trim()) {
      ctx.textBaseline = 'top';
      ctx.strokeText(topText.toUpperCase(), w / 2, Math.round(h * 0.04));
      ctx.fillText(topText.toUpperCase(), w / 2, Math.round(h * 0.04));
    }

    if (bottomText.trim()) {
      ctx.textBaseline = 'bottom';
      ctx.strokeText(bottomText.toUpperCase(), w / 2, Math.round(h * 0.96));
      ctx.fillText(bottomText.toUpperCase(), w / 2, Math.round(h * 0.96));
    }
  }, [imgObj, topText, bottomText, fontSize, textColor]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const base = file ? file.name.replace(/\.[^/.]+$/, '') : 'my-toolset';
    downloadBlob(dataUrlToBlob(dataUrl), `${base}-meme.png`);
    showToast('Meme downloaded as PNG');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Upload meme background image (or customize template below)'}
        </span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Top Text</label>
          <input
            type="text"
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            placeholder="TOP CAPTION"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bottom Text</label>
          <input
            type="text"
            value={bottomText}
            onChange={(e) => setBottomText(e.target.value)}
            placeholder="BOTTOM CAPTION"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Font Size ({fontSize}px)
          </label>
          <input
            type="range"
            min={18}
            max={160}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Text Color</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-9 w-20 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="max-h-80 w-auto max-w-full object-contain rounded" />
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download Meme PNG</span>
      </button>
    </div>
  );
};

/* 12. Image Color Picker */
export const ImageColorPickerTool: React.FC = () => {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hex, setHex] = useState<string>('#2563EB');
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('color_picker_history') || '["#2563EB","#10B981","#F59E0B"]');
    } catch {
      return ['#2563EB'];
    }
  });

  const pushColor = (newHex: string) => {
    const formatted = newHex.toUpperCase();
    setHex(formatted);
    setHistory((prev) => {
      const next = [formatted, ...prev.filter((c) => c !== formatted)].slice(0, 14);
      localStorage.setItem('color_picker_history', JSON.stringify(next));
      return next;
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setImgObj(img);
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
  }, [imgObj]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(clamp(x, 0, canvas.width - 1), clamp(y, 0, canvas.height - 1), 1, 1).data;
    const picked = rgbToHex({ r: pixel[0], g: pixel[1], b: pixel[2] });
    pushColor(picked);
    showToast(`Picked ${picked}`);
  };

  const rgb: RGB = hexToRgb(hex) || { r: 37, g: 99, b: 235 };
  const hsl: HSL = rgbToHsl(rgb);
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const handleCopy = async (val: string) => {
    const ok = await copyToClipboard(val);
    showToast(ok ? `Copied ${val}` : 'Copy failed', ok ? 'success' : 'error');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
          <input
            type="color"
            value={hex}
            onChange={(e) => pushColor(e.target.value)}
            className="w-14 h-14 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
          />
          <div>
            <div className="text-xs font-semibold text-slate-500">Active Color</div>
            <div className="text-lg font-extrabold font-mono text-slate-900">{hex}</div>
            <div className="text-xs text-slate-500 font-mono">{rgbStr}</div>
          </div>
        </div>

        <label className="flex items-center justify-center gap-2.5 h-full min-h-[84px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer px-4 text-center">
          <Pipette className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-700">
            Upload image &amp; click any pixel to sample color
          </span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {imgObj && (
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex flex-col items-center gap-2">
          <span className="text-xs text-slate-500">Click anywhere on the image below to pick exact pixel color</span>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="max-h-80 w-auto max-w-full object-contain rounded cursor-crosshair"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'HEX', val: hex },
          { label: 'RGB', val: rgbStr },
          { label: 'HSL', val: hslStr },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <div className="text-[11px] font-semibold text-slate-400">{item.label}</div>
              <div className="text-sm font-bold font-mono text-slate-800">{item.val}</div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(item.val)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              title={`Copy ${item.label}`}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Saved History (localStorage)</span>
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                localStorage.removeItem('color_picker_history');
              }}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              Clear History
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((c) => (
              <div key={c} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 pr-2.5">
                <ColorSwatch
                  hex={c}
                  className="w-6 h-6 rounded border border-slate-200"
                  onClick={() => {
                    setHex(c);
                    handleCopy(c);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setHex(c);
                    handleCopy(c);
                  }}
                  className="text-xs font-mono font-semibold text-slate-700 hover:text-blue-600"
                >
                  {c}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* 13. Image to Base64 */
export const ImageToBase64Tool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [base64, setBase64] = useState<string>('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => setBase64((ev.target?.result as string) || '');
    reader.readAsDataURL(selected);
  };

  const handleCopy = async () => {
    if (!base64) {
      showToast('Please select an image first', 'info');
      return;
    }
    const ok = await copyToClipboard(base64);
    showToast(ok ? 'Base64 string copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
  };

  const handleDownloadTxt = () => {
    if (!base64 || !file) {
      showToast('Please select an image first', 'info');
      return;
    }
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadTextFile(base64, `${base}-base64.txt`);
    showToast('Base64 .txt downloaded');
  };

  return (
    <div className="space-y-5">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select an image file to encode into Base64'}
        </span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      {file && base64 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
          <span>File Size: {formatBytes(file.size)}</span>
          <span>·</span>
          <span>Base64 Length: {base64.length.toLocaleString()} chars</span>
          <span>·</span>
          <span>String Size: {formatBytes(base64.length)}</span>
        </div>
      )}

      <textarea
        rows={6}
        readOnly
        value={base64}
        placeholder="data:image/png;base64,... will appear here after selecting an image"
        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-xs font-mono text-slate-800"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Base64</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadTxt}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download .txt</span>
        </button>
      </div>
    </div>
  );
};

/* 14. Base64 to Image */
const SAMPLE_PIXEL_B64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAASElEQVR4nO3PQREAAAgDoC2G/Yt62cAT0M655w581tUB1AyoZkA1A6oZUM2AagZUM6CaAdUMqGZANQOqGVDNgGoGVDNg2gFv7gK/80+hSAAAAABJRU5ErkJggg==';

export const Base64ToImageTool: React.FC = () => {
  const { showToast } = useToast();
  const [rawInput, setRawInput] = useState<string>(SAMPLE_PIXEL_B64);
  const [imgError, setImgError] = useState<boolean>(false);

  const normalizedSrc = rawInput.trim()
    ? rawInput.trim().startsWith('data:image')
      ? rawInput.trim()
      : `data:image/png;base64,${rawInput.trim()}`
    : '';

  const handleDownloadPng = () => {
    if (!normalizedSrc || imgError) {
      showToast('Paste a valid Base64 image string first', 'error');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      downloadBlob(dataUrlToBlob(pngUrl), 'decoded-image.png');
      showToast('Decoded PNG downloaded');
    };
    img.onerror = () => showToast('Invalid Base64 image payload', 'error');
    img.src = normalizedSrc;
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-600">Paste Base64 String or Data URI</label>
          <button
            type="button"
            onClick={() => {
              setRawInput('');
              setImgError(false);
            }}
            className="text-xs text-slate-500 hover:text-red-600"
          >
            Clear
          </button>
        </div>
        <textarea
          rows={5}
          value={rawInput}
          onChange={(e) => {
            setRawInput(e.target.value);
            setImgError(false);
          }}
          placeholder="Paste data:image/png;base64,... or raw base64 characters"
          className="w-full rounded-xl border border-slate-300 p-3.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {normalizedSrc && !imgError && (
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 flex items-center justify-center max-h-80 overflow-hidden">
          <img
            src={normalizedSrc}
            alt="Decoded Base64 preview"
            onError={() => setImgError(true)}
            className="max-h-72 w-auto object-contain rounded"
          />
        </div>
      )}

      {imgError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
          Could not render image from this Base64 input. Verify the string is complete.
        </div>
      )}

      <button
        type="button"
        onClick={handleDownloadPng}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download PNG</span>
      </button>
    </div>
  );
};

/* 15. Image Cropper */
export const ImageCropperTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropW, setCropW] = useState<number>(400);
  const [cropH, setCropH] = useState<number>(300);
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
        const w = Math.max(1, Math.round(img.naturalWidth * 0.8));
        const h = Math.max(1, Math.round(img.naturalHeight * 0.8));
        setCropX(Math.round((img.naturalWidth - w) / 2));
        setCropY(Math.round((img.naturalHeight - h) / 2));
        setCropW(w);
        setCropH(h);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  useEffect(() => {
    if (!imgObj) return;
    const maxW = imgObj.naturalWidth;
    const maxH = imgObj.naturalHeight;
    const sx = clamp(cropX, 0, maxW - 1);
    const sy = clamp(cropY, 0, maxH - 1);
    const sw = clamp(cropW, 1, maxW - sx);
    const sh = clamp(cropH, 1, maxH - sy);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgObj, sx, sy, sw, sh, 0, 0, sw, sh);
    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [imgObj, cropX, cropY, cropW, cropH]);

  const setPresetAspect = (ratioW: number, ratioH: number) => {
    if (!imgObj) return;
    const iw = imgObj.naturalWidth;
    const ih = imgObj.naturalHeight;
    const targetRatio = ratioW / ratioH;
    let w = iw;
    let h = Math.round(iw / targetRatio);
    if (h > ih) {
      h = ih;
      w = Math.round(ih * targetRatio);
    }
    setCropX(Math.round((iw - w) / 2));
    setCropY(Math.round((ih - h) / 2));
    setCropW(w);
    setCropH(h);
  };

  const handleDownload = () => {
    if (!previewUrl || !file) {
      showToast('Please upload an image first', 'info');
      return;
    }
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(dataUrlToBlob(previewUrl), `${base}-cropped-${cropW}x${cropH}.png`);
    showToast('Cropped PNG downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select an image to crop'}
        </span>
        {imgObj && (
          <span className="text-xs text-slate-500 font-mono tabular-nums mt-1">
            Source: {imgObj.naturalWidth} × {imgObj.naturalHeight} px
          </span>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'X Offset (px)', val: cropX, setter: setCropX },
          { label: 'Y Offset (px)', val: cropY, setter: setCropY },
          { label: 'Crop Width (px)', val: cropW, setter: setCropW },
          { label: 'Crop Height (px)', val: cropH, setter: setCropH },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
            <input
              type="number"
              min={0}
              value={f.val}
              onChange={(e) => f.setter(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
            />
          </div>
        ))}
      </div>

      {imgObj && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPresetAspect(1, 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            1:1 Square
          </button>
          <button
            type="button"
            onClick={() => setPresetAspect(16, 9)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            16:9 Widescreen
          </button>
          <button
            type="button"
            onClick={() => setPresetAspect(4, 3)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            4:3 Standard
          </button>
        </div>
      )}

      {previewUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 flex items-center justify-center max-h-80 overflow-hidden">
          <img src={previewUrl} alt="Cropped preview" className="max-h-72 w-auto object-contain rounded" />
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Download Cropped Image</span>
      </button>
    </div>
  );
};

/* 50. Advanced Color Picker & Palette Studio */
interface SavedPalette {
  id: number;
  base: string;
  colors: string[];
}

export const AdvancedColorPickerTool: React.FC = () => {
  const { showToast } = useToast();
  const [hex, setHex] = useState<string>('#2563EB');
  const [hexInput, setHexInput] = useState<string>('#2563EB');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_color_palettes') || '[]');
    } catch {
      return [];
    }
  });

  const rgb = hexToRgb(hex) || { r: 37, g: 99, b: 235 };
  const hsl = rgbToHsl(rgb);

  const syncFromHex = (nextHex: string) => {
    const parsed = hexToRgb(nextHex);
    setHexInput(nextHex);
    if (parsed) {
      const normalized = rgbToHex(parsed);
      setHex(normalized);
    }
  };

  const syncFromRgb = (nextRgb: RGB) => {
    const normalized = rgbToHex(nextRgb);
    setHex(normalized);
    setHexInput(normalized);
  };

  const syncFromHsl = (nextHsl: HSL) => {
    const normalized = rgbToHex(hslToRgb(nextHsl));
    setHex(normalized);
    setHexInput(normalized);
  };

  const rotateHue = (deg: number) =>
    rgbToHex(hslToRgb({ h: (hsl.h + deg + 360) % 360, s: hsl.s, l: hsl.l }));

  const harmonies = [
    { name: 'Complementary', colors: [hex, rotateHue(180)] },
    { name: 'Analogous', colors: [rotateHue(-30), hex, rotateHue(30)] },
    { name: 'Triadic', colors: [hex, rotateHue(120), rotateHue(240)] },
    { name: 'Tetradic', colors: [hex, rotateHue(90), rotateHue(180), rotateHue(270)] },
  ];

  const shadesAndTints = [12, 24, 36, 48, 60, 72, 84, 92].map((lightness) =>
    rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: lightness }))
  );

  const handleExtractFromImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        const buckets = new Map<string, number>();
        for (let i = 0; i < data.length; i += 16) {
          if (data[i + 3] < 128) continue;
          const qr = Math.round(data[i] / 32) * 32;
          const qg = Math.round(data[i + 1] / 32) * 32;
          const qb = Math.round(data[i + 2] / 32) * 32;
          const cHex = rgbToHex({ r: qr, g: qg, b: qb });
          buckets.set(cHex, (buckets.get(cHex) || 0) + 1);
        }
        const top = Array.from(buckets.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([k]) => k);
        setExtractedColors(top);
        if (top[0]) syncFromHex(top[0]);
        showToast(`Extracted ${top.length} dominant colors`);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(selected);
  };

  const handleSavePalette = () => {
    const entry: SavedPalette = {
      id: Date.now(),
      base: hex,
      colors: [hex, rotateHue(30), rotateHue(120), rotateHue(180), rotateHue(240)],
    };
    const updated = [entry, ...savedPalettes].slice(0, 10);
    setSavedPalettes(updated);
    localStorage.setItem('saved_color_palettes', JSON.stringify(updated));
    showToast('Palette saved to localStorage');
  };

  const handleCopy = async (val: string) => {
    const ok = await copyToClipboard(val);
    showToast(ok ? `Copied ${val}` : 'Copy failed', ok ? 'success' : 'error');
  };

  return (
    <div className="space-y-7">
      {/* Synced Color Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-4">
          <input
            type="color"
            value={hex}
            onChange={(e) => syncFromHex(e.target.value)}
            className="w-16 h-16 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
          />
          <div className="space-y-1.5 flex-1">
            <label className="block text-xs font-semibold text-slate-500">HEX Code</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => syncFromHex(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono font-bold"
              />
              <button
                type="button"
                onClick={() => handleCopy(hex)}
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                title="Copy HEX"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RGB Synced */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">RGB Channels</span>
            <button
              type="button"
              onClick={() => handleCopy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Copy RGB
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['r', 'g', 'b'] as const).map((ch) => (
              <div key={ch}>
                <span className="text-[11px] uppercase font-mono text-slate-400">{ch}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[ch]}
                  onChange={(e) => syncFromRgb({ ...rgb, [ch]: clamp(Number(e.target.value), 0, 255) })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono tabular-nums"
                />
              </div>
            ))}
          </div>
        </div>

        {/* HSL Synced */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">HSL Channels</span>
            <button
              type="button"
              onClick={() => handleCopy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Copy HSL
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[11px] font-mono text-slate-400">H°</span>
              <input
                type="number"
                min={0}
                max={360}
                value={hsl.h}
                onChange={(e) => syncFromHsl({ ...hsl, h: clamp(Number(e.target.value), 0, 360) })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400">S%</span>
              <input
                type="number"
                min={0}
                max={100}
                value={hsl.s}
                onChange={(e) => syncFromHsl({ ...hsl, s: clamp(Number(e.target.value), 0, 100) })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono tabular-nums"
              />
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400">L%</span>
              <input
                type="number"
                min={0}
                max={100}
                value={hsl.l}
                onChange={(e) => syncFromHsl({ ...hsl, l: clamp(Number(e.target.value), 0, 100) })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono tabular-nums"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Harmonies */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {harmonies.map((hGroup) => (
          <div key={hGroup.name} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-700">{hGroup.name}</div>
            <div className="flex flex-wrap gap-2">
              {hGroup.colors.map((c, idx) => (
                <button
                  key={`${c}-${idx}`}
                  type="button"
                  onClick={() => handleCopy(c)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-1.5 pr-2.5 hover:bg-slate-50"
                >
                  <ColorSwatch hex={c} className="w-7 h-7 rounded border border-slate-200" />
                  <span className="text-xs font-mono font-semibold text-slate-700">{c}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Shades & Tints */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-700">Shades &amp; Tints (Click to Copy)</div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {shadesAndTints.map((st, idx) => (
            <button
              key={`${st}-${idx}`}
              type="button"
              onClick={() => handleCopy(st)}
              className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 hover:border-blue-400"
            >
              <ColorSwatch hex={st} className="w-full h-9 rounded" />
              <span className="text-[10px] font-mono text-slate-600">{st}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extract Colors from Image + Save Palette */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Extract Palette from Image</span>
          <input type="file" accept="image/*" onChange={handleExtractFromImage} className="hidden" />
        </label>

        <button
          type="button"
          onClick={handleSavePalette}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Palette</span>
        </button>

        <button
          type="button"
          onClick={() => {
            downloadTextFile(
              JSON.stringify({ base: hex, harmonies, shadesAndTints }, null, 2),
              `palette-${hex.slice(1)}.json`,
              'application/json'
            );
            showToast('Palette JSON downloaded');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          <span>Download JSON</span>
        </button>
      </div>

      {extractedColors.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">Extracted Image Palette</div>
          <div className="flex flex-wrap gap-2">
            {extractedColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  syncFromHex(c);
                  handleCopy(c);
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-3 hover:border-blue-400"
              >
                <ColorSwatch hex={c} className="w-7 h-7 rounded border border-slate-200" />
                <span className="text-xs font-mono font-semibold text-slate-700">{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {savedPalettes.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-700">Saved Palettes (localStorage)</div>
          <div className="space-y-2">
            {savedPalettes.map((pal) => (
              <div
                key={pal.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {pal.colors.map((c, idx) => (
                    <button
                      key={`${pal.id}-${idx}`}
                      type="button"
                      onClick={() => handleCopy(c)}
                      className="flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-1"
                    >
                      <ColorSwatch hex={c} className="w-4 h-4 rounded" />
                      <span className="text-[11px] font-mono text-slate-700">{c}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = savedPalettes.filter((p) => p.id !== pal.id);
                    setSavedPalettes(filtered);
                    localStorage.setItem('saved_color_palettes', JSON.stringify(filtered));
                  }}
                  className="text-slate-400 hover:text-red-600 p-1"
                  aria-label="Delete palette"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
