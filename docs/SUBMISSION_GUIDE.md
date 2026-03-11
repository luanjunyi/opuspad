# Submitting to the Chrome Web Store

This guide outlines the steps required to publish the Markdown Editor extension to the Chrome Web Store.

## 1. Prepare the Extension for Production

Before submitting, you need to create a production-ready `.zip` file of the extension.

1. **Clean and Build:** Ensure you have a fresh, error-free build.

```bash
npm run build
```

1. **Zip the Output:** Compress the contents of the `dist` directory (not the `dist` folder itself, but the files *inside* it).

```bash
cd dist
zip -r ../markdown-editor-extension.zip *
cd ..
```

*You will upload&#x20;*`markdown-editor-extension.zip`*&#x20;to the developer dashboard.*

## 2. Prepare Store Listing Assets

You will need several visual assets and descriptions for your store page:

* **Extension Name:** Markdown Editor (or your chosen brand name)

* **Short Description:** (Max 132 characters) "Edit local Markdown files with a WYSIWYG block editor directly in your browser."

* **Detailed Description:** A full explanation of features (similar to the README).

* **Store Icon:** 128x128 pixels (PNG).

* **Screenshots:** At least one, ideally 1280x800 or 640x400 pixels (JPEG or PNG). It should show the editor, the sidebar, and the "Open Folder" button.

* **Promo Tile (Optional but recommended):** 440x280 pixels.

## 3. Create a Developer Account

If you don't already have one, you need to register as a Chrome Web Store developer.

1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

2. Sign in with your Google account.

3. Pay the one-time $5.00 developer registration fee.

## 4. Upload and Submit

1. **Upload the Zip:** In the Developer Dashboard, click **New Item** and upload the `markdown-editor-extension.zip` file you created in Step 1.

2. **Fill out the Store Listing:**

   * Enter your descriptions.

   * Upload your icon and screenshots.

   * Select an appropriate category (e.g., "Productivity" or "Developer Tools").

3. **Fill out the Privacy tab:** This is crucial for approval.

   * **Single Purpose:** State clearly that the extension's sole purpose is to allow users to edit local text and markdown files.

   * **Permission Justification:** Even though our `manifest.json` currently has an empty `permissions` array (because we use the native File System Access API which is triggered by user action, not a manifest permission), you still need to declare how you handle user data.

   * **Data Usage:** State that the extension operates entirely locally. It does not collect, transmit, or sell user data, file contents, or directory structures.

4. **Submit for Review:** Click **Submit for Review**.

## 5. Review Process

* Initial reviews typically take a few days, but can take up to a few weeks depending on the queue and the complexity of the extension.

* Because this extension uses the **File System Access API** to read and write to the user's local disk, Google reviewers may scrutinize it closely to ensure it is not malicious.

* Ensure your Privacy justifications clearly emphasize that file access is **explicitly user-initiated** (via the directory picker) and that **no file data ever leaves the user's local machine**.
