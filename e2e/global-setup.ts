import { spawnSync } from 'node:child_process'
import path from 'node:path'

export default async function globalSetup() {
  const backendRoot = process.env.E2E_BACKEND_ROOT
    ?? path.resolve(__dirname, '..', '..', 'autonomous-career-scout')
  const python = process.env.E2E_BACKEND_PYTHON
    ?? path.join(backendRoot, '.venv', 'Scripts', 'python.exe')
  const result = spawnSync(
    python,
    ['-B', 'manage.py', 'seed-demo'],
    {
      cwd: backendRoot,
      env: process.env,
      encoding: 'utf-8',
      stdio: 'inherit'
    }
  )

  if (result.status !== 0) {
    throw new Error('Demo seed failed. Run python manage.py seed-demo in autonomous-career-scout and retry the smoke suite.')
  }
}
