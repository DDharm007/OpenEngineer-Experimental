// Configuration for all supported AI Providers, Sandboxes, and Models
// Allows dynamic configuration directly from the browser, saving to .env.local

export interface ProviderModel {
  id: string; // Unique model ID passed to API
  name: string; // Display name
  tag: string; // e.g. 'Flagship' | 'Fast' | 'Reasoning' | 'Deep' | 'Vision' | 'Research' | 'Code'
  context?: string; // Context window e.g. '128K' | '200K' | '1M'
  description?: string;
  isPopular?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  envKey: string;
  description: string;
  portalUrl: string;
  portalName: string;
  placeholder: string;
  category: 'unified' | 'proprietary' | 'open' | 'specialized' | 'sandbox';
  isSandbox?: boolean;
  models: ProviderModel[];
}

export const SUPPORTED_PROVIDERS: AIProvider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    description: 'Unified gateway providing instant access to hundreds of frontier models with one key.',
    portalUrl: 'https://openrouter.ai/settings/keys',
    portalName: 'openrouter.ai/settings/keys',
    placeholder: 'sk-or-v1-...',
    category: 'unified',
    models: [
      { id: 'openrouter/gpt-6-luna', name: 'GPT-6 Luna', tag: 'Next-Gen', context: '1M', isPopular: true },
      { id: 'openrouter/gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Ultra Fast', context: '2M', isPopular: true },
      { id: 'openrouter/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', tag: 'Fast MoE', context: '128K', isPopular: true },
      { id: 'openrouter/kimi-k3', name: 'Kimi K3', tag: 'Long Context', context: '2M', isPopular: true },
      { id: 'openrouter/grok-4.7', name: 'Grok 4.7', tag: 'Realtime', context: '256K', isPopular: true },
      { id: 'openrouter/claude-opus-5.5', name: 'Claude Opus 5.5', tag: 'Deep Intellect', context: '500K', isPopular: true }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    description: 'Industry-standard frontier AI models from OpenAI including GPT-4o, o-series, and next-gen GPT series.',
    portalUrl: 'https://platform.openai.com/api-keys',
    portalName: 'platform.openai.com',
    placeholder: 'sk-proj-...',
    category: 'proprietary',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', tag: 'Flagship', context: '128K', isPopular: true },
      { id: 'o1', name: 'o1', tag: 'Deep', context: '200K', isPopular: true },
      { id: 'o3', name: 'o3', tag: 'Reasoning', context: '200K', isPopular: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', tag: 'Code SOTA', context: '256K' },
      { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', tag: 'Frontier', context: '500K', isPopular: true },
      { id: 'gpt-6-astra', name: 'GPT-6 Astra', tag: 'Autonomous', context: '1M', isPopular: true }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    description: 'State-of-the-art reasoning, thinking, and code synthesis models by Anthropic.',
    portalUrl: 'https://console.anthropic.com/settings/keys',
    portalName: 'console.anthropic.com',
    placeholder: 'sk-ant-api03-...',
    category: 'proprietary',
    models: [
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', tag: 'Fast', context: '200K' },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', tag: 'Code SOTA', context: '200K', isPopular: true },
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', tag: 'Thinking', context: '200K', isPopular: true },
      { id: 'claude-opus-4.1', name: 'Claude Opus 4.1', tag: 'Deep', context: '300K' },
      { id: 'claude-opus-4.8', name: 'Claude Opus 4.8', tag: 'Reasoning', context: '500K' },
      { id: 'claude-opus-5.5', name: 'Claude Opus 5.5', tag: 'Flagship', context: '1M', isPopular: true }
    ]
  },
  {
    id: 'google',
    name: 'Google',
    envKey: 'GEMINI_API_KEY',
    description: 'Google’s multimodal frontier AI with massive context windows up to 2 million tokens.',
    portalUrl: 'https://aistudio.google.com/app/apikey',
    portalName: 'aistudio.google.com',
    placeholder: 'AIzaSy...',
    category: 'proprietary',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Deep', context: '2M' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: 'Fast', context: '1M' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Ultra Fast', context: '1M', isPopular: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Complex', context: '2M', isPopular: true },
      { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', tag: 'Flagship', context: '2M' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Next-Gen', context: '3M', isPopular: true }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    description: 'High performance open architecture MoE and advanced reasoning AI models.',
    portalUrl: 'https://platform.deepseek.com/api_keys',
    portalName: 'platform.deepseek.com',
    placeholder: 'sk-...',
    category: 'open',
    models: [
      { id: 'deepseek-v2.5', name: 'DeepSeek V2.5', tag: 'Balanced', context: '64K' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', tag: 'Fast MoE', context: '64K', isPopular: true },
      { id: 'deepseek-r1', name: 'DeepSeek R1', tag: 'Reasoning', context: '64K', isPopular: true },
      { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', tag: 'Enhanced', context: '128K' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', tag: 'Deep', context: '128K', isPopular: true },
      { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', tag: 'Ultra Fast', context: '128K', isPopular: true }
    ]
  },
  {
    id: 'xai',
    name: 'xAI',
    envKey: 'XAI_API_KEY',
    description: 'Real-time intelligence and frontier reasoning models developed by xAI.',
    portalUrl: 'https://console.x.ai/',
    portalName: 'console.x.ai',
    placeholder: 'xai-...',
    category: 'proprietary',
    models: [
      { id: 'grok-2', name: 'Grok 2', tag: 'Flagship', context: '128K', isPopular: true },
      { id: 'grok-3', name: 'Grok 3', tag: 'Deep', context: '256K', isPopular: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', tag: 'Fast', context: '128K' },
      { id: 'grok-4', name: 'Grok 4', tag: 'Omni', context: '256K' },
      { id: 'grok-4.1', name: 'Grok 4.1', tag: 'Reasoning', context: '500K' },
      { id: 'grok-4.7', name: 'Grok 4.7', tag: 'Next-Gen', context: '1M', isPopular: true }
    ]
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    envKey: 'MOONSHOT_API_KEY',
    description: 'Long-context foundation models developed by Moonshot AI supporting massive document reasoning.',
    portalUrl: 'https://platform.moonshot.cn/console/api-keys',
    portalName: 'platform.moonshot.cn',
    placeholder: 'sk-...',
    category: 'proprietary',
    models: [
      { id: 'kimi-1.5', name: 'Kimi 1.5', tag: '128K', context: '128K' },
      { id: 'kimi-k2', name: 'Kimi K2', tag: 'Fast', context: '256K' },
      { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking', tag: 'Thinking', context: '256K', isPopular: true },
      { id: 'kimi-k2.5', name: 'Kimi K2.5', tag: 'Balanced', context: '500K' },
      { id: 'kimi-k2.6', name: 'Kimi K2.6', tag: 'Flagship', context: '1M', isPopular: true },
      { id: 'kimi-k3', name: 'Kimi K3', tag: 'Next-Gen', context: '2M', isPopular: true }
    ]
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    envKey: 'MINIMAX_API_KEY',
    description: 'High-throughput multimodal foundation models with deep understanding and swift code generation.',
    portalUrl: 'https://api.minimax.chat',
    portalName: 'api.minimax.chat',
    placeholder: 'eyJhbGciOi...',
    category: 'proprietary',
    models: [
      { id: 'minimax-01', name: 'MiniMax-01', tag: 'Base', context: '128K' },
      { id: 'minimax-m1', name: 'MiniMax M1', tag: 'Fast', context: '128K' },
      { id: 'minimax-m2', name: 'MiniMax M2', tag: 'Balanced', context: '256K' },
      { id: 'minimax-m2.1', name: 'MiniMax M2.1', tag: 'Code', context: '256K' },
      { id: 'minimax-m2.7', name: 'MiniMax M2.7', tag: 'Reasoning', context: '500K', isPopular: true },
      { id: 'minimax-m3', name: 'MiniMax M3', tag: 'Flagship', context: '1M', isPopular: true }
    ]
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    envKey: 'NVIDIA_API_KEY',
    description: 'Accelerated microservices running Nemotron foundation models on NVIDIA DGX Cloud.',
    portalUrl: 'https://build.nvidia.com/',
    portalName: 'build.nvidia.com',
    placeholder: 'nvapi-...',
    category: 'open',
    models: [
      { id: 'llama-3.1-nemotron-nano', name: 'Llama 3.1 Nemotron Nano', tag: 'Fast', context: '128K' },
      { id: 'llama-3.1-nemotron-super', name: 'Llama 3.1 Nemotron Super', tag: 'Balanced', context: '128K' },
      { id: 'llama-3.1-nemotron-ultra', name: 'Llama 3.1 Nemotron Ultra', tag: 'Flagship', context: '128K', isPopular: true },
      { id: 'nemotron-3-nano', name: 'Nemotron 3 Nano', tag: 'Edge', context: '128K' },
      { id: 'nemotron-3-super', name: 'Nemotron 3 Super', tag: 'Reasoning', context: '256K' },
      { id: 'nemotron-3-ultra', name: 'Nemotron 3 Ultra', tag: 'Ultra Large', context: '256K', isPopular: true }
    ]
  },
  {
    id: 'groq',
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    description: 'Ultra-low latency LPU hardware running open models at 300 to 800+ tokens/sec.',
    portalUrl: 'https://console.groq.com/keys',
    portalName: 'console.groq.com',
    placeholder: 'gsk_...',
    category: 'open',
    models: [
      { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', tag: '800+ tok/s', context: '128K' },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', tag: '300+ tok/s', context: '128K', isPopular: true },
      { id: 'gpt-oss-20b', name: 'GPT-OSS 20B', tag: 'Fast Code', context: '64K' },
      { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', tag: 'MoE', context: '128K', isPopular: true },
      { id: 'qwen-3.8-27b', name: 'Qwen 3.8 27B', tag: 'Fast', context: '128K' },
      { id: 'groq-minimax-m2.7', name: 'MiniMax M2.7', tag: 'Reasoning', context: '128K', isPopular: true }
    ]
  },
  {
    id: 'sakana',
    name: 'Sakana AI',
    envKey: 'SAKANA_API_KEY',
    description: 'Nature-inspired evolutionary algorithms, automated discovery, and transformer architectures.',
    portalUrl: 'https://sakana.ai',
    portalName: 'sakana.ai',
    placeholder: 'sakana-...',
    category: 'specialized',
    models: [
      { id: 'the-ai-scientist', name: 'The AI Scientist', tag: 'Research', context: '128K', isPopular: true },
      { id: 'evo', name: 'Evo', tag: 'Evolutionary', context: '128K' },
      { id: 'transformer-2', name: 'Transformer²', tag: 'Self-Adapting', context: '128K', isPopular: true },
      { id: 'shinka-evolve', name: 'ShinkaEvolve', tag: 'Optimization', context: '128K' },
      { id: 'fugu', name: 'Fugu', tag: 'Efficient', context: '64K' },
      { id: 'sakana-namazu', name: 'Sakana Namazu', tag: 'Geospatial', context: '128K' }
    ]
  },
  {
    id: 'qwen',
    name: 'Qwen',
    envKey: 'QWEN_API_KEY',
    description: 'Top-tier bilingual foundation and code generation models by Alibaba Cloud / DashScope.',
    portalUrl: 'https://dashscope.console.aliyun.com/',
    portalName: 'dashscope.console.aliyun.com',
    placeholder: 'sk-...',
    category: 'open',
    models: [
      { id: 'qwen-2.5', name: 'Qwen2.5', tag: 'Base', context: '128K' },
      { id: 'qwen-2.5-coder', name: 'Qwen2.5-Coder', tag: 'Code SOTA', context: '128K', isPopular: true },
      { id: 'qwen-3-235b-a22b', name: 'Qwen3-235B-A22B', tag: 'MoE', context: '256K' },
      { id: 'qwen-3.5-plus', name: 'Qwen3.5-Plus', tag: 'Balanced', context: '500K' },
      { id: 'qwen-3.7-plus', name: 'Qwen3.7-Plus', tag: 'Flagship', context: '1M', isPopular: true },
      { id: 'qwen-3.8-max', name: 'Qwen3.8-Max', tag: 'Ultra', context: '1M', isPopular: true }
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    envKey: 'MISTRAL_API_KEY',
    description: 'Open-weights and frontier enterprise models with superior reasoning and code mastery.',
    portalUrl: 'https://console.mistral.ai/api-keys',
    portalName: 'console.mistral.ai',
    placeholder: '...api_key...',
    category: 'open',
    models: [
      { id: 'mistral-large-2', name: 'Mistral Large 2', tag: 'Flagship', context: '128K' },
      { id: 'codestral', name: 'Codestral', tag: 'Code SOTA', context: '256K', isPopular: true },
      { id: 'mistral-small-3.2', name: 'Mistral Small 3.2', tag: 'Fast', context: '128K' },
      { id: 'magistral-medium-1.2', name: 'Magistral Medium 1.2', tag: 'Reasoning', context: '128K' },
      { id: 'mistral-large-3', name: 'Mistral Large 3', tag: 'Deep', context: '256K', isPopular: true },
      { id: 'mistral-medium-3.5', name: 'Mistral Medium 3.5', tag: 'Balanced', context: '256K', isPopular: true }
    ]
  },
  {
    id: 'zai',
    name: 'GLM / Z.ai',
    envKey: 'ZAI_API_KEY',
    description: 'Bilingual foundation models from Zhipu AI and Tsinghua KEG with outstanding reasoning.',
    portalUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    portalName: 'open.bigmodel.cn',
    placeholder: '...api_key...',
    category: 'proprietary',
    models: [
      { id: 'glm-4', name: 'GLM-4', tag: 'Standard', context: '128K' },
      { id: 'glm-4.5', name: 'GLM-4.5', tag: 'Fast', context: '128K' },
      { id: 'glm-4.6', name: 'GLM-4.6', tag: 'Balanced', context: '128K' },
      { id: 'glm-4.7', name: 'GLM-4.7', tag: 'Reasoning', context: '128K' },
      { id: 'glm-5', name: 'GLM-5', tag: 'Flagship', context: '256K', isPopular: true },
      { id: 'glm-5.3', name: 'GLM-5.3', tag: 'Next-Gen', context: '500K', isPopular: true }
    ]
  },
  {
    id: 'e2b',
    name: 'E2B Sandbox API',
    envKey: 'E2B_API_KEY',
    description: 'Provides live cloud sandboxes to run Vite dev servers, execute terminal commands, and render live interactive previews.',
    portalUrl: 'https://e2b.dev',
    portalName: 'e2b.dev',
    placeholder: 'e2b_...',
    category: 'sandbox',
    isSandbox: true,
    models: []
  }
];

export const PROVIDER_MAP = new Map<string, AIProvider>(
  SUPPORTED_PROVIDERS.map(p => [p.id, p])
);

export const ENV_KEY_TO_PROVIDER = new Map<string, AIProvider>(
  SUPPORTED_PROVIDERS.map(p => [p.envKey, p])
);

export function getProviderForModel(modelId: string): AIProvider | undefined {
  return SUPPORTED_PROVIDERS.find(p => p.models.some(m => m.id === modelId));
}

export function getProviderNameForModel(modelId: string): string {
  const provider = getProviderForModel(modelId);
  if (provider) return provider.name;

  if (modelId.startsWith('openrouter/')) return 'OpenRouter';
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'OpenAI';
  if (modelId.startsWith('claude-')) return 'Anthropic';
  if (modelId.startsWith('gemini-')) return 'Google';
  if (modelId.startsWith('deepseek-')) return 'DeepSeek';
  if (modelId.startsWith('grok-')) return 'xAI';
  if (modelId.startsWith('kimi-') || modelId.startsWith('moonshot-')) return 'Moonshot AI';
  if (modelId.startsWith('minimax-') || modelId.startsWith('abab')) return 'MiniMax';
  if (modelId.includes('nemotron')) return 'NVIDIA';
  if (modelId.includes('llama') || modelId.includes('mixtral') || modelId.includes('gemma')) return 'Groq';
  if (modelId.includes('sakana') || modelId.includes('scientist') || modelId.includes('disco') || modelId.includes('evo-merge')) return 'Sakana AI';
  if (modelId.startsWith('qwen-')) return 'Qwen';
  if (modelId.startsWith('codestral') || modelId.startsWith('mistral') || modelId.startsWith('pixtral')) return 'Mistral AI';
  if (modelId.startsWith('glm-')) return 'GLM / Z.ai';

  return 'this Model Provider';
}
