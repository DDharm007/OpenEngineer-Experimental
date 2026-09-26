'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─── Sidebar nav structure (grouped like rocket.new) ─── */
const sidebarGroups = [
    {
        label: 'GETTING STARTED',
        items: [
            { id: 'introduction', title: 'Introduction' },
            { id: 'quick-start', title: 'Quick start' },
            { id: 'clone-mode', title: 'Clone mode' },
        ],
    },
    {
        label: 'BUILDING',
        items: [
            { id: 'ai-generation', title: 'AI code generation' },
            { id: 'live-preview', title: 'Live preview' },
            { id: 'chat-editing', title: 'Chat-based editing' },
            { id: 'themes', title: 'Themes' },
            { id: 'prompt-refine', title: 'Prompt refinement' },
        ],
    },
    {
        label: 'STACK',
        items: [
            { id: 'frameworks', title: 'Frameworks' },
            { id: 'languages', title: 'Languages' },
            { id: 'ai-models', title: 'AI models' },
        ],
    },
    {
        label: 'WORKFLOW',
        items: [
            { id: 'describe', title: '1. Describe' },
            { id: 'customize', title: '2. Customize' },
            { id: 'generate', title: '3. Generate' },
            { id: 'iterate', title: '4. Iterate' },
            { id: 'export', title: '5. Export' },
        ],
    },
    {
        label: 'RESOURCES',
        items: [
            { id: 'tips', title: 'Tips & best practices' },
            { id: 'shortcuts', title: 'Keyboard shortcuts' },
        ],
    },
];

/* ─── page content keyed by section id ─── */
interface ContentBlock {
    type: 'paragraph' | 'heading' | 'list' | 'card-grid' | 'callout' | 'code';
    text?: string;
    items?: string[];
    cards?: { title: string; desc: string; link?: string }[];
    variant?: 'info' | 'tip';
}

const pageContent: Record<string, { title: string; subtitle?: string; blocks: ContentBlock[] }> = {
    introduction: {
        title: 'Introduction',
        subtitle: 'Everything you need to know to start building with Crust.',
        blocks: [
            {
                type: 'heading',
                text: 'What is Crust?',
            },
            {
                type: 'paragraph',
                text: 'Crust is an AI-powered app builder by Craftorā. Describe what you want to build in plain English, select a theme, and let the AI generate a fully functional React application — complete with styling, routing, and components.',
            },
            {
                type: 'heading',
                text: 'The fastest way to go from idea to app',
            },
            {
                type: 'list',
                items: [
                    'Enter your app idea in the prompt field on the home screen.',
                    'Choose a visual theme (Modern, Glassmorphism, Cyberpunk, etc.).',
                    'Optionally refine your prompt with the built-in AI refiner.',
                    'Click **Start Building** and watch your app come to life in real-time.',
                ],
            },
            {
                type: 'heading',
                text: 'What you can build',
            },
            {
                type: 'list',
                items: [
                    '**Web apps** — React or Next.js applications with Tailwind CSS',
                    '**Cloned sites** — Recreate any public website as a modern React app',
                    '**Full codebase** — All source files, components, and configuration ready to export',
                ],
            },
            {
                type: 'heading',
                text: 'Two ways to start',
            },
            {
                type: 'card-grid',
                cards: [
                    { title: 'From an idea', desc: 'Describe your app in plain English and let the AI generate everything.', link: 'quick-start' },
                    { title: 'Clone a website', desc: 'Paste a URL to scrape and recreate any public site as React.', link: 'clone-mode' },
                ],
            },
        ],
    },
    'quick-start': {
        title: 'Quick start',
        subtitle: 'Get your first app running in under a minute.',
        blocks: [
            {
                type: 'heading',
                text: 'Step-by-step',
            },
            {
                type: 'list',
                items: [
                    'Open Crust and you\'ll see the home screen with the prompt textarea.',
                    'Type a description of what you want to build. Be specific — mention pages, features, and design preferences.',
                    'Press **Enter** or click the submit button to continue.',
                    'On the theme selection screen, pick a visual theme that matches your vision.',
                    'Add any extra modifications in the text field (colors, fonts, animations, etc.).',
                    'Click **Start Building** to begin AI generation.',
                ],
            },
            {
                type: 'callout',
                variant: 'tip',
                text: 'The more specific your prompt, the better the result. Mention the number of pages, key features, and any specific interactions you want.',
            },
        ],
    },
    'clone-mode': {
        title: 'Clone mode',
        subtitle: 'Recreate any public website as a modern React application.',
        blocks: [
            {
                type: 'heading',
                text: 'How cloning works',
            },
            {
                type: 'paragraph',
                text: 'Paste any public URL into the input field and Crust will scrape the website content, analyze the layout and styling, then generate a faithful React reproduction with Tailwind CSS.',
            },
            {
                type: 'list',
                items: [
                    'The scraper extracts text content, structure, and metadata from the target site.',
                    'A screenshot is captured to reference the visual design.',
                    'The AI generates multi-file React code that recreates the original layout.',
                    'The result is hot-reloaded in the live preview so you can see it immediately.',
                ],
            },
            {
                type: 'callout',
                variant: 'info',
                text: 'Cloning works best with content-heavy sites. Dynamic web apps with heavy JavaScript may not be fully captured.',
            },
        ],
    },
    'ai-generation': {
        title: 'AI code generation',
        subtitle: 'How Crust turns your ideas into production-ready code.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Powered by high-performance NVIDIA NIM models (GLM-5.2, DeepSeek V4 Pro, MiniMax M3, Nemotron Ultra, Kimi K2.6, Mistral Medium 3.5), Crust streams production-ready code in real-time. It creates multi-file React applications with proper component architecture, routing, and Tailwind CSS styling.',
            },
            {
                type: 'heading',
                text: 'What gets generated',
            },
            {
                type: 'list',
                items: [
                    '**Component files** — Properly structured React components with clean JSX',
                    '**Styling** — Tailwind CSS classes with responsive design built in',
                    '**Routing** — React Router setup for multi-page applications',
                    '**Configuration** — package.json, vite config, and other project files',
                ],
            },
            {
                type: 'heading',
                text: 'Streaming output',
            },
            {
                type: 'paragraph',
                text: 'Code is streamed token-by-token as the AI generates it. You can watch each file appear in the code editor panel while the live preview updates automatically.',
            },
        ],
    },
    'live-preview': {
        title: 'Live preview',
        subtitle: 'See your app render in real-time inside a sandboxed environment.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Every code change is hot-reloaded so you get immediate visual feedback as the AI works. The preview runs inside a secure sandbox powered by E2B, so your code executes safely.',
            },
            {
                type: 'heading',
                text: 'Preview features',
            },
            {
                type: 'list',
                items: [
                    'Real-time updates as code is generated',
                    'Full browser preview with working interactions',
                    'Automatic package installation and dependency resolution',
                    'Vite dev server for instant hot module replacement',
                ],
            },
        ],
    },
    'chat-editing': {
        title: 'Chat-based editing',
        subtitle: 'Iterate on your app through natural conversation.',
        blocks: [
            {
                type: 'paragraph',
                text: 'After your initial generation, use the chat panel to request modifications. Ask the AI to add features, change colors, fix bugs, or refactor code — all through natural conversation.',
            },
            {
                type: 'heading',
                text: 'What you can do',
            },
            {
                type: 'list',
                items: [
                    'Add new pages or components to your app',
                    'Change styling, colors, fonts, or layout',
                    'Fix bugs or errors in the generated code',
                    'Refactor code structure or component organization',
                    'Add new features like form validation, API calls, or animations',
                ],
            },
            {
                type: 'callout',
                variant: 'tip',
                text: 'The AI remembers your full project context. You can reference existing components, pages, or features in your requests and it will make targeted edits.',
            },
        ],
    },
    themes: {
        title: 'Themes',
        subtitle: '20+ curated visual themes to transform your app\'s look and feel.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Themes do more than change colors — they influence typography, spacing, animations, and overall design language. Select a theme during the customization step to apply it across your entire app.',
            },
            {
                type: 'heading',
                text: 'Available themes',
            },
            {
                type: 'list',
                items: [
                    '**Modern** — Clean & minimal design',
                    '**Neobrutalist** — Bold & vibrant with thick borders',
                    '**Glassmorphism** — Frosted glass effects',
                    '**Dark Mode** — Deep dark color scheme',
                    '**Cyberpunk** — Neon & futuristic vibes',
                    '**Synthwave** — Retro-futuristic with gradients',
                    '**Aurora** — Northern lights color palette',
                    '**Pastel** — Soft & dreamy tones',
                    '**Corporate** — Professional & clean',
                    '…and 10+ more',
                ],
            },
        ],
    },
    'prompt-refine': {
        title: 'Prompt refinement',
        subtitle: 'Let the AI enhance your prompt before building.',
        blocks: [
            {
                type: 'paragraph',
                text: 'The built-in prompt refiner takes your rough idea and expands it into a detailed specification. It catches requirements you might miss and improves the quality of the generated output.',
            },
            {
                type: 'heading',
                text: 'How to use it',
            },
            {
                type: 'list',
                items: [
                    'Enter your idea in the prompt field.',
                    'On the theme selection screen, click **Refine Prompt** instead of Start Building.',
                    'The AI will analyze your prompt and generate an enhanced version.',
                    'Review the refined prompt, make any edits, and click **Start Building**.',
                ],
            },
        ],
    },
    frameworks: {
        title: 'Frameworks',
        subtitle: 'The frontend frameworks Crust generates code for.',
        blocks: [
            {
                type: 'card-grid',
                cards: [
                    { title: 'React', desc: 'Component-based UI library for building interactive interfaces.' },
                    { title: 'Next.js', desc: 'Full-stack React framework with routing and server-side rendering.' },
                    { title: 'Tailwind CSS', desc: 'Utility-first CSS framework for rapid, responsive styling.' },
                    { title: 'Framer Motion', desc: 'Production-ready animation library for React components.' },
                ],
            },
        ],
    },
    languages: {
        title: 'Languages',
        subtitle: 'The languages used in generated projects.',
        blocks: [
            {
                type: 'list',
                items: [
                    '**JavaScript / JSX** — Primary language for all generated code',
                    '**HTML5** — Semantic markup and page structure',
                    '**CSS3** — Styling via Tailwind utility classes',
                    '**TypeScript** — Type-safe development (coming soon)',
                ],
            },
        ],
    },
    'ai-models': {
        title: 'AI models',
        subtitle: 'The AI engine behind Crust.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Crust leverages NVIDIA NIM models as its AI engine — including GLM-5.2, DeepSeek V4 Pro, MiniMax M3, Nemotron Ultra 550B, Kimi K2.6, and Mistral Medium 3.5 — powering code generation, prompt refinement, and conversational editing.',
            },
        ],
    },
    describe: {
        title: '1. Describe',
        subtitle: 'Start by telling Crust what you want to build.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Type a description of your app in the prompt field, or paste a URL to clone an existing website. The more detail you provide, the better the result.',
            },
            {
                type: 'callout',
                variant: 'tip',
                text: 'Include specifics like: number of pages, key features, color palette, target audience, and any interactions you want.',
            },
        ],
    },
    customize: {
        title: '2. Customize',
        subtitle: 'Choose a theme and fine-tune your requirements.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Pick a visual theme from the grid and optionally add extra modifications — specific colors, font preferences, animations, or layout requests.',
            },
        ],
    },
    generate: {
        title: '3. Generate',
        subtitle: 'Watch the AI build your app in real-time.',
        blocks: [
            {
                type: 'paragraph',
                text: 'The AI streams code in real-time. You can watch each file appear in the code editor while the live preview updates automatically. Packages are detected and installed on the fly.',
            },
        ],
    },
    iterate: {
        title: '4. Iterate',
        subtitle: 'Refine your app through conversation.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Use the chat panel to request changes, add new features, or fix issues. The AI understands your full project context and makes targeted edits without breaking existing functionality.',
            },
        ],
    },
    export: {
        title: '5. Export',
        subtitle: 'Download your complete project.',
        blocks: [
            {
                type: 'paragraph',
                text: 'Download your finished project as a ZIP file containing all source code, assets, and configuration — ready for deployment to Vercel, Netlify, or any other platform.',
            },
        ],
    },
    tips: {
        title: 'Tips & best practices',
        subtitle: 'Get better results from Crust.',
        blocks: [
            {
                type: 'heading',
                text: 'Write detailed prompts',
            },
            {
                type: 'paragraph',
                text: 'The more specific your description, the better the result. Mention the number of pages, key features, color preferences, and any specific interactions you want.',
            },
            {
                type: 'heading',
                text: 'Use the refiner',
            },
            {
                type: 'paragraph',
                text: 'The prompt refiner is surprisingly good at expanding vague ideas into detailed specs. Try it before building — it often catches requirements you might miss.',
            },
            {
                type: 'heading',
                text: 'Iterate incrementally',
            },
            {
                type: 'paragraph',
                text: 'Instead of one massive prompt, start simple and add features through the chat. This gives the AI better context and produces more reliable code.',
            },
            {
                type: 'heading',
                text: 'Leverage themes',
            },
            {
                type: 'paragraph',
                text: 'Themes influence typography, spacing, animations, and overall design language. Experiment with different themes to find the right vibe for your project.',
            },
        ],
    },
    shortcuts: {
        title: 'Keyboard shortcuts',
        subtitle: 'Navigate faster with keyboard commands.',
        blocks: [
            {
                type: 'heading',
                text: 'Prompt input',
            },
            {
                type: 'list',
                items: [
                    '**Enter** — Submit prompt',
                    '**Shift + Enter** — New line in prompt',
                ],
            },
            {
                type: 'heading',
                text: 'Chat panel',
            },
            {
                type: 'list',
                items: [
                    '**Enter** — Send message',
                    '**Shift + Enter** — New line in message',
                ],
            },
        ],
    },
};

/* ─── simple markdown bold renderer ─── */
function RichText({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    return (
        <>
            {parts.map((p, i) =>
                p.startsWith('**') && p.endsWith('**') ? (
                    <span key={i} className="text-white/80 font-medium">{p.slice(2, -2)}</span>
                ) : (
                    <span key={i}>{p}</span>
                ),
            )}
        </>
    );
}

/* ─── collect headings for right-side TOC ─── */
function getHeadings(blocks: ContentBlock[]): string[] {
    return blocks.filter((b) => b.type === 'heading' && b.text).map((b) => b.text!);
}

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ═══════════════════  PAGE  ═══════════════════ */

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('introduction');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const content = pageContent[activeSection] || pageContent['introduction'];
    const headings = getHeadings(content.blocks);

    /* scroll to top on section change */
    useEffect(() => {
        document.getElementById('docs-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSection]);

    return (
        <div className="h-screen flex flex-col bg-[#09090b] text-white/80" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Blurred background (very subtle) ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img src="/CrustHeroBackground.png" alt="" className="w-full h-full object-cover blur-[80px] scale-125 opacity-[0.08]" />
            </div>

            {/* ═══ Top bar ═══ */}
            <header className="relative z-30 flex items-center justify-between px-4 h-12 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-5">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img src="/craftoralogo.png" alt="Crust" className="w-5 h-5 object-contain" />
                        <span className="text-[13px] font-semibold text-white/90 tracking-tight">Crust</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        <span className="text-[11px] text-purple-400 font-medium px-2 py-0.5 rounded bg-purple-500/10">Docs</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                        ← Back to Builder
                    </Link>
                </div>
            </header>

            {/* ═══ Body ═══ */}
            <div className="relative z-10 flex flex-1 overflow-hidden">

                {/* ── Left sidebar ── */}
                <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-white/[0.06] bg-[#09090b]/60 overflow-y-auto py-4 px-3">
                    {sidebarGroups.map((group) => (
                        <div key={group.label} className="mb-5">
                            <p className="text-[10px] font-semibold tracking-[0.12em] text-white/25 uppercase mb-1.5 px-2">
                                {group.label}
                            </p>
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                                    className={`w-full text-left px-2 py-[5px] rounded text-[12px] transition-colors duration-150 ${activeSection === item.id
                                        ? 'text-white bg-white/[0.06] font-medium'
                                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                                        }`}
                                >
                                    {item.title}
                                </button>
                            ))}
                        </div>
                    ))}
                </aside>

                {/* ── Main content ── */}
                <main id="docs-content" className="flex-1 overflow-y-auto px-6 md:px-12 py-8 md:py-10">
                    <div className="max-w-2xl">
                        {/* Title */}
                        <h1 className="text-[22px] font-semibold text-white tracking-tight mb-1">
                            {content.title}
                        </h1>
                        {content.subtitle && (
                            <p className="text-[13px] text-white/35 mb-8 leading-relaxed">{content.subtitle}</p>
                        )}

                        {/* Content blocks */}
                        <div className="space-y-5">
                            {content.blocks.map((block, i) => {
                                switch (block.type) {
                                    case 'heading':
                                        return (
                                            <h2
                                                key={i}
                                                id={slugify(block.text || '')}
                                                className="text-[14px] font-semibold text-white/90 pt-4 first:pt-0 border-t border-white/[0.04] first:border-0"
                                            >
                                                {block.text}
                                            </h2>
                                        );
                                    case 'paragraph':
                                        return (
                                            <p key={i} className="text-[12.5px] text-white/45 leading-[1.75]">
                                                <RichText text={block.text || ''} />
                                            </p>
                                        );
                                    case 'list':
                                        return (
                                            <ul key={i} className="space-y-2">
                                                {block.items?.map((item, j) => (
                                                    <li key={j} className="flex items-start gap-2.5 text-[12.5px] text-white/45 leading-[1.7]">
                                                        <span className="mt-[7px] w-1 h-1 rounded-full bg-purple-400/60 flex-shrink-0" />
                                                        <span><RichText text={item} /></span>
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    case 'card-grid':
                                        return (
                                            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {block.cards?.map((card, j) => (
                                                    <button
                                                        key={j}
                                                        onClick={() => card.link && setActiveSection(card.link)}
                                                        className="text-left p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 group"
                                                    >
                                                        <p className="text-[12px] font-medium text-white/80 group-hover:text-white mb-1">{card.title}</p>
                                                        <p className="text-[11px] text-white/30 leading-relaxed">{card.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    case 'callout':
                                        return (
                                            <div
                                                key={i}
                                                className={`px-4 py-3 rounded-lg border text-[12px] leading-[1.7] ${block.variant === 'tip'
                                                    ? 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300/70'
                                                    : 'border-blue-500/20 bg-blue-500/[0.04] text-blue-300/70'
                                                    }`}
                                            >
                                                <span className="font-medium text-[11px] uppercase tracking-wide mr-2">
                                                    {block.variant === 'tip' ? '💡 Tip' : 'ℹ️ Note'}
                                                </span>
                                                <RichText text={block.text || ''} />
                                            </div>
                                        );
                                    default:
                                        return null;
                                }
                            })}
                        </div>

                        {/* ── Prev / Next ── */}
                        <div className="flex items-center justify-between mt-12 pt-5 border-t border-white/[0.06]">
                            {(() => {
                                const allItems = sidebarGroups.flatMap((g) => g.items);
                                const idx = allItems.findIndex((it) => it.id === activeSection);
                                const prev = idx > 0 ? allItems[idx - 1] : null;
                                const next = idx < allItems.length - 1 ? allItems[idx + 1] : null;

                                return (
                                    <>
                                        {prev ? (
                                            <button
                                                onClick={() => setActiveSection(prev.id)}
                                                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                {prev.title}
                                            </button>
                                        ) : <div />}
                                        {next ? (
                                            <button
                                                onClick={() => setActiveSection(next.id)}
                                                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors ml-auto"
                                            >
                                                {next.title}
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        ) : <div />}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pb-6 text-center">
                            <p className="text-[10px] text-white/15">
                                Built by Craftorā
                            </p>
                        </div>
                    </div>
                </main>

                {/* ── Right sidebar (TOC) ── */}
                {headings.length > 0 && (
                    <aside className="hidden lg:flex flex-col w-44 flex-shrink-0 border-l border-white/[0.06] py-8 px-4 overflow-y-auto">
                        <p className="text-[10px] font-semibold tracking-[0.1em] text-white/20 uppercase mb-3">On this page</p>
                        {headings.map((h, i) => (
                            <a
                                key={i}
                                href={`#${slugify(h)}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(slugify(h))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="text-[11px] text-white/30 hover:text-white/60 transition-colors py-[3px] leading-snug"
                            >
                                {h}
                            </a>
                        ))}
                    </aside>
                )}
            </div>
        </div>
    );
}
