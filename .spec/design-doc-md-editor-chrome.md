# Markdown Editor Chrome Extension - System Design Doc

## Overview

A Chrome Extension that turns the browser into a local workspace editor. Markdown files (`.md`, `.markdown`) should open in a BlockNote-based WYSIWYG editor only when they pass a compatibility guard; otherwise they fall back to source editing in CodeMirror to avoid silent Markdown loss. All other files are opened in CodeMirror when they decode as UTF-8 text. Binary files and unsupported encodings are rejected with an explicit error state. The app uses the File System Access API for local read/write, lazy directory loading for scale, debounced auto-save, Vitest for unit coverage, and Playwright for agent-verifiable browser flows.

## Tech Stack

### Frontend

| Technology           | Version | Purpose                                                 |
| -------------------- | ------- | ------------------------------------------------------- |
| React                | 18.x    | UI library for the extension editor page                |
| TypeScript           | 5.x     | Type safety                                             |
| Vite                 | 5.x     | Local dev server and bundler                            |
| @vitejs/plugin-react | 4.x     | React integration for Vite                              |
| @crxjs/vite-plugin   | 2.x     | Manifest V3 Chrome extension build support              |
| BlockNote            | latest  | WYSIWYG editor for compatible Markdown files            |
| @mantine/core        | 7.x     | Peer dependency required by `@blocknote/mantine`        |
| @mantine/hooks       | 7.x     | Peer dependency required by `@blocknote/mantine`        |
| CodeMirror 6         | 6.x     | Source editor for text files and Markdown fallback mode |
| Lucide React         | latest  | Icons for workspace UI                                  |

### Testing

| Technology                | Version | Purpose                                        |
| ------------------------- | ------- | ---------------------------------------------- |
| Vitest                    | 1.x     | Unit tests for pure logic and React components |
| @testing-library/react    | 14.x    | Component behavior tests                       |
| @testing-library/jest-dom | 6.x     | DOM assertions                                 |
| Playwright                | 1.x     | Browser verification and extension smoke tests |

### Infrastructure / Environment

| Technology                             | Purpose                                                             |
| -------------------------------------- | ------------------------------------------------------------------- |
| Chrome Extension (Manifest V3)         | Production target; app runs from an extension page                  |
| File System Access API                 | Local folder read/write with user-granted permissions               |
| `http://127.0.0.1` via Vite dev server | Secure local origin for development and Playwright MCP verification |

> **Defaults note:** Use vanilla CSS / CSS Modules unless a stronger reason appears later.

## Components

### 1. Workspace Manager (File System Service)

**Status:** ✅ Fully specified below\
\
\
\
Wraps `FileSystemDirectoryHandle` / `FileSystemFileHandle`. Handles permission checks, lazy directory enumeration, UTF-8 decoding, binary rejection, and writes.

### 2. Sidebar Navigation (File Tree)

**Status:** ✅ Fully specified below\
\
\
\
Displays the mounted workspace. Directories load children lazily on expand instead of recursively reading the full workspace up front.

### 3. Editor Router

**Status:** ✅ Fully specified below\
\
\
\
Routes `.md` / `.markdown` files to a Markdown compatibility check first. Compatible Markdown opens in BlockNote; incompatible Markdown falls back to CodeMirror source mode with a warning. Other text files open in CodeMirror directly.

### 4. Markdown Compatibility Guard

**Status:** ✅ Fully specified below\
\
\
\
Protects against silent data loss from BlockNote’s lossy Markdown import/export. A Markdown file is BlockNote-compatible only if import/export preserves the file after a narrow normalization step.

### 5. Markdown Editor (BlockNote)

**Status:** ✅ Fully specified below\
\
\
\
Used only for Markdown files that pass the compatibility guard. Edits are serialized back to Markdown and auto-saved after a 500ms debounce.

### 6. Text Editor (CodeMirror)

**Status:** ✅ Fully specified below\
\
\
\
Used for non-Markdown text files and Markdown files that fail the compatibility guard.

### 7. Unsupported File State

**Status:** ✅ Fully specified below\
\
\
\
Renders a clear error panel for binary files, unsupported encodings, permission failures, or failed reads. Unsupported files are never opened in an editor and never auto-saved.

### 8. Test Workspace Adapter

**Status:** ✅ Fully specified below\
\
\
\
Provides a mock file system service for Playwright and unit tests so agents can verify flows without automating the native directory picker.

## Data Model

### TypeScript Interfaces

```typescript
export interface FileNode {
  name: string;
  kind: "file" | "directory";
  path: string;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle | null;
  children?: FileNode[];
  childrenLoaded?: boolean;
}

export type LoadFileResult =
  | {
      kind: "text";
      path: string;
      content: string;
      editor: "markdown" | "text";
      warning?: string;
    }
  | {
      kind: "error";
      path: string;
      reason: "binary" | "unsupported_encoding" | "permission_denied" | "read_failed";
      message: string;
    };

export interface ActiveFile {
  node: FileNode;
  state: LoadFileResult;
}
```

## API Contracts / Core Services

```javascript
export interface FileSystemService {
  mountWorkspace(): Promise<FileSystemDirectoryHandle>;
  ensurePermission(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    mode: "read" | "readwrite"
  ): Promise<boolean>;
  readDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath?: string
  ): Promise<FileNode[]>;
  readEditableFile(fileHandle: FileSystemFileHandle, path: string): Promise<LoadFileResult>;
  writeFile(fileHandle: FileSystemFileHandle, content: string): Promise<void>;
}

export interface MarkdownCompatibilityResult {
  compatible: boolean;
  normalizedMarkdown: string;
  warning?: string;
}

export function checkMarkdownCompatibility(rawMarkdown: string): Promise<MarkdownCompatibilityResult>;
export function isMarkdownPath(path: string): boolean;
export function isLikelyBinary(buffer: ArrayBuffer): boolean;
```

### Compatibility Guard Rule

Use BlockNote only when this sequence succeeds:

1. Parse raw Markdown into BlockNote blocks.

2. Serialize the blocks back to Markdown.

3. Normalize both strings with this exact helper:

```typescript
function normalizeComparableMarkdown(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd();
}
```

4. If the normalized strings differ, do **not** mount BlockNote. Open the file in CodeMirror with a warning banner: `Opened in source mode because this Markdown file cannot round-trip safely through the block editor.`

This rule is intentionally strict. It prevents silent corruption even if it routes more files to source mode during the MVP.

### Text File Rule

All non-Markdown files are candidates for CodeMirror. Before rendering, the service must:

1. Read the file bytes.

2. Reject the file as binary if either condition is true:

   * The first 8 KB contains a `0x00` byte.

   * `new TextDecoder("utf-8", { fatal: true })` throws while decoding.

3. Return `kind: "error"` with a user-facing message for binary or invalid UTF-8 content.

The MVP assumes UTF-8 only. Unsupported encodings are treated as unsupported files, not auto-converted.

## Core User Flows

### Flow 1: Mounting a Workspace

| Step | User Action                                | System Behavior                                               |
| ---- | ------------------------------------------ | ------------------------------------------------------------- |
| 1    | Clicks extension icon or opens the dev URL | App shell loads                                               |
| 2    | Clicks `Open Folder`                       | Calls `showDirectoryPicker({ mode: "readwrite" })`            |
| 3    | Approves the folder prompt                 | Service stores the root handle and loads top-level nodes only |
| 4    | Expands a directory in the sidebar         | Service reads that directory lazily and caches its children   |

### Flow 2: Editing a Compatible Markdown File

| Step | User Action           | System Behavior                                                           |
| ---- | --------------------- | ------------------------------------------------------------------------- |
| 1    | Clicks `notes.md`     | Service reads file bytes, decodes UTF-8, and runs the compatibility guard |
| 2    | Guard passes          | App mounts BlockNote                                                      |
| 3    | User edits content    | BlockNote updates internal state                                          |
| 4    | User pauses for 500ms | App serializes Markdown and calls `writeFile`                             |

### Flow 3: Editing an Incompatible Markdown File

| Step | User Action                  | System Behavior                                             |
| ---- | ---------------------------- | ----------------------------------------------------------- |
| 1    | Clicks `notes-with-table.md` | Service reads raw Markdown and runs the compatibility guard |
| 2    | Guard fails                  | App opens CodeMirror instead of BlockNote                   |
| 3    | -                            | Warning banner explains why source mode was chosen          |
| 4    | User edits content           | CodeMirror auto-saves raw text after 500ms                  |

### Flow 4: Opening a Binary File

| Step | User Action        | System Behavior                                                 |
| ---- | ------------------ | --------------------------------------------------------------- |
| 1    | Clicks `image.png` | Service reads the first bytes                                   |
| 2    | Binary check fails | App renders the unsupported file state                          |
| 3    | -                  | Message explains that binary files cannot be edited in this MVP |

## Implementation Plan

### Task 1: Extension Scaffolding & Test Harness

**Dependencies:** None

**Pre-conditions (verify before starting):**

* `node --version` → expect: v18+ or v20+

**Environment bootstrap:**

* `npm init -y`

* `npm install react react-dom lucide-react`

* `npm install -D typescript vite @vitejs/plugin-react @crxjs/vite-plugin @types/react @types/react-dom`

* `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test`

* `npx playwright install chromium`

**Scope:** Scaffold the project directly at the repository root. Do not create a nested `md-editor-chrome/` directory. Configure a Manifest V3 extension build, a dev server entry for browser-based verification, Vitest, and Playwright.

**Acceptance criteria:**

* [ ] Root-level `package.json`, `tsconfig.json`, `vite.config.ts`, and extension manifest source are committed.
* [ ] `npm run dev` serves the app on `127.0.0.1`.
* [ ] `npm run build` produces a loadable Chrome extension in `dist/`.
* [ ] `npm run test` and `npm run test:e2e` both execute successfully.

**Verification (run after completion):**

* `npm run build`

* `npm run test`

* `npm run test:e2e`

***

### Task 2: File System Service, Mock Workspace & UI Shell

**Dependencies:** Task 1

**Scope:** Implement `BrowserFileSystemService`, a `MockFileSystemService` for tests, the app shell, and the lazy-loading file tree. Add explicit permission handling via `ensurePermission`. Add a test-mode mount path exposed by the UI when running with `?fs=mock`.

**Acceptance criteria:**

* [ ] `src/services/fileSystem.ts` exports `mountWorkspace`, `ensurePermission`, `readDirectory`, `readEditableFile`, and `writeFile`.
* [ ] The sidebar loads top-level nodes first and only reads directory children on expansion.
* [ ] Permission denial returns a visible error state instead of failing silently.
* [ ] Test mode can mount a fixture workspace without using the native folder picker.
* [ ] Unit tests cover permission-denied and lazy-directory behavior.

**Verification (run after completion):**

* `npm run test -- src/services/fileSystem.test.ts`

* `npm run dev -- --host 127.0.0.1 --mode test`

* Playwright MCP: open `http://127.0.0.1:5173/?fs=mock`, click `Open Fixture Workspace`, expand a directory, verify children render lazily

***

### Task 3: Editor Router, Text Editor & Binary Rejection

**Dependencies:** Task 2

**Environment bootstrap:**

* `npm install codemirror @uiw/react-codemirror @codemirror/lang-json @codemirror/lang-javascript @codemirror/lang-markdown`

**Scope:** Implement file selection, extension-based editor routing, the CodeMirror text editor, UTF-8 decode handling, binary rejection, and 500ms debounced auto-save. All non-Markdown files should route to CodeMirror when they are valid UTF-8 text.

**Acceptance criteria:**

* [ ] Clicking a text file highlights it and opens CodeMirror with file content.
* [ ] `.txt`, `.json`, `.js`, and Markdown source-fallback files render in CodeMirror with language extensions where applicable.
* [ ] Binary files render an explicit unsupported-file panel and never mount an editor.
* [ ] Invalid UTF-8 files render an explicit unsupported-file panel and never mount an editor.
* [ ] Debounced saves call `writeFile` only after 500ms of inactivity.
* [ ] Unit tests cover binary detection, UTF-8 rejection, and debounced save behavior.

**Verification (run after completion):**

* `npm run test -- src/utils/fileType.test.ts src/components/TextEditor.test.tsx`

* `npm run test:e2e -- tests/e2e/text-editor.spec.ts`

* Playwright MCP: open `http://127.0.0.1:5173/?fs=mock`, verify `data.json` opens in CodeMirror and `image.png` shows the error state

***

### Task 4: Markdown Editor & Compatibility Guard

**Dependencies:** Task 3

**Environment bootstrap:**

* `npm install @blocknote/core @blocknote/react @blocknote/mantine @mantine/core @mantine/hooks`

**Scope:** Implement the BlockNote editor, the Markdown compatibility guard, the Markdown warning banner, and source-mode fallback. Import the required BlockNote stylesheet. Markdown files only mount BlockNote if they pass the strict compatibility rule defined above.

**Acceptance criteria:**

* [ ] `.md` and `.markdown` files run through `checkMarkdownCompatibility` before editor selection.
* [ ] Compatible Markdown files mount BlockNote and auto-save serialized Markdown after 500ms.
* [ ] Incompatible Markdown files fall back to CodeMirror with a warning banner.
* [ ] Unit tests cover the compatibility guard with both compatible and incompatible fixtures.
* [ ] Playwright verifies one compatible Markdown fixture and one incompatible Markdown fixture end to end.

**Verification (run after completion):**

* `npm run test -- src/utils/markdownCompatibility.test.ts src/components/EditorRouter.test.tsx`

* `npm run test:e2e -- tests/e2e/markdown-editor.spec.ts`

* Playwright MCP: open `http://127.0.0.1:5173/?fs=mock`, verify `notes.md` opens in BlockNote and `notes-with-table.md` falls back to CodeMirror with the warning banner

## Verification Plan

### Test Fixtures

Commit a deterministic fixture workspace under `tests/fixtures/workspace/` with at least:

* `notes.md` → compatible Markdown sample

* `notes-with-table.md` → incompatible Markdown sample that should fall back to source mode

* `data.json` → UTF-8 text sample

* `image.png` → binary sample

### Unit Test Requirements

Use Vitest for pure logic and component coverage. Minimum required suites:

* `src/services/fileSystem.test.ts`

* `src/utils/fileType.test.ts`

* `src/utils/markdownCompatibility.test.ts`

* `src/components/EditorRouter.test.tsx`

* `src/components/TextEditor.test.tsx`

### Playwright Requirements

Use Playwright in two ways:

1. **Runner-based regression tests**

   * `tests/e2e/text-editor.spec.ts`

   * `tests/e2e/markdown-editor.spec.ts`

   * Optional: `tests/e2e/extension-launch.spec.ts` for unpacked-extension launch smoke

2. **Playwright MCP verification**

   * Start the app in test mode: `npm run dev -- --host 127.0.0.1 --mode test`

   * Open `http://127.0.0.1:5173/?fs=mock`

   * Click `Open Fixture Workspace`

   * Verify:

     * `notes.md` opens in BlockNote

     * `notes-with-table.md` opens in CodeMirror with the fallback warning

     * `data.json` opens in CodeMirror and saves after editing

     * `image.png` shows the unsupported-file message

### Build Verification

* `npm run build` → succeeds and writes the extension bundle to `dist/`

* `npm run test`

* `npm run test:e2e`

## Open Questions

| # | Question                                                                                                           | Impact                              | Blocked Tasks |
| - | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------- |
| 1 | Should the workspace handle be cached in IndexedDB so the user does not have to pick the same folder each session? | UX improvement for returning users. | None          |
