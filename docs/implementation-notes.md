# Implementation Notes

## 1st Prototype Source

The first implementation was generated as a runnable Next.js MVP based on `docs/handoff.md`.

Included:
- Next.js App Router pages
- mock seed store data
- matching logic
- inquiry message generation
- localStorage-based manager updates
- README
- future Supabase schema

Current limitation:
- The first version uses mostly functional TypeScript modules.
- For the course context, the next implementation step is to strengthen object-oriented/domain-oriented structure without changing the MVP scope.
- The build has not yet been verified locally in the final GitHub repository.

## Next Codex Task

Codex should not rebuild the product from scratch. It should read the existing first prototype, verify that it runs, and strengthen the implementation.

Recommended task:

```txt
Read the current repository first, especially:
- docs/handoff.md
- docs/product-principles.md
- README.md
- src/lib/matching.ts
- src/lib/storeRepository.ts
- src/lib/message.ts
- src/lib/types.ts

This repository already contains a first MVP prototype generated from the handoff brief.

Your task is NOT to add new product features.
Your task is to verify, clean up, and strengthen the implementation for a course project.

Goals:
1. Make sure the app builds and runs.
2. Preserve the MVP scope:
   - no map
   - no auth
   - no payment
   - no real reservation confirmation
   - no exact real-time seat count promise
   - no Supabase runtime connection yet
3. Strengthen object-oriented/domain-oriented structure because this is for a computing/programming course.
4. Keep the UI mobile-first and suitable for screenshots.
5. Update README so it clearly explains:
   - problem definition
   - MVP scope
   - excluded features
   - matching logic
   - localStorage manager behavior
   - object-oriented design / responsibility separation
   - future field interview plan

Specific refactor request:
- Current core logic is mostly functional TypeScript modules.
- Refactor or wrap the core logic into clearer domain/service/repository responsibilities:
  - MatchEngine: evaluates and ranks stores
  - StoreRepository: reads seed data and merges localStorage overrides
  - InquiryMessageFactory or MessageService: creates inquiry messages
  - Store/SearchRequest/ReservationSlot/StoreMatchResult remain clear domain models

Do not over-engineer.
Do not rewrite the whole app unnecessarily.
Do not add excluded features.

After making changes, provide:
- changed files
- build/test result
- how to run locally
- what changed in the OOP/domain structure
- anything I should manually test
```

## Branch Recommendation

- Add first MVP prototype to `main`.
- Let Codex work on a new branch such as `codex/oop-refactor`.
- Merge after reviewing that product principles and MVP scope were preserved.

## Report Value

This workflow leaves evidence of:
1. Initial idea and product principles.
2. First runnable prototype.
3. Code review/refactor step.
4. Object-oriented/domain responsibility improvement.
5. Iterative development rather than one-shot generation.
