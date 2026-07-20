import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ErrorAlert,
  PageContainer,
  SectionCard
} from '../components/design-system'
import OnboardingStepper from '../components/OnboardingStepper'
import {
  createAccessRequest,
  rememberPublicAccessRequest,
  type CreateAccessRequestPayload
} from '../lib/accessRequestApi'

const emptyForm: CreateAccessRequestPayload = {
  full_name: '',
  email: '',
  desired_position: '',
  country: '',
  linkedin_url: '',
  resume_filename: '',
  notes: ''
}

function cleanOptional(value?: string | null) {
  const clean = value?.trim()
  return clean ? clean : null
}

export default function AccessRequestPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateAccessRequestPayload>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const created = await createAccessRequest({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        desired_position: form.desired_position.trim(),
        country: form.country.trim(),
        linkedin_url: cleanOptional(form.linkedin_url),
        resume_filename: cleanOptional(form.resume_filename),
        notes: cleanOptional(form.notes)
      })
      rememberPublicAccessRequest(created)
      setForm(emptyForm)
      navigate(`/access-request/success?id=${encodeURIComponent(created.id)}`, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit access request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 text-slate-900">
      <PageContainer className="grid min-h-[calc(100vh-4rem)] items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]" size="xl">
        <section className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 p-8 text-white shadow-card lg:p-10">
          <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            Career Scout Platform
          </div>
          <h1 className="mt-8 max-w-lg text-4xl font-semibold leading-tight">
            Request access to Career Scout.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
            Submit your information for administrator review. If approved, your account will be provisioned and you will receive an activation token or activation link.
          </p>
          <div className="mt-8 space-y-3 rounded-2xl bg-white/15 p-5 text-sm text-white/90">
            <p className="font-semibold">This is for users who do not have an account yet.</p>
            <p>Already have a password? Use Login.</p>
            <p>Already received an activation link? Activate your account instead.</p>
          </div>
        </section>

        <SectionCard title="Request Access" description="Tell the administrator who you are and what role you are looking for.">
          <div className="mb-6">
            <OnboardingStepper current="REQUEST_ACCESS" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Full Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.full_name}
                onChange={event => setForm({ ...form, full_name: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={event => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Desired Position
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.desired_position}
                  onChange={event => setForm({ ...form, desired_position: event.target.value })}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Country
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.country}
                  onChange={event => setForm({ ...form, country: event.target.value })}
                  required
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              LinkedIn URL (optional)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.linkedin_url ?? ''}
                onChange={event => setForm({ ...form, linkedin_url: event.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Resume filename (optional)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.resume_filename ?? ''}
                onChange={event => setForm({ ...form, resume_filename: event.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Notes (optional)
              <textarea
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.notes ?? ''}
                onChange={event => setForm({ ...form, notes: event.target.value })}
              />
            </label>

            {error && <ErrorAlert>{error}</ErrorAlert>}

            <button
              className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link className="text-brand-700 hover:text-brand-800" to="/login">
              I already have an account
            </Link>
            <Link className="font-semibold text-brand-700 hover:text-brand-800" to="/first-access">
              I received an activation link
            </Link>
          </div>
        </SectionCard>
      </PageContainer>
    </main>
  )
}
