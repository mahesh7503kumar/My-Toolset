import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Download, FilePlus2, Trash2, Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { downloadBlob } from '../../utils/fileHelpers';

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number; pngDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        pngDataUrl: canvas.toDataURL('image/jpeg', 0.92),
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* 16. Images to PDF */
export const ImagesToPdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [orientation, setOrientation] = useState<'p' | 'l'>('p');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExportPdf = async () => {
    if (files.length === 0) {
      showToast('Please select at least 1 image first', 'info');
      return;
    }
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      for (let i = 0; i < files.length; i++) {
        if (i > 0) doc.addPage();
        const rawUrl = await readFileAsDataURL(files[i]);
        const { width, height, pngDataUrl } = await loadImageDimensions(rawUrl);
        const ratio = Math.min(maxW / width, maxH / height);
        const renderW = width * ratio;
        const renderH = height * ratio;
        const x = (pageW - renderW) / 2;
        const y = (pageH - renderH) / 2;
        doc.addImage(pngDataUrl, 'JPEG', x, y, renderW, renderH);
      }

      downloadBlob(doc.output('blob'), 'my-toolset-images.pdf');
      showToast(`Exported ${files.length} image(s) to PDF`);
    } catch {
      showToast('Failed to generate PDF from images', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <Upload className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">Select one or multiple images</span>
        <span className="text-xs text-slate-500 mt-1">JPG, PNG, WebP supported — each image placed on an A4 page</span>
        <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      </label>

      <div className="flex items-center gap-4">
        <label className="text-xs font-semibold text-slate-600">Page Orientation:</label>
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setOrientation('p')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              orientation === 'p' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Portrait
          </button>
          <button
            type="button"
            onClick={() => setOrientation('l')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              orientation === 'l' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Landscape
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {files.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="truncate pr-3">
                <span className="font-mono text-xs text-slate-400 mr-2">{idx + 1}.</span>
                <span className="font-medium text-slate-800">{f.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                aria-label="Remove image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleExportPdf}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>{isGenerating ? 'Building PDF...' : `Download PDF (${files.length || 0} Page${files.length === 1 ? '' : 's'})`}</span>
      </button>
    </div>
  );
};

/* 17. Merge PDF */
export const MergePdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState<boolean>(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      showToast('Please select at least 2 files to merge', 'info');
      return;
    }
    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const donorPdf = await PDFDocument.load(buffer);
          const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          copiedPages.forEach((p) => mergedPdf.addPage(p));
        } else if (file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataURL(file);
          const { width, height, pngDataUrl } = await loadImageDimensions(dataUrl);
          const tempDoc = new jsPDF({ unit: 'mm', format: 'a4' });
          const pw = tempDoc.internal.pageSize.getWidth();
          const ph = tempDoc.internal.pageSize.getHeight();
          const scale = Math.min((pw - 20) / width, (ph - 20) / height);
          const rw = width * scale;
          const rh = height * scale;
          tempDoc.addImage(pngDataUrl, 'JPEG', (pw - rw) / 2, (ph - rh) / 2, rw, rh);
          const singlePdfBytes = tempDoc.output('arraybuffer');
          const donorPdf = await PDFDocument.load(singlePdfBytes);
          const [page] = await mergedPdf.copyPages(donorPdf, [0]);
          mergedPdf.addPage(page);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
      downloadBlob(blob, 'merged-document.pdf');
      showToast(`Merged ${files.length} files into a single PDF`);
    } catch {
      showToast('Could not merge one of the selected PDF files', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors px-4 text-center">
        <FilePlus2 className="w-6 h-6 text-blue-600 mb-2" />
        <span className="text-sm font-semibold text-slate-800">Add 2 or more PDF files to combine</span>
        <span className="text-xs text-slate-500 mt-1">Preserves all pages in order — 100% client-side merge</span>
        <input type="file" accept="application/pdf,image/*" multiple onChange={handleFiles} className="hidden" />
      </label>

      {files.length > 0 && (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {files.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="truncate pr-3">
                <span className="font-mono text-xs text-slate-400 mr-2">{idx + 1}.</span>
                <span className="font-medium text-slate-800">{f.name}</span>
                <span className="ml-2 text-xs text-slate-400 font-mono tabular-nums">
                  ({(f.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                aria-label="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleMerge}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>{isMerging ? 'Merging PDFs...' : `Merge & Download PDF (${files.length} files)`}</span>
      </button>
    </div>
  );
};

/* 18. Create PDF */
export const CreatePdfTool: React.FC = () => {
  const { showToast } = useToast();
  const [title, setTitle] = useState<string>('Project Notes');
  const [fontSize, setFontSize] = useState<number>(12);
  const [content, setContent] = useState<string>(
    'Write or paste your document content here.\n\nEverything stays private in your browser and exports cleanly into a formatted A4 PDF file.'
  );

  const handleDownloadPdf = () => {
    if (!content.trim() && !title.trim()) {
      showToast('Enter a title or body text first', 'info');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const maxLineW = pageW - margin * 2;
    let cursorY = margin;

    if (title.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize + 6);
      const titleLines = doc.splitTextToSize(title.trim(), maxLineW);
      doc.text(titleLines, margin, cursorY);
      cursorY += titleLines.length * ((fontSize + 6) * 0.45) + 6;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const lineHeight = fontSize * 0.48;
    const lines: string[] = doc.splitTextToSize(content, maxLineW);

    for (const line of lines) {
      if (cursorY + lineHeight > pageH - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    }

    const slug = (title.trim() || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadBlob(doc.output('blob'), `${slug}.pdf`);
    showToast('PDF created and downloaded');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Document"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Body Font Size (pt)</label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value={10}>10 pt (Compact)</option>
            <option value={12}>12 pt (Standard)</option>
            <option value={14}>14 pt (Comfortable)</option>
            <option value={16}>16 pt (Large)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Document Content</label>
        <textarea
          rows={9}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your PDF body text here..."
          className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <button
        type="button"
        onClick={handleDownloadPdf}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Generate &amp; Download PDF</span>
      </button>
    </div>
  );
};
