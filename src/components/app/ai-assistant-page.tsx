'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAiChatStore } from '@/store/ai-chat-store'
import { AI_CONFIG } from '@/lib/ai-config'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, Plus, MessageCircle, Trash2, Loader2,
  Search, FileCheck, ClipboardList, UserCog, Bot, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'

interface QuickAction {
  icon: React.ElementType
  label: string
  description: string
  prompt: string
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Search,
    label: 'Vérifier éligibilité',
    description: 'Vérifiez si vous êtes éligible pour un service',
    prompt: 'Vérifiez si je suis éligible pour [service]',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    icon: ClipboardList,
    label: 'Suivi de demande',
    description: 'Suivez l\'état de votre demande',
    prompt: 'Je veux suivre ma demande référence [ref]',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    icon: FileCheck,
    label: 'Documents requis',
    description: 'Consultez les documents nécessaires',
    prompt: 'Quels documents sont requis pour [service]?',
    color: 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand',
  },
  {
    icon: UserCog,
    label: 'Aide agent',
    description: 'Aide pour le traitement des demandes',
    prompt: 'Comment traiter une demande de type [service]?',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
]

export function AiAssistantPage() {
  const {
    conversations,
    activeConversationId,
    isLoading,
    getMessages,
    sendMessage,
    createConversation,
    setActiveConversation,
    deleteConversation,
    clearMessages,
  } = useAiChatStore()

  const [input, setInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const messages = getMessages()
  const activeConv = conversations.find(c => c.id === activeConversationId)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeConversationId])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    // Create conversation if none
    if (!activeConversationId) {
      createConversation()
    }

    setInput('')
    await sendMessage(trimmed)
  }, [input, isLoading, activeConversationId, createConversation, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleNewChat = useCallback(() => {
    createConversation()
    setInput('')
  }, [createConversation])

  const handleQuickAction = useCallback(async (prompt: string) => {
    if (!activeConversationId) {
      createConversation()
    }
    setInput('')
    await sendMessage(prompt)
  }, [activeConversationId, createConversation, sendMessage])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    })
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background dashboard-bg-v2">
      {/* Left Sidebar - Conversation History */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full border-r border-border glass-premium flex flex-col shrink-0 overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] dark:from-[#0B2E58] dark:to-[#143D6B] flex items-center justify-center shadow-md ring-1 ring-[#C8A45C]/30 dark:ring-[#D4B878]/20">
                    <Sparkles className="h-4 w-4 text-[#C8A45C] dark:text-[#D4B878]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-brand dark:text-primary">Assistant IA</h2>
                    <p className="text-[10px] text-muted-foreground">eAdmin Suite</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground lg:hidden"
                >
                  ✕
                </Button>
              </div>
              <Button
                onClick={handleNewChat}
                className="btn-premium w-full gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Nouvelle conversation
              </Button>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground mt-2">Aucune conversation</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200',
                        activeConversationId === conv.id
                          ? 'bg-gradient-to-r from-[#0B2E58]/10 to-[#3B7DD8]/5 dark:from-[#0B2E58]/20 dark:to-[#3B7DD8]/10 text-[#0B2E58] dark:text-[#3B7DD8] border-l-2 border-[#C8A45C]'
                          : 'hover:bg-muted/50 text-foreground'
                      )}
                      onClick={() => setActiveConversation(conv.id)}
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(conv.updatedAt)} · {conv.messages.length} msg
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <p className="text-[10px] text-muted-foreground text-center">
                République de Guinée · eAdministration Suite
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-border glass-nav shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-sm font-bold text-foreground">
                {activeConv?.title || 'Assistant IA eAdmin'}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {activeConv
                  ? `Conversation · ${activeConv.messages.length} messages`
                  : 'Posez vos questions sur les démarches administratives'
                }
              </p>
            </div>
          </div>
          {activeConversationId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-muted-foreground hover:text-destructive text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Effacer
            </Button>
          )}
        </div>

        {/* Quick Action Cards (shown when no messages or empty conversation) */}
        {messages.length === 0 && (
          <div className="px-6 py-6 shrink-0">
            <div className="text-center mb-6">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] dark:from-[#0B2E58] dark:to-[#143D6B] items-center justify-center mb-3 shadow-lg ring-1 ring-[#C8A45C]/30 dark:ring-[#D4B878]/20">
                <Sparkles className="h-8 w-8 text-[#C8A45C] dark:text-[#D4B878]" />
              </div>
              <h2 className="text-lg font-bold text-gradient-navy">Comment puis-je vous aider?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choisissez une action rapide ou posez votre question
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Card
                  key={action.label}
                  className="card-interactive group"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  <CardContent className="p-4">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-3', action.color)}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-[#0B2E58] dark:group-hover:text-[#3B7DD8] transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-6">
          {messages.length > 0 && (
            <div className="py-4 space-y-4 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0B2E58]/10 to-[#3B7DD8]/10 dark:from-[#0B2E58]/20 dark:to-[#3B7DD8]/20 flex items-center justify-center shrink-0 mt-1 ring-1 ring-[#C8A45C]/20 dark:ring-[#D4B878]/10">
                      <Bot className="h-4 w-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#0B2E58] to-[#143D6B] dark:from-[#143D6B] dark:to-[#1A4A80] text-white rounded-br-md shadow-md'
                        : 'glass-premium text-foreground rounded-bl-md'
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn(
                      'text-[10px] mt-1.5',
                      msg.role === 'user' ? 'text-white/60' : 'text-muted-foreground'
                    )}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0B2E58] to-[#3B7DD8] dark:from-[#0B2E58] dark:to-[#143D6B] flex items-center justify-center shrink-0 mt-1 ring-1 ring-[#C8A45C]/30 dark:ring-[#D4B878]/20">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0B2E58]/10 to-[#3B7DD8]/10 dark:from-[#0B2E58]/20 dark:to-[#3B7DD8]/20 flex items-center justify-center shrink-0 mt-1 ring-1 ring-[#C8A45C]/20 dark:ring-[#D4B878]/10">
                    <Bot className="h-4 w-4 text-[#0B2E58] dark:text-[#3B7DD8]" />
                  </div>
                  <div className="glass-premium rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">L&apos;assistant rédige...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Quick action chips (in-conversation) */}
        {messages.length > 0 && messages.length < 4 && !isLoading && (
          <div className="px-6 pb-2 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-3xl mx-auto">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass-premium hover:border-[#C8A45C]/30 dark:hover:border-[#3B7DD8]/30 transition-all text-muted-foreground hover:text-foreground"
                >
                  <action.icon className="h-3 w-3" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-border glass-nav shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question sur les démarches administratives..."
                  disabled={isLoading}
                  rows={1}
                  className={cn(
                    'w-full resize-none rounded-xl glass-input focus-ring-premium px-4 py-3 pr-12',
                    'text-sm text-foreground placeholder:text-muted-foreground',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'max-h-32 overflow-y-auto'
                  )}
                  style={{
                    height: 'auto',
                    minHeight: '48px',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-12 w-12 rounded-xl btn-premium shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              L&apos;assistant IA peut faire des erreurs. Vérifiez les informations importantes auprès des services compétents.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
