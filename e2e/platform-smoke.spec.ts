import { expect, test } from '@playwright/test'
import {
  firstOpportunityId,
  expectApiOk,
  getApi,
  loginAsDemo,
  monitorCriticalErrors
} from './helpers'

test.describe('Career Scout Platform smoke E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page)
  })

  test('1. Login authenticates the demo user and loads Workspace', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)

    await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible()
    await expect(page.getByText('Demo Career Scout')).toBeVisible()
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('2. Workspace loads account readiness, stats, activity, and insights', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await Promise.all([
      expectApiOk(page, '/api/candidate-profile'),
      expectApiOk(page, '/api/resumes?include_archived=true'),
      expectApiOk(page, '/api/linkedin-accounts?include_disconnected=true'),
      expectApiOk(page, '/api/campaign-profiles?include_archived=true'),
      expectApiOk(page, '/api/notifications?limit=100&offset=0'),
      expectApiOk(page, '/api/agent/executions?sort_by=started_at&order=desc&limit=20&offset=0'),
      expectApiOk(page, '/api/intelligence/candidate'),
      expectApiOk(page, '/api/intelligence/resume-optimization')
    ])

    await expect(page.getByRole('heading', { name: 'Loading Workspace' })).toBeHidden()
    await expect(page.getByRole('link', { name: /Candidate Profile Ready/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick Actions', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Personal Insights', exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('3. Run Campaign Wizard loads setup data and renders the guided flow', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/agent/run-campaign')
    await Promise.all([
      expectApiOk(page, '/api/candidate-profile'),
      expectApiOk(page, '/api/resumes'),
      expectApiOk(page, '/api/linkedin-accounts'),
      expectApiOk(page, '/api/campaign-profiles')
    ])

    await expect(page.getByRole('heading', { name: 'Run Campaign Wizard', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loading Run Campaign Wizard' })).toBeHidden()
    await expect(page.getByRole('button', { name: /Step 1\s+Candidate Profile/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Step 2\s+Resume/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Step 3\s+LinkedIn/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Step 4\s+Campaign Profile/i })).toBeVisible()

    monitor.assertClean()
  })

  test('4. Campaign Executions lists seeded executions and opens execution detail', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/agent/executions')
    await expectApiOk(page, '/api/agent/executions?limit=20&offset=0')

    await expect(page.getByRole('heading', { name: 'Agent Executions', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loading executions' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Executions', exact: true })).toBeVisible()

    const payload = await getApi<{ items: Array<{ execution_id: string }> }>(
      page,
      '/api/agent/executions?limit=1&offset=0'
    )
    expect(payload.items.length).toBeGreaterThan(0)

    await page.goto(`/agent/executions/${payload.items[0].execution_id}`)
    await expectApiOk(page, `/api/agent/executions/${payload.items[0].execution_id}`)
    await expect(page.getByRole('heading', { name: 'Execution Timeline', exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('5. Notifications renders notification list and read actions', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/notifications')
    await expectApiOk(page, '/api/notifications?limit=100&offset=0')

    await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark All as Read', exact: true })).toBeVisible()
    await expect(page.getByText('Unread').first()).toBeVisible()

    monitor.assertClean()
  })

  test('6. Opportunity Details renders a seeded opportunity', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    const opportunityId = await firstOpportunityId(page)
    await page.goto(`/opportunities/${opportunityId}`)
    await Promise.all([
      expectApiOk(page, `/api/opportunities/${opportunityId}`),
      expectApiOk(page, `/api/opportunities/${opportunityId}/history`)
    ])

    await expect(page.getByRole('heading', { name: 'Opportunity Details', exact: true })).toBeVisible()
    await expect(page.getByText(/Opportunity Timeline/i)).toBeVisible()

    monitor.assertClean()
  })

  test('7. Recommendation Explainability calls the explain endpoint and renders explanation sections', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    const opportunityId = await firstOpportunityId(page)
    await page.goto(`/opportunities/${opportunityId}`)
    await expectApiOk(page, `/api/opportunities/${opportunityId}/explain`)

    await expect(page.getByRole('heading', { name: 'Recommendation Explainability', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Matched Skills', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Missing Skills', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Planner Context', exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('8. Candidate Intelligence renders deterministic insight data', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/analytics/intelligence')
    await expectApiOk(page, '/api/intelligence/candidate')

    await expect(page.getByRole('heading', { name: 'Career Intelligence', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Top Skills Found', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recommendations', exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('9. Resume Optimization renders coverage and skill priorities', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/career/resume-optimization')
    await expectApiOk(page, '/api/intelligence/resume-optimization')

    await expect(page.getByRole('heading', { name: 'Resume Optimization', exact: true })).toBeVisible()
    await expect(page.getByText('Resume Completeness').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Most Frequent Missing Skills', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Skills Priority', exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('10. Analytics renders feedback metrics and grouped tables', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/analytics/career')
    await Promise.all([
      expectApiOk(page, '/api/analytics/feedback'),
      expectApiOk(page, '/api/analytics/feedback/companies')
    ])

    await expect(page.getByRole('heading', { name: 'Career Analytics', exact: true })).toBeVisible()
    await expect(page.getByText('Application Rate').first()).toBeVisible()
    await expect(page.getByText('Interview Rate').first()).toBeVisible()
    await expect(page.getByText('Offer Rate').first()).toBeVisible()

    monitor.assertClean()
  })

  test('11. Audit Log data is available through Administration recent activity', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/admin')
    await expectApiOk(page, '/api/audit-log?limit=10&offset=0')

    await expect(page.getByRole('heading', { level: 2, name: 'Administration Center', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loading Administration Center' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Recent Activity', exact: true })).toBeVisible()

    monitor.assertClean()
  })

  test('12. Administration Center renders platform shortcuts and status', async ({ page }) => {
    const monitor = monitorCriticalErrors(page)
    await page.goto('/admin')
    await Promise.all([
      expectApiOk(page, '/api/admin/users'),
      expectApiOk(page, '/api/agent/executions?limit=20&offset=0')
    ])

    await expect(page.getByRole('heading', { level: 2, name: 'Administration Center', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loading Administration Center' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Platform Status', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Users|Open/i }).first()).toBeVisible()

    monitor.assertClean()
  })
})
