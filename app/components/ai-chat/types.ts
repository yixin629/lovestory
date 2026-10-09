export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type ChatRequestMessage = Pick<Message, 'role' | 'content'>
