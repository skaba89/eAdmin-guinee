'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAiChatStore } from '@/store/ai-chat-store'
import { AI_CONFIG } from '@/lib/ai-config'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, MessageCircle, Loader2, Bot, User, Zap } from 'lucide-react'
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
      {/* ═══════════════════════════════════════════════════════════
          PREMIUM FLOATING BUTTON
          - Gradient navy-to-blue background
          - Gold ring with glow-pulse animation
          - Shimmer overlay
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {!isWidgetOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={toggleWidget}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex items-center justify-center",
              "h-16 w-16 rounded-full",
              "group relative cursor-pointer"
            )}
            aria-label="Ouvrir l'assistant IA"
          >
            {/* Outer glow ring — animated */}
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-glow-pulse",
                "border-2 border-gold/40",
                "before:absolute before:inset-[-3px] before:rounded-full",
                "before:border before:border-gold/20 before:animate-pulse-soft"
              )}
            />

            {/* Main gradient background */}
            <span
              className={cn(
                "absolute inset-[2px] rounded-full",
                "bg-gradient-to-br from-navy via-navy-light to-blue",
                "dark:from-blue dark:via-blue-light dark:to-navy-light",
                "shadow-lg shadow-navy/30 dark:shadow-blue/20",
                "group-hover:shadow-xl group-hover:shadow-gold/20",
                "transition-shadow duration-500"
              )}
            />

            {/* Shimmer overlay */}
            <span
              className={cn(
                "absolute inset-[2px] rounded-full animate-shimmer-gold",
                "opacity-60"
              )}
            />

            {/* Inner light reflection */}
            <span
              className={cn(
                "absolute inset-[2px] rounded-full",
                "bg-gradient-to-b from-white/10 via-transparent to-transparent",
                "pointer-events-none"
              )}
            />

            {/* Icon */}
            <Sparkles
              className={cn(
                "relative z-10 h-6 w-6",
                "text-gold dark:text-gold-light",
                "animate-pulse-soft",
                "group-hover:scale-115 transition-transform duration-300",
                "drop-shadow-[0_0_8px_rgba(200,164,92,0.5)]"
              )}
            />

            {/* Notification dot */}
            {conversations.length === 0 && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 z-20",
                  "h-5 w-5 rounded-full",
                  "bg-gradient-to-br from-gold to-gold-light",
                  "text-[9px] font-bold text-navy",
                  "flex items-center justify-center",
                  "shadow-md shadow-gold/40",
                  "animate-pulse-soft"
                )}
              >
                1
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          PREMIUM CHAT PANEL
          - glass-premium effect
          - Refined border and shadow
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isWidgetOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden",
              "rounded-2xl",
              "glass-premium shadow-premium-lg",
              // Desktop: fixed panel bottom-right
              "bottom-6 right-6 w-[420px] h-[540px]",
              // Tablet: smaller panel
              "max-md:w-[340px] max-md:h-[480px]",
              // Mobile: full width at bottom
              "max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full max-sm:h-[75vh] max-sm:rounded-b-none max-sm:rounded-t-3xl"
            )}
          >
            {/* ═══════════════════════════════════════════════════════
                PREMIUM HEADER
                - Gradient background with mesh
                - Gold accent line
                ═══════════════════════════════════════════════════════ */}
            <div
              className={cn(
                "flex items-center justify-between px-5 py-4 shrink-0",
                "relative overflow-hidden"
              )}
            >
              {/* Header gradient background */}
              <div
                className={cn(
                  "absolute inset-0",
                  "bg-gradient-to-r from-navy via-navy-light to-blue",
                  "dark:from-[#0d2240] dark:via-[#133560] dark:to-[#1a4a80]"
                )}
              />

              {/* Mesh light effect */}
              <div
                className={cn(
                  "absolute inset-0",
                  "bg-[radial-gradient(ellipse_at_30%_0%,rgba(200,164,92,0.12)_0%,transparent_60%)]",
                  "dark:bg-[radial-gradient(ellipse_at_30%_0%,rgba(200,164,92,0.08)_0%,transparent_60%)]"
                )}
              />

              {/* Bottom gold accent line */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-[1px]",
                  "bg-gradient-to-r from-transparent via-gold/40 to-transparent"
                )}
              />

              {/* Content */}
              <div className="flex items-center gap-3 relative z-10">
                {/* Avatar with gold ring */}
                <div className="relative">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-gold/20 to-gold/5",
                      "border border-gold/30",
                      "shadow-[0_0_12px_-2px_rgba(200,164,92,0.25)]"
                    )}
                  >
                    <Bot className="h-5 w-5 text-gold dark:text-gold-light" />
                  </div>
                  {/* Online indicator */}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5",
                      "h-3 w-3 rounded-full",
                      "bg-emerald-400 border-2 border-navy dark:border-[#133560]",
                      "animate-pulse-soft"
                    )}
                  />
                </div>

                <div>
                  <h3
                    className={cn(
                      "text-sm font-semibold text-white",
                      "drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    Assistant eAdmin
                  </h3>
                  <p className="text-[11px] text-white/60 tracking-wide">
                    République de Guinée
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleWidget}
                className={cn(
                  "relative z-10 h-8 w-8 rounded-full",
                  "text-white/60 hover:text-white",
                  "hover:bg-white/10",
                  "transition-all duration-200"
                )}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ═══════════════════════════════════════════════════════
                MESSAGES AREA
                ═══════════════════════════════════════════════════════ */}
            <ScrollArea className="flex-1 px-4 py-3">
              {messages.length === 0 ? (
                /* ── Welcome State ── */
                <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center gap-5">
                  {/* Premium welcome icon */}
                  <div className="relative">
                    <div
                      className={cn(
                        "h-20 w-20 rounded-2xl flex items-center justify-center",
                        "bg-gradient-to-br from-navy/8 to-gold/8",
                        "dark:from-navy/20 dark:to-gold/10",
                        "border border-gold/15 dark:border-gold/10",
                        "animate-float-subtle"
                      )}
                    >
                      <MessageCircle
                        className={cn(
                          "h-9 w-9",
                          "text-navy dark:text-blue-light",
                          "opacity-70"
                        )}
                      />
                    </div>
                    {/* Decorative dots */}
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-gold/30 animate-pulse-soft" />
                    <span className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-blue/25 animate-pulse-soft delay-500" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Bienvenue sur l&apos;Assistant eAdmin
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-[260px]">
                      Comment puis-je vous aider aujourd&apos;hui?
                    </p>
                  </div>

                  {/* Premium Quick Action Chips */}
                  <div className="flex flex-col gap-2.5 w-full max-w-[320px] mt-1">
                    {QUICK_ACTIONS.map((action, i) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        className={cn(
                          "group flex items-center gap-2.5 text-left",
                          "px-4 py-3 rounded-xl",
                          "bg-gradient-to-r from-navy/[0.03] to-gold/[0.03]",
                          "dark:from-navy/10 dark:to-gold/5",
                          "border border-gold/10 dark:border-gold/8",
                          "hover:border-gold/30 dark:hover:border-gold/20",
                          "hover:from-navy/[0.06] hover:to-gold/[0.06]",
                          "dark:hover:from-navy/15 dark:hover:to-gold/8",
                          "hover:shadow-sm hover:shadow-gold/5",
                          "transition-all duration-300",
                          "text-foreground/80 hover:text-foreground",
                          "animate-slide-in-up",
                          i === 0 && "delay-100",
                          i === 1 && "delay-200",
                          i === 2 && "delay-300",
                          i === 3 && "delay-400"
                        )}
                      >
                        <Zap
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            "text-gold dark:text-gold-light",
                            "group-hover:scale-110 transition-transform duration-200"
                          )}
                        />
                        <span className="text-xs leading-relaxed">{action}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Messages ── */
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2.5',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {/* Assistant avatar (left side) */}
                      {msg.role === 'assistant' && (
                        <div
                          className={cn(
                            "shrink-0 mt-1 h-7 w-7 rounded-full flex items-center justify-center",
                            "bg-gradient-to-br from-navy/8 to-gold/8",
                            "dark:from-navy/20 dark:to-gold/10",
                            "border border-gold/15 dark:border-gold/10"
                          )}
                        >
                          <Bot className="h-3.5 w-3.5 text-navy dark:text-blue-light" />
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          "max-w-[82%] px-4 py-3 text-[13px] leading-relaxed",
                          msg.role === 'user'
                            ? [
                                // User: gradient navy-to-blue bubble
                                "rounded-2xl rounded-br-md",
                                "bg-gradient-to-br from-navy to-blue",
                                "dark:from-blue/80 dark:to-navy-light/80",
                                "text-white",
                                "shadow-md shadow-navy/10 dark:shadow-blue/10",
                                "relative overflow-hidden",
                              ]
                            : [
                                // Assistant: glass-premium bubble
                                "rounded-2xl rounded-bl-md",
                                "glass-premium",
                                "text-foreground",
                              ]
                        )}
                      >
                        {/* User bubble inner light */}
                        {msg.role === 'user' && (
                          <span
                            className={cn(
                              "absolute inset-0 pointer-events-none",
                              "bg-gradient-to-b from-white/8 via-transparent to-transparent",
                              "rounded-2xl rounded-br-md"
                            )}
                          />
                        )}
                        <span className="relative z-10">{msg.content}</span>
                      </div>

                      {/* User avatar (right side) */}
                      {msg.role === 'user' && (
                        <div
                          className={cn(
                            "shrink-0 mt-1 h-7 w-7 rounded-full flex items-center justify-center",
                            "bg-gradient-to-br from-gold/20 to-gold/5",
                            "dark:from-gold/15 dark:to-gold/5",
                            "border border-gold/20 dark:border-gold/10"
                          )}
                        >
                          <User className="h-3.5 w-3.5 text-gold dark:text-gold-light" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                      <div
                        className={cn(
                          "shrink-0 mt-1 h-7 w-7 rounded-full flex items-center justify-center",
                          "bg-gradient-to-br from-navy/8 to-gold/8",
                          "dark:from-navy/20 dark:to-gold/10",
                          "border border-gold/15 dark:border-gold/10"
                        )}
                      >
                        <Bot className="h-3.5 w-3.5 text-navy dark:text-blue-light animate-pulse-soft" />
                      </div>
                      <div className="glass-premium rounded-2xl rounded-bl-md px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              "bg-gold/40 dark:bg-gold/30",
                              "animate-bounce [animation-delay:-0.3s]"
                            )}
                          />
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              "bg-gold/50 dark:bg-gold/40",
                              "animate-bounce [animation-delay:-0.15s]"
                            )}
                          />
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              "bg-gold/60 dark:bg-gold/50",
                              "animate-bounce"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* ═══════════════════════════════════════════════════════
                INLINE QUICK ACTIONS (early conversation)
                ═══════════════════════════════════════════════════════ */}
            {messages.length > 0 && messages.length < 3 && !isLoading && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleQuickAction(action)}
                      className={cn(
                        "shrink-0 text-left flex items-center gap-1.5",
                        "px-3 py-1.5 rounded-full",
                        "text-[10px] leading-tight",
                        "bg-gradient-to-r from-navy/[0.04] to-gold/[0.04]",
                        "dark:from-navy/15 dark:to-gold/8",
                        "border border-gold/10 dark:border-gold/8",
                        "text-muted-foreground hover:text-foreground",
                        "hover:border-gold/25 dark:hover:border-gold/18",
                        "hover:shadow-sm hover:shadow-gold/5",
                        "transition-all duration-250",
                        "whitespace-nowrap"
                      )}
                    >
                      <Zap className="h-2.5 w-2.5 text-gold dark:text-gold-light shrink-0" />
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                PREMIUM INPUT AREA
                - glass-input effect
                - focus-ring-premium
                - btn-gold send button
                ═══════════════════════════════════════════════════════ */}
            <div
              className={cn(
                "px-4 py-3.5 shrink-0",
                "relative",
                "border-t border-gold/8 dark:border-gold/5"
              )}
            >
              {/* Top gold accent line */}
              <div
                className={cn(
                  "absolute top-0 left-4 right-4 h-[1px]",
                  "bg-gradient-to-r from-transparent via-gold/15 to-transparent"
                )}
              />

              <div className="flex items-center gap-2.5">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tapez votre message..."
                    disabled={isLoading}
                    className={cn(
                      "h-10 text-sm rounded-xl",
                      "glass-input focus-ring-premium",
                      "pr-4 pl-4",
                      "placeholder:text-muted-foreground/50"
                    )}
                  />
                </div>

                {/* Premium send button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-xl",
                    "flex items-center justify-center",
                    "btn-gold",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "disabled:hover:transform-none disabled:hover:shadow-none",
                    "transition-all duration-300"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-navy" />
                  ) : (
                    <Send className="h-4 w-4 text-navy" />
                  )}
                </button>
              </div>

              {/* Subtle branding text */}
              <p className="text-[9px] text-muted-foreground/40 text-center mt-2 tracking-wider">
                eAdmin IA • République de Guinée
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
