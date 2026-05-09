'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store/app-store'

export function LoginPage() {
  const { login, navigate } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login(email || 'admin@mat.gov.gn', password || 'demo')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2E58] via-[#134A8E] to-[#0B2E58] p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Sparkles className="h-7 w-7 text-[#C8A45C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">eAdministration Suite</h1>
          <p className="text-sm text-white/60 mt-1">DataSphere Innovation — Guinée</p>
        </div>

        <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Connexion</CardTitle>
            <CardDescription className="text-white/50">Accédez à votre espace de travail</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="email"
                    placeholder="admin@mat.gov.gn"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-white/10 text-white placeholder:text-white/30"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="h-4 w-4 text-white/40" /> : <Eye className="h-4 w-4 text-white/40" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-[#C8A45C] hover:bg-[#C8A45C]/90 text-[#0B2E58] font-semibold">
                Se connecter
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => navigate('register')} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                Pas encore de compte ? Créer un compte
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
