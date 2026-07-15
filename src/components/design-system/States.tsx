import type { ReactNode } from 'react'
import PageState from '../PageState'

type StateProps = {
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState(props: StateProps) {
  return <PageState {...props} />
}

export function LoadingState(props: StateProps) {
  return <PageState {...props} />
}

export function ErrorState(props: StateProps) {
  return <PageState {...props} />
}
