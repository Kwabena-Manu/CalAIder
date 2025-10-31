# CalAIder Manifest Configuration Guide

## Overview
This project uses separate manifest files for development and production environments.

## Files
- `manifest.dev.json` - Development configuration (current client ID)
- `manifest.prod.json` - Production configuration (needs Web Store client ID)
- `manifest.json` - Active manifest (generated during build)

## Setup Instructions

### For Development
The current `manifest.json` uses the dev client ID. No changes needed for local development.

### For Production Deployment

1. **Get a stable Chrome Web Store Extension ID:**
   - Upload your extension to Chrome Web Store (can be unlisted/draft)
   - Note the extension ID from the developer dashboard

2. **Create a Production OAuth Client:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 Client ID
   - Application type: **Chrome app**
   - Item ID: Enter your Chrome Web Store extension ID
   - Copy the generated client ID

3. **Update manifest.prod.json:**
   - Replace `REPLACE_WITH_PRODUCTION_CLIENT_ID.apps.googleusercontent.com` with your production client ID

4. **Build for production:**
   ```bash
   npm run build:prod
   ```

## Build Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build:dev": "powershell Copy-Item public\\manifest.dev.json public\\manifest.json -Force && npm run build:extension",
    "build:prod": "powershell Copy-Item public\\manifest.prod.json public\\manifest.json -Force && npm run build:extension",
    "build:extension": "vite build && node scripts/post-build.js"
  }
}
```

## Security Notes

### Safe to Commit:
- ✅ Client IDs (they're public)
- ✅ OAuth scopes
- ✅ Manifest files

### NEVER Commit:
- ❌ Extension private key (.pem files)
- ❌ Client secrets (client_secret*.json)
- ❌ Service account keys
- ❌ OAuth tokens
- ❌ .env files with secrets

## Permission Changes

### Removed:
- `webNavigation` - Not used in code

### Narrowed:
- `host_permissions` - Limited to Google APIs only (removed `<all_urls>`)
- `content_scripts.matches` - Changed from `<all_urls>` to `https://*/*` and `http://*/*`

### Kept:
- `identity` - OAuth authentication
- `storage` - Local data persistence
- `activeTab` - Security best practice
- `scripting` - Content script injection
- `tabs` - Tab management and messaging

## Publishing Checklist

- [ ] Extension uploaded to Chrome Web Store
- [ ] Production OAuth client created with Web Store extension ID
- [ ] `manifest.prod.json` updated with production client ID
- [ ] Privacy policy URL added to manifest (required for calendar scopes)
- [ ] OAuth consent screen configured in Google Cloud Console
- [ ] Extension submitted for Google verification (required for sensitive scopes)
- [ ] Icons created (16x16, 48x48, 128x128)
- [ ] Build tested with production manifest
- [ ] Secrets verified not in Git history

## OAuth Consent Screen Requirements

Since your extension uses sensitive scopes (`calendar.events`), you need:

1. **Complete OAuth consent screen** in Google Cloud Console
2. **Privacy Policy URL** (publicly accessible)
3. **Verification from Google** (submit verification request)
4. Explain why each scope is needed in the verification form

## Testing

### Test Development Build:
```bash
npm run build:dev
# Load unpacked extension from dist/ folder
```

### Test Production Build:
```bash
npm run build:prod
# Load unpacked extension from dist/ folder
# Note: Unpacked extensions have different IDs, so OAuth may fail
# For full testing, upload to Chrome Web Store (unlisted)
```
