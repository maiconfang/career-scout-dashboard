# Authentication Audit

Project: `career-scout-dashboard`

Scope: frontend-only audit of Login, Logout, First Access, Activation Link/Token, Access Request, Invite User, protected routes, session expiration, unauthorized/forbidden states, redirects, auth guards, refresh behavior, navigation, and deep links.

No code behavior was changed during this audit.

## Executive Summary

The authentication shell is mostly coherent: protected application routes are wrapped by `ProtectedRoute`, administration routes are additionally wrapped by `AdminRoute`, session restoration is centralized in `AuthContext`, and the API client supports cookie-based refresh for most application requests.

No Critical frontend-only issue was found. The main risks are broken Access Request entry points, inconsistent refresh behavior for IAM/admin API calls, and incomplete frontend coverage for newer invitation recovery capabilities.

## Critical

None found.

## High

### H-1: Public Access Request creation route is missing

Evidence:
- `FirstAccessPage` links to `/access-request`.
- `App.tsx` only declares `/access-request/status`.
- `accessRequestApi.ts` exposes list/get/approve/reject only; there is no frontend create request function.

Impact:
- New users cannot start the official Request Access flow from the frontend.
- The "Request Access" link on First Access falls through to the wildcard route and redirects to `/`, which then sends unauthenticated users to Login.

Affected areas:
- First Access
- Access Request
- Deep links
- User onboarding

Recommendation:
- Add the missing public Access Request page and route in a future implementation phase.
- Consume the existing backend `POST /api/access-requests` if available.

### H-2: IAM/admin API calls bypass automatic auth refresh

Evidence:
- `authApi.ts` wraps all requests with `skipAuthRefresh: true`.
- This includes admin/user invitation calls such as `listAdminUsers`, `inviteAdminUser`, `listAdminUserInvitations`, and `getAdminUserInvitation`.
- `httpClient.ts` only attempts `/api/auth/refresh` automatically when `skipAuthRefresh` is false.

Impact:
- If the access session expires between refresh timer executions, normal dashboard APIs may recover automatically, but IAM/admin pages may fail with 401 immediately.
- Admin pages can display avoidable errors even when a refresh cookie/session could still be valid.

Affected areas:
- Invite User
- Invitation Management
- User Administration
- Session expiration

Recommendation:
- Keep login/logout/activate/refresh as explicit auth operations.
- Consider allowing auto-refresh for authenticated admin resource APIs under `authApi.ts`, or split auth endpoints from admin IAM endpoints.

### H-3: Invitation recovery endpoints are not represented in the dashboard

Evidence:
- `authApi.ts` currently exposes invitation list/detail and invite creation only.
- There are no frontend clients/actions for:
  - `POST /api/admin/users/invitations/{id}/regenerate`
  - `POST /api/admin/users/invitations/{id}/revoke`

Impact:
- Administrators can inspect invitations but cannot recover or revoke pending First Access invitations from the frontend.
- This leaves an operational gap in Invitation Management UX.

Affected areas:
- Invite User
- Activation Token
- Activation Link
- First Access recovery

Recommendation:
- Add frontend API wrappers and guarded actions with confirmation dialogs in a future implementation phase.

## Medium

### M-1: First Access remains available to already authenticated users

Evidence:
- `/first-access` is a public route and does not redirect authenticated users away.
- Login redirects authenticated users to the intended route, but First Access does not have the same guard.

Impact:
- An authenticated user can open First Access and attempt to submit an activation token.
- Backend token validation should still enforce correctness, but the UX is confusing.

Affected areas:
- First Access
- Activation Token
- Auth redirects

Recommendation:
- Consider redirecting authenticated users from `/first-access` to `/workspace`, unless there is a deliberate admin/support use case.

### M-2: Access Request Status may rely on an admin-oriented client path

Evidence:
- `AccessRequestStatusPage` consumes `getAccessRequest(id)`.
- The same `accessRequestApi.ts` module also contains admin-only list/approve/reject operations.
- There is no separate public status client or clear public endpoint naming in the frontend.

Impact:
- If backend ownership rules distinguish public status lookup from admin detail lookup, this page may return 401/403.
- The current implementation makes the public/private boundary harder to audit.

Affected areas:
- Access Request Status
- Unauthorized
- Forbidden

Recommendation:
- Split public Access Request status calls from admin Access Request review calls in the frontend API layer.

### M-3: Forbidden state is local to admin routes and not standardized

Evidence:
- `AdminRoute` renders a custom access denied card for non-admin users.
- API-level 403 errors are handled page-by-page as generic request errors.

Impact:
- A USER visiting `/admin` receives a clear denial.
- A USER triggering an admin API from a stale page, deep link, or future component may receive inconsistent UX.

Affected areas:
- Forbidden
- Unauthorized
- Admin UX

Recommendation:
- Introduce a shared Forbidden state or normalize 403 handling in the API/UI layer.

### M-4: Auth restoration performs `currentUser` and then `refresh`

Evidence:
- `AuthContext.restoreSession` calls `currentUser()`.
- If successful, it sets authenticated state, then calls `refresh()`.
- If refresh fails, `markAnonymous()` runs.

Impact:
- A valid current user response followed by a refresh failure logs the user out.
- This may be intended for strict refresh-cookie enforcement, but it can create surprising session loss if `/api/auth/me` and `/api/auth/refresh` temporarily disagree.

Affected areas:
- Session expiration
- Refresh Token
- Navigation after reload

Recommendation:
- Decide whether `/api/auth/me` is sufficient to restore a session or whether refresh is mandatory.
- Document the intended contract or make the UI state transition less abrupt.

### M-5: Public unknown routes redirect through the protected root

Evidence:
- Wildcard route uses `<Navigate to="/" replace />`.
- `/` is protected and then redirects to `/workspace`.

Impact:
- Unauthenticated users opening an invalid public URL are redirected to Login without a not-found explanation.
- Authenticated users opening an invalid URL land in Workspace.

Affected areas:
- Deep links
- Redirects
- UX

Recommendation:
- Add a Not Found page for unknown routes, or preserve the invalid path context in the redirect.

## Low

### L-1: No Remember Me option exists

Evidence:
- Login form has email and password fields only.
- No `rememberMe` state or payload exists.

Impact:
- No functional issue if persistent refresh-cookie behavior is fully backend-controlled.
- Users may expect session duration controls in an enterprise auth flow.

Recommendation:
- Document that session persistence is server-controlled, or add UI only if backend supports it.

### L-2: First Access visual copy contains encoding artifacts

Evidence:
- `FirstAccessPage` renders strings like `âœ“` in the benefits list.

Impact:
- This does not affect authentication behavior.
- It reduces trust and polish on a sensitive onboarding page.

Recommendation:
- Replace corrupted glyphs with safe text/icons in a future UX cleanup.

### L-3: Login form does not expose password visibility toggle

Evidence:
- Password input is a plain `type="password"` field.

Impact:
- No security issue.
- Minor UX/accessibility improvement opportunity.

Recommendation:
- Add a standard show/hide password control if aligned with the Design System.

### L-4: Logout has no explicit post-logout destination

Evidence:
- Header calls `logout()` and relies on auth state plus `ProtectedRoute` to redirect from the current protected page.

Impact:
- Current behavior works for protected pages.
- Explicit navigation could make logout flow easier to reason about and test.

Recommendation:
- Consider navigating to `/login` after logout in a future polish pass.

### L-5: Admin route loading state is blank

Evidence:
- `AdminRoute` returns `null` while auth status is `checking`.
- Parent `ProtectedRoute` normally handles checking first, but this route still has its own blank fallback.

Impact:
- Low practical impact due to nesting.
- A future route refactor could expose a blank screen during admin auth checks.

Recommendation:
- Reuse the same loading state as `ProtectedRoute` if `AdminRoute` is ever used independently.

## Route Access Matrix

Public routes:
- `/login`
- `/first-access`
- `/forgot-password`
- `/reset-password`
- `/access-request/status`

Protected USER/ADMIN routes:
- `/`
- `/workspace`
- `/home`
- `/inbox`
- `/opportunities/:opportunityId`
- `/campaigns`
- `/repository`
- `/agent/run-campaign`
- `/agent/executions`
- `/agent/executions/:executionId`
- `/agent/campaign-inspector`
- `/agent/campaign-comparison`
- `/search-audit`
- `/analytics/career`
- `/analytics/intelligence`
- `/career/candidate-profile`
- `/career/resumes`
- `/career/resume-optimization`
- `/career/linkedin-accounts`
- `/career/campaign-profiles`
- `/account/change-password`
- `/notifications`

Protected ADMIN routes:
- `/admin`
- `/admin/users`
- `/admin/access-requests`
- `/admin/agent-settings`
- `/admin/platform-health`

Missing or inconsistent routes:
- `/access-request` is linked but not declared.

## Positive Findings

- Protected routes preserve deep link intent via `location.state.from`.
- Login redirects authenticated users away from the login page.
- Admin navigation is hidden from non-admin users in the sidebar.
- Admin routes have an explicit role guard.
- CSRF header is attached automatically for non-GET requests when the CSRF cookie exists.
- The general API client attempts refresh on 401 for non-auth API calls.
- First Access supports `?token=<activation_token>` and hides the token input when provided by URL.

## Recommended Next Steps

1. Implement the missing public Access Request creation page and route.
2. Split auth operation clients from admin IAM resource clients so admin APIs can participate in refresh recovery.
3. Add invitation regenerate/revoke frontend actions once the backend endpoints are available in the target environment.
4. Standardize 401/403 UX across pages.
5. Add route-level tests for public, protected, admin, deep-link, login, logout, and session-expiration flows.
