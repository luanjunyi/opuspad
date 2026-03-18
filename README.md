# OpusPad
    *A local-first, WYSIWYG Markdown editor for Chrome, built for the AI era.*
    
    ![OpusPad Main Screenshot](./docs/images/main_screenshot.png) <!-- Placeholder, update path later -->
    
    ## Value Proposition
    OpusPad transforms your Chrome browser into a robust local file editor with a Notion-like WYSIWYG experience. Seamlessly edit Markdown files (like CLAUDE.md, specs, or READMEs) stored on your local disk, without needing to open a full IDE or rely on cloud services.
    
    ## Why OpusPad?
    - **Local-First:** Your files stay on your disk. No cloud storage, no unnecessary uploads.
    - **WYSIWYG & Source Mode:** Enjoy a beautiful Notion-like editing experience, or switch to the raw Markdown source mode when needed.
    - **AI-Ready:** Perfect for managing and editing AI-generated content and specifications, like CLAUDE.md files, directly where you work.
    - **Chrome Integrated:** Leverages the native File System Access API for direct local file manipulation.
    - **Lightweight:** No need for heavy IDEs just to edit a few Markdown files.
    
    ## Installation
    
    **1. Chrome Web Store (Recommended):**
       - Install OpusPad directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/opuspad/ephlhjlnpnjjnjgdohdnbknadhklcoag).
    
    **2. Developer Setup (for local development):**
       - Clone the repository: `git clone https://github.com/luanjunyi/md-editor-in-chrome.git`
       - Navigate to the directory: `cd md-editor-in-chrome`
       - Install dependencies: `npm install`
       - Build the extension: `npm run build` (This will generate a `dist/` directory)
       - Load into Chrome:
           - Open Chrome and navigate to `chrome://extensions/`.
           - Enable "Developer mode".
           - Click "Load unpacked" and select the `dist/` directory.
    
    ## Use Cases
    - Editing `CLAUDE.md` files for AI agent instructions.
    - Managing local specification documents.
    - Quickly updating `README.md` files.
    - Any task requiring local Markdown file editing within Chrome.
    
    ## Privacy
    OpusPad is truly local-first. It does not send your file content to any cloud server. All file processing happens locally in your browser.
    
    ## Limitations
    - Not a full IDE: OpusPad is focused on Markdown editing and does not provide full development environment features.
    - Binary Files: Designed for text-based files, primarily Markdown. It safely prevents opening unsupported binary files.
    
    ## Developer Setup
    (Content from old "Installation" section - clone, install, build, load)
    - Clone the repository: `git clone https://github.com/luanjunyi/md-editor-in-chrome.git`
    - Navigate to the directory: `cd md-editor-in-chrome`
    - Install dependencies: `npm install`
    - Build the extension: `npm run build`
    - Load into Chrome: Open `chrome://extensions/`, enable Developer mode, click "Load unpacked", select `dist/`.
    
    
    ## Tech Stack
    - Vue 3
    - BlockNote
    - CodeMirror
    - Native File System Access API
    
