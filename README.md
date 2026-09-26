<div align="center">

# ⚡ Open Engineer

**Autonomous AI-Powered Full-Stack Web App Builder & Live Development Environment**

Transform natural-language ideas into fully functional, production-ready React applications with real-time cloud sandboxing, multi-agent orchestration, and instant live preview.

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![E2B Sandboxes](https://img.shields.io/badge/E2B-Cloud_Sandbox-FF5722?style=for-the-badge)](https://e2b.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Overview

**Open Engineer** is an open-source development platform that combines autonomous agentic planning, multi-provider AI model routing, and secure cloud sandboxes (powered by E2B) to design, build, and execute full-stack web applications entirely in your browser.

Whether building prototypes from scratch, cloning and modernizing existing websites via Firecrawl, or executing multi-pass architectural refactors, Open Engineer handles code generation, automated package installation, Vite dev server orchestration, and live iframe previewing in real time.

---

## ✨ Key Features

### 🤖 1. Autonomous Planning & Multi-Agent Engine
- **Pre-Build Planning**: Analyzes user intent, designs project architecture (framework, styling, state management), and presents interactive clarification questions before code generation.
- **5-Agent Pipeline**: Specialized agents for orchestration, deep reasoning/thinking, code authoring, dependency research, and quality review.
- **Streaming Code Application**: Real-time multi-file streaming with visual progress indicators, token metrics, and diff tracking.

### 🧠 2. Universal Multi-Model Support
- **NVIDIA NIM Integration**: Fast inference across leading open-weight models:
  - `z-ai/glm-5.2` (Default)
  - `deepseek-ai/deepseek-v4-pro`
  - `nvidia/nemotron-3-ultra-550b-a55b`
  - `minimaxai/minimax-m3`
  - `moonshotai/kimi-k2.6`
  - `mistralai/mistral-medium-3.5-128b`
- **Google Gemini**: Gemini 2.0 Flash / Pro via Google GenAI SDK.
- **Groq**: Ultra-low latency inference with dedicated prompt refinement and prompt optimization.
- **Anthropic & OpenAI**: Claude 3.5 / 3.7 Sonnet, GPT-4o, and reasoning models.
- **In-App Key Management**: Configure and test API keys directly in the UI modal with encrypted browser-side persistence.

### ☁️ 3. Instant Cloud Sandboxes (E2B)
- **Isolated MicroVMs**: Every project boots in an isolated secure sandbox environment.
- **Live Vite Dev Server**: Hot Module Replacement (HMR) embedded in an interactive iframe preview.
- **Automatic Package Detection**: Inspects imports on the fly and automatically installs missing npm dependencies without breaking runtime.
- **Interactive File Explorer**: Full directory tree navigation with syntax-highlighted code viewer and language-specific icons.
- **ZIP Export**: Download the complete generated codebase with one click for local development or deployment.

### 🌐 4. Web Scraping & UI Cloning (Firecrawl)
- Input any live URL to capture visual screenshots and extract layout, CSS styling, and content structures to recreate modern web equivalents in seconds.

### 🎨 5. Modern Creative Workspace
- **Dual Layouts**: Toggle between a centered focused canvas and a side-by-side IDE split view.
- **Prompt Refiner**: AI-assisted prompt expander that converts brief thoughts into structured technical specifications.
- **Mood & Style Selectors**: Pre-configure design aesthetics, typography palettes, and theme vibes before generation.

---

## 🏗️ Architecture

```
Open Engineer
├── app/
│   ├── api/                     # Next.js Serverless API Endpoints
│   │   ├── agents/              # Multi-agent pipeline runner
│   │   ├── check-api-keys/      # Runtime API key & provider detection
│   │   ├── create-ai-sandbox/   # E2B cloud sandbox provisioning
│   │   ├── generate-ai-code-stream/ # Streaming code generator
│   │   ├── apply-ai-code-stream/    # Multi-file patch applicator
│   │   ├── detect-and-install-packages/ # Automated npm dependency installer
│   │   ├── open-engineer/plan/  # Project planning & questionnaire engine
│   │   ├── refine-prompt/       # AI prompt enhancement engine
│   │   └── create-zip/          # Project export endpoint
│   ├── page.tsx                 # Core IDE and workspace interface
│   ├── layout.tsx               # Root layout, fonts, and web metadata
│   └── globals.css              # Design tokens and custom utilities
├── components/
│   ├── OpenEngineerWorkspace.tsx # Central workspace & chat interface
│   ├── MultiAgentPanel.tsx      # Agent workflow & thought monitor
│   ├── CodeExplorer.tsx         # File tree browser & code inspector
│   ├── ApiKeysModal.tsx         # In-app API key manager
│   ├── PromptBar.tsx            # Prompt input with theme & mood controls
│   ├── LatticeLoader.tsx        # High-performance lattice loader animation
│   └── ui/                      # Reusable UI primitives
├── config/
│   └── app.config.ts            # Global timeouts, models, and system configs
├── lib/
│   ├── agents/                  # Multi-agent coordination engine & registries
│   ├── model-resolver.ts        # Dynamic multi-provider model routing
│   ├── providers-config.ts      # Provider schemas & capabilities
│   └── context-selector.ts      # Intelligent context window manager
└── public/                      # Static assets, branding, and icons
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `18.x` or higher (Node `20+` recommended)
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **E2B API Key**: Required for cloud sandboxes and live code execution ([e2b.dev](https://e2b.dev))
- **At least one AI Provider Key**: NVIDIA NIM, Google Gemini, Groq, Anthropic, or OpenAI

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/open-engineer.git
   cd open-engineer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment Variables:**
   Copy the `.env.example` template:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your keys:
   ```env
   # Required for live execution sandboxes
   E2B_API_KEY=your_e2b_key_here

   # Recommended AI Provider (NVIDIA NIM covers GLM, DeepSeek, Nemotron)
   NVIDIA_API_KEY=your_nvidia_nim_key_here

   # Optional Providers (enable whichever you use)
   GEMINI_API_KEY=your_gemini_key_here
   GROQ_API_KEY=your_groq_key_here
   GROQ_REFINE_API_KEY=your_groq_key_here
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   FIRECRAWL_API_KEY=your_firecrawl_key_here
   ```

   > **Tip**: You can also launch the app without editing `.env.local` and input your keys directly inside the application UI via the **API Keys** settings dialog.

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Open in Browser:**
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the Next.js development server with Turbopack |
| `npm run build` | Compiles the production build of the Next.js application |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues |

---

## 🔒 Security & Privacy

- **No Hardcoded Secrets**: All API keys are loaded via runtime environment variables (`process.env`) or securely handled client-side through the in-app key modal.
- **Git Protection**: `.env`, `.env.local`, log dumps, and build caches are strictly ignored by `.gitignore`.
- **Sandbox Isolation**: All generated code runs inside isolated E2B microVM containers, protecting the host system from untrusted code execution.

---
