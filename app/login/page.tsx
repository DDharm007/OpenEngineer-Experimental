'use client';

import Link from 'next/link';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#09090b] text-white/80" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Blurred background ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img src="/CrustHeroBackground.png" alt="" className="w-full h-full object-cover blur-[80px] scale-125 opacity-[0.06]" />
            </div>

            {/* ── Subtle gradient orbs ── */}
            <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] rounded-full bg-purple-600/[0.03] blur-[100px] pointer-events-none z-0" />

            {/* ═══ Top bar ═══ */}
            <header className="relative z-30 flex items-center justify-between px-4 h-12 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-5">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img src="/craftoralogo.png" alt="Crust" className="w-5 h-5 object-contain" />
                        <span className="text-[13px] font-semibold text-white/90 tracking-tight">Crust</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/docs" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                        Docs
                    </Link>
                    <Link href="/pricing" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                        Pricing
                    </Link>
                    <Link href="/" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                        ← Back to Builder
                    </Link>
                </div>
            </header>

            {/* ═══ Body ═══ */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-sm">

                    {/* ── Logo & heading ── */}
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-5">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                                <img src="/craftoralogo.png" alt="Crust" className="w-7 h-7 object-contain" />
                            </div>
                        </div>
                        <h1 className="text-[20px] font-semibold text-white tracking-tight mb-1.5">
                            Welcome back
                        </h1>
                        <p className="text-[12px] text-white/30 leading-relaxed">
                            Sign in to continue building with Crust
                        </p>
                    </div>

                    {/* ── Login card ── */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">

                        {/* Google button */}
                        <button className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12.5px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.12] transition-all duration-200 mb-3 group">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* GitHub button */}
                        <button className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12.5px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.12] transition-all duration-200 group">
                            <svg className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Continue with GitHub
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-[1px] bg-white/[0.06]" />
                            <span className="text-[10px] text-white/20 uppercase tracking-wider font-medium">or</span>
                            <div className="flex-1 h-[1px] bg-white/[0.06]" />
                        </div>

                        {/* Email input */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-medium text-white/25 uppercase tracking-wider mb-1.5 block">Email</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/80 placeholder-white/15 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-white/25 uppercase tracking-wider mb-1.5 block">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white/80 placeholder-white/15 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.04] transition-all duration-200"
                                />
                            </div>

                            {/* Forgot password */}
                            <div className="flex justify-end">
                                <button className="text-[10px] text-purple-400/60 hover:text-purple-400 transition-colors">
                                    Forgot password?
                                </button>
                            </div>

                            {/* Sign in button */}
                            <button className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-[12px] font-medium hover:bg-purple-500 transition-all duration-200 mt-1">
                                Sign in
                            </button>
                        </div>
                    </div>

                    {/* Sign up link */}
                    <p className="text-center text-[11px] text-white/25 mt-5">
                        Don&apos;t have an account?{' '}
                        <button className="text-purple-400/70 hover:text-purple-400 transition-colors font-medium">
                            Sign up
                        </button>
                    </p>

                    {/* Footer */}
                    <div className="mt-10 text-center">
                        <p className="text-[10px] text-white/10">Built by Craftorā</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
