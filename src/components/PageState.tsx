type Props = {
  title: string
  message: string
  action?: React.ReactNode
}

export default function PageState({ title, message, action }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-card">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
