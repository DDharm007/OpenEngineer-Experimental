// ─────────────────────────────────────────────────────────────────────────────
// Multi-Agent System — Core Types
// Inspired by freebuff/Codebuff architecture, powered by Google Gemini + Groq
// ─────────────────────────────────────────────────────────────────────────────

export type AgentRole =
  | 'build'
  | 'plan'
  | 'explore'
  | 'review'
  | 'orchestrator'
  | 'coder'
  | 'researcher'
  | 'reviewer'
  | 'thinker'

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'done'
  | 'error'
  | 'waiting'

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  agentId?: string
  timestamp: number
}

export interface AgentTask {
  id: string
  prompt: string
  assignedTo?: AgentRole
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: string
  createdAt: number
  completedAt?: number
}

export interface AgentDef {
  id: AgentRole
  displayName: string
  model: string
  fallbackModel?: string
  icon: string
  color: string
  systemPrompt: string
  spawnerDescription: string
  tools: string[]
  maxTokens?: number
  temperature?: number
}

export interface MultiAgentSession {
  id: string
  prompt: string
  status: 'running' | 'completed' | 'failed'
  agents: Record<AgentRole, AgentState>
  messages: AgentMessage[]
  finalAnswer?: string
  startedAt: number
  completedAt?: number
}

export interface AgentState {
  role: AgentRole
  status: AgentStatus
  currentTask?: string
  output?: string
  thinkingText?: string
  tokensUsed?: number
}

export interface AgentStreamEvent {
  type: 'agent_start' | 'agent_thinking' | 'agent_token' | 'agent_done' | 'agent_error' | 'session_complete'
  agentId: AgentRole
  data: string
  timestamp: number
}
