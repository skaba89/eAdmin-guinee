'use client'

import { lazy, Suspense, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'

// Loading spinner component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#0B2E58] border-t-[#C8A45C] rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    </div>
  )
}

// Lazy load all page components using React.lazy for pure client-side rendering
const LandingPage = lazy(() => import('@/components/landing/landing-page').then(m => ({ default: m.LandingPage })))
const AboutPage = lazy(() => import('@/components/landing/about-page').then(m => ({ default: m.AboutPage })))
const ServicesPage = lazy(() => import('@/components/landing/services-page').then(m => ({ default: m.ServicesPage })))
const SolutionsPage = lazy(() => import('@/components/landing/solutions-page').then(m => ({ default: m.SolutionsPage })))
const PricingPage = lazy(() => import('@/components/landing/pricing-page').then(m => ({ default: m.PricingPage })))
const ContactPage = lazy(() => import('@/components/landing/contact-page').then(m => ({ default: m.ContactPage })))
const BlogPage = lazy(() => import('@/components/landing/blog-page').then(m => ({ default: m.BlogPage })))
const FAQPage = lazy(() => import('@/components/landing/faq-page').then(m => ({ default: m.FAQPage })))
const DemoPage = lazy(() => import('@/components/landing/demo-page').then(m => ({ default: m.DemoPage })))
const LoginPage = lazy(() => import('@/components/auth/login-page').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/components/auth/register-page').then(m => ({ default: m.RegisterPage })))
const AppSidebar = lazy(() => import('@/components/layout/app-sidebar').then(m => ({ default: m.AppSidebar })))
const AppHeader = lazy(() => import('@/components/layout/app-header').then(m => ({ default: m.AppHeader })))
const DashboardPage = lazy(() => import('@/components/app/dashboard-page'))
const AnalyticsPage = lazy(() => import('@/components/app/analytics-page'))
const GedPage = lazy(() => import('@/components/app/ged-page').then(m => ({ default: m.GedPage })))
const CourriersPage = lazy(() => import('@/components/app/courriers-page').then(m => ({ default: m.CourriersPage })))
const WorkflowPage = lazy(() => import('@/components/app/workflow-page').then(m => ({ default: m.WorkflowPage })))
const SignaturesPage = lazy(() => import('@/components/app/signatures-page').then(m => ({ default: m.SignaturesPage })))
const CitizenPortalPage = lazy(() => import('@/components/app/citizen-portal-page').then(m => ({ default: m.CitizenPortalPage })))
const AdminPage = lazy(() => import('@/components/app/admin-page').then(m => ({ default: m.AdminPage })))
const UsersPage = lazy(() => import('@/components/app/users-page').then(m => ({ default: m.UsersPage })))
const SettingsPage = lazy(() => import('@/components/app/settings-page').then(m => ({ default: m.SettingsPage })))
const NotificationsPage = lazy(() => import('@/components/app/notifications-page').then(m => ({ default: m.NotificationsPage })))
const AuditLogsPage = lazy(() => import('@/components/app/audit-logs-page').then(m => ({ default: m.AuditLogsPage })))
const PublicNav = lazy(() => import('@/components/landing/public-nav').then(m => ({ default: m.PublicNav })))
const PublicCitizenPortal = lazy(() => import('@/components/landing/public-citizen-portal').then(m => ({ default: m.PublicCitizenPortal })))
const ServiceRequestsPage = lazy(() => import('@/components/app/service-requests-page').then(m => ({ default: m.ServiceRequestsPage })))
const AiAssistantPage = lazy(() => import('@/components/app/ai-assistant-page').then(m => ({ default: m.AiAssistantPage })))
const DatabaseQueryPage = lazy(() => import('@/components/app/database-query-page').then(m => ({ default: m.DatabaseQueryPage })))
const AiChatbotWidget = lazy(() => import('@/components/app/ai-chatbot-widget').then(m => ({ default: m.AiChatbotWidget })))

const publicPages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
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

const authPages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  login: LoginPage,
  register: RegisterPage,
}

const appPages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
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
  'ai-assistant': AiAssistantPage,
  'database-query': DatabaseQueryPage,
}

export default function Home() {
  const { currentPage, isAuth } = useAppStore()

  // Auth pages (login, register, etc.)
  if (!isAuth && currentPage in authPages) {
    const AuthComponent = authPages[currentPage]
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthComponent />
      </Suspense>
    )
  }

  // Authenticated app pages
  if (isAuth) {
    const AppComponent = appPages[currentPage] || DashboardPage
    return (
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    )
  }

  // Public landing pages
  const isPublicPage = currentPage in publicPages
  const PageComponent = isPublicPage ? publicPages[currentPage] : LandingPage

  return (
    <Suspense fallback={<PageLoader />}>
      <div className="min-h-screen flex flex-col bg-background">
        <PublicNav />
        <main className="flex-1">
          <PageComponent />
        </main>
      </div>
    </Suspense>
  )
}
