import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/server-auth'

export const runtime = 'nodejs'

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 2000
const MAX_TOTAL_MESSAGE_LENGTH = 8000

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function getCompletionContent(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('choices' in data)) return null

  const { choices } = data as { choices?: unknown }
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null

  const firstChoice = choices[0] as { message?: unknown }
  if (!firstChoice.message || typeof firstChoice.message !== 'object') return null

  const { content } = firstChoice.message as { content?: unknown }
  return typeof content === 'string' && content.length > 0 ? content : null
}

const SYSTEM_PROMPT = `你是"小爱"，一个温暖贴心的情侣AI助手。

特点：
- 温柔、体贴、善解人意
- 回答简洁有重点，2-4 句话
- 自然使用 emoji 💕
- 给实用建议而非空话
- 懂中国情侣的文化

能聊的话题：约会建议、礼物创意、情话、沟通技巧、今天吃什么、感情问题、日常陪伴。

用中文，语气亲切自然。`

export async function POST(req: NextRequest) {
  try {
    const user = await authenticatedUser(req)
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || !('messages' in body)) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
    }

    const rawMessages = (body as { messages?: unknown }).messages
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
    }

    if (rawMessages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Too many messages; maximum is ${MAX_MESSAGES}` },
        { status: 400 }
      )
    }

    const userMessages: ChatMessage[] = []
    let totalLength = 0

    for (let index = 0; index < rawMessages.length; index += 1) {
      const message = rawMessages[index]
      if (!message || typeof message !== 'object') {
        return NextResponse.json(
          { error: `Message ${index + 1} must be an object` },
          { status: 400 }
        )
      }

      const { role, content } = message as { role?: unknown; content?: unknown }
      if (role !== 'user' && role !== 'assistant') {
        return NextResponse.json(
          { error: `Message ${index + 1} has an invalid role` },
          { status: 400 }
        )
      }

      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { error: `Message ${index + 1} content must be a non-empty string` },
          { status: 400 }
        )
      }

      if (content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          {
            error: `Message ${index + 1} is too long; maximum is ${MAX_MESSAGE_LENGTH} characters`,
          },
          { status: 400 }
        )
      }

      totalLength += content.length
      if (totalLength > MAX_TOTAL_MESSAGE_LENGTH) {
        return NextResponse.json(
          {
            error: `Messages are too long in total; maximum is ${MAX_TOTAL_MESSAGE_LENGTH} characters`,
          },
          { status: 400 }
        )
      }

      userMessages.push({ role, content })
    }

    const GROQ_KEY = process.env.GROQ_API_KEY
    const CHATANYWHERE_KEY = process.env.CHATANYWHERE_API_KEY

    const apis: Array<{ url: string; headers: Record<string, string>; body: unknown }> = []

    if (GROQ_KEY && GROQ_KEY.length > 10) {
      apis.push({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: {
          // llama-3.3-70b-versatile was retired from Groq's catalog (404 model_not_found) —
          // this account's current lineup no longer has any llama-3.x chat model. Tried the
          // gpt-oss and qwen replacements too: both over-index on the persona's suggested
          // topic list and flatly refuse anything outside it ("我只能聊情侣相关话题"),
          // which is the exact "can't chat freely" complaint this swap is meant to fix.
          // groq/compound answered off-topic requests (code, general Q&A) normally while
          // still staying in character for couple topics — verified consistently across
          // repeated calls, not a one-off.
          model: 'groq/compound',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages],
          max_tokens: 500,
          temperature: 0.85,
        },
      })
    }

    if (CHATANYWHERE_KEY && CHATANYWHERE_KEY.length > 10) {
      apis.push({
        url: 'https://api.chatanywhere.tech/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHATANYWHERE_KEY}` },
        body: {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages],
          max_tokens: 500,
          temperature: 0.85,
        },
      })
    }

    for (const api of apis) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)

      try {
        const res = await fetch(api.url, {
          method: 'POST',
          headers: api.headers,
          body: JSON.stringify(api.body),
          signal: controller.signal,
        })
        if (res.ok) {
          const data: unknown = await res.json()
          const content = getCompletionContent(data)
          if (content) return NextResponse.json({ content })
        } else {
          // Continue to next provider on non-ok
          continue
        }
      } catch {
        continue
      } finally {
        clearTimeout(timer)
      }
    }

    return NextResponse.json({ error: 'All providers failed' }, { status: 503 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
