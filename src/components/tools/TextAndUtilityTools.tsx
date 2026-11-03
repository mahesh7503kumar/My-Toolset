import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { copyToClipboard, downloadBlob, downloadTextFile } from '../../utils/fileHelpers';

/* 26. Word Counter */
export const WordCounterTool: React.FC = () => {
  const { showToast } = useToast();
  const [text, setText] = useState<string>('');

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const sentences = trimmed ? trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length : 0;
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Words', value: words },
          { label: 'Characters', value: chars },
          { label: 'No Spaces', value: charsNoSpaces },
          { label: 'Sentences', value: sentences },
          { label: 'Paragraphs', value: paragraphs },
          { label: 'Read Time', value: `${readingMinutes}m` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{stat.label}</div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type your text here to analyze word & character counts..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!text) {
              showToast('Type some text first to copy', 'info');
              return;
            }
            const ok = await copyToClipboard(text);
            showToast(ok ? 'Text copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Text</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(
              `Words: ${words} | Characters: ${chars} | Sentences: ${sentences} | Paragraphs: ${paragraphs}`
            );
            showToast(ok ? 'Statistics copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Stats</span>
        </button>
        <button
          type="button"
          onClick={() => setText('')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

/* 27. Case Converter */
export const CaseConverterTool: React.FC = () => {
  const { showToast } = useToast();
  const [text, setText] = useState<string>('Welcome to My Toolset! Convert any text case with one click.');

  const toTitleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  const toSentenceCase = (s: string) =>
    s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());

  const toCamelCase = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
      .replace(/^[A-Z]/, (c) => c.toLowerCase());

  const toSnakeCase = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const toKebabCase = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleDownloadTxt = () => {
    if (!text) {
      showToast('Enter text before downloading', 'info');
      return;
    }
    downloadTextFile(text, 'converted-text.txt');
    showToast('Downloaded converted-text.txt');
  };

  return (
    <div className="space-y-5">
      <textarea
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to transform..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'UPPERCASE', fn: () => setText(text.toUpperCase()) },
          { label: 'lowercase', fn: () => setText(text.toLowerCase()) },
          { label: 'Title Case', fn: () => setText(toTitleCase(text)) },
          { label: 'Sentence case', fn: () => setText(toSentenceCase(text)) },
          { label: 'camelCase', fn: () => setText(toCamelCase(text)) },
          { label: 'snake_case', fn: () => setText(toSnakeCase(text)) },
          { label: 'kebab-case', fn: () => setText(toKebabCase(text)) },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.fn}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={async () => {
            if (!text) {
              showToast('Enter text first', 'info');
              return;
            }
            const ok = await copyToClipboard(text);
            showToast(ok ? 'Converted text copied' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Text</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadTxt}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download .txt</span>
        </button>
      </div>
    </div>
  );
};

/* 28. Password Generator */
export const PasswordGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const [length, setLength] = useState<number>(16);
  const [upper, setUpper] = useState<boolean>(true);
  const [lower, setLower] = useState<boolean>(true);
  const [numbers, setNumbers] = useState<boolean>(true);
  const [symbols, setSymbols] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');

  const generatePassword = useCallback(() => {
    let pool = '';
    if (upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) pool += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) pool += '0123456789';
    if (symbols) pool += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!pool) pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    let out = '';
    for (let i = 0; i < length; i++) {
      out += pool[randomValues[i] % pool.length];
    }
    setPassword(out);
  }, [length, upper, lower, numbers, symbols]);

  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  const strengthLabel =
    length >= 16 && [upper, lower, numbers, symbols].filter(Boolean).length >= 3
      ? 'Strong'
      : length >= 10
      ? 'Moderate'
      : 'Weak';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="font-mono text-base sm:text-lg font-semibold text-slate-900 break-all select-all">
          {password}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={generatePassword}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(password);
              showToast(ok ? 'Password copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
          <span>Password Length</span>
          <span className="font-mono tabular-nums font-semibold text-blue-600">
            {length} chars · {strengthLabel}
          </span>
        </div>
        <input
          type="range"
          min={6}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          { label: 'Uppercase (A-Z)', state: upper, setter: setUpper },
          { label: 'Lowercase (a-z)', state: lower, setter: setLower },
          { label: 'Numbers (0-9)', state: numbers, setter: setNumbers },
          { label: 'Symbols (!@#$)', state: symbols, setter: setSymbols },
        ].map((opt) => (
          <label
            key={opt.label}
            className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={opt.state}
              onChange={(e) => opt.setter(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span className="text-xs font-medium text-slate-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

/* 29. Base64 Encode / Decode */
export const Base64Tool: React.FC = () => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState<string>('My Toolset - Fast & Offline');

  let output = '';
  let errorMsg = '';
  try {
    if (mode === 'encode') {
      const bytes = new TextEncoder().encode(input);
      let bin = '';
      bytes.forEach((b) => {
        bin += String.fromCharCode(b);
      });
      output = input ? btoa(bin) : '';
    } else {
      if (input.trim()) {
        const bin = atob(input.trim());
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        output = new TextDecoder().decode(bytes);
      }
    }
  } catch {
    errorMsg = 'Invalid Base64 string. Please check your encoded input.';
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('encode')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            mode === 'encode' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Encode to Base64
        </button>
        <button
          type="button"
          onClick={() => setMode('decode')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            mode === 'decode' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Decode from Base64
        </button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          {mode === 'encode' ? 'Plain Text Input' : 'Base64 Input'}
        </label>
        <textarea
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Paste Base64 string...'}
          className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Result</label>
        {errorMsg ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        ) : (
          <textarea
            rows={4}
            readOnly
            value={output}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-mono text-slate-800"
          />
        )}
      </div>

      <button
        type="button"
        onClick={async () => {
          if (!output || errorMsg) {
            showToast('No valid output to copy', 'info');
            return;
          }
          const ok = await copyToClipboard(output);
          showToast(ok ? 'Result copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Copy Output</span>
      </button>
    </div>
  );
};

/* 36. QR Generator */
export const QrGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [value, setValue] = useState<string>('https://mytoolset.app');
  const [size, setSize] = useState<number>(256);
  const [fgColor, setFgColor] = useState<string>('#0F172A');
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');

  useEffect(() => {
    if (!canvasRef.current) return;
    const target = value.trim() || ' ';
    QRCode.toCanvas(
      canvasRef.current,
      target,
      {
        width: size,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      },
      () => {}
    );
  }, [value, size, fgColor, bgColor]);

  const handleDownload = () => {
    if (!canvasRef.current || !value.trim()) {
      showToast('Enter text or URL for the QR code first', 'info');
      return;
    }
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, 'qrcode.png');
      showToast('QR Code PNG downloaded');
    }, 'image/png');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            URL, Text, or UPI String
          </label>
          <textarea
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter link or text..."
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            QR Resolution ({size} × {size} px)
          </label>
          <input
            type="range"
            min={160}
            max={512}
            step={32}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>

        <div className="flex items-center gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Foreground</label>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="h-9 w-16 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Background</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-9 w-16 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-4">
        <canvas ref={canvasRef} className="rounded-lg shadow-sm max-w-full h-auto" />
        <button
          type="button"
          onClick={handleDownload}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download QR PNG</span>
        </button>
      </div>
    </div>
  );
};

/* 48. Age Calculator */
export const AgeCalculatorTool: React.FC = () => {
  const { showToast } = useToast();
  const todayStr = new Date().toISOString().split('T')[0];
  const [dob, setDob] = useState<string>('1998-05-15');
  const [asOf, setAsOf] = useState<string>(todayStr);

  let years = 0;
  let months = 0;
  let days = 0;
  let totalDays = 0;
  let nextBirthdayDays = 0;
  let valid = false;

  if (dob && asOf) {
    const start = new Date(dob + 'T00:00:00');
    const end = new Date(asOf + 'T00:00:00');
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      valid = true;
      years = end.getFullYear() - start.getFullYear();
      months = end.getMonth() - start.getMonth();
      days = end.getDate() - start.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const nextBday = new Date(end.getFullYear(), start.getMonth(), start.getDate());
      if (nextBday < end) {
        nextBday.setFullYear(end.getFullYear() + 1);
      }
      nextBirthdayDays = Math.ceil((nextBday.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date of Birth</label>
          <input
            type="date"
            value={dob}
            max={asOf}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Calculate Age As Of</label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {valid ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tabular-nums">
                {years}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Years</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                {months}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Months</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                {days}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">Days</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 font-mono tabular-nums">
            <span>Total Days: {totalDays.toLocaleString()}</span>
            <span>·</span>
            <span>Total Weeks: {Math.floor(totalDays / 7).toLocaleString()}</span>
            <span>·</span>
            <span>Next Birthday in: {nextBirthdayDays} day(s)</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(
                `Age: ${years} years, ${months} months, ${days} days (${totalDays.toLocaleString()} total days)`
              );
              showToast(ok ? 'Age summary copied' : 'Copy failed', ok ? 'success' : 'error');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Age Summary</span>
          </button>
        </div>
      ) : (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          Please choose a Date of Birth earlier than or equal to the target date.
        </div>
      )}
    </div>
  );
};

/* 49. Percentage Calculator */
export const PercentageCalculatorTool: React.FC = () => {
  const { showToast } = useToast();
  const [pctX, setPctX] = useState<string>('18');
  const [pctY, setPctY] = useState<string>('1999');

  const [partX, setPartX] = useState<string>('450');
  const [wholeY, setWholeY] = useState<string>('1800');

  const [fromX, setFromX] = useState<string>('5999');
  const [toY, setToY] = useState<string>('1999');

  const res1 = ((Number(pctX) || 0) / 100) * (Number(pctY) || 0);
  const res2 = Number(wholeY) ? ((Number(partX) || 0) / Number(wholeY)) * 100 : 0;
  const res3 = Number(fromX) ? (((Number(toY) || 0) - Number(fromX)) / Number(fromX)) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-600">1. What is X% of Y?</div>
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <span>What is</span>
          <input
            type="number"
            value={pctX}
            onChange={(e) => setPctX(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono tabular-nums"
          />
          <span>% of</span>
          <input
            type="number"
            value={pctY}
            onChange={(e) => setPctY(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono tabular-nums"
          />
          <span className="ml-auto font-mono tabular-nums text-base font-bold text-blue-600">
            = {Number.isFinite(res1) ? res1.toFixed(2) : '0.00'}
          </span>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(res1.toFixed(2));
              showToast(ok ? `Copied ${res1.toFixed(2)}` : 'Copy failed', ok ? 'success' : 'error');
            }}
            className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
            title="Copy result"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-600">2. X is what percent of Y?</div>
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <input
            type="number"
            value={partX}
            onChange={(e) => setPartX(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono tabular-nums"
          />
          <span>is what % of</span>
          <input
            type="number"
            value={wholeY}
            onChange={(e) => setWholeY(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono tabular-nums"
          />
          <span className="ml-auto font-mono tabular-nums text-base font-bold text-blue-600">
            = {Number.isFinite(res2) ? res2.toFixed(2) : '0.00'}%
          </span>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(`${res2.toFixed(2)}%`);
              showToast(ok ? `Copied ${res2.toFixed(2)}%` : 'Copy failed', ok ? 'success' : 'error');
            }}
            className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
            title="Copy result"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="text-xs font-semibold text-slate-600">3. Percentage Change from X to Y</div>
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <span>From</span>
          <input
            type="number"
            value={fromX}
            onChange={(e) => setFromX(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono tabular-nums"
          />
          <span>to</span>
          <input
            type="number"
            value={toY}
            onChange={(e) => setToY(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono tabular-nums"
          />
          <span
            className={`ml-auto font-mono tabular-nums text-base font-bold ${
              res3 >= 0 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            = {res3 >= 0 ? '+' : ''}
            {Number.isFinite(res3) ? res3.toFixed(2) : '0.00'}%
          </span>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(`${res3.toFixed(2)}%`);
              showToast(ok ? `Copied ${res3.toFixed(2)}%` : 'Copy failed', ok ? 'success' : 'error');
            }}
            className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
            title="Copy result"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
