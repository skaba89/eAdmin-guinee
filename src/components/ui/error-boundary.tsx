'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  // Sanitize error message to avoid leaking sensitive info
  getSanitizedMessage(): string {
    const msg = this.state.error?.message || 'Une erreur inattendue est survenue.'
    // Only show first 200 chars, strip any potential sensitive paths
    return msg.slice(0, 200).replace(/\/[^\s]+/g, '[path]')
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center">
            {/* Guinea tricolor accent */}
            <div className="flex h-1 mb-8 rounded-full overflow-hidden">
              <div className="flex-1 bg-[#CE1126]" />
              <div className="flex-1 bg-[#FCD116]" />
              <div className="flex-1 bg-[#009460]" />
            </div>

            {/* Error icon */}
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-[#CE1126]" />
            </div>

            {/* Error heading */}
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Une erreur est survenue
            </h1>

            {/* Error message */}
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
              La plateforme eAdministration a rencontré un problème inattendu.
              Veuillez réessayer ou contacter le support technique.
            </p>

            {/* Sanitized technical message */}
            <div className="mb-6 p-3 rounded-lg bg-muted text-xs text-muted-foreground font-mono break-words">
              {this.getSanitizedMessage()}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={this.handleRetry}
                className="w-full sm:w-auto gap-2 bg-[#0B2E58] hover:bg-[#0B2E58]/90 text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto gap-2"
              >
                <Home className="h-4 w-4" />
                Retour à l&apos;accueil
              </Button>
            </div>

            {/* Branding */}
            <div className="mt-8 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                eAdministration Suite — République de Guinée
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
