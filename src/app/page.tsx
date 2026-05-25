'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useAppStore, ROLE_DEFAULT_PAGE, type AppPage } from '@/store/app-store'
import { useCitizenRequestsStore } from '@/store/citizen-requests-store'
import { canAccessPage, getDefaultPage } from '@/lib/rbac'

// Lazy load all page components to reduce initial bundle size
const LandingPage = dynamic(() => import('@/components/landing/landing-page').then(m => ({ default: m.LandingPage })), { ssr: false })
const AboutPage = dynamic(() => import('@/components/landing/about-page').then(m => ({ default: m.AboutPage })), { ssr: false })
const ServicesPage = dynamic(() => import('@/components/landing/services-page').then(m => ({ default: m.ServicesPage })), { ssr: false })
const SolutionsPage = dynamic(() => import('@/components/landing/solutions-page').then(m => ({ default: m.SolutionsPage })), { ssr: false })
const PricingPage = dynamic(() => import('@/components/landing/pricing-page').then(m => ({ default: m.PricingPage })), { ssr: false })
const ContactPage = dynamic(() => import('@/components/landing/contact-page').then(m => ({ default: m.ContactPage })), { ssr: false })
const BlogPage = dynamic(() => import('@/components/landing/blog-page').then(m => ({ default: m.BlogPage })), { ssr: false })
const FAQPage = dynamic(() => import('@/components/landing/faq-page').then(m => ({ default: m.FAQPage })), { ssr: false })
const DemoPage = dynamic(() => import('@/components/landing/demo-page').then(m => ({ default: m.DemoPage })), { ssr: false })
const LoginPage = dynamic(() => import('@/components/auth/login-page').then(m => ({ default: m.LoginPage })), { ssr: false })
const RegisterPage = dynamic(() => import('@/components/auth/register-page').then(m => ({ default: m.RegisterPage })), { ssr: false })
const AppSidebar = dynamic(() => import('@/components/layout/app-sidebar').then(m => ({ default: m.AppSidebar })), { ssr: false })
const AppHeader = dynamic(() => import('@/components/layout/app-header').then(m => ({ default: m.AppHeader })), { ssr: false })
const DashboardPage = dynamic(() => import('@/components/app/dashboard-page'), { ssr: false })
const AnalyticsPage = dynamic(() => import('@/components/app/analytics-page'), { ssr: false })
const GedPage = dynamic(() => import('@/components/app/ged-page').then(m => ({ default: m.GedPage })), { ssr: false })
const CourriersPage = dynamic(() => import('@/components/app/courriers-page').then(m => ({ default: m.CourriersPage })), { ssr: false })
const WorkflowPage = dynamic(() => import('@/components/app/workflow-page').then(m => ({ default: m.WorkflowPage })), { ssr: false })
const SignaturesPage = dynamic(() => import('@/components/app/signatures-page').then(m => ({ default: m.SignaturesPage })), { ssr: false })
const CitizenPortalPage = dynamic(() => import('@/components/app/citizen-portal-page').then(m => ({ default: m.CitizenPortalPage })), { ssr: false })
const AdminPage = dynamic(() => import('@/components/app/admin-page').then(m => ({ default: m.AdminPage })), { ssr: false })
const UsersPage = dynamic(() => import('@/components/app/users-page').then(m => ({ default: m.UsersPage })), { ssr: false })
const SettingsPage = dynamic(() => import('@/components/app/settings-page').then(m => ({ default: m.SettingsPage })), { ssr: false })
const NotificationsPage = dynamic(() => import('@/components/app/notifications-page').then(m => ({ default: m.NotificationsPage })), { ssr: false })
const AuditLogsPage = dynamic(() => import('@/components/app/audit-logs-page').then(m => ({ default: m.AuditLogsPage })), { ssr: false })
const PublicNav = dynamic(() => import('@/components/landing/public-nav').then(m => ({ default: m.PublicNav })), { ssr: false })
const PublicCitizenPortal = dynamic(() => import('@/components/landing/public-citizen-portal').then(m => ({ default: m.PublicCitizenPortal })), { ssr: false })
const ServiceRequestsPage = dynamic(() => import('@/components/app/service-requests-page').then(m => ({ default: m.ServiceRequestsPage })), { ssr: false })
const MairieDashboardPage = dynamic(() => import('@/components/app/mairie-dashboard-page').then(m => ({ default: m.MairieDashboardPage })), { ssr: false })
const AgenceDashboardPage = dynamic(() => import('@/components/app/agence-dashboard-page').then(m => ({ default: m.AgenceDashboardPage })), { ssr: false })
const AgentDashboardPage = dynamic(() => import('@/components/app/agent-dashboard-page').then(m => ({ default: m.AgentDashboardPage })), { ssr: false })
const ChefServiceDashboardPage = dynamic(() => import('@/components/app/chef-service-dashboard-page').then(m => ({ default: m.ChefServiceDashboardPage })), { ssr: false })
const MinistreDashboardPage = dynamic(() => import('@/components/app/ministre-dashboard-page').then(m => ({ default: m.MinistreDashboardPage })), { ssr: false })
const BirthCertificateDbPage = dynamic(() => import('@/components/app/birth-certificate-db-page').then(m => ({ default: m.BirthCertificateDbPage })), { ssr: false })
const AiAssistantPage = dynamic(() => import('@/components/app/ai-assistant-page').then(m => ({ default: m.AiAssistantPage })), { ssr: false })
const AiChatbotWidget = dynamic(() => import('@/components/app/ai-chatbot-widget').then(m => ({ default: m.AiChatbotWidget })), { ssr: false })
const MfaPage = dynamic(() => import('@/components/auth/mfa-page').then(m => ({ default: m.MfaPage })), { ssr: false })

const publicPages: Record<string, React.ComponentType> = {
  landing: LandingPage,
  about: AboutPage,
  services: ServicesPage,
  solutions: SolutionsPage,
  pricing: PricingPage,
  contact: ContactPage,
  blog: BlogPage,
  faq: FAQPage,
  demo: DemoPage,
  'public-citizen-portal': PublicCitizenPortal,
}

const authPages: Record<string, React.ComponentType> = {
  login: LoginPage,
  register: RegisterPage,
  mfa: MfaPage,
}

const appPages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  ged: GedPage,
  courriers: CourriersPage,
  workflow: WorkflowPage,
  signatures: SignaturesPage,
  analytics: AnalyticsPage,
  'citizen-portal': CitizenPortalPage,
  admin: AdminPage,
  users: UsersPage,
  settings: SettingsPage,
  notifications: NotificationsPage,
  'audit-logs': AuditLogsPage,
  'service-requests': ServiceRequestsPage,
  'mairie-dashboard': MairieDashboardPage,
  'agence-dashboard': AgenceDashboardPage,
  'agent-dashboard': AgentDashboardPage,
  'chef-service-dashboard': ChefServiceDashboardPage,
  'ministre-dashboard': MinistreDashboardPage,
  'birth-certificate-db': BirthCertificateDbPage,
  'ai-assistant': AiAssistantPage,
}

// RBAC is now centralized in src/lib/rbac.ts — canAccessPage() and getDefaultPage()
// No more duplicate ROLE_PAGE_ACCESS here.

export default function Home() {
  const { currentPage, isAuth, user, navigate } = useAppStore()
  const checkAndRejectExpiredRequests = useCitizenRequestsStore((s) => s.checkAndRejectExpiredRequests)
  const deadlineCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Global deadline enforcement: run on app load + every 30 minutes
  useEffect(() => {
    // Run immediately on mount
    checkAndRejectExpiredRequests()

    // Then periodically every 30 minutes
    deadlineCheckRef.current = setInterval(() => {
      checkAndRejectExpiredRequests()
    }, 30 * 60 * 1000)

    return () => {
      if (deadlineCheckRef.current) {
        clearInterval(deadlineCheckRef.current)
      }
    }
  }, [checkAndRejectExpiredRequests])

  // Auth pages (login, register, etc.)
  if (!isAuth && currentPage in authPages) {
    const AuthComponent = authPages[currentPage]
    return <AuthComponent />
  }

  // Authenticated app pages — using unified RBAC from src/lib/rbac.ts
  if (isAuth) {
    const page = currentPage as AppPage
    const defaultPage = getDefaultPage(user)
    const hasAccess = canAccessPage(user, page)
    const effectivePage = hasAccess ? page : defaultPage

    // Redirect if user is on a page they can't access
    if (!hasAccess) {
      // Use microtask to avoid setState during render
      Promise.resolve().then(() => navigate(defaultPage))
    }

    const AppComponent = appPages[effectivePage] || DashboardPage
    return (
      <div className="min-h-screen flex bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            <AppComponent />
          </main>
        </div>
        <AiChatbotWidget />
      </div>
    )
  }

  // Public landing pages
  const isPublicPage = currentPage in publicPages
  const PageComponent = isPublicPage ? publicPages[currentPage] : LandingPage

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1">
        <PageComponent />
      </main>
    </div>
  )
}
