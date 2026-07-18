type OnboardingStep = 'REQUEST_ACCESS' | 'ADMIN_REVIEW' | 'ACCOUNT_CREATED' | 'ACTIVATE_ACCOUNT' | 'LOGIN'

const steps: { key: OnboardingStep; label: string; description: string }[] = [
  {
    key: 'REQUEST_ACCESS',
    label: 'Request Access',
    description: 'Submit your information'
  },
  {
    key: 'ADMIN_REVIEW',
    label: 'Admin Review',
    description: 'Administrator validates the request'
  },
  {
    key: 'ACCOUNT_CREATED',
    label: 'Account Created',
    description: 'User is provisioned'
  },
  {
    key: 'ACTIVATE_ACCOUNT',
    label: 'Activate Account',
    description: 'Create your password'
  },
  {
    key: 'LOGIN',
    label: 'Login',
    description: 'Use your account'
  }
]

const stepOrder = steps.map(step => step.key)

function stepState(step: OnboardingStep, current: OnboardingStep) {
  const stepIndex = stepOrder.indexOf(step)
  const currentIndex = stepOrder.indexOf(current)
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'waiting'
}

export default function OnboardingStepper({ current }: { current: OnboardingStep }) {
  return (
    <ol className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => {
        const state = stepState(step.key, current)
        return (
          <li className="relative" key={step.key}>
            {index > 0 && <div className="absolute -left-3 top-5 hidden h-px w-6 bg-slate-200 md:block" />}
            <div className={`h-full rounded-lg border p-3 ${
              state === 'completed'
                ? 'border-emerald-200 bg-emerald-50'
                : state === 'current'
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-slate-200 bg-white'
            }`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                state === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : state === 'current'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-500'
              }`}>
                {state === 'completed' ? 'OK' : index + 1}
              </div>
              <div className="mt-3 text-sm font-extrabold text-slate-950">{step.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">{step.description}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
