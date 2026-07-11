import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { archiveResume, listResumes, resumeDownloadUrl, setDefaultResume, uploadResume, type CandidateResume } from '../lib/resumeApi'
import { useLanguage } from '../i18n/LanguageProvider'

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ResumesPage() {
  const { t } = useLanguage()
  const [resumes, setResumes] = useState<CandidateResume[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [makeDefault, setMakeDefault] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listResumes(includeArchived)
      .then(setResumes)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [includeArchived])

  const activeCount = useMemo(() => resumes.filter(resume => resume.active).length, [resumes])
  const defaultResume = resumes.find(resume => resume.is_default && resume.active)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    if (file && !displayName) {
      setDisplayName(file.name.replace(/\.(pdf|docx)$/i, ''))
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile) {
      setError(t('resumes.selectFileRequired'))
      return
    }

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      await uploadResume(selectedFile, displayName, makeDefault)
      setSelectedFile(null)
      setDisplayName('')
      setMakeDefault(true)
      setMessage(t('resumes.uploaded'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('resumes.uploadFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDefault(resumeId: string) {
    setMessage(null)
    setError(null)
    try {
      await setDefaultResume(resumeId)
      setMessage(t('resumes.defaultUpdated'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('resumes.defaultFailed'))
    }
  }

  async function handleArchive(resumeId: string) {
    setMessage(null)
    setError(null)
    try {
      await archiveResume(resumeId)
      setMessage(t('resumes.archived'))
      load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('resumes.archiveFailed'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('career.section')}</div>
            <h2 className="mt-1 text-2xl font-extrabold text-agent-primary">{t('resumes.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('resumes.description')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-brand-700">{t('resumes.active')}</div>
              <div className="text-xl font-extrabold text-agent-primary">{activeCount}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">{t('resumes.default')}</div>
              <div className="max-w-36 truncate text-sm font-bold text-agent-primary">{defaultResume?.display_name ?? '—'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
        <form className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto]" onSubmit={handleUpload}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{t('resumes.file')}</span>
            <input
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              type="file"
              onChange={handleFile}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{t('resumes.displayName')}</span>
            <input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={displayName} onChange={event => setDisplayName(event.target.value)} />
          </label>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input checked={makeDefault} type="checkbox" onChange={event => setMakeDefault(event.target.checked)} />
              {t('resumes.makeDefault')}
            </label>
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={saving} type="submit">
              {saving ? t('resumes.uploading') : t('resumes.upload')}
            </button>
          </div>
        </form>
        <div className="mt-4 flex items-center gap-2">
          <input id="include-archived" checked={includeArchived} type="checkbox" onChange={event => setIncludeArchived(event.target.checked)} />
          <label className="text-sm font-medium text-slate-600" htmlFor="include-archived">{t('resumes.includeArchived')}</label>
        </div>
        {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-extrabold text-agent-primary">{t('resumes.library')}</h3>
          <p className="text-sm text-slate-500">{t('resumes.libraryDescription')}</p>
        </div>

        {loading && <div className="p-5 text-sm text-slate-500">{t('resumes.loading')}</div>}
        {!loading && resumes.length === 0 && <div className="p-5 text-sm text-slate-500">{t('resumes.empty')}</div>}

        {!loading && resumes.length > 0 && (
          <div className="divide-y divide-slate-100">
            {resumes.map(resume => (
              <article className="grid gap-4 p-5 lg:grid-cols-[1.5fr_1fr_auto]" key={resume.resume_id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-extrabold text-agent-primary">{resume.display_name}</h4>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${resume.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{resume.status}</span>
                    {resume.is_default && <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{t('resumes.default')}</span>}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{resume.filename}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{t('resumes.version')} {resume.version}</span>
                    <span>•</span>
                    <span>{formatSize(resume.file_size_bytes)}</span>
                    <span>•</span>
                    <span>{resume.mime_type.includes('pdf') ? 'PDF' : 'DOCX'}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div><span className="font-semibold">{t('resumes.createdAt')}:</span> {formatDate(resume.created_at)}</div>
                  <div className="mt-1"><span className="font-semibold">{t('resumes.updatedAt')}:</span> {formatDate(resume.updated_at)}</div>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <a className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" href={resumeDownloadUrl(resume.resume_id)}>
                    {t('resumes.download')}
                  </a>
                  {resume.active && !resume.is_default && (
                    <button className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50" type="button" onClick={() => void handleDefault(resume.resume_id)}>
                      {t('resumes.setDefault')}
                    </button>
                  )}
                  {resume.active && (
                    <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => void handleArchive(resume.resume_id)}>
                      {t('resumes.archive')}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
