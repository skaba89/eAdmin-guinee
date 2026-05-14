'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAiChatStore } from '@/store/ai-chat-store'
import { AI_CONFIG } from '@/lib/ai-config'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

const QUICK_ACTIONS = [
  'Comment faire une demande d\'acte de naissance?',
  'Quels documents pour un passeport?',
  'Suivre ma demande',
  'Aide pour les agents',
]

export function AiChatbotWidget() {
  const {
    isWidgetOpen,
    toggleWidget,
    isLoading,
    getMessages,
    sendMessage,
    createConversation,
    activeConversationId,
    conversations,
  } = useAiChatStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = getMessages()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isWidgetOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isWidgetOpen])

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

  const handleQuickAction = useCallback(async (action: string) => {
    if (!activeConversationId) {
      createConversation()
    }
    await sendMessage(action)
  }, [activeConversationId, createConversation, sendMessage])

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isWidgetOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={toggleWidget}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-brand/30 flex items-center justify-center bg-brand hover:bg-brand/90 transition-colors group"
            aria-label="Ouvrir l'assistant IA"
          >
            <Sparkles className="h-6 w-6 text-gold animate-pulse-soft group-hover:scale-110 transition-transform" />
            {/* Notification dot */}
            {conversations.length === 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gold text-[9px] font-bold text-brand flex items-center justify-center">
                1
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isWidgetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              "fixed z-50 flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden",
              "bg-card text-card-foreground",
              // Desktop: fixed panel bottom-right
              "bottom-6 right-6 w-[400px] h-[500px]",
              // Mobile: full width at bottom
              "max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full max-sm:h-[70vh] max-sm:rounded-b-none max-sm:rounded-t-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-brand text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Assistant eAdmin</h3>
                  <p className="text-[10px] text-white/70">République de Guinée</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleWidget}
                className="h-7 w-7 rounded-full text-white/80 hover:text-white hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-brand dark:text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Bienvenue sur l&apos;Assistant eAdmin</p>
                    <p className="text-xs text-muted-foreground mt-1">Comment puis-je vous aider aujourd&apos;hui?</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2 w-full max-w-[320px] mt-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        className="text-left px-3 py-2 rounded-lg text-xs bg-muted/50 hover:bg-muted border border-border/50 hover:border-brand/30 transition-colors text-foreground"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-brand text-white rounded-2xl rounded-br-md'
                            : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Quick Actions (when in conversation) */}
            {messages.length > 0 && messages.length < 3 && !isLoading && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleQuickAction(action)}
                      className="shrink-0 text-left px-2.5 py-1.5 rounded-full text-[10px] bg-muted/50 hover:bg-muted border border-border/50 hover:border-brand/30 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-border shrink-0 bg-card">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tapez votre message..."
                  disabled={isLoading}
                  className="flex-1 h-9 text-sm rounded-full bg-muted/50 border-border/50 focus-visible:border-brand/50"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-9 w-9 rounded-full bg-brand hover:bg-brand/90 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
