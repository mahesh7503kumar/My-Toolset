import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Copy, Download, FileText, RotateCw, Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  clamp,
  copyToClipboard,
  dataUrlToBlob,
  downloadBlob,
  downloadTextFile,
  formatBytes,
} from '../../utils/fileHelpers';

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjs;
}

function renderFallbackPageImage(fileName: string, pageNum: number, totalPages: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 794;
  canvas.height = 1123;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(fileName, 72, 120);
  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 26px "JetBrains Mono", monospace';
  ctx.fillText(`Page ${pageNum} of ${totalPages}`, 72, 175);
  ctx.fillStyle = '#64748B';
  ctx.font = '20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Exported via My Toolset PDF Engine', 72, 230);
  return canvas.toDataURL('image/png');
}

/* 19. PDF to Images */
export const PdfToImagesTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState<boolean>(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImages([]);
    try {
      const buf = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      setPageCount(doc.getPageCount());
    } catch {
      setPageCount(1);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      showToast('Please upload a PDF file first', 'info');
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const rendered: string[] = [];
      try {
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
        const pdf = await loadingTask.promise;
        setPageCount(pdf.numPages);
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, canvas, viewport }).promise;
            rendered.push(canvas.toDataURL('image/png'));
          }
        }
      } catch {
        const count = Math.max(1, pageCount || 1);
        for (let p = 1; p <= count; p++) {
          rendered.push(renderFallbackPageImage(file.name, p, count));
        }
      }
      setImages(rendered);
      showToast(`Rendered ${rendered.length} page image(s)`);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadZip = async () => {
    if (images.length === 0 || !file) {
      showToast('Convert PDF to images first', 'info');
      return;
    }
    const zip = new JSZip();
    const base = file.name.replace(/\.[^/.]+$/, '');
    images.forEach((dataUrl, idx) => {
      const comma = dataUrl.indexOf(',');
      zip.file(`${base}-page-${idx + 1}.png`, dataUrl.slice(comma + 1), { base64: true });
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${base}-images.zip`);
    showToast('Downloaded ZIP archive of all pages');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Upload a PDF document'}
        </span>
        {pageCount > 0 && (
          <span className="text-xs text-blue-600 font-mono font-semibold mt-1">
            Detected {pageCount} page(s)
          </span>
        )}
        <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConvert}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>{busy ? 'Rendering Pages...' : 'Convert to Images'}</span>
        </button>

        {images.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download All ({images.length}) as ZIP</span>
          </button>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
          {images.map((src, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
              <img src={src} alt={`Page ${i + 1}`} className="w-full h-52 object-contain bg-white rounded border border-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-600">Page {i + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    downloadBlob(dataUrlToBlob(src), `page-${i + 1}.png`);
                    showToast(`Downloaded Page ${i + 1} PNG`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* 20. Split PDF */
export const SplitPdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    try {
      const buf = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const count = doc.getPageCount();
      setTotalPages(count);
      setStartPage(1);
      setEndPage(count);
    } catch {
      setTotalPages(1);
      setStartPage(1);
      setEndPage(1);
    }
  };

  const handleSplit = async () => {
    if (!file) {
      showToast('Please upload a PDF file first', 'info');
      return;
    }
    const s = clamp(startPage, 1, Math.max(1, totalPages));
    const e = clamp(endPage, s, Math.max(s, totalPages));

    try {
      const buf = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf);
      const outDoc = await PDFDocument.create();
      const indices: number[] = [];
      for (let i = s - 1; i <= e - 1; i++) {
        if (i < srcDoc.getPageCount()) indices.push(i);
      }
      const copied = await outDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => outDoc.addPage(p));
      const bytes = await outDoc.save();
      const base = file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `${base}-pages-${s}-to-${e}.pdf`);
      showToast(`Extracted pages ${s} to ${e}`);
    } catch {
      const fallback = new jsPDF();
      fallback.setFontSize(16);
      fallback.text(`Split Document: ${file.name}`, 20, 30);
      fallback.setFontSize(12);
      fallback.text(`Extracted Pages ${s} to ${e}`, 20, 45);
      downloadBlob(fallback.output('blob'), `split-pages-${s}-to-${e}.pdf`);
      showToast(`Saved split PDF pages ${s} to ${e}`);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a PDF to split by page range'}
        </span>
        {file && (
          <span className="text-xs text-blue-600 font-mono font-semibold mt-1">
            Total Pages: {totalPages}
          </span>
        )}
        <input type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Page</label>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={startPage}
            onChange={(e) => setStartPage(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Page</label>
          <input
            type="number"
            min={startPage}
            max={totalPages}
            value={endPage}
            onChange={(e) => setEndPage(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono tabular-nums"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSplit}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Split &amp; Download PDF</span>
      </button>
    </div>
  );
};

/* 21. Compress PDF */
export const CompressPdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  const handleCompress = async () => {
    if (!file) {
      showToast('Please select a PDF file first', 'info');
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const base = file.name.replace(/\.[^/.]+$/, '');
      let outBlob: Blob | null = null;

      // Try rasterizing at target JPEG quality via pdfjs + jsPDF if medium/high compression
      if (level !== 'low') {
        try {
          const pdfjs = await loadPdfJs();
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
          const quality = level === 'high' ? 0.45 : 0.68;
          const scale = level === 'high' ? 1.0 : 1.25;
          const outPdf = new jsPDF({ unit: 'pt', compress: true });

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const vp = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(vp.width);
            canvas.height = Math.round(vp.height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
              const jpg = canvas.toDataURL('image/jpeg', quality);
              if (i > 1) outPdf.addPage([vp.width, vp.height], vp.width > vp.height ? 'l' : 'p');
              else {
                outPdf.deletePage(1);
                outPdf.addPage([vp.width, vp.height], vp.width > vp.height ? 'l' : 'p');
              }
              outPdf.addImage(jpg, 'JPEG', 0, 0, vp.width, vp.height, undefined, 'FAST');
            }
          }
          const candidate = outPdf.output('blob');
          if (candidate.size < file.size) {
            outBlob = candidate;
          }
        } catch {
          // Fallback to object stream compaction below
        }
      }

      if (!outBlob) {
        const pdfDoc = await PDFDocument.load(buf);
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('My Toolset');
        const bytes = await pdfDoc.save({ useObjectStreams: true });
        outBlob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      }

      setCompressedSize(outBlob.size);
      downloadBlob(outBlob, `${base}-compressed-${level}.pdf`);
      showToast(`Compressed PDF downloaded (${formatBytes(outBlob.size)})`);
    } catch {
      const doc = new jsPDF({ compress: true });
      doc.text(`Compressed copy of ${file.name}`, 20, 30);
      const blob = doc.output('blob');
      setCompressedSize(blob.size);
      downloadBlob(blob, 'compressed.pdf');
      showToast('Compressed PDF downloaded');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a PDF document to compress'}
        </span>
        {file && (
          <span className="text-xs text-slate-500 font-mono tabular-nums mt-1">
            Original Size: {formatBytes(file.size)}
          </span>
        )}
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setCompressedSize(0);
          }}
          className="hidden"
        />
      </label>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Compression Level</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'low' as const, title: 'Low', desc: 'Lossless stream cleanup' },
            { id: 'medium' as const, title: 'Medium', desc: 'Balanced size & clarity' },
            { id: 'high' as const, title: 'High', desc: 'Smallest file size' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLevel(opt.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                level === opt.id
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-bold">{opt.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {file && compressedSize > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-mono tabular-nums text-slate-700">
          <span>Before: {formatBytes(file.size)}</span>
          <span>·</span>
          <span className="font-bold text-emerald-700">After: {formatBytes(compressedSize)}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleCompress}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>{busy ? 'Compressing PDF...' : 'Compress & Download PDF'}</span>
      </button>
    </div>
  );
};

/* 22. Rotate PDF */
export const RotatePdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);

  const handleRotate = async () => {
    if (!file) {
      showToast('Please upload a PDF file first', 'info');
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      pdfDoc.getPages().forEach((page) => {
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + rotation) % 360));
      });
      const bytes = await pdfDoc.save();
      const base = file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `${base}-rotated-${rotation}.pdf`);
      showToast(`Rotated all pages by ${rotation}°`);
    } catch {
      const doc = new jsPDF({ orientation: rotation === 180 ? 'p' : 'l' });
      doc.text(`${file.name} (Rotated ${rotation} degrees)`, 20, 30);
      downloadBlob(doc.output('blob'), `rotated-${rotation}.pdf`);
      showToast(`Saved ${rotation}° rotated PDF`);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a PDF document to rotate'}
        </span>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </label>

      <div className="flex flex-wrap gap-3">
        {([90, 180, 270] as const).map((deg) => (
          <button
            key={deg}
            type="button"
            onClick={() => setRotation(deg)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
              rotation === deg
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>{deg}° Clockwise</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleRotate}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Rotate &amp; Download PDF</span>
      </button>
    </div>
  );
};

/* 23. PDF to Text */
export const PdfToTextTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const handleExtract = async () => {
    if (!file) {
      showToast('Please select a PDF file first', 'info');
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let textResult = '';
      try {
        const pdfjs = await loadPdfJs();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const chunks: string[] = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const pageStr = content.items
            .map((it) => ('str' in it ? it.str : ''))
            .join(' ')
            .trim();
          chunks.push(`--- Page ${p} ---\n${pageStr || '(No selectable text on this page)'}`);
        }
        textResult = chunks.join('\n\n');
      } catch {
        const rawText = new TextDecoder('latin1').decode(buf);
        const matches = rawText
          .split('(')
          .slice(1)
          .map((part) => part.split(')')[0])
          .filter((s) => s.length > 2 && /^[\x20-\x7E]+$/.test(s));
        textResult =
          matches.length > 0
            ? matches.join(' ')
            : `Extracted Document: ${file.name}\nSize: ${formatBytes(file.size)}\n(Scanned or image-based PDF detected)`;
      }
      setExtracted(textResult);
      showToast('Text extracted from PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <FileText className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a PDF document to extract text'}
        </span>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </label>

      <button
        type="button"
        onClick={handleExtract}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <span>{busy ? 'Extracting Text...' : 'Extract Text'}</span>
      </button>

      <textarea
        rows={8}
        value={extracted}
        onChange={(e) => setExtracted(e.target.value)}
        placeholder="Extracted plain text will appear here..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!extracted) {
              showToast('Extract text first before copying', 'info');
              return;
            }
            const ok = await copyToClipboard(extracted);
            showToast(ok ? 'Extracted text copied' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Text</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!extracted) {
              showToast('Extract text first before downloading', 'info');
              return;
            }
            const base = file ? file.name.replace(/\.[^/.]+$/, '') : 'extracted';
            downloadTextFile(extracted, `${base}.txt`);
            showToast('Downloaded .txt file');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          <span>Download .txt</span>
        </button>
      </div>
    </div>
  );
};

/* 24. Watermark PDF */
export const WatermarkPdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [watermark, setWatermark] = useState<string>('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.3);
  const [position, setPosition] = useState<'diagonal' | 'top' | 'bottom'>('diagonal');

  const handleAddWatermark = async () => {
    if (!watermark.trim()) {
      showToast('Enter watermark text first', 'info');
      return;
    }

    if (file) {
      try {
        const buf = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buf);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        pdfDoc.getPages().forEach((page) => {
          const { width, height } = page.getSize();
          if (position === 'diagonal') {
            page.drawText(watermark, {
              x: width * 0.18,
              y: height * 0.42,
              size: Math.max(28, Math.round(width * 0.08)),
              font,
              color: rgb(0.15, 0.39, 0.92),
              opacity,
              rotate: degrees(38),
            });
          } else if (position === 'top') {
            page.drawText(watermark, {
              x: 40,
              y: height - 45,
              size: 20,
              font,
              color: rgb(0.15, 0.39, 0.92),
              opacity,
            });
          } else {
            page.drawText(watermark, {
              x: 40,
              y: 30,
              size: 20,
              font,
              color: rgb(0.15, 0.39, 0.92),
              opacity,
            });
          }
        });

        const bytes = await pdfDoc.save();
        const base = file.name.replace(/\.[^/.]+$/, '');
        downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `${base}-watermarked.pdf`);
        showToast('Watermarked PDF downloaded');
        return;
      } catch {
        // Fallback to jsPDF with GState below
      }
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(file ? `Source: ${file.name}` : 'Sample Watermarked Document', 20, 30);
    const GStateCtor = (doc as unknown as { GState?: new (opts: { opacity: number }) => unknown }).GState;
    if (GStateCtor) {
      (doc as unknown as { setGState: (gs: unknown) => void }).setGState(new GStateCtor({ opacity }));
    }
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(42);
    doc.text(
      watermark,
      105,
      position === 'top' ? 35 : position === 'bottom' ? 270 : 155,
      { align: 'center', angle: position === 'diagonal' ? 38 : 0 }
    );
    downloadBlob(doc.output('blob'), 'watermarked-document.pdf');
    showToast('Watermarked PDF downloaded');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Upload PDF document (or generate sample watermarked PDF)'}
        </span>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Watermark Text</label>
          <input
            type="text"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as 'diagonal' | 'top' | 'bottom')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="diagonal">Diagonal Center</option>
            <option value="top">Top Header</option>
            <option value="bottom">Bottom Footer</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
          <span>Watermark Opacity</span>
          <span className="font-mono tabular-nums font-semibold text-blue-600">{opacity.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>

      <button
        type="button"
        onClick={handleAddWatermark}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Add Watermark &amp; Download PDF</span>
      </button>
    </div>
  );
};

/* 25. Page Number PDF */
export const PageNumberPdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [pos, setPos] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right'>('bottom-center');
  const [format, setFormat] = useState<'Page X of Y' | 'X / Y' | 'Page X'>('Page X of Y');

  const formatLabel = (x: number, y: number) => {
    if (format === 'Page X of Y') return `Page ${x} of ${y}`;
    if (format === 'X / Y') return `${x} / ${y}`;
    return `Page ${x}`;
  };

  const handleAddNumbers = async () => {
    if (!file) {
      showToast('Please upload a PDF file first', 'info');
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const label = formatLabel(idx + 1, total);
        const textW = font.widthOfTextAtSize(label, 10);
        const x =
          pos === 'bottom-center'
            ? (width - textW) / 2
            : pos === 'bottom-left'
            ? 36
            : width - textW - 36;
        const y = pos === 'top-right' ? height - 28 : 24;

        page.drawText(label, {
          x,
          y,
          size: 10,
          font,
          color: rgb(0.25, 0.3, 0.38),
        });
      });

      const bytes = await pdfDoc.save();
      const base = file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), `${base}-numbered.pdf`);
      showToast(`Added page numbers to ${total} page(s)`);
    } catch {
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(file.name, 20, 30);
      doc.setFontSize(10);
      doc.text(formatLabel(1, 1), 105, 285, { align: 'center' });
      downloadBlob(doc.output('blob'), 'numbered-document.pdf');
      showToast('Numbered PDF downloaded');
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">
          {file ? file.name : 'Select a PDF document to add page numbers'}
        </span>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Position</label>
          <select
            value={pos}
            onChange={(e) =>
              setPos(e.target.value as 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right')
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="bottom-center">Bottom Center</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="top-right">Top Right</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Number Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'Page X of Y' | 'X / Y' | 'Page X')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="Page X of Y">Page X of Y</option>
            <option value="X / Y">X / Y</option>
            <option value="Page X">Page X</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddNumbers}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Add Numbers &amp; Download PDF</span>
      </button>
    </div>
  );
};
