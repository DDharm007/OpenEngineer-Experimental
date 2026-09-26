import { NextResponse } from 'next/server';
import { SUPPORTED_PROVIDERS } from '@/lib/providers-config';

export async function GET() {
  try {
    const availableKeys: Record<string, boolean> = {};
    const configuredProviders: string[] = [];
    const modelDisplayNames: Record<string, string> = {};
    const modelTags: Record<string, string> = {};
    const availableModels: string[] = [];

    const unlockedModels: string[] = [];

    // 1. Check each provider against process.env
    for (const provider of SUPPORTED_PROVIDERS) {
      if (provider.isSandbox) continue;

      const directKey = process.env[provider.envKey]?.trim();
      const isConfigured = Boolean(
        directKey ||
        (provider.id === 'google' && process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) ||
        (provider.id === 'moonshot' && process.env.KIMI_API_KEY?.trim()) ||
        (provider.id === 'qwen' && process.env.DASHSCOPE_API_KEY?.trim()) ||
        (provider.id === 'zai' && (process.env.GLM_API_KEY?.trim() || process.env.ZHIPU_API_KEY?.trim()))
      );

      availableKeys[provider.id] = isConfigured;

      if (isConfigured) {
        configuredProviders.push(provider.id);
      }

      // Populate ALL models so they are visible in the dropdown
      for (const model of provider.models) {
        if (!availableModels.includes(model.id)) {
          availableModels.push(model.id);
          modelDisplayNames[model.id] = model.name;
          modelTags[model.id] = model.tag;
        }

        // Track which models are actually unlocked by configured keys
        if (isConfigured && !unlockedModels.includes(model.id)) {
          unlockedModels.push(model.id);
        }
      }
    }

    // Determine default model strictly from the unlocked models
    let defaultModel = 'claude-3-7-sonnet';
    const priorityList = [
      'gpt-oss-120b',
      'openai/gpt-oss-120b',
      'gpt-oss-20b',
      'openai/gpt-oss-20b',
      'qwen-3.8-27b',
      'qwen/qwen3.8-27b',
      'claude-3-7-sonnet',
      'claude-3-5-sonnet',
      'gpt-4o',
      'gemini-2.0-flash',
      'deepseek-r1',
      'deepseek-v3',
      'llama-3.1-nemotron-ultra',
      'llama-3.3-70b',
      'minimax-m3',
      'kimi-k2.6',
      'codestral',
      'qwen-2.5-coder',
      'glm-5',
      'the-ai-scientist',
      'grok-2',
      'openrouter/claude-opus-5.5'
    ];

    for (const mId of priorityList) {
      if (unlockedModels.includes(mId)) {
        defaultModel = mId;
        break;
      }
    }

    // Ensure unlocked models are ALWAYS on top of availableModels
    const sortedAvailableModels = [
      ...unlockedModels,
      ...availableModels.filter(m => !unlockedModels.includes(m))
    ];

    return NextResponse.json({
      success: true,
      availableKeys,
      configuredProviders,
      availableModels: sortedAvailableModels,
      unlockedModels,
      modelDisplayNames,
      modelTags,
      defaultModel,
      sandboxConfigured: Boolean(process.env.E2B_API_KEY?.trim()),
      hasAnyKey: Object.values(availableKeys).some(Boolean)
    });

  } catch (error) {
    console.error('[check-api-keys] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check API keys',
      availableKeys: {},
      configuredProviders: [],
      availableModels: [],
      modelDisplayNames: {},
      modelTags: {},
      defaultModel: 'claude-3-7-sonnet',
      sandboxConfigured: false,
      hasAnyKey: false
    }, { status: 500 });
  }
}
