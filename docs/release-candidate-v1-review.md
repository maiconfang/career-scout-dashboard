# Career Scout Platform - Release Candidate v1 Review

Date: 2026-07-14  
Scope: `career-scout-dashboard` frontend audit, with read-only endpoint cross-check against the backend FastAPI route registry in `autonomous-career-scout`.

This review is documentation-only. It does not propose behavior changes as completed work and does not modify application code.

## Executive Summary

The dashboard is functionally broad and now covers the major Career Scout operational areas: opportunities, campaigns, agent executions, campaign results, comparison, administration, notifications, health, intelligence, and resume optimization. The Design System exists and is used across newer pages, but the platform is not yet release-candidate clean.

The largest risks are architectural consistency rather than agent behavior: duplicated API clients, oversized page components, endpoint coverage gaps, hardcoded English/mixed localization, and several legacy components that predate the Design System. No confirmed Critical runtime blocker was found in this audit, but several High-priority items should be addressed before calling the dashboard v1-ready.

## Critical

### C-01 - No Confirmed Critical Blocker Found

Severity: Critical  
Status: None confirmed in this audit.

No evidence was found of a dashboard issue that would certainly block all production use, expose secrets in frontend code, or change backend agent behavior. This does not mean the platform is production-ready; High-priority issues below remain material.

## High

### H-01 - Duplicated API Client Infrastructure

Area: Services / API client architecture

The dashboard has multiple independent HTTP client implementations:

- `src/lib/api.ts`
- `src/lib/authApi.ts`
- `src/lib/agentSettingsApi.ts`
- `src/lib/campaignContextInspectorApi.ts`
- `src/lib/campaignProfileApi.ts`
- `src/lib/campaignRunApi.ts`
- `src/lib/candidateProfileApi.ts`
- `src/lib/linkedinAccountApi.ts`
- `src/lib/resumeApi.ts`

Observed duplication:

- Repeated `configuredBaseUrl` / `apiBaseUrl` / `apiUrl`.
- Repeated CSRF header handling.
- Repeated fetch error handling.
- Inconsistent authentication refresh behavior: `src/lib/api.ts` refreshes on `401`, while most specialized clients throw directly.

Risk:

- Session-expiration behavior will differ by page.
- Error messages and retry behavior will drift.
- Adding headers, tracing, request IDs, or production telemetry will require many edits.

Recommendation:

- Create one shared HTTP client module with auth refresh, CSRF, JSON parsing, error normalization, query serialization, and optional abort support.
- Keep domain-specific API functions, but delegate transport to the shared client.

### H-02 - Backend Endpoints Without Complete Frontend Coverage

Area: API coverage

The backend exposes endpoints that are not represented by a dedicated frontend workflow or are only partially surfaced:

- `POST /api/opportunities/{opportunity_id}/feedback`
- `GET /api/opportunities/{opportunity_id}/feedback`
- `PATCH /api/opportunities/{opportunity_id}/feedback`
- `POST /api/agent/executions/{execution_id}/replay`
- `POST /api/scheduler`
- `PATCH /api/scheduler/{scheduler_id}`
- `DELETE /api/scheduler/{scheduler_id}`
- `GET /api/campaigns/{campaign_id}`
- `GET /api/companies`
- `GET /api/companies/{company_id}`
- `GET /api/skills`
- `GET /api/feedback`
- `GET /api/dashboard/overview`

Some are intentionally future-facing, but for a v1 release candidate each endpoint should be classified as:

- Supported in frontend.
- Admin/API-only by design.
- Internal/debug-only.
- Planned for a later release.

Risk:

- Product capabilities exist but are invisible.
- QA cannot verify user-facing workflows end to end.
- The dashboard may present a partial operational picture.

Recommendation:

- Add an API coverage matrix to release documentation.
- Decide whether scheduler management, campaign replay, opportunity feedback entry, company detail, skills, and dashboard overview are v1 or post-v1.

### H-03 - Frontend Surfaces Without Full Backend Support

Area: Frontend/backend contract

Some frontend areas are intentionally showing derived or unavailable data because no dedicated backend endpoint exists yet:

- Platform Health shows Queue, Worker, and Schema as `Not Available`.
- Administration Center links Audit Log to an internal page anchor rather than a dedicated Audit Log page.
- Administration Center links Scheduler to Platform Health rather than a scheduler management page.
- Campaign Comparison computes comparison client-side from execution summaries/results rather than a backend comparison endpoint.
- Opportunity Details still has fields like execution context that may show `Not Available`.

Risk:

- Users may interpret placeholder operational status as a degraded platform.
- Admin navigation has cards for concepts that do not yet have dedicated management screens.

Recommendation:

- Keep `Not Available` behavior, but document it as intentional for v1.
- Add a v1 readiness checklist for operational endpoints that need backend support before being considered production-grade.

### H-04 - Oversized Page Components Concentrate Too Much Responsibility

Area: React architecture / maintainability

Largest page files by size:

- `src/pages/AgentExecutionsPage.tsx` - about 57 KB
- `src/pages/OpportunityDetails.tsx` - about 33 KB
- `src/pages/CampaignComparisonPage.tsx` - about 23 KB
- `src/pages/CampaignInspectorPage.tsx` - about 18 KB
- `src/pages/DashboardHome.tsx` - about 17 KB

Risk:

- Harder review and regression testing.
- Local helper functions become duplicated across pages.
- Rendering and state bugs are harder to isolate.

Recommendation:

- Extract stable internal components first, without changing behavior:
  - Execution detail tabs.
  - Execution timeline.
  - Campaign results table.
  - Opportunity detail timeline.
  - Explainability section.
  - KPI grids.
  - JSON/data blocks.

### H-05 - No Frontend Test, Lint, or Typecheck Script Beyond Build

Area: Production readiness

`package.json` currently exposes:

- `dev`
- `build`
- `preview`

There is no:

- `test`
- `lint`
- `typecheck`
- accessibility test script
- route smoke test

Risk:

- `vite build` catches TypeScript/build errors, but not interaction regressions.
- Navigation, auth refresh, admin gating, polling, and tables have no automated safety net.

Recommendation:

- Add release-candidate validation scripts in a later implementation phase:
  - `npm run typecheck`
  - `npm run lint`
  - route smoke tests
  - accessibility checks for key pages

### H-06 - Bundle Size Warning Is Already Present

Area: Performance / production

Recent builds emit a Vite warning that a chunk is larger than 500 KB after minification.

Risk:

- Slower initial load, especially for authenticated users reaching operational pages.
- Every route currently ships more dashboard code than necessary.

Recommendation:

- Split route-level pages with `React.lazy`.
- Start with heavy routes:
  - Agent Executions
  - Opportunity Details
  - Campaign Comparison
  - Campaign Inspector
  - Administration Center

## Medium

### M-01 - Dead or Legacy Components Still Present

Area: Code cleanup

The following components appear unused by current routes:

- `src/components/AgentBrain.tsx`
- `src/components/AgreementLevel.tsx`
- `src/components/ConflictStatus.tsx`
- `src/components/DecisionNarrative.tsx`
- `src/components/DecisionVerdict.tsx`
- `src/components/KpiCard.tsx`
- `src/components/JustificationPanel.tsx`

Still used:

- `src/components/OpportunityStatusBadge.tsx`
- `src/components/PasswordRequirements.tsx`
- `src/components/PageState.tsx`

Risk:

- Dead components confuse future contributors.
- Several legacy components use pre-Design-System styling and old domain language.
- Some contain mojibake/encoding artifacts.

Recommendation:

- Confirm whether the unused components are intentionally parked.
- Remove them or move them to a documented archive after product approval.

### M-02 - Components That Should Enter the Design System

Area: Design System maturity

The following patterns are repeated across pages but not yet first-class Design System components:

- `DetailGrid` / key-value field grids.
- JSON/preformatted data blocks.
- Data tables with empty/loading/error states.
- Timeline rows and stage indicators.
- Filter rows with search/select/sort controls.
- Pagination controls.
- Primary/secondary/danger action buttons.
- Copy-to-clipboard button.
- Score formatting and score tone helpers.
- Entity summary cards.
- KPI grid wrappers.

Risk:

- New pages keep recreating layout and styling.
- Minor visual differences accumulate.

Recommendation:

- Add only the abstractions that already appear in 3+ places.
- Prioritize `DataTable`, `KeyValueGrid`, `JsonBlock`, `PaginationControls`, `ActionButton`, and `Timeline`.

### M-03 - Duplicated Hooks and Page State Patterns

Area: React state management

Repeated patterns:

- `loading` / `error` / `reloadKey` state.
- `Promise.all` / `Promise.allSettled` data loading.
- filters + draft filters + offset reset.
- polling with `setTimeout`.
- copy-to-clipboard state with timeout.
- `Not Available` formatting helpers.

Risk:

- Small behavior differences across pages.
- Higher chance of stale updates after unmount.
- More code to audit when adding abort/cancellation.

Recommendation:

- Introduce small reusable hooks later:
  - `useAsyncResource`
  - `usePaginatedQuery`
  - `useClipboard`
  - `usePolling`
  - `useNotAvailableFormatter`

### M-04 - Redundant and Weakly Typed Models

Area: Models / API typing

Several frontend API models are strongly typed, but others intentionally use broad shapes:

- `CareerFeedbackOverview = Record<string, unknown>`
- `CareerFeedbackCompany = Record<string, unknown>`
- `CareerFeedbackSource = Record<string, unknown>`
- `CareerFeedbackCampaign = Record<string, unknown>`
- `CareerFeedbackExecution = Record<string, unknown>`
- `CandidateIntelligence = Record<string, unknown>`
- multiple execution detail sections as `Record<string, unknown>`

Risk:

- UI depends on runtime key guessing.
- Contract drift becomes hard to detect.
- Release candidate validation cannot guarantee shape compatibility.

Recommendation:

- Stabilize response models for v1 endpoints.
- Prefer typed DTOs plus explicit fallback parsing where the backend is intentionally flexible.

### M-05 - Accessibility Is Inconsistent

Area: Accessibility

Good signs:

- Many filters use labels or `aria-label`.
- Decorative SVGs commonly use `aria-hidden`.
- Header notification button has accessible label/title.

Issues to review:

- Custom tabs/segmented controls in execution detail need `aria-selected` / tab semantics or clearer button state.
- `aria-disabled` on anchors does not fully disable keyboard activation.
- Some loading/error areas do not announce changes with `aria-live`.
- Icon-only or compact controls should consistently expose accessible names.
- Tables need scope/semantic consistency across all pages.
- Focus is not managed after route changes, errors, modal confirmations, or refresh actions.

Recommendation:

- Add an accessibility pass before v1 focused on keyboard-only navigation, screen-reader labels, and focus restoration.

### M-06 - Localization Coverage Is Partial

Area: UX / i18n

The app has locale files for English, French, and Brazilian Portuguese, but many newer pages use hardcoded English strings. Some older text contains encoding artifacts, for example in legacy components and Portuguese password strings.

Risk:

- The selected language does not fully apply.
- Production UX feels unfinished for non-English users.

Recommendation:

- Define a v1 language policy:
  - Either English-only for v1 with locale switch hidden.
  - Or full translation coverage for all visible strings.
- Fix mojibake artifacts before release.

### M-07 - Mutating Capabilities Are Not Uniformly Reflected in UX

Area: UX / product flow

Examples:

- Opportunity feedback can be created/updated by API but not from Opportunity Details.
- Campaign replay exists by API but has no dashboard action.
- Scheduler can be created/updated/deleted by API but has no management UI.

Risk:

- Users cannot complete important loops from the dashboard.
- Admin Center cards may imply workflows that are not yet present.

Recommendation:

- Decide whether these are v1 workflows.
- If not v1, mark them explicitly as post-v1 in roadmap and avoid navigational affordances that imply complete functionality.

### M-08 - Search/Filter UX Is Reimplemented Repeatedly

Area: UX / Design System

Pages such as Opportunity Inbox, Repository, Search Audit, Campaign Results, and Campaign Comparison each implement their own filter/search/sort UI.

Risk:

- Inconsistent keyboard behavior and spacing.
- More code to maintain.
- Harder to add saved views or URL-synced filters later.

Recommendation:

- Promote `SearchToolbar` and `FilterBar` usage more consistently.
- Add standard sort/select controls and pagination controls.

### M-09 - Frontend Polling Needs a Shared Policy

Area: Performance / runtime behavior

Agent execution detail polls progress every 2 seconds while running. This is intentionally non-aggressive, but the policy is embedded locally.

Risk:

- Future polling features may use different intervals.
- Hidden tabs may continue polling unless guarded.

Recommendation:

- Centralize polling behavior with:
  - interval constants
  - visibility pause
  - abort/cancel handling
  - terminal status detection

## Low

### L-01 - Design System Radius and Card Style Are Not Fully Consistent

Area: Visual consistency

The Design System uses `rounded-xl` and some pages/components use `rounded-2xl`, custom borders, and custom shadows. This is not a functional issue, but it weakens consistency.

Recommendation:

- Choose a card radius standard for operational UI.
- Migrate repeated custom cards into `SectionCard`, `InfoCard`, or future `DataCard`.

### L-02 - Manual SVG Icons Are Repeated

Area: Maintainability / visual consistency

Several pages define inline SVG icons locally. This avoids dependencies, but makes icon sizing, labels, and visual style inconsistent.

Recommendation:

- Either standardize a small internal icon set or introduce a single approved icon source in a future design phase.

### L-03 - React Imports Remain in Components That Do Not Need Them

Area: Code cleanup

Examples:

- `AgentBrain.tsx`
- `AgreementLevel.tsx`
- `ConflictStatus.tsx`
- `DecisionNarrative.tsx`
- `DecisionVerdict.tsx`
- `KpiCard.tsx`

Because the project uses the modern JSX transform, these imports are likely unnecessary.

Recommendation:

- Clean during dead-code removal or lint adoption.

### L-04 - Generated Build Output Exists in Workspace

Area: Repository hygiene

The `dist/` directory is present. This may be intentional for local preview, but should be confirmed before release.

Recommendation:

- Confirm whether `dist/` is ignored and not committed.
- CI/CD should produce build artifacts rather than relying on local `dist/`.

### L-05 - Mixed Copy Tone and Labels

Area: UX writing

The dashboard mixes:

- `APPLY`, `DO_NOT_APPLY`, `Do not apply`
- `Agent Settings`, `Platform Health`
- English strings inside Portuguese/French locale flows
- `Feedback atual` inside an otherwise English Opportunity Details page

Recommendation:

- Create a terminology glossary for v1:
  - Campaign
  - Execution
  - Opportunity
  - Recommendation
  - Decision
  - Feedback
  - Scheduler

### L-06 - Some Counts Are Approximate Rather Than Total

Area: UX accuracy

Some pages use paginated `returned` counts or limited queries as displayed totals. For example, Administration Center uses recent/limited API calls for some card counts.

Recommendation:

- Label these as "shown", "recent", or "available from current query" unless the backend returns a true `total`.

## API Coverage Snapshot

### Frontend-Consumed Endpoint Groups

Confirmed consumed by the dashboard:

- Auth: login, refresh, logout, me, locale, activate, forgot/reset/change password.
- Admin users.
- Agent settings.
- Candidate profile.
- Resumes, including upload/default/archive/download.
- LinkedIn accounts.
- Campaign profiles.
- Opportunities list/detail/history/explain.
- Notifications list/read/read-all.
- Audit log list.
- Feedback analytics.
- Candidate intelligence.
- Resume optimization.
- Opportunity repository.
- Search audit.
- Agent executions list/detail/progress/results/downloads.
- Campaign context validation.
- Agent run.
- Scheduler list.
- Campaign history list.
- Health.

### Backend Endpoints With Missing or Partial Frontend Workflows

Needs product decision:

- Opportunity feedback create/update/read per opportunity.
- Campaign replay.
- Scheduler create/update/delete.
- Campaign detail by ID.
- Companies list/detail.
- Skills list.
- Feedback listing.
- Dashboard overview.

### Frontend Concepts With Missing or Partial Backend Support

Needs backend/product decision:

- Dedicated Audit Log page.
- Dedicated Scheduler management page.
- Queue/Worker/Schema health.
- Backend-provided campaign comparison.
- Full platform health telemetry.

## Design System Candidate Backlog

Recommended future additions:

- `DataTable`
- `KeyValueGrid`
- `JsonBlock`
- `Timeline`
- `TimelineStep`
- `ActionButton`
- `IconButton`
- `PaginationControls`
- `ClipboardButton`
- `ScoreBadge`
- `KpiGrid`
- `EntitySummaryCard`
- `FormField`
- `SelectField`
- `TextAreaField`

## Production Readiness Checklist

Before v1, consider validating:

- Route-level code splitting.
- Shared API client and auth refresh behavior.
- Error boundary for authenticated app shell.
- Accessibility smoke test.
- Keyboard-only navigation.
- Consistent i18n policy.
- Bundle budget.
- Environment variable documentation.
- CI build/typecheck/lint/test steps.
- API coverage matrix.
- Admin-only route verification.
- Manual QA scripts for critical user flows.

## Suggested Next Steps

1. Consolidate API transport and auth refresh behavior.
2. Decide v1 coverage for scheduler, replay, feedback, companies, skills, and dashboard overview.
3. Extract reusable table, key-value, JSON, pagination, and timeline components into the Design System.
4. Split `AgentExecutionsPage.tsx` and `OpportunityDetails.tsx`.
5. Add release validation scripts and route smoke tests.
6. Complete i18n or intentionally scope v1 to one language.
7. Run a focused accessibility pass.

## Non-Changes Confirmation

This review does not alter application behavior, backend behavior, APIs, contracts, authentication, Planner, Discovery, Match Engine, Ranking, Decision, or Recommendation. It is documentation only.
