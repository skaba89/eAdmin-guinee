import { create } from 'zustand'
import { getActiveAccessToken } from '@/lib/auth-client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  grounded?: boolean
  confidence?: number
  sources?: string[]
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

interface AiChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  isLoading: boolean
  isWidgetOpen: boolean

  getActiveConversation: () => Conversation | null
  getMessages: () => ChatMessage[]

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  createConversation: () => string
  setActiveConversation: (id: string) => void
  clearMessages: () => void
  deleteConversation: (id: string) => void
  sendMessage: (content: string) => Promise<void>
  toggleWidget: () => void
  setWidgetOpen: (open: boolean) => void
}

let messageCounter = 0
let conversationCounter = 0

function generateId(prefix: string) {
  if (prefix === 'msg') {
    messageCounter++
    return `msg-${Date.now()}-${messageCounter}`
  }
  conversationCounter++
  return `conv-${Date.now()}-${conversationCounter}`
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  // Deliberately memory-only: administrative chat content can contain personal
  // or sensitive data and must not be persisted to localStorage.
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  isWidgetOpen: false,

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get()
    return conversations.find((conversation) => conversation.id === activeConversationId) || null
  },

  getMessages: () => {
    const conversation = get().getActiveConversation()
    return conversation?.messages || []
  },

  addMessage: (message) => {
    const { activeConversationId, conversations } = get()
    if (!activeConversationId) return

    const newMessage: ChatMessage = {
      ...message,
      id: generateId('msg'),
      timestamp: Date.now(),
    }

    set({
      conversations: conversations.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
              updatedAt: Date.now(),
              title:
                conversation.messages.length === 0 && message.role === 'user'
                  ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                  : conversation.title,
            }
          : conversation,
      ),
    })
  },

  createConversation: () => {
    const id = generateId('conv')
    const newConversation: Conversation = {
      id,
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      activeConversationId: id,
    }))
    return id
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  clearMessages: () => {
    const { activeConversationId, conversations } = get()
    if (!activeConversationId) return
    set({
      conversations: conversations.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              messages: [],
              updatedAt: Date.now(),
              title: 'Nouvelle conversation',
            }
          : conversation,
      ),
    })
  },

  deleteConversation: (id) => {
    const { conversations, activeConversationId } = get()
    const filtered = conversations.filter((conversation) => conversation.id !== id)
    set({
      conversations: filtered,
      activeConversationId:
        activeConversationId === id
          ? (filtered.length > 0 ? filtered[0].id : null)
          : activeConversationId,
    })
  },

  sendMessage: async (content: string) => {
    const { activeConversationId, createConversation, addMessage } = get()
    let conversationId = activeConversationId
    if (!conversationId) conversationId = createConversation()

    addMessage({ role: 'user', content })
    set({ isLoading: true })

    try {
      const token = getActiveAccessToken()
      if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')

      const conversation = get().conversations.find((item) => item.id === conversationId)
      const messages = conversation?.messages
        .filter((message) => message.role !== 'system')
        .map((message) => ({ role: message.role, content: message.content })) || []

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => null) as {
        message?: unknown
        grounded?: unknown
        confidence?: unknown
        sources?: unknown
      } | null

      const message = typeof data?.message === 'string'
        ? data.message
        : 'Assistant indisponible : aucune réponse sourcée disponible.'

      if (!response.ok) {
        addMessage({ role: 'assistant', content: message, grounded: true, confidence: 0, sources: [] })
        return
      }

      addMessage({
        role: 'assistant',
        content: message,
        grounded: data?.grounded === true,
        confidence: typeof data?.confidence === 'number' ? data.confidence : 0,
        sources: Array.isArray(data?.sources)
          ? data.sources.filter((source): source is string => typeof source === 'string')
          : [],
      })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: error instanceof Error
          ? `Assistant indisponible : ${error.message}`
          : 'Assistant indisponible : aucune réponse locale ou aléatoire n’est générée.',
        grounded: true,
        confidence: 0,
        sources: [],
      })
    } finally {
      set({ isLoading: false })
    }
  },

  toggleWidget: () => set((state) => ({ isWidgetOpen: !state.isWidgetOpen })),
  setWidgetOpen: (open) => set({ isWidgetOpen: open }),
}))
