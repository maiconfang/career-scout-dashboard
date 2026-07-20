# Campaign Creation and Execution Journey Review

## Scope

This document maps the current dashboard journey for creating and running a Campaign in the Career Scout Platform. It reflects the current frontend implementation only.

No backend behavior, API contract, business rule, agent flow, or operational logic was changed as part of this review.

## Current Primary Question

The product should help a user answer:

> What do I need to do to run my first Campaign?

Today the answer exists in the platform, but it is distributed across several screens:

- Workspace
- Candidate Profile
- Resumes
- LinkedIn Accounts
- Discovery Sources
- Campaign Profiles
- Campaigns
- Run Campaign Wizard
- Agent Executions
- Campaign Results

## Current Entities

### Candidate Profile

Route:

- `/career/candidate-profile`

Purpose:

- Stores the professional profile used by the Campaign.
- Includes current occupation, desired occupation, career level, experience, preferred countries, provinces, employment types, remote preference, languages, resume text, and LinkedIn URL.

Required for first Campaign:

- Yes.

Current dependency:

- Campaign Profiles reference a Candidate Profile.
- The Run Campaign Wizard requires a candidate to be ready before running.

### Resume

Route:

- `/career/resumes`

Purpose:

- Stores uploaded resumes.
- Supports active resumes and a default resume.

Required for first Campaign:

- Yes.

Current dependency:

- Campaign Profiles reference a Resume.
- The Run Campaign Wizard requires a selected resume before running.

### LinkedIn Account

Route:

- `/career/linkedin-accounts`

Purpose:

- Stores LinkedIn account sessions used by the platform.
- Supports active accounts and a default account.
- Supports connection by login and by importing `storage_state.json`.

Required for first Campaign:

- Yes.

Current dependency:

- Campaign Profiles reference a LinkedIn Account.
- Discovery Sources are linked to a LinkedIn Account.
- The Run Campaign Wizard requires a selected LinkedIn Account before running.

### Discovery Source

Route:

- `/career/discovery-sources`

Purpose:

- Stores LinkedIn job search definitions.
- Each source is associated with a LinkedIn Account.
- Current UI supports search keywords, location, generated search name, active/inactive state, and execution interval.
- Legacy Search URLs are still supported by the API shape and existing records.

Required for first Campaign:

- Yes, operationally.

Current dependency:

- A Campaign can only run successfully when the selected LinkedIn Account has at least one active Discovery Source.
- The Run Campaign Wizard validates this in the LinkedIn step.
- The Workspace readiness checklist does not currently show Discovery Sources as a separate required item.

### Campaign Profile

Routes:

- `/career/campaign-profiles`
- `/agent/run-campaign`
- `/career/campaigns`

Purpose:

- Stores the Campaign configuration used by the backend.
- Binds together Candidate Profile, Resume, LinkedIn Account, search intent, objectives, and preferences.
- Supports active, archived, and default states.

Required for first Campaign:

- Yes.

Current dependency:

- `Run Campaign` sends a Campaign Profile ID to the backend.
- Campaigns cannot be executed without a Campaign Profile.

### Campaign Execution

Routes:

- `/agent/executions`
- `/agent/executions/:executionId`

Purpose:

- Represents a concrete run of a Campaign.
- Shows execution progress, timeline, status, metrics, errors, and results.

Required for first Campaign:

- Created automatically when the user runs a Campaign.

Current dependency:

- Depends on an existing Campaign Profile.
- Results depend on a completed or partially completed execution.

### Campaign Results and Recommendations

Routes:

- `/agent/executions/:executionId`
- `/repository`
- `/inbox`
- `/opportunities/:opportunityId`

Purpose:

- Shows opportunities, match scores, ranking scores, decisions, recommendations, and explainability.

Required for first Campaign:

- No for setup, yes for the post-run review journey.

## Current End-to-End Journey

The current journey to run a first Campaign is:

1. Login and land on Workspace.

2. Create or complete Candidate Profile.

   Route: `/career/candidate-profile`

   Required because Campaign Profiles and Campaign execution need candidate data.

3. Upload at least one Resume.

   Route: `/career/resumes`

   Required because Campaign Profiles reference a resume. A default resume improves selection but is not the only way to proceed.

4. Connect a LinkedIn Account.

   Route: `/career/linkedin-accounts`

   Required because Discovery depends on an authenticated LinkedIn session.

5. Create at least one active Discovery Source for the selected LinkedIn Account.

   Route: `/career/discovery-sources`

   Required because Discovery needs at least one active search source for the LinkedIn Account used by the Campaign.

6. Create a Campaign Profile.

   Current possible routes:

   - `/career/campaign-profiles`
   - `/agent/run-campaign?mode=create`
   - `/career/campaigns` via New Campaign

   Required because execution APIs run by Campaign Profile ID.

7. Run the Campaign.

   Current possible entry points:

   - `/career/campaigns`
   - `/agent/run-campaign`
   - Workspace quick actions
   - Campaign Inspector
   - Command Palette

8. Monitor the execution.

   Route: `/agent/executions/:executionId`

   Shows current status, timeline, progress, metrics, and failure details.

9. Review Campaign Results.

   Route: `/agent/executions/:executionId`

   Results are shown in the execution detail experience.

10. Review opportunities and recommendations.

   Routes:

   - `/inbox`
   - `/repository`
   - `/opportunities/:opportunityId`

11. Use learning and optimization screens.

   Routes:

   - `/analytics/career`
   - `/analytics/intelligence`
   - `/career/resume-optimization`

## Required Resources

The first successful Campaign currently requires:

- Candidate Profile
- Resume
- LinkedIn Account
- Active Discovery Source associated with that LinkedIn Account
- Campaign Profile referencing the chosen Candidate, Resume, and LinkedIn Account

## Optional or Supporting Resources

These are useful but not required before the first run:

- Campaign Inspector
- Campaign Comparison
- Search Audit
- Resume Optimization
- Career Intelligence
- Notifications
- Command Palette
- Opportunity Feedback
- Recommendation Explainability

## Current Navigation Map

### Workspace

Route:

- `/workspace`

Current role:

- Acts as the post-login landing page.
- Shows readiness for Candidate Profile, Resume, LinkedIn, Campaign Profile, and Ready to Run Campaign.

Current gap:

- Discovery Sources are not shown as a first-class readiness dependency.
- The Ready to Run Campaign action points users toward Campaign Profiles, even though the primary fast-run surface is now Career > Campaigns.

### Career > Campaigns

Route:

- `/career/campaigns`

Current role:

- Lists Campaign Profiles as Campaign cards.
- Shows summary information.
- Provides Run Campaign, Edit, Executions, and View Details actions.
- Loads Campaign Profiles, Candidate Profile, Resumes, LinkedIn Accounts, Discovery Sources, and recent Agent Executions.

Current value:

- This is the closest screen to a proper Campaign control center.

Current gap:

- It still competes with Campaign Profiles and Run Campaign Wizard as an entry point.

### Career > Campaign Profiles

Route:

- `/career/campaign-profiles`

Current role:

- Manages Campaign Profile records directly.
- Supports creating profiles, setting default, and archiving.

Current gap:

- The naming overlaps with Career > Campaigns.
- A new user may not understand whether they should use Campaigns, Campaign Profiles, or Run Campaign Wizard.

### Agent > Run Campaign Wizard

Route:

- `/agent/run-campaign`

Current role:

- Can create Campaigns, edit Campaigns, validate dependencies, and run Campaigns.
- Validates Candidate, Resume, LinkedIn Account, active Discovery Sources, Campaign Profile, and reference consistency.

Current value:

- It is the clearest guided setup flow.

Current gap:

- It mixes setup, editing, validation, and execution.
- Its placement under Agent makes it feel operational/debug-oriented rather than user setup-oriented.

### Campaign History

Route:

- `/campaigns`

Current role:

- Shows historical Campaign activity.

Current gap:

- Name overlaps with `/career/campaigns`.
- Users may expect this to be the Campaign management screen.

### Agent Executions

Route:

- `/agent/executions`

Current role:

- Shows execution history and execution detail.

Current gap:

- It overlaps conceptually with Campaign History.
- It is necessary after execution, but not obviously part of the first-run journey.

## Redundant or Confusing Areas

### Campaigns vs Campaign Profiles

There are two primary Career screens for similar concepts:

- Career > Campaigns
- Career > Campaign Profiles

The implementation treats Campaign cards as user-facing Campaigns, while the backend object is a Campaign Profile. This is technically valid, but the UI needs a clearer conceptual boundary.

### Campaign History vs Agent Executions

There are two execution-history surfaces:

- Campaign History
- Agent Executions

This can make it unclear where the user should go after running a Campaign.

### Wizard as Setup and Run Surface

The Run Campaign Wizard currently does several jobs:

- Create Campaign
- Edit Campaign
- Validate prerequisites
- Run Campaign

This makes it powerful but also harder to explain.

### Discovery Sources Dependency Appears Late

Discovery Sources are required for a successful Campaign, but the dependency is not visible in the Workspace readiness checklist. The user discovers the dependency mostly in the LinkedIn step of the Wizard or on Campaign cards.

### Multiple Run Entry Points

The user can start a Campaign from multiple places:

- Workspace
- Campaigns
- Run Campaign Wizard
- Campaign Inspector
- Command Palette

This is useful for power users, but can confuse first-time users unless one primary path is clearly signposted.

## Unnecessary Steps or Repeated Information

No confirmed business step appears unnecessary for the current architecture. However, the same concept is repeated in several places:

- Campaign setup appears in Campaign Profiles, Campaigns, and Run Campaign Wizard.
- Campaign execution appears in Campaigns, Run Campaign Wizard, Workspace, Campaign Inspector, and Command Palette.
- Execution review appears in Campaign History and Agent Executions.

The issue is not too many required resources. The issue is that the navigation does not clearly separate:

- Setup
- Execution
- Monitoring
- Results
- Diagnostics

## Recommended Product Model

The user-facing model should be:

1. Prepare account
2. Configure Campaign
3. Run Campaign
4. Review Results
5. Improve and repeat

This maps to current implementation as:

1. Prepare account

   - Candidate Profile
   - Resume
   - LinkedIn Account
   - Discovery Sources

2. Configure Campaign

   - Campaign Wizard or Campaign Profile form

3. Run Campaign

   - Career > Campaigns

4. Review Results

   - Agent Execution Detail
   - Campaign Results
   - Opportunity Repository
   - Opportunity Inbox

5. Improve and repeat

   - Resume Optimization
   - Career Intelligence
   - Campaign Comparison

## Suggestions Before Implementation

These are recommendations only. No UI changes were implemented in this sprint.

### 1. Make Career > Campaigns the primary Campaign hub

Position `/career/campaigns` as the main place to:

- Understand Campaign readiness.
- View Campaign configuration.
- Run Campaigns.
- Open executions.
- Edit configuration.

### 2. Treat the Wizard as Create/Edit only

The Wizard should remain available, but its primary job should be:

- New Campaign
- Edit Campaign
- Validate setup

Quick execution should happen from Career > Campaigns.

### 3. Add Discovery Sources to Workspace Readiness

Workspace should show Discovery Sources as a required dependency:

- Candidate Profile
- Resume
- LinkedIn Account
- Discovery Sources
- Campaign
- Ready to Run

### 4. Clarify naming

Consider making UI labels more explicit:

- Campaigns: user-facing Campaign control center.
- Campaign Profiles: advanced configuration or legacy/admin-facing label.
- Campaign History: previous runs.
- Agent Executions: technical execution monitor.

### 5. Add a First Campaign checklist

The Campaigns page should explain the exact path:

1. Complete Candidate Profile
2. Upload Resume
3. Connect LinkedIn
4. Add Discovery Sources
5. Create Campaign
6. Run Campaign

Each item should link to the correct page and show status.

### 6. Surface blocking dependencies on Campaign cards

Each Campaign card should clearly show:

- Candidate ready
- Resume ready
- LinkedIn connected
- Active Discovery Sources count
- Ready to run or blocked

### 7. Demote diagnostic tools for first-time users

Campaign Inspector, Search Audit, and Agent Executions are valuable, but they should not be perceived as required setup steps for a first Campaign.

### 8. Align post-run navigation

After a Campaign starts, the user should be taken to Execution Detail. From there, results should be easy to find with clear labels:

- Progress
- Timeline
- Results
- Recommendations
- Errors

## Proposed First-Run Answer

The platform should eventually communicate this simple answer:

To run your first Campaign:

1. Complete your Candidate Profile.
2. Upload a Resume.
3. Connect a LinkedIn Account.
4. Create at least one active Discovery Source for that LinkedIn Account.
5. Create a Campaign using those resources.
6. Run it from Career > Campaigns.
7. Review progress and results in Agent Executions.

## Implementation Status

This sprint created documentation only.

No frontend behavior was changed.

No backend behavior was changed.

No API, endpoint, authentication, IAM, Campaign Runner, Discovery Agent, Match Engine, Ranking, Decision, or Recommendation logic was changed.
