# Repository Guidelines

## Project Structure & Module Organization
This repository is currently spec-first. Start with `.spec/design-doc-md-editor-chrome.md` for architecture, task scope, and manual verification steps. Use `.spec/tracker.md` to track task status and `.spec/escalations.md` for blockers that need a decision. The application scaffold has not been committed yet; when Task 1 lands, keep runtime code in `src/`, shared file-system logic in `src/services/`, UI pieces in `src/components/`, and treat `dist/` as generated build output.

## Build, Test, and Development Commands
There are no checked-in build scripts yet because the extension scaffold is still pending. Once Task 1 is implemented, standard commands should be:

- `npm install`: install Vite, React, and extension dependencies.
- `npm run dev`: start the local development server for UI work.
- `npm run build`: create the unpacked Chrome extension bundle in `dist/`.

Until those scripts exist, use the verification steps in `.spec/design-doc-md-editor-chrome.md` as the executable source of truth.

## Coding Style & Naming Conventions
The design doc targets React 18, TypeScript 5, Vite 5, Manifest V3, CodeMirror, and BlockNote. Follow a simple layout: 2-space indentation, PascalCase for React components (`MarkdownEditor.tsx`), camelCase for functions and hooks (`mountWorkspace`), and kebab-case only for non-code asset names when needed. Keep file-system access code isolated from UI code, and prefer small modules over large mixed-purpose files.

## Testing Guidelines
No automated test framework is committed yet. For now, every change must pass the manual checks in the design doc, especially Chrome extension loading, workspace mounting, and debounced file saves. When tests are added, prefer `*.test.ts` and `*.test.tsx` files near the code they cover or under `tests/`, and focus first on `src/services/fileSystem.ts`, editor routing, and save behavior.

## Commit & Pull Request Guidelines
This repository has no established commit history yet, so set the baseline now: use short imperative commit subjects such as `Add extension scaffold` or `Implement file tree sidebar`. Keep each commit focused on one task from `.spec/tracker.md`. Pull requests should name the task addressed, summarize behavior changes, list verification steps performed, and include screenshots or a short video for UI changes.

## Contributor Workflow
Before coding, read the relevant task in `.spec/design-doc-md-editor-chrome.md` and update `.spec/tracker.md`. If the implementation diverges from the spec, record the reason in `.spec/escalations.md` instead of leaving the change implicit.
