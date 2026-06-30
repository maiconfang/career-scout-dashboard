import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import OpportunityInbox from './pages/OpportunityInbox'
import OpportunityDetails from './pages/OpportunityDetails'
import CampaignHistory from './pages/CampaignHistory'

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<OpportunityInbox />} />
        <Route path="/opportunities/:opportunityId" element={<OpportunityDetails />} />
        <Route path="/campaigns" element={<CampaignHistory />} />
      </Routes>
    </MainLayout>
  )
}
