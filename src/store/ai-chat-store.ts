import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AI_CONFIG } from '@/lib/ai-config'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
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

  // Getters
  getActiveConversation: () => Conversation | null
  getMessages: () => ChatMessage[]

  // Actions
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

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isLoading: false,
      isWidgetOpen: false,

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get()
        return conversations.find(c => c.id === activeConversationId) || null
      },

      getMessages: () => {
        const conv = get().getActiveConversation()
        return conv?.messages || []
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
          conversations: conversations.map(conv =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: Date.now(),
                  title:
                    conv.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                      : conv.title,
                }
              : conv
          ),
        })
      },

      createConversation: () => {
        const id = generateId('conv')
        const newConv: Conversation = {
          id,
          title: 'Nouvelle conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set(state => ({
          conversations: [newConv, ...state.conversations],
          activeConversationId: id,
        }))
        return id
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id })
      },

      clearMessages: () => {
        const { activeConversationId, conversations } = get()
        if (!activeConversationId) return

        set({
          conversations: conversations.map(conv =>
            conv.id === activeConversationId
              ? { ...conv, messages: [], updatedAt: Date.now(), title: 'Nouvelle conversation' }
              : conv
          ),
        })
      },

      deleteConversation: (id) => {
        const { conversations, activeConversationId } = get()
        const filtered = conversations.filter(c => c.id !== id)
        set({
          conversations: filtered,
          activeConversationId: activeConversationId === id
            ? (filtered.length > 0 ? filtered[0].id : null)
            : activeConversationId,
        })
      },

      sendMessage: async (content: string) => {
        const { activeConversationId, createConversation, addMessage } = get()

        // Ensure we have an active conversation
        let convId = activeConversationId
        if (!convId) {
          convId = createConversation()
        }

        // Add user message
        addMessage({ role: 'user', content })

        set({ isLoading: true })

        try {
          const conv = get().conversations.find(c => c.id === convId)
          const messages = conv?.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content,
          })) || []

          const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
          })

          const data = await response.json()
          addMessage({ role: 'assistant', content: data.message })
        } catch {
          // Fallback response
          const fallbackIndex = Math.floor(Math.random() * AI_CONFIG.fallbackResponses.length)
          addMessage({ role: 'assistant', content: AI_CONFIG.fallbackResponses[fallbackIndex] })
        } finally {
          set({ isLoading: false })
        }
      },

      toggleWidget: () => {
        set(state => ({ isWidgetOpen: !state.isWidgetOpen }))
      },

      setWidgetOpen: (open) => {
        set({ isWidgetOpen: open })
      },
    }),
    {
      name: 'eadmin-ai-chat-store',
      partialize: (state) => ({
        conversations: state.conversations.slice(0, 20).map(conv => ({
          ...conv,
          messages: conv.messages.slice(-50), // Keep last 50 messages per conversation
        })),
        activeConversationId: state.activeConversationId,
      }),
    }
  )
)
