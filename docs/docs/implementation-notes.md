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
- The first version uses functional TypeScript modules.
- For the course context, the next implementation step is to strengthen object-oriented/domain-oriented structure without changing the MVP scope.

Next Codex task:
- Import the first prototype into the GitHub repository.
- Verify that it runs.
- Refactor core logic into domain/service/repository structure.
- Preserve product principles and avoid adding excluded features.
