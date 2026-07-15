import { useEffect, useState, type ReactNode } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import CommandPalette from '../components/CommandPalette'

export default function MainLayout({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(open => !open)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[var(--color-bg)] p-4 lg:flex-row lg:gap-0 lg:p-0">
      <Sidebar />
      <div className="min-w-0 flex-1 lg:p-6">
        <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        <main className="mt-4">{children}</main>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
