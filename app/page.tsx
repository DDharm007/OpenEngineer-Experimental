'use client';

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import CodeApplicationProgress, { type CodeApplicationState } from '@/components/CodeApplicationProgress';
import { 
  Sparkles, 
  BarChart3, 
  Palette, 
  ShoppingBag, 
  Kanban, 
  Bot, 
  TrendingUp, 
  Smartphone, 
  Calendar, 
  FileText, 
  Target, 
  Utensils, 
  Zap,
  Plus,
  Check,
  ArrowLeft,
  Sliders,
  Key,
  X,
  Code2,
  Download
} from 'lucide-react';

// Import new components
import AnimatedBackground from '@/components/ui/animated-background';
import FloatingActionButton from '@/components/ui/floating-action-button';
import MoodSelector, { type MoodType } from '@/components/ui/mood-selector';
import StyleSelector from '@/components/ui/style-selector';
import PromptBar from '@/components/PromptBar';
import ApiKeysModal from '@/components/ApiKeysModal';
import MultiAgentPanel from '@/components/MultiAgentPanel';
import LatticeLoader from '@/components/LatticeLoader';
import OpenEngineerWorkspace from '@/components/OpenEngineerWorkspace';
import CodeExplorer from '@/components/CodeExplorer';
import { getProviderForModel, getProviderNameForModel } from '@/lib/providers-config';
import { Attachment01Icon, Globe02Icon, File02Icon } from '@hugeicons/core-free-icons';

interface SandboxData {
  sandboxId: string;
  url: string;
  [key: string]: any;
}

interface ChatMessage {
  content: string;
  type: 'user' | 'ai' | 'system' | 'file-update' | 'command' | 'error';
  timestamp: Date;
  metadata?: {
    scrapedUrl?: string;
    scrapedContent?: any;
    generatedCode?: string;
    appliedFiles?: string[];
    commandType?: 'input' | 'output' | 'error' | 'success';
  };
}

const promptSuggestionSets = [
  [
    { Icon: Zap, color: 'text-white/80', text: 'Build a sleek SaaS landing page with dark mode & pricing' },
    { Icon: BarChart3, color: 'text-white/80', text: 'Create an analytics dashboard with real-time charts & KPIs' },
    { Icon: Palette, color: 'text-white/80', text: 'Design a modern developer portfolio with interactive project cards' },
  ],
  [
    { Icon: ShoppingBag, color: 'text-white/80', text: 'Build an e-commerce storefront with cart, filters & checkout' },
    { Icon: Kanban, color: 'text-white/80', text: 'Create a Kanban task management board like Linear or Trello' },
    { Icon: Bot, color: 'text-white/80', text: 'Build an AI chat playground with model switcher & history' },
  ],
  [
    { Icon: TrendingUp, color: 'text-white/80', text: 'Create a crypto & finance tracker with interactive price charts' },
    { Icon: Smartphone, color: 'text-white/80', text: 'Design a mobile-first social media feed with stories & comments' },
    { Icon: Calendar, color: 'text-white/80', text: 'Build a calendar booking app like Calendly with time slots' },
  ],
  [
    { Icon: FileText, color: 'text-white/80', text: 'Build a developer documentation site with code snippets & search' },
    { Icon: Target, color: 'text-white/80', text: 'Create a habit tracker with daily streaks & weekly statistics' },
    { Icon: Utensils, color: 'text-white/80', text: 'Design a restaurant food ordering app with dish customizer' },
  ]
];

const getFileBadge = (filename: string) => {
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

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const CURATED_FONTS = [
  {
    id: 'inter',
    name: 'Inter',
    category: 'Modern Sans',
    family: "'Inter', sans-serif",
    sampleText: 'Modern & Clean',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta',
    category: 'Tech Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    sampleText: 'Premium & Crisp',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    category: 'Geometric',
    family: "'Poppins', sans-serif",
    sampleText: 'Friendly & Rounded',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'Minimalist',
    family: "'Outfit', sans-serif",
    sampleText: 'Sleek Aesthetic',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    category: 'Product Sans',
    family: "'DM Sans', sans-serif",
    sampleText: 'Clean Geometry',
  },
  {
    id: 'sora',
    name: 'Sora',
    category: 'Modern Grotesk',
    family: "'Sora', sans-serif",
    sampleText: 'High Legibility',
  },
  {
    id: 'urbanist',
    name: 'Urbanist',
    category: 'Clean Tech',
    family: "'Urbanist', sans-serif",
    sampleText: 'Architectural Sans',
  },
  {
    id: 'epilogue',
    name: 'Epilogue',
    category: 'Editorial Sans',
    family: "'Epilogue', sans-serif",
    sampleText: 'Creative & Bold',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    category: 'Futuristic',
    family: "'Space Grotesk', sans-serif",
    sampleText: 'Tech & Brutalist',
  },
  {
    id: 'playfair',
    name: 'Playfair',
    category: 'Luxury Serif',
    family: "'Playfair Display', serif",
    sampleText: 'Timeless Elegance',
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    category: 'Classic Serif',
    family: "'Cinzel', serif",
    sampleText: 'Editorial Luxury',
  },
  {
    id: 'cormorant',
    name: 'Cormorant',
    category: 'Literary Serif',
    family: "'Cormorant Garamond', serif",
    sampleText: 'Graceful Curves',
  },
  {
    id: 'lora',
    name: 'Lora',
    category: 'Serif Body',
    family: "'Lora', serif",
    sampleText: 'Contemporary Prose',
  },
  {
    id: 'instrument-serif',
    name: 'Instrument',
    category: 'Modern Serif',
    family: "'Instrument Serif', serif",
    sampleText: 'Exquisite Display',
  },
  {
    id: 'calistoga',
    name: 'Calistoga',
    category: 'Display Serif',
    family: "'Calistoga', serif",
    sampleText: 'Warm Headlines',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    category: 'Code / Mono',
    family: "'JetBrains Mono', monospace",
    sampleText: 'Developer Ready',
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    category: 'Tech Mono',
    family: "'Fira Code', monospace",
    sampleText: 'Symbolic Ligatures',
  },
  {
    id: 'syne',
    name: 'Syne',
    category: 'Artistic Display',
    family: "'Syne', sans-serif",
    sampleText: 'Avant-Garde Bold',
  },
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    category: 'Impact Headline',
    family: "'Bebas Neue', sans-serif",
    sampleText: 'IMPACT POSTER',
  },
  {
    id: 'caveat',
    name: 'Caveat',
    category: 'Handwritten',
    family: "'Caveat', cursive",
    sampleText: 'Human & Warm',
  },
];

function AISandboxContent() {
  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: 'Not connected', active: false });
  const [responseArea, setResponseArea] = useState<string[]>([]);
  const [structureContent, setStructureContent] = useState('No sandbox created yet');
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      content: 'Welcome! I can help you generate code with full context of your sandbox files and structure. Just start chatting - I\'ll automatically create a sandbox for you if needed!\n\nTip: If you see package errors like "react-router-dom not found", just type "npm install" or "check packages" to automatically install missing packages.',
      type: 'system',
      timestamp: new Date()
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiEnabled] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [aiModel, setAiModel] = useState(() => {
    const modelParam = searchParams.get('model');
    return appConfig.ai.availableModels.includes(modelParam || '') ? modelParam! : appConfig.ai.defaultModel;
  });
  const [availableModels, setAvailableModels] = useState<string[]>(appConfig.ai.availableModels);
  const [unlockedModels, setUnlockedModels] = useState<string[]>([]);
  const [modelDisplayNames, setModelDisplayNames] = useState<Record<string, string>>(appConfig.ai.modelDisplayNames);
  const [modelTags, setModelTags] = useState<Record<string, string>>({});

  // Ensure unlocked models are ALWAYS on top of the model list
  const sortedAvailableModels = useMemo(() => {
    const unlocked: string[] = [];
    const locked: string[] = [];
    for (const m of availableModels) {
      if (unlockedModels.includes(m)) {
        unlocked.push(m);
      } else {
        locked.push(m);
      }
    }
    return [...unlocked, ...locked];
  }, [availableModels, unlockedModels]);

  // Red message toaster state for locked models
  const [lockedModelToast, setLockedModelToast] = useState<{
    providerName: string;
    providerId?: string;
    modelName: string;
  } | null>(null);
  const [targetProviderForModal, setTargetProviderForModal] = useState<string | null>(null);

  const triggerLockedModelToast = useCallback((modelKey: string) => {
    const provider = getProviderForModel(modelKey);
    const providerName = getProviderNameForModel(modelKey);
    const modelName = modelDisplayNames[modelKey] || modelKey;

    setLockedModelToast({
      providerName,
      providerId: provider?.id,
      modelName,
    });
  }, [modelDisplayNames]);

  // Auto-dismiss the toaster after 4.5 seconds
  useEffect(() => {
    if (!lockedModelToast) return;
    const timer = setTimeout(() => {
      setLockedModelToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [lockedModelToast]);

  const [hasApiKeys, setHasApiKeys] = useState(true);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [hasSandboxKey, setHasSandboxKey] = useState(false);
  const [urlOverlayVisible, setUrlOverlayVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlStatus, setUrlStatus] = useState<string[]>([]);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['app', 'src', 'src/components']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [homeScreenFading, setHomeScreenFading] = useState(false);
  const [homeUrlInput, setHomeUrlInput] = useState('');
  const [homeContextInput, setHomeContextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'generation' | 'preview' | 'agents'>('preview');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedFonts, setSelectedFonts] = useState<string[]>([]);
  const [showLoadingBackground, setShowLoadingBackground] = useState(false);
  const [urlScreenshot, setUrlScreenshot] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isPreparingDesign, setIsPreparingDesign] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [loadingStage, setLoadingStage] = useState<'gathering' | 'planning' | 'generating' | null>(null);
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [fileStructure, setFileStructure] = useState<string>('');
  const [showThemeSelectionPage, setShowThemeSelectionPage] = useState(false); // New state for theme page
  const [showRefinePromptPage, setShowRefinePromptPage] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'prompt'>('url'); // New state for input mode
  const [manualPrompt, setManualPrompt] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [suggestionSetIndex, setSuggestionSetIndex] = useState(0);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const speechRecognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversationContext, setConversationContext] = useState<{
    scrapedWebsites: Array<{ url: string; content: any; timestamp: Date }>;
    generatedComponents: Array<{ name: string; path: string; content: string }>;
    appliedCode: Array<{ files: string[]; timestamp: Date }>;
    currentProject: string;
    lastGeneratedCode?: string;
  }>({
    scrapedWebsites: [],
    generatedComponents: [],
    appliedCode: [],
    currentProject: '',
    lastGeneratedCode: undefined
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({
    stage: null
  });

  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    status: string;
    components: Array<{ name: string; path: string; completed: boolean }>;
    currentComponent: number;
    streamedCode: string;
    isStreaming: boolean;
    isThinking: boolean;
    thinkingText?: string;
    thinkingDuration?: number;
    currentFile?: { path: string; content: string; type: string };
    files: Array<{ path: string; content: string; type: string; completed: boolean; edited?: boolean }>;
    lastProcessedPosition: number;
    isEdit?: boolean;
  }>({
    isGenerating: false,
    status: '',
    components: [],
    currentComponent: 0,
    streamedCode: '',
    isStreaming: false,
    isThinking: false,
    files: [],
    lastProcessedPosition: 0
  });

  // Open Engineer State (inspired by opencode-dev)
  const [openEngineerPlan, setOpenEngineerPlan] = useState<{
    summary?: string;
    architecture?: any;
    files?: Array<{ path: string; description: string }>;
    questions?: Array<{ id: string; question: string; options: string[]; multiple?: boolean }>;
    reasoning?: string;
  } | null>(null);
  const [selectedEngineerAnswers, setSelectedEngineerAnswers] = useState<Record<string, string>>({});
  const [forceCodeView, setForceCodeView] = useState(false);
  const [forceCanvasView, setForceCanvasView] = useState(false);
  const isSplitLayout = !forceCanvasView;

  // New state for modern UI
  const [selectedMood, setSelectedMood] = useState<MoodType>('calm');
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  // Typewriter rotating subtitle phrases
  const crustPhrases = [
    'Code less. Create more.',
    'Breathe deep. Let creativity flow like a gentle stream.',
    'Build faster with AI by your side.',
    'Design. Develop. Deploy.',
    'Turn ideas into reality, instantly.',
    'Your vision, powered by intelligence.',
    'From prompt to production in minutes.',
    'Where creativity meets code.',
  ];
  const [crustPhraseIndex, setCrustPhraseIndex] = useState(0);
  const [crustDisplayText, setCrustDisplayText] = useState('');
  const [crustIsDeleting, setCrustIsDeleting] = useState(false);

  useEffect(() => {
    if (!showHomeScreen) return;
    const currentPhrase = crustPhrases[crustPhraseIndex];
    let timeout: NodeJS.Timeout;

    if (!crustIsDeleting) {
      // Typing
      if (crustDisplayText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setCrustDisplayText(currentPhrase.slice(0, crustDisplayText.length + 1));
        }, 60);
      } else {
        // Pause at end before deleting
        timeout = setTimeout(() => {
          setCrustIsDeleting(true);
        }, 2000);
      }
    } else {
      // Deleting
      if (crustDisplayText.length > 0) {
        timeout = setTimeout(() => {
          setCrustDisplayText(crustDisplayText.slice(0, -1));
        }, 30);
      } else {
        // Move to next phrase
        setCrustIsDeleting(false);
        setCrustPhraseIndex((prev) => (prev + 1) % crustPhrases.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [showHomeScreen, crustDisplayText, crustIsDeleting, crustPhraseIndex]);

  // Check available API keys and models
  useEffect(() => {
    const checkApiKeys = async () => {
      try {
        const response = await fetch('/api/check-api-keys');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('[home] API keys check result:', data);
            setAvailableModels(data.availableModels);
            if (data.unlockedModels) setUnlockedModels(data.unlockedModels);
            setModelDisplayNames(data.modelDisplayNames);
            if (data.modelTags) setModelTags(data.modelTags);
            setHasApiKeys(data.hasAnyKey);
            setHasSandboxKey(Boolean(data.sandboxConfigured));

            // Update aiModel if current model is not unlocked
            const unlockedList: string[] = data.unlockedModels || [];
            if (unlockedList.length > 0 && !unlockedList.includes(aiModel)) {
              console.log('[home] Current model not unlocked, updating to:', data.defaultModel);
              setAiModel(data.defaultModel);
            } else {
              console.log('[home] Current model is unlocked and active:', aiModel);
            }
          }
        }
      } catch (error) {
        console.error('[home] Failed to check API keys:', error);
      }
    };

    checkApiKeys();
  }, [aiModel]);

  // Clear old conversation data on component mount and check sandbox status
  useEffect(() => {
    const initializePage = async () => {
      // Clear old conversation
      try {
        await fetch('/api/conversation-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear-old' })
        });
        console.log('[home] Cleared old conversation data on mount');
      } catch (error) {
        console.error('[ai-sandbox] Failed to clear old conversation:', error);
      }

      // Check if sandbox ID is in URL — try to restore it, but don't block app startup
      const sandboxIdParam = searchParams.get('sandbox');

      if (sandboxIdParam) {
        // Try to restore existing sandbox in the background (non-blocking)
        console.log('[home] Attempting to restore sandbox:', sandboxIdParam);
        createSandbox(true).catch((error) => {
          console.warn('[ai-sandbox] Could not restore sandbox, continuing without it:', error);
        });
      } else {
        // Just check if a sandbox is already running — don't auto-create one
        console.log('[home] Checking sandbox status...');
        checkSandboxStatus();
      }
    };

    initializePage();
  }, []); // Run only on mount

  useEffect(() => {
    // Handle Escape key for home screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHomeScreen) {
        setHomeScreenFading(true);
        setTimeout(() => {
          setShowHomeScreen(false);
          setHomeScreenFading(false);
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHomeScreen]);

  // Start capturing screenshot if URL is provided on mount (from home screen)
  useEffect(() => {
    if (!showHomeScreen && homeUrlInput && !urlScreenshot && !isCapturingScreenshot) {
      let screenshotUrl = homeUrlInput.trim();
      if (!screenshotUrl.match(/^https?:\/\//i)) {
        screenshotUrl = 'https://' + screenshotUrl;
      }
      captureUrlScreenshot(screenshotUrl);
    }
  }, [showHomeScreen, homeUrlInput]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    // Only check sandbox status on mount and when user navigates to the page
    checkSandboxStatus();

    // Optional: Check status when window regains focus
    const handleFocus = () => {
      checkSandboxStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);


  const updateStatus = (text: string, active: boolean) => {
    setStatus({ text, active });
  };

  // ---- Model helper (no per-model rate limits for NVIDIA NIM) ----

  const log = (message: string, type: 'info' | 'error' | 'command' = 'info') => {
    setResponseArea(prev => [...prev, `[${type}] ${message}`]);
  };

  const addChatMessage = (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
    setChatMessages(prev => {
      // Skip duplicate consecutive system messages
      if (type === 'system' && prev.length > 0) {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === 'system' && lastMessage.content === content) {
          return prev; // Skip duplicate
        }
      }
      return [...prev, { content, type, timestamp: new Date(), metadata }];
    });
  };

  const checkAndInstallPackages = async () => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }

    // Vite error checking removed - handled by template setup
    addChatMessage('Sandbox is ready. Vite configuration is handled by the template.', 'system');
  };

  const handleSurfaceError = (errors: any[]) => {
    // Function kept for compatibility but Vite errors are now handled by template

    // Focus the input
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  const installPackages = async (packages: string[]) => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }

    try {
      const response = await fetch('/api/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages })
      });

      if (!response.ok) {
        throw new Error(`Failed to install packages: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (!data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                case 'output':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'error':
                  if (data.message && data.message !== 'undefined') {
                    addChatMessage(data.message, 'command', { commandType: 'error' });
                  }
                  break;
                case 'warning':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'success':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                case 'status':
                  addChatMessage(data.message, 'system');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      addChatMessage(`Failed to install packages: ${error.message}`, 'system');
    }
  };

  const checkSandboxStatus = async () => {
    try {
      const response = await fetch('/api/sandbox-status');
      const data = await response.json();

      if (data.active && data.healthy && data.sandboxData) {
        setSandboxData(data.sandboxData);
        updateStatus('Sandbox active', true);
      } else if (data.active && !data.healthy) {
        // Sandbox exists but not responding
        updateStatus('Sandbox not responding', false);
        // Optionally try to create a new one
      } else {
        setSandboxData(null);
        updateStatus('No sandbox', false);
      }
    } catch (error) {
      console.error('Failed to check sandbox status:', error);
      setSandboxData(null);
      updateStatus('Error', false);
    }
  };

  // silent=true: don't show the full-screen loading overlay (used when generation is happening in parallel)
  const createSandbox = async (fromHomeScreen = false, silent = false) => {
    console.log('[createSandbox] Starting sandbox creation...');
    if (!silent) {
      setLoading(true);
      setShowLoadingBackground(true);
    }
    updateStatus('Creating sandbox...', false);
    if (!silent) {
      setResponseArea([]);
      setScreenshotError(null);
    }

    try {
      const response = await fetch('/api/create-ai-sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();
      console.log('[createSandbox] Response data:', data);

      if (data.success) {
        setSandboxData(data);
        updateStatus('Sandbox active', true);
        log('Sandbox created successfully!');
        log(`Sandbox ID: ${data.sandboxId}`);
        log(`URL: ${data.url}`);

        // Update URL with sandbox ID
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('sandbox', data.sandboxId);
        // We no longer set 'model' in the URL to prevent stickiness when sharing or reloading
        router.push(`/?${newParams.toString()}`, { scroll: false });

        // Fade out loading background after sandbox loads (only if we showed it)
        if (!silent) {
          setTimeout(() => {
            setShowLoadingBackground(false);
          }, 3000);
        }

        if (data.structure) {
          displayStructure(data.structure);
        }

        // Fetch sandbox files after creation
        setTimeout(fetchSandboxFiles, 1000);

        // Restart Vite server to ensure it's running
        setTimeout(async () => {
          try {
            console.log('[createSandbox] Ensuring Vite server is running...');
            const restartResponse = await fetch('/api/restart-vite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (restartResponse.ok) {
              const restartData = await restartResponse.json();
              if (restartData.success) {
                console.log('[createSandbox] Vite server started successfully');
              }
            }
          } catch (error) {
            console.error('[createSandbox] Error starting Vite server:', error);
          }
        }, 2000);

        // Only add welcome message if not coming from home screen
        if (!fromHomeScreen) {
          addChatMessage(`Sandbox created! ID: ${data.sandboxId}. I now have context of your sandbox and can help you build your app. Just ask me to create components and I'll automatically apply them!

Tip: I automatically detect and install npm packages from your code imports (like react-router-dom, axios, etc.)`, 'system');
        }

        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = data.url;
          }
        }, 100);

        return data;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[createSandbox] Error:', error);
      updateStatus('Error', false);
      log(`Failed to create sandbox: ${error.message}`, 'error');
      if (!silent) {
        addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const displayStructure = (structure: any) => {
    if (typeof structure === 'object') {
      setStructureContent(JSON.stringify(structure, null, 2));
    } else {
      setStructureContent(structure || 'No structure available');
    }
  };

  const applyGeneratedCode = async (code: string, isEdit: boolean = false, explicitSandboxId?: string) => {
    setLoading(true);
    log('Applying AI-generated code...');

    // Switch to preview tab immediately when starting code application
    setActiveTab('preview');

    try {
      // Show progress component instead of individual messages
      setCodeApplicationState({ stage: 'analyzing' });

      // Get pending packages from tool calls
      const pendingPackages = ((window as any).pendingPackages || []).filter((pkg: any) => pkg && typeof pkg === 'string');
      if (pendingPackages.length > 0) {
        console.log('[applyGeneratedCode] Sending packages from tool calls:', pendingPackages);
        // Clear pending packages after use
        (window as any).pendingPackages = [];
      }

      // Use streaming endpoint for real-time feedback
      const response = await fetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: code,
          isEdit: isEdit,
          packages: pendingPackages,
          sandboxId: explicitSandboxId || sandboxData?.sandboxId // Override stale closure if provided
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to apply code: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalData: any = null;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'start':
                  // Don't add as chat message, just update state
                  setCodeApplicationState({ stage: 'analyzing' });
                  break;

                case 'step':
                  // Update progress state based on step
                  if (data.message.includes('Installing') && data.packages) {
                    setCodeApplicationState({
                      stage: 'installing',
                      packages: data.packages
                    });
                  } else if (data.message.includes('Creating files') || data.message.includes('Applying')) {
                    setCodeApplicationState({
                      stage: 'applying',
                      filesGenerated: finalData?.results?.filesCreated || []
                    });
                  }
                  break;

                case 'package-progress':
                  // Handle package installation progress
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      installedPackages: data.installedPackages
                    }));
                  }
                  break;

                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (data.command && !data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;

                case 'success':
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      installedPackages: data.installedPackages
                    }));
                  }
                  break;

                case 'file-progress':
                  // Skip file progress messages, they're noisy
                  break;

                case 'file-complete':
                  // Could add individual file completion messages if desired
                  break;

                case 'command-progress':
                  addChatMessage(`${data.action} command: ${data.command}`, 'command', { commandType: 'input' });
                  break;

                case 'command-output':
                  addChatMessage(data.output, 'command', {
                    commandType: data.stream === 'stderr' ? 'error' : 'output'
                  });
                  break;

                case 'command-complete':
                  if (data.success) {
                    addChatMessage(`Command completed successfully`, 'system');
                  } else {
                    addChatMessage(`Command failed with exit code ${data.exitCode}`, 'system');
                  }
                  break;

                case 'complete':
                  finalData = data;
                  setCodeApplicationState({ stage: 'complete' });
                  // Clear the state after a delay
                  setTimeout(() => {
                    setCodeApplicationState({ stage: null });
                  }, 3000);
                  break;

                case 'error':
                  addChatMessage(`Error: ${data.message || data.error || 'Unknown error'}`, 'system');
                  break;

                case 'warning':
                  addChatMessage(`${data.message}`, 'system');
                  break;

                case 'info':
                  // Show info messages, especially for package installation
                  if (data.message) {
                    addChatMessage(data.message, 'system');
                  }
                  break;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Process final data
      if (finalData && finalData.type === 'complete') {
        const data: {
          success: boolean;
          results: any;
          explanation: any;
          structure: any;
          message: any;
          autoCompleted?: boolean;
          autoCompletedComponents?: string[];
          warning?: string;
          missingImports?: string[];
          debug?: any;
        } = {
          success: true,
          results: finalData.results,
          explanation: finalData.explanation,
          structure: finalData.structure,
          message: finalData.message,
          autoCompleted: (finalData as any).autoCompleted,
          autoCompletedComponents: (finalData as any).autoCompletedComponents,
          warning: (finalData as any).warning,
          missingImports: (finalData as any).missingImports,
          debug: (finalData as any).debug
        };

        if (data.success) {
          const { results } = data;

          // Log package installation results without duplicate messages
          if (results.packagesInstalled?.length > 0) {
            log(`Packages installed: ${results.packagesInstalled.join(', ')}`);
          }

          if (results.filesCreated?.length > 0) {
            log('Files created:');
            results.filesCreated.forEach((file: string) => {
              log(`  ${file}`, 'command');
            });

            // Verify files were actually created by refreshing the sandbox if needed
            if (sandboxData?.sandboxId && results.filesCreated.length > 0) {
              // Small delay to ensure files are written
              setTimeout(() => {
                // Force refresh the iframe to show new files
                if (iframeRef.current) {
                  iframeRef.current.src = iframeRef.current.src;
                }
              }, 1000);
            }
          }

          if (results.filesUpdated?.length > 0) {
            log('Files updated:');
            results.filesUpdated.forEach((file: string) => {
              log(`  ${file}`, 'command');
            });
          }

          // Update conversation context with applied code
          setConversationContext(prev => ({
            ...prev,
            appliedCode: [...prev.appliedCode, {
              files: [...(results.filesCreated || []), ...(results.filesUpdated || [])],
              timestamp: new Date()
            }]
          }));

          if (results.commandsExecuted?.length > 0) {
            log('Commands executed:');
            results.commandsExecuted.forEach((cmd: string) => {
              log(`  $ ${cmd}`, 'command');
            });
          }

          if (results.errors?.length > 0) {
            results.errors.forEach((err: string) => {
              log(err, 'error');
            });
          }

          if (data.structure) {
            displayStructure(data.structure);
          }

          if (data.explanation) {
            log(data.explanation);
          }

          if (data.autoCompleted) {
            log('Auto-generating missing components...', 'command');

            if (data.autoCompletedComponents) {
              setTimeout(() => {
                log('Auto-generated missing components:', 'info');
                data.autoCompletedComponents?.forEach((comp: string) => {
                  log(`  ${comp}`, 'command');
                });
              }, 1000);
            }
          } else if (data.warning) {
            log(data.warning, 'error');

            if (data.missingImports && data.missingImports.length > 0) {
              const missingList = data.missingImports.join(', ');
              addChatMessage(
                `Ask me to "create the missing components: ${missingList}" to fix these import errors.`,
                'system'
              );
            }
          }

          log('Code applied successfully!');
          console.log('[applyGeneratedCode] Response data:', data);
          console.log('[applyGeneratedCode] Debug info:', data.debug);
          console.log('[applyGeneratedCode] Current sandboxData:', sandboxData);
          console.log('[applyGeneratedCode] Current iframe element:', iframeRef.current);
          console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current?.src);

          if (results.filesCreated?.length > 0) {
            setConversationContext(prev => ({
              ...prev,
              appliedCode: [...prev.appliedCode, {
                files: results.filesCreated,
                timestamp: new Date()
              }]
            }));

            // Update the chat message to show success
            // Only show file list if not in edit mode
            if (isEdit) {
              addChatMessage(`Edit applied successfully!`, 'system');
            } else {
              // Check if this is part of a generation flow (has recent AI recreation message)
              const recentMessages = chatMessages.slice(-5);
              const isPartOfGeneration = recentMessages.some(m =>
                m.content.includes('AI recreation generated') ||
                m.content.includes('Code generated')
              );

              // Don't show files if part of generation flow to avoid duplication
              if (isPartOfGeneration) {
                addChatMessage(`Applied ${results.filesCreated.length} files successfully!`, 'system');
              } else {
                addChatMessage(`Applied ${results.filesCreated.length} files successfully!`, 'system', {
                  appliedFiles: results.filesCreated
                });
              }
            }

            // If there are failed packages, add a message about checking for errors
            if (results.packagesFailed?.length > 0) {
              addChatMessage(`⚠️ Some packages failed to install. Check the error banner above for details.`, 'system');
            }

            // Fetch updated file structure
            await fetchSandboxFiles();

            // Automatically check and install any missing packages
            await checkAndInstallPackages();

            // Test build to ensure everything compiles correctly
            // Skip build test for now - it's causing errors with undefined activeSandbox
            // The build test was trying to access global.activeSandbox from the frontend,
            // but that's only available in the backend API routes
            console.log('[build-test] Skipping build test - would need API endpoint');

            // Force iframe refresh after applying code
            const refreshDelay = appConfig.codeApplication.defaultRefreshDelay; // Allow Vite to process changes

            setTimeout(() => {
              if (iframeRef.current && sandboxData?.url) {
                console.log('[home] Refreshing iframe after code application...');

                // Method 1: Change src with timestamp
                const urlWithTimestamp = `${sandboxData.url}?t=${Date.now()}&applied=true`;
                iframeRef.current.src = urlWithTimestamp;

                // Method 2: Force reload after a short delay
                setTimeout(() => {
                  try {
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.location.reload();
                      console.log('[home] Force reloaded iframe content');
                    }
                  } catch (e) {
                    console.log('[home] Could not reload iframe (cross-origin):', e);
                  }
                }, 1000);
              }
            }, refreshDelay);

            // Vite error checking removed - handled by template setup
          }

          // Give Vite HMR a moment to detect changes, then ensure refresh
          if (iframeRef.current && sandboxData?.url) {
            // Wait for Vite to process the file changes
            // If packages were installed, wait longer for Vite to restart
            const packagesInstalled = results?.packagesInstalled?.length > 0 || data.results?.packagesInstalled?.length > 0;
            const refreshDelay = packagesInstalled ? appConfig.codeApplication.packageInstallRefreshDelay : appConfig.codeApplication.defaultRefreshDelay;
            console.log(`[applyGeneratedCode] Packages installed: ${packagesInstalled}, refresh delay: ${refreshDelay}ms`);

            setTimeout(async () => {
              if (iframeRef.current && sandboxData?.url) {
                console.log('[applyGeneratedCode] Starting iframe refresh sequence...');
                console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current.src);
                console.log('[applyGeneratedCode] Sandbox URL:', sandboxData.url);

                // Method 1: Try direct navigation first
                try {
                  const urlWithTimestamp = `${sandboxData.url}?t=${Date.now()}&force=true`;
                  console.log('[applyGeneratedCode] Attempting direct navigation to:', urlWithTimestamp);

                  // Remove any existing onload handler
                  iframeRef.current.onload = null;

                  // Navigate directly
                  iframeRef.current.src = urlWithTimestamp;

                  // Wait a bit and check if it loaded
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  // Try to access the iframe content to verify it loaded
                  try {
                    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
                    if (iframeDoc && iframeDoc.readyState === 'complete') {
                      console.log('[applyGeneratedCode] Iframe loaded successfully');
                      return;
                    }
                  } catch (e) {
                    console.log('[applyGeneratedCode] Cannot access iframe content (CORS), assuming loaded');
                    return;
                  }
                } catch (e) {
                  console.error('[applyGeneratedCode] Direct navigation failed:', e);
                }

                // Method 2: Force complete iframe recreation if direct navigation failed
                console.log('[applyGeneratedCode] Falling back to iframe recreation...');
                const parent = iframeRef.current.parentElement;
                const newIframe = document.createElement('iframe');

                // Copy attributes
                newIframe.className = iframeRef.current.className;
                newIframe.title = iframeRef.current.title;
                newIframe.allow = iframeRef.current.allow;
                // Copy sandbox attributes
                const sandboxValue = iframeRef.current.getAttribute('sandbox');
                if (sandboxValue) {
                  newIframe.setAttribute('sandbox', sandboxValue);
                }

                // Remove old iframe
                iframeRef.current.remove();

                // Add new iframe
                newIframe.src = `${sandboxData.url}?t=${Date.now()}&recreated=true`;
                parent?.appendChild(newIframe);

                // Update ref
                (iframeRef as any).current = newIframe;

                console.log('[applyGeneratedCode] Iframe recreated with new content');
              } else {
                console.error('[applyGeneratedCode] No iframe or sandbox URL available for refresh');
              }
            }, refreshDelay); // Dynamic delay based on whether packages were installed
          }

        } else {
          throw new Error(finalData?.error || 'Failed to apply code');
        }
      } else {
        // If no final data was received, still close loading
        addChatMessage('Code application may have partially succeeded. Check the preview.', 'system');
      }
    } catch (error: any) {
      log(`Failed to apply code: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      // Clear isEdit flag after applying code
      setGenerationProgress(prev => ({
        ...prev,
        isEdit: false
      }));
    }
  };

  const fetchSandboxFiles = async () => {
    if (!sandboxData) return;

    try {
      const response = await fetch('/api/get-sandbox-files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSandboxFiles(data.files || {});
          setFileStructure(data.structure || '');
          console.log('[fetchSandboxFiles] Updated file list:', Object.keys(data.files || {}).length, 'files');
        }
      }
    } catch (error) {
      console.error('[fetchSandboxFiles] Error fetching files:', error);
    }
  };

  const restartViteServer = async () => {
    try {
      addChatMessage('Restarting Vite dev server...', 'system');

      const response = await fetch('/api/restart-vite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          addChatMessage('✓ Vite dev server restarted successfully!', 'system');

          // Refresh the iframe after a short delay
          setTimeout(() => {
            if (iframeRef.current && sandboxData?.url) {
              iframeRef.current.src = `${sandboxData.url}?t=${Date.now()}`;
            }
          }, 2000);
        } else {
          addChatMessage(`Failed to restart Vite: ${data.error}`, 'error');
        }
      } else {
        addChatMessage('Failed to restart Vite server', 'error');
      }
    } catch (error) {
      console.error('[restartViteServer] Error:', error);
      addChatMessage(`Error restarting Vite: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const applyCode = async () => {
    const code = promptInput.trim();
    if (!code) {
      log('Please enter some code first', 'error');
      addChatMessage('No code to apply. Please generate code first.', 'system');
      return;
    }

    // Prevent double clicks
    if (loading) {
      console.log('[applyCode] Already loading, skipping...');
      return;
    }

    // Switch to preview tab when applying code manually
    setActiveTab('preview');

    // Determine if this is an edit based on whether we have applied code before
    const isEdit = conversationContext.appliedCode.length > 0;
    await applyGeneratedCode(code, isEdit);
  };

  const renderMainContent = () => {
    if (activeTab === 'generation' && (generationProgress.isGenerating || generationProgress.files.length > 0)) {
      return (
        /* Generation Tab Content */
        <div className="absolute inset-0 flex overflow-hidden">
          {/* File Explorer - Minimal Design */}
          {!generationProgress.isEdit && (
            <div className="w-[280px] border-r border-gray-700/50 bg-gray-950/50 backdrop-blur-sm flex flex-col flex-shrink-0">
              <div className="p-4 bg-gray-900/50 text-gray-100 flex items-center justify-between border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <i className="fas fa-folder-tree text-white/70"></i>
                  <span className="text-sm font-medium">Explorer</span>
                </div>
                <div className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-md flex items-center gap-1">
                  <i className="fas fa-file text-xs"></i>
                  {generationProgress.files.length} files
                </div>
              </div>
              {/* Sandbox status strip — shown while sandbox is spinning up in parallel */}
              {!sandboxData && generationProgress.isGenerating && (
                <div className="px-3 py-2 bg-blue-500/5 border-b border-blue-500/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                  <span className="text-[10px] text-blue-300/70 font-medium">Sandbox warming up…</span>
                </div>
              )}

              {/* File Tree - Clean Design */}
              <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                <div className="text-sm space-y-1">
                  {/* Root app folder */}
                  <div
                    className="flex items-center gap-2 py-2 px-3 hover:bg-gray-800/50 rounded-lg cursor-pointer text-gray-200 transition-all group"
                    onClick={() => toggleFolder('app')}
                  >
                    {expandedFolders.has('app') ? (
                      <i className="fas fa-chevron-down w-4 h-4 text-gray-400 group-hover:text-gray-300 flex items-center justify-center text-xs"></i>
                    ) : (
                      <i className="fas fa-chevron-right w-4 h-4 text-gray-400 group-hover:text-gray-300 flex items-center justify-center text-xs"></i>
                    )}
                    {expandedFolders.has('app') ? (
                      <i className="fas fa-folder-open w-4 h-4 text-white/80 flex items-center justify-center text-xs"></i>
                    ) : (
                      <i className="fas fa-folder w-4 h-4 text-white/60 flex items-center justify-center text-xs"></i>
                    )}
                    <span className="font-medium text-gray-100">app</span>
                  </div>

                  {expandedFolders.has('app') && (
                    <div className="ml-6 space-y-1">
                      {/* Group files by directory */}
                      {(() => {
                        const fileTree: { [key: string]: Array<{ name: string; edited?: boolean }> } = {};

                        // Create a map of edited files
                        const editedFiles = new Set(
                          generationProgress.files
                            .filter(f => f.edited)
                            .map(f => f.path)
                        );

                        // Process all files from generation progress
                        generationProgress.files.forEach(file => {
                          const parts = file.path.split('/');
                          const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                          const fileName = parts[parts.length - 1];

                          if (!fileTree[dir]) fileTree[dir] = [];
                          fileTree[dir].push({
                            name: fileName,
                            edited: file.edited || false
                          });
                        });

                        return Object.entries(fileTree).map(([dir, files]) => (
                          <div key={dir} className="space-y-1">
                            {dir && (
                              <div
                                className="flex items-center gap-2 py-1.5 px-3 hover:bg-gray-800/40 rounded-md cursor-pointer text-gray-300 hover:text-gray-100 transition-all group"
                                onClick={() => toggleFolder(dir)}
                              >
                                {expandedFolders.has(dir) ? (
                                  <i className="fas fa-chevron-down w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400 flex items-center justify-center text-[10px]"></i>
                                ) : (
                                  <i className="fas fa-chevron-right w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400 flex items-center justify-center text-[10px]"></i>
                                )}
                                {expandedFolders.has(dir) ? (
                                  <i className="fas fa-folder-open w-3.5 h-3.5 text-yellow-500 flex items-center justify-center text-[10px]"></i>
                                ) : (
                                  <i className="fas fa-folder w-3.5 h-3.5 text-yellow-600 flex items-center justify-center text-[10px]"></i>
                                )}
                                <span className="text-sm text-gray-300 group-hover:text-gray-100">{dir.split('/').pop()}</span>
                              </div>
                            )}
                            {(!dir || expandedFolders.has(dir)) && (
                              <div className={dir ? 'ml-6 space-y-1' : 'space-y-1'}>
                                {files.sort((a, b) => a.name.localeCompare(b.name)).map(fileInfo => {
                                  const fullPath = dir ? `${dir}/${fileInfo.name}` : fileInfo.name;
                                  const isSelected = selectedFile === fullPath;

                                  return (
                                    <div
                                      key={fullPath}
                                      className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all ${isSelected
                                        ? 'bg-white text-black font-semibold'
                                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                      onClick={() => handleFileClick(fullPath)}
                                    >
                                      {getFileIcon(fileInfo.name)}
                                      <span className={`text-xs flex items-center gap-1 ${isSelected ? 'font-medium text-black' : ''}`}>
                                        {fileInfo.name}
                                        {fileInfo.edited && (
                                          <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-black text-white' : 'bg-white/20 text-white'
                                            }`}>✓</span>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Code Content */}
          <div className="flex-1 flex flex-col overflow-hidden">


            {/* Clean Code Display Section */}
            <div className="flex-1 rounded-xl bg-gray-950/80 backdrop-blur-sm border border-gray-700/50 p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide" ref={codeDisplayRef}>
                {/* Show selected file if one is selected */}
                {selectedFile ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                      <div className="px-4 py-3 bg-gray-800/50 text-gray-100 flex items-center justify-between border-b border-gray-700/50">
                        <div className="flex items-center gap-3">
                          {getFileIcon(selectedFile)}
                          <span className="font-mono text-sm font-medium">{selectedFile}</span>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-md">Preview</span>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="hover:bg-gray-700/50 p-1.5 rounded-lg transition-colors group"
                        >
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-gray-900 border border-gray-700 rounded">
                        <SyntaxHighlighter
                          language={(() => {
                            const ext = selectedFile.split('.').pop()?.toLowerCase();
                            if (ext === 'css') return 'css';
                            if (ext === 'json') return 'json';
                            if (ext === 'html') return 'html';
                            return 'jsx';
                          })()}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                          showLineNumbers={true}
                        >
                          {(() => {
                            // Find the file content from generated files
                            const file = generationProgress.files.find(f => f.path === selectedFile);
                            return file?.content || '// File content will appear here';
                          })()}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                ) : /* If no files parsed yet, show loading or raw stream */
                  generationProgress.files.length === 0 && !generationProgress.currentFile ? (
                    generationProgress.isThinking ? (
                      // Replit-style LatticeLoader Thinking View
                      <div className="flex items-center justify-center h-full bg-[#0a0c10] p-6">
                        <div className="flex flex-col items-center gap-5 max-w-sm w-full p-6 rounded-2xl bg-[#12141c]/90 border border-white/[0.08] backdrop-blur-xl shadow-2xl relative overflow-hidden">
                          <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                          <LatticeLoader
                            status="working"
                            label="Thinking"
                            doneLabel="Done in"
                            errorLabel="Failed after"
                            pattern="ripple"
                            grid={3}
                            shape="round"
                            doneColor="#22c55e"
                            errorColor="#ef4444"
                            cellSize={6}
                            gap={2}
                            fontSize={14}
                            step={90}
                            idleOpacity={0.15}
                            glow
                            glowColor="#f97316"
                            showTimer
                            color="#f5f5f5"
                          />

                          <div className="flex flex-col items-center gap-1.5 text-center">
                            <span className="text-white/80 text-xs font-semibold tracking-wide">
                              {generationProgress.status || 'Architecting Project Structure'}
                            </span>
                            <span className="text-white/40 text-[11px] leading-relaxed">
                              Synthesizing components, styles & logic in background
                            </span>
                          </div>

                          {generationProgress.thinkingText && (
                            <div className="w-full text-left text-[11px] text-white/70 bg-black/50 border border-white/[0.05] rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar font-mono leading-relaxed">
                              {generationProgress.thinkingText.slice(-300)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-purple-950/90 backdrop-blur-xl border-b border-white/[0.06] text-white flex items-center justify-between" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-sm">Streaming code...</span>
                          </div>
                        </div>
                        <div className="p-4 bg-black rounded">
                          <SyntaxHighlighter
                            language="jsx"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.875rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={true}
                          >
                            {generationProgress.streamedCode || 'Starting code generation...'}
                          </SyntaxHighlighter>
                          <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse" />
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      {/* Show current file being generated */}
                      {generationProgress.currentFile && (
                        <div className="bg-black rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-purple-950/90 backdrop-blur-xl border-b border-white/[0.06] text-white flex items-center justify-between" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span className="font-mono text-sm">{generationProgress.currentFile.path}</span>
                              <span className={`px-2 py-0.5 text-xs rounded ${generationProgress.currentFile.type === 'css' ? 'bg-white/20 text-white' :
                                generationProgress.currentFile.type === 'javascript' ? 'bg-yellow-600 text-white' :
                                  generationProgress.currentFile.type === 'json' ? 'bg-green-600 text-white' :
                                    'bg-gray-200 text-gray-700'
                                }`}>
                                {generationProgress.currentFile.type === 'javascript' ? 'JSX' : generationProgress.currentFile.type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="bg-black rounded">
                            <SyntaxHighlighter
                              language={
                                generationProgress.currentFile.type === 'css' ? 'css' :
                                  generationProgress.currentFile.type === 'json' ? 'json' :
                                    generationProgress.currentFile.type === 'html' ? 'html' :
                                      'jsx'
                              }
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.75rem',
                                background: 'transparent',
                              }}
                              showLineNumbers={true}
                            >
                              {generationProgress.currentFile.content}
                            </SyntaxHighlighter>
                            <span className="inline-block w-2 h-3 bg-purple-400 ml-4 mb-4 animate-pulse" />
                          </div>
                        </div>
                      )}

                      {/* Show completed files */}
                      {generationProgress.files.map((file, idx) => (
                        <div key={idx} className="bg-black rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-purple-950/90 backdrop-blur-xl border-b border-white/[0.06] text-white flex items-center justify-between" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              <span className="font-mono text-sm">{file.path}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded ${file.type === 'css' ? 'bg-white/20 text-white' :
                              file.type === 'javascript' ? 'bg-yellow-600 text-white' :
                                file.type === 'json' ? 'bg-green-600 text-white' :
                                  'bg-gray-200 text-gray-700'
                              }`}>
                              {file.type === 'javascript' ? 'JSX' : file.type.toUpperCase()}
                            </span>
                          </div>
                          <div className="bg-black max-h-48 overflow-y-auto scrollbar-hide">
                            <SyntaxHighlighter
                              language={
                                file.type === 'css' ? 'css' :
                                  file.type === 'json' ? 'json' :
                                    file.type === 'html' ? 'html' :
                                      'jsx'
                              }
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.75rem',
                                background: 'transparent',
                              }}
                              showLineNumbers={true}
                              wrapLongLines={true}
                            >
                              {file.content}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      ))}

                      {/* Show remaining raw stream if there's content after the last file */}
                      {!generationProgress.currentFile && generationProgress.streamedCode.length > 0 && (
                        <div className="bg-black rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-purple-950/90 backdrop-blur-xl border-b border-white/[0.06] text-white flex items-center justify-between" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              <span className="font-mono text-sm">Processing...</span>
                            </div>
                          </div>
                          <div className="bg-black rounded">
                            <SyntaxHighlighter
                              language="jsx"
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                fontSize: '0.75rem',
                                background: 'transparent',
                              }}
                              showLineNumbers={false}
                            >
                              {(() => {
                                // Show only the tail of the stream after the last file
                                const lastFileEnd = generationProgress.files.length > 0
                                  ? generationProgress.streamedCode.lastIndexOf('</file>') + 7
                                  : 0;
                                let remainingContent = generationProgress.streamedCode.slice(lastFileEnd).trim();

                                // Remove explanation tags and content
                                remainingContent = remainingContent.replace(/<explanation>[\s\S]*?<\/explanation>/g, '').trim();

                                // If only whitespace or nothing left, show waiting message
                                return remainingContent || 'Waiting for next file...';
                              })()}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Progress indicator */}
            {generationProgress.components.length > 0 && (
              <div className="mx-6 mb-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                    style={{
                      width: `${(generationProgress.currentComponent / Math.max(generationProgress.components.length, 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeTab === 'agents') {
      return (
        <div className="absolute inset-0">
          <MultiAgentPanel />
        </div>
      );
    } else if (activeTab === 'preview') {
      // Fix loading overlap - only show screenshot overlay when NOT in main loading stage
      if (urlScreenshot && (isPreparingDesign && !loadingStage)) {
        return (
          <div className="relative w-full h-full bg-gray-50">
            <img
              src={urlScreenshot}
              alt="Website preview"
              className="w-full h-full object-contain"
            />
            {isPreparingDesign && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center bg-gray-900/90 rounded-xl p-8 border border-gray-700 shadow-2xl">
                  <div className="w-10 h-10 border-2 border-gray-400 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-sm font-medium">
                    Preparing your design for {targetUrl}...
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }

      // Default state when no prompt entered - show "Just Imagine. crust Builds."
      if (chatMessages.filter((m: any) => m.type === 'user').length === 0 && generationProgress.files.length === 0 && !generationProgress.isGenerating && !loadingStage) {
        return (
          <div className="flex items-center justify-center h-full bg-black">
            <div className="text-center">
              <p className="text-white/30 text-2xl font-light tracking-wide">Just Imagine.</p>
              <p className="text-lg mt-1 tracking-wide"><span className="text-purple-400 font-semibold">crust</span> <span className="text-white/50 font-light">Builds.</span></p>
            </div>
          </div>
        );
      }

      // Main loading screen - clean liquid glass design (only when actually generating and sandbox not ready)
      if ((loadingStage || (generationProgress.isGenerating && !generationProgress.isEdit)) && !(sandboxData?.url && !loading)) {
        return (
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-6">
              {/* Liquid glass box with animated website skeleton */}
              <div className="relative w-72 h-48 rounded-2xl border border-white/[0.12] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.08)' }}>
                {/* Animated website skeleton components */}
                <div className="p-4 space-y-3 relative">
                  {/* Header bar skeleton */}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500/30 animate-pulse" />
                    <div className="h-2 w-16 rounded-full bg-white/[0.08] animate-pulse" />
                    <div className="ml-auto flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-white/[0.06] animate-pulse" style={{ animationDelay: '100ms' }} />
                      <div className="w-2 h-2 rounded-full bg-white/[0.06] animate-pulse" style={{ animationDelay: '200ms' }} />
                      <div className="w-2 h-2 rounded-full bg-white/[0.06] animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>

                  {/* Hero text skeleton */}
                  <div className="space-y-1.5 pt-1">
                    <div className="h-2.5 w-3/4 rounded-full bg-white/[0.08] animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-1/2 rounded-full bg-white/[0.05] animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>

                  {/* Form inputs skeleton */}
                  <div className="space-y-2 pt-1">
                    <div className="h-6 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="h-6 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] animate-pulse" style={{ animationDelay: '350ms' }} />
                  </div>

                  {/* Button skeleton */}
                  <div className="flex gap-2 pt-1">
                    <div className="h-6 w-20 rounded-lg bg-purple-500/20 border border-purple-500/20 animate-pulse" style={{ animationDelay: '400ms' }} />
                    <div className="h-6 w-14 rounded-lg bg-white/[0.04] border border-white/[0.06] animate-pulse" style={{ animationDelay: '500ms' }} />
                  </div>

                  {/* Card row skeleton */}
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 h-10 rounded-lg border border-white/[0.06] bg-white/[0.02] animate-pulse" style={{ animationDelay: '450ms' }} />
                    <div className="flex-1 h-10 rounded-lg border border-white/[0.06] bg-white/[0.02] animate-pulse" style={{ animationDelay: '550ms' }} />
                    <div className="flex-1 h-10 rounded-lg border border-white/[0.06] bg-white/[0.02] animate-pulse" style={{ animationDelay: '650ms' }} />
                  </div>
                </div>
              </div>

              {/* Text and loading dots */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-white/70 text-sm font-medium tracking-wide">
                  {generationProgress.isThinking ? 'crust is thinking' : 'crust is creating'}
                </span>
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Show sandbox iframe only when not in any loading state
      if (sandboxData?.url && !loading) {
        return (
          <div className="relative w-full h-full">
            <iframe
              ref={iframeRef}
              src={sandboxData.url}
              className="w-full h-full border-none"
              title="Craftorā Sandbox"
              allow="clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
            {/* Refresh button */}
            <button
              onClick={() => {
                if (iframeRef.current && sandboxData?.url) {
                  console.log('[Manual Refresh] Forcing iframe reload...');
                  const newSrc = `${sandboxData.url}?t=${Date.now()}&manual=true`;
                  iframeRef.current.src = newSrc;
                }
              }}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
              title="Refresh sandbox"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        );
      }

      // Clean screenshot loading animation
      if (isCapturingScreenshot) {
        return (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
            {/* Minimal animated dots */}
            <div className="absolute inset-0">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full"
                  style={{
                    left: `${30 + Math.random() * 40}%`,
                    top: `${30 + Math.random() * 40}%`,
                  }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2.5 + Math.random(),
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            <div className="text-center z-10">
              {/* Clean logo with minimal scanning effect */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <div className="relative mx-auto w-16 h-16">
                  {/* Clean logo container */}
                  <div className="relative w-full h-full bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/30 flex items-center justify-center">
                    <img
                      src="/c1logo.png"
                      alt="Craftorā Logo"
                      className="w-8 h-8 object-contain"
                    />
                  </div>

                  {/* Subtle scanning effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                    }}
                    animate={{ x: [-60, 60] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </motion.div>

              {/* Clean spinner */}
              <motion.div
                className="w-12 h-12 border-2 border-gray-600/30 border-t-white rounded-full mx-auto mb-6"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {/* Clean title */}
              <motion.h3
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg font-medium text-gray-100 mb-1"
              >
                Capturing screenshot
              </motion.h3>

              {/* Clean subtitle */}
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-gray-400 text-sm"
              >
                Analyzing page structure
              </motion.p>
            </div>
          </div>
        );
      }

      // Default state when no sandbox and no screenshot
      return (
        <div className="flex items-center justify-center h-full bg-black">
          {screenshotError ? (
            <div className="text-center">
              <p className="text-white/60 mb-2">Failed to capture screenshot</p>
              <p className="text-sm text-white/40">{screenshotError}</p>
            </div>
          ) : sandboxData ? (
            <div className="text-white/50">
              <div className="w-8 h-8 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading preview...</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white/30 text-2xl font-light tracking-wide">Just Imagine.</p>
              <p className="text-lg mt-1 tracking-wide"><span className="text-purple-400 font-semibold">crust</span> <span className="text-white/50 font-light">Builds.</span></p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const sendChatMessage = async (directMessage?: string) => {
    let message = (directMessage || aiChatInput).trim();
    if (!message) return;

    if (!aiEnabled) {
      addChatMessage('AI is disabled. Please enable it first.', 'system');
      return;
    }

    addChatMessage(message, 'user');
    setAiChatInput('');

    // No per-model rate limits — all models use NVIDIA NIM

    // Check for special commands
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'check packages' || lowerMessage === 'install packages' || lowerMessage === 'npm install') {
      if (!sandboxData) {
        addChatMessage('No active sandbox. Create a sandbox first!', 'system');
        return;
      }
      await checkAndInstallPackages();
      return;
    }

    // Sandbox is optional — generation proceeds regardless of sandbox status
    let sandboxPromise: Promise<any> | null = null;
    let sandboxCreating = false;

    // Only start sandbox creation if we have an E2B key configured and no sandbox yet
    if (!sandboxData && hasSandboxKey) {
      sandboxCreating = true;
      // silent=true so the full-screen overlay doesn't cover the code generation panel
      sandboxPromise = createSandbox(true, true).catch((error: any) => {
        console.warn('[chat] Sandbox creation failed, will show code without preview:', error.message);
        return null; // Don't throw — allow generation to continue
      });
    }

    // Determine if this is an edit
    const isEdit = conversationContext.appliedCode.length > 0;

    // Open Engineer Planning & Questions check (inspired by opencode-dev)
    if (!isEdit && generationProgress.files.length === 0 && !openEngineerPlan) {
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isThinking: true,
        status: 'Open Engineer analyzing system architecture...',
        thinkingText: 'Exploring system requirements, analyzing layout patterns, and formulating clarifying questions...',
      }));

      try {
        let modelToUse = aiModel;
        if (unlockedModels.length > 0 && !unlockedModels.includes(modelToUse)) {
          modelToUse = unlockedModels[0];
        }

        const planRes = await fetch('/api/open-engineer/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: message,
            model: modelToUse,
            conversationHistory: chatMessages.slice(-5)
          })
        });

        if (planRes.ok) {
          const planData = await planRes.json();
          if (planData.success && planData.plan) {
            setOpenEngineerPlan(planData.plan);
            setGenerationProgress(prev => ({
              ...prev,
              isThinking: true,
              thinkingText: planData.plan.reasoning || 'System architecture formulated.',
              status: 'Open Engineer building system components...'
            }));

            // Open Engineer autonomously proceeds to build, incorporating architecture
            if (planData.plan.summary) {
              message = message + "\n[Architecture: " + planData.plan.summary + "]";
            }
          }
        }
      } catch (err) {
        console.warn('[OpenEngineer] Plan step skipped, proceeding directly:', err);
      }
    }

    try {
      // Generation tab is already active from scraping phase
      setGenerationProgress(prev => ({
        ...prev,  // Preserve all existing state
        isGenerating: true,
        status: 'Starting AI generation...',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: true,
        thinkingText: 'Analyzing your request...',
        thinkingDuration: undefined,
        currentFile: undefined,
        lastProcessedPosition: 0,
        // Add isEdit flag to generation progress
        isEdit: isEdit,
        // Keep existing files for edits - we'll mark edited ones differently
        files: prev.files
      }));

      // Backend now manages file state - no need to fetch from frontend
      console.log('[chat] Using backend file cache for context');

      const fullContext = {
        sandboxId: sandboxData?.sandboxId || (sandboxCreating ? 'pending' : null),
        structure: structureContent,
        recentMessages: chatMessages.slice(-20),
        conversationContext: conversationContext,
        currentCode: promptInput,
        sandboxUrl: sandboxData?.url,
        sandboxCreating: sandboxCreating
      };

      // Debug what we're sending
      console.log('[chat] Sending context to AI:');
      console.log('[chat] - sandboxId:', fullContext.sandboxId);
      console.log('[chat] - isEdit:', conversationContext.appliedCode.length > 0);

      // Ensure we use an unlocked model if available
      let modelToUse = aiModel;
      if (unlockedModels.length > 0 && !unlockedModels.includes(modelToUse)) {
        console.warn(`[chat] Selected model ${modelToUse} is locked. Automatically using unlocked model ${unlockedModels[0]}`);
        modelToUse = unlockedModels[0];
      }

      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: message,
          model: modelToUse,
          context: fullContext,
          isEdit: conversationContext.appliedCode.length > 0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let explanation = '';

      if (reader) {
        let sseBuffer = ''; // Buffer for incomplete SSE messages

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (terminated by \n\n)
          const messages = sseBuffer.split('\n\n');
          // Keep the last part as it might be incomplete
          sseBuffer = messages.pop() || '';

          for (const message of messages) {
            const lines = message.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'status') {
                    setGenerationProgress(prev => ({ ...prev, status: data.message }));
                  } else if (data.type === 'thinking') {
                    setGenerationProgress(prev => ({
                      ...prev,
                      isThinking: true,
                      thinkingText: (prev.thinkingText || '') + data.text
                    }));
                  } else if (data.type === 'thinking_complete') {
                    setGenerationProgress(prev => ({
                      ...prev,
                      isThinking: false,
                      thinkingDuration: data.duration
                    }));
                  } else if (data.type === 'conversation') {
                    // Add conversational text to chat only if it's not code
                    let text = data.text || '';

                    // Remove package tags from the text
                    text = text.replace(/<package>[^<]*<\/package>/g, '');
                    text = text.replace(/<packages>[^<]*<\/packages>/g, '');
                    text = text.replace(/<explanation>[\s\S]*?<\/explanation>/g, '');

                    // Filter out any XML tags and file content that slipped through
                    if (!text.includes('<file') && !text.includes('import React') &&
                      !text.includes('export default') && !text.includes('className=') &&
                      text.trim().length > 0) {
                      addChatMessage(text.trim(), 'ai');
                    }
                  } else if (data.type === 'stream' && data.raw) {
                    setGenerationProgress(prev => {
                      const newStreamedCode = prev.streamedCode + data.text;

                      // Tab is already switched after scraping

                      const updatedState = {
                        ...prev,
                        streamedCode: newStreamedCode,
                        isStreaming: true,
                        isThinking: false,
                        status: 'Generating code...'
                      };

                      // Process complete files from the accumulated stream
                      const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                      let match;
                      const processedFiles = new Set(prev.files.map(f => f.path));

                      while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                        const filePath = match[1];
                        const fileContent = match[2];

                        // Only add if we haven't processed this file yet
                        if (!processedFiles.has(filePath)) {
                          const fileExt = filePath.split('.').pop() || '';
                          const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                            fileExt === 'css' ? 'css' :
                              fileExt === 'json' ? 'json' :
                                fileExt === 'html' ? 'html' : 'text';

                          // Check if file already exists
                          const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);

                          if (existingFileIndex >= 0) {
                            // Update existing file and mark as edited
                            updatedState.files = [
                              ...updatedState.files.slice(0, existingFileIndex),
                              {
                                ...updatedState.files[existingFileIndex],
                                content: fileContent.trim(),
                                type: fileType,
                                completed: true,
                                edited: true
                              },
                              ...updatedState.files.slice(existingFileIndex + 1)
                            ];
                          } else {
                            // Add new file
                            updatedState.files = [...updatedState.files, {
                              path: filePath,
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: false
                            }];
                          }

                          // Only show file status if not in edit mode
                          if (!prev.isEdit) {
                            updatedState.status = `Completed ${filePath}`;
                          }
                          processedFiles.add(filePath);
                        }
                      }

                      // Check for current file being generated (incomplete file at the end)
                      const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                      if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                        const filePath = lastFileMatch[1];
                        const partialContent = lastFileMatch[2];

                        if (!processedFiles.has(filePath)) {
                          const fileExt = filePath.split('.').pop() || '';
                          const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                            fileExt === 'css' ? 'css' :
                              fileExt === 'json' ? 'json' :
                                fileExt === 'html' ? 'html' : 'text';

                          updatedState.currentFile = {
                            path: filePath,
                            content: partialContent,
                            type: fileType
                          };
                          // Only show file status if not in edit mode
                          if (!prev.isEdit) {
                            updatedState.status = `Generating ${filePath}`;
                          }
                        }
                      } else {
                        updatedState.currentFile = undefined;
                      }

                      return updatedState;
                    });
                  } else if (data.type === 'app') {
                    setGenerationProgress(prev => ({
                      ...prev,
                      status: 'Generated App.jsx structure'
                    }));
                  } else if (data.type === 'component') {
                    setGenerationProgress(prev => ({
                      ...prev,
                      status: `Generated ${data.name}`,
                      components: [...prev.components, {
                        name: data.name,
                        path: data.path,
                        completed: true
                      }],
                      currentComponent: data.index
                    }));
                  } else if (data.type === 'package') {
                    // Handle package installation from tool calls
                    setGenerationProgress(prev => ({
                      ...prev,
                      status: data.message || `Installing ${data.name}`
                    }));
                  } else if (data.type === 'complete') {
                    generatedCode = data.generatedCode;
                    explanation = data.explanation;

                    // Save the last generated code
                    setConversationContext(prev => ({
                      ...prev,
                      lastGeneratedCode: generatedCode
                    }));

                    // Clear thinking state when generation completes
                    setGenerationProgress(prev => ({
                      ...prev,
                      isThinking: false,
                      thinkingText: undefined,
                      thinkingDuration: undefined
                    }));

                    // Store packages to install from tool calls
                    if (data.packagesToInstall && data.packagesToInstall.length > 0) {
                      console.log('[generate-code] Packages to install from tools:', data.packagesToInstall);
                      // Store packages globally for later installation
                      (window as any).pendingPackages = data.packagesToInstall;
                    }

                    // Parse all files from the completed code if not already done
                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    const parsedFiles: Array<{ path: string; content: string; type: string; completed: boolean }> = [];
                    let fileMatch;

                    while ((fileMatch = fileRegex.exec(data.generatedCode)) !== null) {
                      const filePath = fileMatch[1];
                      const fileContent = fileMatch[2];
                      const fileExt = filePath.split('.').pop() || '';
                      const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                        fileExt === 'css' ? 'css' :
                          fileExt === 'json' ? 'json' :
                            fileExt === 'html' ? 'html' : 'text';

                      parsedFiles.push({
                        path: filePath,
                        content: fileContent.trim(),
                        type: fileType,
                        completed: true
                      });
                    }

                    setGenerationProgress(prev => ({
                      ...prev,
                      status: `Generated ${parsedFiles.length > 0 ? parsedFiles.length : prev.files.length} file${(parsedFiles.length > 0 ? parsedFiles.length : prev.files.length) !== 1 ? 's' : ''}!`,
                      isGenerating: false,
                      isStreaming: false,
                      isEdit: prev.isEdit,
                      // Keep the files that were already parsed during streaming
                      files: prev.files.length > 0 ? prev.files : parsedFiles
                    }));
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch (e) {
                  // Silently ignore parse errors for incomplete SSE chunks
                }
              }
            }
          }
        }
      }

      if (generatedCode) {
        // Parse files from generated code for metadata
        const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
        const generatedFiles = [];
        let match;
        while ((match = fileRegex.exec(generatedCode)) !== null) {
          generatedFiles.push(match[1]);
        }

        // Show appropriate message based on edit mode
        if (isEdit && generatedFiles.length > 0) {
          // For edits, show which file(s) were edited
          const editedFileNames = generatedFiles.map(f => f.split('/').pop()).join(', ');
          addChatMessage(
            explanation || `Updated ${editedFileNames}`,
            'ai',
            {
              appliedFiles: [generatedFiles[0]] // Only show the first edited file
            }
          );
        } else {
          // For new generation, show all files
          addChatMessage(explanation || 'Code generated!', 'ai', {
            appliedFiles: generatedFiles
          });
        }

        setPromptInput(generatedCode);
        // Don't show the Generated Code panel by default
        // setLeftPanelVisible(true);

        // Wait for sandbox creation if it's still in progress
        let currentSandboxData = sandboxData;

        if (sandboxPromise) {
          try {
            const newSandboxData = await sandboxPromise;
            if (newSandboxData) {
              currentSandboxData = newSandboxData;
            }
          } catch {
            // Sandbox failed — we still have the generated code, just can't preview live
            currentSandboxData = null;
          }
        }

        if (currentSandboxData && generatedCode) {
          // Sandbox is available — apply and preview
          await applyGeneratedCode(generatedCode, isEdit, currentSandboxData.sandboxId);
        } else if (generatedCode) {
          // No sandbox — show code in the panel and inform the user
          addChatMessage(
            '✅ Code generated successfully! To preview it live, click **"Create Sandbox"** in the top bar. Your code is ready in the code panel.',
            'system'
          );
          setActiveTab('generation');
        }
      }

      // Show completion status briefly then switch to preview
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: 'Generation complete!',
        isEdit: prev.isEdit,
        // Clear thinking state on completion
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined
      }));

      setTimeout(() => {
        // Switch to preview but keep files for display
        setActiveTab('preview');
      }, 1000); // Reduced from 3000ms to 1000ms
    } catch (error: any) {
      setChatMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
      if (error.name === 'AbortError') {
        addChatMessage('Generation cancelled.', 'system');
      } else {
        addChatMessage(`Error: ${error.message}`, 'system');
      }
      // Reset generation progress and switch back to preview on error
      setGenerationProgress({
        isGenerating: false,
        status: '',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined,
        files: [],
        currentFile: undefined,
        lastProcessedPosition: 0
      });
      setActiveTab('preview');
    }
  };

  const executeOpenEngineerBuild = async (overridePrompt?: string) => {
    let fullPrompt = overridePrompt || (chatMessages.filter(m => m.type === 'user').slice(-1)[0]?.content || '');
    if (Object.keys(selectedEngineerAnswers).length > 0) {
      const formattedAnswers = Object.entries(selectedEngineerAnswers).map(([k, v]) => `${k}: ${v}`).join('; ');
      fullPrompt += `\n[User Architectural Preferences: ${formattedAnswers}]`;
    }
    if (openEngineerPlan?.summary) {
      fullPrompt += `\n[Approved Engineering Architecture: ${openEngineerPlan.summary}]`;
    }
    // Clear the questions so the card collapses and code generation commences
    setOpenEngineerPlan(prev => prev ? { ...prev, questions: [] } : null);
    await sendChatMessage(fullPrompt);
  };



  const downloadZip = async () => {
    const filesToZip = generationProgress.files.length > 0
      ? generationProgress.files
      : [];

    if (!sandboxData && filesToZip.length === 0) {
      addChatMessage('No generated files or active sandbox to download yet. Create an application first!', 'system');
      return;
    }

    setLoading(true);
    addChatMessage('Packaging your complete Vite project into a ZIP...', 'system');

    try {
      const response = await fetch('/api/create-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToZip,
          fileName: 'crust-app.zip'
        })
      });

      const data = await response.json();

      if (data.success && data.dataUrl) {
        addChatMessage('ZIP package ready! Download starting...', 'system');

        const link = document.createElement('a');
        link.href = data.dataUrl;
        link.download = data.fileName || 'crust-app.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addChatMessage(
          '🎉 Your complete Vite application has been downloaded!\n\nTo run it locally:\n1. Unzip crust-app.zip\n2. Open terminal in the folder\n3. Run: npm install\n4. Run: npm run dev\n5. Open http://localhost:5173',
          'system'
        );
      } else {
        throw new Error(data.error || 'Failed to generate zip');
      }
    } catch (error: any) {
      addChatMessage(`Failed to create ZIP: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle URL form submission to show theme selection page or process manual prompt
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'url') {
      const value = homeUrlInput.trim();
      const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/?.*)?$/;
      if (domainRegex.test(value) && value.length > 5) {
        setShowThemeSelectionPage(true);
      }
    } else {
      // Manual prompt mode - go directly to generation
      if (manualPrompt.trim()) {
        handleManualPromptSubmit();
      }
    }
  };

  // Audio Analyser for live voice volume
  const stopAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioVolume(0);
  };

  const startAudioAnalyser = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.3;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Map average (silence ~0-8, voice ~25-100) to 0.0 - 1.0 smoothly
        const normalized = Math.min(Math.max((avg - 10) / 45, 0), 1);
        setAudioVolume(normalized);
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (err) {
      console.warn('Could not initialize audio visualizer:', err);
    }
  };

  // Handle manual prompt submission - show theme selection page
  const handleManualPromptSubmit = (promptText?: string) => {
    const text = (promptText && promptText.trim()) || manualPrompt.trim() || activePrompt.trim();
    if (!text && attachedFiles.length === 0) return;
    if (text) {
      setActivePrompt(text);
      setManualPrompt(text);
    }
    if (isVoiceRecording) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      stopAudioAnalyser();
      setIsVoiceRecording(false);
    }
    setInputMode('prompt');
    setShowThemeSelectionPage(true);
  };

  // Web Speech API Voice Transcription
  const toggleVoiceRecording = () => {
    if (typeof window === 'undefined') return;

    if (isVoiceRecording) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      stopAudioAnalyser();
      setIsVoiceRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      const initialPrompt = manualPrompt;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        startAudioAnalyser();
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            currentFinal += result[0].transcript + ' ';
          } else {
            currentInterim += result[0].transcript;
          }
        }

        const spokenText = (currentFinal + currentInterim).trim();
        if (spokenText) {
          const prefix = initialPrompt.trim() ? initialPrompt.trim() + ' ' : '';
          setManualPrompt(prefix + spokenText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone permission was denied. Please allow microphone access in your browser settings.');
          stopAudioAnalyser();
          setIsVoiceRecording(false);
        } else if (event.error !== 'no-speech') {
          stopAudioAnalyser();
          setIsVoiceRecording(false);
        }
      };

      recognition.onend = () => {
        stopAudioAnalyser();
        setIsVoiceRecording(false);
        speechRecognitionRef.current = null;
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      stopAudioAnalyser();
      setIsVoiceRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      stopAudioAnalyser();
    };
  }, []);

  // Handle prompt generation after theme selection
  const handlePromptWithTheme = async (promptOverride?: string) => {
    // Resolve prompt from all possible sources so it NEVER fails
    let basePrompt = (promptOverride && promptOverride.trim()) || activePrompt.trim() || manualPrompt.trim();

    if (!basePrompt) {
      if (homeContextInput.trim()) {
        basePrompt = `Build an application with ${homeContextInput.trim()}`;
      } else if (selectedStyle) {
        basePrompt = `Build a modern, responsive web application with a ${selectedStyle} theme`;
      } else {
        basePrompt = 'Build a beautiful, modern web application';
      }
    }

    setHomeScreenFading(true);
    setChatMessages([]);

    // Build prompt with theme context
    let fullPrompt = basePrompt;
    if (attachedFiles.length > 0) {
      fullPrompt += `\n\n[Attached files (${attachedFiles.length}): ${attachedFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ')}]`;
    }
    if (selectedFonts.length > 0) {
      fullPrompt += `\n\nTypography / Selected Fonts (max 3): ${selectedFonts.map((f, i) => `${f} (${i === 0 ? 'Primary / Headings' : i === 1 ? 'Secondary / Body' : 'Accent / Code'})`).join(', ')}. Please import these fonts via Google Fonts and apply them to the design.`;
    }
    if (homeContextInput.trim()) {
      fullPrompt += `\n\nAdditional style/theme requirements: ${homeContextInput}`;
    }

    setLoadingStage('generating');
    setActiveTab('generation');
    // Pre-activate the generation panel immediately so it shows side-by-side with sandbox creation
    setGenerationProgress(prev => ({
      ...prev,
      isGenerating: true,
      status: 'Preparing your request...',
      isThinking: true,
      thinkingText: '',
      streamedCode: '',
      components: [],
      currentComponent: 0,
      files: prev.files // keep existing files visible if any
    }));

    setTimeout(async () => {
      setShowHomeScreen(false);
      setHomeScreenFading(false);
      setShowThemeSelectionPage(false);

      // Send the prompt directly to chat (bypass state timing issues)
      setAiChatInput('');
      sendChatMessage(fullPrompt);
      // Clear states
      setManualPrompt('');
      setActivePrompt('');
      setAttachedFiles([]);
      setHomeContextInput('');
      setSelectedStyle(null);
      setSelectedFonts([]);
    }, 500);
  };

  // Handle going back from theme selection
  const handleBackToUrlInput = () => {
    setShowThemeSelectionPage(false);
    setSelectedStyle(null);
    setSelectedFonts([]);
    setHomeContextInput('');
  };

  const reapplyLastGeneration = async () => {
    if (!conversationContext.lastGeneratedCode) {
      addChatMessage('No previous generation to re-apply', 'system');
      return;
    }

    let currentSandboxData = sandboxData;

    if (!currentSandboxData) {
      addChatMessage('Creating sandbox to preview your code...', 'system');
      try {
        const newSandboxData = await createSandbox(true);
        currentSandboxData = newSandboxData;
      } catch (error: any) {
        addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
        return;
      }
    }

    addChatMessage('Re-applying last generation...', 'system');

    // Switch to preview tab when re-applying code
    setActiveTab('preview');

    const isEdit = conversationContext.appliedCode.length > 0;
    await applyGeneratedCode(conversationContext.lastGeneratedCode, isEdit, currentSandboxData?.sandboxId);
  };

  // Auto-scroll code display to bottom when streaming
  useEffect(() => {
    if (codeDisplayRef.current && generationProgress.isStreaming) {
      codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
    }
  }, [generationProgress.streamedCode, generationProgress.isStreaming]);

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
    // TODO: Add file content fetching logic here
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'jsx' || ext === 'tsx') {
      return <img src="/reactjslogo.png" alt="React" className="w-4 h-4 object-contain flex-shrink-0" />;
    } else if (ext === 'js' || ext === 'ts') {
      return <img src="/jslogo.png" alt="JS" className="w-4 h-4 object-contain flex-shrink-0" />;
    } else if (ext === 'css') {
      return <img src="/csslogo.png" alt="CSS" className="w-4 h-4 object-contain flex-shrink-0" />;
    } else if (ext === 'html') {
      return <img src="/htmllogo.png" alt="HTML" className="w-4 h-4 object-contain flex-shrink-0" />;
    } else if (ext === 'json') {
      return <i className="fas fa-brackets-curly w-4 h-4 text-orange-400 flex items-center justify-center text-xs flex-shrink-0"></i>;
    } else {
      return <i className="fas fa-file w-4 h-4 text-gray-400 flex items-center justify-center text-xs flex-shrink-0"></i>;
    }
  };

  const clearChatHistory = () => {
    setChatMessages([{
      content: 'Chat history cleared. How can I help you?',
      type: 'system',
      timestamp: new Date()
    }]);
  };


  const cloneWebsite = async () => {
    let url = urlInput.trim();
    if (!url) {
      setUrlStatus(prev => [...prev, 'Please enter a URL']);
      return;
    }

    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }

    setUrlStatus([`Using: ${url}`, 'Starting to scrape...']);

    setUrlOverlayVisible(false);

    // Remove protocol for cleaner display
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    addChatMessage(`Starting to clone ${cleanUrl}...`, 'system');

    // Capture screenshot immediately and switch to preview tab
    captureUrlScreenshot(url);

    try {
      addChatMessage('Scraping website content...', 'system');
      const scrapeResponse = await fetch('/api/scrape-url-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!scrapeResponse.ok) {
        throw new Error(`Scraping failed: ${scrapeResponse.status}`);
      }

      const scrapeData = await scrapeResponse.json();

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to scrape website');
      }

      addChatMessage(`Scraped ${scrapeData.content.length} characters from ${url}`, 'system');

      // Clear preparing design state and switch to generation tab
      setIsPreparingDesign(false);
      setActiveTab('generation');

      setConversationContext(prev => ({
        ...prev,
        scrapedWebsites: [...prev.scrapedWebsites, {
          url,
          content: scrapeData,
          timestamp: new Date()
        }],
        currentProject: `Clone of ${url}`
      }));

      // Start sandbox creation in parallel with code generation (silent so it doesn't hide generation panel)
      let sandboxPromise: Promise<any> | null = null;
      if (!sandboxData && hasSandboxKey) {
        sandboxPromise = createSandbox(true, true);
      }

      addChatMessage('Analyzing and generating React recreation...', 'system');

      const recreatePrompt = `I scraped this website and want you to recreate it as a modern React application.

URL: ${url}

SCRAPED CONTENT:
${scrapeData.content}

${homeContextInput ? `ADDITIONAL CONTEXT/REQUIREMENTS FROM USER:
${homeContextInput}

Please incorporate these requirements into the design and implementation.` : ''}

REQUIREMENTS:
1. Create a COMPLETE React application with App.jsx as the main component
2. App.jsx MUST import and render all other components
3. Recreate the main sections and layout from the scraped content
4. ${homeContextInput ? `Apply the user's context/theme: "${homeContextInput}"` : `Use a modern dark theme with excellent contrast:
   - Background: #0a0a0a
   - Text: #ffffff
   - Links: #60a5fa
   - Accent: #3b82f6`}
5. Make it fully responsive
6. Include hover effects and smooth transitions
7. Create separate components for major sections (Header, Hero, Features, etc.)
8. Use semantic HTML5 elements

IMPORTANT CONSTRAINTS:
- DO NOT use React Router or any routing libraries
- Use regular <a> tags with href="#section" for navigation, NOT Link or NavLink components
- This is a single-page application, no routing needed
- ALWAYS create src/App.jsx that imports ALL components
- Each component should be in src/components/
- Use Tailwind CSS for ALL styling (no custom CSS files)
- Make sure the app actually renders visible content
- Create ALL components that you reference in imports

IMAGE HANDLING RULES:
- When the scraped content includes images, USE THE ORIGINAL IMAGE URLS whenever appropriate
- Keep existing images from the scraped site (logos, product images, hero images, icons, etc.)
- Use the actual image URLs provided in the scraped content, not placeholders
- Only use placeholder images or generic services when no real images are available
- For company logos and brand images, ALWAYS use the original URLs to maintain brand identity
- If scraped data contains image URLs, include them in your img tags
- Example: If you see "https://example.com/logo.png" in the scraped content, use that exact URL

Focus on the key sections and content, making it clean and modern while preserving visual assets.`;

      setGenerationProgress(prev => ({
        isGenerating: true,
        status: 'Initializing AI...',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: true,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined,
        // Keep previous files until new ones are generated
        files: prev.files || [],
        currentFile: undefined,
        lastProcessedPosition: 0
      }));

      // Switch to generation tab when starting
      setActiveTab('generation');

      const aiResponse = await fetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: recreatePrompt,
          model: aiModel,
          context: {
            sandboxId: sandboxData?.id,
            structure: structureContent,
            conversationContext: conversationContext
          }
        })
      });

      if (!aiResponse.ok) {
        throw new Error(`AI generation failed: ${aiResponse.status}`);
      }

      const reader = aiResponse.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let explanation = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  // Add conversational text to chat only if it's not code
                  let text = data.text || '';

                  // Remove package tags from the text
                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');

                  // Filter out any XML tags and file content that slipped through
                  if (!text.includes('<file') && !text.includes('import React') &&
                    !text.includes('export default') && !text.includes('className=') &&
                    text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => ({
                    ...prev,
                    streamedCode: prev.streamedCode + data.text,
                    lastProcessedPosition: prev.lastProcessedPosition || 0
                  }));
                } else if (data.type === 'component') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${data.name}`,
                    components: [...prev.components, {
                      name: data.name,
                      path: data.path,
                      completed: true
                    }],
                    currentComponent: prev.currentComponent + 1
                  }));
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;

                  // Save the last generated code
                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode
                  }));
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      }

      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: 'Generation complete!',
        isEdit: prev.isEdit
      }));

      if (generatedCode) {
        addChatMessage('AI recreation generated!', 'system');

        // Add the explanation to chat if available
        if (explanation && explanation.trim()) {
          addChatMessage(explanation, 'ai');
        }

        setPromptInput(generatedCode);
        // Don't show the Generated Code panel by default
        // setLeftPanelVisible(true);

        // Wait for sandbox creation if it's still in progress
        let currentSandboxData = sandboxData;
        if (sandboxPromise) {
          addChatMessage('Waiting for sandbox to be ready...', 'system');
          try {
            const newSandboxData = await sandboxPromise;
            if (newSandboxData) {
              currentSandboxData = newSandboxData;
            }
            // Remove the waiting message
            setChatMessages(prev => prev.filter(msg => msg.content !== 'Waiting for sandbox to be ready...'));
          } catch (error: any) {
            addChatMessage('Sandbox creation failed. Cannot apply code.', 'system');
            throw error;
          }
        }

        // First application for cloned site should not be in edit mode
        if (currentSandboxData && generatedCode) {
          await applyGeneratedCode(generatedCode, false, currentSandboxData.sandboxId);
        }

        addChatMessage(
          `Successfully recreated ${url} as a modern React app${homeContextInput ? ` with your requested context: "${homeContextInput}"` : ''}! The scraped content is now in my context, so you can ask me to modify specific sections or add features based on the original site.`,
          'ai',
          {
            scrapedUrl: url,
            scrapedContent: scrapeData,
            generatedCode: generatedCode
          }
        );

        setUrlInput('');
        setUrlStatus([]);
        setHomeContextInput('');

        // Clear generation progress and all screenshot/design states
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));

        // Clear screenshot and preparing design states to prevent them from showing on next run
        setUrlScreenshot(null);
        setIsPreparingDesign(false);
        setTargetUrl('');
        setScreenshotError(null);
        setLoadingStage(null); // Clear loading stage

        setTimeout(() => {
          // Switch back to preview tab but keep files
          setActiveTab('preview');
        }, 1000); // Show completion briefly then switch
      } else {
        throw new Error('Failed to generate recreation');
      }

    } catch (error: any) {
      addChatMessage(`Failed to clone website: ${error.message}`, 'system');
      setUrlStatus([]);
      setIsPreparingDesign(false);
      // Clear all states on error
      setUrlScreenshot(null);
      setTargetUrl('');
      setScreenshotError(null);
      setLoadingStage(null);
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: '',
        // Keep files to display in sidebar
        files: prev.files
      }));
      setActiveTab('preview');
    }
  };

  const captureUrlScreenshot = async (url: string) => {
    setIsCapturingScreenshot(true);
    setScreenshotError(null);
    try {
      const response = await fetch('/api/scrape-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (data.success && data.screenshot) {
        setUrlScreenshot(data.screenshot);
        // Set preparing design state
        setIsPreparingDesign(true);
        // Store the clean URL for display
        const cleanUrl = url.replace(/^https?:\/\//i, '');
        setTargetUrl(cleanUrl);
        // Switch to preview tab to show the screenshot
        if (activeTab !== 'preview') {
          setActiveTab('preview');
        }
      } else {
        setScreenshotError(data.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setScreenshotError('Network error while capturing screenshot');
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleHomeScreenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeUrlInput.trim()) return;

    setHomeScreenFading(true);

    // Clear messages and immediately show the cloning message
    setChatMessages([]);
    let displayUrl = homeUrlInput.trim();
    if (!displayUrl.match(/^https?:\/\//i)) {
      displayUrl = 'https://' + displayUrl;
    }
    // Remove protocol for cleaner display
    const cleanUrl = displayUrl.replace(/^https?:\/\//i, '');
    addChatMessage(`Starting to clone ${cleanUrl}...`, 'system');

    // Start creating sandbox and capturing screenshot immediately in parallel
    const sandboxPromise = !sandboxData ? createSandbox(true) : Promise.resolve(sandboxData);

    // Only capture screenshot if we don't already have a sandbox (first generation)
    // After sandbox is set up, skip the screenshot phase for faster generation
    if (!sandboxData) {
      captureUrlScreenshot(displayUrl);
    }

    // Set loading stage immediately before hiding home screen
    setLoadingStage('gathering');
    // Also ensure we're on preview tab to show the loading overlay
    setActiveTab('preview');

    setTimeout(async () => {
      setShowHomeScreen(false);
      setHomeScreenFading(false);

      let currentSandboxData = sandboxData;

      // Wait for sandbox to be ready (if it's still creating)
      try {
        const newSandboxData = await sandboxPromise;
        if (newSandboxData) {
          currentSandboxData = newSandboxData;
        }
      } catch (error: any) {
        addChatMessage('Sandbox creation failed. Cannot generate app.', 'system');
        setLoadingStage(null);
        return;
      }

      // Now start the clone process which will stream the generation
      setUrlInput(homeUrlInput);
      setUrlOverlayVisible(false); // Make sure overlay is closed
      setUrlStatus(['Scraping website content...']);

      try {
        // Scrape the website
        let url = homeUrlInput.trim();
        if (!url.match(/^https?:\/\//i)) {
          url = 'https://' + url;
        }

        // Screenshot is already being captured in parallel above

        const scrapeResponse = await fetch('/api/scrape-url-enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        if (!scrapeResponse.ok) {
          throw new Error('Failed to scrape website');
        }

        const scrapeData = await scrapeResponse.json();

        if (!scrapeData.success) {
          throw new Error(scrapeData.error || 'Failed to scrape website');
        }

        setUrlStatus(['Website scraped successfully!', 'Generating React app...']);

        // Clear preparing design state and switch to generation tab
        setIsPreparingDesign(false);
        setUrlScreenshot(null); // Clear screenshot when starting generation
        setTargetUrl(''); // Clear target URL

        // Update loading stage to planning
        setLoadingStage('planning');

        // Brief pause before switching to generation tab
        setTimeout(() => {
          setLoadingStage('generating');
          setActiveTab('generation');
        }, 1500);

        // Store scraped data in conversation context
        setConversationContext(prev => ({
          ...prev,
          scrapedWebsites: [...prev.scrapedWebsites, {
            url: url,
            content: scrapeData,
            timestamp: new Date()
          }],
          currentProject: `${url} Clone`
        }));

        const prompt = `I want to recreate the ${url} website as a complete React application based on the scraped content below.

${JSON.stringify(scrapeData, null, 2)}

${selectedFonts.length > 0 ? `TYPOGRAPHY / SELECTED FONTS:
${selectedFonts.map((f, i) => `${f} (${i === 0 ? 'Primary / Headings' : i === 1 ? 'Secondary / Body' : 'Accent / Code'})`).join(', ')}. Use these fonts for styling and typography.\n` : ''}
${homeContextInput ? `ADDITIONAL CONTEXT/REQUIREMENTS FROM USER:
${homeContextInput}

Please incorporate these requirements into the design and implementation.` : ''}

IMPORTANT INSTRUCTIONS:
- Create a COMPLETE, working React application
- Implement ALL sections and features from the original site
- Use Tailwind CSS for all styling (no custom CSS files)
- Make it responsive and modern
- Ensure all text content matches the original
- Create proper component structure
- Make sure the app actually renders visible content
- Create ALL components that you reference in imports
${homeContextInput ? '- Apply the user\'s context/theme requirements throughout the application' : ''}
${selectedFonts.length > 0 ? `- Apply the chosen typography (${selectedFonts.join(', ')}) with Google Fonts imports` : ''}

Focus on the key sections and content, making it clean and modern.`;

        setGenerationProgress(prev => ({
          isGenerating: true,
          status: 'Initializing AI...',
          components: [],
          currentComponent: 0,
          streamedCode: '',
          isStreaming: true,
          isThinking: false,
          thinkingText: undefined,
          thinkingDuration: undefined,
          // Keep previous files until new ones are generated
          files: prev.files || [],
          currentFile: undefined,
          lastProcessedPosition: 0
        }));

        const aiResponse = await fetch('/api/generate-ai-code-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: aiModel,
            context: {
              sandboxId: currentSandboxData?.sandboxId,
              structure: structureContent,
              conversationContext: conversationContext
            }
          })
        });

        if (!aiResponse.ok || !aiResponse.body) {
          throw new Error('Failed to generate code');
        }

        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let generatedCode = '';
        let explanation = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  // Add conversational text to chat only if it's not code
                  let text = data.text || '';

                  // Remove package tags from the text
                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');

                  // Filter out any XML tags and file content that slipped through
                  if (!text.includes('<file') && !text.includes('import React') &&
                    !text.includes('export default') && !text.includes('className=') &&
                    text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => {
                    const newStreamedCode = prev.streamedCode + data.text;

                    // Tab is already switched after scraping

                    const updatedState = {
                      ...prev,
                      streamedCode: newStreamedCode,
                      isStreaming: true,
                      isThinking: false,
                      status: 'Generating code...'
                    };

                    // Process complete files from the accumulated stream
                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    let match;
                    const processedFiles = new Set(prev.files.map(f => f.path));

                    while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                      const filePath = match[1];
                      const fileContent = match[2];

                      // Only add if we haven't processed this file yet
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                          fileExt === 'css' ? 'css' :
                            fileExt === 'json' ? 'json' :
                              fileExt === 'html' ? 'html' : 'text';

                        // Check if file already exists
                        const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);

                        if (existingFileIndex >= 0) {
                          // Update existing file and mark as edited
                          updatedState.files = [
                            ...updatedState.files.slice(0, existingFileIndex),
                            {
                              ...updatedState.files[existingFileIndex],
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: true
                            },
                            ...updatedState.files.slice(existingFileIndex + 1)
                          ];
                        } else {
                          // Add new file
                          updatedState.files = [...updatedState.files, {
                            path: filePath,
                            content: fileContent.trim(),
                            type: fileType,
                            completed: true,
                            edited: false
                          }];
                        }

                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Completed ${filePath}`;
                        }
                        processedFiles.add(filePath);
                      }
                    }

                    // Check for current file being generated (incomplete file at the end)
                    const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                    if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                      const filePath = lastFileMatch[1];
                      const partialContent = lastFileMatch[2];

                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                          fileExt === 'css' ? 'css' :
                            fileExt === 'json' ? 'json' :
                              fileExt === 'html' ? 'html' : 'text';

                        updatedState.currentFile = {
                          path: filePath,
                          content: partialContent,
                          type: fileType
                        };
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Generating ${filePath}`;
                        }
                      }
                    } else {
                      updatedState.currentFile = undefined;
                    }

                    return updatedState;
                  });
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;

                  // Save the last generated code
                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode
                  }));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }

        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));

        if (generatedCode) {
          addChatMessage('AI recreation generated!', 'system');

          // Add the explanation to chat if available
          if (explanation && explanation.trim()) {
            addChatMessage(explanation, 'ai');
          }

          setPromptInput(generatedCode);

          // First application for cloned site should not be in edit mode
          if (currentSandboxData && generatedCode) {
            await applyGeneratedCode(generatedCode, false, currentSandboxData.sandboxId);
          }

          addChatMessage(
            `Successfully recreated ${url} as a modern React app${homeContextInput ? ` with your requested context: "${homeContextInput}"` : ''}! The scraped content is now in my context, so you can ask me to modify specific sections or add features based on the original site.`,
            'ai',
            {
              scrapedUrl: url,
              scrapedContent: scrapeData,
              generatedCode: generatedCode
            }
          );

          setConversationContext(prev => ({
            ...prev,
            generatedComponents: [],
            appliedCode: [...prev.appliedCode, {
              files: [],
              timestamp: new Date()
            }]
          }));
        } else {
          throw new Error('Failed to generate recreation');
        }

        setUrlInput('');
        setUrlStatus([]);
        setHomeContextInput('');

        // Clear generation progress and all screenshot/design states
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));

        // Clear screenshot and preparing design states to prevent them from showing on next run
        setUrlScreenshot(null);
        setIsPreparingDesign(false);
        setTargetUrl('');
        setScreenshotError(null);
        setLoadingStage(null); // Clear loading stage

        setTimeout(() => {
          // Switch back to preview tab but keep files
          setActiveTab('preview');
        }, 1000); // Show completion briefly then switch
      } catch (error: any) {
        addChatMessage(`Failed to clone website: ${error.message}`, 'system');
        setUrlStatus([]);
        setIsPreparingDesign(false);
        // Also clear generation progress on error
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: '',
          // Keep files to display in sidebar
          files: prev.files
        }));
      }
    }, 500);
  };

  return (
    <div className="font-sans h-screen flex flex-col bg-gray-950" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Home Screen Overlay */}
      {showHomeScreen && !showThemeSelectionPage && (
        <div className={`fixed inset-0 z-50 bg-[#0c0d12] overflow-y-auto transition-opacity duration-500 ${homeScreenFading ? 'opacity-0' : 'opacity-100'}`}>
          {/* Smooth Non-Pixelated Ambient White Lighting from Bottom */}
          <div 
            className="fixed inset-x-0 bottom-0 h-[480px] pointer-events-none z-0"
            style={{
              background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.05) 20%, rgba(255, 255, 255, 0.025) 45%, rgba(255, 255, 255, 0.008) 70%, transparent 100%)',
            }}
          />
          {/* Top Right: Built by Dharm Patel */}
          <a
            href="https://github.com/DDharm007"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed top-6 right-6 z-50 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] transition-all group backdrop-blur-md shadow-sm cursor-pointer"
            style={{ fontFamily: "'Poppins', sans-serif" }}
            title="Built by Dharm Patel (GitHub)"
          >
            <svg className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-[11px] text-white/50 group-hover:text-white/70">Built by</span>
            <span className="text-xs font-semibold text-white/90 group-hover:text-white transition-colors">DHARM PATEL</span>
          </a>

          {/* Main Content Layout */}
          <div className="relative z-10 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col justify-center min-h-screen">
            {/* "What are we working on today?", Suggested Pills, and Input Box */}
            <div className="w-full my-auto py-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ fontFamily: "'Poppins', sans-serif" }}
                className="text-2xl sm:text-3xl md:text-[32px] font-semibold text-white tracking-tight mb-4"
              >
                What are we working on today?
              </motion.h2>

              {/* Suggested for you */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{ fontFamily: "'Poppins', sans-serif" }}
                className="mb-5"
              >
                <div className="flex items-center gap-1.5 text-xs text-white/40 font-normal mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <span>Suggested for you</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestionSetIndex((prev) => (prev + 1) % promptSuggestionSets.length);
                    }}
                    className="text-white/40 hover:text-white transition-colors p-0.5"
                    title="Show next suggestions"
                  >
                    <svg className="w-3.5 h-3.5 transition-transform active:rotate-180 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-col items-start gap-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {promptSuggestionSets[suggestionSetIndex].map((item, idx) => {
                    const IconComponent = item.Icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setManualPrompt(item.text)}
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#1b1d24]/90 border border-white/[0.08] hover:border-white/30 hover:bg-white/[0.06] text-[13px] text-white/85 hover:text-white transition-all duration-200 group shadow-sm text-left"
                      >
                        <span className={`${item.color} group-hover:scale-110 transition-transform flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                        <span>{item.text}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Chat / Task Input Box - Modern PromptBar */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{ fontFamily: "'Poppins', sans-serif" }}
                className="w-full"
              >
                {/* Above Prompt Bar: Add APIs button */}
                <div className="flex items-center justify-end px-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeysModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs text-white/70 hover:text-white transition-all cursor-pointer group active:scale-95 shadow-sm"
                    title="Add or configure AI provider API keys & Sandboxes"
                  >
                    <Plus className="w-3 h-3 text-white/50 group-hover:text-white transition-colors" />
                    <span className="font-medium text-[11px] tracking-wide">Add APIs</span>
                  </button>
                </div>

                <PromptBar
                  placeholder={isVoiceRecording ? "Listening to your voice..." : "Start chatting or describe a task..."}
                  value={manualPrompt}
                  onChange={(val) => {
                    setManualPrompt(val);
                    if (val.trim()) setActivePrompt(val);
                  }}
                  sources={[
                    { key: 'files', name: 'Photos & files', description: 'Upload from this device', icon: Attachment01Icon, attach: true },
                    { key: 'web', name: 'Web search', description: 'Live results', icon: Globe02Icon },
                    { key: 'docs', name: 'Documents', description: 'Specs, notes, briefs', icon: File02Icon },
                  ]}
                  commands={[
                    { key: 'summarize', name: '/summarize', description: 'Digest the thread so far' },
                    { key: 'compare', name: '/compare', description: 'Two options side by side' },
                    { key: 'draft', name: '/draft', description: 'Write a first version' },
                    { key: 'explain', name: '/explain', description: 'A plain-language walkthrough' },
                    { key: 'tasks', name: '/tasks', description: 'Turn this into a to-do list' },
                  ]}
                  models={sortedAvailableModels.map((key) => {
                    const isUnlocked = unlockedModels.includes(key);
                    return {
                      key,
                      name: modelDisplayNames[key] || key,
                      tag: modelTags[key] || (
                        key.includes('r1') || key.includes('reasoner') || key.includes('o1') || key.includes('o3')
                          ? 'Reasoning'
                          : key.includes('thinking') || key.includes('3.7') || key.includes('pro')
                          ? 'Deep'
                          : key.includes('flash') || key.includes('haiku') || key.includes('mini') || key.includes('8b')
                          ? 'Fast'
                          : 'Flagship'
                      ),
                      disabled: !isUnlocked,
                    };
                  })}
                  currentModel={aiModel}
                  onModelChange={(modelKey) => {
                    setAiModel(modelKey);
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('model', modelKey);
                    window.history.replaceState({}, '', newUrl);
                  }}
                  onLockedModelClick={(modelKey) => {
                    triggerLockedModelToast(modelKey);
                  }}
                  efforts={['Low', 'Medium', 'High', 'Extra', 'Max']}
                  defaultEffort="High"
                  busy={false}
                  onSend={(text) => {
                    const promptToUse = (typeof text === 'string' && text.trim()) ? text.trim() : manualPrompt.trim() || activePrompt.trim();
                    if (promptToUse || attachedFiles.length > 0) {
                      setActivePrompt(promptToUse);
                      setManualPrompt(promptToUse);
                      setInputMode('prompt');
                      handleManualPromptSubmit(promptToUse);
                    }
                  }}
                  onAttach={() => fileInputRef.current?.click()}
                  attachedFiles={attachedFiles}
                  onRemoveFile={(idx) => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  onDictate={toggleVoiceRecording}
                  isListening={isVoiceRecording}
                  audioVolume={audioVolume}
                  background="#14151b"
                  color="#ffffff"
                  menuBackground="#181a24"
                  sparkColor="#ffffff"
                  sparkBoost={1}
                  width="100%"
                  radius={16}
                  maxRows={5}
                  morphDuration={240}
                  squash={0.12}
                  tilt={8}
                  pressScale={0.96}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setAttachedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                    }
                  }}
                  isDragging={isDragging}
                  onPaste={(e) => {
                    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
                      const pasted = Array.from(e.clipboardData.files);
                      setAttachedFiles((prev) => [...prev, ...pasted]);
                    }
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  id="main-file-upload"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const files = Array.from(e.target.files);
                      setAttachedFiles((prev) => [...prev, ...files]);
                      e.target.value = '';
                    }
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Selection Page */}
      {showHomeScreen && showThemeSelectionPage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0d0f15]">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBackToUrlInput}
            style={{ fontFamily: "'Poppins', sans-serif" }}
            className="fixed top-5 left-5 z-40 w-9 h-9 rounded-xl bg-[#14161f] hover:bg-[#1a1d29] border border-[#232636] hover:border-[#383d52] text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Top Right: Built by Dharm Patel */}
          <a
            href="https://github.com/DDharm007"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed top-5 right-6 z-40 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14161f] hover:bg-[#1a1d29] border border-[#232636] hover:border-[#383d52] transition-all group shadow-sm cursor-pointer"
            style={{ fontFamily: "'Poppins', sans-serif" }}
            title="Built by Dharm Patel (GitHub)"
          >
            <svg className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-[11px] text-white/50 group-hover:text-white/70">Built by</span>
            <span className="text-xs font-semibold text-white/90 group-hover:text-white transition-colors">DHARM PATEL</span>
          </a>

          {/* Theme Selection Content */}
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-4 sm:py-6">
            <div className="max-w-5xl w-full my-auto flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ fontFamily: "'Poppins', sans-serif" }}
                className="text-center mb-3 sm:mb-4 flex-shrink-0"
              >
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Choose Your Style</h1>
                <p className="text-xs text-white/50 mt-0.5">
                  {inputMode === 'prompt' ? 'How do you want your app to look?' : 'How do you want your cloned website to look?'}
                </p>
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                style={{ fontFamily: "'Poppins', sans-serif" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputMode === 'prompt' || !homeUrlInput.trim()) {
                    handlePromptWithTheme();
                  } else {
                    handleHomeScreenSubmit(e);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputMode === 'prompt' || !homeUrlInput.trim()) {
                      handlePromptWithTheme();
                    } else {
                      handleHomeScreenSubmit(e);
                    }
                  }
                }}
                className="w-full flex flex-col"
              >
                {/* Side-by-Side Grid: Theme (Left) and Fonts (Right) with identical height */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  {/* LEFT: Select Theme */}
                  <div className="bg-[#14161f] border border-[#232636] p-4 rounded-2xl flex flex-col h-[360px] sm:h-[375px]">
                    <div className="flex items-center justify-between mb-2.5 px-0.5 flex-shrink-0">
                      <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Select Theme</span>
                      <span className="text-[11px] text-white/40">
                        {selectedStyle ? `${selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} selected` : 'None selected (Default)'}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'modern', name: 'Modern', description: 'Clean & minimal', colors: ['#0f172a', '#1e293b', '#3b82f6', '#38bdf8', '#f8fafc'] },
                          { id: 'neobrutalist', name: 'Neobrutalist', description: 'Bold & vibrant', colors: ['#ffe600', '#ff5c00', '#000000', '#ffffff', '#121212'] },
                          { id: 'glassmorphism', name: 'Glass', description: 'Frosted glass', colors: ['#1e1b4b', '#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff'] },
                          { id: 'minimalist', name: 'Minimalist', description: 'Clean & simple', colors: ['#09090b', '#27272a', '#71717a', '#a1a1aa', '#fafafa'] },
                          { id: 'dark', name: 'Dark Mode', description: 'Dark theme', colors: ['#09090b', '#18181b', '#27272a', '#3f3f46', '#ffffff'] },
                          { id: 'retro', name: 'Retro', description: '80s/90s vibe', colors: ['#2e0854', '#ec4899', '#8b5cf6', '#06b6d4', '#fde047'] },
                          { id: 'gradient', name: 'Gradient', description: 'Colorful', colors: ['#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#f43f5e'] },
                          { id: 'monochrome', name: 'Mono', description: 'Black & white', colors: ['#000000', '#262626', '#525252', '#a3a3a3', '#ffffff'] },
                          { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon & futuristic', colors: ['#0d0221', '#00f0ff', '#ff003c', '#ffe600', '#7122fa'] },
                          { id: 'neon', name: 'Neon', description: 'Glowing colors', colors: ['#05130e', '#00ff66', '#10b981', '#065f46', '#e6fffa'] },
                          { id: 'pastel', name: 'Pastel', description: 'Soft & dreamy', colors: ['#fce7f3', '#ede9fe', '#e0e7ff', '#fef3c7', '#374151'] },
                          { id: 'corporate', name: 'Corporate', description: 'Professional', colors: ['#0f172a', '#1e3a8a', '#2563eb', '#60a5fa', '#f8fafc'] },
                          { id: 'nature', name: 'Nature', description: 'Earthy & organic', colors: ['#064e3b', '#047857', '#10b981', '#84cc16', '#d97706'] },
                          { id: 'sunset', name: 'Sunset', description: 'Warm golden tones', colors: ['#450a0a', '#dc2626', '#ea580c', '#f59e0b', '#fef08a'] },
                          { id: 'ocean', name: 'Ocean', description: 'Deep sea vibes', colors: ['#082f49', '#0284c7', '#0ea5e9', '#38bdf8', '#bae6fd'] },
                          { id: 'luxury', name: 'Luxury', description: 'Gold & elegant', colors: ['#1c1917', '#78350f', '#b45309', '#f59e0b', '#fefce8'] },
                          { id: 'synthwave', name: 'Synthwave', description: 'Retro-futuristic', colors: ['#1a0b2e', '#ff2a6d', '#05d9e8', '#01012b', '#d1f7ff'] },
                          { id: 'aurora', name: 'Aurora', description: 'Northern lights', colors: ['#062c30', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6'] },
                          { id: 'candy', name: 'Candy', description: 'Sweet & playful', colors: ['#831843', '#db2777', '#f472b6', '#fb7185', '#fff1f2'] },
                          { id: 'newspaper', name: 'Editorial', description: 'Classic print', colors: ['#1c1917', '#292524', '#57534e', '#a8a29e', '#f5f5f4'] },
                        ].map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => {
                              if (selectedStyle === style.id) {
                                setSelectedStyle(null);
                                const currentAdditional = homeContextInput.replace(/^[^,]+theme\s*,?\s*/, '').trim();
                                setHomeContextInput(currentAdditional);
                              } else {
                                setSelectedStyle(style.id);
                                const currentAdditional = homeContextInput.replace(/^[^,]+theme\s*,?\s*/, '').trim();
                                setHomeContextInput(style.id.toLowerCase() + ' theme' + (currentAdditional ? ', ' + currentAdditional : ''));
                              }
                            }}
                            className={`
                              relative p-2.5 rounded-xl transition-all duration-150 text-left flex flex-col justify-between group cursor-pointer
                              ${selectedStyle === style.id
                                ? 'bg-white/10 border-2 border-white'
                                : 'bg-[#181a26] border border-[#262838] hover:bg-[#1e2132] hover:border-[#383d52]'
                              }
                            `}
                          >
                            {selectedStyle === style.id && (
                              <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center text-black shadow-sm">
                                <Check className="w-2 h-2 stroke-[3] text-black stroke-black" />
                              </div>
                            )}

                            {/* 5 Circular Colors in Theme */}
                            <div className="flex items-center gap-1 mb-2">
                              {style.colors.map((color, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="w-3 h-3 rounded-full border border-white/10 flex-shrink-0"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs text-white/90 group-hover:text-white truncate">{style.name}</h4>
                              <p className="text-[10px] text-white/40 truncate mt-0.5">{style.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Select Fonts */}
                  <div className="bg-[#14161f] border border-[#232636] p-4 rounded-2xl flex flex-col h-[360px] sm:h-[375px]">
                    <div className="flex items-center justify-between mb-2.5 px-0.5 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Select Fonts</span>
                        <span className="text-[10px] text-white/40 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.2 rounded-full">
                          Max 3
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedFonts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedFonts([])}
                            className="text-[11px] text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                        <span className={`text-[11px] font-medium ${selectedFonts.length === 3 ? 'text-white font-semibold' : 'text-white/40'}`}>
                          {selectedFonts.length}/3 selected
                        </span>
                      </div>
                    </div>

                    {/* Active selected font pills */}
                    {selectedFonts.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-2 px-0.5 flex-shrink-0">
                        {selectedFonts.map((fontName, idx) => (
                          <span
                            key={fontName}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-white text-[11px]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            <span className="font-medium">{fontName}</span>
                            <span className="text-white/40 text-[9.5px]">({idx === 0 ? 'Headings' : idx === 1 ? 'Body' : 'Accent'})</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFonts(selectedFonts.filter(f => f !== fontName));
                              }}
                              className="text-white/40 hover:text-white ml-0.5 cursor-pointer"
                              title="Remove font"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Font Visuals Grid */}
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CURATED_FONTS.map((font) => {
                          const isSelected = selectedFonts.includes(font.name);
                          const selectionIndex = selectedFonts.indexOf(font.name);
                          const roleLabel = selectionIndex === 0 ? 'Headings' : selectionIndex === 1 ? 'Body' : selectionIndex === 2 ? 'Accent' : '';
                          const isMaxReached = selectedFonts.length >= 3 && !isSelected;

                          return (
                            <button
                              key={font.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFonts(selectedFonts.filter(f => f !== font.name));
                                } else {
                                  if (selectedFonts.length < 3) {
                                    setSelectedFonts([...selectedFonts, font.name]);
                                  } else {
                                    setSelectedFonts([selectedFonts[0], selectedFonts[1], font.name]);
                                  }
                                }
                              }}
                              className={`
                                relative p-2.5 rounded-xl transition-all duration-150 text-left flex flex-col justify-between group cursor-pointer
                                ${isSelected
                                  ? 'bg-white/10 border-2 border-white'
                                  : isMaxReached
                                    ? 'bg-[#141620] border border-[#212330] opacity-50 hover:opacity-80'
                                    : 'bg-[#181a26] border border-[#262838] hover:bg-[#1e2132] hover:border-[#383d52]'
                                }
                              `}
                            >
                              {/* Selected order badge */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-white text-black rounded-full px-1.5 py-0.5 text-[8.5px] font-bold shadow-sm">
                                  <span className="text-black font-extrabold">#{selectionIndex + 1}</span>
                                  <span className="text-[8px] text-black/70 font-semibold">{roleLabel}</span>
                                </div>
                              )}

                              {/* Large Font Visual Specimen */}
                              <div className="mb-1.5">
                                <div
                                  className="text-xl font-bold tracking-tight text-white/90 group-hover:text-white leading-none mb-1"
                                  style={{ fontFamily: font.family }}
                                >
                                  Aa
                                </div>
                                <div
                                  className="text-[10px] text-white/60 group-hover:text-white/80 truncate leading-snug"
                                  style={{ fontFamily: font.family }}
                                >
                                  {font.sampleText}
                                </div>
                              </div>

                              {/* Font Metadata */}
                              <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] mt-auto">
                                <span className="font-semibold text-xs text-white/90 group-hover:text-white truncate">
                                  {font.name}
                                </span>
                                <span className="text-[9px] text-white/40 uppercase tracking-wider flex-shrink-0 ml-1">
                                  {font.category}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Horizontal Layout with Notes & Start Button Visible without Scrolling */}
                <div className="mt-3 bg-[#14161f] border border-[#232636] p-2.5 sm:p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-2.5 flex-shrink-0">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={(() => {
                        if (!selectedStyle) return homeContextInput;
                        const additional = homeContextInput.replace(new RegExp('^' + selectedStyle.toLowerCase() + ' theme\\s*,?\\s*', 'i'), '');
                        return additional;
                      })()}
                      onChange={(e) => {
                        const additionalContext = e.target.value;
                        if (selectedStyle) {
                          setHomeContextInput(selectedStyle.toLowerCase() + ' theme' + (additionalContext.trim() ? ', ' + additionalContext : ''));
                        } else {
                          setHomeContextInput(additionalContext);
                        }
                      }}
                      placeholder="Optional notes for AI (e.g., custom colors, animations, layout tweaks...)"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0b0c12] border border-[#232636] focus:border-white text-white placeholder-white/30 focus:outline-none transition-all text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (inputMode === 'prompt' || !homeUrlInput.trim()) {
                        e.preventDefault();
                        handlePromptWithTheme();
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-2 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 shadow-sm"
                  >
                    <span className="text-black font-semibold">{inputMode === 'prompt' || !homeUrlInput.trim() ? 'Start Building' : 'Start Cloning'}</span>
                    <span className="text-black font-bold">→</span>
                  </button>
                </div>
              </motion.form>
            </div>
          </div>
        </div>
      )
      }

      {/* Refine Prompt Page */}
      {showRefinePromptPage && (
        <div className="fixed inset-0 z-[60] transition-opacity duration-500">
          {/* Replit Dark Matte Background with subtle radial ambient glow */}
          <div className="absolute inset-0 bg-[#0c0d14]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.03),rgba(12,13,20,0))]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />
          </div>

          {/* Back button */}
          <button
            onClick={() => {
              setShowRefinePromptPage(false);
              setRefinedPrompt('');
              setIsRefining(false);
            }}
            style={{ fontFamily: "'Poppins', sans-serif" }}
            className="absolute top-5 left-5 z-30 w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.18] text-white/70 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="relative z-10 h-screen flex items-center justify-center px-4 sm:px-6 py-6">
            <div className="max-w-2xl w-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {isRefining ? (
                /* Loading / Refining Animation */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center gap-6"
                >
                  {/* Animated sparkle icon */}
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg shadow-white/5"
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>

                  <div className="text-center">
                    <motion.h2
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-xl font-semibold text-white mb-1.5"
                    >
                      Refining your prompt with AI...
                    </motion.h2>
                    <p className="text-xs text-white/50">AI is crafting the optimal structured requirements for your app</p>
                  </div>

                  {/* Shimmer bars */}
                  <div className="w-full max-w-md space-y-2.5 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.1, 0.35, 0.1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="h-2.5 rounded-full bg-white/10"
                        style={{ width: `${100 - i * 15}%` }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                /* Result Display */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col gap-4"
                >
                  {/* Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                      <span className="text-[11px] text-emerald-400 font-medium">Prompt Refined</span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Your Refined Prompt</h2>
                    <p className="text-xs text-white/50 mt-0.5">AI-enhanced and ready to build</p>
                  </div>

                  {/* Refined prompt card */}
                  <div className="bg-[#13151f] border border-white/[0.08] rounded-2xl p-5 max-h-[50vh] overflow-y-auto shadow-2xl custom-scrollbar">
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                      {refinedPrompt}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between w-full mt-2">
                    <button
                      onClick={() => {
                        setShowRefinePromptPage(false);
                        setRefinedPrompt('');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={async () => {
                          const basePrompt = manualPrompt.trim();
                          const theme = selectedStyle || '';
                          const extraMods = (() => {
                            if (!selectedStyle) return homeContextInput;
                            return homeContextInput.replace(new RegExp('^' + selectedStyle.toLowerCase() + ' theme\\s*,?\\s*', 'i'), '');
                          })();

                          setIsRefining(true);
                          setRefinedPrompt('');

                          try {
                            const res = await fetch('/api/refine-prompt', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                prompt: basePrompt,
                                theme: theme,
                                modifications: extraMods.trim(),
                              }),
                            });
                            const data = await res.json();
                            if (data.refinedPrompt) {
                              setRefinedPrompt(data.refinedPrompt);
                            } else {
                              console.error('Refine API error:', data);
                              setRefinedPrompt(`Failed to refine prompt: ${data.error || 'Unknown error'}. Please try again.`);
                            }
                          } catch (err) {
                            console.error('Refine error:', err);
                            setRefinedPrompt('An error occurred while refining your prompt. Please try again.');
                          } finally {
                            setIsRefining(false);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white/70" />
                        <span>Re-refine</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const promptToUse = refinedPrompt;
                          setManualPrompt(promptToUse);
                          setShowRefinePromptPage(false);
                          setShowThemeSelectionPage(false);
                          setRefinedPrompt('');
                          setSelectedStyle(null);
                          setHomeContextInput('');
                          setTimeout(() => {
                            handlePromptWithTheme(promptToUse);
                          }, 100);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <span className="text-black font-semibold">Start Building</span>
                        <span className="text-black font-bold">→</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Interface - Only show when home screen is hidden */}
      {
        !showHomeScreen && (
          <>
            <div className="relative">
              <div className="relative px-4 py-2.5 bg-[#0e1017] border-b border-white/[0.08] flex justify-between items-center">
                {/* Left - Crust Branding with small thinking animation in place of logo */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <LatticeLoader
                      status={generationProgress.isThinking || generationProgress.isGenerating ? "working" : "done"}
                      pattern="ripple"
                      grid={3}
                      shape="round"
                      cellSize={2.2}
                      gap={1}
                      color="#f5f5f5"
                      glow={false}
                      showTimer={false}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-semibold tracking-wide">crust</span>
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-white/40 text-xs font-mono">open engineer</span>
                  </div>
                </div>

                {/* Right - Actions + Status */}
                <div className="flex items-center gap-2">
                  {/* No API Keys Message in Header */}
                  {!hasApiKeys && (
                    <div className="flex items-center gap-2 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-full px-3 py-1.5">
                      <i className="fas fa-exclamation-circle text-red-400 text-[10px]"></i>
                      <span className="text-red-400 text-[10px] font-medium">No API Keys</span>
                    </div>
                  )}

                  {/* Explorer Split View Toggle */}
                  <button
                    type="button"
                    onClick={() => setForceCanvasView(prev => !prev)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      !forceCanvasView
                        ? 'bg-white/[0.08] border-white/[0.18] text-white shadow-sm'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white/60 hover:text-white'
                    }`}
                    title={forceCanvasView ? "Show Project Explorer" : "Hide Explorer (Canvas View)"}
                  >
                    <Code2 className="w-3.5 h-3.5 text-white/70" />
                    <span>{forceCanvasView ? "Show Explorer" : "Split View"}</span>
                  </button>

                  {/* Reset / New Project */}
                  <button
                    type="button"
                    onClick={() => {
                      setChatMessages([]);
                      setOpenEngineerPlan(null);
                      setGenerationProgress({
                        isGenerating: false,
                        status: '',
                        components: [],
                        currentComponent: 0,
                        streamedCode: '',
                        isStreaming: false,
                        isThinking: false,
                        files: [],
                        lastProcessedPosition: 0
                      });
                    }}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center transition-all cursor-pointer text-white/60 hover:text-white"
                    title="Start fresh project"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* API Keys */}
                  <button
                    type="button"
                    onClick={() => setShowApiKeysModal(true)}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center transition-all cursor-pointer text-white/60 hover:text-white"
                    title="Manage AI Models & API Keys"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>

                  {/* Download Project ZIP */}
                  <button
                    type="button"
                    onClick={downloadZip}
                    disabled={generationProgress.files.length === 0}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-center transition-all cursor-pointer text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Download Project ZIP"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Pill-shaped Status Badge */}
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-500 ${status.active
                    ? 'bg-green-500/10 border-green-500/20 shadow-sm shadow-green-500/10'
                    : 'bg-white/[0.04] border-white/[0.08]'
                    }`}>
                    <div className={`relative w-2 h-2 rounded-full transition-colors ${status.active ? 'bg-green-400' : 'bg-gray-500'}`}>
                      {status.active && (
                        <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-40" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${status.active ? 'text-green-300' : 'text-white/50'}`}>{status.text}</span>
                  </div>

                  {/* Built by Dharm Patel Link */}
                  <a
                    href="https://github.com/DDharm007"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] transition-all group"
                    title="Built by Dharm Patel (GitHub)"
                  >
                    <svg className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span className="text-[10px] text-white/40">Built by</span>
                    <span className="text-xs font-semibold text-white/90 group-hover:text-blue-400 transition-colors">DHARM PATEL</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {!isSplitLayout ? (
                /* Full width centered canvas view matching Crust theme */
                <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0c0d14] relative">
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />

                  <OpenEngineerWorkspace
                    chatMessages={chatMessages}
                    generationProgress={generationProgress}
                    openEngineerPlan={openEngineerPlan}
                    selectedEngineerAnswers={selectedEngineerAnswers}
                    onSelectAnswer={(qId, opt) => setSelectedEngineerAnswers(prev => ({ ...prev, [qId]: opt }))}
                    onApproveBuild={executeOpenEngineerBuild}
                    aiChatInput={aiChatInput}
                    setAiChatInput={setAiChatInput}
                    onSendMessage={sendChatMessage}
                    onDownloadZip={downloadZip}
                    hasSandboxKey={hasSandboxKey}
                    sandboxData={sandboxData}
                    onInspectCode={() => {
                      setForceCodeView(true);
                      setActiveTab('generation');
                    }}
                    onOpenApiKeysModal={() => setShowApiKeysModal(true)}
                    aiModel={aiModel}
                    setAiModel={setAiModel}
                    availableModels={sortedAvailableModels}
                    unlockedModels={unlockedModels}
                    modelDisplayNames={modelDisplayNames}
                    modelTags={modelTags}
                    attachedFiles={attachedFiles}
                    setAttachedFiles={setAttachedFiles}
                    onCancelGeneration={() => abortControllerRef.current?.abort()}
                    chatMessagesRef={chatMessagesRef}
                    isSplit={false}
                  />
                </div>
              ) : (
                /* Split View: Left Column (Chat & Thinking) + Right Column (Preview / Code) */
                <>
                  <div className="w-full md:w-[420px] lg:w-[460px] flex-shrink-0 flex flex-col border-r border-white/[0.08] bg-[#0c0d14] relative overflow-hidden">
                    <OpenEngineerWorkspace
                      chatMessages={chatMessages}
                      generationProgress={generationProgress}
                      openEngineerPlan={openEngineerPlan}
                      selectedEngineerAnswers={selectedEngineerAnswers}
                      onSelectAnswer={(qId, opt) => setSelectedEngineerAnswers(prev => ({ ...prev, [qId]: opt }))}
                      onApproveBuild={executeOpenEngineerBuild}
                      aiChatInput={aiChatInput}
                      setAiChatInput={setAiChatInput}
                      onSendMessage={sendChatMessage}
                      onDownloadZip={downloadZip}
                      hasSandboxKey={hasSandboxKey}
                      sandboxData={sandboxData}
                      onInspectCode={() => {
                        setForceCodeView(true);
                        setActiveTab('generation');
                      }}
                      onOpenApiKeysModal={() => setShowApiKeysModal(true)}
                      aiModel={aiModel}
                      setAiModel={setAiModel}
                      availableModels={sortedAvailableModels}
                      unlockedModels={unlockedModels}
                      modelDisplayNames={modelDisplayNames}
                      modelTags={modelTags}
                      attachedFiles={attachedFiles}
                      setAttachedFiles={setAttachedFiles}
                      onCancelGeneration={() => abortControllerRef.current?.abort()}
                      chatMessagesRef={chatMessagesRef}
                      isSplit={true}
                    />
                  </div>

                  {/* Right Panel - Explorer & Code Inspection ONLY (Sandbox pane removed per user request) */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0e]">
                    {/* Header Bar */}
                    <div className="px-4 py-2 bg-[#0c0d12] border-b border-white/[0.08] flex justify-between items-center flex-shrink-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-semibold text-white tracking-wide">Project Explorer</span>
                        <span className="text-[10px] text-gray-400 font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                          {generationProgress.files.length} {generationProgress.files.length === 1 ? 'file' : 'files'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setForceCanvasView(true)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white text-xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Collapse split view and return to canvas"
                        >
                          <span>Canvas View</span>
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Code Explorer Component */}
                    <div className="flex-1 relative overflow-hidden">
                      <CodeExplorer
                        files={generationProgress.files}
                        selectedFile={selectedFile}
                        onSelectFile={setSelectedFile}
                        onDownloadZip={downloadZip}
                        isGenerating={generationProgress.isGenerating}
                        currentGeneratingFile={generationProgress.currentFile?.path}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )
      }

      {/* Red Message Toaster for Locked Models */}
      <AnimatePresence>
        {lockedModelToast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] max-w-md w-[calc(100%-2rem)] pointer-events-auto"
          >
            <div className="relative overflow-hidden rounded-2xl p-3.5 bg-[#1b070b]/95 border border-red-500/40 backdrop-blur-2xl shadow-[0_16px_40px_rgba(239,68,68,0.25),0_0_0_1px_rgba(255,255,255,0.06)] flex items-center gap-3">
              {/* Red glow accent */}
              <div className="absolute -inset-1 bg-red-500/10 blur-xl pointer-events-none" />

              {/* Red Key Icon */}
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/35 flex items-center justify-center text-red-400 flex-shrink-0">
                <Key className="w-4 h-4 text-red-400" />
              </div>

              {/* Message Content */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-white tracking-tight">
                  Add API of this <span className="text-red-400 font-bold">{lockedModelToast.providerName}</span>
                </span>
                <span className="text-[11px] text-red-200/60 truncate font-mono">
                  {lockedModelToast.modelName} is locked until API key is added
                </span>
              </div>

              {/* Action Button: Add API */}
              <button
                type="button"
                onClick={() => {
                  setTargetProviderForModal(lockedModelToast.providerId || null);
                  setShowApiKeysModal(true);
                  setLockedModelToast(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-medium text-xs shadow-lg shadow-red-500/25 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                <span>Add API</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLockedModelToast(null)}
                className="p-1 rounded-lg text-red-300/60 hover:text-white hover:bg-red-500/20 transition-all flex-shrink-0 cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Keys & AI Providers Manager Modal */}
      <ApiKeysModal
        isOpen={showApiKeysModal}
        onClose={() => {
          setShowApiKeysModal(false);
          setTargetProviderForModal(null);
        }}
        initialProviderId={targetProviderForModal}
        onKeysSaved={(data: any) => {
          if (data.availableModels) setAvailableModels(data.availableModels);
          if (data.unlockedModels) setUnlockedModels(data.unlockedModels);
          if (data.modelDisplayNames) setModelDisplayNames(data.modelDisplayNames);
          fetch('/api/check-api-keys')
            .then(res => res.json())
            .then(d => {
              if (d.success) {
                setAvailableModels(d.availableModels);
                if (d.unlockedModels) setUnlockedModels(d.unlockedModels);
                setModelDisplayNames(d.modelDisplayNames);
                if (d.modelTags) setModelTags(d.modelTags);
                setHasSandboxKey(Boolean(d.sandboxConfigured));
                setHasApiKeys(d.hasAnyKey);
              }
            });
        }}
      />

    </div>
  )
}

export default function AISandboxPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        <span className="mt-4 text-white/50 text-sm font-mono">Loading Crust...</span>
      </div>
    }>
      <AISandboxContent />
    </Suspense>
  );
}