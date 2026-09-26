'use client';

import React, {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode
} from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  Attachment01Icon,
  Calendar03Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  File02Icon,
  Globe02Icon,
  HelpCircleIcon,
  Mail01Icon,
  Mic01Icon,
  PlusSignIcon,
  SparklesIcon,
  Tick02Icon
} from '@hugeicons/core-free-icons';

export interface PromptBarSource {
  key: string;
  name: string;
  description?: string;
  icon?: ReactNode | IconSvgElement;
  attach?: boolean;
}

export interface PromptBarCommand {
  key: string;
  name: string;
  description?: string;
}

export interface PromptBarModel {
  key: string;
  name: string;
  tag?: string;
  disabled?: boolean;
}

export interface PromptBarSendDetail {
  attachments: (File | string)[];
  model?: PromptBarModel;
  effort?: string;
}

export interface PromptBarProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  sources?: PromptBarSource[];
  commands?: PromptBarCommand[];
  models?: PromptBarModel[];
  defaultModel?: string;
  currentModel?: string;
  onModelChange?: (modelKey: string) => void;
  onLockedModelClick?: (modelKey: string) => void;
  efforts?: string[];
  defaultEffort?: string;
  onEffortChange?: (effort: string) => void;
  busy?: boolean;
  onSend?: (text: string, detail: PromptBarSendDetail) => void;
  onStop?: () => void;
  onAttach?: () => File[] | string | string[] | void | Promise<File[] | string | string[] | void>;
  attachedFiles?: (File | string)[];
  onRemoveFile?: (index: number) => void;
  onDictate?: () => string | void | Promise<string | void>;
  isListening?: boolean;
  audioVolume?: number;
  background?: string;
  color?: string;
  menuBackground?: string;
  sparkColor?: string;
  sparkBoost?: number;
  width?: number | string;
  radius?: number;
  maxRows?: number;
  morphDuration?: number;
  squash?: number;
  tilt?: number;
  pressScale?: number;
  className?: string;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}

type Row = {
  key: string;
  name: string;
  description?: string;
  tag?: string;
  icon?: ReactNode | IconSvgElement;
  attach?: boolean;
  disabled?: boolean;
};
type Token = { kind: 'at' | 'slash'; query: string; start: number };
type Latest = Pick<PromptBarProps, 'onSend' | 'onStop' | 'onAttach' | 'onDictate' | 'onEffortChange' | 'onModelChange' | 'onLockedModelClick'>;
type Spark = {
  x: number;
  y: number;
  r: number;
  vy: number;
  sway: number;
  phase: number;
  life: number;
  span: number;
};

interface SendGlyphProps {
  busy: boolean;
  morphDuration: number;
  squash: number;
  tilt: number;
}

const ARROW_UP = [12, 4.5, 18.5, 11, 14.25, 11, 14.25, 19.5, 9.75, 19.5, 9.75, 11, 5.5, 11];
const SQUARE = [12, 6, 18, 6, 18, 12, 18, 18, 6, 18, 6, 12, 6, 6];
const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
const LINE = 22;
const EDGE = 11;

const DEFAULT_SOURCES: PromptBarSource[] = [
  {
    key: 'files',
    name: 'Photos & files',
    description: 'Upload from this device',
    icon: Attachment01Icon,
    attach: true
  },
  { key: 'web', name: 'Web search', description: 'Live results', icon: Globe02Icon },
  { key: 'sales', name: 'Sales data', description: 'Revenue and churn', icon: ChartLineData01Icon },
  { key: 'docs', name: 'Documents', description: 'Specs, notes, briefs', icon: File02Icon },
  { key: 'mail', name: 'Mail', description: 'Read and draft mail', icon: Mail01Icon },
  { key: 'calendar', name: 'Calendar', description: 'Events and availability', icon: Calendar03Icon }
];
const DEFAULT_COMMANDS: PromptBarCommand[] = [
  { key: 'summarize', name: '/summarize', description: 'Digest the thread so far' },
  { key: 'compare', name: '/compare', description: 'Two options side by side' },
  { key: 'draft', name: '/draft', description: 'Write a first version' },
  { key: 'explain', name: '/explain', description: 'A plain-language walkthrough' },
  { key: 'tasks', name: '/tasks', description: 'Turn this into a to-do list' }
];
const DEFAULT_MODELS: PromptBarModel[] = [
  { key: 'free', name: 'Free', tag: 'Fast' },
  { key: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', tag: 'Deep' },
  { key: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', tag: 'Reasoning' }
];
const DEFAULT_EFFORTS = ['Low', 'Medium', 'High', 'Extra', 'Max'];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const pathAt = (a: number[], b: number[], t: number) => {
  let d = '';
  for (let i = 0; i < a.length; i += 2) {
    d += `${i ? 'L' : 'M'}${mix(a[i], b[i], t).toFixed(2)} ${mix(a[i + 1], b[i + 1], t).toFixed(2)}`;
  }
  return `${d}Z`;
};

const parseToken = (draft: string): Token | null => {
  const m = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!m) return null;
  return { kind: m[2] === '@' ? 'at' : 'slash', query: m[3].toLowerCase(), start: m.index + m[1].length };
};

const renderIcon = (icon: ReactNode | IconSvgElement, size: number) =>
  isValidElement(icon) ? icon : <HugeiconsIcon icon={icon as IconSvgElement} size={size} strokeWidth={1.8} />;

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileBadge = (filename: string) => {
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
  let badgeColor = 'bg-white/10 text-white/80 border-white/15';
  let category = 'FILE';

  if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG', 'ICO', 'BMP'].includes(ext)) {
    badgeColor = 'bg-white/10 text-white/80 border-white/20';
    category = 'IMAGE';
  } else if (['TS', 'TSX', 'JS', 'JSX', 'PY', 'JSON', 'HTML', 'CSS', 'SCSS', 'CPP', 'C', 'CS', 'JAVA', 'GO', 'RS'].includes(ext)) {
    badgeColor = 'bg-white/10 text-white/80 border-white/20';
    category = 'CODE';
  } else if (['PDF', 'DOC', 'DOCX', 'TXT', 'MD', 'RTF', 'CSV', 'XLS', 'XLSX'].includes(ext)) {
    badgeColor = 'bg-white/10 text-white/80 border-white/20';
    category = 'DOC';
  } else if (['ZIP', 'TAR', 'GZ', 'RAR', '7Z'].includes(ext)) {
    badgeColor = 'bg-white/10 text-white/80 border-white/20';
    category = 'ARCHIVE';
  }
  return { ext, badgeColor, category };
};

function SendGlyph({ busy, morphDuration, squash, tilt }: SendGlyphProps) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dir = useRef(busy ? 1 : -1);
  const t = useMotionValue(busy ? 1 : 0);

  useEffect(() => {
    const target = busy ? 1 : 0;
    dir.current = busy ? 1 : -1;
    if (t.get() === target) return undefined;
    const controls = animate(
      t,
      target,
      reduce ? { duration: 0 } : { duration: morphDuration / 1000, ease: EASE_IN_OUT }
    );
    return () => controls.stop();
  }, [busy, morphDuration, reduce, t]);

  useMotionValueEvent(t, 'change', v => {
    pathRef.current?.setAttribute('d', pathAt(ARROW_UP, SQUARE, v));
    const goo = reduce ? 0 : Math.sin(v * Math.PI);
    const sx = 1 - squash * goo;
    if (svgRef.current) {
      svgRef.current.style.transform = goo ? `rotate(${dir.current * tilt * goo}deg) scale(${sx}, ${1 / sx})` : '';
    }
  });

  return (
    <svg
      ref={svgRef}
      className="block h-3.5 w-3.5 origin-center"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path ref={pathRef} d={pathAt(ARROW_UP, SQUARE, t.get())} />
    </svg>
  );
}

const STYLE = `
@keyframes prompt-bar-pop { from { opacity: 0; transform: translateY(4px) scale(0.98); } }
@keyframes prompt-bar-eq { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
`;

export const PromptBar: React.FC<PromptBarProps> = ({
  value,
  onChange,
  placeholder = 'Start chatting or describe a task...',
  sources = DEFAULT_SOURCES,
  commands = DEFAULT_COMMANDS,
  models = DEFAULT_MODELS,
  defaultModel = '',
  currentModel,
  onModelChange,
  efforts = DEFAULT_EFFORTS,
  defaultEffort = '',
  onEffortChange,
  busy = false,
  onSend,
  onStop,
  onAttach,
  attachedFiles = [],
  onRemoveFile,
  onDictate,
  isListening,
  audioVolume = 0,
  background = '#14151b',
  color = '#ffffff',
  menuBackground = '#181a24',
  sparkColor = '#ffffff',
  sparkBoost = 1,
  width = '100%',
  radius = 16,
  maxRows = 5,
  morphDuration = 240,
  squash = 0.12,
  tilt = 8,
  pressScale = 0.96,
  className = '',
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  onPaste
}) => {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const typing = useRef({ energy: 0, strokes: 0 });
  const boost = useRef(sparkBoost);
  boost.current = sparkBoost;
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastOpen = useRef<string | null>(null);
  const dictation = useRef(0);
  const latest = useRef<Latest>({});
  latest.current = { onSend, onStop, onAttach, onDictate, onEffortChange, onModelChange };

  const [internalDraft, setInternalDraft] = useState('');
  const draft = value !== undefined ? value : internalDraft;
  const setDraft = useCallback((valOrUpdater: string | ((prev: string) => string)) => {
    if (typeof valOrUpdater === 'function') {
      const next = valOrUpdater(draft);
      if (onChange) onChange(next);
      else setInternalDraft(next);
    } else {
      if (onChange) onChange(valOrUpdater);
      else setInternalDraft(valOrUpdater);
    }
  }, [draft, onChange]);

  const [internalAttachments, setInternalAttachments] = useState<string[]>([]);
  const effectiveAttachments = attachedFiles.length > 0 ? attachedFiles : internalAttachments;

  const [internalModelKey, setInternalModelKey] = useState(defaultModel || (models[0]?.key ?? ''));
  const effectiveModelKey = currentModel !== undefined ? currentModel : internalModelKey;

  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const [effortIndex, setEffortIndex] = useState(() => {
    const i = efforts.indexOf(defaultEffort);
    return i >= 0 ? i : Math.max(0, Math.floor((efforts.length - 1) / 2));
  });
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const [listeningState, setListeningState] = useState(false);
  const listening = isListening !== undefined ? isListening : listeningState;
  const [pressed, setPressed] = useState(false);

  const model = models.find(m => m.key === effectiveModelKey) ?? models[0];
  const token = dismissed ? null : parseToken(draft);
  const open = plusOpen ? 'at' : (token?.kind ?? (modelOpen ? 'model' : effortOpen ? 'effort' : null));
  const query = plusOpen ? '' : (token?.query ?? '');
  const list = useMemo<Row[]>(() => {
    if (open === 'at') return sources.filter(s => s.name.toLowerCase().includes(query));
    if (open === 'slash') return commands.filter(c => c.name.replace(/^\//, '').toLowerCase().startsWith(query));
    if (open === 'model') {
      return [...models].sort((a, b) => {
        const aDisabled = Boolean(a.disabled);
        const bDisabled = Boolean(b.disabled);
        if (aDisabled === bDisabled) return 0;
        return aDisabled ? 1 : -1;
      });
    }
    return [];
  }, [open, query, sources, commands, models]);
  const cursor = Math.min(active, Math.max(0, list.length - 1));
  const canSend = draft.trim().length > 0 || effectiveAttachments.length > 0;
  const armed = busy || canSend;
  const level = efforts[effortIndex] ?? '';
  const maxed = efforts.length > 1 && effortIndex === efforts.length - 1;

  const focusInput = () => inputRef.current?.focus({ preventScroll: true });
  const closeMenus = useCallback(() => {
    setPlusOpen(false);
    setModelOpen(false);
    setEffortOpen(false);
  }, []);

  useLayoutEffect(() => {
    const glow = glowRef.current;
    if (!glow || !open) return;
    const row = rowRefs.current[cursor];
    if (!row) {
      glow.style.opacity = '0';
      return;
    }
    const fresh = lastOpen.current !== open;
    lastOpen.current = open;
    if (fresh) glow.style.transition = 'none';
    glow.style.top = `${row.offsetTop}px`;
    glow.style.height = `${row.offsetHeight}px`;
    glow.style.opacity = '1';
    if (fresh) {
      void glow.offsetHeight;
      glow.style.transition = '';
    }
  }, [open, cursor, list]);

  useEffect(() => {
    if (!open) lastOpen.current = null;
  }, [open]);

  useEffect(() => {
    if (!plusOpen && !modelOpen && !effortOpen) return undefined;
    const onDown = (e: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeMenus();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [plusOpen, modelOpen, effortOpen, closeMenus]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    const max = LINE * maxRows;
    el.style.height = `${Math.max(48, Math.min(el.scrollHeight, max))}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [draft, maxRows]);

  useEffect(() => {
    const canvas = sparkRef.current;
    if (!maxed || reduce || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    typing.current.strokes = 0;
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;
    let due = 0;
    let speed = 1;
    let pulse = 0;
    const parts: Spark[] = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (burst: boolean) => {
      parts.push({
        x: Math.random() * w,
        y: burst ? h * (0.2 + Math.random() * 0.8) : h + 3,
        r: 0.8 + Math.random() * 1.0,
        vy: -(6 + Math.random() * 8),
        sway: (Math.random() - 0.5) * 8,
        phase: Math.random() * Math.PI * 2,
        life: burst ? Math.random() * 1.2 : 0,
        span: 2.2 + Math.random() * 2.2
      });
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const typed = typing.current;
      const gain = boost.current;
      typed.energy *= Math.exp(-dt / 0.8);
      pulse *= Math.exp(-dt / 0.16);
      if (typed.strokes > 0) {
        typed.strokes = 0;
        if (gain > 0) pulse = 1;
      }
      const energy = typed.energy * gain;
      speed += (1 + energy * 6 - speed) * (1 - Math.exp(-dt / 0.15));
      due += dt;
      while (due > 0.15) {
        due -= 0.15;
        if (parts.length < 24) spawn(false);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = sparkColor;
      ctx.shadowColor = sparkColor;
      ctx.shadowBlur = 5 + energy * 8 + pulse * 4;
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.span) {
          parts.splice(i, 1);
          continue;
        }
        const k = p.life / p.span;
        const twinkle = 0.7 + 0.3 * Math.sin((now / 160) * (1 + energy) + p.phase);
        p.y += p.vy * dt * speed;
        if (p.y < -4) {
          p.y = h + 3;
          p.x = Math.random() * w;
        }
        const edge = Math.min(1, Math.max(0, p.y / 14), Math.max(0, (h - p.y) / 14));
        ctx.globalAlpha = Math.min(1, Math.sin(k * Math.PI) * (0.8 + energy * 0.2) * twinkle) * edge;
        ctx.beginPath();
        ctx.arc(
          p.x + Math.sin((now / 900) * (1 + energy * 0.8) + p.phase) * p.sway,
          p.y,
          p.r * twinkle * (1 + energy * 0.3),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    resize();
    for (let i = 0; i < 20; i += 1) spawn(true);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ctx.clearRect(0, 0, w, h);
    };
  }, [maxed, reduce, sparkColor]);

  const setEffort = (i: number) => {
    const next = Math.max(0, Math.min(efforts.length - 1, i));
    if (next === effortIndex) return;
    setEffortIndex(next);
    latest.current.onEffortChange?.(efforts[next]);
  };
  const effortFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const k = (e.clientX - rect.left - EDGE) / Math.max(1, rect.width - 2 * EDGE);
    setEffort(Math.round(k * (efforts.length - 1)));
  };
  const onEffortKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (step) {
      e.preventDefault();
      setEffort(effortIndex + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setEffort(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setEffort(efforts.length - 1);
    } else if (e.key === 'Escape') {
      setEffortOpen(false);
      focusInput();
    }
  };
  const stepAt = (i: number) => `calc(${EDGE}px + (100% - ${EDGE * 2}px) * ${i / Math.max(1, efforts.length - 1)})`;
  const fillAt = (i: number) => (i === efforts.length - 1 ? '100%' : `calc(${stepAt(i)} + 7px)`);

  const pick = (row: Row) => {
    if (open === 'model') {
      if (row.disabled) {
        latest.current.onLockedModelClick?.(row.key);
        return;
      }
      if (onModelChange) {
        onModelChange(row.key);
      } else {
        setInternalModelKey(row.key);
      }
      setModelOpen(false);
      focusInput();
      return;
    }
    const head = token ? draft.slice(0, token.start) : draft;
    if (row.attach) {
      setDraft(head);
      Promise.resolve(latest.current.onAttach?.()).then(files => {
        if (!files) return;
        if (Array.isArray(files)) {
          if (typeof files[0] === 'string') {
            setInternalAttachments(a => [...a, ...(files as string[])]);
          }
        } else if (typeof files === 'string') {
          setInternalAttachments(a => [...a, files]);
        }
      });
    } else if (open === 'at') {
      setDraft(`${head}@${row.name} `);
    } else {
      setDraft(`${head}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    focusInput();
  };

  const send = () => {
    if (!canSend || busy) return;
    const submittedText = draft.trim();
    latest.current.onSend?.(submittedText, { attachments: effectiveAttachments, model, effort: level });
    if (!onChange) {
      setInternalDraft('');
    }
    setInternalAttachments([]);
    setDismissed(false);
    closeMenus();
  };

  const toggleListen = () => {
    if (onDictate) {
      onDictate();
      return;
    }
    if (listening) {
      dictation.current += 1;
      setListeningState(false);
      return;
    }
    const seq = ++dictation.current;
    setListeningState(true);
    Promise.resolve(latest.current.onDictate?.()).then(
      text => {
        if (seq !== dictation.current) return;
        setListeningState(false);
        if (text) setDraft(d => (d.trim() ? `${d.trimEnd()} ${text}` : text));
        focusInput();
      },
      () => {
        if (seq === dictation.current) setListeningState(false);
      }
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && list.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((cursor + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length);
        return;
      }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
        e.preventDefault();
        pick(list[cursor]);
        return;
      }
    }
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setDismissed(true);
        closeMenus();
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !armed) return;
    setPressed(true);
  };
  const up = () => setPressed(false);

  return (
    <div
      ref={rootRef}
      className={`group relative text-[14px] leading-[22px] w-full [color:var(--pb-ink)]${className ? ` ${className}` : ''}`}
      data-busy={busy ? '' : undefined}
      data-max={maxed ? '' : undefined}
      style={
        {
          '--pb-bg': background,
          '--pb-ink': color,
          '--pb-menu': menuBackground,
          '--pb-w': typeof width === 'number' ? `${width}px` : width,
          '--pb-radius': `${radius}px`,
          '--pb-spark': sparkColor,
          '--pb-press': pressScale
        } as CSSProperties
      }
    >
      <style>{STYLE}</style>
      {open ? (
        <div
          className="absolute inset-x-0 bottom-[calc(100%+8px)] z-[30] origin-bottom rounded-2xl p-1.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.06)] border border-white/[0.1] backdrop-blur-2xl max-h-[380px] overflow-y-auto [animation:prompt-bar-pop_180ms_cubic-bezier(0.23,1,0.32,1)_both] [background:var(--pb-menu)] data-[kind=model]:right-auto data-[kind=model]:w-[310px] data-[kind=model]:origin-bottom-left data-[kind=effort]:right-auto data-[kind=effort]:w-[248px] data-[kind=effort]:origin-bottom-left data-[kind=effort]:px-3.5 data-[kind=effort]:pt-3 data-[kind=effort]:pb-3.5 motion-reduce:[animation:none]"
          role={open === 'effort' ? 'dialog' : 'listbox'}
          aria-label={
            open === 'at' ? 'Sources' : open === 'slash' ? 'Commands' : open === 'model' ? 'Models' : 'Effort'
          }
          data-kind={open}
        >
          {open === 'effort' ? (
            <>
              <div className="flex items-center gap-2 text-[13px] leading-[18px]">
                <span className="[color:color-mix(in_srgb,var(--pb-ink)_55%,transparent)]">Effort</span>
                <span className="font-medium text-white">{level}</span>
                <span
                  className="ml-auto inline-flex [color:color-mix(in_srgb,var(--pb-ink)_55%,transparent)]"
                  title="Higher effort thinks longer before answering"
                >
                  <HugeiconsIcon icon={HelpCircleIcon} size={14} strokeWidth={1.8} />
                </span>
              </div>
              <div className="mt-3 flex justify-between text-[12px] leading-4 [color:color-mix(in_srgb,var(--pb-ink)_55%,transparent)]">
                <span>Faster</span>
                <span>Smarter</span>
              </div>
              <div
                className="relative mt-2 h-[22px] cursor-pointer touch-none rounded-[11px] outline-none select-none [background:color-mix(in_srgb,var(--pb-ink)_10%,transparent)]"
                role="slider"
                tabIndex={0}
                aria-label="Effort"
                aria-valuemin={0}
                aria-valuemax={efforts.length - 1}
                aria-valuenow={effortIndex}
                aria-valuetext={level}
                style={
                  { '--pb-effort-x': stepAt(effortIndex), '--pb-effort-fill': fillAt(effortIndex) } as CSSProperties
                }
                onPointerDown={e => {
                  if (e.button !== 0) return;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                  e.currentTarget.focus({ preventScroll: true });
                  effortFromPointer(e);
                }}
                onPointerMove={e => {
                  if (e.buttons & 1) effortFromPointer(e);
                }}
                onKeyDown={onEffortKey}
              >
                <span className="absolute inset-y-0 left-0 rounded-[11px] [width:var(--pb-effort-fill)] [background:color-mix(in_srgb,var(--pb-ink)_20%,transparent)] [transition:width_220ms_cubic-bezier(0.23,1,0.32,1),background-color_300ms_ease] group-data-[max]:[background:color-mix(in_srgb,var(--pb-spark)_40%,transparent)] motion-reduce:[transition:background-color_300ms_ease]" />
                {efforts.map((label, i) => (
                  <i
                    key={label}
                    className="absolute top-1/2 -mt-0.5 -ml-0.5 h-1 w-1 rounded-full [background:color-mix(in_srgb,var(--pb-ink)_40%,transparent)]"
                    style={{ left: stepAt(i) }}
                  />
                ))}
                <span className="absolute -top-[3px] -ml-[7px] h-7 w-3.5 rounded-[7px] shadow-[0_2px_8px_rgba(0,0,0,0.4)] [left:var(--pb-effort-x)] [background:var(--pb-ink)] [transition:left_220ms_cubic-bezier(0.23,1,0.32,1),background-color_300ms_ease] group-data-[max]:[background:var(--pb-spark)] motion-reduce:[transition:background-color_300ms_ease]" />
              </div>
            </>
          ) : (
            <>
              <span
                ref={glowRef}
                className="pointer-events-none absolute inset-x-1 rounded-xl opacity-0 [background:color-mix(in_srgb,var(--pb-ink)_10%,transparent)] [transition:top_220ms_cubic-bezier(0.23,1,0.32,1),height_220ms_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease] motion-reduce:[transition:opacity_150ms_ease]"
                aria-hidden="true"
              />
              {list.map((row, i) => (
                <button
                  key={row.key}
                  ref={el => {
                    rowRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={i === cursor}
                  className={`relative z-[1] flex h-9 w-full items-center gap-2.5 rounded-xl border-0 bg-transparent px-3 text-left outline-none [font:inherit] transition-colors ${
                    row.disabled
                      ? 'opacity-40 hover:opacity-75 cursor-pointer text-white/50 hover:bg-white/[0.04]'
                      : 'cursor-pointer text-inherit hover:bg-white/[0.06]'
                  }`}
                  onMouseDown={e => e.preventDefault()}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(row)}
                  title={row.disabled ? 'API key required. Click to add API key.' : undefined}
                >
                  {open === 'at' ? (
                    <span className="inline-flex w-5 flex-none justify-center text-white/70">
                      {renderIcon(row.icon, 15)}
                    </span>
                  ) : null}
                  <span className={`flex-none text-[13px] font-medium ${row.disabled ? 'text-white/60' : 'text-white/90'}`}>{row.name}</span>
                  {row.description ? (
                    <span className="min-w-0 flex-auto truncate text-[12px] text-white/40">
                      {row.description}
                    </span>
                  ) : null}
                  {open === 'model' ? (
                    <>
                      {row.tag ? (
                        <span className="ml-auto flex-none text-[11px] text-white/40 font-mono">
                          {row.tag}
                        </span>
                      ) : null}
                      {!row.disabled && (
                        <span
                          className="inline-flex w-4 flex-none justify-center opacity-0 data-[on]:opacity-100 text-white ml-1.5"
                          data-on={row.key === model?.key ? '' : undefined}
                        >
                          <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
                        </span>
                      )}
                    </>
                  ) : null}
                </button>
              ))}
              {list.length === 0 ? (
                <div className="flex h-9 items-center px-3 text-[12px] text-white/40">
                  No matches for “{query}”
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div
        className={`relative isolate flex cursor-text flex-col gap-2 p-3.5 rounded-2xl border transition-all ${
          isDragging ? 'border-white/50 bg-[#161820]' : 'border-white/[0.08] hover:border-white/[0.14] focus-within:border-white/20'
        } [background:var(--pb-bg)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:opacity-0 before:content-[''] before:[background:radial-gradient(140%_120%_at_0%_100%,color-mix(in_srgb,var(--pb-spark)_15%,transparent),transparent_62%)] before:[transition:opacity_500ms_ease] data-[max]:before:opacity-100`}
        role="presentation"
        data-max={maxed ? '' : undefined}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPointerDown={e => {
          if (e.target === e.currentTarget || e.target === inputRef.current) closeMenus();
        }}
        onClick={focusInput}
      >
        <canvas
          ref={sparkRef}
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full rounded-[inherit]"
          aria-hidden="true"
        />

        {/* Drag and Drop Active Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-20 rounded-2xl bg-black/85 border-2 border-dashed border-white/60 flex items-center justify-center backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-2 text-white font-medium text-sm">
              <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={2} className="animate-bounce" />
              <span>Drop files to attach</span>
            </div>
          </div>
        )}

        {/* Enhanced File Previews: File Type Badge, Name, Category & Size, Cross Remove Button */}
        {effectiveAttachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-0.5 pt-0.5 pb-2">
            {effectiveAttachments.map((f, i) => {
              const name = typeof f === 'string' ? f : f.name;
              const size = typeof f === 'string' ? undefined : f.size;
              const { ext, badgeColor, category } = getFileBadge(name);

              return (
                <div
                  key={`${name}-${i}`}
                  className="group relative flex items-center gap-2.5 px-3 py-1.5 bg-[#1b1c24] border border-white/[0.1] hover:border-white/[0.2] rounded-xl text-xs transition-all shadow-sm max-w-[280px]"
                >
                  {/* File Type Badge */}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${badgeColor} flex-shrink-0`}>
                    {ext}
                  </span>

                  {/* Name, Type Category & Size */}
                  <div className="flex flex-col min-w-0 pr-1">
                    <span className="font-medium text-white/90 truncate max-w-[140px]" title={name}>
                      {name}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {category} {size !== undefined ? `· ${formatBytes(size)}` : ''}
                    </span>
                  </div>

                  {/* Cross Button to Remove File */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRemoveFile) onRemoveFile(i);
                      else setInternalAttachments(prev => prev.filter((_, idx) => idx !== i));
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-auto flex-shrink-0 cursor-pointer"
                    title={`Remove ${name}`}
                    aria-label={`Remove ${name}`}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}

            {/* Add More Files Button */}
            {onAttach && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAttach();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 text-white/50 hover:text-white/90 text-xs transition-all hover:bg-white/[0.04] cursor-pointer"
                title="Attach more files"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={12} strokeWidth={2} />
                <span className="text-[11px]">Add more</span>
              </button>
            )}
          </div>
        )}

        <textarea
          ref={inputRef}
          className="block w-full resize-none border-0 bg-transparent px-1 pt-0.5 text-[14px] leading-[22px] text-white outline-none [font:inherit] [overflow-wrap:anywhere] placeholder:text-white/35 [@media(pointer:coarse)]:text-[16px]"
          rows={2}
          value={draft}
          placeholder={listening ? 'Listening to your voice...' : placeholder}
          aria-label="Prompt"
          onChange={e => {
            setDraft(e.target.value);
            typing.current.energy = Math.min(1.6, typing.current.energy + 0.22);
            typing.current.strokes = Math.min(4, typing.current.strokes + 1);
            setDismissed(false);
            closeMenus();
            setActive(0);
          }}
          onFocus={closeMenus}
          onKeyDown={onKeyDown}
          onPaste={e => {
            if (onPaste) {
              onPaste(e);
            } else if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
              const pasted = Array.from(e.clipboardData.files);
              setInternalAttachments(prev => [...prev, ...pasted.map(f => f.name)]);
            }
          }}
        />

        {/* Bottom Bar: Plus, Model Selector, Effort, Spacer, Mic, Send */}
        <div className="flex items-center gap-1.5 pt-1">
          {/* Plus Add Sources / Files Button */}
          <button
            type="button"
            className="inline-grid h-7 w-7 flex-none cursor-pointer touch-manipulation place-items-center rounded-lg border-0 bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.08] hover:border-white/[0.18] text-white/60 hover:text-white outline-none select-none [font:inherit] [-webkit-tap-highlight-color:transparent] [transition:background-color_150ms_ease,color_150ms_ease,transform_160ms_cubic-bezier(0.23,1,0.32,1)] active:[transform:scale(0.94)] data-[on]:bg-white/[0.1] data-[on]:text-white"
            aria-label="Add files and sources"
            aria-expanded={plusOpen}
            data-on={plusOpen ? '' : undefined}
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setModelOpen(false);
              setEffortOpen(false);
              setActive(0);
              setPlusOpen(v => !v);
              focusInput();
            }}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={2.2} />
          </button>

          {/* Model Selector Dropdown Button */}
          {models.length > 0 ? (
            <button
              type="button"
              className="inline-flex h-7 flex-none cursor-pointer touch-manipulation items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] px-2.5 text-[12px] font-medium outline-none select-none text-white/70 hover:text-white transition-colors"
              aria-label="Choose model"
              aria-expanded={modelOpen}
              data-on={modelOpen ? '' : undefined}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                setPlusOpen(false);
                setEffortOpen(false);
                setActive(Math.max(0, models.findIndex(m => m.key === model?.key)));
                setModelOpen(v => !v);
                focusInput();
              }}
            >
              <span className="text-[10px] text-white/50">⠶</span>
              <span>{model?.name ?? 'Model'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2.4} className={`text-white/40 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : null}

          {/* Reasoning / Effort Selector Slider Button */}
          {efforts.length > 0 ? (
            <button
              type="button"
              className="inline-flex h-7 flex-none cursor-pointer touch-manipulation items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] px-2 text-[12px] font-medium outline-none select-none text-white/70 hover:text-white transition-colors"
              aria-label="Choose effort"
              aria-expanded={effortOpen}
              data-on={effortOpen ? '' : undefined}
              data-max={maxed ? '' : undefined}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                setPlusOpen(false);
                setModelOpen(false);
                setEffortOpen(v => !v);
                focusInput();
              }}
            >
              <HugeiconsIcon icon={SparklesIcon} size={13} strokeWidth={2} className="text-white/60" />
              <span>{level}</span>
            </button>
          ) : null}

          <span className="flex-auto" />

          {/* Voice Dictation Button */}
          {onDictate ? (
            <button
              type="button"
              className={`inline-grid h-7 w-7 flex-none cursor-pointer touch-manipulation place-items-center rounded-lg border-0 p-0 outline-none select-none transition-all duration-200 active:scale-95 ${
                listening
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/45 hover:text-white hover:bg-white/[0.08]'
              }`}
              aria-label={listening ? 'Stop dictation' : 'Dictate'}
              aria-pressed={listening}
              data-on={listening ? '' : undefined}
              onMouseDown={e => e.preventDefault()}
              onClick={toggleListen}
              title={listening ? "Listening... Click to stop" : "Voice transcription"}
            >
              {listening ? (
                <div className="flex items-center justify-center gap-[2px] h-3.5 px-0.5">
                  <span
                    className="w-[2px] rounded-full bg-white transition-[height] duration-75 ease-out"
                    style={{ height: `${Math.max(3, Math.min(14, Math.round(3 + audioVolume * 11)))}px` }}
                  />
                  <span
                    className="w-[2px] rounded-full bg-white transition-[height] duration-75 ease-out"
                    style={{ height: `${Math.max(4, Math.min(14, Math.round(4 + audioVolume * 16)))}px` }}
                  />
                  <span
                    className="w-[2px] rounded-full bg-white transition-[height] duration-75 ease-out"
                    style={{ height: `${Math.max(5, Math.min(14, Math.round(5 + audioVolume * 13)))}px` }}
                  />
                  <span
                    className="w-[2px] rounded-full bg-white transition-[height] duration-75 ease-out"
                    style={{ height: `${Math.max(3, Math.min(14, Math.round(3 + audioVolume * 10)))}px` }}
                  />
                </div>
              ) : (
                <HugeiconsIcon icon={Mic01Icon} size={15} strokeWidth={2} />
              )}
            </button>
          ) : null}

          {/* Send / Stop Action Button with Solid White on Active and Black Glyph Icon */}
          <button
            type="button"
            className={`relative inline-grid h-7 w-7 flex-none cursor-pointer touch-manipulation place-items-center rounded-lg border-0 p-0 outline-none select-none transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${
              armed
                ? '!bg-white hover:!bg-white/90 !text-black shadow-sm'
                : 'bg-white/[0.08] text-white/30'
            }`}
            disabled={!armed}
            aria-label={busy ? 'Stop' : 'Send'}
            data-armed={armed ? '' : undefined}
            data-pressed={pressed ? '' : undefined}
            onMouseDown={e => e.preventDefault()}
            onPointerDown={down}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={up}
            onClick={() => {
              if (busy) latest.current.onStop?.();
              else send();
            }}
            title={busy ? "Stop generation" : "Send prompt"}
          >
            <SendGlyph busy={busy} morphDuration={morphDuration} squash={squash} tilt={tilt} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptBar;
