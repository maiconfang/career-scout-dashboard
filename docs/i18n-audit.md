# Career Scout Dashboard i18n Audit

Date: 2026-07-18

Scope: `career-scout-dashboard`.

Backend review was not performed in this pass because the detected issues are concentrated in the React interface and no API contract change was required.

## Executive Summary

The platform has working locale infrastructure for English, French, and Portuguese (Brazil). Locale selection is available before authentication, persists locally, and continues after login through the existing `LanguageProvider`.

The translation dictionaries are structurally aligned: `en.json`, `fr.json`, and `pt-BR.json` contain the same keys.

However, the product is not yet fully internationalized. Static analysis still identifies 382 possible hardcoded UI strings across pages, modals, command surfaces, and administration flows. The highest-risk user-visible areas are Access Requests, Admin Users, Administration Center, public onboarding pages, Agent Executions detail sections, and analytics pages.

## What Was Audited

- Locale provider and local persistence.
- Login language selection.
- Translation dictionary key parity.
- Encoding issues in translation files.
- Global components used across authenticated screens.
- Recently added pages:
  - Campaigns
  - Resume Optimization
- Static scan for user-visible strings in React and TypeScript files.

## Fixed During This Audit

- Added pre-authentication language selector to the Login page.
- Kept selected language through the existing local persistence flow.
- Added an automated i18n check command: `npm run i18n:check`.
- Ensured all locale dictionaries share the same keys.
- Corrected clear encoding corruption in password and Discovery Source translations.
- Internationalized global route loading text.
- Internationalized Header command palette labels.
- Internationalized Opportunity status labels.
- Internationalized Command Palette user-facing text.
- Internationalized the Campaigns page and Campaign detail drawer.
- Internationalized the Resume Optimization page.

## Critical

None found in the current audit pass.

No locale issue currently blocks the application from building or prevents users from switching languages.

## High

- Many administration and onboarding screens still contain hardcoded English strings.
  - Examples:
    - `src/pages/AccessRequestsPage.tsx`
    - `src/pages/AdminUsersPage.tsx`
    - `src/pages/AdministrationCenterPage.tsx`
    - `src/pages/AccessRequestStatusPage.tsx`
    - `src/pages/AccessRequestSuccessPage.tsx`
- Generic API error fallbacks in `src/lib/httpClient.ts` are still fixed English strings. These should be supplied by callers or mapped through localized UI-level error keys.
- Some route/page surfaces still mix translated navigation labels with hardcoded internal page content.

## Medium

- Static analysis still reports hundreds of possible user-visible strings. Some are false positives, but most represent real i18n debt.
- Some translations intentionally retain platform terms such as `Campaign Profile`, `Discovery Source`, `Dashboard`, and `Workspace`. These terms should be documented in a glossary to keep usage consistent.
- French and Portuguese translations are now structurally complete, but several older phrases still need editorial review for SaaS-quality tone.

## Low

- The i18n checker is conservative and reports some non-user-facing strings. It should be refined over time as hardcoded UI debt is reduced.
- Some date/number formatting still uses fixed locales in older pages. These should gradually move to the selected locale.

## Automated Validation

Commands executed:

- `npm run i18n:check`
  - Result: passed dictionary parity.
  - Remaining warnings: 382 possible hardcoded UI strings.
- `npm run build`
  - Result: passed.

## Recommended Next Steps

1. Internationalize the public onboarding flow:
   - Access Request
   - Access Request Success
   - Access Request Status
2. Internationalize administration flows:
   - Access Requests
   - Users and Invitations
   - Administration Center
3. Internationalize analytics and agent detail pages.
4. Move page-level API error fallbacks from generic English strings to localized UI keys.
5. Add a glossary for product terms that should remain untranslated or be translated consistently.
6. Consider making `npm run i18n:check` part of CI once the remaining warnings are reduced to an acceptable threshold.

## Conclusion

The platform now has a stronger i18n foundation and automated drift detection, but it has not yet reached the final acceptance target of zero hardcoded user-facing strings. The remaining work is visible, measurable, and concentrated in known pages.
