import { Navigate, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import AdminRoute from './auth/AdminRoute'
import MainLayout from './layouts/MainLayout'
import DashboardHome from './pages/DashboardHome'
import OpportunityInbox from './pages/OpportunityInbox'
import OpportunityDetails from './pages/OpportunityDetails'
import CampaignHistory from './pages/CampaignHistory'
import OpportunityRepository from './pages/OpportunityRepository'
import SearchAudit from './pages/SearchAudit'
import LoginPage from './pages/LoginPageI18n'
import FirstAccessPage from './pages/FirstAccessPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AgentSettingsPage from './pages/AgentSettingsPage'
import CandidateProfilePage from './pages/CandidateProfilePage'
import ResumesPage from './pages/ResumesPage'
import LinkedInAccountsPage from './pages/LinkedInAccountsPage'
import AgentExecutionsPage from './pages/AgentExecutionsPage'
import CampaignProfilesPage from './pages/CampaignProfilesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/first-access" element={<FirstAccessPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout><DashboardHome /></MainLayout>} />
        <Route path="/inbox" element={<MainLayout><OpportunityInbox /></MainLayout>} />
        <Route path="/opportunities/:opportunityId" element={<MainLayout><OpportunityDetails /></MainLayout>} />
        <Route path="/campaigns" element={<MainLayout><CampaignHistory /></MainLayout>} />
        <Route path="/repository" element={<MainLayout><OpportunityRepository /></MainLayout>} />
        <Route path="/agent/executions" element={<MainLayout><AgentExecutionsPage /></MainLayout>} />
        <Route path="/agent/executions/:executionId" element={<MainLayout><AgentExecutionsPage /></MainLayout>} />
        <Route path="/search-audit" element={<MainLayout><SearchAudit /></MainLayout>} />
        <Route path="/career/candidate-profile" element={<MainLayout><CandidateProfilePage /></MainLayout>} />
        <Route path="/career/resumes" element={<MainLayout><ResumesPage /></MainLayout>} />
        <Route path="/career/linkedin-accounts" element={<MainLayout><LinkedInAccountsPage /></MainLayout>} />
        <Route path="/career/campaign-profiles" element={<MainLayout><CampaignProfilesPage /></MainLayout>} />
        <Route path="/account/change-password" element={<MainLayout><ChangePasswordPage /></MainLayout>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<MainLayout><AdminUsersPage /></MainLayout>} />
          <Route path="/admin/agent-settings" element={<MainLayout><AgentSettingsPage /></MainLayout>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
