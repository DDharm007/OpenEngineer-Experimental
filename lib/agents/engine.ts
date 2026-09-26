// ─────────────────────────────────────────────────────────────────────────────
// Multi-Agent Orchestration Engine
// Coordinates 5 agents using freebuff-style spawn/delegate pattern
// ─────────────────────────────────────────────────────────────────────────────

import { streamText, generateText } from 'ai'
import { AGENT_DEFINITIONS, resolveAgentModel } from './registry'
import { resolveModel } from '../model-resolver'
import type { AgentRole, AgentDef, AgentStreamEvent } from './types'

// ── Model factory ──────────────────────────────────────────────────────────

function getModelForAgent(agent: AgentDef): any {
  const modelId = resolveAgentModel(agent)
  // resolveModel handles Gemini (@ai-sdk/google), Groq, NVIDIA, OpenRouter, etc.
  return resolveModel(modelId)
}

// ── Stream helper ──────────────────────────────────────────────────────────

export async function* runAgent(
  agent: AgentDef,
  userPrompt: string,
  context: string = '',
  onToken?: (token: string) => void
): AsyncGenerator<AgentStreamEvent> {

  const model = getModelForAgent(agent)
  const systemMsg = agent.systemPrompt
  const fullPrompt = context
    ? `${context}\n\n---\nTask for you:\n${userPrompt}`
    : userPrompt

  yield {
    type: 'agent_start',
    agentId: agent.id,
    data: `${agent.icon} ${agent.displayName} starting...`,
    timestamp: Date.now(),
  }

  try {
    const { textStream } = streamText({
      model,
      system: systemMsg,
      prompt: fullPrompt,
      maxTokens: agent.maxTokens || 8192,
      temperature: agent.temperature ?? 0.2,
    } as any)

    let fullText = ''
    for await (const chunk of textStream) {
      fullText += chunk
      onToken?.(chunk)
      yield {
        type: 'agent_token',
        agentId: agent.id,
        data: chunk,
        timestamp: Date.now(),
      }
    }

    yield {
      type: 'agent_done',
      agentId: agent.id,
      data: fullText,
      timestamp: Date.now(),
    }
  } catch (error: any) {
    console.error(`[agent:${agent.id}] Error:`, error.message)
    yield {
      type: 'agent_error',
      agentId: agent.id,
      data: error.message || 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

// ── Full multi-agent pipeline ──────────────────────────────────────────────

export type AgentPipelineUpdate = {
  type: 'status' | 'token' | 'done' | 'error' | 'complete'
  agentId: AgentRole
  data: string
}

/**
 * Runs the full 5-agent pipeline:
 * 1. Orchestrator plans and delegates
 * 2. Thinker deep-reasons (if needed)
 * 3. Researcher gathers context (if needed)
 * 4. Coder implements (if needed)
 * 5. Reviewer validates final answer
 */
export async function* runMultiAgentPipeline(
  userPrompt: string,
  mode: 'auto' | 'code' | 'research' | 'think' = 'auto'
): AsyncGenerator<AgentPipelineUpdate> {

  const agentOutputs: Record<string, string> = {}
  const allDefs = AGENT_DEFINITIONS

  // ─── STEP 1: Orchestrator plans ────────────────────────────────────────
  const orchestrator = allDefs.orchestrator
  let orchestratorPlan = ''

  yield { type: 'status', agentId: 'orchestrator', data: '🎯 Orchestrator analyzing request...' }

  // Orchestrator generates a delegation plan
  const planPrompt = `User request: "${userPrompt}"

Analyze this request and decide which agents to delegate to. Respond in this EXACT JSON format:
{
  "summary": "One sentence description of what you'll do",
  "delegate": {
    "thinker": "task description or null",
    "researcher": "task description or null", 
    "coder": "task description or null"
  },
  "order": ["thinker", "researcher", "coder"]
}

Only include agents that are actually needed. Return ONLY the JSON.`

  try {
    const planModel = getModelForAgent(orchestrator)
    const { text: planJson } = await generateText({
      model: planModel,
      system: orchestrator.systemPrompt,
      prompt: planPrompt,
      maxTokens: 1024,
      temperature: 0.2,
    } as any)

    orchestratorPlan = planJson
    yield { type: 'token', agentId: 'orchestrator', data: planJson }
    agentOutputs.orchestrator = planJson

  } catch (err: any) {
    yield { type: 'error', agentId: 'orchestrator', data: err.message }
    // Continue with default plan
    orchestratorPlan = JSON.stringify({
      summary: 'Processing request',
      delegate: { thinker: null, researcher: null, coder: userPrompt },
      order: ['coder'],
    })
  }

  // Parse the plan
  let plan: { summary: string; delegate: Record<string, string | null>; order: string[] }
  try {
    const jsonMatch = orchestratorPlan.match(/\{[\s\S]*\}/)
    plan = JSON.parse(jsonMatch?.[0] || orchestratorPlan)
  } catch {
    plan = {
      summary: 'Executing request directly',
      delegate: { coder: userPrompt },
      order: ['coder'],
    }
  }

  yield { type: 'status', agentId: 'orchestrator', data: `✅ Plan: ${plan.summary}` }

  // Override order for specific modes
  const agentOrder = mode === 'code' ? ['coder', 'reviewer']
    : mode === 'research' ? ['researcher', 'thinker']
    : mode === 'think' ? ['thinker']
    : (plan.order || ['coder'])

  // ─── STEP 2-4: Run delegated agents in sequence ────────────────────────
  let accumulatedContext = `Original request: ${userPrompt}\n\nOrchestrator plan: ${plan.summary}`

  for (const agentId of agentOrder) {
    const agentDef = allDefs[agentId as AgentRole]
    if (!agentDef) continue

    const task = plan.delegate[agentId]
    if (!task) continue

    yield { type: 'status', agentId: agentId as AgentRole, data: `${agentDef.icon} ${agentDef.displayName} working...` }

    let agentOutput = ''
    for await (const event of runAgent(agentDef, task, accumulatedContext)) {
      if (event.type === 'agent_token') {
        yield { type: 'token', agentId: agentId as AgentRole, data: event.data }
        agentOutput += event.data
      } else if (event.type === 'agent_done') {
        agentOutput = event.data
        agentOutputs[agentId] = agentOutput
        accumulatedContext += `\n\n${agentDef.displayName} output:\n${agentOutput.slice(0, 2000)}`
        yield { type: 'done', agentId: agentId as AgentRole, data: agentOutput }
      } else if (event.type === 'agent_error') {
        yield { type: 'error', agentId: agentId as AgentRole, data: event.data }
      }
    }
  }

  // ─── STEP 5: Reviewer validates (always runs if coder ran) ─────────────
  const coderOutput = agentOutputs.coder
  if (coderOutput && agentOrder.includes('coder')) {
    const reviewer = allDefs.reviewer

    yield { type: 'status', agentId: 'reviewer', data: '✅ Reviewer validating...' }

    let reviewOutput = ''
    const reviewTask = `Review this implementation and provide feedback:\n\n${coderOutput}`

    for await (const event of runAgent(reviewer, reviewTask, `Original request: ${userPrompt}`)) {
      if (event.type === 'agent_token') {
        yield { type: 'token', agentId: 'reviewer', data: event.data }
        reviewOutput += event.data
      } else if (event.type === 'agent_done') {
        reviewOutput = event.data
        agentOutputs.reviewer = reviewOutput
        yield { type: 'done', agentId: 'reviewer', data: reviewOutput }
      }
    }
  }

  // ─── STEP 6: Orchestrator synthesizes final answer ─────────────────────
  yield { type: 'status', agentId: 'orchestrator', data: '🎯 Synthesizing final answer...' }

  const synthesisPrompt = `Based on the work of your specialized agents, synthesize a clear, complete final answer for the user.

Original request: ${userPrompt}

Agent outputs:
${Object.entries(agentOutputs)
  .filter(([k]) => k !== 'orchestrator')
  .map(([k, v]) => `## ${k}\n${v?.slice(0, 3000)}`)
  .join('\n\n')}

Provide a well-structured, comprehensive final answer. If there's code, include it. If there are findings, summarize them clearly.`

  let finalAnswer = ''
  for await (const event of runAgent(orchestrator, synthesisPrompt)) {
    if (event.type === 'agent_token') {
      yield { type: 'token', agentId: 'orchestrator', data: event.data }
      finalAnswer += event.data
    } else if (event.type === 'agent_done') {
      finalAnswer = event.data
    }
  }

  yield {
    type: 'complete',
    agentId: 'orchestrator',
    data: finalAnswer,
  }
}
