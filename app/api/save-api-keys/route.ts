import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SUPPORTED_PROVIDERS } from '@/lib/providers-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keys } = body as { keys?: Record<string, string> };

    if (!keys || typeof keys !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. "keys" object is required.' },
        { status: 400 }
      );
    }

    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // List of allowed environment keys from our provider definitions
    const allowedEnvKeys = new Set([
      ...SUPPORTED_PROVIDERS.map(p => p.envKey),
      'FIRECRAWL_API_KEY',
      'GROQ_REFINE_API_KEY'
    ]);

    const updatedEnvKeys: string[] = [];

    // Parse existing lines
    const lines = envContent ? envContent.split(/\r?\n/) : [];
    const keyToLineIndex = new Map<string, number>();

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.substring(0, eqIdx).trim();
        keyToLineIndex.set(k, idx);
      }
    });

    // Update or insert keys
    for (const [key, value] of Object.entries(keys)) {
      if (!allowedEnvKeys.has(key)) continue;

      const trimmedVal = typeof value === 'string' ? value.trim() : '';

      // Set in runtime process.env immediately
      if (trimmedVal) {
        process.env[key] = trimmedVal;
      } else {
        delete process.env[key];
      }

      updatedEnvKeys.push(key);

      if (keyToLineIndex.has(key)) {
        const lineIdx = keyToLineIndex.get(key)!;
        if (trimmedVal) {
          lines[lineIdx] = `${key}=${trimmedVal}`;
        } else {
          // Comment out or remove
          lines[lineIdx] = `# ${key}=`;
        }
      } else if (trimmedVal) {
        lines.push(`${key}=${trimmedVal}`);
      }
    }

    // Save updated .env.local file
    const newContent = lines.join('\n');
    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('[save-api-keys] Updated .env.local with keys:', updatedEnvKeys);

    // Compute updated available models and tags
    const availableKeys: Record<string, boolean> = {};
    const modelDisplayNames: Record<string, string> = {};
    const modelTags: Record<string, string> = {};
    const availableModels: string[] = [];
    const unlockedModels: string[] = [];

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

      // Populate ALL models so they are visible
      for (const m of provider.models) {
        if (!availableModels.includes(m.id)) {
          availableModels.push(m.id);
          modelDisplayNames[m.id] = m.name;
          modelTags[m.id] = m.tag;
        }

        // Track which models are unlocked
        if (isConfigured && !unlockedModels.includes(m.id)) {
          unlockedModels.push(m.id);
        }
      }
    }

    // Ensure unlocked models are ALWAYS on top of availableModels
    const sortedAvailableModels = [
      ...unlockedModels,
      ...availableModels.filter(m => !unlockedModels.includes(m))
    ];

    return NextResponse.json({
      success: true,
      message: 'API keys saved successfully to .env.local and runtime environment.',
      updatedKeys: updatedEnvKeys,
      availableKeys,
      availableModels: sortedAvailableModels,
      unlockedModels,
      modelDisplayNames,
      modelTags,
      sandboxConfigured: Boolean(process.env.E2B_API_KEY?.trim())
    });

  } catch (error) {
    console.error('[save-api-keys] Error saving API keys:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save API keys' },
      { status: 500 }
    );
  }
}
