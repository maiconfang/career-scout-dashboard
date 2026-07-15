import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  PageHeader,
  SectionCard,
  StatusBadge
} from '../components/design-system'
import { useLanguage } from '../i18n/LanguageProvider'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationSeverity,
  type NotificationType,
  type PlatformNotification
} from '../lib/api'

const notificationIcons: Record<NotificationType, string> = {
  CAMPAIGN_COMPLETED: '✓',
  CAMPAIGN_FAILED: '!',
  REPLAY_COMPLETED: '↻',
  REPLAY_FAILED: '!',
  SCHEDULER_EXECUTED: '⏱',
  SCHEDULER_FAILED: '!'
}

const severityTone: Record<NotificationSeverity, 'blue' | 'emerald' | 'amber' | 'red'> = {
  INFO: 'blue',
  SUCCESS: 'emerald',
  WARNING: 'amber',
  ERROR: 'red'
}

const readTone = {
  read: 'slate',
  unread: 'brand'
} as const

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function readableType(type: NotificationType) {
  return type
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function NotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setNotifications(await listNotifications({ limit: 100, offset: 0 }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('notifications.errorMessage'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.is_read).length,
    [notifications]
  )

  async function handleMarkRead(notificationId: string) {
    setUpdatingId(notificationId)
    try {
      const updated = await markNotificationRead(notificationId)
      setNotifications(current => current.map(notification => (
        notification.id === updated.id ? updated : notification
      )))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('notifications.errorMessage'))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      const updated = await markAllNotificationsRead()
      const byId = new Map(updated.map(notification => [notification.id, notification]))
      setNotifications(current => current.map(notification => byId.get(notification.id) ?? {
        ...notification,
        is_read: true,
        read_at: notification.read_at ?? new Date().toISOString()
      }))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t('notifications.errorMessage'))
    } finally {
      setMarkingAll(false)
    }
  }

  if (loading) {
    return (
      <LoadingState
        title={t('notifications.loading')}
        message={t('notifications.loadingDescription')}
      />
    )
  }

  if (error) {
    return (
      <ErrorState
        title={t('notifications.errorTitle')}
        message={error}
        action={(
          <button className="btn-primary" type="button" onClick={() => void load()}>
            {t('notifications.tryAgain')}
          </button>
        )}
      />
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('notifications.section')}
        title={t('notifications.title')}
        description={t('notifications.description')}
        actions={(
          <button
            className="btn-secondary"
            type="button"
            disabled={unreadCount === 0 || markingAll}
            onClick={() => void handleMarkAllRead()}
          >
            {markingAll ? t('notifications.markingAll') : t('notifications.markAllRead')}
          </button>
        )}
      />

      {notifications.length === 0 ? (
        <EmptyState
          title={t('notifications.emptyTitle')}
          message={t('notifications.emptyDescription')}
        />
      ) : (
        <SectionCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{t('notifications.listTitle')}</h3>
              <p className="text-sm text-slate-500">
                {unreadCount} {t('notifications.unreadCount')}
              </p>
            </div>
            <StatusBadge tone={unreadCount > 0 ? 'brand' : 'slate'}>
              {notifications.length} {t('notifications.total')}
            </StatusBadge>
          </div>

          <div className="divide-y divide-slate-100">
            {notifications.map(notification => (
              <article
                key={notification.id}
                className="grid gap-4 py-4 md:grid-cols-[auto_1fr_auto]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${
                  severityTone[notification.severity] === 'red'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : severityTone[notification.severity] === 'emerald'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : severityTone[notification.severity] === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}>
                  {notificationIcons[notification.type]}
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={severityTone[notification.severity]}>
                      {notification.severity}
                    </StatusBadge>
                    <StatusBadge tone={notification.is_read ? readTone.read : readTone.unread}>
                      {notification.is_read ? t('notifications.read') : t('notifications.unread')}
                    </StatusBadge>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      {readableType(notification.type)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(notification.created_at)}
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-2 md:justify-end">
                  {notification.related_execution_id && (
                    <Link
                      className="btn-secondary"
                      to={`/agent/executions/${notification.related_execution_id}`}
                    >
                      {t('notifications.viewExecution')}
                    </Link>
                  )}
                  {!notification.is_read && (
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={updatingId === notification.id}
                      onClick={() => void handleMarkRead(notification.id)}
                    >
                      {updatingId === notification.id ? t('notifications.marking') : t('notifications.markRead')}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}
    </PageContainer>
  )
}
