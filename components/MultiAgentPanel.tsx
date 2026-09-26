'use client'

import { useState, useRef, useCallback } from 'react'
import LatticeLoader from './LatticeLoader'

// ── Lightweight markdown renderer (no external deps) ─────────────────────────
function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-white/80 font-semibold text-[11px] mt-2">{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={i} className="text-white/85 font-bold text-xs mt-2">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="text-white/90 font-bold text-sm mt-2">{line.slice(2)}</h1>
        if (line.startsWith('```')) return null // handled by code block detection below
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <div key={i} className="flex gap-1.5"><span className="text-white/40 mt-0.5">•</span><span>{line.slice(2)}</span></div>
        }
        if (/^\d+\. /.test(line)) {
          return <div key={i} className="flex gap-1.5"><span className="text-white/40">{line.match(/^\d+/)?.[0]}.</span><span>{line.replace(/^\d+\. /, '')}</span></div>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold text-white/85">{line.slice(2, -2)}</p>
        }
        if (line === '') return <div key={i} className="h-1" />
        // Inline code
        const parts = line.split(/(`[^`]+`)/)
        return (
          <p key={i} className="text-white/70 leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith('`') && part.endsWith('`')
                ? <code key={j} className="bg-white/10 px-1 py-0.5 rounded text-purple-300 font-mono text-[10px]">{part.slice(1, -1)}</code>
                : part
            )}
          </p>
        )
      })}
    </div>
  )
}

// ── Code block extractor ──────────────────────────────────────────────────────
function FormattedOutput({ content }: { content: string }) {
  // Split into code blocks and text blocks
  const parts = content.split(/(```[\s\S]*?```)/g)
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3).split('\n')
          const lang = lines[0].trim()
          const code = lines.slice(1, -1).join('\n')
          return (
            <div key={i} className="rounded-lg overflow-hidden border border-white/[0.08]">
              {lang && <div className="px-3 py-1 bg-white/[0.04] text-[9px] text-white/40 font-mono border-b border-white/[0.06]">{lang}</div>}
              <pre className="p-3 text-[10px] font-mono text-green-300/90 overflow-x-auto leading-relaxed bg-black/50">
                <code>{code}</code>
              </pre>
            </div>
          )
        }
        return <MarkdownText key={i} content={part} />
      })}
    </div>
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

type AgentRole = 'build' | 'plan' | 'explore' | 'review' | 'orchestrator' | 'coder' | 'researcher' | 'reviewer' | 'thinker'
type AgentStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error' | 'waiting'

interface AgentState {
  role: AgentRole
  status: AgentStatus
  output: string
  currentTask?: string
}

interface PipelineEvent {
  type: 'status' | 'token' | 'done' | 'error' | 'complete'
  agentId: AgentRole
  data: string
}

// ── Agent meta ───────────────────────────────────────────────────────────────

const AGENTS: Record<AgentRole, { icon: string; label: string; color: string; glow: string; border: string }> = {
  build: {
    icon: '🛠️',
    label: 'Open Engineer',
    color: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/30',
  },
  plan: {
    icon: '📋',
    label: 'Plan Architect',
    color: 'from-pink-500 to-rose-600',
    glow: 'shadow-pink-500/20',
    border: 'border-pink-500/30',
  },
  explore: {
    icon: '🔍',
    label: 'Explorer',
    color: 'from-amber-500 to-yellow-600',
    glow: 'shadow-amber-500/20',
    border: 'border-amber-500/30',
  },
  review: {
    icon: '✅',
    label: 'Reviewer',
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  orchestrator: {
    icon: '🎯',
    label: 'Orchestrator',
    color: 'from-purple-500 to-violet-600',
    glow: 'shadow-purple-500/20',
    border: 'border-purple-500/30',
  },
  thinker: {
    icon: '🧠',
    label: 'Thinker',
    color: 'from-blue-500 to-cyan-600',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/30',
  },
  researcher: {
    icon: '🔍',
    label: 'Researcher',
    color: 'from-green-500 to-emerald-600',
    glow: 'shadow-green-500/20',
    border: 'border-green-500/30',
  },
  coder: {
    icon: '💻',
    label: 'Coder',
    color: 'from-yellow-500 to-amber-600',
    glow: 'shadow-yellow-500/20',
    border: 'border-yellow-500/30',
  },
  reviewer: {
    icon: '✅',
    label: 'Reviewer',
    color: 'from-red-500 to-pink-600',
    glow: 'shadow-red-500/20',
    border: 'border-red-500/30',
  },
}

const ALL_AGENTS: AgentRole[] = ['build', 'plan', 'explore', 'review']

// ── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  const base = 'w-2 h-2 rounded-full flex-shrink-0'
  if (status === 'working' || status === 'thinking') {
    return <span className={`${base} bg-yellow-400 animate-pulse`} />
  }
  if (status === 'done') return <span className={`${base} bg-green-400`} />
  if (status === 'error') return <span className={`${base} bg-red-400`} />
  if (status === 'waiting') return <span className={`${base} bg-blue-400/50 animate-pulse`} />
  return <span className={`${base} bg-white/20`} />
}

// ── Agent card ────────────────────────────────────────────────────────────────

function AgentCard({
  role,
  state,
  isActive,
  isExpanded,
  onToggle,
}: {
  role: AgentRole
  state: AgentState
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const meta = AGENTS[role]

  return (
    <div
      className={`rounded-xl border transition-all duration-300 ${meta.border} ${
        isActive ? `shadow-lg ${meta.glow}` : 'border-white/[0.06]'
      } overflow-hidden`}
      style={{
        background: isActive
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-sm flex-shrink-0 ${
            isActive ? `shadow-md ${meta.glow}` : ''
          }`}
        >
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white/90 text-xs font-semibold">{meta.label}</span>
            <StatusDot status={state.status} />
          </div>
          {state.currentTask && (
            <p className="text-white/40 text-[10px] truncate mt-0.5">{state.currentTask}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {state.status === 'working' && (
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
          <svg
            className={`w-3 h-3 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Output */}
      {isExpanded && state.output && (
        <div className="border-t border-white/[0.04] p-3 max-h-64 overflow-y-auto scrollbar-hide">
          <div className="text-[11px] leading-relaxed">
            <FormattedOutput content={state.output} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mode selector ─────────────────────────────────────────────────────────────

type Mode = 'auto' | 'code' | 'research' | 'think'

function ModeButton({ mode, current, label, icon, onClick }: {
  mode: Mode; current: Mode; label: string; icon: string; onClick: () => void
}) {
  const active = mode === current
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-white/10 text-white border border-white/20'
          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface MultiAgentPanelProps {
  onClose?: () => void
  initialPrompt?: string
}

export default function MultiAgentPanel({ onClose, initialPrompt }: MultiAgentPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt || '')
  const [mode, setMode] = useState<Mode>('auto')
  const [isRunning, setIsRunning] = useState(false)
  const [expandedAgents, setExpandedAgents] = useState<Set<AgentRole>>(new Set(['build', 'plan']))
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null)
  const [finalAnswer, setFinalAnswer] = useState('')
  const [showFinal, setShowFinal] = useState(false)

  const [agentStates, setAgentStates] = useState<Record<AgentRole, AgentState>>(() => {
    const states: any = {}
    for (const role of ALL_AGENTS) {
      states[role] = { role, status: 'idle', output: '', currentTask: undefined }
    }
    return states
  })

  const abortRef = useRef<AbortController | null>(null)
  const finalRef = useRef<HTMLDivElement>(null)

  const updateAgent = useCallback((role: AgentRole, update: Partial<AgentState>) => {
    setAgentStates(prev => ({ ...prev, [role]: { ...prev[role], ...update } }))
  }, [])

  const toggleExpand = (role: AgentRole) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const reset = () => {
    const states: any = {}
    for (const role of ALL_AGENTS) {
      states[role] = { role, status: 'idle', output: '', currentTask: undefined }
    }
    setAgentStates(states)
    setFinalAnswer('')
    setShowFinal(false)
    setActiveAgent(null)
  }

  const run = async () => {
    if (!prompt.trim() || isRunning) return

    reset()
    setIsRunning(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), mode }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break

          try {
            const event: PipelineEvent = JSON.parse(raw)
            const { type, agentId, data } = event

            if (type === 'status') {
              setActiveAgent(agentId)
              updateAgent(agentId, { status: 'working', currentTask: data })
              setExpandedAgents(prev => new Set([...prev, agentId]))
            } else if (type === 'token') {
              setAgentStates(prev => ({
                ...prev,
                [agentId]: {
                  ...prev[agentId],
                  status: 'working' as const,
                  output: (prev[agentId]?.output || '') + data,
                }
              }))
            } else if (type === 'done') {
              updateAgent(agentId, { status: 'done', output: data, currentTask: undefined })
            } else if (type === 'error') {
              updateAgent(agentId, { status: 'error', currentTask: data })
            } else if (type === 'complete') {
              setFinalAnswer(data)
              setShowFinal(true)
              updateAgent(agentId || 'build', { status: 'done' })
              setTimeout(() => finalRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[multi-agent] Error:', err)
      }
    } finally {
      setIsRunning(false)
      setActiveAgent(null)
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setIsRunning(false)
  }

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-sm">
            🤖
          </div>
          <div>
            <span className="text-white/90 text-sm font-semibold">Multi-Agent</span>
            <span className="ml-1.5 text-[10px] text-white/30 font-mono">5 agents</span>
          </div>
          {isRunning ? (
            <div className="ml-2 flex items-center gap-2">
              <LatticeLoader
                status="working"
                label="Agents Working"
                doneLabel="Completed in"
                errorLabel="Failed"
                pattern="ripple"
                grid={3}
                shape="round"
                doneColor="#22c55e"
                errorColor="#ef4444"
                cellSize={5}
                gap={1.5}
                fontSize={11}
                step={90}
                idleOpacity={0.15}
                glow
                glowColor="#a855f7"
                showTimer
                color="#e9d5ff"
              />
            </div>
          ) : null}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4 space-y-4">

          {/* Mode selector */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-white/30 text-[10px] mr-1">Mode:</span>
            <ModeButton mode="auto" current={mode} label="Auto" icon="✨" onClick={() => setMode('auto')} />
            <ModeButton mode="code" current={mode} label="Code" icon="💻" onClick={() => setMode('code')} />
            <ModeButton mode="research" current={mode} label="Research" icon="🔍" onClick={() => setMode('research')} />
            <ModeButton mode="think" current={mode} label="Think" icon="🧠" onClick={() => setMode('think')} />
          </div>

          {/* Prompt input */}
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
              }}
              placeholder="Ask the multi-agent system anything... (⌘+Enter to run)"
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/20 resize-none focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all leading-relaxed"
            />
            <div className="flex gap-2">
              <button
                onClick={isRunning ? stop : run}
                disabled={!prompt.trim() && !isRunning}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isRunning
                    ? 'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20'
                }`}
              >
                {isRunning ? '⏹ Stop' : '▶ Run Agents'}
              </button>
              {!isRunning && (agentStates.orchestrator.status !== 'idle') && (
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all border border-white/[0.06]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Agent cards */}
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider">Agents</p>
            {ALL_AGENTS.map(role => (
              <AgentCard
                key={role}
                role={role}
                state={agentStates[role]}
                isActive={activeAgent === role}
                isExpanded={expandedAgents.has(role)}
                onToggle={() => toggleExpand(role)}
              />
            ))}
          </div>

          {/* Final answer */}
          {showFinal && finalAnswer && (
            <div ref={finalRef} className="rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-purple-500/10">
                <span className="text-purple-400 text-sm">✨</span>
                <span className="text-white/80 text-xs font-semibold">Final Answer</span>
              </div>
              <div className="p-4 text-xs leading-relaxed">
                <FormattedOutput content={finalAnswer} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
