'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface PageLoaderProps {
  isVisible: boolean
}

export function PageLoader({ isVisible }: PageLoaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          {/* Guinea tricolor bars */}
          <div className="flex gap-1.5 mb-6">
            {/* Red bar */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [0, 1.2, 0.8, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 0.4,
                ease: 'easeInOut',
              }}
              className="w-2.5 h-16 rounded-full bg-[#CE1126] origin-bottom"
            />
            {/* Yellow bar */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [0, 1.2, 0.8, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 0.4,
                ease: 'easeInOut',
                delay: 0.15,
              }}
              className="w-2.5 h-16 rounded-full bg-[#FCD116] origin-bottom"
            />
            {/* Green bar */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [0, 1.2, 0.8, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 0.4,
                ease: 'easeInOut',
                delay: 0.3,
              }}
              className="w-2.5 h-16 rounded-full bg-[#009460] origin-bottom"
            />
          </div>

          {/* Logo icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="mb-4"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#C8A45C] to-[#E0C98A] flex items-center justify-center shadow-lg shadow-[#C8A45C]/20">
              <Sparkles className="h-5 w-5 text-[#0B2E58]" />
            </div>
          </motion.div>

          {/* Loading text */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-medium text-muted-foreground"
          >
            Chargement...
          </motion.p>

          {/* Progress shimmer line */}
          <div className="mt-4 w-48 h-1 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#009460]"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
