import { NavLink } from 'react-router-dom'

function navClass({ isActive }: { isActive: boolean }) {
  return `block rounded px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`
}

export default function Sidebar() {
  return (
    <aside className="w-full shrink-0 border border-slate-100 bg-white p-4 card-base lg:w-64">
      <div className="mb-6">
        <div className="text-lg font-semibold text-agent-primary">Career Scout</div>
        <div className="text-sm text-muted-text">AI Agent Control Center</div>
      </div>

      <nav className="space-y-2">
        <NavLink to="/" end className={navClass}>Opportunity Inbox</NavLink>
        <NavLink to="/campaigns" className={navClass}>Campaign History</NavLink>
      </nav>
    </aside>
  )
}
