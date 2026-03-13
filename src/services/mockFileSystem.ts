import { FileSystemService, FileNode, LoadFileResult } from '../types';

interface MockFileSystemTree {
  [key: string]: string | ArrayBuffer | MockFileSystemTree;
}

type MockFileSystemEntry = string | ArrayBuffer | MockFileSystemTree;

const DEFAULT_MOCK_FILE_SYSTEM: MockFileSystemTree = {
    'SUBMISSION_GUIDE.md': `# Submitting to the Chrome Web Store

This guide outlines the steps required to publish the Markdown Editor extension to the Chrome Web Store.

## 1. Prepare the Extension for Production

Before submitting, you need to create a production-ready \`.zip\` file of the extension.

1. **Clean and Build:** Ensure you have a fresh, error-free build.

\`\`\`bash
npm run build
\`\`\`

1. **Zip the Output:** Compress the contents of the \`dist\` directory (not the \`dist\` folder itself, but the files *inside* it).

\`\`\`bash
cd dist
zip -r ../markdown-editor-extension.zip *
cd ..
\`\`\`

*You will upload&#x20;*\`markdown-editor-extension.zip\`*&#x20;to the developer dashboard.*

## 2. Prepare Store Listing Assets

You will need several visual assets and descriptions for your store page:

* **Extension Name:** "OpusPad"
* **Short Description:** (Max 132 characters) "Bridging AI output and human intent, WYSIWYG, private, local only."

* **Detailed Description:** A full explanation of features (similar to the README).

* **Store Icon:** 128x128 pixels (PNG).

* **Screenshots:** At least one, ideally 1280x800 or 640x400 pixels (JPEG or PNG). It should show the editor, the sidebar, and the "Open Folder" button.

* **Promo Tile (Optional but recommended):** 440x280 pixels.

## 3. Create a Developer Account

If you don't already have one, you need to register as a Chrome Web Store developer.

1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

2. Sign in with your Google account.

3. Pay the one-time \$5.00 developer registration fee.

## 4. Upload and Submit

1. **Upload the Zip:** In the Developer Dashboard, click **New Item** and upload the \`markdown-editor-extension.zip\` file you created in Step 1.

2. **Fill out the Store Listing:**

   * Enter your descriptions.

   * Upload your icon and screenshots.

   * Select an appropriate category (e.g., "Productivity" or "Developer Tools").

3. **Fill out the Privacy tab:** This is crucial for approval.

   * **Single Purpose:** State clearly that the extension's sole purpose is to allow users to edit local text and markdown files.

   * **Permission Justification:** Even though our \`manifest.json\` currently has an empty \`permissions\` array (because we use the native File System Access API which is triggered by user action, not a manifest permission), you still need to declare how you handle user data.

   * **Data Usage:** State that the extension operates entirely locally. It does not collect, transmit, or sell user data, file contents, or directory structures.

4. **Submit for Review:** Click **Submit for Review**.

## 5. Review Process

* Initial reviews typically take a few days, but can take up to a few weeks depending on the queue and the complexity of the extension.

* Because this extension uses the **File System Access API** to read and write to the user's local disk, Google reviewers may scrutinize it closely to ensure it is not malicious.

* Ensure your Privacy justifications clearly emphasize that file access is **explicitly user-initiated** (via the directory picker) and that **no file data ever leaves the user's local machine**.
`,
    'design-doc-md-editor-chrome.md': `# Markdown Editor Chrome Extension - System Design Doc

## Overview

A Chrome Extension that turns the browser into a local workspace editor. Markdown files (\`.md\`, \`.markdown\`) should open in a BlockNote-based WYSIWYG editor only when they pass a compatibility guard; otherwise they fall back to source editing in CodeMirror to avoid silent Markdown loss. All other files are opened in CodeMirror when they decode as UTF-8 text. Binary files and unsupported encodings are rejected with an explicit error state. The app uses the File System Access API for local read/write, lazy directory loading for scale, debounced auto-save, Vitest for unit coverage, and Playwright for agent-verifiable browser flows.

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
| @mantine/core        | 7.x     | Peer dependency required by \`@blocknote/mantine\`        |
| @mantine/hooks       | 7.x     | Peer dependency required by \`@blocknote/mantine\`        |
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
| \`http://127.0.0.1\` via Vite dev server | Secure local origin for development and Playwright MCP verification |

> **Defaults note:** Use vanilla CSS / CSS Modules unless a stronger reason appears later.

## Components

### 1. Workspace Manager (File System Service)

**Status:** ✅ Fully specified below\
\
\
\
Wraps \`FileSystemDirectoryHandle\` / \`FileSystemFileHandle\`. Handles permission checks, lazy directory enumeration, UTF-8 decoding, binary rejection, and writes.

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
Routes \`.md\` / \`.markdown\` files to a Markdown compatibility check first. Compatible Markdown opens in BlockNote; incompatible Markdown falls back to CodeMirror source mode with a warning. Other text files open in CodeMirror directly.

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

\`\`\`typescript
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
\`\`\`

## API Contracts / Core Services

\`\`\`javascript
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
\`\`\`

### Compatibility Guard Rule

Use BlockNote only when this sequence succeeds:

1. Parse raw Markdown into BlockNote blocks.

2. Serialize the blocks back to Markdown.

3. Normalize both strings with this exact helper:

\`\`\`typescript
function normalizeComparableMarkdown(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+\$/gm, "").trimEnd();
}
\`\`\`

4. If the normalized strings differ, do **not** mount BlockNote. Open the file in CodeMirror with a warning banner: \`Opened in source mode because this Markdown file cannot round-trip safely through the block editor.\`

This rule is intentionally strict. It prevents silent corruption even if it routes more files to source mode during the MVP.

### Text File Rule

All non-Markdown files are candidates for CodeMirror. Before rendering, the service must:

1. Read the file bytes.

2. Reject the file as binary if either condition is true:

   * The first 8 KB contains a \`0x00\` byte.

   * \`new TextDecoder("utf-8", { fatal: true })\` throws while decoding.

3. Return \`kind: "error"\` with a user-facing message for binary or invalid UTF-8 content.

The MVP assumes UTF-8 only. Unsupported encodings are treated as unsupported files, not auto-converted.

## Core User Flows

### Flow 1: Mounting a Workspace

| Step | User Action                                | System Behavior                                               |
| ---- | ------------------------------------------ | ------------------------------------------------------------- |
| 1    | Clicks extension icon or opens the dev URL | App shell loads                                               |
| 2    | Clicks \`Open Folder\`                       | Calls \`showDirectoryPicker({ mode: "readwrite" })\`            |
| 3    | Approves the folder prompt                 | Service stores the root handle and loads top-level nodes only |
| 4    | Expands a directory in the sidebar         | Service reads that directory lazily and caches its children   |

### Flow 2: Editing a Compatible Markdown File

| Step | User Action           | System Behavior                                                           |
| ---- | --------------------- | ------------------------------------------------------------------------- |
| 1    | Clicks \`notes.md\`     | Service reads file bytes, decodes UTF-8, and runs the compatibility guard |
| 2    | Guard passes          | App mounts BlockNote                                                      |
| 3    | User edits content    | BlockNote updates internal state                                          |
| 4    | User pauses for 500ms | App serializes Markdown and calls \`writeFile\`                             |

### Flow 3: Editing an Incompatible Markdown File

| Step | User Action                  | System Behavior                                             |
| ---- | ---------------------------- | ----------------------------------------------------------- |
| 1    | Clicks \`notes-with-table.md\` | Service reads raw Markdown and runs the compatibility guard |
| 2    | Guard fails                  | App opens CodeMirror instead of BlockNote                   |
| 3    | -                            | Warning banner explains why source mode was chosen          |
| 4    | User edits content           | CodeMirror auto-saves raw text after 500ms                  |

### Flow 4: Opening a Binary File

| Step | User Action        | System Behavior                                                 |
| ---- | ------------------ | --------------------------------------------------------------- |
| 1    | Clicks \`image.png\` | Service reads the first bytes                                   |
| 2    | Binary check fails | App renders the unsupported file state                          |
| 3    | -                  | Message explains that binary files cannot be edited in this MVP |

## Implementation Plan

### Task 1: Extension Scaffolding & Test Harness

**Dependencies:** None

**Pre-conditions (verify before starting):**

* \`node --version\` → expect: v18+ or v20+

**Environment bootstrap:**

* \`npm init -y\`

* \`npm install react react-dom lucide-react\`

* \`npm install -D typescript vite @vitejs/plugin-react @crxjs/vite-plugin @types/react @types/react-dom\`

* \`npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test\`

* \`npx playwright install chromium\`

**Scope:** Scaffold the project directly at the repository root. Do not create a nested \`md-editor-chrome/\` directory. Configure a Manifest V3 extension build, a dev server entry for browser-based verification, Vitest, and Playwright.

**Acceptance criteria:**

* [ ] Root-level \`package.json\`, \`tsconfig.json\`, \`vite.config.ts\`, and extension manifest source are committed.
* [ ] \`npm run dev\` serves the app on \`127.0.0.1\`.
* [ ] \`npm run build\` produces a loadable Chrome extension in \`dist/\`.
* [ ] \`npm run test\` and \`npm run test:e2e\` both execute successfully.

**Verification (run after completion):**

* \`npm run build\`

* \`npm run test\`

* \`npm run test:e2e\`

***

### Task 2: File System Service, Mock Workspace & UI Shell

**Dependencies:** Task 1

**Scope:** Implement \`BrowserFileSystemService\`, a \`MockFileSystemService\` for tests, the app shell, and the lazy-loading file tree. Add explicit permission handling via \`ensurePermission\`. Add a test-mode mount path exposed by the UI when running with \`?fs=mock\`.

**Acceptance criteria:**

* [ ] \`src/services/fileSystem.ts\` exports \`mountWorkspace\`, \`ensurePermission\`, \`readDirectory\`, \`readEditableFile\`, and \`writeFile\`.
* [ ] The sidebar loads top-level nodes first and only reads directory children on expansion.
* [ ] Permission denial returns a visible error state instead of failing silently.
* [ ] Test mode can mount a fixture workspace without using the native folder picker.
* [ ] Unit tests cover permission-denied and lazy-directory behavior.

**Verification (run after completion):**

* \`npm run test -- src/services/fileSystem.test.ts\`

* \`npm run dev -- --host 127.0.0.1 --mode test\`

* Playwright MCP: open \`http://127.0.0.1:5173/?fs=mock\`, click \`Open Fixture Workspace\`, expand a directory, verify children render lazily

***

### Task 3: Editor Router, Text Editor & Binary Rejection

**Dependencies:** Task 2

**Environment bootstrap:**

* \`npm install codemirror @uiw/react-codemirror @codemirror/lang-json @codemirror/lang-javascript @codemirror/lang-markdown\`

**Scope:** Implement file selection, extension-based editor routing, the CodeMirror text editor, UTF-8 decode handling, binary rejection, and 500ms debounced auto-save. All non-Markdown files should route to CodeMirror when they are valid UTF-8 text.

**Acceptance criteria:**

* [ ] Clicking a text file highlights it and opens CodeMirror with file content.
* [ ] \`.txt\`, \`.json\`, \`.js\`, and Markdown source-fallback files render in CodeMirror with language extensions where applicable.
* [ ] Binary files render an explicit unsupported-file panel and never mount an editor.
* [ ] Invalid UTF-8 files render an explicit unsupported-file panel and never mount an editor.
* [ ] Debounced saves call \`writeFile\` only after 500ms of inactivity.
* [ ] Unit tests cover binary detection, UTF-8 rejection, and debounced save behavior.

**Verification (run after completion):**

* \`npm run test -- src/utils/fileType.test.ts src/components/TextEditor.test.tsx\`

* \`npm run test:e2e -- tests/e2e/text-editor.spec.ts\`

* Playwright MCP: open \`http://127.0.0.1:5173/?fs=mock\`, verify \`data.json\` opens in CodeMirror and \`image.png\` shows the error state

***

### Task 4: Markdown Editor & Compatibility Guard

**Dependencies:** Task 3

**Environment bootstrap:**

* \`npm install @blocknote/core @blocknote/react @blocknote/mantine @mantine/core @mantine/hooks\`

**Scope:** Implement the BlockNote editor, the Markdown compatibility guard, the Markdown warning banner, and source-mode fallback. Import the required BlockNote stylesheet. Markdown files only mount BlockNote if they pass the strict compatibility rule defined above.

**Acceptance criteria:**

* [ ] \`.md\` and \`.markdown\` files run through \`checkMarkdownCompatibility\` before editor selection.
* [ ] Compatible Markdown files mount BlockNote and auto-save serialized Markdown after 500ms.
* [ ] Incompatible Markdown files fall back to CodeMirror with a warning banner.
* [ ] Unit tests cover the compatibility guard with both compatible and incompatible fixtures.
* [ ] Playwright verifies one compatible Markdown fixture and one incompatible Markdown fixture end to end.

**Verification (run after completion):**

* \`npm run test -- src/utils/markdownCompatibility.test.ts src/components/EditorRouter.test.tsx\`

* \`npm run test:e2e -- tests/e2e/markdown-editor.spec.ts\`

* Playwright MCP: open \`http://127.0.0.1:5173/?fs=mock\`, verify \`notes.md\` opens in BlockNote and \`notes-with-table.md\` falls back to CodeMirror with the warning banner

## Verification Plan

### Test Fixtures

Commit a deterministic fixture workspace under \`tests/fixtures/workspace/\` with at least:

* \`notes.md\` → compatible Markdown sample

* \`notes-with-table.md\` → incompatible Markdown sample that should fall back to source mode

* \`data.json\` → UTF-8 text sample

* \`image.png\` → binary sample

### Unit Test Requirements

Use Vitest for pure logic and component coverage. Minimum required suites:

* \`src/services/fileSystem.test.ts\`

* \`src/utils/fileType.test.ts\`

* \`src/utils/markdownCompatibility.test.ts\`

* \`src/components/EditorRouter.test.tsx\`

* \`src/components/TextEditor.test.tsx\`

### Playwright Requirements

Use Playwright in two ways:

1. **Runner-based regression tests**

   * \`tests/e2e/text-editor.spec.ts\`

   * \`tests/e2e/markdown-editor.spec.ts\`

   * Optional: \`tests/e2e/extension-launch.spec.ts\` for unpacked-extension launch smoke

2. **Playwright MCP verification**

   * Start the app in test mode: \`npm run dev -- --host 127.0.0.1 --mode test\`

   * Open \`http://127.0.0.1:5173/?fs=mock\`

   * Click \`Open Fixture Workspace\`

   * Verify:

     * \`notes.md\` opens in BlockNote

     * \`notes-with-table.md\` opens in CodeMirror with the fallback warning

     * \`data.json\` opens in CodeMirror and saves after editing

     * \`image.png\` shows the unsupported-file message

### Build Verification

* \`npm run build\` → succeeds and writes the extension bundle to \`dist/\`

* \`npm run test\`

* \`npm run test:e2e\`

## Open Questions

| # | Question                                                                                                           | Impact                              | Blocked Tasks |
| - | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------- |
| 1 | Should the workspace handle be cached in IndexedDB so the user does not have to pick the same folder each session? | UX improvement for returning users. | None          |
`,
    'example.md': `# OpusPad Rich Markdown Demo

## Welcome to the Editor!

OpusPad supports all standard markdown features in a beautiful WYSIWYG environment.

### Code Blocks
\`\`\`typescript
function greet(name: string) {
  console.log(\`Hello, ${name}!\`);
}
\`\`\`

### Tables

| Feature | Support | Notes |
|---------|---------|-------|
| Local Storage | ✅ | Uses File System API |
| Privacy | ✅ | No data leaves your machine |
| WYSIWYG | ✅ | Powered by BlockNote |

### Text Formatting
You can use **bold**, *italic*, or \`inline code\`.
- Lists are supported
- Unordered
  1. And ordered
  2. Nested too!

> "This is a blockquote showing how quotes look in the editor."
`,
    'package.json': `{
  "name": "opuspad_chrome",
  "version": "1.0.0",
  "description": "OpusPad: Bridging AI output and human intent, WYSIWYG, private, local only.",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/luanjunyi/md-editor-in-chrome.git"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "bugs": {
    "url": "https://github.com/luanjunyi/md-editor-in-chrome/issues"
  },
  "homepage": "https://github.com/luanjunyi/md-editor-in-chrome#readme",
  "dependencies": {
    "@blocknote/core": "^0.47.1",
    "@blocknote/mantine": "^0.47.1",
    "@blocknote/react": "^0.47.1",
    "@codemirror/lang-javascript": "^6.2.5",
    "@codemirror/lang-json": "^6.0.2",
    "@codemirror/lang-markdown": "^6.5.0",
    "@mantine/core": "^8.3.16",
    "@mantine/hooks": "^8.3.16",
    "@uiw/react-codemirror": "^4.25.8",
    "codemirror": "^6.0.2",
    "lucide-react": "^0.577.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.3.0",
    "@playwright/test": "^1.58.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/chrome": "^0.1.37",
    "@types/node": "^25.4.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/wicg-file-system-access": "^2023.10.7",
    "@vitejs/plugin-react": "^5.1.4",
    "jsdom": "^28.1.0",
    "shiki": "^4.0.2",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  }
}
`,
    'manifest.json': `{
  "manifest_version": 3,
  "name": "OpusPad",
  "version": "1.0",
  "description": "OpusPad: Bridging AI output and human intent, WYSIWYG, private, local only.",
  "action": {
    "default_title": "Open Editor",
    "default_icon": {
      "128": "icon128.png"
    }
  },
  "icons": {
    "128": "icon128.png"
  },
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },
  "permissions": []
}
`,
    'src': {
      'App.tsx': `import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFileSystemService } from './services';
import { FileNode, ActiveFile } from './types';
import { Sidebar } from './components/Sidebar';
import { EditorRouter } from './components/EditorRouter';
import { applySavedTextFileState } from './utils/activeFileSave';

export default function App() {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const latestFileSelectionId = useRef(0);
  const activeFileRef = useRef<ActiveFile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const editVersionRef = useRef(0);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile || activeFile.state.kind !== 'text') {
      setSaveStatus('idle');
      editVersionRef.current = 0;
      return;
    }

    setSaveStatus('saved');
    editVersionRef.current = 0;
  }, [activeFile?.node.path, activeFile?.state.kind]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const mountWorkspace = async () => {
    try {
      setError(null);
      setPermissionError(false);
      const fsService = getFileSystemService();
      const handle = await fsService.mountWorkspace();
      
      if (handle) {
        // Ensure read permission immediately on root if needed
        const hasPermission = await fsService.ensurePermission(handle, 'read');
        if (!hasPermission) {
          setPermissionError(true);
          return;
        }
        
        setRootHandle(handle);
        const children = await fsService.readDirectory(handle);
        setNodes(children);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to mount workspace');
    }
  };

  const handleFileSelect = async (node: FileNode) => {
    if (node.kind !== 'file' || !node.handle) return;

    const selectionId = ++latestFileSelectionId.current;
    const fsService = getFileSystemService();
    const state = await fsService.readEditableFile(node.handle as FileSystemFileHandle, node.path);
    setActiveFile((current) => {
      if (selectionId !== latestFileSelectionId.current) {
        return current;
      }
      return { node, state };
    });
  };

  const handleSave = useCallback(async (content: string) => {
    const currentActiveFile = activeFileRef.current;
    if (!currentActiveFile) return;
    const saveVersion = editVersionRef.current;

    const originalPath = currentActiveFile.node.path;
    let fileHandle = currentActiveFile.node.handle as FileSystemFileHandle;
    let savePath = originalPath;

    if (!fileHandle) {
      if (!('showSaveFilePicker' in window)) return;
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: currentActiveFile.node.name,
          types: [{
            description: 'Text File',
            accept: { 'text/plain': ['.txt', '.md', '.markdown'] }
          }]
        });
        savePath = fileHandle.name;
      } catch (e) {
        return;
      }
    }

    try {
      setSaveStatus('saving');
      const fsService = getFileSystemService();
      await fsService.writeFile(fileHandle, content);

      setActiveFile((current) =>
        applySavedTextFileState(current, {
          content,
          fileHandle,
          originalPath,
          savePath,
        })
      );

      setSaveStatus(saveVersion === editVersionRef.current ? 'saved' : 'dirty');
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('dirty');
    }
  }, []);

  const handleDirty = useCallback(() => {
    editVersionRef.current += 1;
    setSaveStatus('dirty');
  }, []);

  const renderSaveIndicator = () => {
    if (!activeFile || activeFile.state.kind !== 'text') {
      return null;
    }

    const variant = saveStatus === 'idle' ? 'saved' : saveStatus;
    const label = variant === 'saving'
      ? 'Saving'
      : variant === 'dirty'
        ? 'Unsaved changes'
        : 'All changes saved';

    return (
      <span className={\`save-indicator save-indicator--\${variant}\`}>
        <span className="save-indicator__dot" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  };

  const openInSourceMode = useCallback(() => {
    setActiveFile((current) => {
      if (!current || current.state.kind !== 'text') return current;
      return {
        ...current,
        state: {
          ...current.state,
          editor: 'text',
          canOpenInRichMode: true,
        },
      };
    });
  }, []);

  const openInRichMode = useCallback(() => {
    setActiveFile((current) => {
      if (!current || current.state.kind !== 'text') return current;
      return {
        ...current,
        state: {
          ...current.state,
          editor: 'markdown',
          canOpenInSourceMode: true,
        },
      };
    });
  }, []);

  const isMock = new URLSearchParams(window.location.search).get('fs') === 'mock';

  return (
    <div className="app-shell">
      {!rootHandle ? (
        <main className="landing-shell">
          <section className="landing-panel">
            <div className="landing-panel__hero">
              <h1 className="landing-panel__title">OpusPad</h1>
              <p className="landing-panel__subtitle">Bridging AI output and human intent, WYSIWYG, private, local only.</p>
            </div>
            
            <div className="landing-panel__features">
              <div className="feature-item">
                <span className="feature-item__icon">🔒</span>
                <div className="feature-item__content">
                  <h3>Local & Secure</h3>
                  <p>Read and write directly to your file system. No cloud, no data collection.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-item__icon">✨</span>
                <div className="feature-item__content">
                  <h3>Markdown First</h3>
                  <p>Highly optimized WYSIWYG experience tailored specifically for markdown files.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-item__icon">🌗</span>
                <div className="feature-item__content">
                  <h3>Dual Mode</h3>
                  <p>Seamlessly switch between rich visual editing and precise source mode.</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-item__icon">🎨</span>
                <div className="feature-item__content">
                  <h3>Syntax Highlights</h3>
                  <p>Full support and highlighting for various code blocks and other text files.</p>
                </div>
              </div>
            </div>

            <div className="landing-panel__action">
              <button className="primary-button landing-panel__button" onClick={mountWorkspace} type="button">
                {isMock ? 'Open Fixture Workspace' : 'Open Folder'}
              </button>
            </div>

            {(error || permissionError) && (
              <div className="landing-panel__error">
                {error && <p>{error}</p>}
                {permissionError && <p>Permission denied to read the workspace.</p>}
              </div>
            )}
          </section>
        </main>
      ) : (
        <div className="workspace-shell">
          <Sidebar 
            nodes={nodes} 
            onFileSelect={handleFileSelect} 
            rootHandle={rootHandle}
          />
          <main className="workspace-main">
            {activeFile ? (
              <div className="editor-panel">
                <header className="editor-panel__header">
                  <div>
                    <p className="editor-panel__eyebrow">
                      {activeFile.state.kind === 'text' ? activeFile.state.editor === 'markdown' ? 'Rich mode' : 'Source mode' : 'Unavailable'}
                    </p>
                    <strong>{activeFile.node.name}</strong>
                  </div>
                  <div className="editor-panel__meta">
                    {renderSaveIndicator()}
                    <span className="editor-panel__path">{rootHandle?.name}/{activeFile.node.path}</span>
                  </div>
                </header>
                <div className="editor-panel__body">
                  <EditorRouter
                    activeFile={activeFile}
                    onSave={handleSave}
                    onDirty={handleDirty}
                    onOpenInSourceMode={openInSourceMode}
                    onOpenInRichMode={openInRichMode}
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="empty-state__eyebrow">Nothing selected</p>
                <h2>Choose a file from the left.</h2>
                <p>Markdown opens in rich mode first. If the file may not save back cleanly, you will see a warning and can switch to source mode.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
`,
      'App.test.tsx': `import React from 'react';
import { act, createEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { FileNode, LoadFileResult } from './types';

const mockFsService = {
  mountWorkspace: vi.fn(),
  ensurePermission: vi.fn(),
  readDirectory: vi.fn(),
  readEditableFile: vi.fn(),
  writeFile: vi.fn(),
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createFileNode(path: string): FileNode {
  return {
    name: path.split('/').pop() || path,
    kind: 'file',
    path,
    handle: { kind: 'file', name: path.split('/').pop() || path, path } as any,
  };
}

function createTextState(path: string, content: string): LoadFileResult {
  return {
    kind: 'text',
    path,
    content,
    editor: 'text',
  };
}

vi.mock('./services', () => ({
  getFileSystemService: () => mockFsService,
}));

vi.mock('./components/Sidebar', () => ({
  Sidebar: ({ nodes, onFileSelect }: any) => (
    <div>
      {nodes.map((node: FileNode) => (
        <button key={node.path} onClick={() => onFileSelect(node)}>
          {node.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./components/EditorRouter', () => ({
  EditorRouter: ({ activeFile, onDirty, onSave }: any) => (
    <div>
      <div data-testid="active-path">{activeFile.node.path}</div>
      <button onClick={() => onDirty()}>Dirty</button>
      <button onClick={() => onSave(\`saved:\${activeFile.node.path}\`)}>Save</button>
    </div>
  ),
}));

describe('App', () => {
  const rootHandle = { kind: 'directory', name: 'root' } as FileSystemDirectoryHandle;
  const alphaNode = createFileNode('alpha.txt');
  const betaNode = createFileNode('beta.txt');

  beforeEach(() => {
    vi.clearAllMocks();
    mockFsService.mountWorkspace.mockResolvedValue(rootHandle);
    mockFsService.ensurePermission.mockResolvedValue(true);
    mockFsService.readDirectory.mockResolvedValue([alphaNode, betaNode]);
    mockFsService.readEditableFile.mockResolvedValue(createTextState(alphaNode.path, 'alpha'));
    mockFsService.writeFile.mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/');
  });

  it('renders headline', () => {
    render(<App />);
    expect(screen.getByText('OpusPad')).toBeInTheDocument();
    expect(screen.getByText('Bridging AI output and human intent, WYSIWYG, private, local only.')).toBeInTheDocument();
  });

  it('ignores stale file-load results when a newer selection finishes first', async () => {
    const alphaLoad = createDeferred<LoadFileResult>();
    const betaLoad = createDeferred<LoadFileResult>();
    mockFsService.readEditableFile.mockImplementation((_handle: unknown, path: string) => {
      if (path === alphaNode.path) return alphaLoad.promise;
      if (path === betaNode.path) return betaLoad.promise;
      throw new Error(\`Unexpected path \${path}\`);
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    await user.click(screen.getByRole('button', { name: alphaNode.name }));
    await user.click(screen.getByRole('button', { name: betaNode.name }));

    await act(async () => {
      betaLoad.resolve(createTextState(betaNode.path, 'beta'));
      await betaLoad.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
    });

    await act(async () => {
      alphaLoad.resolve(createTextState(alphaNode.path, 'alpha'));
      await alphaLoad.promise;
    });

    expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
  });

  it('does not restore the previously saved file after switching while the write is in flight', async () => {
    const writeDeferred = createDeferred<void>();
    mockFsService.readEditableFile.mockImplementation((_handle: unknown, path: string) =>
      Promise.resolve(createTextState(path, path))
    );
    mockFsService.writeFile.mockImplementation(() => writeDeferred.promise);

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });

    await user.click(screen.getByRole('button', { name: alphaNode.name }));
    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(alphaNode.path);
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockFsService.writeFile).toHaveBeenCalledWith(alphaNode.handle, \`saved:\${alphaNode.path}\`);

    await user.click(screen.getByRole('button', { name: betaNode.name }));
    await waitFor(() => {
      expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
    });

    await act(async () => {
      writeDeferred.resolve();
      await writeDeferred.promise;
    });

    expect(screen.getByTestId('active-path')).toHaveTextContent(betaNode.path);
  });

  it('shows persistent save state badges for clean and dirty files', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Open Folder' }));
    await screen.findByRole('button', { name: alphaNode.name });
    await user.click(screen.getByRole('button', { name: alphaNode.name }));

    await waitFor(() => {
      expect(screen.getByText('All changes saved')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Dirty' }));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('prevents the browser save shortcut', () => {
    render(<App />);

    const saveEvent = createEvent.keyDown(window, { key: 's', metaKey: true });
    window.dispatchEvent(saveEvent);

    expect(saveEvent.defaultPrevented).toBe(true);
  });
});
`
    }
};

export class MockFileSystemService implements FileSystemService {
  private fileSystem: MockFileSystemTree;

  constructor(initialFileSystem: MockFileSystemTree = DEFAULT_MOCK_FILE_SYSTEM) {
    this.fileSystem = structuredClone(initialFileSystem);
  }

  private isDirectoryEntry(entry: MockFileSystemEntry): entry is MockFileSystemTree {
    return typeof entry === 'object' && entry !== null && !(entry instanceof ArrayBuffer);
  }

  private async getByPath(pathParts: string[]): Promise<MockFileSystemEntry> {
    let current: MockFileSystemEntry = this.fileSystem;
    for (const part of pathParts) {
      if (!this.isDirectoryEntry(current) || current[part] === undefined) {
        throw new Error('Not found');
      }
      current = current[part];
    }
    return current;
  }

  private async setByPath(pathParts: string[], content: string): Promise<void> {
    if (pathParts.length === 0) {
      throw new Error('Invalid path');
    }

    let current: MockFileSystemTree = this.fileSystem;
    for (const part of pathParts.slice(0, -1)) {
      const next = current[part];
      if (!this.isDirectoryEntry(next)) {
        throw new Error('Parent directory not found');
      }
      current = next;
    }

    const leaf = pathParts[pathParts.length - 1];
    if (current[leaf] === undefined) {
      throw new Error('Not found');
    }

    current[leaf] = content;
  }

  async mountWorkspace(): Promise<FileSystemDirectoryHandle | null> {
    return { kind: 'directory', name: 'root' } as unknown as FileSystemDirectoryHandle;
  }

  async ensurePermission(handle: FileSystemFileHandle | FileSystemDirectoryHandle, mode: "read" | "readwrite"): Promise<boolean> {
    return true;
  }

  async createFile(
    _dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    rawName: string
  ): Promise<FileNode> {
    const name = rawName.trim();
    if (!name) {
      throw new Error('File name is required');
    }

    if (name.includes('/') || name.includes('\\')) {
      throw new Error('Use a file name, not a path');
    }

    const parts = currentPath ? currentPath.split('/') : [];
    const directory = parts.length === 0 ? this.fileSystem : await this.getByPath(parts);

    if (!this.isDirectoryEntry(directory)) {
      throw new Error('Target directory not found');
    }

    if (directory[name] !== undefined) {
      throw new Error('A file with that name already exists');
    }

    directory[name] = '';
    const path = currentPath ? `${currentPath}/${name}` : name;

    return {
      name,
      kind: 'file',
      path,
      handle: { kind: 'file', name, path } as any,
      childrenLoaded: false,
    };
  }

  async deleteFile(_rootHandle: FileSystemDirectoryHandle, path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) {
      throw new Error('File path is required');
    }

    let current: MockFileSystemTree = this.fileSystem;
    for (const part of parts.slice(0, -1)) {
      const next = current[part];
      if (!this.isDirectoryEntry(next)) {
        throw new Error('Parent directory not found');
      }

      current = next;
    }

    const leaf = parts[parts.length - 1];
    if (this.isDirectoryEntry(current[leaf])) {
      throw new Error('Cannot delete a directory with deleteFile');
    }

    if (current[leaf] === undefined) {
      throw new Error('Not found');
    }

    delete current[leaf];
  }

  async readDirectory(dirHandle: FileSystemDirectoryHandle, currentPath: string = ''): Promise<FileNode[]> {
    const parts = currentPath ? currentPath.split('/') : [];
    let current;
    try {
      current = parts.length === 0 ? this.fileSystem : await this.getByPath(parts);
    } catch {
      return [];
    }

    if (!this.isDirectoryEntry(current)) {
      return [];
    }

    const nodes: FileNode[] = [];
    for (const [name, value] of Object.entries(current)) {
      const isDir = this.isDirectoryEntry(value);
      const path = currentPath ? `${currentPath}/${name}` : name;
      nodes.push({
        name,
        kind: isDir ? 'directory' : 'file',
        path,
        handle: { kind: isDir ? 'directory' : 'file', name, path } as any,
        childrenLoaded: false,
      });
    }

    return nodes.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
  }

  async readEditableFile(fileHandle: FileSystemFileHandle, path: string): Promise<LoadFileResult> {
    try {
      const parts = path.split('/');
      const content = await this.getByPath(parts);

      if (content instanceof ArrayBuffer) {
         return { kind: 'error', path, reason: 'binary', message: 'Binary files cannot be edited' };
      }

      if (this.isDirectoryEntry(content) || typeof content !== 'string') {
        throw new Error('Not a file');
      }

      let editor: "markdown" | "text" = "text";
      let warning: string | undefined = undefined;
      let canOpenInSourceMode = false;
      let canOpenInRichMode = false;

      const lower = path.toLowerCase();
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
        editor = "markdown";
        canOpenInSourceMode = true;
        canOpenInRichMode = true;
      }

      return { kind: 'text', path, content, editor, warning, canOpenInSourceMode, canOpenInRichMode };

    } catch (e: any) {
      return { kind: 'error', path, reason: 'read_failed', message: e.message || 'Failed to read' };
    }
  }

  async writeFile(fileHandle: FileSystemFileHandle, content: string): Promise<void> {
    const path = (fileHandle as any).path ?? (fileHandle as any).name;
    await this.setByPath(path.split('/'), content);
  }
}

export const mockFileSystemService = new MockFileSystemService();
