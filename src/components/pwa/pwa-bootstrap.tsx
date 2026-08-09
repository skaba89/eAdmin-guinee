'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { CloudOff, RefreshCw, Wifi } from 'lucide-react'

function subscribeNetworkStatus(onStoreChange: () => void) {
  window.addEventListener('online', onStoreChange)
  window.addEventListener('offline', onStoreChange)
  return () => {
    window.removeEventListener('online', onStoreChange)
    window.removeEventListener('offline', onStoreChange)
  }
}

function getNetworkSnapshot() {
  return navigator.onLine
}

function getServerNetworkSnapshot() {
  return true
}

export function PwaBootstrap() {
  const online = useSyncExternalStore(
    subscribeNetworkStatus,
    getNetworkSnapshot,
    getServerNetworkSnapshot
  )
  const [recovered, setRecovered] = useState(false)

  useEffect(() => {
    let recoveryTimer: number | undefined

    const handleOnline = () => {
      setRecovered(true)
      if (recoveryTimer !== undefined) {
        window.clearTimeout(recoveryTimer)
      }
      recoveryTimer = window.setTimeout(() => setRecovered(false), 4000)
    }
    const handleOffline = () => {
      setRecovered(false)
      if (recoveryTimer !== undefined) {
        window.clearTimeout(recoveryTimer)
        recoveryTimer = undefined
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('serviceWorker' in navigator && window.location.protocol !== 'http:') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // The web application remains fully usable online when SW registration
        // is blocked by the browser or deployment policy.
      })
    } else if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (recoveryTimer !== undefined) {
        window.clearTimeout(recoveryTimer)
      }
    }
  }, [])

  if (online && !recovered) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        online
          ? 'fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-medium text-emerald-700 shadow-lg dark:border-emerald-900 dark:bg-[#0B1F38] dark:text-emerald-300'
          : 'fixed bottom-4 left-1/2 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-medium text-amber-800 shadow-lg dark:border-amber-900 dark:bg-[#0B1F38] dark:text-amber-300'
      }
    >
      {online ? (
        <>
          <Wifi className="h-4 w-4" aria-hidden="true" />
          Connexion rétablie
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Réseau indisponible — le contenu public déjà consulté reste accessible.
            Les opérations sécurisées reprendront en ligne.
          </span>
        </>
      )}
    </div>
  )
}
