import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { SUPPORTED_PROVIDERS } from './providers-config';

export interface ModelResolution {
  model: any;
  providerId: string;
  actualModelName: string;
}

export function resolveModel(modelId: string): any {
  console.log('[model-resolver] Resolving model for ID:', modelId);

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_REFINE_API_KEY;

  // 1. Direct OpenRouter models (prefixed with openrouter/)
  if (modelId.startsWith('openrouter/')) {
    const rawName = modelId.replace('openrouter/', '');
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://craftora.ai',
          'X-Title': 'Craftora AI',
        }
      });
      return openrouter(rawName);
    }
  }

  // 2. Anthropic models
  if (modelId.startsWith('claude-') || modelId.startsWith('anthropic/')) {
    const rawName = modelId.replace('anthropic/', '');
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(rawName);
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: { 'HTTP-Referer': 'https://craftora.ai', 'X-Title': 'Craftora AI' }
      });
      return openrouter(`anthropic/${rawName}`);
    }
  }

  // 3. OpenAI models
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3') || (modelId.startsWith('openai/') && !modelId.includes('gpt-oss'))) {
    const rawName = modelId.replace('openai/', '');
    if (process.env.OPENAI_API_KEY) {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(rawName);
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: { 'HTTP-Referer': 'https://craftora.ai', 'X-Title': 'Craftora AI' }
      });
      return openrouter(`openai/${rawName}`);
    }
  }

  // 4. Google Gemini models
  if (modelId.startsWith('gemini-') || modelId.startsWith('google/')) {
    const rawName = modelId.replace('google/', '');
    const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (googleKey) {
      const google = createGoogleGenerativeAI({
        apiKey: googleKey,
      });
      return google(rawName);
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter(`google/${rawName}`);
    }
  }

  // 5. DeepSeek models
  if (modelId.startsWith('deepseek-') || modelId.startsWith('deepseek/')) {
    const rawName = modelId.replace('deepseek/', '');
    if (process.env.DEEPSEEK_API_KEY) {
      const deepseek = createOpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
      });
      return deepseek(rawName === 'deepseek-r1' ? 'deepseek-reasoner' : 'deepseek-chat');
    }
    if (nvidiaKey) {
      const nvidia = createOpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      return nvidia('deepseek-ai/deepseek-v4-pro');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter(`deepseek/${rawName}`);
    }
  }

  // 6. xAI Grok models
  if (modelId.startsWith('grok-') || modelId.startsWith('xai/')) {
    const rawName = modelId.replace('xai/', '');
    if (process.env.XAI_API_KEY) {
      const xai = createOpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });
      return xai(rawName);
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter(`x-ai/${rawName}`);
    }
  }

  // 7. Moonshot AI / Kimi models
  if (modelId.startsWith('kimi-') || modelId.startsWith('moonshot-') || modelId.startsWith('moonshot/')) {
    const moonshotKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
    if (moonshotKey) {
      const moonshot = createOpenAI({
        apiKey: moonshotKey,
        baseURL: 'https://api.moonshot.cn/v1',
      });
      return moonshot('moonshot-v1-128k');
    }
    if (nvidiaKey) {
      const nvidia = createOpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      return nvidia('moonshotai/kimi-k2.6');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('moonshotai/moonshot-v1-128k');
    }
  }

  // 8. MiniMax models
  if (modelId.startsWith('minimax-') || modelId.startsWith('minimax/')) {
    const rawName = modelId.replace('minimax/', '');
    if (process.env.MINIMAX_API_KEY) {
      const minimax = createOpenAI({
        apiKey: process.env.MINIMAX_API_KEY,
        baseURL: 'https://api.minimax.chat/v1',
      });
      return minimax(rawName === 'minimax-01' ? 'MiniMax-Text-01' : 'abab6.5s-chat');
    }
    if (nvidiaKey) {
      const nvidia = createOpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      return nvidia('minimaxai/minimax-m3');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('minimax/minimax-01');
    }
  }

  // 9. NVIDIA Nemotron models
  if (modelId.startsWith('nemotron-') || modelId.startsWith('llama-3.1-nemotron') || modelId.startsWith('nvidia/')) {
    if (groqKey) {
      const groq = createGroq({ apiKey: groqKey });
      return groq('openai/gpt-oss-120b');
    }
    if (nvidiaKey) {
      const nvidia = createOpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      return nvidia('nvidia/llama-3.1-nemotron-70b-instruct');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('nvidia/llama-3.1-nemotron-70b-instruct');
    }
  }

  // 10. Groq models
  const isGroqModel = 
    modelId === 'llama-3.1-8b' ||
    modelId === 'llama-3.3-70b' ||
    modelId === 'gpt-oss-20b' ||
    modelId === 'gpt-oss-120b' ||
    modelId === 'openai/gpt-oss-20b' ||
    modelId === 'openai/gpt-oss-120b' ||
    modelId === 'qwen-3.8-27b' ||
    modelId === 'qwen/qwen3.8-27b' ||
    modelId === 'groq-minimax-m2.7' ||
    modelId.startsWith('groq/');

  if (isGroqModel) {
    if (groqKey) {
      const groq = createGroq({ apiKey: groqKey });
      if (modelId === 'gpt-oss-20b' || modelId === 'openai/gpt-oss-20b') return groq('openai/gpt-oss-20b');
      if (modelId === 'gpt-oss-120b' || modelId === 'openai/gpt-oss-120b') return groq('openai/gpt-oss-120b');
      if (modelId === 'qwen-3.8-27b' || modelId === 'qwen/qwen3.8-27b') return groq('qwen/qwen3.8-27b');
      // Fallback for general groq models
      return groq('openai/gpt-oss-120b');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('meta-llama/llama-3.3-70b-instruct');
    }
  }

  // 11. Sakana AI models
  if (
    modelId === 'the-ai-scientist' ||
    modelId === 'evo' ||
    modelId === 'transformer-2' ||
    modelId === 'shinka-evolve' ||
    modelId === 'fugu' ||
    modelId === 'sakana-namazu' ||
    modelId.startsWith('sakana/')
  ) {
    if (process.env.SAKANA_API_KEY) {
      const sakana = createOpenAI({
        apiKey: process.env.SAKANA_API_KEY,
        baseURL: 'https://api.sakana.ai/v1',
      });
      return sakana(modelId);
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter(`sakana/${modelId}`);
    }
  }

  // 12. Qwen models
  if (modelId.startsWith('qwen-') || modelId.startsWith('qwen3-') || modelId.startsWith('qwen/')) {
    const qwenKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (qwenKey) {
      const qwen = createOpenAI({
        apiKey: qwenKey,
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      });
      if (modelId.includes('coder')) return qwen('qwen2.5-coder-32b-instruct');
      if (modelId.includes('max')) return qwen('qwen-max');
      return qwen('qwen-plus');
    }
    if (groqKey && (modelId.includes('2.5') || modelId.includes('27b'))) {
      const groq = createGroq({ apiKey: groqKey });
      return groq('qwen-2.5-32b');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('qwen/qwen-2.5-coder-32b-instruct');
    }
  }

  // 13. Mistral AI models
  if (
    modelId.startsWith('mistral-') || 
    modelId === 'codestral' || 
    modelId.startsWith('magistral-') || 
    modelId.startsWith('mistralai/')
  ) {
    if (process.env.MISTRAL_API_KEY) {
      const mistral = createOpenAI({
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: 'https://api.mistral.ai/v1',
      });
      if (modelId === 'codestral') return mistral('codestral-latest');
      if (modelId.includes('small')) return mistral('mistral-small-latest');
      return mistral('mistral-large-latest');
    }
    if (nvidiaKey) {
      const nvidia = createOpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      return nvidia('mistralai/mistral-medium-3.5-128b');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('mistralai/codestral-2501');
    }
  }

  // 14. GLM / Z.ai models
  if (modelId.startsWith('glm-') || modelId.startsWith('zai/')) {
    const zaiKey = process.env.ZAI_API_KEY || process.env.GLM_API_KEY;
    if (zaiKey) {
      const zai = createOpenAI({
        apiKey: zaiKey,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      });
      return zai('glm-4-plus');
    }
    if (nvidiaKey) {
      const nvidia = createOpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
      return nvidia('z-ai/glm-5.2');
    }
    if (openRouterKey) {
      const openrouter = createOpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      return openrouter('zhipu/glm-4');
    }
  }

  // 15. Universal Fallback: If OpenRouter key is set, use it
  if (openRouterKey) {
    const openrouter = createOpenAI({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
    return openrouter(modelId);
  }

  // 16. Universal Fallback: NVIDIA NIM (Active in this workspace)
  if (nvidiaKey) {
    const nvidia = createOpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    return nvidia('z-ai/glm-5.2');
  }

  // 17. Universal Fallback: Groq (Active in this workspace)
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    return groq('llama-3.3-70b-versatile');
  }

  // 18. Universal Fallback: OpenAI
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai('gpt-4o');
  }

  // 19. Universal Fallback: Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic('claude-3-7-sonnet');
  }

  throw new Error(`No configured API key found for model "${modelId}". Click "+ Add APIs" to configure this provider's API key.`);
}
