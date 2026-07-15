import { expect, type Page } from '@playwright/test'

export const demoUser = {
  email: process.env.E2E_DEMO_EMAIL ?? 'demo@careerscout.local',
  password: process.env.E2E_DEMO_PASSWORD ?? 'DemoCareerScout!2026'
}

export function monitorCriticalErrors(page: Page) {
  const errors: string[] = []

  page.on('pageerror', error => {
    errors.push(`pageerror: ${error.message}`)
  })

  page.on('console', message => {
    if (message.type() === 'error') {
      if (message.text().includes('the server responded with a status of 404')) {
        return
      }
      errors.push(`console: ${message.text()}`)
    }
  })

  page.on('response', response => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`)
    }
  })

  return {
    assertClean() {
      expect(errors, errors.join('\n')).toEqual([])
    }
  }
}

export async function loginAsDemo(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(demoUser.email)
  await page.locator('input[type="password"]').fill(demoUser.password)
  await Promise.all([
    page.waitForURL(/\/workspace$/),
    page.getByRole('button', { name: /login/i }).click()
  ])
  await expect(page.getByRole('heading', { name: 'Workspace', exact: true })).toBeVisible()
}

export async function getApi<T>(page: Page, path: string): Promise<T> {
  const response = await page.evaluate(async requestPath => {
    const result = await fetch(requestPath, { credentials: 'include' })
    return {
      ok: result.ok,
      status: result.status,
      body: await result.text()
    }
  }, path)
  expect(response.ok, `${response.status} ${path}: ${response.body}`).toBeTruthy()
  return JSON.parse(response.body) as T
}

export async function expectApiOk(page: Page, path: string) {
  const response = await page.evaluate(async requestPath => {
    const result = await fetch(requestPath, { credentials: 'include' })
    return {
      ok: result.ok,
      status: result.status,
      body: await result.text()
    }
  }, path)
  expect(response.ok, `${response.status} ${path}: ${response.body}`).toBeTruthy()
}

export async function firstOpportunityId(page: Page) {
  const payload = await getApi<{ items: Array<{ opportunity_id: number }> }>(
    page,
    '/api/opportunities?limit=1&offset=0'
  )
  expect(payload.items.length).toBeGreaterThan(0)
  return payload.items[0].opportunity_id
}
