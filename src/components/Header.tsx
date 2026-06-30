import { useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()
  const fixedPage = {
    '/': {
      title: 'Opportunity Inbox',
      subtitle: 'Review and prioritize opportunities found by Career Scout'
    },
    '/campaigns': {
      title: 'Campaign History',
      subtitle: 'Browse previous Career Scout campaigns'
    },
    '/decision-compare': {
      title: 'Decision Compare',
      subtitle: 'Agent conflict, audit verdict, and decision evidence'
    },
    '/skills-gap': {
      title: 'Skills Gap',
      subtitle: 'Capability gaps and opportunity fit'
    },
    '/history': {
      title: 'History',
      subtitle: 'Agent evolution across historical runs'
    },
    '/jobs': {
      title: 'Jobs List',
      subtitle: 'Collected opportunities and match context'
    }
  }[pathname]
  const page = pathname.startsWith('/opportunities/')
    ? { title: 'Opportunity Details', subtitle: 'Recommendation evidence and original job information' }
    : fixedPage ?? { title: 'Career Scout', subtitle: 'AI Agent Control Center' }

  return (
    <header className="w-full bg-white p-4 card-base">
      <h1 className="text-lg font-semibold">{page.title}</h1>
      <div className="text-sm text-muted-text">{page.subtitle}</div>
    </header>
  )
}
