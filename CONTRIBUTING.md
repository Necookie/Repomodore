# Contributing to Repomodore

Thank you for contributing to Repomodore! We are committed to fostering a welcoming, calm, and productive community.

## Development Workflow

1. **Branching Strategy**:
   - Work on dedicated feature or fix branches branched off `main` (e.g., `feat/timer-state`, `fix/deadline-recovery`).
   - Use small, substantive commits following [Conventional Commits](https://www.conventionalcommits.org/):
     - `feat(...)`: New features
     - `fix(...)`: Bug fixes
     - `test(...)`: Adding or updating tests
     - `docs(...)`: Documentation updates
     - `refactor(...)`: Code refactoring without behavior change

2. **Pull Requests**:
   - Open a pull request targeting `main`.
   - Provide a clear description of changes, rationale, and manual test evidence.
   - Ensure all automated checks (linting, type checking, unit tests) pass.

3. **Code Guidelines**:
   - Write clean, type-safe TypeScript code.
   - Maintain 44px+ tap targets and full accessibility labeling for TalkBack/VoiceOver.
   - Never commit sensitive secrets (`.env`, auth tokens, API keys).
