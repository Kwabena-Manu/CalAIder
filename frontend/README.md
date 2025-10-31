# CalAIder Chrome Extension — Local Install (using dist)

Quick instructions to install the Chrome extension from the prebuilt `dist` folder included in the `calaider-frontend` repository.

Prerequisites
- Chrome (or Chromium-based browser)
- Local copy of `calaider-frontend` with a `dist/` folder that contains `manifest.json` and built assets
- (Optional) Node.js & npm if you need to rebuild `dist`

If you need to generate `dist` from source
1. Open a terminal in the `calaider-frontend` folder
2. Run:
    npm install
    npm run build
3. Confirm a `dist/` folder was created and contains `manifest.json`

Install steps (Load unpacked)
1. Open Chrome and go to chrome://extensions
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `calaider-frontend/dist` directory (the folder that contains `manifest.json`)
5. The extension should appear in the list. Use "Details" to view permissions or "Errors" to see runtime issues.

Updating the extension
- After updating files in `dist`, click the "Reload" button on the extension entry in chrome://extensions
- If you replaced the folder entirely, remove the extension and "Load unpacked" again pointing to the new `dist` path

Troubleshooting
- "Could not load extension": ensure `manifest.json` exists at the root of the selected folder
- Manifest version or CSP errors: check console on extension background page (click "Service Worker" / "Inspect views" in Details)
- Extension disabled by policy: enterprise policies or antivirus may block loading unpacked extensions

Notes
- Use the `dist` folder only for local testing or development. For distribution, pack the extension or publish in the Chrome Web Store.
- For Edge, the same "Load unpacked" workflow is available in edge://extensions
