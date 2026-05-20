import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  actions?: ChatAction[]
  metadata?: Record<string, unknown>
}

export interface ChatAction {
  id: string
  label: string
  type: 'navigate' | 'submit_request' | 'check_status' | 'list_services' | 'show_requirements' | 'auto_process'
  params: Record<string, unknown>
  executed?: boolean
}

export interface AutonomousTask {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  type: 'status_check' | 'document_reminder' | 'auto_submit' | 'notification' | 'suggestion'
  createdAt: string
  completedAt?: string
  result?: string
  params: Record<string, unknown>
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  isActive: boolean
}

interface AIAssistantState {
  conversations: Conversation[]
  activeConversationId: string | null
  autonomousTasks: AutonomousTask[]
  isProcessing: boolean
  chatbotOpen: boolean
  unreadCount: number

  // Actions
  openChatbot: () => void
  closeChatbot: () => void
  toggleChatbot: () => void
  createConversation: () => string
  addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setActiveConversation: (id: string) => void
  setProcessing: (processing: boolean) => void
  addAutonomousTask: (task: Omit<AutonomousTask, 'id' | 'createdAt' | 'status'>) => string
  updateTaskStatus: (id: string, status: AutonomousTask['status'], result?: string) => void
  clearConversations: () => void
  markActionExecuted: (conversationId: string, messageId: string, actionId: string) => void
  getActiveConversation: () => Conversation | null
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Bonjour ! Je suis **l'Agent IA d'eAdmin Guinée** 🇬🇳

Je suis votre assistant intelligent pour les démarches administratives. Voici ce que je peux faire pour vous :

• **Vérifier le statut** d'une demande en cours
• **Trouver le service** adapté à votre besoin
• **Lister les documents requis** pour chaque démarche
• **Soumettre des demandes simples** automatiquement
• **Vous guider** dans vos démarches administratives
• **Répondre** à vos questions sur les services publics

Comment puis-je vous aider aujourd'hui ?`,
  timestamp: new Date().toISOString(),
  actions: [
    { id: 'act-status', label: 'Vérifier le statut d\'une demande', type: 'check_status', params: {} },
    { id: 'act-services', label: 'Voir les services disponibles', type: 'list_services', params: {} },
    { id: 'act-submit', label: 'Soumettre une nouvelle demande', type: 'submit_request', params: {} },
  ],
}

export const useAIAssistantStore = create<AIAssistantState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      autonomousTasks: [],
      isProcessing: false,
      chatbotOpen: false,
      unreadCount: 0,

      openChatbot: () => set({ chatbotOpen: true, unreadCount: 0 }),
      closeChatbot: () => set({ chatbotOpen: false }),
      toggleChatbot: () => set((state) => ({ chatbotOpen: !state.chatbotOpen, unreadCount: 0 })),

      createConversation: () => {
        const id = `conv-${Date.now()}`
        const conversation: Conversation = {
          id,
          title: 'Nouvelle conversation',
          messages: [{ ...WELCOME_MESSAGE, id: generateId(), timestamp: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        }
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }))
        return id
      },

      addMessage: (conversationId, message) => {
        const msg: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, msg],
                  updatedAt: new Date().toISOString(),
                  title: conv.messages.length <= 1 && message.role === 'user'
                    ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                    : conv.title,
                }
              : conv
          ),
          unreadCount: state.chatbotOpen ? 0 : (message.role === 'assistant' ? state.unreadCount + 1 : state.unreadCount),
        }))
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      setProcessing: (processing) => set({ isProcessing: processing }),

      addAutonomousTask: (task) => {
        const id = generateTaskId()
        const newTask: AutonomousTask = {
          ...task,
          id,
          createdAt: new Date().toISOString(),
          status: 'pending',
        }
        set((state) => ({
          autonomousTasks: [newTask, ...state.autonomousTasks],
        }))
        return id
      },

      updateTaskStatus: (id, status, result) => {
        set((state) => ({
          autonomousTasks: state.autonomousTasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status,
                  result: result || task.result,
                  completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : task.completedAt,
                }
              : task
          ),
        }))
      },

      clearConversations: () => set({ conversations: [], activeConversationId: null }),

      markActionExecuted: (conversationId, messageId, actionId) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          actions: msg.actions?.map((a) =>
                            a.id === actionId ? { ...a, executed: true } : a
                          ),
                        }
                      : msg
                  ),
                }
              : conv
          ),
        }))
      },

      getActiveConversation: () => {
        const state = get()
        return state.conversations.find((c) => c.id === state.activeConversationId) || null
      },
    }),
    {
      name: 'eadmin-ai-assistant',
      partialize: (state) => ({
        conversations: state.conversations.slice(0, 10).map((conv) => ({
          ...conv,
          messages: conv.messages.slice(-50),
        })),
        autonomousTasks: state.autonomousTasks.slice(0, 20),
      }),
    }
  )
)
