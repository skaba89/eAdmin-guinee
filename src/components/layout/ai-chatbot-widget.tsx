'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, X, Send, Sparkles, ChevronDown, Loader2,
  FileText, Search, Plus, CheckCircle2, ArrowRight,
  Mic, MicOff, Volume2, VolumeX, Trash2, MessageSquare,
  Zap, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAIAssistantStore, type ChatMessage, type ChatAction } from '@/store/ai-assistant-store'
import { useAppStore, type AppPage } from '@/store/app-store'
import { useCitizenRequestsStore } from '@/store/citizen-requests-store'

// ─── GUINEA BRAND ─────────────────────────────────────────────────────────────
const BRAND_PRIMARY = '#0B2E58'
const BRAND_GOLD = '#C8A45C'

// ─── QUICK ACTION CHIPS ───────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: 'Statut demande', icon: Search, prompt: 'Quel est le statut de ma demande ?' },
  { label: 'Documents requis', icon: FileText, prompt: 'Quels documents sont requis pour ?' },
  { label: 'Nouvelle demande', icon: Plus, prompt: 'Je veux soumettre une nouvelle demande' },
  { label: 'Liste services', icon: MessageSquare, prompt: 'Quels sont les services disponibles ?' },
]

// ─── MARKDOWN-LIKE RENDERER ───────────────────────────────────────────────────
function renderFormattedText(text: string) {
  // Simple markdown-like rendering
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Bold
    let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>')

    if (processed.startsWith('• ') || processed.startsWith('- ')) {
      return <div key={i} className="flex gap-2 ml-1"><span className="text-brand dark:text-blue-400 shrink-0">•</span><span dangerouslySetInnerHTML={{ __html: processed.slice(2) }} /></div>
    }
    if (/^\d️⃣/.test(processed) || /^\d+\./.test(processed)) {
      return <div key={i} className="ml-1" dangerouslySetInnerHTML={{ __html: processed }} />
    }
    if (processed.trim() === '') return <div key={i} className="h-2" />
    return <div key={i} dangerouslySetInnerHTML={{ __html: processed }} />
  })
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
  onAction,
}: {
  message: ChatMessage
  onAction: (action: ChatAction) => void
}) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`max-w-[88%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className="flex items-start gap-2">
          {!isUser && !isSystem && (
            <div className="shrink-0 mt-1">
              <div className="h-7 w-7 rounded-full flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_GOLD})` }}>
                <Bot className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
          <div>
            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-brand text-white rounded-br-md'
                : isSystem
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-bl-md'
                : 'bg-muted/80 dark:bg-muted/40 text-foreground rounded-bl-md border border-border/50'
            }`}>
              {isUser ? (
                <p>{message.content}</p>
              ) : (
                <div className="space-y-1">
                  {renderFormattedText(message.content)}
                </div>
              )}
            </div>

            {/* Actions */}
            {message.actions && message.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {message.actions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.executed ? 'ghost' : 'outline'}
                    className={`text-xs h-7 gap-1 rounded-full ${
                      action.executed
                        ? 'opacity-50 line-through'
                        : 'hover:bg-brand hover:text-white border-brand/30 text-brand dark:text-blue-400 dark:border-blue-400/30 dark:hover:bg-blue-500 dark:hover:text-white'
                    }`}
                    onClick={() => !action.executed && onAction(action)}
                  >
                    {action.executed ? <CheckCircle2 className="size-3" /> : <Zap className="size-3" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <p className={`text-[10px] text-muted-foreground mt-1 ${isUser ? 'text-right' : ''}`}>
              {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {!isUser && message.metadata?.source === 'ai' && (
                <Badge variant="outline" className="ml-1.5 text-[8px] h-4 px-1.5 gap-0.5 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                  <Sparkles className="size-2.5" /> IA
                </Badge>
              )}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── MAIN CHATBOT WIDGET ──────────────────────────────────────────────────────
export function AIChatbotWidget() {
  const {
    chatbotOpen, toggleChatbot, closeChatbot, openChatbot,
    activeConversationId, createConversation, addMessage,
    setProcessing, isProcessing, getActiveConversation,
    markActionExecuted, conversations,
  } = useAIAssistantStore()

  const navigate = useAppStore((s) => s.navigate)
  const isAuth = useAppStore((s) => s.isAuth)
  const user = useAppStore((s) => s.user)
  const { requests } = useCitizenRequestsStore()

  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeConversation = getActiveConversation()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages.length])

  // Focus input when chatbot opens
  useEffect(() => {
    if (chatbotOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [chatbotOpen])

  // Ensure conversation exists
  const ensureConversation = useCallback(() => {
    if (!activeConversationId) {
      return createConversation()
    }
    return activeConversationId
  }, [activeConversationId, createConversation])

  // Send message to API
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return

    const convId = ensureConversation()
    const trimmed = text.trim()

    // Add user message
    addMessage(convId, { role: 'user', content: trimmed })
    setInput('')
    setProcessing(true)

    try {
      const conversation = useAIAssistantStore.getState().conversations.find(c => c.id === convId)
      const history = conversation?.messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })) || []

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: {
            currentPage: useAppStore.getState().currentPage,
            userRole: user?.role,
            userName: user?.firstName,
            conversationHistory: history,
          },
        }),
      })

      const data = await response.json()

      // Determine actions based on response content
      const actions: ChatAction[] = []

      if (/statut|suivi|avancement/i.test(trimmed)) {
        actions.push({
          id: `act-nav-suivi-${Date.now()}`,
          label: 'Aller au Suivi',
          type: 'navigate',
          params: { page: 'citizen-portal', tab: 'suivi' },
        })
      }

      if (/demande|soumettre|nouvelle/i.test(trimmed) && /service|document|certificat/i.test(trimmed)) {
        actions.push({
          id: `act-nav-services-${Date.now()}`,
          label: 'Voir les services',
          type: 'navigate',
          params: { page: 'citizen-portal', tab: 'services' },
        })
      }

      if (/liste|catalogue|services disponibles/i.test(trimmed)) {
        actions.push({
          id: `act-nav-catalog-${Date.now()}`,
          label: 'Catalogue services',
          type: 'navigate',
          params: { page: 'citizen-portal', tab: 'services' },
        })
      }

      addMessage(convId, {
        role: 'assistant',
        content: data.message || data.error || 'Désolé, je n\'ai pas pu traiter votre demande.',
        actions: actions.length > 0 ? actions : undefined,
        metadata: { source: data.source },
      })
    } catch {
      addMessage(convId, {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue lors du traitement. Veuillez réessayer.',
      })
    } finally {
      setProcessing(false)
    }
  }, [isProcessing, ensureConversation, addMessage, setProcessing, user])

  // Handle action click
  const handleAction = useCallback((action: ChatAction) => {
    const convId = activeConversationId
    if (!convId) return

    // Mark action as executed
    // Find the message containing this action
    const conv = useAIAssistantStore.getState().conversations.find(c => c.id === convId)
    if (conv) {
      const msgWithAction = conv.messages.find(m => m.actions?.some(a => a.id === action.id))
      if (msgWithAction) {
        markActionExecuted(convId, msgWithAction.id, action.id)
      }
    }

    switch (action.type) {
      case 'navigate':
        navigate((action.params.page as AppPage) || 'dashboard')
        closeChatbot()
        break
      case 'check_status':
        sendMessage('Quel est le statut de mes demandes en cours ?')
        break
      case 'list_services':
        sendMessage('Quels sont les services disponibles ?')
        break
      case 'submit_request':
        sendMessage('Je veux soumettre une nouvelle demande. Quels sont les services disponibles ?')
        break
      case 'show_requirements':
        sendMessage(`Quels documents sont requis pour ${action.params.service || 'ce service'} ?`)
        break
      case 'auto_process':
        if (action.params.task === 'check_all_status' && requests.length > 0) {
          const summary = requests.slice(0, 5).map(r =>
            `• **${r.serviceName}** (${r.reference}) : ${r.status === 'soumise' ? 'Soumise' : r.status === 'en_cours' ? 'En cours' : r.status === 'prete' ? 'Document prêt !' : r.status === 'livree' ? 'Livrée' : r.status}`
          ).join('\n')
          sendMessage(`Voici le résumé de vos demandes :\n\n${summary}`)
        }
        break
    }
  }, [activeConversationId, markActionExecuted, navigate, closeChatbot, sendMessage, requests])

  // Voice input (Web Speech API)
  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return
    }
    if (isListening) {
      setIsListening(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }, [isListening])

  // Text-to-speech
  const speakLastResponse = useCallback(() => {
    if (!activeConversation?.messages.length) return
    const lastAssistant = [...activeConversation.messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(lastAssistant.content.replace(/\*\*/g, '').replace(/[•🔴🟡🟢✅⏳🔄📋📝🏛️⏱️💡💰🔍📌1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣😊🇬🇳⚡🖥️🔐💻]/g, ''))
    utterance.lang = 'fr-FR'
    utterance.rate = 0.9
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }, [activeConversation, isSpeaking])

  // Count unread
  const unreadCount = useAIAssistantStore((s) => s.unreadCount)

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          FLOATING CHAT BUTTON
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {!chatbotOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChatbot}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all group"
            style={{ background: `linear-gradient(135deg, ${BRAND_PRIMARY}, #134A8E)` }}
          >
            <Bot className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.div>
            )}
            {/* Pulse animation */}
            <div className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: BRAND_GOLD }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          CHATBOT PANEL
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {chatbotOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 right-4 z-50 w-[400px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card"
            style={{ height: 'min(600px, calc(100vh - 120px))' }}
          >
            {/* ─── HEADER ───────────────────────────────────────────────── */}
            <div
              className="shrink-0 px-4 py-3 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${BRAND_PRIMARY}, #134A8E)` }}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/15 backdrop-blur-sm shadow-inner">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Agent IA
                    <Badge className="bg-emerald-400/20 text-emerald-200 border-emerald-400/30 text-[8px] h-4 px-1.5 gap-0.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      En ligne
                    </Badge>
                  </h3>
                  <p className="text-[10px] text-white/60">eAdministration Suite Guinea</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={() => navigate('ai-assistant')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Ouvrir la page complète</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={closeChatbot}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* ─── AUTONOMOUS TASK INDICATOR ────────────────────────────── */}
            {isAuth && requests.length > 0 && (
              <div className="shrink-0 px-3 py-2 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-900/10 dark:to-sky-900/10 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    {requests.filter(r => r.status === 'prete').length > 0
                      ? `${requests.filter(r => r.status === 'prete').length} document(s) prêt(s) à retirer`
                      : `${requests.filter(r => ['en_cours', 'pieces_complementaires'].includes(r.status)).length} demande(s) en traitement`
                    }
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-[10px] h-auto p-0 ml-auto text-brand dark:text-blue-400"
                    onClick={() => sendMessage('Quel est le statut de mes demandes en cours ?')}
                  >
                    Vérifier
                    <ArrowRight className="size-2.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ─── MESSAGES ─────────────────────────────────────────────── */}
            <ScrollArea className="flex-1 px-3 py-3">
              {activeConversation?.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onAction={handleAction}
                />
              ))}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2 mb-3"
                >
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_GOLD})` }}>
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted/60 dark:bg-muted/30 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyse en cours...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* ─── QUICK CHIPS ──────────────────────────────────────────── */}
            {activeConversation?.messages.length === 1 && (
              <div className="shrink-0 px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => sendMessage(chip.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-brand/10 text-muted-foreground hover:text-brand dark:hover:text-blue-400 border border-border/50 transition-all"
                  >
                    <chip.icon className="size-3" />
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* ─── INPUT BAR ────────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-border/50 p-3 space-y-2">
              {/* Voice & TTS controls */}
              {activeConversation?.messages.length && activeConversation.messages.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-muted-foreground'}`}
                          onClick={toggleVoice}
                        >
                          {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isListening ? 'Arrêter l\'écoute' : 'Entrée vocale'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${isSpeaking ? 'text-brand bg-brand/10 dark:text-blue-400 dark:bg-blue-400/10' : 'text-muted-foreground'}`}
                          onClick={speakLastResponse}
                        >
                          {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isSpeaking ? 'Arrêter la lecture' : 'Lire la réponse'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <span className="text-[10px] text-muted-foreground flex-1">
                    {isListening ? '🎙️ Parlez maintenant...' : 'Agent IA autonome • Support 24/7'}
                  </span>
                </div>
              )}

              {/* Input + Send */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(input)
                }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="flex-1 h-9 text-sm rounded-xl bg-muted/50 border-border/50 focus:border-brand/50 dark:focus:border-blue-400/50"
                  disabled={isProcessing}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isProcessing}
                  className="h-9 w-9 rounded-xl shrink-0"
                  style={{ background: `linear-gradient(135deg, ${BRAND_PRIMARY}, #134A8E)` }}
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
