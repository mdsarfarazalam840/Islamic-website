# Feature Specification: Hadith-Sourced Duas & Adhkar

## User Stories & Acceptance Criteria

### User Story 1 - Browse hadith-backed remembrance (P1)
As a visitor, I can browse a substantial collection of duas and adhkar extracted
from the project's local hadith corpus, with Arabic, English meaning, category,
authenticity grade, narrator, and source citation.

**Acceptance Criteria**
- All seven local hadith collections are scanned during the reproducible build step.
- Selected entries retain stable IDs and collection/book/hadith references.
- The existing Hisn al-Muslim entries remain available in the same library.

### User Story 2 - Filter and navigate the combined library (P1)
As a visitor, I can filter by source, category, chapter, search text, and favorites,
and pagination remains correct after every filter change.

**Acceptance Criteria**
- Source filters distinguish Hisn al-Muslim from hadith-sourced entries.
- Search includes source metadata and hadith translation.
- Pagination displays 12 cards per page and resets after filter changes.

### User Story 3 - Verify the original hadith (P1)
As a visitor, I can open the original hadith reader from a hadith-sourced dua.

**Acceptance Criteria**
- Every hadith-sourced entry includes a link to its collection/book/hadith anchor.
- The card displays the available grade and narrator metadata.

### User Story 4 - Preserve existing behavior (P1)
As a visitor, existing favorites, audio, static export, and prayer navigation continue
to work.

**Acceptance Criteria**
- Existing Hisn audio and browser speech fallback remain functional.
- Saved favorites continue to use the existing bookmark store.
- TypeScript, lint, automated tests, production build, and browser smoke tests pass.

## Scope Notes

The complete local corpus contains all hadith records, but only records whose local
English text contains direct supplication/remembrance wording are published in the
Duas library. Unrelated legal, historical, and explanatory narrations remain in the
Hadith section and are linked through the existing reader.
