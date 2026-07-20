import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
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
  type PlatformNotification
} from '../lib/api'

const notificationIcons: Record<string, string> = {
  CAMPAIGN_COMPLETED: 'OK',
  CAMPAIGN_FAILED: '!',
  REPLAY_COMPLETED: 'RE',
  REPLAY_FAILED: '!',
  SCHEDULER_EXECUTED: 'SC',
  SCHEDULER_FAILED: '!',
  NEW_ACCESS_REQUEST: '+',
  ACCOUNT_APPROVED: 'OK',
  USER_PROVISIONED: 'OK',
  USER_INVITED: '+',
  INVITATION_REGENERATED: 'RE',
  INVITATION_REVOKED: '!',
  IDENTITY_STATE_CHANGED: 'ID'
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

const actionRequiredTypes = new Set([
  'NEW_ACCESS_REQUEST',
  'CAMPAIGN_FAILED',
  'REPLAY_FAILED',
  'SCHEDULER_FAILED',
  'INVITATION_REGENERATED'
])

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function readableType(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function metadataValue(notification: PlatformNotification, key: string) {
  const value = notification.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function notificationAction(notification: PlatformNotification, isAdmin: boolean) {
  if (notification.type === 'NEW_ACCESS_REQUEST' && isAdmin) {
    const requestId = metadataValue(notification, 'access_request_id')
    return requestId
      ? { label: 'Review Request', to: `/admin/access-requests?requestId=${encodeURIComponent(requestId)}` }
      : { label: 'Review Request', to: '/admin/access-requests' }
  }

  if (notification.type === 'CAMPAIGN_COMPLETED' && notification.related_execution_id) {
    return {
      label: 'View Results',
      to: `/agent/executions/${notification.related_execution_id}?section=campaign_results`
    }
  }

  if ((notification.type === 'CAMPAIGN_FAILED' || notification.type === 'REPLAY_FAILED') && notification.related_execution_id) {
    return { label: 'Open Execution', to: `/agent/executions/${notification.related_execution_id}` }
  }

  if (notification.type === 'USER_PROVISIONED' && isAdmin) {
    const userId = metadataValue(notification, 'user_id')
    return userId
      ? { label: 'Open User', to: `/admin/users?userId=${encodeURIComponent(userId)}` }
      : { label: 'Open User', to: '/admin/users' }
  }

  if (notification.type === 'INVITATION_REGENERATED' && isAdmin) {
    const invitationId = metadataValue(notification, 'invitation_id')
    return invitationId
      ? { label: 'Open Invitation', to: `/admin/users?tab=INVITATIONS&invitationId=${encodeURIComponent(invitationId)}` }
      : { label: 'Open Invitation', to: '/admin/users?tab=INVITATIONS' }
  }

  if (notification.related_execution_id) {
    return { label: 'View Execution', to: `/agent/executions/${notification.related_execution_id}` }
  }

  return null
}

function notificationTone(type: string, severity: NotificationSeverity) {
  if (actionRequiredTypes.has(type)) return 'red'
  return severityTone[severity]
}

function notificationCardClasses(type: string, isRead: boolean) {
  if (actionRequiredTypes.has(type)) {
    return isRead
      ? 'border-red-100 bg-white'
      : 'border-red-200 bg-red-50/70 shadow-sm'
  }
  return isRead
    ? 'border-slate-100 bg-white'
    : 'border-brand-100 bg-brand-50/40 shadow-sm'
}

function iconClasses(tone: 'blue' | 'emerald' | 'amber' | 'red') {
  if (tone === 'red') return 'border-red-200 bg-red-100 text-red-700'
  if (tone === 'emerald') return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  if (tone === 'amber') return 'border-amber-200 bg-amber-100 text-amber-700'
  return 'border-blue-200 bg-blue-100 text-blue-700'
}

export default function NotificationsPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
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
  const actionRequiredCount = useMemo(
    () => notifications.filter(notification => actionRequiredTypes.has(notification.type) && !notification.is_read).length,
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
        <SectionCard className="rounded-2xl border-slate-200 bg-slate-50/40">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Work queue</h3>
              <p className="text-sm text-slate-500">
                {actionRequiredCount} require action · {unreadCount} {t('notifications.unreadCount')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {actionRequiredCount > 0 && <StatusBadge tone="red">Action Required</StatusBadge>}
              <StatusBadge tone={unreadCount > 0 ? 'brand' : 'slate'}>
                {notifications.length} {t('notifications.total')}
              </StatusBadge>
            </div>
          </div>

          <div className="space-y-3">
            {notifications.map(notification => {
              const action = notificationAction(notification, isAdmin)
              const requiresAction = actionRequiredTypes.has(notification.type)
              const tone = notificationTone(notification.type, notification.severity)
              return (
                <article
                  key={notification.id}
                  className={`rounded-xl border p-4 transition ${notificationCardClasses(notification.type, notification.is_read)}`}
                >
                  <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-start">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border text-xs font-black ${iconClasses(tone)}`}>
                      {notificationIcons[notification.type] ?? '*'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {requiresAction && !notification.is_read && (
                          <StatusBadge tone="red">Action Required</StatusBadge>
                        )}
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

                      <h3 className="mt-3 text-base font-extrabold text-slate-950">{notification.title}</h3>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{notification.message}</p>
                      <div className="mt-3 text-xs font-medium text-slate-500">
                        {formatDateTime(notification.created_at)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:min-w-52 lg:flex-col lg:items-stretch">
                      {action && (
                        <Link className="btn-primary justify-center text-center" to={action.to}>
                          {action.label}
                        </Link>
                      )}
                      {!notification.is_read && (
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={updatingId === notification.id}
                          onClick={() => void handleMarkRead(notification.id)}
                        >
                          {updatingId === notification.id ? t('notifications.marking') : t('notifications.markRead')}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </SectionCard>
      )}
    </PageContainer>
  )
}
