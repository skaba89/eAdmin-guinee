'use client'

import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/app-store'

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
}

export default function Home() {
  const { currentPage, isAuth } = useAppStore()

  // Auth pages (login, register, etc.)
  if (!isAuth && currentPage in authPages) {
    const AuthComponent = authPages[currentPage]
    return <AuthComponent />
  }

  // Authenticated app pages
  if (isAuth) {
    const AppComponent = appPages[currentPage] || DashboardPage
    return (
      <div className="min-h-screen flex bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            <AppComponent />
          </main>
        </div>
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
