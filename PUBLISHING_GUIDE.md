# Quick Reference: Publishing CalAIder to Chrome Web Store

## ✅ What You Can Commit to GitHub

**Safe to commit:**
- ✅ `manifest.dev.json` and `manifest.prod.json`
- ✅ Client IDs (they're public OAuth identifiers)
- ✅ All source code
- ✅ This documentation

**Never commit:**
- ❌ `.pem` files (extension private keys)
- ❌ `client_secret*.json` files
- ❌ OAuth tokens
- ❌ Built extension packages

## 🔒 Files Created for Security

1. **`.gitignore`** (root) - Protects secrets from being committed
2. **`.gitignore`** (frontend) - Protects build artifacts and credentials
3. **`manifest.dev.json`** - Development configuration (uses current client ID)
4. **`manifest.prod.json`** - Production configuration (needs Web Store client ID)
5. **`SECURITY_ANALYSIS.md`** - Full security audit report
6. **`MANIFEST_GUIDE.md`** - Detailed setup instructions

## 🚀 Steps to Publish

### 1. Upload to Chrome Web Store
- Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Pay $5 one-time developer fee
- Click "New Item" and upload your zipped extension
- Note the **Extension ID** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 2. Create Production OAuth Client
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Click "Create Credentials" → "OAuth 2.0 Client ID"
- Application type: **Chrome app**
- Item ID: Paste your Chrome Web Store extension ID
- Copy the generated client ID

### 3. Update Production Manifest
Edit `manifest.prod.json`:
```json
"oauth2": {
  "client_id": "YOUR_PRODUCTION_CLIENT_ID.apps.googleusercontent.com",
  ...
}
```

### 4. Build for Production
```bash
cd frontend/CalAlder-frontend
npm run build:prod
```

### 5. Package Extension
Zip the `dist/` folder contents:
```bash
cd dist
# Zip all files (not the dist folder itself)
```

Upload the zip to Chrome Web Store.

### 6. Configure OAuth Consent Screen
- Add **Privacy Policy URL** (required for calendar scopes)
- Add app logo and description
- Submit for Google verification (required for sensitive scopes)

## ⚠️ Permission Changes Made

### Removed:
- ❌ `webNavigation` - Not used in code

### Narrowed:
- `host_permissions`: `<all_urls>` → Only Google APIs
- `content_scripts.matches`: `<all_urls>` → `https://*/*` and `http://*/*`

## 🔧 Build Commands

```bash
# Development build (uses manifest.dev.json)
npm run build:dev

# Production build (uses manifest.prod.json)
npm run build:prod

# Regular build (uses current manifest.json)
npm run build:extension
```

## 📝 Before Publishing Checklist

- [ ] Extension uploaded to Chrome Web Store
- [ ] Production OAuth client created with Web Store extension ID
- [ ] `manifest.prod.json` updated with production client ID
- [ ] Privacy policy created and URL added
- [ ] OAuth consent screen configured
- [ ] Extension icons created (16x16, 48x48, 128x128)
- [ ] Tested with production build
- [ ] Verified no secrets in Git history
- [ ] Submitted for Google verification

## 🎯 Single Client ID Solution

Once published, ALL users who install from the Chrome Web Store will use the same production client ID automatically. The client ID is tied to your extension's ID, so:

1. **Web Store users** → Use production client ID (one for everyone)
2. **Dev/unpacked users** → Use dev client ID (or shared .pem key for same ID)

## 📞 Need Help?

See detailed guides:
- `SECURITY_ANALYSIS.md` - Full security audit
- `MANIFEST_GUIDE.md` - Complete setup instructions
