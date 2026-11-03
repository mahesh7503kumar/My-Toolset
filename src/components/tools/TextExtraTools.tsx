import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { copyToClipboard, downloadTextFile } from '../../utils/fileHelpers';

/* 30. JSON Formatter */
export const JsonFormatterTool: React.FC = () => {
  const { showToast } = useToast();
  const [input, setInput] = useState<string>(
    '{"app":"My Toolset","toolsCount":50,"offline":true,"categories":["Image","PDF","Text","QR","Daily","Calculator"]}'
  );
  const [status, setStatus] = useState<{ valid: boolean; msg: string } | null>(null);

  const parseWithLineHint = (raw: string): { ok: true; data: unknown } | { ok: false; err: string } => {
    try {
      const parsed = JSON.parse(raw);
      return { ok: true, data: parsed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON syntax';
      const posMatch = msg.indexOf('position ');
      if (posMatch !== -1) {
        const posNum = parseInt(msg.slice(posMatch + 9), 10);
        if (!Number.isNaN(posNum)) {
          const upto = raw.slice(0, posNum);
          const line = upto.split('\n').length;
          return { ok: false, err: `Line ${line}: ${msg}` };
        }
      }
      return { ok: false, err: msg };
    }
  };

  const handleFormat = () => {
    const res = parseWithLineHint(input);
    if (!res.ok) {
      setStatus({ valid: false, msg: res.err });
      return;
    }
    setInput(JSON.stringify(res.data, null, 2));
    setStatus({ valid: true, msg: 'Valid JSON — Formatted with 2-space indentation' });
  };

  const handleMinify = () => {
    const res = parseWithLineHint(input);
    if (!res.ok) {
      setStatus({ valid: false, msg: res.err });
      return;
    }
    setInput(JSON.stringify(res.data));
    setStatus({ valid: true, msg: 'Valid JSON — Minified to single line' });
  };

  const handleValidate = () => {
    const res = parseWithLineHint(input);
    if (!res.ok) {
      setStatus({ valid: false, msg: res.err });
    } else {
      setStatus({ valid: true, msg: 'Valid JSON syntax' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleFormat}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700"
        >
          Format (2 Spaces)
        </button>
        <button
          type="button"
          onClick={handleMinify}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-semibold hover:bg-slate-50"
        >
          Minify
        </button>
        <button
          type="button"
          onClick={handleValidate}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs sm:text-sm font-semibold hover:bg-slate-50"
        >
          Validate
        </button>
      </div>

      {status && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-mono flex items-center gap-2 ${
            status.valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.valid && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{status.msg}</span>
        </div>
      )}

      <textarea
        rows={11}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste raw JSON here..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(input);
            showToast(ok ? 'JSON copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Copy className="w-4 h-4" />
          <span>Copy JSON</span>
        </button>
        <button
          type="button"
          onClick={() => {
            downloadTextFile(input, 'formatted.json', 'application/json');
            showToast('Downloaded formatted.json');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          <span>Download .json</span>
        </button>
      </div>
    </div>
  );
};

/* 31. Text to Speech */
export const TextToSpeechTool: React.FC = () => {
  const { showToast } = useToast();
  const [text, setText] = useState<string>(
    'Hello from My Toolset! All fifty browser tools run privately on your device.'
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
      if (list.length > 0 && !selectedVoice) {
        setSelectedVoice(list[0].name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [selectedVoice]);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech Synthesis is not supported in this browser', 'error');
      return;
    }
    if (!text.trim()) {
      showToast('Enter text to speak first', 'info');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const found = voices.find((v) => v.name === selectedVoice);
    if (found) utter.voice = found;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="space-y-5">
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type text to read aloud..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">System Voice</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {voices.length === 0 ? (
              <option value="">Default System Voice</option>
            ) : (
              voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Rate ({rate.toFixed(1)}x)</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Pitch ({pitch.toFixed(1)})</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Volume ({Math.round(volume * 100)}%)
          </label>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={handleSpeak}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <Volume2 className="w-4 h-4" />
          <span>Speak</span>
        </button>
        <button
          type="button"
          onClick={() => window.speechSynthesis?.pause()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Pause className="w-4 h-4" />
          <span>Pause</span>
        </button>
        <button
          type="button"
          onClick={() => window.speechSynthesis?.resume()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Play className="w-4 h-4" />
          <span>Resume</span>
        </button>
        <button
          type="button"
          onClick={() => window.speechSynthesis?.cancel()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-red-600 text-sm font-semibold hover:bg-red-50"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
};

/* 32. Speech to Text */
interface SpeechRecInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const SpeechToTextTool: React.FC = () => {
  const { showToast } = useToast();
  const recRef = useRef<SpeechRecInstance | null>(null);
  const [lang, setLang] = useState<string>('en-US');
  const [listening, setListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  const toggleListening = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecInstance;
      webkitSpeechRecognition?: new () => SpeechRecInstance;
    };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) {
      showToast('SpeechRecognition API requires Chromium / Chrome / Edge', 'error');
      return;
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        chunk += event.results[i][0].transcript + ' ';
      }
      setTranscript((prev) => (prev ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()));
    };
    rec.onerror = () => {
      setListening(false);
      showToast('Microphone access stopped or denied', 'error');
    };
    rec.onend = () => {
      setListening(false);
    };

    recRef.current = rec;
    rec.start();
    setListening(true);
    showToast(`Listening (${lang})...`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium"
        >
          <option value="en-US">English (US - en-US)</option>
          <option value="en-IN">English (India - en-IN)</option>
          <option value="hi-IN">Hindi (भारत - hi-IN)</option>
        </select>

        <button
          type="button"
          onClick={toggleListening}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
            listening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{listening ? 'Stop Listening' : 'Start Listening'}</span>
        </button>
      </div>

      <textarea
        rows={7}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Click Start Listening and speak into your microphone, or edit notes directly..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!transcript) {
              showToast('Nothing to copy yet', 'info');
              return;
            }
            const ok = await copyToClipboard(transcript);
            showToast(ok ? 'Transcript copied' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Transcript</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!transcript) {
              showToast('Nothing to download yet', 'info');
              return;
            }
            downloadTextFile(transcript, 'transcript.txt');
            showToast('Downloaded transcript.txt');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          <span>Download .txt</span>
        </button>
        <button
          type="button"
          onClick={() => setTranscript('')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

/* 33. URL Encoder */
export const UrlEncoderTool: React.FC = () => {
  const { showToast } = useToast();
  const [text, setText] = useState<string>('https://mytoolset.app/search?q=50 offline tools & fast=true');

  const handleEncode = () => {
    setText(encodeURIComponent(text));
    showToast('Encoded with encodeURIComponent');
  };

  const handleDecode = () => {
    try {
      setText(decodeURIComponent(text));
      showToast('Decoded URL string');
    } catch {
      showToast('Malformed URI sequence in input', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-slate-500">
        <span>URL / Parameter String</span>
        <span>Live Length: {text.length} chars</span>
      </div>

      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste URL or query parameter value..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={handleEncode}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Encode
        </button>
        <button
          type="button"
          onClick={handleDecode}
          className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50"
        >
          Decode
        </button>
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(text);
            showToast(ok ? 'Copied URL text' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
        >
          <Copy className="w-4 h-4" />
          <span>Copy</span>
        </button>
      </div>
    </div>
  );
};

/* 34. Lorem Generator */
const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim',
  'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
  'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
  'mollit', 'anim', 'id', 'est', 'laborum', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo',
];

export const LoremGeneratorTool: React.FC = () => {
  const { showToast } = useToast();
  const [paras, setParas] = useState<number>(3);
  const [wordsPerPara, setWordsPerPara] = useState<number>(45);
  const [output, setOutput] = useState<string>('');

  const generateLorem = () => {
    const safeWords = Math.max(5, Math.min(250, wordsPerPara || 45));
    const resultParas: string[] = [];
    for (let p = 0; p < paras; p++) {
      const words: string[] = [];
      for (let w = 0; w < safeWords; w++) {
        if (p === 0 && w < 5) {
          words.push(LOREM_WORDS[w]);
        } else {
          const idx = (p * 37 + w * 13 + Math.floor(Math.random() * LOREM_WORDS.length)) % LOREM_WORDS.length;
          words.push(LOREM_WORDS[idx]);
        }
      }
      const joined = words.join(' ');
      resultParas.push(joined.charAt(0).toUpperCase() + joined.slice(1) + '.');
    }
    setOutput(resultParas.join('\n\n'));
  };

  useEffect(() => {
    generateLorem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>Paragraphs</span>
            <span className="font-mono text-blue-600">{paras}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={paras}
            onChange={(e) => setParas(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Words per Paragraph
          </label>
          <input
            type="number"
            min={5}
            max={250}
            value={wordsPerPara}
            onChange={(e) => setWordsPerPara(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={generateLorem}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Generate Lorem Ipsum
        </button>
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(output);
            showToast(ok ? 'Lorem Ipsum copied' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Copy className="w-4 h-4" />
          <span>Copy</span>
        </button>
        <button
          type="button"
          onClick={() => {
            downloadTextFile(output, 'lorem-ipsum.txt');
            showToast('Downloaded lorem-ipsum.txt');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Download className="w-4 h-4" />
          <span>Download .txt</span>
        </button>
      </div>

      <textarea
        rows={8}
        readOnly
        value={output}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800"
      />
    </div>
  );
};

/* 35. Duplicate Remover */
export const DuplicateRemoverTool: React.FC = () => {
  const { showToast } = useToast();
  const [text, setText] = useState<string>('Apple\nBanana\napple\nOrange\nBanana\nMango');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(true);
  const [stats, setStats] = useState<{ original: number; unique: number; removed: number } | null>(null);

  const handleRemoveDuplicates = () => {
    const lines = text.split('\n');
    const seen = new Set<string>();
    const uniqueLines: string[] = [];

    for (const line of lines) {
      const key = caseSensitive ? line.trim() : line.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLines.push(line);
      }
    }

    setText(uniqueLines.join('\n'));
    setStats({
      original: lines.length,
      unique: uniqueLines.length,
      removed: lines.length - uniqueLines.length,
    });
    showToast(`Removed ${lines.length - uniqueLines.length} duplicate line(s)`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span>Case-sensitive comparison</span>
        </label>

        {stats && (
          <div className="text-xs font-mono tabular-nums text-slate-600 flex items-center gap-3">
            <span>Original: {stats.original}</span>
            <span>·</span>
            <span>Unique: {stats.unique}</span>
            <span>·</span>
            <span className="font-bold text-emerald-600">Removed: {stats.removed}</span>
          </div>
        )}
      </div>

      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste one item per line..."
        className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRemoveDuplicates}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Remove Duplicates
        </button>
        <button
          type="button"
          onClick={async () => {
            const ok = await copyToClipboard(text);
            showToast(ok ? 'Unique lines copied' : 'Copy failed', ok ? 'success' : 'error');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Result</span>
        </button>
        <button
          type="button"
          onClick={() => {
            downloadTextFile(text, 'deduplicated-lines.txt');
            showToast('Downloaded deduplicated-lines.txt');
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
