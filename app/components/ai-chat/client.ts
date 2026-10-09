import { authFetch } from '@/lib/auth-fetch'
import type { ChatRequestMessage } from './types'

// Uses the server-side /api/chat route so provider keys never reach the client.
export async function callAI(messages: ChatRequestMessage[]): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await authFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('API_FAILED')
    const data: unknown = await res.json()
    if (
      data &&
      typeof data === 'object' &&
      'content' in data &&
      typeof data.content === 'string' &&
      data.content.length > 0
    ) {
      return data.content
    }
    throw new Error('API_FAILED')
  } finally {
    clearTimeout(timer)
  }
}
