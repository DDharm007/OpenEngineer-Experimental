// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/run
// Streaming multi-agent pipeline endpoint
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server'
import { runMultiAgentPipeline } from '@/lib/agents/engine'

export const maxDuration = 300 // 5 minute max for complex multi-agent tasks

export async function POST(req: NextRequest) {
  const { prompt, mode = 'auto' } = await req.json()

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Return a streaming text/event-stream response
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runMultiAgentPipeline(prompt.trim(), mode)) {
          const line = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(line))
        }
      } catch (err: any) {
        const errorEvent = {
          type: 'error',
          agentId: 'orchestrator',
          data: err.message || 'Pipeline failed',
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
