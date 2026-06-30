import type { ReactNode } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[var(--color-bg)] p-4 lg:flex-row lg:gap-0 lg:p-0">
      <Sidebar />
      <div className="min-w-0 flex-1 lg:p-6">
        <Header />
        <main className="mt-4">{children}</main>
      </div>
    </div>
  )
}
