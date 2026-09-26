'use client';

import Link from 'next/link';

const plans = [
    {
        tier: 'Free',
        name: 'Core',
        price: '$0',
        period: '/mo',
        description: 'For hobbyists exploring Crust.',
        features: [
            '3 projects',
            'Basic AI generation',
            'Live preview',
            'Community support',
            'Export to ZIP',
        ],
        cta: 'Get Started',
        highlighted: false,
    },
    {
        tier: 'Go',
        name: 'Boost',
        price: '$19',
        period: '/mo',
        description: 'For makers building real projects.',
        features: [
            '15 projects',
            'Advanced AI generation',
            'Clone any website',
            'Priority generation queue',
            'All themes',
            'Email support',
        ],
        cta: 'Upgrade',
        highlighted: false,
    },
    {
        tier: 'Pro',
        name: 'Ultra',
        price: '$49',
        period: '/mo',
        description: 'For teams & power users.',
        features: [
            'Unlimited projects',
            'Fastest AI models',
            'Clone any website',
            'Custom themes',
            'Team collaboration',
            'Priority support',
        ],
        cta: 'Go Ultra',
        highlighted: true,
    },
    {
        tier: 'Custom',
        name: 'Infinity',
        price: 'Custom',
        period: '',
        description: 'For enterprises needing unlimited.',
        features: [
            'Everything in Ultra',
            'Dedicated infrastructure',
            'SLA guarantee',
            'Custom integrations',
            'Dedicated account manager',
            'On-premise option',
            'SSO & audit logs',
        ],
        cta: 'Contact Us',
        highlighted: false,
    },
];

export default function PricingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#09090b] text-white/80" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Blurred background (very subtle) ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img src="/CrustHeroBackground.png" alt="" className="w-full h-full object-cover blur-[80px] scale-125 opacity-[0.06]" />
            </div>

            {/* ── Subtle gradient orb behind cards ── */}
            <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-purple-600/[0.04] blur-[120px] pointer-events-none z-0" />

            {/* ═══ Top bar ═══ */}
            <header className="relative z-30 flex items-center justify-between px-4 h-12 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-5">
                    <Link href="/" className="flex items-center gap-2 group">
                        <img src="/craftoralogo.png" alt="Crust" className="w-5 h-5 object-contain" />
                        <span className="text-[13px] font-semibold text-white/90 tracking-tight">Crust</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        <span className="text-[11px] text-purple-400 font-medium px-2 py-0.5 rounded bg-purple-500/10">Pricing</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/docs" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                        Docs
                    </Link>
                    <Link href="/" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
                        ← Back to Builder
                    </Link>
                </div>
            </header>

            {/* ═══ Body ═══ */}
            <main className="relative z-10 flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24">

                    {/* ── Heading ── */}
                    <div className="text-center mb-16">
                        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-purple-400/70 mb-3">Pricing</p>
                        <h1 className="text-[22px] md:text-[26px] font-semibold text-white tracking-tight mb-3">
                            Choose your plan
                        </h1>
                        <p className="text-[12px] text-white/30 max-w-sm mx-auto leading-relaxed">
                            Start free. Upgrade when you&apos;re ready.
                        </p>
                    </div>

                    {/* ── Plan cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`
                                    relative flex flex-col p-6 transition-all duration-300 group
                                    ${plan.highlighted
                                        ? 'bg-[#0d0d10]'
                                        : 'bg-[#09090b] hover:bg-[#0c0c0f]'
                                    }
                                `}
                            >
                                {/* Highlighted top accent line */}
                                {plan.highlighted && (
                                    <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                                )}

                                {/* Tier label */}
                                <p className="text-[9px] font-semibold tracking-[0.12em] uppercase text-white/20 mb-4">
                                    {plan.tier}
                                </p>

                                {/* Name */}
                                <h2 className={`text-[16px] font-semibold tracking-tight mb-3 ${plan.highlighted ? 'text-white' : 'text-white/85'}`}>
                                    {plan.name}
                                </h2>

                                {/* Price */}
                                <div className="flex items-baseline gap-0.5 mb-1">
                                    <span className={`text-[32px] font-bold tracking-tight ${plan.highlighted ? 'text-white' : 'text-white/90'}`}>
                                        {plan.price}
                                    </span>
                                    {plan.period && (
                                        <span className="text-[11px] text-white/20 ml-0.5">{plan.period}</span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-[11px] text-white/25 mb-6 leading-relaxed">{plan.description}</p>

                                {/* CTA */}
                                <button
                                    className={`
                                        w-full py-2 rounded-lg text-[11px] font-medium transition-all duration-200 mb-6
                                        ${plan.highlighted
                                            ? 'bg-purple-600 text-white hover:bg-purple-500'
                                            : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                                        }
                                    `}
                                >
                                    {plan.cta}
                                </button>

                                {/* Divider */}
                                <div className="border-t border-white/[0.06] mb-5" />

                                {/* Features */}
                                <ul className="space-y-2.5 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2.5 text-[11px] text-white/40 leading-snug">
                                            <svg className={`w-3 h-3 flex-shrink-0 ${plan.highlighted ? 'text-purple-400/60' : 'text-white/15'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* ── Compare note ── */}
                    <p className="text-center text-[10px] text-white/15 mt-5">
                        All plans include live preview, AI chat editing, and theme selection.
                    </p>

                    {/* ── FAQ ── */}
                    <div className="mt-24 max-w-lg mx-auto">
                        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/20 text-center mb-6">FAQ</p>

                        <div className="space-y-[1px] rounded-xl overflow-hidden border border-white/[0.06]">
                            {[
                                { q: 'Can I switch plans later?', a: 'Yes — upgrade or downgrade anytime. Changes apply on your next billing cycle.' },
                                { q: 'What happens when I hit my project limit?', a: 'You\'ll be prompted to upgrade. Existing projects stay accessible.' },
                                { q: 'Is there a free trial?', a: 'Every paid plan includes a 7-day free trial. Cancel anytime before it ends.' },
                                { q: 'Do you offer refunds?', a: 'Yes — full refund within the first 14 days of any paid plan, no questions asked.' },
                            ].map((faq) => (
                                <div key={faq.q} className="bg-[#09090b] p-4 hover:bg-white/[0.01] transition-colors">
                                    <p className="text-[11px] font-medium text-white/60 mb-1">{faq.q}</p>
                                    <p className="text-[10.5px] text-white/25 leading-relaxed">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-16 pb-6 text-center">
                        <p className="text-[10px] text-white/10">Built by Craftorā</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
