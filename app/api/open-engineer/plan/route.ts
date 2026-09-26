import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { resolveModel } from '@/lib/model-resolver';

export interface EngineerQuestion {
  id: string;
  question: string;
  options: string[];
  multiple?: boolean;
}

export interface EngineerPlanResponse {
  summary: string;
  architecture: {
    framework: string;
    styling: string;
    stateManagement: string;
    icons: string;
  };
  files: Array<{ path: string; description: string }>;
  questions: EngineerQuestion[];
  reasoning: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, model: requestedModel = 'openai/gpt-oss-120b', conversationHistory = [] } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Resolve model using Groq / Gemini / Nvidia
    const model = resolveModel(requestedModel);

    const systemPrompt = `You are Open Engineer, an autonomous principal systems engineer and software architect inspired by OpenCode.
Your task is to analyze the user's web application prompt, reason through the architecture, formulate clarifying questions if user choices exist, and create a production-ready engineering plan.

Guidelines:
1. Framework: Modern React + Vite (ESM) + Tailwind CSS + Lucide Icons.
2. Architecture: Multi-file modular structure (e.g. src/App.jsx, src/components/..., src/index.css).
3. Questions: If the prompt leaves room for stylistic or functional choices, formulate 1 to 2 sharp clarifying questions with 2-4 concrete options each (mark the best one with "(Recommended)").
4. If the prompt is already completely explicit and unambiguous, questions can be an empty array [].
5. Tone: Rigorous, professional, proactive software engineer.

You MUST respond in this exact JSON format:
{
  "summary": "High-level summary of the system being engineered",
  "reasoning": "Step-by-step architectural reasoning explaining choices for UX, state, component hierarchy, and responsiveness",
  "architecture": {
    "framework": "React 18 + Vite",
    "styling": "Tailwind CSS with rich dark/light aesthetics",
    "stateManagement": "React state / hooks",
    "icons": "lucide-react"
  },
  "files": [
    { "path": "src/App.jsx", "description": "Main application layout and state container" },
    { "path": "src/components/Hero.jsx", "description": "High-converting hero section with interactive controls" },
    { "path": "src/components/Features.jsx", "description": "Feature grid with micro-interactions" }
  ],
  "questions": [
    {
      "id": "theme_aesthetic",
      "question": "Which design aesthetic and color palette fits your vision?",
      "options": [
        "Dark Cyberpunk / Sleek Glassmorphism (Recommended)",
        "Minimal Clean Monochrome",
        "Vibrant High-Contrast Gradient"
      ],
      "multiple": false
    }
  ]
}

Return ONLY valid JSON. No markdown code blocks, no backticks, no extra text.`;

    let text = '';
    try {
      const res = await generateText({
        model,
        system: systemPrompt,
        prompt: `User Prompt: "${prompt}"\n\nRecent context: ${JSON.stringify(conversationHistory.slice(-3))}`,
        temperature: 0.2,
        maxTokens: 2048,
      } as any);
      text = res.text;
    } catch (modelErr) {
      console.warn('[open-engineer/plan] Primary model failed, trying Groq gpt-oss-120b fallback:', modelErr);
      const fallbackModel = resolveModel('openai/gpt-oss-120b');
      const res = await generateText({
        model: fallbackModel,
        system: systemPrompt,
        prompt: `User Prompt: "${prompt}"\n\nRecent context: ${JSON.stringify(conversationHistory.slice(-3))}`,
        temperature: 0.2,
        maxTokens: 2048,
      } as any);
      text = res.text;
    }

    // Parse JSON
    let parsed: EngineerPlanResponse;
    try {
      const cleanJson = text.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      // Fallback structured response
      parsed = {
        summary: `Engineering ${prompt.slice(0, 50)}...`,
        reasoning: `Analyzing architectural specifications for "${prompt}". Planning responsive component tree, modern layout, and clean state primitives.`,
        architecture: {
          framework: 'React 18 + Vite',
          styling: 'Tailwind CSS',
          stateManagement: 'React hooks',
          icons: 'lucide-react',
        },
        files: [
          { path: 'src/App.jsx', description: 'Core application component' },
          { path: 'src/index.css', description: 'Global design system and Tailwind directives' },
          { path: 'src/components/MainView.jsx', description: 'Interactive application view' }
        ],
        questions: [
          {
            id: 'palette',
            question: 'What visual aesthetic would you prefer for this application?',
            options: ['Dark Mode with Sleek Neon Accents (Recommended)', 'Clean Minimalist Light Mode', 'Deep Slate Business'],
            multiple: false
          }
        ]
      };
    }

    return NextResponse.json({ success: true, plan: parsed });
  } catch (error: any) {
    console.error('[open-engineer/plan] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate plan',
      plan: {
        summary: 'Direct build mode',
        reasoning: 'Proceeding directly with full-stack implementation.',
        architecture: { framework: 'React + Vite', styling: 'Tailwind CSS', stateManagement: 'React hooks', icons: 'lucide-react' },
        files: [{ path: 'src/App.jsx', description: 'Primary component' }],
        questions: []
      }
    }, { status: 200 });
  }
}
