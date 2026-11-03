# Feature Specification: Quran Khatmah Reading Plans

**Feature Branch**: `002-quran-khatmah`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Implement Quran Khatmah / reading plans with daily reading goals, Juz progress, estimated completion date, gentle reminders, and streaks. Current progress only saves the latest position."

## User Scenarios & Testing

### User Story 1 - Create a Khatmah plan (Priority: P1)

As a reader, I can choose a completion duration and create a Quran reading plan.

**Independent Test**: Create a 30-day plan and verify the dashboard shows the daily goal, current progress, remaining ayahs, and estimated completion date.

**Acceptance Scenarios**:

1. Given no active plan, when the reader opens Khatmah, then they see a clear plan setup form with duration choices.
2. Given a selected duration, when the reader saves the plan, then the plan persists across refreshes.
3. Given an active plan, when the reader changes the duration, then the daily goal and ETA update without losing Quran reading position.

### User Story 2 - Track progress, Juz completion, and streaks (Priority: P1)

As a reader, I can see progress based on the Quran position I reach, Juz completion, today's goal, and consecutive active reading days.

**Independent Test**: Seed a plan and progress through ayahs, refresh the page, and verify the progress bar, Juz status, daily activity, and streak remain correct.

**Acceptance Scenarios**:

1. Given an active plan, when the reader reaches a new ayah in the Quran reader, then Khatmah progress records the furthest ayah without replacing the existing latest-position store.
2. Given progress through a Juz boundary, when the dashboard loads, then completed and current Juz indicators reflect the global ayah position.
3. Given activity on consecutive calendar days, when the dashboard loads, then the streak count increases; missed days reset the current streak while preserving total active days.

### User Story 3 - Gentle reminders (Priority: P2)

As a reader, I can enable a respectful daily reminder at a chosen time and see whether today's goal still needs attention.

**Independent Test**: Enable reminders, choose a time, reload the dashboard, and verify the setting persists and the browser notification permission flow is offered when supported.

**Acceptance Scenarios**:

1. Given an active plan, when the reader enables reminders and saves a time, then the preference persists locally.
2. Given reminder permission is unavailable or denied, when the reader saves the preference, then the plan still works and the UI explains that reminders require permission.
3. Given today's goal is complete, when the reminder check runs, then no duplicate reminder is sent for that day.

### User Story 4 - Preserve existing Quran behavior (Priority: P1)

As a reader, my current Quran position, Continue Reading card, navigation, fonts, and static export continue to work.

**Independent Test**: Use the Quran index, open a Surah, scroll to an ayah, use Continue Reading, and load the Khatmah dashboard in a fresh browser session.

**Acceptance Scenarios**:

1. Given existing `noor-reading-progress`, when the new feature is installed, then Continue Reading still links to the same ayah.
2. Given the Noor UI, when the Khatmah page renders, then it uses the existing display, Arabic, spacing, gold, and card design tokens.

## Edge Cases

- A plan started near the end of the Quran completes immediately when the furthest position reaches ayah 6236.
- A user changes device date or has no activity history; the dashboard remains usable and never displays negative goals.
- Browser notification APIs are unavailable, denied, or unsupported on static/mobile web contexts.
- Existing localStorage data is malformed or absent; the feature falls back to no active plan without breaking the reader.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a Khatmah dashboard with plan setup and active-plan summary.
- **FR-002**: The system MUST persist an active plan separately from the existing latest-position storage.
- **FR-003**: The system MUST calculate daily ayah goals, completed percentage, remaining ayahs, and estimated completion date.
- **FR-004**: The system MUST expose progress across all 30 Juz using existing global Quran ayah boundaries.
- **FR-005**: The system MUST record active reading days and calculate current and best streaks.
- **FR-006**: The system MUST support a persisted reminder preference and a gentle browser/native-compatible notification attempt.
- **FR-007**: The system MUST preserve existing Quran reader progress, Continue Reading, routes, fonts, and responsive design.
- **FR-008**: The system MUST provide meaningful automated and end-to-end checks for setup, persistence, progress, streaks, reminders, and existing Quran navigation.

### Key Entities

- **KhatmahPlan**: Active plan duration, start date, daily goal, reminder preference, and progress history.
- **DailyActivity**: Calendar date, furthest global ayah reached that day, and recorded ayah count.
- **JuzProgress**: Derived completion state from global Quran ayah boundaries and plan furthest progress.

## Success Criteria

- **SC-001**: A reader can create and resume a plan in under one minute.
- **SC-002**: Progress and settings survive reloads and do not alter existing Continue Reading data.
- **SC-003**: All 30 Juz display a deterministic completed/current/upcoming state.
- **SC-004**: Automated tests, TypeScript, lint, production build, and browser E2E pass.

## Assumptions

- Plans are local-first and do not require authentication or a server API.
- A linear Khatmah is tracked by the furthest Quran ayah reached; existing latest-position behavior remains independent.
- Browser notifications are best-effort and never block reading-plan use.
