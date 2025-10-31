# CalAIder Security Analysis Report

## Permission Analysis

### ✅ Necessary Permissions (Kept)
- **identity** - Used for Google OAuth authentication
- **storage** - Used extensively for local data (events cache, analysis sessions)
- **activeTab** - Security best practice (limits access to active tab only)
- **scripting** - Used to inject content scripts dynamically
- **tabs** - Used for tab queries and messaging between popup/content/background

### ❌ Removed Permissions
- **webNavigation** - Not used anywhere in codebase

### ⚠️ Narrowed Permissions
- **host_permissions**: Changed from `<all_urls>` to specific Google APIs only
  - Before: `"<all_urls>"` (access to ALL websites)
  - After: Only `https://www.googleapis.com/*` and `https://oauth2.googleapis.com/*`
  
- **content_scripts.matches**: Changed from `<all_urls>` to safer pattern
  - Before: `"<all_urls>"` (runs on every website including file:// and chrome://)
  - After: `["https://*/*", "http://*/*"]` (only HTTP(S) websites)

## Security Issues Found & Fixed

### 1. ✅ Overly Broad Permissions
**Issue**: Extension requested access to ALL URLs
**Risk**: Privacy concerns, unnecessary data access
**Fix**: Limited to only necessary Google API endpoints

### 2. ✅ Content Script Injection on All Pages
**Issue**: Content script runs automatically on every webpage
**Risk**: Performance impact, privacy concerns
**Status**: Reduced scope to HTTP(S) only, consider adding exclude patterns for sensitive sites

### 3. ✅ Missing .gitignore Protection
**Issue**: No protection against committing secrets
**Risk**: Credentials could be accidentally committed
**Fix**: Created comprehensive .gitignore files

### 4. ✅ Build Artifacts Not Ignored
**Issue**: dist/ folder not in .gitignore
**Risk**: Built extension with embedded tokens could be committed
**Fix**: Added dist/ to .gitignore

### 5. ✅ No Dev/Prod Separation
**Issue**: Single manifest for all environments
**Risk**: Dev client ID exposed in production, harder to manage
**Fix**: Created manifest.dev.json and manifest.prod.json

## Additional Security Recommendations

### High Priority
1. **Add Privacy Policy URL** - Required for Chrome Web Store with calendar scopes
2. **Implement Content Security Policy** - Add to manifest:
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'self'"
   }
   ```

3. **Restrict Content Script to Specific Domains** (Optional but recommended):
   ```json
   "content_scripts": [{
     "matches": [
       "https://www.eventbrite.com/*",
       "https://www.meetup.com/*"
     ]
   }]
   ```

4. **Add match_about_blank: false** to content_scripts to prevent injection in about:blank

### Medium Priority
5. **Token Storage Security** - Consider using chrome.storage.session for tokens (automatically cleared)
6. **Token Refresh Logic** - Already implemented well with silent refresh
7. **CORS Headers Validation** - Already using proper OAuth flow

### Low Priority (Already Good)
8. ✅ Client ID in manifest is fine (it's public)
9. ✅ No client secrets in code
10. ✅ Proper token revocation on sign-out

## Code Security Review

### Secure Practices Found:
- ✅ Using chrome.identity.getAuthToken (secure OAuth flow)
- ✅ Token revocation on sign-out
- ✅ Silent token refresh with fallback
- ✅ Proper error handling for authentication
- ✅ No hardcoded secrets or API keys
- ✅ Using HTTPS for all API calls

### Potential Improvements:
1. **Token Storage**: Currently stores in chrome.storage.sync + localStorage
   - Consider: chrome.storage.session for auto-cleanup
   
2. **Error Messages**: Some error messages might expose internal details
   - Consider: Generic user-facing messages, detailed logs for debugging

3. **Content Script Execution**: Dynamically injected on every tab update
   - Consider: Only inject when user activates extension popup

## What Can Be Committed to GitHub

### ✅ Safe to Commit:
- OAuth client IDs (public by design)
- manifest.dev.json (with dev client ID)
- manifest.prod.json (with placeholder or production client ID)
- All source code
- OAuth scopes configuration
- Package files and dependencies
- Documentation

### ❌ NEVER Commit:
- Extension private key files (*.pem)
- OAuth client secrets (client_secret*.json)
- Service account credentials
- OAuth tokens or refresh tokens
- .env files with secrets
- Built extension packages with credentials
- Build artifacts (dist/ folder)

## Summary

Your extension is generally well-structured with good security practices. The main issues were:

1. **Excessive permissions** - Now fixed by narrowing scope
2. **Missing .gitignore** - Now fixed, protects against accidental leaks
3. **No dev/prod separation** - Now fixed with separate manifests

Before publishing to Chrome Web Store:
- Create production OAuth client with Web Store extension ID
- Submit for Google verification (required for calendar scopes)
- Add privacy policy URL
- Consider narrowing content script matches to specific event sites
