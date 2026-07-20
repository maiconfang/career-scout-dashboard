import { Suspense, lazy } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import AdminRoute from './auth/AdminRoute'
import MainLayout from './layouts/MainLayout'
import { LoadingState } from './components/design-system'
import { useLanguage } from './i18n/LanguageProvider'

const DashboardHome = lazy(() => import('./pages/DashboardHome'))
const WorkspaceDashboardPage = lazy(() => import('./pages/WorkspaceDashboardPage'))
const OpportunityInbox = lazy(() => import('./pages/OpportunityInbox'))
const OpportunityDetails = lazy(() => import('./pages/OpportunityDetails'))
const CampaignHistory = lazy(() => import('./pages/CampaignHistory'))
const OpportunityRepository = lazy(() => import('./pages/OpportunityRepository'))
const SearchAudit = lazy(() => import('./pages/SearchAudit'))
const LoginPage = lazy(() => import('./pages/LoginPageI18n'))
const FirstAccessPage = lazy(() => import('./pages/FirstAccessPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const AccessRequestPage = lazy(() => import('./pages/AccessRequestPage'))
const AccessRequestSuccessPage = lazy(() => import('./pages/AccessRequestSuccessPage'))
const AccessRequestStatusPage = lazy(() => import('./pages/AccessRequestStatusPage'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AccessRequestsPage = lazy(() => import('./pages/AccessRequestsPage'))
const AgentSettingsPage = lazy(() => import('./pages/AgentSettingsPage'))
const CandidateProfilePage = lazy(() => import('./pages/CandidateProfilePage'))
const ResumesPage = lazy(() => import('./pages/ResumesPage'))
const LinkedInAccountsPage = lazy(() => import('./pages/LinkedInAccountsPage'))
const DiscoverySourcesPage = lazy(() => import('./pages/DiscoverySourcesPage'))
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'))
const AgentExecutionsPage = lazy(() => import('./pages/AgentExecutionsPage'))
const RunCampaignWizardPage = lazy(() => import('./pages/RunCampaignWizardPage'))
const CampaignInspectorPage = lazy(() => import('./pages/CampaignInspectorPage'))
const CampaignComparisonPage = lazy(() => import('./pages/CampaignComparisonPage'))
const PlatformHealthPage = lazy(() => import('./pages/PlatformHealthPage'))
const AdministrationCenterPage = lazy(() => import('./pages/AdministrationCenterPage'))
const CareerAnalyticsPage = lazy(() => import('./pages/CareerAnalyticsPage'))
const CareerIntelligencePage = lazy(() => import('./pages/CareerIntelligencePage'))
const ResumeOptimizationPage = lazy(() => import('./pages/ResumeOptimizationPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))

function RouteLoadingState() {
  const { t } = useLanguage()
  return (
    <LoadingState
      title={t('common.loading')}
      message={t('common.loadingPage')}
    />
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/first-access" element={<FirstAccessPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/access-request" element={<AccessRequestPage />} />
        <Route path="/access-request/success" element={<AccessRequestSuccessPage />} />
        <Route path="/access-request/status" element={<AccessRequestStatusPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="/workspace" element={<MainLayout><WorkspaceDashboardPage /></MainLayout>} />
          <Route path="/home" element={<MainLayout><DashboardHome /></MainLayout>} />
          <Route path="/inbox" element={<MainLayout><OpportunityInbox /></MainLayout>} />
          <Route path="/opportunities/:opportunityId" element={<MainLayout><OpportunityDetails /></MainLayout>} />
          <Route path="/campaigns" element={<MainLayout><CampaignHistory /></MainLayout>} />
          <Route path="/repository" element={<MainLayout><OpportunityRepository /></MainLayout>} />
          <Route path="/agent/run-campaign" element={<MainLayout><RunCampaignWizardPage /></MainLayout>} />
          <Route path="/agent/executions" element={<MainLayout><AgentExecutionsPage /></MainLayout>} />
          <Route path="/agent/executions/:executionId" element={<MainLayout><AgentExecutionsPage /></MainLayout>} />
          <Route path="/agent/campaign-inspector" element={<MainLayout><CampaignInspectorPage /></MainLayout>} />
          <Route path="/agent/campaign-comparison" element={<MainLayout><CampaignComparisonPage /></MainLayout>} />
          <Route path="/search-audit" element={<MainLayout><SearchAudit /></MainLayout>} />
          <Route path="/analytics/career" element={<MainLayout><CareerAnalyticsPage /></MainLayout>} />
          <Route path="/analytics/intelligence" element={<MainLayout><CareerIntelligencePage /></MainLayout>} />
          <Route path="/career/candidate-profile" element={<MainLayout><CandidateProfilePage /></MainLayout>} />
          <Route path="/career/resumes" element={<MainLayout><ResumesPage /></MainLayout>} />
          <Route path="/career/resume-optimization" element={<MainLayout><ResumeOptimizationPage /></MainLayout>} />
          <Route path="/career/linkedin-accounts" element={<MainLayout><LinkedInAccountsPage /></MainLayout>} />
          <Route path="/career/discovery-sources" element={<MainLayout><DiscoverySourcesPage /></MainLayout>} />
          <Route path="/career/campaigns" element={<MainLayout><CampaignsPage /></MainLayout>} />
          <Route path="/career/campaigns/setup" element={<MainLayout><RunCampaignWizardPage /></MainLayout>} />
          <Route path="/career/campaign-profiles" element={<Navigate to="/career/campaigns" replace />} />
          <Route path="/account/change-password" element={<MainLayout><ChangePasswordPage /></MainLayout>} />
          <Route path="/notifications" element={<MainLayout><NotificationsPage /></MainLayout>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<MainLayout><AdministrationCenterPage /></MainLayout>} />
            <Route path="/admin/users" element={<MainLayout><AdminUsersPage /></MainLayout>} />
            <Route path="/admin/access-requests" element={<MainLayout><AccessRequestsPage /></MainLayout>} />
            <Route path="/admin/agent-settings" element={<MainLayout><AgentSettingsPage /></MainLayout>} />
            <Route path="/admin/platform-health" element={<MainLayout><PlatformHealthPage /></MainLayout>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
